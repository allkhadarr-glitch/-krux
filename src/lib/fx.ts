let cachedRate: number | null = null
let cacheExpiresAt = 0

const FALLBACK_RATE = 130

export async function getKesRate(): Promise<number> {
  if (cachedRate && Date.now() < cacheExpiresAt) return cachedRate

  try {
    const res  = await fetch('https://api.exchangerate-api.com/v4/latest/USD', { signal: AbortSignal.timeout(3000) })
    const data = await res.json() as { rates?: Record<string, number> }
    const rate = data?.rates?.KES
    if (typeof rate === 'number' && rate > 100) {
      cachedRate     = rate
      cacheExpiresAt = Date.now() + 3_600_000  // 1 hour
      return rate
    }
  } catch { /* fall through */ }

  return FALLBACK_RATE
}
