'use client'
import { useState, useEffect } from 'react'
import { CheckCircle2, Loader2, CreditCard, Zap, Shield, Building2, ArrowRight, AlertTriangle } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 99,
    color: '#00C896',
    features: [
      'Up to 5 active shipments',
      'All Kenya regulators',
      'Deadline alerts (email)',
      'HS code lookup',
      'KTIN identity',
      'Quotation template',
    ],
  },
  {
    id: 'standard',
    name: 'Standard',
    price: 299,
    color: '#3B82F6',
    badge: 'Most Popular',
    features: [
      'Unlimited shipments',
      'Everything in Starter',
      'Clearance intelligence',
      'Today page dashboard',
      'Historical data import',
      'Team access',
      'Window checker',
      'Priority email support',
    ],
  },
  {
    id: 'professional',
    name: 'Professional',
    price: 599,
    color: '#F59E0B',
    features: [
      'Everything in Standard',
      'KTIN Verification API',
      'Multi-user access',
      'Monthly compliance report',
      'Agent performance data',
      'Partner referral program',
      'Dedicated onboarding',
    ],
  },
]

function BillingContent() {
  const searchParams = useSearchParams()
  const [org, setOrg]           = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [checking, setChecking] = useState<string | null>(null)
  const [managing, setManaging] = useState(false)

  const success   = searchParams.get('success') === '1'
  const cancelled = searchParams.get('cancelled') === '1'

  useEffect(() => { loadOrg() }, [])

  async function loadOrg() {
    try {
      const r = await fetch('/api/profile')
      const d = await r.json()
      setOrg(d?.org)
    } finally {
      setLoading(false)
    }
  }

  async function subscribe(plan: string) {
    setChecking(plan)
    try {
      const r = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const { url } = await r.json()
      if (url) window.location.href = url
    } finally {
      setChecking(null)
    }
  }

  async function cancelSubscription() {
    if (!window.confirm('Cancel your KRUX subscription? You will be moved to the free trial tier immediately.')) return
    setManaging(true)
    try {
      const r = await fetch('/api/payments/portal', { method: 'POST' })
      if (r.ok) {
        await loadOrg()
      }
    } finally {
      setManaging(false)
    }
  }

  const currentTier = org?.subscription_tier ?? 'trial'
  const isActive    = org?.subscription_status === 'active' && currentTier !== 'trial'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-[#00C896]" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white">Billing & Subscription</h1>
        <p className="text-[#64748B] text-sm mt-1">Manage your KRUX plan</p>
      </div>

      {success && (
        <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-xl px-5 py-4 flex items-center gap-3">
          <CheckCircle2 size={16} className="text-[#00C896]" />
          <p className="text-sm text-[#00C896] font-medium">Subscription activated. Welcome to KRUX.</p>
        </div>
      )}
      {cancelled && (
        <div className="bg-[#1E3A5F]/40 border border-[#1E3A5F] rounded-xl px-5 py-4 flex items-center gap-3">
          <AlertTriangle size={16} className="text-[#F59E0B]" />
          <p className="text-sm text-[#94A3B8]">Checkout cancelled. Your plan has not changed.</p>
        </div>
      )}

      {/* Current plan */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-[#64748B] uppercase tracking-wider mb-1">Current Plan</p>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white capitalize">{currentTier}</h2>
              {isActive && (
                <span className="text-xs bg-[#00C896]/10 text-[#00C896] px-2 py-0.5 rounded-full border border-[#00C896]/20 font-medium">Active</span>
              )}
              {currentTier === 'trial' && (
                <span className="text-xs bg-[#F59E0B]/10 text-[#F59E0B] px-2 py-0.5 rounded-full border border-[#F59E0B]/20 font-medium">Trial</span>
              )}
            </div>
            {org?.subscription_expires_at && (
              <p className="text-xs text-[#64748B] mt-1">
                Renews {new Date(org.subscription_expires_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>
          {isActive && (
            <button
              onClick={cancelSubscription}
              disabled={managing}
              className="flex items-center gap-2 px-4 py-2 bg-[#0A1628] border border-[#1E3A5F] text-[#94A3B8] hover:text-white rounded-lg text-sm font-medium transition-colors"
            >
              {managing ? <Loader2 size={13} className="animate-spin" /> : <CreditCard size={13} />}
              Cancel subscription
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {PLANS.map((plan) => {
          const isCurrent = currentTier === plan.id
          const Icon = plan.id === 'starter' ? Zap : plan.id === 'standard' ? Shield : Building2

          return (
            <div
              key={plan.id}
              className={`bg-[#0F2040] border rounded-xl p-6 flex flex-col ${
                isCurrent ? 'border-[#00C896]/40' : 'border-[#1E3A5F]'
              }`}
            >
              {plan.badge && (
                <div className="text-xs font-bold text-[#3B82F6] bg-[#3B82F6]/10 border border-[#3B82F6]/20 px-2 py-0.5 rounded-full w-fit mb-3">
                  {plan.badge}
                </div>
              )}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${plan.color}15`, border: `1px solid ${plan.color}30` }}>
                  <Icon size={16} style={{ color: plan.color }} />
                </div>
                <div>
                  <h3 className="text-white font-bold">{plan.name}</h3>
                  <div className="text-xl font-black text-white">${plan.price}<span className="text-xs text-[#64748B] font-normal">/mo</span></div>
                </div>
              </div>

              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-xs text-[#94A3B8]">
                    <CheckCircle2 size={12} className="text-[#00C896] mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isCurrent ? (
                <div className="w-full py-2 text-center text-xs font-bold text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/20 rounded-lg">
                  Current plan
                </div>
              ) : (
                <button
                  onClick={() => subscribe(plan.id)}
                  disabled={!!checking}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-60"
                >
                  {checking === plan.id ? <Loader2 size={13} className="animate-spin" /> : <ArrowRight size={13} />}
                  {checking === plan.id ? 'Redirecting…' : `Upgrade to ${plan.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <p className="text-xs text-[#64748B] text-center">
        Payments are processed securely by Paystack. Cancel anytime.{' '}
        <a href="/terms" className="text-[#00C896] hover:underline">Terms</a> ·{' '}
        <a href="/privacy" className="text-[#00C896] hover:underline">Privacy</a>
      </p>

    </div>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[#00C896]" /></div>}>
      <BillingContent />
    </Suspense>
  )
}
