'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { formatUSD, formatDate } from '@/lib/utils'
import { RiskBadge } from './RiskBadge'
import {
  X, Sparkles, Loader2, FileText, Wrench, List, Calculator,
  Clock, CheckCircle2, XCircle, AlertTriangle, Zap, Bell,
} from 'lucide-react'

// ─── Tabs ────────────────────────────────────────────────────

type Tab = 'brief' | 'remediation' | 'checklist' | 'tax' | 'timeline'

const AI_TABS: { key: Exclude<Tab, 'timeline'>; label: string; icon: React.ElementType; endpoint: string }[] = [
  { key: 'brief',       label: 'Brief',      icon: FileText,    endpoint: '/api/ai/brief' },
  { key: 'remediation', label: 'Steps',      icon: Wrench,      endpoint: '/api/ai/remediation' },
  { key: 'checklist',   label: 'Documents',  icon: List,        endpoint: '/api/ai/checklist' },
  { key: 'tax',         label: 'Tax Quote',  icon: Calculator,  endpoint: '/api/ai/tax' },
]

// ─── Timeline event config ────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTION_CREATED:   { icon: Zap,           color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  ACTION_STARTED:   { icon: Clock,         color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  ACTION_COMPLETED: { icon: CheckCircle2,  color: 'text-[#00C896]',   bg: 'bg-[#00C896]/10' },
  ACTION_FAILED:    { icon: XCircle,       color: 'text-red-400',     bg: 'bg-red-400/10' },
  RISK_UPDATED:     { icon: AlertTriangle, color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  ALERT_SENT:       { icon: Bell,          color: 'text-purple-400',  bg: 'bg-purple-400/10' },
  STATUS_CHANGED:   { icon: Zap,           color: 'text-[#64748B]',   bg: 'bg-[#1E3A5F]' },
}

function defaultConfig() {
  return { icon: Zap, color: 'text-[#64748B]', bg: 'bg-[#1E3A5F]' }
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)   return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── Timeline panel ───────────────────────────────────────────

function TimelinePanel({ shipmentId }: { shipmentId: string }) {
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/shipments/${shipmentId}/timeline`)
      .then((r) => r.json())
      .then((data) => setEvents(Array.isArray(data) ? data : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [shipmentId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 gap-2 text-[#64748B]">
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm">Loading timeline...</span>
      </div>
    )
  }

  if (!events.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Clock size={24} className="text-[#334155]" />
        <p className="text-[#64748B] text-sm text-center">No events yet.</p>
        <p className="text-[#334155] text-xs text-center">
          Events appear here as actions are started, completed, or failed.
        </p>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-[19px] top-0 bottom-0 w-px bg-[#1E3A5F]" />

      <div className="space-y-0">
        {events.map((ev, i) => {
          const cfg = EVENT_CONFIG[ev.event_type] ?? defaultConfig()
          const Icon = cfg.icon
          return (
            <div key={ev.id ?? i} className="relative flex gap-3 pb-5">
              {/* Icon dot */}
              <div className={`shrink-0 w-10 h-10 rounded-full ${cfg.bg} border border-[#1E3A5F] flex items-center justify-center z-10`}>
                <Icon size={14} className={cfg.color} />
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-white leading-snug">{ev.title}</p>
                  <span className="text-[10px] text-[#334155] whitespace-nowrap shrink-0">
                    {timeAgo(ev.created_at)}
                  </span>
                </div>

                {ev.detail && (
                  <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{ev.detail}</p>
                )}

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] text-[#334155] uppercase tracking-wide">
                    {ev.actor_label ?? ev.actor_type}
                  </span>
                  {ev.metadata?.duration_minutes != null && (
                    <span className="text-[9px] text-[#334155]">
                      · {ev.metadata.duration_minutes}m
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────

export default function ShipmentDrawer({
  shipment,
  onClose,
}: {
  shipment: Shipment
  onClose:  () => void
}) {
  const [tab, setTab]         = useState<Tab>('brief')
  const [results, setResults] = useState<Partial<Record<Exclude<Tab, 'timeline'>, string>>>({})
  const [loading, setLoading] = useState<Tab | null>(null)

  const payload = {
    name:             shipment.name,
    regulatory_body:  shipment.regulatory_body?.code ?? '—',
    cif_value_usd:    shipment.cif_value_usd,
    pvoc_deadline:    shipment.pvoc_deadline,
    risk_flag_status: shipment.risk_flag_status,
    origin_port:      shipment.origin_port,
    hs_code:          shipment.hs_code,
  }

  async function generate(t: Exclude<Tab, 'timeline'>) {
    if (results[t] || loading) return
    setLoading(t)
    try {
      const endpoint = AI_TABS.find((x) => x.key === t)!.endpoint
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      })
      const data = await res.json()
      setResults((p) => ({ ...p, [t]: data.result ?? data.error ?? 'No response' }))
    } catch {
      setResults((p) => ({ ...p, [t]: 'Failed to generate — check ANTHROPIC_API_KEY' }))
    } finally {
      setLoading(null)
    }
  }

  function switchTab(t: Tab) {
    setTab(t)
    if (t !== 'timeline') generate(t)
  }

  // Auto-load brief on open
  useState(() => { generate('brief') })

  const currentAITab = AI_TABS.find((t) => t.key === tab)
  const result       = tab !== 'timeline' ? results[tab as Exclude<Tab, 'timeline'>] : null
  const isLoading    = loading === tab

  const allTabs = [
    ...AI_TABS,
    { key: 'timeline' as const, label: 'Timeline', icon: Clock },
  ]

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" onClick={onClose} />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-[480px] z-50 bg-[#0A1628] border-l border-[#1E3A5F] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="px-6 py-4 border-b border-[#1E3A5F]">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <RiskBadge risk={shipment.risk_flag_status} />
                <span className="text-[#64748B] text-xs">{shipment.regulatory_body?.code ?? '—'}</span>
              </div>
              <h2 className="text-lg font-bold text-white truncate">{shipment.name}</h2>
              <p className="text-[#64748B] text-xs mt-0.5">
                {shipment.reference_number} · {formatUSD(shipment.cif_value_usd)} CIF
                {shipment.pvoc_deadline && ` · Deadline ${formatDate(shipment.pvoc_deadline)}`}
              </p>
            </div>
            <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors mt-1">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#1E3A5F] overflow-x-auto">
          {allTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => switchTab(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-semibold whitespace-nowrap transition-all ${
                tab === key
                  ? 'text-[#00C896] border-b-2 border-[#00C896]'
                  : 'text-[#64748B] hover:text-white'
              }`}
            >
              <Icon size={12} />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'timeline' ? (
            <TimelinePanel shipmentId={shipment.id} />
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="relative">
                <Sparkles size={24} className="text-[#00C896]" />
                <Loader2 size={40} className="text-[#00C896]/20 animate-spin absolute -top-2 -left-2" />
              </div>
              <p className="text-[#64748B] text-sm">Generating {currentAITab?.label.toLowerCase()}...</p>
            </div>
          ) : result ? (
            <div className="prose prose-invert max-w-none">
              <pre className="whitespace-pre-wrap text-[13px] text-[#94A3B8] leading-relaxed font-sans bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
                {result}
              </pre>
              <button
                onClick={() => {
                  const aiTab = tab as Exclude<Tab, 'timeline'>
                  setResults((p) => ({ ...p, [aiTab]: undefined }))
                  generate(aiTab)
                }}
                className="mt-3 flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
              >
                <Sparkles size={11} /> Regenerate
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Sparkles size={24} className="text-[#334155]" />
              <p className="text-[#64748B] text-sm text-center">
                Click to generate {currentAITab?.label.toLowerCase()} for this shipment
              </p>
              <button
                onClick={() => generate(tab as Exclude<Tab, 'timeline'>)}
                className="flex items-center gap-2 px-4 py-2 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-sm font-semibold hover:bg-[#00C896]/20 transition-all"
              >
                <Sparkles size={13} /> Generate
              </button>
            </div>
          )}
        </div>

        {/* Risk summary footer */}
        {shipment.risk && (
          <div className="border-t border-[#1E3A5F] px-6 py-3 flex items-center gap-4">
            <div className="text-center">
              <p className="text-[10px] text-[#64748B]">Risk Score</p>
              <p className="text-sm font-bold text-white">{shipment.risk.risk_score}/10</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-[#64748B]">Delay Prob</p>
              <p className="text-sm font-bold text-amber-400">{Math.round((shipment.risk.delay_probability ?? 0) * 100)}%</p>
            </div>
            <div className="flex-1">
              <p className="text-[10px] text-[#64748B] mb-1">Drivers</p>
              <div className="flex flex-wrap gap-1">
                {(shipment.risk.risk_drivers ?? []).slice(0, 2).map((d, i) => (
                  <span key={i} className="text-[9px] bg-[#1E3A5F] text-[#94A3B8] px-1.5 py-0.5 rounded">{d}</span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
