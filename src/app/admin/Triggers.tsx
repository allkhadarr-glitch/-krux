'use client'
import { useState } from 'react'
import { Loader2, Play, CheckCircle2 } from 'lucide-react'

const CRONS = [
  { label: 'Process Events',     path: '/api/events/process',            method: 'POST' },
  { label: 'Send Alerts',        path: '/api/alerts/send',               method: 'POST' },
  { label: 'Evaluate Actions',   path: '/api/actions/evaluate',          method: 'POST' },
  { label: 'Compliance Scores',  path: '/api/cron/compliance-scores',    method: 'GET'  },
  { label: 'Morning Brief',      path: '/api/ai/morning-briefing/send',  method: 'GET'  },
  { label: 'Weekly Digest',      path: '/api/analytics/weekly-digest',   method: 'GET'  },
  { label: 'Reset Demo',         path: '/api/demo/reset',                method: 'POST' },
]

export function AdminTriggers({ cronSecret }: { cronSecret: string }) {
  const [running, setRunning] = useState<string | null>(null)
  const [results, setResults] = useState<Record<string, string>>({})

  async function trigger(cron: typeof CRONS[0]) {
    setRunning(cron.label)
    try {
      const res = await fetch(cron.path, {
        method: cron.method,
        headers: { Authorization: `Bearer ${cronSecret}`, 'Content-Type': 'application/json' },
        body: cron.method === 'POST' ? JSON.stringify({ secret: cronSecret }) : undefined,
      })
      const data = await res.json().catch(() => ({}))
      setResults(p => ({ ...p, [cron.label]: res.ok ? `✓ ${JSON.stringify(data).slice(0, 80)}` : `✗ ${data.error ?? res.status}` }))
    } catch (e: any) {
      setResults(p => ({ ...p, [cron.label]: `✗ ${e.message}` }))
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-2">
      {CRONS.map(cron => (
        <div key={cron.label} className="flex items-center gap-3">
          <button
            onClick={() => trigger(cron)}
            disabled={!!running}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1E3A5F] text-[#94A3B8] text-xs font-medium hover:border-[#00C896]/40 hover:text-white disabled:opacity-40 transition-all w-44"
          >
            {running === cron.label
              ? <Loader2 size={11} className="animate-spin" />
              : results[cron.label]?.startsWith('✓')
                ? <CheckCircle2 size={11} className="text-[#00C896]" />
                : <Play size={11} />}
            {cron.label}
          </button>
          {results[cron.label] && (
            <span className={`text-xs font-mono ${results[cron.label].startsWith('✓') ? 'text-[#00C896]' : 'text-red-400'}`}>
              {results[cron.label]}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
