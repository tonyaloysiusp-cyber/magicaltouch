'use client';

import { useEffect, useMemo, useState } from 'react';
import { hexToCmykPercent } from '@/lib/color/cmyk';

// Print facts for a template preview: exact trim size in millimetres (and the
// paper name when it is a standard size), bleed and safe zone, and the main
// colours with HEX and press CMYK (Coated FOGRA39) values.

const PX_PER_MM = 96 / 25.4;
const PAPERS: [string, number, number][] = [
  ['A3', 297, 420], ['A4', 210, 297], ['A5', 148, 210], ['A6', 105, 148],
  ['Business card', 90, 55], ['Business card (US)', 89, 51], ['DL', 99, 210], ['Letter', 216, 279],
];

export function paperName(wMm: number, hMm: number): string | null {
  for (const [n, a, b] of PAPERS) {
    if (Math.abs(wMm - a) <= 1 && Math.abs(hMm - b) <= 1) return n;
    if (Math.abs(wMm - b) <= 1 && Math.abs(hMm - a) <= 1) return `${n} ${a < b ? 'landscape' : 'portrait'}`;
  }
  return null;
}

const HEX = /^#([0-9a-f]{6})$/i;
const norm = (c: unknown): string | null => {
  if (typeof c !== 'string') return null;
  const s = c.trim();
  if (HEX.test(s)) return s.toUpperCase();
  const m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toUpperCase();
  const r = /^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i.exec(s);
  if (r && (r[4] === undefined || +r[4] >= 0.6)) return `#${[r[1], r[2], r[3]].map((v) => (+v).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
  return null;
};

/** Main colours of a design, weighted by area, most used first. */
export function designColors(canvasJson: any, fallback: string[], max = 5): string[] {
  const score = new Map<string, number>();
  const add = (c: unknown, w: number) => { const h = norm(c); if (h) score.set(h, (score.get(h) || 0) + w); };
  const walk = (objs: any[]) => {
    for (const o of objs || []) {
      if (!o || o.__isGuide || o.__isArtboard) continue;
      if (o.objects) { walk(o.objects); continue; }
      const area = Math.max(1, Math.abs((o.width || 0) * (o.scaleX || 1) * (o.height || 0) * (o.scaleY || 1)));
      const isText = typeof o.text === 'string';
      const w = isText ? Math.max(area * 0.6, 4000) : area;
      if (typeof o.fill === 'string') add(o.fill, w);
      else if (o.fill?.colorStops) for (const s of o.fill.colorStops) add(s.color, w / o.fill.colorStops.length);
      if (o.stroke && o.strokeWidth) add(o.stroke, Math.max(1, (o.strokeWidth || 1) * 200));
    }
  };
  try {
    const j = typeof canvasJson === 'string' ? JSON.parse(canvasJson) : canvasJson;
    walk(j?.objects || []);
  } catch {
    /* fall back below */
  }
  const ranked = [...score.entries()].sort((a, b) => b[1] - a[1]).map(([h]) => h);
  // Skip near-duplicates so the swatches show distinct inks.
  const out: string[] = [];
  const dist = (a: string, b: string) => {
    const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const [x, y] = [p(a), p(b)];
    return Math.abs(x[0] - y[0]) + Math.abs(x[1] - y[1]) + Math.abs(x[2] - y[2]);
  };
  for (const h of [...ranked, ...fallback.map(norm).filter(Boolean) as string[]]) {
    if (out.length >= max) break;
    if (out.every((o) => dist(o, h) > 40)) out.push(h);
  }
  return out;
}

function printBox(canvasJson: any): { bleedMm: number; safeMm: number } | null {
  try {
    const j = typeof canvasJson === 'string' ? JSON.parse(canvasJson) : canvasJson;
    const ab = (j?.objects || []).find((o: any) => o?.__isArtboard && o.__print);
    if (!ab) return null;
    const side = (v: any) => (typeof v === 'number' ? v : Math.min(...['top', 'right', 'bottom', 'left'].map((k) => Number(v?.[k]) || 0)));
    const b = side(ab.__print.bleed), s = side(ab.__print.safeArea);
    return { bleedMm: Math.round((b / PX_PER_MM) * 10) / 10, safeMm: Math.round((s / PX_PER_MM) * 10) / 10 };
  } catch {
    return null;
  }
}

export function PrintSpecs({ width, height, print, canvasJson, colors }: { width: number; height: number; print: boolean; canvasJson?: any; colors: string[] }) {
  const swatches = useMemo(() => designColors(canvasJson, colors), [canvasJson, colors]);
  const [cmyk, setCmyk] = useState<Record<string, [number, number, number, number]>>({});
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all(swatches.map(async (h) => [h, await hexToCmykPercent(h)] as const))
      .then((rows) => alive && setCmyk(Object.fromEntries(rows)))
      .catch(() => {});
    return () => { alive = false; };
  }, [swatches]);
  const wMm = Math.round(width / PX_PER_MM), hMm = Math.round(height / PX_PER_MM);
  const paper = print ? paperName(wMm, hMm) : null;
  const box = print ? printBox(canvasJson) : null;
  const copy = (txt: string) => {
    navigator.clipboard?.writeText(txt).then(() => { setCopied(txt); setTimeout(() => setCopied(null), 1200); }).catch(() => {});
  };
  return (
    <div className="mt-5 rounded-xl border border-mt-border p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-mt-muted">{print ? 'Print specs' : 'Design specs'}</p>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
        {print ? (
          <>
            <dt className="text-mt-muted">Trim size</dt>
            <dd>{wMm} × {hMm} mm{paper ? ` · ${paper}` : ''}</dd>
            <dt className="text-mt-muted">Bleed</dt>
            <dd>{box && box.bleedMm > 0 ? `${box.bleedMm} mm each side` : '3 mm recommended'}{box && box.safeMm > 0 ? ` · safe zone ${box.safeMm} mm` : ''}</dd>
            <dt className="text-mt-muted">Print file</dt>
            <dd>300 dpi PDF, CMYK (Coated FOGRA39)</dd>
          </>
        ) : (
          <>
            <dt className="text-mt-muted">Size</dt>
            <dd>{Math.round(width)} × {Math.round(height)} px</dd>
          </>
        )}
      </dl>
      {swatches.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-mt-muted mb-1.5">Colours <span className="opacity-70">(tap to copy)</span></p>
          <ul className="space-y-1">
            {swatches.map((h) => {
              const c = cmyk[h];
              const cm = c ? `C${c[0]} M${c[1]} Y${c[2]} K${c[3]}` : '…';
              return (
                <li key={h} className="flex items-center gap-2 text-xs">
                  <span className="h-5 w-5 rounded border border-black/10 dark:border-white/20 shrink-0" style={{ background: h }} />
                  <button onClick={() => copy(h)} className="font-mono hover:text-mt-accent">{copied === h ? 'Copied' : h}</button>
                  <button onClick={() => c && copy(cm)} className="font-mono text-mt-muted hover:text-mt-accent">{copied === cm ? 'Copied' : cm}</button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
