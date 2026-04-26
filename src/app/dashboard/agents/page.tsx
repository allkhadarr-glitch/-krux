'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { formatUSD, daysUntilDeadline } from '@/lib/utils'
import { RiskBadge, RegulatorBadge } from '@/components/RiskBadge'
import {
  AlertTriangle, Clock, Sparkles, Loader2, CheckCircle2,
  TrendingUp, Shield, Zap, ChevronRight, Copy,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────

type Urgency = 'CRITICAL' | 'URGENT' | 'WATCH' | 'ON_TRACK'

interface EnrichedShipment extends Shipment {
  daysRemaining: number | null
  urgency: Urgency
  totalKESAtRisk: number
}

const URGENCY_CONFIG: Record<Urgency, { label: string; color: string; bg: string; border: string; dot: string }> = {
  CRITICAL: { label: 'CRITICAL', color: 'text-red-400',     bg: 'bg-red-500/10',    border: 'border-red-500/30',    dot: 'bg-red-400' },
  URGENT:   { label: 'URGENT',   color: 'text-amber-400',   bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  dot: 'bg-amber-400' },
  WATCH:    { label: 'WATCH',    color: 'text-blue-400',    bg: 'bg-blue-500/10',   border: 'border-blue-500/30',   dot: 'bg-blue-400' },
  ON_TRACK: { label: 'ON TRACK', color: 'text-emerald-400', bg: 'bg-emerald-500/10',border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
}

function getUrgency(days: number | null): Urgency {
  if (days == null) return 'WATCH'
  if (days <= 3)  return 'CRITICAL'
  if (days <= 7)  return 'URGENT'
  if (days <= 14) return 'WATCH'
  return 'ON_TRACK'
}

// ─── Risk Heat Map ────────────────────────────────────────────

function HeatMap({ shipments }: { shipments: EnrichedShipment[] }) {
  const total = shipments.length
  if (!total) return null
  const cols = Math.min(total, 12)

  return (
    <div>
      <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-widest mb-2">Risk Heat Map — {total} shipments</p>
      <div className="flex flex-wrap gap-1.5">
        {shipments.map((s) => {
          const cfg = URGENCY_CONFIG[s.urgency]
          return (
            <div
              key={s.id}
              title={`${s.name}\n${s.daysRemaining != null ? `${s.daysRemaining}d remaining` : 'No deadline'}\n${s.regulatory_body?.code ?? '—'}`}
              className={`w-7 h-7 rounded ${cfg.bg} border ${cfg.border} flex items-center justify-center cursor-default transition-all hover:scale-110`}
            >
              <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
            </div>
          )
        })}
      </div>
      <div className="flex items-center gap-4 mt-2">
        {(['CRITICAL', 'URGENT', 'WATCH', 'ON_TRACK'] as Urgency[]).map((u) => {
          const cfg   = URGENCY_CONFIG[u]
          const count = shipments.filter((s) => s.urgency === u).length
          if (!count) return null
          return (
            <div key={u} className="flex items-center gap-1.5">
              <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
              <span className={`text-[10px] ${cfg.color} font-semibold`}>{count} {cfg.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Stats Strip ─────────────────────────────────────────────

function StatsStrip({ shipments }: { shipments: EnrichedShipment[] }) {
  const critical    = shipments.filter((s) => s.urgency === 'CRITICAL').length
  const urgent      = shipments.filter((s) => s.urgency === 'URGENT').length
  const totalKES    = shipments.reduce((sum, s) => sum + s.totalKESAtRisk, 0)
  const thisWeek    = shipments.filter((s) => s.daysRemaining != null && s.daysRemaining <= 7).length

  const stats = [
    { label: 'Active Shipments', value: String(shipments.length), color: 'text-white', icon: Shield },
    { label: 'Critical Today',   value: String(critical),         color: critical > 0 ? 'text-red-400' : 'text-white', icon: AlertTriangle },
    { label: 'Due This Week',    value: String(thisWeek),         color: thisWeek > 0 ? 'text-amber-400' : 'text-white', icon: Clock },
    { label: 'KES at Risk',      value: `${(totalKES / 1000).toFixed(0)}K`, color: totalKES > 100000 ? 'text-red-400' : 'text-[#00C896]', icon: TrendingUp },
  ]

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((s) => {
        const Icon = s.icon
        return (
          <div key={s.label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={13} className="text-[#64748B]" />
              <p className="text-[10px] text-[#64748B] uppercase tracking-widest font-semibold">{s.label}</p>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── Priority Queue ───────────────────────────────────────────

function PriorityQueue({ shipments }: { shipments: EnrichedShipment[] }) {
  const top = shipments
    .filter((s) => s.urgency === 'CRITICAL' || s.urgency === 'URGENT')
    .slice(0, 8)

  if (!top.length) {
    return (
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-6 text-center">
        <CheckCircle2 size={24} className="text-emerald-400 mx-auto mb-2" />
        <p className="text-sm text-white font-semibold">No critical or urgent shipments</p>
        <p className="text-xs text-[#64748B] mt-1">All active shipments have adequate time.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1E3A5F] flex items-center justify-between">
        <p className="text-xs font-bold text-white uppercase tracking-widest">Priority Queue</p>
        <span className="text-[10px] text-[#64748B]">{top.length} shipments need action</span>
      </div>
      <div className="divide-y divide-[#1E3A5F]">
        {top.map((s) => {
          const cfg = URGENCY_CONFIG[s.urgency]
          const reg = s.regulatory_body?.code ?? '—'
          return (
            <div key={s.id} className={`px-5 py-3.5 flex items-center gap-4 ${s.urgency === 'CRITICAL' ? 'bg-red-500/5' : ''}`}>
              <div className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                {cfg.label}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-[10px] font-bold text-[#00C896]">{reg}</span>
                  {s.daysRemaining != null && (
                    <span className={`text-[10px] ${s.urgency === 'CRITICAL' ? 'text-red-400' : 'text-amber-400'} font-semibold`}>
                      {s.daysRemaining}d to deadline
                    </span>
                  )}
                  {s.totalKESAtRisk > 0 && (
                    <span className="text-[10px] text-[#64748B]">
                      KES {s.totalKESAtRisk.toLocaleString()} at risk
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight size={14} className="text-[#334155] flex-shrink-0" />
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Morning Briefing Panel ───────────────────────────────────

function MorningBriefing({ shipments }: { shipments: EnrichedShipment[] }) {
  const [briefing, setBriefing]   = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [stats, setStats]         = useState<any>(null)

  async function generate() {
    setLoading(true)
    setBriefing(null)
    try {
      const res  = await fetch('/api/ai/morning-briefing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shipments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setBriefing(data.result)
      setStats(data.stats)
    } catch {
      setBriefing('Failed to generate briefing. Check your API key.')
    } finally {
      setLoading(false)
    }
  }

  function copyToClipboard() {
    if (!briefing) return
    navigator.clipboard.writeText(briefing)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-[#1E3A5F] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={13} className="text-[#00C896]" />
          <p className="text-xs font-bold text-white uppercase tracking-widest">AI Morning Briefing</p>
        </div>
        <div className="flex items-center gap-2">
          {briefing && (
            <button
              onClick={copyToClipboard}
              className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-[#64748B] border border-[#1E3A5F] rounded-lg hover:text-white hover:border-[#00C896]/30 transition-all"
            >
              <Copy size={10} />
              {copied ? 'Copied' : 'Copy to WhatsApp'}
            </button>
          )}
          <button
            onClick={generate}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896] text-[#0A1628] rounded-lg text-xs font-bold hover:bg-[#00B584] disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={11} className="animate-spin" /> : <Zap size={11} />}
            {loading ? 'Generating...' : briefing ? 'Regenerate' : 'Generate Today\'s Brief'}
          </button>
        </div>
      </div>

      {!briefing && !loading && (
        <div className="px-5 py-8 text-center">
          <Sparkles size={28} className="text-[#334155] mx-auto mb-3" />
          <p className="text-sm text-[#64748B]">Generate your daily intelligence brief</p>
          <p className="text-xs text-[#334155] mt-1">
            AI reads all active shipments and gives you exactly what to act on today.
            Copy it to WhatsApp to share with your team.
          </p>
        </div>
      )}

      {loading && (
        <div className="px-5 py-8 flex flex-col items-center gap-3">
          <div className="relative">
            <Sparkles size={24} className="text-[#00C896]" />
            <Loader2 size={40} className="text-[#00C896]/20 animate-spin absolute -top-2 -left-2" />
          </div>
          <p className="text-sm text-[#64748B]">Reading all shipments and building your brief...</p>
        </div>
      )}

      {briefing && !loading && (
        <div className="p-5">
          {stats && (
            <div className="flex items-center gap-4 mb-4 pb-4 border-b border-[#1E3A5F]">
              {stats.critical > 0 && <span className="text-[10px] text-red-400 font-bold">{stats.critical} CRITICAL</span>}
              {stats.urgent > 0   && <span className="text-[10px] text-amber-400 font-bold">{stats.urgent} URGENT</span>}
              {stats.watch > 0    && <span className="text-[10px] text-blue-400 font-bold">{stats.watch} WATCH</span>}
              {stats.on_track > 0 && <span className="text-[10px] text-emerald-400 font-bold">{stats.on_track} ON TRACK</span>}
              {stats.total_kes > 0 && (
                <span className="text-[10px] text-[#64748B] ml-auto">
                  KES {stats.total_kes.toLocaleString()} total at risk
                </span>
              )}
            </div>
          )}
          <pre className="whitespace-pre-wrap text-[12px] text-[#94A3B8] leading-relaxed font-mono">
            {briefing}
          </pre>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────

export default function CommandCenterPage() {
  const [shipments, setShipments]   = useState<EnrichedShipment[]>([])
  const [loading, setLoading]       = useState(true)

  useEffect(() => {
    fetch('/api/shipments')
      .then((r) => r.json())
      .then((raw: Shipment[]) => {
        const enriched: EnrichedShipment[] = raw
          .filter((s) => s.remediation_status !== 'CLOSED')
          .map((s) => {
            const daysRemaining = s.pvoc_deadline ? daysUntilDeadline(s.pvoc_deadline) : null
            const urgency       = getUrgency(daysRemaining)
            const cifUsd        = Number(s.cif_value_usd ?? 0)
            const storageRate   = Number((s as any).storage_rate_per_day ?? 50)
            const daysAtRisk    = daysRemaining != null ? Math.max(0, 14 - Math.max(0, daysRemaining)) : 7
            const storageKES    = storageRate * daysAtRisk * 130
            const penaltyKES    = urgency === 'CRITICAL' || urgency === 'URGENT'
              ? cifUsd * 0.02 * 130
              : 0
            return { ...s, daysRemaining, urgency, totalKESAtRisk: Math.round(storageKES + penaltyKES) }
          })
          .sort((a, b) => {
            const order: Record<Urgency, number> = { CRITICAL: 0, URGENT: 1, WATCH: 2, ON_TRACK: 3 }
            return order[a.urgency] - order[b.urgency]
          })
        setShipments(enriched)
      })
      .finally(() => setLoading(false))
  }, [])

  const today = new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[#64748B]">
        <Loader2 size={18} className="animate-spin mr-2" /> Loading command center...
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Command Center</h1>
          <p className="text-[#64748B] text-sm mt-1">{today} · {shipments.length} active shipments</p>
        </div>
        {shipments.some((s) => s.urgency === 'CRITICAL') && (
          <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
            <AlertTriangle size={13} className="text-red-400" />
            <span className="text-xs text-red-400 font-bold">
              {shipments.filter((s) => s.urgency === 'CRITICAL').length} critical shipment{shipments.filter((s) => s.urgency === 'CRITICAL').length !== 1 ? 's' : ''} — act today
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <StatsStrip shipments={shipments} />

      {/* Heat Map */}
      {shipments.length > 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <HeatMap shipments={shipments} />
        </div>
      )}

      {/* Two-column layout: Priority Queue + Morning Brief */}
      <div className="grid lg:grid-cols-2 gap-6">
        <PriorityQueue shipments={shipments} />
        <MorningBriefing shipments={shipments} />
      </div>

      {/* Full shipment table — all active */}
      {shipments.length > 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1E3A5F]">
            <p className="text-xs font-bold text-white uppercase tracking-widest">All Active Shipments</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E3A5F]">
                  {['Status', 'Shipment', 'Regulator', 'Deadline', 'CIF Value', 'KES at Risk'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-[9px] font-bold text-[#64748B] uppercase tracking-widest">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A5F]">
                {shipments.map((s) => {
                  const cfg = URGENCY_CONFIG[s.urgency]
                  return (
                    <tr key={s.id} className={`${s.urgency === 'CRITICAL' ? 'bg-red-500/5' : 'hover:bg-[#0A1628]/50'} transition-colors`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
                          <span className={`text-[10px] font-black ${cfg.color}`}>{cfg.label}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-white truncate max-w-[220px]">{s.name}</p>
                        <p className="text-[10px] text-[#64748B] mt-0.5">{s.origin_port}</p>
                      </td>
                      <td className="px-4 py-3">
                        <RegulatorBadge body={s.regulatory_body?.code ?? '—'} />
                      </td>
                      <td className="px-4 py-3">
                        {s.daysRemaining != null ? (
                          <span className={`text-sm font-semibold ${
                            s.urgency === 'CRITICAL' ? 'text-red-400' :
                            s.urgency === 'URGENT'   ? 'text-amber-400' : 'text-white'
                          }`}>
                            {s.daysRemaining}d
                          </span>
                        ) : (
                          <span className="text-[#64748B] text-sm">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{formatUSD(s.cif_value_usd)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-semibold ${s.totalKESAtRisk > 100000 ? 'text-red-400' : s.totalKESAtRisk > 0 ? 'text-amber-400' : 'text-[#64748B]'}`}>
                          {s.totalKESAtRisk > 0 ? `KES ${s.totalKESAtRisk.toLocaleString()}` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {shipments.length === 0 && (
        <div className="text-center py-16 text-[#64748B]">
          <Shield size={32} className="mx-auto mb-3 text-[#334155]" />
          <p className="text-sm">No active shipments. Add shipments to activate the command center.</p>
        </div>
      )}
    </div>
  )
}
