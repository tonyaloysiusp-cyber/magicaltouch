// A self-opening design file ("Name.mtd.html") was double-clicked on a
// computer or phone: its page posts the project here. Nothing is stored on
// the server — the reply is a tiny page that keeps the project in this
// browser (IndexedDB) and continues to /open, which asks to log in if needed
// and then opens the exact design in the editor.

export const runtime = 'nodejs';

const MAX_B64 = 90 * 1024 * 1024; // ~65 MB project

const page = (body: string, status = 200) =>
  new Response(body, {
    status,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
  });

const shell = (inner: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Opening your design · Magical Touch Design</title>
<style>body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:#f6f5f2;color:#14121f;display:grid;place-items:center;min-height:100vh;text-align:center;padding:24px}a{color:#3B82C4}</style></head><body>${inner}</body></html>`;

export async function POST(req: Request) {
  let raw = '';
  try {
    const form = await req.formData();
    raw = String(form.get('mtd') || '').replace(/\s+/g, '');
  } catch {
    raw = '';
  }
  if (!raw || raw.length > MAX_B64 || !/^[A-Za-z0-9+/]+=*$/.test(raw)) {
    return page(shell('<p>This design file could not be read.<br>Go to <a href="/dashboard">Dashboard → Open file</a> and choose it there.</p>'), 400);
  }
  // `raw` is plain base64 (checked above), so it is safe inside a script string.
  return page(
    shell(`<p id="m">Opening your design…</p>
<script>(function(){var d=${JSON.stringify(raw)};function fail(){document.getElementById('m').innerHTML='Your browser blocked this. Go to <a href="/dashboard">Dashboard → Open file</a> and choose the file there.'}
try{var r=indexedDB.open('mt-open',1);r.onupgradeneeded=function(){r.result.createObjectStore('pending')};r.onerror=fail;r.onsuccess=function(){try{var tx=r.result.transaction('pending','readwrite');tx.objectStore('pending').put({data:d,at:Date.now()},'file');tx.oncomplete=function(){location.replace('/open?pending=1')};tx.onerror=fail}catch(e){fail()}}}catch(e){fail()}})();</script>`),
  );
}

export async function GET() {
  return Response.redirect('https://www.magicaltouchdesign.com/dashboard', 302);
}
