import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ktin: string }> }
) {
  const { ktin } = await params

  const { data: entity, error } = await supabase
    .from('krux_entities')
    .select('krux_id, entity_type, compliance_tier, compliance_score, total_shipments, created_at, organization_id')
    .eq('krux_id', ktin.toUpperCase())
    .maybeSingle()

  if (error)  return NextResponse.json({ error: 'Lookup failed' }, { status: 500 })
  if (!entity) return NextResponse.json({ error: 'KTIN not found' }, { status: 404 })

  const { data: org } = await supabase
    .from('organizations')
    .select('name, country, type')
    .eq('id', entity.organization_id)
    .maybeSingle()

  const TYPE_LABEL: Record<string, string> = {
    IMP: 'Importer', AGT: 'Clearing Agent', MFG: 'Manufacturer',
    EXP: 'Exporter', BRK: 'Broker',
  }

  return NextResponse.json({
    ktin:             entity.krux_id,
    entity_name:      org?.name ?? null,
    entity_type:      entity.entity_type,
    entity_type_label: TYPE_LABEL[entity.entity_type] ?? entity.entity_type,
    country:          org?.country ?? 'KE',
    compliance_tier:  entity.total_shipments >= 5 ? entity.compliance_tier : null,
    compliance_score: entity.total_shipments >= 5 ? entity.compliance_score : null,
    total_shipments:  entity.total_shipments,
    issued_at:        entity.created_at,
    verified:         true,
    source:           'KRUX · East Africa\'s trade standard',
    verify_url:       `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'}/verify/${entity.krux_id}`,
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
