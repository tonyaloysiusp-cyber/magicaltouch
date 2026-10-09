// Gets a picture ready for the design: very large photos are scaled down
// to a size that is still sharp in print (5000 px on the long side is
// A3 at 300 DPI) so the editor stays fast, and formats not every browser
// can show (HEIC/TIFF) become JPEG. Transparent pictures stay PNG.

const MAX_EDGE = 5000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('image-load-failed'));
    img.src = src;
  });
}

export async function prepareImageDataUrl(dataUrl: string, maxEdge = MAX_EDGE): Promise<string> {
  if (!dataUrl.startsWith('data:image/')) return dataUrl;
  const mime = dataUrl.slice(5, dataUrl.indexOf(';'));
  const exotic = /heic|heif|tiff/i.test(mime);
  let img: HTMLImageElement;
  try {
    img = await loadImage(dataUrl);
  } catch {
    return dataUrl; // let the caller report it can't be opened
  }
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  if (!w || !h) return dataUrl;
  const k = Math.min(1, maxEdge / Math.max(w, h));
  if (k === 1 && !exotic) return dataUrl;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const ctx = c.getContext('2d');
  if (!ctx) return dataUrl;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const keepAlpha = /png|webp|gif|svg/i.test(mime);
  try {
    return keepAlpha ? c.toDataURL('image/png') : c.toDataURL('image/jpeg', 0.92);
  } catch {
    return dataUrl;
  }
}
