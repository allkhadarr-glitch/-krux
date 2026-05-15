import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2, Ship, MapPin, FileText, Package, ArrowRight } from 'lucide-react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const STAGES = ['PRE_SHIPMENT', 'IN_TRANSIT', 'AT_PORT', 'CUSTOMS', 'CLEARED'] as const
const STAGE_LABELS: Record<string, string> = {
  PRE_SHIPMENT: 'Preparing',
  IN_TRANSIT:   'At Sea',
  AT_PORT:      'At Mombasa',
  CUSTOMS:      'Customs',
  CLEARED:      'Released',
}
const STAGE_DESC: Record<string, string> = {
  PRE_SHIPMENT: 'Documents being prepared. Cargo at origin warehouse.',
  IN_TRANSIT:   'Cargo loaded. Vessel en route to Mombasa.',
  AT_PORT:      'Vessel arrived Mombasa. Awaiting customs entry.',
  CUSTOMS:      'KRA reviewing documents. Duty assessment in progress.',
  CLEARED:      'Duties paid. Cargo released. Ready for collection.',
}

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtKES(n: number) {
  return `KES ${Math.round(n).toLocaleString('en-KE')}`
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data } = await supabaseAdmin.from('client_share_tokens').select('client_name').eq('token', token).single()
  return {
    title: data ? `${data.client_name} — Shipment Status · KRUX` : 'KRUX Shipment Portal',
    description: 'Real-time Kenya import compliance status. Powered by KRUX.',
    openGraph: {
      title: data ? `${data.client_name} · KRUX Shipment Portal` : 'KRUX',
      description: 'Your import status, cost breakdown, and next steps — in one place.',
    },
  }
}

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const { data: tokenRow } = await supabaseAdmin
    .from('client_share_tokens')
    .select('*')
    .eq('token', token)
    .single()

  if (!tokenRow) notFound()

  if (tokenRow.expires_at && new Date(tokenRow.expires_at) < new Date()) {
    return (
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-white text-lg font-semibold">This link has expired</p>
          <p className="text-[#64748B] text-sm mt-2">Ask your clearing agent to generate a new one.</p>
        </div>
      </div>
    )
  }

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select(`
      id, name, reference_number, origin_port, origin_country, destination_port,
      pvoc_deadline, eta, risk_flag_status, remediation_status, shipment_stage,
      total_landed_cost_usd, total_landed_cost_kes, regulatory_body_id,
      cif_value_usd, import_duty_usd, excise_duty_usd, idf_levy_usd,
      rdl_levy_usd, vat_usd, pvoc_fee_usd, clearing_fee_usd,
      exchange_rate_used, vessel_name, bl_number, hs_code,
      product_description, weight_kg, shipment_type
    `)
    .eq('organization_id', tokenRow.organization_id)
    .eq('client_name', tokenRow.client_name)
    .is('deleted_at', null)
    .neq('remediation_status', 'CLOSED')
    .order('pvoc_deadline', { ascending: true })

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code, name')
  const bodiesById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b]))

  // Fetch actions for all shipments
  const shipmentIds = (shipments ?? []).map((s: any) => s.id)
  const { data: allActions } = shipmentIds.length
    ? await supabaseAdmin
        .from('actions')
        .select('shipment_id, title, status, priority')
        .in('shipment_id', shipmentIds)
        .order('priority', { ascending: true })
    : { data: [] }

  const actionsByShipment: Record<string, any[]> = {}
  for (const a of allActions ?? []) {
    if (!actionsByShipment[a.shipment_id]) actionsByShipment[a.shipment_id] = []
    actionsByShipment[a.shipment_id].push(a)
  }

  const enriched = (shipments ?? []).map((s: any) => {
    const body = s.regulatory_body_id ? bodiesById[s.regulatory_body_id] : null
    const days = s.pvoc_deadline ? daysUntil(s.pvoc_deadline) : null
    const rate  = s.exchange_rate_used ?? 130

    // Derive excise if not stored
    const knownCosts = (s.cif_value_usd ?? 0) + (s.import_duty_usd ?? 0)
      + (s.idf_levy_usd ?? 0) + (s.rdl_levy_usd ?? 0)
      + (s.vat_usd ?? 0) + (s.pvoc_fee_usd ?? 0) + (s.clearing_fee_usd ?? 0)
    const derivedExcise = s.excise_duty_usd
      ?? (s.total_landed_cost_usd ? Math.max(0, s.total_landed_cost_usd - knownCosts) : 0)

    return {
      ...s,
      regulatory_body: body,
      days,
      rate,
      derivedExcise,
      actions: (actionsByShipment[s.id] ?? []).slice(0, 6),
    }
  })

  const totalKES  = enriched.reduce((sum: number, s: any) => sum + (s.total_landed_cost_kes ?? 0), 0)
  const urgent    = enriched.filter((s: any) => s.days !== null && s.days <= 7 && s.days >= 0)
  const overdue   = enriched.filter((s: any) => s.days !== null && s.days < 0)

  return (
    <div className="min-h-screen bg-[#0A1628]" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* ── Top bar ── */}
      <div className="bg-[#0F2040] border-b border-[#1E3A5F] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#00C896] flex items-center justify-center flex-shrink-0">
              <span className="text-[#0A1628] font-black text-xs">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-none">KRUX</div>
              <div className="text-[#64748B] text-xs leading-none mt-0.5">Kenya Import Compliance</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold text-sm leading-none">{tokenRow.client_name}</div>
            <div className="text-[#64748B] text-xs leading-none mt-0.5">Shipment Portal</div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

        {/* ── Overdue alert ── */}
        {overdue.length > 0 && (
          <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/40 rounded-2xl px-4 py-3">
            <AlertTriangle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-300">
              <span className="font-bold">Action required:</span> {overdue.length} shipment{overdue.length > 1 ? 's are' : ' is'} past the clearance deadline. Contact your clearing agent immediately.
            </p>
          </div>
        )}

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-2.5">
          <StatCard val={enriched.length} label="Active Shipments" color="text-white" />
          <StatCard
            val={urgent.length + overdue.length}
            label={overdue.length > 0 ? 'Overdue' : 'Needs Attention'}
            color={urgent.length + overdue.length > 0 ? 'text-red-400' : 'text-[#00C896]'}
          />
          <StatCard
            val={totalKES >= 1_000_000 ? `KES ${(totalKES / 1_000_000).toFixed(1)}M` : fmtKES(totalKES)}
            label="Total Landed Cost"
            color="text-[#00C896]"
          />
        </div>

        {/* ── Shipment cards ── */}
        {enriched.length === 0 ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-6 py-16 text-center">
            <Package size={32} className="text-[#334155] mx-auto mb-3" />
            <p className="text-[#64748B]">No active shipments</p>
            <p className="text-[#334155] text-sm mt-1">Your clearing agent hasn't added any shipments yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {enriched.map((s: any) => {
              const accentColor = s.risk_flag_status === 'RED' ? '#ef4444' : s.risk_flag_status === 'AMBER' ? '#f59e0b' : '#22c55e'
              const riskBg      = s.risk_flag_status === 'RED' ? 'bg-red-500/10 border-red-500/30' : s.risk_flag_status === 'AMBER' ? 'bg-amber-400/10 border-amber-400/30' : 'bg-emerald-500/10 border-emerald-500/30'
              const riskText    = s.risk_flag_status === 'RED' ? 'text-red-400' : s.risk_flag_status === 'AMBER' ? 'text-amber-400' : 'text-emerald-400'
              const stageIdx    = STAGES.indexOf(s.shipment_stage ?? 'PRE_SHIPMENT')
              const days        = s.days as number | null
              const dayColor    = days === null ? 'text-[#64748B]' : days < 0 ? 'text-red-400' : days <= 3 ? 'text-red-400' : days <= 7 ? 'text-amber-400' : 'text-[#94A3B8]'

              const rate = s.rate as number

              return (
                <div key={s.id} className="bg-[#0F2040] rounded-2xl overflow-hidden border border-[#1E3A5F]"
                  style={{ borderLeft: `4px solid ${accentColor}` }}>

                  {/* ── Card header ── */}
                  <div className="px-4 pt-4 pb-3 border-b border-[#1E3A5F]">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="text-white font-bold text-base leading-snug">{s.name}</h2>
                        <div className="flex items-center gap-1.5 text-[#64748B] text-xs mt-0.5">
                          <MapPin size={10} />
                          <span>{s.origin_country ?? s.origin_port}</span>
                          <ArrowRight size={10} />
                          <span>{s.destination_port}</span>
                        </div>
                      </div>
                      <div className={`flex-shrink-0 px-2 py-1 rounded-lg border text-xs font-bold ${riskBg} ${riskText}`}>
                        {s.risk_flag_status === 'RED' ? 'Urgent' : s.risk_flag_status === 'AMBER' ? 'Watch' : 'On Track'}
                      </div>
                    </div>

                    {/* Deadline + ETA */}
                    <div className="flex items-center gap-3 flex-wrap">
                      {s.pvoc_deadline && (
                        <div className={`flex items-center gap-1.5 text-sm font-semibold ${dayColor}`}>
                          {(days !== null && days <= 7) && <AlertTriangle size={13} />}
                          <Clock size={13} />
                          {days === null ? 'No deadline'
                            : days < 0 ? `${Math.abs(days)}d overdue`
                            : days === 0 ? 'Due today'
                            : `${days} days to clearance deadline`}
                          <span className="text-[#64748B] font-normal text-xs">{fmtDate(s.pvoc_deadline)}</span>
                        </div>
                      )}
                      {s.eta && (
                        <div className="flex items-center gap-1 text-xs text-[#64748B]">
                          <Ship size={11} />
                          <span>Vessel arrives <span className="text-[#94A3B8] font-medium">{fmtDate(s.eta)}</span></span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Journey stages ── */}
                  <div className="px-4 py-3 border-b border-[#1E3A5F]">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2.5">Where is your cargo?</p>
                    <div className="relative">
                      {/* Track line */}
                      <div className="absolute top-3 left-3 right-3 h-0.5 bg-[#1E3A5F]" />
                      <div
                        className="absolute top-3 left-3 h-0.5 bg-[#00C896] transition-all"
                        style={{ width: stageIdx === 0 ? '0%' : `${(stageIdx / (STAGES.length - 1)) * 100}%` }}
                      />
                      {/* Stage dots */}
                      <div className="relative flex justify-between">
                        {STAGES.map((stage, i) => {
                          const done    = i < stageIdx
                          const current = i === stageIdx
                          return (
                            <div key={stage} className="flex flex-col items-center gap-1.5 min-w-0">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                                done    ? 'bg-[#00C896] border-[#00C896]'
                                : current ? 'bg-[#0A1628] border-[#00C896]'
                                : 'bg-[#0A1628] border-[#1E3A5F]'
                              }`}>
                                {done
                                  ? <CheckCircle2 size={12} className="text-[#0A1628]" />
                                  : current
                                    ? <div className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
                                    : <div className="w-1.5 h-1.5 rounded-full bg-[#1E3A5F]" />
                                }
                              </div>
                              <span className={`text-xs font-semibold text-center leading-tight max-w-[48px] ${
                                current ? 'text-[#00C896]' : done ? 'text-[#64748B]' : 'text-[#334155]'
                              }`}>
                                {STAGE_LABELS[stage]}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    {/* Current stage description */}
                    <p className="text-xs text-[#64748B] mt-3 leading-relaxed">
                      {STAGE_DESC[s.shipment_stage ?? 'PRE_SHIPMENT']}
                      {s.vessel_name && ` Vessel: ${s.vessel_name}.`}
                    </p>
                  </div>

                  {/* ── Cost breakdown ── */}
                  {s.total_landed_cost_kes && (
                    <div className="px-4 py-3 border-b border-[#1E3A5F]">
                      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-3">What it's costing you</p>
                      <div className="space-y-0">
                        {s.cif_value_usd && (
                          <CostRow
                            label={`Vehicle cost (CIF — ${s.origin_port ?? 'origin'} to Mombasa)`}
                            kes={s.cif_value_usd * rate}
                            note="What you paid for the car + shipping + insurance"
                          />
                        )}
                        {s.import_duty_usd != null && s.import_duty_usd > 0 && (
                          <CostRow label="Import Duty (KRA)" kes={s.import_duty_usd * rate} highlight />
                        )}
                        {s.derivedExcise > 50 && (
                          <CostRow label="Excise Duty (KRA)" kes={s.derivedExcise * rate} highlight />
                        )}
                        {s.vat_usd != null && s.vat_usd > 0 && (
                          <CostRow label="VAT 16%" kes={s.vat_usd * rate} highlight />
                        )}
                        {s.idf_levy_usd != null && s.idf_levy_usd > 0 && (
                          <CostRow label="IDF Levy (2%)" kes={s.idf_levy_usd * rate} />
                        )}
                        {s.rdl_levy_usd != null && s.rdl_levy_usd > 0 && (
                          <CostRow label="Railway Development Levy (1.5%)" kes={s.rdl_levy_usd * rate} />
                        )}
                        {s.pvoc_fee_usd != null && s.pvoc_fee_usd > 0 && (
                          <CostRow label="KEBS Inspection Fee" kes={s.pvoc_fee_usd * rate} />
                        )}
                        {s.clearing_fee_usd != null && s.clearing_fee_usd > 0 && (
                          <CostRow label="Clearing Agent Fee" kes={s.clearing_fee_usd * rate} />
                        )}
                        <div className="mt-1 pt-2 border-t border-[#1E3A5F] flex items-center justify-between">
                          <span className="text-sm font-bold text-white">Total you pay</span>
                          <span className="text-lg font-black text-[#00C896] tabular-nums">{fmtKES(s.total_landed_cost_kes)}</span>
                        </div>
                        <p className="text-xs text-[#334155] mt-1">
                          Taxes &amp; levies = {Math.round(((s.total_landed_cost_kes - s.cif_value_usd * rate) / s.total_landed_cost_kes) * 100)}% of your total cost
                          {s.exchange_rate_used ? ` · Rate: KES ${Number(s.exchange_rate_used).toFixed(1)}/USD` : ''}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Action steps ── */}
                  {s.actions.length > 0 && (
                    <div className="px-4 py-3 border-b border-[#1E3A5F]">
                      <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2.5">What your clearing agent is doing</p>
                      <div className="space-y-2">
                        {s.actions.map((a: any, i: number) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <div className={`mt-0.5 w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center border ${
                              a.status === 'COMPLETED' || a.status === 'DONE'
                                ? 'bg-[#00C896] border-[#00C896]'
                                : a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED'
                                  ? 'border-[#00C896] bg-[#00C896]/10'
                                  : 'border-[#1E3A5F] bg-[#0A1628]'
                            }`}>
                              {(a.status === 'COMPLETED' || a.status === 'DONE')
                                ? <CheckCircle2 size={10} className="text-[#0A1628]" />
                                : (a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED')
                                  ? <div className="w-1.5 h-1.5 rounded-full bg-[#00C896]" />
                                  : <div className="w-1.5 h-1.5 rounded-full bg-[#334155]" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs leading-snug ${
                                a.status === 'COMPLETED' || a.status === 'DONE'
                                  ? 'text-[#64748B] line-through'
                                  : 'text-[#94A3B8]'
                              }`}>{a.title}</p>
                            </div>
                            {(a.status === 'IN_PROGRESS' || a.status === 'SUBMITTED') && (
                              <span className="text-xs font-bold text-[#00C896] bg-[#00C896]/10 px-1.5 py-0.5 rounded flex-shrink-0">Active</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── Key details ── */}
                  <div className="px-4 py-3">
                    <p className="text-xs font-bold text-[#64748B] uppercase tracking-wide mb-2.5">Shipment details</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      {s.vessel_name && <Detail label="Vessel" val={s.vessel_name} />}
                      {s.bl_number && <Detail label="Bill of Lading" val={s.bl_number} />}
                      {s.hs_code && <Detail label="HS Code" val={s.hs_code} />}
                      {s.reference_number && <Detail label="KRUX Reference" val={s.reference_number} />}
                      {s.regulatory_body && <Detail label="Regulator" val={`${s.regulatory_body.code} — ${s.regulatory_body.name}`} />}
                      {s.weight_kg && <Detail label="Weight" val={`${Number(s.weight_kg).toLocaleString()} kg`} />}
                    </div>
                    {s.product_description && (
                      <p className="text-xs text-[#64748B] mt-2 leading-relaxed">{s.product_description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── CTA ── */}
        <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-5 py-5 text-center space-y-3">
          <FileText size={22} className="text-[#64748B] mx-auto" />
          <div>
            <p className="text-white font-semibold text-sm">Want this for all your imports?</p>
            <p className="text-[#64748B] text-xs mt-1 leading-relaxed">
              Every shipment, cost breakdown, deadline, and document status — in one place. Your clearing agent manages it, you see everything.
            </p>
          </div>
          <a
            href="https://krux-xi.vercel.app/signup"
            className="inline-block px-5 py-2.5 bg-[#00C896] text-[#0A1628] rounded-xl text-sm font-bold hover:bg-[#00A87E] transition-colors"
          >
            Create free account →
          </a>
        </div>

        <p className="text-[#1E3A5F] text-xs text-center pb-2">
          Powered by KRUX · Kenya Import Compliance Intelligence · {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

function StatCard({ val, label, color }: { val: number | string; label: string; color: string }) {
  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-3 text-center">
      <div className={`text-lg font-black ${color} leading-none`}>{val}</div>
      <div className="text-[#64748B] text-xs mt-1 leading-tight">{label}</div>
    </div>
  )
}

function CostRow({ label, kes, note, highlight }: { label: string; kes: number; note?: string; highlight?: boolean }) {
  return (
    <div className="flex items-start justify-between py-1.5 gap-3">
      <div className="flex-1 min-w-0">
        <span className={`text-xs ${highlight ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>{label}</span>
        {note && <div className="text-xs text-[#334155] mt-0.5">{note}</div>}
      </div>
      <span className={`text-xs font-semibold tabular-nums flex-shrink-0 ${highlight ? 'text-amber-400' : 'text-[#64748B]'}`}>
        {fmtKES(kes)}
      </span>
    </div>
  )
}

function Detail({ label, val }: { label: string; val: string }) {
  return (
    <div>
      <div className="text-xs font-bold text-[#334155] uppercase tracking-wide">{label}</div>
      <div className="text-xs text-[#94A3B8] mt-0.5 break-words">{val}</div>
    </div>
  )
}
