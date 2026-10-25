'use client';

// Home page top menu: the site-wide menu, see-through until you scroll.
import { SiteHeader } from '@/components/SiteHeader';
import type { AppTheme } from '@/hooks/useAppTheme';

export function Navbar({ theme, onToggleTheme }: { theme: AppTheme; onToggleTheme: () => void }) {
  return <SiteHeader theme={theme} onToggleTheme={onToggleTheme} active="home" transparentTop />;
}
