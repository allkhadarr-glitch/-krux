import Anthropic from '@anthropic-ai/sdk'
import { Shipment } from './types'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const KRA_RATES = `
Kenya KRA Import Rate Schedule:
- Import Duty: 0-25% of CIF (Pharma/Supplements/Construction: 25%, Agro/Fertilizers: 10%, Green Energy/Machinery: 0%, KRA varies by HS Code)
- VAT: 16% flat on (CIF + Import Duty)
- IDF Levy: 2.25% of CIF
- RDL Levy: 1.5% of CIF
- PVoC Fee: USD 300 flat per shipment
- Clearing Agent: USD 120-850 per shipment
- Exchange Rate: KES 129 / USD 1
`

const REGULATORY_CONTEXT = `
Kenya Regulatory Bodies:
- PPB (Pharmacy & Poisons Board): Pharmaceutical import permits, 25% duty
- KEBS (Kenya Bureau of Standards): PVoC conformity, Standard Mark
- PCPB (Pest Control Products Board): Fertilizers & agrochemicals, 10% duty
- KEPHIS (Kenya Plant Health Inspectorate): Phytosanitary for agro/plants, 10% duty
- WHO-GMP: Good Manufacturing Practice for pharma manufacturers, 25% duty
- EPRA (Energy & Petroleum Regulatory Authority): Green energy equipment, 0% duty
- KRA (Kenya Revenue Authority): All customs declarations, duty varies by HS Code
- NEMA (National Environment Management Authority): Construction materials, 25% duty
`

export async function generateComplianceBrief(shipment: Shipment): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 200,
    system: `You are a Kenya import compliance expert. Generate concise 3-sentence compliance briefs for shipment managers. ${REGULATORY_CONTEXT}`,
    messages: [{
      role: 'user',
      content: `Generate a 3-sentence compliance brief for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, CIF: USD ${shipment.cif_value_usd}, PVoC Deadline: ${shipment.pvoc_deadline}, Risk: ${shipment.risk_flag_status}, Status: ${shipment.remediation_status}`
    }]
  })
  return (message.content[0] as { text: string }).text
}

export async function generateRemediationSteps(shipment: Shipment): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are a Kenya import compliance expert. Generate exactly 5 specific, actionable ground-team steps to achieve compliance before the deadline. ${REGULATORY_CONTEXT}`,
    messages: [{
      role: 'user',
      content: `Generate 5 remediation steps for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, Deadline: ${shipment.pvoc_deadline}, Risk: ${shipment.risk_flag_status}. Format as numbered list.`
    }]
  })
  return (message.content[0] as { text: string }).text
}

export async function generateDocumentChecklist(shipment: Shipment): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 500,
    system: `You are a Kenya customs documentation expert. Generate complete document checklists for Kenya import clearance. ${REGULATORY_CONTEXT}`,
    messages: [{
      role: 'user',
      content: `Generate the full document checklist for a ${shipment.regulatory_body} regulated shipment: ${shipment.name}, from ${shipment.origin_port}. Include all mandatory Kenya customs documents. Format as numbered list with brief explanation of each.`
    }]
  })
  return (message.content[0] as { text: string }).text
}

export async function generateTaxQuotation(shipment: Shipment): Promise<string> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: `You are a Kenya tax and customs expert. Generate precise landed cost breakdowns using official KRA rates. ${KRA_RATES}`,
    messages: [{
      role: 'user',
      content: `Generate a complete landed cost breakdown for: ${shipment.name}, Regulator: ${shipment.regulatory_body}, CIF: USD ${shipment.cif_value_usd}. Show each levy line in both USD and KES. End with TOTAL LANDED COST in USD and KES.`
    }]
  })
  return (message.content[0] as { text: string }).text
}
