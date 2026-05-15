'use client'
import { useState, useEffect, useRef } from 'react'
import { Bell, X, CheckCheck, AlertTriangle, Info, CheckCircle2 } from 'lucide-react'

type Notification = {
  id: string
  title: string
  body: string
  type: string
  read: boolean
  action_url: string | null
  created_at: string
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const TYPE_ICON: Record<string, React.ElementType> = {
  WARNING: AlertTriangle,
  SUCCESS: CheckCircle2,
  INFO:    Info,
}

const TYPE_COLOR: Record<string, string> = {
  WARNING: 'text-amber-400',
  SUCCESS: 'text-emerald-400',
  INFO:    'text-blue-400',
}

export function NotificationBell() {
  const [open, setOpen]                 = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unread, setUnread]             = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  async function load() {
    try {
      const r = await fetch('/api/notifications')
      if (!r.ok) return
      const d = await r.json()
      setNotifications(d.notifications)
      setUnread(d.unread)
    } catch {}
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setUnread((prev) => Math.max(0, prev - 1))
  }

  async function markAllRead() {
    const unreadOnes = notifications.filter((n) => !n.read)
    await Promise.all(unreadOnes.map((n) => fetch(`/api/notifications/${n.id}`, { method: 'PATCH' })))
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnread(0)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-[#64748B] hover:text-white hover:bg-[#1E3A5F]/50 transition-all"
      >
        <Bell size={16} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-white text-xs font-bold flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-10 w-80 bg-[#0F2040] border border-[#1E3A5F] rounded-xl shadow-2xl z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]">
            <span className="text-sm font-bold text-white">Notifications</span>
            <div className="flex items-center gap-2">
              {unread > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-[#64748B] hover:text-white flex items-center gap-1 transition-colors"
                >
                  <CheckCheck size={12} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-[#64748B] hover:text-white">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-[#1E3A5F]">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-[#64748B]">No notifications yet</div>
            ) : (
              notifications.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Info
                const color = TYPE_COLOR[n.type] ?? 'text-blue-400'
                return (
                  <div
                    key={n.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-[#1E3A5F]/30 transition-colors ${!n.read ? 'bg-[#1E3A5F]/20' : ''}`}
                    onClick={() => {
                      if (!n.read) markRead(n.id)
                      if (n.action_url) window.location.href = n.action_url
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <Icon size={14} className={`mt-0.5 flex-shrink-0 ${color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">{n.title}</span>
                          {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#00C896] flex-shrink-0" />}
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-xs text-[#475569] mt-1">{timeAgo(n.created_at)}</p>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
