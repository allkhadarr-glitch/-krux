'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2, Zap, RefreshCw } from 'lucide-react'

type HitItem = {
  id:          string
  type:        'WINDOW' | 'ACTION' | 'IMPOSSIBLE'
  priority:    'CRITICAL' | 'URGENT' | 'WATCH'
  title:       string
  detail:      string
  action:      string
  shipment_id: string | null
  ref:         string | null
  kes_at_risk: number
}

type TodayData = {
  items:     HitItem[]
  total:     number
  critical:  number
  total_kes: number
  date:      string
}

const WA = 'https://wa.me/254722902043?text=Hi+KRUX%2C+I+need+urgent+help+with+a+closed+compliance+window.'

export default function MobileTodayPage() {
  const [data, setData]       = useState<TodayData | null>(null)
  const [done, setDone]       = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  function load() {
    setLoading(true)
    fetch('/api/today')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  function markDone(id: string) {
    setDone(prev => new Set([...prev, id]))
  }

  if (loading) return (
    <div className="flex items-center justify-center gap-3 text-[#64748B] py-24">
      <Loader2 size={18} className="animate-spin" />
      <span className="font-mono text-sm">Building hit list…</span>
    </div>
  )

  const items     = data?.items ?? []
  const active    = items.filter(i => !done.has(i.id))
  const doneCount = done.size
  const total     = items.length
  const pct       = total > 0 ? Math.round((doneCount / total) * 100) : 0

  return (
    <div className="bg-[#0A1628] min-h-full">

      {/* Header */}
      <div className="px-4 pt-5 pb-4 border-b border-[#1E3A5F]/60">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap size={14} className="text-[#00C896]" />
              <span className="font-mono text-sm font-bold text-white tracking-widest uppercase">Today</span>
            </div>
            <p className="font-mono text-xs text-[#334155]">{data?.date}</p>
          </div>
          <div className="flex items-center gap-3">
            {total > 0 && (
              <div className="text-right">
                <div className="font-mono text-2xl font-black text-white leading-none">
                  {doneCount}<span className="text-[#334155] text-base font-normal">/{total}</span>
                </div>
                <div className="font-mono text-xs text-[#334155] uppercase tracking-widest mt-0.5">done</div>
              </div>
            )}
            <button
              onClick={load}
              className="w-8 h-8 flex items-center justify-center border border-[#1E3A5F] text-[#334155] hover:text-[#64748B] active:bg-[#1E3A5F]/30"
            >
              <RefreshCw size={13} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {total > 0 && (
          <div className="mt-3 h-1.5 bg-[#1E3A5F] overflow-hidden">
            <div
              className="h-full bg-[#00C896] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>

      <div className="px-3 pt-3 pb-8 space-y-3">

        {/* KES at risk — shown when critical items exist */}
        {data && data.critical > 0 && data.total_kes > 0 && (
          <div className="border border-red-500/30 bg-red-500/8 px-4 py-3">
            <div className="font-mono text-xs text-red-400/60 uppercase tracking-widest mb-1">
              At risk today · {data.critical} critical
            </div>
            <div className="font-mono text-3xl font-black text-red-400 leading-none">
              KES {data.total_kes.toLocaleString()}
            </div>
          </div>
        )}

        {/* All clear */}
        {active.length === 0 && (
          <div className="text-center py-20 space-y-3">
            <CheckCircle2 size={44} className="text-[#00C896] mx-auto" />
            <p className="font-mono text-white font-bold text-lg">All clear.</p>
            <p className="font-mono text-sm text-[#64748B]">
              {total > 0 ? 'Every item done. Good work.' : 'No critical actions or deadlines today.'}
            </p>
          </div>
        )}

        {/* Hit list */}
        {active.map((item, idx) => {
          const isCrit = item.priority === 'CRITICAL'
          const isUrg  = item.priority === 'URGENT'
          const isClosed = item.type === 'IMPOSSIBLE'

          return (
            <div
              key={item.id}
              className={`border overflow-hidden ${
                isCrit ? 'border-red-500/40 bg-red-500/5'
                : isUrg ? 'border-amber-500/30 bg-amber-500/5'
                : 'border-[#1E3A5F] bg-[#0F2040]'
              }`}
            >
              {/* Priority strip */}
              <div className={`h-0.5 w-full ${
                isCrit ? 'bg-red-500' : isUrg ? 'bg-amber-400' : 'bg-[#1E3A5F]'
              }`} />

              {/* Content */}
              <div className="px-4 py-4 space-y-2">
                {/* Badges row */}
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-bold tracking-widest px-2 py-0.5 border ${
                    isCrit ? 'text-red-400 border-red-500/30 bg-red-500/10'
                    : isUrg ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                    : 'text-[#64748B] border-[#1E3A5F] bg-[#1E3A5F]/30'
                  }`}>
                    {item.priority}
                  </span>
                  {isClosed && (
                    <span className="font-mono text-xs font-bold tracking-widest px-2 py-0.5 border text-red-300 border-red-500/30 bg-red-900/30">
                      CLOSED
                    </span>
                  )}
                  <span className="font-mono text-xs text-[#1E3A5F] ml-auto">#{idx + 1}</span>
                </div>

                {/* Title */}
                <p className="font-mono text-base font-bold text-white leading-snug">{item.title}</p>

                {/* Detail */}
                <p className="font-mono text-sm text-[#64748B] leading-relaxed">{item.detail}</p>

                {/* Action */}
                <p className="font-mono text-xs text-[#94A3B8]">{item.action}</p>

                {/* Ref */}
                {item.ref && (
                  <p className="font-mono text-xs text-[#334155]">{item.ref}</p>
                )}

                {/* KES at risk */}
                {item.kes_at_risk > 0 && (
                  <div className="pt-1">
                    <span className="font-mono text-sm font-bold text-red-400">
                      KES {item.kes_at_risk.toLocaleString()} at risk
                    </span>
                  </div>
                )}
              </div>

              {/* Action buttons — full-width, thumb-friendly */}
              <div className={`grid divide-x border-t ${
                isCrit ? 'border-red-500/20 divide-red-500/20'
                : isUrg ? 'border-amber-500/20 divide-amber-500/20'
                : 'border-[#1E3A5F] divide-[#1E3A5F]'
              } ${isClosed || item.shipment_id ? 'grid-cols-2' : 'grid-cols-1'}`}>

                {isClosed ? (
                  <a
                    href={WA}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-4 text-center font-mono text-xs font-bold text-[#25D366] tracking-widest uppercase bg-[#25D366]/5 active:bg-[#25D366]/10"
                  >
                    WhatsApp →
                  </a>
                ) : item.shipment_id ? (
                  <button
                    onClick={() => router.push(`/dashboard/operations?open=${item.shipment_id}`)}
                    className="py-4 text-center font-mono text-xs font-bold text-[#64748B] tracking-widest uppercase active:bg-[#1E3A5F]/30"
                  >
                    Open
                  </button>
                ) : null}

                <button
                  onClick={() => markDone(item.id)}
                  className="py-4 text-center font-mono text-xs font-bold text-[#00C896] tracking-widest uppercase bg-[#00C896]/5 active:bg-[#00C896]/10"
                >
                  Done ✓
                </button>
              </div>
            </div>
          )
        })}

        {/* Completed */}
        {doneCount > 0 && (
          <div className="space-y-1.5 pt-2">
            <p className="font-mono text-xs text-[#1E3A5F] uppercase tracking-widest px-1">Completed today</p>
            {items.filter(i => done.has(i.id)).map(item => (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3 border border-[#1E3A5F]/30 opacity-40">
                <CheckCircle2 size={13} className="text-[#00C896] flex-shrink-0" />
                <span className="font-mono text-sm text-[#64748B] line-through">{item.title}</span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}
