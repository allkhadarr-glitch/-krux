import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, { tier: string; limit: number }> = {
  starter:      { tier: 'starter',      limit: 5 },
  standard:     { tier: 'standard',     limit: 9999 },
  professional: { tier: 'professional', limit: 9999 },
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  // Paystack sends both 'reference' and 'trxref' in the callback
  const reference = searchParams.get('reference') ?? searchParams.get('trxref') ?? ''
  const plan      = searchParams.get('plan') ?? ''
  const orgId     = searchParams.get('org_id') ?? ''
  const baseUrl   = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

  if (!reference || !orgId) {
    return NextResponse.redirect(`${baseUrl}/dashboard/billing?cancelled=1`)
  }

  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } }
  )
  const data = await res.json()

  if (!data.status || data.data?.status !== 'success') {
    return NextResponse.redirect(`${baseUrl}/dashboard/billing?cancelled=1`)
  }

  const txData              = data.data
  const { tier, limit }     = PLAN_LIMITS[plan] ?? { tier: 'starter', limit: 5 }
  const subscriptionCode    = txData.subscription?.subscription_code ?? null
  const emailToken          = txData.subscription?.email_token ?? null
  const customerCode        = txData.customer?.customer_code ?? null
  const nextPaymentDate     = txData.subscription?.next_payment_date ?? null

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

  return NextResponse.redirect(`${baseUrl}/dashboard/billing?success=1`)
}
