const cat = [];
(async () => {
  for (const from of [0, 10]) {
    const r = await fetch('https://bradley57.gumroad.com/products/search?sort=page_layout&user_id=661919712772&section_id=default-products&from=' + from);
    const j = await r.json();
    for (const p of j.products) {
      cat.push({
        name: p.name,
        price: p.price_cents / 100,
        pwyw: !!p.is_pay_what_you_want,
        slug: p.permalink,
        url: 'https://bradley57.gumroad.com/l/' + p.permalink,
        desc: String(p.description || '').split('\n')[0]
      });
    }
  }
  console.log('COUNT ' + cat.length);
  for (const c of cat) {
    console.log('---');
    console.log('name: ' + c.name);
    console.log('price: ' + c.price.toFixed(2) + (c.pwyw ? ' (pay what you want)' : ''));
    console.log('url: ' + c.url);
    console.log('desc: ' + c.desc.slice(0, 300));
  }
})();
