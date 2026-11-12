// Calls the clean-thumbs function with the site's public (anon) key.
const yml = await (await fetch('https://raw.githubusercontent.com/tonyaloysiusp-cyber/magicaltouch/main/.github/workflows/e2e.yml')).text();
const key = (yml.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY:\s*(\S+)/) || [])[1];
const dry = process.env.DRY !== '0';
const r = await fetch(`https://rqkjogzljsbufbrdlbfr.supabase.co/functions/v1/clean-thumbs${dry ? '?dry=1' : ''}`, { method: 'POST', headers: { Authorization: `Bearer ${key}` } });
console.log('CLEAN', r.status, (await r.text()).slice(0, 500));
