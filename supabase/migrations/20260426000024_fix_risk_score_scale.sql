-- Fix composite_risk_score scale: change constraint from 0-10 to 0-100
-- The operations page expects 0-100 scale (threshold checks >= 80, >= 50)

ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_composite_risk_score_check;
ALTER TABLE shipments ADD CONSTRAINT shipments_composite_risk_score_check
  CHECK (composite_risk_score BETWEEN 0 AND 100);
ALTER TABLE shipments ALTER COLUMN composite_risk_score SET DEFAULT 50;

-- Scale existing rows from 0-10 to 0-100 (only rows that are still in 0-10 range)
UPDATE shipments
SET composite_risk_score = composite_risk_score * 10
WHERE composite_risk_score BETWEEN 0 AND 10;
