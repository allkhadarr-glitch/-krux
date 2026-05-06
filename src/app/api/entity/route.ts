import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) return NextResponse.json({ error: 'No org' }, { status: 404 })

  const { data: entity } = await supabaseAdmin
    .from('krux_entities')
    .select('krux_id, entity_type, compliance_score, compliance_tier, total_shipments, avg_clearance_days, is_verified')
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (!entity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json(entity)
}
