// Headless test of the pagination logic (pure functions replicated).
const PER = 24;
const N = 526;
const all = Array.from({length: N}, (_, i) => ({ i, text: ('post ' + i + (i % 7 === 0 ? ' agent' : ' tool')).toLowerCase() }));

function pagesFor(total){ return Math.max(1, Math.ceil(total / PER)); }
function slice(arr, page){ const s=(page-1)*PER; return arr.slice(s, s+PER); }
function filter(q){ q=(q||'').trim().toLowerCase(); return !q?all:all.filter(e=>e.text.indexOf(q)!==-1); }

let ok = true;
function assert(c, m){ if(!c){ ok=false; console.log('FAIL:', m);} else console.log('pass:', m); }

assert(pagesFor(526) === 22, '526 posts -> 22 pages (24/pg, last=22)');
assert(slice(all,1).length === 24, 'page 1 has 24');
assert(slice(all,22).length === 526 - 21*24, 'page 22 has remainder=' + (526-21*24));
assert(slice(all,22).length === 22, 'page 22 = 22 posts');
// filter
let f = filter('agent');
assert(f.length === all.filter(e=>e.i%7===0).length, 'filter agent -> ' + f.length);
assert(pagesFor(f.length) >= 1, 'filtered pages >=1');
// empty filter returns all (fail-open behavior)
assert(filter('').length === 526, 'empty query -> all 526 (fails open)');
// no-match
assert(filter('zzzznope').length === 0, 'no-match -> 0');
// page clamp
let page = 99; const pages = pagesFor(526); if(page>pages) page=pages;
assert(page === 22, 'page clamp 99 -> 22');
console.log(ok ? '\nALL PASS' : '\nSOME FAILED');
process.exit(ok?0:1);
