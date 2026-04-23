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
    .from('org_contacts')
    .select('*')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const { data, error } = await supabase
    .from('org_contacts')
    .insert({
      organization_id:  orgId,
      name:             body.name,
      contact_type:     body.contact_type ?? 'CLEARING_AGENT',
      phone:            body.phone ?? null,
      email:            body.email ?? null,
      whatsapp:         body.whatsapp ?? null,
      ports:            body.ports ?? [],
      specializations:  body.specializations ?? [],
      notes:            body.notes ?? null,
      is_active:        true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, contact: data })
}
