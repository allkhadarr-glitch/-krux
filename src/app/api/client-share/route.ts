import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST — create a share token for a client
export async function POST(req: NextRequest) {
  const { orgId, userId } = await getSessionContext(req)
  const { client_name, label, expires_days } = await req.json()

  if (!client_name?.trim()) {
    return NextResponse.json({ error: 'client_name required' }, { status: 400 })
  }

  const expires_at = expires_days
    ? new Date(Date.now() + expires_days * 86400000).toISOString()
    : null

  const { data, error } = await supabaseAdmin
    .from('client_share_tokens')
    .insert({ organization_id: orgId, client_name: client_name.trim(), label: label || null, created_by: userId, expires_at })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ token: data.token, url: `${process.env.NEXT_PUBLIC_APP_URL}/client/${data.token}` })
}

// GET — list all share tokens for the org
export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  const { data, error } = await supabaseAdmin
    .from('client_share_tokens')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
