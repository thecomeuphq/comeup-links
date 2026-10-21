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

// The address the waitlist mailto: fallback points at. Replace with the real
// list address once the provider is set up.
const WAITLIST_ADDRESS = 'list@thecomeuphq.com';

module.exports = { SITE, BUNDLE_SLUG, BUNDLE_PRICE, WAITLIST_ENDPOINT, WAITLIST_ADDRESS };
