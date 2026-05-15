import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createHmac } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, { tier: string; limit: number }> = {
  starter:      { tier: 'starter',      limit: 5 },
  standard:     { tier: 'standard',     limit: 9999 },
  professional: { tier: 'professional', limit: 9999 },
}

export async function POST(req: NextRequest) {
  // Must read raw body for HMAC verification before parsing
  const rawBody   = await req.text()
  const signature = req.headers.get('x-paystack-signature') ?? ''
  const expected  = createHmac('sha512', process.env.PAYSTACK_SECRET_KEY ?? '')
    .update(rawBody)
    .digest('hex')

  if (!signature || signature !== expected) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'charge.success') {
    const meta             = event.data?.metadata ?? {}
    const orgId            = meta.org_id as string | undefined
    const plan             = meta.plan as string | undefined
    const subscriptionCode = event.data?.subscription?.subscription_code as string | null ?? null
    const emailToken       = event.data?.subscription?.email_token as string | null ?? null
    const customerCode     = event.data?.customer?.customer_code as string | null ?? null
    const nextPaymentDate  = event.data?.subscription?.next_payment_date as string | null ?? null

    if (orgId && plan) {
      // First payment — we have metadata
      const { tier, limit } = PLAN_LIMITS[plan] ?? { tier: 'starter', limit: 5 }
      await supabase.from('organizations').update({
        subscription_tier:       tier,
        subscription_status:     'active',
        monthly_shipment_limit:  limit,
        pst_subscription_code:   subscriptionCode,
        pst_customer_code:       customerCode,
        pst_email_token:         emailToken,
        subscription_expires_at: nextPaymentDate,
        updated_at:              new Date().toISOString(),
      }).eq('id', orgId)
    } else if (subscriptionCode) {
      // Renewal charge — no metadata, look up by subscription code
      await supabase.from('organizations').update({
        subscription_status:     'active',
        subscription_expires_at: nextPaymentDate,
        updated_at:              new Date().toISOString(),
      }).eq('pst_subscription_code', subscriptionCode)
    }
  }

  // Subscription disabled or not renewing — downgrade to trial
  if (event.event === 'subscription.disable' || event.event === 'subscription.not_renew') {
    const subscriptionCode = event.data?.subscription_code ?? event.data?.code
    if (!subscriptionCode) return NextResponse.json({ ok: true })

    await supabase.from('organizations').update({
      subscription_tier:      'trial',
      subscription_status:    'cancelled',
      monthly_shipment_limit: 5,
      pst_subscription_code:  null,
      pst_email_token:        null,
      updated_at:             new Date().toISOString(),
    }).eq('pst_subscription_code', subscriptionCode)
  }

  return NextResponse.json({ ok: true })
}
