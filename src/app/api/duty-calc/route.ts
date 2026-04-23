import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

// Kenya KRA duty calculation — EAC Common External Tariff
// Rates as per KRA tariff schedule and Finance Acts
const IDF_RATE     = 0.02    // Import Declaration Fee: 2% of CIF
const RDL_RATE     = 0.015   // Railway Development Levy: 1.5% of CIF
const VAT_RATE     = 0.16    // VAT on (CIF + Import Duty)
const PVOC_FEE     = 300     // USD — Pre-Export Verification of Conformity (flat)
const CLEARING_FEE = 500     // USD — Clearing agent estimate

export async function POST(req: NextRequest) {
  const body = await req.json()
  const cif: number = Number(body.cif_value_usd ?? 0)
  const dutyPct: number = Number(body.import_duty_pct ?? 25)
  const hsCode: string | null = body.hs_code ?? null
  const regulatoryBody: string | null = body.regulatory_body ?? null

  if (!cif || cif <= 0) {
    return NextResponse.json({ error: 'cif_value_usd is required' }, { status: 400 })
  }

  const fxRate = await getKesRate()

  const importDuty = cif * (dutyPct / 100)
  const idf        = cif * IDF_RATE
  const rdl        = cif * RDL_RATE
  const vatBase    = cif + importDuty
  const vat        = vatBase * VAT_RATE
  const totalUSD   = cif + importDuty + idf + rdl + vat + PVOC_FEE + CLEARING_FEE

  function line(label: string, usd: number, rate?: string, isTotal = false) {
    return { label, rate: rate ?? null, usd: Math.round(usd * 100) / 100, kes: Math.round(usd * fxRate * 100) / 100, isTotal }
  }

  const lines = [
    line('CIF Value',           cif,          undefined),
    line('Import Duty',         importDuty,   `${dutyPct}% of CIF`),
    line('Import Declaration Fee (IDF)', idf, `${(IDF_RATE * 100).toFixed(1)}% of CIF`),
    line('Railway Dev. Levy (RDL)',     rdl,  `${(RDL_RATE * 100).toFixed(1)}% of CIF`),
    line('VAT',                 vat,          `${(VAT_RATE * 100).toFixed(0)}% of (CIF + Duty)`),
    line('PVoC Inspection Fee', PVOC_FEE,     'Flat fee (est.)'),
    line('Clearing Agent',      CLEARING_FEE, 'Estimate'),
    line('Total Landed Cost',   totalUSD,     undefined, true),
  ]

  return NextResponse.json({
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
