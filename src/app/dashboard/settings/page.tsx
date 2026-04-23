'use client'
import { useState, useEffect } from 'react'
import { Loader2, Check, User, Building2, Bell } from 'lucide-react'

type Profile = {
  full_name: string
  role: string
  phone: string
  organization_id: string
}

const ROLES = [
  { value: 'admin',      label: 'Admin',           desc: 'Full access — manage shipments, users, settings' },
  { value: 'operations', label: 'Operations',       desc: 'Create/edit shipments and actions' },
  { value: 'finance',    label: 'Finance (read)',   desc: 'View costs and analytics only' },
  { value: 'field',      label: 'Field Agent',      desc: 'Update action status via mobile view' },
]

export default function SettingsPage() {
  const [profile, setProfile] = useState<Profile>({ full_name: '', role: 'operations', phone: '', organization_id: '' })
  const [loading, setSaving]  = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setProfile(d) })
      .catch(() => {})
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const r = await fetch('/api/profile', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Failed to save')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-[#64748B] text-sm mt-1">Manage your profile and access</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        {/* Profile */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} className="text-[#00C896]" />
            <h3 className="text-white font-semibold text-sm">Your Profile</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Full Name</label>
              <input value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="Your full name" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Phone / WhatsApp</label>
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="+254 7XX XXX XXX" />
            </div>
          </div>
        </div>

        {/* Role */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Building2 size={14} className="text-[#00C896]" />
            <h3 className="text-white font-semibold text-sm">Role &amp; Access</h3>
          </div>
          <div className="space-y-2">
            {ROLES.map((r) => (
              <label key={r.value} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${profile.role === r.value ? 'border-[#00C896]/40 bg-[#00C896]/5' : 'border-[#1E3A5F] hover:border-[#64748B]'}`}>
                <input type="radio" name="role" value={r.value} checked={profile.role === r.value}
                  onChange={() => setProfile({ ...profile, role: r.value })}
                  className="mt-0.5 accent-[#00C896]" />
                <div>
                  <div className="text-sm font-semibold text-white">{r.label}</div>
                  <div className="text-xs text-[#64748B] mt-0.5">{r.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* System info */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-[#00C896]" />
            <h3 className="text-white font-semibold text-sm">System Info</h3>
          </div>
          <div className="space-y-2 text-xs">
            {[
              ['Version',              'KRUX v1.0'],
              ['AI Engine',            'Claude Sonnet 4.6'],
              ['Regulatory Coverage',  '8 bodies'],
              ['Exchange Rate',        'KES 129 / USD 1'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#1E3A5F] pb-2 last:border-0">
                <span className="text-[#64748B]">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>

        {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}
