'use client';

// "Ads & posts" for one landing page: Google Ads copy that fits the
// character limits, and ready posts for each social channel with a tracked
// link. Copy, paste, publish — visits show up per channel in the Overview.

import { useMemo, useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { buildAdPack } from '@/lib/adCopy';

export function AdsDialog({ row, onClose }: { row: { slug: string; h1: string; thing: string; description: string; templates: number | null }; onClose: () => void }) {
  const pack = useMemo(() => buildAdPack(row), [row]);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = (id: string, t: string) => navigator.clipboard?.writeText(t).then(() => { setCopied(id); setTimeout(() => setCopied((c) => (c === id ? null : c)), 1500); });
  const CopyBtn = ({ id, text }: { id: string; text: string }) => (
    <button onClick={() => copy(id, text)} className="h-8 px-3 rounded-full border border-mt-border text-[12px] font-semibold inline-flex items-center gap-1.5 shrink-0">{copied === id ? <Check size={13} /> : <Copy size={13} />} {copied === id ? 'Copied' : 'Copy'}</button>
  );
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-6" role="dialog" aria-modal="true" aria-label={`Ads and posts for ${row.h1}`} onClick={onClose}>
      <div className="w-full sm:max-w-3xl max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-mt-surface border border-mt-border p-5 sm:p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold flex-1">Ads & posts — {row.h1}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-full inline-flex items-center justify-center hover:bg-mt-surface2"><X size={18} /></button>
        </div>
        <p className="mt-1 text-[13px] text-mt-muted">Generated from the page. Every link carries a tracking tag, so you can see which channel brings visitors.</p>

        <h3 className="mt-6 font-semibold">Google Ads (responsive search ad)</h3>
        <p className="text-[12px] text-mt-muted">Paste into a new Search campaign. Google’s free ad credit for new advertisers often covers the first test budget.</p>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-mt-border p-3">
            <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-semibold">Headlines ({pack.googleHeadlines.length}) · max 30</p><CopyBtn id="h" text={pack.googleHeadlines.join('\n')} /></div>
            <ol className="mt-2 text-[13px] space-y-1 list-decimal pl-5">{pack.googleHeadlines.map((h) => <li key={h}>{h} <span className="text-mt-faint tabular-nums">{h.length}</span></li>)}</ol>
          </div>
          <div className="flex flex-col gap-4">
            <div className="rounded-2xl border border-mt-border p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-semibold">Descriptions · max 90</p><CopyBtn id="d" text={pack.googleDescriptions.join('\n')} /></div>
              <ol className="mt-2 text-[13px] space-y-1 list-decimal pl-5">{pack.googleDescriptions.map((h) => <li key={h}>{h} <span className="text-mt-faint tabular-nums">{h.length}</span></li>)}</ol>
            </div>
            <div className="rounded-2xl border border-mt-border p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-[12px] font-semibold">Keywords (phrase match)</p><CopyBtn id="k" text={pack.keywords.map((k) => `"${k}"`).join('\n')} /></div>
              <p className="mt-2 text-[13px] text-mt-muted">{pack.keywords.map((k) => `"${k}"`).join(', ')}</p>
            </div>
          </div>
        </div>

        <h3 className="mt-6 font-semibold">Social posts</h3>
        <ul className="mt-3 flex flex-col gap-3">
          {pack.posts.map((p) => (
            <li key={p.channel} className="rounded-2xl border border-mt-border p-3">
              <div className="flex items-center justify-between gap-2"><p className="text-[13px] font-semibold">{p.channel}</p><CopyBtn id={p.channel} text={p.text} /></div>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-[13px] text-mt-muted">{p.text}</pre>
              {!p.text.includes(p.link) && <div className="mt-2 flex items-center gap-2"><code className="flex-1 text-[11px] break-all text-mt-faint">{p.link}</code><CopyBtn id={`${p.channel}-l`} text={p.link} /></div>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
