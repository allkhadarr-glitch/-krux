# KRUX — Strategic Audit
**Date:** 2026-04-26
**Status:** Demo-ready. Code complete. Zero paying customers. Next action: Phase 1 setup.

---

## STRONG SUITE — What you can walk into any room with

**1. Specificity as a weapon.**
The demo isn't "import compliance software." It's Jet A-1, EPRA 25-day SLA, KES 96 million, EPRA Act 2019 Section 47. That specificity is what generic competitors can't copy in a meeting. When the KRA petroleum officer sees 2710.19.11 vs 2710.19.90 and the KES 155K penalty, she's not evaluating software — she's seeing her own world reflected back.

**2. The "Clearance Window Closed" banner.**
Single highest-impact feature. It doesn't tell the user there's a problem. It tells them the problem is already mathematically irreversible. That emotional hit — realizing they should have started 13 days ago — is what creates urgency to buy.

**3. Morning Brief as a habit loop.**
WhatsApp at 6:30am is brilliant positioning. You're not selling software, you're selling a routine. Clearing agents already check WhatsApp at 6:30am. KRUX inserts itself into behavior that already exists. Stickiest feature in the product.

**4. KES-first display.**
Every competitor shows USD. KRUX shows KES 96.1M. That's the number that matters to someone whose client is calling asking why clearance is blocked. Speaking their language at the neurological level.

**5. The Print Brief.**
Physical paper in a meeting signals permanence. "This is what your client gets every morning." Repositions KRUX from software to a professional service. A closing tool masquerading as a UX feature.

**6. Two pre-choreographed demo paths.**
The KRA officer demo and the clearing agent demo are distinct, scripted, and rehearsable. Most founders can't demo two personas fluently.

---

## WEAK — What a sharp buyer will find

**1. Intelligence is static.**
Every HS code, every SLA, every penalty figure is hardcoded. If EPRA changes a processing time, KRUX is wrong until manually updated. The question "how does this stay current?" has no strong answer yet.

**2. 14 HS codes.**
A customs broker who does 200 shipments a month will immediately think of a code that's missing. One "you don't have HS 8471.30" and the HS tool's credibility takes a hit.

**3. No real data in production.**
Zero real shipments. Zero real users. If someone asks "can I see it with one of my actual shipments right now" — the answer is no.

**4. Single point of failure: the founder.**
Non-technical founder, Claude as sole developer. If something breaks 48 hours before a demo, the recovery path is limited.

**5. No regulatory endorsement.**
KRUX interprets regulations but has no relationship with KRA, EPRA, KEBS, or any regulator. The question "is this approved by KRA?" needs a prepared answer.

**6. No legal entity, TOS, or privacy policy.**
The moment an enterprise or government-adjacent buyer asks for a DPA before signing, there's nothing to hand over.

**7. Risk score is a black box.**
91/100 is compelling in a demo. In a procurement conversation, "how is that calculated?" collapses the metric without a transparent methodology.

---

## LEVELING UP — Highest ROI improvements (before closing first customer)

1. **Live shipment creation in the demo** — let the prospect type in their real HS code, value, deadline and watch it score live. Converts theater into their data.
2. **"How we stay current" answer** — even if informal: Claude monitors KRA/EPRA/KEBS public notices + monthly review. Document the process.
3. **Expand HS to 50+ codes** — one session closes the "you don't have my code" objection for 95% of clearing agents.
4. **One real pilot customer** — even free. Real data, testimonial, usage patterns, proof under real load.
5. **Data privacy answer** — "encrypted Supabase, isolated per org by RLS, never shared, export/delete anytime." Write the page. Unlocks enterprise conversations.

---

## UNFORESEEN RISKS

1. **A regulatory figure is wrong.** You tell the EPRA officer 25 days. She says "no, it changed in January." Everything after that is recovery.
2. **Demo environment fails live.** Supabase down, Anthropic rate-limits, demo user doesn't exist. Blank screen in front of the KRA officer. Highest-probability catastrophic event.
3. **A competitor with funding is already building this.** You don't know what you don't know. Customs management in Kenya isn't empty.
4. **The lead is an evaluator, not a buyer.** "Bring it to procurement committee" = 6–18 months in government-adjacent orgs.
5. **Anthropic pricing or availability changes.** Every AI call is a dependency you can't control.
6. **The clearing agent uses KRUX internally without telling clients, never pays.** B2B2C distribution risk specific to the go-to-market.

---

## WORST POSSIBLE SCENARIOS

| Scenario | Probability | Impact | Counter | How to be sure |
|----------|-------------|--------|---------|----------------|
| A: Factual error destroys credibility with highest-value lead | 15% | Total | Before EPRA demo, spend 2h on epra.go.ke + KRA tariff schedule verifying every number in the 2710.19.11 card. Call EPRA helpline (254-20-3201202) to confirm permit processing time. If wrong, fix it — product improves. | Numbers verified against primary sources before any demo |
| B: Demo breaks live | 25% | High, recoverable | Build offline PDF fallback now: Operations table, Jet A-1 drawer with banner, Brief tab, HS 2710 card, WhatsApp mockup. Save as KRUX-Demo-Fallback.pdf. Keep in bag for every meeting. | PDF deck always in bag before every meeting |
| C: "How many customers do you have?" | 80% | Momentum-killing | "We're in private beta with a select group of clearing agencies. We're being selective about our first five paying clients to make sure onboarding is right. You'd be in that group." | Answer rehearsed, framing locked |
| D: "We want to pilot for free indefinitely" | 40% | Medium | 30-day paid pilot at $149 (50% off Pro). Full refund if no value by day 30. Never free. Free signals you don't believe in your own value. | One-page pilot offer PDF written and ready |
| E: Anthropic shuts off or raises prices 5x | 5% | Existential | Core value (risk scores, window deadlines, HS data, document checklists) is non-AI. AI is the presentation layer. Could swap to OpenAI in 2 hours. KRUX is a compliance data platform; Claude is the writing voice. | Mental model built: they're separable |

---

## PRE-DEMO CHECKLIST (run before every meeting — 5 minutes)

- [ ] /demo opens → Operations table has 5 shipments
- [ ] Jet A-1 shows 91/100 and "EPRA needs 25d — 12 left" badge
- [ ] Click Jet A-1 → red "CLEARANCE WINDOW CLOSED" banner appears
- [ ] Brief tab → loads instantly (hardcoded, no spinner)
- [ ] HS Lookup → search "2710" → Jet A-1 card + misclassification callout visible
- [ ] PDF fallback deck is in bag

---

## MASTER TO-DO LIST

### PHASE 1 — GET THE DEMO LIVE
- [ ] 1.1 Set ANTHROPIC_API_KEY in .env.local
- [ ] 1.2 Set DEMO_USER_EMAIL and DEMO_USER_PASSWORD in .env.local
- [ ] 1.3 Set NEXT_PUBLIC_APP_URL and CRON_SECRET in .env.local
- [ ] 1.4 Run `node scripts/setup-demo.js` — creates Supabase demo user + seeds 5 shipments
- [ ] 1.5 Open /demo on desktop → confirm Operations table has all 5 shipments
- [ ] 1.6 Confirm Jet A-1 shows 91/100 and "EPRA needs 25d — 12 left" badge
- [ ] 1.7 Click Jet A-1 → confirm red "CLEARANCE WINDOW CLOSED" banner appears
- [ ] 1.8 Click Brief tab → confirm brief loads instantly (hardcoded, no API call)
- [ ] 1.9 Open /demo on phone → confirm mobile view loads with KRUX branding
- [ ] 1.10 Deploy to Vercel → set all env vars in Vercel dashboard → confirm production URL works

### PHASE 2 — PRE-DEMO HARDENING
- [ ] 2.1 Verify EPRA petroleum import permit processing time against epra.go.ke — confirm 25 days is current
- [ ] 2.2 Verify HS 2710.19.11 duty rate (0%) and 2710.19.90 (25%) against KRA tariff schedule
- [ ] 2.3 Verify EPRA Act 2019 Section 47 citation — confirm section number is correct
- [ ] 2.4 Check KES 155K penalty figure for Jet A-1 misclassification — confirm or correct the math
- [ ] 2.5 Build offline PDF fallback deck — screenshots of: Operations table, Jet A-1 drawer open with banner, Brief tab, HS Lookup 2710 card, Morning Brief WhatsApp mockup. Save as KRUX-Demo-Fallback.pdf
- [ ] 2.6 Rehearse KRA petroleum demo path 3x out loud, alone, against a timer. Target: 8 minutes
- [ ] 2.7 Rehearse clearing agent demo path 3x out loud. Target: 10 minutes including WhatsApp mockup and Print Brief

### PHASE 3 — FIRST DEMOS
- [ ] 3.1 Book and run KRA petroleum officer demo (JKIA)
- [ ] 3.2 Within 24h of meeting: send follow-up with Print Brief as PDF attachment
- [ ] 3.3 Book and run clearing agent demo(s)
- [ ] 3.4 After each demo: write down every question with no perfect answer → product backlog

### PHASE 4 — CLOSE FIRST PAYING CUSTOMER
- [ ] 4.1 Write one-page pilot offer PDF: 30-day onboarding at $149 (50% off Pro), full refund guarantee
- [ ] 4.2 Activate Stripe live mode — run `node scripts/setup-stripe.js`
- [ ] 4.3 Write one-paragraph answer to "how many customers do you have?"
- [ ] 4.4 Write one-paragraph answer to "is this approved by KRA?"
- [ ] 4.5 Write one-paragraph answer to "where does your data come from?"
- [ ] 4.6 Get one customer on the platform with real shipments — even free 30 days for testimonial

### PHASE 5 — PRODUCT GAPS (after first demo, before first customer signs)
- [ ] 5.1 Expand HS code database from 14 to 50+ codes
- [ ] 5.2 Add live shipment creation in demo — prospect types real HS code/value/deadline and watches it score live
- [ ] 5.3 Add CA (Communications Authority) regulator profile
- [ ] 5.4 Add "How we stay current" page or tooltip — monthly regulatory review, gazette monitoring
- [ ] 5.5 Add risk score methodology tooltip — breakdown of 4 weighted components with percentages
- [ ] 5.6 Configure Twilio WhatsApp — set env vars, test morning brief at 6:30am EAT
- [ ] 5.7 Configure Resend email alerts — set RESEND_API_KEY
- [ ] 5.8 Run risk evaluation cron manually once on real data

### PHASE 6 — LEGAL & BUSINESS INFRASTRUCTURE
- [ ] 6.1 Write Privacy Policy — data collected, where stored, who sees it, how to delete
- [ ] 6.2 Write Terms of Service — intelligence tool not legal advice, liability limits, payment, cancellation
- [ ] 6.3 Write Data Processing Agreement template for enterprise/government buyers
- [ ] 6.4 Register legal entity — KRUX Ltd or similar
- [ ] 6.5 Open business bank account tied to entity
- [ ] 6.6 Add Privacy Policy and TOS links to landing page and login page footer

### PHASE 7 — SCALE PREPARATION (after 3+ paying customers)
- [ ] 7.1 Competitive audit — search all Kenya import compliance / customs management software alternatives
- [ ] 7.2 Build real customer testimonial with specific KES result → add to landing page
- [ ] 7.3 Build self-serve onboarding flow — new user to first brief without any help from you
- [ ] 7.4 Add 3 more regulator profiles — NEMA, KEBS food, PPOA
- [ ] 7.5 Build "Request a code" feature — missing HS code submits to your inbox
- [ ] 7.6 Explore KRA/EPRA/KEBS partnership or endorsement
- [ ] 7.7 Build API access tier for clearing agencies with their own systems (Enterprise $1,500/mo justification)

---

## THE HONEST SUMMARY

KRUX is stronger than it has any right to be at this stage. The product tells a clear story, to a specific person, in their own language, with their own numbers. That's rare. Most demos are about features. This demo is about a feeling.

The risk isn't the technology. The risk is the gap between what you know and what the person across the table knows. The petroleum officer knows EPRA better than KRUX does. The clearing agent knows port procedures better than KRUX does. The job in every room is not to prove you're smarter — it's to prove that KRUX makes them more powerful.

**North Star:** Phase 1 → Phase 2 → Phase 3 → close one customer. Do not build Phase 5 features before Phase 3 demos. The product is already good enough. The risk is over-building instead of selling.
