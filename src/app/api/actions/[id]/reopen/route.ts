import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from '@/lib/timeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: action, error: fetchErr } = await supabase
    .from('actions')
    .select('id, shipment_id, organization_id, title, action_type')
    .eq('id', id)
    .single()

  if (fetchErr || !action) {
    return NextResponse.json({ error: 'Action not found' }, { status: 404 })
  }

  const { data, error } = await supabase
    .from('actions')
    .update({
      execution_status: 'IN_PROGRESS',
      status:           'IN_PROGRESS',
      completed_at:     null,
      updated_at:       new Date().toISOString(),
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
      event_type:      'ACTION_STARTED',
      actor_type:      'USER',
      actor_label:     'Operations',
      confidence:      'USER',
      title:           `Reopened: ${action.title}`,
      metadata:        { action_type: action.action_type, reason: 'undo_completion' },
    })
  }

  return NextResponse.json(data)
}
