import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyOwnership(shipmentId: string, orgId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('shipments')
    .select('id')
    .eq('id', shipmentId)
    .eq('organization_id', orgId)
    .single()
  return !!data
}

export async function GET(req: NextRequest) {
  const shipmentId = req.nextUrl.searchParams.get('shipmentId')
  if (!shipmentId) return NextResponse.json([])

  const { orgId } = await getSessionContext(req)
  if (!(await verifyOwnership(shipmentId, orgId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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

  const { orgId } = await getSessionContext(req)
  if (!(await verifyOwnership(shipmentId, orgId))) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

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
