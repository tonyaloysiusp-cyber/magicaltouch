// Every standalone tool, in one list used by the Tools page, the header
// Tools menu and "recently used". Each entry opens its real route.

// The eight studios of Magical Touch Creative Studio. Every tool keeps its
// own address (for search engines and direct links) and sits in one of them.
export type ToolCategory = 'design' | 'apparel' | 'wall' | 'photo' | 'vector' | 'colour' | 'print' | 'creative';
export const TOOL_CATEGORIES: { id: ToolCategory; label: string }[] = [
  { id: 'design', label: 'Graphic Design & Publishing' },
  { id: 'apparel', label: 'Apparel & Textile' },
  { id: 'photo', label: 'Photo & ID' },
  { id: 'vector', label: 'Vector & Illustration' },
  { id: 'colour', label: 'Patterns & Colour' },
  { id: 'print', label: 'Print & Production' },
];

export interface ToolEntry {
  id: string; href: string; title: string; hint: string; body: string; category: ToolCategory;
  icon: string; tint: string; isNew?: boolean; panel?: string; keywords: string[];
}

export const TOOLS: ToolEntry[] = [
  { id: 'editor', href: '/create', title: 'Design Editor', hint: 'Pages, layers and print-ready export', body: 'Pages, layers, text effects, shapes, photos, brand kit and print-ready export for print and digital.', category: 'design', icon: 'LayoutTemplate', tint: '#3B82C4', keywords: ['editor', 'design', 'canva', 'graphic design', 'poster', 'flyer', 'layers', 'pdf'] },
  { id: 'photo-studio', href: '/photo-studio', title: 'Photo Studio', hint: 'Edit, retouch and crop a photo', body: 'Adjust, retouch, selections, layers, live text effects, looks, filters, crop and export.', category: 'photo', icon: 'Crop', tint: '#5DCCB8', panel: 'Edit photo on any picture', keywords: ['photo editor', 'retouch', 'filters', 'crop', 'lightroom', 'photoshop'] },
  { id: 'packaging', href: '/packaging-dieline', title: 'Packaging Design Studio', hint: 'Box templates, dielines & editor', body: '24 packaging templates on real dielines, or start from your product size and board. Design in the full editor (text, images, patterns, layers) and download the print PDF with CutContour and Crease spot colours, a branded dieline template or DXF.', category: 'print', icon: 'Package', tint: '#B88A5A', isNew: true, keywords: ['packaging', 'dieline', 'die line', 'die cut', 'box template', 'tuck end', 'mailer', 'carton', 'fefco', 'ecma', 'box'] },
  { id: 'remove-background', href: '/remove-background', title: 'Background Remover', hint: 'One photo or many at once', body: 'Remove the background from one photo or many at once, with Restore and Erase brushes. Runs on your device.', category: 'photo', icon: 'Eraser', tint: '#8CC84B', panel: 'Remove BG on any photo', keywords: ['remove background', 'transparent png', 'cut out', 'bg remover'] },
  { id: 'passport', href: '/passport-photo-maker', title: 'Passport Photo Maker', hint: 'Any country, exact KB and pixels', body: 'Passport, visa and exam photos for 40+ countries: white background, head sized to the rules, upload files at the exact KB and print sheets.', category: 'photo', icon: 'ScanFace', tint: '#0EA5E9', isNew: true, keywords: ['passport photo', 'visa photo', '35x45', '2x2', 'photo resize kb', 'ds-160'] },
  { id: 'patterns', href: '/patterns', title: 'Pattern Design', hint: 'Seamless repeats, rangoli & mandala', body: 'Seamless repeats — grid, brick, half-drop, mirror, radial, kaleidoscope — from 130+ vector shapes, your letters or your own image, plus a Rangoli & Mandala mode. Vector SVG, PDF or PNG.', category: 'colour', icon: 'Grid3x3', tint: '#C9A86A', panel: 'Patterns panel', keywords: ['seamless pattern', 'repeat', 'textile', 'pattern maker', 'surface pattern', 'fabric', 'rangoli', 'mandala', 'kolam', 'diwali'] },
  { id: 'textile', href: '/textile-studio', title: 'Textile Design Studio', hint: 'Polo, kurti, churidar, frock & jersey patterns', body: 'Garment templates on real pattern pieces — polo, T-shirt, jersey, kurti, churidar, frock and dupatta — drafted from a size or your measurements and designed in the full editor, with print PDF, pattern PDFs, DXF and fabric length. Team kits with names and numbers are in the Team Kit Designer.', category: 'apparel', icon: 'Shirt', tint: '#0F766E', isNew: true, keywords: ['jersey', 'team kit', 'football', 'cricket', 'basketball', 'sublimation', 'name and number', 'sports uniform', 'polo', 'polo shirt', 'uniform', 't-shirt', 'tshirt', 'tee', 'all over print', 'textile', 'kurta', 'kameez', 'chudidar', 'salwar', 'dupatta', 'embroidery', 'dst', 'tech pack', 'pattern drafting'] },
  { id: 'trace', href: '/trace', title: 'Image Trace', hint: 'Turn pictures into vectors', body: 'Photos, sketches and logos into vectors: black & white, line drawing or 3–32 colours, as editable SVG or vector PDF.', category: 'vector', icon: 'PenTool', tint: '#1E3A5F', isNew: true, panel: 'Trace panel', keywords: ['vectorize', 'image to svg', 'png to svg', 'logo vector', 'illustrator trace'] },
  { id: 'colours', href: '/colours', title: 'Colour Explorer', hint: 'Palettes, harmonies and gradients', body: 'Colour harmonies with HEX, RGB and CMYK, contrast checks, mood palettes, mesh gradient backgrounds and templates by colour.', category: 'colour', icon: 'Palette', tint: '#F2708F', isNew: true, panel: 'Colours panel', keywords: ['colour palette', 'color palette', 'hex', 'cmyk', 'contrast', 'harmony', 'gradient', 'mesh gradient', 'background'] },
  { id: 'print-size', href: '/print-size-calculator', title: 'Print Size & Binding Calculator', hint: 'Sizes, spine and cover spread', body: 'Paper sizes at any DPI with bleed, plus spine width, cover spread and fold marks for perfect binding, hardcover and saddle-stitch books.', category: 'print', icon: 'Ruler', tint: '#B45309', isNew: true, keywords: ['print size', 'dpi', 'a4 pixels', 'bleed', 'mm to pixels', 'spine width', 'perfect binding', 'hardcover', 'saddle stitch', 'book cover'] },
  { id: 'print-layout', href: '/print-layout', title: 'Print Layout', hint: 'Business cards many-up, booklets', body: 'Put business cards, stickers, labels or photos many-up on A4, A3 or SRA3 with bleed, crop marks and a lined-up back side — or turn a PDF into a saddle-stitch booklet. Your vectors stay vectors.', category: 'print', icon: 'Printer', tint: '#0369A1', isNew: true, keywords: ['imposition', 'business card sheet', 'n-up', 'many up', 'booklet', 'saddle stitch', 'crop marks', 'sticker sheet', 'print sheet', 'a4 layout'] },
  { id: 'vdp', href: '/variable-data', title: 'Variable Data Studio', hint: 'Badges, certificates, tickets from Excel', body: 'One personalised design per spreadsheet row: names, serial numbers and any column, as outlined text on your PDF or picture — one per page or many per sheet with crop marks.', category: 'print', icon: 'Table2', tint: '#7C3AED', isNew: true, keywords: ['variable data', 'mail merge', 'name badge', 'certificate', 'numbered tickets', 'serial numbers', 'csv', 'excel', 'bulk'] },
  { id: 'preflight', href: '/pdf-preflight', title: 'PDF Preflight Inspector', hint: 'Is the PDF ready for print?', body: 'Checks any PDF for press: TrimBox and bleed, embedded fonts, image resolution at placed size, RGB vs CMYK, spot colours, output intent, overprint, transparency, small text and thin lines — with a report PDF.', category: 'print', icon: 'ShieldCheck', tint: '#059669', isNew: true, keywords: ['preflight', 'pdf check', 'print ready', 'bleed check', 'cmyk check', 'dpi check', 'pdf/x', 'fonts embedded'] },
  { id: 'labels', href: '/editor?panel=production&tab=cut', title: 'Sticker & Cutting in the Design Editor', hint: 'Cut lines around PNGs, stickers, laser', body: 'Cut lines that follow a transparent PNG’s outline, white sticker borders, kiss / die / through / laser cut, engrave, perforation and crease, sticker sheets, path checks, SVG / DXF and print-and-cut PDF. Part of the Design Editor (Print & cut panel).', category: 'print', icon: 'Sticker', tint: '#F59E0B', isNew: true, keywords: ['sticker', 'label', 'contour cut', 'cutcontour', 'print and cut', 'kiss cut', 'die cut sticker', 'decal', 'dxf', 'svg to dxf', 'laser', 'laser cutting', 'cnc', 'router', 'plotter', 'lightburn', 'cut file'] },
  { id: 'barcode', href: '/editor?panel=production&tab=barcode', title: 'Barcodes in the Design Editor', hint: 'EAN-13, UPC, ITF-14, Code 128, Code 39', body: 'Vector barcodes placed straight on your design: EAN-13, UPC-A, EAN-8, UPC-E, ITF-14, ITF, Code 128 and Code 39 with check digits, quiet zones and print checks. Part of the Design Editor (Print & cut panel).', category: 'print', icon: 'Barcode', tint: '#0B0B12', isNew: true, keywords: ['barcode', 'ean', 'ean-13', 'upc', 'upc-a', 'ean-8', 'itf-14', 'gtin', 'bar code'] },
  { id: 'large-format', href: '/editor?panel=production&tab=large', title: 'Large Format in the Design Editor', hint: 'Banners, rolls, tiling and panels', body: 'Picture resolution at print size, roll widths, tiling on small sheets and splitting into panels with overlap and an assembly map. Part of the Design Editor (Print & cut panel).', category: 'print', icon: 'Grid2x2', tint: '#0EA5E9', isNew: true, keywords: ['poster', 'tiling', 'tile', 'banner', 'large format', 'split pdf', 'poster printing', 'rasterbator', 'big print'] },
  { id: 'separation', href: '/editor?panel=production&tab=sep', title: 'Separations & Halftone in the Design Editor', hint: 'Screen-print and CMYK films', body: 'Spot-colour plates with white underbase or CMYK process separations, halftone frequency, angle and dot shape, one film per ink. Part of the Design Editor (Print & cut panel).', category: 'print', icon: 'Layers3', tint: '#E6007E', isNew: true, keywords: ['separation', 'colour separation', 'color separation', 'halftone', 'screen printing', 'films', 'underbase', 'lpi', 'spot colour', 'cmyk plates'] },
];

export const RECOMMENDED = ['editor', 'textile', 'remove-background', 'trace', 'patterns'];
export const RECENT_KEY = 'mt:recent-tools';

export function toolForPath(path: string): ToolEntry | undefined {
  return TOOLS.find((t) => path === t.href || (t.id === 'editor' && path.startsWith('/editor')));
}

// Words people type that don't pick a tool by themselves.
const GENERIC = new Set(['design', 'designs', 'designer', 'template', 'templates', 'maker', 'make', 'create', 'creator', 'online', 'free', 'tool', 'tools', 'app', 'editor', 'generator', 'custom', 'my', 'a', 'an', 'the', 'for', 'to', 'of', 'and', 'with', 'in', 'how', 'best']);
const SYNONYMS: Record<string, string> = { jc: 'jersey', jursey: 'jersey', jercy: 'jersey', jersy: 'jersey', kit: 'jersey', kits: 'jersey', bg: 'background', removal: 'remove', remover: 'remove', erase: 'remove', tee: 't-shirt', tees: 't-shirt', tshirt: 't-shirt', tshirts: 't-shirt', color: 'colour', colors: 'colour', colours: 'colour', palette: 'colour', vectorize: 'vector', vectorise: 'vector', svg: 'vector', wallpapers: 'wallpaper', posters: 'poster', patterns: 'pattern', mandala: 'rangoli', kolam: 'rangoli', id: 'passport', visa: 'passport', retouch: 'photo', dpi: 'print' };
const norm = (w: string) => SYNONYMS[w] || w.replace(/(ing|ers|er|es|s)$/, (m) => (w.length - m.length >= 4 ? '' : m));

/** Tools that match a search (title, hint, body, keywords) — forgiving: synonyms, plurals and generic words. */
export function searchTools(q: string, list: ToolEntry[] = TOOLS): ToolEntry[] {
  const raw = q.toLowerCase().replace(/t[\s-]?shirts?/g, 't-shirt').split(/[^a-z0-9-]+/).filter(Boolean);
  if (!raw.length) return list;
  const words = raw.map(norm);
  const key = words.filter((w) => !GENERIC.has(w));
  const need = key.length ? key : words;
  return list
    .map((t) => {
      const hay = `${t.title} ${t.hint} ${t.body} ${t.keywords.join(' ')} ${t.id}`.toLowerCase();
      const title = `${t.title} ${t.keywords.join(' ')}`.toLowerCase();
      let score = 0, hits = 0;
      for (const w of need) { if (hay.includes(w)) { hits++; score += title.includes(w) ? 3 : 1; } }
      for (const w of words) if (GENERIC.has(w) && hay.includes(w)) score += 0.2;
      score += 1 / t.title.split(/\s+/).length; // the more specific tool first
      return { t, full: hits === need.length, score: hits === need.length ? score + 2 : hits ? score - 1.5 : 0 };
    })
    .filter((x, _, all) => x.score > 0 && (x.full || !all.some((y) => y.full)))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}

export function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : []; } catch { return []; }
}
export function rememberTool(id: string): void {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6))); } catch { /* private mode */ }
}

// ---------------------------------------------------------------- trail
// The tools a visitor moved through in this tab, so "Back" returns to the
// tool they came from (Pattern → Wall → Back = Pattern), not the home page.
const TRAIL = 'mt:trail';
export interface TrailStep { path: string; title: string }
function readTrail(): TrailStep[] { try { return JSON.parse(sessionStorage.getItem(TRAIL) || '[]'); } catch { return []; } }
export function pageTitleFor(pathWithQuery: string): string | null {
  const path = pathWithQuery.split('?')[0];
  if (path.startsWith('/editor')) return 'Design editor';
  if (path === '/tools') return 'All tools';
  if (path === '/create') return 'Create';
  if (path.startsWith('/templates')) return 'Templates';
  if (path === '/dashboard') return 'Dashboard';
  return toolForPath(path)?.title || null;
}
/** Record the current page (tools, editor, templates, dashboard) in the tab's trail. */
export function recordTrail(pathWithQuery: string): void {
  const title = pageTitleFor(pathWithQuery);
  if (!title) return;
  try {
    const t = readTrail();
    const base = pathWithQuery.split('?')[0];
    // Going back to the previous page pops the trail instead of growing it.
    if (t.length >= 2 && t[t.length - 2].path.split('?')[0] === base) t.pop();
    else if (t.length && t[t.length - 1].path.split('?')[0] === base) t[t.length - 1] = { path: pathWithQuery, title };
    else t.push({ path: pathWithQuery, title });
    sessionStorage.setItem(TRAIL, JSON.stringify(t.slice(-20)));
  } catch { /* private mode */ }
}
/** Where "Back" should go from this page: the previous page in the trail. */
export function previousStep(currentPath: string): TrailStep | null {
  const t = readTrail();
  const base = currentPath.split('?')[0];
  for (let i = t.length - 1; i >= 0; i--) if (t[i].path.split('?')[0] !== base) return t[i];
  return null;
}
