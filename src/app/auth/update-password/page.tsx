'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, CheckCircle2, Shield } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function UpdatePasswordPage() {
  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [loading, setLoading]     = useState(false)
  const [ready, setReady]         = useState(false)
  const [done, setDone]           = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const router = useRouter()
  useEffect(() => {
    supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    // Give Supabase a moment to process the URL hash
    const t = setTimeout(() => setReady(true), 1000)
    return () => clearTimeout(t)
  }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard/operations'), 2000)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#00C896] flex items-center justify-center mb-4">
            <span className="text-[#0A1628] font-black text-xl">K</span>
          </div>
          <h1 className="text-white font-bold text-2xl tracking-wide">KRUX</h1>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={36} className="text-[#00C896] mx-auto mb-3" />
              <h2 className="text-white font-semibold text-lg mb-2">Password updated</h2>
              <p className="text-[#64748B] text-sm">Taking you to your dashboard…</p>
            </div>
          ) : !ready ? (
            <div className="text-center py-6">
              <Loader2 size={24} className="text-[#00C896] animate-spin mx-auto mb-3" />
              <p className="text-[#64748B] text-sm">Verifying reset link…</p>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Set new password</h2>
              <p className="text-[#64748B] text-sm mb-6">Choose a new password for your KRUX account.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                    placeholder="8+ characters"
                  />
                </div>
                <div>
                  <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                    placeholder="Repeat password"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#00C896] hover:bg-[#00B584] disabled:opacity-60 disabled:cursor-not-allowed text-[#0A1628] font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loading ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 justify-center mt-6">
          <Shield size={12} className="text-[#334155]" />
          <p className="text-[#334155] text-xs">Your password is encrypted and never stored in plain text</p>
        </div>
      </div>
    </div>
  )
}
