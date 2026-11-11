// SEO audit of the live site: sitemap sample + key pages.
const B = 'https://www.magicaltouchdesign.com';
const xml = await (await fetch(B + '/sitemap.xml')).text();
const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log('sitemap URLs', all.length, 'image tags', (xml.match(/<image:image>/g) || []).length);
const groups = {};
for (const u of all) { const p = new URL(u).pathname.split('/').slice(0, 3).join('/').replace(/\/[^/]+$/, (s) => (s.split('/').length > 1 && u.includes('/templates/') ? '/*' : s)); (groups[p] ||= []).push(u); }
const pick = [];
for (const [g, us] of Object.entries(groups)) { const n = us.length > 20 ? 25 : us.length; for (let i = 0; i < n; i++) pick.push(us[Math.floor((i * us.length) / n)]); }
console.log('groups', Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])));
const issues = {}; const titles = {}; const descs = {};
const add = (k, u, x = '') => (issues[k] ||= []).push(u.replace(B, '') + (x ? '  ' + x : ''));
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
let done = 0;
async function check(u) {
  let r; try { r = await fetch(u, { redirect: 'manual' }); } catch (e) { add('fetch error', u); return; }
  if (r.status !== 200) { add('status ' + r.status, u, r.headers.get('location') || ''); return; }
  const h = await r.text(); done++;
  const head = h.split('</head>')[0];
  const title = dec((head.match(/<title[^>]*>([^<]*)<\/title>/) || [])[1] || '');
  const desc = dec((head.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const canon = (head.match(/<link rel="canonical" href="([^"]*)"/) || [])[1] || '';
  const robots = (head.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || '';
  const og = (head.match(/<meta property="og:image" content="([^"]*)"/) || [])[1] || '';
  const h1 = (h.match(/<h1[\s>]/g) || []).length;
  if (!title) add('no title', u); else { if (title.length > 65) add('title > 65', u, title.length + ' ' + title); if (title.length < 25) add('title < 25', u, title); (titles[title] ||= []).push(u); }
  if (!desc) add('no description', u); else { if (desc.length > 165) add('desc > 165', u, String(desc.length)); if (desc.length < 70) add('desc < 70', u, desc); (descs[desc] ||= []).push(u); }
  if (!canon) add('no canonical', u); else if (canon.replace(/\/$/, '') !== u.replace(/\/$/, '')) add('canonical differs', u, canon);
  if (/noindex/.test(robots)) add('noindex in sitemap', u);
  if (!og) add('no og:image', u);
  if (h1 !== 1) add('h1 count ' + h1, u);
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { try { JSON.parse(m[1]); } catch { add('bad JSON-LD', u); } }
  const imgs = [...h.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
  const noAlt = imgs.filter((t) => !/\balt=/.test(t)).length; if (noAlt) add('img without alt', u, String(noAlt));
}
const extra = ['/', '/templates', '/tutorials', '/about', '/pricing', '/create', '/photo-studio', '/tools', '/features', '/contact', '/privacy', '/terms', '/login', '/signup'].map((p) => B + p);
const list = [...new Set([...extra, ...pick])];
for (let i = 0; i < list.length; i += 8) await Promise.all(list.slice(i, i + 8).map(check));
for (const [t, us] of Object.entries(titles)) if (us.length > 1) add('duplicate title', us[0], `${us.length}x ${t.slice(0, 70)}`);
for (const [t, us] of Object.entries(descs)) if (us.length > 1) add('duplicate description', us[0], `${us.length}x`);
console.log('checked', done, 'of', list.length);
for (const [k, v] of Object.entries(issues)) { console.log(`\n## ${k}: ${v.length}`); v.slice(0, 12).forEach((x) => console.log('  ' + x)); }
// robots + key headers
console.log('\n## robots.txt\n' + (await (await fetch(B + '/robots.txt')).text()));
