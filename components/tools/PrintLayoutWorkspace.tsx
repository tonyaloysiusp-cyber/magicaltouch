'use client';

import { useEffect, useState } from 'react';
import { ImpositionStudio } from './ImpositionStudio';
import { PrintLayout } from './PrintLayout';

// Print Layout: the full imposition studio, plus the quick many-up / booklet
// layout (kept as it was for simple jobs and JPG / PNG pictures).
export function PrintLayoutWorkspace() {
  const [tab, setTab] = useState<'studio' | 'quick'>('studio');
  useEffect(() => { try { if (new URLSearchParams(location.search).get('mode') === 'quick') setTab('quick'); } catch { /* ignore */ } }, []);
  const t = (id: 'studio' | 'quick', label: string) => <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-10 px-4 rounded-xl text-[13.5px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Print layout mode" className="flex w-fit gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">{t('studio', 'Imposition studio')}{t('quick', 'Quick layout (cards, photos, booklet)')}</div>
      <div hidden={tab !== 'studio'}><ImpositionStudio /></div>
      <div hidden={tab !== 'quick'}><PrintLayout /></div>
    </div>
  );
}
