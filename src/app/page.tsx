'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { ArrowRight, CheckCircle2 } from 'lucide-react'

type WindowResult = {
  status: 'OPEN' | 'TIGHT' | 'IMPOSSIBLE'
  regulator: string
  regulator_name: string
  sla_days: number
  days_remaining: number
  days_short: number
  buffer_days: number
  kes_exposure: number
  message: string
}

type NetworkStats = {
  registered_entities: number
  shipments_tracked: number
  events_logged: number
  last_activity: string | null
}

const REGULATORS = [
  { code: 'PPB',    name: 'PPB — Pharmacy & Poisons Board',           sla: 52 },
  { code: 'KEBS',   name: 'KEBS — Kenya Bureau of Standards',         sla: 35 },
  { code: 'KEPHIS', name: 'KEPHIS — Plant Health Inspectorate',       sla: 7  },
  { code: 'EPRA',   name: 'EPRA — Energy & Petroleum Regulatory',     sla: 25 },
  { code: 'PCPB',   name: 'PCPB — Pest Control Products Board',       sla: 18 },
  { code: 'NEMA',   name: 'NEMA — National Environment Management',   sla: 40 },
  { code: 'CA',     name: 'CA — Communications Authority',            sla: 45 },
  { code: 'DVS',    name: 'DVS — Directorate of Veterinary Services', sla: 21 },
]

const REGULATOR_SCOPE = [
  { code: 'PPB',    scope: 'Pharma · Medical Devices · Cosmetics' },
  { code: 'KEBS',   scope: 'Electronics · Standards · PVoC' },
  { code: 'KEPHIS', scope: 'Agricultural Inputs · Plants · Seeds' },
  { code: 'EPRA',   scope: 'Petroleum · LPG · Energy Equipment' },
  { code: 'PCPB',   scope: 'Pesticides · Herbicides · Fungicides' },
  { code: 'NEMA',   scope: 'Chemicals · Environmental Permits' },
  { code: 'CA',     scope: 'Mobile · Routers · Radio Equipment' },
  { code: 'DVS',    scope: 'Meat · Poultry · Dairy · Animal Feed' },
  { code: 'KRA',    scope: 'Customs · HS Classification · Duties' },
]

// ETA delta must keep gap = (sla - daysRemaining) in the correct zone regardless of load date:
// PPB sla=52  → +20d → gap=+32 → IMPOSSIBLE
// EPRA sla=25 → +10d → gap=+15 → IMPOSSIBLE
// KEBS sla=35 → +37d → gap=−2  → TIGHT (−4 ≤ gap ≤ 0)
const EXAMPLES = [
  { label: 'PPB · Pharma',       regulator: 'PPB',  etaDays: 20 },
  { label: 'EPRA · Petroleum',   regulator: 'EPRA', etaDays: 10 },
  { label: 'KEBS · Electronics', regulator: 'KEBS', etaDays: 37 },
]

function etaFromToday(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

function WindowChecker() {
  const [regulator, setRegulator]       = useState('')
  const [eta, setEta]                   = useState('')
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<WindowResult | null>(null)
  const [error, setError]               = useState('')
  const [captureEmail, setCaptureEmail] = useState('')
  const [captureSent, setCaptureSent]   = useState(false)
  const [captureLoading, setCaptureLoading] = useState(false)

  async function submitCapture() {
    if (!captureEmail.trim() || captureSent) return
    setCaptureLoading(true)
    try {
      await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: captureEmail.trim(),
          company: result?.regulator ?? '',
          role: 'window_check',
          lead_context: result ? {
            result_status:  result.status,
            regulator:      result.regulator,
            regulator_name: result.regulator_name,
            sla_days:       result.sla_days,
            days_remaining: result.days_remaining,
            days_short:     result.days_short,
            buffer_days:    result.buffer_days,
            kes_exposure:   result.kes_exposure,
          } : null,
        }),
      })
      setCaptureSent(true)
    } catch {}
    finally { setCaptureLoading(false) }
  }

  const minDate = new Date()
  minDate.setDate(minDate.getDate() + 1)
  const minDateStr = minDate.toISOString().split('T')[0]

  async function check(override?: { regulator: string; eta: string }) {
    const r = override?.regulator ?? regulator
    const e = override?.eta       ?? eta
    if (!r || !e) return
    setLoading(true)
    setResult(null)
    setError('')
    try {
      const res  = await fetch(`/api/window-check?regulator=${r}&eta=${e}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Check failed'); return }
      setResult(data)
    } catch {
      setError('Network error — try again')
    } finally {
      setLoading(false)
    }
  }

  function tryExample(ex: typeof EXAMPLES[0]) {
    const etaStr = etaFromToday(ex.etaDays)
    setRegulator(ex.regulator)
    setEta(etaStr)
    setResult(null)
    setError('')
    setCaptureEmail('')
    setCaptureSent(false)
    check({ regulator: ex.regulator, eta: etaStr })
  }

  const statusConfig = {
    OPEN:       { bg: 'bg-[#00C896]/10', border: 'border-[#00C896]/40', icon: '✓', label: 'WINDOW OPEN',   color: 'text-[#00C896]' },
    TIGHT:      { bg: 'bg-amber-500/10', border: 'border-amber-500/40', icon: '⚠', label: 'WINDOW TIGHT',  color: 'text-amber-400' },
    IMPOSSIBLE: { bg: 'bg-red-500/10',   border: 'border-red-500/40',   icon: '✕', label: 'WINDOW CLOSED', color: 'text-red-400'   },
  }

  return (
    <div className="bg-[#0A1628] border border-[#1E3A5F] overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 bg-[#060E1A] border-b border-[#1E3A5F]">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-[#1E3A5F]" />
          <div className="w-2 h-2 rounded-full bg-[#1E3A5F]" />
          <div className="w-2 h-2 rounded-full bg-[#1E3A5F]" />
        </div>
        <span className="text-xs text-[#64748B] ml-2 font-mono tracking-widest">KRUX · WINDOW QUERY</span>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
          <span className="text-xs text-[#00C896] font-mono">LIVE</span>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <p className="text-xs text-[#334155] font-mono tracking-widest uppercase">No account needed</p>

        <div className="space-y-2 pb-1">
          <p className="text-xs text-[#334155] font-mono tracking-widest uppercase">Try an example</p>
          <div className="flex gap-2 flex-wrap">
            {EXAMPLES.map(ex => (
              <button
                key={ex.label}
                type="button"
                onClick={() => tryExample(ex)}
                disabled={loading}
                className="px-3 py-1.5 border border-[#1E3A5F] text-xs font-mono text-[#64748B] hover:border-[#00C896]/40 hover:text-[#94A3B8] transition-all disabled:opacity-40 tracking-wide"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#64748B] uppercase tracking-widest block mb-1.5 font-mono">Regulatory body</label>
            <select
              value={regulator}
              onChange={e => { setRegulator(e.target.value); setResult(null) }}
              className="w-full bg-[#0F2040] border border-[#1E3A5F] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C896]/50 appearance-none font-mono"
            >
              <option value="">Select regulator</option>
              {REGULATORS.map(r => (
                <option key={r.code} value={r.code} className="bg-[#0F2040]">{r.name} · {r.sla}d SLA</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[#64748B] uppercase tracking-widest block mb-1.5 font-mono">Expected arrival date</label>
            <input
              type="date"
              value={eta}
              min={minDateStr}
              onChange={e => { setEta(e.target.value); setResult(null) }}
              className="w-full bg-[#0F2040] border border-[#1E3A5F] px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#00C896]/50 font-mono"
            />
          </div>
        </div>

        <button
          onClick={() => check()}
          disabled={!regulator || !eta || loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] font-bold text-sm hover:bg-[#00C896]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-mono tracking-widest uppercase"
        >
          {loading ? 'Calculating...' : 'Check window →'}
        </button>

        {error && (
          <div className="border border-red-500/30 p-3 text-xs text-red-400 font-mono bg-red-500/5">
            {error}
          </div>
        )}

        {result && (() => {
          const cfg = statusConfig[result.status]
          return (
            <div className={`border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`font-black ${cfg.color}`}>{cfg.icon}</span>
                  <span className={`text-sm font-black ${cfg.color} tracking-widest font-mono`}>{cfg.label}</span>
                </div>
                {result.status === 'IMPOSSIBLE' && result.kes_exposure > 0 && (
                  <span className="text-xs font-bold text-red-400 font-mono">KES {result.kes_exposure.toLocaleString()} at risk</span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'SLA needed',  value: `${result.sla_days}d`,       color: 'text-white' },
                  { label: 'Days to ETA', value: `${result.days_remaining}d`,  color: result.status === 'IMPOSSIBLE' ? 'text-red-400' : 'text-white' },
                  { label: result.status === 'OPEN' ? 'Buffer' : 'Short',
                    value: result.status === 'OPEN' ? `${result.buffer_days}d` : `${result.days_short}d`,
                    color: result.status === 'OPEN' ? 'text-[#00C896]' : 'text-red-400' },
                ].map(s => (
                  <div key={s.label} className="bg-[#0A1628]/60 p-3 text-center">
                    <div className={`text-2xl font-black ${s.color} font-mono leading-none`}>{s.value}</div>
                    <div className="text-xs text-[#64748B] uppercase tracking-wider mt-1 font-mono">{s.label}</div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-[#94A3B8] font-mono leading-relaxed">{result.message}</p>

              {result.status === 'IMPOSSIBLE' && (
                <div className="border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
                  <p className="font-mono text-xs text-red-400/70 uppercase tracking-widest">What to do now</p>
                  {[
                    'Contact your clearing agent — do not wait for the vessel',
                    'Request expedited track directly from the regulatory body',
                    'Calculate daily storage cost — your exposure grows until cleared',
                  ].map((step, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="font-mono text-xs text-red-400/50 font-bold flex-shrink-0 mt-0.5">{i + 1}.</span>
                      <span className="font-mono text-xs text-[#94A3B8]">{step}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <a
                  href="/signup"
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#00C896] text-[#0A1628] text-xs font-bold font-mono tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors"
                >
                  Apply for KTIN — track all shipments →
                </a>
                {(result.status === 'IMPOSSIBLE' || result.status === 'TIGHT') && (
                  <div className="border border-[#1E3A5F] bg-[#0A1628]/60 p-3">
                    {captureSent ? (
                      <p className="font-mono text-xs text-[#00C896] text-center tracking-widest">✓ We&#39;ll send you deadline alerts</p>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="email"
                          value={captureEmail}
                          onChange={e => setCaptureEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && submitCapture()}
                          placeholder="your@email.com"
                          className="flex-1 bg-[#0F2040] border border-[#1E3A5F] px-3 py-2 text-xs text-white font-mono placeholder-[#334155] focus:outline-none focus:border-[#00C896]/50 min-w-0"
                        />
                        <button
                          onClick={submitCapture}
                          disabled={!captureEmail.trim() || captureLoading}
                          className="px-3 py-2 bg-[#1E3A5F] text-[#94A3B8] text-xs font-mono font-bold tracking-widest uppercase hover:bg-[#2E4A6F] hover:text-white transition-colors disabled:opacity-40 flex-shrink-0"
                        >
                          {captureLoading ? '...' : 'Alert me'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}

function NetworkPulse() {
  const [stats, setStats] = useState<NetworkStats | null>(null)

  useEffect(() => {
    fetch('/api/network-stats').then(r => r.json()).then(setStats).catch(() => {})
  }, [])

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    if (h > 0) return `${h}h ago`
    if (m > 0) return `${m}m ago`
    return 'just now'
  }

  if (!stats) return null

  return (
    <div className="border border-[#1E3A5F] bg-[#060E1A]">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1E3A5F]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
        <span className="text-xs text-[#00C896] font-mono font-bold tracking-widest uppercase">Network</span>
        {stats.last_activity && (
          <span className="text-xs text-[#334155] font-mono ml-auto">{timeAgo(stats.last_activity)}</span>
        )}
      </div>
      <div className="grid grid-cols-3 divide-x divide-[#1E3A5F]">
        {[
          { value: stats.registered_entities, label: 'Entities' },
          { value: stats.shipments_tracked,   label: 'Shipments' },
          { value: stats.events_logged,       label: 'Events' },
        ].map(s => (
          <div key={s.label} className="px-4 py-3 text-center">
            <div className="font-mono text-2xl font-black text-white">{s.value}</div>
            <div className="font-mono text-xs text-[#64748B] uppercase tracking-widest mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1628] text-white">

      {/* Nav */}
      <nav className="flex items-center justify-between px-6 sm:px-10 py-4 border-b border-[#1E3A5F]/60 sticky top-0 bg-[#0A1628]/95 backdrop-blur z-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#00C896] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] font-black text-xs">K</span>
          </div>
          <span className="font-mono font-bold text-sm tracking-widest">KRUX</span>
          <span className="font-mono text-xs text-[#1E3A5F] ml-1 hidden sm:block">· KE</span>
        </div>
        <div className="flex items-center gap-5">
          <Link href="/network" className="font-mono text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors hidden sm:block tracking-wider">
            Network
          </Link>
          <Link href="/services" className="font-mono text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors hidden lg:block tracking-wider">
            Services
          </Link>
          <Link href="/enterprise" className="font-mono text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors hidden lg:block tracking-wider">
            Enterprise
          </Link>
          <Link href="/partners" className="font-mono text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors hidden lg:block tracking-wider">
            Partners
          </Link>
          <Link href="/login" className="font-mono text-sm text-[#64748B] hover:text-[#94A3B8] transition-colors hidden sm:block tracking-wider">
            Sign in
          </Link>
          <a href="/signup" className="font-mono text-sm bg-[#00C896] text-[#0A1628] px-4 py-2 font-bold tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors">
            Apply for KTIN
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 sm:px-10 pt-16 pb-20 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-start">

          {/* Left — order-2 on mobile so checker appears first */}
          <div className="space-y-10 order-2 lg:order-1">
            <div className="space-y-6">
              <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase">Kenya Import Intelligence</p>
              <h1 className="font-mono font-black text-[clamp(3.2rem,8vw,6rem)] leading-[0.95] tracking-tight">
                The window<br/>closes before<br/>your goods<br/>leave origin.
              </h1>
              <p className="font-mono text-lg text-[#64748B] leading-relaxed max-w-sm">
                Every Kenya import has a regulatory window. Miss it and goods sit at port. KRUX calculates your window before goods ship — and issues a permanent trade identity that follows every clearance you make.
              </p>
            </div>

            {/* Regulator scope grid */}
            <div className="space-y-2">
              <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase mb-4">All 9 regulatory bodies · Kenya live</p>
              <div className="grid grid-cols-1 gap-2">
                {REGULATOR_SCOPE.map(r => (
                  <div key={r.code} className="flex items-center gap-4">
                    <span className="font-mono text-base font-bold text-white w-16 flex-shrink-0">{r.code}</span>
                    <div className="w-px h-4 bg-[#1E3A5F] flex-shrink-0" />
                    <span className="font-mono text-base text-[#64748B]">{r.scope}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <a href="/signup" className="flex items-center justify-center gap-2 px-6 py-3.5 bg-[#00C896] text-[#0A1628] font-mono font-bold text-sm tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors">
                Apply for KTIN <ArrowRight size={14} />
              </a>
              <a href="/demo" className="flex items-center justify-center gap-2 px-6 py-3.5 border border-[#1E3A5F] text-[#334155] font-mono text-sm tracking-widest uppercase hover:border-[#334155] hover:text-[#64748B] transition-colors hidden sm:flex">
                Open terminal →
              </a>
            </div>
          </div>

          {/* Right — Window Checker — order-1 on mobile so it appears first */}
          <div className="space-y-2 order-1 lg:order-2">
            <WindowChecker />
            <NetworkPulse />
          </div>
        </div>
      </section>

      {/* KTIN */}
      <section className="border-t border-[#1E3A5F]/60 bg-[#060E1A]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
          <div className="grid md:grid-cols-2 gap-16 items-center">

            <div className="space-y-6">
              <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase">KTIN — KRUX Trade Identity Number</p>
              <h2 className="font-mono font-black text-4xl sm:text-5xl text-white leading-tight">
                Your compliance record.<br/>Permanent. Numbered.
              </h2>
              <p className="font-mono text-lg text-[#64748B] leading-relaxed">
                KRUX issues every importer, clearing agent, and manufacturer a permanent trade identity number. One number, tied to every clearance you run. Banks reference it. Regulators recognize it. Partners trust it.
              </p>
              <div className="space-y-3">
                {[
                  'Issued on registration — permanent and numbered',
                  'Tier computed from your actual clearance history — not self-reported',
                  'Public verification page you can share with banks and partners',
                ].map(f => (
                  <div key={f} className="flex items-start gap-3">
                    <CheckCircle2 size={15} className="text-[#00C896] flex-shrink-0 mt-0.5" />
                    <span className="font-mono text-base text-[#64748B]">{f}</span>
                  </div>
                ))}
              </div>
              <a href="/signup" className="inline-flex items-center gap-2 font-mono text-sm text-[#00C896] font-bold tracking-widest uppercase hover:text-[#00C896]/70 transition-colors">
                Apply for your KTIN <ArrowRight size={13} />
              </a>
            </div>

            {/* Sample card — KTIN number dominates */}
            <div className="border border-yellow-400/20 bg-yellow-400/5 p-8 space-y-6">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs text-[#64748B] tracking-widest uppercase">Founding operator · Kenya</span>
                <span className="font-mono text-sm text-yellow-400 font-bold tracking-widest border border-yellow-400/30 px-3 py-1">GOLD</span>
              </div>
              <div className="font-mono font-black text-3xl sm:text-4xl text-white tracking-wider leading-none">
                KRUX-IMP-<br className="sm:hidden"/>KE-00047
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                {[
                  { label: 'Issued',    value: '01 May 2026', color: 'text-[#64748B]' },
                  { label: 'Shipments', value: '47 cleared',  color: 'text-[#64748B]' },
                  { label: 'On-time',   value: '87%',         color: 'text-yellow-400' },
                ].map(f => (
                  <div key={f.label}>
                    <div className="font-mono text-xs text-[#334155] uppercase tracking-wider mb-1">{f.label}</div>
                    <div className={`font-mono text-sm font-bold ${f.color}`}>{f.value}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-yellow-400/10 pt-5">
                <span className="font-mono text-xs text-[#334155] tracking-wide select-all">
                  kruxvon.com/verify/KRUX-IMP-KE-00047
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Operators */}
      <section className="border-t border-[#1E3A5F]/60">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-20">
          <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase mb-10">Who operates on the network</p>
          <div className="grid md:grid-cols-3 gap-px bg-[#1E3A5F]/30">
            {[
              {
                type: 'Clearing Agents',
                ktin: 'KRUX-AGT-KE-XXXXX',
                desc: 'Every client\'s shipments from one terminal. Compliance intelligence becomes a service you bill for.',
              },
              {
                type: 'Importers',
                ktin: 'KRUX-IMP-KE-XXXXX',
                desc: 'Know your window before goods leave origin. Your KTIN follows your compliance record permanently.',
              },
              {
                type: 'Manufacturers',
                ktin: 'KRUX-MFG-KE-XXXXX',
                desc: 'Import raw materials with full regulatory intelligence. Supplier licenses and audit schedules tracked.',
              },
            ].map(op => (
              <div key={op.type} className="bg-[#0A1628] p-8 space-y-3">
                <div>
                  <p className="font-mono text-lg font-bold text-white">{op.type}</p>
                  <p className="font-mono text-xs text-[#1E3A5F] mt-1">{op.ktin}</p>
                </div>
                <p className="font-mono text-base text-[#64748B] leading-relaxed">{op.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Without / With */}
      <section className="border-t border-[#1E3A5F]/60 bg-[#060E1A]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="grid md:grid-cols-2 gap-px bg-[#1E3A5F]/30">
            <div className="bg-[#060E1A] p-10 space-y-6">
              <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase">Without KRUX</p>
              <div className="space-y-4">
                {[
                  'Finding out about a missed deadline from a demurrage invoice at the port',
                  'Manually chasing 9 different regulators across every shipment',
                  'No idea PPB needs 52 days until the goods are already at sea',
                  'Half a day calculating duties, levies, and landed costs in Excel',
                  'Audit trail is a WhatsApp group and someone\'s email inbox',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono text-sm text-[#334155] font-bold flex-shrink-0 mt-0.5">✕</span>
                    <span className="font-mono text-base text-[#334155] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-[#060E1A] p-10 space-y-6">
              <p className="font-mono text-xs text-[#00C896] tracking-widest uppercase">With KRUX</p>
              <div className="space-y-4">
                {[
                  'Impossible windows flagged before goods leave origin — not after they land',
                  'All 9 regulators tracked with automatic risk scoring sorted by urgency',
                  'Landed cost in KES and USD calculated the moment you add a shipment',
                  'Daily hit list shows exactly what to act on — CRITICAL, URGENT, WATCH',
                  'Complete timestamped audit trail — every action, every event, searchable',
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="font-mono text-sm text-[#00C896] font-bold flex-shrink-0 mt-0.5">✓</span>
                    <span className="font-mono text-base text-[#94A3B8] leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hit List Demo */}
      <section className="border-t border-[#1E3A5F]/60">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <div className="grid lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-6 order-2 lg:order-1">
              <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase">What you see every morning</p>
              <h2 className="font-mono font-black text-4xl sm:text-5xl text-white leading-tight">
                Your hit list.<br/>Sorted by<br/>what it costs.
              </h2>
              <p className="font-mono text-lg text-[#64748B] leading-relaxed">
                Every morning KRUX generates a prioritized action list across all your shipments — sorted by KES at risk. Closed windows. Approaching deadlines. Items to watch. You know what to act on before 9am.
              </p>
              <a href="/demo" className="inline-flex items-center gap-2 font-mono text-sm text-[#00C896] font-bold tracking-widest uppercase hover:text-[#00C896]/70 transition-colors">
                Open terminal →
              </a>
            </div>
            <div className="bg-[#0A1628] border border-[#1E3A5F] overflow-hidden order-1 lg:order-2">
              <div className="flex items-center justify-between px-5 py-3 bg-[#060E1A] border-b border-[#1E3A5F]">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
                  <span className="font-mono text-xs text-[#00C896] tracking-widest">TODAY&#39;S HIT LIST</span>
                </div>
                <span className="font-mono text-xs text-[#334155]">3 critical</span>
              </div>
              <div className="divide-y divide-[#1E3A5F]/40">
                {[
                  {
                    rank: 1, priority: 'CRITICAL', status: 'WINDOW CLOSED', statusColor: 'text-red-400',
                    kes: 'KES 185,864', name: 'Jet A-1 Aviation Fuel — 500KL',
                    detail: 'EPRA needs 25d — only 8d remaining. Window is closed.',
                    action: 'Escalate to EPRA immediately', border: 'border-l-red-500',
                  },
                  {
                    rank: 2, priority: 'CRITICAL', status: 'WINDOW CLOSED', statusColor: 'text-red-400',
                    kes: 'KES 40,656', name: 'Amoxicillin 500mg — Batch K23B',
                    detail: 'PPB needs 52d — only 4d remaining. Window is closed.',
                    action: 'Request deadline extension now', border: 'border-l-red-500',
                  },
                  {
                    rank: 3, priority: 'URGENT', status: '4d to deadline', statusColor: 'text-amber-400',
                    kes: 'KES 28,800', name: 'NPK Fertilizer 20-10-10 — 50MT',
                    detail: 'PCPB deadline approaching — 3 documents pending.',
                    action: 'Submit PCPB portal today', border: 'border-l-amber-500',
                  },
                ].map((item) => (
                  <div key={item.rank} className={`p-4 border-l-2 ${item.border} space-y-2`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-[#334155]">#{item.rank}</span>
                        <span className={`font-mono text-xs font-bold tracking-widest ${item.priority === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'}`}>{item.priority}</span>
                        <span className={`font-mono text-xs ${item.statusColor}`}>{item.status}</span>
                      </div>
                      <span className="font-mono text-xs font-bold text-white">{item.kes}</span>
                    </div>
                    <p className="font-mono text-sm font-bold text-white">{item.name}</p>
                    <p className="font-mono text-xs text-[#64748B]">{item.detail}</p>
                    <p className="font-mono text-xs text-[#00C896]">→ {item.action}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 bg-[#060E1A] border-t border-[#1E3A5F] flex items-center justify-between">
                <span className="font-mono text-xs text-[#334155]">0 / 3 done today</span>
                <span className="font-mono text-xs font-bold text-red-400">KES 255,320 at risk</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[#1E3A5F]/60">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-16">
          <p className="font-mono text-xs text-[#64748B] tracking-widest uppercase mb-10">How it works</p>
          <div className="grid md:grid-cols-3 gap-px bg-[#1E3A5F]/30">
            {[
              {
                step: '01',
                title: 'Add a shipment',
                body: 'Enter the regulator, HS code, and expected arrival. KRUX calculates the compliance window instantly against today\'s date.',
              },
              {
                step: '02',
                title: 'Window calculated',
                body: 'OPEN, TIGHT, or IMPOSSIBLE — with days remaining, SLA required, and KES exposure if the window is already closed.',
              },
              {
                step: '03',
                title: 'Hit list every morning',
                body: 'CRITICAL · URGENT · WATCH — sorted by KES at risk. You know what to act on before 9am, every day.',
              },
            ].map(s => (
              <div key={s.step} className="bg-[#0A1628] p-8 space-y-3">
                <span className="font-mono text-xs text-[#1E3A5F] font-bold tracking-widest">{s.step}</span>
                <h3 className="font-mono text-lg font-bold text-white">{s.title}</h3>
                <p className="font-mono text-base text-[#64748B] leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1E3A5F]/60 bg-[#060E1A]">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 py-24">
          <div className="max-w-lg space-y-7">
            <div className="w-9 h-9 bg-[#00C896] flex items-center justify-center">
              <span className="text-[#0A1628] font-black text-base">K</span>
            </div>
            <h2 className="font-mono font-black text-4xl sm:text-5xl text-white leading-tight">Apply for your KTIN.</h2>
            <p className="font-mono text-lg text-[#64748B] leading-relaxed">
              Registering importers, clearing agents, and manufacturers operating in East Africa. 6 live shipments pre-loaded. Full intelligence access from day one.
            </p>
            <div className="flex flex-col gap-3">
              <a href="/signup" className="flex items-center justify-center gap-2 py-4 bg-[#00C896] text-[#0A1628] font-mono font-bold text-sm tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors">
                Apply for KTIN <ArrowRight size={14} />
              </a>
              <a href="/demo" className="flex items-center justify-center gap-2 py-3.5 border border-[#1E3A5F] text-[#334155] font-mono text-sm tracking-widest uppercase hover:border-[#334155] hover:text-[#64748B] transition-colors">
                Open terminal — no account needed →
              </a>
            </div>
            <p className="font-mono text-xs text-[#1E3A5F]">
              Already registered?{' '}
              <Link href="/login" className="text-[#334155] hover:text-[#64748B] transition-colors">Sign in →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1E3A5F]/60 px-6 sm:px-10 py-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <span className="font-mono text-xs text-[#475569]">KRUX · KRUXVON Ltd · Kenya</span>
          <div className="flex items-center gap-5">
            <Link href="/terms"   className="font-mono text-xs text-[#475569] hover:text-[#64748B] transition-colors">Terms</Link>
            <Link href="/privacy" className="font-mono text-xs text-[#475569] hover:text-[#64748B] transition-colors">Privacy</Link>
            <a href="mailto:hq@kruxvon.com" className="font-mono text-xs text-[#475569] hover:text-[#64748B] transition-colors">hq@kruxvon.com</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
