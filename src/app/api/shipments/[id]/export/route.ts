import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

function fmt(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-KE', { day: '2-digit', month: 'short', year: 'numeric' })
}
function fmtTs(d?: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function usd(n?: number | null) { return n != null ? `USD ${n.toLocaleString()}` : '—' }
function kes(n?: number | null) { return n != null ? `KES ${Number(n).toLocaleString()}` : '—' }

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const [{ data: shipment }, { data: actions }, { data: events }, { data: costs }, { data: docs }] = await Promise.all([
    supabase.from('shipments').select('*, regulatory_body:regulatory_bodies(code,name)').eq('id', id).single(),
    supabase.from('actions').select('*').eq('shipment_id', id).order('created_at'),
    supabase.from('execution_timeline').select('*').eq('shipment_id', id).order('created_at'),
    supabase.from('shipment_costs').select('*').eq('shipment_id', id).order('recorded_at'),
    supabase.from('shipment_documents').select('document_name, document_type, uploaded_at').eq('shipment_id', id),
  ])

  if (!shipment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const allCosts  = costs ?? []
  const totalCost = allCosts.reduce((s: number, c: any) => s + Number(c.amount_kes), 0)

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>KRUX Audit Report — ${shipment.name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a2e; background: #fff; padding: 32px; }
  h1 { font-size: 22px; font-weight: 800; color: #0a1628; }
  h2 { font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin: 24px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #0a1628; }
  .brand { font-size: 11px; color: #64748b; text-align: right; }
  .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px; }
  .kv { display: flex; gap: 8px; padding: 4px 0; border-bottom: 1px solid #f1f5f9; }
  .kv .k { color: #64748b; min-width: 140px; font-size: 11px; }
  .kv .v { font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin-top: 4px; }
  th { background: #f8fafc; text-align: left; padding: 6px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; border: 1px solid #e2e8f0; }
  td { padding: 6px 10px; border: 1px solid #e2e8f0; font-size: 11px; vertical-align: top; }
  tr:nth-child(even) td { background: #f8fafc; }
  .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; }
  .DONE { background: #d1fae5; color: #065f46; }
  .FAILED { background: #fee2e2; color: #991b1b; }
  .AT_RISK { background: #fee2e2; color: #991b1b; }
  .PENDING { background: #f1f5f9; color: #475569; }
  .IN_PROGRESS { background: #fef3c7; color: #92400e; }
  .CRITICAL { background: #fee2e2; color: #991b1b; }
  .HIGH { background: #fef3c7; color: #92400e; }
  .MEDIUM { background: #dbeafe; color: #1e40af; }
  .LOW { background: #f1f5f9; color: #475569; }
  .CLEARED { background: #d1fae5; color: #065f46; }
  .DELAYED { background: #fef3c7; color: #92400e; }
  .PENALIZED { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; font-size: 10px; color: #94a3b8; text-align: center; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>${shipment.name}</h1>
    <div style="font-size:11px;color:#64748b;margin-top:4px">${shipment.reference_number ?? '—'} · Generated ${fmtTs(new Date().toISOString())}</div>
  </div>
  <div class="brand">
    <div style="font-weight:800;font-size:16px;color:#0a1628">KRUX</div>
    <div>Compliance Intelligence</div>
    <div>Kenya Import Compliance Audit Report</div>
  </div>
</div>

<h2>Shipment Details</h2>
<div class="grid2">
  <div>
    <div class="kv"><span class="k">Regulator</span><span class="v">${(shipment as any).regulatory_body?.code ?? '—'} — ${(shipment as any).regulatory_body?.name ?? ''}</span></div>
    <div class="kv"><span class="k">Origin Port</span><span class="v">${shipment.origin_port ?? '—'}</span></div>
    <div class="kv"><span class="k">Destination</span><span class="v">${shipment.destination_port ?? '—'}</span></div>
    <div class="kv"><span class="k">HS Code</span><span class="v">${shipment.hs_code ?? '—'}</span></div>
    <div class="kv"><span class="k">PVoC Deadline</span><span class="v">${fmt(shipment.pvoc_deadline)}</span></div>
    <div class="kv"><span class="k">Final Status</span><span class="v"><span class="badge ${shipment.remediation_status}">${shipment.remediation_status}</span></span></div>
  </div>
  <div>
    <div class="kv"><span class="k">CIF Value</span><span class="v">${usd(shipment.cif_value_usd)}</span></div>
    <div class="kv"><span class="k">Total Landed Cost</span><span class="v">${usd(shipment.total_landed_cost_usd)}</span></div>
    <div class="kv"><span class="k">Exchange Rate</span><span class="v">KES ${shipment.exchange_rate_used ?? '—'} / USD</span></div>
    <div class="kv"><span class="k">Created</span><span class="v">${fmt(shipment.created_at)}</span></div>
    <div class="kv"><span class="k">Risk Flag</span><span class="v">${shipment.risk_flag_status}</span></div>
  </div>
</div>

<h2>Actions (${(actions ?? []).length} total)</h2>
<table>
  <thead><tr><th>Priority</th><th>Action</th><th>Type</th><th>Status</th><th>Assignee</th><th>Started</th><th>Completed/Failed</th></tr></thead>
  <tbody>
    ${(actions ?? []).map((a: any) => `
    <tr>
      <td><span class="badge ${a.priority}">${a.priority}</span></td>
      <td>${a.title}</td>
      <td style="font-size:10px;color:#64748b">${a.action_type}</td>
      <td><span class="badge ${a.execution_status ?? 'PENDING'}">${(a.execution_status ?? 'PENDING').replace('_',' ')}</span></td>
      <td>${a.assignee_name ?? '—'}</td>
      <td>${fmt(a.started_at)}</td>
      <td>${fmt(a.execution_status === 'DONE' ? a.updated_at : a.failed_at)}</td>
    </tr>`).join('')}
  </tbody>
</table>

${allCosts.length > 0 ? `
<h2>Actual Costs (KES ${totalCost.toLocaleString()} total)</h2>
<table>
  <thead><tr><th>Type</th><th>Amount (KES)</th><th>Note</th><th>Recorded</th></tr></thead>
  <tbody>
    ${allCosts.map((c: any) => `
    <tr>
      <td>${c.cost_type}</td>
      <td style="font-weight:600">${Number(c.amount_kes).toLocaleString()}</td>
      <td>${c.note ?? '—'}</td>
      <td>${fmt(c.recorded_at)}</td>
    </tr>`).join('')}
  </tbody>
</table>` : ''}

${(docs ?? []).length > 0 ? `
<h2>Documents Uploaded (${(docs ?? []).length})</h2>
<table>
  <thead><tr><th>Document Type</th><th>File Name</th><th>Uploaded</th></tr></thead>
  <tbody>
    ${(docs ?? []).map((d: any) => `
    <tr><td>${d.document_type}</td><td>${d.document_name}</td><td>${fmt(d.uploaded_at)}</td></tr>`).join('')}
  </tbody>
</table>` : ''}

<h2>Execution Timeline (${(events ?? []).length} events)</h2>
<table>
  <thead><tr><th>Time</th><th>Event</th><th>Actor</th><th>Confidence</th><th>Detail</th></tr></thead>
  <tbody>
    ${(events ?? []).map((e: any) => `
    <tr>
      <td style="white-space:nowrap;font-size:10px">${fmtTs(e.created_at)}</td>
      <td style="font-weight:600;font-size:10px">${e.event_type.replace(/_/g,' ')}</td>
      <td style="font-size:10px">${e.actor_label ?? e.actor_type}</td>
      <td style="font-size:10px;color:#64748b">${e.confidence ?? '—'}</td>
      <td style="font-size:10px;color:#475569">${e.detail ?? ''}</td>
    </tr>`).join('')}
  </tbody>
</table>

<div class="footer">
  KRUX Compliance Intelligence · Kenya Import Compliance · Report generated ${new Date().toUTCString()}
  <br>This document is an internal compliance record. All data sourced from KRUX operational system.
</div>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Content-Disposition': `inline; filename="KRUX-audit-${shipment.reference_number ?? id}.html"`,
    },
  })
}
