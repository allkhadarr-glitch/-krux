import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { seedDemoData } from '@/lib/seed-demo-data'
import { randomBytes } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { email: rawEmail } = await req.json()
    const email = rawEmail?.trim()?.toLowerCase()
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 })
    }

    if (email === process.env.DEMO_USER_EMAIL?.toLowerCase()) {
      return NextResponse.json({ exists: true })
    }

    const tempPassword = randomBytes(24).toString('base64url')

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createErr) {
      // User already exists — find them and issue a fresh temp password so they can auto sign-in.
      // This handles the case where a previous activation partially failed (account created, error returned).
      const newPwd = randomBytes(24).toString('base64url')
      const { data: listData } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      const existing = (listData?.users ?? []).find((u: any) => u.email?.toLowerCase() === email)
      if (existing?.id) {
        await supabase.auth.admin.updateUserById(existing.id, { password: newPwd })
        return NextResponse.json({ password: newPwd })
      }
      return NextResponse.json({ exists: true })
    }

    const userId   = created.user.id
    const domain   = email.split('@')[1]?.split('.')[0] ?? 'My'
    const orgLabel = domain.charAt(0).toUpperCase() + domain.slice(1)

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({
        name:              `${orgLabel} Imports`,
        type:              'clearing_agent_firm',
        subscription_tier: 'trial',
        is_active:         true,
      })
      .select('id')
      .single()

    if (orgErr || !org) {
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Account setup failed' }, { status: 500 })
    }

    await supabase.from('user_profiles').insert({
      user_id:         userId,
      organization_id: org.id,
      role:            'admin',
    })

    // Seed demo data — non-fatal, account is valid regardless
    try {
      await seedDemoData(supabase, org.id)
    } catch (e) {
      console.error('[activate] seedDemoData error (non-fatal):', e)
    }

    // Notify founder — non-fatal
    if (process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        const eatTime = new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'medium', timeStyle: 'short' })
        await resend.emails.send({
          from:    'KRUX Lab <noreply@kruxvon.com>',
          to:      'hq@kruxvon.com',
          subject: `🟢 HOT LEAD — KTIN application: ${email}`,
          html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:520px;margin:0 auto;padding:40px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">KRUX LAB</div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:2px;margin-bottom:32px;">SIGNUP ALERT · ${eatTime}</div>
  <div style="border:1px solid #00C896;padding:20px 24px;margin-bottom:24px;">
    <div style="color:#00C896;font-size:10px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:12px;">HOT LEAD — KTIN APPLICATION</div>
    <div style="color:white;font-size:18px;font-weight:700;margin-bottom:4px;">${email}</div>
    <div style="color:#64748B;font-size:11px;">Domain: ${orgLabel.toLowerCase()}</div>
  </div>
  <div style="border-left:3px solid #00C896;padding:12px 16px;margin-bottom:32px;background:#0F2040;">
    <div style="color:#94A3B8;font-size:12px;line-height:1.7;">→ New user just applied for KTIN. Send a personal welcome within 1 hour. Ask: how many shipments per month, what HS codes, who is their current clearing agent.</div>
  </div>
  <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'}/dashboard/today" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:12px 24px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Open Dashboard →</a>
</div>
</body>
</html>`,
        })
      } catch (e) {
        console.error('[activate] founder alert failed (non-fatal):', e)
      }
    }

    return NextResponse.json({ password: tempPassword })
  } catch {
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
