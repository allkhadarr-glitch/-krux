'use client'
import React, { useState, useEffect, useCallback } from 'react'
import { Action, PriorityLevel } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import {
  CheckCircle2, Clock, AlertTriangle, ChevronRight,
  Loader2, RefreshCw, Zap, Info, Square, CheckSquare, FileText, XCircle,
  MessageSquare, User, Send, ExternalLink, Hash,
} from 'lucide-react'

// ─── Portal URLs per regulator ───────────────────────────────

const PORTAL_BY_REGULATOR: Record<string, string> = {
  PPB:      'https://web.pharmacyboardkenya.org',
  KEBS:     'https://pvoc.kebs.org',
  KEPHIS:   'https://kephis.org',
  EPRA:     'https://www.epra.go.ke',
  PCPB:     'https://www.pcpb.or.ke',
  NEMA:     'https://www.nema.go.ke',
  KRA:      'https://icms.kra.go.ke',
  KENTRADE: 'https://www.kentrade.go.ke',
  CA:       'https://www.ca.go.ke',
  DVS:      'https://www.dvs.go.ke',
}

const REGISTER_URL_BY_REGULATOR: Record<string, { url: string; label: string }> = {
  KRA:      { url: 'https://www.kra.go.ke/individual/applying-for-a-kra-pin', label: 'No iCMS account? Get KRA PIN first →' },
  KEBS:     { url: 'https://pvoc.kebs.org/register',                          label: 'No PVoC account? Register →' },
  KENTRADE: { url: 'https://www.kentrade.go.ke/register',                     label: 'No KenTrade account? Register →' },
  KEPHIS:   { url: 'https://kephis.org/index.php/online-services',            label: 'First time? KEPHIS online services →' },
}

function getPortalUrl(actionType: string): string | null {
  const upper = actionType.toUpperCase()
  const match = Object.keys(PORTAL_BY_REGULATOR).find((reg) => upper.includes(reg))
  return match ? PORTAL_BY_REGULATOR[match] : null
}

function getRegisterInfo(actionType: string): { url: string; label: string } | null {
  const upper = actionType.toUpperCase()
  const match = Object.keys(REGISTER_URL_BY_REGULATOR).find((reg) => upper.includes(reg))
  return match ? REGISTER_URL_BY_REGULATOR[match] : null
}

const PORTAL_LABEL_BY_REGULATOR: Record<string, string> = {
  PPB:      'PPB eServices Portal',
  KEBS:     'KEBS PVoC Portal',
  KEPHIS:   'KEPHIS Online Services',
  EPRA:     'EPRA Licensing Portal',
  PCPB:     'PCPB Import Portal',
  NEMA:     'NEMA Permits Portal',
  KRA:      'KRA iCMS Portal',
  KENTRADE: 'KenTrade Portal',
  CA:       'CA Type Approval Portal',
  DVS:      'DVS Import Permits',
}

function getPortalLabel(actionType: string): string {
  const upper = actionType.toUpperCase()
  const match = Object.keys(PORTAL_LABEL_BY_REGULATOR).find((reg) => upper.includes(reg))
  return match ? PORTAL_LABEL_BY_REGULATOR[match] : 'Permit Portal'
}

// ─── Permit progress bar ─────────────────────────────────────

const EXPECTED_DAYS_BY_REGULATOR: Record<string, number> = {
  PPB: 45, KEBS: 30, KEPHIS: 5, EPRA: 20,
  PCPB: 14, NEMA: 35, CA: 40, DVS: 18, KRA: 3,
}

function getExpectedDays(actionType: string): number {
  const upper = actionType.toUpperCase()
  const match = Object.keys(EXPECTED_DAYS_BY_REGULATOR).find(k => upper.includes(k))
  return match ? EXPECTED_DAYS_BY_REGULATOR[match] : 21
}

const PERMIT_STEPS = ['Filed', 'Under Review', 'Decision']

function PermitProgressBar({ actionType, daysElapsed }: { actionType: string; daysElapsed: number }) {
  const expected  = getExpectedDays(actionType)
  const pct       = Math.min(100, Math.round((daysElapsed / expected) * 100))
  const barColor  = pct >= 90 ? '#EF4444' : pct >= 65 ? '#F59E0B' : '#00C896'
  const stepIdx   = pct < 30 ? 0 : pct < 75 ? 1 : 2

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: barColor }}
          />
        </div>
        <span className="text-xs text-[#64748B] font-mono shrink-0">
          Day {daysElapsed}<span className="text-[#334155]">/{expected}</span>
        </span>
      </div>
      <div className="flex items-center gap-3">
        {PERMIT_STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-1">
            <div className={`w-2.5 h-2.5 rounded-full shrink-0 transition-all ${
              i < stepIdx  ? 'bg-[#00C896]' :
              i === stepIdx ? 'bg-amber-400 animate-pulse' :
              'bg-[#1E3A5F]'
            }`} />
            <span className={`text-xs transition-colors ${
              i < stepIdx  ? 'text-[#64748B]' :
              i === stepIdx ? 'text-amber-400' :
              'text-[#334155]'
            }`}>{step}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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
        <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wide">Documents</span>
        <span className={`text-xs font-bold ml-auto ${done === total ? 'text-[#00C896]' : 'text-[#64748B]'}`}>
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
            <span className={`text-xs transition-colors ${
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
    return <span className="text-xs text-[#334155] italic">Learning...</span>
  }

  const pct   = Math.round(score * 100)
  const color = pct >= 75 ? 'text-emerald-400' : pct >= 55 ? 'text-amber-400' : 'text-[#64748B]'
  const label = tier === 'org'
    ? `${pct}% · your data`
    : `${pct}% · industry`

  return (
    <span className={`text-xs font-semibold ${color}`} title={`Based on ${sampleSize} outcomes`}>
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
    <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-bold uppercase border ${c.cls}`}>
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
  const [trackingRef, setTrackingRef]   = useState<string>(action.portal_ref ?? '')
  const [refDraft, setRefDraft]         = useState(action.portal_ref ?? '')
  const [savingRef, setSavingRef]       = useState(false)
  const [showRefInput, setShowRefInput] = useState(false)
  const [confirmStep, setConfirmStep]   = useState<'ask' | 'ref_required' | 'dismissed'>('ask')
  const [confirmRef, setConfirmRef]     = useState('')
  const [showDoneConfirm, setShowDoneConfirm] = useState(false)

  const cfg       = PRIORITY_CONFIG[action.priority]
  const isBusy    = completing === action.id || acting
  const shipRef   = (action as any).shipment
  const execStatus: string | undefined = action.execution_status

  const portalUrl    = getPortalUrl(action.action_type)
  const registerInfo = getRegisterInfo(action.action_type)
  const portalLabel  = getPortalLabel(action.action_type)

  const daysElapsed = action.started_at
    ? Math.floor((Date.now() - new Date(action.started_at).getTime()) / 86400000)
    : null

  async function handleStart() {
    setActing(true)
    await fetch(`/api/actions/${action.id}/start`, { method: 'POST' })
    setActing(false)
    onRefresh()
    if (portalUrl) window.open(portalUrl, '_blank', 'noopener,noreferrer')
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

  async function handleSaveRef() {
    setSavingRef(true)
    await fetch(`/api/actions/${action.id}/ref`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ portal_ref: refDraft.trim() || null }),
    })
    setTrackingRef(refDraft.trim())
    setSavingRef(false)
    setShowRefInput(false)
  }

  async function handleConfirmWithRef() {
    if (!confirmRef.trim()) return
    setSavingRef(true)
    await fetch(`/api/actions/${action.id}/ref`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ portal_ref: confirmRef.trim() }),
    })
    setTrackingRef(confirmRef.trim())
    setSavingRef(false)
    onComplete(action.id)
  }

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 hover:border-[#2A4A7F] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${cfg.badge}`}>
              {cfg.label}
            </span>
            <ExecStatusPill status={execStatus} />
            {execStatus === 'IN_PROGRESS' && daysElapsed !== null && (
              <span className="text-xs text-amber-400/60">
                {daysElapsed === 0 ? 'started today' : `${daysElapsed}d in progress`}
              </span>
            )}
            {shipRef && (
              <span className="text-xs text-[#64748B] font-medium">
                {shipRef.name ?? shipRef.reference_number}
              </span>
            )}
            {assignee && (
              <span className="flex items-center gap-1 text-xs text-blue-400">
                <User size={9} />{assignee}
              </span>
            )}
          </div>

          {/* Title */}
          <p className="text-sm font-semibold text-white leading-snug mb-1">{action.title}</p>

          {/* Deadline row */}
          <div className="flex items-center gap-3 flex-wrap">
            <DueLabel due={action.due_date} />
          </div>

          {/* Permit progress — visible when action is being worked on */}
          {execStatus === 'IN_PROGRESS' && daysElapsed !== null && (
            <PermitProgressBar actionType={action.action_type} daysElapsed={daysElapsed} />
          )}

          {/* Expand toggle */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#94A3B8] mt-1.5 transition-colors"
          >
            <Info size={10} />
            {expanded ? 'Close' : 'Checklist'}
            <ChevronRight size={10} className={`transition-transform ${expanded ? 'rotate-90' : ''}`} />
          </button>

          {expanded && (
            <>
              {action.description && (
                <p className="text-xs text-[#94A3B8] mt-2 pl-1 border-l border-[#1E3A5F] leading-relaxed">
                  {action.description}
                </p>
              )}
              {action.trigger_reason && (
                <p className="text-xs text-[#334155] mt-1.5 pl-1 italic">{action.trigger_reason}</p>
              )}
              <DocChecklist actionId={action.id} actionType={action.action_type} />

              {/* Application reference number */}
              <div className="mt-3 pt-3 border-t border-[#1E3A5F]">
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Hash size={10} className="text-[#64748B]" />
                  <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wide">Application Ref</span>
                </div>
                {trackingRef && !showRefInput ? (
                  <div className="flex items-center gap-2">
                    <code className="text-xs text-white bg-[#0A1628] px-2 py-1 rounded border border-[#1E3A5F] font-mono">{trackingRef}</code>
                    <button
                      onClick={() => { setRefDraft(trackingRef); setShowRefInput(true) }}
                      className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                ) : showRefInput ? (
                  <div className="flex gap-2">
                    <input
                      value={refDraft}
                      onChange={(e) => setRefDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSaveRef()}
                      placeholder="e.g. PPB/IMP/2026/00123"
                      className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-2 py-1.5 text-white placeholder:text-[#334155] font-mono focus:outline-none focus:border-[#00C896]"
                    />
                    <button
                      onClick={handleSaveRef}
                      disabled={savingRef}
                      className="px-2 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-40"
                    >
                      {savingRef ? <Loader2 size={11} className="animate-spin" /> : 'Save'}
                    </button>
                    <button onClick={() => setShowRefInput(false)} className="text-[#64748B] text-xs hover:text-white px-1">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setRefDraft(''); setShowRefInput(true) }}
                    className="text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
                  >
                    + Add reference number
                  </button>
                )}
              </div>

              {/* Assignee */}
              <div className="mt-3 pt-3 border-t border-[#1E3A5F]">
                <div className="flex items-center gap-2">
                  <User size={10} className="text-[#64748B]" />
                  <span className="text-xs text-[#64748B] font-semibold uppercase tracking-wide">Assigned to</span>
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
                    className="flex items-center gap-1 text-xs text-[#64748B] hover:text-[#94A3B8] transition-colors"
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
          {/* Start — PENDING or AT_RISK (not yet started) */}
          {(!execStatus || execStatus === 'PENDING' || execStatus === 'AT_RISK') && (
            <div className="flex flex-col gap-1">
              <button
                onClick={handleStart}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 text-amber-400 border border-amber-400/25 rounded-lg text-xs font-semibold hover:bg-amber-400/20 disabled:opacity-50 transition-all"
                title={portalUrl ? `Opens ${portalLabel}` : undefined}
              >
                {acting ? <Loader2 size={11} className="animate-spin" /> : <ExternalLink size={11} />}
                {portalUrl ? portalLabel : 'Start'}
              </button>
              {registerInfo && (
                <a
                  href={registerInfo.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-slate-500 hover:text-slate-300 text-right leading-tight transition-colors"
                >
                  {registerInfo.label}
                </a>
              )}
            </div>
          )}

          {/* Resume Application — IN_PROGRESS with a portal */}
          {execStatus === 'IN_PROGRESS' && portalUrl && (
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/10 text-amber-400 border border-amber-400/25 rounded-lg text-xs font-semibold hover:bg-amber-400/20 transition-all"
            >
              <ExternalLink size={11} />
              Resume Application
            </a>
          )}

          {/* Done — requires confirm tap to prevent accidents */}
          {showDoneConfirm ? (
            <div className="flex flex-col gap-1">
              <button
                onClick={() => { onComplete(action.id); setShowDoneConfirm(false) }}
                disabled={isBusy}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/20 text-[#00C896] border border-[#00C896]/40 rounded-lg text-xs font-semibold hover:bg-[#00C896]/30 disabled:opacity-50 transition-all"
              >
                {completing === action.id ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />}
                Confirm
              </button>
              <button
                onClick={() => setShowDoneConfirm(false)}
                className="text-xs text-[#64748B] hover:text-[#94A3B8] text-center transition-colors"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowDoneConfirm(true)}
              disabled={isBusy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-50 transition-all"
            >
              <CheckCircle2 size={11} />
              Done
            </button>
          )}

          {/* Fail toggle */}
          <button
            onClick={() => { setExpanded(true); setShowFail(!showFail) }}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-400/60 border border-[#1E3A5F] rounded-lg text-xs hover:text-red-400 hover:border-red-500/25 disabled:opacity-50 transition-colors"
          >
            <XCircle size={11} />
            Blocked
          </button>

          {/* Dismiss */}
          <button
            onClick={() => onDismiss(action.id)}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[#64748B] border border-[#1E3A5F] rounded-lg text-xs hover:text-[#94A3B8] disabled:opacity-50 transition-colors"
          >
            Archive
          </button>
        </div>
      </div>

      {/* Completion confirmation banner — two-step: ask → require reference number */}
      {execStatus === 'IN_PROGRESS' && portalUrl && confirmStep !== 'dismissed' && (
        <div className="mt-3 pt-3 border-t border-amber-400/15">
          {confirmStep === 'ask' ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className="text-xs text-amber-300/70">Back from the portal — did you submit your application?</span>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setConfirmStep('ref_required')}
                  className="text-xs px-2.5 py-1 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg font-semibold hover:bg-[#00C896]/20 transition-all"
                >
                  Yes, submitted
                </button>
                <button
                  onClick={() => setConfirmStep('dismissed')}
                  className="text-xs px-2.5 py-1 text-[#64748B] border border-[#1E3A5F] rounded-lg hover:text-[#94A3B8] transition-colors"
                >
                  Still working
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[#94A3B8]">
                Paste your application reference number to confirm submission — this is your proof.
              </p>
              <div className="flex gap-2">
                <input
                  value={confirmRef}
                  onChange={(e) => setConfirmRef(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleConfirmWithRef()}
                  placeholder="e.g. PPB/IMP/2026/00123"
                  autoFocus
                  className="flex-1 text-xs bg-[#0A1628] border border-[#00C896]/30 rounded-lg px-2 py-1.5 text-white placeholder:text-[#334155] font-mono focus:outline-none focus:border-[#00C896]"
                />
                <button
                  onClick={handleConfirmWithRef}
                  disabled={!confirmRef.trim() || savingRef || isBusy}
                  className="px-3 py-1.5 bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/25 rounded-lg text-xs font-semibold hover:bg-[#00C896]/20 disabled:opacity-40 transition-all"
                >
                  {savingRef ? <Loader2 size={11} className="animate-spin" /> : 'Confirm'}
                </button>
                <button
                  onClick={() => setConfirmStep('ask')}
                  className="text-[#64748B] text-xs hover:text-white px-1 transition-colors"
                >
                  ✕
                </button>
              </div>
              <p className="text-xs text-[#334155]">No reference number yet? You haven&apos;t submitted — go back to the portal.</p>
            </div>
          )}
        </div>
      )}
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
  const [undoId, setUndoId]       = useState<string | null>(null)
  const undoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

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
      if (res.ok) {
        setActions((prev) => prev.filter((a) => a.id !== id))
        // Open 5-second undo window
        if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
        setUndoId(id)
        undoTimerRef.current = setTimeout(() => setUndoId(null), 5000)
      }
    } finally {
      setCompleting(null)
    }
  }

  async function handleUndo() {
    if (!undoId) return
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current)
    const id = undoId
    setUndoId(null)
    await fetch(`/api/actions/${id}/reopen`, { method: 'POST' })
    await load()
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
          <h1 className="text-xl lg:text-2xl font-bold text-white">Compliance Actions</h1>
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

      {/* Undo toast */}
      {undoId && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl">
          <CheckCircle2 size={14} className="text-[#00C896] shrink-0" />
          <span className="text-sm text-white">Marked as complete</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-amber-400 hover:text-amber-300 transition-colors ml-1"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}
