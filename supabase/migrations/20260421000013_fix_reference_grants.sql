-- Grant SELECT on reference/lookup tables to anon + authenticated roles
GRANT SELECT ON regulatory_bodies  TO anon, authenticated;
GRANT SELECT ON audit_agencies     TO anon, authenticated;
GRANT SELECT ON hs_codes           TO anon, authenticated;
GRANT SELECT ON forex_rates        TO anon, authenticated;
GRANT SELECT ON port_alerts        TO anon, authenticated;
GRANT SELECT ON ai_cache           TO anon, authenticated;
GRANT SELECT ON regulatory_rules   TO anon, authenticated;

-- Also ensure shipments.regulatory_body_id is populated correctly
UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX LOGISTICS PIPELINE'    AND rb.code = 'PPB';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX PHARMA PVOC SHIPMENT'  AND rb.code = 'KEBS';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX FERTILIZER SHIPMENT'   AND rb.code = 'PCPB';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX AGRO KEPHIS SHIPMENT'  AND rb.code = 'KEPHIS';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX WHO-GMP PHARMA SHIPMENT' AND rb.code = 'WHO_GMP';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX SUPPLEMENTS KEBS SHIPMENT' AND rb.code = 'KEBS';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX GREEN ENERGY EPRA SHIPMENT' AND rb.code = 'EPRA';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX KRA CUSTOMS SHIPMENT'  AND rb.code = 'KRA';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX NEMA CONSTRUCTION SHIPMENT' AND rb.code = 'NEMA';

UPDATE shipments s
SET regulatory_body_id = rb.id
FROM regulatory_bodies rb
WHERE s.name = 'KRUX KEBS MACHINERY SHIPMENT' AND rb.code = 'KEBS';
