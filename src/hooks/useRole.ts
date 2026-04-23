'use client'
import { useState, useEffect } from 'react'

type Role = 'admin' | 'operations' | 'finance' | 'field'

let cached: Role | null = null

export function useRole(): { role: Role; canWrite: boolean; isAdmin: boolean; loading: boolean } {
  const [role, setRole]       = useState<Role>(cached ?? 'operations')
  const [loading, setLoading] = useState(!cached)

  useEffect(() => {
    if (cached) return
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => {
        const r = (d.role ?? 'operations') as Role
        cached = r
        setRole(r)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return {
    role,
    canWrite: role === 'admin' || role === 'operations' || role === 'field',
    isAdmin:  role === 'admin',
    loading,
  }
}
