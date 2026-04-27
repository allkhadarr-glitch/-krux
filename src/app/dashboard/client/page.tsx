'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { formatUSD, formatKES, formatDate, daysUntilDeadline } from '@/lib/utils'
import { RiskBadge, StatusBadge, RegulatorBadge } from '@/components/RiskBadge'
import { Clock, Ship, MapPin, AlertTriangle } from 'lucide-react'

export default function ClientPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/shipments')
      .then((r) => r.json())
      .then((data: Shipment[]) => {
        setShipments(data)
        if (data.length > 0) setSelectedId(data[0].id)
      })
      .finally(() => setLoading(false))
  }, [])

  const s = shipments.find((x) => x.id === selectedId) ?? shipments[0]

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading...</div>
  if (!s) return <div className="flex items-center justify-center h-64 text-[#64748B]">No shipments found.</div>

  const days = s.pvoc_deadline ? daysUntilDeadline(s.pvoc_deadline) : null

  return (
    <div className="px-4 lg:px-5 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Client Shipment Portal</h1>
          <p className="text-[#64748B] text-sm mt-1">Your live shipment status · KRUX Intelligence</p>
        </div>
        <select
          className="px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {shipments.map((x) => (
            <option key={x.id} value={x.id}>{x.name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Ship size={16} className="text-[#00C896]" />
                <span className="text-[#64748B] text-xs font-medium uppercase tracking-wide">Shipment</span>
              </div>
              <h2 className="text-xl font-bold text-white">{s.name}</h2>
              <div className="flex items-center gap-1 mt-1 text-[#64748B] text-sm">
                <MapPin size={12} />
                {s.origin_port}
              </div>
            </div>
            <RiskBadge risk={s.risk_flag_status} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4 mt-6">
            <div>
              <div className="text-[#64748B] text-xs mb-1">Regulatory Body</div>
              <RegulatorBadge body={s.regulatory_body?.code ?? '—'} />
            </div>
            <div>
              <div className="text-[#64748B] text-xs mb-1">PVoC Deadline</div>
              <div className="text-white text-sm font-semibold">{s.pvoc_deadline ? formatDate(s.pvoc_deadline) : '—'}</div>
            </div>
            <div>
              <div className="text-[#64748B] text-xs mb-1">Compliance Status</div>
              <StatusBadge status={s.remediation_status} />
            </div>
          </div>

          {days != null && days <= 7 && (
            <div className="mt-4 p-3 bg-amber-400/10 border border-amber-400/30 rounded-lg flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              <span className="text-amber-400 text-sm font-medium">
                {days > 0 ? `${days} days until PVoC deadline — action required` : `PVoC deadline passed ${Math.abs(days)} days ago`}
              </span>
            </div>
          )}
        </div>

        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock size={14} className="text-[#00C896]" />
            <span className="text-white text-sm font-semibold">Deadline Status</span>
          </div>
          <div className={`text-4xl font-black ${days != null && days <= 3 ? 'text-red-400' : days != null && days <= 7 ? 'text-amber-400' : 'text-[#00C896]'}`}>
            {days != null && days > 0 ? days : days != null ? 0 : '—'}
          </div>
          <div className="text-[#64748B] text-sm">days remaining</div>
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            <div className="text-[#64748B] text-xs mb-1">CIF Value</div>
            <div className="text-white font-semibold">{formatUSD(s.cif_value_usd)}</div>
          </div>
          <div className="mt-3">
            <div className="text-[#64748B] text-xs mb-1">Total Landed Cost</div>
            <div className="text-[#00C896] font-bold">{formatUSD(s.total_landed_cost_usd!)}</div>
            <div className="text-[#64748B] text-xs">{formatKES(s.total_landed_cost_kes!)}</div>
          </div>
        </div>
      </div>

      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <h3 className="text-white font-semibold mb-3">Shipment Details</h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4 text-sm">
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">Regulator</div>
            <div className="text-white font-medium">{s.regulatory_body?.code ?? '—'}</div>
            <div className="text-[#64748B] text-xs mt-1">{s.regulatory_body?.name ?? 'Managing your clearance'}</div>
          </div>
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">Origin</div>
            <div className="text-white font-medium">{s.origin_port}</div>
            <div className="text-[#64748B] text-xs mt-1">Shipment origin port</div>
          </div>
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">Risk Level</div>
            <div className="text-white font-medium">{s.risk_flag_status}</div>
            <div className="text-[#64748B] text-xs mt-1">Current compliance risk</div>
          </div>
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">HS Code</div>
            <div className="text-white font-medium">{s.hs_code ?? '—'}</div>
          </div>
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">Reference</div>
            <div className="text-white font-medium">{s.reference_number}</div>
          </div>
          <div className="p-3 bg-[#0A1628] rounded-lg">
            <div className="text-[#64748B] text-xs mb-1">Import Duty</div>
            <div className="text-white font-medium">{(s as any).import_duty_rate_pct != null ? `${(s as any).import_duty_rate_pct}%` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
