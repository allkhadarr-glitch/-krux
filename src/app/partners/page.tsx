import Link from 'next/link'

export const metadata = {
  title: 'Partner Agent Program — KRUX',
  description: 'Clearing agents who bring 3 importer clients onto KRUX get 12 months free. East Africa\'s trade standard.',
}

const STEPS = [
  {
    n: '01',
    title: 'Register your entity',
    body: 'Apply for your KTIN at kruxvon.com. Takes 60 seconds. Your KTIN is permanent — it follows your practice wherever you go.',
  },
  {
    n: '02',
    title: 'Bring 3 importer clients',
    body: 'Invite 3 of your importer clients to register on KRUX using your referral link. Each client gets their own KTIN and can track their own shipments.',
  },
  {
    n: '03',
    title: 'Get 12 months free',
    body: 'Once your 3rd client registers and loads their first shipment, your KRUX subscription is extended by 12 months at no cost. Automatically applied.',
  },
]

const WHY = [
  'Your clients see their clearance windows, duty stacks, and action items — you look more capable, not less',
  'Importers who ask "are you on KRUX?" are already sold — you hand them a platform that validates the answer',
  'KRUX tracks compliance history for every shipment you handle. Your track record compounds over time.',
  'Quotations with your KTIN embedded look different to clients comparing agents. Different is better.',
]

const FAQ = [
  {
    q: 'Does my client see my business details?',
    a: "No. Your client sees their own shipments and their own KTIN. They don't see your account, your other clients, or your financials.",
  },
  {
    q: 'What counts as a qualifying referral?',
    a: 'A client who registers using your referral link AND loads at least one active shipment within 30 days of signing up.',
  },
  {
    q: 'Can I refer more than 3 clients?',
    a: 'Yes. Every 3 qualifying referrals extends your subscription by another 12 months. There is no cap.',
  },
  {
    q: 'What happens after 12 months?',
    a: 'Your subscription moves to the standard plan. Or you refer 3 more clients and extend again.',
  },
  {
    q: 'Do my clients have to pay?',
    a: 'Your clients sign up free and can track up to 3 shipments at no cost. They choose to upgrade when they need more.',
  },
]

export default function PartnersPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

  return (
    <div className="min-h-screen bg-[#060E1A] text-white font-mono">
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">

        {/* Letterhead */}
        <div className="mb-10 pb-6 border-b border-[#1E3A5F] flex items-start justify-between">
          <div>
            <Link href="/" className="text-[#00C896] text-xs font-black tracking-[0.35em] uppercase hover:opacity-80 transition-opacity">
              KRUX
            </Link>
            <p className="text-[#334155] text-[10px] tracking-widest uppercase mt-0.5">East Africa&apos;s trade standard</p>
          </div>
          <div className="text-right">
            <p className="text-[#334155] text-[10px] uppercase tracking-wide">Partner Agent Program</p>
          </div>
        </div>

        <h1 className="text-lg font-black text-white tracking-wide mb-2">
          Partner Agent Program
        </h1>
        <p className="text-[#64748B] text-xs mb-3">
          For clearing agents and freight forwarders. Bring 3 importer clients onto KRUX — get 12 months free.
        </p>
        <div className="inline-block border border-[#00C896]/30 bg-[#00C896]/5 px-4 py-2 mb-12">
          <span className="text-[#00C896] font-black text-sm">3 clients = 12 months free</span>
          <span className="text-[#334155] text-xs ml-2">No cap. Repeatable.</span>
        </div>

        {/* How it works */}
        <div className="mb-12">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-5">How it works</p>
          <div className="border border-[#1E3A5F]">
            {STEPS.map((s, i) => (
              <div key={s.n} className={`px-5 py-5 ${i < STEPS.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}>
                <div className="flex items-start gap-4">
                  <span className="text-[#00C896] font-black text-xs flex-shrink-0 mt-0.5">{s.n}</span>
                  <div>
                    <p className="text-white text-xs font-black mb-1.5">{s.title}</p>
                    <p className="text-[#64748B] text-xs leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why agents use KRUX */}
        <div className="mb-12">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-5">Why clearing agents use KRUX</p>
          <div className="border border-[#1E3A5F]">
            {WHY.map((w, i) => (
              <div key={i} className={`px-5 py-4 flex items-start gap-3 ${i < WHY.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}>
                <span className="text-[#00C896] text-[10px] flex-shrink-0 mt-0.5">·</span>
                <p className="text-[#94A3B8] text-xs leading-relaxed">{w}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-12">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-5">Common questions</p>
          <div className="border border-[#1E3A5F] space-y-0">
            {FAQ.map((f, i) => (
              <div key={i} className={`px-5 py-4 ${i < FAQ.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}>
                <p className="text-white text-xs font-black mb-1.5">{f.q}</p>
                <p className="text-[#64748B] text-xs leading-relaxed">{f.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="border border-[#00C896]/30 bg-[#00C896]/5 px-5 py-6">
          <p className="text-white text-xs font-black mb-1">Ready to start?</p>
          <p className="text-[#94A3B8] text-xs mb-5">
            Register your entity first. Once you have your KTIN, email <a href="mailto:hq@kruxvon.com" className="text-[#00C896]">hq@kruxvon.com</a> to get your referral link.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`${appUrl}/signup`}
              className="font-mono text-xs bg-[#00C896] text-[#0A1628] px-5 py-2.5 font-bold tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors text-center"
            >
              Apply for KTIN
            </a>
            <a
              href={`mailto:hq@kruxvon.com?subject=Partner Agent Program&body=My KTIN: %0D%0AMy clearing agent license number: %0D%0A`}
              className="font-mono text-xs border border-[#1E3A5F] text-[#64748B] px-5 py-2.5 hover:border-[#334155] hover:text-[#94A3B8] transition-colors text-center"
            >
              Get referral link →
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-[#1E3A5F] flex items-center justify-between">
          <p className="text-[9px] text-[#334155] uppercase tracking-widest">KRUX · East Africa&apos;s trade standard</p>
          <Link href="/" className="text-[9px] text-[#64748B] hover:text-[#00C896] uppercase tracking-widest transition-colors">
            kruxvon.com
          </Link>
        </div>

      </div>
    </div>
  )
}
