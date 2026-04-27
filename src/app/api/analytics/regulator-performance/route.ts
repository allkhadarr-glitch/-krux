import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Benchmark SLA days per regulator (official minimum)
const SLA_BENCHMARKS: Record<string, number> = {
  PPB:      45, KEBS:   14, KEPHIS: 7,
  PCPB:     21, EPRA:   14, NEMA:   30,
  KRA:       3, WHO_GMP: 30,
}

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  // Fetch all closed shipments with their regulatory body and dates
  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, regulatory_body_id, created_at, clearance_date, pvoc_deadline, remediation_status')
    .eq('organization_id', orgId)
    .eq('remediation_status', 'CLOSED')
    .not('clearance_date', 'is', null)
    .not('created_at', 'is', null)

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code')
  const bodyById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b]))

  // Also check globally (all orgs) for regulator performance signals
  const { data: allClosed } = await supabaseAdmin
    .from('shipments')
    .select('regulatory_body_id, created_at, clearance_date')
    .eq('remediation_status', 'CLOSED')
    .not('clearance_date', 'is', null)
    .not('created_at', 'is', null)
    .gte('created_at', new Date(Date.now() - 90 * 86400000).toISOString()) // last 90d

  // Group by regulator, calculate average processing time
  const regStats: Record<string, { times: number[]; recentTimes: number[] }> = {}

  for (const s of allClosed ?? []) {
    const regId = s.regulatory_body_id
    if (!regId || !bodyById[regId]) continue
    const code = bodyById[regId].code

    const created  = new Date(s.created_at).getTime()
    const cleared  = new Date(s.clearance_date).getTime()
    const days     = Math.ceil((cleared - created) / 86400000)
    if (days < 0 || days > 365) continue

    if (!regStats[code]) regStats[code] = { times: [], recentTimes: [] }
    regStats[code].times.push(days)

    // "Recent" = last 30 days
    if (new Date(s.created_at) >= new Date(Date.now() - 30 * 86400000)) {
      regStats[code].recentTimes.push(days)
    }
  }

  const performance = Object.entries(regStats).map(([code, { times, recentTimes }]) => {
    const avg    = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    const recent = recentTimes.length
      ? Math.round(recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length)
      : null
    const sla = SLA_BENCHMARKS[code] ?? null

    let warning: string | null = null
    if (recent && sla && recent > sla * 1.5) {
      warning = `${code} running ${recent}d avg this month — ${Math.round((recent / sla - 1) * 100)}% over SLA. Flag shipments early.`
    } else if (recent && avg && recent > avg * 1.3) {
      warning = `${code} slower than usual this month (${recent}d vs ${avg}d avg). Submit applications early.`
    }

    return { code, avg_days: avg, recent_avg_days: recent, sla_days: sla, sample_size: times.length, warning }
  }).sort((a, b) => a.code.localeCompare(b.code))

  // Get active shipments where SLA may be impossible
  const { data: activeShipments } = await supabaseAdmin
    .from('shipments')
    .select('id, name, regulatory_body_id, pvoc_deadline, remediation_status')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')
    .not('pvoc_deadline', 'is', null)

  const slaWarnings: { name: string; reg: string; days_remaining: number; sla_required: number }[] = []
  for (const s of activeShipments ?? []) {
    const code = bodyById[s.regulatory_body_id]?.code
    if (!code) continue
    const sla  = SLA_BENCHMARKS[code]
    if (!sla) continue
    const days = Math.ceil((new Date(s.pvoc_deadline).getTime() - Date.now()) / 86400000)
    if (days < sla) {
      slaWarnings.push({ name: s.name, reg: code, days_remaining: days, sla_required: sla })
    }
  }

  return NextResponse.json({ performance, sla_warnings: slaWarnings, generated_at: new Date().toISOString() })
}
