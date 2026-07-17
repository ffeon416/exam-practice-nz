# Study Ace — Business Plan

> **Working draft — v1.0 · July 2026**
> - Populated with **real Study Ace data** — financials pulled live from `/admin` (AI cost, traffic, usage) and Stripe; market figures cited from Education Counts / NZQA. Future rows are labelled as targets.
> - Owner: Ffeon Clifford · Co-founder: Rocco · Legal/financial account holder: Rowan Clifford (parent)
> - North star: **make Study Ace the biggest exam-prep app in the world.**

---

## 1. One-liner (elevator pitch)

Study Ace is an AI-powered NCEA exam-practice platform that generates unlimited NCEA-style practice exams, marks student answers honestly, and shows them exactly what to fix — so NZ students walk into the real exam prepared.

*Short version:* **"Unlimited AI practice exams that mark you honestly — so you actually know what you'd get before exam day."**

---

## 2. Executive summary

- **What we do:** Study Ace generates unlimited AI practice exams for NCEA students, marks every answer honestly, and turns the results into a personal study plan. It's live at studyace.co and on any phone as an installable app.
- **Who it's for:** NZ secondary students in Years 10–13 sitting NCEA Levels 1–3 (and Year 10 / CAA numeracy).
- **Why now:** AI is finally good and cheap enough to generate real-standard questions and mark working honestly for cents — while tutoring stays unaffordable and the NCEA Change Programme leaves students hunting for fresh, trustworthy practice.
- **Traction so far:** Live since April 2026 at studyace.co; 18 signups, **1 cash-paying customer (NZ$15/mo)**, plus 2 users on comped 100%-off access — the product works and has earned real money; the honest read is that acquisition, not conversion, is the bottleneck.
- **The ask:** Bootstrapped today. Open to a small angel / pre-seed or Young Enterprise–style backing to accelerate the marketing push — but not dependent on it.

---

## 3. The problem

NCEA students struggle to practise effectively because:
1. Revising is passive and has **no instant marking** — you can't tell if your answer would actually pass.
2. Tutors cost **$40–80/hour** and aren't available at 11pm before an exam.
3. Generic study apps aren't built for the **NZ NCEA system** (standards, Achieved/Merit/Excellence, cut scores).
4. **Re-reading notes feels productive but builds false confidence** — students think they understand a topic until they sit the real thing.

**Who feels this pain most:** students without a tutoring budget (especially lower-decile schools), students in subjects with few good resources, and anyone cramming alone the night before an exam.

---

## 4. The solution — Study Ace

A web app (also installable as a phone app / PWA) that:
- **Generates** unlimited NCEA-style practice exams on demand across 19 subjects, Levels 0–3.
- **Marks honestly** — 1 mark for correct working + 1 for the correct answer; wrong is wrong, no fake praise. Students get the actual mistake + the correct method.
- **Tracks weaknesses** and uses spaced repetition + adaptive difficulty to drill what each student is worst at.
- **Plans their study** week-by-week up to their exam date.
- **(Pro) AI tutor** for one-on-one help.

**Brand promise:** *brutally honest practice, so you're actually ready — not just feeling ready.* It never rewards a guess or a blank, and it names the real error — so nobody walks into the exam falsely confident.

---

## 5. Product overview

| Area | Detail |
|---|---|
| Subjects | 19 (maths, english, sciences, biology, chemistry, physics, statistics, history, geography, economics, accounting, te reo, health, etc.) |
| Levels | 0 (Y10 / CAA numeracy), 1, 2, 3 |
| Content | Unlimited AI-generated practice papers at the real NCEA standard |
| Platforms | Web (studyace.co) + installable PWA (home-screen app, no App Store cut) |
| Core tech | Next.js, AI (Claude) for generation + marking, Clerk auth, Supabase, Stripe |
| Key features | Practice exams, honest marking, spaced repetition, weakness analytics, adaptive difficulty, study planner, AI tutor (Pro), referrals |

**Roadmap / what's next:** more subjects & levels, mobile polish, engagement features (streaks/reminders), then expansion beyond NCEA to other exam systems (see §14).

---

## 6. Market

### Who the customer is
- **Primary:** NZ students Y10–13 (and their parents, who often pay).
- **Students are the core market and growth engine** — direct-to-student (B2C). Schools are only a possible future channel, not the focus.

### Market sizing (verified from official sources)
- **TAM — NZ secondary students (Years 9–13):** **~320,000** (secondary school roll ~318k in 2025, projected 320,721 in 2026 — Education Counts).
- **SAM — students studying toward NCEA each year (Years 11–13):** **~180,000** (NZQA 2024 Annual Report; Year 11 alone = 70,250 enrolled).
- **SOM — realistic 1–2yr capture:** **0.5–2% of the NCEA cohort ≈ 900–3,600 paying students** (planning assumption, not an official stat).

> Sources: [Education Counts — school-roll projections](https://www.educationcounts.govt.nz/statistics/national-school-roll-projection) · [NZQA 2024 Annual Report on NCEA, UE & Scholarship data](https://www2.nzqa.govt.nz/about-us/news/nzqa-releases-2024-ncea-attainment-data/). NZ is the beachhead — the same model extends globally to other exam systems (see roadmap).

---

## 7. Business model & pricing

**Model:** freemium subscription (SaaS), **direct-to-student**. Monthly + annual plans. No cart, no one-off purchases.

| Tier | Price (NZD) | Yearly (30% off) | What they get |
|---|---|---|---|
| **Free** | $0 | — | 2 exams/week, maths + english only, 8 Qs max, no tutor |
| **Student** | $15/mo | $126/yr | 20 exams/week, all 19 subjects, spaced repetition, study planner, deep essay marking |
| **Pro** | $20/mo | $168/yr | Unlimited exams, AI tutor (100 msgs/wk), adaptive difficulty, everything in Student |

Additional revenue paths:
- **Annual plans** — 30% off, paid upfront (better cash flow + retention).
- **Referral-driven growth** — near-zero customer acquisition cost as students bring students.

**Why these prices:** cheaper than a *single* hour of tutoring per month, anchored well below any human tutor, and priced so a student can pay from pocket money — while the AI cost per user is only a dollar or two, leaving 80–90%+ gross margins.

---

## 8. Traction & current metrics

*(Snapshot — update each time. Current figures from live prod.)*

| Metric | Value | As of |
|---|---|---|
| Total signups | 18 | Jul 2026 |
| Cash-paying customers | 1 (Student, NZ$15/mo) | Jul 2026 |
| Users on paid tiers | 4 in DB = 1 paying + 2 comped (100% off) + 1 test account | Jul 2026 |
| Gross MRR (cash) | NZ$15 | Jul 2026 |
| Lifetime cash revenue | NZ$15 | Jul 2026 |
| Free → paid conversion | ~6% (1 of 18) | Jul 2026 |
| Traffic (last 30d) | 548 page views · 159 unique visitors | Jul 2026 |
| Top regions | NZ 55% · AU 20% · rest 25% | Jul 2026 |
| Activation | 10 of 18 users have ever sat a practice exam | Jul 2026 |
| Practice exams sat | 33 all-time · 6 in the last 30 days | Jul 2026 |
| Live since | studyace.co, custom domain | Apr 2026 |

**Proof points / milestones hit:** shipped a full working product solo; first cash-paying customer converted at full price; live custom domain + real payments running on Stripe live mode; own first-party analytics + funnel in /admin; **159 unique visitors in the last 30 days**; 33 practice exams sat all-time across 10 users; product marks honestly.

**What the numbers don't yet show (stated plainly):** growth has stalled — signups by month run Apr 10, May 2, Jun 5, Jul 1, and most of April's are the founder's own test accounts. Only 6 exams were sat in the last 30 days. A 55-seat school pilot code (Te Kura) was issued but has had **zero real student redemptions** and expires 4 Aug 2026. The single paying customer proves people *will* pay; nothing yet proves they can be reached at scale. That is exactly what the marketing push is for.

---

## 9. Go-to-market & marketing

### Channels (ranked by current focus)
1. **Short-form social (TikTok / Reels)** — study tips, NCEA hacks, "study with me" content driving signups. *(Attribution survey + funnel already built to track which videos convert.)* → **hiring a video editor now.**
2. **Referral program** — students refer friends; referee gets 5 bonus exams, referrer gets 14 days of Student tier. Built-in and live.
3. **Student ambassadors** — students with a following post + drop their referral link (rewards already built in).
4. **SEO / blog** — MDX blog at studyace.co/blog targeting NCEA search terms.
5. **Paid ads** — layer in once the free→paid funnel reliably converts (so spend is profitable, not guesswork).

### Marketing plan
- **Next 3 months:** hire the video editor, post short-form daily, switch on the referral flywheel, and push toward 100 paying.
- **Budget:** $0 today (no paid editor yet; Vercel/DB on free tiers). Budgeting ~$300/mo once we hire the video editor.
- **Target:** 1,000 signups · 100 paying · $2k MRR (Phase 1).

> ⚠️ Timing matters: NCEA exams run Nov–Dec. Demand spikes ~Sept–Nov. Plan the push around this.

---

## 10. Competition

| Competitor | What they do | Our edge |
|---|---|---|
| Private tutors | 1:1 help, ~$40–80/hr | Always available, fraction of the price, honest AI marking |
| StudyTime / NZ study sites | Free notes & videos | We give *active practice + marking*, not passive notes |
| Generic AI (ChatGPT) | Can answer questions | Built for NCEA standards + grading, structured practice, honest-marking guardrails |
| LearnCoach / video-lesson sites | On-demand NCEA video lessons | We give unlimited *practice that marks itself*, not lessons to watch |

**Our moat / why we win:** purpose-built for NCEA, an honest-marking brand students trust, unlimited instant practice, pocket-money pricing, and a first-mover position on AI-for-NCEA that compounds as more students use it.

---

## 11. Team

| Name | Role | Responsibilities |
|---|---|---|
| Ffeon Clifford | Founder / product & engineering | Builds the product end to end, sets direction |
| Rocco | Co-founder / growth & marketing | Short-form content, social, getting Study Ace in front of students |
| Rowan Clifford | Parent / legal & financial account holder | Stripe/banking, contracts (Ffeon is a minor) |
| Video editor | Marketing / content (hiring now) | Short-form video for TikTok / Reels |

**Advisors / gaps to fill:** a marketing mentor, and subject/teacher advisors as the product scales into new curricula.

---

## 12. Operations & technology

- **Hosting/infra:** Vercel (studyace.co), Supabase (database), Clerk (auth), Stripe (payments), Claude API (AI).
- **Key running dependencies:** AI API usage (main variable cost), hosting, domain.
- **Data & privacy:** first-party analytics, input-masked session recording, privacy policy live. Students are minors — no typed answers/passwords are ever stored in recordings. Compliant with the **NZ Privacy Act 2020**.
- **Reliability standard:** polished, no glitches — paid product for students, first impressions matter.

---

## 13. Financial plan

### Unit economics (per subscriber, NZD)
> Net after fees = gross × 0.82 (Stripe ~3% + GST 15%). AI cost is the main variable cost per active user. **AI figures are real, pulled from `/admin` — total AI spend was just NZ$3 across all users in the last 30 days.**

| Tier | Price/mo | Net after fees (×0.82) | AI cost/user/mo (real) | Gross margin/user |
|---|---|---|---|---|
| Student | $15.00 | $12.30 | ~$0.30 | ~$12.00 (98%) |
| Pro | $20.00 | $16.40 | ~$1.00 | ~$15.40 (94%) |

### Monthly running costs (real, last 30 days)
| Item | Cost/mo (NZD) |
|---|---|
| Hosting (Vercel) | $0 (free tier) |
| Supabase | $0 (free tier) |
| Clerk | $0 (free tier) |
| Domain ($30/yr) | ~$2.50 |
| AI API (variable) | ~$3 |
| Marketing (editor, ads) | $0 (none yet) |
| **Total** | **~$6** |

### Revenue projection *(now = real; future = targets, aligned to the roadmap)*
| Month | Free users | Paying users | Gross MRR | Costs | Profit/(loss) |
|---|---|---|---|---|---|
| Now | 14 | 1 (+2 comped) | $15 | ~$6 | +$9 |
| +3 mo | ~350 | 40 | ~$720 | ~$400 | +$320 |
| +6 mo | ~900 | 100 | ~$1,800 | ~$600 | +$1,200 |
| +12 mo | ~9,000 | 1,000 | ~$18,000 | ~$2,500 | +$15,500 |

- **Break-even:** costs are only ~NZ$6/mo, so the single cash customer already covers them — Study Ace is **cash-positive today** (NZ$15 in vs ~NZ$6 out). Break-even rises to ~25 paying once a video editor (~$300/mo) is hired. The real job now is converting free users → paid, not cost control.
- **GST note:** NZ GST registration is required once turnover exceeds **$60,000/yr** — track this; not there yet but plan for it.

---

## 14. Milestones & roadmap

**North star: make Study Ace the biggest exam-prep app in the world.** Student-led, direct-to-student. Each phase is roughly 10× the last.

| Phase | Fixed goal | Focus | When |
|---|---|---|---|
| **1 · Prove the engine** | 1,000 signups · 100 paying · $2k MRR | Nail student growth: hire editor, post short-form daily, referral flywheel, tighten free→paid | 2026 |
| **2 · Own New Zealand** | 10,000 signups · 1,000 paying · $20k MRR | #1 NCEA app in NZ; dominate NCEA TikTok; student ambassadors; break even | 2026–27 |
| **3 · Go global** | 100,000 users · 10,000 paying · $200k MRR | Beyond NCEA: launch AU (ATAR/HSC), UK (GCSE/A-Level); multi-curriculum AI | 2027–28 |
| **4 · Biggest in the world** | 1M+ users · 100k+ paying · $2M+ MRR | Every major exam system; the default AI study app worldwide; profitable at scale | 2028+ |

---

## 15. Risks & mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| AI marks something wrong → loses trust | Med | Honest-marking guardrails, hedge/blank = 0, continuous prompt improvement |
| AI API costs rise / heavy users unprofitable | Med | Usage caps per tier, real-time cost tracking in /admin, provider flexibility |
| Low conversion free → paid | Med | Referrals, paywall tuning, tracked funnel in /admin |
| Founder is a minor (banking/contracts) | Ongoing | Parent (Rowan) is legal account holder |
| Seasonality (demand spikes at exams) | High | Streaks, reminders and term-time revision features build a year-round habit |
| Platform dependency (AI provider / hosting) | Low–Med | Abstracted provider layer; can switch AI model or host if needed |

---

## 16. Funding / the ask

- **Are we raising?** Not actively — bootstrapped, with real costs of only ~NZ$6/mo. Revenue is early (NZ$15/mo from the first cash customer); the focus is proving the growth engine, not raising.
- **Open to:** a small angel / pre-seed (~$10–30k) purely to accelerate marketing (video content + paid ads once the funnel converts) — optional, not required.
- **Non-cash support that helps:** a marketing mentor, angel/creator intros, and competition backing (e.g. Young Enterprise Scheme).

---

## 17. Appendix

- Live product: https://studyace.co
- Blog: https://studyace.co/blog
- To add as captured: demo video, student testimonials, product screenshots, detailed financial model.

---

*Study Ace — Business Plan. Financial figures marked (est.) should be confirmed from /admin; market figures are cited from Education Counts / NZQA.*
