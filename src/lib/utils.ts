import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { RiskFlag, RemediationStatus } from './types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatUSD(amount: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)
}

export function formatKES(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}

export function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function daysUntilDeadline(deadline: string) {
  const today = new Date()
  const deadlineDate = new Date(deadline)
  const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export function riskColor(risk: RiskFlag) {
  return {
    GREEN: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    AMBER: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    RED: 'text-red-400 bg-red-400/10 border-red-400/30',
  }[risk]
}

export function statusColor(status: RemediationStatus) {
  return {
    OPEN: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    'IN_PROGRESS': 'text-amber-400 bg-amber-400/10 border-amber-400/30',
    CLOSED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
    ESCALATED: 'text-red-400 bg-red-400/10 border-red-400/30',
  }[status]
}
