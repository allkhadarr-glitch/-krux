import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const { data, error } = await supabase
    .from('purchase_orders')
    .select(`
      *,
      manufacturer:manufacturers(id, company_name, overall_risk, reliability_score),
      milestones:po_milestones(*)
    `)
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const { data, error } = await supabase
    .from('purchase_orders')
    .insert({
      organization_id:       orgId,
      manufacturer_id:       body.manufacturer_id,
      po_number:             body.po_number,
      product_name:          body.product_name,
      status:                'CONFIRMED',
      po_value_usd:          body.po_value_usd,
      advance_pct:           body.advance_pct ?? 30,
      advance_paid_usd:      body.advance_paid_usd ?? null,
      order_date:            body.order_date,
      expected_delivery_date: body.expected_delivery_date ?? null,
      incoterms:             body.incoterms ?? 'FOB',
      has_priority_clause:   body.has_priority_clause ?? false,
      has_penalty_clause:    body.has_penalty_clause ?? false,
      penalty_per_day_usd:   body.penalty_per_day_usd ?? null,
      has_escrow:            body.has_escrow ?? false,
      manufacturer_risk_flag: body.manufacturer_risk_flag ?? 'AMBER',
      quantity:              body.quantity ?? null,
      unit:                  body.unit ?? null,
      notes:                 body.notes ?? null,
    })
    .select(`*, manufacturer:manufacturers(id, company_name, overall_risk)`)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
