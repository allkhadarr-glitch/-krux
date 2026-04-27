import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Public — resolve token → shipments (no auth required, token is the secret)
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const { data: tokenRow } = await supabaseAdmin
    .from('client_share_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (!tokenRow) return NextResponse.json({ error: 'Invalid link' }, { status: 404 })

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This link has expired' }, { status: 410 })
  }

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, name, reference_number, origin_port, destination_port, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, total_landed_cost_usd, total_landed_cost_kes, regulatory_body_id, composite_risk_score, cif_value_usd, client_name, created_at')
    .eq('organization_id', tokenRow.organization_id)
    .eq('client_name', tokenRow.client_name)
    .is('deleted_at', null)
    .order('pvoc_deadline', { ascending: true })

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code, name')
  const bodiesById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b]))

  const enriched = (shipments ?? []).map((s: any) => ({
    ...s,
    regulatory_body: s.regulatory_body_id ? bodiesById[s.regulatory_body_id] : null,
  }))

  return NextResponse.json({
    client_name:  tokenRow.client_name,
    label:        tokenRow.label,
    shipments:    enriched,
    generated_at: new Date().toISOString(),
  })
}
