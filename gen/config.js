// Site configuration.
//
// Anything Leroy may need to change lives here so the generators do not have
// to be edited. Set a value to non-empty to enable the feature.

const SITE = 'https://thecomeuphq.com';

// --- Paid checkout (retired) ---
// The old Gumroad shop is not a shipped destination, and its links were
// removed from every live page in Nov 2026. gen/products.js no longer carries
// a checkout host, so the paid-link generators stop with an error instead of
// baking dead checkout links back into the site. Do not re-add a checkout
// host without Leroy's OK and a tested, live destination.
//
// BUNDLE_SLUG: the SKU for the "Starter 3-Pack" combined product.
// EMPTY means the combined product does not exist. While it is
// empty, bundle.html links the three real products individually and shows
// their real prices — no invented bundle price, no dead checkout.
//
// Leave empty: there is no live paid checkout.
const BUNDLE_SLUG = '';
const BUNDLE_PRICE = null;

// --- Waitlist ---
// An email service endpoint (Formspree, Buttondown, Netlify Forms, a Worker).
// EMPTY means no endpoint yet: the form falls back to a mailto: so a signup
// is never silently lost.
const WAITLIST_ENDPOINT = 'https://eomail5.com/form/28f5b9da-cd9b-11f1-a64f-8d47d9604576';

// The waitlist no longer falls back to a mailto:. Personal mailboxes must
// never be published on the site (public branding is The Come Up HQ only).
// Kept as an empty export so older generators still load.
const WAITLIST_ADDRESS = '';

// --- Analytics + waitlist capture ---
// One endpoint serves both: the pageview beacon and the signup POST.
// EMPTY means nothing is sent anywhere - no endpoint, no tracking, no
// cookie. The site works exactly the same either way; analytics is an
// addition, not a dependency.
//
// To turn it on:
//   1. Create a Worker in Cloudflare (free tier) from gen/worker/worker.js
//   2. Bind a KV namespace named LIST
//   3. Put this URL here
//   4. node gen/gen-analytics.js
const ANALYTICS_ENDPOINT = 'https://comeup-analytics.leroybradley7.workers.dev';

// The list id written alongside each signup, so several lists can share one
// endpoint later.
const ANALYTICS_LIST_ID = 'comeup';

module.exports = {
  SITE, BUNDLE_SLUG, BUNDLE_PRICE,
  WAITLIST_ENDPOINT, WAITLIST_ADDRESS,
  ANALYTICS_ENDPOINT, ANALYTICS_LIST_ID
};
