import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ORG_ID = '00000000-0000-0000-0000-000000000001'

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from('manufacturers')
    .select('*, licenses:manufacturer_licenses(*)')
    .eq('organization_id', ORG_ID)
    .is('deleted_at', null)
    .order('company_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    company_name, country, city, state,
    primary_contact_name, primary_contact_email, primary_contact_phone,
    product_categories, overall_risk, notes,
  } = body

  if (!company_name || !country) {
    return NextResponse.json({ error: 'company_name and country are required' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('manufacturers')
    .insert({
      organization_id: ORG_ID,
      company_name,
      country,
      city:                  city || null,
      state:                 state || null,
      primary_contact_name:  primary_contact_name || null,
      primary_contact_email: primary_contact_email || null,
      primary_contact_phone: primary_contact_phone || null,
      product_categories:    product_categories ?? [],
      overall_risk:          overall_risk ?? 'AMBER',
      notes:                 notes || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
