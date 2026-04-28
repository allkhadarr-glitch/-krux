'use client'

import { useActionState, useState } from 'react'
import { signIn } from './actions'
import { Shield, Loader2, Eye, EyeOff } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const initialState = { error: '' }

function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState)
  const params  = useSearchParams()
  const created = params.get('created') === '1'
  const [showPassword, setShowPassword] = useState(false)

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
          <h2 className="text-white font-semibold text-lg mb-1">Sign in</h2>
          <p className="text-[#64748B] text-sm mb-6">Access your compliance dashboard</p>

          {created && (
            <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-lg px-3.5 py-2.5 mb-4">
              <p className="text-[#00C896] text-sm">Account created — sign in to get started.</p>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">
                Email
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
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-[#94A3B8] text-xs font-medium uppercase tracking-wider">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs text-[#64748B] hover:text-[#00C896] transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  disabled={isPending}
                  className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3.5 py-2.5 pr-10 text-white text-sm placeholder-[#334155] focus:outline-none focus:border-[#00C896] focus:ring-1 focus:ring-[#00C896]/30 transition-all disabled:opacity-50"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {state?.error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">
                <p className="text-red-400 text-sm">{state.error}</p>
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
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>

        <div className="flex flex-col items-center gap-3 mt-6">
          <p className="text-[#64748B] text-sm">
            No account yet?{' '}
            <Link href="/signup" className="text-[#00C896] font-medium hover:text-[#00B584] transition-colors">
              Create one free →
            </Link>
          </p>
          <a
            href="/demo"
            className="text-[#64748B] text-sm hover:text-[#00C896] transition-colors"
          >
            Try the live demo first →
          </a>
          <div className="flex items-center gap-2">
            <Shield size={12} className="text-[#334155]" />
            <p className="text-[#334155] text-xs">
              Enterprise-grade Kenya import compliance
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  )
}
