// SEO audit of the built site: every URL in the sitemap (templates and
// category/tag pages sampled), checked for the things search engines read.
// Writes e2e-out/seo-report.json and e2e-out/seo-summary.txt.
import fs from 'node:fs';

const BASE = process.env.E2E_BASE || 'http://localhost:3000';
const SITE = 'https://www.magicaltouchdesign.com';
const out = { pages: [], issues: {} };
const add = (kind, url, detail = '') => { (out.issues[kind] ||= []).push(detail ? `${url} — ${detail}` : url); };
const local = (u) => u.replace(/^https?:\/\/(www\.)?magicaltouchdesign\.com/, BASE);
const strip = (s) => s.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const attr = (tag, name) => (tag.match(new RegExp(`${name}="([^"]*)"`, 'i')) || [])[1];
const meta = (html, key) => { const m = html.match(new RegExp(`<meta[^>]+(?:name|property)="${key}"[^>]*>`, 'i')); return m ? strip(attr(m[0], 'content') || '') : undefined; };

const sm = await (await fetch(`${BASE}/sitemap.xml`)).text();
const urls = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const tpl = urls.filter((u) => /\/templates\/[^/]+$/.test(u) && !/\/templates\/(category|tag)/.test(u));
const cat = urls.filter((u) => /\/templates\/(category|tag)\//.test(u));
const rest = urls.filter((u) => !tpl.includes(u) && !cat.includes(u));
const pick = (a, n) => a.filter((_, i) => i % Math.max(1, Math.ceil(a.length / n)) === 0).slice(0, n);
const list = [...rest, ...pick(cat, 80), ...pick(tpl, 120), `${SITE}/create`, `${SITE}/dashboard`, `${SITE}/login`];
fs.mkdirSync('e2e-out', { recursive: true });
out.counts = { sitemap: urls.length, templates: tpl.length, categoryAndTag: cat.length, other: rest.length, audited: list.length };

const titles = new Map(), descs = new Map();
for (const u of list) {
  const t0 = Date.now();
  let res, html = '';
  try { res = await fetch(local(u), { redirect: 'manual' }); html = await res.text(); } catch (e) { add('fetch error', u, String(e)); continue; }
  const ms = Date.now() - t0;
  const inSitemap = urls.includes(u);
  const p = { url: u, status: res.status, ms, kb: Math.round(html.length / 1024) };
  if (res.status >= 300) { if (inSitemap) add('sitemap URL not 200', u, String(res.status)); out.pages.push(p); continue; }
  const head = html.split('</head>')[0];
  p.title = strip((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '');
  p.description = meta(head, 'description') || '';
  p.canonical = attr((head.match(/<link[^>]+rel="canonical"[^>]*>/i) || [''])[0], 'href') || '';
  p.robots = meta(head, 'robots') || '';
  p.ogImage = meta(head, 'og:image') || '';
  p.ogTitle = meta(head, 'og:title') || '';
  p.h1 = [...html.matchAll(/<h1[\s\S]*?<\/h1>/gi)].map((m) => strip(m[0]));
  p.lang = (html.match(/<html[^>]+lang="([^"]+)"/i) || [])[1] || '';
  const ld = [...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  p.ldTypes = [];
  for (const j of ld) { try { const v = JSON.parse(j); for (const x of [].concat(v['@graph'] || v)) p.ldTypes.push(x['@type']); } catch { add('broken structured data (JSON-LD)', u); } }
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]);
  p.imgNoAlt = imgs.filter((i) => !/\balt=/.test(i)).length;
  const text = strip(html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' '));
  p.words = text.split(' ').length;
  const noindex = /noindex/i.test(p.robots);
  const path = new URL(u).pathname;

  if (inSitemap && noindex) add('in sitemap but noindex', u);
  if (/^\/(create|dashboard|login)$/.test(path) && !noindex) add('private page can be indexed (needs noindex)', u);
  if (!noindex && inSitemap) {
    if (!p.title) add('missing title', u);
    else if (p.title.length > 65) add('title too long (>65)', u, `${p.title.length}: ${p.title}`);
    else if (p.title.length < 25) add('title too short (<25)', u, p.title);
    if (!p.description) add('missing meta description', u);
    else if (p.description.length > 165) add('description too long (>165)', u, `${p.description.length}: ${p.description}`);
    else if (p.description.length < 70) add('description too short (<70)', u, p.description);
    if (!p.canonical) add('missing canonical', u);
    else if (new URL(p.canonical, SITE).pathname.replace(/\/$/, '') !== path.replace(/\/$/, '')) add('canonical points elsewhere', u, p.canonical);
    if (p.h1.length === 0) add('no H1 in the HTML', u);
    if (p.h1.length > 1) add('more than one H1', u, p.h1.join(' | ').slice(0, 160));
    if (!p.ogImage) add('missing og:image', u);
    if (!p.ldTypes.length) add('no structured data', u);
    if (p.words < 150) add('thin page in HTML (<150 words)', u, String(p.words));
    if (p.imgNoAlt) add('images without alt', u, String(p.imgNoAlt));
    if (ms > 2500) add('slow server response (>2.5s)', u, `${ms} ms`);
    if (p.kb > 900) add('heavy HTML (>900 KB)', u, `${p.kb} KB`);
    if (p.title) titles.set(p.title, [...(titles.get(p.title) || []), u]);
    if (p.description) descs.set(p.description, [...(descs.get(p.description) || []), u]);
  }
  if (!p.lang) add('missing html lang', u);
  out.pages.push(p);
}
for (const [t, us] of titles) if (us.length > 1) add('duplicate title', us.join(' , '), t);
for (const [d, us] of descs) if (us.length > 1) add('duplicate description', us.slice(0, 6).join(' , '), d.slice(0, 80));

// robots.txt and the sitemap itself
const robots = await (await fetch(`${BASE}/robots.txt`)).text();
out.robots = robots;
if (!/Sitemap:/i.test(robots)) add('robots.txt has no Sitemap line', '/robots.txt');

fs.writeFileSync('e2e-out/seo-report.json', JSON.stringify(out, null, 1));
const lines = [`SEO audit — ${JSON.stringify(out.counts)}`];
for (const [k, v] of Object.entries(out.issues).sort((a, b) => b[1].length - a[1].length)) {
  lines.push(`\n## ${k}: ${v.length}`);
  for (const x of v.slice(0, 25)) lines.push(`  - ${x}`);
}
fs.writeFileSync('e2e-out/seo-summary.txt', lines.join('\n'));
console.log(lines.join('\n'));
