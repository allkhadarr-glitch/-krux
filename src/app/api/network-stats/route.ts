import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export const revalidate = 300 // cache 5 minutes

export async function GET() {
  const [entitiesRes, shipmentsRes, eventsRes, lastEventRes] = await Promise.all([
    supabaseAdmin.from('krux_entities').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('shipments').select('id', { count: 'exact', head: true }).is('deleted_at', null),
    supabaseAdmin.from('shipment_events').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('shipment_events').select('created_at').order('created_at', { ascending: false }).limit(1),
  ])

  const lastActivity = lastEventRes.data?.[0]?.created_at ?? null

  return NextResponse.json({
    registered_entities: entitiesRes.count ?? 0,
    shipments_tracked:   shipmentsRes.count ?? 0,
    events_logged:       eventsRes.count ?? 0,
    last_activity:       lastActivity,
  })
}
