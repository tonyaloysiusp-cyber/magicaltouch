'use client';

import { useMemo } from 'react';
import { BOX_STYLES, makeDieline, type BoxStyleId } from '@/lib/packaging/dieline';

/** Small dieline drawing used by the style pickers. */
export function StyleThumb({ id, className = 'h-14 w-full' }: { id: BoxStyleId; className?: string }) {
  const svg = useMemo(() => {
    const corr = BOX_STYLES.find((s) => s.id === id)?.group === 'Corrugated';
    const d = makeDieline({ style: id, L: 60, W: 40, D: 50, t: corr ? 3 : 0.5, glue: corr ? 30 : 14, tuck: 15, lidDepth: 20 });
    const pad = 4;
    return { vb: `${-pad} ${-pad} ${d.w + 2 * pad} ${d.h + 2 * pad}`, lines: d.lines, sw: Math.max(d.w, d.h) / 90 };
  }, [id]);
  return (
    <svg viewBox={svg.vb} className={className} aria-hidden>
      {svg.lines.map((l, i) => <path key={i} d={l.d} fill="none" stroke={l.kind === 'cut' ? 'currentColor' : '#00A0E3'} strokeWidth={svg.sw} strokeDasharray={l.kind === 'cut' ? undefined : `${svg.sw * 3} ${svg.sw * 2}`} />)}
    </svg>
  );
}
