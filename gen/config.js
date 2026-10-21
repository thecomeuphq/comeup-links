// Site configuration.
//
// Anything Leroy may need to change lives here so the generators do not have
// to be edited. Set a value to non-empty to enable the feature.

const SITE = 'https://thecomeuphq.github.io/comeup-links';

// --- Gumroad ---
// The 13 paid products live in gen/products.js.
//
// BUNDLE_SLUG: the Gumroad SKU for the "Starter 3-Pack" combined product.
// EMPTY means the combined product does not exist yet on Gumroad. While it is
// empty, bundle.html links the three real products individually and shows
// their real prices — no invented bundle price, no dead checkout.
//
// To turn the combined SKU on: create the product on Gumroad, set its slug
// here, and set BUNDLE_PRICE to its actual price.
const BUNDLE_SLUG = '';
const BUNDLE_PRICE = null;

// --- Waitlist ---
// An email service endpoint (Formspree, Buttondown, Netlify Forms, a Worker).
// EMPTY means no endpoint yet: the form falls back to a mailto: so a signup
// is never silently lost.
const WAITLIST_ENDPOINT = '';

// The address the waitlist mailto: fallback points at.
//
// It is a real, working address so a signup is never lost while the
// list provider is being set up. The domain-based list address is a
// placeholder until thecomeuphq.com exists - a mailto: to a domain with
// no MX record silently bounces, so the real address is used instead.
const WAITLIST_ADDRESS = 'leroybradley7@gmail.com';

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
const ANALYTICS_ENDPOINT = '';

// The list id written alongside each signup, so several lists can share one
// endpoint later.
const ANALYTICS_LIST_ID = 'comeup';

module.exports = {
  SITE, BUNDLE_SLUG, BUNDLE_PRICE,
  WAITLIST_ENDPOINT, WAITLIST_ADDRESS,
  ANALYTICS_ENDPOINT, ANALYTICS_LIST_ID
};
