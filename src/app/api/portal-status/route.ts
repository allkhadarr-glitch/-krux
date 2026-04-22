import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const shipmentId = req.nextUrl.searchParams.get('shipmentId')
  if (!shipmentId) return NextResponse.json([])

  const { data, error } = await supabaseAdmin
    .from('shipment_portals')
    .select('*')
    .eq('shipment_id', shipmentId)
    .order('regulator')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  const { shipmentId, regulator, referenceNumber, status } = await req.json()
  if (!shipmentId || !regulator) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('shipment_portals')
    .upsert(
      { shipment_id: shipmentId, regulator, reference_number: referenceNumber ?? null, status },
      { onConflict: 'shipment_id,regulator' }
    )
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, portal: data })
}
