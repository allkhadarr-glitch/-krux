import { SupabaseClient } from '@supabase/supabase-js'

// Days after action creation before evaluation fires
const EVALUATION_WINDOWS: Record<string, number> = {
  VERIFY_HS_CODE:        3,
  CONTACT_AGENT:         5,
  HIGH_RISK_REVIEW:      5,
  UPDATE_DECLARATION:    5,
  SUBMIT_DOCUMENTS:      7,
  FOLLOW_UP_REGULATOR:   7,
  APPLY:                 10,
  PREEMPTIVE_SUBMISSION: 14,
  ESCALATE_SHIPMENT:     21,
}
const DEFAULT_WINDOW = 10

function getWindow(actionType: string): number {
  const base = actionType.replace(/_[A-Z]{2,10}$/, '')
  return EVALUATION_WINDOWS[base] ?? DEFAULT_WINDOW
}

// ─── Infer completion from portal state changes ───────────────

async function inferCompletion(
  action: any,
  supabase: SupabaseClient
): Promise<'INFERRED' | null> {
  if (!action.shipment_id) return null

  const base = action.action_type.replace(/_[A-Z]{2,10}$/, '')
  if (!['SUBMIT_DOCUMENTS', 'PREEMPTIVE_SUBMISSION'].includes(base)) return null

  const parts     = action.action_type.split('_')
  const regulator = parts[parts.length - 1]

  const { data: portal } = await supabase
    .from('shipment_portals')
    .select('status, updated_at')
    .eq('shipment_id', action.shipment_id)
    .eq('regulator', regulator)
    .maybeSingle()

  if (!portal) return null

  const advanced = ['IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED']
  if (
    advanced.includes(portal.status) &&
    new Date(portal.updated_at) > new Date(action.created_at)
  ) {
    return 'INFERRED'
  }
  return null
}

// ─── Baseline-relative effectiveness ─────────────────────────
// Core formula:
//   relativeImprovement = (baseline_days - actual_days) / baseline_days
//   effectiveness = clamp(0.6 + relativeImprovement × 0.4, 0.1, 1.0)
//
// Examples (baseline = 5d):
//   actual = 2d  → improvement = +0.60 → effectiveness = 0.84
//   actual = 5d  → improvement =  0.00 → effectiveness = 0.60
//   actual = 8d  → improvement = -0.60 → effectiveness = 0.36
//   actual = 12d → improvement = -1.40 → effectiveness = 0.10 (floor)

async function computeEffectiveness(
  action: any,
  completionSignal: 'EXPLICIT' | 'INFERRED' | 'TIMEOUT',
  supabase: SupabaseClient
): Promise<{
  success:             boolean
  effectiveness_score: number
  outcome_type:        string
  delta_delay_days:    number | null
  confidence_weight:   number
}> {
  const confidenceWeight = completionSignal === 'TIMEOUT' ? 0.5
    : completionSignal === 'INFERRED'  ? 0.85
    : 1.0

  if (!action.shipment_id) {
    return { success: false, effectiveness_score: 0.4, outcome_type: 'UNKNOWN', delta_delay_days: null, confidence_weight: 0.3 }
  }

  const base = action.action_type.replace(/_[A-Z]{2,10}$/, '')

  // ── Document submission actions ───────────────────────────
  if (['SUBMIT_DOCUMENTS', 'PREEMPTIVE_SUBMISSION'].includes(base)) {
    const parts     = action.action_type.split('_')
    const regulator = parts[parts.length - 1]

    const { data: portal } = await supabase
      .from('shipment_portals')
      .select('status, updated_at')
      .eq('shipment_id', action.shipment_id)
      .eq('regulator', regulator)
      .maybeSingle()

    const { data: profile } = await supabase
      .from('regulator_delay_profiles')
      .select('avg_processing_days')
      .eq('regulator', regulator)
      .maybeSingle()

    const baseline = profile?.avg_processing_days ?? 5

    if (portal?.status === 'APPROVED') {
      // Baseline-relative: how many days did processing actually take?
      const processedMs   = new Date(portal.updated_at ?? Date.now()).getTime()
                          - new Date(action.created_at).getTime()
      const actualDays    = Math.max(1, processedMs / 86400000)
      const delta         = baseline - actualDays
      const relImprove    = delta / Math.max(baseline, 1)
      const effectiveness = Math.min(1, Math.max(0.1, 0.6 + relImprove * 0.4))

      return {
        success:             true,
        effectiveness_score: Math.round(effectiveness * 1000) / 1000,
        outcome_type:        delta > 0 ? 'DELAY_REDUCED' : 'NO_EFFECT',
        delta_delay_days:    Math.round(delta * 10) / 10,
        confidence_weight:   confidenceWeight,
      }
    }

    if (portal?.status === 'REJECTED') {
      return {
        success:             false,
        effectiveness_score: 0,
        outcome_type:        'NO_EFFECT',
        delta_delay_days:    null,
        confidence_weight:   confidenceWeight,
      }
    }

    // Still pending — low-confidence timeout signal
    return {
      success:             false,
      effectiveness_score: 0.3,
      outcome_type:        'UNKNOWN',
      delta_delay_days:    null,
      confidence_weight:   confidenceWeight * 0.4,
    }
  }

  // ── Escalation: did risk flag improve? ────────────────────
  if (base === 'ESCALATE_SHIPMENT') {
    const { data: ship } = await supabase
      .from('shipments')
      .select('risk_flag_status')
      .eq('id', action.shipment_id)
      .maybeSingle()

    const improved = ship?.risk_flag_status !== 'RED'
    return {
      success:             improved,
      effectiveness_score: improved ? 0.65 : 0.2,
      outcome_type:        improved ? 'DELAY_REDUCED' : 'NO_EFFECT',
      delta_delay_days:    null,
      confidence_weight:   confidenceWeight * 0.8, // attribution uncertain for escalations
    }
  }

  // ── Default: signal-weighted heuristic ───────────────────
  const score = completionSignal === 'EXPLICIT' ? 0.70
    : completionSignal === 'INFERRED'  ? 0.60
    : 0.35
  return {
    success:             completionSignal !== 'TIMEOUT',
    effectiveness_score: score,
    outcome_type:        'UNKNOWN',
    delta_delay_days:    null,
    confidence_weight:   confidenceWeight * 0.6,
  }
}

// ─── Update effectiveness model (weighted Bayesian average) ──

async function updateEffectivenessModel(
  supabase: SupabaseClient,
  opts: {
    organizationId:   string
    actionType:       string
    regulator?:       string
    hsPref?:          string
    originCountry?:   string
    valueBand?:       string
    newScore:         number
    confidenceWeight: number
  }
): Promise<void> {
  const { data: existing } = await supabase
    .from('action_effectiveness_model')
    .select('avg_effectiveness, std_deviation, sample_size')
    .eq('organization_id', opts.organizationId)
    .eq('action_type', opts.actionType)
    .eq('regulator', opts.regulator ?? '')
    .maybeSingle()

  if (existing) {
    const w      = opts.confidenceWeight
    const n      = existing.sample_size + w
    const delta  = opts.newScore - existing.avg_effectiveness
    const newAvg = existing.avg_effectiveness + (delta * w) / n
    const newStd = Math.sqrt(
      ((existing.sample_size * Math.pow(existing.std_deviation, 2)) +
       (w * Math.pow(opts.newScore - newAvg, 2))) / n
    )
    const ci = n >= 2 ? (1.96 * newStd) / Math.sqrt(n) : 0.5

    await supabase
      .from('action_effectiveness_model')
      .update({
        avg_effectiveness: Math.round(newAvg * 1000) / 1000,
        std_deviation:     Math.round(newStd * 1000) / 1000,
        sample_size:       Math.round(n),
        ci_lower:          Math.max(0,  Math.round((newAvg - ci) * 1000) / 1000),
        ci_upper:          Math.min(1,  Math.round((newAvg + ci) * 1000) / 1000),
        last_updated:      new Date().toISOString(),
      })
      .eq('organization_id', opts.organizationId)
      .eq('action_type', opts.actionType)
      .eq('regulator', opts.regulator ?? '')
  } else {
    await supabase.from('action_effectiveness_model').insert({
      organization_id:   opts.organizationId,
      action_type:       opts.actionType,
      regulator:         opts.regulator ?? null,
      hs_code_prefix:    opts.hsPref        ?? null,
      origin_country:    opts.originCountry ?? null,
      value_band:        opts.valueBand     ?? null,
      avg_effectiveness: opts.newScore,
      std_deviation:     0,
      sample_size:       Math.round(opts.confidenceWeight),
      ci_lower:          null,
      ci_upper:          null,
    })
  }
}

// ─── Main evaluation runner (cron: hourly) ────────────────────

export async function evaluateActions(supabase: SupabaseClient): Promise<number> {
  const now = new Date()

  const { data: actions } = await supabase
    .from('actions')
    .select('id, organization_id, shipment_id, action_type, status, created_at, completion_signal')
    .is('evaluated_at', null)
    .in('status', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'DISMISSED'])

  if (!actions?.length) return 0

  let evaluated = 0

  for (const action of actions) {
    const windowMs  = getWindow(action.action_type) * 86400000
    const actionAge = now.getTime() - new Date(action.created_at).getTime()
    if (actionAge < windowMs) continue

    // Determine completion signal
    let signal: 'EXPLICIT' | 'INFERRED' | 'TIMEOUT'
    if (action.status === 'COMPLETED' && action.completion_signal === 'EXPLICIT') {
      signal = 'EXPLICIT'
    } else {
      signal = (await inferCompletion(action, supabase)) ?? 'TIMEOUT'
    }

    const result = await computeEffectiveness(action, signal, supabase)

    // Build context bucket for model update
    let regulator:     string | undefined
    let hsPref:        string | undefined
    let originCountry: string | undefined
    let valueBand:     string | undefined

    if (action.shipment_id) {
      const { data: ship } = await supabase
        .from('shipments')
        .select('cif_value_usd, hs_code, origin_country')
        .eq('id', action.shipment_id)
        .maybeSingle()

      if (ship) {
        hsPref        = ship.hs_code?.slice(0, 2)
        originCountry = ship.origin_country
        const cif     = ship.cif_value_usd ?? 0
        valueBand     = cif >= 100000 ? 'VERY_HIGH' : cif >= 50000 ? 'HIGH' : cif >= 10000 ? 'MEDIUM' : 'LOW'
      }

      // Extract regulator suffix (SUBMIT_DOCUMENTS_KEBS → KEBS)
      const parts   = action.action_type.split('_')
      const suffix  = parts[parts.length - 1]
      const KNOWN   = ['KEBS','PPB','KRA','KEPHIS','KENTRADE','PCPB','EPRA','NEMA','GMP']
      if (KNOWN.includes(suffix)) regulator = suffix
    }

    // Record outcome
    const { data: outcome } = await supabase
      .from('action_outcomes')
      .insert({
        action_id:           action.id,
        shipment_id:         action.shipment_id ?? null,
        organization_id:     action.organization_id,
        action_type:         action.action_type.replace(/_[A-Z]{2,10}$/, ''),
        regulator:           regulator ?? null,
        hs_code_prefix:      hsPref    ?? null,
        origin_country:      originCountry ?? null,
        value_band:          valueBand     ?? null,
        outcome_type:        result.outcome_type,
        delta_delay_days:    result.delta_delay_days,
        success:             result.success,
        effectiveness_score: result.effectiveness_score,
        confidence_weight:   result.confidence_weight,
      })
      .select('id')
      .maybeSingle()

    // Mark action evaluated
    await supabase.from('actions').update({
      evaluated_at:        now.toISOString(),
      effectiveness_score: result.effectiveness_score,
      completion_signal:   signal,
      outcome_id:          outcome?.id ?? null,
      // OPEN actions past their window are timeout-completed
      ...(action.status === 'OPEN'
        ? { status: 'COMPLETED', completion_signal: 'TIMEOUT' }
        : {}),
    }).eq('id', action.id)

    // Update org-specific effectiveness model
    await updateEffectivenessModel(supabase, {
      organizationId:   action.organization_id,
      actionType:       action.action_type.replace(/_[A-Z]{2,10}$/, ''),
      regulator,
      hsPref,
      originCountry,
      valueBand,
      newScore:         result.effectiveness_score,
      confidenceWeight: result.confidence_weight,
    })

    evaluated++
  }

  return evaluated
}
