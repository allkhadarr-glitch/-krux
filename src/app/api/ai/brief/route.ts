import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionContext } from '@/lib/session'
import { buildRegulatoryContext, calcExposure, getRegulator } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Demo hardcoded briefs ────────────────────────────────────

const DEMO_BRIEFS: Record<string, string> = {
  'Pyrethroid Pesticide — Lot P2024': `COMPLIANCE BRIEF
Pyrethroid Pesticide — Lot P2024
KRUX · KEPHIS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION

PVoC deadline: 3 days.
Shipment is AT PORT in Mombasa.
Phytosanitary certificate: NOT FILED.

At current trajectory, this shipment will not clear on time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL EXPOSURE

Storage (KES 4,940/day × 3 days)       KES    14,820
Port detention if deadline missed        KES    34,580
Penalty — 2% CIF after day 7            KES    98,800
KEPHIS re-inspection fee                 KES    12,000
─────────────────────────────────────────────────────
Total exposure if no action today        KES   160,200

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S MISSING

  ✗  Phytosanitary certificate — not filed
     KEPHIS will not begin processing without origin
     country phytosanitary documentation.

  ✗  Certificate of Analysis (CoA) — not uploaded
     Required from Gujarat Agrochem Industries.

  ✗  Clearing agent not briefed on KEPHIS timeline
     If they're not moving today, they can't move
     by Friday.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU DO NEXT — IN THIS ORDER

  1. File KEPHIS phytosanitary request now
     kephis.org/eservices → Agricultural Inputs

  2. Call your clearing agent. Not WhatsApp. Call.

  3. Upload CoA from Gujarat Agrochem before end of day.

  4. Mark SUBMIT_KEPHIS action IN PROGRESS
     before you close this tab.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠  PATTERN ALERT

This is the second shipment this cycle with missing
phytosanitary documentation from your India suppliers.
Amoxicillin Batch K23B (PPB · 8 days) also has an
incomplete documentation package.

This is not a one-off. This is a supplier process gap.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT

  Risk Score           95 / 100
  Without action       89% likelihood of missed deadline
  If actioned today    94% likelihood of on-time clearance`,

  'Amoxicillin 500mg — Batch K23B': `COMPLIANCE BRIEF
Amoxicillin 500mg — Batch K23B
KRUX · PPB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION

PPB requires 45 days minimum to process pharmaceutical imports.
You have 8 days remaining.

This shipment cannot clear on time under any scenario — unless
the PPB application was filed 37+ days ago and is already
in the review queue. If it was not, you are already past the
point of prevention. Your only available action is mitigation.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL EXPOSURE

Storage (KES 5,850/day × est. 37 days delay)  KES   216,450
Late clearance penalty (2% CIF)                KES   117,000
PPB expedite fee (if applicable)               KES    24,000
Clearing agent overtime                        KES    33,070
──────────────────────────────────────────────────────────────
Estimated total exposure                       KES   390,520

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S MISSING

  ✗  PPB Application Form PPB/IMP/2024 — NOT FILED
  ✗  Certificate of Analysis (CoA) — not uploaded
  ✗  WHO-GMP Certificate (Zhejiang Pharma) — not verified
  ✓  KRA IDF — lodged
  ✓  Bill of Lading — present

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU DO NOW

  1. File PPB application immediately — even past the ideal window,
     filing creates a record and may reduce penalty exposure.
     Portal: eprocurement.ppb.go.ke

  2. Request CoA + WHO-GMP from Zhejiang Pharma today.
     PPB will not process without both.

  3. Brief management that this shipment will incur delay costs.
     Begin storage facility negotiation now.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT

  Risk Score           87 / 100
  Probability of on-time clearance   4%
  Recommended action   Mitigate costs, not deadline`,

  'NPK Fertilizer 20-10-10 — 50MT': `COMPLIANCE BRIEF
NPK Fertilizer 20-10-10 — 50MT
KRUX · PCPB

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION

PCPB processing typically takes 14–21 days.
You have 22 days remaining — you are at the minimum viable window.

Any delay in submitting the application this week converts this
shipment from AMBER to RED within 48 hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL EXPOSURE

Storage (KES 3,640/day × est. 5-day delay)    KES    18,200
PCPB late registration fine                    KES    15,000
──────────────────────────────────────────────────────────────
Exposure if application delayed 5+ days        KES    33,200

On-time clearance is achievable — but only if you act this week.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU DO NOW

  1. Submit PCPB pesticide registration documents today.
     Required: efficacy data, manufacturer CoA, import permit.

  2. Confirm PCPB application receipt and tracking number.

  3. Keep clearing agent on standby for final inspection booking.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT

  Risk Score           54 / 100
  On-time probability  71% if application filed this week
  On-time probability  18% if application delayed past 3 days`,

  'LED Panel Lighting Kit — CR2024': `COMPLIANCE BRIEF
LED Panel Lighting Kit — CR2024
KRUX · KEBS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION

KEBS pre-export verification requires 30 days minimum.
You have 45 days remaining — this is on track.

However, the IEC 60598-1 compliance report has not been uploaded
and KEBS will not begin processing without it. The 15-day buffer
disappears the moment a document gap is discovered mid-review.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

RECOMMENDED ACTIONS

  1. Upload IEC 60598-1 compliance test report this week.
     Obtain from Shenzhen manufacturer's QC department.

  2. File KEBS pre-export verification request.
     Portal: kebs.org/services/pre-export-verification

  3. Mark this shipment GREEN and schedule a 7-day check-in.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT

  Risk Score           22 / 100
  On-time probability  91% if IEC report uploaded this week
  No action required beyond standard documentation`,

  'Jet A-1 Aviation Fuel — 500KL': `COMPLIANCE BRIEF
Jet A-1 Aviation Fuel — 500KL
KRUX · EPRA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION

EPRA petroleum import permits require 25 days minimum to process.
You have 12 days remaining.

This shipment cannot clear on time. EPRA processing cannot be
compressed below 25 days under any scenario. Your only option
is to file immediately to create a record and minimize the
penalty exposure on a KES 96 million shipment.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL EXPOSURE

Storage (KES 23,220/day × est. 13-day delay)   KES   301,860
KPA demurrage (ISO tanks, after free period)    KES   175,500
EPRA re-registration penalty                    KES    49,910
──────────────────────────────────────────────────────────────
Estimated total if no action today              KES   527,270

Note: The shipment value is KES 96,055,200. Storage and demurrage
are minor relative to the commercial cost of grounded aircraft
awaiting fuel delivery. Operational exposure is the real number.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEEDED — EPRA

  ✗  EPRA Petroleum Import Permit (Form EPRA/IMP/[year])
     Required before any petroleum product clears customs.
     File at: epra.go.ke/licensing
     EPRA Licensing: +254 020 362 0000

  ✗  Energy Audit / Product Specification Sheet
     Jet A-1 must meet KEBS/ASTM D1655 specification.
     Request from supplier: density, flash point, freeze point data.

  ✓  KRA Import Declaration Form (IDF)
     HS 2710.19.11 — Kerosene-type jet fuel.
     CRITICAL: Import duty = 0%. Verify HS code is exactly
     2710.19.11 — misclassification to 2710.19.90 (25% duty)
     would trigger KES 155,000 penalty on duty shortfall.

  ✓  Bill of Lading — Jebel Ali origin
  ✓  Commercial Invoice + Certificate of Origin (UAE)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU DO NEXT — IN THIS ORDER

  1. File EPRA petroleum import permit TODAY
     Even past the ideal window, filing creates a record.
     Portal: epra.go.ke/licensing → Petroleum Products → Import Permit

  2. Confirm HS code 2710.19.11 on IDF — do not let this be 2710.19.90
     Call KRA Mombasa: +254 041 231 0755 if classification is unclear.

  3. Confirm KPC/JKIA tank receiving capacity
     Kenya Pipeline Company must confirm tank allocation
     before vessel discharge. Coordinate now.

  4. Brief management on delay exposure
     Grounded aircraft cost per hour exceeds this entire
     storage figure. The operational urgency is upstream.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT

  Risk Score           91 / 100
  On-time clearance probability   3%
  What changes the trajectory     EPRA expedited track (essential
  fuel supply) — call EPRA Licensing directly and request
  priority processing: +254 020 362 0000`,
}

const DEMO_BRIEF_DEFAULT = DEMO_BRIEFS['Pyrethroid Pesticide — Lot P2024']

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()

    const { email } = await getSessionContext(req)
    if (email === process.env.DEMO_USER_EMAIL) {
      const brief = DEMO_BRIEFS[shipment.name as string] ?? DEMO_BRIEF_DEFAULT
      return NextResponse.json({ result: brief })
    }

    const liveRate = await getKesRate()

    // Calculate days remaining
    const deadline      = shipment.pvoc_deadline ? new Date(shipment.pvoc_deadline) : null
    const daysRemaining = deadline ? Math.ceil((deadline.getTime() - Date.now()) / 86400000) : null

    // Calculate financial exposure
    const storageRate = Number(shipment.storage_rate_per_day ?? 50)
    const cifUsd      = Number(shipment.cif_value_usd ?? 0)
    const regProfile  = getRegulator('KE', shipment.regulatory_body ?? '')
    const slaActual   = regProfile?.sla_actual_days ?? 14
    // daysAtRisk = how many extra days the shipment will accrue costs if nothing changes.
    // If filing today and SLA can still be met: 0 risk. If SLA gap is already exceeded: that overage accrues.
    const daysAtRisk  = daysRemaining == null
      ? 7
      : daysRemaining >= slaActual
        ? 0
        : slaActual - daysRemaining
    const exposure    = cifUsd > 0 ? calcExposure({
      cif_value_usd:            cifUsd,
      storage_rate_per_day_usd: storageRate,
      days_at_risk:             daysAtRisk,
      regulator_code:           shipment.regulatory_body ?? '',
      usd_rate_override:        liveRate,
    }) : null

    const systemPrompt = buildRegulatoryContext(shipment.regulatory_body ?? '', 'KE', liveRate)

    // Build document status section from user-declared checklist (if provided)
    const docChecklist = shipment.document_checklist as Record<string, string> | null | undefined
    const hasChecklist = docChecklist && Object.keys(docChecklist).length > 0
    const checklistLines = hasChecklist
      ? Object.entries(docChecklist).map(([name, status]) => {
          const icon = status === 'UPLOADED' ? '✓' : status === 'RECEIVED' ? '↓' : status === 'REQUESTED' ? '⟳' : '✗'
          const label = status === 'UPLOADED' ? 'Uploaded' : status === 'RECEIVED' ? 'Received (not uploaded)' : status === 'REQUESTED' ? 'Requested from supplier' : 'Not started'
          return `  ${icon}  ${name} — ${label}`
        }).join('\n')
      : null

    const userMessage = `Generate a compliance brief for this Kenya import shipment.

SHIPMENT DATA:
Name: ${shipment.name}
Regulator: ${shipment.regulatory_body}
CIF Value: USD ${cifUsd.toLocaleString()}
PVoC Deadline: ${shipment.pvoc_deadline ?? 'Not set'}
Days Remaining: ${daysRemaining != null ? `${daysRemaining} days` : 'Unknown'}
Regulator SLA (actual avg): ${slaActual} days
Clearance possible on time: ${daysRemaining != null ? (daysRemaining >= slaActual ? 'YES' : 'NO — SLA gap is ' + (slaActual - daysRemaining) + ' days') : 'Unknown'}
Risk Status: ${shipment.risk_flag_status ?? 'AMBER'}
Origin Port: ${shipment.origin_port ?? 'Unknown'}
HS Code: ${shipment.hs_code ?? 'Not provided'}
Product: ${shipment.product_description ?? shipment.name}
${exposure ? [
  '\nFINANCIAL EXPOSURE (pre-calculated):',
  `  Storage (${daysAtRisk}d × USD ${storageRate}/day): KES ${exposure.storage_kes.toLocaleString()}`,
  `  KPA demurrage: KES ${exposure.demurrage_kes.toLocaleString()}`,
  `  Regulatory penalty (${daysAtRisk} days overdue): KES ${exposure.penalty_kes.toLocaleString()}`,
  `  Total if missed: KES ${exposure.total_kes.toLocaleString()}`,
  exposure.seizure_risk ? '  SEIZURE RISK — regulator can order destruction of goods; full CIF value at risk' : '',
  exposure.is_estimated   ? '  Note: penalty figures are estimates — verify with clearing agent before quoting' : '',
].filter(Boolean).join('\n') : ''}
${checklistLines ? `\nDOCUMENT STATUS (declared by user — use these exactly, do not override):\n${checklistLines}\n\nKey:\n  ✓  Uploaded — in system\n  ↓  Received — not yet uploaded\n  ⟳  Requested — waiting on supplier\n  ✗  Not started — nothing done` : '\nDOCUMENT STATUS: Not declared by user — infer from HS code and product type, but caveat as unconfirmed.'}

FORMAT THE BRIEF EXACTLY AS FOLLOWS — do not add markdown, do not use bold, use plain text:

COMPLIANCE BRIEF
[Shipment Name]
KRUX · [Regulator]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SITUATION
[2-3 sentences. State days remaining, whether the SLA floor makes on-time clearance possible or impossible, and what the most critical blocker is RIGHT NOW. Be direct. If clearance is impossible within the window, say so explicitly.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FINANCIAL EXPOSURE
[Line-by-line breakdown using KES. Use the pre-calculated values provided above. Show each line separately:
- Storage charges (storage_rate × days at risk)
- KPA demurrage (after free period)
- Regulatory penalty (from regulator profile — NOT a generic 2% CIF)
- Total in KES
Right-align the numbers. If seizure_risk is flagged, state it clearly as a separate line.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT'S NEEDED — ${shipment.regulatory_body}
[${hasChecklist
  ? 'Use the DOCUMENT STATUS above exactly as declared. Show ✓ for Uploaded, ↓ for Received, ⟳ for Requested, ✗ for Not started. For every ✗ or ⟳ document: explain WHY it blocks clearance and include the specific portal URL or phone from the regulator profile to act on it.'
  : 'Infer ✓ or ✗ for each required document from HS code and product type. Mark all statuses as unconfirmed. Explain WHY each missing document blocks clearance. Include portal URL or phone for each action item.'
}]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT YOU DO NEXT — IN THIS ORDER
[3-5 numbered actions in chronological order. First action should be doable TODAY. Include the specific portal URL or phone number from the regulator profile for each step. Be as specific as the demo briefs above.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

KRUX RISK ASSESSMENT
  Risk Score    [estimate 1-100 based on days remaining and SLA]
  [One probability statement: likelihood of on-time clearance if action taken today]
  [One sentence on what would change the trajectory]`

    const stream = await client.messages.stream({
      model:      'claude-sonnet-4-6',
      max_tokens: 2500,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text))
          }
        }
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type':  'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}
