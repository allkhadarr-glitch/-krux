import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM = `You are a Kenya import compliance specialist. Extract structured data from shipping documents.
Return ONLY valid JSON with these fields (use null for fields not found):
{
  "name": "shipment name / product description",
  "hs_code": "HS code if present",
  "origin_port": "port of loading",
  "origin_country": "country of origin",
  "destination_port": "port of discharge (usually Mombasa)",
  "product_description": "full product description",
  "quantity": number or null,
  "unit": "unit of measure (kg, units, bags, etc)",
  "weight_kg": number or null,
  "cif_value_usd": number or null,
  "bl_number": "Bill of Lading number if present",
  "vessel_name": "vessel name if present",
  "document_type": "BILL_OF_LADING | COMMERCIAL_INVOICE | PACKING_LIST | CERTIFICATE_OF_ANALYSIS | PHYTOSANITARY | PVOC | OTHER"
}`

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'file required' }, { status: 400 })
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')
    const mediaType = (file.type || 'application/pdf') as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'

    const isPdf = mediaType === 'application/pdf'
    const isImage = mediaType.startsWith('image/')

    if (!isPdf && !isImage) {
      return NextResponse.json({ error: 'Only PDF and image files are supported for extraction' }, { status: 400 })
    }

    const content: Anthropic.MessageParam['content'] = isPdf
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extract shipment data from this document. Return only the JSON object.' },
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mediaType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
          { type: 'text', text: 'Extract shipment data from this document. Return only the JSON object.' },
        ]

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM,
      messages: [{ role: 'user', content }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not extract data from document' }, { status: 422 })

    const extracted = JSON.parse(jsonMatch[0])
    return NextResponse.json({ ok: true, extracted })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Extraction failed' }, { status: 500 })
  }
}
