'use client'
import { useState, useEffect, useCallback } from 'react'
import { Shipment, ShipmentPortal, PriorityLevel } from '@/lib/types'
import { formatUSD, formatDate, daysUntilDeadline } from '@/lib/utils'
import { RiskBadge, StatusBadge, RegulatorBadge } from '@/components/RiskBadge'
import { computeAlerts } from '@/lib/alerts'
import AlertBanner from '@/components/AlertBanner'
import PortalStatusModal from '@/components/PortalStatusModal'
import { AlertTriangle, Clock, Search, Globe, Plus, Bell, Loader2, ChevronDown, CheckCircle2, X, Copy, FileDown, Truck, Lock, Pencil } from 'lucide-react'
import { useRole } from '@/hooks/useRole'
import AddShipmentModal from '@/components/AddShipmentModal'
import EditShipmentModal from '@/components/EditShipmentModal'
import ShipmentDrawer from '@/components/ShipmentDrawer'
import { OnboardingWizard } from '@/components/OnboardingWizard'
import { supabase } from '@/lib/supabase'

const priorityColors: Record<PriorityLevel, string> = {
  CRITICAL: 'bg-red-500/15 text-red-400 border border-red-500/30',
  HIGH:     'bg-amber-500/15 text-amber-400 border border-amber-500/30',
  MEDIUM:   'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  LOW:      'bg-[#1E3A5F] text-[#64748B] border border-[#1E3A5F]',
}

function PriorityBadge({ level, score }: { level?: PriorityLevel; score?: number }) {
  if (!level) return <span className="text-xs text-[#64748B]">—</span>
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${priorityColors[level]}`}>
        {level}
      </span>
      {score != null && (
        <span className="text-[10px] text-[#64748B]">{score.toFixed(1)} / 10</span>
      )}
    </div>
  )
}

function RiskDriversTooltip({ drivers }: { drivers?: string[] }) {
  const [open, setOpen] = useState(false)
  if (!drivers?.length) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-0.5 text-[10px] text-[#64748B] hover:text-[#94A3B8] transition-colors mt-0.5"
      >
        {drivers.length} driver{drivers.length !== 1 ? 's' : ''} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute z-10 top-5 left-0 bg-[#0A1628] border border-[#1E3A5F] rounded-lg p-3 shadow-xl min-w-[200px]">
          <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-2">Risk Drivers</p>
          <ul className="space-y-1">
            {drivers.map((d, i) => (
              <li key={i} className="text-xs text-[#94A3B8] flex items-start gap-1.5">
                <span className="text-red-400 mt-0.5">•</span> {d}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

const portalStatusColors: Record<string, string> = {
  APPROVED:    'text-emerald-400',
  SUBMITTED:   'text-amber-400',
  IN_PROGRESS: 'text-blue-400',
  REJECTED:    'text-red-400',
  NOT_STARTED: 'text-[#64748B]',
}

function PortalDots({ portals }: { portals?: ShipmentPortal[] }) {
  const active = (portals ?? []).filter((p) => p.status !== 'NOT_STARTED')
  if (!active.length) return <span className="text-xs text-[#64748B]">—</span>
  return (
    <div className="flex gap-1 flex-wrap">
      {active.map((p) => (
        <span key={p.regulator} className={`text-[10px] font-bold uppercase ${portalStatusColors[p.status] ?? 'text-[#64748B]'}`}>
          {p.regulator}
        </span>
      ))}
    </div>
  )
}

type CloseOutcome = 'CLEARED' | 'DELAYED' | 'PENALIZED'

type ActionSummary = { total: number; completed: number; failed: number; pending: number; at_risk: number; critical_incomplete: number }

function CloseShipmentModal({
  shipment,
  onClose,
  onClosed,
}: {
  shipment: Shipment
  onClose: () => void
  onClosed: (id: string) => void
}) {
  const [outcome, setOutcome]       = useState<CloseOutcome>('CLEARED')
  const [delayDays, setDelayDays]   = useState('')
  const [penalty, setPenalty]       = useState('')
  const [notes, setNotes]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [err, setErr]               = useState<string | null>(null)
  const [summary, setSummary]       = useState<ActionSummary | null>(null)
  const [confirmed, setConfirmed]   = useState(false)

  useEffect(() => {
    fetch(`/api/shipments/${shipment.id}/actions`)
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch(() => null)
  }, [shipment.id])

  const integrityWarning = summary
    ? summary.pending > 0 && summary.pending >= Math.ceil(summary.total * 0.4)
      ? `${summary.pending} action${summary.pending !== 1 ? 's' : ''} were never started. Does this reflect reality?`
      : null
    : null

  const coherenceWarning = summary && outcome === 'CLEARED' && summary.critical_incomplete > 0
    ? `${summary.critical_incomplete} CRITICAL action${summary.critical_incomplete !== 1 ? 's' : ''} not completed. Marking CLEARED may produce false learning.`
    : null

  const hasWarning = !!(integrityWarning || coherenceWarning)
  const needsConfirm = hasWarning && !confirmed

  async function submit() {
    setSaving(true)
    setErr(null)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status:               outcome,
          delay_days:           delayDays ? Number(delayDays) : null,
          penalty_amount_kes:   penalty   ? Number(penalty)   : null,
          notes:                notes || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setErr(data.error ?? 'Failed'); return }
      onClosed(shipment.id)
    } catch {
      setErr('Network error')
    } finally {
      setSaving(false)
    }
  }

  const outcomeStyles: Record<CloseOutcome, string> = {
    CLEARED:   'border-emerald-500/60 bg-emerald-500/10 text-emerald-400',
    DELAYED:   'border-amber-500/60   bg-amber-500/10   text-amber-400',
    PENALIZED: 'border-red-500/60     bg-red-500/10     text-red-400',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-white">Close Shipment</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{shipment.name}</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2">Outcome</p>
            <div className="grid grid-cols-3 gap-2">
              {(['CLEARED', 'DELAYED', 'PENALIZED'] as CloseOutcome[]).map((o) => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    outcome === o ? outcomeStyles[o] : 'border-[#1E3A5F] text-[#64748B] hover:border-[#2E4A6F]'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>

          {outcome === 'DELAYED' && (
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Delay (days)</label>
              <input
                type="number"
                min={0}
                value={delayDays}
                onChange={(e) => setDelayDays(e.target.value)}
                placeholder="e.g. 5"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
          )}

          {outcome === 'PENALIZED' && (
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Penalty (KES)</label>
              <input
                type="number"
                min={0}
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
                placeholder="e.g. 150000"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide block mb-1">Notes (optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any closure notes..."
              className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896] resize-none"
            />
          </div>

          {/* Action summary strip */}
          {summary && (
            <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 flex gap-4 text-[11px]">
              <span className="text-emerald-400 font-semibold">{summary.completed} done</span>
              {summary.failed   > 0 && <span className="text-red-400  font-semibold">{summary.failed} failed</span>}
              {summary.at_risk  > 0 && <span className="text-red-400  font-semibold animate-pulse">{summary.at_risk} at risk</span>}
              {summary.pending  > 0 && <span className="text-[#64748B]">{summary.pending} untouched</span>}
              <span className="text-[#64748B] ml-auto">{summary.total} total</span>
            </div>
          )}

          {/* Integrity / coherence warnings */}
          {integrityWarning && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-400">
              <span className="font-bold">Completeness: </span>{integrityWarning}
            </div>
          )}
          {coherenceWarning && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 text-xs text-red-400">
              <span className="font-bold">Coherence: </span>{coherenceWarning}
            </div>
          )}
          {hasWarning && (
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 accent-[#00C896]"
              />
              <span className="text-xs text-[#94A3B8]">I understand — this reflects the actual outcome</span>
            </label>
          )}

          {err && <p className="text-xs text-red-400">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 py-2 border border-[#1E3A5F] text-[#64748B] rounded-lg text-sm hover:border-[#2E4A6F] hover:text-white transition-all"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving || needsConfirm}
              className="flex-1 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {saving ? 'Closing...' : 'Confirm Close'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

const STAGES = ['PRE_SHIPMENT', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'CLEARED']
const STAGE_LABELS: Record<string, string> = {
  PRE_SHIPMENT: 'Pre-ship', IN_TRANSIT: 'Transit',
  AT_PORT: 'At Port', CUSTOMS: 'Customs', CLEARED: 'Cleared',
}
const STAGE_COLORS: Record<string, string> = {
  PRE_SHIPMENT: 'text-[#64748B]', IN_TRANSIT: 'text-blue-400',
  AT_PORT: 'text-amber-400', CUSTOMS: 'text-purple-400', CLEARED: 'text-emerald-400',
}

function StagePill({ shipmentId, currentStage }: { shipmentId: string; currentStage: string }) {
  const [stage, setStage] = useState(currentStage)
  const [open, setOpen]   = useState(false)

  async function updateStage(s: string) {
    setStage(s)
    setOpen(false)
    await fetch(`/api/shipments/${shipmentId}/stage`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage: s }),
    })
  }

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide ${STAGE_COLORS[stage] ?? 'text-[#64748B]'}`}>
        <Truck size={10} /> {STAGE_LABELS[stage] ?? stage}
      </button>
      {open && (
        <div className="absolute z-20 top-5 left-0 bg-[#0A1628] border border-[#1E3A5F] rounded-lg shadow-xl min-w-[110px] overflow-hidden">
          {STAGES.map((s) => (
            <button key={s} onClick={() => updateStage(s)}
              className={`w-full text-left px-3 py-2 text-[10px] font-bold uppercase transition-colors hover:bg-[#1E3A5F] ${s === stage ? STAGE_COLORS[s] : 'text-[#64748B]'}`}>
              {STAGE_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function OperationsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalModal, setPortalModal] = useState<Shipment | null>(null)
  const [drawerShipment, setDrawerShipment] = useState<Shipment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [alertSending, setAlertSending]   = useState(false)
  const [alertResult, setAlertResult]     = useState<string | null>(null)
  const [eventsRunning, setEventsRunning] = useState(false)
  const [eventsResult, setEventsResult]   = useState<string | null>(null)
  const [kesRate, setKesRate]             = useState(130)
  const [closeTarget, setCloseTarget]     = useState<Shipment | null>(null)
  const [editTarget, setEditTarget]       = useState<Shipment | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const { canWrite } = useRole()

  async function runAlerts() {
    setAlertSending(true)
    setAlertResult(null)
    try {
      const res  = await fetch('/api/alerts/send', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setAlertResult(`Error: ${data.error}`); return }
      setAlertResult(`Sent — ${data.sent.shipments} shipment + ${data.sent.licenses} license alert${data.sent.licenses !== 1 ? 's' : ''}`)
    } catch {
      setAlertResult('Failed to send alerts')
    } finally {
      setAlertSending(false)
      setTimeout(() => setAlertResult(null), 6000)
    }
  }

  async function runEvents() {
    setEventsRunning(true)
    setEventsResult(null)
    try {
      const res  = await fetch('/api/events/process', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setEventsResult(`Error: ${data.error}`); return }
      setEventsResult(`${data.events_processed} processed · ${data.deadline_events_emitted} emitted`)
    } catch {
      setEventsResult('Failed')
    } finally {
      setEventsRunning(false)
      setTimeout(() => setEventsResult(null), 6000)
    }
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/shipments').then((r) => r.json()),
      fetch('/api/fx/rate').then((r) => r.json()).catch(() => ({ usd_kes: 130 })),
    ])
      .then(([ships, fx]) => {
        setShipments(ships)
        setKesRate(fx.usd_kes ?? 130)
        if (ships.length === 0) setShowOnboarding(true)
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))

    // Realtime: refresh shipments on any change
    const channel = supabase
      .channel('shipments-ops')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shipments' }, () => {
        fetch('/api/shipments').then((r) => r.json()).then(setShipments)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const alerts = computeAlerts(shipments, kesRate)

  const filtered = shipments
    .filter((s) => {
      const regCode = s.regulatory_body?.code ?? ''
      const matchSearch =
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        regCode.toLowerCase().includes(search.toLowerCase())
      const matchRisk = filterRisk === 'ALL' || s.risk_flag_status === filterRisk
      return matchSearch && matchRisk
    })
    .sort((a, b) => (b.risk?.risk_score ?? 0) - (a.risk?.risk_score ?? 0))

  function handleShipmentClosed(id: string) {
    setShipments((prev) =>
      prev.map((s) => s.id === id ? { ...s, remediation_status: 'CLOSED' } : s)
    )
    setCloseTarget(null)
  }

  function handlePortalSaved(shipmentId: string, updatedPortals: ShipmentPortal[]) {
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s
        const merged = [...(s.portals ?? [])]
        for (const up of updatedPortals) {
          const idx = merged.findIndex((p) => p.regulator === up.regulator)
          if (idx >= 0) merged[idx] = up
          else merged.push(up)
        }
        return { ...s, portals: merged }
      })
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading shipments...</div>
  if (error) return <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>

  return (
    <div className="p-6 space-y-6">
      {showOnboarding && <OnboardingWizard onDismiss={() => setShowOnboarding(false)} />}
      <AlertBanner alerts={alerts} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Operations Dashboard</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {filtered.length} shipments tracked · Kenya Import Compliance
            {alerts.length > 0 && (
              <span className="ml-2 text-red-400 font-semibold">· {alerts.filter(a => a.level === 'CRITICAL').length} critical</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs text-[#64748B]">
            <div className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
            Live
          </div>
          <button
            onClick={runEvents}
            disabled={eventsRunning}
            className="flex items-center gap-2 px-3 py-2 border border-[#1E3A5F] text-[#94A3B8] rounded-lg text-sm font-medium hover:border-[#00C896]/40 hover:text-[#00C896] disabled:opacity-50 transition-all"
          >
            {eventsRunning ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {eventsRunning ? 'Processing...' : 'Run Events'}
          </button>
          {eventsResult && (
            <span className={`text-xs font-medium ${eventsResult.startsWith('Error') ? 'text-red-400' : 'text-[#00C896]'}`}>
              {eventsResult}
            </span>
          )}
          <button
            onClick={runAlerts}
            disabled={alertSending}
            className="flex items-center gap-2 px-3 py-2 border border-[#1E3A5F] text-[#94A3B8] rounded-lg text-sm font-medium hover:border-[#00C896]/40 hover:text-[#00C896] disabled:opacity-50 transition-all"
          >
            {alertSending ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
            {alertSending ? 'Sending...' : 'Run Alerts'}
          </button>
          {alertResult && (
            <span className={`text-xs font-medium ${alertResult.startsWith('Error') ? 'text-red-400' : 'text-[#00C896]'}`}>
              {alertResult}
            </span>
          )}
          {canWrite && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors"
            >
              <Plus size={14} />
              Add Shipment
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
          <input
            className="w-full pl-9 pr-4 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
            placeholder="Search shipments or regulators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          {['ALL', 'RED', 'AMBER', 'GREEN'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRisk(r)}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                filterRisk === r
                  ? 'bg-[#00C896]/10 text-[#00C896] border-[#00C896]/30'
                  : 'text-[#64748B] border-[#1E3A5F] hover:border-[#00C896]/30'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-[#1E3A5F] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1E3A5F] bg-[#0F2040]">
              {['Priority', 'Shipment', 'Stage', 'Regulator', 'PVoC Deadline', 'CIF Value', 'Landed Cost', 'Portal Status', 'Risk', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A5F]">
            {filtered.map((s) => {
              const days = daysUntilDeadline(s.pvoc_deadline!)
              const alert = alerts.find((a) => a.shipmentId === s.id)
              const rowBg = alert?.level === 'CRITICAL'
                ? 'bg-red-500/5'
                : alert?.level === 'URGENT'
                ? 'bg-amber-500/5'
                : ''

              return (
                <tr key={s.id} className={`hover:bg-[#0F2040]/50 transition-colors ${rowBg}`}>
                  <td className="px-4 py-3">
                    <PriorityBadge level={s.risk?.priority_level} score={s.risk?.risk_score} />
                    <RiskDriversTooltip drivers={s.risk?.risk_drivers} />
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setDrawerShipment(s)}
                      className="text-sm font-medium text-white hover:text-[#00C896] transition-colors text-left"
                    >
                      {s.name}
                    </button>
                    <div className="text-xs text-[#64748B] mt-0.5">{s.origin_port}</div>
                    {alert && (
                      <div className="text-[10px] text-red-400 mt-0.5 font-medium truncate max-w-[200px]">
                        Est. loss: KES {alert.estimatedAdditionalCostKES.toLocaleString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StagePill shipmentId={s.id} currentStage={(s as any).shipment_stage ?? 'PRE_SHIPMENT'} />
                  </td>
                  <td className="px-4 py-3">
                    <RegulatorBadge body={s.regulatory_body?.code ?? '—'} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{formatDate(s.pvoc_deadline!)}</div>
                    <div className={`text-xs mt-0.5 flex items-center gap-1 ${days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-[#64748B]'}`}>
                      {days <= 7 && <AlertTriangle size={10} />}
                      <Clock size={10} />
                      {days > 0 ? `${days}d remaining` : `${Math.abs(days)}d overdue`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-white">{formatUSD(s.cif_value_usd)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-[#00C896]">{formatUSD(s.total_landed_cost_usd!)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <PortalDots portals={s.portals} />
                      <button
                        onClick={() => setPortalModal(s)}
                        className="text-[#64748B] hover:text-[#00C896] transition-colors"
                        title="Update portal status"
                      >
                        <Globe size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3"><RiskBadge risk={s.risk_flag_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={s.remediation_status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {canWrite && (
                        <button onClick={() => setEditTarget(s)}
                          className="flex items-center gap-1 px-2 py-1 border border-[#1E3A5F] text-[#64748B] rounded-md text-[10px] font-semibold hover:border-[#00C896]/40 hover:text-[#00C896] transition-all"
                          title="Edit shipment">
                          <Pencil size={11} />
                        </button>
                      )}
                      {canWrite && s.remediation_status !== 'CLOSED' && (
                        <button onClick={() => setCloseTarget(s)}
                          className="flex items-center gap-1 px-2 py-1 border border-[#1E3A5F] text-[#64748B] rounded-md text-[10px] font-semibold hover:border-emerald-500/40 hover:text-emerald-400 transition-all">
                          <CheckCircle2 size={11} /> Close
                        </button>
                      )}
                      <button onClick={() => window.open(`/api/shipments/${s.id}/export`, '_blank')}
                        className="flex items-center gap-1 px-2 py-1 border border-[#1E3A5F] text-[#64748B] rounded-md text-[10px] font-semibold hover:border-blue-500/40 hover:text-blue-400 transition-all"
                        title="Export audit report">
                        <FileDown size={11} />
                      </button>
                      {canWrite && (
                        <button onClick={async () => {
                            const r = await fetch(`/api/shipments/${s.id}/duplicate`, { method: 'POST' })
                            const d = await r.json()
                            if (d.shipment) setShipments((prev) => [d.shipment, ...prev])
                          }}
                          className="flex items-center gap-1 px-2 py-1 border border-[#1E3A5F] text-[#64748B] rounded-md text-[10px] font-semibold hover:border-purple-500/40 hover:text-purple-400 transition-all"
                          title="Duplicate shipment">
                          <Copy size={11} />
                        </button>
                      )}
                      {!canWrite && <span title="Read-only access"><Lock size={10} className="text-[#1E3A5F]" /></span>}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-[#64748B] text-sm">No shipments match your filter.</div>
        )}
      </div>

      {showAddModal && (
        <AddShipmentModal
          onClose={() => setShowAddModal(false)}
          onAdded={(newShipment) => {
            setShipments((prev) => [newShipment, ...prev])
            setShowAddModal(false)
          }}
        />
      )}

      {drawerShipment && (
        <ShipmentDrawer
          shipment={drawerShipment}
          onClose={() => setDrawerShipment(null)}
        />
      )}

      {portalModal && (
        <PortalStatusModal
          shipment={portalModal}
          onClose={() => setPortalModal(null)}
          onSaved={(updatedPortals) => {
            handlePortalSaved(portalModal.id, updatedPortals)
            setPortalModal(null)
          }}
        />
      )}

      {closeTarget && (
        <CloseShipmentModal
          shipment={closeTarget}
          onClose={() => setCloseTarget(null)}
          onClosed={handleShipmentClosed}
        />
      )}

      {editTarget && (
        <EditShipmentModal
          shipment={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setShipments((prev) => prev.map((s) => s.id === updated.id ? { ...s, ...updated } : s))
            setEditTarget(null)
          }}
        />
      )}
    </div>
  )
}
