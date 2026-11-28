const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_ANON_KEY;
const r = await fetch(`${U}/functions/v1/import-brand-kit`, { method: 'POST', headers: { Authorization: `Bearer ${K}`, apikey: K } });
console.log('[check]', r.status, (await r.text()).slice(0, 600));
