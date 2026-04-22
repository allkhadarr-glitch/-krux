import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const KRA_RATES = `Kenya KRA Import Rate Schedule:
- Pharmaceuticals/Supplements/Construction: 25% Import Duty on CIF
- Agro/Fertilizers: 10% Import Duty on CIF
- Green Energy/Machinery: 0% Import Duty on CIF
- KRA General: varies by HS Code
- VAT: 16% on (CIF + Import Duty)
- IDF Levy: 2.25% of CIF
- RDL Levy: 1.5% of CIF
- PVoC Fee: USD 300 flat
- Clearing Agent: USD 500 estimate
- Exchange Rate: KES 129 / USD 1`

export async function POST(req: NextRequest) {
  try {
    const shipment = await req.json()
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: `You are a Kenya customs tax expert. Generate precise landed cost breakdowns. ${KRA_RATES}`,
      messages: [{
        role: 'user',
        content: `Generate landed cost for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, CIF: USD ${shipment.cif_value_usd}. Show each line in USD and KES. End with TOTAL LANDED COST USD and KES.`
      }]
    })
    return NextResponse.json({ result: (message.content[0] as { text: string }).text })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate tax quotation' }, { status: 500 })
  }
}
