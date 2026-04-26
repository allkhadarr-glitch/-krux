'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, CheckCircle2, Loader2, Shield } from 'lucide-react'
import Link from 'next/link'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('')
  const [sent, setSent]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${APP_URL}/auth/update-password`,
    })
    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
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
          <p className="text-[#64748B] text-sm mt-1">Kenya Import Compliance Intelligence</p>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8">
          {sent ? (
            <div className="text-center">
              <CheckCircle2 size={36} className="text-[#00C896] mx-auto mb-3" />
              <h2 className="text-white font-semibold text-lg mb-2">Check your email</h2>
              <p className="text-[#64748B] text-sm leading-relaxed">
                We've sent a password reset link to <span className="text-white">{email}</span>.
                Click the link in the email to set a new password.
              </p>
              <p className="text-[#334155] text-xs mt-4">Didn't receive it? Check your spam folder.</p>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-1">Reset your password</h2>
              <p className="text-[#64748B] text-sm mb-6">Enter your email and we'll send you a reset link.</p>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                    placeholder="you@company.com"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-[#00C896] hover:bg-[#00B584] disabled:opacity-60 disabled:cursor-not-allowed text-[#0A1628] font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 mt-2"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : null}
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="flex flex-col items-center gap-3 mt-6">
          <Link href="/login" className="flex items-center gap-1.5 text-[#64748B] text-sm hover:text-[#00C896] transition-colors">
            <ArrowLeft size={13} /> Back to sign in
          </Link>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#334155]" />
            <p className="text-[#334155] text-xs">Password reset is handled securely via email</p>
          </div>
        </div>
      </div>
    </div>
  )
}
