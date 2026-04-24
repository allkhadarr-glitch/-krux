'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Plus, TrendingUp, Sparkles, CheckCircle2, Upload, FileText } from 'lucide-react'
import { Shipment } from '@/lib/types'

const EXCHANGE_RATE = 129

interface RegulatoryBody { id: string; code: string; name: string }
interface HsCode { code: string; description: string; duty: number; category: string; regulator: string }

function calcPreview(cif: number, dutyPct: number) {
  if (!cif) return null
  const duty     = cif * (dutyPct / 100)
  const idf      = cif * 0.02
  const rdl      = cif * 0.015
  const pvoc     = 500
  const clearing = 800
  const vat      = (cif + duty) * 0.16
  const total    = cif + duty + idf + rdl + pvoc + clearing + vat
  return {
    duty: Math.round(duty), idf: Math.round(idf), rdl: Math.round(rdl),
    vat: Math.round(vat), pvoc, clearing, total: Math.round(total),
    totalKES: Math.round(total * EXCHANGE_RATE),
  }
}

const ORIGINS = [
  'Mumbai, India', 'Chennai, India', 'Delhi, India', 'Bangalore, India',
  'Shanghai, China', 'Shenzhen, China', 'Guangzhou, China',
  'Dubai, UAE', 'Jebel Ali, UAE', 'Singapore',
  'London, UK', 'Amsterdam, Netherlands', 'Tokyo, Japan', 'Other',
]

function HsCodeSearch({ value, onSelect }: { value: string; onSelect: (hs: HsCode) => void }) {
  const [query, setQuery]     = useState(value)
  const [results, setResults] = useState<HsCode[]>([])
  const [open, setOpen]       = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => {
      if (query.length < 2) { setResults([]); return }
      fetch(`/api/hs-codes?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then((d) => { setResults(d); setOpen(d.length > 0) })
    }, 200)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.length >= 2 && results.length > 0 && setOpen(true)}
        placeholder="Search HS code or product type..."
        className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((h) => (
            <button
              key={h.code}
              type="button"
              onClick={() => { onSelect(h); setQuery(h.code); setOpen(false) }}
              className="w-full text-left px-3 py-2.5 hover:bg-[#1E3A5F]/50 transition-colors border-b border-[#1E3A5F]/50 last:border-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#00C896] font-mono">{h.code}</span>
                <span className="text-[10px] text-[#64748B]">{h.duty}% duty · {h.regulator}</span>
              </div>
              <div className="text-xs text-[#94A3B8] mt-0.5 truncate">{h.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function AddShipmentModal({
  onClose,
  onAdded,
}: {
  onClose: () => void
  onAdded: (s: Shipment) => void
}) {
  const [bodies, setBodies]           = useState<RegulatoryBody[]>([])
  const [saving, setSaving]           = useState(false)
  const [suggesting, setSuggesting]   = useState(false)
  const [suggested, setSuggested]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [createdId, setCreatedId]     = useState<string | null>(null)
  const [extracting, setExtracting]   = useState(false)
  const [extracted, setExtracted]     = useState<string | null>(null)
  const extractRef                    = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', origin_port: '', origin_country: '', hs_code: '',
    product_description: '', cif_value_usd: '', import_duty_pct: '25',
    pvoc_deadline: '', regulatory_body_id: '', storage_rate_per_day: '',
    risk_flag_status: 'AMBER',
  })

  useEffect(() => {
    fetch('/api/regulatory-bodies').then((r) => r.json()).then(setBodies)
  }, [])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const preview = calcPreview(Number(form.cif_value_usd), Number(form.import_duty_pct))

  function onHsSelect(hs: HsCode) {
    setForm((f) => ({
      ...f,
      hs_code:        hs.code,
      import_duty_pct: String(hs.duty || 25),
    }))
    // Auto-select matching regulator
    if (hs.regulator) {
      const match = bodies.find((b) => b.code === hs.regulator)
      if (match) setForm((f) => ({ ...f, hs_code: hs.code, import_duty_pct: String(hs.duty || 25), regulatory_body_id: match.id }))
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cif_value_usd:        Number(form.cif_value_usd),
          import_duty_pct:      Number(form.import_duty_pct),
          storage_rate_per_day: form.storage_rate_per_day ? Number(form.storage_rate_per_day) : undefined,
          regulatory_body_id:   form.regulatory_body_id || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create shipment')
      setCreatedId(data.id)
      onAdded(data)
    } catch (e: any) {
      setError(e.message)
      setSaving(false)
    }
  }

  async function extractFromDocument(file: File) {
    setExtracting(true)
    setExtracted(null)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const r = await fetch('/api/documents/extract', { method: 'POST', body: fd })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Extraction failed')
      const e = d.extracted
      setForm((f) => ({
        ...f,
        name:                e.name              ?? f.name,
        origin_port:         e.origin_port       ?? f.origin_port,
        origin_country:      e.origin_country    ?? f.origin_country,
        hs_code:             e.hs_code           ?? f.hs_code,
        product_description: e.product_description ?? f.product_description,
        cif_value_usd:       e.cif_value_usd != null ? String(e.cif_value_usd) : f.cif_value_usd,
      }))
      setExtracted(file.name)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setExtracting(false)
    }
  }

  async function suggestActions() {
    if (!createdId) return
    setSuggesting(true)
    try {
      await fetch(`/api/shipments/${createdId}/suggest-actions`, { method: 'POST' })
      setSuggested(true)
    } catch {}
    finally { setSuggesting(false) }
  }

  // Post-creation screen
  if (createdId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-md p-8 text-center">
          <CheckCircle2 size={40} className="text-[#00C896] mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Shipment Created</h2>
          <p className="text-[#64748B] text-sm mb-6">
            {form.name} — KES {preview?.totalKES.toLocaleString() ?? '—'} estimated landed cost
          </p>
          {!suggested ? (
            <div className="space-y-3">
              <button onClick={suggestActions} disabled={suggesting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 disabled:opacity-50 transition-colors">
                {suggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {suggesting ? 'Generating actions...' : 'AI: Generate Action Checklist'}
              </button>
              <button onClick={onClose} className="w-full py-2.5 border border-[#1E3A5F] text-[#64748B] rounded-xl text-sm hover:text-white hover:border-[#2E4A6F] transition-all">
                Skip — I'll add actions manually
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#00C896]/10 border border-[#00C896]/20 rounded-xl px-4 py-3 text-sm text-[#00C896] font-medium">
                Actions generated — check Action Center
              </div>
              <button onClick={onClose} className="w-full py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 transition-colors">
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F] sticky top-0 bg-[#0A1628] z-10">
          <div>
            <h2 className="text-white font-bold text-lg">Add Shipment</h2>
            <p className="text-xs text-[#64748B] mt-0.5">New import compliance record · Kenya</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">
          {/* Document extraction */}
          <div
            onClick={() => extractRef.current?.click()}
            className={`border border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
              extracting ? 'border-[#00C896]/40 bg-[#00C896]/5' : extracted ? 'border-[#00C896]/40 bg-[#00C896]/5' : 'border-[#1E3A5F] hover:border-[#00C896]/40 hover:bg-[#00C896]/5'
            }`}
          >
            <input
              ref={extractRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) extractFromDocument(f) }}
            />
            <div className="w-9 h-9 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0">
              {extracting ? <Loader2 size={16} className="animate-spin text-[#00C896]" /> : extracted ? <CheckCircle2 size={16} className="text-[#00C896]" /> : <Upload size={16} className="text-[#00C896]" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">
                {extracting ? 'Reading document…' : extracted ? 'Document extracted' : 'Import from document'}
              </p>
              <p className="text-xs text-[#64748B] truncate">
                {extracting ? 'Claude is extracting fields from your document' : extracted ? `${extracted} — fields pre-filled below` : 'Upload a Bill of Lading, Invoice, or Packing List to auto-fill fields'}
              </p>
            </div>
            {!extracting && !extracted && (
              <div className="flex items-center gap-1.5 text-xs text-[#00C896] font-medium flex-shrink-0">
                <FileText size={12} />
                PDF / Image
              </div>
            )}
          </div>

          {/* Shipment Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Shipment Details</h3>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Shipment Name *</label>
              <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. PHARMA CONSIGNMENT — PPB Q2 2026"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Origin Port *</label>
                <select required value={form.origin_port} onChange={(e) => set('origin_port', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]">
                  <option value="">Select origin</option>
                  {ORIGINS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">HS Code</label>
                <HsCodeSearch value={form.hs_code} onSelect={onHsSelect} />
                {form.hs_code && (
                  <p className="text-[10px] text-[#00C896] mt-1 font-mono">{form.hs_code} selected · {form.import_duty_pct}% duty</p>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">Product Description</label>
              <input value={form.product_description} onChange={(e) => set('product_description', e.target.value)}
                placeholder="e.g. Pharmaceutical tablets — antibiotics"
                className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
            </div>
          </div>

          {/* Compliance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Compliance</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Regulatory Body</label>
                <select value={form.regulatory_body_id} onChange={(e) => set('regulatory_body_id', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]">
                  <option value="">Select regulator</option>
                  {bodies.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">PVoC Deadline</label>
                <input type="date" value={form.pvoc_deadline} onChange={(e) => set('pvoc_deadline', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Risk Level</label>
                <select value={form.risk_flag_status} onChange={(e) => set('risk_flag_status', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]">
                  <option value="GREEN">GREEN — Compliant</option>
                  <option value="AMBER">AMBER — At Risk</option>
                  <option value="RED">RED — Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Storage Rate (USD/day)</label>
                <input type="number" value={form.storage_rate_per_day} onChange={(e) => set('storage_rate_per_day', e.target.value)}
                  placeholder="e.g. 150"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
          </div>

          {/* Financials */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Financials</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">CIF Value (USD) *</label>
                <input required type="number" value={form.cif_value_usd} onChange={(e) => set('cif_value_usd', e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Import Duty Rate (%)</label>
                <input type="number" value={form.import_duty_pct} onChange={(e) => set('import_duty_pct', e.target.value)}
                  placeholder="25"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>

            {preview && (
              <div className="bg-[#0F2040] border border-[#00C896]/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp size={14} className="text-[#00C896]" />
                  <span className="text-xs font-semibold text-[#00C896] uppercase tracking-wide">Live Landed Cost Estimate</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  {[
                    { label: 'Import Duty', val: preview.duty }, { label: 'VAT (16%)', val: preview.vat },
                    { label: 'IDF Levy', val: preview.idf }, { label: 'RDL Levy', val: preview.rdl },
                    { label: 'PVoC Fee', val: preview.pvoc }, { label: 'Clearing Fee', val: preview.clearing },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-[#64748B]">{label}</span>
                      <span className="text-[#94A3B8]">${val.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-[#1E3A5F] pt-3 flex justify-between items-end">
                  <div>
                    <div className="text-xs text-[#64748B]">Total Landed Cost</div>
                    <div className="text-xl font-bold text-[#00C896]">${preview.total.toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[#64748B]">In KES</div>
                    <div className="text-sm font-semibold text-white">KES {preview.totalKES.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</div>
          )}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00A87E] transition-colors disabled:opacity-60">
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {saving ? 'Creating shipment...' : 'Create Shipment'}
          </button>
        </form>
      </div>
    </div>
  )
}
