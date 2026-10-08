'use client';

import Link from 'next/link';
import { Plus } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { ThemeSwitch } from '@/components/ThemeSwitch';
import { ProfileMenu } from '@/components/ProfileMenu';
import type { AppTheme } from '@/hooks/useAppTheme';

const LINKS = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard' },
  { id: 'templates', label: 'Templates', href: '/templates' },
  { id: 'photo', label: 'Photo Studio', href: '/photo-studio' },
] as const;

// The signed-in app's top bar (create, profile, ...): logo, main links,
// day/night switch, New Design and the account menu -- the same bar on
// every page so navigation always looks and works the same.
export function AppHeader({ theme, onToggleTheme, active }: { theme: AppTheme; onToggleTheme: () => void; active?: (typeof LINKS)[number]['id'] | 'create' | 'profile' }) {
  return (
    <header className="sticky top-0 z-40 mt-glass border-b border-mt-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" title="Go to homepage" className="shrink-0">
          <BrandLogo theme={theme} width={150} height={30} />
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              className={`text-sm font-medium px-3 py-2 rounded-full transition-colors ${
                active === l.id ? 'text-mt-ink bg-mt-surface2' : 'text-mt-muted hover:text-mt-ink'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 shrink-0">
          <ThemeSwitch theme={theme} onToggle={onToggleTheme} />
          {active !== 'create' && (
            <Link
              href="/create"
              className="hidden sm:inline-flex items-center gap-1.5 text-white px-4 py-2.5 rounded-full text-sm font-semibold bg-brand-gradient shadow-[0_6px_16px_-6px_rgba(108,79,209,0.5)] hover:-translate-y-0.5 transition-transform"
            >
              <Plus size={15} /> New Design
            </Link>
          )}
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
