import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

function eatTime() {
  return new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
}

async function sendFounderAlert(email: string, lead_tier: string, lead_context: any) {
  if (!process.env.RESEND_API_KEY) return
  const alertEmail = 'hq@kruxvon.com'
  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const isWarm = lead_tier === 'WARM'
    const ctx = lead_context ?? {}
    const urgencyColor = ctx.result_status === 'IMPOSSIBLE' ? '#EF4444' : '#F59E0B'

    const actionLine = isWarm
      ? ctx.result_status === 'IMPOSSIBLE'
        ? `This person has a <strong style="color:#EF4444">closed ${ctx.regulator} window</strong> — ${ctx.days_short}d short${ctx.kes_exposure ? `, KES ${Number(ctx.kes_exposure).toLocaleString()} at risk` : ''}. Contact today.`
        : `This person has a <strong style="color:#F59E0B">tight ${ctx.regulator} window</strong> — ${ctx.buffer_days}d buffer remaining. Follow up this week.`
      : `New waitlist capture. No window check context.`

    await resend.emails.send({
      from: 'KRUX Lab <noreply@kruxvon.com>',
      to:   alertEmail,
      subject: `${isWarm ? (ctx.result_status === 'IMPOSSIBLE' ? '🔴' : '🟡') : '⚪'} ${lead_tier} LEAD — ${email}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:520px;margin:0 auto;padding:40px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">KRUX LAB</div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:2px;margin-bottom:32px;">LEAD ALERT · ${eatTime()}</div>

  <div style="border:1px solid ${isWarm ? urgencyColor : '#1E3A5F'};padding:20px 24px;margin-bottom:24px;">
    <div style="color:${isWarm ? urgencyColor : '#64748B'};font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:12px;">${lead_tier} LEAD</div>
    <div style="color:white;font-size:18px;font-weight:700;margin-bottom:4px;">${email}</div>
    <div style="color:#64748B;font-size:11px;">Source: Window checker</div>
  </div>

  ${isWarm && ctx.result_status ? `
  <div style="background:#0F2040;border:1px solid #1E3A5F;padding:16px 20px;margin-bottom:24px;">
    <div style="color:#64748B;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">What they checked</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
      <div>
        <div style="color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Regulator</div>
        <div style="color:white;font-size:14px;font-weight:700;">${ctx.regulator ?? '—'}</div>
        <div style="color:#64748B;font-size:11px;">${ctx.regulator_name ?? ''}</div>
      </div>
      <div>
        <div style="color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Result</div>
        <div style="color:${urgencyColor};font-size:14px;font-weight:700;">${ctx.result_status ?? '—'}</div>
        <div style="color:#64748B;font-size:11px;">${ctx.result_status === 'IMPOSSIBLE' ? `${ctx.days_short}d short` : `${ctx.buffer_days}d buffer`}</div>
      </div>
      ${ctx.kes_exposure ? `
      <div>
        <div style="color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">KES at risk</div>
        <div style="color:#EF4444;font-size:14px;font-weight:700;">KES ${Number(ctx.kes_exposure).toLocaleString()}</div>
      </div>` : ''}
      <div>
        <div style="color:#334155;font-size:10px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">SLA needed</div>
        <div style="color:#94A3B8;font-size:14px;font-weight:700;">${ctx.sla_days ?? '—'}d</div>
        <div style="color:#64748B;font-size:11px;">${ctx.days_remaining ?? '—'}d to ETA</div>
      </div>
    </div>
  </div>
  ` : ''}

  <div style="border-left:3px solid ${isWarm ? urgencyColor : '#1E3A5F'};padding:12px 16px;margin-bottom:32px;background:#0F2040;">
    <div style="color:#94A3B8;font-size:12px;line-height:1.7;">→ ${actionLine}</div>
  </div>

  <a href="${APP_URL}/dashboard/today" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:12px 24px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Open Dashboard →</a>
</div>
</body>
</html>`,
    })
  } catch (e) {
    console.error('[waitlist] founder alert failed:', e)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { email, company, role, lead_context } = await req.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const lead_tier = lead_context?.result_status === 'IMPOSSIBLE' || lead_context?.result_status === 'TIGHT'
      ? 'WARM'
      : 'COLD'

    const { error } = await supabase
      .from('waitlist')
      .insert({
        email:        email.trim().toLowerCase(),
        company:      company?.trim() || null,
        role:         role || null,
        lead_tier,
        lead_context: lead_context ?? null,
      })

    // 23505 = duplicate — still alert founder for duplicates if they engaged
    const isDuplicate = error?.code === '23505'
    if (error && !isDuplicate) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fire in parallel: visitor email + founder alert
    if (process.env.RESEND_API_KEY) {
      const appUrl = APP_URL
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)

      await Promise.allSettled([
        // Visitor email (only on first capture, not duplicate)
        !isDuplicate ? resend.emails.send({
          from: 'KRUX <noreply@kruxvon.com>',
          to:   email.trim().toLowerCase(),
          subject: 'That window was closed.',
          html: `<!DOCTYPE html>
<html>
<head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:48px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:40px;">KRUX</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:40px;"></div>
  <div style="color:#94A3B8;font-size:13px;line-height:1.9;margin-bottom:40px;">You checked a compliance window. It was closed.<br><br>KRUX tracks all 9 Kenya regulatory bodies and flags impossible windows before goods leave origin.</div>
  <a href="${appUrl}/signup" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">APPLY FOR KTIN</a>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com</div>
</div>
</body>
</html>`,
        }) : Promise.resolve(),

        // Founder alert (always, even on duplicate re-engage)
        sendFounderAlert(email.trim().toLowerCase(), lead_tier, lead_context),
      ])
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
