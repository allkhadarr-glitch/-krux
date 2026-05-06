import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym1obHljanN2ZGR4Z2pka3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3MTA2NSwiZXhwIjoyMDkyMzQ3MDY1fQ.e-JEs9axZuP00tQn9UeNfMWT83JvLoxnpD3wUPJoDB8'
const PROJECT_REF  = 'bvbmhlycjsvddxgjdkqy'
const SUPABASE_URL = 'https://bvbmhlycjsvddxgjdkqy.supabase.co'

const sql = readFileSync(
  join(__dirname, '../supabase/migrations/20260429000029_fix_client_share_token_encoding.sql'),
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

async function main() {
  console.log('KRUX — Applying migration 29: fix client_share_tokens base64url encoding\n')

  console.log('Trying Management API...')
  const result = await tryManagementAPI(sql)
  if (result.ok) {
    console.log('✓ Migration applied — client_share_tokens DEFAULT is now hex.')
    return
  }

  console.log(`  Management API returned ${result.status}: ${JSON.stringify(result.data)}`)
  console.log('\n— Remote execution unavailable. Run this in the Supabase SQL Editor:')
  console.log(`  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new\n`)
  console.log('─'.repeat(60))
  console.log(sql)
  console.log('─'.repeat(60))
}

main().catch(console.error)
