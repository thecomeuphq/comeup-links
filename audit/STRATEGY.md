# The Come Up — Strategy & Next Moves

**Date:** 2026-10-21 · **Repo:** `C:\Users\dawan\source\comeup-links-git` · **Live:** thecomeuphq.github.io/comeup-links
**Verified state:** `npm run audit:live` → **0 P0 · 0 P1 · 0 P2 · 97/97 live pages 200 · 13/13 Gumroad checkouts alive.**

---

## The position, in two sentences

The Come Up has a clean, audited, self-building product machine — 97 free
tools, a working revenue path, a build that cannot silently regress, and
recurring health checks that fire without being asked. What it does **not**
have is measurement: the analytics Worker is built, tested and ready, but
never deployed, so the site currently sends pageviews nowhere and no one
can tell which of the 97 pages earns money. The next hour of the
Commander's time is worth more spent deploying that Worker than on
anything else in this repo.

---

## The one thing that changes everything

Right now every decision about this site is a guess. Analytics is a
wired-but-dark instrument: the beacon is on all 97 pages, the Worker
handles it, the KV namespace will hold the numbers — but the endpoint is
empty, so nothing is sent.

That is the highest-leverage move available, and it is not close:

- **Cost:** ~30 minutes, free accounts only, no code changes needed.
- **Payoff:** every subsequent decision (which page to build, which tool
  to price up, where to put the newsletter) becomes measurable instead of
  arguable.
- **Risk:** low and bounded. An empty endpoint breaks nothing; the site
  works exactly as it does today.

The other three items are real but strictly downstream of this one. The
bundle SKU depends on knowing which product people actually land on. The
branded domain depends on having a list worth protecting. The waitlist
endpoint shares the same Worker, so it rides along free.

---

## Ranked next moves

| # | Move | Leverage | Time | Why this order |
|---|------|----------|------|----------------|
| 1 | **Deploy the Worker** (KV namespace → `wrangler.toml` → `SIGNUP_EMAIL` → deploy → set `ANALYTICS_ENDPOINT` → regenerate → push) | **Critical** | 30 min | Makes every other decision measurable. Nothing else can be ranked without it. |
| 2 | **Point the waitlist at the same Worker URL** | High | 5 min | Same URL, one config line, no extra deploy. Converts a `mailto:` fallback — where signups leak — into stored signups. Do it in the same sitting as #1. |
| 3 | **Create the Starter 3-Pack on Gumroad**, set `BUNDLE_SLUG` + `BUNDLE_PRICE`, prove a $0 checkout | High | 15 min | `bundle.html` is the comparison page and currently has no upsell. All 13 individual checkouts are alive — this adds the basket, it does not risk the revenue. |
| 4 | **Register `thecomeuphq.com` + branded sending** | Medium | Hours, and it costs money | Do it at ~500 signups, or when the first weekly newsletter lands badly. Not before. |
| 5 | **Read the first week of traffic data** and act on it | High | 20 min | This is only possible after #1. The output is one decision: which page deserves the next build hour. |

Full step-by-step for all of it, with copy-pasteable commands, is in
**`audit/OWNER-SETUP.md`**. The order there is the leverage order.

---

## What was actually wrong, and what it cost

Three defects, all silent — no error, no failed build, the site looked
healthy while money did not move. These are now fixed, and each fix is
guarded by a test that was proven to fail against the old code.

1. **Pageviews were never sent.** The beacon posted a Blob of type
   `application/json`. `sendBeacon` only accepts a CORS-safelisted
   content type, so the browser silently dropped every pageview. Now
   `text/plain`. The gate fails if any page regresses.

2. **The Worker called `.send()` on a secret string.** A Cloudflare
   `send_email` binding is an *object*; `SIGNUP_EMAIL` is a plain address
   *string*. The code used the string as though it were the binding, so
   every signup 500'd — after the lead was already lost. Now the binding
   `EMAIL` is the only thing `.send()` is called on.

3. **A waitlist signup could be counted as a pageview and never stored.**
   The form has two POST paths; they sent different payloads. One omitted
   the `type` field, and the worker routed on `payload.type` alone — so the
   visitor was told "You are on the list" and the lead was filed under
   pageviews. Fixed at both ends: the generator now sends
   `type: 'signup'`, and the worker recognises a signup by the *email it
   carries*, so a payload that loses its type is still a signup.

> **The transferable lesson:** for a lead-capture path, a success message
> to the user is not proof the lead was stored. Assert on the storage —
> the KV key — not on the HTTP 200.

Also fixed, in the same pass: the build was missing two post-processing
steps, so any regenerated page silently lost its `og:image`, JSON-LD and
share button while the build reported success. `gen/build-all.js` now
runs `dev/meta-inject.js` and `dev/share-inject.js` last, and the build
self-heals.

---

## Assumptions, and the cheapest test that kills each

| Assumption | Why it might be wrong | Cheapest kill-test |
|---|---|---|
| **Pageviews are the only thing the site is missing.** If traffic is not the constraint — if the pages are not being found at all — then analytics is measuring a leak that may be downstream of a bigger one. | The site may get its traffic from a source analytics cannot see (direct, a newsletter, a share link). | After the Worker is live, check `pageviewsToday` against a rough count of real visits. If they diverge wildly, analytics is under-counting and the leak is elsewhere. |
| **The 4 remaining items are genuinely owner-blocked.** If a build or a config change could close one, the guide is misleading. | The audit classifies by rule, and a rule can be wrong. | `npm run audit` prints the WIRE section with a `fix:` line for each. Spot-check one: item 2 needs a real Worker URL — there is no config that creates one. |
| **The 3-Pack will actually sell.** A bundle price set by gut feel can be wrong in either direction. | A discount too small is no reason to buy; too large cannibalises the individual sales that currently work. | After launch, compare the bundle's click-through and its price against the top individual product's price. The bundle should be the *cheapest* way to get the same three things — that is the whole offer. |
| **The site is stable enough to measure.** If a build regresses the site while data is being read, the data describes a broken site. | The build was exactly the kind of silent regressor that hid the three bugs above. | The build is now idempotent and the gate has 29 checks. `npm run precommit` before every commit. If a page loses `og:image` or its share button, the gate fails. |
| **Unconfigured analytics is the binding constraint on growth.** | The site may already have traffic and the constraint is that it earns nothing — a conversion problem, not a traffic problem. | Item 1 plus item 2 together answer this: a signup that lands in KV is a conversion. If signups stay at zero while pageviews climb, the problem is the offer or the traffic source, and this plan's ordering is still right because you learned which one. |

---

## What is already running

Two StarNet routines, both read-only — they never rebuild, never push:

- **Come Up site health** — daily 7:00 AM. Reports any P0/P1 with the
  exact fix command.
- **Come Up money path** — Monday 8:00 AM. Checks all 13 Gumroad
  checkouts and re-reports the owner-blocked list only when it changes.

Both prompts were rewritten this run to anchor the shell in the repo
folder and to forbid repeating a failed command — the daily job had tripped
the harness loop guard by retrying an identical command six times.

---

## The repo's own trap

A **stale copy** of this repo exists at `C:\Users\dawan\source\comeup-links`.
It is 12+ commits behind and its findings are wrong. Every command in
`audit/OWNER-SETUP.md` says `comeup-links-git` for that reason. Work only
in the `-git` folder.

The other standing rule: this is a **generator pipeline**, not hand-edited
HTML. `gen/worker/worker.js` is generated from a template inside
`gen/gen-analytics.js` — never hand-edit the generated file, edit the
generator and re-run it. `plan.md` is not the authority; `npm run audit` is.
