'use client'
import { useState, useEffect } from 'react'
import { Loader2, Sparkles, RefreshCw, Copy, Printer, Bell, Share2, ExternalLink } from 'lucide-react'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'

function printBriefing(text: string, date: string) {
  const w = window.open('', '_blank', 'width=800,height=1000')
  if (!w) return
  w.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>KRUX Morning Brief — ${date}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Courier New', monospace; background: #fff; color: #111; padding: 48px 56px; max-width: 820px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #111; padding-bottom: 16px; margin-bottom: 24px; }
  .logo { font-size: 22px; font-weight: 900; letter-spacing: 0.15em; }
  .logo span { color: #00C896; }
  .meta { text-align: right; font-size: 11px; color: #555; line-height: 1.6; }
  pre { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12.5px; line-height: 1.75; color: #111; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #ccc; font-size: 10px; color: #888; display: flex; justify-content: space-between; }
  @media print { body { padding: 24px 32px; } }
</style>
</head>
<body>
<div class="header">
  <div class="logo">K<span>R</span>UX</div>
  <div class="meta">
    Kenya Import Compliance Intelligence<br>
    Morning Brief · ${date}<br>
    krux-xi.vercel.app
  </div>
</div>
<pre>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
<div class="footer">
  <span>KRUX — Delivered daily at 6:30am EAT</span>
  <span>Verify all figures with relevant regulatory portals before acting</span>
</div>
</body>
</html>`)
  w.document.close()
  w.focus()
  setTimeout(() => { w.print() }, 400)
}

export default function BriefingPage() {
  const [brief, setBrief]         = useState<string | null>(null)
  const [loading, setLoading]     = useState(false)
  const [copied, setCopied]       = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [shipCount, setShipCount] = useState(0)
  const [shareUrl, setShareUrl]   = useState<string | null>(null)
  const [sharing, setSharing]     = useState(false)

  const dateStr = new Date().toLocaleDateString('en-KE', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  async function generate() {
    setLoading(true)
    setError(null)
    setBrief(null)
    try {
      // Fetch active shipments
      const shipsRes  = await fetch('/api/shipments')
      const shipments = await shipsRes.json()
      const active    = Array.isArray(shipments)
        ? shipments.filter((s: any) => s.remediation_status !== 'CLOSED' && s.pvoc_deadline)
        : []

      setShipCount(active.length)

      if (active.length === 0) {
        setBrief('No active shipments with deadlines. Add shipments to see your morning brief.')
        return
      }

      const res  = await fetch('/api/ai/morning-briefing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ shipments: active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to generate brief')
      setBrief(data.result ?? 'No brief generated.')
    } catch (e: any) {
      setError(e.message ?? 'Failed — check ANTHROPIC_API_KEY')
    } finally {
      setLoading(false)
    }
  }

  // Auto-generate on mount
  useEffect(() => { generate() }, [])

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse" />
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">Daily Intelligence</span>
          </div>
          <h1 className="text-2xl font-black text-white">Morning Brief</h1>
          <p className="text-[#64748B] text-sm mt-1">{dateStr}</p>
          {shipCount > 0 && (
            <p className="text-[#64748B] text-xs mt-0.5">{shipCount} active shipment{shipCount !== 1 ? 's' : ''} analysed</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B]">
          <Bell size={12} />
          Sent via WhatsApp at 6:30am EAT on weekdays
        </div>
      </div>

      {/* Brief card */}
      <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-2xl overflow-hidden">
        {/* Card header */}
        <div className="px-6 py-4 border-b border-[#1E3A5F] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[#00C896]" />
            <span className="text-sm font-semibold text-white">AI-Generated Compliance Brief</span>
          </div>
          {brief && (
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(brief).then(() => {
                    setCopied(true)
                    setTimeout(() => setCopied(false), 2000)
                  })
                }}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
              >
                <Copy size={11} /> {copied ? 'Copied!' : 'Copy'}
              </button>
              <button
                onClick={() => printBriefing(brief, dateStr)}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors"
              >
                <Printer size={11} /> Print
              </button>
              {!shareUrl ? (
                <button
                  onClick={async () => {
                    setSharing(true)
                    try {
                      const res  = await fetch('/api/brief/share', {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body:    JSON.stringify({ brief_text: brief, shipment_name: `Morning Brief — ${dateStr}`, regulator: '' }),
                      })
                      const data = await res.json()
                      if (data.url) setShareUrl(data.url)
                    } finally {
                      setSharing(false)
                    }
                  }}
                  disabled={sharing}
                  className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors disabled:opacity-40"
                >
                  <Share2 size={11} className={sharing ? 'animate-pulse' : ''} />
                  {sharing ? 'Creating link…' : 'Share as link'}
                </button>
              ) : (
                <>
                  <a
                    href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`KRUX Morning Brief — ${dateStr}\n\n${shareUrl}`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-[#25D366] border border-[#25D366]/30 px-2 py-1 rounded-lg hover:bg-[#25D366]/10 transition-colors"
                  >
                    <Share2 size={11} /> Send via WhatsApp
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                    className="flex items-center gap-1.5 text-xs text-[#00C896] hover:text-[#00C896]/80 transition-colors"
                  >
                    <ExternalLink size={11} /> Copy link
                  </button>
                </>
              )}
              <button
                onClick={generate}
                disabled={loading}
                className="flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#00C896] transition-colors disabled:opacity-40"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} /> Regenerate
              </button>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <div className="relative">
                <Sparkles size={24} className="text-[#00C896]" />
                <Loader2 size={44} className="text-[#00C896]/20 animate-spin absolute -top-2.5 -left-2.5" />
              </div>
              <p className="text-[#64748B] text-sm">Generating your morning brief...</p>
              <p className="text-[#334155] text-xs">Analysing deadlines, exposure, and required actions</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={generate} className="text-xs text-[#64748B] hover:text-[#00C896] transition-colors">Try again</button>
            </div>
          ) : brief ? (
            <pre className="whitespace-pre-wrap text-[13px] text-[#94A3B8] leading-[1.8] font-mono">
              {brief}
            </pre>
          ) : null}
        </div>
      </div>

      {/* WhatsApp preview */}
      {brief && (
        <div className="mt-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
            <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-widest">How it looks on WhatsApp at 6:30am</span>
          </div>

          {/* Phone mockup */}
          <div className="flex justify-center">
            <div className="w-72 bg-[#111B21] rounded-[2.5rem] p-3 shadow-2xl border-4 border-[#1E2C33]">
              {/* Phone status bar */}
              <div className="flex justify-between items-center px-4 py-1 mb-1">
                <span className="text-[9px] text-[#8696A0] font-medium">6:30</span>
                <div className="flex gap-1">
                  <div className="w-3 h-1.5 bg-[#8696A0] rounded-sm" />
                  <div className="w-1 h-1.5 bg-[#8696A0] rounded-sm" />
                </div>
              </div>

              {/* WhatsApp header */}
              <div className="bg-[#202C33] rounded-t-2xl px-3 py-2.5 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-[#00C896] flex items-center justify-center flex-shrink-0">
                  <span className="text-[#0A1628] font-black text-xs">K</span>
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">KRUX Compliance</p>
                  <p className="text-[#8696A0] text-[9px]">online</p>
                </div>
              </div>

              {/* Chat background */}
              <div className="bg-[#0B141A] min-h-48 px-2 py-3 rounded-b-2xl">
                {/* Message bubble */}
                <div className="ml-2 bg-[#202C33] rounded-lg rounded-tl-none p-3 max-w-[95%] relative">
                  {/* Tail */}
                  <div className="absolute -left-2 top-0 w-0 h-0 border-t-[8px] border-r-[8px] border-t-[#202C33] border-r-transparent" />
                  <pre className="whitespace-pre-wrap text-[9px] text-[#E9EDEF] leading-[1.5] font-mono break-words">
                    {brief.length > 600 ? brief.slice(0, 600) + '\n\n[Full brief at krux-xi.vercel.app/dashboard]' : brief}
                  </pre>
                  <div className="flex justify-end mt-1">
                    <span className="text-[8px] text-[#8696A0]">6:30 ✓✓</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="text-center text-[10px] text-[#334155] mt-4">
            Delivered automatically at 6:30am EAT every weekday · Configure number in Settings → Alerts
          </p>
        </div>
      )}

      {/* Footer context */}
      {!brief && (
        <div className="mt-6 flex items-start gap-3 px-1">
          <Bell size={12} className="text-[#334155] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#334155] leading-relaxed">
            This brief is automatically sent to your WhatsApp at 6:30am EAT every weekday when you have CRITICAL or URGENT shipments.
          </p>
        </div>
      )}
    </div>
  )
}
