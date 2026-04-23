import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from '@/lib/timeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const {
    status,           // 'CLEARED' | 'DELAYED' | 'PENALIZED'
    delay_days,       // number | null
    penalty_amount_kes, // number | null
    notes,            // string | null
  } = body

  if (!['CLEARED', 'DELAYED', 'PENALIZED'].includes(status)) {
    return NextResponse.json({ error: 'status must be CLEARED, DELAYED, or PENALIZED' }, { status: 400 })
  }

  // Fetch shipment
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, name, organization_id, reference_number, cif_value_usd, pvoc_deadline, created_at')
    .eq('id', id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  // Summarise execution at closure time — this is the context snapshot
  const { data: actions } = await supabase
    .from('actions')
    .select('id, execution_status, priority, action_type, started_at')
    .eq('shipment_id', id)

  const allActions          = actions ?? []
  const actions_completed   = allActions.filter((a) => a.execution_status === 'DONE').length
  const actions_failed      = allActions.filter((a) => a.execution_status === 'FAILED').length
  const actions_pending     = allActions.filter((a) => a.execution_status === 'PENDING').length
  const critical_missed     = allActions.filter(
    (a) => a.priority === 'CRITICAL' && a.execution_status !== 'DONE'
  ).length

  const total_duration_days = shipment.created_at
    ? Math.ceil((Date.now() - new Date(shipment.created_at).getTime()) / 86400000)
    : null

  // Timing honesty: compute start-relative-to-deadline for every action that was actually started.
  // avg_days_before_deadline < 0 means actions were started after the deadline on average.
  // first_action_started_after_deadline = true means nothing was touched until it was already too late.
  const startedActions = allActions.filter((a) => a.started_at)
  let avg_days_before_deadline: number | null = null
  let first_action_started_after_deadline: boolean | null = null

  if (shipment.pvoc_deadline) {
    const deadlineMs = new Date(shipment.pvoc_deadline).getTime()
    if (startedActions.length > 0) {
      const daysBeforeDeadline = startedActions.map(
        (a) => (deadlineMs - new Date(a.started_at).getTime()) / 86400000
      )
      avg_days_before_deadline = parseFloat(
        (daysBeforeDeadline.reduce((s, d) => s + d, 0) / daysBeforeDeadline.length).toFixed(1)
      )
      const firstStartMs = Math.min(...startedActions.map((a) => new Date(a.started_at).getTime()))
      first_action_started_after_deadline = firstStartMs > deadlineMs
    } else {
      // Zero actions started = everything started too late; outcome-independent so correlation stays clean
      first_action_started_after_deadline = true
    }
  }

  // Update shipment status
  await supabase
    .from('shipments')
    .update({ remediation_status: 'CLOSED', updated_at: new Date().toISOString() })
    .eq('id', id)

  // Write the anchor event — full context snapshot
  await insertTimelineEvent(supabase, {
    shipment_id:     id,
    organization_id: shipment.organization_id,
    event_type:      'SHIPMENT_CLOSED',
    actor_type:      'USER',
    actor_label:     'Operations',
    confidence:      'USER',
    title:           `Shipment closed: ${status}`,
    detail:          notes ?? undefined,
    metadata: {
      status,
      delay_days:                          delay_days ?? 0,
      penalty_amount_kes:                  penalty_amount_kes ?? 0,
      total_duration_days,
      actions_completed,
      actions_failed,
      actions_pending,
      critical_actions_missed:             critical_missed,
      cif_value_usd:                       shipment.cif_value_usd,
      avg_days_before_deadline,
      first_action_started_after_deadline,
    },
  })

  return NextResponse.json({
    ok: true,
    closed: {
      shipment_id:       id,
      reference_number:  shipment.reference_number,
      status,
      actions_completed,
      actions_failed,
      critical_missed,
      total_duration_days,
    },
  })
}
