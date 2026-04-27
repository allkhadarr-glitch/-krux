'use client'
import { useState, useEffect } from 'react'
import { Plus, X, Check, Loader2, AlertTriangle, CheckCircle2, Clock, Trash2, FileText } from 'lucide-react'

type OrgDoc = {
  id: string
  document_type: string
  issuer: string | null
  reference_number: string | null
  issue_date: string | null
  expiry_date: string
  status: string
  notes: string | null
  created_at: string
}

const DOC_TYPES = [
  'Business Permit', 'PPB Registration', 'KEBS Certification', 'KEPHIS Import Permit',
  'PCPB Registration', 'EPRA License', 'NEMA Permit', 'KRA PIN Certificate',
  'ISO Certification', 'GMP Certificate', 'Food Handler Certificate',
  'Import Declaration Form', 'Clearing Agent License', 'Other',
]

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}

function ExpiryBadge({ days }: { days: number }) {
  if (days < 0)   return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">EXPIRED {Math.abs(days)}d ago</span>
  if (days === 0) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30">EXPIRES TODAY</span>
  if (days <= 30) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">EXPIRES IN {days}d</span>
  if (days <= 90) return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-400 border border-blue-500/30">{days}d left</span>
  return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">{days}d left</span>
}

function AddDocModal({ onClose, onSave }: { onClose: () => void; onSave: (d: OrgDoc) => void }) {
  const [form, setForm] = useState({ document_type: '', issuer: '', reference_number: '', issue_date: '', expiry_date: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.document_type || !form.expiry_date) return setError('Document type and expiry date are required')
    setSaving(true)
    try {
      const r = await fetch('/api/org-documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onSave(d.document)
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <h2 className="text-white font-bold">Add License / Certificate</h2>
          <button onClick={onClose}><X size={18} className="text-[#64748B] hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Document Type *</label>
            <select value={form.document_type} onChange={(e) => setForm({ ...form, document_type: e.target.value })}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
              <option value="">Select type</option>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Issuing Body</label>
              <input value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. PPB" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Ref / Number</label>
              <input value={form.reference_number} onChange={(e) => setForm({ ...form, reference_number: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="Certificate #" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={(e) => setForm({ ...form, issue_date: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Expiry Date *</label>
              <input type="date" value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896] resize-none"
              placeholder="Renewal process, contacts..." />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#64748B] hover:text-white">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function LicensesPage() {
  const [docs, setDocs]       = useState<OrgDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => {
    fetch('/api/org-documents')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setDocs(d) })
      .finally(() => setLoading(false))
  }, [])

  async function remove(id: string) {
    if (!confirm('Archive this document?')) return
    await fetch(`/api/org-documents/${id}`, { method: 'DELETE' })
    setDocs((prev) => prev.filter((d) => d.id !== id))
  }

  const urgent = docs.filter((d) => daysUntil(d.expiry_date) <= 30 && d.status === 'ACTIVE')
  const expired = docs.filter((d) => daysUntil(d.expiry_date) < 0 && d.status === 'ACTIVE')

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]"><Loader2 size={20} className="animate-spin mr-2" />Loading...</div>

  return (
    <div className="px-4 lg:px-5 py-5 lg:py-6 space-y-4 lg:space-y-6">
      {showAdd && <AddDocModal onClose={() => setShowAdd(false)} onSave={(d) => { setDocs((prev) => [...prev, d].sort((a, b) => a.expiry_date.localeCompare(b.expiry_date))); setShowAdd(false) }} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">License &amp; Certificate Tracker</h1>
          <p className="text-[#64748B] text-sm mt-1">{docs.length} documents · {expired.length} expired · {urgent.length} expiring soon</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors">
          <Plus size={14} /> Add Document
        </button>
      </div>

      {(expired.length > 0 || urgent.length > 0) && (
        <div className="space-y-2">
          {expired.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
              <span className="text-red-400 text-sm font-semibold">{expired.length} document{expired.length !== 1 ? 's' : ''} expired — renewal required immediately</span>
            </div>
          )}
          {urgent.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 flex items-center gap-2">
              <Clock size={14} className="text-amber-400 flex-shrink-0" />
              <span className="text-amber-400 text-sm font-semibold">{urgent.length} document{urgent.length !== 1 ? 's' : ''} expiring within 30 days</span>
            </div>
          )}
        </div>
      )}

      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <FileText size={36} className="text-[#1E3A5F] mb-3" />
          <p className="text-[#64748B] text-sm">No documents tracked yet.</p>
          <p className="text-[#475569] text-xs mt-1">Add your PPB registration, KEBS cert, business permit, and other licenses.</p>
        </div>
      ) : (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#1E3A5F] bg-[#0A1628]">
                {['Document', 'Issuer', 'Reference', 'Issue Date', 'Expiry', 'Status', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]">
              {docs.map((doc) => {
                const days = daysUntil(doc.expiry_date)
                return (
                  <tr key={doc.id} className={`hover:bg-[#1E3A5F]/20 transition-colors ${days < 0 ? 'opacity-60' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{doc.document_type}</div>
                      {doc.notes && <div className="text-[11px] text-[#64748B] mt-0.5 truncate max-w-xs">{doc.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{doc.issuer ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-[#64748B] font-mono">{doc.reference_number ?? '—'}</td>
                    <td className="px-4 py-3 text-sm text-[#94A3B8]">{doc.issue_date ? fmt(doc.issue_date) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{fmt(doc.expiry_date)}</div>
                      <div className="mt-1"><ExpiryBadge days={days} /></div>
                    </td>
                    <td className="px-4 py-3">
                      {days >= 0
                        ? <span className="flex items-center gap-1 text-xs text-emerald-400"><CheckCircle2 size={11} /> Active</span>
                        : <span className="flex items-center gap-1 text-xs text-red-400"><AlertTriangle size={11} /> Expired</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => remove(doc.id)} className="text-[#64748B] hover:text-red-400 transition-colors">
                        <Trash2 size={13} />
                      </button>
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
