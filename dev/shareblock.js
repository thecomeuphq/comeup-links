const fs=require("fs");
const tpl=fs.readFileSync("gen/share-script.txt","utf8");
function block(h){
  const i=h.indexOf('var SITE = "https://thecomeuphq.github.io/comeup-links"');
  if(i<0) return null;
  const j=h.indexOf("})();",i);
  if(j<0) return null;
  return h.slice(i,j+5);
}
const files=["debt-payoff-calculator.html","index.html","garnishment-shield.html","30-day-paycheck-reset.html","waitlist.html","catalog.html","favorites.html"];
for(const f of files){
  const h=fs.readFileSync(f,"utf8");
  const b=block(h);
  if(!b){ console.log(f.padEnd(34)+" NO SHARE BLOCK"); continue; }
  // normalize whitespace and compare structure
  const norm=s=>s.replace(/\s+/g," ").trim();
  const same=norm(b)===norm(tpl);
  console.log(f.padEnd(34)+" block="+b.length+"  matchesTemplate="+same);
}
