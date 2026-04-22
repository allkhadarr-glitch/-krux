'use client'
import { useState, useEffect } from 'react'
import { Shipment } from '@/lib/types'
import { getShipments } from '@/lib/supabase'
import { formatUSD, formatDate, daysUntilDeadline } from '@/lib/utils'
import { RiskBadge, RegulatorBadge } from '@/components/RiskBadge'
import { FileText, Calculator, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'

export default function AgentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [generating, setGenerating] = useState<string | null>(null)
  const [generated, setGenerated] = useState<Record<string, { quote: string; checklist: string }>>({})

  useEffect(() => {
    getShipments()
      .then(setShipments)
      .finally(() => setLoading(false))
  }, [])

  async function generateAI(s: Shipment) {
    setGenerating(s.id)
    try {
      const [quoteRes, checklistRes] = await Promise.all([
        fetch('/api/ai/tax',      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }),
        fetch('/api/ai/checklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(s) }),
      ])
      const quote = await quoteRes.json()
      const checklist = await checklistRes.json()
      setGenerated((prev) => ({ ...prev, [s.id]: { quote: quote.result, checklist: checklist.result } }))
    } catch {
      setGenerated((prev) => ({ ...prev, [s.id]: { quote: 'Error generating. Check API key.', checklist: 'Error generating.' } }))
    } finally {
      setGenerating(null)
    }
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading shipments...</div>

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Clearing Agents Dashboard</h1>
        <p className="text-[#64748B] text-sm mt-1">AI Tax Quotations · Document Checklists · {shipments.length} shipments</p>
      </div>

      <div className="space-y-3">
        {shipments.map((s) => {
          const days = daysUntilDeadline(s.pvoc_deadline!)
          const isExpanded = expanded === s.id
          const isGenerating = generating === s.id
          const data = generated[s.id]

          return (
            <div key={s.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#1E3A5F]/30 transition-colors"
                onClick={() => setExpanded(isExpanded ? null : s.id)}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">{s.name}</span>
                    <RegulatorBadge body={s.regulatory_body?.code ?? '—'} />
                    <RiskBadge risk={s.risk_flag_status} />
                  </div>
                  <div className="text-xs text-[#64748B] mt-1">
                    CIF {formatUSD(s.cif_value_usd)} · Deadline {formatDate(s.pvoc_deadline!)} · {days}d remaining
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-[#00C896]">{formatUSD(s.total_landed_cost_usd!)}</div>
                  <div className="text-xs text-[#64748B]">Landed Cost</div>
                </div>
                {isExpanded ? <ChevronUp size={16} className="text-[#64748B]" /> : <ChevronDown size={16} className="text-[#64748B]" />}
              </div>

              {isExpanded && (
                <div className="px-5 pb-5 border-t border-[#1E3A5F] pt-4 space-y-4">
                  {!data && (
                    <button
                      onClick={() => generateAI(s)}
                      disabled={!!isGenerating}
                      className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-semibold hover:bg-[#00A87E] transition-colors disabled:opacity-50"
                    >
                      {isGenerating ? <Loader2 size={14} className="animate-spin" /> : <Calculator size={14} />}
                      {isGenerating ? 'Generating...' : 'Generate AI Tax Quotation + Checklist'}
                    </button>
                  )}
                  {data && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Calculator size={14} className="text-[#00C896]" />
                          <span className="text-sm font-semibold text-white">AI Tax Quotation</span>
                        </div>
                        <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap font-mono bg-[#0A1628] p-3 rounded-lg border border-[#1E3A5F]">
                          {data.quote}
                        </pre>
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <FileText size={14} className="text-[#00C896]" />
                          <span className="text-sm font-semibold text-white">Document Checklist</span>
                        </div>
                        <pre className="text-xs text-[#94A3B8] whitespace-pre-wrap font-mono bg-[#0A1628] p-3 rounded-lg border border-[#1E3A5F]">
                          {data.checklist}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
