import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { getKesRate } from '@/lib/fx'
import { getRegulator, getWindowStatus } from '@/lib/regulatory-intelligence'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { orgId } = await getSessionContext(req)
  if (!orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [shipmentsRes, actionsRes, docsRes, bodiesRes, kesRate] = await Promise.all([
    supabaseAdmin
      .from('shipments')
      .select('id, pvoc_deadline, eta, cif_value_usd, regulatory_body_id, remediation_status, risk_flag_status')
      .eq('organization_id', orgId)
      .is('deleted_at', null),
    supabaseAdmin
      .from('actions')
      .select('id, status, completed_at')
      .eq('organization_id', orgId)
      .eq('status', 'COMPLETED')
      .gte('completed_at', monthStart.toISOString()),
    supabaseAdmin
      .from('shipment_documents')
      .select('id')
      .eq('organization_id', orgId)
      .gte('created_at', monthStart.toISOString()),
    supabaseAdmin.from('regulatory_bodies').select('id, code'),
    getKesRate(),
  ])

  const shipments = shipmentsRes.data ?? []
  const actions   = actionsRes.data   ?? []
  const docs      = docsRes.data      ?? []
  const bodies    = bodiesRes.data    ?? []

  const bodyById: Record<string, string> = Object.fromEntries(
    bodies.map((b: any) => [b.id, b.code])
  )

  const active = shipments.filter(s => s.remediation_status !== 'CLOSED')

  // Count impossible window catches — shipments where window is closed but still active
  let windowsCaught = 0
  let kesProtected  = 0

  for (const s of active) {
    const regCode = bodyById[s.regulatory_body_id]
    if (!regCode) continue

    const reg = getRegulator('KE', regCode)
    if (!reg) continue

    const ws = getWindowStatus({ pvoc_deadline: s.pvoc_deadline, eta: s.eta }, reg)
    if (ws?.status === 'IMPOSSIBLE' || ws?.status === 'TIGHT') {
      windowsCaught++
      const cif = Number(s.cif_value_usd ?? 0)
      const penalty = reg.penalty.type === 'seizure_risk'
        ? Math.round(cif * 0.15 * kesRate)
        : reg.penalty.type === 'pct_cif'
          ? Math.round(cif * (reg.penalty.rate_pct_per_week ?? 0.02) * kesRate)
          : Math.round(50 * 14 * kesRate)

      kesProtected += penalty
    }
  }

  return NextResponse.json({
    shipments_tracked:      active.length,
    windows_caught:         windowsCaught,
    actions_completed:      actions.length,
    documents_managed:      docs.length,
    kes_protected:          kesProtected,
    month:                  monthStart.toLocaleDateString('en-KE', { month: 'long', year: 'numeric' }),
  })
}
