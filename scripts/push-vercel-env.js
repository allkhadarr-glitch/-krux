/**
 * KRUX Vercel Env Push Script
 * Pushes all required env vars from .env.local to Vercel production.
 *
 * Usage:
 *   1. Run setup-stripe.js first (to populate STRIPE price IDs)
 *   2. Add VERCEL_TOKEN=your_token to .env.local
 *      (get from vercel.com/account/tokens)
 *   3. Run: node scripts/push-vercel-env.js
 */

const fs   = require('fs')
const path = require('path')

const envPath = path.join(__dirname, '..', '.env.local')
const envText = fs.readFileSync(envPath, 'utf8')

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.+)$`, 'm'))
  return match ? match[1].trim() : null
}

const VERCEL_TOKEN  = getEnv('VERCEL_TOKEN')
const PROJECT_ID    = 'prj_NHBI06dDPrQuF0wFk2qwPfqqi0Wo'

const APP_URL = getEnv('NEXT_PUBLIC_APP_URL') || ''

if (!VERCEL_TOKEN || VERCEL_TOKEN.startsWith('your_')) {
  console.error('\n❌  Add VERCEL_TOKEN=your_token to .env.local first.')
  console.error('   Get your token at: vercel.com/account/tokens\n')
  process.exit(1)
}

if (!APP_URL || APP_URL.includes('localhost')) {
  console.error('\n❌  NEXT_PUBLIC_APP_URL is still localhost.')
  console.error('   Set it to your real Vercel domain first:')
  console.error('   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app\n')
  process.exit(1)
}

const FLW_WEBHOOK = getEnv('FLW_WEBHOOK_HASH')
if (!FLW_WEBHOOK || FLW_WEBHOOK.includes('your_')) {
  console.error('\n❌  FLW_WEBHOOK_HASH is missing.')
  console.error('   Set your webhook secret hash in .env.local first.')
  console.error('   (run setup-flutterwave.js and follow the webhook instructions)\n')
  process.exit(1)
}

// Keys to push to Vercel (server-only unless prefixed NEXT_PUBLIC_)
const KEYS_TO_PUSH = [
  'ANTHROPIC_API_KEY',
  'RESEND_API_KEY',
  'FLW_SECRET_KEY',
  'FLW_WEBHOOK_HASH',
  'FLW_PLAN_STARTER',
  'FLW_PLAN_STANDARD',
  'FLW_PLAN_PROFESSIONAL',
  'NEXT_PUBLIC_APP_URL',
]

async function upsertEnvVar(key, value) {
  const isPublic = key.startsWith('NEXT_PUBLIC_')
  const targets  = isPublic ? ['production', 'preview', 'development'] : ['production']

  // Delete existing first (ignore errors)
  const listRes = await fetch(
    `https://api.vercel.com/v9/projects/${PROJECT_ID}/env?target=production`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const listData = await listRes.json()
  const existing = (listData.envs ?? []).find((e) => e.key === key)

  if (existing) {
    await fetch(
      `https://api.vercel.com/v9/projects/${PROJECT_ID}/env/${existing.id}`,
      {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
      }
    )
  }

  const res = await fetch(
    `https://api.vercel.com/v10/projects/${PROJECT_ID}/env`,
    {
      method:  'POST',
      headers: {
        Authorization:  `Bearer ${VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ key, value, type: 'encrypted', target: targets }),
    }
  )

  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message ?? JSON.stringify(data))
  return data
}

async function triggerRedeploy() {
  // Get latest deployment
  const res = await fetch(
    `https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=1&target=production`,
    { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } }
  )
  const data = await res.json()
  const latest = data.deployments?.[0]
  if (!latest) return null

  // Redeploy it
  const redeployRes = await fetch('https://api.vercel.com/v13/deployments', {
    method:  'POST',
    headers: {
      Authorization:  `Bearer ${VERCEL_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name:   'krux',
      deploymentId: latest.uid,
      target: 'production',
    }),
  })
  const redeployData = await redeployRes.json()
  return redeployData.url ?? null
}

async function main() {
  console.log('\n🚀  KRUX Vercel Env Push\n')

  const missing = []
  const toPush  = []

  for (const key of KEYS_TO_PUSH) {
    const val = getEnv(key)
    if (!val || val.includes('your_') || val.includes('_here')) {
      missing.push(key)
    } else {
      toPush.push({ key, val })
    }
  }

  if (missing.length > 0) {
    console.log(`   ⚠️  Skipping (placeholder values in .env.local):`)
    missing.forEach((k) => console.log(`      ${k}`))
    console.log()
  }

  if (toPush.length === 0) {
    console.error('❌  No real values to push. Update .env.local with your actual keys first.\n')
    process.exit(1)
  }

  for (const { key, val } of toPush) {
    process.stdout.write(`   Pushing ${key}... `)
    try {
      await upsertEnvVar(key, val)
      console.log('✓')
    } catch (err) {
      console.log(`✗ (${err.message})`)
    }
  }

  console.log('\n   Triggering redeploy...')
  const url = await triggerRedeploy()
  if (url) {
    console.log(`   Deploying: https://${url}`)
  } else {
    console.log('   Could not trigger redeploy — do it manually in Vercel dashboard.')
  }

  console.log('\n✅  Done.\n')
}

main().catch((err) => {
  console.error('\n❌ ', err.message)
  process.exit(1)
})
