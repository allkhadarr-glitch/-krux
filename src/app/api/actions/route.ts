import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ORG_ID       = '00000000-0000-0000-0000-000000000001'
const MIN_ORG_SAMPLES = 20

// Strips regulator suffix to get the base action type for model lookup
function baseType(actionType: string): string {
  return actionType.replace(/_[A-Z]{2,10}$/, '')
}

// Extracts regulator suffix if it's a known regulator code
function extractRegulator(actionType: string): string {
  const KNOWN = ['KEBS', 'PPB', 'KRA', 'KEPHIS', 'KENTRADE', 'PCPB', 'EPRA', 'NEMA', 'GMP']
  const parts  = actionType.split('_')
  const suffix = parts[parts.length - 1]
  return KNOWN.includes(suffix) ? suffix : ''
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const status     = searchParams.get('status')
  const priority   = searchParams.get('priority')
  const shipmentId = searchParams.get('shipment_id')

  let query = supabase
    .from('actions')
    .select(`*, shipment:shipments(id, name, reference_number, pvoc_deadline, risk_flag_status)`)
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false })

  if (status && status !== 'all') {
    query = query.eq('status', status)
  } else if (!status) {
    query = query.in('status', ['OPEN', 'IN_PROGRESS'])
  }

  if (priority)   query = query.eq('priority', priority)
  if (shipmentId) query = query.eq('shipment_id', shipmentId)

  const { data: actions, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!actions?.length) return NextResponse.json([])

  // ── Batch fetch effectiveness model for all unique action types ──
  const uniqueBases = [...new Set(actions.map((a: any) => baseType(a.action_type)))]

  const { data: models } = await supabase
    .from('action_effectiveness_model')
    .select('organization_id, action_type, regulator, avg_effectiveness, sample_size')
    .or(`organization_id.eq.${ORG_ID},organization_id.is.null`)
    .in('action_type', uniqueBases)

  // Build lookup: `${orgOrGlobal}|${action_type}|${regulator}` → model row
  const modelMap = new Map<string, any>()
  for (const m of models ?? []) {
    const org = m.organization_id ?? 'GLOBAL'
    const key = `${org}|${m.action_type}|${m.regulator ?? ''}`
    modelMap.set(key, m)
  }

  // ── Attach predicted effectiveness to each action ────────────
  const enriched = actions.map((action: any) => {
    const base = baseType(action.action_type)
    const reg  = extractRegulator(action.action_type)

    const orgKey    = `${ORG_ID}|${base}|${reg}`
    const globalKey = `GLOBAL|${base}|${reg}`
    const globalAny = `GLOBAL|${base}|`

    const orgModel    = modelMap.get(orgKey)
    const globalModel = modelMap.get(globalKey) ?? modelMap.get(globalAny)

    let predicted_effectiveness: number | null = null
    let effectiveness_tier: 'org' | 'global' | null = null
    let effectiveness_sample_size = 0

    if (orgModel && orgModel.sample_size >= MIN_ORG_SAMPLES) {
      // Org-specific data with enough signal — show as trusted
      predicted_effectiveness    = orgModel.avg_effectiveness
      effectiveness_tier         = 'org'
      effectiveness_sample_size  = orgModel.sample_size
    } else if (globalModel && globalModel.sample_size >= MIN_ORG_SAMPLES) {
      // Global accumulated data — show as industry baseline
      predicted_effectiveness    = globalModel.avg_effectiveness
      effectiveness_tier         = 'global'
      effectiveness_sample_size  = globalModel.sample_size
    }
    // Otherwise: null → UI shows "Learning..."
    // Seeded priors have sample_size = 0 so they correctly fall through

    return {
      ...action,
      predicted_effectiveness,
      effectiveness_tier,
      effectiveness_sample_size,
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await supabase
    .from('actions')
    .insert({
      organization_id: ORG_ID,
      action_type:     body.action_type,
      priority:        body.priority ?? 'MEDIUM',
      title:           body.title,
      description:     body.description ?? null,
      shipment_id:     body.shipment_id ?? null,
      due_date:        body.due_date    ?? null,
      source:          'USER',
      trigger_reason:  body.trigger_reason ?? null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
