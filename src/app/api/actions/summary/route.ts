import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  const { data: actions } = await supabase
    .from('actions')
    .select('shipment_id, status, execution_status')
    .eq('organization_id', orgId)
    .neq('status', 'DISMISSED')

  const summary: Record<string, { total: number; done: number; in_progress: number }> = {}

  for (const a of actions ?? []) {
    if (!a.shipment_id) continue
    if (!summary[a.shipment_id]) summary[a.shipment_id] = { total: 0, done: 0, in_progress: 0 }
    summary[a.shipment_id].total++
    if (a.execution_status === 'DONE' || a.status === 'COMPLETED') {
      summary[a.shipment_id].done++
    } else if (a.execution_status === 'IN_PROGRESS') {
      summary[a.shipment_id].in_progress++
    }
  }

  return NextResponse.json(
    Object.entries(summary).map(([shipment_id, counts]) => ({ shipment_id, ...counts }))
  )
}
