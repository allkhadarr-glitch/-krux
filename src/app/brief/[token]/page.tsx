'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SharedBriefPage({ params }: { params: { token: string } }) {
  const [brief, setBrief]   = useState<{ brief_text: string; shipment_name: string; regulator: string; created_at: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    supabase
      .from('shared_briefs')
      .select('brief_text, shipment_name, regulator, created_at')
      .eq('token', params.token)
      .single()
      .then(({ data, error }) => {
        if (error || !data) setNotFound(true)
        else setBrief(data)
        setLoading(false)
      })
  }, [params.token])

  if (loading) return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
      <div className="text-[#64748B] text-sm">Loading brief...</div>
    </div>
  )

  if (notFound) return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col items-center justify-center gap-4 px-6">
      <div className="text-[#00C896] text-2xl font-bold tracking-widest">K<span className="text-white">R</span>UX</div>
      <p className="text-[#64748B] text-sm text-center">This brief has expired or does not exist.</p>
      <a href="https://krux-xi.vercel.app" className="text-xs text-[#00C896] hover:underline">Visit KRUX →</a>
    </div>
  )

  const date = new Date(brief!.created_at).toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  return (
    <div className="min-h-screen bg-[#0A1628] text-[#E2E8F0]">
      {/* Header */}
      <div className="border-b border-[#1E3A5F] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#00C896] text-lg font-bold tracking-widest">K<span className="text-white">R</span>UX</span>
          <span className="text-[#334155] text-xs">|</span>
          <span className="text-[#64748B] text-xs">Kenya Import Compliance Intelligence</span>
        </div>
        <a
          href="https://krux-xi.vercel.app"
          className="text-xs text-[#00C896] border border-[#00C896]/30 px-3 py-1.5 rounded-lg hover:bg-[#00C896]/10 transition-colors"
        >
          Get KRUX →
        </a>
      </div>

      {/* Brief */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-[#E2E8F0] text-lg font-semibold">{brief!.shipment_name}</h1>
          <p className="text-[#64748B] text-xs mt-1">{brief!.regulator && `${brief!.regulator} · `}Generated {date}</p>
        </div>
        <div className="bg-[#0D1F35] border border-[#1E3A5F] rounded-xl p-6">
          <pre className="whitespace-pre-wrap text-[13px] text-[#CBD5E1] leading-relaxed font-mono">{brief!.brief_text}</pre>
        </div>
        <p className="mt-6 text-[10px] text-[#334155] text-center">
          AI-generated compliance intelligence · Verify all figures with KRA iTax and relevant regulatory portals before acting ·{' '}
          <a href="https://krux-xi.vercel.app" className="text-[#00C896]/60 hover:text-[#00C896]">krux-xi.vercel.app</a>
        </p>
      </div>
    </div>
  )
}
