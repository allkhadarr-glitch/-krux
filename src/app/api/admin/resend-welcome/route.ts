import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to     = searchParams.get('to')
  const secret = searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!to) return NextResponse.json({ error: 'Pass ?to=email' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'No RESEND_API_KEY' }, { status: 500 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'
  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  // Look up their KTIN
  let ktin: string | null = null
  try {
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', (await supabaseAdmin.auth.admin.listUsers()).data.users.find(u => u.email === to)?.id ?? '')
      .maybeSingle()
    if (profile?.organization_id) {
      const { data: entity } = await supabaseAdmin
        .from('krux_entities')
        .select('krux_id')
        .eq('organization_id', profile.organization_id)
        .maybeSingle()
      ktin = entity?.krux_id ?? null
    }
  } catch {}

  const [welcomeResult, alertResult] = await Promise.all([
    resend.emails.send({
      from: 'KRUX <noreply@kruxvon.com>',
      to,
      subject: ktin ? `${ktin} · issued` : 'Your KRUX workspace is live',
      html: `<!DOCTYPE html>
<html>
<head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:48px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:40px;">KRUX</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:40px;"></div>
  ${ktin ? `<div style="color:#00C896;font-size:28px;font-weight:900;letter-spacing:3px;margin-bottom:16px;">${ktin}</div>` : ''}
  <div style="color:#94A3B8;font-size:13px;margin-bottom:40px;">Your workspace is live.</div>
  <a href="${appUrl}/dashboard/today" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">OPEN WORKSPACE</a>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  ${ktin ? `<div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com/verify/${ktin}</div>` : `<div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com</div>`}
</div>
</body>
</html>`,
    }),

    resend.emails.send({
      from: 'KRUX <noreply@kruxvon.com>',
      to: process.env.ALERT_EMAIL ?? 'mabdikadirhaji@gmail.com',
      subject: ktin ? `${ktin} · ${to}` : `New signup: ${to}`,
      html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:400px;margin:0 auto;padding:32px 24px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:24px;">KRUX · New Operator</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:24px;"></div>
  ${ktin ? `<div style="color:#00C896;font-size:20px;font-weight:900;letter-spacing:2px;margin-bottom:8px;">${ktin}</div>` : ''}
  <div style="color:white;font-size:13px;margin-bottom:4px;">${to}</div>
  <div style="color:#334155;font-size:11px;margin-bottom:24px;">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'short' })} EAT</div>
  <a href="${appUrl}/admin" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:10px 20px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">VIEW IN ADMIN</a>
</div>
</body>
</html>`,
    }),
  ])

  return NextResponse.json({
    welcome: welcomeResult.error ?? { id: welcomeResult.data?.id },
    alert:   alertResult.error   ?? { id: alertResult.data?.id },
    ktin,
  })
}
