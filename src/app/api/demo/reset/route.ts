import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function resetDemo() {
  const email = process.env.DEMO_USER_EMAIL
  if (!email) return { error: 'DEMO_USER_EMAIL not set' }

  // Find the demo user's org_id via user_profiles
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('organization_id, user_id')
    .eq('email', email)
    .maybeSingle()

  // Try auth.users if user_profiles doesn't have email column
  let orgId = profile?.organization_id
  if (!orgId) {
    const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
    const authUser = usersData?.users?.find((u) => u.email === email)
    if (!authUser) return { error: 'Demo user not found in Supabase' }
    const { data: p } = await supabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', authUser.id)
      .single()
    orgId = p?.organization_id
  }

  if (!orgId) return { error: 'Demo org not found' }

  // ── Delete all demo org data (order matters for FK constraints) ──

  await supabase.from('notifications').delete().eq('organization_id', orgId)
  await supabase.from('alert_logs').delete().eq('organization_id', orgId)
  await supabase.from('event_logs').delete().eq('organization_id', orgId)
  await supabase.from('events').delete().eq('organization_id', orgId)
  await supabase.from('action_outcomes').delete().eq('organization_id', orgId)
  await supabase.from('suppressed_actions').delete().eq('organization_id', orgId)
  await supabase.from('actions').delete().eq('organization_id', orgId)
  await supabase.from('shipment_risk').delete().eq('organization_id', orgId)
  await supabase.from('shipment_portals').delete().eq('organization_id', orgId)
  await supabase.from('shipment_timeline').delete().eq('organization_id', orgId)
  await supabase.from('shipment_documents').delete().eq('organization_id', orgId)
  await supabase.from('shipments').delete().eq('organization_id', orgId)
  await supabase.from('manufacturer_licenses').delete().eq('organization_id', orgId)
  await supabase.from('factory_audits').delete().eq('organization_id', orgId)
  await supabase.from('manufacturers').delete().eq('organization_id', orgId)
  await supabase.from('purchase_orders').delete().eq('organization_id', orgId)
  await supabase.from('compliance_records').delete().eq('organization_id', orgId)

  // ── Reseed via the existing seed-demo endpoint ──
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'
  const seedRes = await fetch(`${base}/api/seed-demo`, {
    method:  'POST',
    headers: {
      'Content-Type':   'application/json',
      'x-demo-org-id':  orgId,
      'x-cron-secret':  process.env.CRON_SECRET ?? '',
      'x-force-reseed': 'true',
    },
  })

  const seedData = await seedRes.json()
  return { ok: true, org_id: orgId, seed: seedData }
}

// ─── GET — Vercel Cron (runs at 02:00 UTC daily) ─────────────

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await resetDemo()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}

// ─── POST — manual trigger (dev/admin only) ──────────────────

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  if (body.secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await resetDemo()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}
