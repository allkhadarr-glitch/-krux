'use client'
import { useState, useMemo } from 'react'
import { Search, AlertTriangle, CheckCircle2, Info, Zap, Sparkles, Loader2, ChevronDown, ChevronRight } from 'lucide-react'
import { HS_DATABASE, HS_CATEGORIES, searchHS, type HSCodeEntry } from '@/lib/hs-intelligence'

function DutyBadge({ pct, label }: { pct: number; label: string }) {
  const color = pct === 0 ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    : pct <= 10 ? 'text-blue-400 bg-blue-400/10 border-blue-400/30'
    : pct <= 25 ? 'text-amber-400 bg-amber-400/10 border-amber-400/30'
    : 'text-red-400 bg-red-400/10 border-red-400/30'
  return (
    <div className={`flex flex-col items-center px-3 py-2 rounded-lg border ${color}`}>
      <span className="text-lg font-black tabular-nums">{pct}%</span>
      <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">{label}</span>
    </div>
  )
}

function RiskBadge({ risk }: { risk: 'CRITICAL' | 'HIGH' | 'MEDIUM' }) {
  const styles = {
    CRITICAL: 'text-red-400 bg-red-400/10 border border-red-400/30',
    HIGH:     'text-amber-400 bg-amber-400/10 border border-amber-400/30',
    MEDIUM:   'text-blue-400 bg-blue-400/10 border border-blue-400/30',
  }
  return (
    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${styles[risk]}`}>{risk}</span>
  )
}

function HSCard({ entry, autoExpand }: { entry: HSCodeEntry; autoExpand?: boolean }) {
  const [expanded, setExpanded]   = useState(autoExpand ?? false)
  const [aiResult, setAiResult]   = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const totalLevies = entry.import_duty_pct + entry.vat_pct + entry.idf_levy_pct + entry.rdl_levy_pct
  const effectiveRate = entry.import_duty_pct + entry.vat_pct + entry.idf_levy_pct + entry.rdl_levy_pct

  async function getAIAnalysis() {
    setAiLoading(true)
    try {
      const res  = await fetch('/api/ai/hs-analysis', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ code: entry.code, description: entry.description, category: entry.category }),
      })
      const data = await res.json()
      setAiResult(data.result ?? data.error ?? 'No response')
    } catch {
      setAiResult('Failed to generate — check ANTHROPIC_API_KEY')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden hover:border-[#00C896]/30 transition-colors">
      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-black text-white text-lg tracking-tight">{entry.code}</span>
              <span className="text-[10px] text-[#64748B] bg-[#1E3A5F] px-2 py-0.5 rounded-full">{entry.category}</span>
            </div>
            <p className="text-sm text-[#94A3B8] leading-relaxed">{entry.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {entry.pvoc_required ? (
              <span className="text-[9px] font-bold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded">PVoC ✓</span>
            ) : (
              <span className="text-[9px] font-bold text-[#64748B] bg-[#1E3A5F] border border-[#1E3A5F] px-1.5 py-0.5 rounded">No PVoC</span>
            )}
          </div>
        </div>

        {/* Duty breakdown */}
        <div className="flex gap-2 mb-4">
          <DutyBadge pct={entry.import_duty_pct} label="Import Duty" />
          <DutyBadge pct={entry.vat_pct} label="VAT" />
          <DutyBadge pct={entry.idf_levy_pct} label="IDF" />
          <DutyBadge pct={entry.rdl_levy_pct} label="RDL" />
          <div className="flex flex-col items-center px-3 py-2 rounded-lg border border-[#00C896]/30 bg-[#00C896]/5 text-[#00C896]">
            <span className="text-lg font-black tabular-nums">{effectiveRate.toFixed(1)}%</span>
            <span className="text-[9px] font-semibold uppercase tracking-wide opacity-70">Total</span>
          </div>
        </div>

        {entry.excise_note && (
          <div className="flex items-start gap-2 mb-3 px-3 py-2 bg-amber-400/5 border border-amber-400/20 rounded-lg">
            <Info size={12} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300/90">{entry.excise_note}</p>
          </div>
        )}

        {/* Regulators */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[10px] text-[#64748B]">Regulator{entry.regulator_codes.length !== 1 ? 's' : ''}:</span>
          {entry.regulator_codes.map((r) => (
            <span key={r} className="text-[10px] font-bold text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/30 px-2 py-0.5 rounded">
              {r}
            </span>
          ))}
        </div>

        {/* Misclassification warnings */}
        {entry.misclassifications.length > 0 && (
          <div className="space-y-2 mb-3">
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle size={10} className="text-amber-400" /> Misclassification Risks
            </p>
            {entry.misclassifications.map((m) => (
              <div key={m.wrong_code} className="flex items-start gap-2.5 p-2.5 bg-[#0A1628] border border-[#1E3A5F] rounded-lg">
                <AlertTriangle size={11} className="text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-white">{entry.code}</span>
                    <span className="text-[10px] text-[#64748B]">→ mistakenly filed as</span>
                    <span className="text-xs font-bold text-red-400">{m.wrong_code}</span>
                    <RiskBadge risk={m.risk} />
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-relaxed">{m.description} ({m.wrong_duty_pct}% duty)</p>
                  <p className="text-[10px] text-amber-300/80 mt-1 leading-relaxed">{m.consequence}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
        >
          {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          {expanded ? 'Hide' : 'Show'} KRA intelligence + clearance tips
        </button>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-[#1E3A5F] p-5 space-y-4 bg-[#0A1628]/50">
          <div>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Zap size={9} className="text-red-400" /> KRA Officer Focus
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{entry.kra_notes}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <CheckCircle2 size={9} className="text-[#00C896]" /> Fastest Clearance Tip
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed">{entry.clearance_tip}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5 flex items-center gap-1">
              <Info size={9} className="text-blue-400" /> Statutory Reference
            </p>
            <p className="text-xs text-[#94A3B8] leading-relaxed italic">{entry.statutory_note}</p>
          </div>

          {/* AI deep analysis */}
          <div className="pt-2 border-t border-[#1E3A5F]">
            {!aiResult ? (
              <button
                onClick={getAIAnalysis}
                disabled={aiLoading}
                className="flex items-center gap-2 text-xs text-[#64748B] hover:text-[#00C896] transition-colors disabled:opacity-40"
              >
                {aiLoading ? <Loader2 size={11} className="animate-spin" /> : <Sparkles size={11} />}
                {aiLoading ? 'Generating AI analysis...' : 'Get AI deep analysis for this code'}
              </button>
            ) : (
              <div>
                <p className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Sparkles size={9} className="text-[#00C896]" /> AI Analysis
                </p>
                <pre className="whitespace-pre-wrap text-[11px] text-[#94A3B8] leading-relaxed font-sans">{aiResult}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const POPULAR_SEARCHES = [
  'jet fuel', 'diesel', 'smartphone', 'laptop', 'rice', 'car',
  'LED lights', 'fertilizer', 'vitamins', 'pesticide', 'LPG', 'palm oil',
]

export default function HSLookupPage() {
  const [query, setQuery]       = useState('')
  const [category, setCategory] = useState('All')

  const results = useMemo(() => {
    const bySearch = searchHS(query)
    return category === 'All' ? bySearch : bySearch.filter((e) => e.category === category)
  }, [query, category])

  const singleResult = results.length === 1

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-2 h-2 rounded-full bg-[#00C896]" />
          <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Kenya Customs Intelligence</span>
        </div>
        <h1 className="text-2xl font-black text-white">HS Code Lookup</h1>
        <p className="text-[#64748B] text-sm mt-1">
          Type a product name — get duty rates, regulators, and misclassification risks instantly.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#64748B]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. jet fuel, smartphone, rice, NPK fertilizer, Probox…"
          className="w-full pl-11 pr-4 py-3.5 bg-[#0F2040] border border-[#1E3A5F] rounded-xl text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896]/50 focus:ring-1 focus:ring-[#00C896]/20"
        />
      </div>

      {/* Popular searches — show only when search is empty */}
      {!query && (
        <div className="flex gap-2 flex-wrap mb-4">
          <span className="text-[10px] text-[#334155] font-semibold uppercase tracking-wide self-center">Popular:</span>
          {POPULAR_SEARCHES.map((term) => (
            <button
              key={term}
              onClick={() => setQuery(term)}
              className="px-2.5 py-1 rounded-lg text-xs text-[#64748B] border border-[#1E3A5F] hover:border-[#00C896]/40 hover:text-white transition-all"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap mb-5">
        {['All', ...HS_CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              category === cat
                ? 'bg-[#00C896]/10 text-[#00C896] border-[#00C896]/30'
                : 'text-[#64748B] border-[#1E3A5F] hover:border-[#00C896]/30 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results count */}
      {query && (
        <p className="text-xs text-[#64748B] mb-4">
          {results.length === 0
            ? 'No results'
            : `${results.length} result${results.length !== 1 ? 's' : ''}${singleResult ? ' — expanded below' : ' · click any card for KRA intelligence'}`}
        </p>
      )}

      {/* Results */}
      <div className="space-y-4">
        {results.length === 0 && query ? (
          <div className="text-center py-16">
            <Search size={32} className="text-[#334155] mx-auto mb-3" />
            <p className="text-[#64748B] text-sm">No HS codes match &ldquo;{query}&rdquo;.</p>
            <p className="text-[#334155] text-xs mt-2">Try a product trade name, brand, or partial code (e.g. 2710, DAP, Amoxicillin)</p>
            <div className="flex gap-2 flex-wrap justify-center mt-4">
              {POPULAR_SEARCHES.slice(0, 6).map((term) => (
                <button key={term} onClick={() => setQuery(term)}
                  className="px-2.5 py-1 rounded-lg text-xs text-[#64748B] border border-[#1E3A5F] hover:border-[#00C896]/40 hover:text-white transition-all">
                  {term}
                </button>
              ))}
            </div>
          </div>
        ) : (
          results.map((entry) => <HSCard key={entry.code} entry={entry} autoExpand={singleResult} />)
        )}
      </div>
    </div>
  )
}
