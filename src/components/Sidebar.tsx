'use client'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Settings, Shield, LogOut,
  Zap, Archive, TrendingUp,
  FileText, Bell, Hash, Menu, X, FolderKanban, Car, ListChecks, Receipt, Upload,
} from 'lucide-react'
import { signOut } from '@/app/login/actions'
import { NotificationBell } from './NotificationBell'

const nav = [
  { href: '/dashboard/today',         label: 'Today',            icon: ListChecks, highlight: true },
  { href: '/dashboard/actions',       label: 'Action Centre',    icon: Zap },
  { href: '/dashboard/operations',    label: 'Operations',       icon: Shield },
  { href: '/dashboard/portfolio',     label: 'Client Portfolio', icon: FolderKanban },
  { href: '/dashboard/hs-lookup',     label: 'HS Code Lookup',   icon: Hash },
  { href: '/dashboard/mv-calculator', label: 'Vehicle Duty',     icon: Car },
  { href: '/dashboard/quotation',     label: 'Quotation',        icon: Receipt },
  { href: '/dashboard/alerts',        label: 'Alerts',           icon: Bell },
  { href: '/dashboard/closed',        label: 'Closed Shipments', icon: Archive },
  { href: '/dashboard/analytics',     label: 'Analytics',        icon: TrendingUp },
  { href: '/dashboard/briefing',      label: 'Morning Brief',    icon: FileText },
  { href: '/dashboard/import',        label: 'Import History',   icon: Upload },
]

export function Sidebar({ userEmail, orgName, ktin }: { userEmail: string; orgName?: string | null; ktin?: string | null }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* ── Mobile top bar (hidden on lg+) ── */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 bg-[#0F2040] border-b border-[#1E3A5F] flex items-center px-3 gap-3 shadow-lg">
        <button
          onClick={() => setOpen(true)}
          className="p-2 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#1E3A5F] transition-all"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex-1 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
            <span className="text-[#0A1628] font-black text-xs">K</span>
          </div>
          <span className="text-white font-bold text-sm tracking-wide">KRUX</span>
          <span className="text-[#334155] text-xs hidden sm:block">Compliance Intelligence</span>
        </div>

        <NotificationBell />
      </div>

      {/* ── Backdrop (mobile) ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/70 z-40 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className={`
        fixed left-0 top-0 h-full w-72 flex flex-col border-r border-[#1E3A5F] bg-[#0F2040] z-50
        transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}
        lg:translate-x-0 lg:w-60 lg:shadow-none
      `}>
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1E3A5F]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0A1628] font-black text-sm">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm tracking-wide">KRUX</div>
              <div className="text-[#64748B] text-xs">Compliance Intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden lg:block">
              <NotificationBell />
            </div>
            <button
              onClick={() => setOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1E3A5F] transition-all"
              aria-label="Close menu"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Entity identity card */}
        {(ktin || orgName) && (
          <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="block mx-3 mt-3 px-3 py-2.5 rounded-lg bg-[#0A1628] border border-[#1E3A5F] hover:border-[#00C896]/40 transition-all group">
            {ktin && <div className="text-[#00C896] text-[11px] font-mono font-bold tracking-widest group-hover:text-[#00D9A8] transition-colors">{ktin}</div>}
            {orgName && <div className="text-white text-xs font-semibold mt-0.5 truncate">{orgName}</div>}
          </Link>
        )}

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon, highlight }: any) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20'
                    : highlight
                      ? 'text-white bg-[#00C896]/5 border border-[#00C896]/15 hover:bg-[#00C896]/10'
                      : 'text-[#94A3B8] hover:text-white hover:bg-[#1E3A5F]/50'
                }`}
              >
                <Icon size={15} className={`flex-shrink-0 ${highlight && !active ? 'text-[#00C896]' : ''}`} />
                {label}
                {highlight && !active && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Bottom actions */}
        <div className="px-3 py-4 border-t border-[#1E3A5F] space-y-0.5">
          <Link
            href="/dashboard/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#1E3A5F]/50 transition-all"
          >
            <Settings size={15} />
            Settings
          </Link>

          <form action={signOut}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={15} />
              Sign out
            </button>
          </form>

          <div className="px-3 pt-3">
            <div className="text-[#334155] text-xs truncate">{userEmail}</div>
            <div className="text-[#1E3A5F] text-xs mt-0.5">KRUX v1.0</div>
          </div>
        </div>
      </aside>
    </>
  )
}
