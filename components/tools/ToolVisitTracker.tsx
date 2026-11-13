'use client';

// Remembers which tool pages a visitor opens, for "Recently used" on /tools.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { rememberTool, toolForPath } from '@/lib/toolsCatalog';

export function ToolVisitTracker() {
  const path = usePathname();
  useEffect(() => { const t = path && toolForPath(path); if (t) rememberTool(t.id); }, [path]);
  return null;
}
