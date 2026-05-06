import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getRegulator, getWindowStatus } from '@/lib/regulatory-intelligence'

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

// ─── GET — Vercel Cron (12:30pm EAT = 09:30 UTC, weekdays) ────
// Only fires for orgs with CRITICAL shipments (daysLeft ≤ 3 or IMPOSSIBLE window)
// No AI — plain template message. Acts as a nudge for items unactioned since 6:30am brief.

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const today  = new Date()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('id, name')
      .eq('is_active', true)

    if (!orgs?.length) return NextResponse.json({ ok: true, skipped: 'No active orgs' })

    const results: any[] = []

    for (const org of orgs) {
      if (org.name === 'KRUX Demo') continue

      const { data: profiles } = await supabaseAdmin
        .from('user_profiles')
        .select('whatsapp_number')
        .eq('organization_id', org.id)

      const orgNumbers    = (profiles ?? []).map((p: any) => p.whatsapp_number).filter(Boolean)
      const founderNumber = process.env.ALERT_WHATSAPP_TO
      const recipients    = founderNumber
        ? [...new Set([...orgNumbers, founderNumber])]
        : orgNumbers

      if (recipients.length === 0) continue

      const { data: shipments } = await supabaseAdmin
        .from('shipments')
        .select(`
          id, name, pvoc_deadline, eta,
          regulatory_bodies!regulatory_body_id(code)
        `)
        .eq('organization_id', org.id)
        .is('deleted_at', null)
        .neq('remediation_status', 'CLOSED')

      if (!shipments?.length) continue

      // Filter to CRITICAL only — IMPOSSIBLE window OR ≤ 3 days left
      const critical: { name: string; regCode: string; daysLeft: number; reason: string }[] = []

      for (const s of shipments) {
        const regCode    = (s as any).regulatory_bodies?.code ?? null
        const regProfile = regCode ? getRegulator('KE', regCode) : null
        const ws         = getWindowStatus({ pvoc_deadline: s.pvoc_deadline, eta: s.eta }, regProfile ?? null)
        const deadline   = s.pvoc_deadline || s.eta
        const daysLeft   = deadline
          ? Math.ceil((new Date(deadline).getTime() - today.getTime()) / 86400000)
          : 999

        if (ws?.status === 'IMPOSSIBLE') {
          critical.push({ name: s.name, regCode: regCode ?? '—', daysLeft, reason: `window closed (${ws.daysShort}d short)` })
        } else if (daysLeft <= 3) {
          critical.push({ name: s.name, regCode: regCode ?? '—', daysLeft, reason: `${daysLeft}d remaining` })
        }
      }

      if (critical.length === 0) continue

      // Check if any of these still have unactioned pending items
      const criticalIds = shipments
        .filter(s => critical.some(c => c.name === s.name))
        .map(s => s.id)

      const { data: pendingActions } = await supabaseAdmin
        .from('actions')
        .select('shipment_id')
        .in('shipment_id', criticalIds)
        .in('status', ['PENDING', 'IN_PROGRESS'])
        .limit(1)

      // Only remind if there are still open actions (something to act on)
      if (!pendingActions?.length) continue

      const lines = critical.map(c => `⛔ ${c.name} (${c.regCode}) — ${c.reason}`)

      const message = [
        `KRUX 12:30pm — Action Required`,
        ``,
        `These critical shipments still need action:`,
        ...lines,
        ``,
        `Don't let these slip past today.`,
        appUrl + '/dashboard/actions',
      ].join('\n')

      for (const number of recipients) {
        await sendWhatsApp(number, message)
      }

      results.push({ org: org.name, critical: critical.length, recipients: recipients.length })
    }

    return NextResponse.json({ ok: true, sent: results.length > 0, orgs: results })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
