# Before We Build Anything — Idea Validation Framework

Use this document every time a new idea comes up.
Open it in Claude (browser or CLI) and answer each question out loud before any code is written.
Claude's job is to challenge your answers, not accept them.

---

## RULE 1 — The Problem First

**Question: What is the exact problem?**

Write it in one sentence. Not the solution. The problem.

Bad example: "I want to build an app that tracks shipments"
Good example: "Clearing agents in Kenya lose money when they miss regulatory deadlines because they are tracking 20 shipments manually across WhatsApp and Excel"

If you cannot write the problem in one sentence — you do not understand it yet. Stop. Do not continue.

---

## RULE 2 — Who Feels It

**Question: Who specifically feels this pain?**

Name the exact person. Not "businesses" or "companies." A human being with a job title.

- What is their job title?
- What does their day look like?
- At what specific moment in their day do they feel this pain?
- Does it happen daily, weekly, monthly?

If the answer is vague — you do not have a customer yet. You have a guess.

---

## RULE 3 — Have You Spoken To Them

**Question: How many real people have confirmed this problem exists for them?**

| Number of conversations | What it means |
|---|---|
| 0 | You have an assumption. Do not build. |
| 1–2 | You have a hypothesis. Build only a landing page. |
| 3–5 | You have early signal. Build a prototype of one feature only. |
| 6–10 | You have validation. Start building the real product. |

**The conversation rule:** You are not allowed to pitch during these conversations.
You are only allowed to ask:
- "Walk me through how you currently handle this"
- "What went wrong last time? What did it cost you?"
- "What have you tried to fix it?"
- "If this was solved, what would that be worth to you?"

If they start asking about your solution before you mention it — you have found a real problem.

---

## RULE 4 — What Already Exists

**Question: What do people currently use to solve this problem?**

Every problem has a current solution — even if the solution is bad.
Find out what it is before you build.

- Is it Excel?
- Is it a WhatsApp group?
- Is it a person whose entire job is this?
- Is it an existing software?

If you cannot name the current solution — you have not done enough research.

If the current solution is "nothing" — ask yourself why. Either the problem is not painful enough to solve, or there is a real gap. Know which one.

---

## RULE 5 — Why Now and Why You

**Question: Why does this solution need to exist now? And why are you the one to build it?**

- Has something changed recently that makes this problem worse or more visible?
- Do you have specific knowledge, access, or relationships that give you an edge?
- Can someone else copy this in 3 months with more money?

If the answer to all three is "I don't know" — that is fine at this stage. But write it down. Come back to it.

---

## RULE 6 — The Smallest Possible Test

**Question: What is the smallest thing you can build or do in the next 7 days to find out if this is real?**

Options in order of effort:

| Test | Time | Cost | What it tells you |
|---|---|---|---|
| 5 conversations with target customers | 3–5 days | KES 0 | Whether the problem is real |
| A landing page with an email signup | 1 day | KES 0 | Whether people are interested |
| A one-page PDF or mockup | 2 hours | KES 0 | Whether the concept makes sense |
| A Google Form sent to 20 people | 1 hour | KES 0 | Basic market signal |
| Building the full product | Weeks | Real money | Nothing — too late to learn |

**The rule:** You are not allowed to jump to the bottom of this list without completing at least two items above it.

---

## RULE 7 — The Honest Numbers

**Question: Is there a real business here?**

Before building, answer these:

- How many potential customers exist in Kenya? (Be specific — not "thousands")
- What would you charge them per month?
- How many paying customers do you need to cover your costs?
- Is that number realistic given the market size?

Example check:
> "There are ~800 licensed clearing agents in Kenya. If I charge $150/month and need $3,000/month to break even, I need 20 paying customers. That is 2.5% of the market. That is achievable."

If the math does not work even in the best case — the idea does not work. Do not build it.

---

## RULE 8 — The Kill Conditions

**Question: What would make you stop?**

Write down right now — before you are emotionally invested — the conditions that would tell you this idea is not worth continuing.

Example kill conditions:
- "If I speak to 10 clearing agents and fewer than 3 say they have lost money to this problem in the last year — I stop."
- "If no one signs up to the landing page in 2 weeks — I stop."
- "If the first 3 paying customers churn in month 1 — I stop."

Writing these now means you will recognize the signal when it comes instead of rationalizing past it.

---

## THE CHECKLIST — Answer Before Claude Writes One Line of Code

- [ ] I can describe the problem in one sentence without mentioning my solution
- [ ] I have named the exact person who feels this pain, with a job title
- [ ] I have spoken to at least 3 real people who confirmed the problem
- [ ] I know what they currently use to solve it
- [ ] I have done the market size math and it works
- [ ] I have defined what would make me stop
- [ ] The smallest possible test has been run and returned positive signal

**If any box is unchecked — do not ask Claude to build. Ask Claude to help you check the box.**

---

## A NOTE TO CLAUDE

If Haji brings a new idea and this document exists in the project:

1. Read this document first
2. Ask Haji to answer the checklist above before writing any code
3. Challenge vague answers — do not accept "people need this" as validation
4. Your job in the brainstorm phase is to be a critic, not a builder
5. Only switch to builder mode when the checklist is complete

The most helpful thing Claude can do for an early idea is slow it down, not speed it up.
