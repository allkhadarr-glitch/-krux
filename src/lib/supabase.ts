import { createClient } from '@supabase/supabase-js'
import { Shipment, ShipmentPortal, ShipmentRisk } from './types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function fetchBodiesById(): Promise<Record<string, { id: string; code: string; name: string; country: string }>> {
  const res = await fetch('/api/regulatory-bodies')
  const data = await res.json()
  return Object.fromEntries((data as any[]).map((b) => [b.id, b]))
}

async function fetchPortalsByShipmentIds(
  shipmentIds: string[]
): Promise<Record<string, ShipmentPortal[]>> {
  if (!shipmentIds.length) return {}
  const { data } = await supabase
    .from('shipment_portals')
    .select('*')
    .in('shipment_id', shipmentIds)
  if (!data) return {}
  const grouped: Record<string, ShipmentPortal[]> = {}
  for (const row of data) {
    if (!grouped[row.shipment_id]) grouped[row.shipment_id] = []
    grouped[row.shipment_id].push(row as ShipmentPortal)
  }
  return grouped
}

async function fetchRiskByShipmentIds(
  shipmentIds: string[]
): Promise<Record<string, ShipmentRisk>> {
  if (!shipmentIds.length) return {}
  const { data } = await supabase
    .from('shipment_risk')
    .select('*')
    .in('shipment_id', shipmentIds)
  if (!data) return {}
  return Object.fromEntries(data.map((r: any) => [r.shipment_id, r as ShipmentRisk]))
}

export async function getShipments(): Promise<Shipment[]> {
  const [shipmentsRes, bodiesById] = await Promise.all([
    supabase.from('shipments').select('*').is('deleted_at', null).order('pvoc_deadline', { ascending: true }),
    fetchBodiesById(),
  ])
  if (shipmentsRes.error) throw shipmentsRes.error

  const rows = shipmentsRes.data ?? []
  const ids = rows.map((s: any) => s.id)
  const [portalsByShipment, riskByShipment] = await Promise.all([
    fetchPortalsByShipmentIds(ids),
    fetchRiskByShipmentIds(ids),
  ])

  return rows.map((s: any) => ({
    ...s,
    regulatory_body: s.regulatory_body_id ? bodiesById[s.regulatory_body_id] : undefined,
    portals: portalsByShipment[s.id] ?? [],
    risk: riskByShipment[s.id],
  })) as Shipment[]
}

export async function getShipmentById(id: string): Promise<Shipment> {
  const { data, error } = await supabase.from('shipments').select('*').eq('id', id).single()
  if (error) throw error
  const s = data as any
  let regulatory_body: { id: string; code: string; name: string; country: string } | undefined
  if (s.regulatory_body_id) {
    const bodiesById = await fetchBodiesById()
    regulatory_body = bodiesById[s.regulatory_body_id]
  }
  return { ...s, regulatory_body } as Shipment
}

export async function updateShipment(id: string, updates: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('shipments')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function createShipment(shipment: Record<string, unknown>) {
  const { data, error } = await supabase
    .from('shipments')
    .insert(shipment)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function getKPIs() {
  const { data, error } = await supabase
    .from('shipments')
    .select('cif_value_usd, total_landed_cost_usd, total_landed_cost_kes, risk_flag_status, remediation_status')
    .is('deleted_at', null)
  if (error) throw error

  const rows = data ?? []
  const risk: Record<string, number> = { GREEN: 0, AMBER: 0, RED: 0 }
  const status: Record<string, number> = { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0, ESCALATED: 0 }

  rows.forEach((s) => {
    if (s.risk_flag_status) risk[s.risk_flag_status] = (risk[s.risk_flag_status] ?? 0) + 1
    if (s.remediation_status) status[s.remediation_status] = (status[s.remediation_status] ?? 0) + 1
  })

  return {
    total_shipments: rows.length,
    total_cif_usd: rows.reduce((sum, s) => sum + (s.cif_value_usd ?? 0), 0),
    total_landed_cost_usd: rows.reduce((sum, s) => sum + (s.total_landed_cost_usd ?? 0), 0),
    total_landed_cost_kes: rows.reduce((sum, s) => sum + (s.total_landed_cost_kes ?? 0), 0),
    risk,
    status,
  }
}
