import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data } = await supabaseAdmin
    .from('shipment_templates')
    .select('*, regulatory_body:regulatory_bodies(code, full_name)')
    .eq('organization_id', orgId)
    .order('use_count', { ascending: false })
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { name, hs_code, origin_country, regulatory_body_id, shipment_type, storage_rate_per_day, weight_kg, cif_value_usd, notes } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Template name required' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('shipment_templates')
    .insert({
      organization_id:     orgId,
      name:                name.trim(),
      hs_code:             hs_code             ?? null,
      origin_country:      origin_country       ?? null,
      regulatory_body_id:  regulatory_body_id   ?? null,
      shipment_type:       shipment_type        ?? 'STANDARD',
      storage_rate_per_day: storage_rate_per_day ?? null,
      weight_kg:           weight_kg            ?? null,
      cif_value_usd:       cif_value_usd        ?? null,
      notes:               notes                ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
