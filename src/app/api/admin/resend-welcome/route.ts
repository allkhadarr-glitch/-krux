import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-admin-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { email } = await req.json()
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 })

  const resend = new Resend(process.env.RESEND_API_KEY)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

  const { data, error } = await resend.emails.send({
    from: 'KRUX <welcome@kruxvon.com>',
    to: email,
    subject: 'Welcome to KRUX — your workspace is ready',
    html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0A1628;font-family:system-ui,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 28px;">
    <div style="margin-bottom:28px;">
      <div style="display:inline-block;background:#00C896;color:#0A1628;font-weight:900;font-size:20px;padding:8px 14px;border-radius:10px;">K</div>
      <span style="color:#94A3B8;font-size:13px;margin-left:12px;">KRUX · Kenya Import Compliance</span>
    </div>
    <div style="background:#0F2040;border:1px solid #1E3A5F;border-radius:16px;padding:32px;">
      <h1 style="color:white;font-size:22px;font-weight:700;margin:0 0 8px 0;">You're in.</h1>
      <p style="color:#64748B;font-size:14px;margin:0 0 24px 0;">Your KRUX workspace is ready with 5 pre-loaded demo shipments.</p>
      <div style="background:#0A1628;border:1px solid #1E3A5F;border-radius:10px;padding:16px;margin-bottom:24px;">
        <p style="color:#94A3B8;font-size:13px;margin:0 0 10px 0;font-weight:600;">What's waiting for you:</p>
        <ul style="margin:0;padding:0 0 0 16px;color:#64748B;font-size:13px;line-height:2;">
          <li>5 Kenya shipments — RED, AMBER, and GREEN risk levels</li>
          <li>Jet A-1 fuel shipment with impossible EPRA clearance window</li>
          <li>AI compliance briefs for every shipment</li>
          <li>Morning Brief — what your 6:30am WhatsApp will look like</li>
        </ul>
      </div>
      <a href="${appUrl}/dashboard/operations" style="display:inline-block;background:#00C896;color:#0A1628;font-weight:700;font-size:14px;padding:12px 24px;border-radius:10px;text-decoration:none;">
        Open your dashboard →
      </a>
      <p style="color:#334155;font-size:12px;margin:20px 0 0 0;">
        When you're ready, clear the demo data in Settings and add your first real shipment.
      </p>
    </div>
    <p style="color:#1E3A5F;font-size:11px;text-align:center;margin:20px 0 0 0;">KRUX · Kenya Import Compliance Intelligence</p>
  </div>
</body>
</html>`,
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data?.id })
}
