// Free AI chats that can design a template for us. Each one opens in a new
// tab on the person's own free account; we pre-fill the instructions where
// the site accepts them in the address (?q=), and otherwise copy them so the
// person just pastes. Any of them can read an attached reference image.
//
// No keys, no cost, nothing stored on our side.

export interface AiProvider {
  id: string;
  name: string;
  /** opens a new chat; with `prefill` the instructions are already typed */
  url: (prompt: string) => string;
  prefill: boolean;
  /** brand-free accent colour for the button dot */
  dot: string;
  note: string;
}

const q = (base: string, key = 'q') => (p: string) => `${base}${base.includes('?') ? '&' : '?'}${key}=${encodeURIComponent(p)}`;

export const AI_PROVIDERS: AiProvider[] = [
  { id: 'claude', name: 'Claude', url: q('https://claude.ai/new'), prefill: true, dot: '#D97757', note: 'Best at clean layouts and following the format.' },
  { id: 'chatgpt', name: 'ChatGPT', url: q('https://chatgpt.com/'), prefill: true, dot: '#10A37F', note: 'Good all-rounder; reads images well.' },
  { id: 'gemini', name: 'Gemini', url: () => 'https://gemini.google.com/app', prefill: false, dot: '#4285F4', note: 'Paste the copied instructions; strong with photos.' },
  { id: 'copilot', name: 'Copilot', url: q('https://copilot.microsoft.com/'), prefill: true, dot: '#2563EB', note: 'Free with a Microsoft account.' },
  { id: 'mistral', name: 'Le Chat (Mistral)', url: q('https://chat.mistral.ai/chat'), prefill: true, dot: '#FA520F', note: 'Fast; free account.' },
  { id: 'grok', name: 'Grok', url: q('https://grok.com/'), prefill: true, dot: '#111111', note: 'Free with an X account.' },
  { id: 'deepseek', name: 'DeepSeek', url: () => 'https://chat.deepseek.com/', prefill: false, dot: '#4D6BFE', note: 'Paste the instructions; text-only works best.' },
  { id: 'qwen', name: 'Qwen', url: () => 'https://chat.qwen.ai/', prefill: false, dot: '#615CED', note: 'Paste the instructions; reads images.' },
  { id: 'meta', name: 'Meta AI', url: () => 'https://www.meta.ai/', prefill: false, dot: '#0866FF', note: 'Paste the instructions.' },
  { id: 'perplexity', name: 'Perplexity', url: q('https://www.perplexity.ai/search'), prefill: true, dot: '#20808D', note: 'Free; can attach an image.' },
];

/** Nearest preset size for an image's shape (so a story screenshot becomes a story). */
export function nearestFormat<T extends { w: number; h: number }>(w: number, h: number, formats: T[]): T {
  const r = w / h;
  return formats.reduce((best, f) => (Math.abs(Math.log(f.w / f.h / r)) < Math.abs(Math.log(best.w / best.h / r)) ? f : best), formats[0]);
}

/** Main colours of an image (browser only): up to 6 hex codes, most used first. */
export async function paletteOf(src: string, max = 6): Promise<string[]> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const c = document.createElement('canvas');
  const k = 80 / Math.max(img.width, img.height);
  c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
  const ctx = c.getContext('2d');
  if (!ctx) return [];
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const buckets = new Map<string, { n: number; r: number; g: number; b: number }>();
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] < 128) continue;
    const key = `${d[i] >> 5}-${d[i + 1] >> 5}-${d[i + 2] >> 5}`;
    const e = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    e.n++; e.r += d[i]; e.g += d[i + 1]; e.b += d[i + 2];
    buckets.set(key, e);
  }
  const hex = (v: number) => Math.round(v).toString(16).padStart(2, '0');
  const out: { c: string; n: number; rgb: [number, number, number] }[] = [];
  [...buckets.values()].sort((a, b) => b.n - a.n).forEach((e) => {
    const rgb: [number, number, number] = [e.r / e.n, e.g / e.n, e.b / e.n];
    // skip colours too close to one already picked
    if (out.some((o) => Math.hypot(o.rgb[0] - rgb[0], o.rgb[1] - rgb[1], o.rgb[2] - rgb[2]) < 48)) return;
    if (out.length < max) out.push({ c: `#${hex(rgb[0])}${hex(rgb[1])}${hex(rgb[2])}`, n: e.n, rgb });
  });
  return out.map((o) => o.c);
}

/** Shrink an image to a JPEG data URL (for the one-click AI and the clipboard). */
export async function shrinkImage(src: string, maxSide = 1280, quality = 0.85): Promise<{ dataUrl: string; w: number; h: number }> {
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
  const k = Math.min(1, maxSide / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return { dataUrl: c.toDataURL('image/jpeg', quality), w: img.width, h: img.height };
}

/** Put the image on the clipboard so it can be pasted straight into the AI chat. */
export async function copyImage(dataUrl: string): Promise<boolean> {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    const png = blob.type === 'image/png' ? blob : await new Promise<Blob>((res) => {
      const i = new Image();
      i.onload = () => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d')!.drawImage(i, 0, 0); c.toBlob((b) => res(b!), 'image/png'); };
      i.src = dataUrl;
    });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    return true;
  } catch {
    return false;
  }
}
