'use client'
import { useState, useEffect } from 'react'
import { formatUSD, formatKES } from '@/lib/utils'
import { getKPIs, getShipments } from '@/lib/supabase'
import { Shipment } from '@/lib/types'
import { TrendingUp, Package, DollarSign, AlertCircle } from 'lucide-react'

type KpiState = {
  total_shipments: number
  total_cif_usd: number
  total_usd: number
  total_kes: number
  risk: Record<string, number>
  status: Record<string, number>
}

export default function ManagementPage() {
  const [kpis, setKpis] = useState<KpiState>({
    total_shipments: 0,
    total_cif_usd: 0,
    total_usd: 0,
    total_kes: 0,
    risk: { GREEN: 0, AMBER: 0, RED: 0 },
    status: { OPEN: 0, IN_PROGRESS: 0, CLOSED: 0, ESCALATED: 0 },
  })
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getKPIs(), getShipments()])
      .then(([k, s]) => {
        setKpis({
          total_shipments: k.total_shipments,
          total_cif_usd: k.total_cif_usd,
          total_usd: k.total_landed_cost_usd,
          total_kes: k.total_landed_cost_kes,
          risk: k.risk,
          status: k.status,
        })
        setShipments(s)
      })
      .finally(() => setLoading(false))
  }, [])

  const riskTotal = kpis.risk.GREEN + kpis.risk.AMBER + kpis.risk.RED
  const maxLanded = Math.max(...shipments.map((s) => s.total_landed_cost_usd ?? 0), 1)

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading dashboard...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Management Dashboard</h1>
        <p className="text-[#64748B] text-sm mt-1">Executive overview · KRUX Compliance Portfolio</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Shipments', value: kpis.total_shipments.toString(), icon: Package, color: '#00C896' },
          { label: 'Landed Cost USD', value: formatUSD(kpis.total_usd), icon: DollarSign, color: '#00C896' },
          { label: 'Landed Cost KES', value: formatKES(kpis.total_kes), icon: TrendingUp, color: '#00C896' },
          { label: 'High Risk', value: (kpis.risk.RED + kpis.risk.AMBER).toString(), icon: AlertCircle, color: '#F59E0B' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#64748B] text-xs font-medium uppercase tracking-wide">{label}</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}15` }}>
                <Icon size={16} style={{ color }} />
              </div>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Risk Distribution</h3>
          <div className="space-y-3">
            {[
              { label: 'GREEN — Compliant', count: kpis.risk.GREEN, color: '#34D399', bg: 'bg-emerald-400' },
              { label: 'AMBER — At Risk',   count: kpis.risk.AMBER, color: '#FBBF24', bg: 'bg-amber-400' },
              { label: 'RED — Critical',    count: kpis.risk.RED,   color: '#F87171', bg: 'bg-red-400' },
            ].map(({ label, count, color, bg }) => (
              <div key={label}>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color }}>{label}</span>
                  <span className="text-white font-semibold">{count} shipments</span>
                </div>
                <div className="h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bg} rounded-full transition-all duration-700`}
                    style={{ width: riskTotal ? `${(count / riskTotal) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <h3 className="text-white font-semibold mb-4">Compliance Status Overview</h3>
          <div className="space-y-3">
            {Object.entries(kpis.status).map(([label, count]) => {
              const colors: Record<string, string> = {
                OPEN: '#60A5FA',
                IN_PROGRESS: '#FBBF24',
                CLOSED: '#34D399',
                ESCALATED: '#F87171',
              }
              return (
                <div key={label} className="flex items-center justify-between py-2 border-b border-[#1E3A5F] last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ background: colors[label] ?? '#64748B' }} />
                    <span className="text-sm text-[#94A3B8]">{label.replace('_', ' ')}</span>
                  </div>
                  <span className="text-sm font-bold text-white">{count}</span>
                </div>
              )
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            <div className="text-xs text-[#64748B]">Portfolio Tax Burden</div>
            <div className="text-lg font-bold text-[#00C896] mt-1">
              {formatUSD(kpis.total_usd - kpis.total_cif_usd)}
            </div>
            <div className="text-xs text-[#64748B]">
              ~{kpis.total_cif_usd > 0 ? Math.round(((kpis.total_usd - kpis.total_cif_usd) / kpis.total_cif_usd) * 100) : 0}% effective rate on CIF
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-4">Shipment Cost Breakdown</h3>
        <div className="space-y-2">
          {[...shipments]
            .sort((a, b) => (b.total_landed_cost_usd ?? 0) - (a.total_landed_cost_usd ?? 0))
            .map((s) => (
              <div key={s.id} className="flex items-center gap-4">
                <div className="w-48 text-sm text-[#94A3B8] truncate">{s.name.replace('KRUX ', '')}</div>
                <div className="flex-1 h-2 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#00C896] rounded-full"
                    style={{ width: `${((s.total_landed_cost_usd ?? 0) / maxLanded) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-sm font-semibold text-white">{formatUSD(s.total_landed_cost_usd!)}</div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}
