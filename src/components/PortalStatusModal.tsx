'use client'
import { useState } from 'react'
import { Shipment, ShipmentPortal, PortalStatusEnum } from '@/lib/types'
import { X, ExternalLink, Save, Loader2 } from 'lucide-react'

const PORTALS = [
  { key: 'KENTRADE', label: 'KENTRADE', url: 'https://kentrade.go.ke',     placeholder: 'e.g. KT/2026/001234' },
  { key: 'KRA',      label: 'KRA iCMS', url: 'https://kra.go.ke',          placeholder: 'e.g. C17/2026/000001' },
  { key: 'PPB',      label: 'PPB',      url: 'https://ppb.go.ke',          placeholder: 'e.g. PPB/IMP/2026/001' },
  { key: 'KEBS',     label: 'KEBS',     url: 'https://kebs.org',           placeholder: 'e.g. KEBS/PVoC/2026/001' },
  { key: 'KEPHIS',   label: 'KEPHIS',   url: 'https://kephis.org',         placeholder: 'e.g. KEPH/2026/001' },
  { key: 'NEMA',     label: 'NEMA',     url: 'https://environment.go.ke',  placeholder: 'e.g. NEMA/IMP/2026/001' },
  { key: 'EPRA',     label: 'EPRA',     url: 'https://epra.go.ke',         placeholder: 'e.g. EPRA/2026/001' },
  { key: 'PCPB',     label: 'PCPB',     url: 'https://pcpb.or.ke',         placeholder: 'e.g. PCPB/2026/001' },
]

const STATUSES: PortalStatusEnum[] = ['NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'REJECTED']

const statusColors: Record<PortalStatusEnum, string> = {
  NOT_STARTED: 'text-[#64748B]',
  IN_PROGRESS: 'text-blue-400',
  SUBMITTED:   'text-amber-400',
  APPROVED:    'text-emerald-400',
  REJECTED:    'text-red-400',
}

export default function PortalStatusModal({
  shipment,
  onClose,
  onSaved,
}: {
  shipment: Shipment
  onClose: () => void
  onSaved: (portals: ShipmentPortal[]) => void
}) {
  const existing = shipment.portals ?? []

  const [form, setForm] = useState<Record<string, { ref: string; status: PortalStatusEnum }>>(
    Object.fromEntries(
      PORTALS.map((p) => {
        const row = existing.find((r) => r.regulator === p.key)
        return [p.key, { ref: row?.reference_number ?? '', status: row?.status ?? 'NOT_STARTED' }]
      })
    )
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function save() {
    setSaving(true)
    const results: ShipmentPortal[] = []

    for (const p of PORTALS) {
      const { ref, status } = form[p.key]
      const isChanged = status !== 'NOT_STARTED' || ref !== ''
      if (!isChanged) continue

      const res = await fetch('/api/portal-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipmentId: shipment.id, regulator: p.key, referenceNumber: ref || null, status }),
      })
      const json = await res.json()
      if (json.portal) results.push(json.portal)
    }

    setSaving(false)
    setSaved(true)
    onSaved(results)
    setTimeout(onClose, 800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <div>
            <h2 className="text-white font-bold">Portal Status</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{shipment.name}</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-3">
          {PORTALS.map((p) => {
            const val = form[p.key]
            return (
              <div key={p.key} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{p.label}</span>
                    <a href={p.url} target="_blank" rel="noopener noreferrer"
                      className="text-[#64748B] hover:text-[#00C896] transition-colors">
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <span className={`text-xs font-semibold ${statusColors[val.status]}`}>
                    {val.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex gap-2">
                  <input
                    value={val.ref}
                    onChange={(e) => setForm((f) => ({ ...f, [p.key]: { ...f[p.key], ref: e.target.value } }))}
                    placeholder={p.placeholder}
                    className="flex-1 px-3 py-1.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
                  />
                  <select
                    value={val.status}
                    onChange={(e) => setForm((f) => ({ ...f, [p.key]: { ...f[p.key], status: e.target.value as PortalStatusEnum } }))}
                    className="px-3 py-1.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{s.replace('_', ' ')}</option>
                    ))}
                  </select>
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={save}
            disabled={saving || saved}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00A87E] transition-colors disabled:opacity-60"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Portal Status'}
          </button>
        </div>
      </div>
    </div>
  )
}
