'use client';

// Brand workspace (admins only): Magical Touch Design's own business cards,
// letterheads, invoice, certificates, posters and social posts, made with
// the real logo and the brand spectrum. These rows are saved as drafts
// tagged "mt-internal", so the database (RLS) never shows them to customers
// and they never appear in the public template catalogue.
// Also: brand colours with print values, and an e-mail signature maker.

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink, Loader2, ShieldCheck } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { hexToCmykPercent } from '@/lib/color/cmyk';

const SPECTRUM = [
  { name: 'Rose', hex: '#F2708F' },
  { name: 'Lilac', hex: '#A69BD3' },
  { name: 'Sky', hex: '#35C2F1' },
  { name: 'Teal', hex: '#5DCCB8' },
  { name: 'Leaf', hex: '#8CC84B' },
  { name: 'Lime', hex: '#DDE23B' },
  { name: 'Ink', hex: '#0E0E12' },
  { name: 'Ivory', hex: '#FAF9F6' },
];
const GRADIENT = 'linear-gradient(90deg,#F2708F 0%,#A69BD3 22%,#35C2F1 45%,#5DCCB8 64%,#8CC84B 82%,#DDE23B 100%)';
const SITE = 'https://www.magicaltouchdesign.com';

interface BrandRow { id: string; name: string; width: number; height: number; category: string; tags: string[]; canvas_json: any }

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold';

export default function BrandWorkspacePage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [rows, setRows] = useState<BrandRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin/brand');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      const { data } = await supabase
        .from('templates')
        .select('id, name, width, height, category, tags, canvas_json')
        .contains('tags', ['mt-internal'])
        .order('name');
      setRows((data as BrandRow[]) || []);
      setState('ok');
    })();
  }, [router]);

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg">
        <p className="text-lg font-semibold text-mt-ink">Administrators only</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link>
      </main>
    );

  const groups = groupRows(rows);
  return (
    <AdminShell active="brand" title="Brand workspace" accent="Brand" subtitle="Magical Touch Design’s own cards, letterheads, certificates, posters and posts — with our logo and spectrum. Private to admins.">
      <div className="flex flex-col gap-6">
        <p className="inline-flex items-center gap-2 text-[13px] text-mt-muted">
          <ShieldCheck size={16} className="text-emerald-600" /> These designs are private: they are never listed for customers and only admins can open them.
        </p>
        <BrandBasics />
        {groups.map(([title, list]) => (
          <section key={title} className={card}>
            <h2 className="text-lg font-semibold text-mt-ink">{title}</h2>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {list.map((r) => <BrandTile key={r.id} row={r} />)}
            </div>
          </section>
        ))}
        {!rows.length && <p className={card}>No brand designs yet.</p>}
        <SignatureMaker />
      </div>
    </AdminShell>
  );
}

function groupRows(rows: BrandRow[]): [string, BrandRow[]][] {
  const kind = (r: BrandRow) => {
    const n = r.name.toLowerCase();
    if (/card|badge|envelope/.test(n)) return 'Cards & stationery';
    if (/letterhead|invoice/.test(n)) return 'Letterheads & invoice';
    if (/signature/.test(n)) return 'E-mail signatures';
    if (/certificate/.test(n)) return 'Certificates';
    return 'Posters & social media';
  };
  const order = ['Cards & stationery', 'Letterheads & invoice', 'Certificates', 'Posters & social media', 'E-mail signatures'];
  const m = new Map<string, BrandRow[]>();
  rows.forEach((r) => m.set(kind(r), [...(m.get(kind(r)) || []), r]));
  return order.filter((k) => m.has(k)).map((k) => [k, m.get(k)!]);
}

function BrandTile({ row }: { row: BrandRow }) {
  const [img, setImg] = useState<string | null>(null);
  const [pages, setPages] = useState(1);
  useEffect(() => {
    let alive = true;
    renderTemplatePages(row.canvas_json, 520)
      .then((p) => { if (alive && p.length) { setImg(p[0].url); setPages(p.length); } })
      .catch(() => {});
    return () => { alive = false; };
  }, [row]);
  // Edit the master design itself (saved back here), or start a copy.
  const href = `/editor?w=${row.width}&h=${row.height}&templateId=${row.id}&editTemplate=1&from=brand`;
  const copyHref = `/editor?w=${row.width}&h=${row.height}&templateId=${row.id}&from=brand`;
  const mm = (px: number) => Math.round((px / 96) * 25.4);
  const isPrint = row.width < 1200 && !/signature|\bpost\b|story/i.test(row.name);
  return (
    <div className="flex flex-col">
      <Link href={href} className="aspect-[4/3] rounded-2xl bg-mt-surface2 border border-mt-border flex items-center justify-center overflow-hidden p-3 hover:border-mt-ink/30 transition-colors">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={row.name} className="max-h-full max-w-full object-contain shadow-md rounded" />
        ) : (
          <Loader2 size={18} className="animate-spin text-mt-faint" />
        )}
      </Link>
      <p className="mt-2 text-[13px] font-semibold text-mt-ink leading-snug">{row.name.replace(/^MT Brand · /, '')}</p>
      <p className="text-[12px] text-mt-muted">
        {isPrint ? `${mm(row.width)} × ${mm(row.height)} mm` : `${row.width} × ${row.height} px`}
        {pages > 1 ? ` · ${pages} pages` : ''}
      </p>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3B82C4] hover:underline">
          Edit design <ExternalLink size={12} />
        </Link>
        <Link href={copyHref} className="text-[12.5px] font-medium text-mt-muted hover:text-mt-ink hover:underline">Use a copy</Link>
      </span>
    </div>
  );
}

function BrandBasics() {
  const [cmyk, setCmyk] = useState<Record<string, number[]>>({});
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    Promise.all(SPECTRUM.map(async (c) => [c.hex, await hexToCmykPercent(c.hex)] as const))
      .then((r) => setCmyk(Object.fromEntries(r)))
      .catch(() => {});
  }, []);
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(t); setTimeout(() => setCopied(null), 1200); });
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-mt-ink">Brand basics</h2>
      <div className="mt-4 grid lg:grid-cols-[1fr_1.4fr] gap-6">
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-mt-border bg-white p-5 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="Magical Touch logo" className="h-10 w-auto" />
          </div>
          <div className="rounded-2xl p-5 flex items-center justify-center" style={{ background: '#0E0E12' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-white.png" alt="Magical Touch logo, white" className="h-10 w-auto" />
          </div>
          <div className="h-3 rounded-full" style={{ background: GRADIENT }} />
          <p className="text-[12px] text-mt-muted">Type: <b className="text-mt-ink">Sora</b> for headings, <b className="text-mt-ink">Outfit</b> for text. Keep clear space around the logo at least the height of the “M”.</p>
          <div className="flex gap-2">
            <a href="/logo.png" download className={`${btn} border border-mt-border text-mt-ink hover:bg-mt-surface2`}>Logo PNG</a>
            <a href="/logo-white.png" download className={`${btn} border border-mt-border text-mt-ink hover:bg-mt-surface2`}>White logo PNG</a>
          </div>
        </div>
        <ul className="grid sm:grid-cols-2 gap-2">
          {SPECTRUM.map((c) => {
            const v = cmyk[c.hex];
            const cm = v ? `C${v[0]} M${v[1]} Y${v[2]} K${v[3]}` : '…';
            return (
              <li key={c.hex} className="flex items-center gap-3 rounded-xl border border-mt-border px-3 py-2">
                <span className="w-9 h-9 rounded-lg border border-black/10 shrink-0" style={{ background: c.hex }} />
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-mt-ink">{c.name}</span>
                  <button onClick={() => copy(c.hex)} className="font-mono text-[12px] text-mt-muted hover:text-mt-ink mr-2">{copied === c.hex ? 'Copied' : c.hex}</button>
                  <button onClick={() => v && copy(cm)} className="font-mono text-[12px] text-mt-muted hover:text-mt-ink">{copied === cm ? 'Copied' : cm}</button>
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- e-mail signature

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function signatureHtml(f: { name: string; title: string; phone: string; email: string; web: string }) {
  const webUrl = f.web.startsWith('http') ? f.web : `https://${f.web.replace(/^\/+/, '')}`;
  // A row of solid cells instead of a CSS gradient: works in Gmail and Outlook.
  const bar = SPECTRUM.slice(0, 6).map((c) => `<td style="background:${c.hex};height:3px;width:40px;font-size:0;line-height:0;">&nbsp;</td>`).join('');
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#0E0E12;">
<tr><td style="padding:0 0 10px 0;"><img src="${SITE}/logo.png" alt="Magical Touch" width="180" style="display:block;width:180px;height:auto;border:0;"></td></tr>
<tr><td style="font-size:16px;font-weight:bold;line-height:22px;">${esc(f.name)}</td></tr>
<tr><td style="font-size:13px;color:#6B6B76;line-height:20px;padding-bottom:8px;">${esc(f.title)} · Magical Touch Design</td></tr>
<tr><td><table cellpadding="0" cellspacing="0" border="0"><tr>${bar}</tr></table></td></tr>
<tr><td style="font-size:13px;line-height:20px;padding-top:8px;">
${f.phone ? `<a href="tel:${esc(f.phone.replace(/\s+/g, ''))}" style="color:#0E0E12;text-decoration:none;">${esc(f.phone)}</a><br>` : ''}
${f.email ? `<a href="mailto:${esc(f.email)}" style="color:#0E0E12;text-decoration:none;">${esc(f.email)}</a><br>` : ''}
${f.web ? `<a href="${esc(webUrl)}" style="color:#1FAEE6;text-decoration:none;font-weight:bold;">${esc(f.web)}</a>` : ''}
</td></tr>
</table>`;
}

function SignatureMaker() {
  const [f, setF] = useState({ name: 'Full Name', title: 'Designation', phone: '+971 50 000 0000', email: 'hello@magicaltouchdesign.com', web: 'www.magicaltouchdesign.com' });
  const [done, setDone] = useState<string | null>(null);
  const html = useMemo(() => signatureHtml(f), [f]);
  const flash = (k: string) => { setDone(k); setTimeout(() => setDone(null), 1500); };
  const copyRich = async () => {
    try {
      const CI = (window as any).ClipboardItem;
      if (CI && navigator.clipboard?.write) {
        await navigator.clipboard.write([new CI({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([`${f.name}\n${f.title} · Magical Touch Design\n${f.phone}\n${f.email}\n${f.web}`], { type: 'text/plain' }) })]);
      } else await navigator.clipboard.writeText(html);
      flash('rich');
    } catch {
      flash('fail');
    }
  };
  const field = 'h-9 w-full rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';
  return (
    <section className={card}>
      <h2 className="text-lg font-semibold text-mt-ink">E-mail signature</h2>
      <p className="mt-1 text-[13px] text-mt-muted">Fill in your details, copy, then paste into Gmail (Settings → Signature) or Outlook (Signatures).</p>
      <div className="mt-4 grid lg:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3">
          {([['name', 'Name'], ['title', 'Job title'], ['phone', 'Phone'], ['email', 'E-mail'], ['web', 'Website']] as const).map(([k, l]) => (
            <label key={k} className={`text-[12px] text-mt-muted ${k === 'web' || k === 'email' ? 'col-span-2' : ''}`}>
              {l}
              <input className={field} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </label>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl border border-mt-border bg-white p-5 overflow-x-auto" dangerouslySetInnerHTML={{ __html: html }} />
          <div className="flex flex-wrap gap-2">
            <button onClick={copyRich} className={`${btn} bg-mt-primary text-mt-onprimary`}>{done === 'rich' ? <Check size={14} /> : <Copy size={14} />} {done === 'rich' ? 'Copied — now paste' : 'Copy signature'}</button>
            <button onClick={() => navigator.clipboard?.writeText(html).then(() => flash('html'))} className={`${btn} border border-mt-border text-mt-ink hover:bg-mt-surface2`}>{done === 'html' ? <Check size={14} /> : <Copy size={14} />} Copy HTML code</button>
          </div>
          {done === 'fail' && <p className="text-[12px] text-rose-600">Copy didn’t work in this browser. Use “Copy HTML code” instead.</p>}
        </div>
      </div>
    </section>
  );
}
