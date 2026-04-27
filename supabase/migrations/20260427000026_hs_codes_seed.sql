-- HS Codes seed — covers petroleum, pharma, agrochem, electronics, food
-- Used by HS Lookup tool and HS code autocomplete in Add Shipment

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2710.19.11', 'Aviation turbine fuel (Jet A-1, kerosene-type)', '27', '2710', 0, 0, true, true, 'Petroleum & Energy', 0,
  'Zero import duty under EAC CET. Common misclassification: declared as 2710.19.90 (25% duty) — KES penalty risk on large consignments.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2710.19.90', 'Other medium oils and petroleum preparations', '27', '2710', 25, 0, true, true, 'Petroleum & Energy', 25,
  'Catch-all for unspecified petroleum products. 25% import duty. Frequently used to misclassify Jet A-1 — triggers 25% duty on full CIF value.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2710.12.10', 'Motor spirit (petrol / gasoline), unleaded', '27', '2710', 0, 0, true, true, 'Petroleum & Energy', 0,
  'Petrol for motor vehicles. Zero import duty. Excise duty collected domestically by KRA.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2710.19.21', 'Kerosene (illuminating kerosene / IK)', '27', '2710', 0, 0, true, true, 'Petroleum & Energy', 0,
  'Illuminating kerosene for household use. Zero duty. EPRA import permit required.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2710.19.31', 'Gas oils (diesel)', '27', '2710', 0, 0, true, true, 'Petroleum & Energy', 0,
  'Automotive and industrial diesel. Zero import duty. EPRA permit mandatory.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2711.21.00', 'Natural gas in gaseous state', '27', '2711', 0, 0, true, true, 'Petroleum & Energy', 0,
  'LNG and natural gas imports. Regulated by EPRA under the Energy Act 2019.',
  id FROM regulatory_bodies WHERE code = 'EPRA'
ON CONFLICT (code) DO NOTHING;

-- Pharmaceuticals (PPB)
INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3004.20', 'Medicaments containing antibiotics (Amoxicillin, Azithromycin, etc.)', '30', '3004', 0, 0, false, true, 'Pharmaceuticals', 0,
  'Zero duty, VAT exempt under Kenya Finance Act. PPB import permit + Certificate of Analysis + WHO-GMP required. 45-day SLA.',
  id FROM regulatory_bodies WHERE code = 'PPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3004.32', 'Medicaments containing corticosteroids', '30', '3004', 0, 0, false, true, 'Pharmaceuticals', 0,
  'Zero duty. PPB controlled. Requires additional narcotic/psychotropic import authorization if applicable.',
  id FROM regulatory_bodies WHERE code = 'PPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3004.90', 'Other medicaments (mixed or unmixed products)', '30', '3004', 0, 0, false, true, 'Pharmaceuticals', 0,
  'Broad pharmaceutical category. Zero duty. Each product requires individual PPB registration before importation.',
  id FROM regulatory_bodies WHERE code = 'PPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3002.12', 'Vaccines for human medicine', '30', '3002', 0, 0, false, true, 'Pharmaceuticals', 0,
  'Zero duty, zero VAT. Cold chain compliance mandatory. PPB import licence + MOH approval required.',
  id FROM regulatory_bodies WHERE code = 'PPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2936.29', 'Vitamins and their derivatives (supplements)', '29', '2936', 10, 0, true, true, 'Pharmaceuticals', 10,
  '10% import duty. PPB classification depends on health claim — may require food or pharmaceutical registration.',
  id FROM regulatory_bodies WHERE code = 'PPB'
ON CONFLICT (code) DO NOTHING;

-- Agrochemicals (KEPHIS / PCPB)
INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3808.91', 'Insecticides (pyrethroids, organophosphates, neonicotinoids)', '38', '3808', 25, 0, true, true, 'Agrochemicals', 25,
  '25% import duty. KEPHIS phytosanitary certificate + PCPB registration mandatory. 7-day KEPHIS SLA.',
  id FROM regulatory_bodies WHERE code = 'KEPHIS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3808.92', 'Fungicides', '38', '3808', 25, 0, true, true, 'Agrochemicals', 25,
  '25% import duty. KEPHIS + PCPB registration. Maximum residue limits (MRL) compliance required.',
  id FROM regulatory_bodies WHERE code = 'KEPHIS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3808.93', 'Herbicides, anti-sprouting products and plant-growth regulators', '38', '3808', 25, 0, true, true, 'Agrochemicals', 25,
  '25% import duty. PCPB registration mandatory. Glyphosate products face additional scrutiny.',
  id FROM regulatory_bodies WHERE code = 'PCPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3105.20', 'Mineral or chemical fertilisers — NPK compound', '31', '3105', 0, 0, true, true, 'Agrochemicals', 0,
  'Zero import duty. PCPB fertilizer import permit required. 21-day SLA. Bulk bags require fumigation certificate.',
  id FROM regulatory_bodies WHERE code = 'PCPB'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3102.10', 'Urea (fertilizer grade)', '31', '3102', 0, 0, true, true, 'Agrochemicals', 0,
  'Zero import duty. Single-nutrient nitrogen fertilizer. PCPB import permit required.',
  id FROM regulatory_bodies WHERE code = 'PCPB'
ON CONFLICT (code) DO NOTHING;

-- Electronics (KEBS)
INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8471.30', 'Portable digital automatic data processing machines (laptops)', '84', '8471', 0, 0, true, false, 'Electronics & ICT', 0,
  'Zero duty under EAC CET. KEBS type approval required. Kenya Bureau of Standards mark mandatory.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8517.12', 'Mobile phones (smartphones)', '85', '8517', 25, 0, true, false, 'Electronics & ICT', 25,
  '25% import duty. Excise duty 10% on CIF. KEBS type approval + Communications Authority (CA) type approval required.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '9405.40', 'LED lamps and lighting fittings', '94', '9405', 25, 0, true, true, 'Electronics & ICT', 25,
  '25% import duty. KEBS energy efficiency certification required. Minimum energy performance standards apply.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8528.72', 'Colour flat panel display TV sets', '85', '8528', 25, 0, true, true, 'Electronics & ICT', 25,
  '25% import duty + 10% excise duty. KEBS mandatory standards mark (Diamond Mark). Energy labelling required.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8542.31', 'Electronic integrated circuits (processors, chips)', '85', '8542', 0, 0, true, false, 'Electronics & ICT', 0,
  'Zero duty. No PVoC requirement. KEBS type approval may apply depending on end-use application.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

-- Food & Beverage (KEBS)
INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '1006.30', 'Semi-milled or wholly milled rice', '10', '1006', 35, 0, true, true, 'Food & Beverage', 35,
  '35% import duty. KEBS mandatory standards certification. Common food security import — government may waive duty in shortage years.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '1901.20', 'Mixes and doughs for preparation of bakers'' wares', '19', '1901', 25, 0, true, true, 'Food & Beverage', 25,
  '25% import duty. KEBS food safety standards. Shelf life and ingredient declaration compliance required.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '2101.20', 'Extracts, essences and concentrates of tea', '21', '2101', 25, 0, true, true, 'Food & Beverage', 25,
  '25% import duty. Ironic given Kenya is a tea exporter — applies to processed/value-added tea imports.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;

-- Industrial & Construction (NEMA / KEBS)
INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '3923.29', 'Plastic bags and sacks (other)', '39', '3923', 25, 0, true, true, 'Industrial & Packaging', 25,
  '25% import duty. Kenya Plastics Ban (2017) — single-use plastic bags prohibited. Biodegradable exemptions apply.',
  id FROM regulatory_bodies WHERE code = 'NEMA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8704.21', 'Motor vehicles for the transport of goods (diesel, GVW ≤5t)', '87', '8704', 25, 0, true, false, 'Vehicles & Transport', 25,
  '25% import duty. KRA motor vehicle inspection. Vehicles over 8 years old from manufacture date are prohibited.',
  id FROM regulatory_bodies WHERE code = 'KRA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO hs_codes (code, description, chapter, heading, import_duty_rate_pct, excise_duty_pct, vat_applicable, pvoc_required, product_category, eac_rate_pct, notes, regulatory_body_id)
SELECT '8544.42', 'Electric conductors (cables and wiring harnesses)', '85', '8544', 25, 0, true, true, 'Industrial & Packaging', 25,
  '25% import duty. KEBS mandatory standards (KS 04-1543). Used in construction and automotive sectors.',
  id FROM regulatory_bodies WHERE code = 'KEBS'
ON CONFLICT (code) DO NOTHING;
