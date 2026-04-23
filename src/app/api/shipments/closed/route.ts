import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  // Fetch closed shipments joined with their SHIPMENT_CLOSED timeline event
  const { data: events, error } = await supabase
    .from('execution_timeline')
    .select(`
      id, created_at, metadata,
      shipment:shipments!inner(id, name, reference_number, pvoc_deadline, organization_id)
    `)
    .eq('event_type', 'SHIPMENT_CLOSED')
    .eq('organization_id', ORG_ID)
    .gte('created_at', new Date(Date.now() - 30 * 86400_000).toISOString())
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (events ?? []).map((e: any) => {
    const actions_started = e.metadata?.actions_started ?? 0
    return {
      event_id:            e.id,
      closed_at:           e.created_at,
      shipment_id:         e.shipment.id,
      name:                e.shipment.name,
      reference_number:    e.shipment.reference_number,
      pvoc_deadline:       e.shipment.pvoc_deadline,
      outcome:             e.metadata?.status             ?? '—',
      delay_days:          e.metadata?.delay_days         ?? 0,
      penalty_kes:         e.metadata?.penalty_amount_kes ?? 0,
      total_duration_days: e.metadata?.total_duration_days ?? null,
      actions_started,
      actions_completed:   e.metadata?.actions_completed  ?? 0,
      actions_failed:      e.metadata?.actions_failed      ?? 0,
      actions_pending:     e.metadata?.actions_pending     ?? 0,
      critical_missed:     e.metadata?.critical_actions_missed ?? 0,
      cif_value_usd:       e.metadata?.cif_value_usd      ?? null,
      // Regime A = observable execution; Regime B = initiation failure (no system-observed start)
      regime:              actions_started > 0 ? 'A' : 'B',
    }
  })

  return NextResponse.json({ rows })
}
