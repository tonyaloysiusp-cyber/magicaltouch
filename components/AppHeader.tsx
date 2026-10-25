'use client';

// Kept for the pages that already use it: the same site-wide top menu.
import { SiteHeader, SiteTab } from '@/components/SiteHeader';
import type { AppTheme } from '@/hooks/useAppTheme';

export function AppHeader({ theme, onToggleTheme, active, onCreate }: { theme: AppTheme; onToggleTheme: () => void; active?: SiteTab; onCreate?: () => boolean | void }) {
  return <SiteHeader theme={theme} onToggleTheme={onToggleTheme} active={active} onCreate={onCreate} />;
}
