import { SupabaseClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from './timeline'

const ORG_ID = '00000000-0000-0000-0000-000000000001'

// ─── Risk Calculation ────────────────────────────────────────
// Score: 0–10. Three factors, none dominates.
//
// timeFactor:  exponential urgency. 14d = 0.1, 7d = 0.5, 3d = 0.9, 0d = 1.0
// moneyFactor: log-normalized. $1K = 0.2, $10K = 0.4, $100K = 0.6, $1M = 0.8
// probFactor:  compound delay probability across pending portals, capped at 1

export function computeRiskScore({
  daysToDeadline,
  cifValueUsd,
  delayProbability,
}: {
  daysToDeadline:   number
  cifValueUsd:      number
  delayProbability: number
}): number {
  const d = Math.max(0, daysToDeadline)
  const timeFactor  = d === 0 ? 1 : Math.exp(-d / 7)                         // 0–1, exponential decay
  const moneyFactor = Math.min(1, Math.log10(Math.max(cifValueUsd, 1)) / 6)  // 0–1, log10(1M) = 6
  const probFactor  = Math.min(1, delayProbability)                           // 0–1

  const raw = Math.round(timeFactor * (0.4 + 0.6 * moneyFactor) * (0.3 + 0.7 * probFactor) * 100) / 10

  // Regulatory deadlines are binary — proximity is an absolute override, not a weighted factor
  if (d <= 0) return Math.max(raw, 9.5)
  if (d <= 3) return Math.max(raw, 7.5)
  if (d <= 7) return Math.max(raw, 4.0)
  return raw
}

export function getPriorityLevel(score: number): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (score >= 7) return 'CRITICAL'
  if (score >= 4) return 'HIGH'
  if (score >= 1.5) return 'MEDIUM'
  return 'LOW'
}

// ─── Update Risk for a Single Shipment ───────────────────────

export async function updateShipmentRisk(
  shipmentId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, organization_id, cif_value_usd, pvoc_deadline, regulatory_body_id')
    .eq('id', shipmentId)
    .single()

  if (!shipment?.pvoc_deadline) return

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToDeadline = Math.ceil(
    (new Date(shipment.pvoc_deadline).getTime() - today.getTime()) / 86400000
  )

  const { data: portals } = await supabase
    .from('shipment_portals')
    .select('regulator, status')
    .eq('shipment_id', shipmentId)

  // Compound delay probability — joint probability across pending portals
  // P(at least one delay) = 1 - P(no delays) = 1 - Π(1 - p_i)
  let noDelayProb = 1
  const pendingPortals: string[] = []

  for (const p of portals ?? []) {
    if (p.status === 'APPROVED') continue
    const { data: profile } = await supabase
      .from('regulator_delay_profiles')
      .select('delay_probability')
      .eq('regulator', p.regulator)
      .single()
    const prob = profile?.delay_probability ?? 0.1
    noDelayProb *= (1 - prob)
    pendingPortals.push(p.regulator)
  }

  const delayProbability = 1 - noDelayProb
  const score = computeRiskScore({
    daysToDeadline,
    cifValueUsd: shipment.cif_value_usd ?? 0,
    delayProbability,
  })
  const priority = getPriorityLevel(score)

  // Build human-readable risk drivers
  const drivers: string[] = []
  if (daysToDeadline <= 3)  drivers.push(`Deadline in ${daysToDeadline} day${daysToDeadline !== 1 ? 's' : ''}`)
  else if (daysToDeadline <= 7) drivers.push(`${daysToDeadline} days to PVoC deadline`)
  if (pendingPortals.length > 0) drivers.push(`${pendingPortals.join(', ')} pending clearance`)
  if (shipment.cif_value_usd >= 50000) drivers.push(`High-value shipment (USD ${shipment.cif_value_usd.toLocaleString()})`)
  if (delayProbability > 0.4) drivers.push(`${Math.round(delayProbability * 100)}% compound delay probability`)

  await supabase.from('shipment_risk').upsert({
    shipment_id:        shipmentId,
    organization_id:    shipment.organization_id,
    days_to_deadline:   daysToDeadline,
    cif_value_usd:      shipment.cif_value_usd,
    delay_probability:  Math.round(delayProbability * 1000) / 1000,
    risk_score:         score,
    priority_level:     priority,
    risk_drivers:       drivers,
    last_calculated_at: new Date().toISOString(),
  }, { onConflict: 'shipment_id' })

  await insertTimelineEvent(supabase, {
    shipment_id:     shipmentId,
    organization_id: shipment.organization_id,
    event_type:      'RISK_RECALCULATED',
    actor_type:      'SYSTEM',
    actor_label:     'Risk Engine',
    confidence:      'SYSTEM',
    title:           `Risk updated: ${priority} — ${score}/10`,
    detail:          drivers.join(' · ') || undefined,
    metadata:        { score, priority, delay_probability: Math.round(delayProbability * 100), days_to_deadline: daysToDeadline },
  })
}

// ─── Auto-create Actions for a New Shipment ──────────────────

export async function createActionsForShipment(
  shipmentId: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: portals } = await supabase
    .from('shipment_portals')
    .select('id, regulator, status')
    .eq('shipment_id', shipmentId)

  const { data: shipment } = await supabase
    .from('shipments')
    .select('organization_id, pvoc_deadline')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToDeadline = shipment.pvoc_deadline
    ? Math.ceil((new Date(shipment.pvoc_deadline).getTime() - today.getTime()) / 86400000)
    : 30

  const actionsToCreate = (portals ?? [])
    .filter((p) => p.status === 'NOT_STARTED')
    .map((p) => ({
      organization_id: shipment.organization_id,
      shipment_id:     shipmentId,
      action_type:     'APPLY',
      priority:        daysToDeadline <= 7 ? 'HIGH' : 'MEDIUM',
      title:           `Apply for ${p.regulator} clearance`,
      description:     `Submit required documents to ${p.regulator} portal`,
      due_date:        shipment.pvoc_deadline ?? null,
      source:          'SYSTEM',
    }))

  if (actionsToCreate.length > 0) {
    await supabase.from('actions').insert(actionsToCreate)
  }
}

// ─── Create Escalation Action on Portal Rejection ────────────

export async function createEscalationAction(
  shipmentId: string,
  regulator: string,
  supabase: SupabaseClient
): Promise<void> {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('organization_id, name')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return

  await supabase.from('actions').insert({
    organization_id: shipment.organization_id,
    shipment_id:     shipmentId,
    action_type:     'ESCALATE',
    priority:        'CRITICAL',
    title:           `ESCALATE: ${regulator} rejection — immediate response required`,
    description:     `${regulator} has rejected this shipment's application. Review rejection reason, prepare corrected documents, and resubmit within 24 hours to avoid demurrage.`,
    source:          'SYSTEM',
  })
}

// ─── Record Portal Outcome (silent memory ingestion) ─────────

export async function recordPortalOutcome(opts: {
  shipmentId:   string
  regulator:    string
  outcome:      'APPROVED' | 'REJECTED'
  supabase:     SupabaseClient
}): Promise<void> {
  const { shipmentId, regulator, outcome, supabase } = opts

  const { data: shipment } = await supabase
    .from('shipments')
    .select('organization_id, created_at, cif_value_usd, hs_code, origin_port, manufacturer_id')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return

  const { data: profile } = await supabase
    .from('regulator_delay_profiles')
    .select('avg_processing_days')
    .eq('regulator', regulator)
    .single()

  const durationDays = Math.ceil(
    (Date.now() - new Date(shipment.created_at).getTime()) / 86400000
  )
  const expectedDays = profile?.avg_processing_days ?? 5
  const deviation    = durationDays - expectedDays

  const valueBand =
    (shipment.cif_value_usd ?? 0) >= 100000 ? 'VERY_HIGH'
    : (shipment.cif_value_usd ?? 0) >= 50000 ? 'HIGH'
    : (shipment.cif_value_usd ?? 0) >= 10000 ? 'MEDIUM'
    : 'LOW'

  // Record outcome (this silently builds the memory layer)
  await supabase.from('shipment_outcomes').insert({
    organization_id: shipment.organization_id,
    shipment_id:     shipmentId,
    regulator,
    outcome,
    duration_days:  durationDays,
    expected_days:  expectedDays,
    deviation,
    features: {
      origin:      shipment.origin_port,
      hs_code:     shipment.hs_code,
      value_band:  valueBand,
      supplier_id: shipment.manufacturer_id,
    },
  })

  // Update regulator profile with incremental average
  if (profile) {
    try {
      await supabase.rpc('update_regulator_profile', { p_regulator: regulator, p_duration: durationDays, p_rejected: outcome === 'REJECTED' })
    } catch { /* non-critical — RPC may not exist yet */ }
  }

  // Update supplier profile if manufacturer known
  if (shipment.manufacturer_id) {
    try {
      await supabase.from('supplier_profiles').upsert({
        manufacturer_id: shipment.manufacturer_id,
        organization_id: shipment.organization_id,
        total_shipments: 1,
        approval_rate:   outcome === 'APPROVED' ? 1 : 0,
        sample_size:     1,
        last_updated:    new Date().toISOString(),
      }, { onConflict: 'manufacturer_id' })
    } catch { /* best-effort */ }
  }
}

// ─── Recalculate Risk for All Org Shipments ──────────────────

export async function recalculateAllRisk(supabase: SupabaseClient): Promise<number> {
  const { data: shipments } = await supabase
    .from('shipments')
    .select('id')
    .eq('organization_id', ORG_ID)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')
    .not('pvoc_deadline', 'is', null)

  let updated = 0
  for (const s of shipments ?? []) {
    await updateShipmentRisk(s.id, supabase)
    updated++
  }
  return updated
}
