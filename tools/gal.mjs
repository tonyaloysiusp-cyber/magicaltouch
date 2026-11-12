const B = 'https://www.magicaltouchdesign.com';
for (const path of ['/api/public-templates', '/api/home-showcase']) {
  const t0 = Date.now();
  const r = await fetch(B + path);
  const txt = await r.text();
  let rows = '?';
  try { const j = JSON.parse(txt); rows = (j.rows || j.items || []).length; } catch {}
  console.log(path, r.status, 'bytes', txt.length, 'rows', rows, 'ms', Date.now() - t0, 'cache', r.headers.get('cache-control'), r.headers.get('age'), r.headers.get('cf-cache-status'), r.headers.get('x-nextjs-cache'));
}
