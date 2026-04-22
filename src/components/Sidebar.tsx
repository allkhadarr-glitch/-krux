'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BarChart3, Briefcase, User, Factory, Settings, Shield, LogOut, Zap, ShoppingCart } from 'lucide-react'
import { signOut } from '@/app/login/actions'

const nav = [
  { href: '/dashboard/actions',     label: 'Action Center',    icon: Zap },
  { href: '/dashboard/operations',  label: 'Operations',       icon: Shield },
  { href: '/dashboard/orders',      label: 'Order Protection', icon: ShoppingCart },
  { href: '/dashboard/management',  label: 'Management',       icon: BarChart3 },
  { href: '/dashboard/agents',      label: 'Clearing Agents',  icon: Briefcase },
  { href: '/dashboard/client',      label: 'Client View',      icon: User },
  { href: '/dashboard/manufacturer',label: 'Manufacturer',     icon: Factory },
]

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-full w-60 flex flex-col border-r border-[#1E3A5F] bg-[#0F2040] z-40">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-[#1E3A5F]">
        <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center">
          <span className="text-[#0A1628] font-black text-sm">K</span>
        </div>
        <div>
          <div className="text-white font-bold text-sm tracking-wide">KRUX</div>
          <div className="text-[#64748B] text-xs">Compliance Intelligence</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#1E3A5F]/50'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[#1E3A5F] space-y-1">
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-white hover:bg-[#1E3A5F]/50 transition-all"
        >
          <Settings size={16} />
          Settings
        </Link>

        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </form>

        <div className="px-3 pt-2">
          <div className="text-[#00C896] text-xs font-bold truncate">{userEmail}</div>
          <div className="text-[#64748B] text-xs">KRUX v1.0</div>
        </div>
      </div>
    </aside>
  )
}
