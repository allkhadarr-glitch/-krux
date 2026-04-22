const { Client } = require('pg')
const fs = require('fs')
const path = require('path')

require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

const dbUrl = process.env.SUPABASE_DB_URL
if (!dbUrl) {
  console.error('Missing SUPABASE_DB_URL in .env.local')
  console.error('Get it from: Supabase Dashboard → Settings → Database → Connection String (URI)')
  process.exit(1)
}

async function run() {
  const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('Connected to Supabase DB')

  const sql = fs.readFileSync(
    path.join(__dirname, '../supabase/migrations/20260421000010_portal_monitoring.sql'),
    'utf8'
  )

  await client.query(sql)
  console.log('Migration applied successfully')
  await client.end()
}

run().catch((e) => { console.error(e.message); process.exit(1) })
