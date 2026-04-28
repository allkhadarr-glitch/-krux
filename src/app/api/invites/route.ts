import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

async function sendWhatsApp(to: string, body: string) {
  const sid   = process.env.TWILIO_ACCOUNT_SID
  const token = process.env.TWILIO_AUTH_TOKEN
  const from  = process.env.TWILIO_WHATSAPP_FROM ?? 'whatsapp:+14155238886'
  if (!sid || !token) return
  const phone = to.replace(/\s+/g, '')
  const whatsappTo = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`
  await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ From: from, To: whatsappTo, Body: body }).toString(),
  }).catch(() => {})
}

export async function POST(req: NextRequest) {
  const { orgId, userId, email: inviterEmail } = await getSessionContext(req)
  const body = await req.json()

  if (!body.email) return NextResponse.json({ error: 'Email required' }, { status: 400 })

  // Create invite record
  const { data: invite, error } = await supabase
    .from('org_invites')
    .insert({
      organization_id: orgId,
      email:           body.email.toLowerCase().trim(),
      role:            body.role ?? 'operations',
      invited_by:      userId,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-git-master-krux1.vercel.app'
  const acceptUrl = `${baseUrl}/invite/${invite.token}`
  const ROLE_MAP: Record<string, string> = { admin: 'Admin', operations: 'Operations', finance: 'Finance', field: 'Field Agent' }
  const roleLabel = ROLE_MAP[body.role ?? 'operations'] ?? 'Operations'

  // Send invite email if Resend is configured
  if (resend) {
    await resend.emails.send({
      from:    'KRUX <noreply@krux.co.ke>',
      to:      body.email,
      subject: `You've been invited to KRUX`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0a1628">Join your team on KRUX</h2>
          <p>${inviterEmail ?? 'Your team'} has invited you to join KRUX — Kenya's import compliance intelligence platform.</p>
          <p>Your role: <strong>${roleLabel}</strong></p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#00C896;color:#0a1628;font-weight:bold;text-decoration:none;border-radius:8px;margin:16px 0">
            Accept Invite
          </a>
          <p style="color:#64748b;font-size:12px">Link expires in 7 days. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    }).catch(() => {})
  }

  // Send WhatsApp invite if phone provided and Twilio configured
  if (body.phone) {
    await sendWhatsApp(
      body.phone,
      `Hi! ${inviterEmail ?? 'Your team'} has invited you to KRUX — Kenya's import compliance platform.\n\nYour role: ${roleLabel}\n\nAccept your invite:\n${acceptUrl}\n\n(Link expires in 7 days)`,
    )
  }

  return NextResponse.json({ ok: true, invite: { id: invite.id, email: invite.email, role: invite.role, token: invite.token }, acceptUrl })
}
