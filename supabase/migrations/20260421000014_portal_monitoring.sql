-- KRUXVON: Portal Monitoring — Track A Intelligence Engine

ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS kentrade_ref       TEXT,
  ADD COLUMN IF NOT EXISTS ppb_ref            TEXT,
  ADD COLUMN IF NOT EXISTS kebs_ref           TEXT,
  ADD COLUMN IF NOT EXISTS kra_entry_number   TEXT,
  ADD COLUMN IF NOT EXISTS portal_statuses    JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS alert_sent_14d_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alert_sent_7d_at   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS alert_sent_3d_at   TIMESTAMPTZ;
