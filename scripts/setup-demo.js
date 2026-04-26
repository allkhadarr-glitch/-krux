/**
 * One-time setup script for the demo user.
 * Run once: node scripts/setup-demo.js
 *
 * What it does:
 *  1. Creates demo@kruxvon.com in Supabase Auth
 *  2. Creates an organization "KRUXVON Demo"
 *  3. Creates a user_profile linking the user to the org
 *  4. Calls /api/seed-demo to populate demo data
 *  5. Pushes DEMO_USER_EMAIL + DEMO_USER_PASSWORD to Vercel env
 *
 * Requirements: SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
 *               DEMO_USER_EMAIL, DEMO_USER_PASSWORD in .env.local
 */

const { createClient } = require('@supabase/supabase-js')
const { execSync }     = require('child_process')
const fs               = require('fs')
const path             = require('path')

// ── Load .env.local ───────────────────────────────────────────
function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const lines   = fs.readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && !key.startsWith('#') && rest.length) {
      process.env[key.trim()] = rest.join('=').trim()
    }
  }
}

loadEnv()

const supabaseUrl     = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
const demoEmail       = process.env.DEMO_USER_EMAIL
const demoPassword    = process.env.DEMO_USER_PASSWORD
const appUrl          = process.env.NEXT_PUBLIC_APP_URL
const vercelToken     = process.env.VERCEL_TOKEN

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!demoEmail || !demoPassword) {
  console.error('Missing DEMO_USER_EMAIL or DEMO_USER_PASSWORD in .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function run() {
  console.log(`\nSetting up demo user: ${demoEmail}\n`)

  // ── 1. Create auth user ───────────────────────────────────
  const { data: listData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  const existingUser = listData?.users?.find((u) => u.email === demoEmail)
  let userId = existingUser?.id

  if (userId) {
    console.log(`✓ Auth user already exists (${userId})`)
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: demoEmail,
      password: demoPassword,
      email_confirm: true,
    })
    if (error) { console.error('Auth user creation failed:', error.message); process.exit(1) }
    userId = created.user.id
    console.log(`✓ Auth user created (${userId})`)
  }

  // ── 2. Check for existing profile ────────────────────────
  const { data: existingProfile } = await supabase
    .from('user_profiles')
    .select('organization_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (existingProfile?.organization_id) {
    console.log(`✓ User profile already exists (org: ${existingProfile.organization_id})`)
    console.log('\nDemo user already set up. To reseed, call POST /api/demo/reset with your CRON_SECRET.')
    return
  }

  // ── 3. Create organization ────────────────────────────────
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .insert({ name: 'KRUXVON Demo', plan: 'pro', is_active: true })
    .select('id')
    .single()

  if (orgErr) { console.error('Org creation failed:', orgErr.message); process.exit(1) }
  const orgId = org.id
  console.log(`✓ Organization created (${orgId})`)

  // ── 4. Create user profile ────────────────────────────────
  const { error: profileErr } = await supabase
    .from('user_profiles')
    .insert({ user_id: userId, organization_id: orgId, role: 'admin', full_name: 'Demo User' })

  if (profileErr) { console.error('Profile creation failed:', profileErr.message); process.exit(1) }
  console.log('✓ User profile created')

  // ── 5. Seed demo data ─────────────────────────────────────
  if (appUrl) {
    console.log('Seeding demo data...')
    const cronSecret = process.env.CRON_SECRET ?? ''
    const res  = await fetch(`${appUrl}/api/seed-demo`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'x-demo-org-id': orgId,
        'x-cron-secret': cronSecret,
      },
    })
    const data = await res.json()
    if (!res.ok) {
      console.warn('Seed failed:', data.error ?? JSON.stringify(data))
    } else {
      console.log(`✓ Demo data seeded: ${JSON.stringify(data.created)}`)
    }
  } else {
    console.log('⚠ NEXT_PUBLIC_APP_URL not set — skipping remote seed. Run manually:')
    console.log(`  curl -X POST ${supabaseUrl}/api/seed-demo -H "x-demo-org-id: ${orgId}"`)
  }

  // ── 6. Push env vars to Vercel ────────────────────────────
  if (vercelToken) {
    console.log('\nPushing DEMO_USER_EMAIL and DEMO_USER_PASSWORD to Vercel...')
    try {
      const projectId = execSync(
        `curl -s -H "Authorization: Bearer ${vercelToken}" "https://api.vercel.com/v9/projects" | node -e "const d=require('fs').readFileSync('/dev/stdin','utf8'); const p=JSON.parse(d).projects; const match=p.find(x=>x.name.includes('krux')); console.log(match?.id??'')"`,
        { encoding: 'utf8' }
      ).trim()

      if (!projectId) {
        console.warn('⚠ Could not auto-detect Vercel project. Set env vars manually in Vercel dashboard.')
      } else {
        for (const [key, value] of [['DEMO_USER_EMAIL', demoEmail], ['DEMO_USER_PASSWORD', demoPassword]]) {
          execSync(
            `curl -s -X POST "https://api.vercel.com/v10/projects/${projectId}/env" \
              -H "Authorization: Bearer ${vercelToken}" \
              -H "Content-Type: application/json" \
              -d '{"key":"${key}","value":"${value}","type":"encrypted","target":["production","preview"]}'`,
            { encoding: 'utf8' }
          )
          console.log(`  ✓ ${key}`)
        }
      }
    } catch (e) {
      console.warn('⚠ Vercel push failed. Set DEMO_USER_EMAIL and DEMO_USER_PASSWORD manually.')
    }
  } else {
    console.log('\n⚠ No VERCEL_TOKEN — add these to Vercel dashboard manually:')
    console.log(`  DEMO_USER_EMAIL = ${demoEmail}`)
    console.log(`  DEMO_USER_PASSWORD = ${demoPassword}`)
  }

  console.log('\nDemo setup complete.')
  console.log(`  Login URL: ${appUrl ?? 'https://krux-xi.vercel.app'}/demo`)
  console.log(`  Email: ${demoEmail}`)
  console.log(`  Password: ${demoPassword}`)
}

run().catch(console.error)
