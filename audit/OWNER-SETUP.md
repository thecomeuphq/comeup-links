# Owner Setup — The Come Up

**Everything below is a config change, not code.** Four items, each one a
setting. Do them in this order — the order is the leverage order.

Time to complete items 1 and 2 together: **about 30 minutes.**

Before you start: you need a free Cloudflare account and a free Gumroad
account. Nothing here costs money.

---

## Item 1 — Analytics (do this FIRST)

**Why first:** right now the site sends pageviews nowhere. You cannot tell
which of your 97 pages earns money, so every other decision is a guess.
This is the only item that tells you where to spend your next hour.

**The good news:** the code is already written and already on every page.
The beacon is injected into all 97 pages. It just has nowhere to go.

### Step 1.1 — Create the KV namespace

Open a terminal in the repo folder (`C:\Users\dawan\source\comeup-links-git`)
and run:

```
npx wrangler login
npx wrangler kv namespace create LIST
```

It prints something like:

```
🌀 Creating namespace with id "abc123def456"
Success! Add following to wrangler.toml:
[[kv_namespaces]]
binding = "LIST"
id = "abc123def456"
```

### Step 1.2 — Put the id in `wrangler.toml`

Open `wrangler.toml` in the repo. Find:

```toml
[[kv_namespaces]]
binding = "LIST"
id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"
```

Replace `REPLACE_WITH_YOUR_KV_NAMESPACE_ID` with the id wrangler printed.
Keep the quotes.

### Step 1.3 — Set the email that receives signups

```
npx wrangler secret put SIGNUP_EMAIL
```

It asks for the value. Use the address you want signups delivered to.
(Currently the site falls back to `leroybradley7@gmail.com` — you can use
that, or a new address on your own domain once you have one.)

### Step 1.4 — Deploy

```
npx wrangler deploy
```

It prints your Worker URL, something like:

```
Uploaded comeup-analytics
Deployed comeup-analytics triggers
  https://comeup-analytics.YOUR-NAME.workers.dev
```

### Step 1.5 — Confirm the Worker is alive BEFORE pointing the site at it

```
curl https://comeup-analytics.YOUR-NAME.workers.dev/status
```

You want:

```json
{"ok":true,"service":"comeup","pageviewsToday":0,"signupsTotal":0,"ts":"..."}
```

If you get an error, the KV namespace id in step 1.2 is wrong.

### Step 1.6 — Point the site at it

Open `gen/config.js`. Find this line:

```js
const ANALYTICS_ENDPOINT = '';
```

Change it to your Worker URL:

```js
const ANALYTICS_ENDPOINT = 'https://comeup-analytics.YOUR-NAME.workers.dev';
```

### Step 1.7 — Turn it on in the pages

```
node gen/gen-analytics.js
```

It should print `97 page(s) instrumented`.

### Step 1.8 — Ship it

```
git add -A
git commit -m "Turn on analytics via the Cloudflare Worker"
git push
```

GitHub Pages rebuilds in about a minute.

### Step 1.9 — Confirm it is really counting

Open the live site in a private window, load any page, wait a few seconds,
then run the status check again:

```
curl https://comeup-analytics.YOUR-NAME.workers.dev/status
```

`pageviewsToday` should now be **1** (or higher). If it stays at 0, the
site is still pointing at the old empty endpoint — re-run step 1.6 and 1.7.

---

## Item 2 — Waitlist capture (same Worker, 5 minutes)

**Why:** right now a signup on `waitlist.html` falls back to opening the
visitor's email app with a prefilled message. Some signups are lost at that
step — a stressed person on a phone does not always finish sending.

**You already have the Worker from item 1.** This is the same URL.

### Step 2.1 — Point the waitlist at the same Worker

In `gen/config.js`, find:

```js
const WAITLIST_ENDPOINT = '';
```

Change it to the **same** URL you used in step 1.6:

```js
const WAITLIST_ENDPOINT = 'https://comeup-analytics.YOUR-NAME.workers.dev';
```

### Step 2.2 — Ship it

```
node gen/gen-analytics.js
git add -A
git commit -m "Turn on waitlist capture via the Cloudflare Worker"
git push
```

### Step 2.3 — Test it

Open the live `waitlist.html`, enter a real email address you can check,
submit, and confirm:

- You get a "New The Come Up signup" email (from the `SIGNUP_EMAIL` address).
- `curl https://comeup-analytics.YOUR-NAME.workers.dev/status` shows
  `signupsTotal` went up by 1.

---

## Item 3 — The Starter 3-Pack on Gumroad (15 minutes)

**Why:** `bundle.html` is the page a visitor lands on when comparing
products. Right now it links the three products individually at their real
prices, which is safe — no dead checkout, no invented bundle price. But
there is no combined product, so there is no upsell.

### Step 3.1 — Create the product

In Gumroad: **New product** → **Product** (not a membership).

- **Name:** Starter 3-Pack
- **Description:** the three best sellers, at a discount. Write it in your
  own words — a stressed shift worker wants to know what they get, not
  marketing adjectives.
- **Price:** set it to the sum of the three individual prices **minus your
  discount**. A real discount is the entire reason to buy the bundle.
- **Upload:** the three printables from your existing products.
- **Set the slug** to something like `starter-3-pack`.

### Step 3.2 — Fill in the config

In `gen/config.js`, find:

```js
const BUNDLE_SLUG = '';
const BUNDLE_PRICE = null;
```

Change to:

```js
const BUNDLE_SLUG = 'starter-3-pack';
const BUNDLE_PRICE = 27;
```

(Use your real price. The number is what the page shows — it must match
Gumroad exactly.)

### Step 3.3 — Ship it

```
node gen/gen-inject.js
git add -A
git commit -m "Add the Starter 3-Pack bundle SKU"
git push
```

### Step 3.4 — Confirm it

Open the live `bundle.html`. You want:
- A single "Get the 3-Pack" button that goes to your Gumroad checkout.
- The price shown matching what you set in Gumroad.
- The three individual products still listed below it, at their own prices.

Then click the bundle button and **complete a real $0 test purchase** (Gumroad
lets you set a price of 0 for testing, or use a 100%-discount coupon) to
prove the checkout works end to end.

---

## Item 4 — Branded sending domain (do this LAST)

**Why last:** right now the list sends from `leroybradley7@gmail.com`. That
works. It looks less professional, and deliverability can suffer as the list
grows. But a domain costs money every year and the list is still small —
do this when the list justifies it, not before.

### When to do it

Do it when the list passes ~500 signups, or when you start sending a
weekly newsletter and start seeing inbox placement problems.

### How

1. Register `thecomeuphq.com` (any registrar — Cloudflare Registrar is
   cheapest if you already have a Cloudflare account).
2. Point it at Cloudflare and turn on Email Routing, or use a sending
   service (Buttondown, ConvertKit/MailerLite free tier).
3. Create a list there, and import your existing KV signups:
   ```
   curl https://comeup-analytics.YOUR-NAME.workers.dev/status
   ```
   The Worker holds one KV key per signup (`signup:<email>`). To pull the
   full list out, write a tiny script that lists the KV keys:
   ```
   npx wrangler kv key list --namespace-id YOUR_NAMESPACE_ID --prefix "signup:"
   ```
   and read each value with
   ```
   npx wrangler kv key get --namespace-id YOUR_NAMESPACE_ID "signup:you@example.com"
   ```
4. Update `WAITLIST_ADDRESS` in `gen/config.js` to the new list address, and
   update the `SIGNUP_EMAIL` secret:
   ```
   npx wrangler secret put SIGNUP_EMAIL
   ```

---

## Quick reference — every file and line you will touch

| File | What to change | Which item |
|---|---|---|
| `gen/config.js` | `ANALYTICS_ENDPOINT = ''` → your Worker URL | 1 |
| `gen/config.js` | `WAITLIST_ENDPOINT = ''` → same Worker URL | 2 |
| `gen/config.js` | `BUNDLE_SLUG = ''` → your Gumroad slug | 3 |
| `gen/config.js` | `BUNDLE_PRICE = null` → your real price | 3 |
| `gen/config.js` | `WAITLIST_ADDRESS` → branded address | 4 |
| `wrangler.toml` | `id = "REPLACE_WITH_YOUR_KV_NAMESPACE_ID"` → real id | 1 |
| Cloudflare secret | `SIGNUP_EMAIL` | 1, 4 |

**Never** set these to a value you made up. An empty endpoint is honest and
breaks nothing. A wrong endpoint breaks the site.

---

## Verify everything at once

Any time, from the repo folder:

```
npm run audit:live
```

Look for **0 P0, 0 P1, 0 P2** and all 13 checkouts live. The 4 "owner
blocked" items in the WIRE section are the only things left to do, and they
will clear as you complete the steps above.

---

## What happens automatically now

You do not need to check the site by hand. Two StarNet routines are running:

- **Come Up site health** — every day at 7:00 AM. Reports any P0/P1 with
  the exact fix command. Read-only; it never rebuilds or pushes.
- **Come Up money path** — every Monday at 8:00 AM. Checks all 13
  Gumroad checkouts and re-reports the owner-blocked list only when it
  changes.
