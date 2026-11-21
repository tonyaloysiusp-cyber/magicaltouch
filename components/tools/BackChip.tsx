'use client';

// "← Back to Pattern Design" — returns to the page this visitor came from in
// this tab (another tool, the editor, templates), shown above a tool.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { previousStep, TrailStep } from '@/lib/toolsCatalog';

export function BackChip({ fallback = { path: '/tools', title: 'All tools' }, compact = false }: { fallback?: TrailStep; compact?: boolean }) {
  const path = usePathname();
  const [prev, setPrev] = useState<TrailStep | null>(null);
  useEffect(() => { const t = setTimeout(() => setPrev(previousStep(path || '')), 50); return () => clearTimeout(t); }, [path]);
  const to = prev || fallback;
  return (
    <Link href={to.path} title={`Back to ${to.title}`} aria-label={`Back to ${to.title}`} className={compact ? 'inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-mt-muted hover:bg-mt-surface2 hover:text-mt-ink' : 'inline-flex h-9 items-center gap-1.5 rounded-full border border-mt-border bg-mt-surface px-3.5 text-[13px] font-semibold text-mt-ink hover:border-mt-ink/40'}>
      <ArrowLeft size={14} /> <span className={compact ? 'hidden xl:inline' : ''}>Back to </span>{compact ? <span className="sr-only xl:not-sr-only">{to.title}</span> : to.title}
    </Link>
  );
}
