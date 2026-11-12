const B = 'https://www.magicaltouchdesign.com';
for (const path of ['/api/public-templates', '/api/home-showcase', '/api/public-templates']) {
  const t0 = Date.now(); const r = await fetch(B + path); const txt = await r.text();
  let rows = '?', total = '?'; try { const j = JSON.parse(txt); rows = (j.rows || []).length; total = j.total; } catch {}
  console.log(path, r.status, 'rows', rows, 'total', total, 'ms', Date.now() - t0, 'cache', r.headers.get('x-mt-cache'));
}
for (const path of ['/passport-photo-maker', '/rangoli-mandala-maker', '/gradient-background-generator', '/print-size-calculator', '/patterns', '/trace', '/tools', '/templates/category/social-media-posts', '/templates/category/invitations/wedding-and-engagement', '/templates/category/festivals', '/templates/category/business/flyer', '/admin/library', '/admin/brand', '/sitemap.xml']) {
  const r = await fetch(B + path, { redirect: 'manual' }); const txt = r.status === 200 ? await r.text() : '';
  const title = (txt.match(/<title>([^<]*)<\/title>/) || [])[1] || '';
  console.log(path, r.status, r.headers.get('location') || '', title.slice(0, 80), path === '/sitemap.xml' ? (txt.match(/passport-photo-maker|social-media-posts/g) || []).length : '');
}
