import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null

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

  // Send invite email if Resend is configured
  if (resend) {
    await resend.emails.send({
      from:    'KRUX <noreply@kruxvon.com>',
      to:      body.email,
      subject: `You've been invited to KRUX`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2 style="color:#0a1628">Join your team on KRUX</h2>
          <p>${inviterEmail ?? 'Your team'} has invited you to join KRUX — Kenya's import compliance intelligence platform.</p>
          <p>Your role: <strong>${body.role ?? 'operations'}</strong></p>
          <a href="${acceptUrl}" style="display:inline-block;padding:12px 24px;background:#00C896;color:#0a1628;font-weight:bold;text-decoration:none;border-radius:8px;margin:16px 0">
            Accept Invite
          </a>
          <p style="color:#64748b;font-size:12px">Link expires in 7 days. If you didn't expect this, ignore this email.</p>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true, invite: { id: invite.id, email: invite.email, role: invite.role, token: invite.token }, acceptUrl })
}
