import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  const { product_description, origin_country } = await req.json()

  if (!product_description) {
    return NextResponse.json({ error: 'product_description is required' }, { status: 400 })
  }

  const prompt = `You are a Kenya Revenue Authority (KRA) HS code classification expert with deep knowledge of the East African Community Common External Tariff (EAC-CET) and Kenya's import duty schedules.

Given this product description, provide:
1. The correct 8-digit HS code under the EAC-CET
2. The product category description
3. Kenya's import duty rate (%)
4. VAT applicability (16% standard or exempt)
5. Which Kenyan regulatory body (if any) must approve this product: PPB, KEBS, KEPHIS, PCPB, EPRA, NEMA, KRA-only, or None
6. One critical compliance note specific to Kenya importers

Product: ${product_description}
Origin country: ${origin_country ?? 'Not specified'}

Respond ONLY with valid JSON in this exact format (no markdown, no extra text):
{
  "hs_code": "0000.00.00",
  "description": "Official tariff line description",
  "duty_rate_pct": 25,
  "vat_exempt": false,
  "vat_pct": 16,
  "primary_regulator": "KEBS",
  "compliance_note": "One specific compliance requirement"
}`

  try {
    const message = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw  = (message.content[0] as { text: string }).text.trim()
    const data = JSON.parse(raw)
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to classify HS code' }, { status: 500 })
  }
}
