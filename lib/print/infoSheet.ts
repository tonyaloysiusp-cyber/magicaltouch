// Print job information sheet: ONE A4 landscape page that travels with the
// print files — a preview of every side with its folds and panel sizes, the
// finished / folded size, bleed, safe area, fold positions, directions and
// order, the two print files (actual size and fit to print) with their sheet
// and scale, and who made it (designer, company, client). Vector SVG in mm
// for svgToPdf. Magical Touch Design branding sits in the header and footer
// only — never on the artwork itself.

import type { PrintJobInfo } from './printJob.ts';
import { sideFolds, sidePanels } from './printJob.ts';

export interface InfoPeople { jobName: string; client: string; designer: string; company: string; contact: string; notes: string }
export interface InfoFile { label: string; file: string; sheet: string; scale: number; printed: string; marks: string }
export interface InfoSheetData {
  job: PrintJobInfo; people: InfoPeople; date: string;
  previews: ({ src: string; w: number; h: number } | null)[];
  files: InfoFile[]; margin: number; colour: string;
  logo?: { src: string; w: number; h: number } | null;
}

const W = 297, H = 210, M = 12;
const r1 = (n: number) => Math.round(n * 10) / 10;
const r2 = (n: number) => Math.round(n * 100) / 100;
const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as any)[c]);

function wrap(s: string, max: number): string[] {
  const out: string[] = []; let line = '';
  for (const w of String(s).split(/\s+/)) {
    if (!w) continue;
    if ((line + ' ' + w).trim().length > max && line) { out.push(line); line = w; } else line = (line + ' ' + w).trim();
  }
  if (line) out.push(line);
  return out;
}

export function infoSheetSvg(d: InfoSheetData): string {
  const j = d.job;
  const T = (x: number, y: number, s: string, size = 2.9, o: { bold?: boolean; color?: string; anchor?: string } = {}) =>
    `<text x="${r2(x)}" y="${r2(y)}" font-family="Helvetica" font-size="${size}"${o.bold ? ' font-weight="700"' : ''} fill="${o.color || '#111827'}"${o.anchor ? ` text-anchor="${o.anchor}"` : ''}>${esc(s)}</text>`;
  let g = `<rect width="${W}" height="${H}" fill="#FFFFFF"/>`;

  // Header
  g += `<rect x="0" y="0" width="${W}" height="22" fill="#0F172A"/>`;
  let hx = M;
  if (d.logo) { const lh = 9, lw = lh * (d.logo.w / d.logo.h); g += `<rect x="${M - 2}" y="4.5" width="${r2(lw + 4)}" height="13" rx="2" fill="#FFFFFF"/><image x="${M}" y="6.5" width="${r2(lw)}" height="${lh}" href="${d.logo.src}"/>`; hx = M + lw + 7; }
  g += T(hx, 10.5, 'PRINT JOB INFORMATION', 5, { bold: true, color: '#FFFFFF' });
  g += T(hx, 16.5, `${d.people.jobName || 'Untitled job'} · ${j.title}`, 3.2, { color: '#CBD5E1' });
  g += T(W - M, 10.5, d.date, 3.2, { color: '#FFFFFF', anchor: 'end' });
  g += T(W - M, 16.5, 'Read with the two print files of this job', 2.6, { color: '#94A3B8', anchor: 'end' });

  // Left: previews with folds and panel sizes
  const LX = M, LW = 168, top = 30;
  g += T(LX, top, 'DESIGN PREVIEW', 3, { bold: true, color: '#475569' });
  const n = Math.max(1, j.sides.length);
  const availH = H - top - 30, perH = Math.min(availH / Math.min(n, 2) - 12, 70);
  const cols = n > 2 ? 2 : 1, rows = Math.ceil(n / cols);
  const cellW = (LW - (cols - 1) * 6) / cols, cellH = Math.min(perH, (availH - (rows - 1) * 16) / rows);
  for (let i = 0; i < n; i++) {
    const c = i % cols, rr = Math.floor(i / cols);
    const k = Math.min(cellW / j.trimW, cellH / j.trimH);
    const pw = j.trimW * k, ph = j.trimH * k;
    const x0 = LX + c * (cellW + 6) + (cellW - pw) / 2, y0 = top + 7 + rr * (cellH + 18);
    g += T(x0, y0 - 1.5, `${j.sides[i] || `Side ${i + 1}`}${n > 1 ? ` (${i + 1} of ${n})` : ''}`, 2.7, { bold: true });
    const pv = d.previews[i];
    if (pv) g += `<image x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" href="${pv.src}" preserveAspectRatio="none"/>`;
    else g += `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" fill="#F1F5F9"/>`;
    g += `<rect x="${r2(x0)}" y="${r2(y0)}" width="${r2(pw)}" height="${r2(ph)}" fill="none" stroke="#111827" stroke-width="0.25"/>`;
    for (const f of sideFolds(j, i)) {
      if (f.x != null) g += `<line x1="${r2(x0 + f.x * k)}" y1="${r2(y0 - 2)}" x2="${r2(x0 + f.x * k)}" y2="${r2(y0 + ph + 2)}" stroke="#00A651" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
      if (f.y != null) g += `<line x1="${r2(x0 - 2)}" y1="${r2(y0 + f.y * k)}" x2="${r2(x0 + pw + 2)}" y2="${r2(y0 + f.y * k)}" stroke="#00A651" stroke-width="0.35" stroke-dasharray="1.2 0.8"/>`;
    }
    const panels = sidePanels(j, i);
    for (const p of panels) {
      const px0 = x0 + p.x * k, px1 = x0 + (p.x + p.w) * k, py = y0 + ph + 3.2;
      g += `<path d="M${r2(px0 + 0.4)} ${r2(py)}H${r2(px1 - 0.4)}M${r2(px0 + 0.4)} ${r2(py - 1)}v2M${r2(px1 - 0.4)} ${r2(py - 1)}v2" stroke="#64748B" stroke-width="0.2" fill="none"/>`;
      if (px1 - px0 > 9) {
        g += T((px0 + px1) / 2, py + 3, `${r2(p.w)} mm`, 2.2, { anchor: 'middle', color: '#475569' });
        if (px1 - px0 > 18) g += T((px0 + px1) / 2, py + 5.8, p.name, 1.9, { anchor: 'middle', color: '#94A3B8' });
      }
    }
    if (!panels.length) g += T(x0 + pw / 2, y0 + ph + 4.5, `${j.trimW} × ${j.trimH} mm`, 2.3, { anchor: 'middle', color: '#475569' });
  }
  g += `<line x1="${LX}" y1="${H - 22}" x2="${LX + 8}" y2="${H - 22}" stroke="#00A651" stroke-width="0.4" stroke-dasharray="1.2 0.8"/>` + T(LX + 10, H - 21.2, 'fold line', 2.3, { color: '#475569' });
  g += `<rect x="${LX + 30}" y="${H - 23.2}" width="6" height="2.4" fill="none" stroke="#111827" stroke-width="0.25"/>` + T(LX + 38, H - 21.2, 'finished (trim) edge — preview shows the trim area only', 2.3, { color: '#475569' });

  // Right: values
  const RX = 190, RW = W - M - RX;
  let y = top;
  const head = (s: string) => { g += T(RX, y, s, 3, { bold: true, color: '#475569' }); y += 1.6; g += `<line x1="${RX}" y1="${r2(y)}" x2="${RX + RW}" y2="${r2(y)}" stroke="#E2E8F0" stroke-width="0.3"/>`; y += 3.6; };
  const row = (k: string, v: string, maxChars = 40) => {
    const lines = wrap(v || '—', maxChars);
    g += T(RX, y, k, 2.45, { color: '#64748B' });
    lines.forEach((ln, i) => { g += T(RX + 30, y + i * 3.2, ln, 2.55); });
    y += Math.max(1, lines.length) * 3.2 + 0.6;
  };
  head('JOB');
  row('Job', d.people.jobName); row('Client', d.people.client); row('Designer', d.people.designer);
  row('Company', d.people.company); if (d.people.contact) row('Contact', d.people.contact);
  y += 1.5; head('SIZE & FOLDING');
  row('Finished (flat)', `${j.trimW} × ${j.trimH} mm`);
  if (j.folded) row('Folded', `${r1(j.folded.w)} × ${r1(j.folded.h)} mm${j.folded.thick ? ` · ≈ ${j.folded.thick} mm thick` : ''}`);
  row('Bleed / safe', `${j.bleed} mm bleed on every edge · keep text ${j.safe} mm inside trim and folds`);
  if (j.panels.length) row('Panels', j.panels.map((p) => `${p.name} ${r2(p.w)}`).join(' · ') + ' mm');
  if (j.folds.length) row('Folds', [...j.folds].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((f) => `${f.order ? `${f.order}. ` : ''}${f.x != null ? `${r2(f.x)} mm from left` : `${r2(f.y!)} mm from top`}${f.dir ? ` (${f.dir})` : ''}`).join(' · '));
  for (const [k, v] of j.values || []) row(k, v);
  y += 1.5; head('PRINT FILES');
  for (const f of d.files) row(f.label, `${f.sheet} · ${f.scale < 1 ? `scaled ${r1(f.scale * 100)} %` : '100 % actual size'} · printed piece ${f.printed} · ${f.marks}`);
  row('Printer margin', `${d.margin} mm no-print edge allowed for`);
  row('Colour', d.colour);
  if (d.people.notes) { y += 1.5; head('NOTES'); row('', d.people.notes, 48); }

  // Footer
  g += `<line x1="${M}" y1="${H - 13}" x2="${W - M}" y2="${H - 13}" stroke="#E2E8F0" stroke-width="0.3"/>`;
  g += T(M, H - 8, 'Print the files at 100 % / “Actual size” (never “Fit”): any scaling is already in the file. Cut on the cut marks, fold on the green fold marks, check the first copy with a ruler.', 2.35, { color: '#475569' });
  g += T(W - M, H - 4, 'Prepared with Magical Touch Design · magicaltouchdesign.com', 2.35, { color: '#94A3B8', anchor: 'end' });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">${g}</svg>`;
}
