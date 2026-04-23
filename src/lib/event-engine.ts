import { Resend } from 'resend'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  updateShipmentRisk,
  recordPortalOutcome,
} from './risk-engine'
import {
  generateActionsForShipment,
  createEscalationAction,
} from './action-generator'

const ALERT_EMAIL  = process.env.ALERT_EMAIL ?? 'mabdikadirhaji@gmail.com'
const FROM_EMAIL   = 'KRUXVON Alerts <alerts@kruxvon.com>'
const EXCHANGE_RATE = 129

export type EventType = 'SHIPMENT_CREATED' | 'PORTAL_STATUS_CHANGED' | 'DEADLINE_APPROACHING'
export type AlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

// ─── Logging helpers ─────────────────────────────────────────

async function logEvent(
  supabase: SupabaseClient,
  eventId: string,
  handler: string,
  status: 'SUCCESS' | 'FAILED',
  message?: string
) {
  await supabase.from('event_logs').insert({ event_id: eventId, handler, status, message: message ?? null })
}

async function logAlert(
  supabase: SupabaseClient,
  opts: {
    alertType: string
    severity: AlertSeverity
    recipientEmail: string
    subject: string
    status: 'SENT' | 'FAILED' | 'SKIPPED'
    shipmentId?: string
    licenseId?: string
    manufacturerId?: string
    errorMessage?: string
    organizationId?: string
  }
) {
  await supabase.from('alert_logs').insert({
    organization_id: opts.organizationId ?? null,
    shipment_id:     opts.shipmentId     ?? null,
    license_id:      opts.licenseId      ?? null,
    manufacturer_id: opts.manufacturerId ?? null,
    alert_type:      opts.alertType,
    severity:        opts.severity,
    channel:         'EMAIL',
    recipient_email: opts.recipientEmail,
    subject:         opts.subject,
    status:          opts.status,
    error_message:   opts.errorMessage ?? null,
  })
}

// ─── Handler: SHIPMENT_CREATED ───────────────────────────────

async function handleShipmentCreated(event: any, supabase: SupabaseClient) {
  await generateActionsForShipment(event.entity_id, supabase)
  await updateShipmentRisk(event.entity_id, supabase)
  await logEvent(supabase, event.id, 'SHIPMENT_HANDLER', 'SUCCESS',
    `Shipment ${event.payload.reference} created — actions + risk score initialised`)
}

// ─── Handler: PORTAL_STATUS_CHANGED ─────────────────────────

async function handlePortalStatusChanged(event: any, supabase: SupabaseClient) {
  const { regulator, old_status, new_status } = event.payload

  // REJECTED — flag the shipment risk immediately
  if (new_status === 'REJECTED') {
    await supabase
      .from('shipments')
      .update({ risk_flag_status: 'RED', remediation_status: 'OPEN' })
      .eq('id', event.entity_id)
    await createEscalationAction(event.entity_id, regulator, supabase)
    await recordPortalOutcome({ shipmentId: event.entity_id, regulator, outcome: 'REJECTED', supabase })
    await updateShipmentRisk(event.entity_id, supabase)
    await logEvent(supabase, event.id, 'PORTAL_HANDLER', 'SUCCESS',
      `${regulator} REJECTED — risk escalated to RED, escalation action created`)
    return
  }

  if (new_status === 'APPROVED') {
    const { data: portals } = await supabase
      .from('shipment_portals')
      .select('status')
      .eq('shipment_id', event.entity_id)

    const allApproved = portals?.every((p: any) =>
      p.status === 'APPROVED' || p.status === 'NOT_STARTED'
    )
    if (allApproved) {
      await supabase
        .from('shipments')
        .update({ risk_flag_status: 'GREEN' })
        .eq('id', event.entity_id)
    }
    await recordPortalOutcome({ shipmentId: event.entity_id, regulator, outcome: 'APPROVED', supabase })
    await updateShipmentRisk(event.entity_id, supabase)
    await logEvent(supabase, event.id, 'PORTAL_HANDLER', 'SUCCESS',
      `${regulator} APPROVED${allApproved ? ' — all portals clear, risk updated to GREEN' : ''}`)
    return
  }

  await updateShipmentRisk(event.entity_id, supabase)
  await logEvent(supabase, event.id, 'PORTAL_HANDLER', 'SUCCESS',
    `${regulator}: ${old_status} → ${new_status}`)
}

// ─── Handler: DEADLINE_APPROACHING ──────────────────────────

async function handleDeadlineApproaching(event: any, supabase: SupabaseClient) {
  if (!process.env.RESEND_API_KEY) {
    await logEvent(supabase, event.id, 'DEADLINE_HANDLER', 'FAILED', 'RESEND_API_KEY not set')
    return
  }

  const { days_remaining, regulator_code, shipment_name, reference, storage_daily_usd } = event.payload
  const severity: AlertSeverity = days_remaining <= 3 ? 'CRITICAL' : days_remaining <= 7 ? 'WARNING' : 'INFO'
  const levelLabel = severity === 'CRITICAL' ? 'CRITICAL' : days_remaining <= 7 ? 'URGENT' : 'WARNING'
  const levelColor = severity === 'CRITICAL' ? '#EF4444' : days_remaining <= 7 ? '#F59E0B' : '#3B82F6'
  const dailyKES   = Math.round((storage_daily_usd ?? 0) * EXCHANGE_RATE)
  const estCostKES = Math.round(dailyKES * Math.max(7, days_remaining))

  const deadline = new Date(event.payload.pvoc_deadline)
    .toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  const subject = `[${levelLabel}] ${shipment_name} — PVoC deadline in ${days_remaining}d · KRUXVON`

  const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;">
    <div style="display:inline-block;background:#00C896;color:#0A1628;font-weight:900;font-size:18px;padding:6px 12px;border-radius:8px;">K</div>
    <span style="color:#94A3B8;font-size:13px;margin-left:10px;">KRUXVON · Kenya Import Compliance</span>
  </div>
  <div style="background:#0F2040;border:1px solid #1E3A5F;border-radius:16px;padding:28px;margin-bottom:20px;">
    <div style="display:inline-block;background:${levelColor}20;color:${levelColor};font-weight:700;font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${levelColor}40;margin-bottom:16px;letter-spacing:1px;">${levelLabel}</div>
    <h1 style="color:white;font-size:20px;font-weight:700;margin:0 0 6px 0;">${shipment_name}</h1>
    <p style="color:#64748B;font-size:13px;margin:0 0 20px 0;">${reference} · ${regulator_code}</p>
    <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:16px;margin-bottom:20px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#64748B;font-size:12px;">PVoC Deadline</span>
        <span style="color:white;font-size:12px;font-weight:600;">${deadline}</span>
      </div>
      <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
        <span style="color:#64748B;font-size:12px;">Days Remaining</span>
        <span style="color:${levelColor};font-size:12px;font-weight:700;">${days_remaining} days</span>
      </div>
      <div style="display:flex;justify-content:space-between;border-top:1px solid #1E3A5F;padding-top:10px;margin-top:4px;">
        <span style="color:#64748B;font-size:12px;">Est. Cost if Missed</span>
        <span style="color:#EF4444;font-size:12px;font-weight:700;">KES ${estCostKES.toLocaleString()}</span>
      </div>
    </div>
    <div style="background:#00C89610;border:1px solid #00C89630;border-radius:10px;padding:14px;">
      <p style="color:#00C896;font-size:11px;font-weight:700;margin:0 0 6px 0;letter-spacing:1px;">ACTION REQUIRED</p>
      <p style="color:#94A3B8;font-size:13px;margin:0;">${event.payload.action}</p>
    </div>
  </div>
  <p style="color:#334155;font-size:11px;text-align:center;margin:0;">KRUXVON · Automated compliance alert · severity: ${severity}</p>
</div></body></html>`

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error } = await resend.emails.send({ from: FROM_EMAIL, to: ALERT_EMAIL, subject, html })

  if (error) {
    await logAlert(supabase, {
      alertType: `PVOC_DEADLINE_${days_remaining}D`,
      severity, recipientEmail: ALERT_EMAIL, subject,
      status: 'FAILED', shipmentId: event.entity_id, errorMessage: error.message,
    })
    await logEvent(supabase, event.id, 'DEADLINE_HANDLER', 'FAILED', error.message)
    return
  }

  await logAlert(supabase, {
    alertType: `PVOC_DEADLINE_${days_remaining <= 3 ? '3' : days_remaining <= 7 ? '7' : '14'}D`,
    severity, recipientEmail: ALERT_EMAIL, subject, status: 'SENT', shipmentId: event.entity_id,
  })
  await logEvent(supabase, event.id, 'DEADLINE_HANDLER', 'SUCCESS',
    `Email sent to ${ALERT_EMAIL} — ${days_remaining}d remaining`)
}

// ─── Emit DEADLINE_APPROACHING events (called by cron) ───────

export async function emitDeadlineEvents(supabase: SupabaseClient): Promise<number> {
  const today = new Date(); today.setHours(0, 0, 0, 0)

  const { data: shipments } = await supabase
    .from('shipments')
    .select('id, organization_id, name, reference_number, pvoc_deadline, storage_rate_per_day, regulatory_body_id, alert_sent_14d_at, alert_sent_7d_at, alert_sent_3d_at')
    .is('deleted_at', null)
    .not('pvoc_deadline', 'is', null)
    .neq('remediation_status', 'CLOSED')

  let emitted = 0
  const ACTIONS: Record<string, string> = {
    PPB:      'Submit PPB application form + CoA + product samples to PPB office',
    KEBS:     'File KEBS pre-export verification request and attach test reports',
    PCPB:     'Submit PCPB pesticide registration documents and efficacy data',
    KEPHIS:   'File KEPHIS phytosanitary certificate request with origin country',
    'WHO-GMP':'Confirm WHO-GMP certificate validity and submit to PPB for verification',
    EPRA:     'Submit EPRA energy audit report and product compliance certificate',
    KRA:      'File IDF via KRA iTax portal and confirm HS code classification',
    NEMA:     'Submit NEMA environmental impact assessment and importation permit',
  }

  for (const s of shipments ?? []) {
    const days = Math.ceil((new Date(s.pvoc_deadline).getTime() - today.getTime()) / 86400000)
    if (days > 14 || days < 0) continue

    let tier: '3d' | '7d' | '14d' | null = null
    if      (days <= 3  && !s.alert_sent_3d_at)  tier = '3d'
    else if (days <= 7  && !s.alert_sent_7d_at)  tier = '7d'
    else if (days <= 14 && !s.alert_sent_14d_at) tier = '14d'
    if (!tier) continue

    let regulatorCode = '—'
    if (s.regulatory_body_id) {
      const { data: rb } = await supabase
        .from('regulatory_bodies').select('code').eq('id', s.regulatory_body_id).single()
      if (rb) regulatorCode = rb.code
    }

    const action = (() => {
      const base = ACTIONS[regulatorCode] ?? 'Contact regulator to confirm submission requirements'
      if (days <= 3) return `CRITICAL — ${base} TODAY`
      if (days <= 7) return `URGENT — ${base} within ${days} days`
      return `WARNING — ${base} within ${days} days`
    })()

    await supabase.from('events').insert({
      organization_id: s.organization_id,
      event_type:  'DEADLINE_APPROACHING',
      entity_type: 'shipment',
      entity_id:   s.id,
      payload: {
        days_remaining:    days,
        tier,
        regulator_code:    regulatorCode,
        shipment_name:     s.name,
        reference:         s.reference_number,
        pvoc_deadline:     s.pvoc_deadline,
        storage_daily_usd: s.storage_rate_per_day ?? 0,
        action,
      },
    })

    // Mark the tier as emitted on the shipment so we don't re-emit
    const col = tier === '3d' ? 'alert_sent_3d_at' : tier === '7d' ? 'alert_sent_7d_at' : 'alert_sent_14d_at'
    await supabase.from('shipments').update({ [col]: new Date().toISOString() }).eq('id', s.id)
    emitted++
  }

  return emitted
}

// ─── Process a single event ──────────────────────────────────

export async function processEvent(event: any, supabase: SupabaseClient): Promise<void> {
  try {
    switch (event.event_type as EventType) {
      case 'SHIPMENT_CREATED':
        await handleShipmentCreated(event, supabase)
        break
      case 'PORTAL_STATUS_CHANGED':
        await handlePortalStatusChanged(event, supabase)
        break
      case 'DEADLINE_APPROACHING':
        await handleDeadlineApproaching(event, supabase)
        break
      default:
        await logEvent(supabase, event.id, 'UNKNOWN', 'FAILED', `Unknown event type: ${event.event_type}`)
        return
    }
    await supabase.from('events').update({ processed_at: new Date().toISOString() }).eq('id', event.id)
  } catch (err: any) {
    await logEvent(supabase, event.id, 'ERROR', 'FAILED', err?.message ?? 'Unknown error')
  }
}
