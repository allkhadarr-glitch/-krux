import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionContext } from '@/lib/session'
import { buildRegulatoryContext } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Demo hardcoded remediation steps ────────────────────────

const DEMO_STEPS: Record<string, string> = {
  'Pyrethroid Pesticide — Lot P2024': `REMEDIATION STEPS — Pyrethroid Pesticide · KEPHIS

TODAY (Day 0 — Non-negotiable)

  1. File KEPHIS phytosanitary certificate application
     Portal: kephis.org/eservices → Import Permits
     Required: origin phytosanitary cert + CoA from Gujarat Agrochem
     Time to complete: 20 minutes online

  2. Request phytosanitary certificate from Gujarat Agrochem
     This must come from PPQS (Plant Protection & Quarantine, India)
     Email: compliance@gujaratagrochem.in
     Ask for same-day digital copy — they can provide it

DAY 1

  3. Confirm KEPHIS application receipt — get reference number
     No reference = not in queue. Call: +254 020 318 3000
     Do not assume the application was received

  4. Brief your clearing agent with the KEPHIS reference number
     They need it to coordinate port-side paperwork

DAY 2

  5. Escalate if no KEPHIS processing confirmation
     File KRA demurrage waiver application immediately
     Contact: KRA Mombasa Customs: +254 041 231 0755
     Estimated exposure if deadline slips: KES 160,200`,

  'Amoxicillin 500mg — Batch K23B': `REMEDIATION STEPS — Amoxicillin 500mg · PPB

TODAY (Day 0)

  1. File PPB application form PPB/IMP/2024 immediately
     Portal: eprocurement.ppb.go.ke
     Required: CoA, WHO-GMP cert, product dossier
     Note: PPB needs 45 days minimum. Filing today limits exposure.

  2. Request CoA + WHO-GMP certificate from Zhejiang Pharma Co. Ltd
     Turnaround from China: 2–5 business days
     Contact: regulatory@zhejiangpharma.cn

DAYS 1–3

  3. Submit WHO-GMP certificate to PPB verification desk
     PPB will not begin processing without verified manufacturer cert
     Drop off physically at PPB Upper Hill offices if needed

  4. Brief management on delay scenario
     PPB cannot expedite pharmaceuticals — 45 days is a hard floor
     Begin KPA storage facility negotiation today
     Storage estimate: KES 216,450 for 37-day delay

DAY 5+

  5. Assign a PPB relationship contact
     Get the name of the inspector assigned to the dossier
     Direct line accelerates follow-ups significantly
     PPB general: +254 020 272 4060`,

  'NPK Fertilizer 20-10-10 — 50MT': `REMEDIATION STEPS — NPK Fertilizer 20-10-10 · PCPB

THIS WEEK (before the 22-day window collapses)

  1. Submit PCPB pesticide registration documents
     Portal: pcpb.or.ke → Import Registration
     Required: efficacy data, SDS, English-language label copy
     Processing time: 14–21 days — submit this week without fail

  2. Confirm PCPB application and get tracking number
     Call PCPB: +254 020 271 2540 if online confirmation is delayed

  3. Verify clearing agent has PCPB tracking number
     They need it for KPA coordination

ONGOING

  4. Monitor PCPB review status every 3 days
     Any queries from PCPB add 3–5 days to processing
     Respond same-day to any PCPB requests

  5. Book inspection slot once PCPB confirms review stage
     PCPB physical inspection at port takes 1–2 days
     Book at least 5 days before deadline`,

  'LED Panel Lighting Kit — CR2024': `REMEDIATION STEPS — LED Panel Lighting Kit · KEBS

THIS WEEK

  1. Request IEC 60598-1 test report from Shenzhen manufacturer
     QC department typically has this on file
     If not available: arrange lab testing before shipment (allow 5–7 days)

  2. File KEBS pre-export verification request
     Portal: kebs.org/services/pre-export-verification
     Attach IEC report, commercial invoice, product specs

  3. Confirm KEBS application and get processing reference

ONGOING

  4. Schedule KEBS review check-in at day 30 from application
     Standard processing: 30 days — you have 45 days remaining

  5. No further action required if steps 1–3 complete this week
     This shipment is on track for on-time clearance`,
}

const DEMO_DEFAULT = DEMO_STEPS['Pyrethroid Pesticide — Lot P2024']

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()

    const { email } = await getSessionContext(req)
    if (email === process.env.DEMO_USER_EMAIL) {
      const steps = DEMO_STEPS[shipment.name as string] ?? DEMO_DEFAULT
      return NextResponse.json({ result: steps })
    }

    const deadline      = shipment.pvoc_deadline ? new Date(shipment.pvoc_deadline) : null
    const daysRemaining = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null

    const liveRate = await getKesRate()
    const systemPrompt = buildRegulatoryContext(shipment.regulatory_body ?? '', 'KE', liveRate)

    const urgencyContext = daysRemaining != null
      ? daysRemaining <= 3
        ? 'CRITICAL — deadline in 3 days or less. Every step must be achievable TODAY.'
        : daysRemaining <= 7
        ? 'URGENT — deadline within 7 days. Sequence steps by day.'
        : daysRemaining <= 14
        ? 'WARNING — deadline within 14 days. Sequence steps by day and week.'
        : 'STANDARD — adequate time if action starts immediately.'
      : 'Timeline unknown — default to urgent posture.'

    const userMessage = `Generate time-sequenced remediation steps for this Kenya import shipment.

SHIPMENT DATA:
Name: ${shipment.name}
Regulator: ${shipment.regulatory_body}
CIF Value: USD ${Number(shipment.cif_value_usd ?? 0).toLocaleString()}
PVoC Deadline: ${shipment.pvoc_deadline ?? 'Not set'}
Days Remaining: ${daysRemaining != null ? `${daysRemaining} days` : 'Unknown'}
Risk Status: ${shipment.risk_flag_status ?? 'AMBER'}
Origin Port: ${shipment.origin_port ?? 'Unknown'}
HS Code: ${shipment.hs_code ?? 'Not provided'}
Product: ${shipment.product_description ?? shipment.name}

URGENCY LEVEL: ${urgencyContext}

FORMAT EXACTLY AS FOLLOWS — plain text, no markdown:

REMEDIATION STEPS — [Shipment Name] · [Regulator]

[Group steps by time horizon. Use TODAY / DAY 1 / DAYS 2-3 / THIS WEEK / ONGOING as section headers]

  [Step number]. [Specific action — verb first]
     [Portal URL or phone number from regulator profile]
     [What is required to complete this step]
     [Expected time to complete or turnaround]
     [What happens if this step is skipped or delayed]

[Include 5-7 steps total]
[First step must be completable TODAY, right now]
[Include specific contact details (phone, email, portal) from the regulatory intelligence]
[Final step should address the "what if it slips" scenario]
[If clearance is mathematically impossible in the remaining time, say so clearly in the first step and pivot to cost mitigation steps]`

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 900,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch {
    return NextResponse.json({ error: 'Failed to generate steps' }, { status: 500 })
  }
}
