import Link from 'next/link'

export const metadata = {
  title: 'Advisory Services — KRUX',
  description: 'Trade compliance consulting for East African importers. Window reports, pre-shipment audits, and monthly advisory retainers.',
}

const PACKAGES = [
  {
    code:        '01',
    name:        'Window Report',
    price:       '$500',
    turnaround:  '48 hours',
    delivery:    'PDF report',
    description: 'A complete compliance window analysis for one planned shipment before you commit to a purchase order. Know the regulatory picture before the cargo moves.',
    includes: [
      'Regulatory window analysis — days available vs. SLA required',
      'Full duty stack — CIF basis, applicable rates, total landed cost',
      'Regulator-specific document checklist',
      'Risk classification — OPEN, TIGHT, or IMPOSSIBLE verdict',
      'KES exposure if window is missed',
      'Written recommendation on whether to proceed',
    ],
    best_for: 'Importers evaluating a new shipment or a new product category before signing a PO.',
  },
  {
    code:        '02',
    name:        'Pre-Shipment Audit',
    price:       '$2,500',
    turnaround:  '3–5 business days',
    delivery:    'PDF report + 30-minute call',
    description: 'A full compliance review of one active shipment — documents, timeline, regulatory risks, and specific recommendations before the vessel departs.',
    includes: [
      'Everything in the Window Report',
      'Document review — BL, commercial invoice, packing list, permits',
      'HS code verification and reclassification risk assessment',
      'Regulator submission readiness check',
      'Port dwell cost projection',
      'Action plan with specific steps and deadlines',
      '30-minute briefing call with the KRUX team',
    ],
    best_for: 'Importers with an active shipment who want to catch problems before they reach the port.',
  },
  {
    code:        '03',
    name:        'Monthly Retainer',
    price:       '$1,500 / month',
    turnaround:  'Ongoing',
    delivery:    'Weekly briefing + direct access',
    description: 'Ongoing advisory for importers who move goods regularly. Weekly briefing, real-time alerts on regulatory changes, and direct founder access for urgent questions.',
    includes: [
      'Weekly compliance briefing — all active shipments reviewed',
      'Regulatory change alerts specific to your HS codes',
      'Unlimited Window Report queries (written, not calls)',
      'One Pre-Shipment Audit per month included',
      'Direct WhatsApp access to KRUX founder for urgent matters',
      'Monthly compliance health summary',
    ],
    best_for: 'Clearing agents, freight forwarders, or importers with 3+ active shipments at any time.',
  },
]

export default function ServicesPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'
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
            <p className="text-[#334155] text-[10px] uppercase tracking-wide">Advisory Services</p>
            <p className="text-[#334155] text-[10px] mt-0.5">hq@kruxvon.com</p>
          </div>
        </div>

        <h1 className="text-lg font-black text-white tracking-wide mb-2">
          Trade Compliance Advisory
        </h1>
        <p className="text-[#64748B] text-xs mb-12">
          For importers who need a decision, not a disclaimer. Every engagement is delivered by
          the KRUX team — the people who built East Africa&apos;s trade intelligence layer.
        </p>

        <div className="space-y-10">
          {PACKAGES.map((pkg) => (
            <div key={pkg.code} className="border border-[#1E3A5F]">

              {/* Header */}
              <div className="px-5 py-4 border-b border-[#1E3A5F] flex items-start justify-between gap-4">
                <div>
                  <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-1">{pkg.code}</p>
                  <p className="text-white font-black text-sm tracking-wide">{pkg.name}</p>
                  <p className="text-[#64748B] text-xs mt-1">{pkg.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[#00C896] font-black text-sm">{pkg.price}</p>
                  <p className="text-[#334155] text-[10px] mt-0.5">{pkg.turnaround}</p>
                  <p className="text-[#334155] text-[10px]">{pkg.delivery}</p>
                </div>
              </div>

              {/* Includes */}
              <div className="px-5 py-4 border-b border-[#1E3A5F]">
                <p className="text-[9px] text-[#334155] uppercase tracking-[0.2em] mb-3">What&apos;s included</p>
                <div className="space-y-2">
                  {pkg.includes.map((item) => (
                    <div key={item} className="flex items-start gap-2.5">
                      <span className="text-[#00C896] text-[10px] mt-0.5 flex-shrink-0">·</span>
                      <span className="text-[#94A3B8] text-xs">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Best for */}
              <div className="px-5 py-3">
                <p className="text-[9px] text-[#334155] uppercase tracking-[0.2em] mb-1">Best for</p>
                <p className="text-[#64748B] text-xs">{pkg.best_for}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Engagement */}
        <div className="mt-12 border border-[#1E3A5F] px-5 py-6">
          <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">How to engage</p>
          <div className="space-y-3 text-xs text-[#94A3B8]">
            <p>Email <a href={`mailto:${contactEmail}`} className="text-[#00C896] hover:opacity-80">{contactEmail}</a> with:</p>
            <div className="space-y-1.5 pl-3">
              <p>· The package you want</p>
              <p>· Your shipment details — goods, origin, regulator, ETA</p>
              <p>· Your KTIN if you have one</p>
            </div>
            <p className="pt-2">
              We respond within 4 hours on business days. Payment is via M-Pesa, bank transfer, or
              card — invoice issued before work begins.
            </p>
          </div>
        </div>

        {/* KTIN CTA */}
        <div className="mt-8 border border-[#1E3A5F] px-5 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-white text-xs font-black mb-1">Not yet on KRUX?</p>
            <p className="text-[#64748B] text-[11px]">Register your entity. Get your KTIN. Track every shipment.</p>
          </div>
          <a
            href={`${appUrl}/signup`}
            className="font-mono text-xs bg-[#00C896] text-[#0A1628] px-4 py-2 font-bold tracking-widest uppercase hover:bg-[#00C896]/90 transition-colors flex-shrink-0"
          >
            Apply for KTIN
          </a>
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
