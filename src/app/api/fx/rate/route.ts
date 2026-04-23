import { NextResponse } from 'next/server'
import { getKesRate } from '@/lib/fx'

export async function GET() {
  const rate = await getKesRate()
  return NextResponse.json({ usd_kes: rate }, {
    headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200' },
  })
}
