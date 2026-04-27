'use client'
import { useState, useEffect } from 'react'
import { Plus, Calendar, AlertTriangle, CheckCircle2, Clock, X, Check, Loader2, RefreshCw, Trash2 } from 'lucide-react'

type Obligation = {
  id: string
  title: string
  regulator: string | null
  obligation_type: string
  due_date: string
  recurrence_days: number | null
  status: string
  notes: string | null
  created_at: string
}

const REGULATORS = ['KEBS', 'PPB', 'KEPHIS', 'PCPB', 'EPRA', 'NEMA', 'KRA', 'KENTRADE', 'Other']

function daysUntil(dateStr: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  return Math.ceil((new Date(dateStr).getTime() - today.getTime()) / 86400000)
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function DueBadge({ days }: { days: number }) {
  if (days < 0)  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">OVERDUE {Math.abs(days)}d</span>
  if (days === 0) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">DUE TODAY</span>
  if (days <= 7)  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">DUE IN {days}d</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">DUE IN {days}d</span>
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1E3A5F] text-[#64748B] border border-[#1E3A5F]">{fmt(String(''))}{days}d away</span>
}

function AddObligationModal({ onClose, onSave }: { onClose: () => void; onSave: (o: Obligation) => void }) {
  const [form, setForm] = useState({
    title: '', regulator: '', obligation_type: 'RECURRING', due_date: '', recurrence_days: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim() || !form.due_date) return setError('Title and due date are required')
    setSaving(true)
    try {
      const r = await fetch('/api/compliance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          regulator: form.regulator || null,
          recurrence_days: form.recurrence_days ? parseInt(form.recurrence_days) : null,
        }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onSave(d.obligation)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <h2 className="text-white font-bold">Add Obligation</h2>
          <button onClick={onClose}><X size={18} className="text-[#64748B] hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Title *</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
              placeholder="e.g. KEBS Registration Renewal" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Regulator</label>
              <select value={form.regulator} onChange={(e) => setForm({ ...form, regulator: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
                <option value="">Any</option>
                {REGULATORS.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Type</label>
              <select value={form.obligation_type} onChange={(e) => setForm({ ...form, obligation_type: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
                <option value="RECURRING">Recurring</option>
                <option value="ONE_TIME">One-time</option>
                <option value="SHIPMENT_LINKED">Shipment-linked</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Due Date *</label>
              <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Recurs Every (days)</label>
              <input type="number" value={form.recurrence_days} onChange={(e) => setForm({ ...form, recurrence_days: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="365" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896] resize-none"
              placeholder="Any additional context..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#64748B] hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function CompliancePage() {
  const [obligations, setObligations] = useState<Obligation[]>([])
  const [loading, setLoading]         = useState(true)
  const [showAdd, setShowAdd]         = useState(false)
  const [filter, setFilter]           = useState<'ALL' | 'OPEN' | 'DONE'>('ALL')

  useEffect(() => {
    fetch('/api/compliance')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setObligations(d) })
      .finally(() => setLoading(false))
  }, [])

  async function markDone(id: string) {
    await fetch(`/api/compliance/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'DONE' }),
    })
    setObligations((prev) => prev.map((o) => o.id === id ? { ...o, status: 'DONE' } : o))
  }

  async function remove(id: string) {
    if (!confirm('Archive this obligation?')) return
    await fetch(`/api/compliance/${id}`, { method: 'DELETE' })
    setObligations((prev) => prev.filter((o) => o.id !== id))
  }

  const filtered = obligations.filter((o) => filter === 'ALL' || o.status === filter)
  const upcoming = obligations.filter((o) => o.status === 'OPEN' && daysUntil(o.due_date) <= 14)

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]"><Loader2 size={20} className="animate-spin mr-2" />Loading...</div>

  return (
    <div className="px-4 lg:px-5 py-5 lg:py-6 space-y-4 lg:space-y-6">
      {showAdd && (
        <AddObligationModal
          onClose={() => setShowAdd(false)}
          onSave={(o) => { setObligations((prev) => [...prev, o].sort((a, b) => a.due_date.localeCompare(b.due_date))); setShowAdd(false) }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Compliance Calendar</h1>
          <p className="text-[#64748B] text-sm mt-1">{obligations.filter((o) => o.status === 'OPEN').length} open obligations</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
        >
          <Plus size={14} /> Add Obligation
        </button>
      </div>

      {upcoming.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-amber-400" />
            <span className="text-amber-400 font-bold text-sm">{upcoming.length} obligation{upcoming.length !== 1 ? 's' : ''} due within 14 days</span>
          </div>
          <div className="space-y-1">
            {upcoming.map((o) => (
              <div key={o.id} className="text-xs text-amber-300/80">
                • {o.title} — {fmt(o.due_date)} ({daysUntil(o.due_date)}d)
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        {(['ALL', 'OPEN', 'DONE'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filter === f ? 'bg-[#00C896]/15 text-[#00C896] border border-[#00C896]/30' : 'bg-[#0F2040] text-[#64748B] border border-[#1E3A5F] hover:text-white'}`}>
            {f}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Calendar size={32} className="text-[#1E3A5F] mb-3" />
          <p className="text-[#64748B] text-sm">No obligations yet. Track license renewals, recurring filings, and deadlines.</p>
        </div>
      ) : (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E3A5F] bg-[#0A1628]">
                {['Obligation', 'Regulator', 'Due Date', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]">
              {filtered.map((o) => {
                const days = daysUntil(o.due_date)
                return (
                  <tr key={o.id} className={`hover:bg-[#1E3A5F]/20 transition-colors ${o.status === 'DONE' ? 'opacity-50' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white font-medium">{o.title}</div>
                      {o.notes && <div className="text-[11px] text-[#64748B] mt-0.5 truncate max-w-xs">{o.notes}</div>}
                      {o.recurrence_days && (
                        <div className="flex items-center gap-1 mt-1 text-[10px] text-[#475569]">
                          <RefreshCw size={9} /> Every {o.recurrence_days}d
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{o.regulator ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{fmt(o.due_date)}</div>
                      {o.status === 'OPEN' && <div className="mt-1"><DueBadge days={days} /></div>}
                    </td>
                    <td className="px-4 py-3">
                      {o.status === 'DONE'
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={12} /> Done</span>
                        : <span className="flex items-center gap-1 text-xs text-[#64748B]"><Clock size={12} /> Open</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {o.status === 'OPEN' && (
                          <button onClick={() => markDone(o.id)}
                            className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
                            <CheckCircle2 size={12} /> Done
                          </button>
                        )}
                        <button onClick={() => remove(o.id)} className="text-[#64748B] hover:text-red-400 transition-colors">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
