'use client'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2, X, Sparkles, Loader2 } from 'lucide-react'
import { trackDemo } from '@/lib/demo-analytics'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

interface Props {
  onClose:     () => void
  onSubmitted: () => void
}

const LOADING_LINES = [
  'Creating your workspace…',
  'Loading Kenya compliance data…',
  'Preloading sample shipments…',
  'Almost ready…',
]

export function DemoGateModal({ onClose, onSubmitted }: Props) {
  const router = useRouter()
  const [email, setEmail]       = useState('')
  const [phase, setPhase]       = useState<'form' | 'loading' | 'done'>('form')
  const [loadMsg, setLoadMsg]   = useState(LOADING_LINES[0])
  const [error, setError]       = useState('')

  useEffect(() => {
    if (phase !== 'loading') return
    let i = 0
    const iv = setInterval(() => {
      i = (i + 1) % LOADING_LINES.length
      setLoadMsg(LOADING_LINES[i])
    }, 900)
    return () => clearInterval(iv)
  }, [phase])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setPhase('loading')
    trackDemo('gate_email_submitted', { email: email.trim() })

    try {
      const res  = await fetch('/api/activate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError('Something went wrong. Try again.')
        setPhase('form')
        return
      }

      // Existing account — send them to login
      if (data.exists) {
        setPhase('done')
        setTimeout(() => router.push('/login'), 1200)
        return
      }

      // New account — sign in immediately with the one-time password
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: data.password,
      })

      if (signInErr) {
        setError('Sign-in failed. Try again or go to login.')
        setPhase('form')
        return
      }

      setPhase('done')
      onSubmitted()
      setTimeout(() => router.push('/dashboard/operations?activated=1'), 400)
    } catch {
      setError('Connection error. Try again.')
      setPhase('form')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={phase === 'form' ? onClose : undefined}
    >
      <div
        className="w-full max-w-md bg-[#0A1628] border border-[#1E3A5F] rounded-2xl p-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {phase === 'loading' && (
          <div className="text-center py-8">
            <Loader2 size={32} className="text-[#00C896] mx-auto mb-4 animate-spin" />
            <p className="text-white font-semibold text-sm mb-1">{loadMsg}</p>
            <p className="text-[#64748B] text-xs">This takes about 3 seconds</p>
          </div>
        )}

        {phase === 'done' && (
          <div className="text-center py-4">
            <CheckCircle2 size={36} className="text-[#00C896] mx-auto mb-3" />
            <h3 className="text-white font-bold text-base mb-1">Workspace ready</h3>
            <p className="text-[#64748B] text-sm">Taking you to your dashboard…</p>
          </div>
        )}

        {phase === 'form' && (
          <>
            <div className="flex items-center gap-2 mb-5">
              <div className="w-8 h-8 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center">
                <Sparkles size={14} className="text-[#00C896]" />
              </div>
              <div>
                <h2 className="text-white font-bold text-base leading-tight">
                  Run this on your actual shipments
                </h2>
                <p className="text-[#64748B] text-xs mt-0.5">
                  Your workspace is ready in seconds. No credit card.
                </p>
              </div>
              <button
                onClick={onClose}
                className="ml-auto text-[#64748B] hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 mb-5 space-y-2">
              {[
                'Compliance briefs for every shipment you manage',
                'Document checklists generated per regulator',
                'Deadline alerts at 14, 7, and 3 days via email',
                'Risk scoring across all 8 Kenya regulators',
              ].map((f) => (
                <div key={f} className="flex items-start gap-2">
                  <CheckCircle2 size={12} className="text-[#00C896] mt-0.5 shrink-0" />
                  <span className="text-xs text-[#94A3B8]">{f}</span>
                </div>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Work email address"
                autoFocus
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50 text-sm"
              />
              {error && (
                <p className="text-red-400 text-xs px-1">{error}</p>
              )}
              <button
                type="submit"
                disabled={!email}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00B584] transition-colors disabled:opacity-60"
              >
                Create my workspace <ArrowRight size={14} />
              </button>
              <p className="text-[10px] text-[#334155] text-center">
                Free. No credit card. Takes 3 seconds.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
