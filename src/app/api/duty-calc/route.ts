import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

// Kenya KRA duty calculation — EAC Common External Tariff
// Rates as per KRA tariff schedule and Finance Acts
const IDF_RATE     = 0.02    // Import Declaration Fee: 2% of CIF
const RDL_RATE     = 0.015   // Railway Development Levy: 1.5% of CIF
const VAT_RATE     = 0.16    // VAT on (CIF + Import Duty + Excise Duty)
const PVOC_FEE     = 300     // USD — Pre-Export Verification of Conformity (flat)
const CLEARING_FEE = 500     // USD — Clearing agent estimate

// Motor vehicle specific levies (Kenya Finance Act — estimated, verify before quoting)
const EXCISE_DUTY_RATE_NEW     = 0.00   // New vehicles (0 years)
const EXCISE_DUTY_RATE_YOUNG   = 0.10   // 1–3 years old
const EXCISE_DUTY_RATE_USED    = 0.20   // 3+ years old (most used vehicle imports)
const MSS_LEVY_KES             = 2000   // Motor Vehicle Safety Standards levy (est.)
const RPB_INSPECTION_FEE_KES   = 1000   // Radiation Protection Board — used vehicles only
const NTSA_REGISTRATION_KES    = 4500   // NTSA registration fee (est. mid-range)
const NUMBER_PLATE_FEE_KES     = 3000   // NTSA number plates (front + rear)

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cif: number           = Number(body.cif_value_usd ?? 0)
  const dutyPct: number       = Number(body.import_duty_pct ?? 25)
  const hsCode: string | null = body.hs_code ?? null
  const regulatoryBody: string | null = body.regulatory_body ?? null
  const importType: string    = body.import_type ?? 'standard'        // 'standard' | 'motor_vehicle'
  const vehicleAgeYears: number = Number(body.vehicle_age_years ?? 5) // default 5 years (used)
  const isUsedVehicle: boolean  = vehicleAgeYears > 0

  if (!cif || cif <= 0) {
    return NextResponse.json({ error: 'cif_value_usd is required' }, { status: 400 })
  }

  const fxRate = await getKesRate()

  function line(label: string, usd: number, rate?: string, isTotal = false, note?: string) {
    return { label, rate: rate ?? null, usd: Math.round(usd * 100) / 100, kes: Math.round(usd * fxRate * 100) / 100, isTotal, note: note ?? null }
  }

  if (importType === 'motor_vehicle') {
    // Motor vehicle duty stack — Kenya Finance Act + EAC CET
    const importDuty  = cif * (dutyPct / 100)  // typically 25% for used vehicles
    const idf         = cif * IDF_RATE
    const rdl         = cif * RDL_RATE

    const exciseRate  = vehicleAgeYears === 0 ? EXCISE_DUTY_RATE_NEW
                      : vehicleAgeYears <= 3  ? EXCISE_DUTY_RATE_YOUNG
                      : EXCISE_DUTY_RATE_USED
    const exciseDuty  = (cif + importDuty) * exciseRate

    const vatBase     = cif + importDuty + exciseDuty
    const vat         = vatBase * VAT_RATE

    // KES-denominated levies converted to USD for totalling
    const mssUSD      = MSS_LEVY_KES / fxRate
    const rpbUSD      = isUsedVehicle ? RPB_INSPECTION_FEE_KES / fxRate : 0
    const ntsaRegUSD  = NTSA_REGISTRATION_KES / fxRate
    const platesUSD   = NUMBER_PLATE_FEE_KES / fxRate

    const totalUSD    = cif + importDuty + idf + rdl + exciseDuty + vat + mssUSD + rpbUSD + ntsaRegUSD + platesUSD + CLEARING_FEE

    const lines = [
      line('CIF Value',                    cif,        undefined),
      line('Import Duty',                  importDuty, `${dutyPct}% of CIF`),
      line('Excise Duty',                  exciseDuty, `${(exciseRate * 100).toFixed(0)}% of (CIF + Import Duty)`, false, vehicleAgeYears === 0 ? 'New vehicle — 0% excise' : vehicleAgeYears <= 3 ? '1–3 years old — 10% excise' : '3+ years old — 20% excise'),
      line('Import Declaration Fee (IDF)', idf,        `${(IDF_RATE * 100).toFixed(1)}% of CIF`),
      line('Railway Dev. Levy (RDL)',      rdl,        `${(RDL_RATE * 100).toFixed(1)}% of CIF`),
      line('VAT',                          vat,        `${(VAT_RATE * 100).toFixed(0)}% of (CIF + Duty + Excise)`),
      line('MSS Levy',                     mssUSD,     `KES ${MSS_LEVY_KES.toLocaleString()} flat`, false, 'Motor Vehicle Safety Standards levy (est.)'),
      ...(isUsedVehicle ? [line('RPB Radiation Inspection', rpbUSD, `KES ${RPB_INSPECTION_FEE_KES.toLocaleString()} flat`, false, 'Radiation Protection Board — used vehicles only')] : []),
      line('NTSA Registration',            ntsaRegUSD, `KES ${NTSA_REGISTRATION_KES.toLocaleString()} flat`, false, 'Est. — varies by vehicle class'),
      line('Number Plates',                platesUSD,  `KES ${NUMBER_PLATE_FEE_KES.toLocaleString()} flat`, false, 'Front + rear plates (NTSA)'),
      line('Clearing Agent',               CLEARING_FEE, 'Estimate'),
      line('Total Landed Cost',            totalUSD,   undefined, true),
    ]

    return NextResponse.json({
      import_type:           'motor_vehicle',
      cif_value_usd:         cif,
      import_duty_pct:       dutyPct,
      vehicle_age_years:     vehicleAgeYears,
      hs_code:               hsCode,
      fx_rate:               fxRate,
      import_duty_usd:       Math.round(importDuty * 100) / 100,
      excise_duty_usd:       Math.round(exciseDuty * 100) / 100,
      excise_duty_rate_pct:  exciseRate * 100,
      idf_levy_usd:          Math.round(idf * 100) / 100,
      rdl_levy_usd:          Math.round(rdl * 100) / 100,
      vat_usd:               Math.round(vat * 100) / 100,
      mss_levy_usd:          Math.round(mssUSD * 100) / 100,
      rpb_inspection_usd:    isUsedVehicle ? Math.round(rpbUSD * 100) / 100 : 0,
      ntsa_registration_usd: Math.round(ntsaRegUSD * 100) / 100,
      number_plate_usd:      Math.round(platesUSD * 100) / 100,
      clearing_fee_usd:      CLEARING_FEE,
      total_landed_cost_usd: Math.round(totalUSD * 100) / 100,
      total_landed_cost_kes: Math.round(totalUSD * fxRate * 100) / 100,
      notes: 'Motor vehicle levies (MSS, NTSA, plates) are estimates — verify current rates at ntsa.go.ke before quoting. Left-hand drive vehicles cannot be registered in Kenya. Used vehicle age limit: 8 years from manufacture to import.',
      lines,
    })
  }

  // ── Standard import (all non-vehicle goods) ──
  const importDuty = cif * (dutyPct / 100)
  const idf        = cif * IDF_RATE
  const rdl        = cif * RDL_RATE
  const vatBase    = cif + importDuty
  const vat        = vatBase * VAT_RATE
  const totalUSD   = cif + importDuty + idf + rdl + vat + PVOC_FEE + CLEARING_FEE

  const lines = [
    line('CIF Value',                    cif,          undefined),
    line('Import Duty',                  importDuty,   `${dutyPct}% of CIF`),
    line('Import Declaration Fee (IDF)', idf,          `${(IDF_RATE * 100).toFixed(1)}% of CIF`),
    line('Railway Dev. Levy (RDL)',      rdl,          `${(RDL_RATE * 100).toFixed(1)}% of CIF`),
    line('VAT',                          vat,          `${(VAT_RATE * 100).toFixed(0)}% of (CIF + Duty)`),
    line('PVoC Inspection Fee',          PVOC_FEE,     'Flat fee (est.)'),
    line('Clearing Agent',               CLEARING_FEE, 'Estimate'),
    line('Total Landed Cost',            totalUSD,     undefined, true),
  ]

  return NextResponse.json({
    import_type:           'standard',
    cif_value_usd:         cif,
    import_duty_pct:       dutyPct,
    hs_code:               hsCode,
    regulatory_body:       regulatoryBody,
    fx_rate:               fxRate,
    import_duty_usd:       Math.round(importDuty * 100) / 100,
    idf_levy_usd:          Math.round(idf * 100) / 100,
    rdl_levy_usd:          Math.round(rdl * 100) / 100,
    vat_usd:               Math.round(vat * 100) / 100,
    pvoc_fee_usd:          PVOC_FEE,
    clearing_fee_usd:      CLEARING_FEE,
    total_landed_cost_usd: Math.round(totalUSD * 100) / 100,
    total_landed_cost_kes: Math.round(totalUSD * fxRate * 100) / 100,
    lines,
  })
}
