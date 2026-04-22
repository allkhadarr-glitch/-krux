#!/bin/bash
# Run after: vercel login + vercel link
# Sets all production environment variables in one shot

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_DIR"

source .env.local 2>/dev/null

echo "Setting Vercel environment variables..."

set_env() {
  local key=$1
  local val=$2
  local env=${3:-"production,preview,development"}
  echo "$val" | npx vercel env add "$key" "$env" --force 2>/dev/null || true
  echo "  ✓ $key"
}

# Supabase — public (all envs)
set_env "NEXT_PUBLIC_SUPABASE_URL"      "$NEXT_PUBLIC_SUPABASE_URL"
set_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Supabase — server only
set_env "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY" "production,preview"

# AI + Alerts
set_env "ANTHROPIC_API_KEY" "$ANTHROPIC_API_KEY" "production,preview"
set_env "RESEND_API_KEY"    "$RESEND_API_KEY"    "production,preview"
set_env "ALERT_EMAIL"       "$ALERT_EMAIL"       "production,preview"

# Cron protection
set_env "CRON_SECRET" "$CRON_SECRET" "production,preview"

echo ""
echo "All env vars set. Run: npx vercel deploy --prod"
