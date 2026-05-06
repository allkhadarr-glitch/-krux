/**
 * KRUX Regulatory Intelligence — Africa-first, Kenya live
 *
 * This is the knowledge foundation of the entire platform. Every AI route,
 * every risk calculation, every alert message draws from this data.
 *
 * Architecture: country → regulators → requirements.
 * Adding a new African country = adding a CountryProfile entry. No code changes.
 */

// ─── Types ───────────────────────────────────────────────────

export interface DocumentRequirement {
  name: string
  mandatory: boolean
  condition?: string
  rejection_reason: string
  source_hint?: string
}

/**
 * Penalty structure for a missed regulatory deadline.
 * Types:
 *   none          — regulator imposes no direct financial penalty; exposure is purely storage/demurrage
 *   fixed_cost    — a known fixed reinspection or re-submission fee
 *   pct_cif       — a percentage of CIF value, applied per week after deadline
 *   seizure_risk  — goods may be detained, destroyed, or seized; full shipment value at risk
 *
 * confidence flag:
 *   'verified'  — confirmed against primary source (legislation, official gazette, or domain expert)
 *   'estimated' — based on general knowledge of Kenya trade law; must be verified before quoting to clients
 */
export interface PenaltyStructure {
  type: 'none' | 'fixed_cost' | 'pct_cif' | 'seizure_risk'
  rate_pct_per_week?: number    // % of CIF per week (pct_cif type only)
  cap_pct?: number              // ceiling: max penalty as % of CIF
  fixed_cost_usd?: number       // fixed USD amount (fixed_cost type only)
  description: string           // plain-language: what actually happens when deadline is missed
  confidence: 'verified' | 'estimated'
}

export interface RegulatorProfile {
  code: string
  full_name: string
  regulates: string[]
  sla_official_days: number
  sla_actual_days: number
  documents: DocumentRequirement[]
  penalty: PenaltyStructure
  portal_url: string
  phone: string
  fees_summary: string
  common_rejections: string[]
  escalation_path: string
  notes: string
  last_verified: string  // date when this profile was last checked against primary source
}

/**
 * KPA (Kenya Ports Authority) demurrage — applies to ALL shipments regardless of regulator.
 * Charged per container per day after the free period expires.
 * Rates vary by container type and terminal; figures here are indicative averages.
 */
export interface KPADemurrage {
  free_days: number           // days before demurrage starts (typically 3–5 at KPA)
  daily_rate_usd: number      // average per container per day after free period
  doubles_after_days: number  // day number at which rate doubles
  confidence: 'verified' | 'estimated'
}

export interface CountryProfile {
  country_code: string
  country_name: string
  currency: string
  port_of_entry: string
  usd_rate: number
  kpa_demurrage: KPADemurrage
  regulators: RegulatorProfile[]
}

export interface ExposureResult {
  storage_usd:    number
  storage_kes:    number
  demurrage_usd:  number
  demurrage_kes:  number
  penalty_usd:    number
  penalty_kes:    number
  total_usd:      number
  total_kes:      number
  is_estimated:   boolean       // true when any figure uses unverified assumptions
  seizure_risk:   boolean       // true when regulator can destroy/seize goods
  penalty_notes:  string[]      // explanation of what each penalty component represents
}

// ─── Kenya ───────────────────────────────────────────────────

const KENYA: CountryProfile = {
  country_code: 'KE',
  country_name: 'Kenya',
  currency: 'KES',
  port_of_entry: 'Mombasa',
  usd_rate: 130,
  kpa_demurrage: {
    free_days: 5,
    daily_rate_usd: 75,
    doubles_after_days: 14,
    confidence: 'estimated',
    // NOTE — Two separate charges apply at Mombasa port:
    // 1. KPA PORT STORAGE: charged by Kenya Ports Authority for goods remaining in the container yard
    //    after the free storage period (typically 5 days from vessel discharge). Rates vary by
    //    container type (20ft/40ft) and terminal. Verify current schedule at kpa.co.ke.
    //    ~USD 50–100/container/day is a rough average; doubles after ~14 days.
    // 2. SHIPPING LINE DEMURRAGE: charged by the shipping company for containers not returned
    //    within the free time (separate from KPA storage). Ranges from USD 75–200+/day depending
    //    on shipping line and container type. These are two distinct costs — both accrue simultaneously.
    // The figure here approximates KPA port storage only.
  },
  regulators: [
    {
      code: 'PPB',
      full_name: 'Pharmacy and Poisons Board',
      regulates: ['Pharmaceuticals', 'Medical Devices', 'Veterinary Drugs', 'Cosmetics', 'Nutraceuticals'],
      sla_official_days: 45,
      sla_actual_days: 52,
      documents: [
        { name: 'PPB Application Form PPB/IMP/[year]', mandatory: true, rejection_reason: 'PPB will not open a file without this form — all other documents are rejected on receipt', source_hint: 'Download at eprocurement.ppb.go.ke' },
        { name: 'Certificate of Analysis (CoA) — batch-specific', mandatory: true, rejection_reason: 'Must be from the specific manufacturing batch. Generic or product-level CoA rejected', source_hint: 'Request from manufacturer with lot number matching BoL' },
        { name: 'WHO-GMP Certificate', mandatory: true, rejection_reason: 'PPB requires valid WHO-GMP from national medicine authority (NMPA for China, CDSCO for India, EMA for EU). Must not be expired', source_hint: 'Issue date must be within 3 years. Check expiry carefully' },
        { name: 'Free Sale Certificate from country of origin', mandatory: true, rejection_reason: 'Confirms the product is legally sold in the exporting country', source_hint: 'Issued by health ministry of exporting country' },
        { name: 'Product Dossier (for new products)', mandatory: false, condition: 'Required for products not previously registered with PPB', rejection_reason: 'New pharmaceutical products require full technical dossier: composition, manufacturing process, stability data, clinical data' },
        { name: 'Product Labeling (English)', mandatory: true, rejection_reason: 'Label must comply with Kenya Pharmacy and Poisons Act Cap 244. Dosage, storage conditions, manufacturer details required', source_hint: 'Review against PPB labeling guidelines at ppb.go.ke' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'KRA customs requires IDF for all imports over USD 1,000', source_hint: 'Filed on KRA iCMS (Integrated Customs Management System) by your licensed clearing agent' },
        { name: 'Bill of Lading / Airway Bill', mandatory: true, rejection_reason: 'Original BoL required for customs clearance', source_hint: 'Obtain from shipping line' },
        { name: 'Commercial Invoice + Packing List', mandatory: true, rejection_reason: 'Must match BoL quantities exactly. Discrepancies trigger KRA review', source_hint: 'Ensure invoice matches BoL and packing list' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 385,
        description: 'PPB imposes no direct % of CIF penalty. Missed deadline means re-submission (KES 15,000–50,000 fee) plus ongoing KPA storage. PPB cannot expedite pharmaceuticals — clock restarts. Goods risk being deemed abandoned after 90 days.',
        confidence: 'estimated',
      },
      portal_url: 'https://eprocurement.ppb.go.ke',
      phone: '+254 020 272 4060',
      fees_summary: 'Import permit: KES 15,000–50,000 depending on product category. Expedited processing: KES 25,000 additional',
      common_rejections: [
        'Expired WHO-GMP certificate — most common single cause of PPB rejection',
        'CoA not batch-specific (product-level CoA submitted instead of batch CoA)',
        'Missing Free Sale Certificate',
        'Label not compliant with Kenya Pharmacy Act (wrong font size, missing storage conditions)',
        'Product dossier incomplete for new registrations',
      ],
      escalation_path: 'PPB Registrations Manager: +254 020 272 4061. Physical address: Upper Hill, Nairobi. For urgent cases: ppb@ppb.go.ke',
      notes: 'PPB 45-day SLA is a hard floor for pharmaceuticals — expedited track exists for essential medicines only with additional documentation. Plan 52 days for actual clearance. PPB does not communicate proactively — you must follow up.',
      last_verified: 'May 2026 — official SLA confirmed via PPB Customer Service Charter. 52d actual unconfirmed; call +254 020 272 4060',
    },
    {
      code: 'KEBS',
      full_name: 'Kenya Bureau of Standards',
      regulates: ['Electronics', 'Electrical Equipment', 'Construction Materials', 'Textiles', 'Footwear', 'Food Processing Equipment', 'Motor Vehicles', 'Toys'],
      sla_official_days: 30, // Note: The 5-6 working day figure found in KEBS PVoC manual refers to the INSPECTION STEP at origin only. Full process (scheduling + inspection + certificate issuance + transit to Kenya) takes 30-35 days. Our 30d official estimate is the lead time importers need to allow before vessel departure, not the certificate-to-issuance time.
      sla_actual_days: 35,
      documents: [
        { name: 'KEBS Type Approval Application', mandatory: true, rejection_reason: 'All KEBS-regulated products must have type approval before export. No exceptions', source_hint: 'Apply at kebs.org or through appointed verification agency' },
        { name: 'Independent Lab Test Reports (standard-specific)', mandatory: true, rejection_reason: 'Test must be from KEBS-accredited or internationally recognized lab. Common standards: IEC 60598-1 (luminaires), IEC 60950/62368 (IT equipment), IEC 60335 (household appliances), EN 71 (toys)', source_hint: 'Only KEBS-accredited labs accepted. List at kebs.org/accredited-labs' },
        { name: "Manufacturer's Declaration of Conformity", mandatory: true, rejection_reason: 'Manufacturer must declare conformity to Kenya standards. Must be signed by authorized representative', source_hint: 'Request from manufacturer on company letterhead' },
        { name: 'CB Test Certificate (where applicable)', mandatory: false, condition: 'Required for electrical products covered by CB scheme', rejection_reason: 'Without CB cert, separate testing at point of entry may be required' },
        { name: 'PVOC Certificate from origin (via SGS/Bureau Veritas)', mandatory: true, rejection_reason: 'KEBS operates a Pre-Export Verification of Conformity scheme. Products must be inspected at origin by appointed agency (SGS, Bureau Veritas, Intertek)', source_hint: 'Contact SGS or Bureau Veritas at country of origin before shipment' },
        { name: 'Commercial Invoice + Packing List', mandatory: true, rejection_reason: 'Must match test reports and type approval exactly — model numbers, quantities', source_hint: 'Ensure model numbers match type approval certificate exactly' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by your licensed clearing agent' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 2500,
        description: 'No PVOC certificate = mandatory port re-testing at importer\'s cost. Re-testing: USD 1,500–5,000 + 14–21 days additional detention. If product fails testing, it cannot be cleared.',
        confidence: 'estimated',
      },
      portal_url: 'https://kebs.org/services/pre-export-verification',
      phone: '+254 020 605 0000',
      fees_summary: 'Type approval application: KES 5,000–20,000. PVOC certificate fee: USD 200–800 depending on shipment value. KEBS inspection at port: KES 3,000–15,000',
      common_rejections: [
        'Test reports from non-accredited labs — KEBS maintains a specific list of accepted labs',
        'Product model number on invoice does not match type approval certificate',
        'No PVOC certificate from origin (not inspected before export)',
        'IEC standard version outdated (e.g., old IEC 60950 instead of current IEC 62368)',
        'Missing CB test certificate for electrical products',
      ],
      escalation_path: 'KEBS Imports: +254 020 605 0400. PVOC Unit: pvoc@kebs.org. Port liaison office at KPA Mombasa: +254 041 222 1060',
      notes: 'KEBS PVoC (Pre-export Verification of Conformity) is a PRE-SHIPMENT inspection — it must be completed at origin before the goods leave the exporting country. Appointed agencies are SGS, Bureau Veritas, and Intertek. If a shipment arrives at Mombasa WITHOUT a valid PVoC certificate, KEBS will detain the goods for port-based re-testing — typically USD 1,500–5,000 and 14–21 additional days. The SLA clock shown in KRUX reflects the full clearance cycle including pre-shipment PVoC; if your PVoC cert is already in hand on arrival, port clearance is typically 3–5 working days.',
      last_verified: 'May 2026 — 5-6 working day figure is inspection step only. 30d is correct full lead time before vessel departure',
    },
    {
      code: 'PCPB',
      full_name: 'Pest Control Products Board',
      regulates: ['Pesticides', 'Herbicides', 'Fungicides', 'Rodenticides', 'Plant Growth Regulators', 'Wood Preservatives'],
      sla_official_days: 21,
      sla_actual_days: 18,
      documents: [
        { name: 'PCPB Application Form', mandatory: true, rejection_reason: 'Standard registration form required for all pest control product imports', source_hint: 'Download at pcpb.or.ke/downloads' },
        { name: 'Efficacy Data (field trial results)', mandatory: true, rejection_reason: 'PCPB requires proof the product works for its stated purpose under Kenya conditions', source_hint: 'Kenya field trials preferred. Regional data may be accepted with justification' },
        { name: 'Safety Data Sheet (SDS) — English', mandatory: true, rejection_reason: 'Full SDS in English. Must include first aid, storage, disposal instructions per Kenya Pesticides Act', source_hint: 'Must comply with GHS/UN format. Request from manufacturer' },
        { name: 'English-Language Label Copy', mandatory: true, rejection_reason: 'Label must comply with Kenya Pesticides Regulations. Dosage, first aid, resistance management statements required', source_hint: 'Review against PCPB labeling guidelines before submission' },
        { name: 'Toxicological Data', mandatory: true, rejection_reason: 'LD50 values, NOEC, acceptable daily intake data required for registration', source_hint: 'Request from manufacturer. Should be part of product technical dossier' },
        { name: 'Environmental Fate and Effects Data', mandatory: true, rejection_reason: 'PCPB assesses environmental impact. Soil degradation, aquatic toxicity data required', source_hint: 'Part of OECD-format product dossier' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by your licensed clearing agent' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 115,
        description: 'Late registration fine: KES 15,000. Incomplete submission restarts the full processing clock. Goods held in KPA storage throughout.',
        confidence: 'estimated',
      },
      portal_url: 'https://pcpb.or.ke',
      phone: '+254 020 271 2540',
      fees_summary: 'Registration fee: KES 5,000–50,000 depending on product type. Annual renewal fee: KES 3,000',
      common_rejections: [
        'Efficacy data from non-tropical conditions (European trials not directly applicable)',
        'SDS not in English or not GHS-compliant',
        'Label not compliant with Kenya Pesticides Regulations',
        'Missing environmental fate data',
        'Toxicological profile incomplete',
      ],
      escalation_path: 'PCPB Registration Officer: +254 020 271 2540 ext 201. Direct line for status: +254 020 271 2541',
      notes: 'PCPB is one of the faster regulators — typical actual processing 14–18 days when full documents submitted. The 21-day window is achievable. Incomplete submissions restart the clock entirely.',
      last_verified: 'April 2026',
    },
    {
      code: 'KEPHIS',
      full_name: 'Kenya Plant Health Inspectorate Service',
      regulates: ['Fertilizers', 'Agricultural Chemicals', 'Seeds', 'Plants', 'Plant Products', 'Soil'],
      sla_official_days: 7,
      sla_actual_days: 3,
      documents: [
        { name: 'KEPHIS Import Permit Application', mandatory: true, rejection_reason: 'All regulated agricultural imports require a KEPHIS import permit before shipment leaves origin', source_hint: 'File at kephis.org/eservices → Agricultural Inputs → Import Permits' },
        { name: 'Origin Country Phytosanitary Certificate', mandatory: true, rejection_reason: 'Must be issued by the national plant protection organization (PPQS in India, AQSIQ in China) in the exporting country. KEPHIS will not begin processing without this document', source_hint: 'Request from manufacturer — must come from government authority, not manufacturer' },
        { name: 'Certificate of Analysis (CoA)', mandatory: true, rejection_reason: 'For fertilizers and agricultural chemicals: CoA confirming composition matches label claim', source_hint: 'Should include: composition, purity, batch number' },
        { name: 'Label Copy (English)', mandatory: true, rejection_reason: 'Must comply with Kenya Fertilizers and Animal Foodstuffs Act', source_hint: 'Include application rates, safety information, storage conditions' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by your licensed clearing agent' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'KEPHIS can order destruction of regulated agricultural products if phytosanitary risk is confirmed. No fixed % penalty — the risk is the full shipment value. For fertilizers and low-risk products: typically re-inspection + storage only.',
        confidence: 'estimated',
      },
      portal_url: 'https://kephis.org/eservices',
      phone: '+254 020 318 3000',
      fees_summary: 'Import permit fee: KES 2,000–10,000. Inspection fee at port: KES 1,500–5,000',
      common_rejections: [
        'Missing phytosanitary certificate from origin — single most common reason for KEPHIS hold',
        'Phytosanitary certificate from private lab vs. government authority',
        'Regulated pest or quarantine organism detected or suspected',
        'Fertilizer composition doesn\'t match label claim (CoA mismatch)',
        'Product on KEPHIS restricted list',
      ],
      escalation_path: 'KEPHIS Customer Service: +254 020 318 3000. Port of Mombasa liaison: +254 041 222 2156. Same-day escalation available for critical shipments — call main number and request urgent processing',
      notes: 'KEPHIS is the fastest of all Kenya regulators — 48-hour to 7-day processing when documents are complete. Same-day processing available with escalation call. The phytosanitary certificate from origin is non-negotiable and must come from a government authority.',
      last_verified: 'April 2026',
    },
    {
      code: 'EPRA',
      full_name: 'Energy and Petroleum Regulatory Authority',
      regulates: ['Petroleum Products', 'Jet Fuel', 'LPG', 'Diesel', 'Petrol', 'Energy Devices', 'Solar Equipment', 'Energy Meters', 'Transformers'],
      sla_official_days: 30,
      sla_actual_days: 25,
      documents: [
        { name: 'EPRA Petroleum Import Permit (Form EPRA/IMP)', mandatory: true, rejection_reason: 'No petroleum product may clear customs without a valid EPRA import permit — processing takes 25 days minimum', source_hint: 'Apply at epra.go.ke/licensing → Petroleum Products → Import Permit. Call +254 020 362 0000 to request expedited track for essential fuel supply.' },
        { name: 'Product Specification / Certificate of Quality', mandatory: true, rejection_reason: 'EPRA requires proof that petroleum meets Kenya specification (e.g. ASTM D1655 for Jet A-1)', source_hint: 'Request from supplier — must include density, flash point, freeze point, and sulphur content data' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard KRA customs requirement. Jet A-1 HS code 2710.19.11 attracts 0% import duty — verify classification to avoid misclassification penalty', source_hint: 'Filed on KRA iCMS by your clearing agent. Use HS 2710.19.11 for kerosene-type jet fuel.' },
        { name: 'Bill of Lading', mandatory: true, rejection_reason: 'Confirms shipment origin, quantity, and carrier', source_hint: 'Obtain from shipping line or freight forwarder' },
        { name: 'Commercial Invoice + Certificate of Origin', mandatory: true, rejection_reason: 'Required for customs valuation and origin verification', source_hint: 'Issued by supplier. Certificate of Origin must be authenticated by origin country chamber of commerce.' },
        { name: 'Health & Safety Data Sheet (HSDS)', mandatory: true, rejection_reason: 'EPRA requires safety documentation for all petroleum products', source_hint: 'Standard HSDS from fuel supplier covering fire risk, handling, and spill procedures' },
        { name: 'KPC / Oil Depot Receiving Confirmation', mandatory: false, condition: 'Required for bulk petroleum imports destined for Kenya Pipeline Company infrastructure', rejection_reason: 'KPC must confirm tank allocation and receiving capacity before vessel discharge', source_hint: 'Coordinate directly with KPC Mombasa terminal or JKIA fuel farm as applicable' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 385,
        description: 'KPA demurrage on ISO/flexi tanks after free period, plus EPRA re-registration penalty if permit lapses. Commercial exposure for aviation fuel is measured in grounded aircraft, not storage fees.',
        confidence: 'estimated',
      },
      portal_url: 'https://epra.go.ke',
      phone: '+254 020 362 0000',
      fees_summary: 'Petroleum import permit: KES 5,000–50,000 depending on volume. Energy product registration: KES 5,000–25,000.',
      common_rejections: [
        'EPRA permit not filed — 25-day processing makes last-minute filing impossible',
        'HS code misclassification (2710.19.90 vs 2710.19.11) triggering duty shortfall penalty',
        'Product specification does not meet Kenya/KEBS fuel quality standard',
        'Energy efficiency rating below Kenya MEPS (for appliance imports)',
      ],
      escalation_path: 'EPRA Petroleum Licensing: +254 020 362 0000. licensing@epra.go.ke. For energy products: EPRA Standards +254 020 362 0100.',
      notes: 'EPRA has two distinct mandates: (1) Petroleum import licensing — all fuels, LPG, and lubricants require an import permit before customs clearance. Processing is 25 days minimum — plan accordingly. (2) Energy efficiency compliance — LEDs, motors, appliances, and transformers must meet Kenya MEPS. Products below MEPS cannot be imported regardless of documentation.',
      last_verified: 'May 2026 — 30d official SLA confirmed via EPRA licensing documents',
    },
    {
      code: 'NEMA',
      full_name: 'National Environment Management Authority',
      regulates: ['Chemicals', 'Industrial Equipment', 'Waste Treatment Equipment', 'Ozone-Depleting Substances', 'Persistent Organic Pollutants'],
      sla_official_days: 45,
      sla_actual_days: 40,
      documents: [
        { name: 'NEMA Environmental Impact Assessment (EIA)', mandatory: false, condition: 'Required for large-volume chemical imports or new chemical substances', rejection_reason: 'NEMA may require EIA for chemicals with significant environmental impact', source_hint: 'Engage a NEMA-licensed EIA lead expert' },
        { name: 'NEMA Importation Permit', mandatory: true, rejection_reason: 'All NEMA-regulated chemicals require prior importation approval', source_hint: 'Apply at nema.go.ke/permits' },
        { name: 'Material Safety Data Sheet (MSDS)', mandatory: true, rejection_reason: 'Full safety profile required for all chemical imports', source_hint: 'Manufacturer should provide. Must be current version' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by your licensed clearing agent' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'NEMA can prohibit import of restricted substances outright. Ozone-depleting substances without quota approval face seizure. Standard chemical imports: re-inspection cost + storage.',
        confidence: 'estimated',
      },
      portal_url: 'https://nema.go.ke',
      phone: '+254 020 605 5000',
      fees_summary: 'Importation permit: KES 5,000–50,000. EIA (if required): KES 100,000+ depending on scope',
      common_rejections: [
        'Ozone-depleting substances without NEMA quota approval',
        'Persistent organic pollutants on Stockholm Convention restricted list',
        'Missing MSDS or outdated version',
      ],
      escalation_path: 'NEMA Compliance: +254 020 605 5200. Chemicals Unit: chemicals@nema.go.ke',
      notes: 'NEMA primarily affects industrial chemicals, refrigerants, and specific agricultural chemicals. Most standard commercial shipments are not NEMA-regulated unless they contain restricted substances.',
      last_verified: 'May 2026 — 45d applies to medium-risk CPR. Chemical mixture permits: 21 working days per NEMA Service Charter 2025-2027',
    },
    {
      code: 'KRA',
      full_name: 'Kenya Revenue Authority',
      regulates: ['All Imports (Customs Clearance)', 'HS Code Classification', 'Import Duty Assessment'],
      sla_official_days: 3,
      sla_actual_days: 2,
      documents: [
        { name: 'Import Declaration Form (IDF) via KRA iCMS', mandatory: true, rejection_reason: 'All imports over USD 1,000 require IDF lodged on KRA iCMS before shipment arrives. Fee: 2% of CIF value (minimum KES 5,000)', source_hint: 'Filed on KRA iCMS (Integrated Customs Management System) by your licensed clearing agent. Requires importer PIN certificate' },
        { name: 'Commercial Invoice', mandatory: true, rejection_reason: 'KRA requires commercial invoice to verify CIF value and calculate duties. Must show true transaction value', source_hint: 'Do not undervalue — KRA benchmarks against similar shipments' },
        { name: 'Bill of Lading / Airway Bill', mandatory: true, rejection_reason: 'Proof of shipment required for customs processing', source_hint: 'Obtain from shipping agent' },
        { name: 'Packing List', mandatory: true, rejection_reason: 'Itemized packing list required for physical verification', source_hint: 'Must match invoice and BoL exactly' },
        { name: 'Certificate of Origin', mandatory: false, condition: 'Required for EAC preferential tariff claims or COMESA trade preferences', rejection_reason: 'Without CoO, standard duty rate applies. May increase total cost significantly', source_hint: 'Obtain from chamber of commerce at origin' },
      ],
      penalty: {
        type: 'pct_cif',
        rate_pct_per_week: 2,
        cap_pct: 50,
        description: 'KRA late clearance surcharge on outstanding duties. HS misclassification: 25% penalty on duty shortfall (Kenya Customs and Excise Act). Late IDF lodgement: additional KES 5,000 minimum. Goods deemed abandoned after 90 days — subject to auction.',
        confidence: 'estimated',
        // Note: The 2%/week figure approximates KRA interest on unpaid duties.
        // The exact current rate should be verified against the Kenya Customs and Excise Act and current KRA circulars.
      },
      portal_url: 'https://kra.go.ke',
      phone: '+254 020 484 9999',
      fees_summary: 'IDF levy: 2% of CIF value (minimum KES 5,000). Railway Development Levy (RDL): 1.5% of CIF. Import Duty: 0–100% depending on HS code. VAT: 16% on dutiable value. Excise duty on specific products. All duties paid through KRA iCMS.',
      common_rejections: [
        'IDF not lodged before shipment arrival — KRA iCMS entry must be filed before vessel arrives at Mombasa',
        'CIF value undervalued vs KRA benchmarks — triggers audit and duty uplift',
        'Wrong HS code classification — 25% penalty on duty shortfall. KRA officers verify physical cargo against declared HS code',
        'Invoice and BoL quantities don\'t match — discrepancy triggers physical examination',
        'Missing Certificate of Origin for preferential tariff claims (EAC/COMESA)',
      ],
      escalation_path: 'KRA Mombasa Customs (Port): +254 041 231 0755. KRA Contact Centre: +254 020 484 9999. For HS disputes: KRA Customs Advisory Unit.',
      notes: 'KRA customs clearance (1–3 days) is handled entirely through KRA iCMS — the Integrated Customs Management System used by licensed clearing agents. Importers do not file directly; your clearing agent lodges the customs entry on your behalf. HS code misclassification is the single most expensive error in Kenya customs — 25% penalty on any duty shortfall, plus interest.\n\nKRA TARIFF RULINGS (high-impact, low-frequency): KRA can issue a tariff classification ruling on a shipment at any point — including while goods are in transit or sitting at port. When a ruling is issued, the importer is referred to the KRA Tariff team and Customs Valuation team and must defend the declared HS code. If the defence is not convincing, KRA re-values upward — higher duty, plus penalties. Nobody watches the KRA system continuously, so rulings often go undetected until a clearing agent checks iCMS. KRUX flags shipments where a KRA ruling may apply based on HS code controversy or prior ruling patterns.',
      last_verified: 'April 2026',
    },
    {
      code: 'RPB',
      full_name: 'Radiation Protection Board',
      regulates: ['Used Motor Vehicles', 'Scrap Metal', 'Medical Imaging Equipment', 'Industrial Radiation Sources', 'Consumer Electronics (radiation-emitting)'],
      sla_official_days: 2,
      sla_actual_days: 1,
      documents: [
        { name: 'RPB Radiation Clearance Application', mandatory: true, rejection_reason: 'All used motor vehicles require RPB radiation scan before customs release', source_hint: 'Application at rpb.go.ke or physical inspection at Mombasa ICD. Form RPB/IMP/01.' },
        { name: 'Bill of Lading / Import Entry', mandatory: true, rejection_reason: 'RPB needs shipment details to match against customs entry', source_hint: 'Copy from your clearing agent' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 8,
        description: 'RPB clearance fee: KES 1,000 per used vehicle (~USD 7.70). If vehicle fails radiation check, it cannot be released — full shipment value at risk. Vehicles with elevated radiation readings are detained and may be destroyed.',
        confidence: 'verified',
      },
      portal_url: 'https://rpb.go.ke',
      phone: '+254 020 722 9555',
      fees_summary: 'KES 1,000 per used vehicle. New vehicles: no RPB inspection required.',
      common_rejections: [
        'Used vehicle with elevated radiation reading — fails scan, held for further assessment',
        'Scrap metal from nuclear-regulated source countries without RPB pre-clearance',
      ],
      escalation_path: 'RPB Inspections: +254 020 722 9555. Physical office: Uchumi House, Nairobi. Port inspection conducted at ICDN Mombasa.',
      notes: 'RPB inspection is mandatory for all USED motor vehicles before customs release. Takes 1 day at Mombasa ICD. Fee is KES 1,000 per vehicle — very low cost but a hard gate: no RPB clearance certificate = no customs release. New vehicles do not require RPB inspection. RPB also inspects scrap metal imports for radioactive contamination.',
      last_verified: 'April 2026',
    },
    {
      code: 'NTSA',
      full_name: 'National Transport and Safety Authority',
      regulates: ['Motor Vehicles (Registration)', 'Commercial Vehicles', 'Motorcycles', 'Trailers'],
      sla_official_days: 5,
      sla_actual_days: 3,
      documents: [
        { name: 'Customs Entry / KRA Release Order', mandatory: true, rejection_reason: 'NTSA will not process registration until KRA has released the vehicle', source_hint: 'Obtained from clearing agent after full duty payment on KRA iCMS' },
        { name: 'RPB Radiation Clearance Certificate', mandatory: true, condition: 'Used vehicles only', rejection_reason: 'NTSA requires RPB clearance before registering a used imported vehicle', source_hint: 'Obtained from RPB inspection at Mombasa ICD before customs release' },
        { name: 'Vehicle Inspection Report (KEBS/NTSA)', mandatory: true, rejection_reason: 'Physical roadworthiness inspection required before registration', source_hint: 'NTSA inspection centre at port or nearest NTSA office' },
        { name: 'Insurance Certificate (Third Party minimum)', mandatory: true, rejection_reason: 'Must show valid Kenya insurance before registration', source_hint: 'Arrange with any IRA-licensed Kenya insurer' },
        { name: 'KRA Import Duty Payment Receipt', mandatory: true, rejection_reason: 'Proof that all customs duties, excise duty, and VAT have been paid in full', source_hint: 'KRA iCMS payment confirmation from clearing agent' },
      ],
      penalty: {
        type: 'fixed_cost',
        fixed_cost_usd: 62,
        description: 'NTSA registration fee: ~KES 3,500–5,000. Number plate fee: ~KES 3,000. Operating an unregistered imported vehicle: fine + impoundment.',
        confidence: 'estimated',
      },
      portal_url: 'https://ntsa.go.ke',
      phone: '+254 020 608 0000',
      fees_summary: 'Registration fee: KES 3,500–5,000 depending on vehicle class. Number plates (front + rear): KES 3,000. NTSA inspection: KES 500–1,500.',
      common_rejections: [
        'RPB clearance certificate missing for used vehicles',
        'KRA release order not yet issued (duties not fully paid)',
        'Vehicle fails roadworthiness inspection — left-hand drive vehicles are not registrable in Kenya',
        'Insurance not in force at time of application',
      ],
      escalation_path: 'NTSA Customer Service: +254 020 608 0000. Mombasa port office: +254 041 222 5050.',
      notes: 'NTSA registration is the final step in motor vehicle imports — happens after KRA customs clearance, RPB inspection, and duty payment. Left-hand drive vehicles (most US/Continental Europe origin) CANNOT be registered in Kenya — only right-hand drive accepted. Vehicle age restriction: imported used vehicles must not be more than 8 years old (year of manufacture to year of import). Motorcycles: 3-year age limit.',
      last_verified: 'April 2026',
    },
    {
      code: 'CA',
      full_name: 'Communications Authority of Kenya',
      regulates: ['Mobile Phones', 'Smartphones', 'Routers & Network Equipment', 'Radio Equipment', 'Wireless Devices', 'Satellite Equipment', 'GPS Devices'],
      sla_official_days: 60, // Verified May 2026 via CA licensing procedures — full type approval process is 60 calendar days (21d was a single-step reference, not the full SLA). Urgent processing request can reduce to 10 working days.
      sla_actual_days: 45,  // Real-world estimate based on CA process steps: application review + lab testing + approval issuance. 60d is the official ceiling; most cases resolve in 4-8 weeks.
      documents: [
        { name: 'CA Type Approval Application Form', mandatory: true, rejection_reason: 'All radio communications equipment must have CA Type Approval before it can be sold or used in Kenya. No application = no clearance.', source_hint: 'Download from ca.go.ke/type-approval or submit at CA offices, Waiyaki Way, Nairobi' },
        { name: 'Technical Specifications / Datasheet', mandatory: true, rejection_reason: 'CA engineers review frequency bands, output power, and standards compliance. Generic or incomplete specs = rejection.', source_hint: 'Request full technical datasheet from manufacturer — must show frequency bands (MHz/GHz), output power (dBm), modulation type' },
        { name: 'FCC/CE/PTCRB Test Reports from accredited lab', mandatory: true, rejection_reason: 'CA accepts test reports from internationally accredited labs. Must cover the exact frequency bands used in Kenya (700, 800, 900, 1800, 2100, 2600 MHz for LTE)', source_hint: 'FCC ID report from FCC Equipment Authorization database. CE reports from notified body. PTCRB for 3GPP devices.' },
        { name: 'Sample units for testing (if required)', mandatory: false, condition: 'Required for new product types or if CA has concerns about submitted test reports', rejection_reason: 'CA may require physical samples — 2-3 units per model. Must not be shipped back after testing.', source_hint: 'Factor sample units into initial shipment cost — CA testing fee: KES 25,000–50,000 per model' },
        { name: 'Commercial Invoice showing model name and quantity', mandatory: true, rejection_reason: 'CA type approval is model-specific. Invoice must list exact model numbers that match the type approval certificate.', source_hint: 'Use manufacturer model names exactly as they appear on CA type approval' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by your licensed clearing agent' },
      ],
      penalty: {
        type: 'seizure_risk',
        fixed_cost_usd: 50000,
        description: 'Kenya Information and Communications Act Section 23: importing or selling non-type-approved equipment — fine up to KES 5,000,000 (~USD 38,500) or 5 years imprisonment, or both. Goods forfeited.',
        confidence: 'verified',
      },
      portal_url: 'https://ca.go.ke',
      phone: '+254 020 242 4000',
      fees_summary: 'Type Approval fee: KES 25,000–50,000 per device model (one-time, valid 3 years). Annual renewal: KES 10,000. Laboratory testing fee if samples required: KES 25,000–50,000.',
      common_rejections: [
        'Frequency bands in test report do not match Kenya\'s licensed spectrum (700/800/900/1800/2100/2600 MHz)',
        'Test report from non-accredited laboratory (CA publishes list of accepted labs)',
        'Type approval applied for after shipment has arrived at port (clearance blocked until approval issued)',
        'Model number on invoice differs from type approval certificate (even minor variations rejected)',
        'WiFi/Bluetooth equipment with no FCC/CE test report',
      ],
      escalation_path: 'CA Type Approval Unit: typeapproval@ca.go.ke | +254 020 242 4000. Physical office: CA Centre, Waiyaki Way, Nairobi. Urgent processing request can reduce timeline to 10 working days.',
      notes: 'CA type approval is per model, not per unit — once approved, any quantity of that model can be imported freely for 3 years. Apply before shipping, not after. CA and KRA run joint inspections at Mombasa port for telecom equipment. Devices without type approval are seized by CA and either destroyed or re-exported at importer\'s cost. Waivers are rarely granted and take 30+ days.',
      last_verified: 'May 2026 — CORRECTED: official SLA is 60 calendar days per CA licensing procedures, not 21d. Urgent processing: 10 working days',
    },
    {
      code: 'DVS',
      full_name: 'Directorate of Veterinary Services',
      regulates: ['Meat Products', 'Poultry', 'Dairy Products', 'Animal Feeds', 'Live Animals', 'Animal-Derived Products', 'Fish & Seafood'],
      sla_official_days: 10,
      sla_actual_days: 21, // SIP processing takes 14–21 days and must be obtained BEFORE vessel departure. Prior value of 7d was port inspection time only — not the full process. Verified from DVS notes: "Apply for SIP minimum 21 days before departure."
      documents: [
        { name: 'DVS Sanitary Import Permit (SIP)', mandatory: true, rejection_reason: 'No SIP = consignment refused at port of entry. SIP must be obtained BEFORE shipment departs origin country.', source_hint: 'Apply at DVS offices, Kabete, Nairobi. Online: dvs.go.ke. Processing: 14-21 days. Include: product type, origin country, exporting establishment registration number.' },
        { name: 'Veterinary Health Certificate from exporting country', mandatory: true, rejection_reason: 'Must be issued by the official veterinary authority of the exporting country. Private lab certificates not accepted.', source_hint: 'Request from exporting country\'s government veterinary authority. Must be endorsed by official government vet.' },
        { name: 'Certificate of Origin', mandatory: true, rejection_reason: 'DVS origin country requirements vary — some origins are restricted or banned. Must declare exact country of slaughter/processing, not just country of export.', source_hint: 'Issued by exporting country chamber of commerce or government authority' },
        { name: 'Cold Chain Documentation / Temperature Logs', mandatory: true, condition: 'For frozen and chilled products', rejection_reason: 'DVS rejects any consignment where cold chain has been broken. Temperature must be maintained at -18°C (frozen) or 0–4°C (chilled) throughout transit.', source_hint: 'Data logger report from origin to Mombasa. Must show no temperature excursions.' },
        { name: 'Establishment Registration Certificate', mandatory: true, rejection_reason: 'The specific slaughter/processing facility must be registered with DVS Kenya. Not all foreign establishments are approved.', source_hint: 'Check DVS approved establishment list at dvs.go.ke before contracting supplier. If not listed, supplier must apply for DVS listing — allow 60+ days.' },
        { name: 'KRA Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Standard customs requirement', source_hint: 'Filed on KRA iCMS by licensed clearing agent' },
      ],
      penalty: {
        type: 'seizure_risk',
        fixed_cost_usd: 5000,
        description: 'Animal Diseases Act Cap 364: importing animal products without SIP — fine up to KES 500,000 + imprisonment. Consignment destroyed at importer\'s expense. No compensation.',
        confidence: 'verified',
      },
      portal_url: 'https://www.dvs.go.ke',
      phone: '+254 020 377 2370',
      fees_summary: 'SIP application fee: KES 3,000–10,000 depending on product and quantity. Port inspection fee: KES 5,000. Lab testing (if required): KES 15,000–30,000.',
      common_rejections: [
        'Sanitary Import Permit not obtained before shipment (most common — vessel arrives, permit not ready)',
        'Veterinary health certificate signed by private vet, not official government vet',
        'Cold chain broken — temperature excursion shown in data logger',
        'Processing establishment not on DVS approved list',
        'Country of origin is on DVS restricted list (varies — currently some origins restricted for Foot and Mouth Disease)',
        'Product contains antibiotics above Kenya maximum residue levels (MRL)',
      ],
      escalation_path: 'DVS Director: +254 020 377 2370 | info@dvs.go.ke. Port inspection office at Mombasa Port: +254 041 222 6060. SIP urgent processing (documented emergency): DVS may issue within 7 days.',
      notes: 'DVS is the gatekeeper for all animal-origin food products. Apply for SIP at minimum 21 days before vessel departure. DVS maintains a list of approved foreign establishments — your specific supplier must be on this list. Not all origins are approved for all products: check current status at dvs.go.ke. DVS port inspector physically inspects every consignment — no inspector, no clearance. Inspector must be pre-booked. Seafood imports also require KEPHIS phytosanitary certificate in addition to DVS SIP.',
      last_verified: 'April 2026',
    },
    {
      code: 'WHO-GMP',
      full_name: 'WHO Good Manufacturing Practice Certification',
      regulates: ['Pharmaceutical Manufacturers', 'Medical Device Manufacturers'],
      sla_official_days: 0,
      sla_actual_days: 0,
      documents: [
        { name: 'WHO-GMP Certificate from national authority', mandatory: true, rejection_reason: 'PPB requires WHO-GMP for all pharmaceutical manufacturer clearances. Issued by: NMPA (China), CDSCO (India), EMA (EU), MHRA (UK), FDA (USA)', source_hint: 'Check certificate issue date — PPB requires certificates not older than 3 years. Some inspectors require not older than 2 years' },
      ],
      penalty: {
        type: 'none',
        description: 'WHO-GMP is a manufacturer certification, not a Kenya regulatory deadline. Financial exposure flows through PPB processing delay, not a WHO-GMP penalty.',
        confidence: 'verified',
      },
      portal_url: 'https://ppb.go.ke',
      phone: '+254 020 272 4060',
      fees_summary: 'N/A — certification is held by manufacturer, not importer',
      common_rejections: [
        'Certificate expired (most common)',
        'Certificate covers different manufacturing site than product origin',
        'Issued by non-recognized authority',
        'Certificate does not cover the specific product category',
      ],
      escalation_path: 'Contact manufacturer to expedite renewal. PPB can provide a 30-day conditional clearance in some cases — request from PPB Registrations Manager',
      notes: 'WHO-GMP is not a Kenya regulator — it is a manufacturer certification held by the supplier. The importer must request it from their manufacturer well in advance. WHO-GMP renewal takes 3-6 months from application to the national medicines authority in the manufacturer\'s country.',
      last_verified: 'April 2026',
    },
  ],
}

// ─── Tanzania ─────────────────────────────────────────────────

const TANZANIA: CountryProfile = {
  country_code: 'TZ',
  country_name: 'Tanzania',
  currency: 'TZS',
  port_of_entry: 'Dar es Salaam',
  usd_rate: 2600,
  kpa_demurrage: {
    free_days: 4,
    daily_rate_usd: 80,
    doubles_after_days: 14,
    confidence: 'estimated',
    // Tanzania Ports Authority (TPA) charges port storage; shipping lines charge demurrage separately.
    // Free period at Dar es Salaam: typically 4 days from vessel discharge. Rates approximate.
  },
  regulators: [
    {
      code: 'TBS',
      full_name: 'Tanzania Bureau of Standards',
      regulates: ['Manufactured Goods', 'Electronics', 'Construction Materials', 'Food Products', 'Textiles', 'Chemicals'],
      sla_official_days: 30,
      sla_actual_days: 45,
      documents: [
        { name: 'TBS Import Permit / Certificate of Conformity (CoC)', mandatory: true, rejection_reason: 'TBS requires a valid CoC from an accredited inspection body at origin before shipment. Goods without CoC are stopped at port.', source_hint: 'Apply at tbs.go.tz/pvoc. Accredited bodies include SGS, Bureau Veritas, Intertek, COTECNA at origin.' },
        { name: 'Test Report from accredited laboratory', mandatory: true, rejection_reason: 'Lab results must confirm compliance with Tanzania standard (TZS) or EAC equivalent. Results from non-accredited labs are rejected.', source_hint: 'Laboratory must be ILAC-accredited. Include full product specification vs. standard comparison.' },
        { name: 'Commercial Invoice + Packing List', mandatory: true, rejection_reason: 'Must match BoL exactly. Quantity or value discrepancy triggers TRA review and TBS re-inspection.', source_hint: 'Ensure product descriptions match TBS product category nomenclature.' },
        { name: 'Bill of Lading / Airway Bill', mandatory: true, rejection_reason: 'Required for TPA customs entry. Original or telex release accepted.', source_hint: 'Obtain from shipping agent.' },
        { name: 'Manufacturer\'s Declaration of Conformity', mandatory: false, condition: 'Required for self-certified product categories under EAC harmonized standards', rejection_reason: 'Must reference specific Tanzania or EAC standard by number.', source_hint: 'Manufacturer must be ISO 9001 certified or equivalent for declaration to be accepted.' },
        { name: 'TRA Import Declaration (ID)', mandatory: true, rejection_reason: 'Tanzania Revenue Authority customs entry. Required before port release.', source_hint: 'Filed through TANCIS (Tanzania Customs Integrated System) by licensed clearing agent.' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'Goods without valid TBS CoC are seized at Dar es Salaam port and held pending re-inspection. Reinspection fee: TZS 500,000–2,000,000. Goods failing inspection: compulsory re-export or destruction at importer\'s cost. Storage accrues throughout.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.tbs.go.tz',
      phone: '+255 22 245 0206',
      fees_summary: 'PVoC CoC at origin: charged by inspection body (USD 300–800 depending on product/volume). TBS port inspection fee: TZS 200,000–500,000. Re-inspection: TZS 500,000–2,000,000.',
      common_rejections: [
        'CoC issued by non-accredited inspection body',
        'Product description on CoC does not match BoL',
        'Standard referenced on CoC superseded by newer TZS/EAS version',
        'Lab results missing key parameters required by the applicable standard',
        'CoC expired (validity typically 6 months from issue)',
      ],
      escalation_path: 'TBS Headquarters — Morogoro Road, Dar es Salaam. Director of Certification: dg@tbs.go.tz. For urgent port release: Contact TBS Port Office at Dar es Salaam port directly (+255 22 211 7532).',
      notes: 'Tanzania operates a mandatory PVoC (Pre-Verification of Conformity) scheme for products on the TBS Mandatory Certification list. Products on this list cannot clear customs without a valid CoC from a TBS-accredited inspection body at the country of origin. The list is updated periodically — verify at tbs.go.tz before shipment. EAC harmonized standards (EAS) are increasingly replacing TZS standards — both are accepted.',
      last_verified: 'May 2026',
    },
    {
      code: 'TFDA',
      full_name: 'Tanzania Food and Drugs Authority',
      regulates: ['Pharmaceuticals', 'Medical Devices', 'Food Products', 'Cosmetics', 'Herbal Medicines', 'Veterinary Products'],
      sla_official_days: 45,
      sla_actual_days: 60,
      documents: [
        { name: 'TFDA Import Permit', mandatory: true, rejection_reason: 'All regulated products require a TFDA import permit before the shipment departs origin. Retroactive permits are not issued.', source_hint: 'Apply online at tfda.go.tz. Permit number must appear on the shipping documents.' },
        { name: 'Product Registration Certificate (TFDA)', mandatory: true, rejection_reason: 'Pharmaceuticals and medical devices must be registered with TFDA before importation. Unregistered products are detained.', source_hint: 'Registration takes 6–18 months for new products. Confirm existing registration status before ordering.' },
        { name: 'Certificate of Analysis (batch-specific)', mandatory: true, rejection_reason: 'Must match the specific batch shipped. Product-level CoA without batch number is rejected.', source_hint: 'Request from manufacturer with lot number matching BoL.' },
        { name: 'Free Sale Certificate', mandatory: true, rejection_reason: 'Confirms the product is licensed for sale in the country of manufacture.', source_hint: 'Issued by health/medicines authority of exporting country. TFDA accepts NMRAs from WHO-listed countries.' },
        { name: 'WHO-GMP Certificate or equivalent', mandatory: true, rejection_reason: 'TFDA requires manufacturer GMP certification from a recognized authority (WHO, PIC/S, EU GMP).', source_hint: 'Verify certificate validity — TFDA requires issued within 3 years.' },
        { name: 'Cold Chain Documentation', mandatory: false, condition: 'Required for temperature-sensitive products (vaccines, biologics, insulin)', rejection_reason: 'TFDA requires continuous temperature log from manufacturer to port. Gaps in log result in product rejection and destruction.', source_hint: 'Use calibrated data loggers. Include min/max temperatures throughout transit.' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'Unregistered or improperly documented pharmaceuticals are seized and may be destroyed at importer\'s cost. TFDA does not negotiate on unregistered products. Criminal penalties under the Tanzania Food, Drugs and Cosmetics Act apply to repeat violations.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.tfda.go.tz',
      phone: '+255 22 245 0512',
      fees_summary: 'Import permit: TZS 100,000–500,000 per product category. Product registration: TZS 1,000,000–5,000,000 (one-time). Annual renewal: TZS 500,000. Lab testing fee (where required): TZS 200,000–1,000,000.',
      common_rejections: [
        'Product not registered with TFDA (most common — and most expensive)',
        'Import permit expired or covers different quantity than shipped',
        'Cold chain integrity documentation missing for temperature-sensitive goods',
        'Certificate of Analysis not batch-specific',
        'Labeling not in English (TFDA requires English or Swahili)',
      ],
      escalation_path: 'TFDA Director General — Plot 2686 Kibaha/Mlandizi Road, Dar es Salaam. dg@tfda.go.tz. For expedited review: written request to Directorate of Human Medicines with evidence of medical urgency.',
      notes: 'TFDA registration is mandatory before any pharmaceutical or medical device shipment is ordered. Unlike PPB Kenya, TFDA does not offer conditional clearance for unregistered products in any circumstance. Product registration for new pharmaceutical products takes 6–18 months and requires a full technical dossier including clinical data. Plan registration well ahead of any new product launch in Tanzania.',
      last_verified: 'May 2026',
    },
    {
      code: 'EWURA',
      full_name: 'Energy and Water Utilities Regulatory Authority',
      regulates: ['Petroleum Products', 'LPG', 'Natural Gas', 'Electricity Equipment', 'Water Treatment Chemicals'],
      sla_official_days: 30,
      sla_actual_days: 35,
      documents: [
        { name: 'EWURA Import Licence', mandatory: true, rejection_reason: 'Petroleum and LPG products cannot be cleared without a valid EWURA import licence. TRA will not release goods without EWURA clearance number.', source_hint: 'Apply at ewura.go.tz. Licence is product-specific (e.g., AGO, PMS, Jet A-1). Separate licence for each product type.' },
        { name: 'Product Quality Certificate from origin', mandatory: true, rejection_reason: 'EWURA requires third-party quality certification at loading port. Accepted bodies: SGS, Bureau Veritas, Intertek.', source_hint: 'Certificate must confirm product meets TBS/EAC quality standard for the specific fuel grade.' },
        { name: 'Bill of Lading + Vessel Details', mandatory: true, rejection_reason: 'EWURA tracks vessel manifest. Discrepancies between declared and actual cargo trigger EWURA investigation.', source_hint: 'Include vessel name, IMO number, loading port, and ETA.' },
        { name: 'Tank Calibration Certificate', mandatory: false, condition: 'Required for bulk liquid petroleum imports', rejection_reason: 'EWURA requires certified tank calibration for accurate quantity measurement at receipt.', source_hint: 'Certificate must be from EWURA-approved calibration facility.' },
      ],
      penalty: {
        type: 'pct_cif',
        rate_pct_per_week: 2,
        cap_pct: 20,
        description: 'Operating without EWURA licence: TZS 10,000,000+ fine plus product seizure. Quantity discrepancy: pro-rata duty adjustment + 2% penalty of declared CIF per week of delay. Petroleum products are strategically controlled — EWURA enforcement is strict.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.ewura.go.tz',
      phone: '+255 22 219 4376',
      fees_summary: 'Import licence fee: TZS 500,000–2,000,000 depending on product volume. Annual petroleum dealer licence: TZS 5,000,000+. Quality testing at arrival: TZS 200,000–500,000 per sample.',
      common_rejections: [
        'Licence covers different fuel grade than shipped (e.g., licensed for AGO, shipped Jet A-1)',
        'Product quality certificate from non-EWURA-approved body',
        'Volume shipped exceeds licensed quantity',
        'Licence expired during transit',
      ],
      escalation_path: 'EWURA Director General — Harbour View Towers, Dar es Salaam. +255 22 219 4376. For emergency petroleum imports: written request to Director of Petroleum for expedited review.',
      notes: 'Tanzania operates a liberalised petroleum market but all imports are strictly licensed. EWURA maintains a real-time import tracking system. Discrepancies between declared and actual volumes are flagged immediately on arrival. Petroleum importers must hold a valid OMC (Oil Marketing Company) licence from EWURA in addition to the import licence.',
      last_verified: 'May 2026',
    },
    {
      code: 'TRA',
      full_name: 'Tanzania Revenue Authority',
      regulates: ['All Import Customs Clearance', 'Duty Assessment', 'Import Declaration'],
      sla_official_days: 5,
      sla_actual_days: 7,
      documents: [
        { name: 'Tanzania Customs Import Declaration (CID)', mandatory: true, rejection_reason: 'All imports require a customs declaration filed on TANCIS before port release.', source_hint: 'Filed by licensed clearing agent through TANCIS (Tanzania Customs Integrated System).' },
        { name: 'Import Declaration Form (IDF)', mandatory: true, rejection_reason: 'Required for all commercial imports.', source_hint: 'IDF is the Tanzania equivalent of Kenya\'s IDF. Must match BoL and invoice.' },
        { name: 'Certificate of Origin (where applicable)', mandatory: false, condition: 'Required to claim EAC Common Market or COMESA preferential tariff rates', rejection_reason: 'Without valid CoO, TRA applies standard Most Favoured Nation (MFN) rate. EAC goods attract 0% duty; COMESA goods attract reduced rates.', source_hint: 'For Kenya-origin goods: CoO issued by KEBS or KAM. Must be issued before shipment departs.' },
      ],
      penalty: {
        type: 'pct_cif',
        rate_pct_per_week: 2,
        cap_pct: 50,
        description: 'Misdeclaration: 100% of under-assessed duty + TZS 500,000 minimum fine. Late clearance: 2% of CIF per week (up to 50%). Abandoned goods (>60 days): auctioned by TRA at importer\'s loss.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.tra.go.tz',
      phone: '+255 800 750 075',
      fees_summary: 'Import duty: varies by HS code (EAC CET: 0%/10%/25%). VAT: 18% on (CIF + duty). Withholding tax on imports: 2% (WHT). Port levy: 0.5% of CIF. IDF processing levy: 0.6% of CIF (minimum TZS 50,000).',
      common_rejections: [
        'HS code mismatch — TRA reclassification adds duty',
        'Invoice value deemed undervalued — TRA uses WTO customs valuation',
        'CoO not accepted for EAC preference (missing required fields)',
        'Clearing agent not licensed with TRA',
      ],
      escalation_path: 'TRA Commissioner General — TRA House, Maktaba Street, Dar es Salaam. Post-release audit disputes: TRA Tax Appeals Board (TAB). Pre-clearance disputes: TRA Regional Manager (Ports).',
      notes: 'Tanzania uses the EAC Common External Tariff (CET). Goods from Kenya, Uganda, Rwanda, Burundi, and South Sudan attract 0% intra-EAC duty when accompanied by a valid EAC Certificate of Origin. COMESA preferential rates also apply for eligible goods. Tanzania imposes a 2% WHT on all commercial imports — this is separate from import duty and is often overlooked in landed cost calculations.',
      last_verified: 'May 2026',
    },
  ],
}

// ─── Uganda ───────────────────────────────────────────────────

const UGANDA: CountryProfile = {
  country_code: 'UG',
  country_name: 'Uganda',
  currency: 'UGX',
  port_of_entry: 'Mombasa (transit via Kenya) / Malaba / Busia / Entebbe (air)',
  usd_rate: 3700,
  kpa_demurrage: {
    // Uganda is landlocked — goods transit through Mombasa (Kenya) or Dar es Salaam (Tanzania).
    // KPA demurrage at Mombasa applies to Uganda-bound goods on transit. Same rates as Kenya profile.
    // Additional Uganda-side transit charges apply at Malaba/Busia border crossing.
    free_days: 5,
    daily_rate_usd: 75,
    doubles_after_days: 14,
    confidence: 'estimated',
  },
  regulators: [
    {
      code: 'UNBS',
      full_name: 'Uganda National Bureau of Standards',
      regulates: ['Manufactured Goods', 'Food Products', 'Electronics', 'Construction Materials', 'Textiles', 'Chemicals', 'Cosmetics'],
      sla_official_days: 21,
      sla_actual_days: 30,
      documents: [
        { name: 'UNBS Certificate of Conformity (CoC) / Product Clearance Certificate', mandatory: true, rejection_reason: 'Products on the UNBS mandatory certification list cannot enter Uganda without a valid CoC. Goods are held at Malaba/Busia until CoC is produced.', source_hint: 'Apply through UNBS-accredited inspection body at origin: SGS, Bureau Veritas, Intertek, COTECNA. Check mandatory list at unbs.go.ug.' },
        { name: 'Test Report from accredited laboratory', mandatory: true, rejection_reason: 'Laboratory must be accredited by UNAS (Uganda National Accreditation Service) or ILAC-equivalent. UNBS rejects results from non-accredited labs.', source_hint: 'Include parameter-by-parameter comparison against the applicable Uganda/EAS standard.' },
        { name: 'Commercial Invoice + Packing List', mandatory: true, rejection_reason: 'URA requires exact match between invoice, BoL, and packing list. Discrepancy triggers physical inspection and delay.', source_hint: 'Ensure product descriptions match UNBS product classification exactly.' },
        { name: 'Bill of Lading / Airway Bill', mandatory: true, rejection_reason: 'Required for URA customs entry at Malaba/Busia/Entebbe.', source_hint: 'For landlocked transit through Kenya: obtain transit bond documents from KRA at Mombasa in addition to the BoL.' },
        { name: 'EAC Certificate of Origin (for intra-EAC trade)', mandatory: false, condition: 'Required to claim 0% EAC intra-community duty rate', rejection_reason: 'Without CoO, URA applies standard import duty (EAC CET: 0%/10%/25% depending on HS code).', source_hint: 'Kenya-origin goods: CoO from KEBS or KAM. Must accompany the shipment.' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'Non-conforming goods seized at border and held at importer\'s cost. Re-export or destruction ordered for goods that fail UNBS testing. UNBS border inspection: USD 50–200 per consignment. Goods without CoC for mandatory products: denied entry entirely.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.unbs.go.ug',
      phone: '+256 417 333 250',
      fees_summary: 'PVoC CoC at origin: USD 200–600 (charged by inspection body). UNBS port-of-entry inspection: UGX 200,000–500,000. Market surveillance testing (if selected): UGX 100,000–400,000 per sample.',
      common_rejections: [
        'CoC from non-UNBS-accredited inspection body',
        'Product on mandatory certification list with no CoC',
        'Test parameters do not cover all requirements of applicable EAS/US standard',
        'CoC covers different product model than shipped',
        'Expired CoC (UNBS CoC validity: typically 6–12 months)',
      ],
      escalation_path: 'UNBS Executive Director — Plot M217 Nakawa Industrial Area, Kampala. ed@unbs.go.ug. Border clearance disputes: UNBS Regional Offices at Malaba (+256 454 444 006) and Busia (+256 454 440 182).',
      notes: 'Uganda operates a mandatory PVoC (Pre-Export Verification of Conformity) scheme for products on the UNBS Compulsory List. The list includes: electrical equipment, steel products, food products, LPG cylinders, textiles, cosmetics, and building materials. Check the current list at unbs.go.ug before ordering. Uganda and Kenya are both EAC members — Kenya-origin goods travel under EAC rules with 0% duty and simplified documentation. Chinese/Indian/UAE origin goods require full PVoC CoC.',
      last_verified: 'May 2026',
    },
    {
      code: 'NDA',
      full_name: 'National Drug Authority',
      regulates: ['Pharmaceuticals', 'Medical Devices', 'Veterinary Drugs', 'Herbal Medicines', 'Biological Products'],
      sla_official_days: 30,
      sla_actual_days: 45,
      documents: [
        { name: 'NDA Import Permit', mandatory: true, rejection_reason: 'All pharmaceutical products require an NDA import permit before the shipment departs origin. Retroactive permits not issued. Goods without permit are seized at border.', source_hint: 'Apply at nda.or.ug. Permit is product and quantity specific. Processing: 14–21 working days.' },
        { name: 'NDA Product Registration Certificate', mandatory: true, rejection_reason: 'Pharmaceuticals must be registered with NDA before importation. Unregistered products cannot be cleared under any circumstances.', source_hint: 'Registration for new products: 6–24 months. Check existing registration status at nda.or.ug product database before ordering.' },
        { name: 'Certificate of Analysis (batch-specific)', mandatory: true, rejection_reason: 'NDA requires batch-specific CoA. Product-level CoA without lot number rejected.', source_hint: 'Request from manufacturer. Lot number must match BoL.' },
        { name: 'Free Sale Certificate', mandatory: true, rejection_reason: 'Confirms the product is authorised for sale in the country of manufacture.', source_hint: 'Issued by NMRA (National Medicines Regulatory Authority) of exporting country.' },
        { name: 'WHO-GMP Certificate or PIC/S GMP', mandatory: true, rejection_reason: 'NDA requires manufacturer GMP certification. Certificates older than 3 years are not accepted.', source_hint: 'Accepted authorities: WHO, EMA, FDA, MHRA, TGA, CDSCO, NMPA.' },
        { name: 'Cold Chain Documentation', mandatory: false, condition: 'Required for temperature-sensitive products', rejection_reason: 'NDA requires continuous temperature monitoring from manufacturer to Entebbe/Malaba. Gaps in log trigger product rejection.', source_hint: 'Use WHO-qualified data loggers. Include excursion report if any temperature event occurred.' },
      ],
      penalty: {
        type: 'seizure_risk',
        description: 'Unregistered pharmaceuticals: seized and destroyed at importer\'s cost. Criminal charges under the National Drug Policy and Authority Act possible for repeat violations. Substandard or counterfeit medicines: mandatory recall + destruction + criminal prosecution. NDA maintains a public database of seized/recalled products.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.nda.or.ug',
      phone: '+256 414 255 665',
      fees_summary: 'Import permit: UGX 100,000–500,000. Product registration: UGX 2,000,000–8,000,000 (one-time, varies by category). Annual registration renewal: UGX 500,000–2,000,000. Lab testing fee (if required): UGX 200,000–1,000,000.',
      common_rejections: [
        'Product not registered with NDA (most common and most serious)',
        'Import permit quantity does not match actual shipment',
        'CoA not batch-specific',
        'GMP certificate expired or covers different manufacturing site',
        'Labeling not compliant with NDA requirements (English required, dosage + storage conditions mandatory)',
      ],
      escalation_path: 'NDA Executive Director — Plot 46–48 Lumumba Avenue, Kampala. director@nda.or.ug. For emergency medicines: written request to NDA Board for expedited review with Ministry of Health support letter.',
      notes: 'NDA registration is the critical long-lead item for Uganda pharmaceutical imports — 6–24 months for new products. Budget this timeline before committing to a product. NDA has reciprocal recognition agreements with some East African regulators — products registered with PPB Kenya, TFDA Tanzania, or WHO prequalified products may qualify for expedited NDA registration (3–6 months). Confirm eligibility at nda.or.ug before applying.',
      last_verified: 'May 2026',
    },
    {
      code: 'ERA',
      full_name: 'Electricity Regulatory Authority',
      regulates: ['Electrical Equipment', 'Solar Panels', 'Generators', 'Transformers', 'Petroleum Products', 'LPG'],
      sla_official_days: 21,
      sla_actual_days: 28,
      documents: [
        { name: 'ERA Import Permit', mandatory: true, rejection_reason: 'Electrical equipment and petroleum products require ERA import permit before clearance. URA will not release without ERA permit number.', source_hint: 'Apply at era.or.ug. Specify product category — electrical equipment and petroleum products have different permit types.' },
        { name: 'Product Technical Specifications', mandatory: true, rejection_reason: 'ERA requires full technical datasheet confirming compliance with Uganda/EAC electrical safety standards.', source_hint: 'Include voltage rating, frequency (Uganda: 240V/50Hz), protection class, and applicable IEC standards.' },
        { name: 'Test Certificate from accredited laboratory', mandatory: false, condition: 'Required for all electrical equipment on ERA mandatory certification list', rejection_reason: 'ERA rejects test certificates from non-UNAS-accredited labs. IEC/CB scheme certificates from CB members are accepted.', source_hint: 'IEC CB scheme test reports from any CB test laboratory are accepted globally — fastest path for electrical equipment.' },
      ],
      penalty: {
        type: 'pct_cif',
        rate_pct_per_week: 2,
        cap_pct: 25,
        description: 'Non-compliant electrical equipment: seizure + mandatory return to sender. Operating unlicensed petroleum import business: UGX 10,000,000+ fine. Substandard electrical equipment causing harm: criminal liability under the Electricity Act.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.era.or.ug',
      phone: '+256 414 558 800',
      fees_summary: 'Electrical equipment import permit: UGX 200,000–800,000. Petroleum import licence: UGX 2,000,000–5,000,000 annually. ERA compliance testing: UGX 100,000–500,000 per product type.',
      common_rejections: [
        'Voltage/frequency mismatch (Uganda 240V/50Hz — products rated 110V/60Hz are rejected)',
        'Solar inverters without ERA compliance mark',
        'Generators without ERA registration',
        'Petroleum import without valid OMC (Oil Marketing Company) licence',
      ],
      escalation_path: 'ERA Chief Executive Officer — Plot 15 Shimba Hills Road, Nakasero, Kampala. info@era.or.ug. Dispute on import permit: written request to ERA Licensing Department.',
      notes: 'Uganda\'s electrical grid is 240V/50Hz — same as Kenya and Tanzania. This is EAC-harmonized. However, many products from China and the USA are rated 110V/60Hz and will fail ERA compliance checks. Importers must explicitly verify voltage rating before purchase. Solar equipment (panels, inverters, batteries) is a major growth category in Uganda but ERA compliance certification is strictly enforced at Malaba/Entebbe.',
      last_verified: 'May 2026',
    },
    {
      code: 'URA',
      full_name: 'Uganda Revenue Authority',
      regulates: ['All Import Customs Clearance', 'Duty Assessment', 'Transit Bond Management'],
      sla_official_days: 5,
      sla_actual_days: 7,
      documents: [
        { name: 'Single Goods Declaration (SGD)', mandatory: true, rejection_reason: 'All imports require an SGD filed on ASYCUDA World before goods are released. Missing or incorrect SGD blocks clearance.', source_hint: 'Filed by URA-licensed clearing agent on ASYCUDA World system. Uganda uses ASYCUDA (not a bespoke system).' },
        { name: 'Transit Declaration (T1) — for Mombasa-transited goods', mandatory: false, condition: 'Required when goods enter Uganda via Kenya (Mombasa transit)', rejection_reason: 'Transit bond must be cancelled at Malaba/Busia. Failure to cancel bond triggers KRA enforcement against the bond guarantor.', source_hint: 'KRA issues T1 at Mombasa. Bond is cancelled by URA officer at the Uganda border post. Ensure this step is completed — it is the most common source of complications for Uganda transit goods.' },
        { name: 'EAC Certificate of Origin', mandatory: false, condition: 'For goods from EAC partner states (Kenya, Tanzania, Rwanda, Burundi, South Sudan)', rejection_reason: 'Without CoO, standard EAC CET rates apply. Kenya-origin goods qualify for 0% duty with valid CoO.', source_hint: 'CoO must be issued before departure. Post-shipment CoOs are not accepted by URA.' },
      ],
      penalty: {
        type: 'pct_cif',
        rate_pct_per_week: 2,
        cap_pct: 50,
        description: 'Misdeclaration: 100% of under-assessed duty + UGX 2,000,000 minimum fine. Transit bond not cancelled: full bond value called. Abandoned goods (>30 days at Malaba): seized and auctioned by URA.',
        confidence: 'estimated',
      },
      portal_url: 'https://www.ura.go.ug',
      phone: '+256 800 117 000',
      fees_summary: 'Import duty: EAC CET (0%/10%/25% by HS code). VAT: 18% on (CIF + duty). Withholding tax: 6% for non-resident suppliers. Infrastructure levy: 1.5% of CIF. Railway Development Levy: 1.5% of CIF.',
      common_rejections: [
        'Transit bond not properly cancelled at Malaba — most common complication for Kenya-transited goods',
        'HS code misclassification — URA reclassification adds duty retroactively',
        'Invoice undervaluation — URA uses WTO customs valuation and EAC reference prices',
        'CoO not accepted for EAC preference (missing MFN stamp or incorrect consignee)',
      ],
      escalation_path: 'URA Commissioner General — Nakawa, Kampala. +256 800 117 000. Malaba border disputes: URA Regional Manager (Eastern Uganda). Post-clearance audit disputes: Tax Appeals Tribunal (TAT).',
      notes: 'Uganda is landlocked. Most goods enter via Mombasa (Kenya) with a KRA transit bond, then road transit to Malaba/Busia border. The transit bond cancellation at the border is a critical step — failure to complete this creates KRA enforcement exposure against the Kenyan bond guarantor and blocks future transit. Use only URA-licensed clearing agents with cross-border transit experience. Uganda infrastructure levy (1.5% of CIF) and railway development levy (1.5% of CIF) are often missed in landed cost calculations.',
      last_verified: 'May 2026',
    },
  ],
}

// ─── Country registry ─────────────────────────────────────────
// Africa expansion: add Nigeria (NG), Ghana (GH), Ethiopia (ET),
// Rwanda (RW), South Africa (ZA) here. No code changes needed.

const COUNTRY_REGISTRY: Record<string, CountryProfile> = {
  KE: KENYA,
  TZ: TANZANIA,
  UG: UGANDA,
}

// ─── Accessor functions ───────────────────────────────────────

export function getCountry(code: string): CountryProfile {
  return COUNTRY_REGISTRY[code] ?? KENYA
}

export function getRegulator(countryCode: string, regulatorCode: string): RegulatorProfile | undefined {
  const country = getCountry(countryCode)
  return country.regulators.find((r) => r.code === regulatorCode)
}

export interface WindowStatus {
  status: 'IMPOSSIBLE' | 'TIGHT' | 'OK'
  daysRemaining: number
  slaRequired: number
  daysShort: number   // > 0 = over budget; for TIGHT this is the buffer (how much slack you have)
  useETA: boolean     // true = calculated from ETA (arrival), false = from pvoc_deadline
}

export function getWindowStatus(
  shipment: { pvoc_deadline?: string | null; eta?: string | null },
  regProfile: RegulatorProfile | null | undefined
): WindowStatus | null {
  if (!regProfile || regProfile.sla_actual_days === 0) return null
  const deadlineStr = shipment.pvoc_deadline || shipment.eta
  if (!deadlineStr) return null
  const daysRemaining = Math.ceil((new Date(deadlineStr).getTime() - Date.now()) / 86400000)
  if (daysRemaining <= 0) return null
  const slaRequired = regProfile.sla_actual_days
  const gap = slaRequired - daysRemaining
  const useETA = !shipment.pvoc_deadline
  if (gap > 0)  return { status: 'IMPOSSIBLE', daysRemaining, slaRequired, daysShort: gap,          useETA }
  if (gap >= -4) return { status: 'TIGHT',     daysRemaining, slaRequired, daysShort: Math.abs(gap), useETA }
  return               { status: 'OK',         daysRemaining, slaRequired, daysShort: 0,             useETA }
}

// ─── System prompt builder ────────────────────────────────────
// Injects the right regulatory context into every AI route.

export function buildRegulatoryContext(regulatorCode: string, countryCode = 'KE', liveRate?: number): string {
  const country   = getCountry(countryCode)
  const regulator = getRegulator(countryCode, regulatorCode)
  const usdRate   = liveRate ?? country.usd_rate

  const baseContext = `
You are KRUX — ${country.country_name}'s import compliance intelligence system. You serve clearing agents and importers managing ${country.port_of_entry}-bound shipments.

Your outputs are used by real operators with real financial exposure. Every number you state is relied upon. Every action you recommend is acted on. Be precise, be specific, be honest.

FINANCIAL CONSTANTS (${country.country_name}):
- 1 USD = ${usdRate} ${country.currency} (live rate)
- Port storage at ${country.port_of_entry}: USD 25–150/day (use shipment's storage_rate if provided)
- Port demurrage after free days: USD 100–500/day
- KRA IDF levy: 2% of CIF (minimum KES 5,000)
- KRA RDL levy: 1.5% of CIF
- KRA IDF + VAT processing: 1–3 days
- VAT: 16% on (CIF + import duty)
- Late clearance penalty: 2% of CIF per week after deadline (capped at 50%)
`.trim()

  if (!regulator) return baseContext

  const docsText = regulator.documents
    .map((d) => `  - ${d.name}${d.condition ? ` [${d.condition}]` : ''}${!d.mandatory ? ' [conditional]' : ''}\n    If missing: ${d.rejection_reason}${d.source_hint ? `\n    Source: ${d.source_hint}` : ''}`)
    .join('\n')

  return `${baseContext}

REGULATOR IN SCOPE: ${regulator.code} — ${regulator.full_name}
Regulates: ${regulator.regulates.join(', ')}
Official SLA: ${regulator.sla_official_days} days | Actual average: ${regulator.sla_actual_days} days
Portal: ${regulator.portal_url}
Phone: ${regulator.phone}
Fees: ${regulator.fees_summary}

REQUIRED DOCUMENTS (${regulator.code}):
${docsText}

COMMON REJECTION CAUSES:
${regulator.common_rejections.map((r) => `  - ${r}`).join('\n')}

ESCALATION PATH: ${regulator.escalation_path}

OPERATIONAL NOTES: ${regulator.notes}
`.trim()
}

// ─── Financial exposure calculator ───────────────────────────
// All penalty structures come from regulator profiles above.
// Figures marked 'estimated' must be verified with a domain expert before quoting to clients.

export function calcExposure(params: {
  cif_value_usd: number
  storage_rate_per_day_usd: number
  days_at_risk: number
  regulator_code: string
  country_code?: string
  usd_rate_override?: number
}): ExposureResult {
  const countryCode = params.country_code ?? 'KE'
  const country     = getCountry(countryCode)
  const regulator   = getRegulator(countryCode, params.regulator_code)
  const rate        = params.usd_rate_override ?? country.usd_rate
  const days        = params.days_at_risk

  // ── 1. Storage (from shipment's actual daily rate — most accurate) ──
  const storage_usd = params.storage_rate_per_day_usd * days

  // ── 2. KPA demurrage (from country profile, kicks in after free period) ──
  const kpa           = country.kpa_demurrage
  const demurrDays    = Math.max(0, days - kpa.free_days)
  // Rate doubles for days beyond the doubling threshold
  const normalDays    = Math.min(demurrDays, Math.max(0, kpa.doubles_after_days - kpa.free_days))
  const doubledDays   = Math.max(0, demurrDays - normalDays)
  const demurrage_usd = normalDays * kpa.daily_rate_usd + doubledDays * kpa.daily_rate_usd * 2

  // ── 3. Regulator-specific penalty ──────────────────────────────────────
  const ps = regulator?.penalty
  let penalty_usd   = 0
  let seizure_risk  = false
  let is_estimated  = kpa.confidence === 'estimated'
  const penalty_notes: string[] = []

  if (ps) {
    if (ps.confidence === 'estimated') is_estimated = true

    switch (ps.type) {
      case 'pct_cif': {
        const weeks   = Math.max(0, Math.ceil(days / 7))
        const raw     = params.cif_value_usd * ((ps.rate_pct_per_week ?? 2) / 100) * weeks
        const cap     = ps.cap_pct != null ? params.cif_value_usd * (ps.cap_pct / 100) : Infinity
        penalty_usd   = Math.min(raw, cap)
        break
      }
      case 'fixed_cost': {
        penalty_usd = ps.fixed_cost_usd ?? 0
        break
      }
      case 'seizure_risk': {
        seizure_risk = true
        // Do not add to the financial total — seizure risk is flagged separately.
        // The potential loss is the full CIF value, not a calculable line item.
        break
      }
      case 'none':
      default:
        break
    }

    if (ps.description) penalty_notes.push(ps.description)
  }

  if (is_estimated) {
    penalty_notes.push('Penalty figures are estimates based on general Kenya regulatory structure — verify with your clearing agent before quoting to clients.')
  }

  const total_usd = storage_usd + demurrage_usd + penalty_usd

  return {
    storage_usd:    Math.round(storage_usd),
    storage_kes:    Math.round(storage_usd * rate),
    demurrage_usd:  Math.round(demurrage_usd),
    demurrage_kes:  Math.round(demurrage_usd * rate),
    penalty_usd:    Math.round(penalty_usd),
    penalty_kes:    Math.round(penalty_usd * rate),
    total_usd:      Math.round(total_usd),
    total_kes:      Math.round(total_usd * rate),
    is_estimated,
    seizure_risk,
    penalty_notes,
  }
}
