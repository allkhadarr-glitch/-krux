import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from '@/lib/timeline'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { assignee_name } = await req.json()

  const { data: action } = await supabase
    .from('actions')
    .select('id, title, shipment_id, organization_id, assignee_name')
    .eq('id', id)
    .single()

  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  await supabase
    .from('actions')
    .update({ assignee_name: assignee_name ?? null, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (action.shipment_id && assignee_name) {
    await insertTimelineEvent(supabase, {
      shipment_id:     action.shipment_id,
      action_id:       action.id,
      organization_id: action.organization_id,
      event_type:      'ACTION_ASSIGNED',
      actor_type:      'USER',
      actor_label:     'Operations',
      confidence:      'USER',
      title:           `Assigned: ${action.title}`,
      detail:          `→ ${assignee_name}`,
      metadata:        { assignee_name, previous_assignee: action.assignee_name ?? null },
    })
  }

  return NextResponse.json({ ok: true, assignee_name: assignee_name ?? null })
}
