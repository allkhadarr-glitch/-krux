import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      system: 'You are a Kenya import compliance expert. Generate concise 3-sentence compliance briefs for shipment managers.',
      messages: [{
        role: 'user',
        content: `3-sentence compliance brief for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, CIF: USD ${shipment.cif_value_usd}, Deadline: ${shipment.pvoc_deadline}, Risk: ${shipment.risk_flag_status}`
      }]
    })
    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate brief' }, { status: 500 })
  }
}
