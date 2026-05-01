'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { seedDemoData } from '@/lib/seed-demo-data'

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

export async function signUp(_: unknown, formData: FormData) {
  const company  = (formData.get('company') as string)?.trim()
  const email    = (formData.get('email') as string)?.trim()?.toLowerCase()
  const password = formData.get('password') as string

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
    if (createErr.message.toLowerCase().includes('already')) {
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
      type:              'clearing_agent_firm',
      subscription_tier: 'trial',
      is_active:         true,
    })
    .select('id')
    .single()

  if (orgErr || !org) {
    await serviceSupabase.auth.admin.deleteUser(userId)
    console.error('[signUp] org insert error:', orgErr?.message)
    return { error: 'Account setup failed. Please try again.' }
  }

  await serviceSupabase.from('user_profiles').insert({
    user_id:         userId,
    organization_id: org.id,
    role:            'admin',
  })

  try {
    await seedDemoData(serviceSupabase, org.id)
  } catch (e) {
    console.error('[signUp] seed error (non-fatal):', e)
  }

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

  redirect('/dashboard/today')
}
