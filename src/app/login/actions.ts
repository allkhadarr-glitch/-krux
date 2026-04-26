'use server'

import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

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

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function signIn(_: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  const supabase = await createClient()
  const { data: authData, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    console.error('[signIn] Supabase error:', error.message, error.status)
    return { error: error.message }
  }

  const userId = authData.user?.id
  if (!userId) redirect('/dashboard/operations')

  // Check if user has an org — auto-create one if not (handles users created outside /api/activate)
  const { data: profile } = await serviceSupabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile?.organization_id) {
    const domain   = (email.split('@')[1]?.split('.')[0] ?? 'My')
    const orgLabel = domain.charAt(0).toUpperCase() + domain.slice(1)
    const { data: org } = await serviceSupabase
      .from('organizations')
      .insert({ name: `${orgLabel} Imports`, type: 'clearing_agent_firm', subscription_tier: 'free', is_active: true })
      .select('id')
      .single()
    if (org) {
      await serviceSupabase.from('user_profiles').insert({
        user_id: userId, organization_id: org.id, role: 'admin',
      })
    }
    redirect('/dashboard/onboarding')
  }

  redirect('/dashboard/operations')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
