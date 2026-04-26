'use client'
import { useState, useEffect } from 'react'
import {
  CheckCircle2, ArrowRight, Shield, Factory,
  Users, Bot, Zap, Loader2, X, Sparkles,
} from 'lucide-react'

type StepStatus = 'done' | 'pending' | 'loading'

type Step = {
  id: string
  icon: React.ElementType
  title: string
  description: string
  cta: string
  href: string
  status: StepStatus
}

export default function OnboardingPage() {
  const [steps, setSteps] = useState<Step[]>([
    {
      id: 'account',
      icon: Shield,
      title: 'Create your organization',
      description: 'Your KRUX account is active and your organization is set up. All your shipment data is isolated to your org.',
      cta: 'View settings',
      href: '/dashboard/settings',
      status: 'done',
    },
    {
      id: 'shipment',
      icon: Zap,
      title: 'Add your first shipment',
      description: 'Track a shipment from pre-clearance to port release. KRUX calculates risk, assigns actions, and monitors compliance deadlines automatically.',
      cta: 'Go to Operations',
      href: '/dashboard/operations',
      status: 'loading',
    },
    {
      id: 'manufacturer',
      icon: Factory,
      title: 'Add a manufacturer to your vault',
      description: 'Record your suppliers with their licenses, audit history, and compliance status. KRUX alerts you when licenses are about to expire.',
      cta: 'Go to Manufacturer Vault',
      href: '/dashboard/manufacturer',
      status: 'loading',
    },
    {
      id: 'team',
      icon: Users,
      title: 'Invite your team',
      description: 'Add your clearing agent, finance manager, and ops team. Each role sees only what they need — field agents get a mobile-optimized view.',
      cta: 'Invite team members',
      href: '/dashboard/team',
      status: 'loading',
    },
    {
      id: 'ai',
      icon: Bot,
      title: 'Run your first AI analysis',
      description: 'Use KRUX AI to generate compliance briefs, document checklists, remediation steps, and landed cost breakdowns for any shipment.',
      cta: 'Open AI Assistant',
      href: '/dashboard/ai',
      status: 'pending',
    },
  ])
  const [dismissed, setDismissed]   = useState(false)
  const [seeding, setSeeding]       = useState(false)
  const [seedDone, setSeedDone]     = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined' && localStorage.getItem('krux_onboarding_dismissed') === '1') {
      setDismissed(true)
    }
    loadProgress()
  }, [])

  async function loadProgress() {
    try {
      const [shipsRes, mfrsRes, teamRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/manufacturers'),
        fetch('/api/team'),
      ])
      const [ships, mfrs, team] = await Promise.all([
        shipsRes.json(),
        mfrsRes.json(),
        teamRes.json(),
      ])

      const aiTried = typeof window !== 'undefined' && localStorage.getItem('krux_ai_tried') === '1'

      // Demo shipments use alpha suffixes (KRUX-2026-PHR-xxxx); real ones use numeric (KRUX-2026-0001)
      const realShips = Array.isArray(ships)
        ? ships.filter((s: any) => s.reference_number && /^KRUX-\d{4}-\d{4}/.test(s.reference_number))
        : []
      // Demo manufacturers are these two seeded companies
      const DEMO_MFR_NAMES = ['Zhejiang Pharma Co. Ltd', 'Gujarat Agrochem Industries']
      const realMfrs = Array.isArray(mfrs)
        ? mfrs.filter((m: any) => !DEMO_MFR_NAMES.includes(m.company_name))
        : []

      setSteps(prev => prev.map(s => {
        if (s.id === 'shipment')     return { ...s, status: realShips.length > 0 ? 'done' : 'pending' }
        if (s.id === 'manufacturer') return { ...s, status: realMfrs.length > 0 ? 'done' : 'pending' }
        if (s.id === 'team')         return { ...s, status: ((team?.members?.length ?? 0) > 1 || (team?.invites?.length ?? 0) > 0) ? 'done' : 'pending' }
        if (s.id === 'ai')           return { ...s, status: aiTried ? 'done' : 'pending' }
        return s
      }))
    } catch {
      setSteps(prev => prev.map(s =>
        s.status === 'loading' ? { ...s, status: 'pending' } : s
      ))
    }
  }

  async function loadDemoData() {
    setSeeding(true)
    try {
      const r = await fetch('/api/seed-demo', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        setSeedDone(true)
        await loadProgress()
      }
    } finally {
      setSeeding(false)
    }
  }

  function dismiss() {
    if (typeof window !== 'undefined') localStorage.setItem('krux_onboarding_dismissed', '1')
    setDismissed(true)
  }

  const doneCount = steps.filter(s => s.status === 'done').length
  const progress  = Math.round((doneCount / steps.length) * 100)
  const allDone   = doneCount === steps.length

  if (dismissed && !allDone) return null

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Getting Started</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {allDone
              ? "You're all set — KRUX is fully configured."
              : `${doneCount} of ${steps.length} steps complete`}
          </p>
        </div>
        {!allDone && (
          <button
            onClick={dismiss}
            className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-white transition-colors flex-shrink-0 mt-1"
          >
            <X size={13} />
            Dismiss
          </button>
        )}
      </div>

      {/* Demo data banner */}
      {!seedDone && steps.filter(s => s.status === 'pending').length >= 3 && (
        <div className="bg-[#1E3A5F]/40 border border-[#1E3A5F] rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-[#00C896]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white mb-0.5">Load demo data</p>
            <p className="text-xs text-[#64748B]">Populate your account with 4 realistic Kenya import shipments, 2 manufacturers, and sample actions to explore the platform.</p>
          </div>
          <button
            onClick={loadDemoData}
            disabled={seeding}
            className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-xs font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-60 flex-shrink-0"
          >
            {seeding ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {seeding ? 'Loading…' : 'Load demo data'}
          </button>
        </div>
      )}

      {seedDone && (
        <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-xl px-5 py-3 flex items-center gap-3">
          <CheckCircle2 size={15} className="text-[#00C896]" />
          <p className="text-sm text-[#00C896]">Demo data loaded — 4 shipments, 2 manufacturers, and sample actions added.</p>
          <a href="/dashboard/operations" className="ml-auto text-xs text-[#00C896] underline flex-shrink-0">View shipments →</a>
        </div>
      )}

      {/* Progress bar */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold text-white">Setup Progress</span>
          <span className="text-xs font-bold text-[#00C896]">{progress}%</span>
        </div>
        <div className="h-2 bg-[#0A1628] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C896] rounded-full transition-all duration-700"
            style={{ width: `${progress}%` }}
          />
        </div>
        {allDone && (
          <p className="text-xs text-[#00C896] mt-3 flex items-center gap-2">
            <CheckCircle2 size={13} />
            KRUX is fully configured and ready to use.
          </p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isDone    = step.status === 'done'
          const isLoading = step.status === 'loading'
          const nextPending = !isDone && steps.slice(0, i).every(s => s.status === 'done')

          return (
            <div
              key={step.id}
              className={`bg-[#0F2040] border rounded-xl p-5 transition-all ${
                isDone
                  ? 'border-[#1E3A5F]/50 opacity-70'
                  : nextPending
                  ? 'border-[#00C896]/30 ring-1 ring-[#00C896]/10'
                  : 'border-[#1E3A5F]'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Step icon / status */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isDone
                    ? 'bg-[#00C896]/10 border border-[#00C896]/30'
                    : nextPending
                    ? 'bg-[#00C896]/10 border border-[#00C896]/40'
                    : 'bg-[#0A1628] border border-[#1E3A5F]'
                }`}>
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin text-[#334155]" />
                  ) : isDone ? (
                    <CheckCircle2 size={18} className="text-[#00C896]" />
                  ) : (
                    <Icon size={18} className={nextPending ? 'text-[#00C896]' : 'text-[#334155]'} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-sm font-bold ${isDone ? 'text-[#64748B]' : 'text-white'}`}>
                      {step.title}
                    </h3>
                    {isDone && (
                      <span className="text-[10px] bg-[#00C896]/10 text-[#00C896] px-2 py-0.5 rounded-full font-medium border border-[#00C896]/20">
                        Done
                      </span>
                    )}
                    {nextPending && !isDone && (
                      <span className="text-[10px] bg-[#00C896]/10 text-[#00C896] px-2 py-0.5 rounded-full font-medium border border-[#00C896]/20">
                        Up next
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#64748B] leading-relaxed mb-3">{step.description}</p>
                  {!isDone && (
                    <a
                      href={step.href}
                      onClick={() => {
                        if (step.id === 'ai' && typeof window !== 'undefined') {
                          localStorage.setItem('krux_ai_tried', '1')
                        }
                      }}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                        nextPending
                          ? 'bg-[#00C896] text-[#0A1628] hover:bg-[#00C896]/90'
                          : 'bg-[#0A1628] border border-[#1E3A5F] text-[#94A3B8] hover:text-white hover:border-[#1E3A5F]'
                      }`}
                    >
                      {step.cta}
                      <ArrowRight size={12} />
                    </a>
                  )}
                </div>

                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold mt-1 ${
                  isDone
                    ? 'bg-[#00C896]/10 text-[#00C896]'
                    : 'bg-[#0A1628] border border-[#1E3A5F] text-[#334155]'
                }`}>
                  {isDone ? '✓' : i + 1}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {allDone && (
        <div className="bg-[#00C896]/5 border border-[#00C896]/20 rounded-xl p-6 text-center">
          <CheckCircle2 size={24} className="text-[#00C896] mx-auto mb-3" />
          <h3 className="text-white font-bold text-sm mb-1">Setup complete</h3>
          <p className="text-[#64748B] text-xs mb-4">
            KRUX is fully configured. Head to Operations to manage your shipments.
          </p>
          <a
            href="/dashboard/operations"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
          >
            Go to Operations <ArrowRight size={14} />
          </a>
        </div>
      )}
    </div>
  )
}
