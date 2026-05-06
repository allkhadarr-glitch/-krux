import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const {
    examined,
    examination_outcome,
    agent_name,
    agent_license,
    shipping_line,
    vessel,
    dwell_days,
    duty_applied_kes,
    classification_dispute,
    disputed_hs_code,
    regulator_code,
    notes,
  } = body

  // Confirm shipment belongs to this org
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, organization_id')
    .eq('id', id)
    .eq('organization_id', orgId)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('clearance_outcomes')
    .insert({
      shipment_id:           id,
      organization_id:       orgId,
      examined:              !!examined,
      examination_outcome:   examination_outcome || null,
      agent_name:            agent_name || null,
      agent_license:         agent_license || null,
      shipping_line:         shipping_line || null,
      vessel:                vessel || null,
      dwell_days:            dwell_days ? Number(dwell_days) : null,
      duty_applied_kes:      duty_applied_kes ? Number(duty_applied_kes) : null,
      classification_dispute: !!classification_dispute,
      disputed_hs_code:      disputed_hs_code || null,
      regulator_code:        regulator_code || null,
      notes:                 notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log to shipment_events for the intelligence archive
  await supabase.from('shipment_events').insert({
    shipment_id:     id,
    organization_id: orgId,
    event_type:      'CLEARANCE_DEBRIEF',
    actor_type:      'USER',
    metadata: {
      examined,
      examination_outcome,
      shipping_line,
      dwell_days,
      classification_dispute,
      regulator_code,
    },
  })

  return NextResponse.json({ ok: true, id: data.id })
}
