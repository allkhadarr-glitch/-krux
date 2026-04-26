'use client'

import { useActionState } from 'react'
import { signUp } from './actions'
import { Shield, Loader2, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const initialState = { error: '' }

export default function SignupPage() {
  const [state, formAction, isPending] = useActionState(signUp, initialState)

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-[#00C896] flex items-center justify-center mb-4">
            <span className="text-[#0A1628] font-black text-xl">K</span>
          </div>
          <h1 className="text-white font-bold text-2xl tracking-wide">KRUX</h1>
          <p className="text-[#64748B] text-sm mt-1">Kenya Import Compliance Intelligence</p>
        </div>

        {/* Card */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-8">
          <h2 className="text-white font-semibold text-lg mb-1">Create your account</h2>
          <p className="text-[#64748B] text-sm mb-6">
            Free access · 5 demo shipments pre-loaded · No credit card
          </p>

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Work Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                disabled={isPending}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                disabled={isPending}
                className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                placeholder="8+ characters"
              />
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{state.error}</p>
                {state.error.includes('already exists') && (
                  <Link href="/login" className="text-[#00C896] text-xs mt-1 block hover:underline">
                    Sign in instead →
                  </Link>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-[#00C896] hover:bg-[#00B584] disabled:opacity-60 disabled:cursor-not-allowed text-[#0A1628] font-bold py-2.5 rounded-lg text-sm transition-all flex items-center justify-center gap-2 mt-2"
            >
              {isPending ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Setting up your account…
                </>
              ) : (
                <>
                  Create account <ArrowRight size={15} />
                </>
              )}
            </button>
          </form>

          <p className="text-[10px] text-[#334155] text-center mt-4 leading-relaxed">
            By creating an account you agree to our{' '}
            <span className="text-[#64748B]">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#64748B]">Privacy Policy</span>
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 mt-6">
          <p className="text-[#64748B] text-sm">
            Already have an account?{' '}
            <Link href="/login" className="text-[#00C896] font-medium hover:text-[#00B584] transition-colors">
              Sign in
            </Link>
          </p>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#334155]" />
            <p className="text-[#334155] text-xs">Data isolated to your organization · Multi-tenant</p>
          </div>
        </div>
      </div>
    </div>
  )
}
