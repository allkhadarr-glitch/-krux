-- Migration 33 — Flutterwave billing columns (replaces Stripe)
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS flw_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS flw_plan_id         TEXT;

CREATE INDEX IF NOT EXISTS idx_orgs_flw_subscription
  ON organizations(flw_subscription_id)
  WHERE flw_subscription_id IS NOT NULL;
