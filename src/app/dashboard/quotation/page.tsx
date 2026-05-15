'use client'
import { useState, useEffect, useRef } from 'react'
import { Printer, Copy, CheckCheck } from 'lucide-react'

type Entity = {
  krux_id: string
  entity_type: string
  name: string
  compliance_tier: string | null
  compliance_score: number | null
  is_verified: boolean
}

const TYPE_LABEL: Record<string, string> = {
  IMP: 'Importer',
  AGT: 'Clearing Agent',
  MFG: 'Manufacturer',
  EXP: 'Exporter',
  BRK: 'Broker',
}

const TIER_COLOR: Record<string, string> = {
  PLATINUM: 'text-cyan-300',
  GOLD:     'text-yellow-400',
  SILVER:   'text-slate-300',
  BRONZE:   'text-orange-400',
}

const REGULATORS = ['KRA', 'KEBS', 'PPB', 'KEPHIS', 'EPRA', 'NEMA', 'DVS', 'PCPB', 'CA']

const PORTS = ['Mombasa Port (ICD)', 'Nairobi Air Cargo', 'Namanga Border', 'Busia Border', 'Malaba Border']

function quoteNumber() {
  const now = new Date()
  const y = now.getFullYear().toString().slice(-2)
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const rand = Math.floor(Math.random() * 900 + 100)
  return `KQ-${y}${m}-${rand}`
}

export default function QuotationPage() {
  const [entity, setEntity] = useState<Entity | null>(null)
  const [clientName, setClientName] = useState('')
  const [goods, setGoods] = useState('')
  const [port, setPort] = useState(PORTS[0])
  const [regulators, setRegulators] = useState<string[]>(['KRA'])
  const [serviceFee, setServiceFee] = useState('')
  const [notes, setNotes] = useState('')
  const [qNum] = useState(quoteNumber)
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/entity')
      .then(r => r.json())
      .then(d => { if (!d.error) setEntity(d) })
      .catch(() => {})
  }, [])

  function toggleRegulator(reg: string) {
    setRegulators(prev =>
      prev.includes(reg) ? prev.filter(r => r !== reg) : [...prev, reg]
    )
  }

  function handlePrint() {
    window.print()
  }

  function copyQuote() {
    if (!entity) return
    const typeLabel = TYPE_LABEL[entity.entity_type] ?? 'Broker'
    const tierPart = entity.compliance_tier ? ` | ${entity.compliance_tier}` : ''
    const text = [
      `QUOTATION — ${qNum}`,
      `Date: ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`,
      ``,
      `From: ${entity.name}`,
      `KTIN: ${entity.krux_id} | ${typeLabel}${tierPart}`,
      `Verified: kruxvon.com/verify/${entity.krux_id}`,
      ``,
      `To: ${clientName || '—'}`,
      `Goods: ${goods || '—'}`,
      `Port of entry: ${port}`,
      `Regulatory bodies: ${regulators.join(', ') || '—'}`,
      ``,
      `Professional service fee: KES ${serviceFee ? Number(serviceFee).toLocaleString() : '—'}`,
      notes ? `\nNotes: ${notes}` : '',
    ].join('\n')
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <style>{`@media print { .no-print { display: none !important } .print-full { width: 100% !important; max-width: 100% !important } }`}</style>

      <div className="no-print">
        <h1 className="text-xl font-bold text-white">Quotation Template</h1>
        <p className="text-[#64748B] text-sm mt-1">Professional trade service quotation with your KTIN embedded</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Form */}
        <div className="no-print space-y-4">
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Client Details</p>

            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Client / Importer Name</label>
              <input
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                placeholder="e.g. Dalsom International Ltd"
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Goods Description</label>
              <textarea
                value={goods}
                onChange={e => setGoods(e.target.value)}
                placeholder="e.g. Pharmaceutical raw materials, 2 x 20ft containers"
                rows={2}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896] resize-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Port of Entry</label>
              <select
                value={port}
                onChange={e => setPort(e.target.value)}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
              >
                {PORTS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 space-y-3">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Regulatory Bodies</p>
            <div className="grid grid-cols-3 gap-2">
              {REGULATORS.map(reg => (
                <label key={reg} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-all ${regulators.includes(reg) ? 'border-[#00C896]/40 bg-[#00C896]/5 text-[#00C896]' : 'border-[#1E3A5F] text-[#64748B] hover:border-[#334155]'}`}>
                  <input type="checkbox" checked={regulators.includes(reg)} onChange={() => toggleRegulator(reg)} className="accent-[#00C896] w-3 h-3" />
                  {reg}
                </label>
              ))}
            </div>
          </div>

          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 space-y-4">
            <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Charges</p>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Professional Service Fee (KES)</label>
              <input
                type="number"
                value={serviceFee}
                onChange={e => setServiceFee(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Government levies and regulatory fees billed separately upon receipt"
                rows={2}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896] resize-none"
              />
            </div>
          </div>
        </div>

        {/* Preview */}
        <div ref={previewRef} className="print-full">
          <div className="no-print flex items-center justify-between mb-3">
            <p className="text-xs text-[#64748B] uppercase tracking-wide">Preview</p>
            <div className="flex items-center gap-2">
              <button
                onClick={copyQuote}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
              >
                {copied ? <CheckCheck size={12} className="text-[#00C896]" /> : <Copy size={12} />}
                {copied ? 'Copied!' : 'Copy text'}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-[#1E3A5F] text-[#64748B] hover:border-[#00C896]/40 hover:text-[#00C896] transition-colors uppercase tracking-widest"
              >
                <Printer size={11} />
                Save as PDF
              </button>
            </div>
          </div>

          {/* Quotation document */}
          <div className="bg-[#0A1628] border border-[#1E3A5F] font-mono text-xs">

            {/* Letterhead */}
            <div className="px-6 py-4 border-b border-[#1E3A5F] flex items-start justify-between">
              <div>
                <p className="text-[#00C896] text-xs font-black tracking-[0.35em] uppercase">KRUX</p>
                <p className="text-[#334155] text-xs tracking-widest uppercase mt-0.5">East Africa&apos;s trade standard</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#334155] uppercase tracking-wide">Service Quotation</p>
                <p className="text-xs text-white font-bold mt-0.5">{qNum}</p>
                <p className="text-xs text-[#334155] mt-0.5">{today}</p>
              </div>
            </div>

            {/* From (entity identity) */}
            <div className="px-6 py-4 border-b border-[#1E3A5F]">
              <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-2">From</p>
              {entity ? (
                <div>
                  <p className="text-sm font-bold text-white">{entity.name}</p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <span className="text-xs text-[#64748B] font-mono">{entity.krux_id}</span>
                    <span className="text-[#334155]">·</span>
                    <span className="text-xs text-[#64748B]">{TYPE_LABEL[entity.entity_type] ?? 'Broker'}</span>
                    {entity.compliance_tier && (
                      <>
                        <span className="text-[#334155]">·</span>
                        <span className={`text-xs font-black tracking-widest ${TIER_COLOR[entity.compliance_tier] ?? 'text-[#64748B]'}`}>
                          {entity.compliance_tier}
                        </span>
                      </>
                    )}
                    {entity.is_verified && (
                      <>
                        <span className="text-[#334155]">·</span>
                        <span className="text-xs text-[#00C896] font-black tracking-wide">VERIFIED</span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-[#334155] mt-1">kruxvon.com/verify/{entity.krux_id}</p>
                </div>
              ) : (
                <p className="text-[#334155] text-xs">Loading entity…</p>
              )}
            </div>

            {/* To (client) */}
            <div className="px-6 py-4 border-b border-[#1E3A5F]">
              <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-2">Prepared for</p>
              <p className="text-sm font-semibold text-white">{clientName || <span className="text-[#334155]">Client name</span>}</p>
              {goods && <p className="text-xs text-[#64748B] mt-1">{goods}</p>}
              <p className="text-xs text-[#334155] mt-1">{port}</p>
            </div>

            {/* Regulatory scope */}
            <div className="px-6 py-4 border-b border-[#1E3A5F]">
              <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-3">Regulatory Scope</p>
              <div className="flex flex-wrap gap-1.5">
                {regulators.length > 0 ? regulators.map(reg => (
                  <span key={reg} className="text-xs border border-[#1E3A5F] px-2 py-0.5 text-[#94A3B8]">{reg}</span>
                )) : (
                  <span className="text-xs text-[#334155]">None selected</span>
                )}
              </div>
            </div>

            {/* Charges */}
            <div className="px-6 py-4 border-b border-[#1E3A5F]">
              <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-3">Charges</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#94A3B8]">Professional service fee</span>
                <span className="text-sm font-black text-white">
                  {serviceFee ? `KES ${Number(serviceFee).toLocaleString()}` : <span className="text-[#334155] text-xs">—</span>}
                </span>
              </div>
              {notes && (
                <p className="text-xs text-[#334155] mt-3 leading-relaxed">{notes}</p>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 flex items-end justify-between">
              <p className="text-xs text-[#1E3A5F] leading-relaxed max-w-xs">
                This quotation is valid for 14 days. Government levies, port charges, and regulatory fees are billed separately.
              </p>
              <div className="text-right">
                <div className="border-t border-[#334155] pt-2 mt-4 min-w-[120px]">
                  <p className="text-xs text-[#334155]">Authorised signature</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
