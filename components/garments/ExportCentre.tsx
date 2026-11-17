'use client';

// Export Centre — the same clean block in every textile product. It shows
// only the outputs that apply to the product (no cutting pattern for a
// printed jersey, no machine file without embroidery), checks before
// export, and offers everything in one Complete production package.
//  · For the factory   — Technical production file (one branded PDF), cutting pattern
//  · For the printer   — Ready-to-print file (no branding)
//  · For embroidery    — DST + EXP machine files (checked) — real stitch files
// Nothing is uploaded.

import { useState } from 'react';
import { CheckCircle2, Download, Factory, Loader2, Package, Printer, Sparkles, TriangleAlert } from 'lucide-react';

export type ExportFile = { name: string; data: Uint8Array };
export interface ExportItem {
  id: string; title: string; hint: string;
  group: 'factory' | 'printer' | 'embroidery';
  make: () => Promise<ExportFile[]>;
  pro?: boolean;        // shown in Professional mode only
  inPackage?: boolean;  // default true
}

const GROUPS: { id: ExportItem['group']; label: string; icon: any }[] = [
  { id: 'factory', label: 'For the factory', icon: Factory },
  { id: 'printer', label: 'For the printer', icon: Printer },
  { id: 'embroidery', label: 'For embroidery', icon: Sparkles },
];

async function saveAll(files: ExportFile[], zipName?: string) {
  const save = (blob: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
  const type = (n: string) => (/\.pdf$/i.test(n) ? 'application/pdf' : /\.svg$/i.test(n) ? 'image/svg+xml' : /\.png$/i.test(n) ? 'image/png' : 'application/octet-stream');
  if (zipName && files.length > 1) { const { buildZip } = await import('@/lib/editor/zip'); save(buildZip(files), zipName); return; }
  for (const f of files) { save(new Blob([f.data as unknown as BlobPart], { type: type(f.name) }), f.name); await new Promise((r) => setTimeout(r, 400)); }
}

export function ExportCentre({ items, pro, checks, packageName, note }: { items: ExportItem[]; pro: boolean; checks: { ok: boolean; text: string }[]; packageName: string; note?: string }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = items.filter((i) => pro || !i.pro);
  const blocked = checks.some((c) => !c.ok);

  const run = async (id: string, list: ExportItem[], zip?: string) => {
    setBusy(id); setMsg(null);
    try {
      const files: ExportFile[] = [];
      for (const it of list) files.push(...(await it.make()));
      if (!files.length) throw new Error('Nothing to download.');
      // Zip folders keep multi-file outputs (several SVG pages) together.
      await saveAll(files, zip || (files.length > 1 ? `${packageName}-${id}.zip` : undefined));
      setMsg({ ok: true, text: `Downloaded ${files.length === 1 ? files[0].name : `${files.length} files${zip ? ` in ${zip}` : ''}`}.` });
    } catch (e: any) { setMsg({ ok: false, text: e?.message || 'The file could not be made in this browser.' }); }
    setBusy(null);
  };

  return (
    <section aria-label="Export centre" className="rounded-3xl border border-mt-border bg-mt-surface p-4 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[15px] font-semibold mr-auto">Export centre</p>
        <button type="button" onClick={() => run('package', shown.filter((i) => i.inPackage !== false), `${packageName}-production-package.zip`)} disabled={!!busy || blocked}
          className="h-10 px-4 rounded-full bg-mt-primary text-mt-onprimary text-[13px] font-semibold inline-flex items-center gap-2 disabled:opacity-50">
          {busy === 'package' ? <Loader2 size={15} className="animate-spin" /> : <Package size={15} />} Complete production package
        </button>
      </div>
      {checks.length > 0 && (
        <ul aria-label="Checks before export" className="grid gap-1 text-[12.5px] sm:grid-cols-2">
          {checks.map((c) => <li key={c.text} className={`flex items-start gap-1.5 ${c.ok ? 'text-mt-muted' : 'text-rose-600'}`}>{c.ok ? <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-600" /> : <TriangleAlert size={14} className="mt-0.5 shrink-0" />}{c.text}</li>)}
        </ul>
      )}
      <div className="grid gap-3 md:grid-cols-3">
        {GROUPS.map((g) => {
          const list = shown.filter((i) => i.group === g.id);
          if (!list.length) return null;
          const I = g.icon;
          return (
            <div key={g.id} role="group" aria-label={g.label} className="rounded-2xl border border-mt-border p-3 space-y-2">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted inline-flex items-center gap-1.5"><I size={14} className="text-mt-accent" /> {g.label}</p>
              {list.map((it) => (
                <button key={it.id} type="button" onClick={() => run(it.id, [it])} disabled={!!busy || blocked} title={it.hint}
                  className="w-full rounded-xl border border-mt-border px-3 py-2 text-left hover:bg-mt-surface2 disabled:opacity-50">
                  <span className="flex items-center gap-2 text-[13px] font-semibold">{busy === it.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} {it.title}</span>
                  <span className="block text-[11.5px] text-mt-muted">{it.hint}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>
      {msg && <p role="status" className={`text-[12.5px] ${msg.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600'}`}>{msg.text}</p>}
      {note && <p className="text-[11.5px] text-mt-faint">{note}</p>}
    </section>
  );
}
