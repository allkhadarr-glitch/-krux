import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from '@/lib/timeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const STAGE_ORDER = ['PRE_SHIPMENT', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'CLEARED']

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { stage } = await req.json()

  if (!STAGE_ORDER.includes(stage)) {
    return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
  }

  const { data: shipment } = await supabase
    .from('shipments')
    .select('organization_id, shipment_stage, name')
    .eq('id', id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await supabase
    .from('shipments')
    .update({ shipment_stage: stage, updated_at: new Date().toISOString() })
    .eq('id', id)

  await insertTimelineEvent(supabase, {
    shipment_id:     id,
    organization_id: shipment.organization_id,
    event_type:      'STATUS_CHANGED',
    actor_type:      'USER',
    actor_label:     'Operations',
    confidence:      'USER',
    title:           `Stage: ${(shipment.shipment_stage ?? 'PRE_SHIPMENT').replace(/_/g, ' ')} → ${stage.replace(/_/g, ' ')}`,
    detail:          `Shipment stage updated`,
    metadata:        { previous_stage: shipment.shipment_stage, new_stage: stage },
  })

  return NextResponse.json({ ok: true, stage })
}
