'use client';

import { useEffect, useMemo, useState } from 'react';
import { Crown, Plus, Loader2 } from 'lucide-react';
import { Template, TemplateCategory, fetchPublicTemplates, fetchCategories } from '@/lib/templatesData';
import { SearchField, cx } from '../ui';

const ORDER = ['Birthday', 'Events', 'Wedding', 'Business', 'Social Media', 'Marketing', 'Menus', 'Certificates', 'Resume', 'Cards'];

let cache: { templates: Template[]; categories: TemplateCategory[] } | null = null;

export function TemplatesPanel({
  onUse,
  busyId,
  initialCategory,
}: {
  onUse: (t: Template, mode: 'replace' | 'newPage') => void;
  busyId: string | null;
  initialCategory?: string | null;
}) {
  const [templates, setTemplates] = useState<Template[]>(cache?.templates || []);
  const [categories, setCategories] = useState<TemplateCategory[]>(cache?.categories || []);
  const [loading, setLoading] = useState(!cache);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<string>(initialCategory || 'All');

  useEffect(() => {
    if (cache) return;
    Promise.all([fetchPublicTemplates(), fetchCategories()])
      .then(([t, c]) => {
        const usable = t.filter((x) => x.id && x.thumbnail);
        cache = { templates: usable, categories: c };
        setTemplates(usable);
        setCategories(c);
      })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (initialCategory) setCat(initialCategory);
  }, [initialCategory]);

  const catName = (t: Template) => categories.find((c) => c.id === t.categoryId)?.name || t.category;
  const cats = useMemo(() => {
    const names = Array.from(new Set(templates.map(catName))) as string[];
    return names.sort((a, b) => ((ORDER.indexOf(a) + 100) % 100) - ((ORDER.indexOf(b) + 100) % 100));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, categories]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return templates.filter((t) => {
      if (cat !== 'All' && catName(t) !== cat) return false;
      if (!needle) return true;
      const hay = `${t.name} ${catName(t)} ${(t.tags || []).join(' ')} ${t.occasion || ''} ${t.industry || ''}`.toLowerCase();
      return needle.split(/\s+/).every((w) => hay.includes(w));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, categories, q, cat]);

  return (
    <div className="flex flex-col h-full">
      <SearchField value={q} onChange={setQ} placeholder="Search templates" />
      <div className="flex gap-1.5 overflow-x-auto mt-3 pb-1 -mx-1 px-1 mt-scroll">
        {['All', ...cats].map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={cx(
              'shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
              cat === c ? 'bg-mt-primary text-mt-onprimary border-mt-primary' : 'border-mt-border text-mt-muted hover:text-mt-ink'
            )}
          >
            {c}
          </button>
        ))}
      </div>
      <p className="text-[11px] text-mt-faint mt-2 mb-2">
        {loading ? 'Loading templates…' : `${visible.length} template${visible.length === 1 ? '' : 's'}. Tap to use, or drag onto your page.`}
      </p>
      <div className="columns-2 gap-2 [&>*]:mb-2 pb-6">
        {visible.map((t) => (
          <div
            key={t.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('application/x-mt-asset', `template:${t.id}`)}
            className="group relative break-inside-avoid rounded-xl overflow-hidden ring-1 ring-mt-border bg-mt-surface2 mt-card-hover"
          >
            <button type="button" onClick={() => onUse(t, 'replace')} className="block w-full text-left" title={`Use “${t.name}”`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={t.thumbnail!}
                alt={t.name}
                loading="lazy"
                className="w-full h-auto block"
                style={{ aspectRatio: `${t.width} / ${Math.min(t.height, t.width * 2.1)}`, objectFit: 'cover' }}
              />
            </button>
            {t.isFree === false && (
              <span className="absolute top-1.5 left-1.5 inline-flex items-center gap-0.5 text-[9px] font-semibold uppercase text-[#09090B] bg-mt-creative px-1.5 py-0.5 rounded-full">
                <Crown size={9} /> Premium
              </span>
            )}
            <button
              type="button"
              onClick={() => onUse(t, 'newPage')}
              title="Add as a new page"
              aria-label={`Add ${t.name} as a new page`}
              className="absolute top-1.5 right-1.5 h-7 w-7 inline-flex items-center justify-center rounded-full bg-white/95 text-[#09090B] shadow opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
            >
              <Plus size={14} />
            </button>
            {busyId === t.id && (
              <span className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/50">
                <Loader2 className="animate-spin" size={20} />
              </span>
            )}
            <p className="px-2 py-1.5 text-[11px] text-mt-muted truncate">{t.name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
