import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { getKesRate } from '@/lib/fx'
import { getWindowStatus, getRegulator } from '@/lib/regulatory-intelligence'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [shipmentsRes, actionsRes, bodiesRes, kesRate] = await Promise.all([
    supabaseAdmin
      .from('shipments')
      .select('id, name, reference_number, pvoc_deadline, eta, risk_flag_status, remediation_status, shipment_stage, regulatory_body_id, cif_value_usd, storage_rate_per_day, composite_risk_score')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
      .neq('remediation_status', 'CLOSED'),
    supabaseAdmin
      .from('actions')
      .select('id, title, action_type, priority, status, shipment_id, created_at')
      .eq('organization_id', orgId)
      .in('status', ['OPEN', 'IN_PROGRESS'])
      .order('priority', { ascending: false }),
    supabaseAdmin.from('regulatory_bodies').select('id, code'),
    getKesRate(),
  ])

  const shipments = shipmentsRes.data ?? []
  const actions   = actionsRes.data   ?? []
  const bodies    = bodiesRes.data    ?? []

  const bodyById: Record<string, string> = Object.fromEntries(
    bodies.map((b: any) => [b.id, b.code])
  )

  const hitList: Array<{
    id:        string
    type:      'WINDOW' | 'ACTION' | 'IMPOSSIBLE'
    priority:  'CRITICAL' | 'URGENT' | 'WATCH'
    title:     string
    detail:    string
    action:    string
    shipment_id: string | null
    ref:       string | null
    kes_at_risk: number
  }> = []

  // ── Shipment deadline items ──────────────────────────────────
  for (const s of shipments) {
    const regCode    = bodyById[s.regulatory_body_id] ?? null
    const regProfile = regCode ? getRegulator('KE', regCode) ?? null : null

    const deadline   = s.pvoc_deadline ?? s.eta
    const days       = deadline ? daysUntil(deadline) : null
    const storageKes = Math.round((s.storage_rate_per_day ?? 50) * kesRate)
    const kesAtRisk  = days != null ? storageKes * Math.max(7, Math.abs(days)) : 0

    // Impossible window check
    if (regProfile && deadline) {
      const ws = getWindowStatus({ pvoc_deadline: s.pvoc_deadline, eta: s.eta }, regProfile)
      if (ws?.status === 'IMPOSSIBLE') {
        hitList.push({
          id:          `impossible-${s.id}`,
          type:        'IMPOSSIBLE',
          priority:    'CRITICAL',
          title:       s.name,
          detail:      `${regCode} needs ${regProfile.sla_actual_days}d — only ${days}d until deadline. Window is closed.`,
          action:      `Escalate to ${regCode} immediately or request deadline extension`,
          shipment_id: s.id,
          ref:         s.reference_number,
          kes_at_risk: kesAtRisk,
        })
        continue
      }
    }

    if (days == null) continue

    if (days <= 3) {
      hitList.push({
        id:          `deadline-${s.id}`,
        type:        'WINDOW',
        priority:    'CRITICAL',
        title:       s.name,
        detail:      `${regCode ?? '—'} deadline in ${days} day${days !== 1 ? 's' : ''}`,
        action:      `Submit ${regCode ?? 'regulator'} portal today — KES ${kesAtRisk.toLocaleString()} at risk`,
        shipment_id: s.id,
        ref:         s.reference_number,
        kes_at_risk: kesAtRisk,
      })
    } else if (days <= 7) {
      hitList.push({
        id:          `deadline-${s.id}`,
        type:        'WINDOW',
        priority:    'URGENT',
        title:       s.name,
        detail:      `${regCode ?? '—'} deadline in ${days} days`,
        action:      `Prepare portal submission — ${regProfile?.documents.filter(d => d.mandatory).length ?? 0} mandatory documents required`,
        shipment_id: s.id,
        ref:         s.reference_number,
        kes_at_risk: kesAtRisk,
      })
    }
  }

  // ── Pending action items ────────────────────────────────────
  const shipmentMap: Record<string, any> = Object.fromEntries(shipments.map(s => [s.id, s]))

  for (const a of actions) {
    const s = shipmentMap[a.shipment_id]
    if (!s) continue

    const priority: 'CRITICAL' | 'URGENT' | 'WATCH' =
      a.priority === 'CRITICAL' ? 'CRITICAL' :
      a.priority === 'HIGH'     ? 'URGENT' : 'WATCH'

    // Don't double-add if already in hit list as a window item
    const alreadyListed = hitList.some(i => i.shipment_id === a.shipment_id && i.type !== 'ACTION')

    hitList.push({
      id:          `action-${a.id}`,
      type:        'ACTION',
      priority:    alreadyListed && priority !== 'CRITICAL' ? 'WATCH' : priority,
      title:       a.title,
      detail:      `${s.name} · ${a.status === 'IN_PROGRESS' ? 'In progress' : 'Waiting'}`,
      action:      `Mark complete when done`,
      shipment_id: a.shipment_id,
      ref:         s.reference_number,
      kes_at_risk: 0,
    })
  }

  // Sort: CRITICAL → URGENT → WATCH, then by kes_at_risk desc
  const order = { CRITICAL: 0, URGENT: 1, WATCH: 2 }
  hitList.sort((a, b) =>
    (order[a.priority] - order[b.priority]) ||
    (b.kes_at_risk - a.kes_at_risk)
  )

  const totalKes = hitList.reduce((s, i) => s + i.kes_at_risk, 0)
  const critical = hitList.filter(i => i.priority === 'CRITICAL').length

  return NextResponse.json({
    items:      hitList,
    total:      hitList.length,
    critical,
    total_kes:  totalKes,
    date:       new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' }),
  })
}
