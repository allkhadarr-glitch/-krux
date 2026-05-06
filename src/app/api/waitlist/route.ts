import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, company, role } = await req.json()
    if (!email?.trim()) return NextResponse.json({ error: 'Email required' }, { status: 400 })

    const { error } = await supabase
      .from('waitlist')
      .insert({ email: email.trim().toLowerCase(), company: company?.trim() || null, role: role || null })

    // 23505 = duplicate — don't re-send
    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!error && process.env.RESEND_API_KEY) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const result = await resend.emails.send({
          from: 'KRUX <noreply@kruxvon.com>',
          to: email.trim().toLowerCase(),
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
        })
        if (result.error) console.error('[waitlist] email failed:', JSON.stringify(result.error))
      } catch (e) {
        console.error('[waitlist] email error:', e)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
