import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { AdminTriggers } from './Triggers'
import { Shield, Users, Package, Zap, Clock, CheckCircle2, AlertTriangle } from 'lucide-react'
import { AdminSignalBoard } from './AdminSignalBoard'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const ADMIN_EMAILS = ['haaji1242@gmail.com', 'hq@kruxvon.com', 'mabdikadirhaji@gmail.com', process.env.ALERT_EMAIL].filter(Boolean)

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(m / 60)
  const d = Math.floor(h / 24)
  if (d > 0)  return `${d}d ago`
  if (h > 0)  return `${h}h ago`
  if (m > 0)  return `${m}m ago`
  return 'just now'
}

export default async function AdminPage() {
  // ── Auth gate ────────────────────────────────────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !ADMIN_EMAILS.includes(user.email!)) redirect('/login')

  // ── Data ─────────────────────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const oneDayAgo    = new Date(Date.now() - 86400000).toISOString()

  const twoDaysAgo  = new Date(Date.now() - 2 * 86400000).toISOString()
  const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString()

  const [orgsRes, shipmentsRes, eventsRes, entitiesRes, actionsRes, waitlistRes, profilesRes, authUsersRes] = await Promise.all([
    supabaseAdmin.from('organizations').select('id, name, type, created_at').order('created_at', { ascending: false }),
    supabaseAdmin.from('shipments').select('id, organization_id, name, remediation_status, created_at').is('deleted_at', null),
    supabaseAdmin.from('shipment_events').select('organization_id, event_type, created_at').gte('created_at', sevenDaysAgo),
    supabaseAdmin.from('krux_entities').select('organization_id, krux_id, compliance_tier, total_shipments, entity_type'),
    supabaseAdmin.from('actions').select('id, status, organization_id, completed_at').gte('created_at', sevenDaysAgo),
    supabaseAdmin.from('waitlist').select('email, company, role, created_at').order('created_at', { ascending: false }).limit(50),
    supabaseAdmin.from('user_profiles').select('user_id, organization_id, whatsapp_number, role'),
    supabaseAdmin.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const orgs      = orgsRes.data      ?? []
  const shipments = shipmentsRes.data ?? []
  const events    = eventsRes.data    ?? []
  const entities  = entitiesRes.data  ?? []
  const actions   = actionsRes.data   ?? []
  const waitlist  = waitlistRes.data  ?? []
  const profiles  = profilesRes.data  ?? []
  const authUsers = authUsersRes.data?.users ?? []

  // ── Build contact map: org_id → { email, whatsapp } ──────────
  const authUserById = Object.fromEntries(authUsers.map((u: any) => [u.id, u]))
  const contactByOrg: Record<string, { email: string; whatsapp: string | null }> = {}
  for (const p of profiles) {
    if (contactByOrg[p.organization_id]) continue
    const au = authUserById[p.user_id]
    if (au?.email) {
      contactByOrg[p.organization_id] = { email: au.email, whatsapp: p.whatsapp_number ?? null }
    }
  }

  // ── Per-org stats ─────────────────────────────────────────────
  const entityByOrg  = Object.fromEntries(entities.map((e: any) => [e.organization_id, e]))
  const shipsByOrg   = shipments.reduce<Record<string, number>>((acc, s: any) => { acc[s.organization_id] = (acc[s.organization_id] ?? 0) + 1; return acc }, {})
  const eventsByOrg  = events.reduce<Record<string, number>>((acc, e: any) => { acc[e.organization_id] = (acc[e.organization_id] ?? 0) + 1; return acc }, {})

  const activeOrgIds = new Set(events.map((e: any) => e.organization_id))
  const recentEvents = events.filter((e: any) => e.created_at >= oneDayAgo)

  // ── System stats ─────────────────────────────────────────────
  const totalActive  = shipments.filter((s: any) => s.remediation_status !== 'CLOSED').length
  const totalClosed  = shipments.filter((s: any) => s.remediation_status === 'CLOSED').length
  const actionsCompleted7d = actions.filter((a: any) => a.status === 'COMPLETED').length

  // ── Signal classification ─────────────────────────────────────
  const SKIP_ORGS = ['KRUX Demo', 'KRUX Admin']
  const orgEmails = new Set(
    Object.values(contactByOrg).map((c: any) => c.email?.toLowerCase()).filter(Boolean)
  )

  type Signal = 'HOT' | 'WARM' | 'COLD'

  function classifyOrg(org: any): Signal {
    const ships = shipsByOrg[org.id] ?? 0
    const hasActivity = activeOrgIds.has(org.id)
    const isNew = org.created_at >= twoDaysAgo
    if (ships > 0 && hasActivity) return 'HOT'
    if (ships > 0 || isNew)       return 'WARM'
    return 'COLD'
  }

  const signalOrgs = orgs
    .filter((o: any) => !SKIP_ORGS.includes(o.name))
    .map((o: any) => ({ ...o, signal: classifyOrg(o) }))
    .sort((a: any, b: any) => {
      const order = { HOT: 0, WARM: 1, COLD: 2 }
      return (order[a.signal as keyof typeof order] ?? 3) - (order[b.signal as keyof typeof order] ?? 3)
    })

  const leads = waitlist.filter((w: any) => !orgEmails.has(w.email?.toLowerCase()))

  const TIER_COLOR: Record<string, string> = {
    PLATINUM: 'text-cyan-300', GOLD: 'text-yellow-400',
    SILVER: 'text-slate-300',  BRONZE: 'text-orange-400',
  }
  const TYPE_LABEL: Record<string, string> = { IMP: 'Importer', AGT: 'Agent', MFG: 'Mfg', EXP: 'Exporter', BRK: 'Broker' }

  return (
    <div className="min-h-screen bg-[#0A1628] p-6 space-y-6 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield size={16} className="text-[#00C896]" />
            <span className="text-[10px] font-bold text-[#00C896] uppercase tracking-widest">KRUX Admin</span>
          </div>
          <h1 className="text-2xl font-black text-white">Command Centre</h1>
          <p className="text-[#64748B] text-sm mt-0.5">{user.email} · {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-black text-white">{orgs.length}</div>
          <div className="text-[10px] text-[#64748B] uppercase tracking-wide">total orgs</div>
        </div>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Active Shipments',    value: totalActive,           icon: Package,      color: 'text-white' },
          { label: 'Closed Shipments',    value: totalClosed,           icon: CheckCircle2, color: 'text-[#00C896]' },
          { label: 'Events (7d)',         value: events.length,         icon: Zap,          color: 'text-amber-400' },
          { label: 'Actions Done (7d)',   value: actionsCompleted7d,    icon: Clock,        color: 'text-blue-400' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Icon size={13} className="text-[#64748B]" />
              <span className="text-[10px] text-[#64748B] uppercase tracking-wide font-semibold">{label}</span>
            </div>
            <div className={`text-2xl font-black ${color}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* Signal Board */}
      <AdminSignalBoard
        appUrl={process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'}
        signalOrgs={signalOrgs.map((o: any) => ({
          id:          o.id,
          name:        o.name,
          signal:      o.signal,
          ktin:        entityByOrg[o.id]?.krux_id,
          ships:       shipsByOrg[o.id] ?? 0,
          events:      eventsByOrg[o.id] ?? 0,
          signedUpAt:  o.created_at,
          email:       contactByOrg[o.id]?.email,
          whatsapp:    contactByOrg[o.id]?.whatsapp,
          tier:        entityByOrg[o.id]?.compliance_tier,
        }))}
        leads={leads.map((w: any) => ({
          email:     w.email,
          company:   w.company,
          role:      w.role,
          createdAt: w.created_at,
        }))}
      />

      {/* All orgs */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-[#1E3A5F] flex items-center justify-between">
          <h3 className="text-white font-semibold text-sm flex items-center gap-2">
            <Users size={14} className="text-[#64748B]" />
            All Organisations
          </h3>
          <span className="text-xs text-[#64748B]">{activeOrgIds.size} active in 7d</span>
        </div>
        <div className="divide-y divide-[#1E3A5F]">
          {orgs.map((org: any) => {
            const entity  = entityByOrg[org.id]
            const ships   = shipsByOrg[org.id]  ?? 0
            const evts    = eventsByOrg[org.id] ?? 0
            const isActive = activeOrgIds.has(org.id)
            const tier    = entity?.compliance_tier
            return (
              <div key={org.id} className="px-5 py-3 flex items-center gap-4 hover:bg-[#0A1628] transition-colors">
                {/* Status dot */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isActive ? 'bg-[#00C896]' : 'bg-[#334155]'}`} />

                {/* Org info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white truncate">{org.name}</span>
                    <span className="text-[10px] text-[#334155] bg-[#1E3A5F] px-1.5 py-0.5 rounded">
                      {TYPE_LABEL[entity?.entity_type] ?? org.type ?? 'IMP'}
                    </span>
                  </div>
                  <span className="text-xs text-[#64748B]">{org.email}</span>
                </div>

                {/* KTIN */}
                {entity && (
                  <span className="font-mono text-[10px] text-[#64748B] hidden sm:block">{entity.krux_id}</span>
                )}

                {/* Tier */}
                {tier && (
                  <span className={`text-[10px] font-bold hidden md:block ${TIER_COLOR[tier] ?? 'text-[#64748B]'}`}>{tier}</span>
                )}

                {/* Stats */}
                <div className="flex items-center gap-3 text-[10px] text-[#64748B] flex-shrink-0">
                  <span>{ships} ship{ships !== 1 ? 's' : ''}</span>
                  {evts > 0 && <span className="text-amber-400">{evts} evt</span>}
                  <span>{timeAgo(org.created_at)}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Recent activity feed */}
      {recentEvents.length > 0 && (
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
          <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <Zap size={14} className="text-amber-400" />
            Last 24h Activity
            <span className="text-[#64748B] font-normal">({recentEvents.length} events)</span>
          </h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {recentEvents.slice(0, 30).map((e: any, i: number) => {
              const org = orgs.find((o: any) => o.id === e.organization_id)
              return (
                <div key={i} className="flex items-center gap-3 text-[10px]">
                  <span className="text-[#334155] w-12 flex-shrink-0">{timeAgo(e.created_at)}</span>
                  <span className="text-[#64748B] font-mono">{e.event_type}</span>
                  <span className="text-[#64748B] truncate">{org?.name ?? e.organization_id.slice(0, 8)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cron triggers */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-5">
        <h3 className="text-white font-semibold text-sm mb-1 flex items-center gap-2">
          <AlertTriangle size={14} className="text-[#64748B]" />
          Manual Cron Triggers
        </h3>
        <p className="text-[10px] text-[#334155] mb-4">Run any scheduled job on demand. Results show inline.</p>
        <AdminTriggers cronSecret={process.env.CRON_SECRET ?? ''} />
      </div>

      <p className="text-[#1E3A5F] text-[10px] text-center pb-4">KRUX Admin · {user.email} · Only visible to you</p>
    </div>
  )
}
