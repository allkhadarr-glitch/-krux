'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  Shield, Bot, Bell, FileText, Factory, TrendingUp,
  CheckCircle2, ArrowRight, AlertTriangle, Users, Globe,
  Clock, Zap, ChevronRight, DollarSign, X,
} from 'lucide-react'

// ── Data ─────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Shield,
    title: 'Shipment Compliance Tracking',
    desc: 'Monitor every shipment across PPB, KEBS, KRA, PCPB, KEPHIS, EPRA, NEMA, and WHO-GMP. Automatic risk scoring from day one.',
  },
  {
    icon: Bot,
    title: 'AI Compliance Assistant',
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
    desc: 'Instant KRA duty, 16% VAT, 2% IDF, 1.5% RDL, and PVoC fee calculations in both USD and KES.',
  },
  {
    icon: TrendingUp,
    title: 'Action Intelligence',
    desc: 'System generates the right compliance action at the right time — submit, escalate, follow up — with effectiveness tracking.',
  },
]

const PRICING = [
  {
    name: 'Basic',
    price: 299,
    desc: 'For SME importers managing up to 25 shipments/month',
    features: [
      'Up to 25 shipments/month',
      'All 8 Kenya regulators',
      'AI compliance briefs & checklists',
      'Email deadline alerts',
      'Manufacturer vault (10)',
      '3 team members',
    ],
    cta: 'Request access',
    highlight: false,
  },
  {
    name: 'Pro',
    price: 499,
    desc: 'For growing operations with high shipment volumes',
    features: [
      'Up to 100 shipments/month',
      'Everything in Basic',
      'WhatsApp alerts',
      'AI document extraction',
      'Unlimited manufacturers',
      '10 team members',
      'Audit export reports',
      'Priority support',
    ],
    cta: 'Request access',
    highlight: true,
  },
  {
    name: 'Enterprise',
    price: 1500,
    desc: 'For clearing agent firms managing multiple importers',
    features: [
      'Unlimited shipments',
      'Everything in Pro',
      'Multi-client management',
      'Dedicated clearing agent portal',
      'API access',
      'Unlimited team members',
      'Custom onboarding',
      'SLA guarantee',
    ],
    cta: 'Contact us',
    highlight: false,
  },
]

const REGULATORS = ['PPB', 'KEBS', 'PCPB', 'KEPHIS', 'EPRA', 'NEMA', 'KRA', 'WHO-GMP']

// ── Cost Calculator ──────────────────────────────────────────

function CostCalculator() {
  const [cif, setCif]         = useState('')
  const [days, setDays]       = useState('')
  const [dutyRate, setDutyRate] = useState('25')
  const [storageDay, setStorageDay] = useState('50')
  const [kesRate, setKesRate] = useState(130)
  const [leadEmail, setLeadEmail] = useState('')
  const [leadSent, setLeadSent]   = useState(false)
  const [leadSending, setLeadSending] = useState(false)

  useEffect(() => {
    fetch('/api/fx/rate').then(r => r.json()).then(d => {
      if (d.usd_kes) setKesRate(d.usd_kes)
    }).catch(() => { /* use fallback 130 */ })
  }, [])

  const cifNum     = parseFloat(cif)        || 0
  const daysNum    = parseFloat(days)       || 0
  const dutyNum    = parseFloat(dutyRate)   || 25
  const storageNum = parseFloat(storageDay) || 50

  // Real costs: storage accumulates daily, KRA imposes 2% late surcharge after 7 free days
  const storage    = storageNum * daysNum
  const duty       = cifNum * (dutyNum / 100)
  const vat        = (cifNum + duty) * 0.16
  const idf        = cifNum * 0.02
  const rdl        = cifNum * 0.015
  const surcharge  = daysNum > 7 ? (duty + vat) * 0.02 : 0   // KRA 2% late surcharge
  const totalUSD   = storage + duty + vat + idf + rdl + surcharge
  const totalKES   = totalUSD * kesRate

  const hasResult = cifNum > 0 && daysNum > 0

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-6 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-[#00C896]" />
          <h3 className="text-white font-bold text-sm">Missed Deadline Cost Calculator</h3>
        </div>
        <span className="text-[10px] text-[#64748B]">1 USD = KES {kesRate}</span>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="col-span-2">
          <label className="text-[10px] text-[#64748B] uppercase tracking-wide block mb-1.5">CIF Value (USD)</label>
          <input
            type="number"
            value={cif}
            onChange={e => setCif(e.target.value)}
            placeholder="e.g. 50000"
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#64748B] uppercase tracking-wide block mb-1.5">Days at port</label>
          <input
            type="number"
            value={days}
            onChange={e => setDays(e.target.value)}
            placeholder="e.g. 21"
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50"
          />
        </div>
        <div>
          <label className="text-[10px] text-[#64748B] uppercase tracking-wide block mb-1.5">Storage rate (USD/day)</label>
          <input
            type="number"
            value={storageDay}
            onChange={e => setStorageDay(e.target.value)}
            placeholder="50"
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50"
          />
        </div>
        <div className="col-span-2">
          <label className="text-[10px] text-[#64748B] uppercase tracking-wide block mb-1.5">Import Duty Rate (%)</label>
          <input
            type="number"
            value={dutyRate}
            onChange={e => setDutyRate(e.target.value)}
            placeholder="25"
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50"
          />
        </div>
      </div>

      {hasResult ? (
        <div className="bg-[#0A1628] border border-red-500/20 rounded-xl p-4 space-y-1.5">
          {[
            { label: `Port storage (${daysNum}d × $${storageNum}/day)`, value: storage, red: true },
            { label: `Import duty (${dutyNum}%)`, value: duty },
            { label: 'VAT (16%)', value: vat },
            { label: 'IDF levy (2%)', value: idf },
            { label: 'RDL levy (1.5%)', value: rdl },
            ...(surcharge > 0 ? [{ label: 'KRA late surcharge (2%)', value: surcharge, red: true }] : []),
          ].map(row => (
            <div key={row.label} className="flex justify-between text-xs">
              <span className="text-[#64748B]">{row.label}</span>
              <span className={row.red ? 'text-red-400' : 'text-white'}>
                USD {Math.round(row.value).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex justify-between text-xs border-t border-[#1E3A5F] pt-2 mt-2">
            <span className="text-[#94A3B8] font-semibold">Total at risk</span>
            <span className="text-red-400 font-bold">KES {Math.round(totalKES).toLocaleString()}</span>
          </div>
          <p className="text-[10px] text-[#334155] mt-1">KRUX Basic ($299/mo) would have flagged this weeks before it cost you anything.</p>

          {/* Lead capture */}
          {!leadSent ? (
            <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
              <p className="text-[11px] text-[#94A3B8] mb-2">See a live brief for a shipment like this — no signup form, just the demo.</p>
              <form
                onSubmit={async (e) => {
                  e.preventDefault()
                  if (!leadEmail) return
                  setLeadSending(true)
                  try {
                    await fetch('/api/waitlist', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ email: leadEmail, company: 'Calculator lead' }),
                    })
                  } finally {
                    setLeadSent(true)
                    setLeadSending(false)
                  }
                }}
                className="flex gap-2"
              >
                <input
                  type="email"
                  required
                  value={leadEmail}
                  onChange={e => setLeadEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="flex-1 bg-[#0D1F35] border border-[#1E3A5F] rounded-lg px-3 py-2 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50"
                />
                <button
                  type="submit"
                  disabled={leadSending}
                  className="px-3 py-2 bg-[#00C896] text-[#0A1628] text-xs font-bold rounded-lg hover:bg-[#00C896]/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {leadSending ? '…' : 'See demo →'}
                </button>
              </form>
            </div>
          ) : (
            <div className="mt-4 pt-4 border-t border-[#1E3A5F] text-center">
              <p className="text-[11px] text-[#00C896] mb-2">Got it. Open the live demo now →</p>
              <a
                href="/demo"
                className="inline-block px-4 py-2 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/30 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 transition-colors"
              >
                Open KRUX Demo
              </a>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-[#0A1628] border border-dashed border-[#1E3A5F] rounded-xl p-4 text-center">
          <p className="text-[#334155] text-xs">Enter shipment values above to see your exposure</p>
        </div>
      )}
    </div>
  )
}

// ── Dashboard Mockup ─────────────────────────────────────────

function DashboardMockup() {
  const rows = [
    { name: 'Pharmaceutical APIs — Batch 44', reg: 'PPB', days: 3, risk: 'RED', score: '9.2', landed: '$84,200', status: 'CRITICAL' },
    { name: 'Agrochemicals Consignment Q2', reg: 'PCPB', days: 7, risk: 'AMBER', score: '6.1', landed: '$31,500', status: 'HIGH' },
    { name: 'Electronic Components — CN', reg: 'KEBS', days: 14, risk: 'AMBER', score: '3.8', landed: '$52,000', status: 'MEDIUM' },
    { name: 'Food Additives Shipment', reg: 'WHO-GMP', days: 22, risk: 'GREEN', score: '1.4', landed: '$18,900', status: 'LOW' },
  ]

  const riskColors: Record<string, string> = {
    RED: 'bg-red-500/15 text-red-400 border border-red-500/30',
    AMBER: 'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    GREEN: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  }

  const priorityColors: Record<string, string> = {
    CRITICAL: 'text-red-400',
    HIGH: 'text-amber-400',
    MEDIUM: 'text-blue-400',
    LOW: 'text-[#64748B]',
  }

  return (
    <div className="relative rounded-2xl border border-[#1E3A5F] overflow-hidden shadow-2xl bg-[#0A1628]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#060E1A] border-b border-[#1E3A5F]">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#1E3A5F]" />
        </div>
        <div className="flex-1 bg-[#0F2040] rounded-md px-3 py-1 text-[10px] text-[#334155] ml-2">
          krux-xi.vercel.app/dashboard/operations
        </div>
      </div>

      {/* Dashboard header */}
      <div className="px-5 py-3 flex items-center justify-between border-b border-[#1E3A5F] bg-[#0A1628]">
        <div>
          <p className="text-white font-bold text-sm">Operations Dashboard</p>
          <p className="text-[#64748B] text-[10px]">4 shipments tracked · Kenya Import Compliance · <span className="text-red-400 font-semibold">1 critical</span></p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
          <span className="text-[10px] text-[#64748B]">Live</span>
        </div>
      </div>

      {/* Alert banner */}
      <div className="mx-4 mt-3 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
        <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
        <p className="text-[10px] text-red-400 font-medium">
          <span className="font-bold">CRITICAL:</span> Pharmaceutical APIs — PPB deadline in 3 days. Est. loss if missed: <span className="font-bold">KES 546,300</span>
        </p>
      </div>

      {/* Table */}
      <div className="p-4 overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="border-b border-[#1E3A5F]">
              {['Priority', 'Shipment', 'Regulator', 'PVoC Deadline', 'Landed Cost', 'Risk'].map(h => (
                <th key={h} className="text-left pb-2 text-[#64748B] font-semibold uppercase tracking-wide text-[9px] pr-4">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A5F]/50">
            {rows.map((row, i) => (
              <tr key={i} className={i === 0 ? 'bg-red-500/5' : ''}>
                <td className="py-2.5 pr-4">
                  <span className={`text-[9px] font-bold ${priorityColors[row.status]}`}>{row.status}</span>
                  <div className="text-[9px] text-[#64748B]">{row.score}/10</div>
                </td>
                <td className="py-2.5 pr-4">
                  <p className="text-white font-medium truncate max-w-[160px]">{row.name}</p>
                </td>
                <td className="py-2.5 pr-4">
                  <span className="text-[9px] font-bold text-[#00C896] bg-[#00C896]/10 px-1.5 py-0.5 rounded">{row.reg}</span>
                </td>
                <td className="py-2.5 pr-4">
                  <p className="text-white">{row.days}d remaining</p>
                  {row.days <= 7 && <p className="text-red-400 text-[9px] flex items-center gap-0.5"><AlertTriangle size={8} /> Urgent</p>}
                </td>
                <td className="py-2.5 pr-4 text-[#00C896] font-semibold">{row.landed}</td>
                <td className="py-2.5">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${riskColors[row.risk]}`}>{row.risk}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/0 to-transparent flex flex-col items-center justify-end pb-8 pointer-events-none">
        <div className="pointer-events-auto">
          <p className="text-center text-xs text-[#64748B] mb-3">This is your dashboard. Live. Real-time. Every shipment.</p>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ────────────────────────────────────────────────

export default function Home() {
  const [email, setEmail]         = useState('')
  const [company, setCompany]     = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [calcOpen, setCalcOpen]   = useState(false)

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
      <nav className="flex items-center justify-between px-6 sm:px-10 py-5 border-b border-[#1E3A5F] sticky top-0 bg-[#0A1628]/95 backdrop-blur z-50">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] font-black text-sm">K</span>
          </div>
          <span className="text-white font-bold tracking-wide text-sm">KRUX</span>
          <span className="text-[#64748B] text-xs hidden sm:inline">· Kenya Import Compliance</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-[#94A3B8] hover:text-white transition-colors hidden sm:block">
            Sign in
          </Link>
          <a href="/demo" className="px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00C896]/90 transition-colors">
            Open Demo Dashboard
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-10 pt-20 pb-16 text-center max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00C896]/10 border border-[#00C896]/30 rounded-full text-[#00C896] text-xs font-semibold mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
          Kenya's first AI-native import compliance platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-black leading-tight mb-6">
          Stop losing money to<br />
          <span className="text-[#00C896]">missed PVoC deadlines</span>
        </h1>

        <p className="text-[#94A3B8] text-base sm:text-lg max-w-2xl mx-auto mb-4 leading-relaxed">
          KRUX tracks every Kenya import shipment across all 8 regulatory bodies,
          fires deadline alerts before it's too late, and uses AI to tell you
          exactly what to do — and what it will cost if you don't.
        </p>

        <button
          onClick={() => setCalcOpen(true)}
          className="text-sm text-[#64748B] hover:text-[#00C896] transition-colors underline underline-offset-2 mb-10 block mx-auto"
        >
          Calculate what your last missed deadline actually cost →
        </button>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-3">
          <a
            href="/demo"
            className="flex items-center justify-center gap-2 px-7 py-3.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors"
          >
            Open Demo Dashboard <ArrowRight size={15} />
          </a>
          <a
            href="#waitlist"
            className="flex items-center justify-center gap-2 px-7 py-3.5 border border-[#1E3A5F] text-[#94A3B8] rounded-xl text-sm hover:border-[#00C896]/40 hover:text-white transition-colors"
          >
            Request Early Access
          </a>
        </div>
        <p className="text-[11px] text-[#334155] text-center mb-10">No signup required · Pre-loaded with real Kenya shipments</p>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
          {[
            { stat: 'KES 546K+', label: 'Average cost of missing a PPB deadline on a $50K shipment' },
            { stat: '8 bodies', label: 'Regulators tracked per shipment — PPB, KEBS, KRA, PCPB, KEPHIS, EPRA, NEMA, WHO-GMP' },
            { stat: '45 days', label: 'PPB minimum processing time — miss the window and you cannot clear on time' },
          ].map(p => (
            <div key={p.stat} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 text-left">
              <div className="text-xl sm:text-2xl font-black text-[#00C896] mb-1.5">{p.stat}</div>
              <p className="text-[10px] sm:text-xs text-[#64748B] leading-relaxed">{p.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">The Product</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Your compliance war room</h2>
          <p className="text-[#64748B] text-sm mt-2 max-w-xl mx-auto">Every active shipment. Every regulator. Every deadline. Sorted by risk score so you always know what to fix first.</p>
        </div>
        <DashboardMockup />
      </section>

      {/* Problem → Solution */}
      <section className="px-6 sm:px-10 py-20 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-start">
            <div>
              <div className="text-xs font-bold text-red-400 uppercase tracking-widest mb-4">Without KRUX</div>
              <h2 className="text-2xl font-black text-white mb-6">Kenya import compliance is a spreadsheet nightmare</h2>
              <div className="space-y-3.5">
                {[
                  'Manually chasing 8 different regulators across every single shipment',
                  'Finding out about a missed deadline from a demurrage invoice',
                  'Spending half a day calculating duties, levies, and landed costs in Excel',
                  'No idea that a manufacturer\'s PPB license expired — until clearance fails',
                  'Audit trail is a WhatsApp group and someone\'s email inbox',
                ].map(p => (
                  <div key={p} className="flex items-start gap-3">
                    <X size={13} className="text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#94A3B8]">{p}</p>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-bold text-[#00C896] uppercase tracking-widest mb-4">With KRUX</div>
              <h2 className="text-2xl font-black text-white mb-6">One system that handles it all</h2>
              <div className="space-y-3.5">
                {[
                  'All 8 regulators tracked with automatic risk scoring — sorted by urgency',
                  'Email + WhatsApp alerts at 14, 7, and 3 days before every PVoC deadline',
                  'Landed cost in KES and USD calculated the moment you add a shipment',
                  'License expiry alerts 60, 30, and 7 days out with exact renewal steps',
                  'Complete timestamped audit trail — every action, every event, searchable',
                ].map(s => (
                  <div key={s} className="flex items-start gap-3">
                    <CheckCircle2 size={13} className="text-[#00C896] flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-[#94A3B8]">{s}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Regulators */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Coverage</div>
          <h2 className="text-2xl font-black text-white">Every Kenya regulator. In one place.</h2>
        </div>
        <div className="flex flex-wrap gap-3 justify-center">
          {REGULATORS.map(r => (
            <div key={r} className="flex items-center gap-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-4 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
              <span className="text-sm font-bold text-white">{r}</span>
            </div>
          ))}
        </div>
        <p className="text-center text-xs text-[#64748B] mt-6">
          SLA benchmarks built in — KRUX knows PPB needs 45 days, KEPHIS needs 7. It tells you when a deadline is <span className="text-red-400">physically impossible</span> to meet.
        </p>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-10 py-16 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Platform</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">Everything you need. Nothing you don't.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-6 hover:border-[#00C896]/30 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mb-4">
                    <Icon size={18} className="text-[#00C896]" />
                  </div>
                  <h3 className="text-white font-bold text-sm mb-2">{f.title}</h3>
                  <p className="text-[#64748B] text-xs leading-relaxed">{f.desc}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="px-6 sm:px-10 py-16 max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Who it's for</div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Built for the Kenya import ecosystem</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Users,
              role: 'Clearing Agents',
              tag: 'Best fit',
              desc: 'Manage multiple importers from one dashboard. Each client gets their own isolated workspace. Turn compliance intelligence into a billable service.',
            },
            {
              icon: Globe,
              role: 'SME Importers',
              tag: null,
              desc: 'Stop tracking compliance in spreadsheets and WhatsApp groups. Get automatic alerts, AI-generated checklists, and full audit trails.',
            },
            {
              icon: Factory,
              role: 'Supply Chain Managers',
              tag: null,
              desc: 'Visibility from PO to port clearance. Manufacturer vault tracks supplier licenses, audits, and financial risk signals automatically.',
            },
          ].map(p => {
            const Icon = p.icon
            return (
              <div key={p.role} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-6 text-left">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-[#1E3A5F] flex items-center justify-center">
                    <Icon size={18} className="text-[#00C896]" />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm">{p.role}</h3>
                    {p.tag && <span className="text-[9px] text-[#00C896] font-bold uppercase tracking-wide">{p.tag}</span>}
                  </div>
                </div>
                <p className="text-[#64748B] text-xs leading-relaxed">{p.desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* Pricing */}
      <section className="px-6 sm:px-10 py-16 bg-[#0F2040] border-y border-[#1E3A5F]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Pricing</div>
            <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">Simple, transparent pricing</h2>
            <p className="text-[#64748B] text-sm">All plans include full access. No per-shipment fees. Cancel anytime.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PRICING.map(plan => (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 border flex flex-col ${
                  plan.highlight
                    ? 'bg-[#00C896]/5 border-[#00C896]/40 ring-1 ring-[#00C896]/20'
                    : 'bg-[#0A1628] border-[#1E3A5F]'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-[#00C896] text-[#0A1628] text-xs font-bold rounded-full whitespace-nowrap">
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
                <div className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map(f => (
                    <div key={f} className="flex items-start gap-2">
                      <CheckCircle2 size={12} className="text-[#00C896] flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-[#94A3B8]">{f}</span>
                    </div>
                  ))}
                </div>
                <a
                  href={plan.name === 'Enterprise' ? '#waitlist' : '/demo'}
                  className={`block text-center py-3 rounded-xl text-sm font-bold transition-colors ${
                    plan.highlight
                      ? 'bg-[#00C896] text-[#0A1628] hover:bg-[#00C896]/90'
                      : 'border border-[#1E3A5F] text-white hover:border-[#00C896]/40'
                  }`}
                >
                  {plan.name === 'Enterprise' ? plan.cta : 'Try free demo'}
                </a>
                {plan.name !== 'Enterprise' && (
                  <p className="text-[10px] text-[#334155] text-center mt-2">No signup required</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Waitlist */}
      <section id="waitlist" className="px-6 sm:px-10 py-24">
        <div className="max-w-lg mx-auto text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#00C896] flex items-center justify-center mx-auto mb-6">
            <span className="text-[#0A1628] font-black text-xl">K</span>
          </div>
          <h2 className="text-3xl font-black text-white mb-3">Get Early Access</h2>
          <p className="text-[#64748B] text-sm mb-10 leading-relaxed">
            KRUX is in early access for Kenya importers and clearing agents.
            Submit your details and we'll set up your account within 24 hours.
          </p>

          {submitted ? (
            <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-2xl p-8">
              <CheckCircle2 size={32} className="text-[#00C896] mx-auto mb-3" />
              <h3 className="text-white font-bold text-base mb-2">You're on the list</h3>
              <p className="text-[#64748B] text-sm">We'll be in touch within 24 hours to get you set up.</p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
              >
                Already have an account? Sign in <ArrowRight size={14} />
              </Link>
            </div>
          ) : (
            <form onSubmit={joinWaitlist} className="space-y-3 text-left">
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Work email address"
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50 text-sm"
              />
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="Company name (optional)"
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/50 text-sm"
              />
              <button
                type="submit"
                disabled={submitting || !email}
                className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors disabled:opacity-60"
              >
                {submitting ? 'Submitting…' : 'Request Early Access'}
                {!submitting && <ArrowRight size={15} />}
              </button>
              <p className="text-[10px] text-[#334155] text-center">No spam. No commitments. We set up your account and walk you through it.</p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 sm:px-10 py-8 border-t border-[#1E3A5F] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#334155]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-[#00C896] flex items-center justify-center">
            <span className="text-[#0A1628] font-black text-[9px]">K</span>
          </div>
          <span className="text-[#64748B]">KRUX · Kenya Import Compliance Intelligence</span>
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-[#94A3B8] transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-[#94A3B8] transition-colors">Privacy</Link>
          <Link href="/login" className="hover:text-[#94A3B8] transition-colors">Sign in</Link>
          <span>Kenya · {new Date().getFullYear()}</span>
        </div>
      </footer>

      {/* Cost Calculator Modal */}
      {calcOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4" onClick={() => setCalcOpen(false)}>
          <div onClick={e => e.stopPropagation()} className="w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white font-bold text-sm">How much did that missed deadline cost?</p>
              <button onClick={() => setCalcOpen(false)} className="text-[#64748B] hover:text-white">
                <X size={18} />
              </button>
            </div>
            <CostCalculator />
            <p className="text-center text-xs text-[#64748B] mt-4">
              KRUX Basic is $299/month. One missed deadline pays for a year.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
