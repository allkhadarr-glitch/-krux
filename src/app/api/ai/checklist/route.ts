import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 500,
      system: 'You are a Kenya customs documentation expert. Generate complete import document checklists for Kenya clearance. Include all mandatory documents with brief explanations.',
      messages: [{
        role: 'user',
        content: `Generate the document checklist for a ${shipment.regulatory_body} regulated shipment: ${shipment.name}, from ${shipment.origin_port}. Format as numbered list with one-line explanation per document.`
      }]
    })
    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate checklist' }, { status: 500 })
  }
}
