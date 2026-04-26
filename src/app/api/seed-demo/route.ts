import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { seedDemoData } from '@/lib/seed-demo-data'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const headerOrgId = req.headers.get('x-demo-org-id')
  const force       = req.headers.get('x-force-reseed') === 'true'

  if (headerOrgId) {
    // Header path: must be accompanied by valid CRON_SECRET
    const secret = req.headers.get('x-cron-secret')
    if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const orgId = headerOrgId ?? (await getSessionContext(req)).orgId

  if (!force) {
    // Only seed if org has no shipments yet (skip check when force flag set)
    const { data: existing } = await supabase
      .from('shipments')
      .select('id')
      .eq('organization_id', orgId)
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: false, reason: 'Org already has shipments' })
    }
  }

  const result = await seedDemoData(supabase, orgId)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 })

  return NextResponse.json({ ok: true, created: result.created })
}
