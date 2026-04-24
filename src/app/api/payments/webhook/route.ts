import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PLAN_LIMITS: Record<string, { tier: string; limit: number }> = {
  basic:      { tier: 'basic',      limit: 25 },
  pro:        { tier: 'pro',        limit: 100 },
  enterprise: { tier: 'enterprise', limit: 9999 },
}

async function updateOrg(orgId: string, plan: string, subId: string, priceId: string, expiresAt: Date | null) {
  const { tier, limit } = PLAN_LIMITS[plan] ?? { tier: 'basic', limit: 25 }
  await supabase.from('organizations').update({
    subscription_tier:       tier,
    subscription_status:     'active',
    stripe_subscription_id:  subId,
    stripe_price_id:         priceId,
    subscription_expires_at: expiresAt?.toISOString() ?? null,
    monthly_shipment_limit:  limit,
    updated_at:              new Date().toISOString(),
  }).eq('id', orgId)
}

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as any
      const orgId   = session.metadata?.org_id
      const plan    = session.metadata?.plan ?? 'basic'
      if (!orgId || !session.subscription) break

      const sub = await stripe.subscriptions.retrieve(session.subscription as string) as any
      const exp = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
      await updateOrg(orgId, plan, sub.id, sub.items?.data?.[0]?.price?.id ?? '', exp)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as any
      if (!invoice.subscription) break
      const sub   = await stripe.subscriptions.retrieve(invoice.subscription as string) as any
      const orgId = sub.metadata?.org_id
      const plan  = sub.metadata?.plan ?? 'basic'
      if (!orgId) break
      const exp = sub.current_period_end ? new Date(sub.current_period_end * 1000) : null
      await updateOrg(orgId, plan, sub.id, sub.items?.data?.[0]?.price?.id ?? '', exp)
      break
    }

    case 'customer.subscription.deleted': {
      const sub   = event.data.object as any
      const orgId = sub.metadata?.org_id
      if (!orgId) break
      await supabase.from('organizations').update({
        subscription_tier:    'trial',
        subscription_status:  'cancelled',
        monthly_shipment_limit: 5,
        updated_at: new Date().toISOString(),
      }).eq('id', orgId)
      break
    }
  }

  return NextResponse.json({ ok: true })
}
