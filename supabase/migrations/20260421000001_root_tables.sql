-- KRUXVON: Step 2 of 10 — Root tables (no foreign key dependencies)

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
  tax_pin                 TEXT,
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

CREATE TABLE regulatory_bodies (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT NOT NULL UNIQUE,
  name          TEXT NOT NULL,
  country       TEXT NOT NULL DEFAULT 'KE',
  website       TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  description   TEXT,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_agencies (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                  TEXT NOT NULL,
  code                  TEXT UNIQUE,
  country               TEXT NOT NULL,
  headquarters          TEXT,
  is_india_accredited   BOOLEAN DEFAULT false,
  is_kenya_accredited   BOOLEAN DEFAULT false,
  is_eac_accredited     BOOLEAN DEFAULT false,
  accreditation_bodies  TEXT[],
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
  eac_rate_pct          DECIMAL(5,2),
  notes                 TEXT,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE forex_rates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency   TEXT NOT NULL DEFAULT 'USD',
  target_currency TEXT NOT NULL DEFAULT 'KES',
  rate            DECIMAL(10,4) NOT NULL,
  source          TEXT DEFAULT 'manual',
  is_current      BOOLEAN DEFAULT true,
  recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE port_alerts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  port_name             TEXT NOT NULL DEFAULT 'Mombasa',
  port_code             TEXT DEFAULT 'KEMBA',
  alert_type            TEXT NOT NULL,
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

CREATE TABLE ai_cache (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key     TEXT NOT NULL UNIQUE,
  input_hash    TEXT NOT NULL,
  ai_model      TEXT NOT NULL DEFAULT 'claude-sonnet-4-6',
  prompt_type   TEXT NOT NULL,
  output        TEXT NOT NULL,
  tokens_input  INTEGER,
  tokens_output INTEGER,
  cost_usd      DECIMAL(8,6),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
);
