'use client';

// Laser & CNC Prep: open an SVG, map each line colour to Cut / Score / Ignore,
// and export a layered DXF (mm) and a laser-ready SVG (hairline red = cut,
// blue = score). Geometry is read with the browser's own SVG engine, so
// transforms, shapes and arcs come out exactly. On this device.

import { useMemo, useRef, useState } from 'react';
import { Download, FileUp } from 'lucide-react';
import { pathToPolylines, polyLength, writeDxf, type Pt } from '@/lib/dxf';

type Op = 'cut' | 'score' | 'ignore';
interface Group { key: string; color: string; count: number; polys: { pts: Pt[]; closed: boolean }[] }
const UNIT: Record<string, number> = { mm: 1, cm: 10, in: 25.4, pt: 25.4 / 72, pc: 25.4 / 6, px: 25.4 / 96, '': 25.4 / 96 };

function shapeToPath(el: Element): string | null {
  const a = (n: string) => Number(el.getAttribute(n) || 0);
  switch (el.tagName.toLowerCase()) {
    case 'path': return el.getAttribute('d');
    case 'rect': { const x = a('x'), y = a('y'), w = a('width'), h = a('height'); let rx = a('rx') || a('ry'), ry = a('ry') || a('rx'); rx = Math.min(rx, w / 2); ry = Math.min(ry, h / 2); return rx || ry ? `M${x + rx} ${y}H${x + w - rx}A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}V${y + h - ry}A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}H${x + rx}A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}V${y + ry}A${rx} ${ry} 0 0 1 ${x + rx} ${y}Z` : `M${x} ${y}H${x + w}V${y + h}H${x}Z`; }
    case 'circle': { const cx = a('cx'), cy = a('cy'), r = a('r'); return `M${cx - r} ${cy}A${r} ${r} 0 1 0 ${cx + r} ${cy}A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`; }
    case 'ellipse': { const cx = a('cx'), cy = a('cy'), rx = a('rx'), ry = a('ry'); return `M${cx - rx} ${cy}A${rx} ${ry} 0 1 0 ${cx + rx} ${cy}A${rx} ${ry} 0 1 0 ${cx - rx} ${cy}Z`; }
    case 'line': return `M${a('x1')} ${a('y1')}L${a('x2')} ${a('y2')}`;
    case 'polyline': case 'polygon': { const p = (el.getAttribute('points') || '').trim().split(/[\s,]+/).map(Number); if (p.length < 4) return null; let d = `M${p[0]} ${p[1]}`; for (let i = 2; i + 1 < p.length; i += 2) d += `L${p[i]} ${p[i + 1]}`; return el.tagName.toLowerCase() === 'polygon' ? d + 'Z' : d; }
  }
  return null;
}

export function LaserPrep() {
  const [file, setFile] = useState<{ name: string; groups: Group[]; w: number; h: number } | null>(null);
  const [ops, setOps] = useState<Record<string, Op>>({});
  const [speed, setSpeed] = useState(20);
  const [msg, setMsg] = useState('');
  const input = useRef<HTMLInputElement>(null);

  const open = async (f: File | undefined | null) => {
    if (!f) return;
    setMsg('Reading…');
    try {
      const text = (await f.text()).replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '').replace(/\son\w+="[^"]*"/gi, '');
      const host = document.createElement('div'); host.style.cssText = 'position:fixed;left:-99999px;top:0;width:10px;height:10px;overflow:hidden';
      host.innerHTML = text; document.body.appendChild(host);
      const svg = host.querySelector('svg');
      if (!svg) throw new Error('no svg');
      const vb = (svg.getAttribute('viewBox') || '').split(/[\s,]+/).map(Number);
      const parseLen = (v: string | null, fallback: number) => { if (!v) return null; const m = v.match(/^([\d.]+)\s*([a-z%]*)$/i); if (!m || m[2] === '%') return null; return Number(m[1]) * (UNIT[m[2].toLowerCase()] ?? UNIT.px) || fallback; };
      const vbW = vb.length === 4 ? vb[2] : Number(svg.getAttribute('width')) || 1000, vbH = vb.length === 4 ? vb[3] : Number(svg.getAttribute('height')) || 1000;
      const wMm = parseLen(svg.getAttribute('width'), vbW * UNIT.px) ?? vbW * UNIT.px, hMm = parseLen(svg.getAttribute('height'), vbH * UNIT.px) ?? vbH * UNIT.px;
      const kx = wMm / vbW, ky = hMm / vbH;
      svg.setAttribute('width', String(vbW)); svg.setAttribute('height', String(vbH));
      const groups = new Map<string, Group>();
      const els = svg.querySelectorAll('path,rect,circle,ellipse,line,polyline,polygon');
      els.forEach((el) => {
        if ((el as Element).closest('defs,clipPath,mask,symbol,pattern,marker')) return;
        const d = shapeToPath(el); if (!d) return;
        const st = getComputedStyle(el as Element);
        if (st.display === 'none' || st.visibility === 'hidden') return;
        const stroke = st.stroke && st.stroke !== 'none' ? st.stroke : null, fill = st.fill && st.fill !== 'none' ? st.fill : null;
        const colour = stroke || fill || 'rgb(0, 0, 0)';
        const key = `${stroke ? 'stroke' : 'fill'} ${colour}`;
        const m = (el as SVGGraphicsElement).getCTM?.(); if (!m) return;
        const polys = pathToPolylines(d, 0.05 / Math.max(kx, 1e-6)).map((p) => ({ closed: p.closed, pts: p.pts.map(([x, y]) => [(m.a * x + m.c * y + m.e) * kx, (m.b * x + m.d * y + m.f) * ky] as Pt) }));
        const g = groups.get(key) || { key, color: colour, count: 0, polys: [] };
        g.count++; g.polys.push(...polys); groups.set(key, g);
      });
      host.remove();
      const list = [...groups.values()].sort((a, b) => b.polys.length - a.polys.length);
      const toHex = (c: string) => { const m = c.match(/\d+(\.\d+)?/g); return m ? '#' + m.slice(0, 3).map((v) => Math.round(Number(v)).toString(16).padStart(2, '0')).join('').toUpperCase() : c; };
      list.forEach((g) => { g.color = toHex(g.color); });
      setFile({ name: f.name.replace(/\.svg$/i, ''), groups: list, w: wMm, h: hMm });
      const o: Record<string, Op> = {}; list.forEach((g) => { o[g.key] = g.key.startsWith('fill') ? 'ignore' : /#0000FF|#00A0E3/i.test(g.color) ? 'score' : 'cut'; }); setOps(o);
      setMsg(list.length ? '' : 'No lines or shapes found in this SVG.');
    } catch (e) { console.error(e); setMsg('This SVG could not be read.'); }
  };
  const byOp = (op: Op) => (file?.groups || []).filter((g) => ops[g.key] === op).flatMap((g) => g.polys);
  const cutLen = useMemo(() => polyLength(byOp('cut')), [file, ops]); // eslint-disable-line react-hooks/exhaustive-deps
  const scoreLen = useMemo(() => polyLength(byOp('score')), [file, ops]); // eslint-disable-line react-hooks/exhaustive-deps
  const preview = useMemo(() => {
    if (!file) return '';
    const path = (polys: { pts: Pt[]; closed: boolean }[]) => polys.map((p) => 'M' + p.pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + (p.closed ? 'Z' : '')).join('');
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${file.w.toFixed(2)} ${file.h.toFixed(2)}" width="${file.w.toFixed(3)}mm" height="${file.h.toFixed(3)}mm"><path d="${path(byOp('score'))}" fill="none" stroke="#0000FF" stroke-width="0.01"/><path d="${path(byOp('cut'))}" fill="none" stroke="#FF0000" stroke-width="0.01"/></svg>`;
  }, [file, ops]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = (b: Blob, name: string) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000); };
  const dxf = () => file && save(new Blob([writeDxf([{ name: 'CUT', color: 1, polylines: byOp('cut') }, { name: 'SCORE', color: 5, polylines: byOp('score') }].filter((l) => l.polylines.length), file.h)], { type: 'application/dxf' }), `${file.name}_LASER.dxf`);
  const fmtLen = (mm: number) => (mm > 10000 ? `${(mm / 1000).toFixed(2)} m` : `${Math.round(mm)} mm`);
  const mins = (cutLen + scoreLen) / Math.max(1, speed) / 60;

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="space-y-3 self-start rounded-2xl border border-mt-border bg-mt-surface p-4" aria-label="Laser settings">
        <button type="button" onClick={() => input.current?.click()} className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-mt-primary text-[13px] font-semibold text-mt-onprimary"><FileUp size={16} /> {file ? 'Choose another SVG' : 'Open an SVG'}</button>
        <input ref={input} type="file" accept="image/svg+xml,.svg" className="sr-only" aria-label="SVG file" onChange={(e) => { open(e.target.files?.[0]); e.target.value = ''; }} />
        {file && <>
          <p className="text-[12px] text-mt-muted">{file.name} · {file.w.toFixed(1)} × {file.h.toFixed(1)} mm</p>
          <div className="space-y-1.5" role="group" aria-label="Colour operations">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-mt-faint">Colours → operations</p>
            {file.groups.map((g) => (
              <div key={g.key} className="flex items-center gap-2 text-[12.5px]">
                <span className="h-4 w-4 shrink-0 rounded border border-black/20" style={{ background: g.color }} />
                <span className="min-w-0 flex-1 truncate">{g.key.startsWith('fill') ? 'Filled' : 'Line'} {g.color} · {g.polys.length} paths</span>
                <select value={ops[g.key]} onChange={(e) => setOps((o) => ({ ...o, [g.key]: e.target.value as Op }))} aria-label={`Operation for ${g.color}`} className="h-8 rounded-lg border border-mt-border bg-mt-bg px-1.5 text-[12px]"><option value="cut">Cut</option><option value="score">Score / engrave</option><option value="ignore">Ignore</option></select>
              </div>
            ))}
          </div>
          <label className="block text-[12px] text-mt-muted">Cutting speed (mm/s) — for the time estimate<input type="number" min={1} max={1000} value={speed} onChange={(e) => setSpeed(Math.max(1, Number(e.target.value) || 1))} className="mt-1 h-9 w-full rounded-lg border border-mt-border bg-mt-bg px-2.5 text-[13px]" /></label>
        </>}
        {msg && <p role="status" className="text-[12px] text-mt-muted">{msg}</p>}
        <p className="text-[11px] leading-relaxed text-mt-faint">Kerf (beam width) is not compensated — set it in your laser software. Filled shapes are ignored by default: set them to Score for vector engraving of their outline.</p>
      </aside>
      <section aria-label="Laser preview" className="rounded-2xl border border-mt-border bg-mt-surface p-4">
        {file ? <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]"><span><span className="mr-1 inline-block h-0.5 w-4 bg-[#FF0000] align-middle" /> Cut <b>{fmtLen(cutLen)}</b></span><span><span className="mr-1 inline-block h-0.5 w-4 bg-[#0000FF] align-middle" /> Score <b>{fmtLen(scoreLen)}</b></span><span className="text-mt-muted">≈ {mins < 1 ? `${Math.round(mins * 60)} s` : `${mins.toFixed(1)} min`} at {speed} mm/s (moves not counted)</span></div>
          <div className="mt-3 grid place-items-center rounded-xl bg-white p-4 [&_svg]:h-auto [&_svg]:max-h-[60vh] [&_svg]:w-full [&_path]:[stroke-width:0.4]" role="img" aria-label="Cut and score preview" dangerouslySetInnerHTML={{ __html: preview }} />
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={dxf} className="inline-flex h-10 items-center gap-2 rounded-xl bg-mt-primary px-4 text-[13px] font-semibold text-mt-onprimary"><Download size={15} /> DXF (CUT / SCORE layers, mm)</button>
            <button type="button" onClick={() => save(new Blob([preview], { type: 'image/svg+xml' }), `${file.name}_LASER.svg`)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-mt-border px-4 text-[13px] font-semibold hover:bg-mt-surface2"><Download size={15} /> Laser SVG (hairlines)</button>
          </div>
        </> : <p className="py-24 text-center text-[13px] text-mt-muted">Open an SVG — from Illustrator, Inkscape, our editor, the dieline studio or Image Trace.</p>}
      </section>
    </div>
  );
}
