import { createServerClient } from '@supabase/ssr'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'
import { DemoProvider } from '@/context/demo'
import { DemoBanner } from '@/components/DemoBanner'
import { ActivationBanner } from '@/components/ActivationBanner'

const serviceSupabase = createServiceClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUser() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
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
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

async function getOrgName(userId: string): Promise<string | null> {
  try {
    const { data: profile } = await serviceSupabase
      .from('user_profiles')
      .select('organization_id')
      .eq('user_id', userId)
      .maybeSingle()
    if (!profile?.organization_id) return null
    const { data: org } = await serviceSupabase
      .from('organizations')
      .select('name')
      .eq('id', profile.organization_id)
      .maybeSingle()
    return org?.name ?? null
  } catch {
    return null
  }
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  if (!user) redirect('/login')

  const isDemo = user.email === process.env.DEMO_USER_EMAIL
  const orgName = isDemo ? null : await getOrgName(user.id)

  return (
    <DemoProvider isDemo={isDemo}>
      <div className="flex flex-col h-screen overflow-hidden">
        {isDemo && <DemoBanner />}
        {!isDemo && <ActivationBanner />}
        <div className="flex flex-1 overflow-hidden">
          <Sidebar userEmail={user.email ?? ''} orgName={orgName} />
          <main className="flex-1 lg:ml-60 overflow-y-auto bg-[#0A1628] pt-14 lg:pt-0">
            {children}
          </main>
        </div>
      </div>
    </DemoProvider>
  )
}
