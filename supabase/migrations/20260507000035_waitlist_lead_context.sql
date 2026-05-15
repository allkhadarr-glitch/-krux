-- Migration 35 — Lead context and tier on waitlist
ALTER TABLE waitlist
  ADD COLUMN IF NOT EXISTS lead_tier    TEXT DEFAULT 'COLD',
  ADD COLUMN IF NOT EXISTS lead_context JSONB;
