'use client';

// Remembers which tool pages a visitor opens ("Recently used" on /tools) and
// the trail of pages in this tab, so Back returns to the tool they came from.
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { recordTrail, rememberTool, toolForPath } from '@/lib/toolsCatalog';

export function ToolVisitTracker() {
  const path = usePathname();
  useEffect(() => {
    const t = path && toolForPath(path); if (t) rememberTool(t.id);
    if (path) recordTrail(path + (typeof window !== 'undefined' ? window.location.search : ''));
  }, [path]);
  return null;
}
