import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const { data: src } = await supabase
    .from('shipments')
    .select(`
      organization_id, name, origin_port, destination_port,
      origin_country, hs_code, product_description,
      regulatory_body_id, regulatory_rule_id,
      cif_value_usd, container_type, weight_kg, unit,
      storage_rate_per_day, exchange_rate_used
    `)
    .eq('id', id)
    .single()

  if (!src) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })

  const refSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()

  const { data: newShipment, error } = await supabase
    .from('shipments')
    .insert({
      ...src,
      name:               `${src.name} (Copy)`,
      reference_number:   `KRUX-COPY-${refSuffix}`,
      remediation_status: 'OPEN',
      shipment_status:    'DRAFT',
      risk_flag_status:   'GREEN',
      composite_risk_score: 0,
      open_action_count:  0,
      pvoc_deadline:      null,
      eta:                null,
      actual_arrival_date: null,
      clearance_date:     null,
      ai_compliance_brief: null,
      ai_remediation_steps: null,
      ai_document_checklist: null,
      ai_tax_quotation:   null,
      ai_generated_at:    null,
      alert_sent_14d_at:  null,
      alert_sent_7d_at:   null,
      alert_sent_3d_at:   null,
      total_landed_cost_usd: null,
      total_landed_cost_kes: null,
      created_at:         new Date().toISOString(),
      updated_at:         new Date().toISOString(),
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Copy portals with NOT_STARTED status
  const { data: portals } = await supabase
    .from('shipment_portals')
    .select('regulator, organization_id')
    .eq('shipment_id', id)

  if (portals?.length) {
    await supabase.from('shipment_portals').insert(
      portals.map((p) => ({
        shipment_id:     newShipment.id,
        organization_id: p.organization_id,
        regulator:       p.regulator,
        status:          'NOT_STARTED',
        reference_number: null,
        notes:           null,
      }))
    )
  }

  return NextResponse.json({ ok: true, shipment: newShipment })
}
