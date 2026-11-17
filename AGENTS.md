# Agent rules for thecomeuphq/comeup-links

This file holds only the judgment calls that a linter cannot fully enforce.
Automated checks (link health, secret scanning, banned strings) live in
`.github/workflows/` and should be added as a PR — do not enable them by
pushing straight to `main`.

`main` deploys to GitHub Pages (thecomeuphq.com). Treat every merge as a
production deploy.

## Do not ship without Leroy's OK

Nothing goes live, and nothing merges to `main`, without Leroy's explicit
OK. That includes redesign pages, generator rebuilds, and "tiny" copy
fixes. If you are unsure, stop and ask.

Do not change branch protection, Pages settings, or repository settings.
Propose the change; Leroy applies it.

## Fresh main, not a stale clone

Edit from a fresh `origin/main`. Do not patch a leftover local folder
(for example an old `comeup-links-live` checkout). If your clone might be
stale, fetch and start over before you touch a file.

## The maker does not verify its own work

The agent (or person) who made the change is not the checker. A separate
agent or Leroy verifies, including clicking links and checking that
claimed prices, features, and results still match the live source. A
screenshot or note from the author is not verification.

## Do not invent prices, features, or results

If you cannot open the source and confirm a price, feature, or outcome,
do not put the number or claim on the page. Shop prices must be re-checked
on the merchant's own page the day they are written, and dated. Calculator
examples must be labeled as examples. Third-party case-study figures stay
attributed and are never implied to be The Come Up HQ's results.

## Public branding is The Come Up HQ only

Do not add employer, workplace, city, or job details, and do not add
personal mailboxes or personal account names. Credit public work to
"The Come Up HQ" only, not to any person's job, any tool, or any agent.
The known identifiers were removed from published pages in Nov 2026, and
`scripts/check-banned-strings.sh` now fails a PR that puts them back. The
check stores those identifiers only as SHA-256 hashes so the public repo
does not repeat them. If it fails with "privacy identifier", reword the
copy; do not try to get around the check.

Prefer the brand "The Come Up HQ" (not the shorter "The Come Up") on new
or restyled pages.

## Affiliate tags are Leroy's call

Do not add, remove, or change affiliate parameters (`tag=`, `linkCode=`,
`ref=`, shortened affiliate hosts, and similar) unless Leroy asked for
that exact change.

## Secrets stay out of the repo and out of chat

No tokens, API keys, or credentials in the repo, in issues, or in chat.
Generator config must not be used as a place to park a personal inbox or
a personally-named endpoint if a secret or a neutral hostname will do.

## Generators can undo a cleanup

`gen/config.js` (and the generators' own `SITE` constants) now point at
`https://thecomeuphq.com`, and `gen/products.js` has no checkout host, so
the paid-link generators stop with an error instead of re-adding dead
Gumroad links. Some generators still emit older page shells and an
analytics endpoint whose hostname is an open decision. Do not run
`npm run build:all` (or the individual generators) unless Leroy asked,
and never assume a rebuild is safe to merge because the HTML was clean
yesterday. Run `bash scripts/check-banned-strings.sh .` after any rebuild.
