import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    console.log('[DEMO_ANALYTICS]', JSON.stringify({ ...body, ip: req.headers.get('x-forwarded-for') }))
  } catch {}
  return NextResponse.json({ ok: true })
}
