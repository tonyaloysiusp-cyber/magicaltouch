// Every standalone tool, in one list used by the Tools page, the header
// Tools menu and "recently used". Each entry opens its real route.

export type ToolCategory = 'design' | 'photo' | 'colour' | 'print';
export const TOOL_CATEGORIES: { id: ToolCategory; label: string }[] = [
  { id: 'design', label: 'Design & vector' },
  { id: 'photo', label: 'Photo' },
  { id: 'colour', label: 'Colour & pattern' },
  { id: 'print', label: 'Print & ID' },
];

export interface ToolEntry {
  id: string; href: string; title: string; hint: string; body: string; category: ToolCategory;
  icon: string; tint: string; isNew?: boolean; panel?: string; keywords: string[];
}

export const TOOLS: ToolEntry[] = [
  { id: 'editor', href: '/create', title: 'Design Editor', hint: 'Pages, layers and print-ready export', body: 'Pages, layers, text effects, shapes, photos, brand kit and print-ready export for print and digital.', category: 'design', icon: 'LayoutTemplate', tint: '#3B82C4', keywords: ['editor', 'design', 'canva', 'graphic design', 'poster', 'flyer', 'layers', 'pdf'] },
  { id: 'photo-studio', href: '/photo-studio', title: 'Photo Studio', hint: 'Edit, retouch and crop a photo', body: 'Adjust, retouch, selections, layers, live text effects, looks, filters, crop and export.', category: 'photo', icon: 'Crop', tint: '#5DCCB8', panel: 'Edit photo on any picture', keywords: ['photo editor', 'retouch', 'filters', 'crop', 'lightroom', 'photoshop'] },
  { id: 'remove-background', href: '/remove-background', title: 'Background Remover', hint: 'One photo or many at once', body: 'Remove the background from one photo or many at once, with Restore and Erase brushes. Runs on your device.', category: 'photo', icon: 'Eraser', tint: '#8CC84B', panel: 'Remove BG on any photo', keywords: ['remove background', 'transparent png', 'cut out', 'bg remover'] },
  { id: 'trace', href: '/trace', title: 'Image Trace', hint: 'Turn pictures into vectors', body: 'Photos, sketches and logos into vectors: black & white, line drawing or 3–32 colours, as editable SVG or vector PDF.', category: 'design', icon: 'PenTool', tint: '#1E3A5F', isNew: true, panel: 'Trace panel', keywords: ['vectorize', 'image to svg', 'png to svg', 'logo vector', 'illustrator trace'] },
  { id: 'patterns', href: '/patterns', title: 'Pattern Studio', hint: 'Seamless patterns and sublimation prints', body: 'Seamless repeats — grid, brick, half-drop, mirror, radial, kaleidoscope — plus garment print files for jerseys, shorts and socks.', category: 'colour', icon: 'Grid3x3', tint: '#C9A86A', isNew: true, panel: 'Patterns panel', keywords: ['seamless pattern', 'repeat', 'textile', 'jersey', 'sublimation', 'wallpaper', 't-shirt'] },
  { id: 'jersey', href: '/custom-jersey-designer', title: 'Jersey & T-shirt Designer', hint: 'Team kits with names and numbers', body: 'Design a jersey or pattern T-shirt once, add every player’s name, number and size, and download vector print files for each — or all as a ZIP.', category: 'design', icon: 'Shirt', tint: '#0F766E', isNew: true, keywords: ['jersey', 't-shirt', 'team kit', 'football', 'cricket', 'basketball', 'sublimation', 'name and number'] },
  { id: 'colours', href: '/colours', title: 'Colour Explorer', hint: 'Palettes and harmonies', body: 'Colour harmonies with HEX, RGB and CMYK, contrast checks, mood palettes, gradients and templates by colour.', category: 'colour', icon: 'Palette', tint: '#F2708F', isNew: true, panel: 'Colours panel', keywords: ['colour palette', 'color palette', 'hex', 'cmyk', 'contrast', 'harmony'] },
  { id: 'passport', href: '/passport-photo-maker', title: 'Passport Photo Maker', hint: 'Any country, exact KB and pixels', body: 'Passport, visa and exam photos for 40+ countries: white background, head sized to the rules, upload files at the exact KB and print sheets.', category: 'print', icon: 'ScanFace', tint: '#0EA5E9', isNew: true, keywords: ['passport photo', 'visa photo', '35x45', '2x2', 'photo resize kb', 'ds-160'] },
  { id: 'rangoli', href: '/rangoli-mandala-maker', title: 'Rangoli & Mandala Maker', hint: 'Draw with symmetry', body: 'Draw once and it repeats around the centre. Rings of petals and dots, or a ready Diwali rangoli.', category: 'colour', icon: 'Flower2', tint: '#E11D48', isNew: true, keywords: ['rangoli', 'mandala', 'kolam', 'diwali', 'symmetry'] },
  { id: 'gradients', href: '/gradient-background-generator', title: 'Gradient Backgrounds', hint: 'Mesh gradients with grain', body: 'Mesh gradients with grain — 4K wallpapers, social posts and slide backgrounds, as PNG, SVG or CSS.', category: 'colour', icon: 'Blend', tint: '#A69BD3', isNew: true, keywords: ['gradient', 'mesh gradient', 'wallpaper', 'background', 'css gradient'] },
  { id: 'print-size', href: '/print-size-calculator', title: 'Print Size Calculator', hint: 'Pixels, DPI and bleed', body: 'Any paper or card size in pixels, inches, millimetres and centimetres at any DPI, with bleed and safe area.', category: 'print', icon: 'Ruler', tint: '#B45309', isNew: true, keywords: ['print size', 'dpi', 'a4 pixels', 'bleed', 'mm to pixels'] },
];

export const RECOMMENDED = ['editor', 'remove-background', 'trace', 'patterns', 'passport'];
export const RECENT_KEY = 'mt:recent-tools';

export function toolForPath(path: string): ToolEntry | undefined {
  return TOOLS.find((t) => path === t.href || (t.id === 'editor' && path.startsWith('/editor')));
}

/** Tools that match a search (title, hint, body, keywords). */
export function searchTools(q: string, list: ToolEntry[] = TOOLS): ToolEntry[] {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list
    .map((t) => {
      const hay = `${t.title} ${t.hint} ${t.body} ${t.keywords.join(' ')}`.toLowerCase();
      const score = words.reduce((s, w) => s + (hay.includes(w) ? (t.title.toLowerCase().includes(w) ? 3 : 1) : -100), 0);
      return { t, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.t);
}

export function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : []; } catch { return []; }
}
export function rememberTool(id: string): void {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify([id, ...readRecent().filter((x) => x !== id)].slice(0, 6))); } catch { /* private mode */ }
}
