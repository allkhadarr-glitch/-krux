import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym1obHljanN2ZGR4Z2pka3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3MTA2NSwiZXhwIjoyMDkyMzQ3MDY1fQ.e-JEs9axZuP00tQn9UeNfMWT83JvLoxnpD3wUPJoDB8'
const PROJECT_REF  = 'bvbmhlycjsvddxgjdkqy'
const SUPABASE_URL = 'https://bvbmhlycjsvddxgjdkqy.supabase.co'

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260427000025_client_portfolio.sql'),
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

async function columnExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/shipments?select=client_name&limit=0`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  return res.status !== 400
}

async function tableExists() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/client_share_tokens?limit=0`, {
    headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` },
  })
  return res.status !== 404 && res.status !== 400
}

async function main() {
  console.log('KRUX — Applying migration 25: client_portfolio + whatsapp_number\n')

  const colExists   = await columnExists()
  const tableExists_ = await tableExists()

  if (colExists && tableExists_) {
    console.log('✓ client_name column + client_share_tokens table already exist — nothing to do.')
    return
  }

  console.log(`  client_name column: ${colExists ? '✓ exists' : '✗ missing'}`)
  console.log(`  client_share_tokens table: ${tableExists_ ? '✓ exists' : '✗ missing'}`)
  console.log()

  // Try Management API first
  console.log('Trying Management API...')
  const mgmtResult = await tryManagementAPI(sql)
  if (mgmtResult.ok) {
    console.log('✓ Migration applied via Management API.')
    const colOk   = await columnExists()
    const tableOk = await tableExists()
    console.log(`✓ client_name column: ${colOk ? 'confirmed' : 'NOT FOUND'}`)
    console.log(`✓ client_share_tokens: ${tableOk ? 'confirmed' : 'NOT FOUND'}`)
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
