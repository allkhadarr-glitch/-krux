'use client'
import { useState, useEffect } from 'react'
import { Shipment, ShipmentPortal, PriorityLevel } from '@/lib/types'
import { formatUSD, formatDate, daysUntilDeadline } from '@/lib/utils'
import { RiskBadge, StatusBadge, RegulatorBadge } from '@/components/RiskBadge'
import { getShipments } from '@/lib/supabase'
import { computeAlerts } from '@/lib/alerts'
import AlertBanner from '@/components/AlertBanner'
import PortalStatusModal from '@/components/PortalStatusModal'
import { AlertTriangle, Clock, Search, Globe, Plus, Bell, Loader2, ChevronDown } from 'lucide-react'
import AddShipmentModal from '@/components/AddShipmentModal'

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

export default function OperationsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [search, setSearch] = useState('')
  const [filterRisk, setFilterRisk] = useState('ALL')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [portalModal, setPortalModal] = useState<Shipment | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [alertSending, setAlertSending]   = useState(false)
  const [alertResult, setAlertResult]     = useState<string | null>(null)
  const [eventsRunning, setEventsRunning] = useState(false)
  const [eventsResult, setEventsResult]   = useState<string | null>(null)

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
    getShipments()
      .then(setShipments)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const alerts = computeAlerts(shipments)

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
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors"
          >
            <Plus size={14} />
            Add Shipment
          </button>
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
              {['Priority', 'Shipment', 'Regulator', 'PVoC Deadline', 'CIF Value', 'Landed Cost', 'Portal Status', 'Risk', 'Status'].map((h) => (
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
                    <div className="text-sm font-medium text-white">{s.name}</div>
                    <div className="text-xs text-[#64748B] mt-0.5">{s.origin_port}</div>
                    {alert && (
                      <div className="text-[10px] text-red-400 mt-0.5 font-medium truncate max-w-[200px]">
                        Est. loss: KES {alert.estimatedAdditionalCostKES.toLocaleString()}
                      </div>
                    )}
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
    </div>
  )
}
