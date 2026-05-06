-- ============================================================
-- KRUX Migration 32 — Phase 1 Intelligence Layer
--
-- 1. shipments: add shipping_line + customs_agent columns
-- 2. clearance_outcomes: debrief table (post-clearance intelligence)
-- 3. waitlist: add last_nurture_day for email sequence tracking
-- ============================================================


-- ============================================================
-- PART 1: Logistics fields on shipments
-- ============================================================

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS shipping_line   TEXT,
  ADD COLUMN IF NOT EXISTS customs_agent   TEXT,
  ADD COLUMN IF NOT EXISTS customs_agent_license TEXT;

CREATE INDEX IF NOT EXISTS idx_shipments_shipping_line
  ON shipments(shipping_line) WHERE shipping_line IS NOT NULL;


-- ============================================================
-- PART 2: clearance_outcomes — the Phase 1 intelligence archive
--
-- Filled in by the clearance debrief form shown after every
-- shipment is marked CLEARED. This table is the seed of the
-- examination rate tracker, agent performance index, and
-- shipping line reliability table (Phase 2 builds).
-- ============================================================

CREATE TABLE IF NOT EXISTS clearance_outcomes (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id             UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  organization_id         UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Was the shipment physically examined at port?
  examined                BOOLEAN     NOT NULL DEFAULT false,
  -- green_channel | red_channel | detained | released | fined
  examination_outcome     TEXT,

  -- Agent who handled clearance
  agent_name              TEXT,
  agent_license           TEXT,

  -- Logistics data (may differ from what was planned at creation)
  shipping_line           TEXT,
  vessel                  TEXT,

  -- Port dwell (days from ETA/arrival to gate-out)
  dwell_days              INTEGER,

  -- What KRA actually charged (may differ from estimated duty)
  duty_applied_kes        NUMERIC(14,2),

  -- Did KRA reclassify the HS code?
  classification_dispute  BOOLEAN     NOT NULL DEFAULT false,
  -- If yes, what did they change it to?
  disputed_hs_code        TEXT,

  -- Regulator code (KRA, PPB, EPRA, etc.)
  regulator_code          TEXT,

  -- Free text notes from the agent
  notes                   TEXT,

  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_co_shipment_id       ON clearance_outcomes(shipment_id);
CREATE INDEX IF NOT EXISTS idx_co_org_id            ON clearance_outcomes(organization_id);
CREATE INDEX IF NOT EXISTS idx_co_shipping_line     ON clearance_outcomes(shipping_line) WHERE shipping_line IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_co_regulator_code    ON clearance_outcomes(regulator_code) WHERE regulator_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_co_examined          ON clearance_outcomes(examined, examination_outcome);
CREATE INDEX IF NOT EXISTS idx_co_created_at        ON clearance_outcomes(created_at DESC);

-- RLS: org isolation
ALTER TABLE clearance_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON clearance_outcomes
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

-- Service role can read all for aggregate analytics
CREATE POLICY "service_read_all" ON clearance_outcomes
  FOR SELECT USING (auth.role() = 'service_role');


-- ============================================================
-- PART 3: waitlist nurture tracking
-- ============================================================

ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS last_nurture_day INTEGER NOT NULL DEFAULT 0;
