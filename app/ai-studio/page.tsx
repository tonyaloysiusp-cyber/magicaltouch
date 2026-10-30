'use client';

// AI Studio for everyone (/ai-studio): paste or upload any design you like,
// or describe one, and a free AI chat (Claude, ChatGPT, Gemini, Copilot…)
// rebuilds it as an editable design in your account. Visitors who aren't
// signed in see what it does and are asked to sign in first (designs are
// saved to the account). Also a search landing page for "AI template
// generator".

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ImagePlus, MousePointerClick, Sparkles, Wand2 } from 'lucide-react';
import { AppHeader } from '@/components/AppHeader';
import { Footer } from '@/components/home/Footer';
import { ClaudeTemplate } from '@/components/admin/ClaudeTemplate';
import { getSessionUser } from '@/lib/supabase';
import { useAppTheme } from '@/hooks/useAppTheme';
import { AI_PROVIDERS } from '@/lib/templates/aiProviders';

const STEPS = [
  { icon: <ImagePlus size={20} />, title: 'Paste a design you like', body: 'A screenshot, a Pinterest pin, a poster from the street — or just describe what you need.' },
  { icon: <MousePointerClick size={20} />, title: 'Pick a free AI', body: 'Claude, ChatGPT, Gemini, Copilot and more open with the instructions ready. Your free account is enough.' },
  { icon: <Wand2 size={20} />, title: 'Paste the reply — done', body: 'It becomes a fully editable design in about a minute: every word, colour, font and photo.' },
];
const FAQS: [string, string][] = [
  ['Is the AI Studio free?', 'Yes. It uses the free plans of popular AI chats in your own browser tab, and the editor and downloads on Magical Touch Design are free with no watermark.'],
  ['Will it copy someone else’s design?', 'It rebuilds the layout and style as an editable starting point and replaces the text with your own. Don’t reuse other people’s logos, photos or trademarks — swap in your own.'],
  ['Which AI works best?', 'Claude and ChatGPT follow the template format most reliably. Gemini and Copilot also read images well.'],
  ['Do I need an account?', 'A free Magical Touch account, so your new design is saved and you can come back to it.'],
];

export default function AiStudioPage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const [user, setUser] = useState<string | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  useEffect(() => { getSessionUser().then(({ data }) => setUser(data.user?.id || null)); }, []);
  const start = () => (user ? setOpen(true) : router.push('/login?next=/ai-studio'));
  const jsonLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: FAQS.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) };

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <main className="min-h-screen bg-mt-bg text-mt-ink">
        <AppHeader theme={theme} onToggleTheme={toggleTheme} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <section className="mt-container py-12 sm:py-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D97757]">New · AI Template Studio</p>
          <h1 className="mt-3 max-w-3xl text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.04]">Paste any design. <span className="mt-spectrum-text">Edit it in a minute.</span></h1>
          <p className="mt-5 max-w-2xl text-[16px] sm:text-lg text-mt-muted leading-relaxed">See a flyer, invitation or post you love? Free AI rebuilds it as a fully editable design — then change every word, colour and photo and download a print-ready PDF or PNG. No watermark.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={start} disabled={user === undefined} className="h-12 px-6 rounded-2xl bg-mt-primary text-mt-onprimary font-semibold inline-flex items-center gap-2 disabled:opacity-50"><Sparkles size={18} /> {user === null ? 'Sign in & start free' : 'Open the AI Studio'}</button>
            <Link href="/templates" className="h-12 px-6 rounded-2xl border border-mt-border font-semibold inline-flex items-center gap-2 hover:bg-mt-surface2">Or browse templates <ArrowRight size={16} /></Link>
          </div>
          <p className="mt-4 text-[13px] text-mt-faint">Works with: {AI_PROVIDERS.map((p) => p.name).join(' · ')}</p>
        </section>

        <section className="mt-container pb-16">
          <ol className="grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-3xl border border-mt-border bg-mt-surface p-6">
                <span className="h-10 w-10 rounded-xl bg-mt-surface2 inline-flex items-center justify-center">{s.icon}</span>
                <h2 className="mt-4 text-lg font-semibold">{i + 1}. {s.title}</h2>
                <p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-container pb-20 max-w-3xl">
          <h2 className="text-2xl font-semibold">Questions</h2>
          <div className="mt-4 divide-y divide-mt-border border-y border-mt-border">
            {FAQS.map(([q, a]) => (
              <details key={q} className="py-4 group"><summary className="cursor-pointer font-medium list-none flex justify-between gap-4">{q}<span className="text-mt-muted group-open:rotate-45 transition-transform">+</span></summary><p className="mt-2 text-mt-muted text-[14px] leading-relaxed">{a}</p></details>
            ))}
          </div>
        </section>
        <Footer theme={theme} />
      </main>
      {open && user && <ClaudeTemplate userId={user} target="design" onClose={() => setOpen(false)} onCreated={(_id, href) => router.push(href)} />}
    </div>
  );
}
