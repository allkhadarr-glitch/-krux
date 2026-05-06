import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const to = searchParams.get('to')

  if (!to) return NextResponse.json({ error: 'Pass ?to=email@example.com' }, { status: 400 })
  if (!process.env.RESEND_API_KEY) return NextResponse.json({ error: 'RESEND_API_KEY not set' }, { status: 500 })

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const result = await resend.emails.send({
    from: 'KRUX <noreply@kruxvon.com>',
    to,
    subject: 'KRUX email test',
    html: '<p>Email delivery working.</p>',
  })

  return NextResponse.json({
    data:  result.data  ?? null,
    error: result.error ?? null,
  })
}
