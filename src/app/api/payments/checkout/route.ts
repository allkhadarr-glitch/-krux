import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' as any })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const PRICES: Record<string, string> = {
  basic:      process.env.STRIPE_PRICE_BASIC!,
  pro:        process.env.STRIPE_PRICE_PRO!,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE!,
}

export async function POST(req: NextRequest) {
  const { orgId, userId } = await getSessionContext(req)

  const { plan } = await req.json()
  const priceId = PRICES[plan]
  if (!priceId) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })

  const { data: org } = await supabase
    .from('organizations')
    .select('name, email, stripe_customer_id')
    .eq('id', orgId)
    .single()

  if (!org) return NextResponse.json({ error: 'Org not found' }, { status: 404 })

  let customerId = org.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.email ?? undefined,
      name:  org.name,
      metadata: { org_id: orgId, user_id: userId },
    })
    customerId = customer.id
    await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', orgId)
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux.vercel.app'

  const session = await stripe.checkout.sessions.create({
    customer:            customerId,
    mode:                'subscription',
    payment_method_types: ['card'],
    line_items:          [{ price: priceId, quantity: 1 }],
    success_url:         `${baseUrl}/dashboard/billing?success=1`,
    cancel_url:          `${baseUrl}/dashboard/billing?cancelled=1`,
    metadata:            { org_id: orgId, plan },
    subscription_data:   { metadata: { org_id: orgId, plan } },
  })

  return NextResponse.json({ url: session.url })
}
