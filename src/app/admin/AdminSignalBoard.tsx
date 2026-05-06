'use client'
import { useState } from 'react'
import { ChevronDown, Mail, Phone, ExternalLink, Copy, Check } from 'lucide-react'

type Signal = 'HOT' | 'WARM' | 'COLD' | 'LEAD'

export interface SignalOrg {
  id: string
  name: string
  signal: Signal
  ktin?: string
  ships: number
  events: number
  signedUpAt: string
  lastActive?: string
  email?: string
  whatsapp?: string | null
  tier?: string
}

export interface SignalLead {
  email: string
  company?: string | null
  role?: string | null
  createdAt: string
}

const SIGNAL_CONFIG: Record<Signal, { dot: string; text: string; bg: string }> = {
  HOT:  { dot: 'bg-red-500 animate-pulse',  text: 'text-red-400',    bg: 'bg-red-500/5 border-red-500/20' },
  WARM: { dot: 'bg-amber-400',              text: 'text-amber-400',  bg: 'bg-amber-400/5 border-amber-400/20' },
  COLD: { dot: 'bg-[#334155]',              text: 'text-[#64748B]',  bg: 'bg-transparent border-transparent' },
  LEAD: { dot: 'bg-[#00C896]',              text: 'text-[#00C896]',  bg: 'bg-[#00C896]/5 border-[#00C896]/20' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `${d}d ago`
  if (h > 0)  return `${h}h ago`
  if (m > 0)  return `${m}m ago`
  return 'just now'
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded text-[#334155] hover:text-[#64748B] transition-colors"
    >
      {copied ? <Check size={11} className="text-[#00C896]" /> : <Copy size={11} />}
    </button>
  )
}

function OrgRow({ org, appUrl }: { org: SignalOrg; appUrl: string }) {
  const [open, setOpen] = useState(false)
  const cfg = SIGNAL_CONFIG[org.signal]
  const waLink = org.whatsapp
    ? `https://wa.me/${org.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi, this is MR. HAJI from KRUX — following up on your account. How can I help?`)}`
    : null

  return (
    <div className={`border-b border-[#0A1628] ${open ? 'bg-[#0A1628]' : 'hover:bg-[#0A1628]'} transition-colors`}>
      {/* Row */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-5 py-3 flex items-center gap-3 text-left"
      >
        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{org.name}</span>
            <span className={`text-[9px] font-black uppercase tracking-widest ${cfg.text}`}>{org.signal}</span>
          </div>
          <div className="text-[11px] text-[#64748B]">
            {org.email ?? <span className="text-[#334155] italic">no email on record</span>}
          </div>
        </div>
        {org.ktin && <span className="font-mono text-[10px] text-[#64748B] hidden sm:block">{org.ktin}</span>}
        <div className="text-[10px] text-[#64748B] flex-shrink-0 text-right">
          <div>{org.ships} ship{org.ships !== 1 ? 's' : ''}{org.events > 0 ? ` · ${org.events} evt` : ''}</div>
          <div className="text-[#334155]">{timeAgo(org.signedUpAt)}</div>
        </div>
        <ChevronDown size={13} className={`text-[#334155] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Expanded contact panel */}
      {open && (
        <div className={`mx-5 mb-4 rounded-lg border p-4 space-y-3 ${cfg.bg}`}>
          {/* Contact actions */}
          <div className="flex flex-wrap gap-2">
            {org.email && (
              <a
                href={`mailto:${org.email}?subject=KRUX — following up&body=Hi,%0A%0AThis is MR. HAJI from KRUX. I noticed you signed up and wanted to make sure you're set up and getting value.%0A%0ALet me know if you have any questions.%0A%0AMR. HAJI%0AKRUX`}
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-[#94A3B8] hover:text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Mail size={12} /> Email
              </a>
            )}
            {waLink && (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#00C896]/10 text-[#00C896] hover:bg-[#00C896]/20 rounded-lg text-xs font-medium transition-colors"
              >
                <Phone size={12} /> WhatsApp
              </a>
            )}
            <a
              href={`${appUrl}/admin`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-[#64748B] hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <ExternalLink size={12} /> Admin
            </a>
          </div>

          {/* Contact details */}
          <div className="space-y-1.5 text-xs">
            {org.email && (
              <div className="flex items-center gap-2">
                <span className="text-[#334155] w-20 flex-shrink-0">Email</span>
                <span className="text-[#94A3B8] font-mono">{org.email}</span>
                <CopyButton text={org.email} />
              </div>
            )}
            {org.whatsapp && (
              <div className="flex items-center gap-2">
                <span className="text-[#334155] w-20 flex-shrink-0">WhatsApp</span>
                <span className="text-[#94A3B8] font-mono">{org.whatsapp}</span>
                <CopyButton text={org.whatsapp} />
              </div>
            )}
            {!org.whatsapp && (
              <div className="flex items-center gap-2">
                <span className="text-[#334155] w-20 flex-shrink-0">WhatsApp</span>
                <span className="text-[#334155] italic">not set — ask them to add it in Settings</span>
              </div>
            )}
            {org.ktin && (
              <div className="flex items-center gap-2">
                <span className="text-[#334155] w-20 flex-shrink-0">KTIN</span>
                <span className="text-[#00C896] font-mono">{org.ktin}</span>
                <CopyButton text={org.ktin} />
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[#334155] w-20 flex-shrink-0">Signed up</span>
              <span className="text-[#64748B]">{new Date(org.signedUpAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })} · {timeAgo(org.signedUpAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#334155] w-20 flex-shrink-0">Shipments</span>
              <span className="text-[#64748B]">{org.ships}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#334155] w-20 flex-shrink-0">Activity (7d)</span>
              <span className="text-[#64748B]">{org.events} events</span>
            </div>
          </div>

          {/* Follow-up note */}
          {org.signal === 'HOT' && (
            <div className="text-[10px] text-red-400 font-semibold pt-1 border-t border-red-500/20">
              Active user — follow up to convert to paid. Ask: "What shipment are you tracking right now?"
            </div>
          )}
          {org.signal === 'WARM' && (
            <div className="text-[10px] text-amber-400 pt-1 border-t border-amber-400/20">
              Fresh signup — send the Loom link. Ask if they want help loading their first shipment.
            </div>
          )}
          {org.signal === 'COLD' && (
            <div className="text-[10px] text-[#64748B] pt-1 border-t border-[#1E3A5F]">
              Went quiet — one re-engagement email max. If no reply, move on.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function LeadRow({ lead }: { lead: SignalLead }) {
  const [open, setOpen] = useState(false)
  const waLink = `https://wa.me/?text=${encodeURIComponent(`Hi ${lead.company ?? ''}, this is MR. HAJI from KRUX — you checked a compliance window on our site. Happy to show you what KRUX does in 90 seconds: kruxvon.com/demo`)}`

  return (
    <div className={`border-t border-[#0A1628] ${open ? 'bg-[#0A1628]' : 'hover:bg-[#0A1628]'} transition-colors`}>
      <button onClick={() => setOpen(!open)} className="w-full px-5 py-3 flex items-center gap-3 text-left">
        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-[#00C896]" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white">{lead.email}</div>
          {lead.company && <div className="text-[11px] text-[#64748B]">{lead.company} · {lead.role}</div>}
        </div>
        <span className="text-[9px] font-black uppercase tracking-widest text-[#00C896]">LEAD</span>
        <div className="text-[10px] text-[#334155] flex-shrink-0">{timeAgo(lead.createdAt)}</div>
        <ChevronDown size={13} className={`text-[#334155] flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mx-5 mb-4 rounded-lg border border-[#00C896]/20 bg-[#00C896]/5 p-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            <a
              href={`mailto:${lead.email}?subject=That compliance window was closed&body=Hi,%0A%0AYou checked a compliance window on KRUX and it was flagged as closed.%0A%0AWe built KRUX specifically for this — knowing before goods leave origin whether the window is even possible. Happy to show you in 90 seconds.%0A%0Akruxvon.com/demo%0A%0AMR. HAJI%0AKRUX`}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E3A5F] text-[#94A3B8] hover:text-white rounded-lg text-xs font-medium transition-colors"
            >
              <Mail size={12} /> Email
            </a>
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-[#334155] w-20 flex-shrink-0">Email</span>
              <span className="text-[#94A3B8] font-mono">{lead.email}</span>
              <CopyButton text={lead.email} />
            </div>
            {lead.company && (
              <div className="flex items-center gap-2">
                <span className="text-[#334155] w-20 flex-shrink-0">Company</span>
                <span className="text-[#64748B]">{lead.company}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-[#334155] w-20 flex-shrink-0">Captured</span>
              <span className="text-[#64748B]">{new Date(lead.createdAt).toLocaleDateString('en-KE', { dateStyle: 'medium' })} · {timeAgo(lead.createdAt)}</span>
            </div>
          </div>
          <div className="text-[10px] text-[#00C896] pt-1 border-t border-[#00C896]/20">
            Checked window checker and left their email. High intent. Send the Loom link.
          </div>
        </div>
      )}
    </div>
  )
}

export function AdminSignalBoard({
  signalOrgs, leads, appUrl,
}: {
  signalOrgs: SignalOrg[]
  leads: SignalLead[]
  appUrl: string
}) {
  const counts = { HOT: 0, WARM: 0, COLD: 0, LEAD: leads.length }
  signalOrgs.forEach(o => counts[o.signal]++)

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-[#1E3A5F] flex items-center justify-between">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          Signal Board
        </h3>
        <div className="flex items-center gap-3 text-[10px] text-[#64748B]">
          <span><span className="text-red-400 font-bold">HOT</span> {counts.HOT}</span>
          <span><span className="text-amber-400 font-bold">WARM</span> {counts.WARM}</span>
          <span><span className="text-[#64748B] font-bold">COLD</span> {counts.COLD}</span>
          <span><span className="text-[#00C896] font-bold">LEAD</span> {counts.LEAD}</span>
        </div>
      </div>

      {signalOrgs.map(org => <OrgRow key={org.id} org={org} appUrl={appUrl} />)}

      {leads.length > 0 && (
        <>
          <div className="px-5 py-2 border-t border-[#1E3A5F] bg-[#060E1A]">
            <span className="text-[10px] text-[#00C896] font-bold uppercase tracking-widest">Window checker leads — not signed up</span>
          </div>
          {leads.map((w, i) => <LeadRow key={i} lead={w} />)}
        </>
      )}
    </div>
  )
}
