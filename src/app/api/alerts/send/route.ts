import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'
import { insertTimelineEvent } from '@/lib/timeline'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ALERT_EMAIL      = process.env.ALERT_EMAIL      ?? 'mabdikadirhaji@gmail.com'
const ALERT_WHATSAPP   = process.env.ALERT_WHATSAPP_TO ?? ''
const FROM_EMAIL       = 'KRUX Alerts <alerts@kruxvon.com>'

// ─── WhatsApp via Twilio ─────────────────────────────────────

async function sendWhatsApp(body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM   // e.g. whatsapp:+14155238886
  const to    = ALERT_WHATSAPP ? `whatsapp:${ALERT_WHATSAPP}` : ''

  if (!sid || !token || !from || !to) return  // Twilio not configured — skip silently

  const params = new URLSearchParams({ From: from, To: to, Body: body })
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method:  'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
}

// ─── Email Templates ────────────────────────────────────────

function shipmentAlertEmail(s: {
  name: string
  reference_number: string
  pvoc_deadline: string
  daysRemaining: number
  regulatorCode: string
  action: string
  storageDailyCostKES: number
  estimatedAdditionalCostKES: number
}) {
  const levelLabel = s.daysRemaining <= 3 ? 'CRITICAL' : s.daysRemaining <= 7 ? 'URGENT' : 'WARNING'
  const levelColor = s.daysRemaining <= 3 ? '#EF4444' : s.daysRemaining <= 7 ? '#F59E0B' : '#3B82F6'
  const deadline   = new Date(s.pvoc_deadline).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  return {
    subject: `[${levelLabel}] ${s.name} — PVoC deadline in ${s.daysRemaining}d · KRUX`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#00C896;color:#0A1628;font-weight:900;font-size:18px;padding:6px 12px;border-radius:8px;">K</div>
      <span style="color:#94A3B8;font-size:13px;margin-left:10px;">KRUX · Kenya Import Compliance</span>
    </div>

    <div style="background:#0F2040;border:1px solid #1E3A5F;border-radius:16px;padding:28px;margin-bottom:20px;">
      <div style="display:inline-block;background:${levelColor}20;color:${levelColor};font-weight:700;font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${levelColor}40;margin-bottom:16px;letter-spacing:1px;">
        ${levelLabel}
      </div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0 0 6px 0;">${s.name}</h1>
      <p style="color:#64748B;font-size:13px;margin:0 0 20px 0;">${s.reference_number} · ${s.regulatorCode}</p>

      <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:16px;margin-bottom:20px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748B;font-size:12px;">PVoC Deadline</span>
          <span style="color:white;font-size:12px;font-weight:600;">${deadline}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748B;font-size:12px;">Days Remaining</span>
          <span style="color:${levelColor};font-size:12px;font-weight:700;">${s.daysRemaining} days</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748B;font-size:12px;">Daily Storage Cost</span>
          <span style="color:white;font-size:12px;">KES ${s.storageDailyCostKES.toLocaleString()}</span>
        </div>
        <div style="display:flex;justify-content:space-between;border-top:1px solid #1E3A5F;padding-top:10px;margin-top:4px;">
          <span style="color:#64748B;font-size:12px;">Est. Cost if Missed</span>
          <span style="color:#EF4444;font-size:12px;font-weight:700;">KES ${s.estimatedAdditionalCostKES.toLocaleString()}</span>
        </div>
      </div>

      <div style="background:#00C896 10;border:1px solid #00C89630;border-radius:10px;padding:14px;">
        <p style="color:#00C896;font-size:11px;font-weight:700;margin:0 0 6px 0;letter-spacing:1px;">ACTION REQUIRED</p>
        <p style="color:#94A3B8;font-size:13px;margin:0;">${s.action}</p>
      </div>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;margin:0;">
      KRUX · Kenya Import Compliance Intelligence · You are receiving this because your shipment has a compliance deadline within 14 days.
    </p>
  </div>
</body>
</html>`,
  }
}

function licenseAlertEmail(l: {
  license_name: string
  license_number?: string
  license_type: string
  issuing_body: string
  expiry_date: string
  daysRemaining: number
  manufacturerName: string
  status: string
}) {
  const levelLabel = l.daysRemaining <= 7 ? 'CRITICAL' : l.daysRemaining <= 30 ? 'URGENT' : 'WARNING'
  const levelColor = l.daysRemaining <= 7 ? '#EF4444' : l.daysRemaining <= 30 ? '#F59E0B' : '#3B82F6'
  const expiry     = new Date(l.expiry_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  return {
    subject: `[${levelLabel}] License Expiring: ${l.license_name} — ${l.manufacturerName} · KRUX`,
    html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:32px 24px;">
    <div style="margin-bottom:24px;">
      <div style="display:inline-block;background:#00C896;color:#0A1628;font-weight:900;font-size:18px;padding:6px 12px;border-radius:8px;">K</div>
      <span style="color:#94A3B8;font-size:13px;margin-left:10px;">KRUX · Manufacturer Vault</span>
    </div>

    <div style="background:#0F2040;border:1px solid #1E3A5F;border-radius:16px;padding:28px;">
      <div style="display:inline-block;background:${levelColor}20;color:${levelColor};font-weight:700;font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid ${levelColor}40;margin-bottom:16px;letter-spacing:1px;">
        ${levelLabel} — LICENSE EXPIRY
      </div>
      <h1 style="color:white;font-size:20px;font-weight:700;margin:0 0 4px 0;">${l.license_name}</h1>
      <p style="color:#64748B;font-size:13px;margin:0 0 20px 0;">${l.manufacturerName} · ${l.license_type} · ${l.issuing_body}</p>

      <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:16px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748B;font-size:12px;">Expiry Date</span>
          <span style="color:white;font-size:12px;font-weight:600;">${expiry}</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:10px;">
          <span style="color:#64748B;font-size:12px;">Days Remaining</span>
          <span style="color:${levelColor};font-size:12px;font-weight:700;">${l.daysRemaining} days</span>
        </div>
        <div style="display:flex;justify-content:space-between;">
          <span style="color:#64748B;font-size:12px;">License Number</span>
          <span style="color:white;font-size:12px;">${l.license_number ?? 'Not recorded'}</span>
        </div>
      </div>

      <div style="margin-top:16px;background:#00C89610;border:1px solid #00C89630;border-radius:10px;padding:14px;">
        <p style="color:#00C896;font-size:11px;font-weight:700;margin:0 0 6px 0;letter-spacing:1px;">ACTION REQUIRED</p>
        <p style="color:#94A3B8;font-size:13px;margin:0;">
          Begin license renewal process with ${l.issuing_body} immediately. A lapsed license may block shipment clearance and invalidate PVoC compliance.
        </p>
      </div>
    </div>

    <p style="color:#334155;font-size:11px;text-align:center;margin:16px 0 0 0;">
      KRUX · Manufacturer Vault · License Monitoring
    </p>
  </div>
</body>
</html>`,
  }
}

// ─── Alert Logic ────────────────────────────────────────────

// Exchange rate fetched live in runAlerts()

function getAction(regulatorCode: string, days: number): string {
  const actions: Record<string, string> = {
    PPB:      'Submit PPB application form + CoA + product samples to PPB office',
    KEBS:     'File KEBS pre-export verification request and attach test reports',
    PCPB:     'Submit PCPB pesticide registration documents and efficacy data',
    KEPHIS:   'File KEPHIS phytosanitary certificate request with origin country',
    'WHO-GMP':'Confirm WHO-GMP certificate validity and submit to PPB for verification',
    EPRA:     'Submit EPRA energy audit report and product compliance certificate',
    KRA:      'File IDF via KRA iCMS portal and confirm HS code classification',
    NEMA:     'Submit NEMA environmental impact assessment and importation permit',
  }
  const base = actions[regulatorCode] ?? 'Contact regulator to confirm submission requirements'
  if (days <= 3) return `CRITICAL — ${base} TODAY`
  if (days <= 7) return `URGENT — ${base} within ${days} days`
  return `WARNING — ${base} within ${days} days`
}

// ─── Shared runner ───────────────────────────────────────────

async function runAlerts() {
  const resend       = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const EXCHANGE_RATE = await getKesRate()
  const results      = { shipment_alerts: 0, license_alerts: 0, errors: [] as string[] }
  const today        = new Date()
  today.setHours(0, 0, 0, 0)

  // ── Shipment PVoC deadline alerts ──────────────────────────
  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, organization_id, name, reference_number, pvoc_deadline, risk_flag_status, remediation_status, storage_rate_per_day, regulatory_body_id, alert_sent_14d_at, alert_sent_7d_at, alert_sent_3d_at')
    .is('deleted_at', null)
    .not('pvoc_deadline', 'is', null)
    .neq('remediation_status', 'CLOSED')

  for (const s of shipments ?? []) {
    const deadline      = new Date(s.pvoc_deadline)
    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
    if (daysRemaining > 14 || daysRemaining < 0) continue

    // Determine which tier to send (only send each tier once)
    let tier: '3d' | '7d' | '14d' | null = null
    if (daysRemaining <= 3  && !s.alert_sent_3d_at)  tier = '3d'
    else if (daysRemaining <= 7  && !s.alert_sent_7d_at)  tier = '7d'
    else if (daysRemaining <= 14 && !s.alert_sent_14d_at) tier = '14d'
    if (!tier) continue

    // Fetch regulator code
    let regulatorCode = '—'
    if (s.regulatory_body_id) {
      const { data: rb } = await supabaseAdmin
        .from('regulatory_bodies').select('code').eq('id', s.regulatory_body_id).single()
      if (rb) regulatorCode = rb.code
    }

    const dailyKES  = Math.round((s.storage_rate_per_day ?? 0) * EXCHANGE_RATE)
    const estCost   = Math.round(dailyKES * Math.max(7, Math.abs(daysRemaining)))
    const { subject, html } = shipmentAlertEmail({
      name: s.name, reference_number: s.reference_number,
      pvoc_deadline: s.pvoc_deadline, daysRemaining, regulatorCode,
      action: getAction(regulatorCode, daysRemaining),
      storageDailyCostKES: dailyKES, estimatedAdditionalCostKES: estCost,
    })

    if (resend) {
      const { error } = await resend.emails.send({ from: FROM_EMAIL, to: ALERT_EMAIL, subject, html })
      if (error) results.errors.push(`Shipment ${s.name}: ${error.message}`)
    }

    // Log alert to timeline (SYSTEM confidence — auto-fired)
    const levelTag = daysRemaining <= 3 ? 'CRITICAL' : daysRemaining <= 7 ? 'URGENT' : 'WARNING'
    await insertTimelineEvent(supabaseAdmin, {
      shipment_id:     s.id,
      organization_id: s.organization_id,
      event_type:      'ALERT_SENT',
      actor_type:      'SYSTEM',
      actor_label:     'Alert Engine',
      confidence:      'SYSTEM',
      title:           `${levelTag} alert sent — ${daysRemaining}d to deadline`,
      metadata:        { tier, regulator: regulatorCode, days_remaining: daysRemaining, channel: 'EMAIL' },
    })

    // WhatsApp alert — concise 160-char message for mobile
    await sendWhatsApp(
      `[KRUX ${levelTag}] ${s.name} (${s.reference_number})\n` +
      `Regulator: ${regulatorCode} · Deadline: ${daysRemaining}d\n` +
      `Action: ${getAction(regulatorCode, daysRemaining).split(' — ')[1] ?? 'Check compliance portal'}`
    )

    // Mark sent
    const col = tier === '3d' ? 'alert_sent_3d_at' : tier === '7d' ? 'alert_sent_7d_at' : 'alert_sent_14d_at'
    await supabaseAdmin.from('shipments').update({ [col]: new Date().toISOString() }).eq('id', s.id)
    results.shipment_alerts++
  }

  // ── Manufacturer license expiry alerts ─────────────────────
  const { data: licenses } = await supabaseAdmin
    .from('manufacturer_licenses')
    .select('*, manufacturers!inner(company_name, organization_id)')
    .not('expiry_date', 'is', null)

  for (const l of licenses ?? []) {
    const expiry        = new Date(l.expiry_date)
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / 86400000)
    if (daysRemaining > 60 || daysRemaining < 0) continue

    let tier: '7d' | '30d' | '60d' | null = null
    if (daysRemaining <= 7  && !l.alert_7_sent_at)  tier = '7d'
    else if (daysRemaining <= 30 && !l.alert_30_sent_at) tier = '30d'
    else if (daysRemaining <= 60 && !l.alert_60_sent_at) tier = '60d'
    if (!tier) continue

    const { subject, html } = licenseAlertEmail({
      license_name: l.license_name, license_number: l.license_number,
      license_type: l.license_type, issuing_body: l.issuing_body,
      expiry_date: l.expiry_date, daysRemaining, status: l.status,
      manufacturerName: (l.manufacturers as any)?.company_name ?? 'Unknown',
    })

    if (resend) {
      const { error } = await resend.emails.send({ from: FROM_EMAIL, to: ALERT_EMAIL, subject, html })
      if (error) results.errors.push(`License ${l.license_name}: ${error.message}`)
    }

    // WhatsApp alert for license expiry
    const mfr = (l.manufacturers as any)?.company_name ?? 'Manufacturer'
    await sendWhatsApp(
      `[KRUX] LICENSE EXPIRING in ${daysRemaining}d\n` +
      `${l.license_name} · ${mfr}\n` +
      `Issuing body: ${l.issuing_body} · Begin renewal immediately.`
    )

    const col = tier === '7d' ? 'alert_7_sent_at' : tier === '30d' ? 'alert_30_sent_at' : 'alert_60_sent_at'
    await supabaseAdmin.from('manufacturer_licenses').update({ [col]: new Date().toISOString() }).eq('id', l.id)
    results.license_alerts++
  }

  // ── KRA Ruling Watch alerts ────────────────────────────────
  // Fires when a KRA tariff ruling has been flagged on a shipment.
  // Column kra_ruling_flag added in migration 27.
  const { data: rulingShipments } = await supabaseAdmin
    .from('shipments')
    .select('id, organization_id, name, reference_number, hs_code, kra_ruling_notes')
    .eq('kra_ruling_flag', true)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')

  for (const s of rulingShipments ?? []) {
    if (resend) {
      const { error } = await resend.emails.send({
        from: FROM_EMAIL,
        to: ALERT_EMAIL,
        subject: `[KRA RULING] ${s.name} — HS classification under review · KRUX`,
        html: `
<!DOCTYPE html><html><body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:32px 24px;">
  <div style="margin-bottom:24px;">
    <div style="display:inline-block;background:#00C896;color:#0A1628;font-weight:900;font-size:18px;padding:6px 12px;border-radius:8px;">K</div>
    <span style="color:#94A3B8;font-size:13px;margin-left:10px;">KRUX · KRA Ruling Watch</span>
  </div>
  <div style="background:#0F2040;border:1px solid #F59E0B40;border-radius:16px;padding:28px;">
    <div style="display:inline-block;background:#F59E0B20;color:#F59E0B;font-weight:700;font-size:11px;padding:4px 10px;border-radius:20px;border:1px solid #F59E0B40;margin-bottom:16px;letter-spacing:1px;">KRA RULING FLAGGED</div>
    <h1 style="color:white;font-size:20px;font-weight:700;margin:0 0 6px 0;">${s.name}</h1>
    <p style="color:#64748B;font-size:13px;margin:0 0 16px 0;">${s.reference_number} · HS ${s.hs_code ?? 'Not set'}</p>
    <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:16px;margin-bottom:16px;">
      <p style="color:#94A3B8;font-size:13px;margin:0;">${s.kra_ruling_notes ?? 'KRA has flagged this shipment\'s HS code classification for review. You will be referred to the KRA Tariff and Valuation teams. Prepare your HS code defence documentation immediately.'}</p>
    </div>
    <div style="background:#EF444410;border:1px solid #EF444430;border-radius:10px;padding:14px;">
      <p style="color:#EF4444;font-size:11px;font-weight:700;margin:0 0 6px 0;letter-spacing:1px;">ACTION REQUIRED</p>
      <p style="color:#94A3B8;font-size:13px;margin:0;">Contact KRA Mombasa Customs: +254 041 231 0755. Prepare HS code justification, commercial invoice, and product specification. Do not wait — goods may be held pending ruling resolution.</p>
    </div>
  </div>
</div></body></html>`,
      })
      if (error) results.errors.push(`KRA ruling ${s.name}: ${error.message}`)
    }
    await sendWhatsApp(
      `[KRUX] KRA RULING FLAGGED\n${s.name} (${s.reference_number})\nHS ${s.hs_code ?? 'not set'} under review.\nContact KRA Mombasa: +254 041 231 0755 immediately.`
    )
  }

  return {
    ok: true,
    sent: { shipments: results.shipment_alerts, licenses: results.license_alerts, kra_rulings: (rulingShipments ?? []).length },
    errors: results.errors,
  }
}

// ─── POST — manual trigger from dashboard ────────────────────

export async function POST() {
  const result = await runAlerts()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}

// ─── GET — Vercel Cron (runs at 06:00 EAT daily) ─────────────

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runAlerts()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}
