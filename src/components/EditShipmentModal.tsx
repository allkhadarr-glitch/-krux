'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { X, Loader2, Save } from 'lucide-react'

const RISK_OPTIONS = ['GREEN', 'AMBER', 'RED'] as const

type RegulatoryBody = { id: string; code: string; name: string }

export default function EditShipmentModal({
  shipment,
  onClose,
  onSaved,
}: {
  shipment: Shipment
  onClose:  () => void
  onSaved:  (updated: Shipment) => void
}) {
  const [bodies, setBodies]     = useState<RegulatoryBody[]>([])
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const curDutyPct = shipment.import_duty_usd && shipment.cif_value_usd
    ? Math.round((shipment.import_duty_usd / shipment.cif_value_usd) * 100)
    : 25

  const [form, setForm] = useState({
    name:               shipment.name,
    origin_port:        shipment.origin_port,
    hs_code:            shipment.hs_code ?? '',
    product_description: shipment.product_description ?? '',
    cif_value_usd:      String(shipment.cif_value_usd),
    import_duty_pct:    String(curDutyPct),
    pvoc_deadline:      shipment.pvoc_deadline ?? '',
    regulatory_body_id: shipment.regulatory_body_id ?? '',
    risk_flag_status:   shipment.risk_flag_status,
    vessel_name:        shipment.vessel_name ?? '',
    bl_number:          shipment.bl_number ?? '',
    eta:                shipment.eta ?? '',
    client_name:        shipment.client_name ?? '',
    shipment_type:      (shipment.shipment_type ?? 'STANDARD') as 'STANDARD' | 'BONDED' | 'TRANSIT',
  })

  useEffect(() => {
    fetch('/api/regulatory-bodies')
      .then((r) => r.json())
      .then(setBodies)
      .catch(() => {})
  }, [])

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shipments/${shipment.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          name:               form.name,
          origin_port:        form.origin_port,
          hs_code:            form.hs_code || null,
          product_description: form.product_description || null,
          cif_value_usd:      Number(form.cif_value_usd),
          import_duty_pct:    Number(form.import_duty_pct),
          pvoc_deadline:      form.pvoc_deadline || null,
          regulatory_body_id: form.regulatory_body_id || null,
          risk_flag_status:   form.risk_flag_status,
          vessel_name:        form.vessel_name || null,
          bl_number:          form.bl_number || null,
          eta:                form.eta || null,
          client_name:        form.client_name || null,
          shipment_type:      form.shipment_type,
        }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      onSaved(d.shipment)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
            <h2 className="text-white font-bold text-lg">Edit Shipment</h2>
            <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
            <Field label="Shipment Name">
              <input
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                className={INPUT}
              />
            </Field>

            <Field label="Client / Importer">
              <input
                value={form.client_name}
                onChange={(e) => set('client_name', e.target.value)}
                placeholder="e.g. Acme Pharmaceuticals Ltd"
                className={INPUT}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Origin Port">
                <input
                  required
                  value={form.origin_port}
                  onChange={(e) => set('origin_port', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="PVoC Deadline">
                <input
                  type="date"
                  value={form.pvoc_deadline}
                  onChange={(e) => set('pvoc_deadline', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="CIF Value (USD)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cif_value_usd}
                  onChange={(e) => set('cif_value_usd', e.target.value)}
                  className={INPUT}
                />
              </Field>
              <Field label="Import Duty %">
                <input
                  required
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.import_duty_pct}
                  onChange={(e) => set('import_duty_pct', e.target.value)}
                  className={INPUT}
                />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="HS Code">
                <input
                  value={form.hs_code}
                  onChange={(e) => set('hs_code', e.target.value)}
                  placeholder="e.g. 3004.90"
                  className={INPUT}
                />
              </Field>
              <Field label="Risk Flag">
                <select
                  value={form.risk_flag_status}
                  onChange={(e) => set('risk_flag_status', e.target.value)}
                  className={INPUT}
                >
                  {RISK_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
            </div>

            <Field label="Shipment Type">
              <select
                value={form.shipment_type}
                onChange={(e) => set('shipment_type', e.target.value)}
                className={INPUT}
              >
                <option value="STANDARD">Standard — regular import, duty paid at clearance</option>
                <option value="BONDED">Bonded — goods in bonded warehouse, duty deferred</option>
                <option value="TRANSIT">Transit — moving through Kenya to EAC destination</option>
              </select>
            </Field>

            {form.shipment_type !== 'STANDARD' && (
              <div className="px-3 py-2.5 bg-amber-400/5 border border-amber-400/20 rounded-lg text-xs text-amber-300/80 leading-relaxed">
                {form.shipment_type === 'BONDED'
                  ? 'Bonded: Goods are stored under customs bond — duty is not paid until goods are removed from the warehouse. Ensure bond number is recorded in B/L Number field.'
                  : 'Transit: Goods move through Kenya under a transit bond to Uganda, Rwanda, DRC, or another EAC country. No Kenya import duty applies. KEPHIS still inspects agricultural goods.'}
              </div>
            )}

            <Field label="Regulatory Body">
              <select
                value={form.regulatory_body_id}
                onChange={(e) => set('regulatory_body_id', e.target.value)}
                className={INPUT}
              >
                <option value="">— None —</option>
                {bodies.map((b) => (
                  <option key={b.id} value={b.id}>{b.code} — {b.name}</option>
                ))}
              </select>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Vessel Name">
                <input
                  value={form.vessel_name}
                  onChange={(e) => set('vessel_name', e.target.value)}
                  placeholder="Optional"
                  className={INPUT}
                />
              </Field>
              <Field label="B/L Number">
                <input
                  value={form.bl_number}
                  onChange={(e) => set('bl_number', e.target.value)}
                  placeholder="Optional"
                  className={INPUT}
                />
              </Field>
            </div>

            <Field label="ETA">
              <input
                type="date"
                value={form.eta}
                onChange={(e) => set('eta', e.target.value)}
                className={INPUT}
              />
            </Field>

            <Field label="Product Description">
              <textarea
                value={form.product_description}
                onChange={(e) => set('product_description', e.target.value)}
                rows={2}
                className={INPUT + ' resize-none'}
              />
            </Field>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm text-[#64748B] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-5 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

const INPUT = 'w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-1">{label}</label>
      {children}
    </div>
  )
}
