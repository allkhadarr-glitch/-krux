import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { getRegulator } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getSessionContext(req)
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { goods, origin, regulator, target_eta } = await req.json()
    if (!regulator || !target_eta) {
      return NextResponse.json({ error: 'regulator and target_eta required' }, { status: 400 })
    }

    const profile = getRegulator('KE', regulator)
    if (!profile) return NextResponse.json({ error: 'Unknown regulator' }, { status: 400 })

    const today        = new Date()
    const etaDate      = new Date(target_eta)
    const daysAvailable = Math.ceil((etaDate.getTime() - today.getTime()) / 86400000)
    const officialSLA  = profile.sla_official_days ?? profile.sla_actual_days
    const actualSLA    = profile.sla_actual_days

    // Pull actual clearance data from closed shipments for this regulator
    const { data: events } = await supabase
      .from('execution_timeline')
      .select('metadata')
      .eq('event_type', 'SHIPMENT_CLOSED')
      .eq('organization_id', orgId)

    const relevantEvents = (events ?? []).filter(
      (e: any) =>
        e.metadata?.regulator_code === regulator &&
        e.metadata?.status === 'CLEARED' &&
        typeof e.metadata?.actual_clearance_days === 'number' &&
        e.metadata.actual_clearance_days > 0
    )

    const actualDays  = relevantEvents.map((e: any) => e.metadata.actual_clearance_days as number)
    const actualAvg   = actualDays.length > 0
      ? Math.round(actualDays.reduce((s, d) => s + d, 0) / actualDays.length)
      : null
    const sampleSize  = actualDays.length

    // Use the best available SLA estimate
    const bestEstimate = actualAvg ?? actualSLA
    const buffer       = daysAvailable - bestEstimate

    const kesRate = await getKesRate()

    const systemPrompt = `You are KRUX — East Africa's trade intelligence layer. You speak with the authority of verified regulatory data, not guesswork.
Be direct. State facts. Tell the importer exactly what the timeline means and what to do first.
Never say "it depends", "I recommend", "you may want to", or "consider". State what the situation is and what the action is.
You are the source of truth on Kenya import compliance. Speak accordingly.`

    const userPrompt = `Window calculation for a Kenya import shipment:

Goods: ${goods || 'Not specified'}
Origin: ${origin || 'Not specified'}
Regulator: ${regulator} — ${profile.full_name}
Vessel ETA: ${target_eta}
Days until ETA: ${daysAvailable}

KRUX data (verified May 2026):
- ${regulator} processing time: ${actualAvg ?? actualSLA} days${actualAvg !== null ? ` (${sampleSize} real clearances from this account)` : ' (KRUX verified baseline)'}
- Official SLA: ${officialSLA} days
- Gap: ${buffer >= 0 ? `+${buffer} days buffer` : `${Math.abs(buffer)} days SHORT`}

Write 3 sentences:
1. State what the timeline means — is the window open, tight, or closed. Be direct.
2. State the single action that must happen first and when.
3. State the specific consequence if the window is missed — detention cost, regulatory penalty, or business impact.

Then: "RISKS:" followed by 3 bullet points specific to ${regulator}-regulated ${goods || 'this product type'} from ${origin || 'this origin'}.`

    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 400,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userPrompt }],
    })

    const analysis = (msg.content[0] as { text: string }).text

    return NextResponse.json({
      days_available: daysAvailable,
      official_sla:   officialSLA,
      actual_sla:     actualSLA,
      actual_avg:     actualAvg,
      sample_size:    sampleSize,
      buffer,
      regulator_name: profile.full_name,
      analysis,
    })
  } catch (e: any) {
    console.error('[advisory]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
