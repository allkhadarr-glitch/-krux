'use client'
import { useState } from 'react'
import { X, Zap, Shield, Users, ArrowRight, CheckCircle2 } from 'lucide-react'

const STEPS = [
  {
    icon: Shield,
    title: 'Welcome to KRUX',
    subtitle: 'Kenya Import Compliance Intelligence',
    body: 'KRUX tracks every shipment from pre-clearance to port release — flagging risk, assigning actions, and building your compliance history automatically.',
    cta: 'Get started',
  },
  {
    icon: Zap,
    title: 'Create your first shipment',
    subtitle: 'Takes 60 seconds',
    body: 'Click "Add Shipment" in the Operations dashboard. Enter the regulator, HS code, CIF value, and PVoC deadline. KRUX calculates landed costs and risk score instantly.',
    cta: 'Go to Operations',
    href: '/dashboard/operations',
  },
  {
    icon: Users,
    title: 'Invite your team',
    subtitle: 'Ops, finance, field agents',
    body: 'Add your clearing agent, finance manager, and operations team. Each role sees only what they need — field agents get a simplified mobile view.',
    cta: 'Invite team',
    href: '/dashboard/team',
  },
]

export function OnboardingWizard({ onDismiss }: { onDismiss: () => void }) {
  const [step, setStep] = useState(0)
  const current = STEPS[step]
  const Icon = current.icon
  const isLast = step === STEPS.length - 1

  function next() {
    if (isLast) {
      onDismiss()
      if (current.href) window.location.href = current.href
    } else {
      if (current.href) window.location.href = current.href
      else setStep((s) => s + 1)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <div className="flex items-center gap-2">
            {STEPS.map((_, i) => (
              <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === step ? 'bg-[#00C896] w-4' : i < step ? 'bg-[#00C896]/40' : 'bg-[#1E3A5F]'}`} />
            ))}
          </div>
          <button onClick={onDismiss} className="text-[#64748B] hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mx-auto mb-5">
            <Icon size={24} className="text-[#00C896]" />
          </div>
          <h2 className="text-xl font-bold text-white mb-1">{current.title}</h2>
          <p className="text-[#00C896] text-sm font-medium mb-4">{current.subtitle}</p>
          <p className="text-[#94A3B8] text-sm leading-relaxed">{current.body}</p>
        </div>

        <div className="px-6 pb-6 flex items-center gap-3">
          <button onClick={onDismiss} className="text-sm text-[#64748B] hover:text-white transition-colors">
            Skip
          </button>
          <button onClick={next}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors">
            {isLast ? <CheckCircle2 size={16} /> : <ArrowRight size={16} />}
            {current.cta}
          </button>
        </div>
      </div>
    </div>
  )
}
