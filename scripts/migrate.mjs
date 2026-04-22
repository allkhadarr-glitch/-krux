#!/usr/bin/env node
// KRUXVON — Database Migration Runner
// Usage: node scripts/migrate.mjs

import { readFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SUPABASE_URL = 'https://bvbmhlycjsvddxgjdkqy.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym1obHljanN2ZGR4Z2pka3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3MTA2NSwiZXhwIjoyMDkyMzQ3MDY1fQ.e-JEs9axZuP00tQn9UeNfMWT83JvLoxnpD3wUPJoDB8'
const MIGRATIONS_DIR = join(__dirname, '../supabase/migrations')

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_KEY,
  'Authorization': `Bearer ${SERVICE_KEY}`,
  'Prefer': 'return=minimal',
}

// Split SQL into individual executable statements
function splitSQL(sql) {
  const statements = []
  let current = ''
  let inDollar = false
  let dollarTag = ''

  for (const line of sql.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--') || trimmed === '') continue

    current += line + '\n'

    // Track $$ dollar quoting used in PL/pgSQL functions
    const tags = line.match(/(\$[A-Za-z_]*\$)/g) || []
    for (const tag of tags) {
      if (!inDollar) { inDollar = true; dollarTag = tag }
      else if (tag === dollarTag) { inDollar = false; dollarTag = '' }
    }

    if (!inDollar && current.trim().endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 2) statements.push(stmt)
      current = ''
    }
  }
  return statements
}

// Execute a single SQL statement via Supabase REST
async function exec(sql) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/sql' },
      body: sql,
    })
    // Try RPC fallback
    if (res.status === 404 || res.status === 405) {
      return { ok: false, error: 'endpoint_unavailable' }
    }
    const text = await res.text()
    let data = {}
    try { data = JSON.parse(text) } catch {}
    return { ok: res.ok || res.status === 204, status: res.status, data, error: data?.message }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

// Check if a table exists (confirms schema ran successfully)
async function tableExists(table) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?limit=0`, { headers })
  return res.status !== 404 && res.status !== 400
}

async function main() {
  console.log('╔══════════════════════════════════════════╗')
  console.log('║   KRUXVON — Database Migration Runner    ║')
  console.log('╚══════════════════════════════════════════╝\n')

  // Get all migration files sorted by name
  const files = readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort()

  console.log(`📁 Found ${files.length} migration file(s):\n`)
  files.forEach(f => console.log(`   • ${f}`))
  console.log()

  // Check if tables already exist
  const alreadyRan = await tableExists('regulatory_bodies')
  if (alreadyRan) {
    console.log('✅ Tables already exist in Supabase.')
    console.log('   Run with --force to re-apply migrations.\n')

    if (!process.argv.includes('--force')) {
      console.log('Verifying key tables...')
      const tables = ['organizations', 'users', 'shipments', 'manufacturers',
        'manufacturer_licenses', 'factory_audits', 'purchase_orders',
        'product_certifications', 'clearing_agents', 'alerts']

      for (const t of tables) {
        const exists = await tableExists(t)
        console.log(`  ${exists ? '✅' : '❌'} ${t}`)
      }
      console.log('\n🎉 KRUXVON database is live and ready.')
      return
    }
  }

  // Run each migration file
  for (const file of files) {
    console.log(`\n▶ Running: ${file}`)
    const sql = readFileSync(join(MIGRATIONS_DIR, file), 'utf-8')
    const statements = splitSQL(sql)
    console.log(`  ${statements.length} statements found`)

    let ok = 0, skip = 0, fail = 0

    for (const stmt of statements) {
      const preview = stmt.replace(/\n/g, ' ').substring(0, 50)
      const result = await exec(stmt)

      if (result.ok) {
        ok++
      } else if (result.error?.includes('already exists') || result.error?.includes('duplicate')) {
        skip++
      } else if (result.error === 'endpoint_unavailable') {
        console.log('\n⚠️  Direct SQL execution not available via REST API.')
        console.log('   Please paste the schema manually in Supabase SQL Editor:')
        console.log(`   ${SUPABASE_URL.replace('https://', 'https://app.supabase.com/project/').replace('.supabase.co', '')}/sql/new\n`)
        console.log('   File to paste: supabase/migrations/' + file)
        return
      } else {
        fail++
        console.log(`  ❌ ${preview}`)
        console.log(`     Error: ${result.error}`)
      }
    }

    console.log(`  ✅ ${ok} ok  ⏭️  ${skip} skipped  ❌ ${fail} failed`)
  }

  console.log('\n' + '═'.repeat(50))
  console.log('Verifying tables...\n')

  const tables = ['organizations', 'users', 'regulatory_bodies', 'shipments',
    'manufacturers', 'manufacturer_licenses', 'factory_audits', 'audit_agencies',
    'purchase_orders', 'product_certifications', 'clearing_agents', 'alerts',
    'hs_codes', 'forex_rates', 'port_alerts', 'ai_cache']

  let allGood = true
  for (const t of tables) {
    const exists = await tableExists(t)
    console.log(`  ${exists ? '✅' : '❌'} ${t}`)
    if (!exists) allGood = false
  }

  console.log()
  if (allGood) {
    console.log('🎉 KRUXVON database fully deployed and verified!')
  } else {
    console.log('⚠️  Some tables missing — paste schema manually in SQL Editor.')
    console.log(`   URL: https://supabase.com/dashboard/project/bvbmhlycjsvddxgjdkqy/sql/new`)
  }
}

main().catch(console.error)
