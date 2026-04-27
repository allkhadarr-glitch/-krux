import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextRequest, NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const FROM = 'KRUX <welcome@kruxvon.com>'

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

async function buildAndSend() {
  const resend  = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  const kesRate = await getKesRate()
  const today   = new Date()
  const weekAgo = new Date(today.getTime() - 7 * 86400000)

  // All active shipments
  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, organization_id, name, reference_number, pvoc_deadline, risk_flag_status, remediation_status, cif_value_usd, storage_rate_per_day, regulatory_body_id, client_name, created_at')
    .is('deleted_at', null)
    .order('pvoc_deadline', { ascending: true })

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code')
  const bodyById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b.code]))

  // Group by org
  const byOrg: Record<string, any[]> = {}
  for (const s of shipments ?? []) {
    if (!byOrg[s.organization_id]) byOrg[s.organization_id] = []
    byOrg[s.organization_id].push(s)
  }

  let totalSent = 0

  for (const [orgId, orgShipments] of Object.entries(byOrg)) {
    // Get management + operations users for this org
    const { data: users } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, role')
      .eq('organization_id', orgId)
      .in('role', ['management', 'operations', 'krux_admin'])

    // Get email from Supabase auth users
    const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers()
    const userEmails: string[] = []
    for (const up of users ?? []) {
      // Find matching auth user by org — management role gets digest, others only on request
      if (up.role === 'management' || up.role === 'krux_admin') {
        const found = authUsers?.users?.find((u: any) =>
          u.user_metadata?.organization_id === orgId || u.email
        )
        if (found?.email) userEmails.push(found.email)
      }
    }

    // Also send to alert email if configured
    if (process.env.ALERT_EMAIL) userEmails.push(process.env.ALERT_EMAIL)

    const active  = orgShipments.filter(s => s.remediation_status !== 'CLOSED')
    const cleared = orgShipments.filter(s =>
      s.remediation_status === 'CLOSED' && new Date(s.updated_at ?? s.created_at) >= weekAgo
    )

    const enriched = active.map(s => ({
      ...s,
      reg:  bodyById[s.regulatory_body_id] ?? '—',
      days: s.pvoc_deadline ? daysUntil(s.pvoc_deadline) : null,
      dailyCostKES: Math.round((s.storage_rate_per_day ?? 50) * kesRate),
    }))

    const critical = enriched.filter(s => s.days !== null && s.days <= 3)
    const urgent   = enriched.filter(s => s.days !== null && s.days > 3 && s.days <= 7)
    const totalKES = enriched.reduce((sum, s) => {
      const atRisk = Math.max(0, 14 - Math.max(0, s.days ?? 14))
      return sum + s.dailyCostKES * atRisk
    }, 0)

    const weekLabel = `${fmt(weekAgo.toISOString())} – ${fmt(today.toISOString())}`

    // Build email rows for top critical/urgent shipments
    const topRows = [...critical, ...urgent].slice(0, 5).map(s => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1E3A5F;color:white;font-size:13px;">${s.name}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E3A5F;color:#94A3B8;font-size:12px;">${s.reg}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E3A5F;font-size:12px;color:${s.days !== null && s.days <= 3 ? '#EF4444' : '#F59E0B'};font-weight:700;">${s.days !== null && s.days > 0 ? `${s.days}d` : 'OVERDUE'}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1E3A5F;color:#64748B;font-size:11px;">${s.client_name ?? '—'}</td>
      </tr>
    `).join('')

    const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
<div style="max-width:620px;margin:0 auto;padding:40px 24px;">

  <div style="margin-bottom:28px;display:flex;align-items:center;gap:12px;">
    <div style="background:#00C896;color:#0A1628;font-weight:900;font-size:18px;padding:6px 12px;border-radius:8px;display:inline-block;">K</div>
    <span style="color:#94A3B8;font-size:13px;">KRUX · Weekly Portfolio Digest</span>
  </div>

  <div style="background:#0F2040;border:1px solid #1E3A5F;border-radius:16px;padding:28px;margin-bottom:20px;">
    <h1 style="color:white;font-size:20px;font-weight:700;margin:0 0 4px 0;">Portfolio Summary</h1>
    <p style="color:#64748B;font-size:13px;margin:0 0 24px 0;">${weekLabel}</p>

    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
      ${[
        { label: 'Active', val: active.length, color: 'white' },
        { label: 'Critical', val: critical.length, color: critical.length > 0 ? '#EF4444' : '#00C896' },
        { label: 'Cleared', val: cleared.length, color: '#00C896' },
        { label: 'KES at Risk', val: totalKES >= 1_000_000 ? `${(totalKES/1_000_000).toFixed(1)}M` : totalKES.toLocaleString(), color: '#F59E0B' },
      ].map(({ label, val, color }) => `
        <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:${color};font-size:20px;font-weight:900;">${val}</div>
          <div style="color:#64748B;font-size:11px;margin-top:4px;">${label}</div>
        </div>
      `).join('')}
    </div>

    ${topRows ? `
    <h2 style="color:white;font-size:14px;font-weight:700;margin:0 0 12px 0;">Needs Attention</h2>
    <table style="width:100%;border-collapse:collapse;background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;overflow:hidden;">
      <thead>
        <tr style="background:#1E3A5F;">
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;">Shipment</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;">Reg</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;">Deadline</th>
          <th style="padding:8px 12px;text-align:left;color:#64748B;font-size:11px;font-weight:600;text-transform:uppercase;">Client</th>
        </tr>
      </thead>
      <tbody>${topRows}</tbody>
    </table>
    ` : `<p style="color:#00C896;font-size:13px;font-weight:600;">✅ No critical or urgent shipments this week.</p>`}
  </div>

  <div style="text-align:center;margin-bottom:20px;">
    <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'}/dashboard/operations"
      style="display:inline-block;background:#00C896;color:#0A1628;font-weight:700;font-size:14px;padding:14px 32px;border-radius:10px;text-decoration:none;">
      Open Dashboard →
    </a>
  </div>

  <p style="color:#334155;font-size:11px;text-align:center;margin:0;">
    KRUX · Kenya Import Compliance · Weekly digest · ${weekLabel}
  </p>
</div>
</body>
</html>`

    const recipients = [...new Set(userEmails)].filter(Boolean)
    if (resend && recipients.length) {
      await resend.emails.send({
        from:    FROM,
        to:      recipients,
        subject: `KRUX Weekly: ${active.length} active · ${critical.length} critical · KES ${totalKES >= 1_000_000 ? `${(totalKES/1_000_000).toFixed(1)}M` : totalKES.toLocaleString()} at risk`,
        html,
      })
      totalSent++
    }
  }

  return { ok: true, orgs_notified: totalSent }
}

export async function POST() {
  const result = await buildAndSend()
  return NextResponse.json(result)
}

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const result = await buildAndSend()
  return NextResponse.json(result)
}
