'use client';

// App frame for every standalone tool: the tool opens straight away under a
// slim Magical Touch bar (logo · tool name · switch tool · theme · help),
// like a desktop app — no website hero in front of it. How it works,
// questions and related tools sit below the workspace for whoever wants them.

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, CircleHelp, LayoutGrid, Moon, Sun } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { BackChip } from '@/components/tools/BackChip';
import { ToolIcon } from '@/components/tools/ToolsDirectory';
import { TOOLS, rememberTool } from '@/lib/toolsCatalog';
import { useAppTheme } from '@/hooks/useAppTheme';

export interface ToolShellProps {
  path: string;
  /** The page's H1 — shown as the tool name in the bar. */
  h1: string;
  name?: string;
  sub?: string;
  icon?: string;
  about?: ReactNode;
  children: ReactNode;
}

function Switcher({ current }: { current: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const off = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', off);
    return () => document.removeEventListener('mousedown', off);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} className="h-9 px-3 rounded-full border border-mt-border text-[13px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-surface2">
        <LayoutGrid size={15} /> <span className="hidden sm:inline">Tools</span> <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div role="menu" aria-label="Switch tool" className="absolute right-0 z-[80] mt-1.5 w-[300px] rounded-2xl border border-mt-border bg-mt-surface p-1.5 shadow-[0_18px_40px_-12px_rgba(9,9,11,0.3)]">
          {TOOLS.map((t) => (
            <Link key={t.id} role="menuitem" href={t.href} onClick={() => { rememberTool(t.id); setOpen(false); }} aria-current={t.href === current ? 'page' : undefined}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 ${t.href === current ? 'bg-mt-surface2' : 'hover:bg-mt-surface2'}`}>
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mt-ink text-mt-bg"><ToolIcon name={t.icon} size={14} /></span>
              <span className="min-w-0"><span className="block text-[13px] font-semibold truncate">{t.title}</span><span className="block text-[11.5px] text-mt-muted truncate">{t.hint}</span></span>
            </Link>
          ))}
          <Link role="menuitem" href="/tools" onClick={() => setOpen(false)} className="mt-1 flex items-center justify-center rounded-xl border border-mt-border px-3 py-2 text-[12.5px] font-semibold hover:bg-mt-surface2">All tools</Link>
        </div>
      )}
    </div>
  );
}

export function ToolShell({ path, h1, name, sub, icon, about, children }: ToolShellProps) {
  const { theme, toggleTheme } = useAppTheme();
  const entry = TOOLS.find((t) => t.href === path);
  const title = name || entry?.title || h1;
  useEffect(() => { if (entry) rememberTool(entry.id); }, [entry]);
  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      <div className="min-h-[100dvh] bg-mt-bg text-mt-ink flex flex-col">
        <header className="sticky top-0 z-[70] bg-mt-surface/95 backdrop-blur border-b border-mt-border">
          <div className="h-14 px-3 sm:px-5 flex items-center gap-3">
            <Link href="/" aria-label="Magical Touch Design — home" className="shrink-0"><BrandLogo theme={theme} width={118} height={24} /></Link>
            <span aria-hidden className="h-6 w-px bg-mt-border" />
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mt-ink text-mt-bg"><ToolIcon name={icon || entry?.icon || 'Sparkles'} size={16} /></span>
            <div className="min-w-0 mr-auto">
              <h1 className="text-[15px] font-semibold leading-tight truncate" title={h1}>{title}<span className="sr-only"> — {h1}</span></h1>
              {(sub || entry?.hint) && <p className="hidden sm:block text-[11.5px] text-mt-muted truncate">{sub || entry?.hint}</p>}
            </div>
            <span className="hidden md:inline-flex"><BackChip /></span>
            <Switcher current={path} />
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light theme' : 'Dark theme'} className="h-9 w-9 grid place-items-center rounded-full border border-mt-border hover:bg-mt-surface2">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
            {about && <a href="#about" aria-label="How it works and questions" className="h-9 w-9 grid place-items-center rounded-full border border-mt-border hover:bg-mt-surface2"><CircleHelp size={15} /></a>}
          </div>
          <div aria-hidden className="h-[3px]" style={{ background: 'var(--mt-spectrum)' }} />
        </header>
        <main className="flex-1 w-full max-w-[1800px] mx-auto px-3 sm:px-5 py-4 sm:py-5">{children}</main>
        {about && (
          <section id="about" aria-label="How it works and questions" className="scroll-mt-20 border-t border-mt-border bg-mt-surface2/40">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">{about}</div>
          </section>
        )}
        <footer className="border-t border-mt-border px-4 sm:px-6 py-4 text-[12px] text-mt-muted flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-semibold text-mt-ink">Magical Touch Design</span>
          <Link href="/tools" className="hover:text-mt-ink">All tools</Link>
          <Link href="/templates" className="hover:text-mt-ink">Templates</Link>
          <Link href="/create" className="hover:text-mt-ink">Design editor</Link>
          <Link href="/privacy" className="hover:text-mt-ink">Privacy</Link>
          <span className="ml-auto">Your files stay on this device.</span>
        </footer>
      </div>
    </div>
  );
}

/** Standard "about" block: intro, steps, questions, related tools. */
export function ToolAbout({ intro, steps, faq, related, extra }: { intro?: string; steps?: [string, string][]; faq?: [string, string][]; related?: { href: string; label: string }[]; extra?: ReactNode }) {
  return (
    <div className="space-y-10">
      {intro && <p className="max-w-3xl text-[16px] text-mt-muted leading-relaxed">{intro}</p>}
      {steps && steps.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold">How it works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-mt-border bg-mt-surface p-4">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-mt-primary text-mt-onprimary text-[12px] font-semibold">{i + 1}</span>
                <h3 className="mt-2.5 text-[14.5px] font-semibold">{t}</h3>
                <p className="mt-1 text-[13.5px] text-mt-muted leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
      {extra}
      {(faq?.length || related?.length) ? (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          {faq && faq.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold">Questions</h2>
              <div className="mt-3 divide-y divide-mt-border rounded-2xl border border-mt-border bg-mt-surface">
                {faq.map(([q, a]) => <details key={q} className="p-4"><summary className="cursor-pointer text-[14.5px] font-semibold">{q}</summary><p className="mt-2 text-[14px] text-mt-muted leading-relaxed">{a}</p></details>)}
              </div>
            </div>
          )}
          {related && related.length > 0 && (
            <nav aria-label="More free tools" className="rounded-2xl border border-mt-border bg-mt-surface p-5 self-start">
              <h2 className="text-[15px] font-semibold">More tools</h2>
              <ul className="mt-2 space-y-1.5 text-[14px]">{related.map((r) => <li key={r.href}><Link href={r.href} className="text-mt-muted hover:text-mt-ink">{r.label} →</Link></li>)}</ul>
            </nav>
          )}
        </div>
      ) : null}
    </div>
  );
}
