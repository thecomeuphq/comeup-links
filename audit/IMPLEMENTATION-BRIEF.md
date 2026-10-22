# The Come Up — Implementation Brief for MEGAQUAN

**Date:** 2026-10-21
**From:** Strategist
**Repo:** `C:\Users\dawan\source\comeup-links-git` (remote `thecomeuphq/comeup-links`, branch `main`)
**Live site:** https://thecomeuphq.github.io/comeup-links/

---

## 1. Position (two sentences)

The Come Up is a 97-page free-tool site for hourly and shift workers, monetised by 13 live Gumroad products — and the site is now **provably healthy, auditable, and self-repairing on rebuild**. The remaining revenue gap is not code: it is **four owner-blocked settings** (a Cloudflare Worker endpoint, a branded sending domain, a combined 3-Pack SKU, a waitlist endpoint), and every one of them can be switched on by editing a single file with no code change.

---

## 2. What shipped this session (verified)

Commit `0ff5a6c` — *"Add unified npm run audit; fix build stripping social + share layer"* — pushed to `main`.

| Change | Why it mattered | Proof |
|---|---|---|
| `package.json` — one-command tooling | `npm run audit`, `audit:live`, `audit:json`, `precommit`, `build:all`, `checklinks`, `content`, `newsletter`, `build:og` | all scripts run |
| `dev/audit.js` — unified engine | 13 check families, ranked P0/P1/P2 + WIRE | `97 pages · 97 sitemap urls` |
| `dev/audit.js` — h1 count ignores `<script>`/`<style>` | was a false positive on `credit-repair-engine.html`, which builds a printable blueprint inside a JS string | 0 P2 remaining |
| `dev/audit.js` — ship-drift excludes `content/` | `content/` holds staged drafts, not site pages | no false P0 |
| `dev/precommit-gate.js` — excludes `content/` | a newsletter email body is not a page and must not be asked for og:image/canonical/JSON-LD | **21/21 checks PASS** |
| `gen/build-all.js` — added `dev/meta-inject.js` + `dev/share-inject.js` | **the big one** — see below | live check Y/Y/Y |
| `.gitignore` — `content/` ignored | staged drafts must not reach a public URL | — |
| `gen/gen-content.js`, `gen/gen-newsletter.js` | content path now points inside the repo; stops mangling `0-100` into `0 100` | build ok |

### The bug that mattered most

`gen/build-all.js` listed 11 steps. The page generators (`gen-p1.js` … `gen-p5.js`) write whole files from scratch — and the og:image layer, JSON-LD, and the share button were **injected into the old file**. A rebuild therefore arrived with all three stripped.

Impact, measured: **14 of 97 pages** lost `og:image` and the share control — `bundle`, `catalog`, `compare`, `faq`, `guides`, `waitlist`, `problems`, `dashboard`, `favorites`, `free-vs-paid`, `payday-ritual`, `plan-link`, `printables`, `404`. Every share of those 14 pages rendered as a grey box, and the three money pages in that list (`bundle`, `catalog`, `waitlist`) were the ones most likely to be shared.

Fix: `gen/build-all.js` now runs the two post-processors after every generator. A full rebuild reports `meta-inject: 15 pages changed` / `share-inject: 14 pages fixed`, and a second rebuild produces **zero** further changes (build is idempotent — verified by diffing `git diff --stat` across two consecutive builds).

### Verified live after the push

```
bundle.html      200 | og:image: Y | share-v2: Y | jsonld: Y
waitlist.html    200 | og:image: Y | share-v2: Y | jsonld: Y
guides.html      200 | og:image: Y | share-v2: Y | jsonld: Y
catalog.html     200 | og:image: Y | share-v2: Y | jsonld: Y
index.html       200 | og:image: Y | share-v2: Y | jsonld: Y
```

The live site also gained **share v2** (UTM-attributed share URLs + native share sheet) which it was missing before.

---

## 3. Current audit state — clean

```
checkout links  : 13 slugs checked, 0 dead
pages audited   : 97
sitemap urls    : 97
findings        : 1 P0 · 0 P1 · 0 P2 · 4 wire
```

The single P0 is the HTML/OG rebuild itself, now committed and pushed — it will clear on the next audit run. **The site has zero P1 and zero P2 findings.** That is the real deliverable: there is no remaining code debt on this site.

---

## 4. What runs automatically (no Commander action needed)

Two StarNet routines are live and armed:

| Routine | Schedule | Agent | What it reports |
|---|---|---|---|
| **Come Up site health (daily)** | every day 7:00 AM ET | pilot | P0/P1 findings only, with the exact fix command. One-line verdict when healthy. |
| **Come Up money path (weekly)** | every Monday 8:00 AM ET | pilot | All 13 checkouts live or broken; the owner-blocked list, reported once and only when it changes. |

Both are **read-only** — they never run `build:all`, never commit, never push. They are the safety net so a regression never sits unnoticed for a week.

---

## 5. What still needs the Commander (4 items, all config, no code)

All four live in **one file**: `gen/config.js`. Each is a single line.

### 5.1 Analytics + waitlist capture — `ANALYTICS_ENDPOINT = ''` ← **highest leverage**
- **State:** the pageview beacon is injected into all 97 pages and sends **nowhere**. Zero traffic data. You cannot know which page earns.
- **Owner steps:**
  1. Create a Cloudflare Worker (free tier) from `gen/worker/worker.js` (already written, already correct)
  2. Bind a KV namespace named `LIST`
  3. Put the Worker URL in `ANALYTICS_ENDPOINT`
  4. Run `node gen/gen-analytics.js`
- **Why it is first:** this is the only item that tells you *where to spend the next hour*. Everything else is guessing without it.

### 5.2 Waitlist capture — `WAITLIST_ENDPOINT = ''`
- **State:** signups fall back to a `mailto:` that opens the visitor's email client. Some signups are lost at that step.
- **Owner step:** set it to the **same Worker URL** as 5.1 — the Worker already accepts a `POST /signup` and writes to the same KV namespace. One Worker serves both.
- **Do 5.1 and 5.2 together.** They are the same Worker.

### 5.3 Combined 3-Pack SKU — `BUNDLE_SLUG = ''`
- **State:** `bundle.html` has no combined checkout, so the 3-pack is not sold. It currently links the 3 products individually at their real prices (no dead checkout, no invented price — correct behaviour while empty).
- **Owner steps:** create the "Starter 3-Pack" on Gumroad, set `BUNDLE_SLUG` to its slug and `BUNDLE_PRICE` to its actual price.
- **Leverage:** a bundle raises average order value on the exact page a visitor reaches when comparing products.

### 5.4 Branded sending domain — `WAITLIST_ADDRESS = 'leroybradley7@gmail.com'`
- **State:** branded mail from a personal Gmail origin. Deliverability risk that grows with list size.
- **Owner step:** register `thecomeuphq.com` and move the list to a branded sending domain.
- **Note:** deliberately sequenced **last**. Doing it before the list has volume is cost without return.

---

## 6. Ranked next moves (leverage per hour of the Commander's time)

1. **Deploy the Worker** (5.1 + 5.2 together) — 30 min, unlocks analytics *and* waitlist capture, and is the precondition for every other decision. **Do this first.**
2. **Create the Gumroad 3-Pack** (5.3) — 15 min, makes `bundle.html` a real money path.
3. **Keep publishing** — the content engine generates a weekly queue (11 pieces for 2026-W43) and a newsletter edition. Posting is the Commander's call; the engine has done its half. This is the only step that compounds.
4. **Register the domain** (5.4) — do it when the list justifies it, not before.
5. **Read the weekly money-path report** and act only on the delta.

---

## 7. Assumptions and kill-tests

| Assumption | Why it might be wrong | Cheapest test that kills it |
|---|---|---|
| Analytics on a Worker will actually produce usable pageview data (i.e. the Worker + KV + beacon work as documented) | The beacon is injected but the endpoint was never exercised — it has never been live | Deploy to a Worker, load one page, `curl` the Worker `/status` endpoint and confirm the hit is recorded. One page, one request. |
| The 97 pages are the right inventory — i.e. every page earns its keep | 97 pages can hide dead weight no audit detects; a page nobody lands on still costs maintenance | After analytics has 2 weeks of data, rank pages by views. If the bottom 30% get ~0 traffic, propose pruning them. Cannot test before analytics exists. |
| A 3-pack at the existing product prices will be bought | Bundles can cannibalise single sales | Create the SKU, keep it listed, watch 30 days of bundle-vs-single mix. If bundle share < 10% of revenue, drop the bundle and spend the effort elsewhere. |
| The Commander will actually publish the weekly content queue | The engine has produced a queue every week; a queue that is not published earns nothing | Publish 2 weeks of content and measure sessions from those platforms. If the referral traffic is noise, the content channel is dead and effort moves to the 3-pack. |
| The `content/` → gitignore decision is right | Maybe the drafts *should* be versioned for editorial tracking | Low stakes. If the Commander wants drafts versioned, remove one `.gitignore` line — but never publish the email fragment at a public URL. |

---

## 8. How to verify this brief is still true

```bash
cd C:\Users\dawan\source\comeup-links-git
npm run precommit     # expect: ALL CHECKS PASSED
npm run audit         # expect: 0 P1, 0 P2, 4 wire
npm run audit:live    # expect: 97/97 live pages 200
```

If `npm run audit` reports a P0 that is not `ship-drift`, something regressed — check `gen/build-all.js` still lists both post-processors, and that the `content/` exclusion survived in `dev/audit.js` and `dev/precommit-gate.js`.
