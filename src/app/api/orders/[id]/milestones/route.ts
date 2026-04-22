import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabase
    .from('po_milestones')
    .insert({
      purchase_order_id: id,
      organization_id:   ORG_ID,
      name:              body.name,
      description:       body.description ?? null,
      milestone_type:    body.milestone_type ?? null,
      due_date:          body.due_date,
      is_completed:      false,
      is_overdue:        false,
      triggers_payment:  body.triggers_payment ?? false,
      payment_amount_usd: body.payment_amount_usd ?? null,
      sequence_number:   body.sequence_number ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const body = await req.json()
  const { milestone_id, is_completed } = body

  const { data, error } = await supabase
    .from('po_milestones')
    .update({
      is_completed,
      completed_date: is_completed ? new Date().toISOString().split('T')[0] : null,
    })
    .eq('id', milestone_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
