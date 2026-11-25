// Copies the published templates out of Supabase into static files that ship
// with the site (public/catalog), so template pages, the gallery, search and
// the editor read files from Cloudflare instead of the database. The free
// database then only serves sign-in and users' own designs.
//
//   public/catalog/index.json      every published template, list fields only
//   public/catalog/t/<n>.json      the full templates (with their designs), in
//                                  SHARDS files picked by a hash of the id
//
// Incremental: a template's full copy is fetched again only when its
// updated_at changed. Gentle on the small database: small pages, short pauses.
// Usage: SUPABASE_URL=… SUPABASE_ANON_KEY=… node scripts/export-catalog.mjs
import fs from 'node:fs';
import path from 'node:path';

const URL_ = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_ || !KEY) { console.error('SUPABASE_URL and SUPABASE_ANON_KEY are needed'); process.exit(1); }

export const SHARDS = 256;
export function shardOf(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) % SHARDS; }

const OUT = path.join(process.cwd(), 'public', 'catalog');
const LIST = 'id,name,slug,category,category_id,width,height,color1,color2,sort_order,thumbnail,preview,description,tags,status,is_featured,is_free,unit,dpi,color_mode,current_version,published_at,updated_at,orientation,occasion,industry,language,search_keywords,hashtags,rights_status';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function rest(q, tries = 4) {
  for (let i = 1; ; i++) {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 60000);
    try {
      const r = await fetch(`${URL_}/rest/v1/${q}`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` }, signal: ctl.signal });
      if (r.ok) return await r.json();
      if (i >= tries || r.status < 500) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`);
    } catch (e) { if (i >= tries) throw e; } finally { clearTimeout(t); }
    await sleep(3000 * i);
  }
}

const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return d; } };

// 1. The list (cheap columns), 500 rows per request.
const rows = [];
for (let from = 0; ; from += 500) {
  const page = await rest(`templates?select=${LIST}&status=eq.published&slug=not.is.null&order=is_featured.desc,sort_order.asc,id.asc&offset=${from}&limit=500`);
  rows.push(...page);
  process.stdout.write(`list ${rows.length}\r`);
  if (page.length < 500) break;
  await sleep(400);
}
console.log(`\n${rows.length} published templates`);
// Which of them have a design inside (the gallery lists only those).
const withDesign = new Set();
for (let from = 0; ; from += 1000) {
  const page = await rest(`templates?select=id&status=eq.published&canvas_json=not.is.null&order=id.asc&offset=${from}&limit=1000`);
  page.forEach((r) => withDesign.add(r.id));
  if (page.length < 1000) break;
  await sleep(400);
}
if (rows.length < 100) { console.error('Suspiciously few templates — not overwriting the catalog.'); process.exit(1); }

// 2. Which full copies changed.
const oldIndex = readJson(path.join(OUT, 'index.json'), { rows: [] });
const oldAt = new Map(oldIndex.rows.map((r) => [r.id, r.updated_at]));
const shards = new Map();
for (let s = 0; s < SHARDS; s++) shards.set(s, readJson(path.join(OUT, 't', `${s}.json`), {}));
const keep = new Set(rows.map((r) => r.id));
for (const m of shards.values()) for (const id of Object.keys(m)) if (!keep.has(id)) delete m[id];
const todo = rows.filter((r) => oldAt.get(r.id) !== r.updated_at || !shards.get(shardOf(r.id))[r.id]).map((r) => r.id);
console.log(`${todo.length} full templates to copy`);

// 3. Full rows, 25 at a time.
for (let i = 0; i < todo.length; i += 25) {
  const ids = todo.slice(i, i + 25);
  const full = await rest(`templates?select=*&id=in.(${ids.join(',')})`);
  for (const t of full) shards.get(shardOf(t.id))[t.id] = t;
  process.stdout.write(`full ${Math.min(i + 25, todo.length)}/${todo.length}\r`);
  await sleep(300);
}
console.log('');

// 4. Write.
fs.mkdirSync(path.join(OUT, 't'), { recursive: true });
const index = rows.map((r) => ({ ...r, has_design: withDesign.has(r.id) }));
fs.writeFileSync(path.join(OUT, 'index.json'), JSON.stringify({ v: 1, built: new Date().toISOString(), count: index.length, shards: SHARDS, rows: index }));
fs.writeFileSync(path.join(OUT, 'count.json'), JSON.stringify({ count: index.length, built: new Date().toISOString() }));
let bytes = 0;
for (const [s, m] of shards) { const body = JSON.stringify(m); bytes += body.length; fs.writeFileSync(path.join(OUT, 't', `${s}.json`), body); }
console.log(`index ${(fs.statSync(path.join(OUT, 'index.json')).size / 1e6).toFixed(1)} MB, full copies ${(bytes / 1e6).toFixed(1)} MB in ${SHARDS} files`);
