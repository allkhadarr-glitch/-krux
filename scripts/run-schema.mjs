// KRUXVON — Run full schema against Supabase via Management API
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2Ym1obHljanN2ZGR4Z2pka3F5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc3MTA2NSwiZXhwIjoyMDkyMzQ3MDY1fQ.e-JEs9axZuP00tQn9UeNfMWT83JvLoxnpD3wUPJoDB8'
const SUPABASE_URL = 'https://bvbmhlycjsvddxgjdkqy.supabase.co'
const PROJECT_REF = 'bvbmhlycjsvddxgjdkqy'

const schemaPath = join(__dirname, '../supabase/schema.sql')
const schema = readFileSync(schemaPath, 'utf-8')

// Split into individual statements (handle multi-line)
function splitStatements(sql) {
  const statements = []
  let current = ''
  let inDollarQuote = false
  let dollarTag = ''

  const lines = sql.split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('--')) { continue } // skip comments

    current += line + '\n'

    // Track $$ dollar quoting (used in functions)
    const dollarMatches = line.match(/\$\$|\$[A-Za-z_][A-Za-z0-9_]*\$/g)
    if (dollarMatches) {
      for (const match of dollarMatches) {
        if (!inDollarQuote) { inDollarQuote = true; dollarTag = match }
        else if (match === dollarTag) { inDollarQuote = false; dollarTag = '' }
      }
    }

    if (!inDollarQuote && current.trim().endsWith(';')) {
      const stmt = current.trim()
      if (stmt.length > 1) statements.push(stmt)
      current = ''
    }
  }
  return statements
}

async function runSQL(sql) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ sql })
  })
  return res
}

// Use Supabase's pg connection via the query endpoint
async function runSQLDirect(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query: sql })
  })
  const data = await res.json()
  return { ok: res.ok, status: res.status, data }
}

async function main() {
  console.log('🚀 KRUXVON — Running schema against Supabase...\n')

  const statements = splitStatements(schema)
  console.log(`📋 Found ${statements.length} SQL statements to execute\n`)

  let success = 0
  let skipped = 0
  let errors = []

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i]
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ').trim()

    const result = await runSQLDirect(stmt)

    if (result.ok) {
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`)
      success++
    } else {
      const errMsg = result.data?.message || result.data?.error || JSON.stringify(result.data)
      // Skip "already exists" errors gracefully
      if (errMsg.includes('already exists') || errMsg.includes('duplicate')) {
        console.log(`⏭️  [${i + 1}/${statements.length}] SKIP (exists): ${preview}...`)
        skipped++
      } else {
        console.log(`❌ [${i + 1}/${statements.length}] ERROR: ${errMsg}`)
        errors.push({ statement: preview, error: errMsg })
      }
    }
  }

  console.log('\n' + '═'.repeat(60))
  console.log(`✅ Success: ${success}`)
  console.log(`⏭️  Skipped: ${skipped}`)
  console.log(`❌ Errors:  ${errors.length}`)

  if (errors.length > 0) {
    console.log('\nErrors:')
    errors.forEach(e => console.log(`  • ${e.statement}: ${e.error}`))
  } else {
    console.log('\n🎉 KRUXVON database schema deployed successfully!')
  }
}

main().catch(console.error)
