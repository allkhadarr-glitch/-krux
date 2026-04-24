'use client'
import { useState, useEffect, useRef } from 'react'
import { Shipment } from '@/lib/types'
import { formatUSD } from '@/lib/utils'
import { RiskBadge, RegulatorBadge } from '@/components/RiskBadge'
import {
  Bot, Send, FileText, ClipboardList, Wrench, Calculator,
  Search, Loader2, Sparkles, User, X,
} from 'lucide-react'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
  tool?: string
  loading?: boolean
}

const TOOLS = [
  { id: 'brief',       label: 'Compliance Brief',  icon: FileText,      route: '/api/ai/brief',       desc: '3-sentence summary' },
  { id: 'checklist',   label: 'Doc Checklist',     icon: ClipboardList, route: '/api/ai/checklist',   desc: 'Required documents' },
  { id: 'remediation', label: 'Remediation Steps', icon: Wrench,        route: '/api/ai/remediation', desc: '5 action steps' },
  { id: 'tax',         label: 'Tax & Landed Cost', icon: Calculator,    route: '/api/ai/tax',         desc: 'Full duty breakdown' },
] as const

const STARTERS = [
  'What documents does PPB require for pharmaceutical imports?',
  'How is import duty calculated on CIF value?',
  'What is the PVoC process and timeline?',
  'Which HS codes apply to food supplements?',
  'What are the KEBS Diamond Mark requirements?',
  'How long does port clearance take at Mombasa?',
]

export default function AIPage() {
  const [shipments, setShipments]   = useState<Shipment[]>([])
  const [loadingShips, setLoadingShips] = useState(true)
  const [selected, setSelected]     = useState<Shipment | null>(null)
  const [search, setSearch]         = useState('')
  const [messages, setMessages]     = useState<Message[]>([])
  const [input, setInput]           = useState('')
  const [thinking, setThinking]     = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    fetch('/api/shipments')
      .then(r => r.json())
      .then(d => setShipments(Array.isArray(d) ? d : []))
      .finally(() => setLoadingShips(false))
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const filtered = shipments.filter(s =>
    !search ||
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.reference_number ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (s.regulatory_body?.code ?? '').toLowerCase().includes(search.toLowerCase())
  )

  function shipmentContextString(s: Shipment) {
    return [
      `Shipment: ${s.name} (${s.reference_number ?? 'no ref'})`,
      `Regulator: ${s.regulatory_body?.code ?? 'N/A'} — ${s.regulatory_body?.name ?? ''}`,
      `CIF Value: USD ${s.cif_value_usd}`,
      `PVoC Deadline: ${s.pvoc_deadline ?? 'Not set'}`,
      `Risk Status: ${s.risk_flag_status}`,
      `HS Code: ${s.hs_code ?? 'Not specified'}`,
      `Origin Port: ${s.origin_port ?? 'Not specified'}`,
      `Remediation Status: ${s.remediation_status}`,
    ].join('\n')
  }

  async function runTool(tool: (typeof TOOLS)[number]) {
    if (!selected || thinking) return
    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `Generate ${tool.label} for ${selected.name}`,
      tool: tool.id,
    }
    const loadingMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', loading: true, tool: tool.id }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setThinking(true)

    try {
      const r = await fetch(tool.route, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selected),
      })
      const data = await r.json()
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id ? { ...m, content: data.result ?? data.error ?? 'No response', loading: false } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id ? { ...m, content: 'Request failed. Check your ANTHROPIC_API_KEY.', loading: false } : m
      ))
    } finally {
      setThinking(false)
    }
  }

  async function sendMessage(text?: string) {
    const msg = (text ?? input).trim()
    if (!msg || thinking) return
    setInput('')

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: msg }
    const loadingMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', loading: true }
    setMessages(prev => [...prev, userMsg, loadingMsg])
    setThinking(true)
    inputRef.current?.focus()

    const history = messages
      .filter(m => !m.loading && m.content)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }))

    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          shipmentContext: selected ? shipmentContextString(selected) : undefined,
          history,
        }),
      })
      const data = await r.json()
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id ? { ...m, content: data.result ?? data.error ?? 'No response', loading: false } : m
      ))
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === loadingMsg.id ? { ...m, content: 'Request failed. Check your ANTHROPIC_API_KEY.', loading: false } : m
      ))
    } finally {
      setThinking(false)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* ── Left: Shipment selector ─────────────────────────── */}
      <div className="w-72 flex-shrink-0 border-r border-[#1E3A5F] flex flex-col bg-[#0A1628]">
        <div className="p-4 border-b border-[#1E3A5F]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={14} className="text-[#00C896]" />
            <span className="text-xs font-bold text-white uppercase tracking-wide">Shipments</span>
            <span className="ml-auto text-[10px] text-[#334155]">{shipments.length}</span>
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#334155]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-[#0F2040] border border-[#1E3A5F] rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/40"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingShips ? (
            <div className="text-center py-8">
              <Loader2 size={16} className="animate-spin text-[#334155] mx-auto" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-xs text-[#64748B]">{search ? 'No matches' : 'No shipments yet'}</p>
              {!search && (
                <a href="/dashboard/operations" className="text-xs text-[#00C896] hover:underline mt-2 block">
                  + Add first shipment
                </a>
              )}
            </div>
          ) : (
            filtered.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s.id === selected?.id ? null : s)}
                className={`w-full text-left px-3 py-2.5 rounded-lg transition-all group ${
                  selected?.id === s.id
                    ? 'bg-[#00C896]/10 border border-[#00C896]/30'
                    : 'hover:bg-[#1E3A5F]/40 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-white truncate flex-1">{s.name}</span>
                  <RegulatorBadge body={s.regulatory_body?.code ?? '—'} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#64748B] truncate flex-1">
                    {s.reference_number} · {formatUSD(s.cif_value_usd)}
                  </span>
                  <RiskBadge risk={s.risk_flag_status} />
                </div>
              </button>
            ))
          )}
        </div>

        {selected && (
          <div className="p-3 border-t border-[#1E3A5F]">
            <div className="bg-[#0F2040] border border-[#1E3A5F] rounded-lg px-3 py-2 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00C896] flex-shrink-0" />
              <span className="text-xs text-white truncate flex-1">{selected.name}</span>
              <button onClick={() => setSelected(null)} className="text-[#334155] hover:text-white transition-colors">
                <X size={12} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: Chat ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-[#1E3A5F]">
          <div className="w-8 h-8 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center">
            <Bot size={16} className="text-[#00C896]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-white">KRUX AI</h1>
            <p className="text-xs text-[#64748B] truncate">
              {selected
                ? `Context: ${selected.name} · ${selected.regulatory_body?.code ?? '—'} · ${formatUSD(selected.cif_value_usd)}`
                : 'Kenya import compliance intelligence'}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-[#64748B] hover:text-white transition-colors flex-shrink-0"
            >
              Clear chat
            </button>
          )}
        </div>

        {/* Quick tool buttons */}
        {selected && (
          <div className="px-6 py-3 border-b border-[#1E3A5F] flex gap-2 overflow-x-auto bg-[#0A1628]">
            <span className="text-[10px] text-[#334155] self-center flex-shrink-0 mr-1">Quick tools:</span>
            {TOOLS.map(tool => {
              const Icon = tool.icon
              return (
                <button
                  key={tool.id}
                  onClick={() => runTool(tool)}
                  disabled={thinking}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs font-medium text-[#94A3B8] hover:text-white hover:border-[#00C896]/40 transition-all flex-shrink-0 disabled:opacity-40"
                >
                  <Icon size={12} className="text-[#00C896]" />
                  {tool.label}
                </button>
              )
            })}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto">
              <div className="w-14 h-14 rounded-2xl bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center mb-5">
                <Bot size={24} className="text-[#00C896]" />
              </div>
              <h2 className="text-white font-bold text-base mb-2">Kenya Import AI</h2>
              <p className="text-[#64748B] text-sm leading-relaxed mb-8">
                Ask anything about Kenya customs, KRA requirements, HS codes, duties, PVoC, and regulatory compliance.
                {!selected && ' Select a shipment on the left for instant analysis.'}
              </p>
              <div className="grid grid-cols-2 gap-2 w-full">
                {STARTERS.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    className="text-left px-3 py-2.5 bg-[#0F2040] border border-[#1E3A5F] rounded-lg text-xs text-[#94A3B8] hover:text-white hover:border-[#1E3A5F] transition-colors leading-relaxed"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 rounded-lg bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={13} className="text-[#00C896]" />
                  </div>
                )}
                <div className={`max-w-2xl rounded-xl px-4 py-3 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#1E3A5F] text-white'
                    : 'bg-[#0F2040] border border-[#1E3A5F] text-[#E2E8F0]'
                }`}>
                  {msg.loading ? (
                    <div className="flex items-center gap-2 text-[#64748B]">
                      <Loader2 size={13} className="animate-spin" />
                      <span className="text-xs">Generating…</span>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  )}
                </div>
                {msg.role === 'user' && (
                  <div className="w-7 h-7 rounded-lg bg-[#1E3A5F] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={13} className="text-[#94A3B8]" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-[#1E3A5F] bg-[#0A1628]">
          <div className="flex gap-3 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
              }}
              placeholder={
                selected
                  ? `Ask about ${selected.name}, or anything about Kenya compliance…`
                  : 'Ask anything about Kenya import compliance…'
              }
              rows={1}
              className="flex-1 bg-[#0F2040] border border-[#1E3A5F] rounded-xl px-4 py-3 text-sm text-white placeholder:text-[#334155] focus:outline-none focus:border-[#00C896]/40 resize-none"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              className="w-10 h-10 flex items-center justify-center bg-[#00C896] rounded-xl text-[#0A1628] hover:bg-[#00C896]/90 transition-colors disabled:opacity-40 flex-shrink-0"
            >
              {thinking ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="text-[10px] text-[#334155] mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
