-- KRUXVON: Step 8 of 10 — Seed reference data

INSERT INTO regulatory_bodies (code, name, country, website) VALUES
  ('PPB',     'Pharmacy and Poisons Board',                'KE', 'https://pharmacyboardkenya.org'),
  ('KEBS',    'Kenya Bureau of Standards',                 'KE', 'https://kebs.org'),
  ('PCPB',    'Pest Control Products Board',               'KE', 'https://pcpb.or.ke'),
  ('KEPHIS',  'Kenya Plant Health Inspectorate Service',   'KE', 'https://kephis.org'),
  ('EPRA',    'Energy and Petroleum Regulatory Authority', 'KE', 'https://epra.go.ke'),
  ('KRA',     'Kenya Revenue Authority',                   'KE', 'https://kra.go.ke'),
  ('NEMA',    'National Environment Management Authority', 'KE', 'https://nema.go.ke'),
  ('WHO_GMP', 'WHO Good Manufacturing Practice',           'INT', 'https://who.int'),
  ('NTSA',    'National Transport and Safety Authority',   'KE', 'https://ntsa.go.ke'),
  ('NCA',     'National Construction Authority',           'KE', 'https://nca.go.ke'),
  ('EAC',     'East African Community Standards',          'EAC', 'https://eac.int');

INSERT INTO audit_agencies (name, code, country, is_india_accredited, is_kenya_accredited, website) VALUES
  ('SGS Group',      'SGS',  'CH', true,  true,  'https://sgs.com'),
  ('Bureau Veritas', 'BV',   'FR', true,  true,  'https://bureauveritas.com'),
  ('Intertek',       'ITK',  'GB', true,  true,  'https://intertek.com'),
  ('KEBS',           'KEBS', 'KE', false, true,  'https://kebs.org'),
  ('National Accreditation Board for Testing and Calibration Laboratories', 'NABL', 'IN', true, false, 'https://nabl-india.org');

INSERT INTO forex_rates (base_currency, target_currency, rate, source) VALUES
  ('USD', 'KES', 129.00, 'manual');
