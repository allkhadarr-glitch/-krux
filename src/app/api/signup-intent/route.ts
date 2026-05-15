import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email, company, stage } = await req.json()
    if (!email?.trim() || !email.includes('@')) return NextResponse.json({ ok: true })

    const clean = email.trim().toLowerCase()

    // Check if already a full signup — don't overwrite with intent
    const { data: existing } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
    // Simple check: if they're already in auth, skip
    const { data: authUser } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const alreadySigned = authUser?.users?.some((u: any) => u.email?.toLowerCase() === clean)
    if (alreadySigned) return NextResponse.json({ ok: true })

    // Upsert to waitlist — don't overwrite a hotter stage
    const { data: existing_entry } = await supabase
      .from('waitlist')
      .select('role')
      .eq('email', clean)
      .maybeSingle()

    const hotterRoles = new Set(['signup_failed', 'signup_duplicate', 'window_check'])
    if (existing_entry && hotterRoles.has(existing_entry.role)) {
      return NextResponse.json({ ok: true })
    }

    await supabase.from('waitlist').upsert(
      { email: clean, company: company || null, role: 'signup_intent', lead_tier: 'HOT', lead_context: { stage } },
      { onConflict: 'email', ignoreDuplicates: false }
    )

    // Notify founder — fire and forget
    if (process.env.RESEND_API_KEY) {
      const eatTime = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      resend.emails.send({
        from:    'KRUX Lab <noreply@kruxvon.com>',
        to:      'hq@kruxvon.com',
        subject: `👀 SIGNUP INTENT — ${clean}`,
        html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:36px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">KRUX LAB</div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:2px;margin-bottom:28px;">SIGNUP INTENT · ${eatTime}</div>

  <div style="border:1px solid #F59E0B;padding:18px 22px;margin-bottom:20px;">
    <div style="color:#F59E0B;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:10px;">STARTED SIGNUP — NOT YET SUBMITTED</div>
    <div style="color:white;font-size:17px;font-weight:700;margin-bottom:4px;">${clean}</div>
    ${company ? `<div style="color:#64748B;font-size:12px;">Company: ${company}</div>` : '<div style="color:#334155;font-size:12px;">Company: not entered yet</div>'}
  </div>

  <div style="border-left:3px solid #F59E0B;padding:12px 16px;background:#0F2040;margin-bottom:28px;">
    <div style="color:#94A3B8;font-size:12px;line-height:1.7;">
      → This person entered their email on the signup page but has not submitted yet. They may still convert — or something stopped them (password too short, company field unclear, etc.).<br/><br/>
      If they don't show up as a signup in the next 10 minutes, they dropped off.
    </div>
  </div>

  <a href="https://kruxvon.com/dashboard" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:12px 24px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Open Dashboard →</a>
</div>
</body>
</html>`,
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
