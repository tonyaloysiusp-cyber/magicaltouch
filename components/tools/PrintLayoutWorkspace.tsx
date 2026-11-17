'use client';

import { useEffect, useState } from 'react';
import { useToolMode } from '@/components/ToolMode';
import { ImpositionStudio } from './ImpositionStudio';
import { PrintLayout } from './PrintLayout';

// Print Layout: the full imposition studio, plus the quick many-up / booklet
// layout (kept as it was for simple jobs and JPG / PNG pictures).
export function PrintLayoutWorkspace() {
  // Simple = the quick layout, Pro = the full imposition studio (remembered per device).
  const [pro, setPro] = useToolMode('print-layout');
  const [tab, setTab] = useState<'studio' | 'quick'>('quick');
  useEffect(() => { setTab(pro ? 'studio' : 'quick'); }, [pro]);
  useEffect(() => { try { const m = new URLSearchParams(location.search).get('mode'); if (m === 'quick') setTab('quick'); if (m === 'studio') setTab('studio'); } catch { /* ignore */ } }, []);
  const choose = (id: 'studio' | 'quick') => { setTab(id); setPro(id === 'studio'); };
  const t = (id: 'studio' | 'quick', label: string) => <button type="button" role="tab" aria-selected={tab === id} onClick={() => choose(id)} className={`h-10 px-4 rounded-xl text-[13.5px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Print layout mode" className="flex w-fit gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">{t('quick', 'Simple · Quick layout (cards, photos, booklet)')}{t('studio', 'Pro · Imposition studio')}</div>
      <div hidden={tab !== 'studio'}><ImpositionStudio /></div>
      <div hidden={tab !== 'quick'}><PrintLayout /></div>
    </div>
  );
}
