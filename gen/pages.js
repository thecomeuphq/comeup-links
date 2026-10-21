// Page builder for every NEW The Come Up page.
//
// Composes the shared design system (gen/base.js) with the shared
// "Keep going" block and the shared copy-my-result script (gen/share.js)
// so new pages are indistinguishable from the existing ones.
//
// Nothing here touches an existing page. New pages are written fresh.

const { head, foot, jsonld, tcuBlock, SITE } = require('./base');
const share = require('./share');

/**
 * page({
 *   path, title, description, ogTitle?,
 *   body,                       // inner HTML of <main>
 *   rels,                       // [{href,t,d,hub?}]  "Keep going" cards
 *   cta,                        // {href,label}       single amber next step
 *   share: false | {intro, fields:[{id,label}]},
 *   script,                     // extra <script> (overrides share script)
 *   headExtra,                  // extra <head> markup (JSON-LD)
 *   depth, backHref, backText
 * })
 */
function page(o) {
  const script = o.script !== undefined
    ? o.script
    : (o.share === false ? '' : share.build({
        pagePath: o.path,
        intro: (o.share && o.share.intro) || 'My results:',
        fields: (o.share && o.share.fields) || []
      }));

  const tcu = tcuBlock({
    rels: o.rels || [],
    cta: o.cta,
    share: o.share === false ? false : true,
    shareLabel: (o.share && o.share.label) || 'Copy my result'
  });

  return head(o) + o.body + '\n' + tcu + '\n' + foot({ ...o, script });
}

// ---- small content helpers ----------------------------------------------
const money = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function cards(items) {
  return items.map((c) => `  <a class="card${c.amber ? ' amber' : ''}" href="${c.href}">
    <div class="t">${c.t}</div>
    <div class="d">${c.d}</div>
  </a>`).join('\n');
}

function faqBlock(items) {
  return items.map((f) => `  <details>
    <summary>${f.q}</summary>
    <div class="answer"><p>${f.a}</p></div>
  </details>`).join('\n');
}

function faqJsonLd(items) {
  return jsonld({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a.replace(/<[^>]+>/g, '') }
    }))
  });
}

function breadcrumbJsonLd(trail, pageName) {
  return jsonld({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((t, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: t.name,
      item: t.href ? (t.href.startsWith('http') ? t.href : SITE + '/' + t.href) : SITE + '/'
    })).concat(pageName ? [{ '@type': 'ListItem', position: trail.length + 1, name: pageName }] : [])
  });
}

function webSiteJsonLd() {
  return jsonld({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'The Come Up',
    url: SITE + '/',
    description: 'Free money tools built for hourly and shift workers.',
    potentialAction: {
      '@type': 'SearchAction',
      target: { '@type': 'EntryPoint', urlTemplate: SITE + '/tools.html?q={search_term_string}' },
      'query-input': 'required name=search_term_string'
    }
  });
}

module.exports = { page, money, cards, faqBlock, faqJsonLd, breadcrumbJsonLd, webSiteJsonLd, SITE, jsonld };
