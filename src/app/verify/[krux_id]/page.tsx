import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PrintButton } from '@/components/PrintButton'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIER_CONFIG: Record<string, { label: string; color: string; border: string; description: string }> = {
  PLATINUM: { label: 'PLATINUM', color: 'text-cyan-300',   border: 'border-cyan-400/30',   description: 'Exceptional compliance record' },
  GOLD:     { label: 'GOLD',     color: 'text-yellow-400', border: 'border-yellow-400/30', description: 'Strong compliance record' },
  SILVER:   { label: 'SILVER',   color: 'text-slate-300',  border: 'border-slate-400/30',  description: 'Established compliance record' },
  BRONZE:   { label: 'BRONZE',   color: 'text-orange-400', border: 'border-orange-400/30', description: 'Developing compliance record' },
}

const TYPE_LABEL: Record<string, string> = {
  IMP: 'Licensed Importer',
  AGT: 'Clearing Agent / Freight Forwarder',
  MFG: 'Manufacturer',
  EXP: 'Exporter',
  BRK: 'Customs Broker',
}

function formatDate(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function VerifyPage({ params }: { params: Promise<{ krux_id: string }> }) {
  const { krux_id } = await params

  const { data: entity } = await supabaseAdmin
    .from('krux_entities')
    .select('krux_id, entity_type, country_code, name, trading_name, compliance_score, compliance_tier, total_shipments, cleared_on_time, avg_clearance_days, is_verified, verified_at, last_shipment_at, created_at')
    .eq('krux_id', krux_id.toUpperCase())
    .maybeSingle()

  if (!entity) notFound()

  const tier = (entity.compliance_tier && entity.total_shipments >= 5) ? TIER_CONFIG[entity.compliance_tier] : null
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'
  const issueDate = formatDate(entity.created_at)
  const retrievedAt = new Date().toLocaleDateString('en-KE', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-[#060E1A] flex flex-col items-center justify-center p-4 font-mono">
      <style>{`@media print { .no-print { display: none !important } body { background: white } }`}</style>
      <div className="w-full max-w-lg">

        {/* Document letterhead */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-[#00C896] text-xs font-black tracking-[0.35em] uppercase">KRUX</p>
            <p className="text-[#334155] text-xs tracking-widest uppercase mt-0.5">East Africa&apos;s trade standard</p>
          </div>
          <div className="text-right">
            <p className="text-[#334155] text-xs uppercase tracking-wide">Entity record</p>
            <p className="text-[#1E3A5F] text-xs mt-0.5">Retrieved {retrievedAt}</p>
          </div>
        </div>

        {/* Main card */}
        <div className="bg-[#0A1628] border border-[#1E3A5F]">

          {/* KTIN block */}
          <div className="px-6 py-5 border-b border-[#1E3A5F]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-2">
                  KTIN — KRUX Trade Identity Number
                </p>
                <p className="text-3xl font-black text-white tracking-wider">{entity.krux_id}</p>
                <p className="text-xs text-[#334155] mt-2">Issued {issueDate}</p>
              </div>
              {entity.is_verified && (
                <div className="flex items-center gap-1.5 border border-[#00C896]/30 px-2.5 py-1 mt-1">
                  <span className="w-1 h-1 rounded-full bg-[#00C896]" />
                  <span className="text-xs font-black text-[#00C896] tracking-[0.2em]">VERIFIED</span>
                </div>
              )}
            </div>
          </div>

          {/* Entity details */}
          <div className="px-6 py-4 border-b border-[#1E3A5F] grid grid-cols-2 gap-x-8 gap-y-4">
            <div>
              <p className="text-xs text-[#334155] uppercase tracking-[0.15em] mb-1.5">Registered Name</p>
              <p className="text-sm font-semibold text-white leading-tight">{entity.name}</p>
              {entity.trading_name && entity.trading_name !== entity.name && (
                <p className="text-xs text-[#64748B] mt-0.5">{entity.trading_name}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-[#334155] uppercase tracking-[0.15em] mb-1.5">Entity Classification</p>
              <p className="text-sm font-semibold text-white leading-tight">
                {TYPE_LABEL[entity.entity_type] ?? entity.entity_type}
              </p>
              <p className="text-xs text-[#334155] mt-0.5">{entity.country_code} — East Africa</p>
            </div>
          </div>

          {/* Compliance record */}
          <div className="px-6 py-5 border-b border-[#1E3A5F]">
            <p className="text-xs text-[#334155] uppercase tracking-[0.15em] mb-4">Compliance Record</p>

            {tier ? (
              <div className={`border ${tier.border}`}>
                <div className="px-4 py-3 flex items-start justify-between border-b border-[#1E3A5F]">
                  <div>
                    <p className={`text-xs font-black tracking-[0.2em] ${tier.color}`}>{tier.label}</p>
                    <p className="text-xs text-[#64748B] mt-0.5">{tier.description}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-black ${tier.color}`}>{entity.compliance_score}</p>
                    <p className="text-xs text-[#334155]">/ 100</p>
                  </div>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs text-[#334155] uppercase tracking-wide mb-1">Shipments</p>
                    <p className={`text-base font-black ${tier.color}`}>{entity.total_shipments}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#334155] uppercase tracking-wide mb-1">Cleared</p>
                    <p className={`text-base font-black ${tier.color}`}>{entity.cleared_on_time}</p>
                  </div>
                  {entity.avg_clearance_days && (
                    <div>
                      <p className="text-xs text-[#334155] uppercase tracking-wide mb-1">Avg days</p>
                      <p className={`text-base font-black ${tier.color}`}>{entity.avg_clearance_days}d</p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="border border-[#1E3A5F] px-4 py-3">
                <p className="text-xs text-[#64748B]">
                  Score unlocks after {Math.max(0, 5 - entity.total_shipments)} more shipment{Math.max(0, 5 - entity.total_shipments) !== 1 ? 's' : ''}
                </p>
                <p className="text-xs text-[#334155] mt-1">
                  {entity.total_shipments} shipment{entity.total_shipments !== 1 ? 's' : ''} on record
                </p>
              </div>
            )}
          </div>

          {/* Card footer */}
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="space-y-0.5">
              <Link
                href={`${appUrl}/methodology`}
                className="no-print text-xs text-[#64748B] hover:text-[#00C896] uppercase tracking-wide transition-colors block"
              >
                How scores are calculated
              </Link>
              {entity.last_shipment_at && (
                <p className="text-xs text-[#1E3A5F]">
                  Last activity {formatDate(entity.last_shipment_at, { month: 'short', year: 'numeric' })}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <PrintButton />
              <a
                href={`${appUrl}/signup`}
                className="no-print text-xs px-3 py-1.5 border border-[#00C896]/40 text-[#00C896] hover:bg-[#00C896]/10 transition-colors uppercase tracking-widest"
              >
                Register entity
              </a>
            </div>
          </div>
        </div>

        {/* Document footer */}
        <p className="text-xs text-[#1E3A5F] mt-4 leading-relaxed">
          KRUX entity records are permanent and updated automatically from verified shipment activity on the KRUX network.
          KTINs are issued once and cannot be reassigned or transferred.
        </p>
      </div>
    </div>
  )
}

export function generateMetadata({ params }: { params: { krux_id: string } }) {
  return {
    title: `${params.krux_id} — KRUX Entity Record`,
    description: "Verified trade entity record on the KRUX network. East Africa's trade standard.",
  }
}
