import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { calcExposure } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendWhatsApp(body: string): Promise<void> {
  const sid  = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM
  const to    = process.env.ALERT_WHATSAPP_TO ? `whatsapp:${process.env.ALERT_WHATSAPP_TO}` : ''

  if (!sid || !token || !from || !to) return

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

// ─── GET — Vercel Cron (6:30am EAT = 03:30 UTC, weekdays) ────

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today    = new Date()
    const dateStr  = today.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const liveRate = await getKesRate()

    // Fetch all active shipments (non-demo, non-closed)
    const { data: shipments, error } = await supabaseAdmin
      .from('shipments')
      .select(`
        id, name, pvoc_deadline, risk_flag_status, remediation_status,
        cif_value_usd, storage_rate_per_day,
        regulatory_bodies!regulatory_body_id(code)
      `)
      .is('deleted_at', null)
      .neq('remediation_status', 'CLOSED')
      .not('pvoc_deadline', 'is', null)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!shipments || shipments.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'No active shipments' })
    }

    // Enrich with urgency and exposure
    const enriched = shipments.map((s) => {
      const deadline      = new Date(s.pvoc_deadline)
      const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / 86400000)
      const regCode       = (s.regulatory_bodies as any)?.code ?? '—'
      const exposure      = Number(s.cif_value_usd) > 0
        ? calcExposure({
            cif_value_usd:            Number(s.cif_value_usd),
            storage_rate_per_day_usd: Number(s.storage_rate_per_day ?? 50),
            days_at_risk:             Math.max(0, 14 - Math.max(0, daysRemaining)),
            regulator_code:           regCode,
            usd_rate_override:        liveRate,
          })
        : null

      let urgency: 'CRITICAL' | 'URGENT' | 'WATCH' | 'ON_TRACK' = 'ON_TRACK'
      if (daysRemaining <= 3)  urgency = 'CRITICAL'
      else if (daysRemaining <= 7)  urgency = 'URGENT'
      else if (daysRemaining <= 14) urgency = 'WATCH'

      return { ...s, daysRemaining, regCode, exposure, urgency }
    }).sort((a, b) => {
      const order = { CRITICAL: 0, URGENT: 1, WATCH: 2, ON_TRACK: 3 }
      return (order[a.urgency] ?? 3) - (order[b.urgency] ?? 3)
    })

    const critical  = enriched.filter((s) => s.urgency === 'CRITICAL')
    const urgent    = enriched.filter((s) => s.urgency === 'URGENT')
    const watch     = enriched.filter((s) => s.urgency === 'WATCH')
    const onTrack   = enriched.filter((s) => s.urgency === 'ON_TRACK')
    const totalKES  = enriched.reduce((sum, s) => sum + (s.exposure?.total_kes ?? 0), 0)

    // Skip send if nothing urgent today
    if (critical.length === 0 && urgent.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'No critical/urgent shipments today', watch: watch.length, on_track: onTrack.length })
    }

    const shipmentSummary = enriched.map((s) =>
      `- ${s.name} | ${s.regCode} | ${s.daysRemaining}d remaining | ${s.urgency} | KES ${(s.exposure?.total_kes ?? 0).toLocaleString()} at risk`
    ).join('\n')

    const prompt = `Generate a morning briefing for a Kenya import clearing agent.

DATE: ${dateStr}
USD/KES rate today: ${liveRate}

SHIPMENT SUMMARY:
${shipmentSummary}

COUNTS:
- Critical (≤3 days): ${critical.length} shipments
- Urgent (≤7 days): ${urgent.length} shipments
- Watch (≤14 days): ${watch.length} shipments
- On track: ${onTrack.length} shipments
- Total KES at risk: KES ${totalKES.toLocaleString()}

Generate a daily briefing in THIS EXACT FORMAT — plain text only, no markdown:

KRUX DAILY BRIEF — ${dateStr}

[One opening line. Direct statement of what today looks like. Not "Good morning." Just the facts.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${critical.length > 0 ? `
CRITICAL — ${critical.length} shipment${critical.length !== 1 ? 's' : ''} — act before noon

[For each critical shipment:]
  • [Shipment name] ([Regulator] · [X] days)
    [One sentence: what needs to happen TODAY]
    → [Specific action with portal URL]
` : ''}
${urgent.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URGENT — ${urgent.length} shipment${urgent.length !== 1 ? 's' : ''}

[For each urgent shipment:]
  • [Shipment name] ([Regulator] · [X] days)
    → [Specific next action]
` : ''}
${watch.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WATCH — ${watch.length} shipment${watch.length !== 1 ? 's' : ''}
[Brief, one line each]
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL EXPOSURE: KES ${totalKES.toLocaleString()}

[If critical shipments exist: the single most important action in the next 2 hours.]`

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 800,
      system:     'You are KRUX — Kenya\'s import compliance intelligence system. Generate daily briefings for clearing agents. Be direct, specific, actionable. Plain text only. No pleasantries.',
      messages:   [{ role: 'user', content: prompt }],
    })

    const briefText = (message.content[0] as { text: string }).text

    // Send via WhatsApp (truncated for SMS-style delivery)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'
    const whatsappText = briefText.length > 1500
      ? briefText.slice(0, 1450) + `\n\n[Full brief at ${appUrl}/dashboard]`
      : briefText

    await sendWhatsApp(whatsappText)

    return NextResponse.json({
      ok:      true,
      sent:    true,
      stats:   { critical: critical.length, urgent: urgent.length, watch: watch.length, on_track: onTrack.length, total_kes: totalKES },
    })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
