/**
 * KRUX Billing Pre-Demo Test
 * Verifies that checkout, webhook, and billing page are wired correctly.
 * Run this AFTER deploying to Vercel.
 *
 * Usage: node scripts/test-billing.js
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const APP_URL    = getEnv('NEXT_PUBLIC_APP_URL') || ''
const STRIPE_KEY = getEnv('STRIPE_SECRET_KEY')   || ''

async function check(label, fn) {
  process.stdout.write(`   ${label}... `)
  try {
    const result = await fn()
    console.log(`✓${result ? '  ' + result : ''}`)
    return true
  } catch (err) {
    console.log(`✗  ${err.message}`)
    return false
  }
}

async function main() {
  console.log('\n🧪  KRUX Billing Test\n')

  if (!APP_URL || APP_URL.includes('localhost')) {
    console.error('❌  Set NEXT_PUBLIC_APP_URL to your production domain first.\n')
    process.exit(1)
  }

  const Stripe = require('stripe')
  const stripe = new Stripe(STRIPE_KEY, { apiVersion: '2026-04-22.dahlia' })

  let passed = 0
  let failed = 0

  // ── 1. App is reachable ────────────────────────────────────
  const r1 = await check('Production app reachable', async () => {
    const res = await fetch(APP_URL, { method: 'HEAD' })
    if (!res.ok && res.status !== 200) throw new Error(`HTTP ${res.status}`)
    return res.status.toString()
  })
  r1 ? passed++ : failed++

  // ── 2. Billing page loads ──────────────────────────────────
  const r2 = await check('Billing page loads', async () => {
    const res = await fetch(`${APP_URL}/dashboard/billing`)
    if (res.status >= 500) throw new Error(`HTTP ${res.status}`)
    return res.status === 200 ? 'ok' : `HTTP ${res.status} (may need login)`
  })
  r2 ? passed++ : failed++

  // ── 3. Checkout API responds ───────────────────────────────
  const r3 = await check('Checkout endpoint exists', async () => {
    const res = await fetch(`${APP_URL}/api/payments/checkout`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
    if (res.status === 404) throw new Error('Route not found — redeploy needed')
    return `HTTP ${res.status} (expected 401/400 without session)`
  })
  r3 ? passed++ : failed++

  // ── 4. Webhook endpoint responds ──────────────────────────
  const r4 = await check('Webhook endpoint exists', async () => {
    const res = await fetch(`${APP_URL}/api/payments/webhook`, { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } })
    if (res.status === 404) throw new Error('Route not found — redeploy needed')
    return `HTTP ${res.status} (expected 400 — bad signature is correct)`
  })
  r4 ? passed++ : failed++

  // ── 5. Stripe products exist ───────────────────────────────
  if (STRIPE_KEY && !STRIPE_KEY.includes('your_')) {
    const r5 = await check('Stripe products created', async () => {
      const products = await stripe.products.search({ query: 'name:"KRUX"', limit: 5 })
      if (products.data.length === 0) throw new Error('No KRUX products found — run setup-stripe.js')
      return `${products.data.length} products`
    })
    r5 ? passed++ : failed++

    // ── 6. Stripe prices exist ─────────────────────────────
    const r6 = await check('Stripe prices configured', async () => {
      const b = getEnv('STRIPE_PRICE_BASIC')
      const p = getEnv('STRIPE_PRICE_PRO')
      const e = getEnv('STRIPE_PRICE_ENTERPRISE')
      if (!b || b.includes('your') || !p || p.includes('your') || !e || e.includes('your')) {
        throw new Error('Price IDs are placeholders — run setup-stripe.js')
      }
      return `basic=${b.slice(0,12)}... pro=${p.slice(0,12)}...`
    })
    r6 ? passed++ : failed++

    // ── 7. Webhook registered in Stripe ───────────────────
    const r7 = await check('Webhook registered in Stripe', async () => {
      const hooks = await stripe.webhookEndpoints.list({ limit: 20 })
      const webhookUrl = `${APP_URL}/api/payments/webhook`
      const match = hooks.data.find((h) => h.url === webhookUrl)
      if (!match) throw new Error(`No webhook for ${webhookUrl} — see setup-stripe.js output`)
      if (match.status !== 'enabled') throw new Error(`Webhook exists but status is ${match.status}`)
      return `id=${match.id}`
    })
    r7 ? passed++ : failed++
  }

  // ── Summary ────────────────────────────────────────────────
  console.log()
  console.log('─'.repeat(42))
  console.log(`  ${passed} passed · ${failed} failed`)
  console.log('─'.repeat(42))

  if (failed === 0) {
    console.log('\n✅  Billing is ready. Test the full flow:\n')
    console.log(`   1. Open: ${APP_URL}/dashboard/billing`)
    console.log('   2. Click "Upgrade to Pro"')
    console.log('   3. Stripe test card: 4242 4242 4242 4242')
    console.log('      Expiry: any future date  CVC: any 3 digits')
    console.log('   4. Confirm you land back on /dashboard/billing?success=1')
    console.log('   5. Check org plan updated in Supabase (organizations table)\n')
  } else {
    console.log('\n⚠️  Fix failing checks before demoing billing.\n')
  }
}

main().catch((err) => {
  console.error('\n❌ ', err.message)
  process.exit(1)
})
