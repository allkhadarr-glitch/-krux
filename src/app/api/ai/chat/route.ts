import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are KRUX, an expert AI assistant for Kenya import compliance. You help importers, clearing agents, and supply chain managers navigate:
- Kenya Revenue Authority (KRA) requirements and iCMS customs portal
- Pre-Export Verification of Conformity (PVoC) process and timelines
- Regulatory bodies: PPB (pharmaceuticals), KEBS (standards), PCPB (pesticides), KEPHIS (phytosanitary), EPRA (energy), NEMA (environment), WHO-GMP
- HS code classification under the East African Community Common External Tariff
- Landed cost calculations: import duty, 16% VAT, 2.25% IDF levy, 1.5% RDL levy, PVoC fees
- Import documentation: CoA, IDF, PVOC certificate, packing lists, bills of lading
- Risk management for shipments at Mombasa Port, JKIA, and inland container depots
- Kenya Bureau of Standards (KEBS) pre-shipment inspection and Diamond Mark

Always give specific, actionable answers. Reference actual Kenyan regulatory bodies and procedures. Be concise but thorough. Use KES amounts where relevant (rate ~KES 129/USD).`

export async function POST(req: NextRequest) {
  try {
    const { message, shipmentContext, history = [] } = await req.json()
    if (!message?.trim()) return NextResponse.json({ error: 'Missing message' }, { status: 400 })

    const systemWithContext = shipmentContext
      ? `${SYSTEM}\n\nCurrent shipment context:\n${shipmentContext}`
      : SYSTEM

    const messages = [
      ...history.slice(-10).map((h: { role: string; content: string }) => ({
        role: h.role as 'user' | 'assistant',
        content: h.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemWithContext,
      messages,
    })

    return NextResponse.json({ result: (response.content[0] as { text: string }).text })
  } catch {
    return NextResponse.json({ error: 'AI request failed' }, { status: 500 })
  }
}
