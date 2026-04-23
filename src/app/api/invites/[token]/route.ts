import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext, upsertUserProfile } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: invite } = await supabase
    .from('org_invites')
    .select('id, email, role, organization_id, expires_at, accepted_at')
    .eq('token', token)
    .single()

  if (!invite) return NextResponse.json({ error: 'Invalid invite' }, { status: 404 })
  if (invite.accepted_at) return NextResponse.json({ error: 'Invite already used' }, { status: 410 })
  if (new Date(invite.expires_at) < new Date()) return NextResponse.json({ error: 'Invite expired' }, { status: 410 })

  return NextResponse.json({ email: invite.email, role: invite.role })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const { userId } = await getSessionContext(req)

  if (!userId) return NextResponse.json({ error: 'Must be logged in' }, { status: 401 })

  const { data: invite } = await supabase
    .from('org_invites')
    .select('*')
    .eq('token', token)
    .single()

  if (!invite || invite.accepted_at || new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Invalid or expired invite' }, { status: 410 })
  }

  await upsertUserProfile({
    userId,
    organizationId: invite.organization_id,
    role:           invite.role,
  })

  await supabase
    .from('org_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return NextResponse.json({ ok: true, organization_id: invite.organization_id, role: invite.role })
}
