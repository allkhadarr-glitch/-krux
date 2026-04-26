import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSessionContext } from '@/lib/session'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { orgId } = await getSessionContext(req)
    if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { code, description, category } = await req.json()

    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are KRUX — Kenya's import compliance intelligence system. You have deep expertise in Kenya customs classification, KRA enforcement patterns, and the East African Community Common External Tariff. You know how KRA customs officers at Mombasa and Nairobi ICD actually operate in practice. Be specific, practical, and Kenya-focused. Plain text only. No markdown.`,
      messages: [{
        role: 'user',
        content: `Provide a deep analysis for Kenya importers of HS code ${code}: "${description}" (category: ${category}).

Cover:
1. CLASSIFICATION CONFIDENCE — How clear-cut is this classification? What ambiguities exist?
2. KRA ENFORCEMENT PATTERN — What do KRA officers actually look for when inspecting this product category at Mombasa port or Nairobi ICD? Any known enforcement priorities?
3. VALUATION RISKS — Is under-valuation a known issue for this category? What benchmark price ranges does KRA use?
4. COMMON IMPORTER MISTAKES — The top 2-3 mistakes importers make with this code that cause delays or penalties.
5. FASTEST CLEARANCE PATH — What specific sequence of actions gets this cleared fastest in Kenya?

Be specific to Kenya. Cite relevant regulators, portals, and contact numbers where applicable.`,
      }],
    })

    const result = (message.content[0] as { text: string }).text
    return NextResponse.json({ result })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
