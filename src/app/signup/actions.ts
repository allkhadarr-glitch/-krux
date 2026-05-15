'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        },
      },
    }
  )
}

const ROLE_MAP: Record<string, { dbRole: string; orgType: string }> = {
  importer:          { dbRole: 'admin',          orgType: 'importer' },
  clearing_agent:    { dbRole: 'clearing_agent', orgType: 'clearing_agent_firm' },
  freight_forwarder: { dbRole: 'admin',          orgType: 'freight_forwarder' },
}

export async function signUp(_: unknown, formData: FormData) {
  const company  = (formData.get('company') as string)?.trim()
  const email    = (formData.get('email') as string)?.trim()?.toLowerCase()
  const password = formData.get('password') as string
  const roleKey  = (formData.get('role') as string) || 'importer'
  const { dbRole, orgType } = ROLE_MAP[roleKey] ?? ROLE_MAP.importer

  if (!company)             return { error: 'Company name is required.' }
  if (!email || !password)  return { error: 'Email and password are required.' }
  if (password.length < 8)  return { error: 'Password must be at least 8 characters.' }
  if (email === process.env.DEMO_USER_EMAIL?.toLowerCase()) {
    return { error: 'That email is reserved. Please use a different email address.' }
  }

  const { data: created, error: createErr } = await serviceSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (createErr) {
    const isDuplicate = createErr.message.toLowerCase().includes('already')
    // Log the failed attempt — fire and forget
    ;(async () => {
      try {
        await serviceSupabase.from('waitlist').upsert({
          email,
          company,
          role: isDuplicate ? 'signup_duplicate' : 'signup_failed',
          lead_tier: 'HOT',
          lead_context: { error: createErr.message, stage: isDuplicate ? 'DUPLICATE' : 'AUTH_FAIL' },
        }, { onConflict: 'email', ignoreDuplicates: false })
        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend')
          const r = new Resend(process.env.RESEND_API_KEY)
          await r.emails.send({
            from: 'KRUX Lab <noreply@kruxvon.com>',
            to:   'hq@kruxvon.com',
            subject: `⚠️ FAILED SIGNUP — ${email}`,
            html: `<div style="font-family:monospace;background:#060E1A;color:#94A3B8;padding:32px;max-width:480px;">
              <div style="color:#F59E0B;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">KRUX LAB · FAILED SIGNUP</div>
              <div style="color:white;font-size:16px;font-weight:700;margin-bottom:8px;">${email}</div>
              <div style="color:#64748B;font-size:12px;margin-bottom:4px;">Company: ${company}</div>
              <div style="color:#EF4444;font-size:12px;margin-bottom:16px;">Reason: ${isDuplicate ? 'Account already exists — send them the login link' : `Setup failed — ${createErr.message}`}</div>
              <div style="border-left:3px solid #F59E0B;padding:10px 14px;background:#0F2040;color:#94A3B8;font-size:12px;">
                → ${isDuplicate ? 'This person already has a KRUX account. Reply to their welcome email or send login link directly.' : 'Technical failure at auth step. Investigate and onboard manually if needed.'}
              </div>
            </div>`,
          })
        }
      } catch {}
    })().catch(() => {})
    if (isDuplicate) {
      return { error: 'An account with this email already exists. Sign in instead.' }
    }
    console.error('[signUp] createUser error:', createErr.message)
    return { error: 'Account creation failed. Please try again.' }
  }

  const userId = created.user.id

  const { data: org, error: orgErr } = await serviceSupabase
    .from('organizations')
    .insert({
      name:              company,
      type:              orgType,
      subscription_tier: 'trial',
      is_active:         true,
    })
    .select('id')
    .single()

  if (orgErr || !org) {
    await serviceSupabase.auth.admin.deleteUser(userId)
    console.error('[signUp] org insert error:', orgErr?.message)
    ;(async () => {
      try {
        if (process.env.RESEND_API_KEY) {
          const { Resend } = await import('resend')
          const r = new Resend(process.env.RESEND_API_KEY)
          await r.emails.send({
            from: 'KRUX Lab <noreply@kruxvon.com>',
            to:   'hq@kruxvon.com',
            subject: `🔴 SIGNUP BROKE — ${email}`,
            html: `<div style="font-family:monospace;background:#060E1A;color:#94A3B8;padding:32px;max-width:480px;">
              <div style="color:#EF4444;font-size:11px;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">KRUX LAB · ORG SETUP FAILED</div>
              <div style="color:white;font-size:16px;font-weight:700;margin-bottom:8px;">${email}</div>
              <div style="color:#64748B;font-size:12px;margin-bottom:16px;">Company: ${company} · Auth account was created and deleted.</div>
              <div style="border-left:3px solid #EF4444;padding:10px 14px;background:#0F2040;color:#EF4444;font-size:12px;">
                Error: ${orgErr?.message ?? 'Org insert returned null'}<br/>→ Onboard this person manually.
              </div>
            </div>`,
          })
        }
      } catch {}
    })().catch(() => {})
    return { error: 'Account setup failed. Please try again.' }
  }

  await serviceSupabase.from('user_profiles').insert({
    user_id:         userId,
    organization_id: org.id,
    role:            dbRole,
  })

  // Fetch KTIN assigned by DB trigger
  let ktin: string | null = null
  try {
    const { data: entity } = await serviceSupabase
      .from('krux_entities')
      .select('krux_id')
      .eq('organization_id', org.id)
      .maybeSingle()
    ktin = entity?.krux_id ?? null
  } catch {}

  // WhatsApp ping to founder — fire and forget
  const _waNotify = (async () => {
    const sid   = process.env.TWILIO_ACCOUNT_SID
    const token = process.env.TWILIO_AUTH_TOKEN
    const from  = process.env.TWILIO_WHATSAPP_FROM
    const to    = process.env.ALERT_WHATSAPP_TO
    if (!sid || !token || !from || !to) return
    const body = [
      `KRUX · New Signup`,
      ktin ? `${ktin} · ${company}` : company,
      email,
      new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', hour: '2-digit', minute: '2-digit' }) + ' EAT',
      `kruxvon.com/admin`,
    ].join('\n')
    const params = new URLSearchParams({ From: from, To: `whatsapp:${to}`, Body: body })
    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
  })().catch(() => {})

  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

      const [welcomeResult, alertResult] = await Promise.all([
        resend.emails.send({
          from: 'KRUX <noreply@kruxvon.com>',
          to: email,
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
  <a href="${appUrl}${dbRole === 'clearing_agent' ? '/dashboard/portfolio' : '/dashboard/today'}" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">OPEN WORKSPACE</a>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  ${ktin ? `<div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com/verify/${ktin}</div>` : `<div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com</div>`}
</div>
</body>
</html>`,
        }),

        resend.emails.send({
          from: 'KRUX <noreply@kruxvon.com>',
          to: 'hq@kruxvon.com',
          subject: ktin ? `${ktin} · ${company}` : `New signup: ${company}`,
          html: `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:400px;margin:0 auto;padding:32px 24px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:24px;">KRUX · New Operator</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:24px;"></div>
  ${ktin ? `<div style="color:#00C896;font-size:20px;font-weight:900;letter-spacing:2px;margin-bottom:8px;">${ktin}</div>` : ''}
  <div style="color:white;font-size:15px;font-weight:700;margin-bottom:4px;">${company}</div>
  <div style="color:#64748B;font-size:12px;margin-bottom:4px;">${email}</div>
  <div style="color:#334155;font-size:11px;margin-bottom:24px;">${new Date().toLocaleString('en-KE', { timeZone: 'Africa/Nairobi', dateStyle: 'full', timeStyle: 'short' })} EAT</div>
  <a href="${appUrl}/admin" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:10px;padding:10px 20px;text-decoration:none;letter-spacing:2px;text-transform:uppercase;">VIEW IN ADMIN</a>
</div>
</body>
</html>`,
        }),
      ])

      if (welcomeResult.error) console.error('[signUp] welcome email failed:', JSON.stringify(welcomeResult.error))
      if (alertResult.error)   console.error('[signUp] alert email failed:',   JSON.stringify(alertResult.error))
    } catch (e) {
      console.error('[signUp] email error (non-fatal):', e)
    }
  }

  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    redirect('/login?created=1')
  }

  redirect(dbRole === 'clearing_agent' ? '/dashboard/portfolio' : '/dashboard/today')
}
