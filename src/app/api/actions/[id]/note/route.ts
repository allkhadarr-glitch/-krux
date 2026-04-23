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
  const { text, author } = await req.json()

  if (!text?.trim()) return NextResponse.json({ error: 'text required' }, { status: 400 })

  const { data: action } = await supabase
    .from('actions')
    .select('id, title, shipment_id, organization_id')
    .eq('id', id)
    .single()

  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 })

  if (action.shipment_id) {
    await insertTimelineEvent(supabase, {
      shipment_id:     action.shipment_id,
      action_id:       action.id,
      organization_id: action.organization_id,
      event_type:      'ACTION_NOTE',
      actor_type:      'USER',
      actor_label:     author ?? 'Operations',
      confidence:      'USER',
      title:           `Note on: ${action.title}`,
      detail:          text.trim(),
      metadata:        { action_id: action.id },
    })
  }

  return NextResponse.json({ ok: true })
}
