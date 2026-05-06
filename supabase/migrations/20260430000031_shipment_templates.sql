-- Shipment Templates — save repeat shipment configs for one-click reuse

CREATE TABLE shipment_templates (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name                 TEXT        NOT NULL,
  hs_code              TEXT,
  origin_country       TEXT,
  regulatory_body_id   UUID        REFERENCES regulatory_bodies(id),
  shipment_type        TEXT        NOT NULL DEFAULT 'STANDARD',
  storage_rate_per_day NUMERIC(10,2),
  weight_kg            NUMERIC(10,2),
  cif_value_usd        NUMERIC(12,2),
  notes                TEXT,
  use_count            INTEGER     NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_st_org ON shipment_templates(organization_id);

ALTER TABLE shipment_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON shipment_templates
  USING (organization_id = (
    SELECT organization_id FROM users WHERE id = auth.uid()
  ));

CREATE OR REPLACE FUNCTION increment_template_use(p_id UUID, p_org UUID)
RETURNS VOID LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE shipment_templates
  SET use_count = use_count + 1, updated_at = NOW()
  WHERE id = p_id AND organization_id = p_org;
$$;
