'use client'
import { DeadlineAlert } from '@/lib/alerts'
import { AlertTriangle, X, ChevronDown, ChevronUp } from 'lucide-react'
import { useState } from 'react'

function formatKES(n: number) {
  if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`
  return `KES ${n.toLocaleString()}`
}

const levelStyles = {
  CRITICAL: { bar: 'bg-red-500/10 border-red-500/30', badge: 'bg-red-500/20 text-red-400', dot: 'bg-red-500', text: 'text-red-400' },
  URGENT:   { bar: 'bg-amber-500/10 border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', dot: 'bg-amber-500', text: 'text-amber-400' },
  WARNING:  { bar: 'bg-blue-500/10 border-blue-500/30', badge: 'bg-blue-500/20 text-blue-400', dot: 'bg-blue-400', text: 'text-blue-400' },
}

export default function AlertBanner({ alerts }: { alerts: DeadlineAlert[] }) {
  const [dismissed, setDismissed] = useState(false)
  const [expanded, setExpanded] = useState(false)

  if (!alerts.length || dismissed) return null

  const critical = alerts.filter((a) => a.level === 'CRITICAL')
  const top = alerts[0]
  const style = levelStyles[top.level]
  const daysLabel = top.daysRemaining <= 0
    ? `${Math.abs(top.daysRemaining)}d overdue`
    : `${top.daysRemaining}d left`

  return (
    <div className={`border rounded-xl overflow-hidden ${style.bar} mb-4 lg:mb-6`}>
      {/* Main alert row */}
      <div className="flex items-start gap-3 px-4 py-3">
        {/* Severity indicator */}
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <div className={`w-2 h-2 rounded-full animate-pulse ${style.dot}`} />
          <AlertTriangle size={14} className={style.text} />
        </div>

        {/* Content — stacks on mobile, inline on desktop */}
        <div className="flex-1 min-w-0">
          {/* First line: badge + name */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded shrink-0 ${style.badge}`}>
              {top.level}
            </span>
            <span className="text-sm font-semibold text-white truncate">{top.shipmentName}</span>
          </div>

          {/* Second line: regulator + days + cost */}
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            <span className="text-xs text-[#64748B]">{top.regulatorCode}</span>
            <span className="text-[#334155]">·</span>
            <span className={`text-xs font-semibold ${top.daysRemaining <= 3 ? 'text-red-400' : top.daysRemaining <= 7 ? 'text-amber-400' : 'text-[#94A3B8]'}`}>
              {daysLabel}
            </span>
            {top.storageDailyCostKES > 0 && (
              <>
                <span className="text-[#334155]">·</span>
                <span className="text-xs text-red-400 font-medium">
                  Est. loss: {formatKES(top.estimatedAdditionalCostKES)}
                </span>
              </>
            )}
          </div>

          {/* Action text */}
          <div className="text-xs text-[#64748B] mt-1 leading-snug">{top.action}</div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2 shrink-0 ml-1">
          {critical.length > 0 && (
            <span className="hidden sm:block text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-bold">
              {critical.length} critical
            </span>
          )}
          {alerts.length > 1 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-[#64748B] hover:text-white transition-colors p-1"
            >
              +{alerts.length - 1}
              {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-[#64748B] hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Expanded list */}
      {expanded && (
        <div className="border-t border-white/5 divide-y divide-white/5">
          {alerts.slice(1).map((a) => {
            const s = levelStyles[a.level]
            return (
              <div key={a.shipmentId} className="flex items-start gap-3 px-4 py-2.5">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-white font-medium">{a.shipmentName}</span>
                    <span className="text-xs text-[#64748B]">{a.regulatorCode}</span>
                    <span className={`text-xs font-semibold ${a.daysRemaining <= 3 ? 'text-red-400' : a.daysRemaining <= 7 ? 'text-amber-400' : 'text-[#64748B]'}`}>
                      {a.daysRemaining <= 0 ? `${Math.abs(a.daysRemaining)}d overdue` : `${a.daysRemaining}d`}
                    </span>
                  </div>
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
    </div>
  )
}
