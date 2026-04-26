'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { formatUSD, formatDate } from '@/lib/utils'
import { RiskBadge } from './RiskBadge'
import {
  X, Sparkles, Loader2, FileText, Wrench, List, Calculator,
  Clock, CheckCircle2, XCircle, AlertTriangle, Zap, Bell,
  MessageSquare, User, DollarSign, Upload, Trash2, ExternalLink,
  ClipboardList, Printer, Copy, Share2,
} from 'lucide-react'
import { getRegulator } from '@/lib/regulatory-intelligence'

// ─── Tabs ────────────────────────────────────────────────────

type Tab = 'brief' | 'remediation' | 'checklist' | 'tax' | 'costs' | 'files' | 'timeline'

const AI_TABS: { key: Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>; label: string; icon: React.ElementType; endpoint: string }[] = [
  { key: 'brief',       label: 'Brief',      icon: FileText,    endpoint: '/api/ai/brief' },
  { key: 'remediation', label: 'Steps',      icon: Wrench,      endpoint: '/api/ai/remediation' },
  { key: 'checklist',   label: 'Checklist',  icon: List,        endpoint: '/api/ai/checklist' },
]

// ─── Timeline event config ────────────────────────────────────

const EVENT_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string }> = {
  ACTION_CREATED:    { icon: Zap,            color: 'text-blue-400',    bg: 'bg-blue-400/10' },
  ACTION_STARTED:    { icon: Clock,          color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  ACTION_COMPLETED:  { icon: CheckCircle2,   color: 'text-[#00C896]',   bg: 'bg-[#00C896]/10' },
  ACTION_FAILED:     { icon: XCircle,        color: 'text-red-400',     bg: 'bg-red-400/10' },
  ACTION_AT_RISK:    { icon: AlertTriangle,  color: 'text-red-400',     bg: 'bg-red-400/10' },
  ACTION_NOTE:       { icon: MessageSquare,  color: 'text-slate-400',   bg: 'bg-slate-400/10' },
  ACTION_ASSIGNED:   { icon: User,           color: 'text-blue-300',    bg: 'bg-blue-300/10' },
  RISK_RECALCULATED: { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  RISK_UPDATED:      { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-400/10' },
  ALERT_SENT:        { icon: Bell,           color: 'text-purple-400',  bg: 'bg-purple-400/10' },
  SHIPMENT_CLOSED:   { icon: CheckCircle2,   color: 'text-[#00C896]',   bg: 'bg-[#00C896]/10' },
  STATUS_CHANGED:    { icon: Zap,            color: 'text-[#64748B]',   bg: 'bg-[#1E3A5F]' },
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

function printBrief(text: string, shipmentName: string) {
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) return
  w.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>KRUX Brief — ${shipmentName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #fff; color: #111; padding: 48px 56px; max-width: 820px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; letter-spacing: 0.15em; }
  .logo span { color: #00C896; }
  .meta { text-align: right; font-size: 11px; color: #555; line-height: 1.6; }
  pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12.5px; line-height: 1.75; color: #111; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
  @media print { body { padding: 24px 32px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">K<span>R</span>UX</div>
  <div class="meta">
    Kenya Import Compliance Intelligence<br>
    Generated: ${new Date().toLocaleString('en-KE', { dateStyle: 'full', timeStyle: 'short' })}<br>
    krux-xi.vercel.app
  </div>
</div>
<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<div class="footer">
  <span>KRUX — AI-Generated Compliance Brief</span>
  <span>Verify all figures with KRA iTax and relevant regulatory portals before acting</span>
</div>
</body>
</html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 400)
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

// ─── Duty Calculator Panel ───────────────────────────────────

function DutyPanel({ shipment }: { shipment: any }) {
  const [calc, setCalc]       = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [aiText, setAiText]   = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetch('/api/duty-calc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cif_value_usd:    shipment.cif_value_usd,
        import_duty_pct:  shipment.import_duty_pct ?? 25,
        hs_code:          shipment.hs_code,
        regulatory_body:  shipment.regulatory_body?.code,
      }),
    })
      .then((r) => r.json())
      .then(setCalc)
      .finally(() => setLoading(false))
  }, [shipment.id])

  async function generateAI() {
    setAiLoading(true)
    const res = await fetch('/api/ai/tax', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:            shipment.name,
        regulatory_body: shipment.regulatory_body?.code ?? '—',
        cif_value_usd:   shipment.cif_value_usd,
        pvoc_deadline:   shipment.pvoc_deadline,
        hs_code:         shipment.hs_code,
      }),
    })
    const data = await res.json()
    setAiText(data.result ?? data.error ?? 'No response')
    setAiLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center h-48 gap-2 text-[#64748B]"><Loader2 size={16} className="animate-spin" /><span className="text-sm">Calculating...</span></div>

  return (
    <div className="space-y-4">
      {calc?.lines && (
        <div>
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1E3A5F] bg-[#0F2040]">
                  <th className="text-left px-3 py-2.5 text-[#64748B] font-semibold">Item</th>
                  <th className="text-left px-3 py-2.5 text-[#64748B] font-semibold">Rate</th>
                  <th className="text-right px-3 py-2.5 text-[#64748B] font-semibold">USD</th>
                  <th className="text-right px-3 py-2.5 text-[#64748B] font-semibold">KES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A5F]">
                {calc.lines.map((line: any) => (
                  <tr key={line.label} className={line.isTotal ? 'bg-[#0F2040]' : ''}>
                    <td className={`px-3 py-2 ${line.isTotal ? 'text-white font-bold' : 'text-[#94A3B8]'}`}>{line.label}</td>
                    <td className="px-3 py-2 text-[#64748B]">{line.rate ?? '—'}</td>
                    <td className={`px-3 py-2 text-right font-mono ${line.isTotal ? 'text-[#00C896] font-bold' : 'text-white'}`}>
                      ${line.usd.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                    <td className={`px-3 py-2 text-right font-mono ${line.isTotal ? 'text-[#00C896] font-bold' : 'text-[#64748B]'}`}>
                      {line.kes.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#334155] mt-1.5">1 USD = KES {calc.fx_rate} · Estimates only, verify with KRA iTax portal</p>
        </div>
      )}

      <div>
        {!aiText ? (
          <button
            onClick={generateAI}
            disabled={aiLoading}
            className="flex items-center gap-2 text-xs text-[#64748B] hover:text-[#00C896] transition-colors disabled:opacity-40"
          >
            {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
            {aiLoading ? 'Generating AI narrative...' : 'Get AI narrative'}
          </button>
        ) : (
          <div>
            <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide mb-2">AI Analysis</p>
            <pre className="whitespace-pre-wrap text-xs text-[#94A3B8] bg-[#0A1628] border border-[#1E3A5F] rounded-lg p-3 leading-relaxed font-sans">
              {aiText}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Costs Panel ─────────────────────────────────────────────

const COST_TYPES = ['AGENT_FEE', 'INSPECTION', 'DEMURRAGE', 'STORAGE', 'CUSTOMS_DUTY', 'OTHER'] as const
type CostType = typeof COST_TYPES[number]

const COST_LABELS: Record<CostType, string> = {
  AGENT_FEE:    'Agent Fee',
  INSPECTION:   'Inspection',
  DEMURRAGE:    'Demurrage',
  STORAGE:      'Storage',
  CUSTOMS_DUTY: 'Customs Duty',
  OTHER:        'Other',
}

function CostsPanel({ shipmentId }: { shipmentId: string }) {
  const [costs, setCosts]       = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [type, setType]         = useState<CostType>('AGENT_FEE')
  const [amount, setAmount]     = useState('')
  const [note, setNote]         = useState('')
  const [saving, setSaving]     = useState(false)

  function load() {
    fetch(`/api/shipments/${shipmentId}/costs`)
      .then((r) => r.json())
      .then((d) => setCosts(d.costs ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [shipmentId])

  async function addCost() {
    if (!amount || isNaN(Number(amount))) return
    setSaving(true)
    await fetch(`/api/shipments/${shipmentId}/costs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_type: type, amount_kes: Number(amount), note: note || null }),
    })
    setAmount('')
    setNote('')
    setSaving(false)
    load()
  }

  async function deleteCost(id: string, storagePath: string) {
    await fetch(`/api/shipments/${shipmentId}/costs`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cost_id: id, storage_path: storagePath }),
    })
    load()
  }

  const total = costs.reduce((s, c) => s + Number(c.amount_kes), 0)

  if (loading) return <div className="flex items-center justify-center h-32 text-[#64748B]"><Loader2 size={16} className="animate-spin" /></div>

  return (
    <div className="space-y-4">
      {/* Total */}
      {costs.length > 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wide">Total Actual Costs</span>
          <span className="text-lg font-bold text-[#00C896]">KES {total.toLocaleString()}</span>
        </div>
      )}

      {/* Cost list */}
      {costs.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 py-2 border-b border-[#1E3A5F]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-[#64748B] uppercase">{COST_LABELS[c.cost_type as CostType] ?? c.cost_type}</span>
              <span className="text-sm font-semibold text-white">KES {Number(c.amount_kes).toLocaleString()}</span>
            </div>
            {c.note && <p className="text-xs text-[#64748B] mt-0.5">{c.note}</p>}
          </div>
          <button onClick={() => deleteCost(c.id, '')} className="text-[#334155] hover:text-red-400 transition-colors shrink-0">
            <Trash2 size={12} />
          </button>
        </div>
      ))}

      {/* Add form */}
      <div className="border border-[#1E3A5F] rounded-xl p-3 space-y-2 bg-[#0F2040]">
        <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">Add Cost</p>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as CostType)}
          className="w-full text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-[#00C896]"
        >
          {COST_TYPES.map((t) => <option key={t} value={t}>{COST_LABELS[t]}</option>)}
        </select>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount (KES)"
            className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional)"
            className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]"
          />
        </div>
        <button
          onClick={addCost}
          disabled={saving || !amount}
          className="w-full py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-40 flex items-center justify-center gap-1.5"
        >
          {saving ? <Loader2 size={11} className="animate-spin" /> : <DollarSign size={11} />}
          Add Cost
        </button>
      </div>
    </div>
  )
}

// ─── Files Panel ──────────────────────────────────────────────

const DOC_TYPES = ['PVoC Certificate', 'KEBS Inspection Report', 'KRA Entry', 'Commercial Invoice', 'Bill of Lading', 'Packing List', 'Phytosanitary Certificate', 'PPB Registration', 'Other'] as const

const DOC_STATUS_CYCLE = ['NOT_STARTED', 'REQUESTED', 'RECEIVED', 'UPLOADED'] as const
type DocStatus = typeof DOC_STATUS_CYCLE[number]

const DOC_STATUS_CONFIG: Record<DocStatus, { icon: string; label: string; color: string }> = {
  NOT_STARTED: { icon: '✗', label: 'Not started',           color: 'text-[#64748B]' },
  REQUESTED:   { icon: '⟳', label: 'Requested from supplier', color: 'text-amber-400' },
  RECEIVED:    { icon: '↓', label: 'Received, not uploaded', color: 'text-blue-400'  },
  UPLOADED:    { icon: '✓', label: 'Uploaded',               color: 'text-[#00C896]' },
}

function FilesPanel({ shipmentId, regulatorCode }: { shipmentId: string; regulatorCode?: string }) {
  const [docs, setDocs]               = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [uploading, setUploading]     = useState(false)
  const [docType, setDocType]         = useState<string>(DOC_TYPES[0])
  const [error, setError]             = useState<string | null>(null)
  const [docStatuses, setDocStatuses] = useState<Record<string, DocStatus>>({})

  const storageKey = `doc_checklist_${shipmentId}`

  function load() {
    fetch(`/api/shipments/${shipmentId}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) setDocStatuses(JSON.parse(saved))
    } catch { /* ignore */ }
    load()
  }, [shipmentId])

  function cycleStatus(docName: string) {
    const current = docStatuses[docName] ?? 'NOT_STARTED'
    const idx  = DOC_STATUS_CYCLE.indexOf(current)
    const next = DOC_STATUS_CYCLE[(idx + 1) % DOC_STATUS_CYCLE.length]
    const updated = { ...docStatuses, [docName]: next }
    setDocStatuses(updated)
    try { localStorage.setItem(storageKey, JSON.stringify(updated)) } catch { /* ignore */ }
  }

  const regDocs = regulatorCode ? (getRegulator('KE', regulatorCode)?.documents ?? []) : []

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    form.append('document_type', docType)
    const res = await fetch(`/api/shipments/${shipmentId}/documents/upload`, { method: 'POST', body: form })
    const data = await res.json()
    if (!res.ok) setError(data.error ?? 'Upload failed')
    else load()
    setUploading(false)
    e.target.value = ''
  }

  async function deleteDoc(id: string, storagePath: string) {
    await fetch(`/api/shipments/${shipmentId}/documents`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc_id: id, storage_path: storagePath }),
    })
    load()
  }

  function formatSize(bytes?: number) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes}B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
    return `${(bytes / 1024 / 1024).toFixed(1)}MB`
  }

  if (loading) return <div className="flex items-center justify-center h-32 text-[#64748B]"><Loader2 size={16} className="animate-spin" /></div>

  return (
    <div className="space-y-5">
      {/* Document Status Checklist */}
      {regDocs.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <ClipboardList size={11} className="text-[#64748B]" />
              <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">
                {regulatorCode} Required Documents
              </p>
            </div>
            <p className="text-[10px] text-[#334155]">Tap to cycle status</p>
          </div>
          <div className="space-y-1">
            {regDocs.map((doc) => {
              const status = docStatuses[doc.name] ?? 'NOT_STARTED'
              const cfg    = DOC_STATUS_CONFIG[status]
              return (
                <button
                  key={doc.name}
                  onClick={() => cycleStatus(doc.name)}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#0F2040] border border-[#1E3A5F] hover:border-[#2E4A6F] transition-all text-left"
                >
                  <span className={`text-sm font-bold shrink-0 w-4 text-center ${cfg.color}`}>{cfg.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{doc.name}</p>
                    {!doc.mandatory && <p className="text-[10px] text-[#64748B]">Conditional</p>}
                  </div>
                  <span className={`text-[10px] font-medium shrink-0 ${cfg.color}`}>{cfg.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] text-[#334155] mt-2 flex items-center gap-1">
            <Sparkles size={9} />
            AI Brief uses these statuses for accurate ✓ / ✗ — regenerate after updating
          </p>
        </div>
      )}

      {/* Upload */}
      <div className="border border-[#1E3A5F] rounded-xl p-3 space-y-2 bg-[#0F2040]">
        <p className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">Upload Document</p>
        <select
          value={docType}
          onChange={(e) => setDocType(e.target.value as typeof DOC_TYPES[number])}
          className="w-full text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white focus:outline-none focus:border-[#00C896]"
        >
          {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <label className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed rounded-lg text-xs cursor-pointer transition-all ${uploading ? 'border-[#1E3A5F] text-[#334155]' : 'border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/5'}`}>
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
          {uploading ? 'Uploading...' : 'Choose file (PDF, JPG, PNG, DOCX · max 10MB)'}
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" />
        </label>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {/* File list */}
      {docs.length === 0 ? (
        <p className="text-xs text-[#64748B] text-center py-4">No documents uploaded yet.</p>
      ) : (
        <div className="space-y-2">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 py-2 border-b border-[#1E3A5F]">
              <FileText size={14} className="text-[#64748B] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{doc.file_name}</p>
                <p className="text-[10px] text-[#64748B]">{doc.document_type} · {formatSize(doc.file_size)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {doc.signed_url && (
                  <a href={doc.signed_url} target="_blank" rel="noopener noreferrer" className="text-[#64748B] hover:text-[#00C896] transition-colors">
                    <ExternalLink size={12} />
                  </a>
                )}
                <button onClick={() => deleteDoc(doc.id, doc.storage_path)} className="text-[#334155] hover:text-red-400 transition-colors">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Drawer ──────────────────────────────────────────────

export default function ShipmentDrawer({
  shipment,
  onClose,
  isDemo     = false,
  gatePassed = false,
  onDemoGate,
}: {
  shipment:    Shipment
  onClose:     () => void
  isDemo?:     boolean
  gatePassed?: boolean
  onDemoGate?: () => void
}) {
  const [tab, setTab]         = useState<Tab>('brief')
  const [results, setResults] = useState<Partial<Record<Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>, string>>>({})
  const [loading, setLoading] = useState<Tab | null>(null)
  const [closing, setClosing] = useState(false)
  const [closed, setClosed]   = useState(shipment.remediation_status === 'CLOSED')
  const [confirmClose, setConfirmClose] = useState(false)
  const [pendingGateTab, setPendingGateTab] = useState<Tab | null>(null)
  const [docChecklist, setDocChecklist] = useState<Record<string, string> | null>(null)
  const [copied, setCopied]     = useState(false)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [sharing, setSharing]   = useState(false)

  // Load document checklist from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`doc_checklist_${shipment.id}`)
      if (saved) setDocChecklist(JSON.parse(saved))
    } catch { /* ignore */ }
  }, [shipment.id])

  // Listen for checklist updates from FilesPanel (via storage events)
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === `doc_checklist_${shipment.id}` && e.newValue) {
        try { setDocChecklist(JSON.parse(e.newValue)) } catch { /* ignore */ }
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [shipment.id])

  function buildPayload() {
    // Re-read from localStorage at call time to get the freshest statuses
    let checklist: Record<string, string> | null = docChecklist
    try {
      const saved = localStorage.getItem(`doc_checklist_${shipment.id}`)
      if (saved) checklist = JSON.parse(saved)
    } catch { /* ignore */ }

    return {
      name:                shipment.name,
      regulatory_body:     shipment.regulatory_body?.code ?? '—',
      cif_value_usd:       shipment.cif_value_usd,
      pvoc_deadline:       shipment.pvoc_deadline,
      risk_flag_status:    shipment.risk_flag_status,
      origin_port:         shipment.origin_port,
      hs_code:             shipment.hs_code,
      document_checklist:  checklist,
    }
  }

  async function generate(t: Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>) {
    if (results[t] || loading) return
    setLoading(t)
    try {
      const endpoint = AI_TABS.find((x) => x.key === t)!.endpoint
      const res  = await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(buildPayload()),
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
    const isGated = isDemo && !gatePassed && (t === 'checklist' || t === 'remediation')
    if (isGated) {
      setTab(t)
      setPendingGateTab(t)
      onDemoGate?.()
      return
    }
    setTab(t)
    if (t !== 'timeline' && t !== 'costs' && t !== 'files' && t !== 'tax') generate(t)
  }

  useEffect(() => {
    if (gatePassed && pendingGateTab && pendingGateTab !== 'timeline' && pendingGateTab !== 'costs' && pendingGateTab !== 'files' && pendingGateTab !== 'tax') {
      generate(pendingGateTab as Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>)
      setPendingGateTab(null)
    }
  }, [gatePassed])

  async function markCleared() {
    setClosing(true)
    try {
      await fetch(`/api/shipments/${shipment.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CLEARED' }),
      })
      setClosed(true)
      setConfirmClose(false)
    } finally {
      setClosing(false)
    }
  }

  // Auto-load brief on open
  useEffect(() => {
    generate('brief')
    if (isDemo) {
      import('@/lib/demo-analytics').then(({ trackDemo }) => trackDemo('brief_viewed', { shipment: shipment.name }))
    }
  }, [])

  const currentAITab = AI_TABS.find((t) => t.key === tab)
  const isAITab      = tab !== 'timeline' && tab !== 'costs' && tab !== 'files' && tab !== 'tax'
  const result       = isAITab ? results[tab as Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>] : null
  const isLoading    = loading === tab

  // Impossible clearance window detection
  const regProfile    = shipment.regulatory_body?.code ? getRegulator('KE', shipment.regulatory_body.code) : null
  const slaActual     = regProfile?.sla_actual_days ?? 0
  const deadlineDays  = shipment.pvoc_deadline
    ? Math.ceil((new Date(shipment.pvoc_deadline).getTime() - Date.now()) / 86400000)
    : null
  const windowClosed  = slaActual > 0 && deadlineDays != null && deadlineDays > 0 && deadlineDays < slaActual
  const daysShort     = windowClosed ? slaActual - deadlineDays! : 0

  const allTabs = [
    ...AI_TABS,
    { key: 'tax'      as const, label: 'Duty',     icon: Calculator },
    { key: 'costs'    as const, label: 'Costs',    icon: DollarSign },
    { key: 'files'    as const, label: 'Files',    icon: Upload },
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
            <div className="flex items-center gap-2">
              {!closed && !confirmClose && (
                <button
                  onClick={() => setConfirmClose(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 border border-[#00C896]/25 text-[#00C896] rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 transition-colors"
                >
                  <CheckCircle2 size={12} /> Mark Cleared
                </button>
              )}
              {confirmClose && !closed && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94A3B8]">Confirm?</span>
                  <button
                    onClick={markCleared}
                    disabled={closing}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#00C896] text-[#0A1628] rounded text-xs font-bold disabled:opacity-60"
                  >
                    {closing ? <Loader2 size={10} className="animate-spin" /> : 'Yes'}
                  </button>
                  <button onClick={() => setConfirmClose(false)} className="px-2.5 py-1 border border-[#1E3A5F] text-[#64748B] rounded text-xs hover:text-white">
                    No
                  </button>
                </div>
              )}
              {closed && (
                <span className="flex items-center gap-1.5 text-xs text-[#00C896] font-semibold">
                  <CheckCircle2 size={12} /> Cleared
                </span>
              )}
              <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Clearance Impossible Banner */}
        {windowClosed && (
          <div className="mx-4 mt-3 mb-1 rounded-xl border border-red-500/50 bg-red-500/10 p-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-sm font-black text-red-400 uppercase tracking-wide">Clearance Window Closed</span>
            </div>
            <p className="text-xs text-red-300/90 leading-relaxed">
              <span className="font-bold">{shipment.regulatory_body?.code ?? 'Regulator'}</span> requires{' '}
              <span className="font-bold">{slaActual} days</span> to process.
              Only <span className="font-bold">{deadlineDays} days</span> remain.{' '}
              You needed to start <span className="font-bold">{daysShort} days ago.</span>
            </p>
            <p className="text-[10px] text-red-400/70 mt-1.5">
              File immediately to create a record and reduce penalty exposure. The brief below shows you how.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-[#1E3A5F] overflow-x-auto mt-2">
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
          ) : tab === 'costs' ? (
            <CostsPanel shipmentId={shipment.id} />
          ) : tab === 'files' ? (
            <FilesPanel shipmentId={shipment.id} regulatorCode={shipment.regulatory_body?.code} />
          ) : tab === 'tax' ? (
            <DutyPanel shipment={shipment} />
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
              <div className="mt-3 flex items-center gap-4">
                <button
                  onClick={() => {
                    const aiTab = tab as Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>
                    setResults((p) => ({ ...p, [aiTab]: undefined }))
                    generate(aiTab)
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
                >
                  <Sparkles size={11} /> Regenerate
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result).then(() => {
                      setCopied(true)
                      setTimeout(() => setCopied(false), 2000)
                    })
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
                >
                  <Copy size={11} /> {copied ? 'Copied!' : 'Copy brief'}
                </button>
                <button
                  onClick={() => printBrief(result, shipment.name)}
                  className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
                >
                  <Printer size={11} /> Print brief
                </button>
                <button
                  onClick={async () => {
                    if (shareUrl) {
                      navigator.clipboard.writeText(shareUrl)
                      return
                    }
                    setSharing(true)
                    try {
                      const res = await fetch('/api/brief/share', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          brief_text: result,
                          shipment_name: shipment.name,
                          regulator: shipment.regulatory_body ?? '',
                        }),
                      })
                      const data = await res.json()
                      if (data.url) {
                        setShareUrl(data.url)
                        navigator.clipboard.writeText(data.url)
                      }
                    } finally {
                      setSharing(false)
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
                >
                  <Share2 size={11} />
                  {sharing ? 'Creating link…' : shareUrl ? 'Link copied!' : 'Share brief'}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <Sparkles size={24} className="text-[#334155]" />
              <p className="text-[#64748B] text-sm text-center">
                Click to generate {currentAITab?.label.toLowerCase()} for this shipment
              </p>
              <button
                onClick={() => generate(tab as Exclude<Tab, 'timeline' | 'costs' | 'files' | 'tax'>)}
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
