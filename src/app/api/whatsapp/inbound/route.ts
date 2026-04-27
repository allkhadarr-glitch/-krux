import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function twiml(msg: string) {
  const safe = msg.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${safe}</Message></Response>`,
    { headers: { 'Content-Type': 'text/xml' } }
  )
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

// ── Command handlers ──────────────────────────────────────────

async function handleStatus(orgId: string): Promise<string> {
  const kesRate = await getKesRate()

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('name, reference_number, pvoc_deadline, risk_flag_status, remediation_status, storage_rate_per_day, regulatory_body_id')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')
    .not('pvoc_deadline', 'is', null)

  if (!shipments?.length) return '✅ No active shipments with deadlines.'

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code')
  const bodyById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b.code]))

  const enriched = shipments
    .map((s: any) => ({
      ...s,
      days: daysUntil(s.pvoc_deadline),
      reg:  bodyById[s.regulatory_body_id] ?? '—',
    }))
    .sort((a: any, b: any) => a.days - b.days)

  const critical = enriched.filter((s: any) => s.days <= 3)
  const urgent   = enriched.filter((s: any) => s.days > 3 && s.days <= 7)
  const watch    = enriched.filter((s: any) => s.days > 7 && s.days <= 14)

  const lines: string[] = [`🇰🇪 KRUX STATUS — ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`]

  if (critical.length) {
    lines.push(`\n🔴 CRITICAL (act today)`)
    critical.forEach((s: any) => {
      const cost = Math.round((s.storage_rate_per_day ?? 50) * kesRate * Math.max(7, s.days))
      lines.push(`• ${s.name}\n  ${s.reg} · ${s.days}d · KES ${cost.toLocaleString()} at risk\n  Ref: ${s.reference_number}`)
    })
  }

  if (urgent.length) {
    lines.push(`\n🟡 URGENT`)
    urgent.forEach((s: any) => lines.push(`• ${s.name} — ${s.reg} · ${s.days}d`))
  }

  if (watch.length) {
    lines.push(`\n👁 WATCH`)
    watch.forEach((s: any) => lines.push(`• ${s.name} — ${s.days}d`))
  }

  if (!critical.length && !urgent.length) lines.push('\n✅ Nothing critical. All shipments on track.')

  lines.push(`\nReply "done [ref]" to mark submitted or "snooze [ref] [days]" to pause alerts.`)
  return lines.join('\n')
}

async function handleDone(orgId: string, ref: string): Promise<string> {
  const { data: shipment } = await supabaseAdmin
    .from('shipments')
    .select('id, name, organization_id')
    .eq('organization_id', orgId)
    .ilike('reference_number', `%${ref.toUpperCase()}%`)
    .is('deleted_at', null)
    .single()

  if (!shipment) return `❌ Couldn't find shipment with reference "${ref}". Check the ref and try again.`

  // Create a FOLLOW_UP action and mark IN_PROGRESS as a proxy for "I did this"
  await supabaseAdmin.from('actions').insert({
    organization_id: orgId,
    shipment_id:     shipment.id,
    action_type:     'FOLLOW_UP',
    title:           'Portal submission confirmed via WhatsApp',
    description:     `Operator replied "done" via WhatsApp — marking portal submission confirmed.`,
    status:          'COMPLETED',
    priority:        'MEDIUM',
    completed_at:    new Date().toISOString(),
  })

  return `✅ Marked "${shipment.name}" submission confirmed.\nOpen the app to update portal status and close out the shipment.`
}

async function handleSnooze(orgId: string, ref: string, days: number): Promise<string> {
  const snoozeUntil = new Date(Date.now() + days * 86400000).toISOString()

  const { data: shipment } = await supabaseAdmin
    .from('shipments')
    .select('id, name, organization_id')
    .eq('organization_id', orgId)
    .ilike('reference_number', `%${ref.toUpperCase()}%`)
    .is('deleted_at', null)
    .single()

  if (!shipment) return `❌ Couldn't find shipment "${ref}".`

  // Clear the alert timestamp so it re-fires after snooze period
  await supabaseAdmin
    .from('shipments')
    .update({ alert_sent_3d_at: null, alert_sent_7d_at: null })
    .eq('id', shipment.id)

  return `⏸ Snoozed alerts for "${shipment.name}" for ${days} day${days !== 1 ? 's' : ''}.\nYou'll get a new alert on ${new Date(snoozeUntil).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}.`
}

async function handleHelp(): Promise<string> {
  return [
    '🇰🇪 KRUX WhatsApp Commands',
    '',
    'status — Today\'s shipment triage',
    'done [ref] — Mark shipment submitted (e.g. done KRUX-2026-0001)',
    'snooze [ref] [days] — Pause alerts (e.g. snooze KRUX-2026-0001 3)',
    'help — Show this menu',
    '',
    `Dashboard: ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'}`,
  ].join('\n')
}

// ── Route handler ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // Twilio sends form-encoded body
  const text = await req.text()
  const params = new URLSearchParams(text)
  const from = params.get('From') ?? ''   // whatsapp:+254700000000
  const body = (params.get('Body') ?? '').trim()

  if (!from || !body) return twiml('Unrecognised request.')

  // Strip "whatsapp:" prefix
  const phone = from.replace(/^whatsapp:/, '')

  // Look up which org this number belongs to (user_profiles has whatsapp_number)
  const { data: user } = await supabaseAdmin
    .from('user_profiles')
    .select('organization_id')
    .eq('whatsapp_number', phone)
    .single()

  if (!user) {
    return twiml(
      `👋 Your number isn't linked to a KRUX account.\nSign up at ${process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'} and add your WhatsApp number in Settings.`
    )
  }

  const orgId = user.organization_id
  const cmd   = body.toLowerCase()

  let reply: string

  if (cmd === 'status' || cmd === 's' || cmd === 'brief') {
    reply = await handleStatus(orgId)
  } else if (cmd.startsWith('done ')) {
    const ref = cmd.slice(5).trim()
    reply = await handleDone(orgId, ref)
  } else if (cmd.startsWith('snooze ')) {
    const parts = cmd.slice(7).trim().split(/\s+/)
    const ref  = parts[0]
    const days = parseInt(parts[1] ?? '1', 10)
    reply = await handleSnooze(orgId, ref, isNaN(days) ? 1 : Math.min(days, 30))
  } else {
    reply = await handleHelp()
  }

  return twiml(reply)
}
