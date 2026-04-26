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
  const email    = (formData.get('email') as string)?.trim()?.toLowerCase()
  const password = formData.get('password') as string

  if (!email || !password) return { error: 'Email and password are required.' }
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
    return { error: `DEBUG AUTH: ${createErr.message}` }
  }

  const userId   = created.user.id
  const domain   = email.split('@')[1]?.split('.')[0] ?? 'My'
  const orgLabel = domain.charAt(0).toUpperCase() + domain.slice(1)

  const { data: org, error: orgErr } = await serviceSupabase
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
    await serviceSupabase.auth.admin.deleteUser(userId)
    console.error('[signUp] org insert error:', orgErr?.message)
    return { error: `DEBUG: ${orgErr?.message ?? orgErr?.code ?? 'no org returned'}` }
  }

  await serviceSupabase.from('user_profiles').insert({
    user_id:         userId,
    organization_id: org.id,
    role:            'admin',
  })

  // Seed demo data so the workspace isn't empty on first login
  try {
    await seedDemoData(serviceSupabase, org.id)
  } catch (e) {
    console.error('[signUp] seed error (non-fatal):', e)
  }

  // Welcome email — fires silently if Resend not configured
  if (process.env.RESEND_API_KEY) {
    try {
      const { Resend } = await import('resend')
      const resend = new Resend(process.env.RESEND_API_KEY)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'
      await resend.emails.send({
        from: 'KRUX <welcome@krux-xi.vercel.app>',
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
    } catch (e) {
      console.error('[signUp] welcome email error (non-fatal):', e)
    }
  }

  // Sign in immediately — sets session cookies
  const supabase = await createClient()
  const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
  if (signInErr) {
    // Account was created but sign-in failed — send them to login page
    redirect('/login?created=1')
  }

  redirect('/dashboard/operations')
}
