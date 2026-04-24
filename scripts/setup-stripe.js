/**
 * KRUX Stripe Setup Script
 * Creates products + prices in Stripe. Updates .env.local with price IDs.
 * Does NOT auto-register the webhook — that must be done manually (see output).
 *
 * Usage:
 *   1. Set STRIPE_SECRET_KEY in .env.local
 *   2. Set NEXT_PUBLIC_APP_URL to your real production domain (NOT localhost)
 *   3. Run: node scripts/setup-stripe.js
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const STRIPE_KEY = getEnv('STRIPE_SECRET_KEY')
const APP_URL    = getEnv('NEXT_PUBLIC_APP_URL') || ''

// ── Guards ────────────────────────────────────────────────────

if (!STRIPE_KEY || STRIPE_KEY.startsWith('sk_test_your') || STRIPE_KEY.startsWith('sk_live_your')) {
  console.error('\n❌  STRIPE_SECRET_KEY is a placeholder. Add your real key to .env.local.\n')
  process.exit(1)
}

if (!APP_URL || APP_URL.includes('localhost') || APP_URL.includes('127.0.0.1')) {
  console.error('\n❌  NEXT_PUBLIC_APP_URL is set to localhost.')
  console.error('   Stripe checkout redirects and webhooks need your real production domain.')
  console.error('\n   Fix in .env.local:')
  console.error('   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app')
  console.error('\n   Find your domain at: vercel.com → your project → Deployments\n')
  process.exit(1)
}

if (!APP_URL.startsWith('https://')) {
  console.error(`\n❌  NEXT_PUBLIC_APP_URL must start with https://`)
  console.error(`   Current value: ${APP_URL}\n`)
  process.exit(1)
}

const Stripe = require('stripe')
const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' })

const PLANS = [
  {
    id:     'basic',
    name:   'KRUX Basic',
    amount: 29900,
    desc:   'Up to 25 shipments/month. All Kenya regulators. Email alerts.',
  },
  {
    id:     'pro',
    name:   'KRUX Pro',
    amount: 49900,
    desc:   'Up to 100 shipments/month. WhatsApp alerts + document AI extraction.',
  },
  {
    id:     'enterprise',
    name:   'KRUX Enterprise',
    amount: 150000,
    desc:   'Unlimited shipments. Dedicated support + API access.',
  },
]

async function main() {
  const isTest = STRIPE_KEY.startsWith('sk_test_')
  console.log('\n🔧  KRUX Stripe Setup')
  console.log(`   Mode:    ${isTest ? 'TEST' : '⚠️  LIVE'}`)
  console.log(`   App URL: ${APP_URL}\n`)

  if (!isTest) {
    console.log('   ⚠️  You are using a LIVE Stripe key.')
    console.log('   Real charges will be processed. Continue? (Ctrl-C to abort)\n')
    await new Promise((r) => setTimeout(r, 3000))
  }

  const priceIds = {}

  // ── Create products + prices ──────────────────────────────
  for (const plan of PLANS) {
    process.stdout.write(`   ${plan.name}... `)

    const existing = await stripe.products.search({
      query: `name:"${plan.name}" AND active:"true"`,
      limit: 1,
    }).catch(() => ({ data: [] }))

    let product
    if (existing.data.length > 0) {
      product = existing.data[0]
      process.stdout.write(`product exists (${product.id}) `)
    } else {
      product = await stripe.products.create({
        name:        plan.name,
        description: plan.desc,
        metadata:    { krux_plan: plan.id },
      })
      process.stdout.write(`product created (${product.id}) `)
    }

    const existingPrices = await stripe.prices.list({ product: product.id, active: true, limit: 10 })
    const match = existingPrices.data.find(
      (p) => p.unit_amount === plan.amount && p.currency === 'usd' && p.recurring?.interval === 'month'
    )

    let price
    if (match) {
      price = match
      console.log(`| price exists (${price.id})`)
    } else {
      price = await stripe.prices.create({
        product:     product.id,
        unit_amount: plan.amount,
        currency:    'usd',
        recurring:   { interval: 'month' },
        metadata:    { krux_plan: plan.id },
      })
      console.log(`| price created (${price.id})`)
    }

    priceIds[plan.id] = price.id
  }

  // ── Patch .env.local ──────────────────────────────────────
  console.log('\n   Patching .env.local with price IDs...')
  let updated = envText
  updated = updated.replace(/^STRIPE_PRICE_BASIC=.*/m,      `STRIPE_PRICE_BASIC=${priceIds.basic}`)
  updated = updated.replace(/^STRIPE_PRICE_PRO=.*/m,        `STRIPE_PRICE_PRO=${priceIds.pro}`)
  updated = updated.replace(/^STRIPE_PRICE_ENTERPRISE=.*/m, `STRIPE_PRICE_ENTERPRISE=${priceIds.enterprise}`)
  fs.writeFileSync(envPath, updated, 'utf8')
  console.log('   .env.local updated ✓')

  // ── Webhook instructions (manual — more reliable than auto) ─
  const webhookUrl = `${APP_URL}/api/payments/webhook`

  console.log('\n' + '═'.repeat(62))
  console.log('  MANUAL STEP REQUIRED: Register webhook in Stripe')
  console.log('═'.repeat(62))
  console.log()
  console.log('  1. Go to: https://dashboard.stripe.com/webhooks')
  if (!isTest) {
    console.log('     (make sure you\'re in LIVE mode, not test mode)')
  } else {
    console.log('     (you\'re in test mode — use the test webhook tab)')
  }
  console.log()
  console.log(`  2. Click "Add endpoint"`)
  console.log(`     URL: ${webhookUrl}`)
  console.log()
  console.log('  3. Select these events:')
  console.log('       ✓ checkout.session.completed')
  console.log('       ✓ invoice.paid')
  console.log('       ✓ customer.subscription.deleted')
  console.log()
  console.log('  4. After saving, click "Reveal signing secret"')
  console.log('     Add to .env.local:')
  console.log('       STRIPE_WEBHOOK_SECRET=whsec_...')
  console.log()
  console.log('═'.repeat(62))

  // ── Vercel env vars to add ────────────────────────────────
  console.log('\n  VERCEL ENVIRONMENT VARIABLES (add via push-vercel-env.js)')
  console.log('─'.repeat(62))
  console.log(`  STRIPE_SECRET_KEY       = ${STRIPE_KEY.slice(0, 14)}...`)
  console.log(`  STRIPE_PRICE_BASIC      = ${priceIds.basic}`)
  console.log(`  STRIPE_PRICE_PRO        = ${priceIds.pro}`)
  console.log(`  STRIPE_PRICE_ENTERPRISE = ${priceIds.enterprise}`)
  console.log(`  STRIPE_WEBHOOK_SECRET   = <from webhook step above>`)
  console.log(`  NEXT_PUBLIC_APP_URL     = ${APP_URL}`)
  console.log('─'.repeat(62))

  console.log('\n✅  Products and prices created.')
  console.log('   Next: complete the webhook step above, then run push-vercel-env.js\n')
}

main().catch((err) => {
  console.error('\n❌ ', err.message)
  process.exit(1)
})
