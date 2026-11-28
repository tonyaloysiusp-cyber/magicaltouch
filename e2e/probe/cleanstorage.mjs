// Calls the cleanup-storage function until the queue is empty.
const U = process.env.SUPABASE_URL, K = process.env.SUPABASE_ANON_KEY;
for (let i = 0; i < 30; i++) {
  const r = await fetch(`${U}/functions/v1/cleanup-storage`, { method: 'POST', headers: { Authorization: `Bearer ${K}`, apikey: K } });
  const j = await r.json().catch(() => ({ status: r.status }));
  console.log('[check]', i, JSON.stringify(j));
  if (!r.ok || j.left === 0 || j.removed === 0) break;
}
