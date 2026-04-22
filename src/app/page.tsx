import Link from 'next/link'
import { Shield, BarChart3, Zap, Globe } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col">
      <nav className="flex items-center justify-between px-8 py-5 border-b border-[#1E3A5F]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center">
            <span className="text-[#0A1628] font-black text-sm">K</span>
          </div>
          <span className="text-white font-bold tracking-wide">KRUX</span>
        </div>
        <Link
          href="/dashboard/operations"
          className="px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors"
        >
          Open Dashboard →
        </Link>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#00C896]/10 border border-[#00C896]/30 rounded-full text-[#00C896] text-xs font-semibold mb-8">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] animate-pulse" />
          Kenya Import Compliance Intelligence · v1.0
        </div>

        <h1 className="text-5xl font-black text-white max-w-3xl leading-tight mb-6">
          AI-Powered Kenya Import
          <span className="text-[#00C896]"> Compliance</span>
          <br />Operating System
        </h1>

        <p className="text-[#94A3B8] text-lg max-w-xl mb-10">
          Track shipments across 8 regulatory bodies. Generate tax quotations in seconds.
          Automate compliance alerts. Built for Kenyan import operations.
        </p>

        <div className="flex gap-4">
          <Link
            href="/dashboard/operations"
            className="px-6 py-3 bg-[#00C896] text-[#0A1628] rounded-lg font-bold hover:bg-[#00A87E] transition-colors"
          >
            Open Dashboard
          </Link>
          <Link
            href="/dashboard/management"
            className="px-6 py-3 border border-[#1E3A5F] text-white rounded-lg font-medium hover:border-[#00C896]/50 transition-colors"
          >
            Management View
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-4 mt-20 max-w-3xl w-full">
          {[
            { icon: Shield, label: '8 Regulatory Bodies', sub: 'PPB, KEBS, PCPB, KEPHIS, WHO-GMP, EPRA, KRA, NEMA' },
            { icon: Zap, label: 'AI Intelligence', sub: 'Claude-powered compliance briefs, checklists & tax quotes' },
            { icon: BarChart3, label: '5 Dashboard Views', sub: 'Operations, Management, Agents, Client, Manufacturer' },
            { icon: Globe, label: 'Kenya-First', sub: 'KRA rates, PVoC deadlines, KES + USD calculations' },
          ].map(({ icon: Icon, label, sub }) => (
            <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4 text-left">
              <Icon size={20} className="text-[#00C896] mb-3" />
              <div className="text-white text-sm font-semibold mb-1">{label}</div>
              <div className="text-[#64748B] text-xs">{sub}</div>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-8 py-4 border-t border-[#1E3A5F] flex items-center justify-between text-xs text-[#64748B]">
        <span>KRUX Compliance Intelligence System · v1.0</span>
        <span>Built for Kenya · {new Date().getFullYear()}</span>
      </footer>
    </div>
  )
}
