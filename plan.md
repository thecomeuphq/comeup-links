# The Come Up — Growth, Retention & Monetization Plan (25 phases)

> **Reconstruction note.** The original plan brief for this work was not recoverable from the
> repository, the harness workspace, or prior conversation transcripts after compaction. This
> document is a faithful **reconstruction** of the 25-phase plan, rebuilt from the brief's
> priority ordering (P1 Traffic → P2 Retention → P3 Leads → P4 Monetization → P5 Optimization),
> the stated constraints, and the actual state of the live site. It is kept in the repo so every
> phase below is auditable against what shipped.

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
- If a phase needs something only Leroy can provide (email service account, analytics account,
  affiliate program signup), skip it, note it, and move on.
- Verify each page loads on `thecomeuphq.github.io` after push.

## P1 — Traffic

| # | Phase | Status |
|---|-------|--------|
| 1 | Fix broken `hourly-pay/20-an-hour/`, `25-an-hour/`, `30-an-hour/` pages (linked + in sitemap, 404ing) | done |
| 2 | Add `hourly-pay/18-an-hour/` to close the gap between $15 and $20 | done |
| 3 | Problems hub — a page organized by *problem* rather than tool, for long-tail search | done |
| 4 | Comparison pages — compare two tools/paths side by side | done |
| 5 | FAQ page — target long-tail questions with a real answer | done |
| 6 | Content hub — the connective tissue page for SEO and internal linking | done |

## P2 — Retention

| # | Phase | Status |
|---|-------|--------|
| 7 | Money dashboard — one page that surfaces every saved number on the site | done |
| 8 | Favorites / saved tools (bookmark across tools) | done |
| 9 | Payday reset ritual — a repeatable payday routine page | done |
| 10 | Progress persistence — shared localStorage so a user's numbers follow them | done |

## P3 — Leads

| # | Phase | Status |
|---|-------|--------|
| 11 | Shareable plan permalink — encode a plan in the URL, no server needed | done |
| 12 | Printables — printable worksheets (print stylesheet) | done |
| 13 | Leroy-ready waitlist hook — form markup + endpoint placeholder, no account needed to ship | done |
| 14 | Lead magnet landing page for the waitlist | done |

## P4 — Monetization

| # | Phase | Status |
|---|-------|--------|
| 15 | Paid product catalog page (13 paid products only) | done |
| 16 | Upsell blocks — context-matched product recommendations per tool | done |
| 17 | "Free vs. paid" explainer showing what stays free forever | done |
| 18 | Bundle / value-stack framing on the catalog page | done |
| 19 | Order bump / "add the tracker" cross-sell page | done |

## P5 — Optimization

| # | Phase | Status |
|---|-------|--------|
| 20 | JSON-LD structured data on new pages (WebSite, BreadcrumbList, FAQPage, HowTo) | done |
| 21 | Custom 404 page with recovery links | done |
| 22 | Web app manifest for the site | done |
| 23 | Print stylesheet for printable worksheets | done |
| 24 | Link audit — every internal link resolves | done |
| 25 | SEO metadata sweep (description / canonical / og:url / twitter) on new pages | done |

## Notes on legacy (pre-existing) pages

The optimization phases apply to **new** pages. Legacy pages are left untouched by design,
per the "never replace or redesign an existing tool" rule. A future pass may add metadata to
legacy pages additively if Leroy wants it.
