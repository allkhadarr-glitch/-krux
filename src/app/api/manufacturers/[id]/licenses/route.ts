import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabaseAdmin
    .from('manufacturer_licenses')
    .select('*')
    .eq('manufacturer_id', id)
    .order('expiry_date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const {
    license_name, license_type, license_number,
    issuing_body, issuing_country, expiry_date, scope, notes,
  } = body

  if (!license_name || !license_type || !issuing_body || !expiry_date) {
    return NextResponse.json({ error: 'license_name, license_type, issuing_body, expiry_date are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('manufacturer_licenses')
    .insert({
      manufacturer_id:  id,
      organization_id:  ORG_ID,
      license_name,
      license_type,
      license_number:   license_number || null,
      issuing_body,
      issuing_country:  issuing_country || 'IN',
      expiry_date,
      scope:            scope || null,
      notes:            notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
