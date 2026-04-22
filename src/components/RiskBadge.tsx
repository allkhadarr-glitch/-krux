'use client'
import { RiskFlag, RemediationStatus } from '@/lib/types'

export function RiskBadge({ risk }: { risk: RiskFlag }) {
  const styles = {
    GREEN: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30',
    AMBER: 'text-amber-400 bg-amber-400/10 border border-amber-400/30',
    RED: 'text-red-400 bg-red-400/10 border border-red-400/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${styles[risk]}`}>
      {risk}
    </span>
  )
}

export function StatusBadge({ status }: { status: RemediationStatus }) {
  const styles: Record<RemediationStatus, string> = {
    OPEN: 'text-blue-400 bg-blue-400/10 border border-blue-400/30',
    'IN_PROGRESS': 'text-amber-400 bg-amber-400/10 border border-amber-400/30',
    CLOSED: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/30',
    ESCALATED: 'text-red-400 bg-red-400/10 border border-red-400/30',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide ${styles[status]}`}>
      {status}
    </span>
  )
}

export function RegulatorBadge({ body }: { body: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-bold tracking-wide bg-[#1E3A5F] text-[#00C896] border border-[#00C896]/30">
      {body}
    </span>
  )
}
