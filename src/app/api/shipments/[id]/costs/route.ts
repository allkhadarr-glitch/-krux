import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data, error } = await supabase
    .from('shipment_costs')
    .select('*')
    .eq('shipment_id', id)
    .order('recorded_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ costs: data ?? [] })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { cost_type, amount_kes, note } = await req.json()

  if (!cost_type || !amount_kes) {
    return NextResponse.json({ error: 'cost_type and amount_kes required' }, { status: 400 })
  }

  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, organization_id')
    .eq('id', id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('shipment_costs')
    .insert({
      shipment_id:     id,
      organization_id: shipment.organization_id,
      cost_type,
      amount_kes:      Number(amount_kes),
      note:            note ?? null,
      recorded_at:     new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, cost: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { cost_id } = await req.json()

  const { error } = await supabase
    .from('shipment_costs')
    .delete()
    .eq('id', cost_id)
    .eq('shipment_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
