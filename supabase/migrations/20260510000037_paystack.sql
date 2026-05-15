-- Migration 37 — Paystack billing (replaces Flutterwave)
-- Also adds missing subscription_tier enum values (starter/standard/professional
-- were used in billing UI but never added to the enum)

ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'starter';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'standard';
ALTER TYPE subscription_tier ADD VALUE IF NOT EXISTS 'professional';

ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS pst_subscription_code TEXT,
  ADD COLUMN IF NOT EXISTS pst_customer_code     TEXT,
  ADD COLUMN IF NOT EXISTS pst_email_token       TEXT;

CREATE INDEX IF NOT EXISTS idx_orgs_pst_subscription
  ON organizations(pst_subscription_code)
  WHERE pst_subscription_code IS NOT NULL;
