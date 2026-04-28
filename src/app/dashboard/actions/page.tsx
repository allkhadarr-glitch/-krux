'use client'
import { useState, useEffect, useCallback } from 'react'
import { Action, PriorityLevel } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Loader2, RefreshCw, Zap, Info, Square, CheckSquare, FileText, XCircle,
  MessageSquare, User, Send,
} from 'lucide-react'

// ─── Document checklist per action type ──────────────────────

const DOCS_BY_TYPE: Record<string, string[]> = {
  SUBMIT_DOCUMENTS_PPB:      ['PPB Application Form', 'Certificate of Analysis (CoA)', 'GMP Certificate', 'Product Samples (3 units)', 'Commercial Invoice'],
  SUBMIT_DOCUMENTS_KEBS:     ['KEBS PVoC Request Form', 'Product Test Report', 'Packing List', 'Commercial Invoice', 'Bill of Lading'],
  SUBMIT_DOCUMENTS_KEPHIS:   ['Phytosanitary Certificate (origin country)', 'KEPHIS Import Permit Application', 'Packing List', 'Commercial Invoice'],
  SUBMIT_DOCUMENTS_PCPB:     ['PCPB Registration Documents', 'Pesticide Efficacy Data', 'Safety Data Sheet (SDS)', 'Product Label'],
  SUBMIT_DOCUMENTS_EPRA:     ['EPRA Energy Audit Report', 'Product Compliance Certificate', 'Technical Data Sheet'],
  SUBMIT_DOCUMENTS_NEMA:     ['NEMA Environmental Impact Assessment', 'Importation Permit Application', 'Product MSDS'],
  SUBMIT_DOCUMENTS_KRA:      ['IDF via KRA iCMS Portal', 'HS Code Classification', 'Commercial Invoice', 'Packing List'],
  SUBMIT_DOCUMENTS_KENTRADE: ['KenTrade Import Declaration', 'Supporting Permits', 'Bill of Lading'],
  CONTACT_AGENT:             ['Agent Contact Log', 'Confirmation of Receipt', 'Status Update Written'],
  APPLY:                     ['Application Form Completed', 'Supporting Documents Attached', 'Payment Receipt'],
  ESCALATE:                  ['Rejection Notice Filed', 'Response Letter Drafted', 'Corrected Documents Prepared'],
  VERIFY:                    ['Verification Checklist', 'Document Copies Attached'],
}

function getDocsForAction(action: Action): string[] {
  const type = action.action_type.toUpperCase()
  if (DOCS_BY_TYPE[type]) return DOCS_BY_TYPE[type]
  // partial match — find the closest key
  const match = Object.keys(DOCS_BY_TYPE).find((k) => type.startsWith(k.split('_')[0]))
  return match ? DOCS_BY_TYPE[match] : ['Required Documents', 'Supporting Evidence']
}

// ─── Document Checklist Component ────────────────────────────

function DocChecklist({ actionId, actionType }: { actionId: string; actionType: string }) {
  const storageKey = `krux_doc_${actionId}`
  const docs = getDocsForAction({ action_type: actionType } as Action)

  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(localStorage.getItem(storageKey) ?? '{}')
    } catch { return {} }
  })

  function toggle(doc: string) {
    setChecked((prev) => {
      const next = { ...prev, [doc]: !prev[doc] }
      localStorage.setItem(storageKey, JSON.stringify(next))
      return next
    })
  }

  const done  = docs.filter((d) => checked[d]).length
  const total = docs.length

  return (
    <div className="mt-3 pt-3 border-t border-[#1E3A5F]">
      <div className="flex items-center gap-1.5 mb-2">
        <FileText size={10} className="text-[#64748B]" />
        <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">Documents</span>
        <span className={`text-[10px] font-bold ml-auto ${done === total ? 'text-[#00C896]' : 'text-[#64748B]'}`}>
          {done}/{total}
        </span>
      </div>
      <div className="space-y-1">
        {docs.map((doc) => (
          <button
            key={doc}
            onClick={() => toggle(doc)}
            className="flex items-center gap-2 w-full text-left group"
          >
            {checked[doc]
              ? <CheckSquare size={12} className="text-[#00C896] shrink-0" />
              : <Square      size={12} className="text-[#334155] group-hover:text-[#64748B] shrink-0" />}
            <span className={`text-[11px] transition-colors ${
              checked[doc] ? 'text-[#64748B] line-through' : 'text-[#94A3B8] group-hover:text-white'
            }`}>
              {doc}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Priority config ──────────────────────────────────────────

const PRIORITY_CONFIG: Record<PriorityLevel, {
  label: string; badge: string; header: string; dot: string
}> = {
  CRITICAL: {
    label:  'CRITICAL',
    badge:  'bg-red-500/15 text-red-400 border border-red-500/30',
    header: 'text-red-400',
    dot:    'bg-red-500',
  },
  HIGH: {
    label:  'HIGH',
    badge:  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
    header: 'text-amber-400',
    dot:    'bg-amber-500',
  },
  MEDIUM: {
    label:  'MEDIUM',
    badge:  'bg-blue-500/15 text-blue-400 border border-blue-500/30',
    header: 'text-blue-400',
    dot:    'bg-blue-500',
  },
  LOW: {
    label:  'LOW',
    badge:  'bg-[#1E3A5F] text-[#64748B] border border-[#1E3A5F]',
    header: 'text-[#64748B]',
    dot:    'bg-[#64748B]',
  },
}

const PRIORITY_ORDER: PriorityLevel[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']

// ─── Effectiveness label (confidence-gated) ──────────────────
// Only surfaces a score when there's real signal behind it.
// Seeded priors (sample_size = 0) fall through to "Learning..."

function EffectivenessChip({
  score,
  tier,
  sampleSize,
}: {
  score?:      number | null
  tier?:       'org' | 'global' | null
  sampleSize?: number
}) {
  if (score == null || tier == null) {
    return <span className="text-[10px] text-[#334155] italic">Learning...</span>
  }

  const pct   = Math.round(score * 100)
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 55 ? 'text-amber-400' : 'text-[#64748B]'
  const label = tier === 'org'
    ? `${pct}% · your data`
    : `${pct}% · industry`

  return (
    <span className={`text-[10px] font-semibold ${color}`} title={`Based on ${sampleSize} outcomes`}>
      {label}
    </span>
  )
}

// ─── Days until due ───────────────────────────────────────────

function DueLabel({ due }: { due?: string }) {
  if (!due) return <span className="text-[#64748B] text-xs">No deadline</span>
  const days = Math.ceil((new Date(due).getTime() - Date.now()) / 86400000)
  if (days < 0)  return <span className="text-red-400 text-xs font-semibold">{Math.abs(days)}d overdue</span>
  if (days === 0) return <span className="text-red-400 text-xs font-semibold">Due today</span>
  if (days <= 3)  return <span className="text-red-400 text-xs">{days}d remaining</span>
  if (days <= 7)  return <span className="text-amber-400 text-xs">{days}d remaining</span>
  return <span className="text-[#64748B] text-xs">{days}d remaining</span>
}

// ─── Execution status pill ────────────────────────────────────

function ExecStatusPill({ status }: { status?: string }) {
  if (!status || status === 'PENDING') return null
  const config: Record<string, { cls: string; label: string }> = {
    IN_PROGRESS: { cls: 'bg-amber-400/10 text-amber-400 border-amber-400/30',   label: 'In Progress' },
    DONE:        { cls: 'bg-[#00C896]/10 text-[#00C896] border-[#00C896]/30',   label: 'Done' },
    FAILED:      { cls: 'bg-red-400/10 text-red-400 border-red-400/30',         label: 'Failed' },
    AT_RISK:     { cls: 'bg-red-500/20 text-red-300 border-red-500/40 animate-pulse', label: 'AT RISK' },
  }
  const c = config[status]
  if (!c) return null
  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border ${c.cls}`}>
      {c.label}
    </span>
  )
}

// ─── Action card ─────────────────────────────────────────────

function ActionCard({
  action,
  onComplete,
  onDismiss,
  completing,
  onRefresh,
}: {
  action:     Action
  onComplete: (id: string) => void
  onDismiss:  (id: string) => void
  completing: string | null
  onRefresh:  () => void
}) {
  const [expanded, setExpanded]       = useState(false)
  const [acting, setActing]           = useState(false)
  const [failNote, setFailNote]       = useState('')
  const [showFail, setShowFail]       = useState(false)
  const [noteText, setNoteText]       = useState('')
  const [showNote, setShowNote]       = useState(false)
  const [noteSending, setNoteSending] = useState(false)
  const [assignee, setAssignee]       = useState<string>((action as any).assignee_name ?? '')
  const [editAssignee, setEditAssignee] = useState(false)
  const [assigneeDraft, setAssigneeDraft] = useState(assignee)

  const cfg     = PRIORITY_CONFIG[action.priority]
  const isBusy  = completing === action.id || acting
  const shipRef = (action as any).shipment
  const execStatus: string | undefined = (action as any).execution_status

  async function handleStart() {
    setActing(true)
    await fetch(`/api/actions/${action.id}/start`, { method: 'POST' })
    setActing(false)
    onRefresh()
  }

  async function handleFail() {
    if (!failNote.trim()) return
    setActing(true)
    await fetch(`/api/actions/${action.id}/fail`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ reason: failNote }),
    })
    setActing(false)
    setShowFail(false)
    setFailNote('')
    onRefresh()
  }

  async function handleNote() {
    if (!noteText.trim()) return
    setNoteSending(true)
    await fetch(`/api/actions/${action.id}/note`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ text: noteText }),
    })
    setNoteSending(false)
    setNoteText('')
    setShowNote(false)
  }

  async function handleAssign() {
    await fetch(`/api/actions/${action.id}/assign`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ assignee_name: assigneeDraft.trim() || null }),
    })
    setAssignee(assigneeDraft.trim())
    setEditAssignee(false)
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 hover:border-[#2A4A7F] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${cfg.badge}`}>
              {cfg.label}
            </span>
            <ExecStatusPill status={execStatus} />
            {shipRef && (
              <span className="text-[10px] text-[#64748B] font-medium">
                {shipRef.name ?? shipRef.reference_number}
              </span>
            )}
            <EffectivenessChip
              score={      (action as any).predicted_effectiveness}
              tier={       (action as any).effectiveness_tier}
              sampleSize={ (action as any).effectiveness_sample_size}
            />
            {assignee && (
              <span className="flex items-center gap-1 text-[10px] text-blue-400">
                <User size={9} />{assignee}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-white leading-snug mb-1">{action.title}</p>

          {/* Why + deadline row */}
          <div className="flex items-center gap-3 flex-wrap">
            <DueLabel due={action.due_date} />
            {action.trigger_reason && (
              <span className="text-[10px] text-[#64748B] truncate max-w-[260px]" title={action.trigger_reason}>
                {action.trigger_reason}
              </span>
            )}
          </div>

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#94A3B8] mt-1.5 transition-colors"
          >
            <Info size={10} />
            {expanded ? 'Less' : 'Details'}
            <ChevronRight size={10} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          {expanded && (
            <>
              {action.description && (
                <p className="text-xs text-[#94A3B8] mt-2 pl-1 border-l border-[#1E3A5F] leading-relaxed">
                  {action.description}
                </p>
              )}
              <DocChecklist actionId={action.id} actionType={action.action_type} />

              {/* Assignee */}
              <div className="mt-3 pt-3 border-t border-[#1E3A5F]">
                <div className="flex items-center gap-2">
                  <User size={10} className="text-[#64748B]" />
                  <span className="text-[10px] text-[#64748B] font-semibold uppercase tracking-wide">Assigned to</span>
                </div>
                {editAssignee ? (
                  <div className="flex gap-2 mt-1.5">
                    <input
                      value={assigneeDraft}
                      onChange={(e) => setAssigneeDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAssign()}
                      placeholder="Name or team..."
                      className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]"
                    />
                    <button onClick={handleAssign} className="px-2 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20">Save</button>
                    <button onClick={() => { setEditAssignee(false); setAssigneeDraft(assignee) }} className="px-2 py-1.5 text-[#64748B] text-xs hover:text-white">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditAssignee(true)}
                    className="mt-1 text-xs text-[#64748B] hover:text-blue-400 transition-colors"
                  >
                    {assignee || '+ Assign someone'}
                  </button>
                )}
              </div>

              {/* Note input */}
              <div className="mt-3">
                {showNote ? (
                  <div className="flex gap-2">
                    <input
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNote()}
                      placeholder="Add a note..."
                      className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-[#94A3B8] placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]"
                    />
                    <button
                      onClick={handleNote}
                      disabled={!noteText.trim() || noteSending}
                      className="px-2 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-40"
                    >
                      {noteSending ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
                    </button>
                    <button onClick={() => setShowNote(false)} className="text-[#64748B] text-xs hover:text-white px-1">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNote(true)}
                    className="flex items-center gap-1 text-[10px] text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    <MessageSquare size={10} /> Add note
                  </button>
                )}
              </div>

              {/* Fail input */}
              {showFail && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={failNote}
                    onChange={(e) => setFailNote(e.target.value)}
                    placeholder="Reason for failure..."
                    className="flex-1 text-xs bg-[#0A1628] border border-red-500/30 rounded-lg px-2 py-1.5 text-[#94A3B8] placeholder:text-[#334155] focus:outline-none focus:border-red-500/60"
                  />
                  <button
                    onClick={handleFail}
                    disabled={!failNote.trim() || acting}
                    className="px-3 py-1.5 bg-red-500/10 text-red-400 border border-red-500/25 rounded-lg text-xs font-semibold hover:bg-red-500/20 disabled:opacity-40 transition-all"
                  >
                    Log
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col gap-1.5 shrink-0">
          {/* Start — only if PENDING */}
          {(!execStatus || execStatus === 'PENDING') && (
            <button
              onClick={handleStart}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 text-amber-400 border border-amber-400/25 rounded-lg text-xs font-semibold hover:bg-amber-400/20 disabled:opacity-50 transition-all"
            >
              {acting ? <Loader2 size={11} className="animate-spin" /> : <Clock size={11} />}
              Start
            </button>
          )}

          {/* Done */}
          <button
            onClick={() => onComplete(action.id)}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-50 transition-all"
          >
            {completing === action.id
              ? <Loader2 size={11} className="animate-spin" />
              : <CheckCircle2 size={11} />}
            Done
          </button>

          {/* Fail toggle */}
          <button
            onClick={() => { setExpanded(true); setShowFail(!showFail) }}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-400/60 border border-[#1E3A5F] rounded-lg text-xs hover:text-red-400 hover:border-red-500/25 disabled:opacity-50 transition-colors"
          >
            <XCircle size={11} />
            Fail
          </button>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(action.id)}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#64748B] border border-[#1E3A5F] rounded-lg text-xs hover:text-[#94A3B8] disabled:opacity-50 transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Priority group ───────────────────────────────────────────

function PriorityGroup({
  level,
  actions,
  onComplete,
  onDismiss,
  completing,
  onRefresh,
}: {
  level:      PriorityLevel
  actions:    Action[]
  onComplete: (id: string) => void
  onDismiss:  (id: string) => void
  completing: string | null
  onRefresh:  () => void
}) {
  if (!actions.length) return null
  const cfg = PRIORITY_CONFIG[level]

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
        <h3 className={`text-xs font-bold uppercase tracking-widest ${cfg.header}`}>{cfg.label}</h3>
        <span className="text-[#64748B] text-xs">— {actions.length}</span>
      </div>
      <div className="space-y-2">
        {actions.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            onComplete={onComplete}
            onDismiss={onDismiss}
            completing={completing}
            onRefresh={onRefresh}
          />
        ))}
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function ActionsPage() {
  const [actions, setActions]     = useState<Action[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)
  const [completing, setCompleting] = useState<string | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [evalResult, setEvalResult] = useState<string | null>(null)
  const [filter, setFilter]       = useState<'active' | 'all'>('active')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const status = filter === 'active' ? '' : '?status=all'
      const url = filter === 'active'
        ? '/api/actions'
        : '/api/actions?status=all'
      const res  = await fetch(url)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setActions(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
    // Realtime: refresh when actions change
    const { supabase: sb } = require('@/lib/supabase')
    const channel = sb
      .channel('actions-center')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'actions' }, () => load())
      .subscribe()
    return () => { sb.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load])

  async function handleComplete(id: string) {
    setCompleting(id)
    try {
      const res = await fetch(`/api/actions/${id}/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) })
      if (res.ok) setActions((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setCompleting(null)
    }
  }

  async function handleDismiss(id: string) {
    setCompleting(id)
    try {
      const res = await fetch(`/api/actions/${id}/complete`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'DISMISSED' }),
      })
      if (res.ok) setActions((prev) => prev.filter((a) => a.id !== id))
    } finally {
      setCompleting(null)
    }
  }

  async function runEvaluation() {
    setEvaluating(true)
    setEvalResult(null)
    try {
      const res  = await fetch('/api/actions/evaluate', { method: 'POST' })
      const data = await res.json()
      setEvalResult(`${data.evaluated} action${data.evaluated !== 1 ? 's' : ''} evaluated`)
      await load()
    } catch {
      setEvalResult('Evaluation failed')
    } finally {
      setEvaluating(false)
      setTimeout(() => setEvalResult(null), 5000)
    }
  }

  // Group by priority
  const grouped = PRIORITY_ORDER.reduce<Record<PriorityLevel, Action[]>>((acc, p) => {
    acc[p] = actions.filter((a) => a.priority === p)
    return acc
  }, { CRITICAL: [], HIGH: [], MEDIUM: [], LOW: [] })

  const criticalCount = grouped.CRITICAL.length
  const highCount     = grouped.HIGH.length
  const total         = actions.length

  return (
    <div className="px-4 lg:px-5 py-5 lg:py-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Action Center</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {loading ? 'Loading...' : (
              <>
                {total} open action{total !== 1 ? 's' : ''}
                {criticalCount > 0 && (
                  <span className="text-red-400 font-semibold ml-2">
                    · {criticalCount} critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="text-amber-400 font-semibold ml-2">
                    · {highCount} high
                  </span>
                )}
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filter toggle */}
          <div className="flex rounded-lg border border-[#1E3A5F] overflow-hidden">
            {(['active', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-[#00C896]/10 text-[#00C896]'
                    : 'text-[#64748B] hover:text-white'
                }`}
              >
                {f === 'active' ? 'Active' : 'All'}
              </button>
            ))}
          </div>

          <button
            onClick={load}
            className="p-2 border border-[#1E3A5F] text-[#64748B] rounded-lg hover:text-white hover:border-[#2A4A7F] transition-all"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>

          <button
            onClick={runEvaluation}
            disabled={evaluating}
            className="flex items-center gap-2 px-3 py-2 border border-[#1E3A5F] text-[#94A3B8] rounded-lg text-sm font-medium hover:border-[#00C896]/40 hover:text-[#00C896] disabled:opacity-50 transition-all"
          >
            {evaluating ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
            {evaluating ? 'Evaluating...' : 'Run Evaluation'}
          </button>

          {evalResult && (
            <span className="text-xs font-medium text-[#00C896]">{evalResult}</span>
          )}
        </div>
      </div>

      {/* Critical banner */}
      {criticalCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/25 rounded-xl">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-sm text-red-300">
            <span className="font-bold">{criticalCount} critical action{criticalCount !== 1 ? 's' : ''}</span> require immediate attention — shipment failure risk is elevated.
          </p>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#64748B]">
          <Loader2 size={20} className="animate-spin mr-2" />
          Loading actions...
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 text-red-400">Error: {error}</div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2">
          <CheckCircle2 size={32} className="text-[#00C896]" />
          <p className="text-white font-semibold">All clear</p>
          <p className="text-[#64748B] text-sm">No open actions. System is monitoring.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {PRIORITY_ORDER.map((level) => (
            <PriorityGroup
              key={level}
              level={level}
              actions={grouped[level]}
              onComplete={handleComplete}
              onDismiss={handleDismiss}
              completing={completing}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  )
}
