import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://kruxvon.com'

const EMAILS: Record<number, (email: string, company?: string | null) => { subject: string; html: string }> = {
  3: (email, company) => ({
    subject: 'KES 112,000 is what 14 days at Mombasa costs.',
    html: `<!DOCTYPE html>
<html>
<head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:48px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:40px;">KRUX</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:40px;"></div>
  <div style="color:#94A3B8;font-size:13px;line-height:1.9;margin-bottom:32px;">
    ${company ? `${company} — ` : ''}Here is what 14 days of port detention actually costs.<br><br>
    KES 8,000/day × 14 days = <span style="color:#FF4444;font-weight:700;">KES 112,000</span><br><br>
    That is before duty, storage, and demurrage from the shipping line.<br><br>
    Most importers find out the window was closed <em>after</em> goods arrive. By then the detention clock is already running.<br><br>
    KRUX shows every regulatory window before departure — PPB, EPRA, KEPHIS, DVS, and 5 others — so you know the exact risk before the vessel leaves origin.
  </div>
  <div style="background:#0F2040;border:1px solid #1E3A5F;padding:20px;margin-bottom:32px;">
    <div style="color:#334155;font-size:10px;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">What KRUX tracks for every shipment</div>
    <div style="color:#94A3B8;font-size:12px;line-height:2;">
      · Pre-shipment compliance windows<br>
      · Real-time clearance stage tracking<br>
      · Duty stack calculation (IDF, RDL, VAT, PVoC)<br>
      · Regulatory body timelines<br>
      · Action checklist per shipment
    </div>
  </div>
  <a href="${APP_URL}/signup" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Apply for KTIN →</a>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com · East Africa&apos;s trade standard</div>
</div>
</body>
</html>`,
  }),

  7: (email, company) => ({
    subject: 'The standard importers are switching to.',
    html: `<!DOCTYPE html>
<html>
<head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:48px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:40px;">KRUX</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:40px;"></div>
  <div style="color:#94A3B8;font-size:13px;line-height:1.9;margin-bottom:32px;">
    Every importer on KRUX has a KRUX Trade Identification Number.<br><br>
    Your KTIN is permanent. It follows your entity across shipments, clearing agents, and years. It is the first thing a bank or insurer sees when they check your trade compliance history.<br><br>
    Clearing agents who work with KRUX importers close faster. The action checklist is pre-built. The regulatory timelines are pre-checked. The duty stack is calculated before goods leave origin.
  </div>
  <div style="background:#0F2040;border:1px solid #00C896;border-left:3px solid #00C896;padding:20px;margin-bottom:32px;">
    <div style="color:#00C896;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:700;margin-bottom:8px;">KTIN — what it gives you</div>
    <div style="color:#94A3B8;font-size:12px;line-height:2;">
      · Permanent trade identity (KRUX-IMP-KE-00001)<br>
      · Compliance score built from every shipment<br>
      · Verified record banks and insurers can check<br>
      · Quotations that look different to agents comparing importers
    </div>
  </div>
  <a href="${APP_URL}/signup" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;">Get your KTIN →</a>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com · East Africa&apos;s trade standard</div>
</div>
</body>
</html>`,
  }),

  14: (email, company) => ({
    subject: 'Your KTIN is waiting.',
    html: `<!DOCTYPE html>
<html>
<head><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"></head>
<body style="margin:0;padding:0;background:#060E1A;font-family:'Courier New',Courier,monospace;">
<div style="max-width:480px;margin:0 auto;padding:48px 28px;">
  <div style="color:#00C896;font-size:11px;letter-spacing:3px;text-transform:uppercase;font-weight:700;margin-bottom:40px;">KRUX</div>
  <div style="border-top:1px solid #1E3A5F;margin-bottom:40px;"></div>
  <div style="color:#94A3B8;font-size:13px;line-height:1.9;margin-bottom:32px;">
    ${company ? `${company} — ` : ''}Two weeks ago you checked a compliance window on KRUX.<br><br>
    You have not registered yet. That is fine.<br><br>
    If you are still importing — your KTIN is still unregistered. Every shipment you run without it is a shipment that does not compound your compliance record.<br><br>
    Registration takes 60 seconds. Free for the first 3 shipments.
  </div>
  <a href="${APP_URL}/signup" style="display:inline-block;background:#00C896;color:#060E1A;font-weight:900;font-size:11px;padding:14px 28px;text-decoration:none;letter-spacing:3px;text-transform:uppercase;margin-bottom:16px;">Register now — KRUX-IMP-KE-?????</a>
  <div style="color:#64748B;font-size:11px;line-height:1.7;margin-bottom:32px;">
    Questions? Reply to this email or contact <a href="mailto:hq@kruxvon.com" style="color:#00C896;">hq@kruxvon.com</a>
  </div>
  <div style="border-top:1px solid #1E3A5F;margin-top:40px;margin-bottom:16px;"></div>
  <div style="color:#1E3A5F;font-size:10px;letter-spacing:1px;">kruxvon.com · East Africa&apos;s trade standard<br>To stop receiving these emails, reply with "unsubscribe".</div>
</div>
</body>
</html>`,
  }),
}

export async function GET(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json({ skipped: true, reason: 'RESEND_API_KEY not set' })
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  const now = new Date()
  const sent: Array<{ email: string; day: number }> = []
  const errors: Array<{ email: string; day: number; error: string }> = []

  for (const [dayNum, makeEmail] of Object.entries(EMAILS) as [string, typeof EMAILS[number]][]) {
    const day = Number(dayNum)
    const prevDay = day === 3 ? 0 : day === 7 ? 3 : 7

    // Find waitlist entries at exactly this day window (within 24h)
    const windowStart = new Date(now.getTime() - day * 24 * 60 * 60 * 1000 - 12 * 60 * 60 * 1000)
    const windowEnd   = new Date(now.getTime() - day * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000)

    const { data: entries } = await supabase
      .from('waitlist')
      .select('id, email, company, last_nurture_day')
      .eq('last_nurture_day', prevDay)
      .gte('created_at', windowStart.toISOString())
      .lte('created_at', windowEnd.toISOString())

    if (!entries?.length) continue

    for (const entry of entries) {
      const { subject, html } = makeEmail(entry.email, entry.company)
      try {
        const result = await resend.emails.send({
          from: 'KRUX <noreply@kruxvon.com>',
          to: entry.email,
          subject,
          html,
        })
        if (result.error) {
          errors.push({ email: entry.email, day, error: JSON.stringify(result.error) })
          continue
        }
        // Mark this day as sent
        await supabase.from('waitlist').update({ last_nurture_day: day }).eq('id', entry.id)
        sent.push({ email: entry.email, day })
      } catch (e: any) {
        errors.push({ email: entry.email, day, error: e.message })
      }
    }
  }

  return NextResponse.json({ ok: true, sent: sent.length, errors: errors.length, detail: { sent, errors } })
}
