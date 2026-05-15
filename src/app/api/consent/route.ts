import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const VALID_TIERS = new Set(['aggregate', 'entity', 'pool'])

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const { data } = await admin
    .from('organizations')
    .select('data_consent_tier')
    .eq('id', orgId)
    .maybeSingle()
  return NextResponse.json({ tier: data?.data_consent_tier ?? 'aggregate' })
}

export async function PATCH(req: NextRequest) {
  const { orgId, userId } = await getSessionContext(req)
  const { tier } = await req.json()

  if (!VALID_TIERS.has(tier)) {
    return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
  }

  const { error } = await admin
    .from('organizations')
    .update({
      data_consent_tier: tier,
      data_consent_at:   new Date().toISOString(),
      data_consent_by:   userId,
    })
    .eq('id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, tier })
}
