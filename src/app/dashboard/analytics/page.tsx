'use client'
import { useState, useEffect } from 'react'
import { TrendingUp, AlertTriangle, CheckCircle2, Clock, DollarSign, Loader2, BarChart3 } from 'lucide-react'

type Stats = {
  period_days: number
  closed: {
    total: number; cleared: number; delayed: number; penalized: number
    delay_rate: number; avg_duration_days: number | null
    total_penalty_kes: number; total_delay_days: number
    total_actual_cost_kes: number; critical_actions_missed: number
    regime_a: number; regime_b: number
  }
  active: { count: number }
  actions: { by_status: Record<string, number>; total: number }
  cost_breakdown: Record<string, number>
}

const COST_LABELS: Record<string, string> = {
  AGENT_FEE: 'Agent Fee', INSPECTION: 'Inspection',
  DEMURRAGE: 'Demurrage', STORAGE: 'Storage',
  CUSTOMS_DUTY: 'Customs Duty', OTHER: 'Other',
}

function Stat({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
      <p className="text-[10px] font-semibold text-[#64748B] uppercase tracking-wide mb-2">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-[#64748B] mt-1">{sub}</p>}
    </div>
  )
}

export default function AnalyticsPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setStats(d) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]"><Loader2 size={20} className="animate-spin mr-2" />Loading analytics...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>
  if (!stats)  return null

  const { closed, active, actions, cost_breakdown } = stats

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-[#64748B] text-sm mt-1">Last 90 days · {closed.total} closed shipments · {active.count} active</p>
      </div>

      {/* Outcomes */}
      <div>
        <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Closure Outcomes</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Delay Rate"      value={`${closed.delay_rate}%`}  color={closed.delay_rate > 30 ? 'text-red-400' : closed.delay_rate > 15 ? 'text-amber-400' : 'text-emerald-400'} sub={`${closed.delayed + closed.penalized} of ${closed.total} shipments`} />
          <Stat label="Cleared"         value={String(closed.cleared)}   color="text-emerald-400" sub={`${closed.total > 0 ? Math.round(closed.cleared / closed.total * 100) : 0}% success rate`} />
          <Stat label="Delayed"         value={String(closed.delayed)}   color={closed.delayed > 0 ? 'text-amber-400' : 'text-[#64748B]'} sub={`${closed.total_delay_days} total days lost`} />
          <Stat label="Penalized"       value={String(closed.penalized)} color={closed.penalized > 0 ? 'text-red-400' : 'text-[#64748B]'} sub={closed.total_penalty_kes > 0 ? `KES ${closed.total_penalty_kes.toLocaleString()}` : 'No penalties'} />
        </div>
      </div>

      {/* Efficiency */}
      <div>
        <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Execution Efficiency</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Avg Duration"    value={closed.avg_duration_days != null ? `${closed.avg_duration_days}d` : '—'} sub="Cohort A only (started actions)" />
          <Stat label="Critical Missed" value={String(closed.critical_actions_missed)} color={closed.critical_actions_missed > 0 ? 'text-red-400' : 'text-emerald-400'} sub="Across all closed" />
          <Stat label="Regime A (Exec)" value={String(closed.regime_a)} color="text-blue-400" sub="Observable execution" />
          <Stat label="Regime B (None)" value={String(closed.regime_b)} color={closed.regime_b > 0 ? 'text-red-400' : 'text-[#64748B]'} sub="No system activity" />
        </div>
      </div>

      {/* Costs */}
      <div>
        <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Actual Cost Breakdown</h2>
        {Object.keys(cost_breakdown).length === 0 ? (
          <p className="text-xs text-[#64748B]">No cost data yet. Add costs to shipments via the Costs tab.</p>
        ) : (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1E3A5F] bg-[#0A1628]">
                  {['Cost Type', 'Total (KES)', '% of Total'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E3A5F]">
                {Object.entries(cost_breakdown)
                  .sort(([, a], [, b]) => b - a)
                  .map(([type, amount]) => {
                    const pct = closed.total_actual_cost_kes > 0
                      ? Math.round(amount / closed.total_actual_cost_kes * 100)
                      : 0
                    return (
                      <tr key={type} className="hover:bg-[#0F2040]/50">
                        <td className="px-4 py-3 text-sm text-white">{COST_LABELS[type] ?? type}</td>
                        <td className="px-4 py-3 text-sm font-semibold text-[#00C896]">{Number(amount).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#1E3A5F] rounded-full h-1.5 max-w-[100px]">
                              <div className="h-1.5 bg-[#00C896] rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-[#64748B]">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                <tr className="bg-[#0A1628] border-t border-[#1E3A5F]">
                  <td className="px-4 py-3 text-sm font-bold text-white">Total</td>
                  <td className="px-4 py-3 text-sm font-bold text-[#00C896]">{closed.total_actual_cost_kes.toLocaleString()}</td>
                  <td className="px-4 py-3 text-xs text-[#64748B]">100%</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action status */}
      <div>
        <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Action Status (All Time)</h2>
        <div className="flex flex-wrap gap-3">
          {Object.entries(actions.by_status).map(([status, count]) => {
            const colors: Record<string, string> = {
              DONE:        'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
              FAILED:      'bg-red-500/15 text-red-400 border-red-500/30',
              AT_RISK:     'bg-red-500/20 text-red-300 border-red-500/40',
              IN_PROGRESS: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
              PENDING:     'bg-[#1E3A5F] text-[#64748B] border-[#1E3A5F]',
            }
            return (
              <div key={status} className={`px-3 py-2 rounded-lg border text-xs font-semibold ${colors[status] ?? 'bg-[#1E3A5F] text-[#64748B] border-[#1E3A5F]'}`}>
                {count} {status.replace('_', ' ')}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
