import { NextRequest, NextResponse } from 'next/server'
import { getRegulator, getWindowStatus } from '@/lib/regulatory-intelligence'
import { getKesRate } from '@/lib/fx'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const regCode = searchParams.get('regulator')?.toUpperCase()
  const eta     = searchParams.get('eta')

  if (!regCode || !eta) {
    return NextResponse.json({ error: 'regulator and eta required' }, { status: 400 })
  }

  const regProfile = getRegulator('KE', regCode)
  if (!regProfile) {
    return NextResponse.json({ error: 'Unknown regulator' }, { status: 400 })
  }

  const ws = getWindowStatus({ pvoc_deadline: null, eta }, regProfile)
  if (!ws) {
    return NextResponse.json({ error: 'Could not calculate window' }, { status: 400 })
  }

  const kesRate   = await getKesRate()
  const kesExposure = ws.status === 'IMPOSSIBLE'
    ? Math.round(50 * Math.max(14, ws.daysShort) * kesRate)
    : 0

  return NextResponse.json({
    status:        ws.status,
    regulator:     regCode,
    regulator_name: regProfile.full_name,
    sla_days:      ws.slaRequired,
    days_remaining: ws.daysRemaining,
    days_short:    ws.daysShort,
    buffer_days:   ws.status === 'OK' ? ws.daysRemaining - ws.slaRequired : 0,
    kes_exposure:  kesExposure,
    message:
      ws.status === 'IMPOSSIBLE'
        ? `${regCode} needs ${ws.slaRequired}d — you have ${ws.daysRemaining}. This window is already closed.`
        : ws.status === 'TIGHT'
          ? `${regCode} needs ${ws.slaRequired}d — you have ${ws.daysRemaining}. Only ${ws.daysShort}d buffer. Act immediately.`
          : `Window is open. ${ws.daysRemaining - ws.slaRequired}d buffer remaining.`,
  })
}
