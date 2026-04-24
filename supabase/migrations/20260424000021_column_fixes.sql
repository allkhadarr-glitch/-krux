-- KRUXVON: Migration 21 — Column gap fixes
-- Adds: actions.assignee_name, execution_timeline.confidence
-- Fixes: execution_timeline RLS (was hardcoded to fallback org)

-- ── 1. actions — add assignee_name for display purposes ──────
ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS assignee_name TEXT;

-- ── 2. execution_timeline — add confidence column ────────────
ALTER TABLE execution_timeline
  ADD COLUMN IF NOT EXISTS confidence TEXT NOT NULL DEFAULT 'SYSTEM';
  -- Values: SYSTEM | USER | INFERRED

-- ── 3. Fix execution_timeline RLS — was hardcoded to a single org
-- Drop the old bad policy first, then recreate it properly.
DROP POLICY IF EXISTS "org_isolation_timeline" ON execution_timeline;

CREATE POLICY "org_isolation" ON execution_timeline
  FOR ALL
  USING (
    organization_id = (
      SELECT organization_id
      FROM user_profiles
      WHERE user_id = auth.uid()
      LIMIT 1
    )
  );

-- ── 4. shipment_documents — add uploaded_at alias column ─────
-- The documents API orders by uploaded_at; schema only has created_at.
-- Add uploaded_at as a generated column mirroring created_at.
ALTER TABLE shipment_documents
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Backfill: set uploaded_at = created_at for existing rows
UPDATE shipment_documents SET uploaded_at = created_at WHERE uploaded_at != created_at;
