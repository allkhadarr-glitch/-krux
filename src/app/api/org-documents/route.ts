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
    .from('org_documents')
    .select('*')
    .eq('organization_id', orgId)
    .neq('status', 'ARCHIVED')
    .order('expiry_date')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()

  const { data, error } = await supabase
    .from('org_documents')
    .insert({
      organization_id:  orgId,
      document_type:    body.document_type,
      issuer:           body.issuer ?? null,
      reference_number: body.reference_number ?? null,
      issue_date:       body.issue_date ?? null,
      expiry_date:      body.expiry_date,
      status:           'ACTIVE',
      notes:            body.notes ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, document: data })
}
