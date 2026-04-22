'use client'
import { DeadlineAlert } from '@/lib/alerts'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function formatKES(n: number) {
  return `KES ${n.toLocaleString()}`
}

const levelStyles = {
  CRITICAL: { bar: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-500' },
  URGENT:   { bar: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500' },
  WARNING:  { bar: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400' },
}

export default function AlertBanner({ alerts }: { alerts: DeadlineAlert[] }) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!alerts.length || dismissed) return null

  const critical = alerts.filter((a) => a.level === 'CRITICAL')
  const top = alerts[0]
  const style = levelStyles[top.level]

  return (
    <div className={`border rounded-xl overflow-hidden ${style.bar} mb-6`}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div className={`w-2 h-2 rounded-full animate-pulse ${style.dot}`} />
        <AlertTriangle size={14} className={style.badge.split(' ')[1]} />
        <div className="flex-1 min-w-0">
          <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded ${style.badge} mr-2`}>
            {top.level}
          </span>
          <span className="text-sm text-white font-medium">{top.shipmentName}</span>
          <span className="text-sm text-[#94A3B8] mx-2">·</span>
          <span className="text-sm text-[#94A3B8]">{top.regulatorCode}</span>
          <span className="text-sm text-[#94A3B8] mx-2">·</span>
          <span className="text-sm text-[#94A3B8]">
            {top.daysRemaining <= 0 ? `${Math.abs(top.daysRemaining)}d overdue` : `${top.daysRemaining}d remaining`}
          </span>
          {top.storageDailyCostKES > 0 && (
            <>
              <span className="text-sm text-[#94A3B8] mx-2">·</span>
              <span className="text-sm text-red-400 font-medium">
                Est. additional cost: {formatKES(top.estimatedAdditionalCostKES)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {alerts.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-white transition-colors"
            >
              {alerts.length - 1} more
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
          {critical.length > 0 && (
            <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
              {critical.length} CRITICAL
            </span>
          )}
          <button onClick={() => setDismissed(true)} className="text-[#64748B] hover:text-white transition-colors ml-1">
            <X size={14} />
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {alerts.slice(1).map((a) => {
            const s = levelStyles[a.level]
            return (
              <div key={a.shipmentId} className="flex items-start gap-3 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-white">{a.shipmentName}</span>
                  <span className="text-xs text-[#64748B] ml-2">{a.regulatorCode} · {a.daysRemaining}d</span>
                  <div className="text-xs text-[#64748B] mt-0.5 truncate">{a.action}</div>
                </div>
                {a.storageDailyCostKES > 0 && (
                  <span className="text-xs text-red-400 shrink-0">{formatKES(a.storageDailyCostKES)}/day</span>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="px-4 pb-3 pt-1">
        <div className="text-xs text-[#64748B]">{top.action}</div>
      </div>
    </div>
  )
}
