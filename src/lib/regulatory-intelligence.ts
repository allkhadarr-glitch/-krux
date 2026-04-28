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
      last_verified: 'April 2026',
    },
    {
      code: 'KEBS',
      full_name: 'Kenya Bureau of Standards',
      regulates: ['Electronics', 'Electrical Equipment', 'Construction Materials', 'Textiles', 'Footwear', 'Food Processing Equipment', 'Motor Vehicles', 'Toys'],
      sla_official_days: 30,
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
      last_verified: 'April 2026',
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
      last_verified: 'April 2026',
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
      last_verified: 'April 2026',
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
      notes: 'KRA customs clearance (1–3 days) is handled entirely through KRA iCMS — the Integrated Customs Management System used by licensed clearing agents. Importers do not file directly; your clearing agent lodges the customs entry on your behalf. HS code misclassification is the single most expensive error in Kenya customs — 25% penalty on any duty shortfall, plus interest.',
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

// ─── Country registry ─────────────────────────────────────────
// Africa expansion: add Uganda (UG), Tanzania (TZ), Nigeria (NG),
// Ghana (GH), Ethiopia (ET), Rwanda (RW), South Africa (ZA) here.
// No code changes needed — just add the country profile.

const COUNTRY_REGISTRY: Record<string, CountryProfile> = {
  KE: KENYA,
}

// ─── Accessor functions ───────────────────────────────────────

export function getCountry(code: string): CountryProfile {
  return COUNTRY_REGISTRY[code] ?? KENYA
}

export function getRegulator(countryCode: string, regulatorCode: string): RegulatorProfile | undefined {
  const country = getCountry(countryCode)
  return country.regulators.find((r) => r.code === regulatorCode)
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
