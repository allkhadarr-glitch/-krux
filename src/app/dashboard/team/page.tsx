'use client'
import { useState, useEffect } from 'react'
import { Users, Mail, Plus, X, Check, Loader2, Clock, Shield, Copy } from 'lucide-react'

type Member = { user_id: string; full_name: string | null; role: string; phone: string | null }
type Invite  = { id: string; email: string; role: string; created_at: string; expires_at: string }

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin', operations: 'Operations',
  finance:    'Finance', field: 'Field Agent',
}
const ROLE_COLORS: Record<string, string> = {
  admin:      'bg-purple-500/15 text-purple-400 border-purple-500/30',
  operations: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  finance:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  field:      'bg-amber-500/15 text-amber-400 border-amber-500/30',
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [invites, setInvites] = useState<Invite[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole]   = useState('operations')
  const [sending, setSending]         = useState(false)
  const [inviteResult, setInviteResult] = useState<{ url: string; email: string } | null>(null)
  const [copied, setCopied]           = useState(false)

  useEffect(() => {
    fetch('/api/team')
      .then((r) => r.json())
      .then((d) => { setMembers(d.members ?? []); setInvites(d.invites ?? []) })
      .finally(() => setLoading(false))
  }, [])

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    try {
      const r = await fetch('/api/invites', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      setInviteResult({ url: d.acceptUrl, email: d.invite.email })
      setInvites((prev) => [d.invite, ...prev])
      setInviteEmail('')
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSending(false)
    }
  }

  function copyLink(url: string) {
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-[#64748B]"><Loader2 size={20} className="animate-spin mr-2" />Loading team...</div>

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl lg:text-2xl font-bold text-white">Team</h1>
          <p className="text-[#64748B] text-sm mt-1">{members.length} member{members.length !== 1 ? 's' : ''} · {invites.length} pending invite{invites.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={() => { setShowInvite(!showInvite); setInviteResult(null) }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold hover:bg-[#00C896]/90 transition-colors"
        >
          <Plus size={14} /> Invite Member
        </button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          {inviteResult ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                <Check size={16} /> Invite created for {inviteResult.email}
              </div>
              <p className="text-xs text-[#64748B]">Share this link — or an email was sent if Resend is configured:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-xs bg-[#0A1628] border border-[#1E3A5F] rounded px-3 py-2 text-[#00C896] truncate">{inviteResult.url}</code>
                <button onClick={() => copyLink(inviteResult.url)}
                  className="flex items-center gap-1 px-3 py-2 bg-[#1E3A5F] text-xs text-white rounded-lg hover:bg-[#2E4A6F] transition-colors">
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
              <button onClick={() => { setInviteResult(null); setShowInvite(false) }}
                className="text-xs text-[#64748B] hover:text-white transition-colors">Done</button>
            </div>
          ) : (
            <form onSubmit={sendInvite} className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Email</label>
                <input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required type="email"
                  className="w-full mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
                  placeholder="colleague@company.com" />
              </div>
              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wide">Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
                  {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <button type="submit" disabled={sending}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00C896] text-[#0A1628] text-sm font-bold disabled:opacity-50">
                {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
                Send Invite
              </button>
              <button type="button" onClick={() => setShowInvite(false)} className="text-[#64748B] hover:text-white">
                <X size={18} />
              </button>
            </form>
          )}
        </div>
      )}

      {/* Members */}
      <div>
        <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Active Members</h2>
        {members.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <Users size={28} className="text-[#1E3A5F] mb-2" />
            <p className="text-[#64748B] text-sm">No team members yet. Invite your first colleague.</p>
          </div>
        ) : (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
            {members.map((m, i) => (
              <div key={m.user_id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-[#1E3A5F]' : ''}`}>
                <div className="w-9 h-9 rounded-full bg-[#1E3A5F] flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-white">{(m.full_name ?? '?')[0].toUpperCase()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-white">{m.full_name ?? 'Unnamed'}</div>
                  {m.phone && <div className="text-xs text-[#64748B]">{m.phone}</div>}
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ROLE_COLORS[m.role] ?? ROLE_COLORS.operations}`}>
                  {ROLE_LABELS[m.role] ?? m.role}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending invites */}
      {invites.length > 0 && (
        <div>
          <h2 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Pending Invites</h2>
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
            {invites.map((inv, i) => (
              <div key={inv.id} className={`flex items-center gap-4 px-5 py-4 ${i > 0 ? 'border-t border-[#1E3A5F]' : ''}`}>
                <Mail size={16} className="text-[#64748B] flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-white">{inv.email}</div>
                  <div className="flex items-center gap-1 text-[10px] text-[#64748B] mt-0.5">
                    <Clock size={9} />
                    Expires {new Date(inv.expires_at).toLocaleDateString('en-KE', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${ROLE_COLORS[inv.role] ?? ROLE_COLORS.operations}`}>
                  {ROLE_LABELS[inv.role] ?? inv.role}
                </span>
                <span title="Pending"><Shield size={12} className="text-amber-400" /></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role guide */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">Role Permissions</h3>
        <div className="space-y-2">
          {[
            { role: 'admin',      perms: 'Full access — manage team, all shipments, settings' },
            { role: 'operations', perms: 'Create/edit shipments and actions, run alerts' },
            { role: 'finance',    perms: 'View-only — costs, analytics, audit exports' },
            { role: 'field',      perms: 'Update action status via Field View (mobile)' },
          ].map(({ role, perms }) => (
            <div key={role} className="flex items-start gap-3">
              <span className={`mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold border flex-shrink-0 ${ROLE_COLORS[role]}`}>
                {ROLE_LABELS[role]}
              </span>
              <span className="text-xs text-[#64748B]">{perms}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
