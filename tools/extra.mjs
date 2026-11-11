const B = 'https://www.magicaltouchdesign.com';
for (const p of ['/patterns', '/colours', '/features', '/pricing', '/tools', '/pattern-studio', '/templates/bdp-black-and-gold-fortieth-invitation', '/templates/category/birthday', '/api/colour-search?hex=1E3A5F&limit=3', '/api/media/home/ad/magical-touch-ad.mp4']) {
  const r = await fetch(B + p, { redirect: 'manual' });
  let extra = r.headers.get('location') || '';
  if (r.status === 200 && p.startsWith('/api/colour')) extra = (await r.text()).slice(0, 200);
  else if (r.status === 200) { const h = await r.text(); extra = (h.match(/<title>([^<]*)/) || [])[1] || ''; }
  console.log(r.status, p, extra);
}
// a retired template redirects to its category
const sm = await (await fetch(B + '/sitemap.xml')).text();
console.log('image tags in sitemap:', (sm.match(/<image:image>/g) || []).length, 'bdp in sitemap:', (sm.match(/bdp-/g) || []).length);
