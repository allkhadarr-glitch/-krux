import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym1obHljanN2ZGR4Z2pka3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3MTA2NSwiZXhwIjoyMDkyMzQ3MDY1fQ.e-JEs9axZuP00tQn9UeNfMWT83JvLoxnpD3wUPJoDB8'
const PROJECT_REF  = 'bvbmhlycjsvddxgjdkqy'
const SUPABASE_URL = 'https://bvbmhlycjsvddxgjdkqy.supabase.co'

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260426000023_shared_briefs.sql'),
  'utf-8'
)

async function tryManagementAPI(query) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ query }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function tryRPC(query) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
    body: JSON.stringify({ sql: query }),
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

async function tableExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shared_briefs?limit=0`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  return res.status !== 404 && res.status !== 400
}

async function main() {
  console.log('KRUX — Applying migration 23: shared_briefs\n')

  // Check if already applied
  const exists = await tableExists()
  if (exists) {
    console.log('✓ shared_briefs table already exists — nothing to do.')
    return
  }

  // Try Management API first
  console.log('Trying Management API...')
  const mgmtResult = await tryManagementAPI(sql)
  if (mgmtResult.ok) {
    console.log('✓ Migration applied via Management API.')
    console.log('✓ Verifying table exists...')
    const verified = await tableExists()
    console.log(verified ? '✓ shared_briefs table confirmed.' : '✗ Table not found — may need manual apply.')
    return
  }

  console.log(`  Management API returned ${mgmtResult.status}: ${JSON.stringify(mgmtResult.data)}`)

  // Try exec_sql RPC fallback
  console.log('Trying exec_sql RPC...')
  const rpcResult = await tryRPC(sql)
  if (rpcResult.ok) {
    console.log('✓ Migration applied via RPC.')
    return
  }

  console.log(`  RPC returned ${rpcResult.status}: ${JSON.stringify(rpcResult.data)}`)
  console.log('\n— Remote execution unavailable. Paste this in Supabase SQL Editor:')
  console.log(`  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`)
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
}

main().catch(console.error)
