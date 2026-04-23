import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from '@/lib/timeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date(); today.setHours(0, 0, 0, 0)

  // All orgs — cron scans across the entire platform
  const { data: actions } = await supabase
    .from('actions')
    .select(`
      id, title, action_type, priority, shipment_id, organization_id, execution_status,
      shipment:shipments!inner(pvoc_deadline, remediation_status, name)
    `)
    .in('status', ['OPEN', 'IN_PROGRESS'])
    .in('execution_status', ['PENDING', 'IN_PROGRESS'])
    .neq('execution_status', 'AT_RISK')
    .is('shipments.deleted_at', null)
    .neq('shipments.remediation_status', 'CLOSED')

  const atRiskIds: string[] = []

  for (const a of actions ?? []) {
    const shipment = (a as any).shipment
    if (!shipment?.pvoc_deadline) continue

    const daysToDeadline = Math.ceil(
      (new Date(shipment.pvoc_deadline).getTime() - today.getTime()) / 86400000
    )

    if (daysToDeadline > 3) continue

    atRiskIds.push(a.id)

    await supabase
      .from('actions')
      .update({ execution_status: 'AT_RISK', updated_at: new Date().toISOString() })
      .eq('id', a.id)

    if (a.shipment_id) {
      await insertTimelineEvent(supabase, {
        shipment_id:     a.shipment_id,
        action_id:       a.id,
        organization_id: a.organization_id,
        event_type:      'ACTION_AT_RISK',
        actor_type:      'SYSTEM',
        actor_label:     'Risk Monitor',
        confidence:      'SYSTEM',
        title:           `AT RISK: ${a.title}`,
        detail:          `Action not started with ${daysToDeadline}d to deadline`,
        metadata:        {
          action_type:      a.action_type,
          days_to_deadline: daysToDeadline,
          previous_status:  a.execution_status,
        },
      })
    }

    await supabase.from('notifications').insert({
      organization_id: a.organization_id,
      title:           `AT RISK: ${a.title}`,
      body:            `Action on "${(a as any).shipment?.name}" not started — ${daysToDeadline}d to deadline`,
      type:            'WARNING',
      action_url:      `/dashboard/actions`,
      metadata:        { action_id: a.id, shipment_id: a.shipment_id, days_to_deadline: daysToDeadline },
    })
  }

  return NextResponse.json({
    ok:         true,
    flagged:    atRiskIds.length,
    action_ids: atRiskIds,
    checked_at: new Date().toISOString(),
  })
}
