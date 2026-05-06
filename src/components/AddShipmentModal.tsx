'use client'
import { useState, useEffect, useRef } from 'react'
import { X, Loader2, Plus, TrendingUp, Sparkles, CheckCircle2, Upload, FileText, AlertTriangle, Ship, Info, Copy, Share2 } from 'lucide-react'
import { Shipment } from '@/lib/types'

const EXCHANGE_RATE_FALLBACK = 129

interface RegulatoryBody { id: string; code: string; name: string }
interface HsCode { code: string; description: string; duty: number; category: string; regulator: string }
interface ShipmentTemplate {
  id: string; name: string; hs_code: string | null; origin_country: string | null
  regulatory_body_id: string | null; cif_value_usd: number | null
  storage_rate_per_day: number | null; weight_kg: number | null; use_count: number
  regulatory_body: { code: string; full_name: string } | null
}

const REGULATOR_RISK: Record<string, 'GREEN' | 'AMBER' | 'RED'> = {
  EPRA:  'RED',
  PPB:   'RED',
  DVS:   'RED',
  KEPHIS:'RED',
  CA:    'AMBER',
  PCPB:  'AMBER',
  KEBS:  'AMBER',
  KRA:   'AMBER',
}

const REGULATOR_DOCS: Record<string, string[]> = {
  PPB:    ['PPB Import Permit', 'Certificate of Analysis', 'Good Manufacturing Practice cert', 'Product dossier'],
  EPRA:   ['EPRA Import Licence', 'Petroleum Storage Licence', 'NEMA approval', 'Safety Data Sheet'],
  KEPHIS: ['Phytosanitary Certificate (origin)', 'KEPHIS Import Permit', 'Fumigation cert'],
  DVS:    ['Sanitary Import Permit (pre-shipment)', 'Veterinary Health Certificate', 'Cold chain logs', 'Establishment registration'],
  CA:     ['Type Approval Certificate', 'Technical specifications', 'FCC/CE test reports'],
  KEBS:   ['PVoC Certificate of Conformity', 'KEBS Import Permit', 'Test reports'],
  PCPB:   ['PCPB Registration cert', 'Efficacy & safety data', 'Phytosanitary Certificate'],
  KRA:    ['IDF Declaration', 'Customs Entry Form', 'Commercial Invoice + Packing List'],
}

const STAGES = [
  { value: 'PRE_SHIPMENT', label: 'Pre-Shipment' },
  { value: 'IN_TRANSIT',   label: 'In Transit' },
  { value: 'AT_PORT',      label: 'At Port' },
  { value: 'CUSTOMS',      label: 'In Customs' },
  { value: 'CLEARED',      label: 'Cleared' },
]

const ORIGINS = [
  'Mumbai, India', 'Chennai, India', 'Delhi, India', 'Bangalore, India',
  'Shanghai, China', 'Shenzhen, China', 'Guangzhou, China', 'Ningbo, China',
  'Dubai, UAE', 'Jebel Ali, UAE', 'Singapore', 'Nagoya, Japan', 'Tokyo, Japan',
  'London, UK', 'Amsterdam, Netherlands', 'Antwerp, Belgium', 'Other',
]

function calcPreview(cif: number, dutyPct: number, kesRate: number) {
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
    totalKES: Math.round(total * kesRate),
    taxPct: Math.round(((total - cif) / total) * 100),
  }
}

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
        placeholder="Search product or HS code (e.g. car, 8703, cement)…"
        className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
      />
      {open && results.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {results.map((h) => (
            <button
              key={h.code}
              type="button"
              onClick={() => { onSelect(h); setQuery(`${h.code} — ${h.description}`); setOpen(false) }}
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
  defaultClientName,
}: {
  onClose: () => void
  onAdded: (s: Shipment) => void
  defaultClientName?: string
}) {
  const [bodies, setBodies]           = useState<RegulatoryBody[]>([])
  const [templates, setTemplates]     = useState<ShipmentTemplate[]>([])
  const [appliedTpl, setAppliedTpl]   = useState<string | null>(null)
  const [saving, setSaving]           = useState(false)
  const [suggesting, setSuggesting]   = useState(false)
  const [suggested, setSuggested]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [createdId, setCreatedId]     = useState<string | null>(null)
  const [extracting, setExtracting]   = useState(false)
  const [extracted, setExtracted]     = useState<string | null>(null)
  const [kesRate, setKesRate]         = useState(EXCHANGE_RATE_FALLBACK)
  const [regulatorCode, setRegulatorCode] = useState<string | null>(null)
  const [clientLink, setClientLink]   = useState<string | null>(null)
  const [linkCopied, setLinkCopied]   = useState(false)
  const extractRef                    = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    name: '', origin_port: '', origin_country: '', hs_code: '',
    product_description: '', cif_value_usd: '', import_duty_pct: '25',
    pvoc_deadline: '', regulatory_body_id: '', storage_rate_per_day: '',
    risk_flag_status: 'AMBER', client_name: defaultClientName ?? '',
    vessel_name: '', bl_number: '', eta: '',
    shipment_stage: 'PRE_SHIPMENT', weight_kg: '',
    shipping_line: '', customs_agent: '', customs_agent_license: '',
  })

  useEffect(() => {
    fetch('/api/regulatory-bodies').then((r) => r.json()).then(setBodies)
    fetch('/api/fx/rate').then(r => r.json()).then(d => { if (d.usd_kes) setKesRate(d.usd_kes) }).catch(() => {})
    fetch('/api/templates').then(r => r.json()).then(d => { if (Array.isArray(d)) setTemplates(d) }).catch(() => {})
  }, [])

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  async function applyTemplate(tpl: ShipmentTemplate) {
    const code = tpl.regulatory_body?.code ?? null
    const risk = code ? (REGULATOR_RISK[code] ?? 'AMBER') : form.risk_flag_status
    setForm(f => ({
      ...f,
      origin_country:       tpl.origin_country        ?? f.origin_country,
      hs_code:              tpl.hs_code               ?? f.hs_code,
      regulatory_body_id:   tpl.regulatory_body_id    ?? f.regulatory_body_id,
      risk_flag_status:     risk,
      cif_value_usd:        tpl.cif_value_usd        != null ? String(tpl.cif_value_usd)        : f.cif_value_usd,
      storage_rate_per_day: tpl.storage_rate_per_day != null ? String(tpl.storage_rate_per_day) : f.storage_rate_per_day,
      weight_kg:            tpl.weight_kg            != null ? String(tpl.weight_kg)            : f.weight_kg,
    }))
    if (code) setRegulatorCode(code)
    if (tpl.hs_code) {
      try {
        const d = await fetch(`/api/hs-codes?q=${encodeURIComponent(tpl.hs_code)}`).then(r => r.json())
        if (Array.isArray(d) && d.length > 0) setForm(f => ({ ...f, import_duty_pct: String(d[0].duty || 25) }))
      } catch {}
    }
    fetch(`/api/templates/${tpl.id}`, { method: 'PATCH' }).catch(() => {})
    setAppliedTpl(tpl.id)
  }
  const preview = calcPreview(Number(form.cif_value_usd), Number(form.import_duty_pct), kesRate)

  function onHsSelect(hs: HsCode) {
    const risk = REGULATOR_RISK[hs.regulator] ?? 'AMBER'
    const match = bodies.find((b) => b.code === hs.regulator)
    setRegulatorCode(hs.regulator)
    setForm((f) => ({
      ...f,
      hs_code:           hs.code,
      import_duty_pct:   String(hs.duty || 25),
      risk_flag_status:  risk,
      regulatory_body_id: match ? match.id : f.regulatory_body_id,
    }))
  }

  function onRegulatorChange(id: string) {
    set('regulatory_body_id', id)
    const b = bodies.find((b) => b.id === id)
    if (b) {
      setRegulatorCode(b.code)
      const risk = REGULATOR_RISK[b.code] ?? 'AMBER'
      setForm((f) => ({ ...f, regulatory_body_id: id, risk_flag_status: risk }))
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
          weight_kg:            form.weight_kg ? Number(form.weight_kg) : undefined,
          regulatory_body_id:   form.regulatory_body_id || undefined,
          vessel_name:           form.vessel_name || undefined,
          bl_number:             form.bl_number || undefined,
          eta:                   form.eta || undefined,
          shipment_stage:        form.shipment_stage,
          shipping_line:         form.shipping_line || undefined,
          customs_agent:         form.customs_agent || undefined,
          customs_agent_license: form.customs_agent_license || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to create shipment')
      setCreatedId(data.id)
      onAdded(data)

      // Fire-and-forget: seed Action Centre with AI-generated actions for this shipment
      fetch(`/api/shipments/${data.id}/suggest-actions`, { method: 'POST' }).catch(() => {})

      // Auto-generate client share link if client name was provided
      if (form.client_name?.trim()) {
        fetch('/api/client-share', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_name: form.client_name.trim(), expires_days: 30 }),
        })
          .then((r) => r.json())
          .then((d) => { if (d.url) setClientLink(d.url) })
          .catch(() => {})
      }
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
        vessel_name:         e.vessel_name       ?? f.vessel_name,
        bl_number:           e.bl_number         ?? f.bl_number,
        eta:                 e.eta               ?? f.eta,
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

  const riskColor = form.risk_flag_status === 'RED' ? 'text-red-400' : form.risk_flag_status === 'GREEN' ? 'text-[#00C896]' : 'text-amber-400'
  const regDocs = regulatorCode ? REGULATOR_DOCS[regulatorCode] : null

  // Post-creation screen
  if (createdId) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-md p-8 text-center">
          <CheckCircle2 size={40} className="text-[#00C896] mx-auto mb-4" />
          <h2 className="text-white font-bold text-xl mb-2">Shipment Created</h2>
          <p className="text-[#64748B] text-sm mb-5">
            {form.name} — KES {preview?.totalKES.toLocaleString() ?? '—'} estimated landed cost
          </p>

          {/* Client share link — auto-generated */}
          {form.client_name && (
            <div className="mb-4 bg-[#0F2040] border border-[#00C896]/25 rounded-xl p-3.5">
              <div className="flex items-center gap-2 mb-2">
                <Share2 size={13} className="text-[#00C896]" />
                <span className="text-xs font-semibold text-[#00C896]">
                  Client link ready — share with {form.client_name}
                </span>
              </div>
              {clientLink ? (
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-[11px] text-[#64748B] font-mono truncate bg-[#0A1628] px-2 py-1.5 rounded-lg border border-[#1E3A5F]">
                    {clientLink}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(clientLink)
                      setLinkCopied(true)
                      setTimeout(() => setLinkCopied(false), 2000)
                    }}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                      linkCopied ? 'bg-[#00C896]/20 text-[#00C896]' : 'bg-[#1E3A5F] text-white hover:bg-[#00C896]/20 hover:text-[#00C896]'
                    }`}
                  >
                    <Copy size={11} />
                    {linkCopied ? 'Copied!' : 'Copy'}
                  </button>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(`Your shipment is live on KRUX. Track it here: ${clientLink}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-500/15 text-green-400 hover:bg-green-500/25 transition-all flex-shrink-0"
                  >
                    WhatsApp
                  </a>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-[#64748B]">
                  <Loader2 size={12} className="animate-spin" /> Generating link…
                </div>
              )}
            </div>
          )}

          {!suggested ? (
            <div className="space-y-3">
              <button onClick={suggestActions} disabled={suggesting}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm hover:bg-[#00C896]/90 disabled:opacity-50 transition-colors">
                {suggesting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {suggesting ? 'Generating actions…' : 'AI: Generate Action Checklist'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-3xl max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F] sticky top-0 bg-[#0A1628] z-10">
          <div>
            <h2 className="text-white font-bold text-lg">Add Shipment</h2>
            <p className="text-xs text-[#64748B] mt-0.5">New import compliance record · Kenya</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors p-1">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-6">

          {/* Templates */}
          {templates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Start from template</h3>
              <div className="flex flex-wrap gap-2">
                {templates.map(tpl => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl)}
                    className={`flex items-center gap-2 px-3 py-2 border transition-all ${
                      appliedTpl === tpl.id
                        ? 'border-[#00C896] bg-[#00C896]/10'
                        : 'border-[#1E3A5F] bg-[#0F2040] hover:border-[#00C896]/40'
                    }`}
                  >
                    {tpl.regulatory_body && (
                      <span className={`font-mono text-[10px] font-bold px-1.5 py-0.5 ${
                        appliedTpl === tpl.id ? 'bg-[#00C896]/20 text-[#00C896]' : 'bg-[#1E3A5F] text-[#64748B]'
                      }`}>
                        {tpl.regulatory_body.code}
                      </span>
                    )}
                    <span className={`text-xs font-medium truncate max-w-[160px] ${appliedTpl === tpl.id ? 'text-[#00C896]' : 'text-[#94A3B8]'}`}>
                      {tpl.name}
                    </span>
                    {tpl.use_count > 0 && (
                      <span className="text-[10px] text-[#334155] flex-shrink-0">{tpl.use_count}×</span>
                    )}
                  </button>
                ))}
              </div>
              {appliedTpl && (
                <p className="text-[10px] text-[#00C896]">Template applied — fill in shipment name, vessel, ETA and dates</p>
              )}
            </div>
          )}

          {/* Document extraction */}
          <div
            onClick={() => extractRef.current?.click()}
            className={`border border-dashed rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${
              extracting || extracted ? 'border-[#00C896]/40 bg-[#00C896]/5' : 'border-[#1E3A5F] hover:border-[#00C896]/40 hover:bg-[#00C896]/5'
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
                {extracting ? 'Reading document…' : extracted ? 'Document extracted' : 'Auto-fill from document'}
              </p>
              <p className="text-xs text-[#64748B] truncate">
                {extracting ? 'Claude is reading your document' : extracted ? `${extracted} — fields pre-filled below` : 'Upload Bill of Lading, Invoice, or Packing List'}
              </p>
            </div>
            {!extracting && !extracted && (
              <span className="text-xs text-[#00C896] font-medium flex-shrink-0 flex items-center gap-1">
                <FileText size={12} /> PDF / Image
              </span>
            )}
          </div>

          {/* Shipment Identity */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Shipment Details</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-[#94A3B8] mb-1 block">Shipment Name *</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)}
                  placeholder="e.g. PHARMA CONSIGNMENT — PPB Q2 2026"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="text-xs text-[#94A3B8] mb-1 block">Client / Importer</label>
                <input value={form.client_name} onChange={(e) => set('client_name', e.target.value)}
                  placeholder="e.g. Acme Pharmaceuticals Ltd"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
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
                <label className="text-xs text-[#94A3B8] mb-1 block">Product Description</label>
                <input value={form.product_description} onChange={(e) => set('product_description', e.target.value)}
                  placeholder="e.g. Pharmaceutical tablets — antibiotics"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
          </div>

          {/* HS Code + Compliance — smart section */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">HS Code & Compliance</h3>
            <div>
              <label className="text-xs text-[#94A3B8] mb-1 block">HS Code — type product name or code</label>
              <HsCodeSearch value={form.hs_code} onSelect={onHsSelect} />
            </div>

            {form.hs_code && (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono font-bold text-[#00C896]">{form.hs_code}</span>
                <span className="text-[#64748B]">·</span>
                <span className="text-[#94A3B8]">{form.import_duty_pct}% import duty</span>
                <span className="text-[#64748B]">·</span>
                <span className={`font-semibold ${riskColor}`}>{form.risk_flag_status} risk (auto-set)</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Regulatory Body</label>
                <select value={form.regulatory_body_id} onChange={(e) => onRegulatorChange(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]">
                  <option value="">Select regulator</option>
                  {bodies.map((b) => <option key={b.id} value={b.id}>{b.code} — {b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">PVoC / Clearance Deadline</label>
                <input type="date" value={form.pvoc_deadline} onChange={(e) => set('pvoc_deadline', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>

            {/* Regulatory document requirements — shown when regulator is known */}
            {regDocs && (
              <div className={`rounded-xl border px-4 py-3 ${
                form.risk_flag_status === 'RED'
                  ? 'bg-red-500/5 border-red-500/20'
                  : 'bg-amber-500/5 border-amber-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  {form.risk_flag_status === 'RED'
                    ? <AlertTriangle size={13} className="text-red-400 flex-shrink-0" />
                    : <Info size={13} className="text-amber-400 flex-shrink-0" />
                  }
                  <span className={`text-xs font-semibold ${form.risk_flag_status === 'RED' ? 'text-red-400' : 'text-amber-400'}`}>
                    {regulatorCode} required documents
                  </span>
                </div>
                <ul className="space-y-1">
                  {regDocs.map((doc) => (
                    <li key={doc} className="text-xs text-[#94A3B8] flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-[#64748B] flex-shrink-0" />
                      {doc}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Logistics */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-[#64748B] uppercase tracking-wide flex items-center gap-2">
              <Ship size={12} /> Logistics
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Current Stage</label>
                <select value={form.shipment_stage} onChange={(e) => set('shipment_stage', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]">
                  {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">ETA Mombasa</label>
                <input type="date" value={form.eta} onChange={(e) => set('eta', e.target.value)}
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Vessel Name *</label>
                <input required value={form.vessel_name} onChange={(e) => set('vessel_name', e.target.value)}
                  placeholder="e.g. MSC Amira"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Shipping Line *</label>
                <input required value={form.shipping_line} onChange={(e) => set('shipping_line', e.target.value)}
                  placeholder="e.g. MSC, Maersk, CMA CGM"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Bill of Lading No.</label>
                <input value={form.bl_number} onChange={(e) => set('bl_number', e.target.value)}
                  placeholder="e.g. MSCU12345678"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Weight (kg)</label>
                <input type="number" value={form.weight_kg} onChange={(e) => set('weight_kg', e.target.value)}
                  placeholder="e.g. 2400"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Customs Agent</label>
                <input value={form.customs_agent} onChange={(e) => set('customs_agent', e.target.value)}
                  placeholder="Agent name"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            </div>
            {form.customs_agent && (
              <div>
                <label className="text-xs text-[#94A3B8] mb-1 block">Agent License No.</label>
                <input value={form.customs_agent_license} onChange={(e) => set('customs_agent_license', e.target.value)}
                  placeholder="e.g. KRA/CLA/2024/0042"
                  className="w-full px-3 py-2 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]" />
              </div>
            )}
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp size={14} className="text-[#00C896]" />
                    <span className="text-xs font-semibold text-[#00C896] uppercase tracking-wide">Live Landed Cost Estimate</span>
                  </div>
                  <span className="text-[10px] text-[#64748B]">1 USD = KES {kesRate}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                  {[
                    { label: 'Import Duty', val: preview.duty },
                    { label: 'VAT (16%)',   val: preview.vat },
                    { label: 'IDF (2%)',    val: preview.idf },
                    { label: 'RDL (1.5%)', val: preview.rdl },
                    { label: 'PVoC Fee',   val: preview.pvoc },
                    { label: 'Clearing',   val: preview.clearing },
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
                    <div className="text-xs text-[#64748B] mb-0.5">KES equivalent</div>
                    <div className="text-sm font-bold text-white">KES {preview.totalKES.toLocaleString()}</div>
                    <div className="text-[10px] text-[#64748B]">Taxes = {preview.taxPct}% of total</div>
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
            {saving ? 'Creating shipment…' : 'Create Shipment'}
          </button>
        </form>
      </div>
    </div>
  )
}
