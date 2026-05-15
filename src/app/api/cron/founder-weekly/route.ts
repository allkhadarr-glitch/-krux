import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'
const FOUNDER_TO  = 'hq@kruxvon.com'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })
}

async function buildReport() {
  const now     = new Date()
  const dayAgo  = new Date(now.getTime() - 24 * 3600000)
  const ds      = dayAgo.toISOString()

  const [
    { data: leads },
    { data: orgs },
    { data: realShipments },
    { data: debriefs },
    { data: dropoffs },
  ] = await Promise.all([
    // Warm/cold leads — window checker captures
    supabase.from('waitlist').select('email, lead_tier, lead_context, role, created_at')
      .gte('created_at', ds)
      .order('created_at', { ascending: false }),

    // New signups
    supabase.from('organizations').select('id, name, created_at')
      .gte('created_at', ds)
      .eq('subscription_tier', 'trial'),

    // New real shipments (non-demo reference numbers)
    supabase.from('shipments').select('id, reference_number, name, created_at')
      .gte('created_at', ds)
      .not('reference_number', 'like', 'KRUX-%-%-%'),

    // Debriefs completed
    supabase.from('clearance_outcomes').select('id, created_at').gte('created_at', ds),

    // Drop-offs — people who started signup but didn't complete
    supabase.from('waitlist').select('email, company, role, lead_context, created_at')
      .gte('created_at', ds)
      .in('role', ['signup_intent', 'signup_failed', 'signup_duplicate'])
      .order('created_at', { ascending: false }),
  ])

  const allLeads    = leads ?? []
  const hot         = allLeads.filter(l => l.lead_tier === 'HOT' && l.role === 'window_check')
  const warm        = allLeads.filter(l => l.lead_tier === 'WARM')
  const cold        = allLeads.filter(l => !l.lead_tier || l.lead_tier === 'COLD')
  const intents     = (dropoffs ?? []).filter(d => d.role === 'signup_intent')
  const failed      = (dropoffs ?? []).filter(d => d.role === 'signup_failed')
  const duplicates  = (dropoffs ?? []).filter(d => d.role === 'signup_duplicate')

  const totalKES = warm.reduce((s, l) => s + (l.lead_context?.kes_exposure ?? 0), 0)
  const warmSorted = [...warm].sort((a, b) => {
    const order = { IMPOSSIBLE: 0, TIGHT: 1, OPEN: 2 }
    return (order[a.lead_context?.result_status as keyof typeof order] ?? 2) -
           (order[b.lead_context?.result_status as keyof typeof order] ?? 2)
  })

  const dateLabel = fmt(now.toISOString())

  function statBox(label: string, val: number | string, color: string) {
    return `<div style="background:#0F2040;border:1px solid #1E3A5F;padding:14px;text-align:center;">
      <div style="color:${color};font-size:22px;font-weight:900;">${val}</div>
      <div style="color:#334155;font-size:10px;letter-spacing:1px;text-transform:uppercase;margin-top:4px;">${label}</div>
    </div>`
  }

  const warmRows = warmSorted.slice(0, 6).map(l => {
    const ctx = l.lead_context ?? {}
    const c   = ctx.result_status === 'IMPOSSIBLE' ? '#EF4444' : '#F59E0B'
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:white;font-size:12px;">${l.email}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:#94A3B8;font-size:12px;">${ctx.regulator ?? '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;font-size:11px;font-weight:700;color:${c};">${ctx.result_status ?? '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:#EF4444;font-size:11px;">${ctx.kes_exposure ? `KES ${Number(ctx.kes_exposure).toLocaleString()}` : '—'}</td>
    </tr>`
  }).join('')

  const dropoffRows = (dropoffs ?? []).slice(0, 8).map(d => {
    const stageColor = d.role === 'signup_intent' ? '#F59E0B' : d.role === 'signup_duplicate' ? '#3B82F6' : '#EF4444'
    const stageLabel = d.role === 'signup_intent' ? 'Abandoned' : d.role === 'signup_duplicate' ? 'Duplicate' : 'Failed'
    return `<tr>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:white;font-size:12px;">${d.email}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:#64748B;font-size:11px;">${d.company || '—'}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;font-size:11px;font-weight:700;color:${stageColor};">${stageLabel}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #1E3A5F;color:#334155;font-size:10px;">${fmt(d.created_at)}</td>
    </tr>`
  }).join('')

  const callList = warmSorted.slice(0, 5).map((l, i) => {
    const ctx = l.lead_context ?? {}
    const label = ctx.result_status === 'IMPOSSIBLE' ? `${ctx.regulator} · CLOSED · urgent call` : `${ctx.regulator} · TIGHT · follow up`
    return `<div style="padding:9px 0;border-bottom:1px solid #1E3A5F;">
      <span style="color:#334155;font-size:11px;margin-right:8px;">${i + 1}.</span>
      <span style="color:white;font-size:12px;font-weight:700;">${l.email}</span>
      <span style="color:#64748B;font-size:11px;margin-left:8px;">${label}</span>
    </div>`
  }).join('')

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:600px;margin:0 auto;padding:40px 28px;">

  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:4px;">KRUX LAB</div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:2px;margin-bottom:32px;">DAILY REPORT · ${dateLabel}</div>

  <!-- Funnel -->
  <div style="border:1px solid #1E3A5F;padding:22px;margin-bottom:20px;">
    <div style="color:#64748B;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Funnel · Last 24h</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;">
      ${statBox('Warm Leads', warm.length, warm.length > 0 ? '#F59E0B' : '#334155')}
      ${statBox('Signups', (orgs ?? []).length, (orgs ?? []).length > 0 ? '#00C896' : '#334155')}
      ${statBox('Abandoned', intents.length, intents.length > 0 ? '#F59E0B' : '#334155')}
      ${statBox('Failed', failed.length + duplicates.length, (failed.length + duplicates.length) > 0 ? '#EF4444' : '#334155')}
    </div>
  </div>

  <!-- Lab -->
  <div style="border:1px solid #1E3A5F;padding:22px;margin-bottom:20px;">
    <div style="color:#64748B;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px;">Lab · Last 24h</div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
      ${statBox('Real Shipments', (realShipments ?? []).length, (realShipments ?? []).length > 0 ? '#00C896' : '#334155')}
      ${statBox('Debriefs', (debriefs ?? []).length, (debriefs ?? []).length > 0 ? '#00C896' : '#334155')}
      ${statBox('KES at Risk', totalKES > 0 ? `${(totalKES/1000).toFixed(0)}K` : '0', totalKES > 0 ? '#EF4444' : '#334155')}
    </div>
  </div>

  <!-- Warm leads -->
  ${warmRows ? `
  <div style="border:1px solid #F59E0B;margin-bottom:20px;overflow:hidden;">
    <div style="padding:12px 16px;background:#0F2040;border-bottom:1px solid #1E3A5F;">
      <span style="color:#F59E0B;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Warm Leads — Window Checker</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#060E1A;">
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Email</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Reg</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Result</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">KES Risk</th>
      </tr></thead>
      <tbody>${warmRows}</tbody>
    </table>
  </div>` : ''}

  <!-- Drop-offs -->
  ${dropoffRows ? `
  <div style="border:1px solid #1E3A5F;margin-bottom:20px;overflow:hidden;">
    <div style="padding:12px 16px;background:#0F2040;border-bottom:1px solid #1E3A5F;">
      <span style="color:#94A3B8;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;">Signup Drop-offs</span>
      <span style="color:#334155;font-size:10px;margin-left:8px;">— started but didn't complete</span>
    </div>
    <table style="width:100%;border-collapse:collapse;">
      <thead><tr style="background:#060E1A;">
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Email</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Company</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Stage</th>
        <th style="padding:8px 12px;text-align:left;color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;">Time</th>
      </tr></thead>
      <tbody>${dropoffRows}</tbody>
    </table>
  </div>` : `<div style="border:1px solid #1E3A5F;padding:16px;margin-bottom:20px;color:#334155;font-size:12px;">No signup drop-offs in the last 24h.</div>`}

  <!-- Call list -->
  ${callList ? `
  <div style="border:1px solid #00C896;padding:18px 22px;margin-bottom:28px;">
    <div style="color:#00C896;font-size:10px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:10px;">Today's Call List</div>
    ${callList}
  </div>` : `<div style="border:1px solid #1E3A5F;padding:16px;margin-bottom:28px;color:#334155;font-size:12px;">No warm leads to call today.</div>`}

  <a href="${APP_URL}/dashboard/today" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:12px 24px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Open Dashboard →</a>

  <div style="border-top:1px solid #1E3A5F;margin-top:28px;padding-top:14px;color:#1E3A5F;font-size:10px;">KRUX Lab · Daily Report · ${dateLabel}</div>
</div>
</body>
</html>`

  return {
    html, dateLabel,
    warm: warm.length, signups: (orgs ?? []).length,
    abandoned: intents.length, failed: failed.length + duplicates.length,
    ships: (realShipments ?? []).length, debriefs: (debriefs ?? []).length,
  }
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not set' })
  }

  const report = await buildReport()
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  await resend.emails.send({
    from:    'KRUX Lab <noreply@kruxvon.com>',
    to:      FOUNDER_TO,
    subject: `KRUX Lab · ${report.dateLabel} · ${report.warm} warm · ${report.signups} signups · ${report.abandoned} abandoned`,
    html:    report.html,
  })

  return NextResponse.json({ ok: true, ...report })
}
