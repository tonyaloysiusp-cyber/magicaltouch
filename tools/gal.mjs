const B = 'https://www.magicaltouchdesign.com';
const hit = async (label) => { const t0 = Date.now(); const r = await fetch(B + '/api/public-templates'); const j = await r.json(); console.log(label, r.status, 'rows', j.rows.length, 'ms', Date.now() - t0, 'cache', r.headers.get('x-mt-cache')); };
await hit('first'); await hit('second');
await new Promise((r) => setTimeout(r, 320000));
await hit('after 5 min'); await new Promise((r) => setTimeout(r, 15000)); await hit('then');
