'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Users, AlertTriangle, Clock, ChevronDown, ChevronUp,
  Link2, Plus, Upload, X, Loader2, CheckCircle2, FileText, ArrowUpRight,
} from 'lucide-react'
import { Shipment } from '@/lib/types'
import AddShipmentModal from '@/components/AddShipmentModal'
import { getRegulator, getWindowStatus } from '@/lib/regulatory-intelligence'

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })
}

type ClientGroup = {
  name: string
  shipments: Shipment[]
  criticalCount: number
  impossibleCount: number
  nextDeadline: string | null
  totalKES: number
}

// ── CSV Import Modal ──────────────────────────────────────────
const CSV_HEADERS = ['name', 'client_name', 'origin_port', 'cif_value_usd', 'pvoc_deadline', 'regulatory_body', 'product_description']

function CsvImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
  const [rows, setRows]       = useState<Record<string, string>[]>([])
  const [error, setError]     = useState<string | null>(null)
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [created, setCreated] = useState(0)
  const fileRef               = useRef<HTMLInputElement>(null)

  function parseCSV(text: string) {
    const lines  = text.trim().split('\n')
    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
    return lines.slice(1).filter(l => l.trim()).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''))
      return Object.fromEntries(header.map((h, i) => [h, vals[i] ?? '']))
    })
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const parsed = parseCSV(ev.target?.result as string)
        if (!parsed.length) { setError('CSV is empty'); return }
        if (!parsed[0].name || !parsed[0].cif_value_usd) {
          setError('CSV must have at least: name, cif_value_usd columns')
          return
        }
        setRows(parsed)
        setError(null)
      } catch { setError('Could not parse CSV') }
    }
    reader.readAsText(f)
  }

  async function submit() {
    setSaving(true)
    setError(null)
    let ok = 0
    for (const row of rows) {
      try {
        const res = await fetch('/api/shipments', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            name:                row.name,
            client_name:         row.client_name || null,
            origin_port:         row.origin_port || 'Mumbai, India',
            product_description: row.product_description || null,
            cif_value_usd:       Number(row.cif_value_usd) || 0,
            pvoc_deadline:       row.pvoc_deadline || null,
            risk_flag_status:    'AMBER',
            import_duty_pct:     25,
          }),
        })
        if (res.ok) ok++
      } catch {}
    }
    setCreated(ok)
    setDone(true)
    setSaving(false)
    onImported()
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl p-8 max-w-sm w-full text-center">
          <CheckCircle2 size={40} className="text-[#00C896] mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">{created} shipments imported</h2>
          <p className="text-[#64748B] text-sm mb-6">They've been added to Operations and grouped by client below.</p>
          <button onClick={onClose} className="w-full py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <div>
            <h2 className="text-white font-bold text-lg">Bulk CSV Import</h2>
            <p className="text-[#64748B] text-xs mt-0.5">Import multiple shipments at once</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white"><X size={18} /></button>
        </div>

        <div className="p-6 space-y-5">
          {/* Template download hint */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <p className="text-xs font-semibold text-[#00C896] mb-2">CSV Column Format</p>
            <code className="text-xs text-[#94A3B8] font-mono break-all">{CSV_HEADERS.join(', ')}</code>
            <p className="text-[#64748B] text-xs mt-2">
              Required: <span className="text-white">name, cif_value_usd</span> · Optional: client_name, origin_port, pvoc_deadline, regulatory_body, product_description
            </p>
          </div>

          {/* File drop */}
          <div
            onClick={() => fileRef.current?.click()}
            className="border border-dashed border-[#1E3A5F] hover:border-[#00C896]/40 rounded-xl p-8 text-center cursor-pointer transition-all"
          >
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={onFile} />
            <Upload size={24} className="text-[#64748B] mx-auto mb-2" />
            <p className="text-white text-sm font-semibold">
              {rows.length > 0 ? `${rows.length} rows loaded` : 'Click to upload CSV'}
            </p>
            <p className="text-[#64748B] text-xs mt-1">
              {rows.length > 0 ? 'Click to replace' : '.csv file — any spreadsheet software can export this format'}
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</div>
          )}

          {/* Preview table */}
          {rows.length > 0 && (
            <div className="rounded-xl border border-[#1E3A5F] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#1E3A5F] bg-[#0F2040]">
                      {Object.keys(rows[0]).map(h => (
                        <th key={h} className="px-3 py-2 text-left text-[#64748B] font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 8).map((row, i) => (
                      <tr key={i} className="border-b border-[#1E3A5F]/40 hover:bg-[#0F2040]/50">
                        {Object.values(row).map((v, j) => (
                          <td key={j} className="px-3 py-2 text-[#94A3B8] max-w-[160px] truncate">{v || '—'}</td>
                        ))}
                      </tr>
                    ))}
                    {rows.length > 8 && (
                      <tr>
                        <td colSpan={Object.keys(rows[0]).length} className="px-3 py-2 text-[#64748B] text-center">
                          +{rows.length - 8} more rows
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {rows.length > 0 && (
            <button
              onClick={submit}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm disabled:opacity-60"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              {saving ? `Importing ${rows.length} shipments...` : `Import ${rows.length} Shipments`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Share Link Modal ──────────────────────────────────────────
function ShareModal({ clientName, onClose }: { clientName: string; onClose: () => void }) {
  const [loading, setLoading]   = useState(true)
  const [url, setUrl]           = useState<string | null>(null)
  const [copied, setCopied]     = useState(false)

  useEffect(() => {
    fetch('/api/client-share', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ client_name: clientName, expires_days: 30 }),
    })
      .then(r => r.json())
      .then(d => { setUrl(d.url); setLoading(false) })
      .catch(() => setLoading(false))
  }, [clientName])

  function copy() {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-bold">Share with {clientName}</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-white"><X size={18} /></button>
        </div>
        <p className="text-[#64748B] text-sm mb-4">
          Generate a read-only link showing all shipments for this client. Valid for 30 days, no login required.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={20} className="animate-spin text-[#00C896]" />
          </div>
        ) : url ? (
          <div className="space-y-3">
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3 font-mono text-xs text-[#94A3B8] break-all">
              {url}
            </div>
            <button
              onClick={copy}
              className="w-full py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm flex items-center justify-center gap-2"
            >
              {copied ? <><CheckCircle2 size={16} /> Copied!</> : <><Link2 size={16} /> Copy Link</>}
            </button>
          </div>
        ) : (
          <p className="text-red-400 text-sm text-center">Failed to generate link</p>
        )}
      </div>
    </div>
  )
}

// ── Main Portfolio Page ───────────────────────────────────────
import React from 'react'

export default function ClientPortfolioPage() {
  const [shipments, setShipments]     = useState<Shipment[]>([])
  const [loading, setLoading]         = useState(true)
  const [expanded, setExpanded]       = useState<Set<string>>(new Set())
  const [showCsv, setShowCsv]         = useState(false)
  const [shareClient, setShareClient] = useState<string | null>(null)
  const [showAddFor, setShowAddFor]   = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/shipments')
    const d = await r.json()
    setShipments(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const groups: ClientGroup[] = React.useMemo(() => {
    const active = shipments.filter(s => s.remediation_status !== 'CLOSED')
    const byClient: Record<string, Shipment[]> = {}
    for (const s of active) {
      const key = s.client_name?.trim() || '— Unassigned —'
      if (!byClient[key]) byClient[key] = []
      byClient[key].push(s)
    }
    return Object.entries(byClient)
      .map(([name, sArr]) => {
        const criticalCount = sArr.filter(s => {
          const days = s.pvoc_deadline ? daysUntil(s.pvoc_deadline) : null
          const lvl  = s.risk?.priority_level
          return lvl === 'CRITICAL' || lvl === 'HIGH' || (days !== null && days <= 7) || (s as any).remediation_status === 'ESCALATED'
        }).length
        const impossibleCount = sArr.filter(s => {
          const profile = s.regulatory_body?.code ? getRegulator('KE', s.regulatory_body.code) : null
          if (!profile) return false
          const ws = getWindowStatus({ pvoc_deadline: s.pvoc_deadline, eta: s.eta }, profile)
          return ws?.status === 'IMPOSSIBLE'
        }).length
        const deadlines = sArr.filter(s => s.pvoc_deadline).map(s => s.pvoc_deadline!).sort()
        return {
          name,
          shipments: sArr.sort((a, b) => {
            const da = a.pvoc_deadline ? daysUntil(a.pvoc_deadline) : 9999
            const db = b.pvoc_deadline ? daysUntil(b.pvoc_deadline) : 9999
            return da - db
          }),
          criticalCount,
          impossibleCount,
          nextDeadline: deadlines[0] ?? null,
          totalKES: sArr.reduce((sum, s) => sum + (s.total_landed_cost_kes ?? 0), 0),
        }
      })
      .sort((a, b) => b.criticalCount - a.criticalCount || (a.nextDeadline ?? '9999') > (b.nextDeadline ?? '9999') ? 1 : -1)
  }, [shipments])

  function toggle(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })
  }

  const totalClients  = groups.length
  const criticalTotal = groups.reduce((n, g) => n + g.criticalCount, 0)

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Client Portfolio</h1>
          <p className="text-[#64748B] text-sm mt-0.5">
            {totalClients} clients · {shipments.filter(s => s.remediation_status !== 'CLOSED').length} active shipments
            {criticalTotal > 0 && <span className="text-red-400 ml-1">· {criticalTotal} need attention</span>}
          </p>
        </div>
        <button
          onClick={() => setShowCsv(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#1E3A5F] text-[#94A3B8] hover:text-white hover:bg-[#2E4A6F] rounded-xl text-sm font-semibold transition-all"
        >
          <Upload size={14} /> Bulk Import CSV
        </button>
      </div>

      {/* No shipments with client_name */}
      {!loading && groups.length === 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-6 py-14 text-center">
          <Users size={32} className="text-[#64748B] mx-auto mb-3" />
          <p className="text-white font-semibold">No clients yet</p>
          <p className="text-[#64748B] text-sm mt-1">
            Add a "Client / Importer" name when creating shipments, or use Bulk Import to add many at once.
          </p>
          <button
            onClick={() => setShowCsv(true)}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold"
          >
            <Upload size={14} /> Import from CSV
          </button>
        </div>
      )}

      {/* Client cards */}
      <div className="space-y-3">
        {groups.map((g) => {
          const isOpen = expanded.has(g.name)
          const nextDays = g.nextDeadline ? daysUntil(g.nextDeadline) : null
          const accentColor = g.impossibleCount > 0 ? '#ef4444' : g.criticalCount > 0 ? '#f59e0b' : nextDays !== null && nextDays <= 14 ? '#f59e0b' : '#00C896'

          return (
            <div
              key={g.name}
              className="bg-[#0F2040] rounded-2xl overflow-hidden"
              style={{ borderLeft: `4px solid ${accentColor}` }}
            >
              {/* Client summary row */}
              <div className="px-5 py-4 flex items-center justify-between gap-3">
                <button
                  onClick={() => toggle(g.name)}
                  className="flex items-center gap-4 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-semibold truncate">{g.name}</div>
                    <div className="text-[#64748B] text-xs mt-0.5">
                      {g.shipments.length} shipment{g.shipments.length !== 1 ? 's' : ''}
                      {g.nextDeadline && (
                        <span className={`ml-2 ${nextDays !== null && nextDays <= 7 ? 'text-amber-400' : ''}`}>
                          · Next: {fmt(g.nextDeadline)} ({nextDays !== null && nextDays > 0 ? `${nextDays}d` : 'overdue'})
                        </span>
                      )}
                    </div>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {g.impossibleCount > 0 && (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 px-2 py-0.5 font-mono">
                      {g.impossibleCount} IMPOSSIBLE
                    </span>
                  )}
                  {g.criticalCount > 0 && g.impossibleCount === 0 && (
                    <span className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                      <AlertTriangle size={11} /> {g.criticalCount} critical
                    </span>
                  )}
                  {g.totalKES > 0 && (
                    <span className="text-sm font-bold text-[#00C896]">
                      KES {g.totalKES >= 1_000_000 ? `${(g.totalKES / 1_000_000).toFixed(1)}M` : g.totalKES.toLocaleString()}
                    </span>
                  )}
                  {g.name !== '— Unassigned —' && (
                    <button
                      onClick={() => { setShowAddFor(g.name) }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-[#00C896]/10 text-[#00C896] hover:bg-[#00C896]/20 rounded-lg text-xs font-semibold transition-colors"
                      title={`Add shipment for ${g.name}`}
                    >
                      <Plus size={12} /> Add
                    </button>
                  )}
                  {g.name !== '— Unassigned —' && (
                    <button
                      onClick={() => setShareClient(g.name)}
                      className="p-1.5 bg-[#1E3A5F] text-[#64748B] hover:text-[#00C896] rounded-lg transition-colors"
                      title="Share client portal link"
                    >
                      <Link2 size={13} />
                    </button>
                  )}
                  <button onClick={() => toggle(g.name)} className="p-1 text-[#64748B]">
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded shipment list */}
              {isOpen && (
                <div className="border-t border-[#1E3A5F]">
                  {g.shipments.map((s, i) => {
                    const days       = s.pvoc_deadline ? daysUntil(s.pvoc_deadline) : null
                    const isOverdue  = days !== null && days <= 0
                    const isEscalated = (s as any).remediation_status === 'ESCALATED'
                    const dayColor   = isOverdue ? 'text-red-400' : days !== null && days <= 3 ? 'text-red-400' : days !== null && days <= 7 ? 'text-amber-400' : 'text-[#64748B]'
                    return (
                      <div
                        key={s.id}
                        className={`px-5 py-3 flex items-center gap-3 ${i < g.shipments.length - 1 ? 'border-b border-[#1E3A5F]/40' : ''} ${isOverdue || isEscalated ? 'bg-red-500/5' : ''}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[#94A3B8] text-sm font-medium truncate">{s.name}</span>
                            {isOverdue && (
                              <span className="text-xs font-bold font-mono tracking-widest text-red-400 bg-red-500/10 px-1.5 py-0.5 flex-shrink-0">WINDOW CLOSED</span>
                            )}
                            {!isOverdue && isEscalated && (
                              <span className="text-xs font-bold font-mono tracking-widest text-red-400 bg-red-500/10 px-1.5 py-0.5 flex-shrink-0">ESCALATED</span>
                            )}
                          </div>
                          <div className="text-[#64748B] text-xs mt-0.5">{s.reference_number} · {s.regulatory_body?.code ?? '—'} · {s.origin_port}</div>
                        </div>
                        <div className={`flex items-center gap-1 text-xs font-semibold flex-shrink-0 ${dayColor}`}>
                          <Clock size={11} />
                          {s.pvoc_deadline
                            ? days !== null && days > 0 ? `${days}d` : days === 0 ? 'today' : `${Math.abs(days!)}d late`
                            : '—'}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 ${
                          s.risk_flag_status === 'RED'   ? 'bg-red-500/10 text-red-400' :
                          s.risk_flag_status === 'AMBER' ? 'bg-amber-500/10 text-amber-400' :
                          'bg-emerald-500/10 text-emerald-400'
                        }`}>
                          {s.risk_flag_status}
                        </span>
                        <a
                          href={`/dashboard/operations?open=${s.id}`}
                          className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#00C896] font-mono flex-shrink-0 transition-colors"
                          title="Open in operations"
                        >
                          <ArrowUpRight size={12} />
                        </a>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showCsv && (
        <CsvImportModal onClose={() => setShowCsv(false)} onImported={() => { setShowCsv(false); load() }} />
      )}
      {shareClient && (
        <ShareModal clientName={shareClient} onClose={() => setShareClient(null)} />
      )}
      {showAddFor !== null && (
        <AddShipmentModal
          defaultClientName={showAddFor}
          onClose={() => setShowAddFor(null)}
          onAdded={() => { setShowAddFor(null); load() }}
        />
      )}
    </div>
  )
}
