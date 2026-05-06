import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)

  const { data: rows, error } = await supabaseAdmin
    .from('shipments')
    .select('*')
    .eq('organization_id', orgId)
    .is('deleted_at', null)
    .order('pvoc_deadline', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!rows?.length) return NextResponse.json([])

  const ids = rows.map((s: any) => s.id)

  const [bodiesRes, portalsRes, riskRes] = await Promise.all([
    supabaseAdmin.from('regulatory_bodies').select('*'),
    supabaseAdmin.from('shipment_portals').select('*').in('shipment_id', ids),
    supabaseAdmin.from('shipment_risk').select('*').in('shipment_id', ids),
  ])

  const bodiesById: Record<string, any> = Object.fromEntries(
    (bodiesRes.data ?? []).map((b: any) => [b.id, b])
  )
  const portalsByShipment: Record<string, any[]> = {}
  for (const p of portalsRes.data ?? []) {
    if (!portalsByShipment[p.shipment_id]) portalsByShipment[p.shipment_id] = []
    portalsByShipment[p.shipment_id].push(p)
  }
  const riskByShipment: Record<string, any> = Object.fromEntries(
    (riskRes.data ?? []).map((r: any) => [r.shipment_id, r])
  )

  const shipments = rows.map((s: any) => ({
    ...s,
    regulatory_body: s.regulatory_body_id ? bodiesById[s.regulatory_body_id] : undefined,
    portals: portalsByShipment[s.id] ?? [],
    risk: riskByShipment[s.id],
  }))

  return NextResponse.json(shipments)
}

async function nextReferenceNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const { count } = await supabaseAdmin
    .from('shipments')
    .select('*', { count: 'exact', head: true })
    .like('reference_number', `KRUX-${year}-%`)
  const seq = ((count ?? 0) + 1).toString().padStart(4, '0')
  return `KRUX-${year}-${seq}`
}

function calcLandedCost(cif: number, dutyPct: number, kesRate: number) {
  const duty      = cif * (dutyPct / 100)
  const idf       = cif * 0.02
  const rdl       = cif * 0.015
  const pvoc      = 500
  const clearing  = 800
  const vatBase   = cif + duty
  const vat       = vatBase * 0.16
  const totalUSD  = cif + duty + idf + rdl + pvoc + clearing + vat
  return {
    import_duty_usd:        Math.round(duty * 100) / 100,
    idf_levy_usd:           Math.round(idf * 100) / 100,
    rdl_levy_usd:           Math.round(rdl * 100) / 100,
    pvoc_fee_usd:           pvoc,
    clearing_fee_usd:       clearing,
    vat_usd:                Math.round(vat * 100) / 100,
    total_landed_cost_usd:  Math.round(totalUSD * 100) / 100,
    total_landed_cost_kes:  Math.round(totalUSD * kesRate * 100) / 100,
  }
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  const body = await req.json()
  const {
    name, origin_port, origin_country, hs_code, product_description,
    cif_value_usd, pvoc_deadline, regulatory_body_id, storage_rate_per_day,
    risk_flag_status, import_duty_pct, client_name,
    vessel_name, bl_number, eta, shipment_stage, weight_kg,
    shipping_line, customs_agent, customs_agent_license,
  } = body

  if (!name || !origin_port || !cif_value_usd) {
    return NextResponse.json({ error: 'name, origin_port, cif_value_usd are required' }, { status: 400 })
  }

  const reference_number = await nextReferenceNumber()
  const kesRate = await getKesRate()
  const costs = calcLandedCost(Number(cif_value_usd), Number(import_duty_pct ?? 25), kesRate)

  const { data, error } = await supabaseAdmin
    .from('shipments')
    .insert({
      organization_id:      orgId,
      reference_number,
      name,
      origin_port,
      origin_country:       origin_country || null,
      hs_code:              hs_code || null,
      product_description:  product_description || null,
      cif_value_usd:        Number(cif_value_usd),
      pvoc_deadline:        pvoc_deadline || null,
      regulatory_body_id:   regulatory_body_id || null,
      storage_rate_per_day: storage_rate_per_day ? Number(storage_rate_per_day) : null,
      ...(client_name ? { client_name } : {}),
      risk_flag_status:     risk_flag_status ?? 'AMBER',
      remediation_status:   'OPEN',
      shipment_status:      'PENDING',
      composite_risk_score: risk_flag_status === 'RED' ? 8 : risk_flag_status === 'GREEN' ? 3 : 5,
      exchange_rate_used:   kesRate,
      destination_port:     'Mombasa',
      vessel_name:           vessel_name || null,
      bl_number:             bl_number || null,
      eta:                   eta || null,
      shipment_stage:        shipment_stage || 'PRE_SHIPMENT',
      weight_kg:             weight_kg ? Number(weight_kg) : null,
      shipping_line:         shipping_line || null,
      customs_agent:         customs_agent || null,
      customs_agent_license: customs_agent_license || null,
      ...costs,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // First shipment for this org → WhatsApp signal ping to founder
  const { count } = await supabaseAdmin
    .from('shipments')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId)
    .is('deleted_at', null)

  if (count === 1) {
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name')
      .eq('id', orgId)
      .single()

    ;(async () => {
      const sid   = process.env.TWILIO_ACCOUNT_SID
      const token = process.env.TWILIO_AUTH_TOKEN
      const from  = process.env.TWILIO_WHATSAPP_FROM
      const to    = process.env.ALERT_WHATSAPP_TO
      if (!sid || !token || !from || !to) return
      const body = [
        `KRUX · First Shipment 🔴`,
        `${org?.name ?? orgId} just loaded their first shipment`,
        `"${name}"`,
        `They are using it. Follow up now.`,
        `kruxvon.com/admin`,
      ].join('\n')
      const params = new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: body })
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      })
    })().catch(() => {})
  }

  return NextResponse.json(data)
}
