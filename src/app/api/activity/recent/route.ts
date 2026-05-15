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
    .select(`
      id, title, action_type, execution_status,
      completed_at, updated_at, portal_ref,
      shipment:shipments(id, name)
    `)
    .eq('organization_id', orgId)
    .in('execution_status', ['DONE', 'IN_PROGRESS'])
    .order('updated_at', { ascending: false })
    .limit(12)

  return NextResponse.json(
    (actions ?? []).map((a: any) => ({
      id:            a.id,
      title:         a.title,
      action_type:   a.action_type,
      status:        a.execution_status,
      shipment_name: a.shipment?.name ?? null,
      portal_ref:    a.portal_ref ?? null,
      timestamp:     a.completed_at ?? a.updated_at,
    }))
  )
}
