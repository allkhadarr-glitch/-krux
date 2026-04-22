import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { emitDeadlineEvents, processEvent } from '@/lib/event-engine'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const BATCH_SIZE = 20

async function run() {
  // 1. Emit any new deadline events before processing
  const emitted = await emitDeadlineEvents(supabaseAdmin)

  // 2. Fetch unprocessed events oldest-first, bounded batch
  const { data: events, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .is('processed_at', null)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (error) return { error: error.message }

  const processed: string[] = []
  const failed:    string[] = []

  for (const event of events ?? []) {
    try {
      await processEvent(event, supabaseAdmin)
      processed.push(event.id)
    } catch {
      failed.push(event.id)
    }
  }

  return {
    ok: true,
    deadline_events_emitted: emitted,
    events_processed: processed.length,
    events_failed:    failed.length,
    remaining:        (events?.length ?? 0) === BATCH_SIZE ? 'more' : 'none',
  }
}

// ─── GET — Vercel Cron (every 15 min) ────────────────────────

export async function GET(req: NextRequest) {
  const auth   = req.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await run()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}

// ─── POST — manual trigger from dashboard ────────────────────

export async function POST() {
  const result = await run()
  if ('error' in result) return NextResponse.json(result, { status: 500 })
  return NextResponse.json(result)
}
