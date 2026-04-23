-- ============================================================
-- KRUXVON — Execution Timeline Layer
-- Migration 002 — run once in Supabase SQL editor
-- ============================================================

-- ── 1. Extend actions table with execution tracking ──────────

ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS execution_status  TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS started_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS failed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS execution_notes   TEXT;

-- ── 2. Execution timeline (truth layer) ─────────────────────

CREATE TABLE IF NOT EXISTS execution_timeline (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id   UUID        NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  action_id     UUID        REFERENCES actions(id) ON DELETE SET NULL,
  organization_id UUID      NOT NULL,

  event_type    TEXT        NOT NULL,
  -- ACTION_CREATED | ACTION_STARTED | ACTION_COMPLETED
  -- ACTION_FAILED  | DOCUMENT_UPLOADED | STATUS_CHANGED
  -- RISK_UPDATED   | ALERT_SENT | PORTAL_SUBMITTED

  actor_type    TEXT        NOT NULL DEFAULT 'SYSTEM',
  -- USER | SYSTEM | AGENT

  actor_label   TEXT,       -- display name: "Operations" / "Auto-engine"
  title         TEXT        NOT NULL,
  detail        TEXT,

  metadata      JSONB       NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast per-shipment timeline queries
CREATE INDEX IF NOT EXISTS idx_execution_timeline_shipment
  ON execution_timeline (shipment_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_execution_timeline_action
  ON execution_timeline (action_id)
  WHERE action_id IS NOT NULL;

-- ── 3. RLS — org isolation ────────────────────────────────────

ALTER TABLE execution_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "org_isolation_timeline"
  ON execution_timeline
  FOR ALL
  USING (organization_id = '00000000-0000-0000-0000-000000000001'::uuid);

-- ── 4. Backfill — log existing COMPLETED actions into timeline

INSERT INTO execution_timeline (
  shipment_id, action_id, organization_id,
  event_type, actor_type, actor_label, title, metadata, created_at
)
SELECT
  a.shipment_id,
  a.id,
  a.organization_id,
  'ACTION_COMPLETED',
  'SYSTEM',
  'Backfill',
  'Action completed: ' || a.title,
  jsonb_build_object('action_type', a.action_type, 'priority', a.priority),
  COALESCE(a.completed_at, a.updated_at)
FROM actions a
WHERE a.status = 'COMPLETED'
  AND a.shipment_id IS NOT NULL
ON CONFLICT DO NOTHING;
