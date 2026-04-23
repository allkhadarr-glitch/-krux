import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  const { data: members } = await supabase
    .from('user_profiles')
    .select('user_id, full_name, role, phone, is_active, updated_at')
    .eq('organization_id', orgId)
    .eq('is_active', true)
    .order('updated_at', { ascending: false })

  const { data: invites } = await supabase
    .from('org_invites')
    .select('id, email, role, created_at, expires_at, accepted_at')
    .eq('organization_id', orgId)
    .is('accepted_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  return NextResponse.json({ members: members ?? [], invites: invites ?? [] })
}
