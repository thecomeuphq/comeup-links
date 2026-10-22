# Opportunity Ranking

**Date:** 2026-10-21
**Scored against:** `audit/ASSET-AUDIT.md` (verified assets only)

## Scoring method

Each opportunity is scored 1–5 on the four axes the Commander named, plus two axes that decide survival rather than growth. **Weighted score** is the honest sort key.

| Axis | Weight | What 5 means |
|---|---|---|
| Startup cost | 20% | $0 and no approval needed |
| Time to revenue | 25% | First dollar in under 2 weeks |
| Automation potential | 20% | Recurs with near-zero human minutes |
| Scalability | 15% | Revenue not capped by the Commander's hours |
| **Defensibility** | 10% | A competitor cannot copy it in a weekend |
| **Recurring revenue** | 10% | Renews, rather than being one more sale |

**Cost/duration scores are inverted** (5 = cheapest / fastest) so higher is always better.

---

## The opportunity list

### 1. Deploy the measurement + waitlist worker, then run the funnel that already exists

*Deploy `gen/worker/worker.js` to Cloudflare; set `ANALYTICS_ENDPOINT`; capture the waitlist; publish the content queue.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **5** | $0 — Cloudflare free tier. Code is already written and syntax-verified. |
| Time to revenue | **5** | The product page and checkout already exist. Traffic is the only missing input, and traffic only needs *some* measurement to optimize. |
| Automation potential | **4** | The content engine, the share loop, and the newsletter generator all run unattended. |
| Scalability | **3** | Traffic acquisition still needs human attention. |
| Defensibility | **3** | A first-mover list is a moat; the tooling is copyable. |
| Recurring revenue | **5** | An owned email list with a weekly newsletter is the highest-quality recurring asset in the plan. |

**Weighted: 4.25** ← **#1**

**Why it wins:** every other opportunity on this list is *downstream* of this one. Without pageview data, CAC is unknowable. Without an email list, there is no recurring revenue. Without a waitlist endpoint, the 97 pages are a donation. This is the single highest-leverage $0 action available, and the code is 3,129 bytes that already parse.

**Second-order benefit:** the Worker handles both `/event` and `/signup` from one endpoint — measurement and list-capture in a single deployment.

---

### 2. Niche social distribution using the in-repo content engine

*Publish the 11 pieces/week the engine already generates. Target the hourly-worker audience the site actually serves.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **5** | $0. TikTok/Reddit/Facebook accounts are free. |
| Time to revenue | **4** | 2–4 weeks — the engine produces a week of ready-to-record scripts in 60 seconds. |
| Automation potential | **4** | 11 pieces/week generated automatically; recording is the human bottleneck. |
| Scalability | **5** | This is the only axis where output is decoupled from the Commander's hours. |
| Defensibility | **2** | Content is copyable; the *list* is not. |
| Recurring revenue | **3** | Social feeds a list; it isn't the recurring asset itself. |

**Weighted: 3.90** ← **#2**

**Why it ranks second, not first:** it is the only path to enough traffic to make #1 measurable — but running it before #1 means flying blind. Sequenced *after* #1, it becomes a feedback loop: publish → measure → adjust.

**Critical catch:** the existing TikTok (`@bgcollections2k24`, 2,412 followers) is a **gaming** account. Its audience does not overlap the site's buyers. It is not a distribution asset for this business. Either start a niche account or accept that a new account needs to earn reach from zero.

---

### 3. Own the domain and convert traffic to a branded, self-hosted funnel

*Register `thecomeuphq.com`; redirect `github.io`; move the list to a branded sending domain.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **3** | ~$12/yr — the only line item on this list that touches the Commander's money. **Requires approval.** |
| Time to revenue | **3** | 1–2 weeks including DNS, Pages custom-domain config, and re-pointing every canonical/OG/share URL. |
| Automation potential | **4** | One-time setup, then permanent. |
| Scalability | **4** | Every future link, email, and share is branded automatically. |
| Defensibility | **4** | The domain is the one asset a competitor cannot take. |
| Recurring revenue | **4** | A branded list is materially more valuable than a `github.io` list. |

**Weighted: 3.55** ← **#3**

**Why it makes the list:** `thecomeuphq.com` is NXDOMAIN, and it is *load-bearing* for two things at once — trust (a `github.io` link reads as a hobby project) and email deliverability (you cannot send branded email from a `github.io` origin). Every other item in the plan is more valuable with it and some are impossible without it.

**Note:** because it is the only spend, it is sequenced *after* the $0 P0s are proven, and it goes to the Commander for approval with a price before it is bought.

---

### 4. Product-price and bundle optimization

*Fix `BUNDLE_SLUG`, price-test the 13 products, add the 13-page upsell block to the remaining 84 pages.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **5** | $0. |
| Time to revenue | **4** | 1–2 weeks; `gen/upsell-data.js` already maps 11 tools → 11 paid products. |
| Automation potential | **4** | The upsell engine exists and is data-driven. |
| Scalability | **2** | Revenue is capped by traffic and AOV, not by leverage. |
| Defensibility | **1** | Anyone can copy a price. |
| Recurring revenue | **2** | One-off sales. |

**Weighted: 3.25**

**Why it doesn't rank higher:** it multiplies existing traffic rather than creating any, and it produces no recurring revenue. But it is the highest-ROI *lever on existing traffic* — the 13 upsell blocks currently sit on 13 of 97 pages, and `bundle.html` currently has no combined checkout at all (`BUNDLE_SLUG` is empty).

---

### 5. Products 2.0 — convert the best tools into a subscription

*Turn the 13 one-off printables into a membership: weekly paycheck content, a monthly planner, community.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **4** | $0 to launch; the content engine already produces a weekly cadence. |
| Time to revenue | **2** | 6–10 weeks — needs a real list (from #1) and trust (from #3) first. |
| Automation potential | **5** | The single best candidate for routine-driven delivery. |
| Scalability | **5** | Recurring revenue decouples from hours. |
| Defensibility | **4** | A habit and a list are sticky. |
| Recurring revenue | **5** | This *is* recurring revenue. |

**Weighted: 3.95** — **highest raw score of the recurring-revenue candidates, but sequenced last.**

**Why it ranks #5 despite scoring 3.95:** it is not a starting point, it is a *destination*. A subscription sold to a list of zero people at a `github.io` URL is worse than no subscription. It becomes the #1 opportunity the moment #1–#3 are done. **It is the moat, not the first move.**

---

### 6. Second niche — construction receivables (`rivetdue.html`)

*The `rivetdue` product already exists, has its own OG card, and targets 5–50-person subcontractor firms.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **3** | $0 technically, but a *separate* site, funnel, and brand is a real time cost. |
| Time to revenue | **2** | 8+ weeks — B2B sales cycles are slow, and there is no existing list to warm. |
| Automation potential | **3** | Lead-gen is automatable; closing is not. |
| Scalability | **3** | Moderate. |
| Defensibility | **3** | A niche tool helps. |
| Recurring revenue | **2** | Not inherently recurring. |

**Weighted: 2.60**

**Why it ranks here:** it is currently a **liability** sitting inside the main site's sitemap, diluting the topical signal of 97 blue-collar-personal-finance pages with a construction-B2B page. Fix the signal before investing in the niche. Recommendation in Phase 2.

---

### 7. Owned-audience play on the existing gaming TikTok

*2,412 followers already exist. Monetize them with something adjacent.*

| Axis | Score | Why |
|---|---|---|
| Startup cost | **5** | $0. |
| Time to revenue | **3** | Uncertain — depends on whether the audience tolerates a pivot. |
| Automation potential | **3** | Content is manual, but cheap. |
| Scalability | **2** | Single platform, single account, algorithm-dependent. |
| Defensibility | **1** | The audience can vanish on a ban; it is not truly owned. |
| Recurring revenue | **1** | None. |

**Weighted: 2.55**

**Why it ranks here:** it is a genuinely *free option* — 2,412 real people, already earned. But the platform risk is severe and the audience/product fit is poor. It is worth a cheap test (one video, one link, 30 days) and not worth a strategy.

---

### 8. Faceless AI-business content (`empire-roadmap.html`, `viral-ai-business-playbooks.html`)

| Axis | Score | Why |
|---|---|---|
| Startup cost | **4** | $0. |
| Time to revenue | **2** | Slow, and depends on ad spend or slow organic growth. |
| Automation potential | **3** | AI-slop automation is easy; it is the *content* that is commoditized. |
| Scalability | **3** | Moderate. |
| Defensibility | **1** | No moat whatsoever. |
| Recurring revenue | **1** | None. |

**Weighted: 2.30**

**Why it ranks here:** it is the *lowest-quality traffic* the site can buy. Faceless AI-business content attracts other content creators, not paycheck-tool buyers — and it directly contradicts the site's own brand voice, which the repo's linter enforces. It also splits the topical signal.

---

## Ranked summary

| # | Opportunity | Cost | Time→$ | Auto | Scale | Defend | Recur | **Weighted** | Sequenced |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Deploy measurement + waitlist worker, run the existing funnel | 5 | 5 | 4 | 3 | 3 | 5 | **4.25** | **Now** |
| 2 | Niche social distribution via the content engine | 5 | 4 | 4 | 5 | 2 | 3 | **3.90** | Week 2 |
| 3 | Own the domain, brand the funnel | 3 | 3 | 4 | 4 | 4 | 4 | **3.55** | Week 2–3 (approval) |
| 4 | Product price + bundle optimization | 5 | 4 | 4 | 2 | 1 | 2 | **3.25** | Week 3 |
| 5 | Products 2.0 — subscription membership | 4 | 2 | 5 | 5 | 4 | 5 | **3.95** | **Month 2+** |
| 6 | Second niche — construction receivables | 3 | 2 | 3 | 3 | 3 | 2 | **2.60** | Decide now, build later |
| 7 | Monetize the existing gaming TikTok | 5 | 3 | 3 | 2 | 1 | 1 | **2.55** | Cheap test only |
| 8 | Faceless AI-business content | 4 | 2 | 3 | 3 | 1 | 1 | **2.30** | **Cut** |

**Note on #5:** it scores 3.95, above #3 and #4. The ranking is *weighted by dependency*, not just score — #5 is impossible before #1 and #3, so it is sequenced last even though its standalone score is high. Sorting purely by score would be a mistake.

---

## The single insight

Five of the eight opportunities are **already built**. The content engine, the newsletter generator, the share loop, the OG layer, the upsell engine, the analytics worker, 13 live products, 97 live pages.

The binding constraint is not what gets built. It is that **nothing is connected to anything**: no endpoint, no domain, no list, no channel, no data. The gap between what the Commander has and what the Commander is earning is entirely a *wiring* gap — and wiring is $0.

**Rank order follows wiring, not imagination.**

---

*Next: `TOP-3-SELECTION.md` — the top 3 with revenue model, risks, and automation.*
