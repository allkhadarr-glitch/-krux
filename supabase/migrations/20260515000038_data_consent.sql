-- Data consent tiers for KRUX Lab data partnership programme
-- Tier 1 (aggregate): anonymised market-level stats only — no individual consent required
-- Tier 2 (entity):    entity-level data builds KTIN record + compliance score
-- Tier 3 (pool):      contributes to KRUX Lab AI training — highest value, free premium in return

CREATE TYPE data_consent_tier AS ENUM ('aggregate', 'entity', 'pool');

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS data_consent_tier  data_consent_tier DEFAULT 'aggregate',
  ADD COLUMN IF NOT EXISTS data_consent_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS data_consent_by    UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS is_data_partner    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS data_partner_since TIMESTAMPTZ;

-- Index for fast partner lookups used by KRUX Lab queries
CREATE INDEX IF NOT EXISTS idx_orgs_data_consent
  ON organizations (data_consent_tier, is_data_partner);

COMMENT ON COLUMN organizations.data_consent_tier IS
  'aggregate=no PII used, entity=own record only, pool=contributes to KRUX Lab intelligence';
COMMENT ON COLUMN organizations.is_data_partner IS
  'true for clearing agents / logistics companies with a signed Data Partnership Agreement';
