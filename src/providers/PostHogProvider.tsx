'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect, Suspense } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

function PostHogPageview() {
  const pathname  = usePathname()
  const params    = useSearchParams()

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) return
    const url = window.location.origin + pathname + (params.toString() ? `?${params}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, params])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const key  = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com'
    if (!key || posthog.__loaded) return
    posthog.init(key, {
      api_host:           host,
      capture_pageview:   false,   // manual via PostHogPageview
      capture_pageleave:  true,
      person_profiles:    'identified_only',
      session_recording: {
        maskAllInputs:    false,
        maskInputOptions: { password: true },
      },
    })
  }, [])

  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PostHogPageview />
      </Suspense>
      {children}
    </PHProvider>
  )
}
