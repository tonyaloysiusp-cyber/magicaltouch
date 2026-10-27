// ---------------------------------------------------------------------
// lib/templates/fromSpec.ts
// "Make a template with Claude": Claude (free or paid plan, in the
// person's own browser tab) writes a small JSON description of a design;
// this file turns it into a real, editable Magical Touch template.
// The format is deliberately simple so any AI can follow it.
// ---------------------------------------------------------------------

export interface SpecElement {
  type: 'text' | 'rect' | 'circle' | 'ellipse' | 'triangle' | 'line' | 'photo';
  x?: number; y?: number; w?: number; h?: number; r?: number;
  x1?: number; y1?: number; x2?: number; y2?: number;
  fill?: string; gradient?: [string, string]; angle?: number;
  stroke?: string; strokeWidth?: number; radius?: number; opacity?: number; rotate?: number;
  text?: string; font?: string; size?: number; weight?: number; color?: string; align?: 'left' | 'center' | 'right';
  lineHeight?: number; letterSpacing?: number; upper?: boolean; italic?: boolean;
  photo?: string; shape?: 'rect' | 'circle' | 'arch';
  name?: string;
}
export interface TemplateSpec {
  name: string;
  category?: string;
  occasion?: string;
  tags?: string[];
  keywords?: string;
  description?: string;
  width: number;
  height: number;
  background?: string | { gradient: [string, string]; angle?: number };
  elements: SpecElement[];
}

export interface LibraryPhotoLite { src: string; w: number; h: number; tags: string[]; templates?: { name: string }[] }

export const SPEC_FORMATS: { id: string; label: string; w: number; h: number }[] = [
  { id: 'post45', label: 'Instagram post (1080 × 1350)', w: 1080, h: 1350 },
  { id: 'square', label: 'Square post (1080 × 1080)', w: 1080, h: 1080 },
  { id: 'story', label: 'Story / WhatsApp status (1080 × 1920)', w: 1080, h: 1920 },
  { id: 'a4', label: 'A4 flyer / poster (794 × 1123)', w: 794, h: 1123 },
  { id: 'a4l', label: 'A4 landscape / certificate (1123 × 794)', w: 1123, h: 794 },
  { id: 'fb', label: 'Facebook post (1200 × 630)', w: 1200, h: 630 },
  { id: 'yt', label: 'YouTube thumbnail (1280 × 720)', w: 1280, h: 720 },
  { id: 'card', label: 'Invitation card 5×7 in (480 × 672)', w: 480, h: 672 },
];

export const SPEC_FONTS = ['Montserrat', 'Poppins', 'Inter', 'Playfair Display', 'Lora', 'Cormorant Garamond', 'DM Serif Display', 'Anton', 'Bebas Neue', 'Oswald', 'Archivo Black', 'Abril Fatface', 'Great Vibes', 'Dancing Script', 'Pacifico', 'Caveat', 'Allura', 'Parisienne', 'Raleway', 'Nunito', 'Quicksand', 'Fredoka', 'Baloo 2', 'Cinzel', 'Space Grotesk', 'Work Sans', 'Cairo', 'Amiri', 'Tajawal', 'Noto Sans Tamil', 'Catamaran', 'Mukta', 'Kalam'];

/** The instructions given to Claude, with the person's brief at the end. */
export function claudePrompt(brief: { topic: string; format: { w: number; h: number; label: string }; style?: string; colors?: string; wording?: string; language?: string }) {
  return `You are a senior graphic designer. Design ONE professional, modern ${brief.format.label} template for: ${brief.topic}.
${brief.style ? `Style: ${brief.style}.\n` : ''}${brief.colors ? `Colours: ${brief.colors}.\n` : ''}${brief.wording ? `Use this wording: ${brief.wording}\n` : 'Write short, catchy sample wording (realistic, no lorem ipsum).\n'}${brief.language && brief.language !== 'English' ? `Write the text in ${brief.language}.\n` : ''}If I attach a screenshot, use it only as inspiration for layout and mood — do not copy text, logos or photos.

Reply with ONLY a JSON object in a \`\`\`json code block, in exactly this format (coordinates in pixels, origin top-left, page ${brief.format.w} × ${brief.format.h}):
{
  "name": "Short template name",
  "category": "one of: Social Media, Flyers, Posters, Invitations, Cards, Certificates, Business, Menus, Resumes, Presentations",
  "occasion": "e.g. Eid, Diwali, Birthday, Wedding (or empty)",
  "tags": ["5-8 lowercase search words"],
  "description": "one sentence",
  "width": ${brief.format.w}, "height": ${brief.format.h},
  "background": "#hex"  OR  { "gradient": ["#hex", "#hex"], "angle": 135 },
  "elements": [
    { "type": "rect", "x": 0, "y": 0, "w": 100, "h": 100, "fill": "#hex", "radius": 0, "opacity": 1, "rotate": 0 },
    { "type": "rect", "x": 0, "y": 0, "w": 100, "h": 100, "gradient": ["#hex", "#hex"], "angle": 90 },
    { "type": "circle", "x": 0, "y": 0, "r": 50, "fill": "#hex" },
    { "type": "ellipse", "x": 0, "y": 0, "w": 200, "h": 100, "fill": "#hex" },
    { "type": "triangle", "x": 0, "y": 0, "w": 100, "h": 100, "fill": "#hex" },
    { "type": "line", "x1": 0, "y1": 0, "x2": 100, "y2": 0, "stroke": "#hex", "strokeWidth": 4 },
    { "type": "photo", "x": 0, "y": 0, "w": 400, "h": 500, "shape": "rect | circle | arch", "radius": 24, "photo": "2-4 words describing the photo, e.g. smiling couple wedding" },
    { "type": "text", "x": 80, "y": 100, "w": 920, "text": "Headline", "font": "Montserrat", "size": 96, "weight": 800, "color": "#hex", "align": "left | center | right", "lineHeight": 1.1, "letterSpacing": 0, "upper": false, "italic": false }
  ]
}
Rules:
- 8 to 18 elements, drawn in order (first = back). Keep every element fully inside the page with at least ${Math.round(Math.min(brief.format.w, brief.format.h) * 0.06)} px margin for text.
- Fonts: only from this list: ${SPEC_FONTS.join(', ')}. Use at most 3 fonts. Headline big and bold; clear hierarchy; strong contrast between text and background.
- "w" of a text box is its width; it wraps inside it. Use \\n for line breaks.
- Use photos only where a real photo helps; describe each with simple words.
- No logos, trademarks or copyrighted characters. Return only the JSON.`;
}

/** Takes Claude's whole reply (with or without ``` fences) and reads the JSON. */
export function parseSpec(raw: string): TemplateSpec {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1];
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('No design found. Paste Claude’s whole reply (the part between ```json and ```).');
  let spec: any;
  try {
    spec = JSON.parse(t.slice(a, b + 1));
  } catch {
    // common slips: trailing commas
    try { spec = JSON.parse(t.slice(a, b + 1).replace(/,\s*([}\]])/g, '$1')); } catch { throw new Error('The reply isn’t valid JSON. Ask Claude: “Please send the JSON again, valid and complete.”'); }
  }
  if (!spec || !Array.isArray(spec.elements)) throw new Error('The design has no “elements” list.');
  const W = Number(spec.width), H = Number(spec.height);
  if (!(W >= 200 && W <= 5000 && H >= 200 && H <= 5000)) throw new Error('The page size is missing or unusual (width / height).');
  return { ...spec, width: W, height: H, name: String(spec.name || 'New template').slice(0, 80) };
}

const hex = (c: unknown, d = '#000000') => (typeof c === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(c.trim()) ? c.trim() : typeof c === 'string' && /^rgba?\(/i.test(c) ? c : d);
const num = (v: unknown, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(+v) ? +v : d);

function gradientFill(g: [string, string], angle: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180, cx = w / 2, cy = h / 2, r = (Math.abs(w * Math.cos(a)) + Math.abs(h * Math.sin(a))) / 2;
  return {
    type: 'linear', gradientUnits: 'pixels',
    coords: { x1: cx - Math.cos(a) * r, y1: cy - Math.sin(a) * r, x2: cx + Math.cos(a) * r, y2: cy + Math.sin(a) * r },
    colorStops: [{ offset: 0, color: hex(g[0]) }, { offset: 1, color: hex(g[1]) }],
    offsetX: 0, offsetY: 0,
  };
}

/** Best library photo for a few words (falls back to the empty-frame picture). */
export function pickPhoto(words: string, photos: LibraryPhotoLite[], used: Set<string>): LibraryPhotoLite | null {
  const ws = words.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  let best: LibraryPhotoLite | null = null, score = 0;
  photos.forEach((p) => {
    const hay = `${p.tags.join(' ')} ${(p.templates || []).map((t) => t.name).join(' ')} ${p.src}`.toLowerCase();
    const s = ws.filter((w) => hay.includes(w)).length - (used.has(p.src) ? 0.5 : 0);
    if (s > score) { score = s; best = p; }
  });
  return best;
}

/** Converts a spec into the editor's page format (one page). */
export function specToCanvasJson(spec: TemplateSpec, photos: LibraryPhotoLite[] = []): any {
  const W = spec.width, H = spec.height, id = `artboard_ai_${Date.now().toString(36)}`;
  let n = 0;
  const uid = () => `obj_${Date.now()}_${(n++).toString(36)}`;
  const base = (o: any) => ({ version: '5.1.0', __uid: uid(), __artboardId: id, ...o });
  const objects: any[] = [];
  const bg = spec.background;
  objects.push({ type: 'rect', version: '5.1.0', left: 0, top: 0, width: W, height: H, fill: typeof bg === 'object' && bg?.gradient ? gradientFill(bg.gradient, num(bg.angle, 135), W, H) : hex(bg, '#ffffff'), name: 'Page 1', __isArtboard: true, __artboardId: id });
  const used = new Set<string>();
  (spec.elements || []).slice(0, 60).forEach((e) => {
    const x = num(e.x), y = num(e.y), w = Math.max(1, num(e.w, 100)), h = Math.max(1, num(e.h, 100));
    const opacity = Math.max(0, Math.min(1, num(e.opacity, 1)));
    const angle = num(e.rotate, 0);
    const fill = e.gradient ? gradientFill(e.gradient, num(e.angle, 90), w, h) : hex(e.fill, '#cccccc');
    const stroke = e.stroke ? { stroke: hex(e.stroke), strokeWidth: num(e.strokeWidth, 2) } : { strokeWidth: 0 };
    switch (e.type) {
      case 'rect':
        objects.push(base({ type: 'rect', left: x, top: y, width: w, height: h, rx: num(e.radius), ry: num(e.radius), fill, opacity, angle, ...stroke, name: e.name || 'Shape' }));
        break;
      case 'circle': {
        const r = Math.max(1, num(e.r, w / 2));
        objects.push(base({ type: 'circle', left: x, top: y, radius: r, fill: e.gradient ? gradientFill(e.gradient, num(e.angle, 90), 2 * r, 2 * r) : fill, opacity, ...stroke, name: e.name || 'Circle' }));
        break;
      }
      case 'ellipse':
        objects.push(base({ type: 'ellipse', left: x, top: y, rx: w / 2, ry: h / 2, fill, opacity, angle, ...stroke, name: e.name || 'Ellipse' }));
        break;
      case 'triangle':
        objects.push(base({ type: 'triangle', left: x, top: y, width: w, height: h, fill, opacity, angle, ...stroke, name: e.name || 'Triangle' }));
        break;
      case 'line': {
        const x1 = num(e.x1, x), y1 = num(e.y1, y), x2 = num(e.x2, x + w), y2 = num(e.y2, y);
        objects.push(base({ type: 'line', left: Math.min(x1, x2), top: Math.min(y1, y2), x1, y1, x2, y2, stroke: hex(e.stroke || e.fill, '#000000'), strokeWidth: num(e.strokeWidth, 3), strokeLineCap: 'round', opacity, name: e.name || 'Line' }));
        break;
      }
      case 'photo': {
        const p = pickPhoto(String(e.photo || ''), photos, used);
        const src = p?.src || '/templates/photo-frame-placeholder.jpg';
        if (p) used.add(p.src);
        const iw = p?.w || 1200, ih = p?.h || 1200;
        // cover the frame, centred
        const k = Math.max(w / iw, h / ih);
        const cw = w / k, ch = h / k;
        const shape = e.shape || 'rect';
        const r = num(e.radius, 0) / k;
        const clip =
          shape === 'circle'
            ? { type: 'circle', version: '5.1.0', originX: 'center', originY: 'center', left: 0, top: 0, radius: Math.min(cw, ch) / 2, fill: '#000' }
            : shape === 'arch'
              ? { type: 'path', version: '5.1.0', originX: 'center', originY: 'center', left: 0, top: 0, fill: '#000', path: [['M', 0, ch], ['L', 0, cw / 2], ['C', 0, cw * 0.22, cw * 0.22, 0, cw / 2, 0], ['C', cw * 0.78, 0, cw, cw * 0.22, cw, cw / 2], ['L', cw, ch], ['Z']], width: cw, height: ch }
              : { type: 'rect', version: '5.1.0', originX: 'center', originY: 'center', left: 0, top: 0, width: cw, height: ch, rx: r, ry: r, fill: '#000' };
        objects.push(base({
          type: 'image', left: x, top: y, width: cw, height: ch, cropX: (iw - cw) / 2, cropY: (ih - ch) / 2, scaleX: k, scaleY: k,
          src, crossOrigin: 'anonymous', filters: [], clipPath: clip, __frame: { kind: shape === 'rect' ? 'rect' : 'custom', empty: !p }, opacity, angle, name: 'Photo',
        }));
        break;
      }
      case 'text': {
        const size = Math.max(6, num(e.size, 40));
        let text = String(e.text ?? '').slice(0, 600);
        if (e.upper) text = text.toUpperCase();
        objects.push(base({
          type: 'textbox', left: x, top: y, width: Math.max(20, num(e.w, W - 2 * x)), fill: hex(e.color, '#111111'),
          fontFamily: SPEC_FONTS.includes(String(e.font)) ? e.font : 'Montserrat', fontWeight: num(e.weight, 400), fontSize: size, text,
          textAlign: ['left', 'center', 'right'].includes(String(e.align)) ? e.align : 'left', lineHeight: num(e.lineHeight, 1.16),
          charSpacing: num(e.letterSpacing, 0) * (Math.abs(num(e.letterSpacing, 0)) < 2 ? 1000 : 1), fontStyle: e.italic ? 'italic' : 'normal',
          styles: {}, minWidth: 20, splitByGrapheme: false, opacity, angle, name: e.name || (size >= 60 ? 'Headline' : 'Text'),
        }));
        break;
      }
    }
  });
  return { version: '5.1.0', objects };
}
