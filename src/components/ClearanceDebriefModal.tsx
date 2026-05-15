'use client'
import { useState } from 'react'
import { X, Loader2, CheckCircle2, ClipboardList } from 'lucide-react'

interface Props {
  shipmentId: string
  shipmentName: string
  vesselName?: string | null
  shippingLine?: string | null
  regulatorCode?: string | null
  onClose: () => void
  onSubmitted?: () => void
}

const EXAMINATION_OUTCOMES = [
  { value: 'green_channel', label: 'Green channel — released without examination' },
  { value: 'red_channel',   label: 'Red channel — examined, released' },
  { value: 'detained',      label: 'Detained — held for further review' },
  { value: 'fined',         label: 'Fined — penalty applied' },
]

export default function ClearanceDebriefModal({
  shipmentId, shipmentName, vesselName, shippingLine, regulatorCode, onClose, onSubmitted,
}: Props) {
  const [saving, setSaving]   = useState(false)
  const [done, setDone]       = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const [form, setForm] = useState({
    examined:               false,
    examination_outcome:    '',
    agent_name:             '',
    agent_license:          '',
    shipping_line:          shippingLine ?? '',
    vessel:                 vesselName ?? '',
    dwell_days:             '',
    duty_applied_kes:       '',
    classification_dispute: false,
    disputed_hs_code:       '',
    regulator_code:         regulatorCode ?? '',
    notes:                  '',
  })

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/shipments/${shipmentId}/debrief`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save debrief')
      setDone(true)
      onSubmitted?.()
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-md p-8 text-center">
          <CheckCircle2 size={40} className="text-[#00C896] mx-auto mb-4" />
          <h2 className="text-white font-bold text-lg mb-2">Debrief saved</h2>
          <p className="text-[#64748B] text-sm mb-6">
            This data compounds your compliance record and feeds KRUX intelligence on examination rates, agent performance, and shipping line reliability.
          </p>
          <button onClick={onClose}
            className="w-full py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00A87E] transition-colors">
            Done
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-lg max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F] sticky top-0 bg-[#0A1628] z-10">
          <div className="flex items-center gap-3">
            <ClipboardList size={16} className="text-[#00C896]" />
            <div>
              <h2 className="text-white font-bold text-sm">Clearance Debrief</h2>
              <p className="text-xs text-[#64748B] mt-0.5 truncate max-w-[280px]">{shipmentName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-3 bg-[#00C896]/5 border-b border-[#1E3A5F]">
          <p className="text-xs text-[#64748B] leading-relaxed">
            Every field you fill in here builds KRUX intelligence — examination rates by HS code, agent performance, shipping line reliability. It takes 2 minutes. It compounds.
          </p>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5">

          {/* Q1: Physical examination */}
          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-2">Was the shipment physically examined at port?</label>
            <div className="flex gap-3">
              {[{ v: true, l: 'Yes — examined' }, { v: false, l: 'No — passed through' }].map(({ v, l }) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set('examined', v)}
                  className={`flex-1 py-2.5 text-xs font-semibold border transition-all ${
                    form.examined === v
                      ? 'border-[#00C896] bg-[#00C896]/10 text-[#00C896]'
                      : 'border-[#1E3A5F] text-[#64748B] hover:border-[#334155]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Q2: Examination outcome */}
          {form.examined && (
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-2">Examination outcome</label>
              <select
                value={form.examination_outcome}
                onChange={(e) => set('examination_outcome', e.target.value)}
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
              >
                <option value="">Select outcome</option>
                {EXAMINATION_OUTCOMES.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Q3 & 4: Agent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Customs agent name</label>
              <input
                value={form.agent_name}
                onChange={(e) => set('agent_name', e.target.value)}
                placeholder="Full name"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Agent license no.</label>
              <input
                value={form.agent_license}
                onChange={(e) => set('agent_license', e.target.value)}
                placeholder="e.g. KRA/CLA/2024/0042"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
          </div>

          {/* Q5 & 6: Shipping */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Shipping line</label>
              <input
                value={form.shipping_line}
                onChange={(e) => set('shipping_line', e.target.value)}
                placeholder="e.g. MSC, Maersk"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Vessel name</label>
              <input
                value={form.vessel}
                onChange={(e) => set('vessel', e.target.value)}
                placeholder="e.g. MSC Amira"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
          </div>

          {/* Q6: Dwell days + actual duty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Port dwell (days)</label>
              <input
                type="number"
                value={form.dwell_days}
                onChange={(e) => set('dwell_days', e.target.value)}
                placeholder="e.g. 7"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Actual duty paid (KES)</label>
              <input
                type="number"
                value={form.duty_applied_kes}
                onChange={(e) => set('duty_applied_kes', e.target.value)}
                placeholder="e.g. 450000"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
              />
            </div>
          </div>

          {/* Q7: Classification dispute */}
          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-2">Did KRA reclassify or dispute the HS code?</label>
            <div className="flex gap-3">
              {[{ v: true, l: 'Yes — reclassified' }, { v: false, l: 'No dispute' }].map(({ v, l }) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set('classification_dispute', v)}
                  className={`flex-1 py-2.5 text-xs font-semibold border transition-all ${
                    form.classification_dispute === v
                      ? v ? 'border-red-500/50 bg-red-500/10 text-red-400' : 'border-[#00C896] bg-[#00C896]/10 text-[#00C896]'
                      : 'border-[#1E3A5F] text-[#64748B] hover:border-[#334155]'
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            {form.classification_dispute && (
              <input
                value={form.disputed_hs_code}
                onChange={(e) => set('disputed_hs_code', e.target.value)}
                placeholder="HS code KRA applied instead"
                className="w-full mt-2 px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-red-500/50"
              />
            )}
          </div>

          {/* Q8: Notes */}
          <div>
            <label className="text-xs font-semibold text-[#94A3B8] block mb-1">Any other notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              rows={3}
              placeholder="Unusual fees, delays, regulator behaviour, anything worth noting for next time..."
              className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896] resize-none"
            />
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-[#1E3A5F] text-[#64748B] rounded-xl text-sm hover:text-white hover:border-[#2E4A6F] transition-all"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00A87E] transition-colors disabled:opacity-60"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : null}
              {saving ? 'Saving…' : 'Save debrief'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
