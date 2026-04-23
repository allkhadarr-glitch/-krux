import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { getKesRate } from '@/lib/fx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function calcCosts(cif: number, dutyPct: number, kesRate: number) {
  const duty     = cif * (dutyPct / 100)
  const idf      = cif * 0.02
  const rdl      = cif * 0.015
  const pvoc     = 500
  const clearing = 800
  const vat      = (cif + duty) * 0.16
  const total    = cif + duty + idf + rdl + pvoc + clearing + vat
  return {
    import_duty_usd:       Math.round(duty * 100) / 100,
    idf_levy_usd:          Math.round(idf * 100) / 100,
    rdl_levy_usd:          Math.round(rdl * 100) / 100,
    pvoc_fee_usd:          pvoc,
    clearing_fee_usd:      clearing,
    vat_usd:               Math.round(vat * 100) / 100,
    total_landed_cost_usd: Math.round(total * 100) / 100,
    total_landed_cost_kes: Math.round(total * kesRate * 100) / 100,
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getSessionContext(req)
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('shipments')
    .select('id, organization_id, cif_value_usd, import_duty_usd')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  if (existing.organization_id !== orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const {
    name, origin_port, hs_code, product_description,
    cif_value_usd, import_duty_pct, pvoc_deadline,
    regulatory_body_id, risk_flag_status,
    vessel_name, bl_number, eta,
  } = body

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (name !== undefined)                updates.name                = name
  if (origin_port !== undefined)         updates.origin_port         = origin_port
  if (hs_code !== undefined)             updates.hs_code             = hs_code || null
  if (product_description !== undefined) updates.product_description = product_description || null
  if (pvoc_deadline !== undefined)       updates.pvoc_deadline       = pvoc_deadline || null
  if (regulatory_body_id !== undefined)  updates.regulatory_body_id  = regulatory_body_id || null
  if (risk_flag_status !== undefined)    updates.risk_flag_status    = risk_flag_status
  if (vessel_name !== undefined)         updates.vessel_name         = vessel_name || null
  if (bl_number !== undefined)           updates.bl_number           = bl_number || null
  if (eta !== undefined)                 updates.eta                 = eta || null

  // Recalculate landed cost if financials changed
  const newCif  = cif_value_usd  !== undefined ? Number(cif_value_usd)  : Number(existing.cif_value_usd)
  const curDutyPct = existing.import_duty_usd && existing.cif_value_usd
    ? Math.round((Number(existing.import_duty_usd) / Number(existing.cif_value_usd)) * 100)
    : 25
  const newDutyPct = import_duty_pct !== undefined ? Number(import_duty_pct) : curDutyPct

  if (cif_value_usd !== undefined || import_duty_pct !== undefined) {
    const kesRate = await getKesRate()
    const costs   = calcCosts(newCif, newDutyPct, kesRate)
    Object.assign(updates, { cif_value_usd: newCif, exchange_rate_used: kesRate, ...costs })
  }

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, shipment: data })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { orgId } = await getSessionContext(req)
  const { id } = await params

  const { data: existing } = await supabaseAdmin
    .from('shipments')
    .select('id, organization_id, remediation_status')
    .eq('id', id)
    .single()

  if (!existing) return NextResponse.json({ error: 'Shipment not found' }, { status: 404 })
  if (existing.organization_id !== orgId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (existing.remediation_status === 'CLOSED') {
    return NextResponse.json({ error: 'Cannot delete a closed shipment' }, { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('shipments')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
