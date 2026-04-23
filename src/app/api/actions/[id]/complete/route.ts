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
  const body = await req.json().catch(() => ({}))
  const note: string | undefined = body.note

  const { data: action, error: fetchErr } = await supabase
    .from('actions')
    .select('id, shipment_id, organization_id, title, action_type, started_at')
    .eq('id', id)
    .single()

  if (fetchErr || !action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 })
  }

  const now = new Date().toISOString()
  const durationMinutes = action.started_at
    ? Math.round((Date.now() - new Date(action.started_at).getTime()) / 60000)
    : null

  const { data, error } = await supabase
    .from('actions')
    .update({
      status:            'COMPLETED',
      execution_status:  'DONE',
      completed_at:      now,
      completion_signal: 'EXPLICIT',
      execution_notes:   note ?? null,
      updated_at:        now,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (action.shipment_id) {
    await insertTimelineEvent(supabase, {
      shipment_id:     action.shipment_id,
      action_id:       id,
      organization_id: action.organization_id,
      event_type:      'ACTION_COMPLETED',
      actor_type:      'USER',
      actor_label:     'Operations',
      title:           `Completed: ${action.title}`,
      detail:          note,
      metadata: {
        action_type:      action.action_type,
        duration_minutes: durationMinutes,
      },
    })
  }

  return NextResponse.json(data)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()
  const allowed = ['status', 'priority', 'assigned_to', 'due_date', 'description', 'execution_notes']
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  for (const key of allowed) {
    if (key in body) updates[key] = body[key]
  }

  const { data, error } = await supabase
    .from('actions')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
