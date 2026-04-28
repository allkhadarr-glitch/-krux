import { Shipment } from './types'

export type AlertLevel = 'CRITICAL' | 'URGENT' | 'WARNING'

export interface DeadlineAlert {
  shipmentId: string
  shipmentName: string
  regulatorCode: string
  daysRemaining: number
  level: AlertLevel
  storageDailyCostKES: number
  estimatedAdditionalCostKES: number
  action: string
  pvocDeadline: string
}

function getAction(regulatorCode: string, daysRemaining: number): string {
  const actions: Record<string, string> = {
    PPB:    'Submit PPB application form + CoA + product samples to PPB office',
    KEBS:   'File KEBS pre-export verification request and attach test reports',
    PCPB:   'Submit PCPB pesticide registration documents and efficacy data',
    KEPHIS: 'File KEPHIS phytosanitary certificate request with origin country',
    'WHO-GMP': 'Confirm WHO-GMP certificate validity and submit to PPB for verification',
    EPRA:   'Submit EPRA energy audit report and product compliance certificate',
    KRA:    'File IDF via KRA iCMS portal and confirm HS code classification',
    NEMA:   'Submit NEMA environmental impact assessment and importation permit',
  }
  const base = actions[regulatorCode] ?? 'Contact regulator to confirm submission requirements'
  if (daysRemaining <= 3) return `CRITICAL — ${base} TODAY`
  if (daysRemaining <= 7) return `URGENT — ${base} within ${daysRemaining} days`
  return `WARNING — ${base} within ${daysRemaining} days`
}

export function computeAlerts(shipments: Shipment[], kesRate = 130): DeadlineAlert[] {
  const alerts: DeadlineAlert[] = []

  for (const s of shipments) {
    if (!s.pvoc_deadline || s.remediation_status === 'CLOSED') continue

    const deadline = new Date(s.pvoc_deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (daysRemaining > 14 || daysRemaining < 0) continue

    const level: AlertLevel = daysRemaining <= 3 ? 'CRITICAL' : daysRemaining <= 7 ? 'URGENT' : 'WARNING'
    const dailyUSD = s.storage_rate_per_day ?? 0
    const dailyKES = Math.round(dailyUSD * kesRate)
    const missedDays = Math.max(daysRemaining <= 0 ? Math.abs(daysRemaining) : 7, 7)
    const estimatedAdditionalCostKES = Math.round(dailyKES * missedDays)
    const regCode = s.regulatory_body?.code ?? s.regulatory_body_id ?? '—'

    alerts.push({
      shipmentId: s.id,
      shipmentName: s.name,
      regulatorCode: regCode,
      daysRemaining,
      level,
      storageDailyCostKES: dailyKES,
      estimatedAdditionalCostKES,
      action: getAction(regCode, daysRemaining),
      pvocDeadline: s.pvoc_deadline,
    })
  }

  return alerts.sort((a, b) => a.daysRemaining - b.daysRemaining)
}
