import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getRegulator, getWindowStatus } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function sendWhatsApp(to: string, body: string): Promise<void> {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM
  if (!sid || !token || !from || !to) return
  const params = new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: body })
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
    const dateStr  = today.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })
    const liveRate = await getKesRate()
    const appUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

    // ── Get all active orgs ──
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)

    if (!orgs?.length) return NextResponse.json({ ok: true, skipped: 'No active orgs' })

    const results: any[] = []

    for (const org of orgs) {
      if (org.name === 'KRUX Demo') continue

      // Users with WhatsApp numbers for this org
      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('whatsapp_number')
        .eq('organization_id', org.id)

      const orgNumbers = (profiles ?? []).map((p: any) => p.whatsapp_number).filter(Boolean)
      const founderNumber = process.env.ALERT_WHATSAPP_TO
      const recipients = founderNumber
        ? [...new Set([...orgNumbers, founderNumber])]
        : orgNumbers

      if (recipients.length === 0) continue

      // Active shipments for this org
      const { data: shipments } = await supabaseAdmin
        .from('shipments')
        .select(`
          id, name, pvoc_deadline, eta, risk_flag_status, remediation_status,
          cif_value_usd, regulatory_body_id,
          regulatory_bodies!regulatory_body_id(code)
        `)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .neq('remediation_status', 'CLOSED')

      if (!shipments?.length) continue

      // Pending actions for this org's shipments
      const shipmentIds = shipments.map((s: any) => s.id)
      const { data: actions } = await supabaseAdmin
        .from('actions')
        .select('shipment_id, title, status')
        .in('shipment_id', shipmentIds)
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .order('created_at', { ascending: true })
        .limit(20)

      // Enrich with window status and urgency
      const enriched = shipments.map((s: any) => {
        const regCode    = s.regulatory_bodies?.code ?? null
        const regProfile = regCode ? getRegulator('KE', regCode) : null
        const ws         = getWindowStatus({ pvoc_deadline: s.pvoc_deadline, eta: s.eta }, regProfile ?? null)
        const deadline   = s.pvoc_deadline || s.eta
        const daysLeft   = deadline
          ? Math.ceil((new Date(deadline).getTime() - today.getTime()) / 86400000)
          : 999

        let urgency: 'CRITICAL' | 'URGENT' | 'WATCH' | 'OK' = 'OK'
        if (ws?.status === 'IMPOSSIBLE')  urgency = 'CRITICAL'
        else if (ws?.status === 'TIGHT')  urgency = 'URGENT'
        else if (daysLeft <= 3)           urgency = 'CRITICAL'
        else if (daysLeft <= 7)           urgency = 'URGENT'
        else if (daysLeft <= 14)          urgency = 'WATCH'

        const nextAction = (actions ?? []).find((a: any) => a.shipment_id === s.id)

        return { name: s.name, regCode: regCode ?? '—', daysLeft, urgency, ws, nextAction }
      }).sort((a: any, b: any) => {
        const o = { CRITICAL: 0, URGENT: 1, WATCH: 2, OK: 3 }
        return (o[a.urgency as keyof typeof o] ?? 3) - (o[b.urgency as keyof typeof o] ?? 3)
      })

      const atRisk = enriched.filter((s: any) => s.urgency !== 'OK')
      if (atRisk.length === 0) continue

      // Build "what do I do today" hit list — max 3 items
      const hitList = atRisk.slice(0, 3).map((s: any) => {
        if (s.nextAction) return `• ${s.name}: ${s.nextAction.title}`
        if (s.ws?.status === 'IMPOSSIBLE') return `• ${s.name}: FILE with ${s.regCode} NOW (${s.ws.daysShort}d overdue)`
        if (s.ws?.status === 'TIGHT')      return `• ${s.name}: Submit ${s.regCode} docs — ${s.ws.daysShort}d buffer left`
        return `• ${s.name}: Follow up ${s.regCode} — ${s.daysLeft}d left`
      })

      const windowAlerts = enriched
        .filter((s: any) => s.ws?.status === 'IMPOSSIBLE' || s.ws?.status === 'TIGHT')
        .map((s: any) => s.ws?.status === 'IMPOSSIBLE'
          ? `⛔ ${s.name} — window CLOSED (${s.ws.daysShort}d short)`
          : `⚠️ ${s.name} — window TIGHT (${s.ws.daysShort}d buffer)`
        )

      const critical = enriched.filter((s: any) => s.urgency === 'CRITICAL')

      const prompt = `Write a WhatsApp morning brief. Plain text. Under 900 characters. No markdown.

DATE: ${dateStr} | RATE: 1 USD = KES ${liveRate}

TODAY'S HIT LIST:
${hitList.join('\n')}

${windowAlerts.length > 0 ? 'WINDOW ALERTS:\n' + windowAlerts.join('\n') : ''}

FORMAT — use exactly this structure:
KRUX 6:30am — ${dateStr}
Rate: 1 USD = KES ${liveRate}

TODAY — do these now:
[hit list, one per line]
${windowAlerts.length > 0 ? '\n[window alerts]\n' : ''}
${critical.length > 0 ? '[one sentence: most critical thing before 10am]' : ''}
${appUrl}/dashboard`

      const msg = await claude.messages.create({
        model:      'claude-sonnet-4-6',
        max_tokens: 350,
        system:     'You are KRUX. Write WhatsApp morning briefs for clearing agents. Plain text only. Direct. No pleasantries. No markdown symbols.',
        messages:   [{ role: 'user', content: prompt }],
      })

      const briefText = (msg.content[0] as { text: string }).text

      for (const number of recipients) {
        await sendWhatsApp(number, briefText)
      }

      results.push({
        org:          org.name,
        recipients:   recipients.length,
        atRisk:       atRisk.length,
        hitListItems: hitList.length,
        windows:      windowAlerts.length,
      })
    }

    return NextResponse.json({ ok: true, sent: results.length > 0, orgs: results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
