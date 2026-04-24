'use client'
import { useState, useEffect, useCallback } from 'react'
import {
  Bell, AlertTriangle, CheckCircle2, Info, X, CheckCheck,
  Loader2, RefreshCw, ExternalLink,
} from 'lucide-react'

type Notification = {
  id: string
  title: string
  body: string
  type: 'WARNING' | 'SUCCESS' | 'INFO' | 'CRITICAL'
  read: boolean
  action_url: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

type Filter = 'all' | 'unread' | 'compliance' | 'license' | 'system'

const TYPE_CONFIG: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  WARNING:  { icon: AlertTriangle,  color: 'text-amber-400',   bg: 'bg-amber-500/10',   border: 'border-amber-500/20' },
  CRITICAL: { icon: AlertTriangle,  color: 'text-red-400',     bg: 'bg-red-500/10',     border: 'border-red-500/20'   },
  SUCCESS:  { icon: CheckCircle2,   color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  INFO:     { icon: Info,           color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20'  },
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

function matchesFilter(n: Notification, filter: Filter) {
  if (filter === 'unread') return !n.read
  if (filter === 'compliance') return n.title.toLowerCase().includes('pvoc') || n.title.toLowerCase().includes('compliance') || n.title.toLowerCase().includes('deadline') || (n.metadata as any)?.type === 'COMPLIANCE'
  if (filter === 'license') return n.title.toLowerCase().includes('license') || n.title.toLowerCase().includes('expir') || (n.metadata as any)?.type === 'LICENSE'
  if (filter === 'system') return n.type === 'INFO' && !n.action_url
  return true
}

export default function AlertsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading]             = useState(true)
  const [filter, setFilter]               = useState<Filter>('all')
  const [sendingAlert, setSendingAlert]   = useState(false)
  const [alertResult, setAlertResult]     = useState('')

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/notifications')
      if (!r.ok) return
      const d = await r.json()
      setNotifications(d.notifications ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    const unread = notifications.filter(n => !n.read)
    await Promise.all(unread.map(n => fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })))
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  async function runAlerts() {
    setSendingAlert(true)
    setAlertResult('')
    try {
      const r = await fetch('/api/alerts/send', { method: 'POST' })
      const d = await r.json()
      if (d.ok) {
        setAlertResult(`Sent — ${d.sent.shipments} shipment + ${d.sent.licenses} license alerts`)
        await load()
      } else {
        setAlertResult(d.error ?? 'Failed')
      }
    } catch {
      setAlertResult('Request failed')
    } finally {
      setSendingAlert(false)
      setTimeout(() => setAlertResult(''), 5000)
    }
  }

  const filtered = notifications.filter(n => matchesFilter(n, filter))
  const unreadCount = notifications.filter(n => !n.read).length

  const FILTERS: { key: Filter; label: string; count?: number }[] = [
    { key: 'all',        label: 'All',        count: notifications.length },
    { key: 'unread',     label: 'Unread',     count: unreadCount },
    { key: 'compliance', label: 'Compliance' },
    { key: 'license',    label: 'Licenses'   },
    { key: 'system',     label: 'System'     },
  ]

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Alerts Center</h1>
          <p className="text-[#64748B] text-sm mt-1">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'} · {notifications.length} total notifications
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 px-3 py-2 text-xs text-[#94A3B8] hover:text-white bg-[#0F2040] border border-[#1E3A5F] rounded-lg transition-all"
            >
              <CheckCheck size={13} />
              Mark all read
            </button>
          )}
          <button
            onClick={() => load()}
            className="flex items-center gap-2 px-3 py-2 text-xs text-[#94A3B8] hover:text-white bg-[#0F2040] border border-[#1E3A5F] rounded-lg transition-all"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
          <button
            onClick={runAlerts}
            disabled={sendingAlert}
            className="flex items-center gap-2 px-3 py-2 text-xs text-[#0A1628] bg-[#00C896] hover:bg-[#00C896]/90 rounded-lg font-medium transition-all disabled:opacity-60"
          >
            {sendingAlert ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />}
            Run alerts now
          </button>
        </div>
      </div>

      {alertResult && (
        <div className="bg-[#00C896]/10 border border-[#00C896]/30 rounded-lg px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-[#00C896]" />
          <span className="text-sm text-[#00C896]">{alertResult}</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl p-1 w-fit">
        {FILTERS.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              filter === f.key
                ? 'bg-[#1E3A5F] text-white'
                : 'text-[#64748B] hover:text-white'
            }`}
          >
            {f.label}
            {f.count !== undefined && f.count > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                f.key === 'unread' && f.count > 0
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-[#0A1628] text-[#64748B]'
              }`}>
                {f.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications list */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={20} className="animate-spin text-[#334155]" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 rounded-2xl bg-[#0F2040] border border-[#1E3A5F] flex items-center justify-center mx-auto mb-4">
            <Bell size={20} className="text-[#334155]" />
          </div>
          <p className="text-[#64748B] text-sm">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.INFO
            const Icon = cfg.icon
            return (
              <div
                key={n.id}
                className={`relative group bg-[#0F2040] border rounded-xl px-5 py-4 transition-all hover:border-[#1E3A5F] cursor-default ${
                  !n.read ? 'border-[#1E3A5F]' : 'border-[#1E3A5F]/40 opacity-75'
                }`}
              >
                {!n.read && (
                  <span className="absolute top-4 left-0 w-1 h-6 rounded-r bg-[#00C896] -translate-x-0" />
                )}
                <div className="flex items-start gap-4">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg.bg} border ${cfg.border}`}>
                    <Icon size={15} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-2 mb-1">
                      <span className="text-sm font-semibold text-white flex-1">{n.title}</span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] text-[#475569]">{timeAgo(n.created_at)}</span>
                        {n.action_url && (
                          <a
                            href={n.action_url}
                            className="text-[#64748B] hover:text-[#00C896] transition-colors"
                          >
                            <ExternalLink size={13} />
                          </a>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => markRead(n.id)}
                            className="text-[#334155] hover:text-[#00C896] transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-xs text-[#64748B] leading-relaxed">{n.body}</p>
                    {n.metadata && Object.keys(n.metadata).length > 0 && (
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {Object.entries(n.metadata).slice(0, 4).map(([k, v]) =>
                          v && typeof v !== 'object' ? (
                            <span key={k} className="text-[10px] bg-[#0A1628] border border-[#1E3A5F] rounded px-2 py-0.5 text-[#475569]">
                              {k.replace(/_/g, ' ')}: <span className="text-[#64748B]">{String(v)}</span>
                            </span>
                          ) : null
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
