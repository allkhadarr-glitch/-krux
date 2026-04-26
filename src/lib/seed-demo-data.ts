import type { SupabaseClient } from '@supabase/supabase-js'

export async function seedDemoData(supabase: SupabaseClient, orgId: string) {
  const today    = new Date()
  const addDays  = (n: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + n)
    return d.toISOString().split('T')[0]
  }

  const { data: bodies } = await supabase.from('regulatory_bodies').select('id, code')
  const bodyMap: Record<string, string> = Object.fromEntries(
    (bodies ?? []).map((b: { id: string; code: string }) => [b.code, b.id])
  )

  const { data: mfr1 } = await supabase.from('manufacturers').insert({
    organization_id:      orgId,
    company_name:         'Zhejiang Pharma Co. Ltd',
    country:              'China',
    city:                 'Hangzhou',
    product_categories:   ['Pharmaceuticals', 'Supplements'],
    overall_risk:         'AMBER',
    reliability_score:    72,
    financial_risk_score: 35,
    is_vetted:            true,
    vetting_score:        74,
    total_orders_placed:  18,
    orders_on_time:       14,
    orders_disputed:      2,
  }).select('id').single()

  const { data: mfr2 } = await supabase.from('manufacturers').insert({
    organization_id:      orgId,
    company_name:         'Gujarat Agrochem Industries',
    country:              'India',
    city:                 'Ahmedabad',
    product_categories:   ['Fertilizers', 'Pesticides', 'Agricultural Chemicals'],
    overall_risk:         'GREEN',
    reliability_score:    88,
    financial_risk_score: 18,
    is_vetted:            true,
    vetting_score:        89,
    total_orders_placed:  31,
    orders_on_time:       29,
    orders_disputed:      0,
  }).select('id').single()

  const { data: createdShipments, error: shipError } = await supabase
    .from('shipments')
    .insert([
      {
        organization_id:        orgId,
        name:                   'Amoxicillin 500mg — Batch K23B',
        manufacturer_id:        mfr1?.id ?? null,
        regulatory_body_id:     bodyMap['PPB'] ?? null,
        origin_port:            'Shanghai',
        destination_port:       'Mombasa',
        origin_country:         'China',
        hs_code:                '3004.20',
        product_description:    'Antibiotic capsules — 500mg, 100,000 units',
        quantity:               100000,
        unit:                   'capsules',
        weight_kg:              820,
        cif_value_usd:          45000,
        import_duty_usd:        11250,
        vat_usd:                9000,
        idf_levy_usd:           1012.5,
        rdl_levy_usd:           675,
        pvoc_fee_usd:           300,
        clearing_fee_usd:       500,
        total_landed_cost_usd:  67737.5,
        total_landed_cost_kes:  8738138,
        exchange_rate_used:     129,
        storage_rate_per_day:   45,
        pvoc_deadline:          addDays(8),
        eta:                    addDays(5),
        risk_flag_status:       'RED',
        remediation_status:     'IN_PROGRESS',
        shipment_status:        'AT_PORT',
        composite_risk_score:   87,
        open_action_count:      3,
      },
      {
        organization_id:        orgId,
        name:                   'NPK Fertilizer 20-10-10 — 50MT',
        manufacturer_id:        mfr2?.id ?? null,
        regulatory_body_id:     bodyMap['PCPB'] ?? null,
        origin_port:            'Mundra',
        destination_port:       'Mombasa',
        origin_country:         'India',
        hs_code:                '3105.20',
        product_description:    'Compound fertilizer, 50,000kg in 1,000 x 50kg bags',
        quantity:               1000,
        unit:                   'bags',
        weight_kg:              50000,
        cif_value_usd:          28000,
        import_duty_usd:        2800,
        vat_usd:                4928,
        idf_levy_usd:           630,
        rdl_levy_usd:           420,
        pvoc_fee_usd:           300,
        clearing_fee_usd:       500,
        total_landed_cost_usd:  37578,
        total_landed_cost_kes:  4847562,
        exchange_rate_used:     129,
        storage_rate_per_day:   28,
        pvoc_deadline:          addDays(22),
        eta:                    addDays(18),
        risk_flag_status:       'AMBER',
        remediation_status:     'OPEN',
        shipment_status:        'IN_TRANSIT',
        composite_risk_score:   54,
        open_action_count:      2,
      },
      {
        organization_id:        orgId,
        name:                   'LED Panel Lighting Kit — CR2024',
        manufacturer_id:        null,
        regulatory_body_id:     bodyMap['KEBS'] ?? null,
        origin_port:            'Shenzhen',
        destination_port:       'Mombasa',
        origin_country:         'China',
        hs_code:                '9405.40',
        product_description:    'Commercial LED panel lights, 2400 units, 48W',
        quantity:               2400,
        unit:                   'units',
        weight_kg:              2880,
        cif_value_usd:          15000,
        import_duty_usd:        3750,
        vat_usd:                3000,
        idf_levy_usd:           337.5,
        rdl_levy_usd:           225,
        pvoc_fee_usd:           300,
        clearing_fee_usd:       500,
        total_landed_cost_usd:  23112.5,
        total_landed_cost_kes:  2981512,
        exchange_rate_used:     129,
        storage_rate_per_day:   15,
        pvoc_deadline:          addDays(45),
        eta:                    addDays(38),
        risk_flag_status:       'GREEN',
        remediation_status:     'OPEN',
        shipment_status:        'IN_TRANSIT',
        composite_risk_score:   22,
        open_action_count:      1,
      },
      {
        organization_id:        orgId,
        name:                   'Pyrethroid Pesticide — Lot P2024',
        manufacturer_id:        mfr2?.id ?? null,
        regulatory_body_id:     bodyMap['KEPHIS'] ?? null,
        origin_port:            'Chennai',
        destination_port:       'Mombasa',
        origin_country:         'India',
        hs_code:                '3808.91',
        product_description:    'Agricultural insecticide, 10,000L in 200L drums',
        quantity:               50,
        unit:                   'drums',
        weight_kg:              10500,
        cif_value_usd:          38000,
        import_duty_usd:        9500,
        vat_usd:                7600,
        idf_levy_usd:           855,
        rdl_levy_usd:           570,
        pvoc_fee_usd:           300,
        clearing_fee_usd:       500,
        total_landed_cost_usd:  57325,
        total_landed_cost_kes:  7394925,
        exchange_rate_used:     129,
        storage_rate_per_day:   38,
        pvoc_deadline:          addDays(3),
        eta:                    addDays(1),
        risk_flag_status:       'RED',
        remediation_status:     'ESCALATED',
        shipment_status:        'AT_PORT',
        composite_risk_score:   95,
        open_action_count:      4,
      },
      {
        organization_id:        orgId,
        name:                   'Jet A-1 Aviation Fuel — 500KL',
        manufacturer_id:        null,
        regulatory_body_id:     bodyMap['EPRA'] ?? null,
        origin_port:            'Jebel Ali',
        destination_port:       'Mombasa',
        origin_country:         'UAE',
        hs_code:                '2710.19.11',
        product_description:    'Kerosene-type jet fuel (Jet A-1), 500,000 litres in ISO tank containers',
        quantity:               500000,
        unit:                   'litres',
        weight_kg:              395000,
        cif_value_usd:          620000,
        import_duty_usd:        0,
        vat_usd:                99200,
        idf_levy_usd:           12400,
        rdl_levy_usd:           9300,
        pvoc_fee_usd:           1200,
        clearing_fee_usd:       2500,
        total_landed_cost_usd:  744600,
        total_landed_cost_kes:  96055200,
        exchange_rate_used:     129,
        storage_rate_per_day:   180,
        pvoc_deadline:          addDays(12),
        eta:                    addDays(8),
        risk_flag_status:       'RED',
        remediation_status:     'IN_PROGRESS',
        shipment_status:        'IN_TRANSIT',
        composite_risk_score:   91,
        open_action_count:      3,
      },
    ])
    .select('id, name')

  if (shipError) return { ok: false as const, error: shipError.message }

  const s0 = createdShipments?.[0]
  const s3 = createdShipments?.[3]
  const s4 = createdShipments?.[4]

  if (s0) {
    await supabase.from('actions').insert([
      {
        organization_id: orgId, shipment_id: s0.id,
        action_type: 'SUBMIT_PPB', priority: 'HIGH',
        title: 'Submit PPB application form + CoA',
        description: 'File PPB/IMP/2024 with Certificate of Analysis from manufacturer. Attach WHO-GMP certificate.',
        source: 'SYSTEM', status: 'IN_PROGRESS',
      },
      {
        organization_id: orgId, shipment_id: s0.id,
        action_type: 'VERIFY_DOCS', priority: 'HIGH',
        title: 'Verify all import documentation',
        description: 'Confirm IDF lodged on KRA iTax. Check packing list matches BoL quantities.',
        source: 'SYSTEM', status: 'OPEN',
      },
      {
        organization_id: orgId, shipment_id: s0.id,
        action_type: 'COORDINATE_AGENT', priority: 'MEDIUM',
        title: 'Brief clearing agent on PPB timeline',
        description: 'Share PPB processing timeline with clearing agent. Confirm storage facility booking.',
        source: 'USER', status: 'OPEN',
      },
    ])
  }

  if (s3) {
    await supabase.from('actions').insert([
      {
        organization_id: orgId, shipment_id: s3.id,
        action_type: 'SUBMIT_KEPHIS', priority: 'CRITICAL',
        title: 'URGENT: File KEPHIS phytosanitary certificate',
        description: 'File KEPHIS phytosanitary certificate with origin country documentation. Deadline in 3 days.',
        source: 'SYSTEM', status: 'OPEN',
      },
      {
        organization_id: orgId, shipment_id: s3.id,
        action_type: 'ESCALATE_MANAGEMENT', priority: 'CRITICAL',
        title: 'Escalate to management — deadline critical',
        description: 'PVoC deadline in 3 days. Escalate to management and clearing agent immediately.',
        source: 'SYSTEM', status: 'OPEN',
      },
    ])
  }

  if (s4) {
    await supabase.from('actions').insert([
      {
        organization_id: orgId, shipment_id: s4.id,
        action_type: 'SUBMIT_EPRA', priority: 'CRITICAL',
        title: 'File EPRA petroleum import permit — URGENT',
        description: 'EPRA processing takes 25 days. You have 12 days remaining — clearance is mathematically impossible without immediate escalation. File now to create a record and reduce penalty exposure. Portal: epra.go.ke/licensing',
        source: 'SYSTEM', status: 'OPEN',
      },
      {
        organization_id: orgId, shipment_id: s4.id,
        action_type: 'VERIFY_DOCS', priority: 'HIGH',
        title: 'Confirm KRA IDF lodged — HS 2710.19.11',
        description: 'Jet A-1 (HS 2710.19.11) attracts 0% import duty. Ensure HS code is correctly declared on IDF to avoid misclassification penalty. File at kra.go.ke/itax.',
        source: 'SYSTEM', status: 'IN_PROGRESS',
      },
      {
        organization_id: orgId, shipment_id: s4.id,
        action_type: 'COORDINATE_AGENT', priority: 'HIGH',
        title: 'Confirm KPC/oil depot receiving capacity at JKIA',
        description: 'Coordinate with Kenya Pipeline Company on tank availability for 500KL Jet A-1 delivery. Storage capacity confirmation needed before discharge.',
        source: 'USER', status: 'OPEN',
      },
    ])
  }

  if (mfr1?.id) {
    await supabase.from('manufacturer_licenses').insert([
      {
        manufacturer_id: mfr1.id, organization_id: orgId,
        license_type: 'WHO_GMP', license_name: 'WHO Good Manufacturing Practice Certificate',
        issuing_body: 'WHO', issuing_country: 'China',
        expiry_date: addDays(35), renewal_lead_time_days: 60,
        status: 'EXPIRING_60', is_verified: true,
      },
      {
        manufacturer_id: mfr1.id, organization_id: orgId,
        license_type: 'EXPORT_LICENSE', license_name: 'China Pharmaceutical Export License',
        issuing_body: 'NMPA', issuing_country: 'China',
        expiry_date: addDays(180), renewal_lead_time_days: 30,
        status: 'ACTIVE', is_verified: true,
      },
    ])
  }

  await supabase.from('notifications').insert([
    {
      organization_id: orgId,
      title: 'CRITICAL: Jet A-1 Fuel — EPRA permit not filed, 12 days to deadline',
      body: 'Jet A-1 Aviation Fuel (500KL) — EPRA processing is 25 days. Deadline in 12 days. Clearance impossible without immediate escalation. KES 96M shipment at risk.',
      type: 'CRITICAL',
      action_url: '/dashboard/operations',
    },
    {
      organization_id: orgId,
      title: 'CRITICAL: Pyrethroid shipment — 3 days to deadline',
      body: 'Lot P2024 has only 3 days until PVoC deadline. KEPHIS phytosanitary certificate still pending.',
      type: 'CRITICAL',
      action_url: '/dashboard/operations',
    },
    {
      organization_id: orgId,
      title: 'WHO-GMP certificate expiring in 35 days',
      body: 'Zhejiang Pharma Co. Ltd — WHO-GMP Certificate expires in 35 days. Begin renewal immediately.',
      type: 'WARNING',
      action_url: '/dashboard/manufacturer',
    },
    {
      organization_id: orgId,
      title: 'Your workspace is ready',
      body: 'Preloaded with 4 sample Kenya shipments. Replace them with your real imports to see live risk analysis.',
      type: 'INFO',
      action_url: '/dashboard/operations',
    },
  ])

  return {
    ok: true as const,
    created: { shipments: createdShipments?.length ?? 0, manufacturers: 2, notifications: 3 },
  }
}
