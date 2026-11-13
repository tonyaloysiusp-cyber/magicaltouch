'use client';

// Brand workspace (admins only): Magical Touch Design's own business cards,
// letterheads, invoice, certificates, posters and social posts, made with
// the real logo and the brand spectrum. These rows are saved as drafts
// tagged "mt-internal", so the database (RLS) never shows them to customers
// and they never appear in the public template catalogue.
// Also: brand colours with print values, and an e-mail signature maker.

import { refreshPublicLists } from '@/lib/siteRefresh';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Copy, Check, ExternalLink, Loader2, ShieldCheck, Pencil, ChevronDown, Archive, RotateCcw, Download } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { hexToCmykPercent } from '@/lib/color/cmyk';
import { fillCertificateJson, SAMPLE_CERTIFICATE } from '@/lib/certificates';

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

interface BrandRow { id: string; name: string; width: number; height: number; category: string; tags: string[]; thumbnail: string | null; canvas_json?: any }

const card = 'rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6';
const btn = 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-full text-[13px] font-semibold';

export default function BrandWorkspacePage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [rows, setRows] = useState<BrandRow[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/brand');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      const { data } = await supabase
        .from('templates')
        .select('id, name, width, height, category, tags, thumbnail')
        .overlaps('tags', ['mt-internal', 'brand-promo'])
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

  const live = rows.filter((r) => !r.tags.includes(ARCHIVED));
  const archived = rows.filter((r) => r.tags.includes(ARCHIVED));
  const groups = groupRows(live);
  const setArchived = async (row: BrandRow, on: boolean) => {
    const tags = on ? [...row.tags.filter((t) => t !== ARCHIVED), ARCHIVED] : row.tags.filter((t) => t !== ARCHIVED);
    refreshPublicLists();
    const { error } = await supabase.from('templates').update({ tags }).eq('id', row.id);
    if (!error) setRows((list) => list.map((r) => (r.id === row.id ? { ...r, tags } : r)));
  };
  return (
    <AdminShell active="brand" title="Brand workspace" accent="Brand" subtitle="Magical Touch Design’s own logo, stationery, certificates, ID cards, roll-ups, posters and social posts. Kept apart from customer templates and private to admins.">
      <div className="flex flex-col gap-4">
        <p className="inline-flex items-center gap-2 text-[13px] text-mt-muted">
          <ShieldCheck size={16} className="text-emerald-600" /> These designs are private: they never appear in the template gallery or the Template Manager.
        </p>
        <Group id="basics" title="Logo & brand assets" note="Logo files, colours with print values, app icons and social covers" defaultOpen><BrandBasics /><BrandAssets /></Group>
        {groups.map(([title, list, note]) => (
          <Group key={title} id={slug(title)} title={title} count={list.length} note={note}
            action={title === 'Certificates' ? <Link href="/admin/certificates" className={`${btn} bg-mt-primary text-mt-onprimary`}><ShieldCheck size={14} /> Issue a verified certificate</Link> : undefined}>
            {subGroups(title, list).map(([sub, items]) => (
              <div key={sub} className="mt-4 first:mt-0">
                {sub && <h3 className="text-[13px] font-semibold text-mt-muted mb-2">{sub} <span className="text-mt-faint">{items.length}</span></h3>}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                  {items.map((r) => <BrandTile key={r.id} row={r} onArchive={() => setArchived(r, true)} />)}
                </div>
              </div>
            ))}
          </Group>
        ))}
        {!live.length && <p className={card}>No brand designs yet.</p>}
        <Group id="signature" title="E-mail signature maker" note="Copy a ready signature for Gmail or Outlook"><SignatureMaker /></Group>
        {archived.length > 0 && (
          <Group id="archived" title="Archived" count={archived.length} note="Removed from the groups above. Restore any time.">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {archived.map((r) => <BrandTile key={r.id} row={r} onRestore={() => setArchived(r, false)} />)}
            </div>
          </Group>
        )}
      </div>
    </AdminShell>
  );
}

const ARCHIVED = 'brand-archived';
const slug = (t: string) => t.toLowerCase().replace(/[^a-z]+/g, '-');

// A collapsible section; its designs are only drawn once it is opened.
function Group({ id, title, count, note, action, defaultOpen, children }: { id: string; title: string; count?: number; note?: string; action?: ReactNode; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <section id={id} className={`${card} scroll-mt-20 !p-0 overflow-hidden`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 px-5 sm:px-6 py-4 text-left hover:bg-mt-surface2/60">
        <ChevronDown size={18} className={`shrink-0 text-mt-muted transition-transform ${open ? '' : '-rotate-90'}`} />
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-semibold text-mt-ink">{title}{count !== undefined && <span className="ml-2 text-[13px] font-medium text-mt-faint">{count}</span>}</span>
          {note && <span className="block text-[12.5px] text-mt-muted">{note}</span>}
        </span>
      </button>
      {open && (
        <div className="px-5 sm:px-6 pb-6">
          {action && <div className="mb-4">{action}</div>}
          {children}
        </div>
      )}
    </section>
  );
}

// Official designs by kind; the promotional posts (brand-promo) by channel.
function groupRows(rows: BrandRow[]): [string, BrandRow[], string][] {
  const kind = (r: BrandRow) => {
    const n = r.name.toLowerCase();
    if (r.tags.includes('brand-promo')) return r.tags.includes('festival') ? 'Festival greetings' : 'Promotional posts';
    if (/signature/.test(n)) return 'E-mail signatures';
    if (/certificate/.test(n)) return 'Certificates';
    if (/id badge|name badge|lanyard|staff id|id card/.test(n)) return 'ID cards, badges & lanyards';
    if (/roll-up|pull-up|flag|signage|banner/.test(n) && !/newsletter/.test(n)) return 'Roll-ups, banners & flags';
    if (/event|ticket|agenda|speaker|stage|table tent|challenge/.test(n)) return 'Events & stage';
    if (/business card|envelope|letterhead|invoice|thank-you card|voucher|price list/.test(n)) return 'Stationery & business documents';
    if (/\bpost\b|story|highlight/.test(n)) return 'Social media';
    return 'Posters, presentations & marketing';
  };
  const meta: [string, string][] = [
    ['Stationery & business documents', 'Business cards, letterheads, envelope, invoice, vouchers, price list'],
    ['ID cards, badges & lanyards', 'Staff ID, name badges and lanyard cards'],
    ['Certificates', 'Appreciation, completion and secure verified certificates'],
    ['Roll-ups, banners & flags', 'Roll-up banners, flags and signage for events and the studio'],
    ['Events & stage', 'Invitations, tickets, agenda, stage screen and event posts'],
    ['Posters, presentations & marketing', 'Posters, company presentation and newsletter header'],
    ['Social media', 'Official posts, stories and highlight covers'],
    ['Promotional posts', 'Brand messages and template promos for every channel'],
    ['Festival greetings', 'Magical Touch greetings for festivals and special days'],
    ['E-mail signatures', 'Signature banners'],
  ];
  const m = new Map<string, BrandRow[]>();
  rows.forEach((r) => m.set(kind(r), [...(m.get(kind(r)) || []), r]));
  return meta.filter(([k]) => m.has(k)).map(([k, note]) => [k, m.get(k)!, note]);
}

// Promotional posts split by channel; other groups stay as one list.
function subGroups(title: string, list: BrandRow[]): [string, BrandRow[]][] {
  if (title !== 'Promotional posts') return [['', list]];
  const CH: [string, string][] = [['promo-post', 'Instagram posts'], ['promo-square', 'Square posts'], ['promo-story', 'Stories'], ['promo-fb', 'Facebook posts'], ['promo-google', 'Google Business posts'], ['promo-linkedin', 'LinkedIn posts'], ['promo-pin', 'Pinterest pins'], ['promo-yt', 'YouTube thumbnails'], ['promo-header', 'Headers & covers'], ['promo-quote', 'Founder quotes']];
  const out: [string, BrandRow[]][] = CH.map(([tag, label]) => [label, list.filter((r) => r.tags.includes(tag))] as [string, BrandRow[]]).filter(([, l]) => l.length);
  const rest = list.filter((r) => !CH.some(([tag]) => r.tags.includes(tag)));
  if (rest.length) out.push(['Other', rest]);
  return out;
}

function BrandTile({ row, onArchive, onRestore }: { row: BrandRow; onArchive?: () => void; onRestore?: () => void }) {
  const [img, setImg] = useState<string | null>(row.thumbnail);
  const [name, setName] = useState(row.name.replace(/^MT Brand · /, ''));
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveName = async () => {
    const clean = name.trim();
    const prefix = row.name.startsWith('MT Brand · ') ? 'MT Brand · ' : '';
    setEditing(false);
    if (!clean || `${prefix}${clean}` === row.name) return setName(row.name.replace(/^MT Brand · /, ''));
    setSaving(true);
    refreshPublicLists();
    const { error } = await supabase.from('templates').update({ name: `${prefix}${clean}` }).eq('id', row.id);
    setSaving(false);
    if (error) setName(row.name.replace(/^MT Brand · /, ''));
    else row.name = `${prefix}${clean}`;
  };
  const [pages, setPages] = useState(1);
  useEffect(() => {
    let alive = true;
    // The design is loaded only when its group is opened (tiles mount then).
    (async () => {
      let cj = row.canvas_json;
      if (!cj) {
        const { data } = await supabase.from('templates').select('canvas_json').eq('id', row.id).maybeSingle();
        cj = (data as any)?.canvas_json;
        row.canvas_json = cj;
      }
      if (!cj || !alive) return;
      // Certificate masters hold {{tokens}}; preview them with sample values.
      const json = JSON.stringify(cj).includes('{{') ? fillCertificateJson(cj, SAMPLE_CERTIFICATE) : cj;
      const p = await renderTemplatePages(json, 520).catch(() => []);
      if (alive && p.length) { setImg(p[0].url); setPages(p.length); }
    })();
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
      {editing ? (
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setName(row.name.replace(/^MT Brand · /, '')); setEditing(false); } }}
          aria-label="Design name"
          className="mt-2 h-8 rounded-lg border border-mt-input-border bg-mt-surface px-2 text-[13px] font-semibold text-mt-ink"
        />
      ) : (
        <button type="button" onClick={() => setEditing(true)} title="Rename" className="mt-2 group inline-flex items-start gap-1.5 text-left text-[13px] font-semibold text-mt-ink leading-snug">
          <span>{name}</span>
          {saving ? <Loader2 size={12} className="mt-0.5 animate-spin text-mt-faint" /> : <Pencil size={12} className="mt-0.5 shrink-0 text-mt-faint opacity-0 group-hover:opacity-100" />}
        </button>
      )}
      <p className="text-[12px] text-mt-muted">
        {isPrint ? `${mm(row.width)} × ${mm(row.height)} mm` : `${row.width} × ${row.height} px`}
        {pages > 1 ? ` · ${pages} pages` : ''}
      </p>
      <span className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
        <Link href={href} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#3B82C4] hover:underline">
          Edit design <ExternalLink size={12} />
        </Link>
        <Link href={copyHref} className="text-[12.5px] font-medium text-mt-muted hover:text-mt-ink hover:underline">Use a copy</Link>
        {onArchive && <button type="button" onClick={onArchive} className="inline-flex items-center gap-1 text-[12.5px] font-medium text-mt-muted hover:text-rose-600"><Archive size={12} /> Archive</button>}
        {onRestore && <button type="button" onClick={onRestore} className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-700 hover:underline"><RotateCcw size={12} /> Restore</button>}
      </span>
    </div>
  );
}

const ASSETS: [string, string, string][] = [
  ['/logo.png', 'Logo (colour)', '900 × 129 PNG, transparent'],
  ['/logo-white.png', 'Logo (white)', 'For dark backgrounds'],
  ['/logo-google.png', 'Google logo', 'Square logo for Google Business'],
  ['/brand/profile-picture.png', 'Profile picture', 'Social media profile'],
  ['/brand/app-icon-512.png', 'App icon', '512 × 512'],
  ['/brand/app-icon-maskable-512.png', 'App icon (maskable)', 'Android home screen'],
  ['/brand/cover-1500x500.png', 'X / Twitter header', '1500 × 500'],
  ['/brand/cover-facebook-1640x624.png', 'Facebook cover', '1640 × 624'],
  ['/brand/cover-linkedin-1584x396.png', 'LinkedIn banner', '1584 × 396'],
];

function BrandAssets() {
  return (
    <div className="mt-6">
      <h3 className="text-[14px] font-semibold text-mt-ink">Brand assets</h3>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {ASSETS.map(([src, label, note]) => (
          <a key={src} href={src} download className="group rounded-2xl border border-mt-border bg-mt-surface p-2.5 hover:border-mt-ink/30">
            <span className="block aspect-[4/3] rounded-xl bg-[repeating-conic-gradient(#f1f1f3_0_25%,#fff_0_50%)] bg-[length:16px_16px] grid place-items-center overflow-hidden p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={label} loading="lazy" className="max-h-full max-w-full object-contain" />
            </span>
            <span className="mt-2 flex items-center justify-between gap-1 text-[12.5px] font-semibold text-mt-ink">{label} <Download size={12} className="text-mt-faint group-hover:text-mt-ink" /></span>
            <span className="block text-[11.5px] text-mt-muted">{note}</span>
          </a>
        ))}
      </div>
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
    <section>
      <div className="grid lg:grid-cols-[1fr_1.4fr] gap-6">
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
    <section>
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
