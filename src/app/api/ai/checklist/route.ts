import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionContext } from '@/lib/session'
import { buildRegulatoryContext } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ─── Demo hardcoded checklists ────────────────────────────────

const DEMO_CHECKLISTS: Record<string, string> = {
  'Pyrethroid Pesticide — Lot P2024': `DOCUMENT CHECKLIST — Pyrethroid Pesticide · KEPHIS

  ✓  Bill of Lading (original, signed by carrier)
  ✓  Commercial Invoice — matches BoL quantities
  ✓  Packing List — itemised by drum

  ✗  Phytosanitary Certificate — MISSING
     Must be issued by PPQS (India) for agricultural chemicals.
     Request from Gujarat Agrochem immediately.

  ✗  KEPHIS Import Permit — NOT FILED
     File via kephis.org/eservices → Agricultural Inputs.
     Processing: 48 hours standard, same-day possible with escalation.

  ✓  Certificate of Analysis (CoA) — present from Gujarat Agrochem

  ✗  PCPB Registration Certificate — MISSING
     Pyrethroid insecticides require PCPB registration.
     Contact PCPB office: +254 020 271 2540.

  ✓  KRA IDF — Lodged on iTax portal

  ─────────────────────────────────────────────────────────
  Status: 3 of 7 documents missing. Clearance is blocked.
  File KEPHIS application today without waiting for the rest.`,

  'Amoxicillin 500mg — Batch K23B': `DOCUMENT CHECKLIST — Amoxicillin 500mg · PPB

  ✓  Bill of Lading (original)
  ✓  Commercial Invoice + Packing List

  ✗  PPB Application Form PPB/IMP/2024 — NOT FILED
     File at eprocurement.ppb.go.ke immediately.

  ✗  Certificate of Analysis (CoA) — MISSING
     Must be from Zhejiang Pharma Co. Ltd, batch-specific.
     PPB will reject without manufacturer CoA.

  ✗  WHO-GMP Certificate — MISSING
     Required to verify manufacturer compliance.
     Request from Zhejiang Pharma. Allow 3–5 days from China.

  ✓  KEBS Type Approval (if electronics — n/a for pharma)
  ✓  KRA IDF — Lodged

  ✗  Product Dossier — MISSING
     PPB requires technical dossier for all pharmaceutical imports.
     Includes: composition, stability data, manufacturing process.

  ─────────────────────────────────────────────────────────
  Status: 4 of 8 documents missing.
  PPB cannot register without CoA + WHO-GMP — request both today.`,

  'NPK Fertilizer 20-10-10 — 50MT': `DOCUMENT CHECKLIST — NPK Fertilizer 20-10-10 · PCPB

  ✓  Bill of Lading
  ✓  Commercial Invoice + Packing List
  ✓  Certificate of Analysis (NPK composition)

  ✗  PCPB Pesticide Registration Documents — NOT SUBMITTED
     Required: product efficacy data, safety data sheet (SDS),
     label copy in English. Submit at pcpb.or.ke.

  ✓  KRA IDF — Lodged
  ✓  Phytosanitary Certificate (not required for fertilizers)

  ─────────────────────────────────────────────────────────
  Status: 1 critical submission missing.
  File PCPB documents this week to maintain 22-day window.`,

  'LED Panel Lighting Kit — CR2024': `DOCUMENT CHECKLIST — LED Panel Lighting Kit · KEBS

  ✓  Bill of Lading
  ✓  Commercial Invoice + Packing List

  ✗  IEC 60598-1 Compliance Test Report — MISSING
     KEBS requires independent lab test for luminaire products.
     Request from Shenzhen manufacturer's QC department.

  ✓  KEBS Type Approval Application (to be filed)
  ✓  KRA IDF — Lodged
  ✓  Country of Origin Certificate

  ─────────────────────────────────────────────────────────
  Status: 1 document missing. Low risk.
  Upload IEC report this week to stay on track for 45-day window.`,
}

const DEMO_DEFAULT = DEMO_CHECKLISTS['Pyrethroid Pesticide — Lot P2024']

// ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()

    const { email } = await getSessionContext(req)
    if (email === process.env.DEMO_USER_EMAIL) {
      const checklist = DEMO_CHECKLISTS[shipment.name as string] ?? DEMO_DEFAULT
      return NextResponse.json({ result: checklist })
    }

    const liveRate = await getKesRate()
    const systemPrompt = buildRegulatoryContext(shipment.regulatory_body ?? '', 'KE', liveRate)

    const userMessage = `Generate a precise document checklist for this Kenya import shipment.

SHIPMENT DATA:
Name: ${shipment.name}
Regulator: ${shipment.regulatory_body}
CIF Value: USD ${Number(shipment.cif_value_usd ?? 0).toLocaleString()}
PVoC Deadline: ${shipment.pvoc_deadline ?? 'Not set'}
Risk Status: ${shipment.risk_flag_status ?? 'AMBER'}
Origin Port: ${shipment.origin_port ?? 'Unknown'}
HS Code: ${shipment.hs_code ?? 'Not provided'}
Product: ${shipment.product_description ?? shipment.name}

FORMAT EXACTLY AS FOLLOWS — plain text, no markdown:

DOCUMENT CHECKLIST — [Shipment Name] · [Regulator]

[For each required document from the ${shipment.regulatory_body} requirements:]
  ✓  [Document name] — [status based on what's typically present for this product type]
  OR
  ✗  [Document name] — MISSING
     [ONE specific sentence: why this blocks clearance]
     [Source hint: where to get it or who to contact]

[Include ALL documents the regulator requires, in order of importance]
[Infer probable status from the product type, HS code, and origin port]
[For pharmaceuticals from China: WHO-GMP is almost always the risk]
[For agricultural from India: phytosanitary cert is the risk]
[For electronics from China: IEC test reports are the risk]

─────────────────────────────────────────────────────────
Status: [X of Y] documents [present/missing/at risk].
[One action sentence: what to do first]`

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 900,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: userMessage }],
    })

    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch {
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 })
  }
}
