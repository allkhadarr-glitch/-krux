-- Migration 36: Application reference number on actions
ALTER TABLE actions ADD COLUMN IF NOT EXISTS portal_ref TEXT;
