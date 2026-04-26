'use client'
import { useState, useEffect } from 'react'
import { PurchaseOrder, POMilestone, RiskFlag } from '@/lib/types'
import { formatUSD, formatDate } from '@/lib/utils'
import { RiskBadge } from '@/components/RiskBadge'
import {
  Plus, ChevronDown, ChevronRight, CheckCircle2,
  Circle, AlertTriangle, Loader2, Shield, DollarSign,
  Package, Clock,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  DRAFT:         'bg-[#1E3A5F] text-[#64748B]',
  CONFIRMED:     'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  IN_PRODUCTION: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
  QUALITY_CHECK: 'bg-purple-500/15 text-purple-400 border border-purple-500/25',
  SHIPPED:       'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25',
  DELIVERED:     'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25',
  DISPUTED:      'bg-red-500/15 text-red-400 border border-red-500/25',
  CANCELLED:     'bg-[#1E3A5F] text-[#334155]',
}

// ─── Milestone row ────────────────────────────────────────────

function MilestoneRow({
  milestone,
  poId,
  onToggle,
}: {
  milestone: POMilestone
  poId:      string
  onToggle:  (milestoneId: string, current: boolean) => void
}) {
  const today    = new Date(); today.setHours(0,0,0,0)
  const due      = new Date(milestone.due_date)
  const overdue  = !milestone.is_completed && due < today
  const daysLeft = Math.ceil((due.getTime() - today.getTime()) / 86400000)

  return (
    <div className="flex items-center gap-3 py-2 border-b border-[#0F2040] last:border-0">
      <button onClick={() => onToggle(milestone.id, milestone.is_completed)} className="shrink-0 mt-0.5">
        {milestone.is_completed
          ? <CheckCircle2 size={15} className="text-[#00C896]" />
          : <Circle size={15} className={overdue ? 'text-red-400' : 'text-[#334155]'} />}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-medium truncate ${milestone.is_completed ? 'text-[#64748B] line-through' : 'text-white'}`}>
          {milestone.name}
        </p>
        <p className={`text-[10px] mt-0.5 ${overdue ? 'text-red-400' : 'text-[#64748B]'}`}>
          {overdue
            ? `${Math.abs(daysLeft)}d overdue`
            : milestone.is_completed
            ? `Done ${milestone.completed_date ? formatDate(milestone.completed_date) : ''}`
            : `Due ${formatDate(milestone.due_date)} · ${daysLeft}d`}
        </p>
      </div>
      {milestone.triggers_payment && milestone.payment_amount_usd && (
        <span className="text-[10px] text-[#00C896] font-semibold shrink-0">
          {formatUSD(milestone.payment_amount_usd)}
        </span>
      )}
    </div>
  )
}

// ─── Milestone progress bar ───────────────────────────────────

function MilestoneBar({ milestones }: { milestones: POMilestone[] }) {
  if (!milestones.length) return <span className="text-[10px] text-[#64748B]">No milestones</span>
  const done = milestones.filter((m) => m.is_completed).length
  const pct  = Math.round((done / milestones.length) * 100)
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#0A1628] rounded-full overflow-hidden">
        <div className="h-full bg-[#00C896] rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-[#64748B] shrink-0">{done}/{milestones.length}</span>
    </div>
  )
}

// ─── PO card ─────────────────────────────────────────────────

function POCard({
  po,
  onMilestoneToggle,
}: {
  po:               PurchaseOrder & { manufacturer?: any; milestones?: POMilestone[] }
  onMilestoneToggle: (poId: string, milestoneId: string, current: boolean) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const milestones  = po.milestones ?? []
  const overdue     = milestones.filter((m) => !m.is_completed && new Date(m.due_date) < new Date()).length
  const advancePct  = po.advance_pct ?? 0
  const advancePaid = po.advance_paid_usd ?? (po.po_value_usd * advancePct / 100)

  return (
    <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full text-left p-4 hover:bg-[#1E3A5F]/20 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[po.status] ?? ''}`}>
                {po.status.replace('_', ' ')}
              </span>
              {overdue > 0 && (
                <span className="flex items-center gap-1 text-[10px] text-red-400 font-semibold">
                  <AlertTriangle size={10} />
                  {overdue} overdue
                </span>
              )}
              {po.has_penalty_clause && (
                <span className="text-[10px] text-amber-400">⚡ Penalty clause</span>
              )}
            </div>
            <p className="text-sm font-semibold text-white truncate">{po.product_name}</p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              {po.po_number} · {po.manufacturer?.company_name ?? '—'}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-sm font-bold text-white">{formatUSD(po.po_value_usd)}</p>
            <p className="text-[10px] text-[#64748B]">{advancePct}% advance</p>
            {expanded ? <ChevronDown size={14} className="text-[#64748B] ml-auto mt-1" /> : <ChevronRight size={14} className="text-[#64748B] ml-auto mt-1" />}
          </div>
        </div>

        {/* Advance progress */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-[#64748B] mb-1">Advance paid</p>
            <div className="h-1.5 bg-[#0A1628] rounded-full overflow-hidden">
              <div className="h-full bg-amber-500 rounded-full" style={{ width: `${advancePct}%` }} />
            </div>
            <p className="text-[10px] text-amber-400 mt-0.5">{formatUSD(advancePaid)} at risk</p>
          </div>
          <div>
            <p className="text-[10px] text-[#64748B] mb-1">Milestones</p>
            <MilestoneBar milestones={milestones} />
            {po.expected_delivery_date && (
              <p className="text-[10px] text-[#64748B] mt-0.5">ETA {formatDate(po.expected_delivery_date)}</p>
            )}
          </div>
        </div>
      </button>

      {/* Milestones expanded */}
      {expanded && (
        <div className="border-t border-[#1E3A5F] px-4 py-3">
          {milestones.length === 0 ? (
            <p className="text-xs text-[#64748B] py-2">No milestones set.</p>
          ) : (
            milestones
              .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
              .map((m) => (
                <MilestoneRow
                  key={m.id}
                  milestone={m}
                  poId={po.id}
                  onToggle={(mid, cur) => onMilestoneToggle(po.id, mid, cur)}
                />
              ))
          )}
        </div>
      )}
    </div>
  )
}

// ─── Add PO modal ─────────────────────────────────────────────

function AddPOModal({
  manufacturers,
  onClose,
  onAdded,
}: {
  manufacturers: { id: string; company_name: string; overall_risk: RiskFlag }[]
  onClose: () => void
  onAdded: (po: PurchaseOrder) => void
}) {
  const [form, setForm] = useState({
    manufacturer_id: '', product_name: '', po_number: '',
    po_value_usd: '', advance_pct: '30', order_date: '',
    expected_delivery_date: '', has_penalty_clause: false,
    penalty_per_day_usd: '', incoterms: 'FOB',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const mfr = manufacturers.find((m) => m.id === form.manufacturer_id)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          po_value_usd:           parseFloat(form.po_value_usd),
          advance_pct:            parseFloat(form.advance_pct),
          advance_paid_usd:       parseFloat(form.po_value_usd) * parseFloat(form.advance_pct) / 100,
          penalty_per_day_usd:    form.penalty_per_day_usd ? parseFloat(form.penalty_per_day_usd) : null,
          manufacturer_risk_flag: mfr?.overall_risk ?? 'AMBER',
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      onAdded(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[#1E3A5F]">
          <h2 className="text-lg font-bold text-white">New Purchase Order</h2>
          <p className="text-[#64748B] text-xs mt-1">Protect your advance payment from day one</p>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="text-xs text-[#64748B] font-medium">Manufacturer</label>
            <select
              required
              value={form.manufacturer_id}
              onChange={(e) => set('manufacturer_id', e.target.value)}
              className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]"
            >
              <option value="">Select manufacturer...</option>
              {manufacturers.map((m) => (
                <option key={m.id} value={m.id}>{m.company_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748B] font-medium">Product Name</label>
              <input required value={form.product_name} onChange={(e) => set('product_name', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" placeholder="e.g. Pharmaceutical APIs" />
            </div>
            <div>
              <label className="text-xs text-[#64748B] font-medium">PO Number</label>
              <input required value={form.po_number} onChange={(e) => set('po_number', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" placeholder="PO-2026-001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748B] font-medium">PO Value (USD)</label>
              <input required type="number" value={form.po_value_usd} onChange={(e) => set('po_value_usd', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" placeholder="50000" />
            </div>
            <div>
              <label className="text-xs text-[#64748B] font-medium">Advance % </label>
              <input required type="number" min="0" max="100" value={form.advance_pct} onChange={(e) => set('advance_pct', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748B] font-medium">Order Date</label>
              <input required type="date" value={form.order_date} onChange={(e) => set('order_date', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
            <div>
              <label className="text-xs text-[#64748B] font-medium">Expected Delivery</label>
              <input type="date" value={form.expected_delivery_date} onChange={(e) => set('expected_delivery_date', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#64748B] font-medium">Incoterms</label>
              <select value={form.incoterms} onChange={(e) => set('incoterms', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]">
                {['FOB', 'CIF', 'EXW', 'DDP', 'CFR'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-[#64748B] font-medium">Penalty/day (USD)</label>
              <input type="number" value={form.penalty_per_day_usd} onChange={(e) => set('penalty_per_day_usd', e.target.value)}
                className="mt-1 w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#00C896]" placeholder="Optional" />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.has_penalty_clause} onChange={(e) => set('has_penalty_clause', e.target.checked)}
              className="w-4 h-4 accent-[#00C896]" />
            <span className="text-xs text-[#94A3B8]">Has penalty clause</span>
          </label>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-[#1E3A5F] text-[#64748B] rounded-lg text-sm hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
              {saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Create PO
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────

export default function OrdersPage() {
  const [orders, setOrders]             = useState<(PurchaseOrder & { manufacturer?: any; milestones?: POMilestone[] })[]>([])
  const [manufacturers, setManufacturers] = useState<{ id: string; company_name: string; overall_risk: RiskFlag }[]>([])
  const [loading, setLoading]           = useState(true)
  const [showAdd, setShowAdd]           = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/orders').then((r) => r.json()),
      fetch('/api/manufacturers').then((r) => r.json()),
    ]).then(([ords, mfrs]) => {
      setOrders(Array.isArray(ords) ? ords : [])
      setManufacturers(Array.isArray(mfrs) ? mfrs : [])
    }).finally(() => setLoading(false))
  }, [])

  async function handleMilestoneToggle(poId: string, milestoneId: string, current: boolean) {
    const res = await fetch(`/api/orders/${poId}/milestones`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ milestone_id: milestoneId, is_completed: !current }),
    })
    if (res.ok) {
      setOrders((prev) => prev.map((po) => {
        if (po.id !== poId) return po
        return {
          ...po,
          milestones: (po.milestones ?? []).map((m) =>
            m.id === milestoneId
              ? { ...m, is_completed: !current, completed_date: !current ? new Date().toISOString().split('T')[0] : undefined }
              : m
          ),
        }
      }))
    }
  }

  // Stats
  const totalValue    = orders.reduce((s, o) => s + (o.po_value_usd ?? 0), 0)
  const atRisk        = orders.reduce((s, o) => s + ((o.advance_paid_usd ?? (o.po_value_usd * (o.advance_pct ?? 30) / 100))), 0)
  const overdueCount  = orders.reduce((s, o) => s + (o.milestones ?? []).filter((m) => !m.is_completed && new Date(m.due_date) < new Date()).length, 0)
  const activeOrders  = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status))

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-[#64748B]">
      <Loader2 size={20} className="animate-spin mr-2" /> Loading orders...
    </div>
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Order Protection</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {activeOrders.length} active order{activeOrders.length !== 1 ? 's' : ''} · advance payments tracked
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#00C896] text-[#0A1628] rounded-lg text-sm font-bold hover:bg-[#00A87E] transition-colors"
        >
          <Plus size={14} /> New PO
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total PO Value',    value: formatUSD(totalValue),   icon: Package,     color: 'text-white' },
          { label: 'Advance at Risk',   value: formatUSD(atRisk),        icon: DollarSign,  color: 'text-amber-400' },
          { label: 'Active Orders',     value: String(activeOrders.length), icon: Shield,   color: 'text-blue-400' },
          { label: 'Overdue Milestones',value: String(overdueCount),     icon: Clock,       color: overdueCount > 0 ? 'text-red-400' : 'text-[#64748B]' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[#64748B] text-xs">{label}</span>
              <Icon size={14} className={color} />
            </div>
            <p className={`text-xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* PO list */}
      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-2 border border-dashed border-[#1E3A5F] rounded-xl">
          <Shield size={28} className="text-[#334155]" />
          <p className="text-white font-semibold">No orders yet</p>
          <p className="text-[#64748B] text-sm">Add your first PO to start tracking advance payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((po) => (
            <POCard
              key={po.id}
              po={po}
              onMilestoneToggle={handleMilestoneToggle}
            />
          ))}
        </div>
      )}

      {showAdd && (
        <AddPOModal
          manufacturers={manufacturers}
          onClose={() => setShowAdd(false)}
          onAdded={(po) => { setOrders((p) => [po as any, ...p]); setShowAdd(false) }}
        />
      )}
    </div>
  )
}
