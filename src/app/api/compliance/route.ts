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
    .from('compliance_obligations')
    .select('*')
    .eq('organization_id', orgId)
    .neq('status', 'ARCHIVED')
    .order('due_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const { data, error } = await supabase
    .from('compliance_obligations')
    .insert({
      organization_id:   orgId,
      title:             body.title,
      regulator:         body.regulator ?? null,
      obligation_type:   body.obligation_type ?? 'RECURRING',
      due_date:          body.due_date,
      recurrence_days:   body.recurrence_days ?? null,
      status:            'OPEN',
      notes:             body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, obligation: data })
}
