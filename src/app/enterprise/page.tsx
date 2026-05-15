import Link from 'next/link'

export const metadata = {
  title: 'Enterprise — KRUX',
  description: 'KRUX Enterprise for banks, freight forwarders, institutional importers, and trade bodies.',
}

const LIVE_NOW = [
  {
    category: 'Client Portfolio Management',
    items: [
      'Manage all importer clients from one dashboard — shipments grouped by client, risk status per client',
      'Shared client portals — generate a read-only compliance link per client, no login required',
      'Window status across all active shipments simultaneously',
      'Bulk shipment upload via CSV template — up to 200 shipments',
    ],
  },
  {
    category: 'Team Access',
    items: [
      'Unlimited user seats — your entire operations team',
      'Role structure — admin, operations, finance, field',
      'Invite via email or WhatsApp — no IT setup required',
      'KTIN Entity Lookup API — GET /api/v1/entity/{ktin}, public, CORS-enabled',
    ],
  },
  {
    category: 'Compliance Operations',
    items: [
      'AI-generated compliance actions per shipment — document checklists, portal links, deadline tracking',
      'Application reference tracking — portal submission numbers stored against each action',
      'Compliance export — full shipment audit report, browser-printable',
      'Regulatory window calculator — pre-arrival SLA check for all regulated goods',
    ],
  },
  {
    category: 'Support',
    items: [
      'Named relationship manager — one contact, always',
      'Priority support — 4-hour response on business days, same-day for critical issues',
      'Monthly review call with the KRUX team',
      'Custom onboarding and data migration assistance',
    ],
  },
]

const ROADMAP = [
  'Full REST API — compliance score endpoint, window check API, bulk shipment API',
  'Webhook events — real-time push on shipment status changes, action completions, window breaches',
  'Server-side PDF reports — downloadable compliance certificates and portfolio summaries',
  'Role-based permission enforcement at the API level',
  'Audit trail — every action logged with timestamp and user identity',
  'Monthly intelligence reports — portfolio performance, clearance benchmarks, HS code examination rates',
  'Agent performance index — clearance speed and examination rate by licensed agent',
  'Regulatory change alerts — targeted to your active HS codes',
  'White-label options — co-branded portal, custom subdomain',
  'SSO — connect your existing identity provider',
  'KRA iCMS integration — automated shipment data ingestion from customs declarations',
]

const WHO = [
  {
    type: 'Freight Forwarders & Clearing Agents',
    use: 'Manage 50+ client shipments from one dashboard. Track all client compliance windows simultaneously. Share a live compliance portal with each importer client.',
  },
  {
    type: 'Large Importers & Manufacturers',
    use: 'Multi-user team access across operations, finance, and field. Full compliance action tracking per shipment. Board-level visibility on compliance exposure.',
  },
  {
    type: 'Banks & Trade Finance',
    use: 'Query KTIN compliance records before approving trade finance. Integrate KRUX entity data into credit risk workflows.',
  },
  {
    type: 'Trade Bodies & Associations',
    use: 'License KRUX as a membership benefit. Issue KTINs to members. Co-brand the compliance layer under your association.',
  },
  {
    type: 'Marine Cargo Insurers',
    use: 'Access compliance records and shipment history via API. Price premiums on real compliance data, not declarations.',
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
            <p className="text-[#334155] text-xs tracking-widest uppercase mt-0.5">East Africa&apos;s trade standard</p>
          </div>
          <div className="text-right">
            <p className="text-[#334155] text-xs uppercase tracking-wide">Enterprise</p>
            <p className="text-[#334155] text-xs mt-0.5">Institutional access</p>
          </div>
        </div>

        <h1 className="text-lg font-black text-white tracking-wide mb-2">
          KRUX Enterprise
        </h1>
        <p className="text-[#64748B] text-xs mb-3">
          For freight forwarders, clearing agents, banks, trade bodies, and institutional importers
          who operate at scale and need the compliance intelligence layer built into their workflow.
        </p>
        <div className="flex items-baseline gap-2 mb-12">
          <span className="text-[#00C896] font-black text-xl">$2,000 – $5,000</span>
          <span className="text-[#334155] text-xs">/ month · annual contract · custom pricing for associations</span>
        </div>

        {/* Who it's for */}
        <div className="mb-12">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em] mb-5">Who it&apos;s for</p>
          <div className="border border-[#1E3A5F]">
            {WHO.map((w, i) => (
              <div key={w.type} className={`px-5 py-4 ${i < WHO.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}>
                <p className="text-white text-xs font-black mb-1">{w.type}</p>
                <p className="text-[#64748B] text-xs">{w.use}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Data Security */}
        <div className="mb-12">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em] mb-5">Data security & confidentiality</p>
          <div className="border border-[#1E3A5F]">
            <div className="px-5 py-4 border-b border-[#1E3A5F]">
              <p className="text-white text-xs font-black mb-1">Your data is yours. It is not visible to anyone else.</p>
              <p className="text-[#64748B] text-xs">
                Every organisation on KRUX operates in a fully isolated namespace. Your shipments,
                clients, compliance records, and team data cannot be accessed, viewed, or queried
                by any other organisation on the platform — including KRUX staff, except where
                you explicitly request support.
              </p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {[
                ['Organisation isolation', 'All data is scoped to your organisation ID at the database layer using row-level security. No query can cross organisation boundaries.'],
                ['Encryption in transit', 'All data is transmitted over TLS. There is no unencrypted access path to your data.'],
                ['Encryption at rest', 'Data is stored on AES-256 encrypted infrastructure. This applies to shipment records, documents, and all associated metadata.'],
                ['No data monetisation', 'KRUX does not sell, share, or provide access to your organisation\'s shipment data to any third party.'],
                ['Aggregate intelligence only', 'KRUX\'s market intelligence layer is built from anonymised, aggregated signals across the platform. Your specific shipments are never surfaced to other clients or identified in any output.'],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-2.5">
                  <span className="text-[#00C896] text-xs mt-0.5 flex-shrink-0">·</span>
                  <div>
                    <span className="text-white text-xs font-semibold">{title} — </span>
                    <span className="text-[#94A3B8] text-xs">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* What's live now */}
        <div className="mb-12 space-y-8">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em]">What&apos;s live now</p>
          {LIVE_NOW.map((section) => (
            <div key={section.category} className="border border-[#1E3A5F]">
              <div className="px-5 py-3 border-b border-[#1E3A5F]">
                <p className="text-white text-xs font-black tracking-wide">{section.category}</p>
              </div>
              <div className="px-5 py-4 space-y-2">
                {section.items.map((item) => (
                  <div key={item} className="flex items-start gap-2.5">
                    <span className="text-[#00C896] text-xs mt-0.5 flex-shrink-0">·</span>
                    <span className="text-[#94A3B8] text-xs">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Roadmap */}
        <div className="mb-12">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em] mb-5">2026 roadmap — enterprise contract holders get early access</p>
          <div className="border border-[#1E3A5F] px-5 py-5 space-y-2">
            {ROADMAP.map((item) => (
              <div key={item} className="flex items-start gap-2.5">
                <span className="text-[#334155] text-xs mt-0.5 flex-shrink-0">→</span>
                <span className="text-[#334155] text-xs">{item}</span>
              </div>
            ))}
          </div>
          <p className="text-[#334155] text-xs mt-3">
            Enterprise contract holders are notified first when roadmap items go live and
            participate in the design of features that affect their workflow.
          </p>
        </div>

        {/* Pricing */}
        <div className="mb-10 border border-[#1E3A5F] px-5 py-5">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em] mb-3">Pricing</p>
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
          <p className="text-[#334155] text-xs mt-4">
            All enterprise contracts are annual. Monthly billing available at a 20% premium.
            Multi-year contracts negotiated directly.
          </p>
        </div>

        {/* CTA */}
        <div className="border border-[#00C896]/30 bg-[#00C896]/5 px-5 py-6">
          <p className="text-white text-xs font-black mb-2">Start the conversation</p>
          <p className="text-[#94A3B8] text-xs mb-5">
            Enterprise engagements are structured around your specific workflow and client volume.
            Email us with a brief description of your organisation and what you need —
            we respond within one business day.
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
          <p className="text-xs text-[#334155] uppercase tracking-widest">KRUX · East Africa&apos;s trade standard</p>
          <Link href="/" className="text-xs text-[#64748B] hover:text-[#00C896] uppercase tracking-widest transition-colors">
            kruxvon.com
          </Link>
        </div>

      </div>
    </div>
  )
}
