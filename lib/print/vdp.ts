// Variable data: spreadsheet rows → one personalised design per row.
// CSV / TSV parsing (quotes, commas or tabs, Excel paste), {Column} placeholders,
// serial numbers ({#0001} starts at 1 with 4 digits, {#250} starts at 250).

export interface DataSet { headers: string[]; rows: string[][] }

/** Parses CSV or tab-separated text (pasted from Excel / Google Sheets). Quotes and "" escapes supported. */
export function parseTable(text: string): DataSet {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n').trimEnd();
  if (!src) return { headers: [], rows: [] };
  const first = src.split('\n')[0];
  const delim = (first.match(/\t/g) || []).length > 0 ? '\t' : (first.match(/;/g) || []).length > (first.match(/,/g) || []).length ? ';' : ',';
  const rows: string[][] = []; let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; continue; }
    if (c === '"' && cell === '') q = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  row.push(cell); rows.push(row);
  const headers = rows.shift()!.map((h, i) => h.trim() || `Column ${i + 1}`);
  return { headers, rows: rows.filter((r) => r.some((c) => c.trim())).map((r) => headers.map((_, i) => (r[i] ?? '').trim())) };
}

/** Fills {Column} and serial {#0001} placeholders for row `index` (0-based). */
export function fillTemplate(tpl: string, ds: DataSet, index: number): string {
  const row = ds.rows[index] || [];
  return tpl.replace(/\{#(\d+)\}/g, (_m, start: string) => String(Number(start) + index).padStart(start.length, '0'))
    .replace(/\{([^{}#][^{}]*)\}/g, (m, name: string) => { const i = ds.headers.findIndex((h) => h.toLowerCase() === name.trim().toLowerCase()); return i >= 0 ? row[i] ?? '' : m; });
}

/** Placeholders in a template that match no column (shown as warnings). */
export function unknownFields(tpl: string, ds: DataSet): string[] {
  return [...tpl.matchAll(/\{([^{}#][^{}]*)\}/g)].map((m) => m[1].trim()).filter((n) => !ds.headers.some((h) => h.toLowerCase() === n.toLowerCase()));
}

/** Grid of designs per sheet (N-up) with gaps: positions in mm from the sheet's top-left. */
export function nUp(sheetW: number, sheetH: number, w: number, h: number, gap: number, margin: number): { cols: number; rows: number; x0: number; y0: number; per: number } {
  const cols = Math.max(0, Math.floor((sheetW - 2 * margin + gap) / (w + gap))), rows = Math.max(0, Math.floor((sheetH - 2 * margin + gap) / (h + gap)));
  const x0 = (sheetW - (cols * w + (cols - 1) * gap)) / 2, y0 = (sheetH - (rows * h + (rows - 1) * gap)) / 2;
  return { cols, rows, x0, y0, per: cols * rows };
}
