'use client'
import { useState, useEffect, useCallback } from 'react'
import { Action } from '@/lib/types'
import { CheckCircle2, Clock, XCircle, AlertTriangle, Loader2, RefreshCw, User } from 'lucide-react'

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const

const priorityColors: Record<string, string> = {
  CRITICAL: 'border-l-red-500   bg-red-500/5',
  HIGH:     'border-l-amber-500 bg-amber-500/5',
  MEDIUM:   'border-l-blue-500  bg-blue-500/5',
  LOW:      'border-l-[#1E3A5F] bg-transparent',
}

const execColors: Record<string, string> = {
  IN_PROGRESS: 'text-amber-400',
  DONE:        'text-[#00C896]',
  FAILED:      'text-red-400',
  AT_RISK:     'text-red-400 animate-pulse',
  PENDING:     'text-[#64748B]',
}

function MobileActionCard({
  action,
  onRefresh,
}: {
  action: Action
  onRefresh: () => void
}) {
  const [acting, setActing] = useState(false)
  const execStatus: string  = (action as any).execution_status ?? 'PENDING'
  const assignee: string    = (action as any).assignee_name ?? ''
  const shipRef             = (action as any).shipment

  async function tap(endpoint: string, body?: object) {
    setActing(true)
    await fetch(`/api/actions/${action.id}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ?? {}),
    })
    setActing(false)
    onRefresh()
  }

  return (
    <div className={`border-l-4 rounded-r-xl rounded-bl-xl p-4 mb-3 ${priorityColors[action.priority] ?? ''} border border-[#1E3A5F]`}>
      {/* Priority + status row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase text-[#64748B] tracking-widest">{action.priority}</span>
        <span className={`text-[10px] font-bold uppercase ${execColors[execStatus] ?? 'text-[#64748B]'}`}>
          {execStatus.replace('_', ' ')}
        </span>
      </div>

      {/* Title */}
      <p className="text-base font-semibold text-white leading-snug mb-1">{action.title}</p>

      {/* Shipment + assignee */}
      <div className="flex items-center gap-3 mb-3">
        {shipRef && (
          <span className="text-xs text-[#64748B]">{shipRef.name ?? shipRef.reference_number}</span>
        )}
        {assignee && (
          <span className="flex items-center gap-1 text-xs text-blue-400">
            <User size={10} />{assignee}
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        {(!execStatus || execStatus === 'PENDING' || execStatus === 'AT_RISK') && (
          <button
            onClick={() => tap('start')}
            disabled={acting}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-amber-400/15 text-amber-400 border border-amber-400/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {acting ? <Loader2 size={16} className="animate-spin mx-auto" /> : '▶ Start'}
          </button>
        )}
        {(execStatus === 'IN_PROGRESS' || execStatus === 'AT_RISK') && (
          <button
            onClick={() => tap('complete')}
            disabled={acting}
            className="flex-1 py-3 rounded-xl text-sm font-bold bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/30 active:scale-95 transition-transform disabled:opacity-50"
          >
            {acting ? <Loader2 size={16} className="animate-spin mx-auto" /> : '✓ Done'}
          </button>
        )}
        {execStatus !== 'DONE' && execStatus !== 'FAILED' && (
          <button
            onClick={() => tap('fail', { reason: 'Marked failed on mobile' })}
            disabled={acting}
            className="py-3 px-4 rounded-xl text-sm font-bold bg-red-500/10 text-red-400 border border-red-500/20 active:scale-95 transition-transform disabled:opacity-50"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

export default function MobilePage() {
  const [actions, setActions]   = useState<Action[]>([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState<'mine' | 'all'>('all')
  const [assigneeFilter, setAssigneeFilter] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/actions')
    const data = await res.json()
    setActions(Array.isArray(data) ? data : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const atRisk  = actions.filter((a) => (a as any).execution_status === 'AT_RISK')
  const pending = actions.filter((a) => !(a as any).execution_status || (a as any).execution_status === 'PENDING')
  const inProg  = actions.filter((a) => (a as any).execution_status === 'IN_PROGRESS')

  const sorted  = [
    ...atRisk,
    ...PRIORITY_ORDER.flatMap((p) => inProg.filter((a) => a.priority === p)),
    ...PRIORITY_ORDER.flatMap((p) => pending.filter((a) => a.priority === p)),
  ].filter((a) => {
    if (!assigneeFilter) return true
    const name = ((a as any).assignee_name ?? '').toLowerCase()
    return name.includes(assigneeFilter.toLowerCase())
  })

  return (
    <div className="min-h-screen bg-[#0A1628] pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0A1628] border-b border-[#1E3A5F] px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-bold text-white">Field Actions</h1>
            <p className="text-xs text-[#64748B]">
              {atRisk.length > 0 && <span className="text-red-400 font-semibold">{atRisk.length} at risk · </span>}
              {sorted.length} showing
            </p>
          </div>
          <button onClick={load} className="p-2 text-[#64748B] hover:text-white active:scale-95 transition-all">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Assignee filter */}
        <input
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value)}
          placeholder="Filter by assignee..."
          className="w-full text-sm bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-3 py-2.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]"
        />
      </div>

      {/* Status strip */}
      <div className="flex gap-2 px-4 py-3 overflow-x-auto">
        {[
          { label: 'AT RISK', count: atRisk.length, color: 'bg-red-500/20 text-red-400 border-red-500/30' },
          { label: 'IN PROGRESS', count: inProg.length, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
          { label: 'PENDING', count: pending.length, color: 'bg-[#1E3A5F] text-[#64748B] border-[#1E3A5F]' },
        ].map(({ label, count, color }) => (
          <div key={label} className={`flex-shrink-0 px-3 py-1.5 rounded-full border text-[10px] font-bold uppercase ${color}`}>
            {count} {label}
          </div>
        ))}
      </div>

      {/* Action list */}
      <div className="px-4">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-[#64748B]">
            <Loader2 size={24} className="animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <CheckCircle2 size={32} className="text-[#00C896]" />
            <p className="text-white font-semibold">All clear</p>
            <p className="text-[#64748B] text-sm">No open actions.</p>
          </div>
        ) : (
          sorted.map((a) => (
            <MobileActionCard key={a.id} action={a} onRefresh={load} />
          ))
        )}
      </div>
    </div>
  )
}
