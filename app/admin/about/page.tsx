'use client';

// About page wording (admins only). Optional sections — story, vision and
// the founder's biography — appear on /about only when filled in here, so
// the public page never shows made-up facts. Saved in site_settings; the
// database lets only admins write it.

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ExternalLink, Loader2, Save } from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';

const FIELDS: { key: string; label: string; help: string; rows: number }[] = [
  { key: 'about_mission', label: 'Our mission', help: 'Leave empty to use the current default wording.', rows: 4 },
  { key: 'about_vision', label: 'Our vision', help: 'Shown only when filled in.', rows: 4 },
  { key: 'about_story', label: 'Our story', help: 'How and why the company started. Shown only when filled in. Separate paragraphs with a blank line.', rows: 8 },
  { key: 'about_founder_bio', label: 'Founder — Tony Aloysius (biography)', help: 'Shown under the founder’s name and title only when filled in. Write only what you are happy to publish.', rows: 6 },
];
const MAX = 3000;

export default function AdminAboutPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [values, setValues] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin/about');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      const { data } = await supabase.from('site_settings').select('key, value').in('key', FIELDS.map((f) => f.key));
      const v: Record<string, string> = {};
      ((data as any[]) || []).forEach((r) => (v[r.key] = r.value || ''));
      setValues(v);
      setSaved(v);
      setState('ok');
    })();
  }, [router]);

  const dirty = FIELDS.some((f) => (values[f.key] || '') !== (saved[f.key] || ''));
  const save = async () => {
    const tooLong = FIELDS.find((f) => (values[f.key] || '').length > MAX);
    if (tooLong) return setMsg({ tone: 'err', text: `“${tooLong.label}” is too long (${MAX} characters at most).` });
    setBusy(true);
    setMsg(null);
    const rows = FIELDS.map((f) => ({ key: f.key, value: (values[f.key] || '').trim(), updated_at: new Date().toISOString() }));
    const { error } = await supabase.from('site_settings').upsert(rows);
    setBusy(false);
    if (error) return setMsg({ tone: 'err', text: error.message });
    const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    setValues(v);
    setSaved(v);
    setMsg({ tone: 'ok', text: 'Saved. The About page updates within 10 minutes.' });
  };

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg">
        <p className="text-lg font-semibold text-mt-ink">Administrators only</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link>
      </main>
    );

  return (
    <AdminShell active="about" title="About page" accent="About" subtitle="Edit the wording on the public About page. Empty optional sections stay hidden.">
      <div className="rounded-3xl border border-mt-border bg-mt-surface p-5 sm:p-6 flex flex-col gap-6">
        {FIELDS.map((f) => (
          <div key={f.key}>
            <label htmlFor={f.key} className="block text-[15px] font-semibold">{f.label}</label>
            <p id={`${f.key}-help`} className="text-[13px] text-mt-muted">{f.help}</p>
            <textarea
              id={f.key}
              aria-describedby={`${f.key}-help`}
              rows={f.rows}
              maxLength={MAX}
              value={values[f.key] || ''}
              onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              className="mt-2 w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-[15px] leading-relaxed text-mt-ink"
            />
            <p className="text-right text-[11px] text-mt-faint tabular-nums">{(values[f.key] || '').length}/{MAX}</p>
          </div>
        ))}
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={save} disabled={busy || !dirty} className="h-10 px-5 rounded-full bg-mt-primary text-mt-onprimary text-[14px] font-semibold inline-flex items-center gap-2 disabled:opacity-40">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Save changes
          </button>
          <a href="/about" target="_blank" rel="noreferrer" className="h-10 px-4 rounded-full border border-mt-border text-[14px] font-semibold inline-flex items-center gap-1.5"><ExternalLink size={15} /> View About page</a>
          {msg && <p role={msg.tone === 'err' ? 'alert' : 'status'} className={`text-[13px] ${msg.tone === 'err' ? 'text-rose-600' : 'text-emerald-700 dark:text-emerald-300'}`}>{msg.text}</p>}
        </div>
      </div>
    </AdminShell>
  );
}
