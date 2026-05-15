import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    return NextResponse.json({ error: 'Billing not configured' }, { status: 503 })
  }

  const { orgId } = await getSessionContext(req)

  const { data: org } = await supabase
    .from('organizations')
    .select('pst_subscription_code, pst_email_token')
    .eq('id', orgId)
    .single()

  if (!org?.pst_subscription_code) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 404 })
  }

  if (!org.pst_email_token) {
    return NextResponse.json({ error: 'Contact support to cancel: hq@kruxvon.com' }, { status: 422 })
  }

  const res = await fetch('https://api.paystack.co/subscription/disable', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      code:  org.pst_subscription_code,
      token: org.pst_email_token,
    }),
  })

  const data = await res.json()
  if (!res.ok || !data.status) {
    return NextResponse.json({ error: data.message ?? 'Cancel failed' }, { status: 500 })
  }

  await supabase.from('organizations').update({
    subscription_tier:      'trial',
    subscription_status:    'cancelled',
    monthly_shipment_limit: 5,
    pst_subscription_code:  null,
    pst_email_token:        null,
    updated_at:             new Date().toISOString(),
  }).eq('id', orgId)

  return NextResponse.json({ ok: true })
}
