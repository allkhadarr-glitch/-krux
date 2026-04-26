import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSessionContext } from '@/lib/session'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    await getSessionContext(req) // ensures user is authenticated

    const { brief_text, shipment_name, regulator } = await req.json()
    if (!brief_text || !shipment_name) {
      return NextResponse.json({ error: 'brief_text and shipment_name required' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shared_briefs')
      .insert({ brief_text, shipment_name, regulator: regulator ?? '' })
      .select('token')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://krux-xi.vercel.app'
    return NextResponse.json({ token: data.token, url: `${appUrl}/brief/${data.token}` })
  } catch {
    return NextResponse.json({ error: 'Failed to create share link' }, { status: 500 })
  }
}
