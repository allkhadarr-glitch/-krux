-- Migration 27: Motor vehicle import fields + KRA ruling watch
-- Adds fields to support:
--   1. KRA tariff ruling alerts (flagged mid-transit or at-port)
--   2. Shipment type (STANDARD / BONDED / TRANSIT) from James SIGINON discovery
--   3. Motor vehicle specific duty fields (excise duty, RPB, NTSA, plates, MSS)

-- Shipment type enum
DO $$ BEGIN
  CREATE TYPE shipment_type_enum AS ENUM ('STANDARD', 'BONDED', 'TRANSIT');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Core new columns on shipments
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS shipment_type         shipment_type_enum DEFAULT 'STANDARD',
  ADD COLUMN IF NOT EXISTS kra_ruling_flag        boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS kra_ruling_notes       text,
  ADD COLUMN IF NOT EXISTS kra_ruling_flagged_at  timestamptz;

-- Motor vehicle duty fields (populated when import_type = motor_vehicle in duty-calc)
ALTER TABLE shipments
  ADD COLUMN IF NOT EXISTS excise_duty_usd        numeric(12,2),
  ADD COLUMN IF NOT EXISTS mss_levy_usd           numeric(10,2),
  ADD COLUMN IF NOT EXISTS rpb_inspection_usd     numeric(10,2),
  ADD COLUMN IF NOT EXISTS ntsa_registration_usd  numeric(10,2),
  ADD COLUMN IF NOT EXISTS number_plate_usd       numeric(10,2),
  ADD COLUMN IF NOT EXISTS vehicle_age_years      integer;

-- Index for KRA ruling watch query (alerts/send route)
CREATE INDEX IF NOT EXISTS idx_shipments_kra_ruling
  ON shipments (kra_ruling_flag, deleted_at)
  WHERE kra_ruling_flag = true;

-- RPB and NTSA into regulatory_bodies table (reference data)
INSERT INTO regulatory_bodies (code, name, country, website, description, is_active)
VALUES
  ('RPB',  'Radiation Protection Board',         'KE', 'https://rpb.go.ke',   'Mandatory radiation inspection for used motor vehicles and hazardous materials. KES 1,000 per used vehicle.', true),
  ('NTSA', 'National Transport and Safety Authority', 'KE', 'https://ntsa.go.ke', 'Motor vehicle registration, number plate issuance, and roadworthiness inspection for imported vehicles.', true)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      website = EXCLUDED.website,
      description = EXCLUDED.description,
      is_active = EXCLUDED.is_active;
