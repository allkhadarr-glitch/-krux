'use client'
import { useState, useEffect } from 'react'
import { Loader2, Check, User, Building2, Bell, Lock, Trash2, Copy, CheckCheck, ShieldCheck } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const TYPE_LABEL: Record<string, string> = {
  IMP: 'Importer',
  AGT: 'Clearing Agent',
  MFG: 'Manufacturer',
  EXP: 'Exporter',
  BRK: 'Broker',
}

type Profile = {
  full_name: string
  role: string
  phone: string
  whatsapp_number: string
  organization_id: string
}

type KruxEntity = {
  krux_id:          string
  entity_type:      string
  compliance_score: number | null
  compliance_tier:  string | null
  total_shipments:  number
  avg_clearance_days: number | null
  is_verified:      boolean
}

const ROLES = [
  { value: 'admin',      label: 'Admin',           desc: 'Full access — manage shipments, users, settings' },
  { value: 'operations', label: 'Operations',       desc: 'Create/edit shipments and actions' },
  { value: 'finance',    label: 'Finance (read)',   desc: 'View costs and analytics only' },
  { value: 'field',      label: 'Field Agent',      desc: 'Update action status via mobile view' },
]

export default function SettingsPage() {
  const [profile, setProfile]   = useState<Profile>({ full_name: '', role: 'operations', phone: '', whatsapp_number: '', organization_id: '' })
  const [loading, setSaving]    = useState(false)
  const [saved, setSaved]       = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [kesRate, setKesRate]   = useState<number | null>(null)

  const [newPwd, setNewPwd]         = useState('')
  const [confirmPwd, setCfm]        = useState('')
  const [pwdSaving, setPwdSave]     = useState(false)
  const [pwdSaved, setPwdSaved]     = useState(false)
  const [pwdError, setPwdError]     = useState<string | null>(null)
  const [clearing, setClearing]     = useState(false)
  const [clearMsg, setClearMsg]     = useState<string | null>(null)
  const [entity, setEntity]         = useState<KruxEntity | null>(null)
  const [copied, setCopied]         = useState(false)
  const [copiedSig, setCopiedSig]   = useState(false)

  async function clearDemoData() {
    setClearing(true)
    setClearMsg(null)
    try {
      const r = await fetch('/api/shipments/clear-demo', { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? 'Failed')
      setClearMsg(`Cleared ${d.cleared} demo shipment${d.cleared !== 1 ? 's' : ''}. Your workspace is now empty — add your first real shipment.`)
      localStorage.removeItem('krux_auto_seeded')
      localStorage.removeItem('krux_demo_banner_dismissed')
    } catch (e: any) {
      setClearMsg(`Error: ${e.message}`)
    } finally {
      setClearing(false)
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPwd !== confirmPwd) { setPwdError('Passwords do not match.'); return }
    if (newPwd.length < 8)    { setPwdError('Password must be at least 8 characters.'); return }
    setPwdSave(true)
    setPwdError(null)
    const { error: err } = await supabase.auth.updateUser({ password: newPwd })
    setPwdSave(false)
    if (err) {
      setPwdError(err.message)
    } else {
      setPwdSaved(true)
      setNewPwd('')
      setCfm('')
      setTimeout(() => setPwdSaved(false), 3000)
    }
  }

  useEffect(() => {
    fetch('/api/profile')
      .then((r) => r.json())
      .then((d) => { if (!d.error) setProfile(d) })
      .catch(() => {})
    fetch('/api/fx/rate')
      .then(r => r.json())
      .then(d => { if (d.usd_kes) setKesRate(d.usd_kes) })
      .catch(() => {})
    fetch('/api/entity')
      .then(r => r.json())
      .then(d => { if (!d.error) setEntity(d) })
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
        <h1 className="text-xl lg:text-2xl font-bold text-white">Settings</h1>
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
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Phone</label>
              <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="+254 7XX XXX XXX" />
            </div>
            <div>
              <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">WhatsApp Number</label>
              <input value={profile.whatsapp_number} onChange={(e) => setProfile({ ...profile, whatsapp_number: e.target.value })}
                className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                placeholder="+254 7XX XXX XXX (for inbound commands)" />
              <p className="text-[10px] text-[#64748B] mt-1">Text "status" to your Twilio number to get today's shipment triage</p>
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
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between border-b border-[#1E3A5F] pb-2">
                <span className="text-[#64748B]">{k}</span>
                <span className="text-white font-medium">{v}</span>
              </div>
            ))}
            <div className="flex justify-between">
              <span className="text-[#64748B]">Live Exchange Rate</span>
              <span className="text-white font-medium">
                {kesRate != null ? `KES ${kesRate.toFixed(2)} / USD 1` : 'Loading…'}
              </span>
            </div>
          </div>
        </div>

        {/* KTIN */}
        {entity && (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck size={14} className="text-[#00C896]" />
              <h3 className="text-white font-semibold text-sm">KTIN — KRUX Trade Identity Number</h3>
              {entity.is_verified && (
                <span className="ml-auto text-[10px] font-bold text-[#00C896] bg-[#00C896]/10 border border-[#00C896]/30 px-2 py-0.5 rounded-full">VERIFIED</span>
              )}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="font-mono text-lg font-bold text-white tracking-wide">{entity.krux_id}</span>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(entity.krux_id); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
                className="p-1.5 rounded-md hover:bg-[#1E3A5F] transition-colors text-[#64748B] hover:text-white"
              >
                {copied ? <CheckCheck size={13} className="text-[#00C896]" /> : <Copy size={13} />}
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-[#0A1628] rounded-lg p-3">
                <p className="text-[#64748B] mb-1">Type</p>
                <p className="text-white font-semibold">
                  {entity.entity_type === 'IMP' ? 'Importer'
                  : entity.entity_type === 'AGT' ? 'Clearing Agent'
                  : entity.entity_type === 'MFG' ? 'Manufacturer'
                  : entity.entity_type === 'EXP' ? 'Exporter'
                  : 'Broker'}
                </p>
              </div>
              <div className="bg-[#0A1628] rounded-lg p-3">
                <p className="text-[#64748B] mb-1">Shipments</p>
                <p className="text-white font-semibold">{entity.total_shipments}</p>
              </div>
              <div className="bg-[#0A1628] rounded-lg p-3">
                <p className="text-[#64748B] mb-1">Compliance</p>
                <p className={`font-bold ${
                  entity.compliance_tier === 'PLATINUM' ? 'text-cyan-300'
                  : entity.compliance_tier === 'GOLD'    ? 'text-yellow-400'
                  : entity.compliance_tier === 'SILVER'  ? 'text-slate-300'
                  : entity.compliance_tier === 'BRONZE'  ? 'text-orange-400'
                  : 'text-[#64748B]'
                }`}>
                  {entity.compliance_tier
                    ? `${entity.compliance_tier} · ${entity.compliance_score}`
                    : entity.total_shipments < 5
                      ? `${5 - entity.total_shipments} more to unlock`
                      : 'Calculating…'}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-[#334155] mt-3">Your permanent trade identity on the KRUX network. Banks and insurers will use this ID to verify your compliance history.</p>

            {/* Email signature block */}
            <div className="mt-4 border-t border-[#1E3A5F] pt-4">
              <p className="text-[10px] text-[#64748B] uppercase tracking-wide mb-2">Email Signature Block</p>
              <div className="bg-[#060E1A] border border-[#1E3A5F] rounded-lg px-3 py-2.5 font-mono text-xs leading-relaxed select-all">
                <p className="text-white">
                  {entity.krux_id} | {TYPE_LABEL[entity.entity_type] ?? 'Broker'}{entity.compliance_tier ? ` | ${entity.compliance_tier}` : ''}
                </p>
                <p className="text-[#64748B]">Verified · kruxvon.com/verify/{entity.krux_id}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  const typeLabel = TYPE_LABEL[entity.entity_type] ?? 'Broker'
                  const tierPart = entity.compliance_tier ? ` | ${entity.compliance_tier}` : ''
                  const sig = `${entity.krux_id} | ${typeLabel}${tierPart}\nVerified · kruxvon.com/verify/${entity.krux_id}`
                  navigator.clipboard.writeText(sig)
                  setCopiedSig(true)
                  setTimeout(() => setCopiedSig(false), 2000)
                }}
                className="mt-2 flex items-center gap-1.5 text-[10px] text-[#64748B] hover:text-[#00C896] transition-colors"
              >
                {copiedSig ? <CheckCheck size={12} className="text-[#00C896]" /> : <Copy size={12} />}
                {copiedSig ? 'Copied!' : 'Copy to clipboard'}
              </button>
            </div>
          </div>
        )}

        {/* Notifications setup */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Bell size={14} className="text-[#00C896]" />
            <h3 className="text-white font-semibold text-sm">Notification Channels</h3>
          </div>
          <div className="space-y-4 text-xs">
            <div className="flex items-start gap-3 p-3 bg-[#0A1628] border border-[#1E3A5F] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-[#25D366]/10 border border-[#25D366]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[#25D366] text-[9px] font-bold">WA</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold mb-0.5">WhatsApp (Twilio)</p>
                <p className="text-[#64748B] leading-relaxed mb-2">Outbound: Morning Brief 6:30am EAT · Deadline alerts at 14, 7, 3 days<br/>Inbound: text "status", "done [ref]", "snooze [ref] [days]"</p>
                <p className="text-[#334155] mb-1.5">1. Set in Vercel Environment Variables:</p>
                <div className="space-y-0.5 font-mono text-[#94A3B8]">
                  <div>TWILIO_ACCOUNT_SID</div>
                  <div>TWILIO_AUTH_TOKEN</div>
                  <div>TWILIO_WHATSAPP_FROM</div>
                  <div>ALERT_WHATSAPP_TO <span className="text-[#64748B] font-sans">(your +254)</span></div>
                </div>
                <p className="text-[#334155] mt-2 mb-1">2. In Twilio console → WhatsApp Sandbox → set webhook URL:</p>
                <div className="font-mono text-[#00C896] text-[10px] bg-[#0A1628] px-2 py-1.5 rounded-md break-all">
                  https://kruxvon.com/api/whatsapp/inbound
                </div>
                <p className="text-[#334155] mt-2">3. Add your WhatsApp number above ↑ to link your account</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-[#0A1628] border border-[#1E3A5F] rounded-lg">
              <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-blue-400 text-[9px] font-bold">@</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold mb-0.5">Email Alerts (Resend)</p>
                <p className="text-[#64748B] leading-relaxed mb-2">Shipment deadline alerts · License expiry warnings</p>
                <p className="text-[#334155]">Set in Vercel Environment Variables:</p>
                <div className="mt-1.5 font-mono text-[#94A3B8]">
                  <div>RESEND_API_KEY</div>
                  <div className="text-[#64748B] font-sans mt-0.5">Get your key at resend.com/api-keys</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}

        <button type="submit" disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors disabled:opacity-50">
          {loading ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </form>

      {/* Clear demo data */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Trash2 size={14} className="text-[#64748B]" />
          <h3 className="text-white font-semibold text-sm">Demo Data</h3>
        </div>
        <p className="text-xs text-[#64748B] mb-3 leading-relaxed">
          Your workspace was pre-loaded with 5 sample shipments. Remove them when you're ready to start with your real imports.
        </p>
        {clearMsg && (
          <div className={`text-xs rounded-lg px-3 py-2 mb-3 ${clearMsg.startsWith('Error') ? 'bg-red-500/10 border border-red-500/20 text-red-400' : 'bg-[#00C896]/10 border border-[#00C896]/20 text-[#00C896]'}`}>
            {clearMsg}
          </div>
        )}
        <button
          type="button"
          onClick={clearDemoData}
          disabled={clearing}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/10 transition-all disabled:opacity-40"
        >
          {clearing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          {clearing ? 'Clearing...' : 'Clear demo shipments'}
        </button>
      </div>

      {/* Password Change — separate form, outside the profile form */}
      <form onSubmit={changePassword} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Lock size={14} className="text-[#00C896]" />
          <h3 className="text-white font-semibold text-sm">Change Password</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">New Password</label>
            <input
              type="password"
              required
              minLength={8}
              value={newPwd}
              onChange={e => setNewPwd(e.target.value)}
              disabled={pwdSaving}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896] disabled:opacity-50"
              placeholder="8+ characters"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Confirm Password</label>
            <input
              type="password"
              required
              value={confirmPwd}
              onChange={e => setCfm(e.target.value)}
              disabled={pwdSaving}
              className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#334155] focus:outline-none focus:border-[#00C896] disabled:opacity-50"
              placeholder="Repeat password"
            />
          </div>
        </div>
        {pwdError && <div className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{pwdError}</div>}
        <button
          type="submit"
          disabled={pwdSaving || !newPwd || !confirmPwd}
          className="flex items-center gap-2 px-5 py-2 rounded-lg border border-[#1E3A5F] text-[#94A3B8] text-sm font-semibold hover:border-[#00C896]/40 hover:text-white transition-all disabled:opacity-40"
        >
          {pwdSaving ? <Loader2 size={13} className="animate-spin" /> : pwdSaved ? <Check size={13} className="text-[#00C896]" /> : null}
          {pwdSaved ? 'Password updated!' : 'Update password'}
        </button>
      </form>
    </div>
  )
}
