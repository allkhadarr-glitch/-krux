import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const since = new Date(Date.now() - 90 * 86400_000).toISOString()

  // Closed shipments in last 90 days (via SHIPMENT_CLOSED events)
  const { data: events } = await supabase
    .from('execution_timeline')
    .select('metadata, created_at')
    .eq('event_type', 'SHIPMENT_CLOSED')
    .eq('organization_id', orgId)
    .gte('created_at', since)
    .order('created_at', { ascending: false })

  const rows = (events ?? []).map((e) => e.metadata as Record<string, any>)
  const total = rows.length

  const byOutcome = rows.reduce<Record<string, number>>((acc, r) => {
    const s = r.status ?? 'UNKNOWN'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  const delayed    = byOutcome['DELAYED']   ?? 0
  const penalized  = byOutcome['PENALIZED'] ?? 0
  const cleared    = byOutcome['CLEARED']   ?? 0
  const delay_rate = total > 0 ? parseFloat(((delayed + penalized) / total * 100).toFixed(1)) : 0

  const avgDuration = total > 0
    ? Math.round(rows.reduce((s, r) => s + (r.total_duration_days ?? 0), 0) / total)
    : null

  const totalPenaltyKes  = rows.reduce((s, r) => s + (r.penalty_amount_kes ?? 0), 0)
  const totalDelayDays   = rows.reduce((s, r) => s + (r.delay_days ?? 0), 0)
  const totalActualCosts = rows.reduce((s, r) => s + (r.actual_total_cost_kes ?? 0), 0)
  const criticalMissed   = rows.reduce((s, r) => s + (r.critical_actions_missed ?? 0), 0)

  // Regime breakdown
  const regimeA = rows.filter((r) => (r.actions_started ?? 0) > 0).length
  const regimeB = rows.filter((r) => (r.actions_started ?? 0) === 0).length

  // Active open shipments
  const { count: activeCount } = await supabase
    .from('shipments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')

  // Actions in last 90 days
  const { data: actionStats } = await supabase
    .from('actions')
    .select('execution_status, priority')
    .eq('organization_id', orgId)

  const allActions = actionStats ?? []
  const actionsByStatus = allActions.reduce<Record<string, number>>((acc, a) => {
    const s = a.execution_status ?? 'PENDING'
    acc[s] = (acc[s] ?? 0) + 1
    return acc
  }, {})

  // Cost breakdown by type across all closed shipments
  const costByType = rows.reduce<Record<string, number>>((acc, r) => {
    const breakdown = r.actual_cost_breakdown as Record<string, number> | null
    if (!breakdown) return acc
    for (const [k, v] of Object.entries(breakdown)) {
      acc[k] = (acc[k] ?? 0) + Number(v)
    }
    return acc
  }, {})

  return NextResponse.json({
    period_days: 90,
    closed: {
      total, cleared, delayed, penalized, delay_rate,
      avg_duration_days: avgDuration,
      total_penalty_kes: totalPenaltyKes,
      total_delay_days:  totalDelayDays,
      total_actual_cost_kes: totalActualCosts,
      critical_actions_missed: criticalMissed,
      regime_a: regimeA,
      regime_b: regimeB,
    },
    active:   { count: activeCount ?? 0 },
    actions:  { by_status: actionsByStatus, total: allActions.length },
    cost_breakdown: costByType,
  })
}
