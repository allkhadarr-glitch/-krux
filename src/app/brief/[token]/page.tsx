import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import ShareButtons from './ShareButtons'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params
  const { data } = await supabase
    .from('shared_briefs')
    .select('shipment_name, regulator')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!data) return { title: 'KRUX — Compliance Brief' }

  const reg   = data.regulator ? ` · ${data.regulator}` : ''
  const title = `KRUX Brief: ${data.shipment_name}${reg}`
  const desc  = `AI-generated Kenya import compliance brief for ${data.shipment_name}. Powered by KRUX — Kenya's import compliance platform.`

  return {
    title,
    description: desc,
    openGraph: {
      title,
      description: desc,
      siteName: 'KRUX',
      type: 'article',
    },
    twitter: {
      card:        'summary',
      title,
      description: desc,
    },
  }
}

export default async function SharedBriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: brief, error } = await supabase
    .from('shared_briefs')
    .select('brief_text, shipment_name, regulator, created_at')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (error || !brief) notFound()

  const date = new Date(brief.created_at).toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  const shareUrl  = `${APP_URL}/brief/${token}`
  const waMessage = encodeURIComponent(`KRUX Compliance Brief — ${brief.shipment_name}\n\n${shareUrl}`)

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
          href={`${APP_URL}/signup?ref=brief`}
          className="text-xs text-[#00C896] border border-[#00C896]/30 px-3 py-1.5 rounded-lg hover:bg-[#00C896]/10 transition-colors font-semibold"
        >
          Get KRUX free →
        </a>
      </div>

      {/* Brief */}
      <div className="max-w-2xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-[#E2E8F0] text-lg font-semibold">{brief.shipment_name}</h1>
          <p className="text-[#64748B] text-xs mt-1">
            {brief.regulator && `${brief.regulator} · `}Generated {date}
          </p>
        </div>

        <div className="bg-[#0D1F35] border border-[#1E3A5F] rounded-xl p-6 mb-6">
          <pre className="whitespace-pre-wrap text-[13px] text-[#CBD5E1] leading-relaxed font-mono">{brief.brief_text}</pre>
        </div>

        {/* Share + CTA row */}
        <div className="flex flex-col sm:flex-row items-center gap-3 justify-between mb-6">
          <ShareButtons shareUrl={shareUrl} shipmentName={brief.shipment_name} waMessage={waMessage} />
          <a
            href={`${APP_URL}/signup?ref=brief`}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold hover:bg-[#00C896]/90 transition-colors whitespace-nowrap"
          >
            Manage your shipments with KRUX →
          </a>
        </div>

        {/* Value prop strip */}
        <div className="bg-[#0D1F35] border border-[#1E3A5F] rounded-xl p-5 space-y-2.5">
          <p className="text-xs font-bold text-[#64748B] uppercase tracking-widest mb-3">What KRUX does for clearing agents</p>
          {[
            'Portfolio view of all active shipments — sorted by risk score',
            'Automatic deadline alerts via WhatsApp at 14, 7, and 3 days',
            'AI compliance briefs like this one for every shipment',
            'Document checklists, remediation steps, and duty calculations',
            'Morning brief at 6:30am every weekday — sent to your phone',
          ].map(item => (
            <div key={item} className="flex items-start gap-2.5">
              <div className="w-1 h-1 rounded-full bg-[#00C896] flex-shrink-0 mt-1.5" />
              <p className="text-xs text-[#94A3B8]">{item}</p>
            </div>
          ))}
          <div className="pt-3">
            <a
              href={`${APP_URL}/signup?ref=brief`}
              className="inline-flex items-center gap-2 text-xs text-[#00C896] font-semibold hover:underline"
            >
              Create your free account at krux-xi.vercel.app →
            </a>
          </div>
        </div>

        <p className="mt-6 text-[10px] text-[#334155] text-center">
          AI-generated compliance intelligence · Verify all figures with KRA iTax and relevant regulatory portals before acting ·{' '}
          <a href={APP_URL} className="text-[#00C896]/60 hover:text-[#00C896]">{APP_URL.replace('https://', '')}</a>
        </p>
      </div>
    </div>
  )
}
