import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: shipment } = await supabase
    .from('shipments')
    .select('*, regulatory_body:regulatory_bodies(code, name)')
    .eq('id', id)
    .single()

  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const regulator = (shipment as any).regulatory_body?.code ?? 'KEBS'
  const hsCode    = shipment.hs_code ?? 'unknown'
  const product   = shipment.product_description ?? shipment.name

  const message = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 800,
    system: `You are a Kenya import compliance expert. Generate a structured action checklist for clearing a shipment through Kenya customs and the relevant regulatory body. Return ONLY valid JSON — an array of action objects with fields: title (string), action_type (string, uppercase snake_case like SUBMIT_DOCUMENTS_KEBS), priority (CRITICAL|HIGH|MEDIUM|LOW), description (string, one sentence). No markdown, no explanation.`,
    messages: [{
      role: 'user',
      content: `Generate 6-8 compliance actions for: Regulator=${regulator}, HS Code=${hsCode}, Product="${product}", Deadline=${shipment.pvoc_deadline ?? 'unknown'}. Include document submission, portal registration, payment, and clearance steps specific to ${regulator}.`,
    }],
  })

  let actions: any[] = []
  try {
    const text = (message.content[0] as { text: string }).text.trim()
    const json = text.startsWith('[') ? text : text.slice(text.indexOf('['), text.lastIndexOf(']') + 1)
    actions = JSON.parse(json)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
  }

  // Insert all suggested actions
  const toInsert = actions.map((a: any) => ({
    organization_id: shipment.organization_id,
    shipment_id:     id,
    title:           a.title,
    action_type:     a.action_type ?? 'GENERAL',
    priority:        a.priority ?? 'MEDIUM',
    description:     a.description ?? null,
    status:          'OPEN',
    execution_status: 'PENDING',
    source:          'AI',
    trigger_reason:  `AI-suggested for ${regulator} shipment`,
  }))

  const { data: created, error } = await supabase
    .from('actions')
    .insert(toInsert)
    .select()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, actions: created, count: created?.length ?? 0 })
}
