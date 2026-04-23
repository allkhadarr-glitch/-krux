'use client'
import { useState, useEffect } from 'react'
import { Plus, Phone, Mail, MessageSquare, Trash2, Edit2, X, Check, Loader2, Users } from 'lucide-react'

type Contact = {
  id: string
  name: string
  contact_type: string
  phone: string | null
  email: string | null
  whatsapp: string | null
  ports: string[]
  specializations: string[]
  notes: string | null
  created_at: string
}

const TYPE_COLORS: Record<string, string> = {
  CLEARING_AGENT: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  FREIGHT_FORWARDER: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  CUSTOMS_OFFICER: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  SUPPLIER: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  OTHER: 'bg-[#1E3A5F] text-[#64748B] border-[#1E3A5F]',
}

const CONTACT_TYPES = ['CLEARING_AGENT', 'FREIGHT_FORWARDER', 'CUSTOMS_OFFICER', 'SUPPLIER', 'OTHER']
const TYPE_LABELS: Record<string, string> = {
  CLEARING_AGENT: 'Clearing Agent', FREIGHT_FORWARDER: 'Freight Forwarder',
  CUSTOMS_OFFICER: 'Customs Officer', SUPPLIER: 'Supplier', OTHER: 'Other',
}

const PORTS = ['Mombasa', 'Nairobi ICD', 'Jomo Kenyatta Airport', 'Wilson Airport', 'Malaba', 'Busia', 'Namanga']

function AddContactModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Contact) => void }) {
  const [form, setForm] = useState({
    name: '', contact_type: 'CLEARING_AGENT', phone: '', email: '', whatsapp: '', notes: '', ports: [] as string[], specializations: [] as string[],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return setError('Name is required')
    setSaving(true)
    try {
      const r = await fetch('/api/contacts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      onSave(d.contact)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  function togglePort(p: string) {
    setForm((f) => ({ ...f, ports: f.ports.includes(p) ? f.ports.filter((x) => x !== p) : [...f.ports, p] }))
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <h2 className="text-white font-bold">Add Contact</h2>
          <button onClick={onClose}><X size={18} className="text-[#64748B] hover:text-white" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
              placeholder="John Mwangi" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Type</label>
            <select value={form.contact_type} onChange={(e) => setForm({ ...form, contact_type: e.target.value })}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
              {CONTACT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="+254 7XX XXX XXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">WhatsApp</label>
              <input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="+254 7XX XXX XXX" />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Email</label>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
              placeholder="agent@example.com" />
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-2 block">Active Ports</label>
            <div className="flex flex-wrap gap-2">
              {PORTS.map((p) => (
                <button key={p} type="button" onClick={() => togglePort(p)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold border transition-all ${form.ports.includes(p) ? 'bg-[#00C896]/15 text-[#00C896] border-[#00C896]/30' : 'bg-[#0A1628] text-[#64748B] border-[#1E3A5F] hover:border-[#64748B]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896] resize-none"
              placeholder="Any notes about this contact..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-[#64748B] hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-50">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save Contact
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading]   = useState(true)
  const [showAdd, setShowAdd]   = useState(false)
  const [search, setSearch]     = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('ALL')

  useEffect(() => {
    fetch('/api/contacts')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setContacts(d) })
      .finally(() => setLoading(false))
  }, [])

  async function deleteContact(id: string) {
    if (!confirm('Remove this contact?')) return
    await fetch(`/api/contacts/${id}`, { method: 'DELETE' })
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const filtered = contacts
    .filter((c) => typeFilter === 'ALL' || c.contact_type === typeFilter)
    .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.email ?? '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]"><Loader2 size={20} className="animate-spin mr-2" />Loading contacts...</div>

  return (
    <div className="p-6 space-y-6">
      {showAdd && (
        <AddContactModal
          onClose={() => setShowAdd(false)}
          onSave={(c) => { setContacts((prev) => [c, ...prev]); setShowAdd(false) }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Agent Directory</h1>
          <p className="text-[#64748B] text-sm mt-1">{contacts.length} contacts · Clearing agents, freight forwarders, suppliers</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
        >
          <Plus size={14} /> Add Contact
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input
          value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 min-w-48 bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#00C896]"
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
          <option value="ALL">All Types</option>
          {CONTACT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users size={32} className="text-[#1E3A5F] mb-3" />
          <p className="text-[#64748B] text-sm">{contacts.length === 0 ? 'No contacts yet. Add your first clearing agent.' : 'No contacts match your search.'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 hover:border-[#00C896]/30 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-sm">{c.name}</h3>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${TYPE_COLORS[c.contact_type] ?? TYPE_COLORS.OTHER}`}>
                    {TYPE_LABELS[c.contact_type] ?? c.contact_type}
                  </span>
                </div>
                <button onClick={() => deleteContact(c.id)} className="text-[#64748B] hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="space-y-1.5 text-xs">
                {c.phone && (
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Phone size={11} className="text-[#64748B]" /> {c.phone}
                  </div>
                )}
                {c.whatsapp && (
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <MessageSquare size={11} className="text-[#64748B]" /> {c.whatsapp}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-2 text-[#94A3B8]">
                    <Mail size={11} className="text-[#64748B]" /> {c.email}
                  </div>
                )}
              </div>

              {c.ports.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {c.ports.map((p) => (
                    <span key={p} className="px-1.5 py-0.5 bg-[#0A1628] text-[#64748B] text-[9px] rounded font-medium">{p}</span>
                  ))}
                </div>
              )}

              {c.notes && (
                <p className="mt-2 text-[11px] text-[#64748B] line-clamp-2 italic">{c.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
