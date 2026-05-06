-- ============================================================
-- KRUX Migration 30 — Entity Network + Shipment Events
--
-- Two foundations for the Path C infrastructure play:
--
-- 1. shipment_events  — immutable audit log of every state
--    change on every shipment. The existing `events` table is
--    a processing queue. This is the intelligence archive that
--    powers compliance scores, regulator analytics, and the
--    data licensing layer. Every row lives forever.
--
-- 2. krux_entities    — persistent trade identity network.
--    Every importer, clearing agent, and manufacturer gets a
--    unique KRUX ID (KRUX-IMP-KE-00001) that follows them
--    across shipments, organizations, and years. Foundation
--    of the compliance score / trade bureau play.
-- ============================================================


-- ============================================================
-- PART 1: SHIPMENT EVENTS
-- ============================================================

CREATE TABLE shipment_events (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id      UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  organization_id  UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- What happened
  event_type       TEXT        NOT NULL,
  -- Values: SHIPMENT_CREATED | STAGE_CHANGED | RISK_FLAG_CHANGED |
  --         REMEDIATION_STATUS_CHANGED | CLEARED | REGULATOR_STATUS_CHANGED |
  --         ACTION_COMPLETED | ACTION_DISMISSED | DOCUMENT_UPLOADED |
  --         WHATSAPP_COMMAND | BRIEF_GENERATED | NOTE_ADDED | DELETED

  -- State transition (both nullable — some events have no before/after)
  from_value       TEXT,
  to_value         TEXT,

  -- Rich context for analytics
  -- STAGE_CHANGED:             { days_in_previous_stage, risk_flag, cif_value_usd }
  -- RISK_FLAG_CHANGED:         { from_score, to_score, trigger }
  -- CLEARED:                   { days_to_clear, total_duty_usd, regulator_code, kra_entry }
  -- REGULATOR_STATUS_CHANGED:  { regulator, portal_id, reference_number }
  -- ACTION_COMPLETED:          { action_type, action_title, completion_signal }
  -- WHATSAPP_COMMAND:          { command, phone_number }
  metadata         JSONB       NOT NULL DEFAULT '{}',

  -- Who triggered it
  actor_type       TEXT        NOT NULL DEFAULT 'SYSTEM',
  -- USER | SYSTEM | CRON | WHATSAPP | API
  actor_id         UUID        REFERENCES users(id) ON DELETE SET NULL,

  -- Intelligence shortcut: days from shipment creation to this event
  -- Pre-computed at write time so analytics queries don't need a join
  days_since_created INTEGER,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Core access patterns
CREATE INDEX idx_se_shipment_id   ON shipment_events(shipment_id);
CREATE INDEX idx_se_org_id        ON shipment_events(organization_id);
CREATE INDEX idx_se_event_type    ON shipment_events(event_type);
CREATE INDEX idx_se_created_at    ON shipment_events(created_at DESC);
-- Analytics: clearance time per regulator per quarter
CREATE INDEX idx_se_type_created  ON shipment_events(event_type, created_at DESC);


-- ============================================================
-- TRIGGER: log events on shipment INSERT and UPDATE
-- ============================================================

CREATE OR REPLACE FUNCTION log_shipment_event()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_days INTEGER;
BEGIN
  v_days := GREATEST(0, EXTRACT(DAY FROM (NOW() - COALESCE(NEW.created_at, NOW())))::INTEGER);

  IF TG_OP = 'INSERT' THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type, days_since_created)
    VALUES (
      NEW.id, NEW.organization_id, 'SHIPMENT_CREATED', NULL, NEW.shipment_stage,
      jsonb_build_object(
        'name',           NEW.name,
        'reference',      NEW.reference_number,
        'hs_code',        NEW.hs_code,
        'cif_value_usd',  NEW.cif_value_usd,
        'origin_country', NEW.origin_country,
        'regulator_id',   NEW.regulatory_body_id,
        'risk_flag',      NEW.risk_flag_status,
        'shipment_type',  NEW.shipment_type
      ),
      'SYSTEM', 0
    );
    RETURN NEW;
  END IF;

  -- STAGE_CHANGED
  IF OLD.shipment_stage IS DISTINCT FROM NEW.shipment_stage THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type, days_since_created)
    VALUES (
      NEW.id, NEW.organization_id, 'STAGE_CHANGED',
      OLD.shipment_stage, NEW.shipment_stage,
      jsonb_build_object(
        'cif_value_usd', NEW.cif_value_usd,
        'risk_flag',     NEW.risk_flag_status,
        'risk_score',    NEW.composite_risk_score,
        'regulator_id',  NEW.regulatory_body_id
      ),
      'SYSTEM', v_days
    );
  END IF;

  -- RISK_FLAG_CHANGED
  IF OLD.risk_flag_status IS DISTINCT FROM NEW.risk_flag_status THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type, days_since_created)
    VALUES (
      NEW.id, NEW.organization_id, 'RISK_FLAG_CHANGED',
      OLD.risk_flag_status::TEXT, NEW.risk_flag_status::TEXT,
      jsonb_build_object(
        'from_score',   OLD.composite_risk_score,
        'to_score',     NEW.composite_risk_score,
        'stage',        NEW.shipment_stage,
        'regulator_id', NEW.regulatory_body_id,
        'cif_value_usd', NEW.cif_value_usd
      ),
      'SYSTEM', v_days
    );
  END IF;

  -- REMEDIATION_STATUS_CHANGED
  IF OLD.remediation_status IS DISTINCT FROM NEW.remediation_status THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type, days_since_created)
    VALUES (
      NEW.id, NEW.organization_id, 'REMEDIATION_STATUS_CHANGED',
      OLD.remediation_status::TEXT, NEW.remediation_status::TEXT,
      jsonb_build_object(
        'stage',      NEW.shipment_stage,
        'risk_flag',  NEW.risk_flag_status,
        'risk_score', NEW.composite_risk_score
      ),
      'SYSTEM', v_days
    );
  END IF;

  -- CLEARED — fires once when clearance_date transitions from NULL to a value
  IF OLD.clearance_date IS NULL AND NEW.clearance_date IS NOT NULL THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type, days_since_created)
    VALUES (
      NEW.id, NEW.organization_id, 'CLEARED',
      NULL, NEW.clearance_date,
      jsonb_build_object(
        'days_to_clear',      v_days,
        'total_duty_usd',     NEW.import_duty_usd,
        'total_landed_usd',   NEW.total_landed_cost_usd,
        'total_landed_kes',   NEW.total_landed_cost_kes,
        'regulator_id',       NEW.regulatory_body_id,
        'kra_entry',          NEW.kra_entry_number,
        'hs_code',            NEW.hs_code,
        'origin_country',     NEW.origin_country,
        'risk_flag_at_clear', NEW.risk_flag_status
      ),
      'SYSTEM', v_days
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_shipment_event
  AFTER INSERT OR UPDATE ON shipments
  FOR EACH ROW EXECUTE FUNCTION log_shipment_event();


-- ============================================================
-- TRIGGER: log regulator status changes from shipment_portals
-- ============================================================

CREATE OR REPLACE FUNCTION log_portal_event_to_shipment_events()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO shipment_events
      (shipment_id, organization_id, event_type, from_value, to_value, metadata, actor_type)
    VALUES (
      NEW.shipment_id, NEW.organization_id, 'REGULATOR_STATUS_CHANGED',
      OLD.status, NEW.status,
      jsonb_build_object(
        'regulator',        NEW.regulator,
        'portal_id',        NEW.id,
        'reference_number', NEW.reference_number,
        'notes',            NEW.notes
      ),
      'SYSTEM'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_log_portal_event
  AFTER UPDATE ON shipment_portals
  FOR EACH ROW EXECUTE FUNCTION log_portal_event_to_shipment_events();


-- ============================================================
-- RLS for shipment_events
-- ============================================================

ALTER TABLE shipment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON shipment_events
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));


-- ============================================================
-- PART 2: KRUX ENTITY NETWORK
-- ============================================================

-- Atomic counter — one row per (entity_type, country_code)
-- Using an upsert+increment instead of sequences so we can
-- add new type/country combos at runtime without DDL changes.
CREATE TABLE krux_entity_counters (
  entity_type  TEXT NOT NULL,
  country_code TEXT NOT NULL DEFAULT 'KE',
  current_seq  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (entity_type, country_code)
);

INSERT INTO krux_entity_counters (entity_type, country_code, current_seq) VALUES
  ('IMP', 'KE', 0),
  ('AGT', 'KE', 0),
  ('MFG', 'KE', 0),
  ('EXP', 'KE', 0),
  ('BRK', 'KE', 0);

-- Atomic ID generator — safe under concurrent inserts
CREATE OR REPLACE FUNCTION generate_krux_id(p_type TEXT, p_country TEXT DEFAULT 'KE')
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_seq INTEGER;
BEGIN
  INSERT INTO krux_entity_counters (entity_type, country_code, current_seq)
  VALUES (p_type, p_country, 1)
  ON CONFLICT (entity_type, country_code)
  DO UPDATE SET current_seq = krux_entity_counters.current_seq + 1
  RETURNING current_seq INTO v_seq;

  RETURN 'KRUX-' || p_type || '-' || p_country || '-' || LPAD(v_seq::TEXT, 5, '0');
END;
$$;


-- ============================================================
-- The entity network table
-- ============================================================

CREATE TABLE krux_entities (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The persistent trade identity — format: KRUX-{TYPE}-{CC}-{SEQ}
  -- Examples: KRUX-IMP-KE-00001, KRUX-AGT-KE-00042, KRUX-MFG-KE-00007
  krux_id               TEXT        NOT NULL UNIQUE,

  entity_type           TEXT        NOT NULL,
  -- IMP = importer | AGT = clearing agent/freight forwarder
  -- MFG = manufacturer | EXP = exporter | BRK = broker

  country_code          TEXT        NOT NULL DEFAULT 'KE',

  -- Identity fields
  name                  TEXT        NOT NULL,
  trading_name          TEXT,
  kra_pin               TEXT,            -- KRA PIN for identity verification
  registration_number   TEXT,            -- Companies Registry number
  email                 TEXT,
  phone                 TEXT,

  -- Links to KRUX internal records (nullable — entity may predate KRUX signup)
  organization_id       UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  clearing_agent_id     UUID        REFERENCES clearing_agents(id) ON DELETE SET NULL,
  manufacturer_id       UUID        REFERENCES manufacturers(id) ON DELETE SET NULL,

  -- ─── Compliance Profile ─────────────────────────────────────
  -- These are updated by a cron job that reads shipment_events.
  -- They start at zero and accumulate over time.
  -- This is the seed of the trade compliance bureau.
  total_shipments       INTEGER     NOT NULL DEFAULT 0,
  cleared_on_time       INTEGER     NOT NULL DEFAULT 0,    -- cleared before or on pvoc_deadline / eta
  clearance_failures    INTEGER     NOT NULL DEFAULT 0,    -- CUSTOMS_HOLD, cancellations
  hs_misclassifications INTEGER     NOT NULL DEFAULT 0,    -- times KRA corrected HS code
  avg_clearance_days    NUMERIC(5,1),                      -- mean days from created to CLEARED event
  compliance_score      INTEGER     CHECK (compliance_score BETWEEN 0 AND 100),
  -- NULL = not enough data yet (< 5 shipments)
  -- 0–49  = BRONZE, 50–69 = SILVER, 70–84 = GOLD, 85–100 = PLATINUM
  compliance_tier       TEXT        CHECK (compliance_tier IN ('BRONZE','SILVER','GOLD','PLATINUM')),
  last_shipment_at      TIMESTAMPTZ,

  -- Verification
  is_verified           BOOLEAN     NOT NULL DEFAULT false,
  verified_at           TIMESTAMPTZ,

  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ke_krux_id        ON krux_entities(krux_id);
CREATE INDEX idx_ke_entity_type    ON krux_entities(entity_type);
CREATE INDEX idx_ke_org_id         ON krux_entities(organization_id);
CREATE INDEX idx_ke_kra_pin        ON krux_entities(kra_pin) WHERE kra_pin IS NOT NULL;
CREATE INDEX idx_ke_compliance     ON krux_entities(compliance_score DESC) WHERE compliance_score IS NOT NULL;


-- ============================================================
-- TRIGGER: auto-create KRUX entity when a new org signs up
-- ============================================================

CREATE OR REPLACE FUNCTION auto_create_krux_entity_for_org()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_type   TEXT;
  v_krux_id TEXT;
BEGIN
  v_type := CASE NEW.type
    WHEN 'clearing_agent_firm' THEN 'AGT'
    WHEN 'manufacturer'        THEN 'MFG'
    ELSE 'IMP'
  END;

  v_krux_id := generate_krux_id(v_type, UPPER(COALESCE(NEW.country, 'KE')));

  INSERT INTO krux_entities
    (krux_id, entity_type, country_code, name, email, organization_id)
  VALUES
    (v_krux_id, v_type, UPPER(COALESCE(NEW.country, 'KE')), NEW.name, NEW.email, NEW.id);

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_krux_entity
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION auto_create_krux_entity_for_org();


-- ============================================================
-- Backfill: assign KRUX IDs to all existing organizations
-- (ordered by created_at so the sequence reflects join order)
-- ============================================================

DO $$
DECLARE
  org        RECORD;
  v_type     TEXT;
  v_krux_id  TEXT;
BEGIN
  FOR org IN
    SELECT * FROM organizations
    WHERE id NOT IN (SELECT organization_id FROM krux_entities WHERE organization_id IS NOT NULL)
    ORDER BY created_at ASC
  LOOP
    v_type := CASE org.type
      WHEN 'clearing_agent_firm' THEN 'AGT'
      WHEN 'manufacturer'        THEN 'MFG'
      ELSE 'IMP'
    END;

    v_krux_id := generate_krux_id(v_type, UPPER(COALESCE(org.country, 'KE')));

    INSERT INTO krux_entities
      (krux_id, entity_type, country_code, name, email, organization_id)
    VALUES
      (v_krux_id, v_type, UPPER(COALESCE(org.country, 'KE')), org.name, org.email, org.id)
    ON CONFLICT DO NOTHING;
  END LOOP;
END;
$$;


-- ============================================================
-- Expose krux_id on organizations for fast lookup
-- ============================================================

ALTER TABLE organizations ADD COLUMN IF NOT EXISTS krux_entity_id TEXT;

UPDATE organizations o
SET krux_entity_id = ke.krux_id
FROM krux_entities ke
WHERE ke.organization_id = o.id;


-- ============================================================
-- RLS for krux_entities
-- Public read of compliance score (needed for bank/insurer integrations later).
-- Write only via service role.
-- ============================================================

ALTER TABLE krux_entities ENABLE ROW LEVEL SECURITY;

-- Any authenticated user can read — compliance scores are semi-public by design
CREATE POLICY "authenticated_read" ON krux_entities
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only service role can write (scores updated by cron, not by users)
CREATE POLICY "service_write" ON krux_entities
  FOR ALL USING (auth.role() = 'service_role');


-- ============================================================
-- krux_entity_counters — service role only
-- ============================================================

ALTER TABLE krux_entity_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_only" ON krux_entity_counters
  USING (auth.role() = 'service_role');
