// Turns a saved design (template canvas JSON) into a short animated video,
// right in the browser: the background appears, then every element glides
// in one after another, then pictures float and sparkles twinkle.
// The video is made from the design as it is saved, so any edit made in the
// editor is in the next video. MP4 where the browser can record it
// (Safari, recent Chrome), otherwise WebM.

import { renderTemplatePages } from '@/lib/templates/renderPages';

const BG_NAMES = new Set(['Background', 'Wash', 'Glow', 'Spectrum bar', 'Spectrum ring', 'Spectrum dots', 'Green glow']);

export function videoMime(): { mime: string; ext: 'mp4' | 'webm' } {
  const MR: any = (window as any).MediaRecorder;
  if (!MR) return { mime: '', ext: 'webm' };
  for (const m of ['video/mp4;codecs=avc1.42E01E', 'video/mp4;codecs=avc1', 'video/mp4']) if (MR.isTypeSupported?.(m)) return { mime: m, ext: 'mp4' };
  for (const m of ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']) if (MR.isTypeSupported?.(m)) return { mime: m, ext: 'webm' };
  return { mime: '', ext: 'webm' };
}

const ease = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

export type VideoStyle = 'glide' | 'pop' | 'fade';

export async function makeTemplateVideo(canvasJson: any, opts: { seconds?: number; maxSide?: number; style?: VideoStyle; onProgress?: (p: number) => void } = {}): Promise<{ blob: Blob; ext: 'mp4' | 'webm' }> {
  const style = opts.style || 'glide';
  const seconds = opts.seconds ?? 8;
  const { mime, ext } = videoMime();
  if (!(window as any).MediaRecorder) throw new Error('This browser cannot record video. Please use Safari or Chrome.');
  let result: { blob: Blob; ext: 'mp4' | 'webm' } | null = null;
  await renderTemplatePages(canvasJson, 400, {
    prepare: async (canvas: any, _F: any, boards: any[]) => {
      const ab = boards[0];
      const W = ab ? ab.width * (ab.scaleX || 1) : canvas.getWidth();
      const H = ab ? ab.height * (ab.scaleY || 1) : canvas.getHeight();
      const k = Math.min(1, (opts.maxSide ?? 1350) / Math.max(W, H));
      const vw = Math.round((W * k) / 2) * 2, vh = Math.round((H * k) / 2) * 2;
      // Draw to our own canvas (fabric's element is resized for previews).
      const out = document.createElement('canvas');
      out.width = vw; out.height = vh;
      const ctx = out.getContext('2d')!;
      const objs = canvas.getObjects().filter((o: any) => !o.__isGuide);
      // Background = the page itself, named backgrounds, and anything that covers (almost) the whole page.
      const isBg = (o: any) => {
        if (o.__isArtboard || BG_NAMES.has(o.name)) return true;
        const r = o.getBoundingRect(true, true);
        return r.width * r.height >= W * H * 0.85;
      };
      const anim = objs.filter((o: any) => !isBg(o));
      const base = new Map<any, any>(objs.map((o: any) => [o, { top: o.top, opacity: o.opacity ?? 1, scaleX: o.scaleX, scaleY: o.scaleY, angle: o.angle || 0 }]));
      const step = Math.min(0.09, 3.0 / Math.max(1, anim.length));
      const start = new Map<any, number>(anim.map((o: any, i: number) => [o, 0.5 + i * step]));
      canvas.setDimensions({ width: vw, height: vh });
      canvas.setViewportTransform([k, 0, 0, k, -(ab ? ab.left : 0) * k, -(ab ? ab.top : 0) * k]);
      const frame = (t: number) => {
        for (const o of objs) {
          const b = base.get(o);
          if (isBg(o)) { o.opacity = b.opacity * ease(t / 0.5); continue; }
          const s = start.get(o)!;
          const raw = Math.min(1, Math.max(0, (t - s) / 0.6));
          const p = ease(raw);
          const isArt = o.type === 'image' && o.name !== 'Logo';
          const small = (o.width || 0) * (o.scaleX || 1) < 40;
          o.opacity = b.opacity * p * (small && p >= 1 ? 0.65 + 0.35 * Math.abs(Math.sin(t * 3 + s * 7)) : 1);
          const float = isArt && p >= 1 ? Math.sin((t - s) * 2.2) * 6 : 0;
          let sc = 1;
          if (style === 'glide') { o.top = b.top + (1 - p) * 40 + float; sc = 0.92 + 0.08 * p; }
          else if (style === 'pop') { o.top = b.top + float; sc = raw >= 1 ? 1 : 0.6 + 0.4 * p + Math.sin(raw * Math.PI) * 0.12; }
          else { o.top = b.top + float * 0.5; }
          o.scaleX = b.scaleX * sc; o.scaleY = b.scaleY * sc;
        }
        canvas.renderAll();
        ctx.clearRect(0, 0, vw, vh);
        ctx.drawImage(canvas.getElement(), 0, 0);
      };
      frame(0);
      const stream = (out as any).captureStream(30) as MediaStream;
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 8_000_000 } : { videoBitsPerSecond: 8_000_000 });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      const done = new Promise<void>((r) => (rec.onstop = () => r()));
      rec.start(250);
      const t0 = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const t = (performance.now() - t0) / 1000;
          frame(Math.min(t, seconds));
          opts.onProgress?.(Math.min(1, t / seconds));
          if (t < seconds) requestAnimationFrame(tick); else resolve();
        };
        requestAnimationFrame(tick);
      });
      rec.stop();
      await done;
      // Put the design back as it was (the pages rendered next are not used).
      for (const o of objs) Object.assign(o, base.get(o));
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
      result = { blob: new Blob(chunks, { type: mime || 'video/webm' }), ext };
    },
  });
  if (!result) throw new Error('The video could not be made.');
  return result;
}

/** Full-size PNG of the design's first page. */
export async function templateImage(canvasJson: any, width: number, height: number): Promise<string | null> {
  const pages = await renderTemplatePages(canvasJson, Math.max(width, height), { format: 'png', maxMultiplier: 1 } as any);
  return pages[0]?.url || null;
}
