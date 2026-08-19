const fs=require('fs');
const html=fs.readFileSync('tools.html','utf8');
// extract each card's text content (name+blurb)
const cards=[...html.matchAll(/<a class="tool"[^>]*>([\s\S]*?)<\/a>/g)]
  .map(m=>m[1].replace(/<[^>]+>/g,' ').replace(/&#8594;|&amp;|&#x27;|&quot;/g,' ').replace(/\s+/g,' ').trim().toLowerCase());
function filterCount(q){q=q.trim().toLowerCase();return cards.filter(c=>c.indexOf(q)>=0).length;}
const tests=[
  ["(empty -> all)","",cards.length,153],
  ["'vram'",'vram',filterCount('vram'),null],
  ["'jwt'",'jwt',filterCount('jwt'),null],
  ["'sql'",'sql',filterCount('sql'),null],
  ["'password'",'password',filterCount('password'),null],
  ["'zzzznomatch'",'zzzznomatch',filterCount('zzzznomatch'),0],
];
let ok=0;
for(const[label,q,got,exp] of tests){
  const pass = exp===null ? got>0 : got===exp;
  if(pass)ok++;
  console.log(`  ${pass?'PASS':'FAIL'}  ${label} -> ${got}${exp!==null?` (exp ${exp})`:''}`);
}
console.log(`  ${ok}/${tests.length} search tests passed`);
