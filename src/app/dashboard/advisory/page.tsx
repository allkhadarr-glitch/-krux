'use client'
import { useState } from 'react'
import { Loader2, AlertTriangle, Compass } from 'lucide-react'

const REGULATORS = [
  { code: 'PPB',    name: 'PPB — Pharmacy & Poisons Board' },
  { code: 'KEBS',   name: 'KEBS — Kenya Bureau of Standards' },
  { code: 'EPRA',   name: 'EPRA — Energy & Petroleum Regulatory Authority' },
  { code: 'KEPHIS', name: 'KEPHIS — Kenya Plant Health Inspectorate' },
  { code: 'PCPB',   name: 'PCPB — Pest Control Products Board' },
  { code: 'DVS',    name: 'DVS — Directorate of Veterinary Services' },
  { code: 'CA',     name: 'CA — Communications Authority' },
  { code: 'NEMA',   name: 'NEMA — National Environment Management Authority' },
]

const ORIGINS = [
  'India', 'China', 'UAE', 'Japan', 'UK', 'USA', 'Germany',
  'Netherlands', 'Belgium', 'Singapore', 'South Africa', 'Other',
]

interface Result {
  days_available: number
  official_sla:   number
  actual_sla:     number
  actual_avg:     number | null
  sample_size:    number
  buffer:         number
  regulator_name: string
  analysis:       string
}

function gapColor(buffer: number) {
  if (buffer < 0)  return 'text-red-400'
  if (buffer < 7)  return 'text-amber-400'
  return 'text-[#00C896]'
}

function parseAnalysis(text: string) {
  const parts = text.split(/RISKS?:/i)
  const advisory = parts[0].trim()
  const risks = parts[1]
    ? parts[1].split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(Boolean)
    : []
  return { advisory, risks }
}

export default function AdvisoryPage() {
  const [form, setForm] = useState({ goods: '', origin: '', regulator: '', target_eta: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult]   = useState<Result | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }))

  async function assess() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res  = await fetch('/api/ai/advisory', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const parsed = result ? parseAnalysis(result.analysis) : null

  return (
    <div className="p-4 lg:p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00C896]" />
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Pre-Shipment</span>
        </div>
        <h1 className="text-xl font-black text-white">Window Calculator</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Check the regulatory timeline before committing to a PO. Numbers only — you decide.
        </p>
      </div>

      {/* Form */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">What are you importing?</label>
          <input
            value={form.goods}
            onChange={e => set('goods', e.target.value)}
            placeholder="e.g. Amoxicillin 500mg tablets, NPK fertilizer, LED panels"
            className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Origin</label>
            <select
              value={form.origin}
              onChange={e => set('origin', e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
            >
              <option value="">Select origin</option>
              {ORIGINS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-[#94A3B8] mb-1 block">Regulator *</label>
            <select
              value={form.regulator}
              onChange={e => set('regulator', e.target.value)}
              className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
            >
              <option value="">Select regulator</option>
              {REGULATORS.map(r => <option key={r.code} value={r.code}>{r.name}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-[#94A3B8] mb-1 block">Target vessel arrival (ETA) *</label>
          <input
            type="date"
            value={form.target_eta}
            onChange={e => set('target_eta', e.target.value)}
            className="w-full px-3 py-2.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg text-sm text-white focus:outline-none focus:border-[#00C896]"
          />
        </div>

        <button
          onClick={assess}
          disabled={loading || !form.regulator || !form.target_eta}
          className="w-full py-3 bg-[#00C896] text-[#0A1628] rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity"
        >
          {loading
            ? <><Loader2 size={15} className="animate-spin" /> Calculating...</>
            : <><Compass size={15} /> Calculate window</>
          }
        </button>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
      </div>

      {/* Result */}
      {result && parsed && (
        <div className="space-y-4">
          {/* Numbers */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-5">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-4">
              {result.regulator_name}
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              <div>
                <div className="text-[10px] text-[#64748B] mb-1">Days until ETA</div>
                <div className="text-2xl font-black font-mono text-white">{result.days_available}d</div>
              </div>
              <div>
                <div className="text-[10px] text-[#64748B] mb-1">
                  SLA estimate
                  {result.actual_avg !== null && result.sample_size > 0
                    ? ` (${result.sample_size} real clearance${result.sample_size !== 1 ? 's' : ''})`
                    : ' (baseline)'}
                </div>
                <div className="text-2xl font-black font-mono text-white">
                  {result.actual_avg ?? result.actual_sla}d
                </div>
              </div>
              <div>
                <div className="text-[10px] text-[#64748B] mb-1">Gap</div>
                <div className={`text-2xl font-black font-mono ${gapColor(result.buffer)}`}>
                  {result.buffer >= 0 ? '+' : ''}{result.buffer}d
                </div>
              </div>
            </div>

            {/* Gap bar */}
            <div className="mb-4">
              <div className="h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.buffer < 0 ? 'bg-red-500' : result.buffer < 7 ? 'bg-amber-500' : 'bg-[#00C896]'}`}
                  style={{ width: `${Math.min(100, Math.round((result.days_available / (result.actual_avg ?? result.actual_sla)) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-[#334155] mt-1">
                <span>0 days</span>
                <span>{result.actual_avg ?? result.actual_sla}d needed</span>
              </div>
            </div>

            {/* Analysis */}
            <p className="text-[#94A3B8] text-sm leading-relaxed">{parsed.advisory}</p>

            {result.actual_avg !== null && result.sample_size > 0 && (
              <div className="mt-3 flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] mt-1 flex-shrink-0" />
                <p className="text-[10px] text-[#64748B]">
                  Window calculation includes {result.sample_size} real {form.regulator} clearance{result.sample_size !== 1 ? 's' : ''} from your account. Accuracy improves with every shipment closed.
                </p>
              </div>
            )}
          </div>

          {/* Risk factors */}
          {parsed.risks.length > 0 && (
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
              <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">Watch out for</div>
              <ul className="space-y-2">
                {parsed.risks.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#94A3B8]">
                    <span className="text-amber-400 mt-0.5 flex-shrink-0">·</span>
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* SLA reference */}
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest mb-3">SLA Reference</div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">Official SLA ({form.regulator})</span>
                <span className="text-white font-mono">{result.official_sla} days</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#64748B]">KRUX baseline (actual)</span>
                <span className="text-white font-mono">{result.actual_sla} days</span>
              </div>
              {result.actual_avg !== null && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Your org's actual avg</span>
                  <span className="text-[#00C896] font-mono font-bold">{result.actual_avg} days</span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-[#1E3A5F]">
              <p className="text-[10px] text-[#334155] leading-relaxed">
                Based on KRUX regulatory research · May 2026
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
