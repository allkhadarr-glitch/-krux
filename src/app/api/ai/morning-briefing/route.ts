import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionContext } from '@/lib/session'
import { calcExposure } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { email, orgId } = await getSessionContext(req)
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { shipments } = await req.json() as { shipments: any[] }
    if (!Array.isArray(shipments) || shipments.length === 0) {
      return NextResponse.json({ result: 'No active shipments to brief.' })
    }

    const today   = new Date()
    const dateStr = today.toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const liveRate = await getKesRate()

    // Enrich each shipment with days remaining and exposure
    const enriched = shipments
      .filter((s) => s.remediation_status !== 'CLOSED')
      .map((s) => {
        const deadline      = s.pvoc_deadline ? new Date(s.pvoc_deadline) : null
        const daysRemaining = deadline ? Math.ceil((deadline.getTime() - today.getTime()) / 86400000) : null
        const regCode       = s.regulatory_body?.code ?? s.regulatory_body ?? '—'
        const exposure      = daysRemaining != null && Number(s.cif_value_usd) > 0
          ? calcExposure({
              cif_value_usd:            Number(s.cif_value_usd),
              storage_rate_per_day_usd: Number(s.storage_rate_per_day ?? 50),
              days_at_risk:             Math.max(0, 14 - Math.max(0, daysRemaining)),
              regulator_code:           regCode,
              usd_rate_override:        liveRate,
            })
          : null

        let urgency: 'CRITICAL' | 'URGENT' | 'WATCH' | 'ON_TRACK' = 'ON_TRACK'
        if (daysRemaining != null) {
          if (daysRemaining <= 3)  urgency = 'CRITICAL'
          else if (daysRemaining <= 7)  urgency = 'URGENT'
          else if (daysRemaining <= 14) urgency = 'WATCH'
        }

        return { ...s, daysRemaining, regCode, exposure, urgency }
      })
      .sort((a, b) => {
        const order = { CRITICAL: 0, URGENT: 1, WATCH: 2, ON_TRACK: 3 }
        return (order[a.urgency as keyof typeof order] ?? 3) - (order[b.urgency as keyof typeof order] ?? 3)
      })

    const critical   = enriched.filter((s) => s.urgency === 'CRITICAL')
    const urgent     = enriched.filter((s) => s.urgency === 'URGENT')
    const watch      = enriched.filter((s) => s.urgency === 'WATCH')
    const onTrack    = enriched.filter((s) => s.urgency === 'ON_TRACK')
    const totalKESAtRisk = enriched.reduce((sum, s) => sum + (s.exposure?.total_kes ?? 0), 0)

    const shipmentSummary = enriched.map((s) =>
      `- ${s.name} | ${s.regCode} | ${s.daysRemaining != null ? `${s.daysRemaining}d remaining` : 'No deadline'} | ${s.urgency} | KES ${(s.exposure?.total_kes ?? 0).toLocaleString()} at risk`
    ).join('\n')

    const prompt = `Generate a morning briefing for a Kenya import clearing agent.

DATE: ${dateStr}
USER: ${email}

SHIPMENT SUMMARY:
${shipmentSummary}

COUNTS:
- Critical (≤3 days): ${critical.length} shipments
- Urgent (≤7 days): ${urgent.length} shipments
- Watch (≤14 days): ${watch.length} shipments
- On track: ${onTrack.length} shipments
- Total KES at risk: KES ${totalKESAtRisk.toLocaleString()}

Generate a daily briefing in THIS EXACT FORMAT — plain text only, no markdown:

KRUX DAILY BRIEF — ${dateStr}

[One opening line. Direct statement of what today looks like. Not "Good morning." Just the facts.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${critical.length > 0 ? `
CRITICAL — ${critical.length} shipment${critical.length !== 1 ? 's' : ''} — act before noon

[For each critical shipment:]
  • [Shipment name] ([Regulator] · [X] days)
    [One sentence: what's missing or what needs to happen]
    → [Specific action with portal URL or phone]
` : ''}
${urgent.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

URGENT — ${urgent.length} shipment${urgent.length !== 1 ? 's' : ''}

[For each urgent shipment:]
  • [Shipment name] ([Regulator] · [X] days)
    [One sentence: what needs to happen this week]
    → [Specific next action]
` : ''}
${watch.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WATCH — ${watch.length} shipment${watch.length !== 1 ? 's' : ''}

[For each watch shipment — brief, one line each]
  • [Name] ([Regulator] · [X] days) — [one action or status]
` : ''}
${onTrack.length > 0 ? `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ON TRACK — ${onTrack.length} shipment${onTrack.length !== 1 ? 's' : ''}
[List names only, one line per shipment, with regulator and days]
` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TOTAL EXPOSURE TODAY: KES ${totalKESAtRisk.toLocaleString()}

[If critical shipments exist: one final line telling the agent the single most important thing to do in the next 2 hours.]`

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1000,
      system:     'You are KRUX — Kenya\'s import compliance intelligence system. You generate daily briefings for clearing agents. Be direct, specific, and actionable. Use plain text. No pleasantries. Every word earns its place.',
      messages:   [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({
      result: (message.content[0] as { text: string }).text,
      stats: {
        critical:  critical.length,
        urgent:    urgent.length,
        watch:     watch.length,
        on_track:  onTrack.length,
        total_kes: totalKESAtRisk,
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate briefing' }, { status: 500 })
  }
}
