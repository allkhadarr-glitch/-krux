-- ============================================================
-- KRUXVON PLATFORM — COMPLETE DATABASE SCHEMA v1.0
-- Tier 1 Supply Chain Intelligence OS
-- Kenya Import Compliance + Manufacturer Vault + Order Protection
-- ============================================================

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE risk_flag        AS ENUM ('GREEN', 'AMBER', 'RED');
CREATE TYPE risk_level       AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE user_role        AS ENUM ('krux_admin', 'operations', 'management', 'clearing_agent', 'client', 'manufacturer', 'auditor');
CREATE TYPE org_type         AS ENUM ('sme_importer', 'clearing_agent_firm', 'manufacturer', 'audit_agency', 'kruxvon_internal');
CREATE TYPE shipment_status  AS ENUM ('DRAFT', 'PENDING', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS_HOLD', 'CUSTOMS_CLEARANCE', 'DELIVERED', 'CANCELLED');
CREATE TYPE remediation_status AS ENUM ('OPEN', 'IN_PROGRESS', 'CLOSED', 'ESCALATED');
CREATE TYPE license_status   AS ENUM ('ACTIVE', 'EXPIRING_60', 'EXPIRING_30', 'EXPIRING_7', 'EXPIRED', 'SUSPENDED', 'PENDING_RENEWAL');
CREATE TYPE audit_status     AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
CREATE TYPE po_status        AS ENUM ('DRAFT', 'CONFIRMED', 'IN_PRODUCTION', 'QUALITY_CHECK', 'SHIPPED', 'DELIVERED', 'DISPUTED', 'CANCELLED');
CREATE TYPE cert_status      AS ENUM ('PENDING', 'SUBMITTED', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');
CREATE TYPE alert_type       AS ENUM (
  'LICENSE_EXPIRY_60', 'LICENSE_EXPIRY_30', 'LICENSE_EXPIRY_7', 'LICENSE_EXPIRED',
  'PVOC_DEADLINE_7', 'PVOC_DEADLINE_3', 'PVOC_OVERDUE',
  'CERT_EXPIRY_60', 'CERT_EXPIRY_30',
  'SHIPMENT_DELAY', 'SHIPMENT_HELD',
  'RISK_ESCALATION',
  'BANKRUPTCY_SIGNAL', 'CAPACITY_OVERLOAD', 'KEY_STAFF_DEPARTURE',
  'AUDIT_DUE', 'AUDIT_FAILED',
  'PORT_CONGESTION', 'FOREX_MOVEMENT',
  'PO_MILESTONE_DUE', 'PO_OVERDUE',
  'ORDER_PROTECTION_BREACH'
);
CREATE TYPE alert_channel    AS ENUM ('EMAIL', 'WHATSAPP', 'IN_APP', 'SMS');
CREATE TYPE subscription_tier AS ENUM ('trial', 'basic', 'pro', 'enterprise');

-- ============================================================
-- CORE: ORGANIZATIONS + USERS
-- ============================================================

CREATE TABLE organizations (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    TEXT NOT NULL,
  type                    org_type NOT NULL,
  country                 TEXT NOT NULL DEFAULT 'KE',
  city                    TEXT,
  address                 TEXT,
  phone                   TEXT,
  email                   TEXT,
  website                 TEXT,
  logo_url                TEXT,
  tax_pin                 TEXT,              -- KRA PIN for KE orgs
  registration_number     TEXT,
  subscription_tier       subscription_tier NOT NULL DEFAULT 'trial',
  subscription_status     TEXT DEFAULT 'active',
  subscription_expires_at TIMESTAMPTZ,
  monthly_shipment_limit  INTEGER DEFAULT 5,
  settings                JSONB DEFAULT '{}',
  is_active               BOOLEAN DEFAULT true,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  email           TEXT NOT NULL UNIQUE,
  full_name       TEXT NOT NULL,
  role            user_role NOT NULL DEFAULT 'operations',
  phone           TEXT,
  whatsapp_number TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  preferences     JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REGULATORY FRAMEWORK (shared across all modules)
-- ============================================================

CREATE TABLE regulatory_bodies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,   -- PPB, KEBS, PCPB...
  name          TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'KE',
  website       TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE regulatory_rules (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_body_id    UUID NOT NULL REFERENCES regulatory_bodies(id),
  rule_number           INTEGER NOT NULL,
  name                  TEXT NOT NULL,
  description           TEXT,
  product_category      TEXT NOT NULL,
  risk_level            risk_flag NOT NULL DEFAULT 'AMBER',
  import_duty_rate_pct  DECIMAL(5,2) NOT NULL DEFAULT 0,
  applies_to_countries  TEXT[] DEFAULT ARRAY['IN','CN','AE','GB','SG','JP','DE','NL'],
  documents_required    TEXT[],
  pvoc_required         BOOLEAN DEFAULT true,
  estimated_process_days INTEGER DEFAULT 14,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed regulatory bodies
INSERT INTO regulatory_bodies (code, name, country, website) VALUES
  ('PPB',     'Pharmacy and Poisons Board',                'KE', 'https://pharmacyboardkenya.org'),
  ('KEBS',    'Kenya Bureau of Standards',                 'KE', 'https://kebs.org'),
  ('PCPB',    'Pest Control Products Board',               'KE', 'https://pcpb.or.ke'),
  ('KEPHIS',  'Kenya Plant Health Inspectorate Service',   'KE', 'https://kephis.org'),
  ('EPRA',    'Energy and Petroleum Regulatory Authority', 'KE', 'https://epra.go.ke'),
  ('KRA',     'Kenya Revenue Authority',                   'KE', 'https://kra.go.ke'),
  ('NEMA',    'National Environment Management Authority', 'KE', 'https://nema.go.ke'),
  ('WHO_GMP', 'WHO Good Manufacturing Practice',           'INT', 'https://who.int'),
  ('NTSA',    'National Transport and Safety Authority',   'KE', 'https://ntsa.go.ke'),
  ('NCA',     'National Construction Authority',           'KE', 'https://nca.go.ke'),
  ('EAC',     'East African Community Standards',          'EAC', 'https://eac.int');

-- ============================================================
-- MODULE 1: ICSM (Import Compliance & Shipment Management)
-- ============================================================

CREATE TABLE shipments (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id),
  reference_number        TEXT UNIQUE NOT NULL,  -- KRUX-2026-0001
  name                    TEXT NOT NULL,

  -- Relations
  manufacturer_id         UUID REFERENCES manufacturers(id),
  clearing_agent_id       UUID REFERENCES clearing_agents(id),
  regulatory_body_id      UUID REFERENCES regulatory_bodies(id),
  regulatory_rule_id      UUID REFERENCES regulatory_rules(id),
  purchase_order_id       UUID REFERENCES purchase_orders(id),

  -- Logistics
  origin_port             TEXT NOT NULL,
  destination_port        TEXT NOT NULL DEFAULT 'Mombasa',
  origin_country          TEXT,
  hs_code                 TEXT,
  product_description     TEXT,
  quantity                DECIMAL(12,3),
  unit                    TEXT,
  weight_kg               DECIMAL(10,2),
  container_type          TEXT,    -- 20ft, 40ft, LCL
  vessel_name             TEXT,
  bl_number               TEXT,    -- Bill of Lading

  -- Financials
  cif_value_usd           DECIMAL(12,2) NOT NULL,
  import_duty_usd         DECIMAL(10,2),
  vat_usd                 DECIMAL(10,2),
  idf_levy_usd            DECIMAL(10,2),
  rdl_levy_usd            DECIMAL(10,2),
  pvoc_fee_usd            DECIMAL(8,2),
  clearing_fee_usd        DECIMAL(8,2),
  storage_accrued_usd     DECIMAL(10,2),
  total_landed_cost_usd   DECIMAL(12,2),
  total_landed_cost_kes   DECIMAL(14,2),
  exchange_rate_used      DECIMAL(8,4) DEFAULT 129,
  storage_rate_per_day    DECIMAL(8,2),

  -- Compliance
  pvoc_deadline           DATE,
  eta                     DATE,
  actual_arrival_date     DATE,
  clearance_date          DATE,
  risk_flag_status        risk_flag NOT NULL DEFAULT 'AMBER',
  remediation_status      remediation_status NOT NULL DEFAULT 'OPEN',
  shipment_status         shipment_status NOT NULL DEFAULT 'DRAFT',
  composite_risk_score    INTEGER DEFAULT 5 CHECK (composite_risk_score BETWEEN 0 AND 10),
  open_action_count       INTEGER DEFAULT 0,

  -- AI outputs (7-day cache)
  ai_compliance_brief     TEXT,
  ai_remediation_steps    TEXT,
  ai_document_checklist   TEXT,
  ai_tax_quotation        TEXT,
  ai_generated_at         TIMESTAMPTZ,

  -- Metadata
  notes                   TEXT,
  internal_notes          TEXT,
  created_by              UUID REFERENCES users(id),
  assigned_to             UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ  -- soft delete, never hard delete compliance records
);

CREATE TABLE shipment_documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  document_type   TEXT NOT NULL,  -- bill_of_lading, pvoc_certificate, import_permit, etc.
  document_name   TEXT NOT NULL,
  file_url        TEXT,
  file_size_bytes INTEGER,
  mime_type       TEXT,
  is_required     BOOLEAN DEFAULT true,
  is_verified     BOOLEAN DEFAULT false,
  verified_by     UUID REFERENCES users(id),
  verified_at     TIMESTAMPTZ,
  expires_at      DATE,
  rejection_reason TEXT,
  notes           TEXT,
  uploaded_by     UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE shipment_timeline (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     UUID NOT NULL REFERENCES shipments(id),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  event_type      TEXT NOT NULL,
  event_title     TEXT NOT NULL,
  event_detail    TEXT,
  old_value       TEXT,
  new_value       TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 2: MANUFACTURER VAULT
-- ============================================================

CREATE TABLE manufacturers (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id),

  -- Identity
  company_name            TEXT NOT NULL,
  trading_name            TEXT,
  country                 TEXT NOT NULL DEFAULT 'IN',
  city                    TEXT,
  state                   TEXT,
  factory_address         TEXT,
  registered_address      TEXT,
  website                 TEXT,
  registration_number     TEXT,

  -- Primary contact
  primary_contact_name    TEXT,
  primary_contact_email   TEXT,
  primary_contact_phone   TEXT,
  whatsapp_number         TEXT,
  account_manager_name    TEXT,

  -- Classification
  product_categories      TEXT[],
  industries              TEXT[],
  export_markets          TEXT[],
  annual_revenue_usd      DECIMAL(14,2),
  annual_capacity_usd     DECIMAL(14,2),
  employee_count          INTEGER,
  years_in_business       INTEGER,
  factory_size_sqm        INTEGER,

  -- Vetting status
  is_vetted               BOOLEAN DEFAULT false,
  vetting_date            DATE,
  vetting_score           INTEGER CHECK (vetting_score BETWEEN 0 AND 100),
  vetting_notes           TEXT,
  next_vetting_due        DATE,
  is_preferred_supplier   BOOLEAN DEFAULT false,
  is_blacklisted          BOOLEAN DEFAULT false,
  blacklist_reason        TEXT,
  blacklisted_at          TIMESTAMPTZ,

  -- Reliability scoring (auto-calculated)
  reliability_score       INTEGER DEFAULT 50 CHECK (reliability_score BETWEEN 0 AND 100),
  financial_risk_score    INTEGER DEFAULT 50 CHECK (financial_risk_score BETWEEN 0 AND 100),
  overall_risk            risk_flag DEFAULT 'AMBER',
  total_orders_placed     INTEGER DEFAULT 0,
  orders_on_time          INTEGER DEFAULT 0,
  orders_disputed         INTEGER DEFAULT 0,

  -- Commercial terms
  minimum_order_usd       DECIMAL(10,2),
  typical_payment_terms   TEXT,  -- "30% advance, 70% on BL"
  typical_lead_time_days  INTEGER,
  accepts_lc              BOOLEAN DEFAULT false,
  accepted_currencies     TEXT[] DEFAULT ARRAY['USD'],

  notes                   TEXT,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

CREATE TABLE manufacturer_licenses (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id         UUID NOT NULL REFERENCES manufacturers(id),
  organization_id         UUID NOT NULL REFERENCES organizations(id),

  license_type            TEXT NOT NULL,     -- WHO_GMP, ISO9001, CE_MARK, BIS, FSSAI, GMP_India, etc.
  license_name            TEXT NOT NULL,
  license_number          TEXT,
  issuing_body            TEXT NOT NULL,
  issuing_country         TEXT NOT NULL,
  scope                   TEXT,              -- what products/activities it covers

  issued_date             DATE,
  expiry_date             DATE NOT NULL,
  renewal_lead_time_days  INTEGER DEFAULT 90,
  status                  license_status NOT NULL DEFAULT 'ACTIVE',

  -- KRUXVON alert tracking (never miss a renewal)
  alert_60_sent_at        TIMESTAMPTZ,
  alert_30_sent_at        TIMESTAMPTZ,
  alert_7_sent_at         TIMESTAMPTZ,
  alert_expired_sent_at   TIMESTAMPTZ,

  document_url            TEXT,
  is_verified             BOOLEAN DEFAULT false,
  verified_by             UUID REFERENCES users(id),
  verified_at             TIMESTAMPTZ,
  notes                   TEXT,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE factory_audits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id   UUID NOT NULL REFERENCES manufacturers(id),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  audit_agency_id   UUID REFERENCES audit_agencies(id),

  audit_type        TEXT NOT NULL,   -- initial_vetting, annual, pre_order, spot_check, complaint_triggered
  audit_scope       TEXT,            -- quality, compliance, capacity, financial, full
  status            audit_status NOT NULL DEFAULT 'SCHEDULED',

  scheduled_date    DATE,
  conducted_date    DATE,
  report_due_date   DATE,
  report_submitted_date DATE,

  -- Scores (0-100)
  overall_score           INTEGER CHECK (overall_score BETWEEN 0 AND 100),
  quality_mgmt_score      INTEGER CHECK (quality_mgmt_score BETWEEN 0 AND 100),
  regulatory_score        INTEGER CHECK (regulatory_score BETWEEN 0 AND 100),
  capacity_score          INTEGER CHECK (capacity_score BETWEEN 0 AND 100),
  financial_health_score  INTEGER CHECK (financial_health_score BETWEEN 0 AND 100),
  worker_conditions_score INTEGER CHECK (worker_conditions_score BETWEEN 0 AND 100),

  critical_findings       TEXT[],
  major_findings          TEXT[],
  minor_findings          TEXT[],
  recommendations         TEXT,
  corrective_action_plan  TEXT,
  corrective_action_due   DATE,

  report_url              TEXT,
  photos_url              TEXT[],

  is_approved             BOOLEAN,
  approval_expires        DATE,
  failure_reason          TEXT,

  -- Dual accreditation
  india_recognized        BOOLEAN DEFAULT false,
  kenya_recognized        BOOLEAN DEFAULT false,

  lead_auditor_name       TEXT,
  audit_fee_usd           DECIMAL(8,2),
  kruxvon_fee_usd         DECIMAL(8,2),

  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_agencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,    -- SGS, Bureau Veritas, Intertek, KEBS, NABL
  code                  TEXT UNIQUE,
  country               TEXT NOT NULL,
  headquarters          TEXT,
  is_india_accredited   BOOLEAN DEFAULT false,
  is_kenya_accredited   BOOLEAN DEFAULT false,
  is_eac_accredited     BOOLEAN DEFAULT false,
  accreditation_bodies  TEXT[],           -- NABL, KAB, ILAC
  contact_name          TEXT,
  contact_email         TEXT,
  contact_phone         TEXT,
  website               TEXT,
  revenue_share_pct     DECIMAL(4,2) DEFAULT 25.00,
  min_audit_fee_usd     DECIMAL(8,2),
  is_active             BOOLEAN DEFAULT true,
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed audit agencies
INSERT INTO audit_agencies (name, code, country, is_india_accredited, is_kenya_accredited, website) VALUES
  ('SGS Group',                  'SGS',  'CH', true, true,  'https://sgs.com'),
  ('Bureau Veritas',             'BV',   'FR', true, true,  'https://bureauveritas.com'),
  ('Intertek',                   'ITK',  'GB', true, true,  'https://intertek.com'),
  ('KEBS',                       'KEBS', 'KE', false, true, 'https://kebs.org'),
  ('National Accreditation Board for Testing and Calibration Laboratories', 'NABL', 'IN', true, false, 'https://nabl-india.org');

-- ============================================================
-- MODULE 3: ORDER PROTECTION
-- ============================================================

CREATE TABLE purchase_orders (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID NOT NULL REFERENCES organizations(id),
  manufacturer_id           UUID NOT NULL REFERENCES manufacturers(id),
  shipment_id               UUID REFERENCES shipments(id),

  po_number                 TEXT UNIQUE NOT NULL,
  status                    po_status NOT NULL DEFAULT 'DRAFT',

  -- Financials
  po_value_usd              DECIMAL(12,2) NOT NULL,
  advance_pct               DECIMAL(5,2) DEFAULT 30,
  advance_paid_usd          DECIMAL(12,2),
  advance_paid_date         DATE,
  balance_due_usd           DECIMAL(12,2),
  balance_due_trigger       TEXT,   -- "on_bl_copy", "on_delivery", "net_30"

  -- Timeline
  order_date                DATE NOT NULL,
  production_start_date     DATE,
  production_end_date       DATE,
  inspection_date           DATE,
  shipping_date             DATE,
  expected_delivery_date    DATE,
  actual_delivery_date      DATE,

  -- Protection clauses (Tier 1 order protection)
  has_priority_clause       BOOLEAN DEFAULT false,
  priority_clause_detail    TEXT,
  has_penalty_clause        BOOLEAN DEFAULT false,
  penalty_per_day_usd       DECIMAL(8,2),
  max_penalty_pct           DECIMAL(5,2),
  has_force_majeure_clause  BOOLEAN DEFAULT false,
  has_substitution_clause   BOOLEAN DEFAULT false,  -- what if manufacturer can't deliver
  substitute_manufacturer_id UUID REFERENCES manufacturers(id),
  has_escrow                BOOLEAN DEFAULT false,
  escrow_provider           TEXT,

  -- Risk monitoring
  manufacturer_risk_flag    risk_flag DEFAULT 'GREEN',
  last_risk_check_at        TIMESTAMPTZ,
  risk_alerts_count         INTEGER DEFAULT 0,

  -- Product
  product_name              TEXT NOT NULL,
  product_description       TEXT,
  quantity                  DECIMAL(12,3),
  unit                      TEXT,
  specifications_url        TEXT,
  sample_approved           BOOLEAN DEFAULT false,
  sample_approved_date      DATE,

  contract_url              TEXT,
  incoterms                 TEXT DEFAULT 'FOB',
  notes                     TEXT,
  created_by                UUID REFERENCES users(id),
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE po_milestones (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id     UUID NOT NULL REFERENCES purchase_orders(id),
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  name                  TEXT NOT NULL,   -- "Sample Approval", "Production Start", "Mid-Production Inspection"
  description           TEXT,
  milestone_type        TEXT,            -- approval, inspection, payment, shipping
  sequence_number       INTEGER,
  due_date              DATE NOT NULL,
  completed_date        DATE,
  is_completed          BOOLEAN DEFAULT false,
  is_overdue            BOOLEAN DEFAULT false,
  triggers_payment      BOOLEAN DEFAULT false,
  payment_amount_usd    DECIMAL(10,2),
  evidence_required     TEXT[],
  evidence_urls         TEXT[],
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE financial_risk_signals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id   UUID NOT NULL REFERENCES manufacturers(id),
  signal_type       TEXT NOT NULL,   -- late_payment, capacity_overload, key_departure, legal_dispute, bankruptcy_filing, unusual_delays
  severity          risk_flag NOT NULL DEFAULT 'AMBER',
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  source            TEXT,            -- "kyc_check", "news_feed", "client_report", "audit"
  evidence_url      TEXT,
  detected_at       TIMESTAMPTZ DEFAULT NOW(),
  is_resolved       BOOLEAN DEFAULT false,
  resolved_at       TIMESTAMPTZ,
  resolution_notes  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 4: PRODUCT CERTIFICATION
-- ============================================================

CREATE TABLE product_certifications (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES organizations(id),
  manufacturer_id         UUID REFERENCES manufacturers(id),
  audit_agency_id         UUID REFERENCES audit_agencies(id),

  product_name            TEXT NOT NULL,
  product_description     TEXT,
  product_category        TEXT NOT NULL,
  hs_code                 TEXT,
  brand_name              TEXT,
  model_number            TEXT,

  certification_type      TEXT NOT NULL,   -- KEBS_PVoC, BIS, ISO9001, CE, WHO_GMP, NAFDAC, SABS
  certificate_number      TEXT,
  status                  cert_status NOT NULL DEFAULT 'PENDING',

  -- India-side certification
  india_cert_required     BOOLEAN DEFAULT false,
  india_approved          BOOLEAN DEFAULT false,
  india_cert_number       TEXT,
  india_cert_body         TEXT,
  india_cert_url          TEXT,
  india_issued_date       DATE,
  india_expiry_date       DATE,

  -- Kenya-side certification
  kenya_cert_required     BOOLEAN DEFAULT true,
  kenya_approved          BOOLEAN DEFAULT false,
  kenya_cert_number       TEXT,
  kenya_cert_body         TEXT DEFAULT 'KEBS',
  kenya_cert_url          TEXT,
  kenya_issued_date       DATE,
  kenya_expiry_date       DATE,

  -- Testing
  lab_test_required       BOOLEAN DEFAULT true,
  lab_test_completed      BOOLEAN DEFAULT false,
  lab_name                TEXT,
  lab_test_date           DATE,
  lab_report_url          TEXT,
  test_parameters         TEXT[],
  test_passed             BOOLEAN,

  -- Alert tracking
  alert_60_sent_at        TIMESTAMPTZ,
  alert_30_sent_at        TIMESTAMPTZ,

  -- Fees
  certification_fee_usd   DECIMAL(8,2),
  lab_fee_usd             DECIMAL(8,2),
  kruxvon_fee_usd         DECIMAL(8,2),

  notes                   TEXT,
  created_by              UUID REFERENCES users(id),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 5: CLEARING AGENT PORTAL
-- ============================================================

CREATE TABLE clearing_agents (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id),
  agent_organization_id UUID REFERENCES organizations(id),  -- if agent has their own org on KRUXVON

  company_name          TEXT NOT NULL,
  license_number        TEXT,
  license_expiry        DATE,
  license_status        license_status DEFAULT 'ACTIVE',

  primary_contact       TEXT,
  email                 TEXT,
  phone                 TEXT,
  whatsapp_number       TEXT,

  ports_covered         TEXT[] DEFAULT ARRAY['Mombasa'],
  specializations       TEXT[],   -- pharma, agro, machinery, general
  regulatory_clearances TEXT[],   -- which bodies they're certified to clear with

  performance_score     INTEGER DEFAULT 50 CHECK (performance_score BETWEEN 0 AND 100),
  avg_clearance_days    DECIMAL(4,1),
  total_shipments_cleared INTEGER DEFAULT 0,
  disputes_count        INTEGER DEFAULT 0,

  is_preferred          BOOLEAN DEFAULT false,
  is_active             BOOLEAN DEFAULT true,

  notes                 TEXT,
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE agent_shipment_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clearing_agent_id UUID NOT NULL REFERENCES clearing_agents(id),
  shipment_id       UUID NOT NULL REFERENCES shipments(id),
  organization_id   UUID NOT NULL REFERENCES organizations(id),
  assigned_at       TIMESTAMPTZ DEFAULT NOW(),
  assigned_by       UUID REFERENCES users(id),
  status            TEXT DEFAULT 'ACTIVE',  -- ACTIVE, COMPLETED, TRANSFERRED
  fee_agreed_usd    DECIMAL(8,2),
  notes             TEXT,
  UNIQUE(clearing_agent_id, shipment_id)
);

-- ============================================================
-- MODULE 6: ALERTS + NOTIFICATIONS ENGINE
-- ============================================================

CREATE TABLE alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL REFERENCES organizations(id),

  alert_type            alert_type NOT NULL,
  severity              risk_flag NOT NULL DEFAULT 'AMBER',
  title                 TEXT NOT NULL,
  message               TEXT NOT NULL,
  action_required       TEXT,

  -- Flexible references to any entity
  shipment_id           UUID REFERENCES shipments(id),
  manufacturer_id       UUID REFERENCES manufacturers(id),
  license_id            UUID REFERENCES manufacturer_licenses(id),
  purchase_order_id     UUID REFERENCES purchase_orders(id),
  certification_id      UUID REFERENCES product_certifications(id),
  clearing_agent_id     UUID REFERENCES clearing_agents(id),

  -- Delivery
  channels              alert_channel[] DEFAULT ARRAY['IN_APP', 'EMAIL'],
  email_sent_at         TIMESTAMPTZ,
  whatsapp_sent_at      TIMESTAMPTZ,
  in_app_read_at        TIMESTAMPTZ,

  -- State
  is_read               BOOLEAN DEFAULT false,
  is_actioned           BOOLEAN DEFAULT false,
  is_dismissed          BOOLEAN DEFAULT false,
  actioned_by           UUID REFERENCES users(id),
  actioned_at           TIMESTAMPTZ,
  action_taken          TEXT,

  scheduled_for         TIMESTAMPTZ,
  sent_at               TIMESTAMPTZ,
  expires_at            TIMESTAMPTZ,

  metadata              JSONB DEFAULT '{}',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MODULE 7: INTELLIGENCE LAYER
-- ============================================================

CREATE TABLE hs_codes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  TEXT NOT NULL UNIQUE,
  description           TEXT NOT NULL,
  chapter               TEXT,
  heading               TEXT,
  import_duty_rate_pct  DECIMAL(5,2),
  excise_duty_pct       DECIMAL(5,2) DEFAULT 0,
  vat_applicable        BOOLEAN DEFAULT true,
  pvoc_required         BOOLEAN DEFAULT false,
  regulatory_body_id    UUID REFERENCES regulatory_bodies(id),
  product_category      TEXT,
  eac_rate_pct          DECIMAL(5,2),  -- EAC preferential rate
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forex_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL DEFAULT 'KES',
  rate            DECIMAL(10,4) NOT NULL,
  source          TEXT DEFAULT 'manual',  -- manual, CBK_API, open_exchange
  is_current      BOOLEAN DEFAULT true,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE port_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  port_name             TEXT NOT NULL DEFAULT 'Mombasa',
  port_code             TEXT DEFAULT 'KEMBA',
  alert_type            TEXT NOT NULL,  -- congestion, strike, flood, equipment_failure, go_slow
  severity              risk_flag NOT NULL DEFAULT 'AMBER',
  title                 TEXT NOT NULL,
  description           TEXT NOT NULL,
  estimated_delay_days  INTEGER,
  affected_cargo_types  TEXT[],
  started_at            TIMESTAMPTZ,
  estimated_end_at      TIMESTAMPTZ,
  resolved_at           TIMESTAMPTZ,
  source                TEXT,
  is_active             BOOLEAN DEFAULT true,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial forex rate
INSERT INTO forex_rates (base_currency, target_currency, rate, source) VALUES ('USD', 'KES', 129.00, 'manual');

-- ============================================================
-- AI CACHE (reduce API costs, 7-day TTL)
-- ============================================================

CREATE TABLE ai_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key     TEXT NOT NULL UNIQUE,
  input_hash    TEXT NOT NULL,
  ai_model      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  prompt_type   TEXT NOT NULL,  -- compliance_brief, tax_quotation, checklist, remediation, risk_analysis
  output        TEXT NOT NULL,
  tokens_input  INTEGER,
  tokens_output INTEGER,
  cost_usd      DECIMAL(8,6),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);

-- ============================================================
-- ROW LEVEL SECURITY (data isolation between organizations)
-- ============================================================

ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_documents     ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_timeline      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturer_licenses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE factory_audits         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE po_milestones          ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_risk_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE clearing_agents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_shipment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts                 ENABLE ROW LEVEL SECURITY;

-- RLS Policies: each org sees only their data
CREATE POLICY "org_isolation" ON shipments
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON manufacturers
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON manufacturer_licenses
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON purchase_orders
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "org_isolation" ON alerts
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

-- ============================================================
-- INDEXES (performance at scale)
-- ============================================================

CREATE INDEX idx_shipments_org         ON shipments(organization_id);
CREATE INDEX idx_shipments_pvoc        ON shipments(pvoc_deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipments_risk        ON shipments(risk_flag_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_shipments_status      ON shipments(shipment_status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfr_org               ON manufacturers(organization_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_licenses_expiry       ON manufacturer_licenses(expiry_date, status);
CREATE INDEX idx_licenses_mfr          ON manufacturer_licenses(manufacturer_id);
CREATE INDEX idx_certs_expiry          ON product_certifications(kenya_expiry_date, india_expiry_date);
CREATE INDEX idx_alerts_org_unread     ON alerts(organization_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alerts_scheduled      ON alerts(scheduled_for) WHERE sent_at IS NULL;
CREATE INDEX idx_po_org                ON purchase_orders(organization_id);
CREATE INDEX idx_po_manufacturer       ON purchase_orders(manufacturer_id);
CREATE INDEX idx_ai_cache_key          ON ai_cache(cache_key);
CREATE INDEX idx_ai_cache_expires      ON ai_cache(expires_at);
CREATE INDEX idx_forex_current         ON forex_rates(base_currency, target_currency) WHERE is_current = true;

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_shipments_updated_at         BEFORE UPDATE ON shipments         FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_manufacturers_updated_at     BEFORE UPDATE ON manufacturers     FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_mfr_licenses_updated_at      BEFORE UPDATE ON manufacturer_licenses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_factory_audits_updated_at    BEFORE UPDATE ON factory_audits    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at   BEFORE UPDATE ON purchase_orders   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_certifications_updated_at    BEFORE UPDATE ON product_certifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_clearing_agents_updated_at   BEFORE UPDATE ON clearing_agents   FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-generate shipment reference number
CREATE OR REPLACE FUNCTION generate_shipment_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reference_number IS NULL OR NEW.reference_number = '' THEN
    NEW.reference_number = 'KRUX-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('shipment_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS shipment_seq START 1;
CREATE TRIGGER trg_shipment_reference BEFORE INSERT ON shipments FOR EACH ROW EXECUTE FUNCTION generate_shipment_reference();

-- Auto-update license status based on expiry date
CREATE OR REPLACE FUNCTION update_license_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date <= CURRENT_DATE THEN
    NEW.status = 'EXPIRED';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '7 days' THEN
    NEW.status = 'EXPIRING_7';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
    NEW.status = 'EXPIRING_30';
  ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '60 days' THEN
    NEW.status = 'EXPIRING_60';
  ELSE
    NEW.status = 'ACTIVE';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_license_status BEFORE INSERT OR UPDATE ON manufacturer_licenses FOR EACH ROW EXECUTE FUNCTION update_license_status();
