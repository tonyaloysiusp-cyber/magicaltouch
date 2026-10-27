// Helpers for saving the canvas back into a template.

const MAX_SIDE = 1600;
const MAX_CHARS = 900_000; // ~650 KB of picture

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = src;
  });
}

/** Re-encodes embedded (data:) pictures that are very large, keeping transparency. */
export async function shrinkEmbeddedImages(json: any): Promise<any> {
  const jobs: Promise<void>[] = [];
  const visit = (o: any) => {
    if (!o || typeof o !== 'object') return;
    // The untouched original of an edited photo (kept for "Reset photo") can
    // be many MB — far too big to send with every save. Drop it when huge.
    if (typeof o.__originalSrc === 'string' && o.__originalSrc.startsWith('data:') && o.__originalSrc.length > MAX_CHARS) delete o.__originalSrc;
    if (o.clipPath && typeof o.clipPath === 'object') visit(o.clipPath);
    if (o && o.type === 'image' && !o.clipPath && typeof o.src === 'string' && o.src.startsWith('data:image/') && o.src.length > MAX_CHARS) {
      jobs.push(
        (async () => {
          try {
            const img = await loadImage(o.src);
            const k = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
            if (k >= 1 && o.src.startsWith('data:image/jpeg')) return;
            const c = document.createElement('canvas');
            c.width = Math.max(1, Math.round(img.naturalWidth * k));
            c.height = Math.max(1, Math.round(img.naturalHeight * k));
            const ctx = c.getContext('2d')!;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(img, 0, 0, c.width, c.height);
            // Signatures and logos usually need see-through edges: keep PNG for those.
            const hasAlpha = (() => {
              const d = ctx.getImageData(0, 0, c.width, c.height).data;
              for (let i = 3; i < d.length; i += 4 * 97) if (d[i] < 250) return true;
              return false;
            })();
            const src = hasAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.88);
            if (src.length >= o.src.length) return;
            // Same size on the page: the stored pixels are smaller, so scale up.
            const ratio = img.naturalWidth / c.width;
            o.src = src;
            o.scaleX = (o.scaleX || 1) * ratio;
            o.scaleY = (o.scaleY || 1) * ratio;
            if (o.width) o.width = o.width / ratio;
            if (o.height) o.height = o.height / ratio;
            if (o.cropX) o.cropX = o.cropX / ratio;
            if (o.cropY) o.cropY = o.cropY / ratio;
          } catch {
            // leave it as it was
          }
        })()
      );
    }
    (o?.objects || []).forEach(visit);
  };
  (json.objects || []).forEach(visit);
  if (json.backgroundImage) visit(json.backgroundImage);
  await Promise.all(jobs);
  return json;
}

/**
 * The canvas as plain JSON, ready to store: a real copy (no live Fabric
 * objects inside), big embedded photos shrunk. Throws a readable error when
 * the design cannot be saved, instead of failing silently.
 */
export async function canvasJsonForSave(canvas: any, props: string[]): Promise<{ json: any; bytes: number }> {
  let json: any;
  try {
    json = JSON.parse(JSON.stringify(canvas.toJSON(props)));
  } catch (err) {
    console.error('Canvas could not be serialized:', err);
    throw new Error('One item on the page could not be saved. Remove the last thing you added and try again.');
  }
  await shrinkEmbeddedImages(json);
  const bytes = JSON.stringify(json).length;
  if (bytes > 12_000_000) throw new Error(`This design is too large to save (${Math.round(bytes / 1e6)} MB). Use smaller pictures — for example a signature as a small PNG.`);
  return { json, bytes };
}
