-- KRUXVON: Step 3 of 10 — Users and regulatory rules

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

CREATE TABLE regulatory_rules (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  regulatory_body_id     UUID NOT NULL REFERENCES regulatory_bodies(id),
  rule_number            INTEGER NOT NULL,
  name                   TEXT NOT NULL,
  description            TEXT,
  product_category       TEXT NOT NULL,
  risk_level             risk_flag NOT NULL DEFAULT 'AMBER',
  import_duty_rate_pct   DECIMAL(5,2) NOT NULL DEFAULT 0,
  applies_to_countries   TEXT[] DEFAULT ARRAY['IN','CN','AE','GB','SG','JP','DE','NL'],
  documents_required     TEXT[],
  pvoc_required          BOOLEAN DEFAULT true,
  estimated_process_days INTEGER DEFAULT 14,
  is_active              BOOLEAN DEFAULT true,
  created_at             TIMESTAMPTZ DEFAULT NOW(),
  updated_at             TIMESTAMPTZ DEFAULT NOW()
);
