'use client'
import { useState, useEffect } from 'react'
import { Manufacturer, ManufacturerLicense, RiskFlag } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { RiskBadge } from '@/components/RiskBadge'
import {
  Factory, Plus, X, Loader2, ChevronDown, ChevronUp,
  ShieldCheck, AlertTriangle, Clock, ExternalLink, Save,
} from 'lucide-react'

// ─── helpers ────────────────────────────────────────────────

const licenseStatusColors: Record<string, string> = {
  ACTIVE:          'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  EXPIRING_60:     'text-amber-400  bg-amber-400/10  border-amber-400/20',
  EXPIRING_30:     'text-orange-400 bg-orange-400/10 border-orange-400/20',
  EXPIRING_7:      'text-red-400    bg-red-400/10    border-red-400/20',
  EXPIRED:         'text-red-500    bg-red-500/10    border-red-500/20',
  SUSPENDED:       'text-red-400    bg-red-400/10    border-red-400/20',
  PENDING_RENEWAL: 'text-blue-400   bg-blue-400/10   border-blue-400/20',
}

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86400000)
}

// ─── Add Manufacturer Modal ──────────────────────────────────

function AddManufacturerModal({ onClose, onAdded }: { onClose: () => void; onAdded: (m: Manufacturer) => void }) {
  const [form, setForm] = useState({
    company_name: '', country: 'IN', city: '', state: '',
    primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '',
    product_categories: '', overall_risk: 'AMBER' as RiskFlag, notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch('/api/manufacturers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        product_categories: form.product_categories
          ? form.product_categories.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    onAdded({ ...data, licenses: [] })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <h2 className="text-white font-bold">Add Manufacturer</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Company Name *</label>
              <input required value={form.company_name} onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. Ahuja Pharmaceuticals Ltd" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Country *</label>
              <select required value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]">
                <option value="IN">India</option>
                <option value="CN">China</option>
                <option value="KE">Kenya</option>
                <option value="AE">UAE</option>
                <option value="GB">UK</option>
                <option value="DE">Germany</option>
                <option value="US">USA</option>
              </select>
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">City</label>
              <input value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. Mumbai" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Contact Name</label>
              <input value={form.primary_contact_name} onChange={(e) => setForm((f) => ({ ...f, primary_contact_name: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. Raj Sharma" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Contact Phone</label>
              <input value={form.primary_contact_phone} onChange={(e) => setForm((f) => ({ ...f, primary_contact_phone: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="+91 98..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Contact Email</label>
              <input type="email" value={form.primary_contact_email} onChange={(e) => setForm((f) => ({ ...f, primary_contact_email: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="contact@manufacturer.com" />
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Product Categories <span className="normal-case text-[#64748B]">(comma-separated)</span></label>
              <input value={form.product_categories} onChange={(e) => setForm((f) => ({ ...f, product_categories: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. Pharmaceuticals, Medical Devices" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Risk Rating</label>
              <select value={form.overall_risk} onChange={(e) => setForm((f) => ({ ...f, overall_risk: e.target.value as RiskFlag }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]">
                <option value="GREEN">GREEN</option>
                <option value="AMBER">AMBER</option>
                <option value="RED">RED</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896] resize-none"
                placeholder="Any relevant notes..." />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] rounded-lg font-bold text-sm hover:bg-[#00A87E] disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Add Manufacturer'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Add License Modal ───────────────────────────────────────

function AddLicenseModal({ manufacturer, onClose, onAdded }: {
  manufacturer: Manufacturer
  onClose: () => void
  onAdded: (l: ManufacturerLicense) => void
}) {
  const [form, setForm] = useState({
    license_name: '', license_type: 'GMP', license_number: '',
    issuing_body: '', issuing_country: 'IN', expiry_date: '', scope: '', notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const res = await fetch(`/api/manufacturers/${manufacturer.id}/licenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setError(data.error ?? 'Failed to save'); return }
    onAdded(data)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E3A5F]">
          <div>
            <h2 className="text-white font-bold">Add License</h2>
            <p className="text-xs text-[#64748B] mt-0.5">{manufacturer.company_name}</p>
          </div>
          <button onClick={onClose} className="text-[#64748B] hover:text-white"><X size={18} /></button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">License Name *</label>
              <input required value={form.license_name} onChange={(e) => setForm((f) => ({ ...f, license_name: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. WHO-GMP Certificate" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">License Type *</label>
              <select required value={form.license_type} onChange={(e) => setForm((f) => ({ ...f, license_type: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]">
                <option value="GMP">GMP</option>
                <option value="ISO">ISO</option>
                <option value="CE">CE Mark</option>
                <option value="PVOC">PVoC</option>
                <option value="PPB">PPB Approval</option>
                <option value="KEBS">KEBS Certification</option>
                <option value="EXPORT">Export License</option>
                <option value="FACTORY">Factory Registration</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">License Number</label>
              <input value={form.license_number} onChange={(e) => setForm((f) => ({ ...f, license_number: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. GMP/IN/2024/001" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Issuing Body *</label>
              <input required value={form.issuing_body} onChange={(e) => setForm((f) => ({ ...f, issuing_body: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. CDSCO India" />
            </div>
            <div>
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Issuing Country</label>
              <select value={form.issuing_country} onChange={(e) => setForm((f) => ({ ...f, issuing_country: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]">
                <option value="IN">India</option>
                <option value="CN">China</option>
                <option value="KE">Kenya</option>
                <option value="AE">UAE</option>
                <option value="GB">UK</option>
                <option value="DE">Germany</option>
                <option value="US">USA</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Expiry Date *</label>
              <input required type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]" />
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Scope</label>
              <input value={form.scope} onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value }))}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896]"
                placeholder="e.g. Oral solid dosage forms" />
            </div>
            <div className="col-span-2">
              <label className="block text-[#94A3B8] text-xs font-medium mb-1.5 uppercase tracking-wider">Notes</label>
              <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#00C896] resize-none" />
            </div>
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

          <button type="submit" disabled={saving}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#00C896] text-[#0A1628] rounded-lg font-bold text-sm hover:bg-[#00A87E] disabled:opacity-60 transition-colors">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {saving ? 'Saving...' : 'Add License'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── License Row ─────────────────────────────────────────────

function LicenseRow({ license }: { license: ManufacturerLicense }) {
  const days = daysUntil(license.expiry_date)
  const urgent = days <= 30
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-[#0A1628] border border-[#1E3A5F]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-white truncate">{license.license_name}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1E3A5F] text-[#94A3B8] font-medium">{license.license_type}</span>
        </div>
        <div className="text-[10px] text-[#64748B] mt-0.5">
          {license.issuing_body} · {license.license_number || 'No number'}
        </div>
      </div>
      <div className="text-right ml-3 shrink-0">
        <div className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${licenseStatusColors[license.status] ?? 'text-[#64748B]'}`}>
          {license.status.replace(/_/g, ' ')}
        </div>
        <div className={`text-[10px] mt-0.5 flex items-center justify-end gap-1 ${urgent ? 'text-red-400' : 'text-[#64748B]'}`}>
          {urgent && <AlertTriangle size={9} />}
          <Clock size={9} />
          {days > 0 ? `${days}d left` : `${Math.abs(days)}d overdue`}
        </div>
      </div>
    </div>
  )
}

// ─── Manufacturer Row ────────────────────────────────────────

function ManufacturerRow({
  manufacturer, onAddLicense,
}: {
  manufacturer: Manufacturer
  onAddLicense: (m: Manufacturer) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const licenses = manufacturer.licenses ?? []
  const expiringSoon = licenses.filter((l) => ['EXPIRING_7', 'EXPIRING_30', 'EXPIRED'].includes(l.status)).length

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-[#1E3A5F]/30 transition-colors"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="w-9 h-9 rounded-lg bg-[#1E3A5F] flex items-center justify-center shrink-0">
          <Factory size={16} className="text-[#00C896]" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{manufacturer.company_name}</span>
            {manufacturer.is_preferred_supplier && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20 font-medium">Preferred</span>
            )}
            {manufacturer.is_blacklisted && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 font-medium">Blacklisted</span>
            )}
          </div>
          <div className="text-xs text-[#64748B] mt-0.5">
            {manufacturer.country}{manufacturer.city ? ` · ${manufacturer.city}` : ''}
            {manufacturer.primary_contact_name ? ` · ${manufacturer.primary_contact_name}` : ''}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {expiringSoon > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
              <AlertTriangle size={10} /> {expiringSoon} expiring
            </span>
          )}
          <div className="text-xs text-[#64748B]">{licenses.length} license{licenses.length !== 1 ? 's' : ''}</div>
          <RiskBadge risk={manufacturer.overall_risk} />
          <ShieldCheck size={14} className={manufacturer.is_vetted ? 'text-[#00C896]' : 'text-[#334155]'} />
          {expanded ? <ChevronUp size={14} className="text-[#64748B]" /> : <ChevronDown size={14} className="text-[#64748B]" />}
        </div>
      </div>

      {expanded && (
        <div className="px-5 pb-4 border-t border-[#1E3A5F] pt-4 space-y-2">
          {manufacturer.primary_contact_email && (
            <div className="flex items-center gap-2 text-xs text-[#64748B]">
              <ExternalLink size={11} />
              <a href={`mailto:${manufacturer.primary_contact_email}`} className="hover:text-[#00C896] transition-colors">
                {manufacturer.primary_contact_email}
              </a>
            </div>
          )}
          {manufacturer.product_categories?.length > 0 && (
            <div className="flex gap-1 flex-wrap">
              {manufacturer.product_categories.map((cat) => (
                <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full bg-[#1E3A5F] text-[#94A3B8]">{cat}</span>
              ))}
            </div>
          )}

          <div className="space-y-1.5 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">Licenses</span>
              <button
                onClick={(e) => { e.stopPropagation(); onAddLicense(manufacturer) }}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20 hover:bg-[#00C896]/20 transition-colors font-semibold"
              >
                <Plus size={10} /> Add License
              </button>
            </div>
            {licenses.length === 0
              ? <p className="text-xs text-[#64748B] py-2">No licenses added yet.</p>
              : licenses.map((l) => <LicenseRow key={l.id} license={l} />)
            }
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────

export default function ManufacturerVaultPage() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddMfr, setShowAddMfr] = useState(false)
  const [licenseTarget, setLicenseTarget] = useState<Manufacturer | null>(null)

  useEffect(() => {
    fetch('/api/manufacturers')
      .then((r) => r.json())
      .then(setManufacturers)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const totalLicenses    = manufacturers.reduce((n, m) => n + (m.licenses?.length ?? 0), 0)
  const expiringLicenses = manufacturers.reduce((n, m) => n + (m.licenses?.filter((l) => ['EXPIRING_7', 'EXPIRING_30', 'EXPIRED'].includes(l.status)).length ?? 0), 0)
  const vetted           = manufacturers.filter((m) => m.is_vetted).length
  const highRisk         = manufacturers.filter((m) => m.overall_risk === 'RED').length

  function handleLicenseAdded(manufacturerId: string, license: ManufacturerLicense) {
    setManufacturers((prev) =>
      prev.map((m) => m.id === manufacturerId
        ? { ...m, licenses: [...(m.licenses ?? []), license] }
        : m
      )
    )
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]">Loading vault...</div>
  if (error)   return <div className="flex items-center justify-center h-64 text-red-400">Error: {error}</div>

  return (
    <div className="px-4 lg:px-5 py-5 lg:py-6 space-y-4 lg:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Manufacturer Vault</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {manufacturers.length} manufacturer{manufacturers.length !== 1 ? 's' : ''} · {totalLicenses} licenses tracked
          </p>
        </div>
        <button
          onClick={() => setShowAddMfr(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors"
        >
          <Plus size={14} /> Add Manufacturer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total',          value: manufacturers.length, color: 'text-white' },
          { label: 'Vetted',         value: vetted,               color: 'text-[#00C896]' },
          { label: 'Licenses',       value: totalLicenses,        color: 'text-blue-400' },
          { label: 'Expiring / Expired', value: expiringLicenses, color: expiringLicenses > 0 ? 'text-red-400' : 'text-[#64748B]' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <div className={`text-2xl font-bold ${color}`}>{value}</div>
            <div className="text-xs text-[#64748B] mt-1">{label}</div>
          </div>
        ))}
      </div>

      {highRisk > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm font-medium">
            {highRisk} manufacturer{highRisk !== 1 ? 's' : ''} rated HIGH RISK — review recommended
          </p>
        </div>
      )}

      {manufacturers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Factory size={40} className="text-[#1E3A5F] mb-4" />
          <p className="text-white font-semibold">No manufacturers yet</p>
          <p className="text-[#64748B] text-sm mt-1">Add your first manufacturer to start tracking licenses and compliance.</p>
          <button onClick={() => setShowAddMfr(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors">
            <Plus size={14} /> Add Manufacturer
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {manufacturers.map((m) => (
            <ManufacturerRow key={m.id} manufacturer={m} onAddLicense={setLicenseTarget} />
          ))}
        </div>
      )}

      {showAddMfr && (
        <AddManufacturerModal
          onClose={() => setShowAddMfr(false)}
          onAdded={(m) => setManufacturers((prev) => [m, ...prev])}
        />
      )}

      {licenseTarget && (
        <AddLicenseModal
          manufacturer={licenseTarget}
          onClose={() => setLicenseTarget(null)}
          onAdded={(l) => { handleLicenseAdded(licenseTarget.id, l); setLicenseTarget(null) }}
        />
      )}
    </div>
  )
}
