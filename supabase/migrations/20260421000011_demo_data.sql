-- KRUXVON: Demo organization + 10 seed shipments for development

INSERT INTO organizations (id, name, type, country, city, subscription_tier)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'KRUXVON Demo Org',
  'sme_importer',
  'KE',
  'Nairobi',
  'pro'
);

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX LOGISTICS PIPELINE',
  'Mumbai, India', 'Mombasa',
  25000, 33257.50, 4290218, '2026-04-23',
  'AMBER', 'OPEN', 'AT_PORT', 8, 150, 129,
  id FROM regulatory_bodies WHERE code = 'PPB';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX PHARMA PVOC SHIPMENT',
  'Chennai, India', 'Mombasa',
  18000, 27195.00, 3508395, '2026-05-01',
  'AMBER', 'OPEN', 'IN_TRANSIT', 7, 120, 129,
  id FROM regulatory_bodies WHERE code = 'KEBS';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX FERTILIZER SHIPMENT',
  'Shanghai, China', 'Mombasa',
  32000, 42832.00, 5526528, '2026-05-05',
  'GREEN', 'OPEN', 'IN_TRANSIT', 4, 200, 129,
  id FROM regulatory_bodies WHERE code = 'PCPB';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX AGRO KEPHIS SHIPMENT',
  'Dubai, UAE', 'Mombasa',
  14500, 19473.75, 2514079, '2026-05-08',
  'AMBER', 'OPEN', 'PENDING', 6, 100, 129,
  id FROM regulatory_bodies WHERE code = 'KEPHIS';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX WHO-GMP PHARMA SHIPMENT',
  'Amsterdam, Netherlands', 'Mombasa',
  45000, 67737.50, 8738138, '2026-05-10',
  'GREEN', 'OPEN', 'IN_TRANSIT', 3, 300, 129,
  id FROM regulatory_bodies WHERE code = 'WHO_GMP';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX SUPPLEMENTS KEBS SHIPMENT',
  'London, UK', 'Mombasa',
  9500, 15800.00, 2038200, '2026-05-12',
  'GREEN', 'OPEN', 'PENDING', 3, 80, 129,
  id FROM regulatory_bodies WHERE code = 'KEBS';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX GREEN ENERGY EPRA SHIPMENT',
  'Shenzhen, China', 'Mombasa',
  67000, 95000.00, 12255000, '2026-05-15',
  'GREEN', 'OPEN', 'IN_TRANSIT', 2, 400, 129,
  id FROM regulatory_bodies WHERE code = 'EPRA';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX KRA CUSTOMS SHIPMENT',
  'Singapore', 'Mombasa',
  28000, 40000.00, 5160000, '2026-05-18',
  'AMBER', 'IN_PROGRESS', 'CUSTOMS_HOLD', 6, 180, 129,
  id FROM regulatory_bodies WHERE code = 'KRA';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX NEMA CONSTRUCTION SHIPMENT',
  'Jebel Ali, UAE', 'Mombasa',
  54000, 76500.00, 9868500, '2026-05-20',
  'RED', 'ESCALATED', 'CUSTOMS_HOLD', 9, 350, 129,
  id FROM regulatory_bodies WHERE code = 'NEMA';

INSERT INTO shipments (organization_id, name, origin_port, destination_port, cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, composite_risk_score, storage_rate_per_day, exchange_rate_used, regulatory_body_id)
SELECT
  '00000000-0000-0000-0000-000000000001',
  'KRUX KEBS MACHINERY SHIPMENT',
  'Tokyo, Japan', 'Mombasa',
  89000, 107000.00, 13803000, '2026-05-25',
  'GREEN', 'CLOSED', 'DELIVERED', 2, 500, 129,
  id FROM regulatory_bodies WHERE code = 'KEBS';
