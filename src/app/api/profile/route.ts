import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext, upsertUserProfile } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { userId, orgId, role } = await getSessionContext(req)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data } = await supabase
    .from('user_profiles')
    .select('full_name, role, phone, whatsapp_number, organization_id')
    .eq('user_id', userId)
    .single()

  return NextResponse.json({
    full_name:        data?.full_name ?? '',
    role:             data?.role ?? role,
    phone:            data?.phone ?? '',
    whatsapp_number:  data?.whatsapp_number ?? '',
    organization_id:  data?.organization_id ?? orgId,
  })
}

export async function PATCH(req: NextRequest) {
  const { userId, orgId } = await getSessionContext(req)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()

  await upsertUserProfile({
    userId,
    organizationId:  body.organization_id ?? orgId,
    role:            body.role,
    fullName:        body.full_name,
    phone:           body.phone,
    whatsappNumber:  body.whatsapp_number,
  })

  return NextResponse.json({ ok: true })
}
