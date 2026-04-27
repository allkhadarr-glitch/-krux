import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { AlertTriangle, Clock, CheckCircle2 } from 'lucide-react'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

function daysUntil(d: string) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)
}

function fmt(d: string) {
  return new Date(d).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { data } = await supabaseAdmin.from('client_share_tokens').select('client_name').eq('token', token).single()
  return {
    title: data ? `${data.client_name} — Shipment Status · KRUX` : 'KRUX Shipment Portal',
    description: 'Real-time Kenya import compliance status from KRUX.',
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
      <div className="min-h-screen bg-[#0A1628] flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-400 text-5xl mb-4">⏳</div>
          <p className="text-white text-lg font-semibold">This link has expired</p>
          <p className="text-[#64748B] text-sm mt-2">Ask your clearing agent to generate a new one.</p>
        </div>
      </div>
    )
  }

  const { data: shipments } = await supabaseAdmin
    .from('shipments')
    .select('id, name, reference_number, origin_port, destination_port, pvoc_deadline, risk_flag_status, remediation_status, shipment_status, total_landed_cost_usd, total_landed_cost_kes, regulatory_body_id, composite_risk_score, cif_value_usd, created_at')
    .eq('organization_id', tokenRow.organization_id)
    .eq('client_name', tokenRow.client_name)
    .is('deleted_at', null)
    .order('pvoc_deadline', { ascending: true })

  const { data: bodies } = await supabaseAdmin.from('regulatory_bodies').select('id, code')
  const bodiesById = Object.fromEntries((bodies ?? []).map((b: any) => [b.id, b]))

  const enriched = (shipments ?? []).map((s: any) => ({
    ...s,
    regulatory_body: s.regulatory_body_id ? bodiesById[s.regulatory_body_id] : null,
    days: s.pvoc_deadline ? daysUntil(s.pvoc_deadline) : null,
  }))

  const critical = enriched.filter(s => s.days !== null && s.days <= 7)
  const totalKES = enriched.reduce((sum, s) => sum + (s.total_landed_cost_kes ?? 0), 0)

  return (
    <div className="min-h-screen bg-[#0A1628] font-[system-ui,sans-serif]">
      {/* Header */}
      <div className="border-b border-[#1E3A5F] bg-[#0F2040]">
        <div className="max-w-3xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#00C896] flex items-center justify-center">
              <span className="text-[#0A1628] font-black text-sm">K</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm">KRUX</div>
              <div className="text-[#64748B] text-xs">Kenya Import Compliance</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-white font-semibold text-sm">{tokenRow.client_name}</div>
            <div className="text-[#64748B] text-xs">Shipment Portal</div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active Shipments', val: enriched.filter(s => s.remediation_status !== 'CLOSED').length, color: 'text-white' },
            { label: 'Needs Attention', val: critical.length, color: critical.length > 0 ? 'text-red-400' : 'text-[#00C896]' },
            { label: 'Total Landed Cost', val: totalKES >= 1_000_000 ? `KES ${(totalKES / 1_000_000).toFixed(1)}M` : `KES ${totalKES.toLocaleString()}`, color: 'text-[#00C896]' },
          ].map(({ label, val, color }) => (
            <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl p-4 text-center">
              <div className={`text-xl font-black ${color}`}>{val}</div>
              <div className="text-[#64748B] text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Shipments */}
        {enriched.length === 0 ? (
          <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl px-6 py-12 text-center">
            <p className="text-[#64748B]">No active shipments</p>
          </div>
        ) : (
          <div className="space-y-3">
            {enriched.map((s) => {
              const accentColor = s.risk_flag_status === 'RED' ? '#ef4444' : s.risk_flag_status === 'AMBER' ? '#f59e0b' : '#00C896'
              const dayColor = s.days !== null && s.days <= 3 ? 'text-red-400' : s.days !== null && s.days <= 7 ? 'text-amber-400' : 'text-[#94A3B8]'

              return (
                <div
                  key={s.id}
                  className="bg-[#0F2040] rounded-2xl overflow-hidden"
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-white font-semibold text-[15px]">{s.name}</div>
                        <div className="text-[#64748B] text-xs mt-0.5">{s.reference_number} · {s.origin_port}</div>
                      </div>
                      {s.regulatory_body && (
                        <span className="px-2 py-0.5 bg-[#1E3A5F] text-[#94A3B8] text-xs rounded-md font-mono flex-shrink-0">
                          {s.regulatory_body.code}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className={`flex items-center gap-1.5 text-sm font-semibold ${dayColor}`}>
                        {s.days !== null && s.days <= 7 && <AlertTriangle size={13} />}
                        <Clock size={13} />
                        {s.pvoc_deadline
                          ? s.days !== null && s.days > 0
                            ? `${s.days} days left`
                            : s.days !== null && s.days < 0
                              ? `${Math.abs(s.days)}d overdue`
                              : 'Due today'
                          : 'No deadline set'}
                        {s.pvoc_deadline && (
                          <span className="text-[#64748B] font-normal text-xs ml-1">{fmt(s.pvoc_deadline)}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {s.remediation_status === 'CLOSED'
                          ? <span className="flex items-center gap-1 text-xs text-[#00C896]"><CheckCircle2 size={12} /> Cleared</span>
                          : <span className="px-2 py-0.5 bg-[#1E3A5F] text-[#94A3B8] text-xs rounded-full">{s.remediation_status}</span>
                        }
                      </div>
                    </div>

                    {(s.total_landed_cost_kes || s.total_landed_cost_usd) && (
                      <div className="text-sm font-bold text-[#00C896]">
                        {s.total_landed_cost_kes
                          ? `KES ${s.total_landed_cost_kes >= 1_000_000 ? `${(s.total_landed_cost_kes / 1_000_000).toFixed(1)}M` : s.total_landed_cost_kes.toLocaleString()}`
                          : `$${s.total_landed_cost_usd?.toLocaleString()}`}
                        <span className="text-[#64748B] font-normal text-xs ml-1">landed cost</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <p className="text-[#334155] text-xs text-center pt-2">
          Powered by KRUX · Kenya Import Compliance Intelligence · {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
