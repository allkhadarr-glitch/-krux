import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: 'You are a Kenya import compliance expert. Generate exactly 5 specific, actionable ground-team steps to achieve compliance before the deadline.',
      messages: [{
        role: 'user',
        content: `5 remediation steps for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, Deadline: ${shipment.pvoc_deadline}, Risk: ${shipment.risk_flag_status}. Format as numbered list.`
      }]
    })
    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate steps' }, { status: 500 })
  }
}
