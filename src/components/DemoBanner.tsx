'use client'
import Link from 'next/link'
import { Sparkles } from 'lucide-react'

export function DemoBanner() {
  return (
    <div className="w-full bg-[#00C896]/10 border-b border-[#00C896]/20 px-6 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Sparkles size={12} className="text-[#00C896]" />
        <span className="text-xs text-[#00C896] font-semibold">DEMO</span>
        <span className="text-xs text-[#64748B] hidden sm:inline">
          · Sample Kenya shipments. Real compliance logic.
        </span>
      </div>
      <Link
        href="/dashboard/operations?gate=1"
        className="text-xs font-bold text-[#0A1628] bg-[#00C896] px-3 py-1 rounded-lg hover:bg-[#00B584] transition-colors whitespace-nowrap"
      >
        Create your account →
      </Link>
    </div>
  )
}
