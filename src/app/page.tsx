'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  Shield, Zap, Bot, Bell, FileText, Factory,
  CheckCircle2, ArrowRight, AlertTriangle, TrendingUp,
  Users, Globe,
} from 'lucide-react'

const FEATURES = [
  {
    icon: Shield,
    title: 'Shipment Compliance Tracking',
    desc: 'Monitor every shipment across PPB, KEBS, KRA, PCPB, KEPHIS, EPRA, NEMA, and WHO-GMP. Automatic risk scoring from day one.',
  },
  {
    icon: Bot,
    title: 'KRUX AI Assistant',
    desc: 'Generate compliance briefs, document checklists, remediation steps, and landed cost breakdowns in seconds using Claude AI.',
  },
  {
    icon: Bell,
    title: 'Automated Deadline Alerts',
    desc: 'Email and WhatsApp alerts at 14, 7, and 3 days before PVoC deadlines. License expiry alerts at 60, 30, and 7 days.',
  },
  {
    icon: Factory,
    title: 'Manufacturer Vault',
    desc: 'Vet suppliers with license tracking, factory audit scores, and financial risk signals — all in one place.',
  },
  {
    icon: FileText,
    title: 'Landed Cost Calculator',
    desc: 'Instant KRA duty, 16% VAT, 2.25% IDF, 1.5% RDL, and PVoC fee calculations in both USD and KES.',
  },
  {
    icon: TrendingUp,
    title: 'Management Intelligence',
    desc: 'Executive dashboard with KPI tracking, compliance history, cost analysis, and team performance metrics.',
  },
]

const PRICING = [
  {
    name: 'Basic',
    price: 299,
    desc: 'For small importers managing up to 10 active shipments',
    features: [
      'Up to 10 active shipments',
      'All 8 regulatory bodies',
      'AI compliance briefs & checklists',
      'Email deadline alerts',
      'Manufacturer vault (up to 5)',
      '2 team members',
    ],
    cta: 'Request access',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 499,
    desc: 'For growing operations with multiple shipments and teams',
    features: [
      'Unlimited active shipments',
      'All Basic features',
      'WhatsApp alerts',
      'AI remediation & tax quotes',
      'Unlimited manufacturers',
      '10 team members',
      'Client portal access',
      'Export & audit reports',
    ],
    cta: 'Request access',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 1500,
    desc: 'For clearing agent firms managing multiple importers',
    features: [
      'Multi-client management',
      'All Pro features',
      'Dedicated clearing agent portal',
      'Custom regulatory rules',
      'API access',
      'Unlimited team members',
      'Priority support',
      'Custom onboarding',
    ],
    cta: 'Contact us',
    highlight: false,
  },
]

const PROBLEMS = [
  { stat: '14 days', label: 'Average PVoC processing time — one missed deadline costs KES 50,000+ in storage' },
  { stat: '8 bodies', label: 'Separate regulators per shipment — PPB, KEBS, KRA, PCPB, KEPHIS, EPRA, NEMA, WHO-GMP' },
  { stat: '30%', label: 'Of Kenya SME importers face shipment holds due to missing or expired compliance documents' },
]

export default function Home() {
  const [email, setEmail]     = useState('')
  const [company, setCompany] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function joinWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitting(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), company: company.trim() }),
      })
      setSubmitted(true)
    } catch {
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E3A5F] sticky top-0 bg-[#0A1628]/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] font-black text-sm">K</span>
          </div>
          <div>
            <span className="text-white font-bold tracking-wide text-sm">KRUXVON</span>
            <span className="text-[#64748B] text-xs ml-2 hidden sm:inline">Supply Chain Intelligence</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors">
            Sign in
          </Link>
          <a
            href="#waitlist"
            className="px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
          >
            Request Access
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-8 pt-24 pb-20 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00C896]/10 border border-[#00C896]/30 rounded-full text-[#00C896] text-xs font-semibold mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
          East Africa's first AI-native import compliance OS · Kenya-first
        </div>

        <h1 className="text-5xl sm:text-6xl font-black leading-tight mb-6">
          Stop losing money to
          <br />
          <span className="text-[#00C896]">missed PVoC deadlines</span>
        </h1>

        <p className="text-[#94A3B8] text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          KRUXVON tracks every Kenya import shipment across 8 regulatory bodies,
          alerts your team before deadlines, and uses AI to generate compliance briefs,
          tax quotes, and remediation steps in seconds.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <a
            href="#waitlist"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-base hover:bg-[#00C896]/90 transition-colors"
          >
            Request Early Access <ArrowRight size={16} />
          </a>
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 px-7 py-3.5 border border-[#1E3A5F] text-white rounded-xl font-medium text-base hover:border-[#00C896]/40 transition-colors"
          >
            Sign in to Dashboard
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 max-w-2xl mx-auto">
          {PROBLEMS.map(p => (
            <div key={p.stat} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 text-left">
              <div className="text-2xl font-black text-[#00C896] mb-2">{p.stat}</div>
              <p className="text-xs text-[#64748B] leading-relaxed">{p.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="px-8 py-20 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">The Problem</div>
              <h2 className="text-3xl font-black text-white mb-6">
                Kenya import compliance is a spreadsheet nightmare
              </h2>
              <div className="space-y-4">
                {[
                  'Manually tracking 8 different regulators across every shipment',
                  'Missing PVoC deadlines because alerts are WhatsApp messages in group chats',
                  'Spending hours calculating landed costs, duties, and levies',
                  'No visibility when manufacturer licenses are about to expire',
                  'Audit trails spread across email threads, WhatsApp, and spreadsheets',
                ].map(p => (
                  <div key={p} className="flex items-start gap-3">
                    <AlertTriangle size={14} className="text-amber-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#94A3B8]">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#00C896] uppercase tracking-widest mb-4">The Solution</div>
              <h2 className="text-3xl font-black text-white mb-6">
                One system that handles it all
              </h2>
              <div className="space-y-4">
                {[
                  'All 8 regulators tracked with automatic risk scoring per shipment',
                  'Email + WhatsApp alerts at 14, 7, and 3 days before every deadline',
                  'AI-generated landed cost breakdowns in KES and USD in seconds',
                  'License expiry alerts at 60, 30, and 7 days with renewal steps',
                  'Complete audit trail — every action, every event, timestamped',
                ].map(s => (
                  <div key={s} className="flex items-start gap-3">
                    <CheckCircle2 size={14} className="text-[#00C896] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#94A3B8]">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Platform</div>
          <h2 className="text-3xl font-black text-white">Everything you need. Nothing you don't.</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(f => {
            const Icon = f.icon
            return (
              <div key={f.title} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-6 hover:border-[#00C896]/30 transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mb-4">
                  <Icon size={18} className="text-[#00C896]" />
                </div>
                <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
                <p className="text-[#64748B] text-xs leading-relaxed">{f.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-8 py-20 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-5xl mx-auto text-center">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Who it's for</div>
          <h2 className="text-3xl font-black text-white mb-12">Built for the Kenya import ecosystem</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Users,
                role: 'Clearing Agents',
                desc: 'Manage multiple importers from one dashboard. Each client gets their own isolated workspace. Bill your clients for compliance intelligence.',
              },
              {
                icon: Globe,
                role: 'SME Importers',
                desc: 'Stop manually tracking compliance across spreadsheets. Get automatic alerts, AI-generated document checklists, and full audit trails.',
              },
              {
                icon: Factory,
                role: 'Supply Chain Managers',
                desc: 'Full visibility from PO to port clearance. Manufacturer vault tracks supplier licenses, audits, and risk signals automatically.',
              },
            ].map(p => {
              const Icon = p.icon
              return (
                <div key={p.role} className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-6 text-left">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center mb-4">
                    <Icon size={18} className="text-[#00C896]" />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2">{p.role}</h3>
                  <p className="text-[#64748B] text-xs leading-relaxed">{p.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="px-8 py-20 max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-4">Pricing</div>
          <h2 className="text-3xl font-black text-white mb-3">Simple, transparent pricing</h2>
          <p className="text-[#64748B] text-sm">All plans include full access. No per-shipment fees.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {PRICING.map(plan => (
            <div
              key={plan.name}
              className={`relative rounded-2xl p-7 border ${
                plan.highlight
                  ? 'bg-[#00C896]/5 border-[#00C896]/40 ring-1 ring-[#00C896]/20'
                  : 'bg-[#0F2040] border-[#1E3A5F]'
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#00C896] text-[#0A1628] text-xs font-bold rounded-full">
                  Most Popular
                </div>
              )}
              <div className="mb-6">
                <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-2">{plan.name}</div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">${plan.price}</span>
                  <span className="text-[#64748B] text-sm">/mo</span>
                </div>
                <p className="text-xs text-[#64748B] mt-2 leading-relaxed">{plan.desc}</p>
              </div>
              <div className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <CheckCircle2 size={13} className="text-[#00C896] flex-shrink-0" />
                    <span className="text-xs text-[#94A3B8]">{f}</span>
                  </div>
                ))}
              </div>
              <a
                href="#waitlist"
                className={`block text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                  plan.highlight
                    ? 'bg-[#00C896] text-[#0A1628] hover:bg-[#00C896]/90'
                    : 'border border-[#1E3A5F] text-white hover:border-[#00C896]/40'
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="px-8 py-24 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mx-auto mb-6">
            <span className="text-[#0A1628] font-black text-lg bg-[#00C896] w-8 h-8 rounded-lg flex items-center justify-center">K</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Request Early Access</h2>
          <p className="text-[#64748B] text-sm mb-10 leading-relaxed">
            KRUXVON is currently in early access. Join the waitlist and we'll reach out within 48 hours
            to set up your account.
          </p>

          {submitted ? (
            <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-2xl p-8">
              <CheckCircle2 size={32} className="text-[#00C896] mx-auto mb-3" />
              <h3 className="text-white font-bold text-base mb-2">You're on the list</h3>
              <p className="text-[#64748B] text-sm">We'll be in touch within 48 hours to get you set up.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
              >
                Already have an account? Sign in <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <form onSubmit={joinWaitlist} className="space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Work email address"
                className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50 text-sm"
              />
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Company name (optional)"
                className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-xl px-4 py-3.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50 text-sm"
              />
              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Request Early Access'}
                {!submitting && <ArrowRight size={15} />}
              </button>
              <p className="text-[10px] text-[#334155]">No spam. No commitments. We'll only contact you about KRUXVON.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#334155]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#00C896] flex items-center justify-center">
            <span className="text-[#0A1628] font-black text-[9px]">K</span>
          </div>
          <span className="text-[#64748B]">KRUXVON Supply Chain Intelligence</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-[#94A3B8] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[#94A3B8] transition-colors">Privacy</Link>
          <Link href="/login" className="hover:text-[#94A3B8] transition-colors">Sign in</Link>
          <span>Kenya · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
