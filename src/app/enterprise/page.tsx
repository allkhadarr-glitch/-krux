import Link from 'next/link'

export const metadata = {
  title: 'Enterprise — KRUX',
  description: 'KRUX Enterprise for banks, freight forwarders, institutional importers, and trade bodies. API access, unlimited seats, white-label, and institutional SLA.',
}

const FEATURES = [
  {
    category: 'Data Access',
    items: [
      'Full API access — entity lookup, compliance scores, window check, HS duty rates',
      'Bulk shipment upload via CSV or API',
      'Exportable compliance reports in PDF and JSON',
      'Real-time webhook events for shipment status changes',
    ],
  },
  {
    category: 'Team & Access',
    items: [
      'Unlimited user seats — your entire operations team',
      'Role-based permissions — admin, operator, read-only',
      'Audit trail — every action logged with timestamp and user',
      'SSO support — connect your existing identity provider',
    ],
  },
  {
    category: 'Intelligence',
    items: [
      'Monthly compliance intelligence report — your portfolio at a glance',
      'HS code examination rate data — probability of physical inspection by HS and origin',
      'Agent performance benchmarks — clearance speed by licensed agent',
      'Regulatory change alerts — specific to your active HS codes',
    ],
  },
  {
    category: 'Support & SLA',
    items: [
      'Named relationship manager — one contact, always',
      'Priority support — 4-hour response on business days, same-day for critical',
      'Monthly review call with KRUX team',
      'Custom onboarding and data migration assistance',
    ],
  },
  {
    category: 'White-Label Options',
    items: [
      'Co-branded entity registry — your brand on the KRUX compliance layer',
      'Embeddable compliance widgets for your existing portal',
      'Custom subdomain — compliance.yourcompany.com',
      'Member access management — for associations and trade bodies',
    ],
  },
]

const WHO = [
  {
    type: 'Banks & Trade Finance',
    use: 'Query KTIN compliance scores before approving trade finance. Integrate KRUX data into credit decisions. Price risk accurately.',
  },
  {
    type: 'Freight Forwarders & Clearing Agents',
    use: 'Manage 50+ client shipments from one dashboard. Issue compliance-verified quotations. Track all client windows simultaneously.',
  },
  {
    type: 'Large Importers & Manufacturers',
    use: 'Multi-user team access. Full audit trail for regulatory submissions. Monthly compliance health reports for board-level visibility.',
  },
  {
    type: 'Trade Bodies & Associations',
    use: 'White-label the KRUX compliance layer as a membership benefit. Issue KTINs to members. Co-brand the entity registry.',
  },
  {
    type: 'Marine Cargo Insurers',
    use: 'API access to compliance scores and shipment history. Price premiums on real compliance data, not declarations.',
  },
]

export default function EnterprisePage() {
  const contactEmail = 'hq@kruxvon.com'

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
            <p className="text-[#334155] text-[10px] uppercase tracking-wide">Enterprise</p>
            <p className="text-[#334155] text-[10px] mt-0.5">Institutional access</p>
          </div>
        </div>

        <h1 className="text-lg font-black text-white tracking-wide mb-2">
          KRUX Enterprise
        </h1>
        <p className="text-[#64748B] text-xs mb-3">
          For banks, freight forwarders, trade bodies, and institutional importers who need
          full API access, unlimited seats, and the compliance intelligence layer at scale.
        </p>
        <div className="flex items-baseline gap-2 mb-12">
          <span className="text-[#00C896] font-black text-xl">$2,000 – $5,000</span>
          <span className="text-[#334155] text-xs">/ month · annual contract · custom pricing for associations</span>
        </div>

        {/* Who it's for */}
        <div className="mb-12">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-5">Who it&apos;s for</p>
          <div className="border border-[#1E3A5F]">
            {WHO.map((w, i) => (
              <div key={w.type} className={`px-5 py-4 ${i < WHO.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}>
                <p className="text-white text-xs font-black mb-1">{w.type}</p>
                <p className="text-[#64748B] text-xs">{w.use}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Features */}
        <div className="mb-12 space-y-8">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em]">What&apos;s included</p>
          {FEATURES.map((section) => (
            <div key={section.category} className="border border-[#1E3A5F]">
              <div className="px-5 py-3 border-b border-[#1E3A5F]">
                <p className="text-white text-xs font-black tracking-wide">{section.category}</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="text-[#00C896] text-[10px] mt-0.5 flex-shrink-0">·</span>
                    <span className="text-[#94A3B8] text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Pricing note */}
        <div className="mb-10 border border-[#1E3A5F] px-5 py-5">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-3">Pricing</p>
          <div className="space-y-2 text-xs text-[#94A3B8]">
            <div className="flex justify-between items-center py-2 border-b border-[#1E3A5F]">
              <span>Standard Enterprise</span>
              <span className="text-white font-bold">$2,000 / month</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1E3A5F]">
              <span>Enterprise + White-Label</span>
              <span className="text-white font-bold">$3,500 / month</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-[#1E3A5F]">
              <span>Association / Trade Body License</span>
              <span className="text-white font-bold">Custom (flat annual)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span>Annual billing discount</span>
              <span className="text-[#00C896] font-bold">2 months free</span>
            </div>
          </div>
          <p className="text-[#334155] text-[10px] mt-4">
            All enterprise contracts are annual. Monthly billing available at a 20% premium.
            Multi-year contracts negotiated directly.
          </p>
        </div>

        {/* CTA */}
        <div className="border border-[#00C896]/30 bg-[#00C896]/5 px-5 py-6">
          <p className="text-white text-xs font-black mb-2">Start the conversation</p>
          <p className="text-[#94A3B8] text-xs mb-5">
            Enterprise engagements are structured around your use case. Email us with a brief
            description of your organisation and what you need — we respond within one business day.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href={`mailto:${contactEmail}?subject=KRUX Enterprise Enquiry&body=Organisation:%0D%0AUse case:%0D%0ATeam size:%0D%0A`}
              className="font-mono text-xs bg-[#00C896] text-[#0A1628] px-5 py-2.5 font-bold tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors text-center"
            >
              Contact Enterprise Team
            </a>
            <Link
              href="/services"
              className="font-mono text-xs border border-[#1E3A5F] text-[#64748B] px-5 py-2.5 hover:border-[#334155] hover:text-[#94A3B8] transition-colors text-center"
            >
              View Advisory Services →
            </Link>
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
