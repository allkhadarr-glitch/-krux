import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const { error } = await supabaseAdmin
    .from('shipment_templates')
    .delete()
    .eq('id', id)
    .eq('organization_id', orgId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Increment use_count when a template is applied
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  await supabaseAdmin.rpc('increment_template_use', { p_id: id, p_org: orgId })
  return NextResponse.json({ ok: true })
}
