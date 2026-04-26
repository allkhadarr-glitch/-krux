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

    return NextResponse.json({ password: tempPassword })
  } catch {
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
