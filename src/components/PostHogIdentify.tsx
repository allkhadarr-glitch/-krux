'use client'
import { useEffect } from 'react'
import posthog from 'posthog-js'

export function PostHogIdentify({
  userId, email, orgName, ktin,
}: {
  userId:   string
  email:    string
  orgName?: string | null
  ktin?:    string | null
}) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY || !posthog.__loaded) return
    posthog.identify(userId, {
      email,
      org_name: orgName ?? undefined,
      ktin:     ktin ?? undefined,
    })
  }, [userId, email, orgName, ktin])

  return null
}
