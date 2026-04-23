'use client'
import { useState, useEffect } from 'react'
import { formatDate } from '@/lib/utils'
import { CheckCircle2, AlertTriangle, Clock, Minus } from 'lucide-react'

type ClosedRow = {
  event_id:            string
  closed_at:           string
  shipment_id:         string
  name:                string
  reference_number:    string | null
  pvoc_deadline:       string | null
  outcome:             'CLEARED' | 'DELAYED' | 'PENALIZED' | string
  delay_days:          number
  penalty_kes:         number
  total_duration_days: number | null
  actions_started:     number
  actions_completed:   number
  actions_failed:      number
  actions_pending:     number
  critical_missed:     number
  regime:              'A' | 'B'
  cif_value_usd:       number | null
}

const outcomeStyles = {
  CLEARED:   { label: 'CLEARED',   cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  DELAYED:   { label: 'DELAYED',   cls: 'bg-amber-500/15   text-amber-400   border-amber-500/30' },
  PENALIZED: { label: 'PENALIZED', cls: 'bg-red-500/15     text-red-400     border-red-500/30' },
}

function OutcomeBadge({ outcome }: { outcome: string }) {
  const o = outcomeStyles[outcome as keyof typeof outcomeStyles]
  if (!o) return <span className="text-xs text-[#64748B]">{outcome}</span>
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${o.cls}`}>
      {o.label}
    </span>
  )
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'today'
  if (d === 1) return '1d ago'
  return `${d}d ago`
}

function RegimeBadge({ regime }: { regime: 'A' | 'B' }) {
  return regime === 'A' ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-blue-500/10 text-blue-400 border-blue-500/30">
      A · Execution
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-400 border-red-500/30">
      B · No Start
    </span>
  )
}

function CompletionBar({ completed, failed, pending, total }: { completed: number; failed: number; pending: number; total: number }) {
  if (total === 0) return <span className="text-xs text-[#64748B]">—</span>
  const pctDone   = (completed / total) * 100
  const pctFailed = (failed   / total) * 100
  const pctPend   = (pending  / total) * 100
  return (
    <div className="space-y-1">
      <div className="flex h-1.5 rounded-full overflow-hidden w-24 bg-[#1E3A5F]">
        <div className="bg-emerald-500" style={{ width: `${pctDone}%` }} />
        <div className="bg-red-500"     style={{ width: `${pctFailed}%` }} />
        <div className="bg-amber-500/40" style={{ width: `${pctPend}%` }} />
      </div>
      <div className="text-[10px] text-[#64748B]">{completed}/{total} done</div>
    </div>
  )
}

export default function ClosedShipmentsPage() {
  const [rows, setRows]     = useState<ClosedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/shipments/closed')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error)
        setRows(d.rows ?? [])
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const cohortA         = rows.filter((r) => r.regime === 'A')
  const cohortB         = rows.filter((r) => r.regime === 'B')
  const totalDelayDays  = rows.reduce((s, r) => s + (r.delay_days  ?? 0), 0)
  const totalPenaltyKes = rows.reduce((s, r) => s + (r.penalty_kes ?? 0), 0)
  const cleared         = rows.filter((r) => r.outcome === 'CLEARED').length
  const avgDuration     = cohortA.length
    ? Math.round(cohortA.reduce((s, r) => s + (r.total_duration_days ?? 0), 0) / cohortA.length)
    : null

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Closed Shipments</h1>
        <p className="text-[#64748B] text-sm mt-1">Last 30 days · {rows.length} closed</p>
      </div>

      {/* Summary strip */}
      {rows.length > 0 && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: 'Cleared',          value: `${cleared} / ${rows.length}`,                             icon: CheckCircle2,  color: 'text-emerald-400' },
            { label: 'Regime A (Exec)',  value: `${cohortA.length} / ${rows.length}`,                      icon: Clock,         color: 'text-blue-400' },
            { label: 'Regime B (No Start)', value: `${cohortB.length} / ${rows.length}`,                   icon: AlertTriangle, color: cohortB.length > 0 ? 'text-red-400' : 'text-[#64748B]' },
            { label: 'Total Delay Days', value: totalDelayDays > 0 ? `${totalDelayDays}d` : '0d',          icon: AlertTriangle, color: totalDelayDays > 0 ? 'text-amber-400' : 'text-[#64748B]' },
            { label: 'Total Penalties',  value: totalPenaltyKes > 0 ? `KES ${totalPenaltyKes.toLocaleString()}` : '—', icon: Minus, color: totalPenaltyKes > 0 ? 'text-red-400' : 'text-[#64748B]' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} className={color} />
                <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">{label}</span>
              </div>
              <div className={`text-xl font-bold ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-16 text-[#64748B]">
          <CheckCircle2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm">No shipments closed in the last 30 days.</p>
          <p className="text-xs mt-1">Close your first shipment from the Operations page.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E3A5F] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E3A5F] bg-[#0F2040]">
                {['Shipment', 'Regime', 'Outcome', 'Closed', 'Duration', 'Delay', 'Penalty (KES)', 'Actions', 'Critical Missed'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]">
              {rows.map((r) => (
                <tr key={r.event_id} className="hover:bg-[#0F2040]/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-sm font-medium text-white">{r.name}</div>
                    {r.reference_number && (
                      <div className="text-[10px] text-[#64748B] mt-0.5">{r.reference_number}</div>
                    )}
                    {r.pvoc_deadline && (
                      <div className="text-[10px] text-[#64748B]">Deadline: {formatDate(r.pvoc_deadline)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3"><RegimeBadge regime={r.regime} /></td>
                  <td className="px-4 py-3"><OutcomeBadge outcome={r.outcome} /></td>
                  <td className="px-4 py-3">
                    <div className="text-sm text-white">{timeAgo(r.closed_at)}</div>
                    <div className="text-[10px] text-[#64748B]">{formatDate(r.closed_at)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-white">
                      {r.total_duration_days != null ? `${r.total_duration_days}d` : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.delay_days > 0
                      ? <span className="text-sm font-semibold text-amber-400">+{r.delay_days}d</span>
                      : <span className="text-sm text-[#64748B]">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    {r.penalty_kes > 0
                      ? <span className="text-sm font-semibold text-red-400">{r.penalty_kes.toLocaleString()}</span>
                      : <span className="text-sm text-[#64748B]">—</span>
                    }
                  </td>
                  <td className="px-4 py-3">
                    <CompletionBar
                      completed={r.actions_completed}
                      failed={r.actions_failed}
                      pending={r.actions_pending}
                      total={r.actions_completed + r.actions_failed + r.actions_pending}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {r.critical_missed > 0
                      ? <span className="flex items-center gap-1 text-xs font-bold text-red-400"><AlertTriangle size={11} />{r.critical_missed}</span>
                      : <span className="text-xs text-emerald-400">✓ none</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
