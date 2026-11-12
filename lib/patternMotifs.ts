// Original vector motifs for Pattern Studio, every one a single SVG path
// drawn in a 100 × 100 box centred on 0,0 (filled with the even-odd rule,
// so holes stay holes). Most are generated from a few simple recipes —
// polygons, stars, flowers, rays, rings — so they stay crisp at any size
// and export as real vectors (SVG, PDF and editable shapes in the editor).

export interface Motif { id: string; label: string; d: string; cat: MotifCategory }
export type MotifCategory = 'Basic' | 'Geometric' | 'Stars & bursts' | 'Floral' | 'Nature' | 'Celebration' | 'Ornament' | 'Lines & marks';
export const MOTIF_CATEGORIES: MotifCategory[] = ['Basic', 'Geometric', 'Stars & bursts', 'Floral', 'Nature', 'Celebration', 'Ornament', 'Lines & marks'];

const f = (n: number) => String(Math.round(n * 10) / 10);
const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;
const rotP = (x: number, y: number, a: number): [number, number] => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
const TAU = Math.PI * 2;

export const circle = (cx: number, cy: number, r: number) => `M${pt(cx - r, cy)}A${f(r)} ${f(r)} 0 1 0 ${pt(cx + r, cy)}A${f(r)} ${f(r)} 0 1 0 ${pt(cx - r, cy)}Z`;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => `M${pt(cx - rx, cy)}A${f(rx)} ${f(ry)} 0 1 0 ${pt(cx + rx, cy)}A${f(rx)} ${f(ry)} 0 1 0 ${pt(cx - rx, cy)}Z`;
const poly = (pts: [number, number][]) => `M${pts.map(([x, y]) => pt(x, y)).join('L')}Z`;
const rect = (x: number, y: number, w: number, h: number) => poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${pt(x + r, y)}H${f(x + w - r)}A${f(r)} ${f(r)} 0 0 1 ${pt(x + w, y + r)}V${f(y + h - r)}A${f(r)} ${f(r)} 0 0 1 ${pt(x + w - r, y + h)}H${f(x + r)}A${f(r)} ${f(r)} 0 0 1 ${pt(x, y + h - r)}V${f(y + r)}A${f(r)} ${f(r)} 0 0 1 ${pt(x + r, y)}Z`;
/** Rotate every copy of `make(angle)` around the centre. */
const around = (n: number, make: (a: number) => string, start = 0) => Array.from({ length: n }, (_, k) => make(start + (k / n) * TAU)).join('');
const rotPoly = (pts: [number, number][], a: number) => poly(pts.map(([x, y]) => rotP(x, y, a)));

export const polygon = (n: number, r = 46, start = -Math.PI / 2) => poly(Array.from({ length: n }, (_, k) => [r * Math.cos(start + (k * TAU) / n), r * Math.sin(start + (k * TAU) / n)]));
export const star = (n: number, R = 50, r = 22, start = -Math.PI / 2) =>
  poly(Array.from({ length: n * 2 }, (_, k) => { const rad = k % 2 ? r : R; const a = start + (k * Math.PI) / n; return [rad * Math.cos(a), rad * Math.sin(a)]; }));
const roundStar = (n: number, R = 48, r = 26) => {
  let d = '';
  for (let k = 0; k < n; k++) {
    const a0 = -Math.PI / 2 + (k * TAU) / n, a1 = a0 + Math.PI / n, a2 = a0 + TAU / n;
    const [x0, y0] = [R * Math.cos(a0), R * Math.sin(a0)], [x1, y1] = [r * Math.cos(a1), r * Math.sin(a1)], [x2, y2] = [R * Math.cos(a2), R * Math.sin(a2)];
    d += (k ? '' : `M${pt(x0, y0)}`) + `Q${pt(x1 * 0.6, y1 * 0.6)} ${pt(x2, y2)}`;
    void x1; void y1;
  }
  return d + 'Z';
};
/** n petals (teardrop) around a small centre. */
export const flower = (n: number, len = 48, wide = 20, hole = 7) => {
  let d = '';
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU;
    const P = (x: number, y: number) => pt(...rotP(x, y, a));
    d += `M${P(0, -hole - 1)}C${P(-wide, -len * 0.45)} ${P(-wide * 0.7, -len)} ${P(0, -len)}C${P(wide * 0.7, -len)} ${P(wide, -len * 0.45)} ${P(0, -hole - 1)}Z`;
  }
  return hole ? d + circle(0, 0, hole) : d;
};
/** Round petals (circles) around a centre. */
const blossom = (n: number, ring = 26, pr = 18, centre = 12) => around(n, (a) => circle(...rotP(0, -ring, a), pr)) + (centre ? circle(0, 0, centre) : '');
const rays = (n: number, inner = 22, outer = 50, w = 0.18) =>
  around(n, (a) => rotPoly([[-inner * w, -inner], [0, -outer], [inner * w, -inner]], a)) + circle(0, 0, inner - 4);
const ringPath = (r1: number, r2: number) => circle(0, 0, r1) + circle(0, 0, r2);
const gear = (n: number, R = 48, r = 38, hole = 14) => {
  const pts: [number, number][] = [];
  for (let k = 0; k < n; k++) {
    const a = (k / n) * TAU, s = Math.PI / n;
    for (const [rad, da] of [[r, -s * 0.9], [R, -s * 0.45], [R, s * 0.45], [r, s * 0.9]] as [number, number][]) pts.push([rad * Math.cos(a + da), rad * Math.sin(a + da)]);
  }
  return poly(pts) + circle(0, 0, hole);
};
const asterisk = (n: number, len = 48, w = 8) => around(n, (a) => rotPoly([[-w / 2, 0], [w / 2, 0], [w / 2, -len], [-w / 2, -len]], a)) + circle(0, 0, w * 0.9);
/** Leaves fanned out from a pivot (px, py), spread over `spread` degrees. */
const fan = (n: number, px: number, py: number, len: number, spread = 120, w = 0.13) =>
  Array.from({ length: n }, (_, k) => {
    const a = ((-spread / 2 + (spread * k) / Math.max(1, n - 1)) * Math.PI) / 180;
    const pts: [number, number][] = [[0, -len * 0.14], [-len * w, -len * 0.58], [0, -len], [len * w, -len * 0.58]];
    return poly(pts.map(([x, y]) => { const [rx, ry] = rotP(x, y, a); return [rx + px, ry + py] as [number, number]; }));
  }).join('');
const leaf = (w = 30, h = 50) => `M0 ${f(-h)}C${f(w)} ${f(-h * 0.6)} ${f(w)} ${f(h * 0.6)} 0 ${f(h)}C${f(-w)} ${f(h * 0.6)} ${f(-w)} ${f(-h * 0.6)} 0 ${f(-h)}Z`;
const heart = (s = 1) => `M0 ${f(44 * s)}C${f(-60 * s)} ${f(4 * s)} ${f(-40 * s)} ${f(-48 * s)} 0 ${f(-22 * s)}C${f(40 * s)} ${f(-48 * s)} ${f(60 * s)} ${f(4 * s)} 0 ${f(44 * s)}Z`;
const drop = `M0-50C18-22 34-6 34 14A34 34 0 0 1-34 14C-34-6-18-22 0-50Z`;
const wave = (amp = 18, th = 14) => `M-50 ${f(-th / 2)}C-34 ${f(-th / 2 - amp)} -16 ${f(-th / 2 - amp)} 0 ${f(-th / 2)}C16 ${f(-th / 2 + amp)} 34 ${f(-th / 2 + amp)} 50 ${f(-th / 2)}V${f(th / 2)}C34 ${f(th / 2 + amp)} 16 ${f(th / 2 + amp)} 0 ${f(th / 2)}C-16 ${f(th / 2 - amp)} -34 ${f(th / 2 - amp)} -50 ${f(th / 2)}Z`;
const chevron = (t = 16) => poly([[-48, -10], [0, -40], [48, -10], [48, -10 + t], [0, -40 + t], [-48, -10 + t]]);
const zigzag = (t = 12) => { const top: [number, number][] = [[-50, 0], [-25, -22], [0, 0], [25, -22], [50, 0]]; return poly([...top, ...top.slice().reverse().map(([x, y]) => [x, y + t] as [number, number])]); };

const add = (cat: MotifCategory, list: [string, string, string][]) => list.forEach(([id, label, d]) => ALL.push({ id, label, d, cat }));
const ALL: Motif[] = [];

add('Basic', [
  ['sparkle', 'Sparkle', 'M0-50C4-14 14-4 50 0C14 4 4 14 0 50C-4 14-14 4-50 0C-14-4-4-14 0-50Z'],
  ['dot', 'Dot', circle(0, 0, 40)],
  ['ring', 'Ring', ringPath(44, 26)],
  ['square', 'Square', rect(-38, -38, 76, 76)],
  ['rounded-square', 'Rounded square', rrect(-40, -40, 80, 80, 16)],
  ['diamond', 'Diamond', 'M0-50L36 0L0 50L-36 0Z'],
  ['triangle', 'Triangle', 'M0-46L44 34L-44 34Z'],
  ['oval', 'Oval', ellipse(0, 0, 46, 30)],
  ['capsule', 'Capsule', rrect(-46, -18, 92, 36, 18)],
  ['heart', 'Heart', heart(1)],
  ['drop', 'Drop', drop],
  ['semicircle', 'Half circle', 'M-46 18A46 46 0 0 1 46 18Z'],
  ['quarter', 'Quarter circle', 'M-40 40V-40A80 80 0 0 1 40 40Z'],
  ['arch', 'Arch', 'M-36 50L-36-10A36 36 0 0 1 36-10L36 50Z'],
  ['crescent', 'Crescent', 'M18-42A46 46 0 1 0 18 42A50 50 0 0 1 18-42Z'],
  ['cross', 'Cross', 'M-12-46H12V-12H46V12H12V46H-12V12H-46V-12H-12Z'],
  ['plus-round', 'Soft plus', 'M-10-40A10 10 0 0 1 10-40V-10H40A10 10 0 0 1 40 10H10V40A10 10 0 0 1-10 40V10H-40A10 10 0 0 1-40-10H-10Z'],
  ['x-mark', 'Cross mark', rotPoly([[-8, -48], [8, -48], [8, 48], [-8, 48]], Math.PI / 4) + rotPoly([[-8, -48], [8, -48], [8, 48], [-8, 48]], -Math.PI / 4)],
]);

add('Geometric', [
  ['pentagon', 'Pentagon', polygon(5)],
  ['hexagon', 'Hexagon', polygon(6, 46, 0)],
  ['hexagon-ring', 'Hexagon frame', polygon(6, 48, 0) + polygon(6, 32, 0)],
  ['octagon', 'Octagon', polygon(8, 46, Math.PI / 8)],
  ['triangle-ring', 'Triangle frame', polygon(3, 50) + polygon(3, 26)],
  ['square-ring', 'Square frame', rect(-42, -42, 84, 84) + rect(-26, -26, 52, 52)],
  ['diamond-ring', 'Diamond frame', 'M0-50L44 0L0 50L-44 0Z' + 'M0-28L24 0L0 28L-24 0Z'],
  ['concentric', 'Concentric circles', ringPath(48, 38) + ringPath(28, 18) + circle(0, 0, 8)],
  ['target', 'Target', ringPath(46, 32) + circle(0, 0, 18)],
  ['gear', 'Gear', gear(10)],
  ['cog-small', 'Cog', gear(6, 48, 34, 16)],
  ['pinwheel', 'Pinwheel', around(4, (a) => rotPoly([[0, 0], [0, -48], [30, -18]], a))],
  ['bowtie', 'Bow tie', poly([[-46, -36], [0, 0], [-46, 36]]) + poly([[46, -36], [0, 0], [46, 36]])],
  ['checker', 'Checker', rect(-44, -44, 44, 44) + rect(0, 0, 44, 44)],
  ['quad-dots', 'Four dots', circle(-22, -22, 16) + circle(22, -22, 16) + circle(-22, 22, 16) + circle(22, 22, 16)],
  ['tri-dots', 'Three dots', circle(0, -26, 16) + circle(-24, 16, 16) + circle(24, 16, 16)],
  ['cube', 'Cube', poly([[0, -48], [40, -26], [0, -4], [-40, -26]]) + poly([[-42, -20], [-3, 2], [-3, 48], [-42, 26]]) + poly([[42, -20], [3, 2], [3, 48], [42, 26]])],
  ['hourglass', 'Hourglass', poly([[-36, -46], [36, -46], [0, 0], [36, 46], [-36, 46], [0, 0]])],
  ['trapezoid', 'Trapezoid', poly([[-26, -34], [26, -34], [46, 34], [-46, 34]])],
  ['parallelogram', 'Parallelogram', poly([[-22, -32], [48, -32], [22, 32], [-48, 32]])],
  ['moroccan', 'Moroccan tile', 'M0-50C14-30 30-14 50 0C30 14 14 30 0 50C-14 30-30 14-50 0C-30-14-14-30 0-50Z'],
  ['ogee', 'Ogee', 'M0-50C28-30 22-6 34 0C22 6 28 30 0 50C-28 30-22 6-34 0C-22-6-28-30 0-50Z'],
]);

add('Stars & bursts', [
  ['star5', 'Star', star(5, 50, 21)],
  ['star4', 'Four-point star', star(4, 50, 15)],
  ['star6', 'Six-point star', star(6, 50, 28)],
  ['star8', 'Eight-point star', star(8, 50, 30)],
  ['star12', 'Badge star', star(12, 50, 40)],
  ['round-star', 'Soft star', roundStar(5)],
  ['twinkle', 'Twinkle', star(4, 50, 8) + star(4, 22, 4, -Math.PI / 4)],
  ['star-david', 'Hexagram', polygon(3, 50) + polygon(3, 50, Math.PI / 2)],
  ['sunburst', 'Sunburst', rays(16, 20, 50, 0.3)],
  ['sun', 'Sun', rays(12, 26, 50, 0.25)],
  ['burst', 'Burst', star(16, 50, 34)],
  ['asterisk', 'Asterisk', asterisk(6)],
  ['asterisk8', 'Starburst lines', asterisk(8, 48, 6)],
  ['compass', 'Compass', star(4, 50, 12) + star(4, 30, 8, -Math.PI / 4)],
  ['seal', 'Seal', star(24, 50, 44)],
]);

add('Floral', [
  ['petal', 'Flower', flower(5)],
  ['flower4', 'Four-petal flower', flower(4, 48, 22, 8)],
  ['flower6', 'Six-petal flower', flower(6, 48, 16, 8)],
  ['flower8', 'Daisy', flower(8, 50, 11, 10)],
  ['flower12', 'Chrysanthemum', flower(12, 50, 8, 9)],
  ['blossom5', 'Blossom', blossom(5)],
  ['blossom6', 'Round blossom', blossom(6, 28, 16, 14)],
  ['blossom4', 'Clover blossom', blossom(4, 22, 22, 0)],
  ['petal4', 'Quatrefoil', 'M0-48A20 20 0 0 1 0-8A20 20 0 0 1 40 0A20 20 0 0 1 0 8A20 20 0 0 1 0 48A20 20 0 0 1 0 8A20 20 0 0 1-40 0A20 20 0 0 1 0-8A20 20 0 0 1 0-48Z'],
  ['clover', 'Clover', around(3, (a) => { const [x, y] = rotP(0, -22, a); return circle(x, y, 20); }) + rect(-3, 10, 6, 40)],
  ['clover4', 'Lucky clover', around(4, (a) => { const [x, y] = rotP(0, -20, a); return circle(x, y, 18); }, Math.PI / 4)],
  ['tulip', 'Tulip', 'M-26-36L-13-22L0-44L13-22L26-36V-6C26 14 12 22 0 22C-12 22-26 14-26-6Z' + rect(-3, 22, 6, 28)],
  ['bud', 'Bud', 'M0-48C22-30 24-4 0 14C-24-4-22-30 0-48Z' + rect(-3, 12, 6, 38) + 'M3 30C14 18 30 18 34 24C26 34 12 36 3 34Z'],
  ['lotus', 'Lotus', 'M0-46C14-28 14-6 0 12C-14-6-14-28 0-46Z' + 'M-6 14C-26 6-40-12-44-26C-26-24-10-10-6 14Z' + 'M6 14C26 6 40-12 44-26C26-24 10-10 6 14Z' + 'M-40 22C-20 14 20 14 40 22C20 34-20 34-40 22Z'],
  ['rose', 'Rosette', blossom(6, 30, 18, 0) + circle(0, 0, 16) + circle(0, 0, 8)],
  ['sprig', 'Sprig', rect(-2, -48, 4, 96) + around(1, () => '') + [-32, -8, 16].map((y) => `M2 ${f(y)}C18 ${f(y - 16)} 32 ${f(y - 14)} 36 ${f(y - 22)}C30 ${f(y - 2)} 16 ${f(y + 6)} 2 ${f(y + 2)}Z` + `M-2 ${f(y + 10)}C-18 ${f(y - 6)} -32 ${f(y - 4)} -36 ${f(y - 12)}C-30 ${f(y + 8)} -16 ${f(y + 16)} -2 ${f(y + 12)}Z`).join('')],
  ['cherry-blossom', 'Cherry blossom', around(5, (a) => { const P = (x: number, y: number) => pt(...rotP(x, y, a)); return `M${P(0, -8)}C${P(-16, -20)} ${P(-18, -44)} ${P(-6, -48)}L${P(0, -40)}L${P(6, -48)}C${P(18, -44)} ${P(16, -20)} ${P(0, -8)}Z`; }) + circle(0, 0, 6)],
  ['bloom-ring', 'Flower wreath', around(8, (a) => circle(...rotP(0, -38, a), 9)) + ringPath(32, 28)],
]);

add('Nature', [
  ['leaf', 'Leaf', leaf()],
  ['leaf-slim', 'Slim leaf', leaf(16, 50)],
  ['leaf-round', 'Round leaf', leaf(40, 48)],
  ['leaf-vein', 'Leaf with vein', leaf(30, 50) + rect(-1.5, -40, 3, 80)],
  ['leaf-pair', 'Leaf pair', rotPoly([[0, 0]], 0) + `M0 40C-6 10-30-6-44-36C-12-30 2-6 0 40Z` + `M0 40C6 10 30-6 44-36C12-30-2-6 0 40Z`],
  ['monstera', 'Monstera', 'M0 50C-6 30-48 20-44-14C-40-40-12-50 0-50C12-50 40-40 44-14C48 20 6 30 0 50Z' + ellipse(-22, -10, 6, 10) + ellipse(22, -10, 6, 10) + ellipse(-12, 14, 5, 8) + ellipse(12, 14, 5, 8)],
  ['fern', 'Fern', rect(-1.5, -50, 3, 100) + [-40, -26, -12, 2, 16, 30].map((y, i) => { const w = 10 + (5 - Math.abs(i - 2.5)) * 5; return ellipse(w / 2 + 2, y, w / 2, 4) + ellipse(-w / 2 - 2, y, w / 2, 4); }).join('')],
  ['pine', 'Pine tree', poly([[0, -50], [26, -14], [12, -14], [34, 18], [16, 18], [40, 40], [-40, 40], [-16, 18], [-34, 18], [-12, -14], [-26, -14]]) + rect(-5, 40, 10, 10)],
  ['tree', 'Round tree', circle(0, -14, 34) + rect(-5, 14, 10, 36)],
  ['mountain', 'Mountains', poly([[-50, 40], [-16, -20], [4, 10], [22, -36], [50, 40]])],
  ['cloud', 'Cloud', 'M-34 26A20 20 0 0 1-30-12A24 24 0 0 1 12-24A22 22 0 0 1 42 2A18 18 0 0 1 34 26Z'],
  ['raindrop', 'Raindrop', drop],
  ['snowflake', 'Snowflake', asterisk(6, 48, 6) + around(6, (a) => rotPoly([[-2, -30], [-16, -42], [-12, -46], [0, -36], [12, -46], [16, -42], [2, -30]], a))],
  ['moon', 'Moon', 'M10-46A46 46 0 1 0 46 10A36 36 0 1 1 10-46Z'],
  ['moon-star', 'Moon & star', 'M4-44A44 44 0 1 0 40 6A34 34 0 1 1 4-44Z' + star(5, 14, 6).replace('M', 'M').split('Z')[0].replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${f(Number(x) + 30)} ${f(Number(y) - 28)}`) + 'Z'],
  ['shell', 'Shell', fan(5, 0, 42, 86, 76, 0.085) + circle(0, 42, 7)],
  ['fish', 'Fish', 'M-40 0C-20-28 20-28 34 0C20 28-20 28-40 0Z' + poly([[30, 0], [50, -18], [50, 18]]) + circle(-20, -4, 4)],
  ['bird', 'Bird', 'M-48-6C-30-26-10-20 0-4C10-20 30-26 48-6C30-14 12-8 0 10C-12-8-30-14-48-6Z'],
  ['butterfly', 'Butterfly', 'M0-6C-10-40-48-42-44-12C-42 4-20 4-4 0C-20 6-36 24-24 38C-14 46-4 26 0 8C4 26 14 46 24 38C36 24 20 6 4 0C20 4 42 4 44-12C48-42 10-40 0-6Z'],
  ['bee', 'Bee', ellipse(0, 6, 22, 30) + ellipse(-22, -22, 18, 12) + ellipse(22, -22, 18, 12)],
  ['wave', 'Wave', wave()],
  ['waves-double', 'Double wave', wave(14, 10).replace(/-?\d+\.?\d*/g, (n, i) => n) + wave(14, 10).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${x} ${f(Number(y) + 26)}`)],
  ['palm', 'Palm tree', fan(7, 0, -16, 40, 210, 0.16) + poly([[-3, -12], [3, -12], [7, 50], [-7, 50]])],
]);

add('Celebration', [
  ['balloon', 'Balloon', ellipse(0, -14, 30, 36) + poly([[-6, 22], [6, 22], [0, 30]]) + rect(-1.5, 30, 3, 20)],
  ['gift', 'Gift', rect(-36, -14, 72, 60) + rect(-42, -30, 84, 18) + 'M0-30C-10-52-34-44-20-30Z' + 'M0-30C10-52 34-44 20-30Z'],
  ['confetti', 'Confetti', rotPoly([[-30, -40], [-18, -40], [-18, -32], [-30, -32]], 0.4) + circle(20, -30, 7) + poly([[-6, -6], [10, 2], [-4, 12]]) + rotPoly([[24, 18], [36, 18], [36, 26], [24, 26]], -0.5) + circle(-28, 26, 6) + circle(6, 36, 5)],
  ['party-hat', 'Party hat', poly([[0, -48], [32, 40], [-32, 40]]) + circle(0, -48, 7)],
  ['candle', 'Candle', rect(-10, -14, 20, 64) + 'M0-48C10-36 10-24 0-18C-10-24-10-36 0-48Z'],
  ['diya', 'Diya lamp', 'M-46 4C-40 34 40 34 46 4Z' + 'M0-46C14-28 12-12 0-4C-12-12-14-28 0-46Z'],
  ['lantern', 'Lantern', rect(-6, -50, 12, 8) + 'M-26-42H26L34-6L26 34H-26L-34-6Z' + rect(-16, 34, 32, 10)],
  ['crescent-star', 'Crescent & star', 'M-2-46A46 46 0 1 0 30 32A38 38 0 1 1-2-46Z' + poly(Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? 6 : 15; const a = -Math.PI / 2 + (k * Math.PI) / 5; return [26 + r * Math.cos(a), -16 + r * Math.sin(a)] as [number, number]; }))],
  ['music', 'Music note', ellipse(-14, 32, 16, 12) + rect(-2, -44, 6, 76) + 'M4-44C20-40 34-30 30-12C26-26 16-28 4-28Z'],
  ['bow', 'Bow', 'M0 0C-14-24-46-30-44-2C-42 20-14 12 0 0Z' + 'M0 0C14-24 46-30 44-2C42 20 14 12 0 0Z' + circle(0, 0, 8) + poly([[-4, 4], [-20, 44], [-8, 40]]) + poly([[4, 4], [20, 44], [8, 40]])],
  ['ring-heart', 'Hearts pair', heart(0.6).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${f(Number(x) - 16)} ${f(Number(y) - 4)}`) + heart(0.6).replace(/(-?\d+\.?\d*) (-?\d+\.?\d*)/g, (_, x, y) => `${f(Number(x) + 16)} ${f(Number(y) + 6)}`)],
  ['cake', 'Cake', rrect(-40, 4, 80, 40, 6) + rrect(-30, -22, 60, 26, 5) + rect(-2, -40, 4, 16) + 'M0-50C5-45 5-41 0-38C-5-41-5-45 0-50Z'],
  ['cocktail', 'Glass', poly([[-36, -40], [36, -40], [4, -2], [4, 34], [20, 44], [-20, 44], [-4, 34], [-4, -2]])],
  ['firework', 'Firework', asterisk(12, 48, 4) + around(12, (a) => circle(...rotP(0, -48, a), 4))],
]);

add('Ornament', [
  ['paisley', 'Paisley', 'M-10 46C-40 40-44 0-24-22C-6-42 26-50 34-34C26-36 18-30 20-20C40-6 30 50-10 46Z' + circle(-6, 14, 12) + circle(-6, 14, 6)],
  ['fleur', 'Fleur', 'M0-50C12-36 12-18 0-4C-12-18-12-36 0-50Z' + 'M-4 0C-20-2-40-16-40-34C-24-26-12-16-4 0Z' + 'M4 0C20-2 40-16 40-34C24-26 12-16 4 0Z' + rect(-30, 2, 60, 8) + 'M0 10L-12 46H12Z'],
  ['damask', 'Damask', 'M0-50C18-38 24-20 10-4C30-6 40 10 30 24C20 14 10 16 0 30C-10 16-20 14-30 24C-40 10-30-6-10-4C-24-20-18-38 0-50Z' + 'M0 30L-8 50H8Z'],
  ['scroll', 'Scroll', 'M-44 0C-44-26-10-30-8-8C-6 6-22 8-24-2C-14 2-12-12-24-12C-34-10-34 10-20 14C6 22 24 0 24-14C34 2 30 30 0 30C-26 30-44 18-44 0Z'],
  ['mandala', 'Mandala', flower(8, 50, 12, 0) + ringPath(22, 16) + around(8, (a) => circle(...rotP(0, -30, a + Math.PI / 8), 4)) + circle(0, 0, 8)],
  ['medallion', 'Medallion', star(16, 50, 42) + circle(0, 0, 36) + flower(8, 32, 9, 6)],
  ['scallop', 'Scallop', 'M-50 20A25 25 0 0 1 0 20A25 25 0 0 1 50 20L50 50L-50 50Z'],
  ['lattice', 'Linked rings', circle(-18, 0, 28) + circle(-18, 0, 20) + circle(18, 0, 28) + circle(18, 0, 20)],
  ['arabesque', 'Arabesque', around(4, (a) => { const P = (x: number, y: number) => pt(...rotP(x, y, a)); return `M${P(0, 0)}C${P(-20, -10)} ${P(-20, -40)} ${P(0, -50)}C${P(20, -40)} ${P(20, -10)} ${P(0, 0)}Z`; }, Math.PI / 4) + circle(0, 0, 10)],
  ['kolam', 'Kolam dots', around(8, (a) => circle(...rotP(0, -36, a), 6)) + circle(0, 0, 10) + around(4, (a) => circle(...rotP(0, -18, a), 5), Math.PI / 4)],
]);

add('Lines & marks', [
  ['line', 'Dash', 'M-44-7H44V7H-44Z'],
  ['stripes', 'Stripes', rect(-48, -40, 96, 12) + rect(-48, -6, 96, 12) + rect(-48, 28, 96, 12)],
  ['stripes-v', 'Bars', rect(-40, -48, 12, 96) + rect(-6, -48, 12, 96) + rect(28, -48, 12, 96)],
  ['grid-lines', 'Grid', rect(-48, -48, 96, 96) + rect(-44, -44, 40, 40) + rect(4, -44, 40, 40) + rect(-44, 4, 40, 40) + rect(4, 4, 40, 40)],
  ['chevron', 'Chevron', chevron()],
  ['zigzag', 'Zigzag', zigzag()],
  ['arrow', 'Arrow', poly([[-44, -8], [12, -8], [12, -28], [48, 0], [12, 28], [12, 8], [-44, 8]])],
  ['arrow-up', 'Up arrow', poly([[0, -48], [36, -8], [12, -8], [12, 46], [-12, 46], [-12, -8], [-36, -8]])],
  ['squiggle', 'Squiggle', 'M-48 8C-40-12-28-12-24 0S-8 12-4 0 12-12 16 0 32 12 36 0 48-4 48-4V8C44 20 32 20 28 8S12-4 8 8-8 20-12 8-28-4-32 8-44 20-48 8Z'],
  ['dots-row', 'Dot row', circle(-32, 0, 9) + circle(0, 0, 9) + circle(32, 0, 9)],
  ['brush-dot', 'Brush mark', 'M-44 8C-40-14-6-22 22-14C44-8 50 10 36 18C14 30-24 30-40 22C-46 18-46 12-44 8Z'],
  ['tick', 'Tick', poly([[-44, 4], [-30, -10], [-10, 10], [30, -30], [44, -16], [-10, 38]])],
  ['spiral', 'Spiral', 'M2 0A2 2 0 0 0-2 0A6 6 0 0 0 10 0A10 10 0 0 0-10 0A14 14 0 0 0 18 0A18 18 0 0 0-18 0A22 22 0 0 0 26 0A26 26 0 0 0-26 0A30 30 0 0 0 34 0A34 34 0 0 0-34 0A38 38 0 0 0 42 0H48A44 44 0 0 1-40 0A32 32 0 0 1 30 0A28 28 0 0 1-22 0A20 20 0 0 1 14 0A12 12 0 0 1-6 0A4 4 0 0 1 2 0Z'],
]);

export const PATTERN_MOTIFS: Motif[] = ALL;
