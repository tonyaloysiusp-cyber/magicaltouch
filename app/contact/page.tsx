'use client';

// Contact: messages go straight to the admin inbox (and the admins'
// morning e-mail). Anyone can write; the database limits repeats.

import { useState } from 'react';
import Link from 'next/link';
import { Mail, MessageCircle, Clock, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { AppHeader } from '@/components/AppHeader';
import { PageHero } from '@/components/PageHero';
import { useAppTheme } from '@/hooks/useAppTheme';

const field = 'w-full h-12 rounded-2xl border border-mt-input-border bg-mt-surface px-4 text-[15px] text-mt-ink placeholder:text-mt-faint focus:outline-none focus:border-[#3B82C4] focus:ring-4 focus:ring-[#8CCBFF]/30';

export default function ContactPage() {
  const { theme, toggleTheme } = useAppTheme();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setState('sending');
    const { error } = await supabase.rpc('submit_contact_message', { p_name: form.name, p_email: form.email, p_subject: form.subject, p_message: form.message });
    if (error) {
      setError(error.message.replace(/^.*?: /, ''));
      setState('idle');
      return;
    }
    setState('sent');
  };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink transition-colors duration-300">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} />
        <PageHero eyebrow="Contact" title="We’d love to hear from you." accent="hear from you" subtitle="Questions, ideas for templates, or help with your account — send us a message and we’ll reply by e-mail." />
        <div className="mt-container py-10 grid lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-8 2xl:gap-12 items-start">
          <section className="rounded-3xl border border-mt-border bg-mt-surface p-6 sm:p-8">
            {state === 'sent' ? (
              <div className="py-10 text-center">
                <span className="mx-auto w-14 h-14 rounded-2xl bg-mt-primary text-mt-onprimary inline-flex items-center justify-center">
                  <Check size={24} />
                </span>
                <h2 className="mt-5 text-2xl font-semibold">Thank you — message sent.</h2>
                <p className="mt-2 text-mt-muted">We usually reply within one working day, from hellomagicaltouch.design@gmail.com.</p>
                <Link href="/" className="mt-6 inline-flex h-11 items-center px-6 rounded-full border border-mt-border text-sm font-semibold hover:bg-mt-surface2">Back to the home page</Link>
              </div>
            ) : (
              <form onSubmit={send} className="flex flex-col gap-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="text-sm text-mt-muted flex flex-col gap-1.5">Your name<input className={field} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" /></label>
                  <label className="text-sm text-mt-muted flex flex-col gap-1.5">E-mail<input type="email" required className={field} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" /></label>
                </div>
                <label className="text-sm text-mt-muted flex flex-col gap-1.5">Subject<input className={field} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="What is it about?" /></label>
                <label className="text-sm text-mt-muted flex flex-col gap-1.5">Message<textarea required minLength={5} maxLength={5000} className={`${field} h-44 py-3 leading-relaxed`} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></label>
                {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
                <button type="submit" disabled={state === 'sending'} className="self-start h-12 px-8 rounded-full bg-mt-primary text-mt-onprimary text-[15px] font-semibold disabled:opacity-50">
                  {state === 'sending' ? 'Sending…' : 'Send message'}
                </button>
              </form>
            )}
          </section>
          <aside className="flex flex-col gap-4">
            {[
              { icon: <Mail size={18} />, t: 'E-mail', d: 'hellomagicaltouch.design@gmail.com', href: 'mailto:hellomagicaltouch.design@gmail.com', tint: '#35C2F1' },
              { icon: <Clock size={18} />, t: 'Reply time', d: 'Usually within one working day.', tint: '#8CC84B' },
              { icon: <MessageCircle size={18} />, t: 'Template ideas', d: 'Tell us what you’d like to design next — we add new templates every week.', tint: '#F2708F' },
            ].map((c) => (
              <div key={c.t} className="rounded-3xl border border-mt-border bg-mt-surface p-5 flex gap-4">
                <span className="w-10 h-10 rounded-xl inline-flex items-center justify-center shrink-0" style={{ background: `${c.tint}26`, color: c.tint }}>{c.icon}</span>
                <span>
                  <span className="block font-semibold">{c.t}</span>
                  {c.href ? <a href={c.href} className="text-sm text-mt-muted hover:text-mt-ink break-all">{c.d}</a> : <span className="text-sm text-mt-muted">{c.d}</span>}
                </span>
              </div>
            ))}
          </aside>
        </div>
      </main>
    </div>
  );
}
