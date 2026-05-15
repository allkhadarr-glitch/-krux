/**
 * KRUX Flutterwave Setup Script
 * Creates payment plans in Flutterwave. Updates .env.local with plan IDs.
 *
 * Usage:
 *   1. Set FLW_SECRET_KEY in .env.local  (get from dashboard.flutterwave.com → Settings → API)
 *   2. Set NEXT_PUBLIC_APP_URL to your real production domain
 *   3. Run: node scripts/setup-flutterwave.js
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const FLW_KEY = getEnv('FLW_SECRET_KEY')
const APP_URL = getEnv('NEXT_PUBLIC_APP_URL') || ''

if (!FLW_KEY || !FLW_KEY.startsWith('FLWSECK')) {
  console.error('\n❌  FLW_SECRET_KEY is missing or invalid.')
  console.error('   Get it from: dashboard.flutterwave.com → Settings → API Keys')
  console.error('   Add to .env.local: FLW_SECRET_KEY=FLWSECK_LIVE-...\n')
  process.exit(1)
}

if (!APP_URL || APP_URL.includes('localhost')) {
  console.error('\n❌  NEXT_PUBLIC_APP_URL must be your production domain.')
  console.error('   Add to .env.local: NEXT_PUBLIC_APP_URL=https://kruxvon.com\n')
  process.exit(1)
}

const isLive = FLW_KEY.includes('LIVE')
console.log('\n🔧  KRUX Flutterwave Setup')
console.log(`   Mode:    ${isLive ? '⚠️  LIVE' : 'TEST'}`)
console.log(`   App URL: ${APP_URL}\n`)

if (isLive) {
  console.log('   ⚠️  You are using a LIVE Flutterwave key. Real charges will be processed.')
  console.log('   Starting in 3 seconds... (Ctrl-C to abort)\n')
}

const PLANS = [
  { key: 'starter',      name: 'KRUX Starter Monthly',      amount: 99,  interval: 'monthly', currency: 'USD' },
  { key: 'standard',     name: 'KRUX Standard Monthly',     amount: 299, interval: 'monthly', currency: 'USD' },
  { key: 'professional', name: 'KRUX Professional Monthly', amount: 599, interval: 'monthly', currency: 'USD' },
]

async function flw(path, method = 'GET', body = null) {
  const res = await fetch(`https://api.flutterwave.com/v3${path}`, {
    method,
    headers: {
      Authorization:  `Bearer ${FLW_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

async function getOrCreatePlan(plan) {
  // Check for existing plan with same name
  const list = await flw('/payment-plans?status=active')
  const existing = (list.data ?? []).find((p) => p.name === plan.name && p.status === 'active')
  if (existing) return existing

  const created = await flw('/payment-plans', 'POST', {
    amount:   plan.amount,
    name:     plan.name,
    interval: plan.interval,
    currency: plan.currency,
  })

  if (created.status !== 'success') {
    throw new Error(`Failed to create plan "${plan.name}": ${created.message}`)
  }
  return created.data
}

async function main() {
  if (isLive) await new Promise((r) => setTimeout(r, 3000))

  const planIds = {}

  for (const plan of PLANS) {
    process.stdout.write(`   ${plan.name}... `)
    const p = await getOrCreatePlan(plan)
    planIds[plan.key] = p.id
    console.log(`plan ID: ${p.id}`)
  }

  // Patch .env.local
  console.log('\n   Patching .env.local with plan IDs...')
  let updated = envText

  for (const [key, id] of Object.entries(planIds)) {
    const envKey = `FLW_PLAN_${key.toUpperCase()}`
    if (updated.match(new RegExp(`^${envKey}=`, 'm'))) {
      updated = updated.replace(new RegExp(`^${envKey}=.*$`, 'm'), `${envKey}=${id}`)
    } else {
      updated += `\n${envKey}=${id}`
    }
  }

  fs.writeFileSync(envPath, updated, 'utf8')
  console.log('   .env.local updated ✓')

  // Webhook instructions
  const webhookUrl = `${APP_URL}/api/payments/webhook`
  console.log('\n' + '═'.repeat(62))
  console.log('  MANUAL STEP REQUIRED: Register webhook in Flutterwave')
  console.log('═'.repeat(62))
  console.log()
  console.log('  1. Go to: dashboard.flutterwave.com → Settings → Webhooks')
  console.log()
  console.log(`  2. Set webhook URL:`)
  console.log(`     ${webhookUrl}`)
  console.log()
  console.log('  3. Set a secret hash (any strong random string):')
  console.log('     e.g. openssl rand -hex 32')
  console.log('     Add to .env.local: FLW_WEBHOOK_HASH=your_hash_here')
  console.log()
  console.log('  4. Save. Flutterwave will send events to your endpoint.')
  console.log()
  console.log('═'.repeat(62))

  console.log('\n  VERCEL ENV VARS TO ADD (run push-vercel-env.js next)')
  console.log('─'.repeat(62))
  console.log(`  FLW_SECRET_KEY          = ${FLW_KEY.slice(0, 20)}...`)
  console.log(`  FLW_PLAN_STARTER        = ${planIds.starter}`)
  console.log(`  FLW_PLAN_STANDARD       = ${planIds.standard}`)
  console.log(`  FLW_PLAN_PROFESSIONAL   = ${planIds.professional}`)
  console.log(`  FLW_WEBHOOK_HASH        = <from webhook step above>`)
  console.log(`  NEXT_PUBLIC_APP_URL     = ${APP_URL}`)
  console.log('─'.repeat(62))

  console.log('\n✅  Payment plans created. Complete the webhook step, then run push-vercel-env.js\n')
}

main().catch((err) => {
  console.error('\n❌ ', err.message)
  process.exit(1)
})
