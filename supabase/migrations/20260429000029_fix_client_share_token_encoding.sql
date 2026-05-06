-- Fix: encode(..., 'base64url') is not supported in this Supabase instance.
-- Change the DEFAULT to hex which is always available via pgcrypto.
ALTER TABLE client_share_tokens
  ALTER COLUMN token SET DEFAULT encode(gen_random_bytes(24), 'hex');
