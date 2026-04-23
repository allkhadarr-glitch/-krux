import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORG_ID = '00000000-0000-0000-0000-000000000001'

async function nextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .like('reference_number', `KRUX-${year}-%`)
  const seq = ((count ?? 0) + 1).toString().padStart(4, '0')
  return `KRUX-${year}-${seq}`
}

function calcLandedCost(cif: number, dutyPct: number, kesRate: number) {
  const duty      = cif * (dutyPct / 100)
  const idf       = cif * 0.02
  const rdl       = cif * 0.015
  const pvoc      = 500
  const clearing  = 800
  const vatBase   = cif + duty
  const vat       = vatBase * 0.16
  const totalUSD  = cif + duty + idf + rdl + pvoc + clearing + vat
  return {
    import_duty_usd:        Math.round(duty * 100) / 100,
    idf_levy_usd:           Math.round(idf * 100) / 100,
    rdl_levy_usd:           Math.round(rdl * 100) / 100,
    pvoc_fee_usd:           pvoc,
    clearing_fee_usd:       clearing,
    vat_usd:                Math.round(vat * 100) / 100,
    total_landed_cost_usd:  Math.round(totalUSD * 100) / 100,
    total_landed_cost_kes:  Math.round(totalUSD * kesRate * 100) / 100,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    name, origin_port, origin_country, hs_code, product_description,
    cif_value_usd, pvoc_deadline, regulatory_body_id, storage_rate_per_day,
    risk_flag_status, import_duty_pct,
  } = body

  if (!name || !origin_port || !cif_value_usd) {
    return NextResponse.json({ error: 'name, origin_port, cif_value_usd are required' }, { status: 400 })
  }

  const reference_number = await nextReferenceNumber()
  const kesRate = await getKesRate()
  const costs = calcLandedCost(Number(cif_value_usd), Number(import_duty_pct ?? 25), kesRate)

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .insert({
      organization_id:      ORG_ID,
      reference_number,
      name,
      origin_port,
      origin_country:       origin_country || null,
      hs_code:              hs_code || null,
      product_description:  product_description || null,
      cif_value_usd:        Number(cif_value_usd),
      pvoc_deadline:        pvoc_deadline || null,
      regulatory_body_id:   regulatory_body_id || null,
      storage_rate_per_day: storage_rate_per_day ? Number(storage_rate_per_day) : null,
      risk_flag_status:     risk_flag_status ?? 'AMBER',
      remediation_status:   'OPEN',
      shipment_status:      'PENDING',
      composite_risk_score: risk_flag_status === 'RED' ? 8 : risk_flag_status === 'GREEN' ? 3 : 5,
      exchange_rate_used:   kesRate,
      destination_port:     'Mombasa',
      ...costs,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
