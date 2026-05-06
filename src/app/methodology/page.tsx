import Link from 'next/link'

export const metadata = {
  title: 'Compliance Score Methodology — KRUX',
  description: "How KRUX compliance scores are calculated. The scoring methodology for East Africa's trade standard.",
}

const TIERS = [
  { tier: 'PLATINUM', range: '85 – 100', color: 'text-cyan-300',   description: 'Exceptional compliance record' },
  { tier: 'GOLD',     range: '70 – 84',  color: 'text-yellow-400', description: 'Strong compliance record' },
  { tier: 'SILVER',   range: '50 – 69',  color: 'text-slate-300',  description: 'Established compliance record' },
  { tier: 'BRONZE',   range: 'Below 50', color: 'text-orange-400', description: 'Developing compliance record' },
]

const SPEED = [
  { range: '7 days or fewer',  points: '20 points' },
  { range: '8 – 14 days',      points: '15 points' },
  { range: '15 – 21 days',     points: '10 points' },
  { range: 'Over 21 days',     points: '5 points' },
]

export default function MethodologyPage() {
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
            <p className="text-[#334155] text-[10px] uppercase tracking-wide">Published</p>
            <p className="text-[#334155] text-[10px] mt-0.5">1 May 2026 · Version 1.0</p>
          </div>
        </div>

        <h1 className="text-lg font-black text-white tracking-wide mb-2">
          KRUX Compliance Score — Methodology
        </h1>
        <p className="text-[#64748B] text-xs mb-12">
          The methodology behind compliance scores assigned to every entity on the KRUX network.
        </p>

        <div className="space-y-12 text-sm text-[#94A3B8] leading-relaxed">

          {/* 01 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">01 — The Score</p>
            <p>
              KRUX compliance scores range from 0 to 100. Scores are calculated nightly at 22:00 UTC
              (midnight East Africa Time) and reflect all verified shipment activity recorded on the KRUX
              network for a given entity.
            </p>
            <p className="mt-4">
              Scores unlock after an entity has tracked a minimum of 5 shipments. Entities below this
              threshold display &ldquo;Score pending&rdquo; on their public entity record.
            </p>
          </section>

          {/* 02 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">02 — Score Components</p>

            <div className="border border-[#1E3A5F] mb-4">
              <div className="px-4 py-3 border-b border-[#1E3A5F]">
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-black">Clearance Rate</p>
                  <p className="text-xs text-[#64748B]">75 points maximum</p>
                </div>
              </div>
              <p className="px-4 py-3 text-xs text-[#94A3B8]">
                The primary factor. The proportion of shipments that cleared customs successfully divided
                by total shipments tracked on the KRUX network. An entity that clears every tracked
                shipment achieves a 75-point base score.
              </p>
            </div>

            <div className="border border-[#1E3A5F]">
              <div className="px-4 py-3 border-b border-[#1E3A5F]">
                <div className="flex items-center justify-between">
                  <p className="text-white text-xs font-black">Clearance Speed</p>
                  <p className="text-xs text-[#64748B]">20 points maximum</p>
                </div>
              </div>
              <div className="px-4 py-1">
                {SPEED.map((row, i) => (
                  <div
                    key={row.range}
                    className={`flex justify-between py-2.5 text-xs ${i < SPEED.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}
                  >
                    <span className="text-[#94A3B8]">Average clearance time: {row.range}</span>
                    <span className="text-white font-bold">{row.points}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 03 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">03 — Compliance Tiers</p>
            <div className="border border-[#1E3A5F]">
              {TIERS.map((row, i) => (
                <div
                  key={row.tier}
                  className={`flex items-center justify-between px-4 py-3 ${i < TIERS.length - 1 ? 'border-b border-[#1E3A5F]' : ''}`}
                >
                  <div className="flex items-center gap-4">
                    <span className={`text-xs font-black tracking-widest ${row.color}`}>{row.tier}</span>
                    <span className="text-[10px] text-[#334155]">{row.description}</span>
                  </div>
                  <span className="text-xs text-[#64748B]">{row.range}</span>
                </div>
              ))}
            </div>
          </section>

          {/* 04 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">04 — What the Score Measures</p>
            <p>
              The KRUX compliance score measures operational reliability — how consistently and how quickly
              an entity clears shipments through Kenya&apos;s regulatory bodies: PPB, KEBS, EPRA, KEPHIS,
              PCPB, NEMA, DVS, KRA, and CA.
            </p>
            <p className="mt-4">
              The score is not a creditworthiness rating and does not reflect financial standing, legal
              status, or overall business performance. It is a single-dimension measure: does this entity
              clear shipments, and how fast?
            </p>
          </section>

          {/* 05 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">05 — Data Sources</p>
            <p>
              All score inputs are derived from shipment events recorded on the KRUX platform. Events are
              logged automatically when shipment status changes. The score is a function of verified
              platform activity — not self-reported data.
            </p>
            <p className="mt-4">
              Entities cannot manually adjust their score. Disputes about recorded activity must be raised
              with KRUX directly.
            </p>
          </section>

          {/* 06 */}
          <section>
            <p className="text-[9px] text-[#334155] uppercase tracking-[0.25em] mb-4">06 — Methodology Roadmap</p>
            <p>
              Future versions of the KRUX score will incorporate additional signals: regulatory
              body-specific compliance rates, document submission lead times, penalty history, and
              cross-entity network data. All methodology updates will be published here with version
              history.
            </p>
          </section>

        </div>

        {/* Footer */}
        <div className="mt-16 pt-6 border-t border-[#1E3A5F] flex items-center justify-between">
          <p className="text-[9px] text-[#334155] uppercase tracking-widest">KRUX · East Africa&apos;s trade standard</p>
          <a
            href={appUrl}
            className="text-[9px] text-[#64748B] hover:text-[#00C896] uppercase tracking-widest transition-colors"
          >
            kruxvon.com
          </a>
        </div>

      </div>
    </div>
  )
}
