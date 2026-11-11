const B = 'https://www.magicaltouchdesign.com';
for (const p of ['/', '/tools', '/trace', '/patterns', '/templates', '/templates/category/business', '/templates/u-northline-advisory-grow-with-a-clear-plan-instagram-post-00000']) {
  const r = await fetch(B + p, { redirect: 'manual' });
  const h = r.status === 200 ? await r.text() : '';
  console.log(r.status, p, (h.match(/<title>([^<]*)/) || [])[1] || r.headers.get('location') || '');
}
const j = await fetch(B + '/api/public-templates');
const t = await j.text();
console.log('gallery list', j.status, (t.length / 1e6).toFixed(1), 'MB decoded, rows', (JSON.parse(t).rows || []).length, 'encoding', j.headers.get('content-encoding'));
const th = await fetch('https://rqkjogzljsbufbrdlbfr.supabase.co/storage/v1/object/public/template-thumbs/u-northline-advisory-grow-with-a-clear-plan-instagram-post-00000.webp');
console.log('thumb', th.status, th.headers.get('content-type'), th.headers.get('content-length'));
const sm = await (await fetch(B + '/sitemap.xml')).text();
console.log('sitemap URLs', (sm.match(/<loc>/g) || []).length, 'universe', (sm.match(/\/templates\/u-/g) || []).length);
