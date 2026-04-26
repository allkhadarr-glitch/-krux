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

    // Block re-use of the demo email
    if (email === process.env.DEMO_USER_EMAIL?.toLowerCase()) {
      return NextResponse.json({ exists: true })
    }

    // Generate a one-time password — returned to client once, over HTTPS only
    const tempPassword = randomBytes(24).toString('base64url')

    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
    })

    if (createErr) {
      // User already has an account — tell the client to redirect to login
      return NextResponse.json({ exists: true })
    }

    const userId = created.user.id

    // Derive a friendly org name from the email domain
    const domain   = email.split('@')[1]?.split('.')[0] ?? 'My'
    const orgLabel = domain.charAt(0).toUpperCase() + domain.slice(1)

    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: `${orgLabel} Imports`, type: 'clearing_agent_firm', subscription_tier: 'free', is_active: true })
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

    // Seed sample shipments so the workspace isn't empty
    await seedDemoData(supabase, org.id)

    return NextResponse.json({ password: tempPassword })
  } catch {
    return NextResponse.json({ error: 'Activation failed' }, { status: 500 })
  }
}
