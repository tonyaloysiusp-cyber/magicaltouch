'use client';

// Admin → SEO → Dashboard → "Runs on its own": every automatic job in plain
// words with when it last ran, plus one-tap fixes that are always safe.

import { useEffect, useState } from 'react';
import { Bot, CheckCircle2, Loader2, Wand2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface Job { name: string; schedule: string; active: boolean; last_run: string | null; last_status: string | null }
const ABOUT: Record<string, [string, string]> = {
  'mt-daily-admin-check': ['Daily check', 'Looks for festivals coming up, renewals due and new customer messages, and puts them in your Inbox.'],
  'mt-daily-landing-check': ['Landing page check', 'Opens every landing page, removes broken or empty ones, and sends new pages to Bing and other search engines (IndexNow).'],
  'mt-weekly-seo-autopilot': ['Weekly SEO autopilot', 'Reads which pages get visitors from Google, improves weak titles and suggests new pages.'],
};
const when = (s: string) => {
  const m = s.trim().split(/\s+/);
  if (m.length !== 5) return s;
  const time = `${m[1].padStart(2, '0')}:${m[0].padStart(2, '0')} UTC`;
  if (m[4] === '1') return `Mondays ${time}`;
  if (m[2] === '*' && m[4] === '*') return `Every day ${time}`;
  return s;
};
const ago = (iso: string) => {
  const h = Math.round((Date.now() - new Date(iso).getTime()) / 3600000);
  return h < 1 ? 'just now' : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

export function Automation({ flash }: { flash: (m: string) => void }) {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    supabase.rpc('admin_automation_status').then(({ data }) => setJobs((data as Job[]) || []));
  }, []);
  const fill = async () => {
    setBusy(true);
    const { data, error } = await supabase.rpc('template_seo_autofill');
    setBusy(false);
    flash(error ? error.message : data ? `Added search words to ${data} templates.` : 'All published templates already have search words.');
  };
  return (
    <section className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <span className="h-9 w-9 rounded-xl bg-mt-surface2 grid place-items-center"><Bot size={18} /></span>
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-[16px] font-semibold">Runs on its own</h2>
          <p className="text-[13px] text-mt-muted">You don’t need to do these — they happen automatically. Green means the last run worked.</p>
        </div>
        <button onClick={fill} disabled={busy} className="h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border border-mt-border disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} Fill missing template search words</button>
      </div>
      {jobs === null ? <p className="mt-4 text-sm text-mt-muted inline-flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Loading…</p> : (
        <ul className="mt-4 grid gap-3 md:grid-cols-3">
          {jobs.map((j) => {
            const ok = j.active && j.last_status === 'succeeded';
            const [title, text] = ABOUT[j.name] || [j.name, ''];
            return (
              <li key={j.name} className="rounded-2xl border border-mt-border p-3.5">
                <p className="flex items-center gap-1.5 text-[14px] font-semibold">{ok ? <CheckCircle2 size={15} className="text-emerald-600" /> : <XCircle size={15} className="text-rose-600" />}{title}</p>
                <p className="mt-1 text-[12.5px] text-mt-muted leading-snug">{text}</p>
                <p className="mt-2 text-[11.5px] text-mt-faint">{when(j.schedule)} · {j.last_run ? `last ran ${ago(j.last_run)}` : 'not run yet'}{!j.active ? ' · switched off' : ''}</p>
              </li>
            );
          })}
          <li className="rounded-2xl border border-mt-border p-3.5">
            <p className="flex items-center gap-1.5 text-[14px] font-semibold"><CheckCircle2 size={15} className="text-emerald-600" />Live counts & sitemaps</p>
            <p className="mt-1 text-[12.5px] text-mt-muted leading-snug">When a template is published, the template count, sitemap and Google image list update within minutes.</p>
            <p className="mt-2 text-[11.5px] text-mt-faint">On every change</p>
          </li>
        </ul>
      )}
    </section>
  );
}
