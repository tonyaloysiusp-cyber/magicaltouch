// Size chart CSV parsing (pure; runs in tests).

import type { Field, Measures } from './draft.ts';

export type ChartRow = { name: string; qty: number; m: Measures };

/** Parses a CSV size chart (a row per size). Columns are matched by key or label; values are in `unit`. */
export function parseChartCsv(text: string, fields: Field[], toCm: (n: number) => number): { rows: ChartRow[]; unknown: string[] } {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return { rows: [], unknown: [] };
  const split = (l: string) => l.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
  const head = split(lines[0]).map((h) => h.toLowerCase());
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, '');
  const col = head.map((h) => {
    if (/^(size|name)$/.test(h)) return 'size';
    if (/^(qty|quantity|pcs|count)$/.test(h)) return 'qty';
    // Exact key first, then the start of a label, then the longest key the header starts with.
    const f = fields.find((x) => norm(x.key) === norm(h)) || fields.find((x) => norm(x.label).startsWith(norm(h)))
      || fields.filter((x) => norm(h).startsWith(norm(x.key))).sort((a, b) => b.key.length - a.key.length)[0];
    return f ? f.key : null;
  });
  const unknown = head.filter((_, i) => !col[i]);
  const rows = lines.slice(1).map((l) => {
    const c = split(l), m: Measures = {};
    let name = '', qty = 0;
    c.forEach((v, i) => {
      const k = col[i]; if (!k) return;
      if (k === 'size') name = v;
      else if (k === 'qty') qty = Math.max(0, Math.floor(Number(v) || 0));
      else { const n = parseFloat(v.replace(',', '.')); if (Number.isFinite(n)) m[k] = Math.round(toCm(n) * 1000) / 1000; }
    });
    return { name, qty, m };
  }).filter((r) => r.name);
  return { rows, unknown };
}

