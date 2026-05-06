import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: entities } = await supabaseAdmin
    .from('krux_entities')
    .select('id, organization_id')
    .not('organization_id', 'is', null)

  if (!entities?.length) return NextResponse.json({ updated: 0 })

  let updated = 0

  for (const entity of entities) {
    const { data: events } = await supabaseAdmin
      .from('shipment_events')
      .select('event_type, days_since_created, created_at')
      .eq('organization_id', entity.organization_id)
      .in('event_type', ['SHIPMENT_CREATED', 'CLEARED'])

    if (!events?.length) continue

    const created = events.filter(e => e.event_type === 'SHIPMENT_CREATED')
    const cleared  = events.filter(e => e.event_type === 'CLEARED')
    const total    = created.length
    if (total === 0) continue

    const avgDays = cleared.length
      ? cleared.reduce((s, e) => s + (e.days_since_created ?? 0), 0) / cleared.length
      : null

    const lastAt = [...created].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0]?.created_at ?? null

    let score: number | null = null
    let tier: string | null  = null

    if (total >= 5) {
      const clearanceRate = cleared.length / total
      const speedBonus = avgDays == null ? 5
        : avgDays <= 7  ? 20
        : avgDays <= 14 ? 15
        : avgDays <= 21 ? 10
        : 5
      score = Math.min(100, Math.round(clearanceRate * 75) + speedBonus)
      tier  = score >= 85 ? 'PLATINUM'
            : score >= 70 ? 'GOLD'
            : score >= 50 ? 'SILVER'
            : 'BRONZE'
    }

    await supabaseAdmin
      .from('krux_entities')
      .update({
        total_shipments:    total,
        cleared_on_time:    cleared.length,
        avg_clearance_days: avgDays != null ? Math.round(avgDays * 10) / 10 : null,
        compliance_score:   score,
        compliance_tier:    tier,
        last_shipment_at:   lastAt,
        updated_at:         new Date().toISOString(),
      })
      .eq('id', entity.id)

    updated++
  }

  return NextResponse.json({ updated, total: entities.length })
}
