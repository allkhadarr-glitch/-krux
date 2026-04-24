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

    if (error && error.code !== '23505') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
