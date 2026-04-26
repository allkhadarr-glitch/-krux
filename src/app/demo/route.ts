import { createServerClient } from '@supabase/ssr'
import { cookies, headers } from 'next/headers'
import { NextResponse } from 'next/server'

function isMobile(ua: string) {
  return /android|iphone|ipad|ipod|mobile/i.test(ua)
}

export async function GET() {
  const email    = process.env.DEMO_USER_EMAIL
  const password = process.env.DEMO_USER_PASSWORD
  const base     = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

  if (!email || !password) {
    return NextResponse.redirect(new URL('/login', base))
  }

  const cookieStore  = await cookies()
  const headerStore  = await headers()
  const ua           = headerStore.get('user-agent') ?? ''
  const mobileDest   = new URL('/dashboard/mobile', base)
  const desktopDest  = new URL('/dashboard/operations', base)
  const redirect     = () => NextResponse.redirect(isMobile(ua) ? mobileDest : desktopDest)

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

  // If a real (non-demo) user is already logged in, send them to their dashboard
  const { data: { session: existing } } = await supabase.auth.getSession()
  if (existing && existing.user.email !== email) return redirect()

  // Clear any stale demo session, then sign in fresh
  if (existing) await supabase.auth.signOut()

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return NextResponse.redirect(new URL('/login', base))

  return redirect()
}
