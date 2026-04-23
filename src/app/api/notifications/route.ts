import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const unread = (data ?? []).filter((n) => !n.read).length
  return NextResponse.json({ notifications: data ?? [], unread })
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const { data, error } = await supabase
    .from('notifications')
    .insert({
      organization_id: orgId,
      title:           body.title,
      body:            body.body,
      type:            body.type ?? 'INFO',
      action_url:      body.action_url ?? null,
      metadata:        body.metadata ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, notification: data })
}
