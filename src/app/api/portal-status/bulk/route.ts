import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/session'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { shipmentIds } = await req.json()
  if (!Array.isArray(shipmentIds) || !shipmentIds.length) return NextResponse.json({})

  const { orgId } = await getSessionContext(req)

  const { data: owned } = await supabaseAdmin
    .from('shipments')
    .select('id')
    .in('id', shipmentIds)
    .eq('organization_id', orgId)

  const ownedIds = (owned ?? []).map((s: any) => s.id)
  if (!ownedIds.length) return NextResponse.json({})

  const keys = ownedIds.map((id: string) => `portal_status:${id}`)
  const { data } = await supabaseAdmin
    .from('ai_cache')
    .select('cache_key, output')
    .in('cache_key', keys)

  const result: Record<string, unknown> = {}
  for (const row of data ?? []) {
    const id = (row.cache_key as string).replace('portal_status:', '')
    try { result[id] = JSON.parse(row.output) } catch { /* ignore */ }
  }
  return NextResponse.json(result)
}
