import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Amount in smallest currency unit (cents for USD: $99 = 9900)
const PLANS: Record<string, { planCode: string; amount: number }> = {
  starter:      { planCode: process.env.PAYSTACK_PLAN_STARTER ?? '',      amount: 9900 },
  standard:     { planCode: process.env.PAYSTACK_PLAN_STANDARD ?? '',     amount: 29900 },
  professional: { planCode: process.env.PAYSTACK_PLAN_PROFESSIONAL ?? '', amount: 59900 },
}

export async function POST(req: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const { orgId, userId } = await getSessionContext(req)
  const { plan } = await req.json()

  const cfg = PLANS[plan]
  if (!cfg?.planCode) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const { data: org } = await supabase
    .from('organizations')
    .select('name, email')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  const reference = `krux-${orgId}-${Date.now()}`
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization:  `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email:        org.email ?? '',
      amount:       cfg.amount,
      currency:     'USD',
      reference,
      callback_url: `${baseUrl}/api/payments/verify?plan=${plan}&org_id=${orgId}`,
      plan:         cfg.planCode,
      metadata: {
        org_id:  orgId,
        plan,
        user_id: userId,
      },
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.status) {
    return NextResponse.json({ error: data.message ?? 'Payment init failed' }, { status: 500 })
  }

  return NextResponse.json({ url: data.data.authorization_url })
}
