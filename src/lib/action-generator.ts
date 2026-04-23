import { SupabaseClient } from '@supabase/supabase-js'
import { insertTimelineEvent } from './timeline'

// ─── Types ───────────────────────────────────────────────────

interface ActionInsert {
  organization_id:  string
  shipment_id?:     string
  action_type:      string
  priority:         'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  title:            string
  description?:     string
  due_date?:        string
  source:           'SYSTEM'
  trigger_reason?:  string
  expected_impact?: Record<string, unknown>
  confidence_score?: number
}

interface SuppressionInsert {
  organization_id: string
  shipment_id?:    string
  action_type:     string
  reason:          string
  context:         Record<string, unknown>
}

// ─── Effectiveness lookup (3-tier) ───────────────────────────
// Used at generation time to attach predicted effectiveness to actions.
// Tier 1: org-specific (≥20 samples) → trusted
// Tier 2: global prior              → labelled as industry
// Tier 3: nothing found             → null (UI shows "Learning...")

export async function lookupEffectiveness(
  supabase: SupabaseClient,
  opts: { organizationId: string; actionType: string; regulator?: string }
): Promise<{ score: number | null; tier: 'org' | 'global' | null; sample_size: number }> {
  const baseType  = opts.actionType.replace(/_[A-Z]{2,10}$/, '')
  const regulator = opts.regulator ?? ''

  // Tier 1 — org-specific
  const { data: orgRow } = await supabase
    .from('action_effectiveness_model')
    .select('avg_effectiveness, sample_size')
    .eq('organization_id', opts.organizationId)
    .eq('action_type', baseType)
    .eq('regulator', regulator)
    .maybeSingle()

  if (orgRow && orgRow.sample_size >= 20) {
    return { score: orgRow.avg_effectiveness, tier: 'org', sample_size: orgRow.sample_size }
  }

  // Tier 2 — global (seeded or accumulated)
  const { data: globalRow } = await supabase
    .from('action_effectiveness_model')
    .select('avg_effectiveness, sample_size')
    .is('organization_id', null)
    .eq('action_type', baseType)
    .eq('regulator', regulator)
    .maybeSingle()

  if (globalRow && globalRow.sample_size >= 20) {
    return { score: globalRow.avg_effectiveness, tier: 'global', sample_size: globalRow.sample_size }
  }

  // Nothing reliable → UI shows "Learning..."
  return { score: null, tier: null, sample_size: 0 }
}

// ─── Load open action types for deduplication ────────────────

async function getOpenActionTypes(
  shipmentId: string,
  supabase: SupabaseClient
): Promise<Set<string>> {
  const { data } = await supabase
    .from('actions')
    .select('action_type')
    .eq('shipment_id', shipmentId)
    .in('status', ['OPEN', 'IN_PROGRESS'])

  return new Set((data ?? []).map((a: any) => a.action_type))
}

// ─── Core generator ──────────────────────────────────────────

export async function generateActionsForShipment(
  shipmentId: string,
  supabase:   SupabaseClient
): Promise<void> {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('id, organization_id, name, cif_value_usd, pvoc_deadline, hs_code, origin_country, risk_flag_status')
    .eq('id', shipmentId)
    .single()

  if (!shipment) return

  const { data: portals } = await supabase
    .from('shipment_portals')
    .select('regulator, status')
    .eq('shipment_id', shipmentId)

  const { data: riskRow } = await supabase
    .from('shipment_risk')
    .select('risk_score, delay_probability, days_to_deadline, priority_level')
    .eq('shipment_id', shipmentId)
    .maybeSingle()

  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysToDeadline = shipment.pvoc_deadline
    ? Math.ceil((new Date(shipment.pvoc_deadline).getTime() - today.getTime()) / 86400000)
    : 30

  const riskScore        = riskRow?.risk_score        ?? 0
  const delayProbability = riskRow?.delay_probability ?? 0
  const openTypes        = await getOpenActionTypes(shipmentId, supabase)

  const toCreate:    ActionInsert[]    = []
  const suppressions: SuppressionInsert[] = []

  // Shared suppression context snapshot
  const ctx = {
    days_to_deadline:   daysToDeadline,
    risk_score:         riskScore,
    delay_probability:  delayProbability,
    cif_value_usd:      shipment.cif_value_usd,
    origin_country:     shipment.origin_country,
  }

  const notStarted = (portals ?? []).filter((p: any) => p.status === 'NOT_STARTED')
  const inFlight   = (portals ?? []).filter(
    (p: any) => !['APPROVED', 'NOT_STARTED'].includes(p.status)
  )

  // ── Rule 1: Submit documents for NOT_STARTED portals ─────
  for (const portal of notStarted) {
    const type = `SUBMIT_DOCUMENTS_${portal.regulator}`
    if (openTypes.has(type)) {
      suppressions.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     type,
        reason:          'DUPLICATE_OPEN',
        context:         { ...ctx, regulator: portal.regulator },
      })
      continue
    }

    const priority: ActionInsert['priority'] = daysToDeadline <= 3 ? 'CRITICAL'
      : daysToDeadline <= 7 ? 'HIGH' : 'MEDIUM'

    toCreate.push({
      organization_id: shipment.organization_id,
      shipment_id:     shipmentId,
      action_type:     type,
      priority,
      title:           `Submit ${portal.regulator} documents`,
      description:     `File required documents with ${portal.regulator} to initiate clearance.`,
      due_date:        shipment.pvoc_deadline ?? undefined,
      source:          'SYSTEM',
      trigger_reason:  `${portal.regulator} portal not started — ${daysToDeadline}d to deadline`,
      expected_impact: { regulator: portal.regulator, days_to_deadline: daysToDeadline },
    })
  }

  // ── Rule 2: High delay probability → escalate ────────────
  if (delayProbability > 0.70) {
    if (openTypes.has('ESCALATE_SHIPMENT')) {
      suppressions.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'ESCALATE_SHIPMENT',
        reason:          'DUPLICATE_OPEN',
        context:         { ...ctx },
      })
    } else {
      toCreate.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'ESCALATE_SHIPMENT',
        priority:        riskScore >= 7 ? 'CRITICAL' : 'HIGH',
        title:           'Escalate — high delay probability',
        description:     `Compound delay probability is ${Math.round(delayProbability * 100)}%. Escalate to clearing agent for urgent intervention.`,
        due_date:        shipment.pvoc_deadline ?? undefined,
        source:          'SYSTEM',
        trigger_reason:  `${Math.round(delayProbability * 100)}% compound delay probability exceeds 70% threshold`,
        expected_impact: { delay_probability: delayProbability },
      })
    }
  }

  // ── Rule 3: Critical deadline + portals still in-flight ──
  if (daysToDeadline <= 3 && inFlight.length > 0) {
    if (openTypes.has('FOLLOW_UP_REGULATOR')) {
      suppressions.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'FOLLOW_UP_REGULATOR',
        reason:          'DUPLICATE_OPEN',
        context:         { ...ctx, in_flight_count: inFlight.length },
      })
    } else {
      toCreate.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'FOLLOW_UP_REGULATOR',
        priority:        'CRITICAL',
        title:           `Follow up with ${inFlight.map((p: any) => p.regulator).join(', ')} — ${daysToDeadline}d left`,
        description:     'Contact regulator directly to expedite pending applications.',
        due_date:        shipment.pvoc_deadline ?? undefined,
        source:          'SYSTEM',
        trigger_reason:  `${inFlight.length} portal(s) in-flight with ${daysToDeadline} days remaining`,
        expected_impact: { portals_pending: inFlight.length },
      })
    }
  }

  // ── Rule 4: High-value shipment missing HS code ──────────
  if ((shipment.cif_value_usd ?? 0) >= 50000 && !shipment.hs_code) {
    if (openTypes.has('VERIFY_HS_CODE')) {
      suppressions.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'VERIFY_HS_CODE',
        reason:          'DUPLICATE_OPEN',
        context:         { ...ctx },
      })
    } else {
      toCreate.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     'VERIFY_HS_CODE',
        priority:        'HIGH',
        title:           'Verify HS code classification',
        description:     'High-value shipment has no HS code. Misclassification risks KRA penalties.',
        source:          'SYSTEM',
        trigger_reason:  `High-value shipment (USD ${(shipment.cif_value_usd ?? 0).toLocaleString()}) missing HS code`,
        expected_impact: { cif_usd: shipment.cif_value_usd },
      })
    }
  }

  // ── Rule 5: Preemptive submission for slow regulators ────
  const SLOW_REGULATORS = ['PPB', 'KEBS', 'PCPB']
  for (const portal of notStarted.filter((p: any) => SLOW_REGULATORS.includes(p.regulator))) {
    if (daysToDeadline > 10 && daysToDeadline <= 21) {
      const type = `PREEMPTIVE_SUBMISSION_${portal.regulator}`
      if (openTypes.has(type)) {
        suppressions.push({
          organization_id: shipment.organization_id,
          shipment_id:     shipmentId,
          action_type:     type,
          reason:          'DUPLICATE_OPEN',
          context:         { ...ctx, regulator: portal.regulator },
        })
        continue
      }
      toCreate.push({
        organization_id: shipment.organization_id,
        shipment_id:     shipmentId,
        action_type:     type,
        priority:        'MEDIUM',
        title:           `Submit ${portal.regulator} early — avg 7d processing`,
        description:     `${portal.regulator} historically slow. Submit now to avoid deadline pressure.`,
        due_date:        shipment.pvoc_deadline ?? undefined,
        source:          'SYSTEM',
        trigger_reason:  `${portal.regulator} is historically slow — preemptive at ${daysToDeadline}d out`,
        expected_impact: { regulator: portal.regulator, early_by_days: daysToDeadline },
      })
    }
  }

  // ── Batch write ───────────────────────────────────────────
  if (toCreate.length > 0) {
    const { data: inserted } = await supabase.from('actions').insert(toCreate).select()

    // Log each created action to the timeline
    for (const a of inserted ?? []) {
      if (!a.shipment_id) continue
      await insertTimelineEvent(supabase, {
        shipment_id:     a.shipment_id,
        action_id:       a.id,
        organization_id: a.organization_id,
        event_type:      'ACTION_CREATED',
        actor_type:      'SYSTEM',
        actor_label:     'Intelligence Engine',
        confidence:      'SYSTEM',
        title:           `Action queued: ${a.title}`,
        metadata:        { action_type: a.action_type, priority: a.priority },
      })
    }
  }
  if (suppressions.length > 0) {
    await supabase.from('suppressed_actions').insert(suppressions)
  }
}

// ─── Escalation on portal rejection ──────────────────────────

export async function createEscalationAction(
  shipmentId: string,
  regulator:  string,
  supabase:   SupabaseClient
): Promise<void> {
  const { data: shipment } = await supabase
    .from('shipments')
    .select('organization_id, name')
    .eq('id', shipmentId)
    .single()
  if (!shipment) return

  const { data: existing } = await supabase
    .from('actions')
    .select('id')
    .eq('shipment_id', shipmentId)
    .eq('action_type', 'ESCALATE_SHIPMENT')
    .in('status', ['OPEN', 'IN_PROGRESS'])
    .limit(1)

  if (existing?.length) {
    // Upgrade to CRITICAL instead of duplicating — log the suppression
    await supabase.from('actions')
      .update({ priority: 'CRITICAL', updated_at: new Date().toISOString() })
      .eq('id', existing[0].id)
    await supabase.from('suppressed_actions').insert({
      organization_id: shipment.organization_id,
      shipment_id:     shipmentId,
      action_type:     'ESCALATE_SHIPMENT',
      reason:          'DUPLICATE_OPEN',
      context:         { regulator, note: 'upgraded_to_CRITICAL' },
    })
    return
  }

  await supabase.from('actions').insert({
    organization_id: shipment.organization_id,
    shipment_id:     shipmentId,
    action_type:     'ESCALATE_SHIPMENT',
    priority:        'CRITICAL',
    title:           `ESCALATE: ${regulator} rejected — respond within 24h`,
    description:     `${regulator} rejected this shipment's application. Review rejection, correct documents, resubmit within 24 hours to avoid demurrage.`,
    source:          'SYSTEM',
    trigger_reason:  `${regulator} portal status changed to REJECTED`,
    expected_impact: { regulator, action_window_hours: 24 },
  })
}
