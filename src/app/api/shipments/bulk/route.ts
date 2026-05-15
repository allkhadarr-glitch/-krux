import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { getKesRate } from '@/lib/fx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const COUNTRY_TO_ISO: Record<string, string> = {
  'china': 'CN', 'people\'s republic of china': 'CN', 'prc': 'CN',
  'india': 'IN', 'republic of india': 'IN',
  'uae': 'AE', 'united arab emirates': 'AE', 'dubai': 'AE',
  'singapore': 'SG', 'usa': 'US', 'united states': 'US', 'united states of america': 'US',
  'uk': 'GB', 'united kingdom': 'GB', 'england': 'GB', 'great britain': 'GB',
  'germany': 'DE', 'deutschland': 'DE', 'netherlands': 'NL', 'holland': 'NL',
  'belgium': 'BE', 'japan': 'JP', 'south korea': 'KR', 'korea': 'KR',
  'pakistan': 'PK', 'bangladesh': 'BD', 'turkey': 'TR', 'türkiye': 'TR',
  'italy': 'IT', 'france': 'FR', 'south africa': 'ZA', 'tanzania': 'TZ', 'uganda': 'UG',
  'sri lanka': 'LK', 'malaysia': 'MY', 'indonesia': 'ID', 'thailand': 'TH',
  'vietnam': 'VN', 'ethiopia': 'ET', 'nigeria': 'NG', 'ghana': 'GH',
}

function toISO(raw: string | null | undefined): string | null {
  if (!raw) return null
  const trimmed = raw.trim()
  if (trimmed.length === 2) return trimmed.toUpperCase()
  return (COUNTRY_TO_ISO[trimmed.toLowerCase()] ?? trimmed) || null
}

function calcLandedCost(cif: number, dutyPct: number, kesRate: number) {
  const duty     = cif * (dutyPct / 100)
  const idf      = cif * 0.02
  const rdl      = cif * 0.015
  const pvoc     = 500
  const clearing = 800
  const vat      = (cif + duty) * 0.16
  const total    = cif + duty + idf + rdl + pvoc + clearing + vat
  return {
    import_duty_usd:       Math.round(duty * 100) / 100,
    idf_levy_usd:          Math.round(idf * 100) / 100,
    rdl_levy_usd:          Math.round(rdl * 100) / 100,
    pvoc_fee_usd:          pvoc,
    clearing_fee_usd:      clearing,
    vat_usd:               Math.round(vat * 100) / 100,
    total_landed_cost_usd: Math.round(total * 100) / 100,
    total_landed_cost_kes: Math.round(total * kesRate * 100) / 100,
  }
}

async function nextRefBatch(count: number): Promise<string[]> {
  const year = new Date().getFullYear()
  const { count: existing } = await supabaseAdmin
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .like('reference_number', `KRUX-${year}-%`)
  const base = (existing ?? 0) + 1
  return Array.from({ length: count }, (_, i) =>
    `KRUX-${year}-${(base + i).toString().padStart(4, '0')}`
  )
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()
  const { rows } = body as { rows: Record<string, string>[] }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 })
  }

  const kesRate = await getKesRate()
  const refs    = await nextRefBatch(rows.length)

  const VALID_STAGES = new Set(['PRE_SHIPMENT', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'CLEARED'])

  const inserts = rows.map((r, i) => {
    const cif   = Number(r.cif_value_usd || 0)
    const duty  = Number(r.import_duty_pct || 25)
    const stage = VALID_STAGES.has(r.shipment_stage) ? r.shipment_stage : 'CLEARED'
    const costs = calcLandedCost(cif, duty, kesRate)
    return {
      organization_id:      orgId,
      reference_number:     refs[i],
      name:                 r.name,
      origin_port:          r.origin_port || null,
      origin_country:       toISO(r.origin_country),
      hs_code:              r.hs_code || null,
      product_description:  r.product_description || null,
      cif_value_usd:        cif,
      pvoc_deadline:        r.pvoc_deadline || null,
      storage_rate_per_day: r.storage_rate_per_day ? Number(r.storage_rate_per_day) : null,
      risk_flag_status:     'AMBER',
      remediation_status:   stage === 'CLEARED' ? 'CLOSED' : 'OPEN',
      shipment_status:      'PENDING',
      composite_risk_score: 5,
      exchange_rate_used:   kesRate,
      destination_port:     'Mombasa',
      vessel_name:          r.vessel_name || null,
      shipping_line:        r.shipping_line || null,
      bl_number:            r.bl_number || null,
      eta:                  r.eta || null,
      shipment_stage:       stage,
      weight_kg:            r.weight_kg ? Number(r.weight_kg) : null,
      client_name:          r.client_name || null,
      clearance_date:       stage === 'CLEARED' && r.clearance_date ? r.clearance_date : null,
      ...costs,
    }
  })

  // Process in sub-batches of 100 to stay within Supabase limits
  const BATCH = 100
  let inserted = 0
  const errors: string[] = []

  for (let i = 0; i < inserts.length; i += BATCH) {
    const chunk = inserts.slice(i, i + BATCH)
    const { data, error } = await supabaseAdmin
      .from('shipments')
      .insert(chunk)
      .select('id')
    if (error) {
      errors.push(`Rows ${i + 1}–${i + chunk.length}: ${error.message}`)
    } else {
      inserted += data?.length ?? 0
    }
  }

  return NextResponse.json({
    ok:       true,
    inserted,
    failed:   rows.length - inserted,
    total:    rows.length,
    errors:   errors.length ? errors : undefined,
  })
}
