'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, CheckCircle2, Clock, Loader2, XCircle, Zap } from 'lucide-react'

type ActivityEvent = {
  id:            string
  title:         string
  status:        'DONE' | 'IN_PROGRESS'
  shipment_name: string | null
  portal_ref:    string | null
  timestamp:     string
}

function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>([])

  useEffect(() => {
    fetch('/api/activity/recent')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setEvents(d) : null)
      .catch(() => {})
  }, [])

  if (!events.length) return null

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    const h = Math.floor(m / 60)
    const d = Math.floor(h / 24)
    if (d > 0) return `${d}d ago`
    if (h > 0) return `${h}h ago`
    if (m > 0) return `${m}m ago`
    return 'just now'
  }

  return (
    <div className="space-y-3 pt-2">
      <div className="flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
        <p className="text-xs text-[#64748B] uppercase tracking-widest font-semibold">Recent Activity</p>
      </div>
      <div className="space-y-0">
        {events.map(event => (
          <div key={event.id} className="flex items-start gap-3 py-2 border-b border-[#1E3A5F]/40 last:border-0">
            <span className={`text-xs font-bold mt-0.5 shrink-0 w-3 text-center ${
              event.status === 'DONE' ? 'text-[#00C896]' : 'text-amber-400'
            }`}>
              {event.status === 'DONE' ? '✓' : '→'}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-[#94A3B8] leading-snug">
                {event.title}
                {event.shipment_name && (
                  <span className="text-[#475569]"> · {event.shipment_name}</span>
                )}
              </p>
              {event.portal_ref && (
                <p className="text-xs text-[#475569] font-mono mt-0.5">{event.portal_ref}</p>
              )}
            </div>
            <span className="text-xs text-[#334155] shrink-0 font-mono">{timeAgo(event.timestamp)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

const PRIORITY_STYLE = {
  CRITICAL: {
    border: 'border-red-500/40',
    bg:     'bg-red-500/5',
    badge:  'bg-red-500/20 text-red-400 border border-red-500/30',
    dot:    'bg-red-500',
    icon:   XCircle,
    iconCl: 'text-red-400',
  },
  URGENT: {
    border: 'border-amber-500/40',
    bg:     'bg-amber-500/5',
    badge:  'bg-amber-500/20 text-amber-400 border border-amber-500/30',
    dot:    'bg-amber-400',
    icon:   AlertTriangle,
    iconCl: 'text-amber-400',
  },
  WATCH: {
    border: 'border-[#1E3A5F]',
    bg:     '',
    badge:  'bg-[#1E3A5F] text-[#94A3B8]',
    dot:    'bg-[#64748B]',
    icon:   Clock,
    iconCl: 'text-[#64748B]',
  },
}

export default function TodayPage() {
  const [data, setData]   = useState<TodayData | null>(null)
  const [done, setDone]   = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch('/api/today')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  function markDone(id: string) {
    setDone(prev => new Set([...prev, id]))
  }

  if (loading) return (
    <div className="p-6 flex items-center gap-3 text-[#64748B]">
      <Loader2 size={16} className="animate-spin" /><span>Building your hit list…</span>
    </div>
  )

  const items    = data?.items ?? []
  const active   = items.filter(i => !done.has(i.id))
  const doneCount = done.size
  const total    = items.length

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-2xl">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap size={18} className="text-[#00C896]" />
            Today
          </h1>
          <p className="text-[#64748B] text-sm mt-0.5">{data?.date}</p>
        </div>
        {total > 0 && (
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-black text-white">{doneCount}<span className="text-[#64748B] font-normal text-sm">/{total}</span></div>
            <div className="text-xs text-[#64748B] uppercase tracking-wide">done</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {total > 0 && (
        <div className="h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00C896] rounded-full transition-all duration-500"
            style={{ width: `${(doneCount / total) * 100}%` }}
          />
        </div>
      )}

      {/* Summary strip */}
      {data && data.critical > 0 && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 flex items-center gap-3">
          <XCircle size={15} className="text-red-400 flex-shrink-0" />
          <span className="text-red-300 text-sm font-semibold">
            {data.critical} critical item{data.critical !== 1 ? 's' : ''} — act before noon
          </span>
          {data.total_kes > 0 && (
            <span className="ml-auto text-xs text-red-400 font-mono flex-shrink-0">
              KES {data.total_kes.toLocaleString()} at risk
            </span>
          )}
        </div>
      )}

      {/* Empty state */}
      {active.length === 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-8 text-center">
          <CheckCircle2 size={32} className="text-[#00C896] mx-auto mb-3" />
          <p className="text-white font-semibold">All clear</p>
          <p className="text-[#64748B] text-sm mt-1">
            {total > 0 ? 'Every item is done. Good work.' : 'No critical actions or deadlines today.'}
          </p>
        </div>
      )}

      {/* Hit list */}
      <div className="space-y-2">
        {active.map((item, idx) => {
          const s = PRIORITY_STYLE[item.priority]
          const Icon = s.icon
          return (
            <div
              key={item.id}
              className={`bg-[#0F2040] border ${s.border} ${s.bg} rounded-xl p-4 flex gap-3`}
            >
              {/* Number */}
              <div className="flex-shrink-0 w-6 h-6 rounded-full bg-[#0A1628] border border-[#1E3A5F] flex items-center justify-center text-xs font-bold text-[#64748B] mt-0.5">
                {idx + 1}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-white">{item.title}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${s.badge}`}>
                    {item.priority}
                  </span>
                  {item.type === 'IMPOSSIBLE' && (
                    <span className="text-xs font-bold px-1.5 py-0.5 rounded-md bg-red-900/40 text-red-300 border border-red-500/30">
                      WINDOW CLOSED
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#64748B] mt-0.5">{item.detail}</p>
                <p className="text-xs text-[#94A3B8] mt-1.5 flex items-center gap-1.5">
                  <Icon size={11} className={s.iconCl} />
                  {item.action}
                </p>
                {item.ref && (
                  <p className="text-xs text-[#334155] mt-1 font-mono">{item.ref}</p>
                )}
              </div>

              {/* Right side */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                {item.kes_at_risk > 0 && (
                  <span className="text-xs text-red-400 font-mono whitespace-nowrap">
                    KES {item.kes_at_risk.toLocaleString()}
                  </span>
                )}
                <div className="flex gap-1.5">
                  {item.shipment_id && (
                    <button
                      onClick={() => router.push(`/dashboard/operations?open=${item.shipment_id}`)}
                      className="text-xs px-2 py-1 rounded-md border border-[#1E3A5F] text-[#94A3B8] hover:border-[#00C896]/40 hover:text-white transition-all"
                    >
                      Open
                    </button>
                  )}
                  <button
                    onClick={() => markDone(item.id)}
                    className="text-xs px-2 py-1 rounded-md bg-[#00C896]/10 border border-[#00C896]/30 text-[#00C896] hover:bg-[#00C896]/20 transition-all font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Completed items (collapsed) */}
      {doneCount > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-[#475569] uppercase tracking-wide font-semibold">Completed today</p>
          {items.filter(i => done.has(i.id)).map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3 py-2 bg-[#0A1628] rounded-lg opacity-50">
              <CheckCircle2 size={13} className="text-[#00C896] flex-shrink-0" />
              <span className="text-xs text-[#64748B] line-through">{item.title}</span>
            </div>
          ))}
        </div>
      )}

      {/* Activity feed — always shows recent events so dashboard feels alive */}
      <ActivityFeed />
    </div>
  )
}
