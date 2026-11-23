// Garment technical flats (front and back), drawn like a fashion flat
// sketch: closed outline, collar / placket / cuffs / bands in the trim
// colour, dashed topstitching, gathers and slits. The print (colour and
// motif) is clipped inside the garment. Used for template thumbnails; the
// editor works on the drafted pattern pieces, not on this drawing.

import type { GarmentId, TexTheme } from './editorBridge.ts';

export interface FlatOpts { garment: GarmentId; theme: TexTheme; neck?: string; sleeve?: string; skirt?: string; text?: string; id: string; motif: (w: number, h: number) => string }

const INK = '#2b2f36';
const mirror = (d: string) => d.replace(/(-?\d*\.?\d+)\s+(-?\d*\.?\d+)/g, (_, x, y) => `${(300 - Number(x)).toFixed(1)} ${y}`);

interface Shape { body: string; trims: { d: string; fill?: string }[]; stitches: string[]; details: string[] }

/** Necklines for the front (deeper) or back (shallow). Shoulder neck points at x = 150 ± nw, y = top. */
function neckline(kind: string, back: boolean, nw = 30, top = 40): string {
  const depth = back ? 8 : kind === 'v' ? 44 : kind === 'boat' ? 6 : kind === 'square' ? 30 : 22;
  if (back) return `M${150 - nw} ${top} Q150 ${top + depth * 2} ${150 + nw} ${top}`;
  if (kind === 'v') return `M${150 - nw} ${top} L150 ${top + depth} L${150 + nw} ${top}`;
  if (kind === 'square') return `M${150 - nw} ${top} L${150 - nw} ${top + depth} L${150 + nw} ${top + depth} L${150 + nw} ${top}`;
  if (kind === 'boat') return `M${150 - nw - 12} ${top - 2} Q150 ${top + depth * 2} ${150 + nw + 12} ${top - 2}`;
  return `M${150 - nw} ${top} Q150 ${top + depth * 2} ${150 + nw} ${top}`;
}

/** Right half of a top (shoulder → sleeve → side → hem) from the neck point; mirrored for the left. */
function topHalf(o: { nw: number; top: number; shoulderX: number; shoulderY: number; sleeveEnd: [number, number][]; armpit: [number, number]; hem: [number, number]; hemMidY: number }) {
  const [e1, e2] = o.sleeveEnd;
  return { right: `L${o.shoulderX} ${o.shoulderY} L${e1[0]} ${e1[1]} L${e2[0]} ${e2[1]} L${o.armpit[0]} ${o.armpit[1]} L${o.hem[0]} ${o.hem[1]}`, hemMidY: o.hemMidY };
}

function tee(neck: string, back: boolean, long: boolean, kurti = false): Shape {
  const nw = kurti ? 26 : 30, top = 40;
  const sleeve: [number, number][] = kurti
    ? [[252, 168], [232, 176]]
    : long ? [[262, 220], [240, 226]] : [[256, 108], [234, 126]];
  const hemY = kurti ? 340 : 268, sideX = kurti ? 214 : 204;
  const h = topHalf({ nw, top, shoulderX: 208, shoulderY: 52, sleeveEnd: sleeve, armpit: [kurti ? 198 : 202, kurti ? 104 : 102], hem: [sideX, hemY], hemMidY: hemY + (kurti ? 8 : 4) });
  const nl = neckline(neck, back, nw, top);
  // outline: left neck point → neckline → right shoulder … hem … mirrored left side back up
  const rightHalf = h.right;
  const leftHalf = mirror(rightHalf).replace(/^L/, '');
  const leftPts = leftHalf.split('L').map((p) => p.trim()).filter(Boolean).reverse();
  const neckBody = nl.replace(/^M[^QL]+/, '');
  const body = `M${150 - nw} ${top} ${neckBody} ${rightHalf} Q150 ${h.hemMidY} ${300 - sideX} ${hemY} L${leftPts.slice(1).join(' L')} Z`;
  const stitches: string[] = [];
  const trims: { d: string; fill?: string }[] = [];
  const details: string[] = [];
  // neck binding (rib) following the neckline
  stitches.push(nl.replace(/(\d+(\.\d+)?) (\d+(\.\d+)?)/g, (m, x, _a, y) => `${x} ${Number(y) + 5}`));
  // hem topstitch
  stitches.push(`M${300 - sideX + 2} ${hemY - 9} Q150 ${h.hemMidY - 9} ${sideX - 2} ${hemY - 9}`);
  // sleeve hem stitch + armhole seam
  const [e1, e2] = sleeve;
  const s1: [number, number] = [e1[0] + (208 - e1[0]) * 0.1, e1[1] + (52 - e1[1]) * 0.1], s2: [number, number] = [e2[0] + (202 - e2[0]) * 0.1, e2[1] + (102 - e2[1]) * 0.1];
  stitches.push(`M${s1[0].toFixed(1)} ${s1[1].toFixed(1)} L${s2[0].toFixed(1)} ${s2[1].toFixed(1)}`, mirror(`M${s1[0].toFixed(1)} ${s1[1].toFixed(1)} L${s2[0].toFixed(1)} ${s2[1].toFixed(1)}`));
  details.push(`M208 52 Q196 78 ${kurti ? 198 : 202} ${kurti ? 104 : 102}`, mirror(`M208 52 Q196 78 ${kurti ? 198 : 202} ${kurti ? 104 : 102}`));
  if (kurti) {
    // side slits from hip to hem
    details.push(`M${sideX - 1} 262 L${sideX - 1} ${hemY}`, mirror(`M${sideX - 1} 262 L${sideX - 1} ${hemY}`));
    stitches.push(`M${sideX - 6} 262 L${sideX - 6} ${hemY - 2}`, mirror(`M${sideX - 6} 262 L${sideX - 6} ${hemY - 2}`));
  }
  return { body, trims, stitches, details };
}

function poloExtras(s: Shape, back: boolean, trim: string) {
  if (!back) {
    // two-button placket and a pointed collar
    s.trims.push({ d: 'M141 48 L159 48 L159 104 L141 104 Z' });
    s.details.push('M150 50 L150 104');
    s.trims.push({ d: 'M120 40 Q134 30 150 50 L132 72 Z', fill: trim }, { d: 'M180 40 Q166 30 150 50 L168 72 Z', fill: trim });
  } else s.trims.push({ d: 'M118 40 Q150 26 182 40 L182 50 Q150 38 118 50 Z', fill: trim });
  // ribbed sleeve cuffs
  s.trims.push({ d: 'M256 108 L234 126 L229 120 L251 102 Z', fill: trim }, { d: mirror('M256 108 L234 126 L229 120 L251 102 Z'), fill: trim });
}

function churidar(back: boolean): Shape {
  const body = 'M96 30 L204 30 L210 60 Q206 160 186 250 L178 336 L156 336 L152 120 L148 120 L144 336 L122 336 L114 250 Q94 160 90 60 Z';
  const stitches = ['M97 46 L203 46', 'M152 120 L152 70'];
  const details: string[] = [];
  // gathers (churidar folds) around the lower leg
  for (let i = 0; i < 6; i++) { const y = 262 + i * 12; details.push(`M${118 + i * 0.8} ${y} Q133 ${y + 5} ${146 - i * 0.2} ${y}`, `M${154 + i * 0.2} ${y} Q167 ${y + 5} ${182 - i * 0.8} ${y}`); }
  if (!back) details.push('M150 38 L146 58 M150 38 L154 58');
  return { body, trims: [{ d: 'M96 30 L204 30 L205 46 L95 46 Z' }], stitches, details };
}

function frock(neck: string, back: boolean, sleeve: string, skirt: string): Shape {
  const nl = neckline(neck, back, 26, 40);
  const neckBody = nl.replace(/^M[^QL]+/, '');
  const flare = skirt === 'straight' ? 18 : skirt === 'aline' ? 50 : 70;
  const bodiceR = 'L196 48 L204 70 L194 128';
  const skirtR = `L${194 + flare} 318`;
  const body = `M124 40 ${neckBody} ${bodiceR} ${skirtR} Q150 330 ${106 - flare} 318 L106 128 L96 70 L104 48 Z`;
  const trims: { d: string; fill?: string }[] = [];
  const details = ['M106 128 L194 128'];
  const stitches = [`M${108 - flare} 308 Q150 320 ${192 + flare} 308`];
  if (skirt === 'gathered' || skirt === 'circle' || skirt === 'half-circle') for (let x = 112; x <= 188; x += 8) details.push(`M${x} 130 L${x + (x - 150) * 0.25} 152`);
  if (sleeve !== 'sleeveless') {
    const puff = sleeve === 'cap' ? 'M196 48 Q228 50 226 76 L204 70 Z' : 'M196 48 Q238 46 236 92 Q222 100 206 92 L204 70 Z';
    trims.push({ d: puff }, { d: mirror(puff) });
    if (sleeve !== 'cap') stitches.push('M209 88 Q222 95 234 88', mirror('M209 88 Q222 95 234 88'));
  }
  if (back) details.push('M150 46 L150 126');
  return { body, trims, stitches, details };
}

function dupatta(): Shape {
  const body = 'M96 18 L204 18 L204 342 L96 342 Z';
  const details: string[] = [];
  for (let x = 100; x <= 200; x += 7) details.push(`M${x} 342 L${x} 352`, `M${x} 18 L${x} 8`);
  return { body, trims: [], stitches: ['M100 22 L200 22 L200 338 L100 338 Z'], details };
}

function shape(o: FlatOpts, back: boolean): Shape {
  const g = o.garment;
  if (g === 'chudidar') return churidar(back);
  if (g === 'frock') return frock(o.neck || 'round', back, o.sleeve || 'short', o.skirt || 'gathered');
  if (g === 'dupatta') return dupatta();
  if (g === 'kurta') return tee(o.neck || 'round', back, false, true);
  const s = tee(g === 'jersey' ? 'v' : 'round', back, o.sleeve === 'full');
  if (g === 'polo') poloExtras(s, back, o.theme.trim);
  return s;
}

/** Panels and text of a theme, clipped inside the garment (front or back). */
function printLayers(o: FlatOpts, back: boolean): string {
  const th = o.theme, g = o.garment;
  let s = '';
  if (th.motif !== 'none') s += `<path d="${o.motif(300, 360)}" fill="${th.motifColour}" opacity="${th.motif === 'florals' || th.motif === 'paisley' || th.motif === 'dots' ? 0.55 : 0.9}"/>`;
  const hemY = g === 'kurta' ? 340 : g === 'frock' ? 318 : g === 'chudidar' ? 336 : g === 'dupatta' ? 342 : 268;
  if (th.panel === 'yoke' && g !== 'chudidar' && g !== 'dupatta') s += `<rect x="0" y="0" width="300" height="${g === 'kurta' ? 92 : 84}" fill="${th.accent}"/>`;
  if (th.panel === 'hem') s += `<rect x="0" y="${hemY - (g === 'chudidar' ? 30 : 34)}" width="300" height="14" fill="${th.accent}"/>`;
  if (th.panel === 'border') s += g === 'dupatta' ? `<rect x="0" y="0" width="300" height="46" fill="${th.accent}"/><rect x="0" y="${hemY - 46}" width="300" height="60" fill="${th.accent}"/>` : `<rect x="0" y="${hemY - 34}" width="300" height="40" fill="${th.accent}"/>`;
  if (th.panel === 'sash' && !back) s += `<path d="M120 0 L170 0 L320 230 L320 300 Z" fill="${th.accent}"/>`;
  return s;
}

function figure(o: FlatOpts, back: boolean, dx: number): string {
  const sh = shape(o, back), th = o.theme, id = `${o.id}-${back ? 'b' : 'f'}`;
  const text = o.text && !back && !/^\d+$/.test(o.text) ? `<text x="${o.garment === 'polo' ? 182 : 150}" y="${o.garment === 'polo' ? 92 : 118}" font-family="Montserrat,Arial,sans-serif" font-weight="700" font-size="${o.garment === 'polo' ? 9 : 15}" fill="${th.panel === 'sash' ? '#fff' : th.accent === th.body ? th.trim : th.accent}" text-anchor="middle">${o.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>` : '';
  const num = o.text && /^\d+$/.test(o.text) ? (back ? `<text x="150" y="176" font-family="Oswald,Arial Narrow,sans-serif" font-weight="700" font-size="70" fill="${th.trim}" text-anchor="middle">${o.text}</text>` : `<text x="176" y="98" font-family="Oswald,Arial Narrow,sans-serif" font-weight="700" font-size="24" fill="${th.trim}" text-anchor="middle">${o.text}</text>`) : '';
  return `<g transform="translate(${dx} 0)">
<clipPath id="fc-${id}"><path d="${sh.body}"/></clipPath>
<path d="${sh.body}" fill="${th.body}"/>
<g clip-path="url(#fc-${id})">${printLayers(o, back)}${text}${num}</g>
${sh.trims.map((t) => `<path d="${t.d}" fill="${t.fill || th.body}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`).join('')}
<path d="${sh.body}" fill="none" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>
${sh.details.map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`).join('')}
${sh.stitches.map((d) => `<path d="${d}" fill="none" stroke="${INK}" stroke-width="0.8" stroke-dasharray="3 2.2" opacity="0.75"/>`).join('')}
${o.garment === 'polo' && !back ? `<circle cx="150" cy="66" r="2.6" fill="#fff" stroke="${INK}" stroke-width="0.9"/><circle cx="150" cy="86" r="2.6" fill="#fff" stroke="${INK}" stroke-width="0.9"/>` : ''}
<text x="150" y="${['polo', 'tshirt', 'jersey'].includes(o.garment) ? (o.sleeve === 'full' ? 300 : 296) : 372}" font-family="Inter,Arial,sans-serif" font-size="11" letter-spacing="2" fill="#8a8f98" text-anchor="middle">${back ? 'BACK' : 'FRONT'}</text>
</g>`;
}

/** Front and back flats side by side (viewBox 640 × 380). Dupatta is drawn once. */
export function garmentFlatSvg(o: FlatOpts): string {
  if (o.garment === 'dupatta') return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-170 0 640 380">${figure(o, false, 0).replace('>FRONT<', '>FLAT<')}</svg>`;
  const h = ['polo', 'tshirt', 'jersey'].includes(o.garment) && o.sleeve !== 'full' ? 310 : 380;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${h === 310 ? 10 : 0} 640 ${h}">${figure(o, false, 10)}${figure(o, true, 330)}</svg>`;
}
