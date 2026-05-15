#!/usr/bin/env node
// Run pending migrations against live Supabase via direct pg connection
// Usage: node scripts/run-migrations-pg.mjs <DATABASE_URL>
// Get DATABASE_URL from: Supabase Dashboard → Settings → Database → Connection string (Direct) → URI

import pg from 'pg'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dir = dirname(fileURLToPath(import.meta.url))

const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('\nUsage: node scripts/run-migrations-pg.mjs <DATABASE_URL>')
  console.error('\nGet it from:')
  console.error('  Supabase Dashboard → Settings → Database → "Connection string" tab → "URI"')
  console.error('  Looks like: postgresql://postgres:PASSWORD@db.bvbmhlycjsvddxgjdkqy.supabase.co:5432/postgres\n')
  process.exit(1)
}

const migrations = [
  {
    label: 'Migration 34 — ISO origin_country backfill',
    path: join(__dir, '../supabase/migrations/20260507000034_iso_origin_backfill.sql'),
  },
  {
    label: 'Migration 35 — waitlist lead_tier + lead_context columns',
    path: join(__dir, '../supabase/migrations/20260507000035_waitlist_lead_context.sql'),
  },
]

const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } })

try {
  console.log('\nConnecting to Supabase...')
  await client.connect()
  console.log('Connected.\n')

  for (const m of migrations) {
    const sql = readFileSync(m.path, 'utf8')
    console.log(`▶  ${m.label}`)
    const res = await client.query(sql)
    const affected = Array.isArray(res)
      ? res.reduce((sum, r) => sum + (r.rowCount ?? 0), 0)
      : (res.rowCount ?? 0)
    console.log(`   ✓ ${affected} row(s) affected\n`)
  }

  console.log('All migrations done.')
} catch (err) {
  console.error('\nFailed:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
