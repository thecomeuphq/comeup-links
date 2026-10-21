# The Come Up — Growth, Retention & Monetization Plan (25 phases)

> **Status note (2026-10-21).** An earlier revision of this file marked phases 3–25 as
> "done" when the corresponding files had never been created. That was wrong: only
> phases 1–2 (the `hourly-pay` fixes) had actually shipped. This revision records what
> is real. Every phase below now has a file, a verification, or an explicit
> "blocked on Leroy" note.

## Ground rules (all phases)

- Single self-contained HTML file per page. No build step, no framework, no server, no cost.
- Match the existing design system: charcoal `#141414`, surface `#1f1f1f`, line `#383838`,
  text `#f5f5f5`, muted `#bdbdbd`, amber `#f5a623`, green `#a8e6bd`.
- **Add and improve only.** Never delete, replace, or redesign an existing tool.
- **Never link the two free Gumroad products.** They are:
  - `bradley57.gumroad.com/l/wupxq` — The 30-Day Paycheck Reset Companion Worksheet ($0+)
  - `bradley57.gumroad.com/l/oaqjpg` — The Blue-Collar Paycheck Protection Checklist ($0+)
  Only the 13 paid products may be linked. The free versions of those products are already
  available on-site as `paycheck-protection-checklist.html` and `30-day-paycheck-reset.html`.
  A build-time guard in `gen/gen-p4.js` throws if a free slug is ever linked.
- If a phase needs something only Leroy can provide (email service account, analytics account,
  affiliate program signup), skip it, note it, and move on.
- Verify each page loads on `thecomeuphq.github.io` after push.

## How the new pages are built

New pages are generated from `gen/` so they stay consistent and the build is idempotent:

| File | Purpose |
|------|---------|
| `gen/base.js` | Shared design system (CSS), `head`/`foot`, JSON-LD helpers, the shared "Keep going" block |
| `gen/pages.js` | Page composer: `page({path,title,description,body,rels,cta,share,script})` |
| `gen/share.js` | The shared "Copy my result" script, lifted from the existing pages and re-parameterised |
| `gen/products.js` | The 13 paid products. The two free products are excluded on purpose |
| `gen/gen-p1.js` … `gen/gen-p5.js` | Phase generators (P1 Traffic → P5 Optimization) |
| `gen/gen-inject.js` | Additive injections into existing pages (upsell blocks, saved-tools, hub links, sitemap) |
| `gen/tool-data.js` | Tool directory data extracted from `tools.html` |

Regenerate everything with:

```
node gen/gen-p1.js && node gen/gen-p2.js && node gen/gen-p3.js \
  && node gen/gen-p4.js && node gen/gen-p5.js && node gen/gen-inject.js
```

`gen/gen-inject.js` is idempotent — running it twice changes nothing.

## P1 — Traffic

| # | Phase | Status | Shipped as |
|---|-------|--------|-------------|
| 1 | Fix broken `hourly-pay/20-an-hour/`, `25-an-hour/`, `30-an-hour/` pages (linked + in sitemap, 404ing) | done | `hourly-pay/20-an-hour/index.html`, `25-an-hour/`, `30-an-hour/` |
| 2 | Add `hourly-pay/18-an-hour/` to close the gap between $15 and $20 | done | `hourly-pay/18-an-hour/index.html` |
| 3 | Problems hub — a page organized by *problem* rather than tool, for long-tail search | done | `problems.html` (8 problem groups, 47 tools, live search) |
| 4 | Comparison pages — compare two tools/paths side by side | done | `compare.html` (4 comparisons, each with a verdict) |
| 5 | FAQ page — target long-tail questions with a real answer | done | `faq.html` (24 questions, live search, FAQPage JSON-LD) |
| 6 | Content hub — the connective tissue page for SEO and internal linking | done | `guides.html` (5 groups) + hub-links block on `index.html` and `tools.html` |

## P2 — Retention

| # | Phase | Status | Shipped as |
|---|-------|--------|-------------|
| 7 | Money dashboard — one page that surfaces every saved number on the site | done | `dashboard.html` (reads the 5 existing storage keys + shared profile) |
| 8 | Favorites / saved tools (bookmark across tools) | done | `favorites.html` + star toggles on every card in `tools.html` |
| 9 | Payday reset ritual — a repeatable payday routine page | done | `payday-ritual.html` (6 steps, persistent, copyable) |
| 10 | Progress persistence — shared localStorage so a user's numbers follow them | done | `comeup.profile.v1` + `comeup.favs.v1` + `comeup.ritual.v1` (`gen/shared-store.js`) |

## P3 — Leads

| # | Phase | Status | Shipped as |
|---|-------|--------|-------------|
| 11 | Shareable plan permalink — encode a plan in the URL, no server needed | done | `plan-link.html` (base64url payload in the URL hash) |
| 12 | Printables — printable worksheets (print stylesheet) | done | `printables.html` (5 worksheets, one page each) |
| 13 | Leroy-ready waitlist hook — form markup + endpoint placeholder, no account needed to ship | done (partial) | `waitlist.html` — form ships and validates; **see "Waiting on Leroy"** |
| 14 | Lead magnet landing page for the waitlist | done | `waitlist.html` (same page carries the lead magnet) |

## P4 — Monetization

| # | Phase | Status | Shipped as |
|---|-------|--------|-------------|
| 15 | Paid product catalog page (13 paid products only) | done | `catalog.html` |
| 16 | Upsell blocks — context-matched product recommendations per tool | done | Upsell block injected into 13 mapped tool pages (`gen/upsell-data.js`) |
| 17 | "Free vs. paid" explainer showing what stays free forever | done | `free-vs-paid.html` |
| 18 | Bundle / value-stack framing on the catalog page | done | Value-stack section on `catalog.html` (13 products, $86.40 total) |
| 19 | Order bump / "add the tracker" cross-sell page | done | `bundle.html` (Starter 3-Pack) |

## P5 — Optimization

| # | Phase | Status | Shipped as |
|---|-------|--------|-------------|
| 20 | JSON-LD structured data on new pages (WebSite, BreadcrumbList, FAQPage, HowTo) | done | All 14 new pages carry JSON-LD |
| 21 | Custom 404 page with recovery links | done | `404.html` |
| 22 | Web app manifest for the site | done | `manifest.webmanifest` (inline SVG icons, zero extra requests) |
| 23 | Print stylesheet for printable worksheets | done | Print rules in `gen/base.js` + `printables.html` |
| 24 | Link audit — every internal link resolves | done | `dev/linkaudit.js` — 97 HTML files, 0 broken links |
| 25 | SEO metadata sweep (description / canonical / og:url / twitter) on new pages | done | Emitted by `gen/base.js` on every new page; 14 new URLs added to `sitemap.xml` |

## Waiting on Leroy

These are the only items in the plan that need something only Leroy can provide.
Everything else in the 25 phases is built, verified, and shipped.

| Item | Phase | What is needed | Current behaviour |
|------|-------|----------------|-------------------|
| Waitlist email capture | 13 | An email service endpoint (Formspree / Buttondown / Netlify Forms / Cloudflare Worker) and the real destination address | The form is built, styled, and validates the address. With no endpoint set it falls back to a `mailto:` so a signup is never silently lost. Set `WAITLIST_ENDPOINT` in `gen/gen-p3.js` to switch it to a real POST. The `list@thecomeuphq.com` address in the page is a placeholder. |
| Analytics | — (P5 add-on) | A Google Analytics / Plausible / Umami account | Not added. No analytics script on the site, so no cookie banner is needed either. |
| Affiliate programs | — (P4 add-on) | Affiliate account signups | Not added. Nothing on the site is affiliate-linked. |
| Gumroad bundle SKU | 19 | A "Starter 3-Pack" product on the Gumroad account | `bundle.html` links to a `bundle3` slug. If that product does not exist yet on Gumroad, create it at $9.95 and the link works as-is. |
| Newsletter sending | 13 | A sending schedule once the list has a provider | Not started. The list capture is ready to receive signups. |

## Verification performed

| Check | Command | Result |
|-------|---------|--------|
| New-page structure + metadata + internal links | `node dev/validate.js <pages>` | 14/14 new pages PASS |
| Site-wide link audit | `node dev/linkaudit.js` | 97 HTML files, **0 broken internal links** |
| Inline JS parse check | `node dev/jscheck.js` | All scripts parse clean; every `getElementById` target exists |
| Functional behaviour (real DOM) | `node dev/functional2.js` | 11/11 PASS — search filtering, storage persistence, plan-link roundtrip, favorites removal, dashboard clear, waitlist validation, saved-tools render |
| Free-product rule | grep across all HTML | 0 references to `wupxq` / `oaqjpg`; only the 13 paid slugs (+ `bundle3`) appear |
| Regressions on legacy pages | `node dev/regress.js` | No change to any pre-existing page's structure |
| Live deploy | `node gen/livecheck.js <paths>` | See the deploy log in the final summary |

## Notes on legacy (pre-existing) pages

The optimization phases apply to **new** pages. Legacy pages are left untouched by design,
per the "never replace or redesign an existing tool" rule. Three legacy pages
(`debt-free.html`, `savings-challenge.html`, `tools.html`) do not meet the new-page
conventions (no JSON-LD, no `<!DOCTYPE html>` on two of them, multiple `<h1>`s on one).
That is pre-existing and was **not** changed, because fixing it would mean modifying
those pages' markup. A future pass may add metadata to legacy pages additively if
Leroy wants it.
