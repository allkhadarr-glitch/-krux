/**
 * KRUX HS Code Intelligence — Kenya Customs Tariff
 *
 * Curated database of the most commonly mishandled Kenya import HS codes.
 * Duty rates based on EAC Common External Tariff (CET) + Kenya-specific schedules.
 * All rates indicative — verify against KRA EAC CET tariff schedule before filing.
 */

export interface HSMisclassification {
  wrong_code:    string
  description:   string
  wrong_duty_pct: number
  risk:          'CRITICAL' | 'HIGH' | 'MEDIUM'
  consequence:   string
}

export interface HSCodeEntry {
  code:              string
  description:       string
  category:          string
  import_duty_pct:   number
  vat_pct:           number       // almost always 16% in Kenya
  idf_levy_pct:      number       // always 2%
  rdl_levy_pct:      number       // always 1.5%
  pvoc_required:     boolean
  regulator_codes:   string[]
  keywords?:         string[]     // trade names, aliases, product synonyms for search
  excise_note?:      string       // excise duty if applicable
  misclassifications: HSMisclassification[]
  statutory_note:    string       // actual legal reference where applicable
  kra_notes:         string       // what KRA officers specifically check
  clearance_tip:     string       // the one thing that makes clearance go faster
}

export const HS_DATABASE: HSCodeEntry[] = [
  // ─── PETROLEUM ───────────────────────────────────────────────
  {
    code:            '2710.19.11',
    description:     'Kerosene-type jet fuel (Jet A-1 / Aviation Turbine Fuel)',
    category:        'Petroleum Products',
    import_duty_pct: 0,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['EPRA'],
    keywords:        ['ATF', 'aviation fuel', 'jet fuel', 'Jet A1', 'jet a-1', 'aviation turbine fuel', 'JKIA fuel', 'kerosene', 'airline fuel', 'aircraft fuel'],
    excise_note:     'No excise duty on Jet A-1 (aviation fuel exemption). Verify with KRA excise schedule.',
    misclassifications: [
      {
        wrong_code:    '2710.19.90',
        description:   'Other petroleum oils (catch-all)',
        wrong_duty_pct: 25,
        risk:          'CRITICAL',
        consequence:   'Misclassification from 0% to 25% triggers duty shortfall of ~KES 155,000 per $50K CIF. KRA imposes 2x penalty on shortfall plus interest. This is the most common petroleum misclassification at Kenya ports.',
      },
    ],
    statutory_note:  'EPRA Act 2019, Section 47: import of petroleum products without a valid EPRA permit — fine not exceeding KES 5,000,000 and/or imprisonment for a term not exceeding 3 years.',
    kra_notes:       'KRA officers specifically check that the declared HS code matches the product specification sheet (density, flash point). Aviation fuel has distinct physical properties from other kerosene — a mismatch between specs and HS code triggers investigation.',
    clearance_tip:   'EPRA import permit must be filed 25 days before arrival. There is no expedited track except for declared national essential supply — file that claim in writing with EPRA simultaneously.',
  },
  {
    code:            '2710.19.21',
    description:     'Gas oils (Diesel) — automotive and industrial',
    category:        'Petroleum Products',
    import_duty_pct: 0,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['EPRA'],
    keywords:        ['diesel', 'gas oil', 'AGO', 'automotive gas oil', 'truck fuel', 'generator fuel', 'gasoil', 'heavy fuel', 'industrial diesel'],
    excise_note:     'Excise duty: KES 7.21 per litre (subject to Finance Act revision). Apply on litres declared.',
    misclassifications: [
      {
        wrong_code:    '2710.19.29',
        description:   'Other gas oils (non-automotive)',
        wrong_duty_pct: 0,
        risk:          'HIGH',
        consequence:   'Potential excise duty avoidance allegation — KRA treats 2710.19.29 as industrial diesel with different excise treatment. Shifting between these codes is a known avoidance method KRA actively monitors.',
      },
    ],
    statutory_note:  'Excise Duty Act Cap 472 — petroleum products excise is applied at point of import. EPRA Act 2019 applies for import permit.',
    kra_notes:       'KRA cross-references declared litres vs weight vs density to detect short-declaration. Standard diesel density: 820–845 kg/m³. Declared weight ÷ density must match litres declared.',
    clearance_tip:   'File EPRA import permit at least 25 days before ETA. Declare exact litres — KRA spot-checks density calculations on petroleum imports.',
  },
  {
    code:            '2711.19.00',
    description:     'Liquefied Petroleum Gas (LPG) in cylinders or bulk',
    category:        'Petroleum Products',
    import_duty_pct: 0,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['EPRA', 'KEBS'],
    keywords:        ['LPG', 'cooking gas', 'propane', 'butane', 'gas cylinder', 'liquefied gas', 'LP gas', 'household gas', 'gas refill'],
    excise_note:     'No excise on LPG in Kenya as of current Finance Act. Verify each fiscal year.',
    misclassifications: [
      {
        wrong_code:    '2711.29.00',
        description:   'Other petroleum gases',
        wrong_duty_pct: 25,
        risk:          'HIGH',
        consequence:   'Misclassifying LPG as "other petroleum gases" applies 25% import duty where 0% applies. Common error when LPG is mixed with minor propane fractions.',
      },
    ],
    statutory_note:  'EPRA Act 2019 — LPG is a controlled petroleum product. Cylinder standards also enforced by KEBS under KS 59:2018.',
    kra_notes:       'KRA checks LPG imports for cylinder marking compliance. Unmarked or non-KEBS-compliant cylinders can be held at port pending KEBS inspection.',
    clearance_tip:   'Submit EPRA permit and KEBS LPG cylinder compliance certificate simultaneously — both regulators inspect independently at Mombasa port.',
  },

  // ─── PHARMACEUTICALS ─────────────────────────────────────────
  {
    code:            '3004.20',
    description:     'Antibiotics — packaged for retail/hospital use (e.g. Amoxicillin, Azithromycin)',
    category:        'Pharmaceuticals',
    import_duty_pct: 0,
    vat_pct:         0,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['PPB'],
    keywords:        ['antibiotics', 'amoxicillin', 'azithromycin', 'penicillin', 'tetracycline', 'ciprofloxacin', 'medicine', 'drugs', 'pharma', 'hospital drugs', 'prescription medicine', 'antimicrobial'],
    misclassifications: [
      {
        wrong_code:    '3004.90',
        description:   'Other medicaments (catch-all)',
        wrong_duty_pct: 0,
        risk:          'MEDIUM',
        consequence:   'While duty rate is the same (0%), filing under 3004.90 obscures the specific product category and can trigger PPB re-classification requiring a new import permit. PPB permits are product-specific.',
      },
    ],
    statutory_note:  'Pharmacy and Poisons Act Cap 244, Section 36: importing unregistered pharmaceutical — fine not exceeding KES 500,000 or imprisonment for 3 years. Every batch requires a separate PPB import permit.',
    kra_notes:       'KRA verifies PPB import permit number against declared batch quantity. Quantity overrun vs permit = held shipment pending PPB amendment — which takes another 14 days minimum.',
    clearance_tip:   'Apply for PPB permit before shipment departs origin. PPB processing is 14–52 days. The Certificate of Analysis (CoA) and WHO-GMP certificate MUST match the manufacturer on the permit — any discrepancy = rejection.',
  },
  {
    code:            '3004.50',
    description:     'Vitamins and other provitamins — packaged for retail (supplements)',
    category:        'Pharmaceuticals',
    import_duty_pct: 0,
    vat_pct:         0,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['PPB', 'KEBS'],
    keywords:        ['vitamins', 'supplements', 'nutraceuticals', 'multivitamins', 'vitamin C', 'omega-3', 'health supplement', 'dietary supplement', 'provitamin', 'mineral supplement', 'capsules', 'softgels'],
    misclassifications: [
      {
        wrong_code:    '2106.90',
        description:   'Food preparations (catch-all)',
        wrong_duty_pct: 25,
        risk:          'HIGH',
        consequence:   'Vitamin supplements misclassified as food preparations attract 25% import duty instead of 0%. Common when products contain food-grade ingredients. KRA holds and KBS inspects — can take 30+ days to resolve.',
      },
    ],
    statutory_note:  'Pharmacy and Poisons Act Cap 244 — all vitamin and supplement products with therapeutic claims require PPB registration. Products marketed as food supplements without therapeutic claims fall under KEBS.',
    kra_notes:       'The pharmaceutical vs food classification is the most litigated area at Kenya customs. Products with "supports immune system" labeling go to PPB; products with "boosts immunity" go to PPB with pharmaceutical claims. KRA defers to PPB on borderline cases.',
    clearance_tip:   'If product has any therapeutic claim on label — file under PPB first. Getting this wrong adds 30+ days and a re-submission fee.',
  },

  // ─── FERTILIZERS & AGRI ──────────────────────────────────────
  {
    code:            '3105.20',
    description:     'Mineral or chemical fertilizers — NPK compounds (e.g. 20-10-10, DAP)',
    category:        'Fertilizers & Agriculture',
    import_duty_pct: 0,
    vat_pct:         0,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['PCPB', 'KEPHIS'],
    keywords:        ['NPK', 'fertilizer', 'DAP', 'diammonium phosphate', 'compound fertilizer', 'agro inputs', 'crop nutrients', '20-10-10', 'nitrogen phosphorus potassium', 'blended fertilizer', 'basal fertilizer'],
    misclassifications: [
      {
        wrong_code:    '3102.10',
        description:   'Urea — nitrogen fertilizer only',
        wrong_duty_pct: 0,
        risk:          'MEDIUM',
        consequence:   'NPK compounds must be declared as 3105.20, not as individual nitrogen (3102) or phosphate (3103) fertilizers. Misclassification triggers PCPB re-registration as a different product class — different permit is required.',
      },
    ],
    statutory_note:  'Fertilizers and Animal Foodstuffs Act Cap 345 — import of unregistered fertilizer: fine up to KES 100,000. PCPB re-registration after rejection adds minimum 14-21 days.',
    kra_notes:       'KRA and PCPB jointly inspect NPK fertilizers. NPK ratio declared on label must match Certificate of Analysis. Any variance (even ±1%) requires PCPB amendment before release.',
    clearance_tip:   'Attach PCPB import permit and product CoA showing NPK ratio. The NPK ratio on the label, CoA, and BoL must be identical — tolerance is strict.',
  },
  {
    code:            '3808.91',
    description:     'Insecticides — for agricultural use (pyrethroids, organophosphates)',
    category:        'Pesticides',
    import_duty_pct: 25,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['PCPB', 'KEPHIS'],
    keywords:        ['insecticide', 'pesticide', 'pyrethroid', 'organophosphate', 'agrochemicals', 'herbicide', 'fungicide', 'crop protection', 'spray', 'acaricide', 'nematicide', 'fumigant', 'weedkiller'],
    misclassifications: [
      {
        wrong_code:    '3808.94',
        description:   'Disinfectants',
        wrong_duty_pct: 25,
        risk:          'HIGH',
        consequence:   'Agricultural insecticides declared as disinfectants require entirely different KEPHIS/PCPB registration. Disinfectants fall under PPB for human-use applications. Wrong classification = wrong permit = full rejection.',
      },
    ],
    statutory_note:  'Pest Control Products Act Cap 346 — PCPB registration is mandatory. Products not on PCPB registered list cannot be cleared. Destruction order possible for unregistered pesticides.',
    kra_notes:       'KRA quarantine officers specifically flag pyrethroid imports. Safety Data Sheet, PCPB registration certificate, and phytosanitary certificate from origin country must all be present.',
    clearance_tip:   'KEPHIS and PCPB both inspect independently. KEPHIS phytosanitary certificate from origin country must be government-issued, not private lab. Allow 3-7 days for KEPHIS at port.',
  },

  // ─── ELECTRONICS ─────────────────────────────────────────────
  {
    code:            '9405.40',
    description:     'LED lamps and lighting fittings — commercial/industrial (not for vehicles)',
    category:        'Electronics & Lighting',
    import_duty_pct: 25,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['KEBS'],
    keywords:        ['LED lights', 'LED panels', 'lighting', 'light bulbs', 'lamps', 'solar lights', 'fluorescent', 'downlights', 'street lights', 'flood lights', 'strip lights', 'LED strip', 'light fittings', 'luminaires'],
    misclassifications: [
      {
        wrong_code:    '8543.70',
        description:   'Electrical machines with individual functions',
        wrong_duty_pct: 0,
        risk:          'HIGH',
        consequence:   '8543.70 has 0% duty vs 9405.40 at 25%. LED panels are sometimes misclassified as "electrical machines." KRA catches this on the product description — LED panels cannot be 8543.70.',
      },
      {
        wrong_code:    '8539.50',
        description:   'LED lamps for vehicle use',
        wrong_duty_pct: 25,
        risk:          'MEDIUM',
        consequence:   'Vehicle LED vs commercial LED: same duty rate but KEBS type approval requirements differ. Commercial LED requires IEC 60598-1; vehicle LED requires different KEBS standard. Wrong standard = KEBS rejection.',
      },
    ],
    statutory_note:  'Standards Act Cap 496 — KEBS pre-export verification (PVoC) compulsory for all regulated products. Products below Kenya MEPS (minimum energy performance standards) cannot be imported — this is a product compliance issue, not a documentation issue.',
    kra_notes:       'KRA inspects LED imports for KEBS PVoC sticker and Type Approval certificate number. Products lacking Type Approval are detained pending KEBS physical inspection — which takes 14-30 days at ICD Nairobi.',
    clearance_tip:   'File KEBS pre-export verification request before shipment loads. Allow 30 days. IEC 60598-1 compliance test report from an accredited lab must be uploaded before KEBS will begin processing.',
  },
  {
    code:            '8471.30',
    description:     'Portable digital automatic data processing machines (laptops, tablets)',
    category:        'Electronics & IT',
    import_duty_pct: 0,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   false,
    regulator_codes: ['KEBS'],
    keywords:        ['laptop', 'notebook', 'tablet', 'computer', 'MacBook', 'iPad', 'Surface', 'Chromebook', 'netbook', 'portable computer', 'PC', 'Lenovo', 'HP laptop', 'Dell laptop'],
    misclassifications: [
      {
        wrong_code:    '8471.41',
        description:   'Desktop computers',
        wrong_duty_pct: 0,
        risk:          'MEDIUM',
        consequence:   'Same duty rate but KRA requires different product documentation. Some large laptop imports with docking stations have been challenged as "desktop" — ensure HS code matches physical product spec.',
      },
    ],
    statutory_note:  'ICT sector goods — 0% import duty under EAC ICT development policy. Verify annually as Finance Act can amend.',
    kra_notes:       'KRA spot-checks laptop imports for KEBS type approval if batch exceeds 100 units. Consumer electronics bulk imports often trigger KEBS sample testing at port.',
    clearance_tip:   'Fastest clearing electronics category — no PVoC, 0% duty. Keep commercial invoice quantity accurate — KRA spot-counts electronics shipments.',
  },
  {
    code:            '8517.12',
    description:     'Mobile phones and smartphones',
    category:        'Electronics & IT',
    import_duty_pct: 0,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   false,
    regulator_codes: ['CA', 'KEBS'],
    keywords:        ['smartphone', 'phone', 'iPhone', 'Samsung', 'Android', 'mobile phone', 'handset', 'Tecno', 'Infinix', 'Xiaomi', 'cellular phone', 'feature phone', 'mobile device', 'cell phone'],
    misclassifications: [
      {
        wrong_code:    '8517.18',
        description:   'Other telephone apparatus',
        wrong_duty_pct: 25,
        risk:          'HIGH',
        consequence:   '8517.18 attracts 25% duty vs 0% for 8517.12. Misclassifying smartphones as "other telephone apparatus" is one of the top 5 HS code errors at Kenya customs. KRA actively corrects this.',
      },
    ],
    statutory_note:  'Communications Authority Act — mobile devices must have CA type approval before import. Devices without CA approval are seized at port.',
    kra_notes:       'All mobile devices require Communications Authority (CA) type approval certificate. CA processes in 14-21 days. Without CA approval, KEBS will not release at port regardless of other documentation.',
    clearance_tip:   'File CA type approval application before ordering stock. It takes 21 days and without it you cannot clear. KEBS and CA inspect mobile phones independently.',
  },

  // ─── FOOD & FMCG ──────────────────────────────────────────────
  {
    code:            '1006.30',
    description:     'Semi-milled or wholly milled rice',
    category:        'Food & Agriculture',
    import_duty_pct: 75,
    vat_pct:         0,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['KEBS', 'KEPHIS'],
    keywords:        ['rice', 'milled rice', 'long grain rice', 'Basmati', 'Pakistani rice', 'Indian rice', 'white rice', 'polished rice', 'parboiled rice', 'jasmine rice', 'grain'],
    excise_note:     'EAC preferential rate: 0% from Tanzania/Uganda under EAC. General rate: 75% from all other origins. Always verify origin certificate.',
    misclassifications: [
      {
        wrong_code:    '1006.20',
        description:   'Husked (brown) rice',
        wrong_duty_pct: 75,
        risk:          'MEDIUM',
        consequence:   'Milled rice vs brown rice: same duty rate but KEBS and KEPHIS documentation requirements differ. Milled rice requires KEBS quality grade certification; brown rice requires KEPHIS phytosanitary only.',
      },
    ],
    statutory_note:  'EAC Customs Management Act — origin rules apply strictly to EAC preferential rates. Fraudulent certificate of origin: fine not less than 3x duty evaded.',
    kra_notes:       'Rice is the most scrutinized food import at Kenya customs. KRA verifies weight vs declared bags (1 × 50kg bag standard). Any variance >2% triggers full inspection. EAC certificate of origin must be government-issued.',
    clearance_tip:   'If sourcing from Pakistan/India (most common), budget 75% import duty. EAC rates only apply for Tanzania/Uganda origin with valid government CoO. Phytosanitary certificate from origin is mandatory.',
  },
  {
    code:            '1511.10',
    description:     'Crude palm oil — for food manufacturing',
    category:        'Food & Agriculture',
    import_duty_pct: 35,
    vat_pct:         0,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['KEBS', 'KEPHIS'],
    keywords:        ['palm oil', 'CPO', 'crude palm oil', 'vegetable oil', 'cooking oil', 'edible oil', 'food oil', 'palm', 'fat', 'oil manufacturing'],
    misclassifications: [
      {
        wrong_code:    '1511.90',
        description:   'Refined palm oil and fractions',
        wrong_duty_pct: 35,
        risk:          'MEDIUM',
        consequence:   'Crude vs refined palm oil: KEBS quality requirements differ significantly. Crude requires different food safety certificate than refined. Wrong classification delays KEBS processing.',
      },
    ],
    statutory_note:  'Food, Drugs and Chemical Substances Act Cap 254 — imported food oils require KEBS food grade certification. Non-compliant oils can be condemned and destroyed.',
    kra_notes:       'KRA checks FFA (free fatty acid) content declared on CoA against acceptable limits. Palm oil with FFA >5% is classified as industrial/technical grade and may require NEMA input.',
    clearance_tip:   'Obtain palm oil quality CoA showing FFA content, moisture, and impurities before shipment. KEBS will sample test at port if CoA is not pre-submitted.',
  },

  // ─── VEHICLES ─────────────────────────────────────────────────
  {
    code:            '8703.23',
    description:     'Motor cars — spark ignition, cylinder capacity 1500–3000cc',
    category:        'Vehicles',
    import_duty_pct: 35,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   true,
    regulator_codes: ['KEBS', 'NTSA'],
    keywords:        ['car', 'vehicle', 'motor vehicle', 'passenger car', 'SUV', 'sedan', 'Probox', 'Fielder', 'Vitz', 'Demio', 'used car', 'second hand car', 'Toyota', 'Nissan', 'Honda', 'Mazda', 'saloon', 'hatchback', 'station wagon'],
    excise_note:     'Excise duty: 20% of CIF+import duty. Combined effective rate: ~57%+ before VAT.',
    misclassifications: [
      {
        wrong_code:    '8704.21',
        description:   'Goods vehicles (pickups, trucks) under 5 tonnes',
        wrong_duty_pct: 25,
        risk:          'HIGH',
        consequence:   'Passenger vehicles declared as goods vehicles: 35% vs 25% import duty but ALSO 20% excise only applies to passenger vehicles. Misclassification can work both ways — KRA investigates both.',
      },
    ],
    statutory_note:  'NTSA Act 2012 — vehicles must pass NTSA inspection before registration. KEBS PVoC covers roadworthiness for all imported vehicles.',
    kra_notes:       'Vehicle imports: KRA verifies engine capacity and year of manufacture against KEBS inspection report and manufacturer specs. Year of manufacture determines current market value (depreciation schedule for duty calculation).',
    clearance_tip:   'NTSA and KEBS both inspect independently. Allow 14 days for both after arrival. Vehicle age limit: 8 years old maximum for passenger vehicles (year of manufacture, not first registration).',
  },

  // ─── TEXTILES ─────────────────────────────────────────────────
  {
    code:            '6203.42',
    description:     'Men\'s or boys\' trousers and shorts — of cotton',
    category:        'Textiles & Clothing',
    import_duty_pct: 35,
    vat_pct:         16,
    idf_levy_pct:    2,
    rdl_levy_pct:    1.5,
    pvoc_required:   false,
    regulator_codes: ['KEBS'],
    keywords:        ['trousers', 'jeans', 'pants', 'clothing', 'apparel', 'garments', "men's wear", 'denim', 'chinos', 'shorts', 'textile', 'fashion', 'cotton wear', 'fabric goods'],
    misclassifications: [
      {
        wrong_code:    '6211.32',
        description:   'Men\'s cotton garments NES (catch-all)',
        wrong_duty_pct: 35,
        risk:          'MEDIUM',
        consequence:   'Same duty rate but AGOA/EBA preferential scheme access differs by specific HS code. Wrong code may disqualify from preferential tariff if importing from eligible countries.',
      },
    ],
    statutory_note:  'Anti-Counterfeit Act 2008 — counterfeit apparel (fake brands) is detained and destroyed with no compensation. Importer faces prosecution.',
    kra_notes:       'KRA spot checks clothing imports for under-valuation. Minimum benchmarked values per kg apply — below-benchmark invoices trigger full inspection and value uplift.',
    clearance_tip:   'Use accurate transaction value. KRA maintains a customs value database — invoice below benchmark triggers automatic review. Fastest route: submit accurate commercial invoice with proof of payment.',
  },
]

// ─── Lookup functions ────────────────────────────────────────

export function lookupHS(code: string): HSCodeEntry | undefined {
  const clean = code.replace(/\s/g, '').toUpperCase()
  return HS_DATABASE.find((e) => e.code.replace(/\./g, '') === clean.replace(/\./g, '') || e.code === code)
}

export function searchHS(query: string): HSCodeEntry[] {
  const q = query.toLowerCase().trim()
  if (!q) return HS_DATABASE

  const tokens = q.split(/\s+/).filter(Boolean)

  function score(e: HSCodeEntry): number {
    const haystack = [
      e.code,
      e.description,
      e.category,
      ...e.regulator_codes,
      ...(e.keywords ?? []),
      e.kra_notes,
      e.clearance_tip,
    ].join(' ').toLowerCase()

    // Every token must appear somewhere in the entry
    if (!tokens.every((t) => haystack.includes(t))) return 0

    // Rank: exact code match → code prefix → description contains full query → keyword match
    if (e.code.toLowerCase() === q) return 4
    if (e.code.toLowerCase().startsWith(q)) return 3
    if (e.description.toLowerCase().includes(q)) return 2
    if ((e.keywords ?? []).some((k) => k.toLowerCase().includes(q))) return 1.5
    return 1
  }

  return HS_DATABASE
    .map((e) => ({ e, s: score(e) }))
    .filter(({ s }) => s > 0)
    .sort((a, b) => b.s - a.s)
    .map(({ e }) => e)
}

export const HS_CATEGORIES = [...new Set(HS_DATABASE.map((e) => e.category))]
