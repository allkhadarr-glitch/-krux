-- Sprint 7: Client Portfolio support
-- Adds client_name to shipments so clearing agents can group by importer
-- Adds client_share_tokens for read-only per-client portal links

ALTER TABLE shipments ADD COLUMN IF NOT EXISTS client_name TEXT;

CREATE INDEX IF NOT EXISTS idx_shipments_client_name ON shipments(organization_id, client_name) WHERE deleted_at IS NULL;

-- Client share tokens table
CREATE TABLE IF NOT EXISTS client_share_tokens (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  client_name    TEXT NOT NULL,
  token          TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'base64url'),
  label          TEXT,
  created_by     UUID REFERENCES users(id),
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_share_tokens_token ON client_share_tokens(token);
CREATE INDEX IF NOT EXISTS idx_client_share_tokens_org   ON client_share_tokens(organization_id);

-- Public read for share token lookup (token is secret enough)
ALTER TABLE client_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON client_share_tokens
  USING (organization_id = (SELECT organization_id FROM users WHERE id = auth.uid()));

CREATE POLICY "public_token_read" ON client_share_tokens
  FOR SELECT USING (true);
