'use client';

// Frame for every standalone tool, laid out like desktop software: app bar
// (home, back, tool name, switch tool, help, theme), the workspace, a status
// bar. How it works, questions and related tools sit below the workspace.

import { ReactNode, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, CircleHelp, LayoutGrid, Moon, Sun } from 'lucide-react';
import { Footer } from '@/components/home/Footer';
import { SiteHeader } from '@/components/SiteHeader';
import { BackChip } from '@/components/tools/BackChip';
import { ToolIcon } from '@/components/tools/ToolsDirectory';
import { TOOLS, rememberTool } from '@/lib/toolsCatalog';
import { useAppTheme } from '@/hooks/useAppTheme';
import { Unbounded } from 'next/font/google';

// The wordmark's wide, rounded display face — the same as the home page.
const display = Unbounded({ subsets: ['latin'], weight: ['500', '600'], variable: '--font-display' });

export interface ToolShellProps {
  path: string;
  /** The page's H1 — shown as the tool name in the bar. */
  h1: string;
  name?: string;
  sub?: string;
  icon?: string;
  about?: ReactNode;
  /** 'app' (default): software layout for working tools. 'page': website layout (site menu, page width) for start pages. */
  variant?: 'app' | 'page';
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
      <button type="button" aria-expanded={open} aria-haspopup="menu" onClick={() => setOpen((v) => !v)} aria-label="Switch tool" className="h-8 px-2.5 rounded-lg border border-mt-border bg-mt-surface text-[12.5px] font-semibold inline-flex items-center gap-1.5 hover:bg-mt-surface2">
        <LayoutGrid size={15} /> <span className="hidden sm:inline">Switch tool</span> <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <div role="menu" aria-label="Switch tool" className="absolute right-0 z-[80] text-left mt-1.5 w-[300px] max-h-[75vh] overflow-y-auto rounded-2xl border border-mt-border bg-mt-surface p-1.5 shadow-[0_18px_40px_-12px_rgba(9,9,11,0.3)]">
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

export function ToolShell({ path, h1, name, sub, icon, about, variant = 'app', children }: ToolShellProps) {
  const { theme, toggleTheme } = useAppTheme();
  const entry = TOOLS.find((t) => t.href === path);
  const title = name || entry?.title || h1;
  useEffect(() => { if (entry) rememberTool(entry.id); }, [entry]);
  if (variant === 'page') {
    // Website layout: the site's own menu, page-width content, help and footer.
    return (
      <div className={`${display.variable} ${theme === 'dark' ? 'dark' : ''}`}>
        <div className="min-h-screen bg-mt-bg text-mt-ink">
          <SiteHeader theme={theme} onToggleTheme={toggleTheme} active="tools" />
          <main className="mx-auto w-full max-w-[1400px] px-4 pb-12 pt-4 sm:px-6">
            <h1 className="sr-only">{h1}</h1>
            {children}
          </main>
          {about && (
            <section id="about" aria-label="How it works and questions" className="scroll-mt-14 border-t border-mt-border bg-mt-surface2/40">
              <div className="mx-auto max-w-[1200px] px-4 py-10 sm:px-6">{about}</div>
            </section>
          )}
          <Footer theme={theme} />
        </div>
      </div>
    );
  }
  // Software layout: a slim app bar, the workspace filling the screen and a
  // status bar. The page's marketing headline, how-it-works and questions sit
  // below the workspace (still on the page for search engines and new users).
  return (
    <div className={`${display.variable} ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="bg-mt-bg text-mt-ink">
        <div className="flex min-h-[100dvh] flex-col">
          <header className="sticky top-0 z-[60] flex h-12 shrink-0 items-center gap-1.5 border-b border-mt-border bg-mt-surface/95 px-2 backdrop-blur sm:px-3" aria-label="Tool bar">
            <Link href="/" aria-label="Magical Touch Design home" className="flex h-8 shrink-0 items-center rounded-lg px-1.5 hover:bg-mt-surface2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={theme === 'dark' ? '/logo-white.png' : '/logo.png'} alt="" className="h-6 w-auto" />
            </Link>
            <span className="h-5 w-px bg-mt-border" aria-hidden />
            <BackChip compact />
            <span className="h-5 w-px bg-mt-border" aria-hidden />
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-mt-ink text-mt-bg"><ToolIcon name={icon || entry?.icon || 'Sparkles'} size={14} /></span>
            <h1 className="min-w-0 truncate text-[14px] font-semibold tracking-[-0.01em]">{title}</h1>
            <span className="hidden min-w-0 truncate text-[12.5px] text-mt-faint lg:inline">— {sub || entry?.hint}</span>
            <span className="flex-1" />
            <Switcher current={path} />
            {about && <a href="#about" aria-label="How it works and questions" className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink"><CircleHelp size={15} /><span className="hidden md:inline">Help</span></a>}
            <button type="button" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'} className="grid h-8 w-8 place-items-center rounded-lg text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink">{theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}</button>
          </header>
          <main className="flex-1 w-full bg-mt-bg bg-[radial-gradient(circle,rgba(9,9,11,0.06)_1px,transparent_1px)] dark:bg-[radial-gradient(circle,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:22px_22px]">
            <div className="w-full max-w-[2000px] mx-auto px-2 sm:px-3 py-3">{children}</div>
          </main>
          <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-mt-border bg-mt-surface/95 px-3 text-[11px] text-mt-muted backdrop-blur" aria-label="Status bar">
            <span className="inline-flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden /> Runs on this device · your files are not uploaded</span>
            <span className="hidden sm:inline text-mt-faint">{title}</span>
            <span className="flex-1" />
            <Link href="/tools" className="hover:text-mt-ink">All tools</Link>
            {about && <a href="#about" className="hover:text-mt-ink">Help & questions ↓</a>}
          </footer>
        </div>
        {about && (
          <section id="about" aria-label="How it works and questions" className="scroll-mt-14 border-t border-mt-border bg-mt-surface2/40">
            <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-medium tracking-[-0.02em] sm:text-3xl">{h1}</h2>
              {(sub || entry?.hint) && <p className="mt-2 text-[15px] text-mt-muted">{sub || entry?.hint}</p>}
              <div className="mt-8">{about}</div>
            </div>
          </section>
        )}
        <Footer theme={theme} />
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
          <h2 className="font-[family-name:var(--font-display)] text-xl font-medium tracking-[-0.02em]">How it works</h2>
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
              <h2 className="font-[family-name:var(--font-display)] text-xl font-medium tracking-[-0.02em]">Questions</h2>
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
