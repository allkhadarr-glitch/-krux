import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: actions, error } = await supabase
    .from('actions')
    .select('id, priority, execution_status, action_type')
    .eq('shipment_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all       = actions ?? []
  const total     = all.length
  const completed = all.filter((a) => a.execution_status === 'DONE').length
  const failed    = all.filter((a) => a.execution_status === 'FAILED').length
  const pending   = all.filter((a) => a.execution_status === 'PENDING').length
  const at_risk   = all.filter((a) => a.execution_status === 'AT_RISK').length
  const critical_incomplete = all.filter(
    (a) => a.priority === 'CRITICAL' && a.execution_status !== 'DONE'
  ).length

  return NextResponse.json({ total, completed, failed, pending, at_risk, critical_incomplete })
}
