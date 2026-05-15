import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'

export const revalidate = 300

export const metadata = {
  title: 'The KRUX Network — East Africa\'s trade standard',
  description: 'Registered importers, clearing agents, and manufacturers on the KRUX network. East Africa\'s trade identity and compliance record.',
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const TIER: Record<string, { color: string; border: string }> = {
  PLATINUM: { color: 'text-cyan-300',   border: 'border-cyan-400/40' },
  GOLD:     { color: 'text-yellow-400', border: 'border-yellow-400/40' },
  SILVER:   { color: 'text-slate-300',  border: 'border-slate-400/40' },
  BRONZE:   { color: 'text-orange-400', border: 'border-orange-400/40' },
}

const TYPE_LABEL: Record<string, string> = {
  IMP: 'Importer',
  AGT: 'Clearing Agent',
  MFG: 'Manufacturer',
  EXP: 'Exporter',
  BRK: 'Broker',
}

const TYPE_COLOR: Record<string, string> = {
  IMP: 'text-blue-400 border-blue-400/20',
  AGT: 'text-purple-400 border-purple-400/20',
  MFG: 'text-green-400 border-green-400/20',
  EXP: 'text-orange-400 border-orange-400/20',
  BRK: 'text-slate-400 border-slate-400/20',
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
}

export default async function NetworkPage() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

  const [entitiesRes, shipmentsRes] = await Promise.all([
    supabaseAdmin
      .from('krux_entities')
      .select('krux_id, name, trading_name, entity_type, country_code, compliance_tier, compliance_score, total_shipments, is_verified, created_at')
      .order('compliance_score', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: true }),
    supabaseAdmin
      .from('shipments')
      .select('id', { count: 'exact', head: true })
      .is('deleted_at', null),
  ])

  const entities = entitiesRes.data ?? []
  const shipmentCount = shipmentsRes.count ?? 0
  const scoredCount = entities.filter(e => e.compliance_tier).length

  return (
    <div className="min-h-screen bg-[#060E1A] font-mono">

      {/* Nav */}
      <div className="border-b border-[#1E3A5F] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-[#00C896] text-xs font-black tracking-[0.35em] uppercase hover:opacity-80 transition-opacity">
          KRUX
        </Link>
        <a
          href={`${appUrl}/signup`}
          className="text-xs px-3 py-1.5 border border-[#00C896]/40 text-[#00C896] hover:bg-[#00C896]/10 transition-colors uppercase tracking-widest"
        >
          Register entity
        </a>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12">

        {/* Header */}
        <div className="mb-10">
          <p className="text-xs text-[#334155] uppercase tracking-[0.25em] mb-3">Public registry</p>
          <h1 className="text-xl font-black text-white tracking-wide mb-2">The KRUX Network</h1>
          <p className="text-[#64748B] text-sm">
            Every registered entity on East Africa&apos;s trade standard. Identity verified. Record permanent.
          </p>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 border border-[#1E3A5F] mb-10">
          <div className="px-5 py-4 border-r border-[#1E3A5F]">
            <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-1">Registered entities</p>
            <p className="text-2xl font-black text-white">{entities.length}</p>
          </div>
          <div className="px-5 py-4 border-r border-[#1E3A5F]">
            <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-1">Shipments on record</p>
            <p className="text-2xl font-black text-white">{shipmentCount}</p>
          </div>
          <div className="px-5 py-4">
            <p className="text-xs text-[#334155] uppercase tracking-[0.2em] mb-1">Scored entities</p>
            <p className="text-2xl font-black text-white">{scoredCount}</p>
          </div>
        </div>

        {/* Entity list */}
        {entities.length === 0 ? (
          <div className="border border-[#1E3A5F] px-6 py-10 text-center">
            <p className="text-[#64748B] text-sm">No entities registered yet.</p>
          </div>
        ) : (
          <div className="space-y-px">
            {entities.map((entity, i) => {
              const tier = entity.compliance_tier ? TIER[entity.compliance_tier] : null
              const typeColor = TYPE_COLOR[entity.entity_type] ?? TYPE_COLOR.BRK

              return (
                <Link
                  key={entity.krux_id}
                  href={`/verify/${entity.krux_id}`}
                  className="flex items-center gap-4 px-4 py-4 bg-[#0A1628] border border-[#1E3A5F] hover:border-[#00C896]/30 transition-all group"
                >
                  {/* Rank — hidden on mobile */}
                  <span className="text-xs text-[#1E3A5F] w-4 flex-shrink-0 font-black hidden sm:block">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  {/* Name + KTIN stacked */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white truncate">
                      {entity.name}
                      {entity.is_verified && (
                        <span className="ml-2 text-xs text-[#00C896] font-black tracking-widest">VERIFIED</span>
                      )}
                    </p>
                    <p className="text-xs text-[#334155] font-mono tracking-wide mt-0.5">{entity.krux_id}</p>
                  </div>

                  {/* Type badge — hidden on mobile */}
                  <span className={`text-xs font-bold border px-2 py-0.5 flex-shrink-0 tracking-wide hidden sm:block ${typeColor}`}>
                    {TYPE_LABEL[entity.entity_type] ?? entity.entity_type}
                  </span>

                  {/* Tier / Score */}
                  <div className="w-28 flex-shrink-0 text-right">
                    {tier ? (
                      <div>
                        <span className={`text-xs font-black tracking-widest ${tier.color}`}>
                          {entity.compliance_tier}
                        </span>
                        <span className={`ml-2 text-sm font-black ${tier.color}`}>
                          {entity.compliance_score}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#334155]">Score pending</span>
                    )}
                  </div>

                  {/* Shipments — hidden on mobile */}
                  <div className="w-20 flex-shrink-0 text-right hidden sm:block">
                    <p className="text-xs text-[#64748B]">{entity.total_shipments}</p>
                    <p className="text-xs text-[#334155]">shipments</p>
                  </div>

                  {/* Arrow */}
                  <span className="text-[#1E3A5F] group-hover:text-[#00C896] transition-colors text-xs flex-shrink-0">→</span>
                </Link>
              )
            })}
          </div>
        )}

        {/* Market context */}
        <div className="mt-10 border border-[#1E3A5F] px-6 py-5">
          <p className="text-xs text-[#64748B] leading-relaxed">
            1,200+ clearing agents operate in Kenya. 50,000+ shipments clear Mombasa port every year.
            Every entity on this registry has a permanent KTIN — a trade identity that follows them across
            every regulator, every bank, every transaction.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <a
              href={`${appUrl}/signup`}
              className="text-xs px-4 py-2 border border-[#00C896]/40 text-[#00C896] hover:bg-[#00C896]/10 transition-colors uppercase tracking-widest"
            >
              Register your entity
            </a>
            <Link
              href="/methodology"
              className="text-xs text-[#64748B] hover:text-[#00C896] uppercase tracking-widest transition-colors"
            >
              How scores work →
            </Link>
          </div>
        </div>

      </div>

      {/* Footer */}
      <div className="border-t border-[#1E3A5F] px-6 py-4 flex items-center justify-between max-w-4xl mx-auto">
        <p className="text-xs text-[#1E3A5F] uppercase tracking-widest">KRUX · East Africa&apos;s trade standard</p>
        <p className="text-xs text-[#1E3A5F]">Updated every 5 minutes</p>
      </div>

    </div>
  )
}
