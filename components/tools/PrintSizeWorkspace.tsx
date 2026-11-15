'use client';

import { useEffect, useState } from 'react';
import { BindingCalculator } from './BindingCalculator';
import { PrintCalculator } from './PrintCalculator';
import { FoldingCalculator } from './FoldingCalculator';

// Print Size & Binding Calculator: books and binding, plus the original
// paper size / DPI / bleed calculator (kept as it was).
export function PrintSizeWorkspace() {
  const [tab, setTab] = useState<'book' | 'size' | 'fold'>('book');
  useEffect(() => { try { const q = new URLSearchParams(location.search).get('tab'); if (q === 'size' || q === 'fold') setTab(q); } catch { /* ignore */ } }, []);
  const t = (id: 'book' | 'size' | 'fold', label: string) => <button type="button" role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`h-10 px-4 rounded-xl text-[13.5px] font-semibold ${tab === id ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted hover:text-mt-ink'}`}>{label}</button>;
  return (
    <div className="space-y-4">
      <div role="tablist" aria-label="Calculator" className="flex flex-wrap w-fit max-w-full gap-1 rounded-2xl border border-mt-border bg-mt-surface p-1">{t('book', 'Book, spine & cover')}{t('fold', 'Folding & brochures')}{t('size', 'Paper size, DPI & bleed')}</div>
      <div hidden={tab !== 'book'}><BindingCalculator /></div>
      <div hidden={tab !== 'fold'}><FoldingCalculator /></div>
      <div hidden={tab !== 'size'}><PrintCalculator /></div>
    </div>
  );
}
