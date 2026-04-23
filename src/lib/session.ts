import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const FALLBACK_ORG_ID = '00000000-0000-0000-0000-000000000001'

const serviceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Get org_id + user_id + role from a request's session cookie.
// Falls back to hardcoded org for backwards compat during transition.
export async function getSessionContext(req: NextRequest): Promise<{
  userId:  string | null
  orgId:   string
  role:    string
  email:   string | null
}> {
  try {
    const cookieStore = req.cookies
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll() },
          setAll() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: null, orgId: FALLBACK_ORG_ID, role: 'operations', email: null }

    // Look up user profile for org + role
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    return {
      userId:  user.id,
      orgId:   profile?.organization_id ?? FALLBACK_ORG_ID,
      role:    profile?.role ?? 'operations',
      email:   user.email ?? null,
    }
  } catch {
    return { userId: null, orgId: FALLBACK_ORG_ID, role: 'operations', email: null }
  }
}

// Lightweight version for server components (uses cookie store directly)
export async function getServerSessionContext(): Promise<{
  userId:  string | null
  orgId:   string
  role:    string
  email:   string | null
}> {
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll()      { return cookieStore.getAll() },
          setAll()      {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { userId: null, orgId: FALLBACK_ORG_ID, role: 'operations', email: null }

    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    return {
      userId: user.id,
      orgId:  profile?.organization_id ?? FALLBACK_ORG_ID,
      role:   profile?.role ?? 'operations',
      email:  user.email ?? null,
    }
  } catch {
    return { userId: null, orgId: FALLBACK_ORG_ID, role: 'operations', email: null }
  }
}

// Upsert a user profile (called on first login / settings save)
export async function upsertUserProfile(opts: {
  userId:         string
  organizationId: string
  role:           string
  fullName?:      string
  phone?:         string
}) {
  return serviceSupabase.from('user_profiles').upsert({
    user_id:         opts.userId,
    organization_id: opts.organizationId,
    role:            opts.role,
    full_name:       opts.fullName ?? null,
    phone:           opts.phone ?? null,
    updated_at:      new Date().toISOString(),
  }, { onConflict: 'user_id' })
}
