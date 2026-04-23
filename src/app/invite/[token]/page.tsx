'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, AlertTriangle, LogIn } from 'lucide-react'

export default function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const router = useRouter()
  const [invite, setInvite] = useState<{ email: string; role: string } | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'accepting' | 'done' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/invites/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); setState('error') }
        else { setInvite(d); setState('ready') }
      })
      .catch(() => { setError('Failed to load invite'); setState('error') })
  }, [token])

  async function accept() {
    setState('accepting')
    const r = await fetch(`/api/invites/${token}`, { method: 'POST' })
    const d = await r.json()
    if (!r.ok) { setError(d.error); setState('error') }
    else { setState('done'); setTimeout(() => router.push('/dashboard/operations'), 2000) }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 rounded-xl bg-[#00C896] flex items-center justify-center mx-auto mb-4">
          <span className="text-[#0A1628] font-black text-xl">K</span>
        </div>
        <h1 className="text-white font-bold text-xl mb-1">KRUX</h1>
        <p className="text-[#64748B] text-sm mb-6">Compliance Intelligence</p>

        {state === 'loading' && (
          <div className="flex items-center justify-center gap-2 text-[#64748B]">
            <Loader2 size={16} className="animate-spin" /> Validating invite...
          </div>
        )}

        {state === 'error' && (
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-2 text-red-400">
              <AlertTriangle size={18} /> <span className="font-semibold">{error}</span>
            </div>
            <p className="text-[#64748B] text-sm">Ask your team admin to send a new invite.</p>
          </div>
        )}

        {state === 'ready' && invite && (
          <div className="space-y-5">
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 text-left">
              <p className="text-xs text-[#64748B] uppercase tracking-wide font-semibold mb-2">You were invited as</p>
              <p className="text-white font-semibold">{invite.email}</p>
              <p className="text-[#00C896] text-sm font-medium mt-1 capitalize">{invite.role} access</p>
            </div>
            <p className="text-[#64748B] text-xs">Make sure you're logged in with {invite.email} before accepting.</p>
            <button onClick={accept}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors">
              <LogIn size={16} /> Accept &amp; Join Team
            </button>
          </div>
        )}

        {state === 'accepting' && (
          <div className="flex items-center justify-center gap-2 text-[#64748B]">
            <Loader2 size={16} className="animate-spin" /> Joining team...
          </div>
        )}

        {state === 'done' && (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-2 text-emerald-400">
              <CheckCircle2 size={18} /> <span className="font-semibold">Welcome to the team!</span>
            </div>
            <p className="text-[#64748B] text-sm">Redirecting to dashboard...</p>
          </div>
        )}
      </div>
    </div>
  )
}
