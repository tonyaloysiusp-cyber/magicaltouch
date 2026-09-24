'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpRight } from 'lucide-react';
import { resolveAuthedPath } from '@/lib/authNav';
import { CATEGORIES, TEMPLATES, Category, Template, fetchTemplates } from '@/lib/templatesData';
import { MockDesignCard } from '@/components/MockDesignCard';
import { Reveal } from './Reveal';

export function TemplateShowcase() {
  const [active, setActive] = useState<Category | 'All'>('All');
  const [templates, setTemplates] = useState<Template[]>(TEMPLATES);
  const router = useRouter();

  useEffect(() => {
    fetchTemplates().then(setTemplates);
  }, []);

  const visible = useMemo(
    () => (active === 'All' ? templates.slice(0, 8) : templates.filter((t) => t.category === active).slice(0, 8)),
    [active, templates]
  );

  const useTemplate = async () => {
    router.push(await resolveAuthedPath('/create'));
  };

  return (
    <section className="bg-white border-y border-black/10">
      <div className="max-w-6xl mx-auto px-6 py-24">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-[#6C4FD1] tracking-wide uppercase">Templates</p>
              <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl sm:text-4xl leading-tight">
                A running start for every project.
              </h2>
            </div>
          </div>
        </Reveal>

        <Reveal delayMs={100}>
          <div className="mt-8 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {(['All', ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => setActive(c)}
                className={`shrink-0 text-sm font-medium px-4 py-2 rounded-full border transition-colors ${
                  active === c
                    ? 'bg-[#17161B] text-white border-[#17161B]'
                    : 'border-black/15 text-[#4A4750] hover:border-black/40'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          {visible.map((t, i) => (
            <Reveal key={t.name} delayMs={i * 40}>
              <button onClick={useTemplate} className="group w-full text-left">
                <div
                  className="relative w-full rounded-xl overflow-hidden shadow-sm group-hover:shadow-lg group-hover:-translate-y-1 transition-all duration-300"
                  style={{ aspectRatio: `${t.width} / ${t.height}` }}
                >
                  <MockDesignCard colors={t.colors} label={t.name} />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                    <span className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-semibold text-[#17161B] bg-white px-3 py-1.5 rounded-full">
                      Use Template <ArrowUpRight size={13} />
                    </span>
                  </div>
                </div>
                <p className="mt-2 text-xs font-medium text-[#17161B] truncate">{t.name}</p>
                <p className="text-[11px] text-[#4A4750]">{t.category}</p>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
