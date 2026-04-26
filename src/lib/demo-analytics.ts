export function trackDemo(event: string, data?: Record<string, unknown>) {
  fetch('/api/analytics/demo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, ts: Date.now(), ...data }),
  }).catch(() => {})
}
