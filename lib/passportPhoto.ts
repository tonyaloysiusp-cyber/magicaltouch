// Passport & visa photo sizes and print-sheet layout (pure functions).
// Sizes follow the common published rules; people should still check the
// latest official requirements for their application.

export interface PhotoSpec { id: string; label: string; region: string; w: number; h: number; head: [number, number]; bg: string; note: string }

// w/h in mm; head = chin-to-crown height range in mm.
export const PHOTO_SPECS: PhotoSpec[] = [
  { id: 'in-35x45', label: 'Passport size photo (India forms) · 35 × 45 mm', region: 'India', w: 35, h: 45, head: [25, 32], bg: '#FFFFFF', note: 'The common “passport size” for Indian forms, exams, PAN and bank KYC.' },
  { id: 'in-passport', label: 'Indian passport / visa · 2 × 2 in (51 × 51 mm)', region: 'India', w: 51, h: 51, head: [25, 35], bg: '#FFFFFF', note: 'Square photo with a plain white background, used by Passport Seva and Indian visas.' },
  { id: 'uk', label: 'UK passport · 35 × 45 mm', region: 'United Kingdom', w: 35, h: 45, head: [29, 34], bg: '#F2F2F2', note: 'Plain light grey or cream background, neutral expression, mouth closed.' },
  { id: 'us', label: 'US passport / visa · 2 × 2 in', region: 'United States', w: 51, h: 51, head: [25, 35], bg: '#FFFFFF', note: 'White or off-white background; head 1 to 1⅜ inches.' },
  { id: 'schengen', label: 'Schengen visa / EU passport · 35 × 45 mm', region: 'Europe', w: 35, h: 45, head: [32, 36], bg: '#F2F2F2', note: 'Light background; face 70–80% of the photo height.' },
  { id: 'uae', label: 'UAE visa · 43 × 55 mm', region: 'UAE', w: 43, h: 55, head: [31, 39], bg: '#FFFFFF', note: 'White background, recent photo, no shadows.' },
  { id: 'canada', label: 'Canada passport · 50 × 70 mm', region: 'Canada', w: 50, h: 70, head: [31, 36], bg: '#FFFFFF', note: 'White or light background; face 31–36 mm.' },
  { id: 'au', label: 'Australia passport · 35 × 45 mm', region: 'Australia', w: 35, h: 45, head: [32, 36], bg: '#FFFFFF', note: 'Plain white or light grey background.' },
  { id: 'stamp', label: 'Stamp size · 20 × 25 mm', region: 'India', w: 20, h: 25, head: [14, 18], bg: '#FFFFFF', note: 'Small photo for admit cards and forms.' },
];

export const SHEETS: { id: string; label: string; w: number; h: number }[] = [
  { id: '4x6', label: '4 × 6 in photo paper (102 × 152 mm)', w: 102, h: 152 },
  { id: 'a4', label: 'A4 paper (210 × 297 mm)', w: 210, h: 297 },
  { id: '5x7', label: '5 × 7 in (127 × 178 mm)', w: 127, h: 178 },
  { id: 'letter', label: 'US Letter (216 × 279 mm)', w: 216, h: 279 },
];

export const mmToPx = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);

/** Photos on a sheet: positions in mm (grid, centred, with gaps for cutting). */
export function sheetLayout(photo: { w: number; h: number }, sheet: { w: number; h: number }, gap = 3, margin = 5): { cols: number; rows: number; spots: { x: number; y: number }[]; rotated: boolean } {
  const fit = (pw: number, ph: number) => {
    const cols = Math.max(0, Math.floor((sheet.w - 2 * margin + gap) / (pw + gap)));
    const rows = Math.max(0, Math.floor((sheet.h - 2 * margin + gap) / (ph + gap)));
    return { cols, rows, n: cols * rows };
  };
  const a = fit(photo.w, photo.h);
  const cols = a.cols, rows = a.rows;
  const usedW = cols * photo.w + Math.max(0, cols - 1) * gap;
  const usedH = rows * photo.h + Math.max(0, rows - 1) * gap;
  const x0 = (sheet.w - usedW) / 2, y0 = (sheet.h - usedH) / 2;
  const spots: { x: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) spots.push({ x: x0 + c * (photo.w + gap), y: y0 + r * (photo.h + gap) });
  return { cols, rows, spots, rotated: false };
}

/**
 * Where to draw the cut-out subject inside the photo so the head has the
 * right height: subject box (0–1 units of the picture) → scale and offset.
 * Assumes the head is the top ~58% of the subject box width (a head-and-
 * shoulders portrait); the user fine-tunes with zoom and position.
 */
export function autoFit(subject: { x: number; y: number; w: number; h: number }, img: { w: number; h: number }, spec: PhotoSpec, outW: number, outH: number) {
  const headMm = (spec.head[0] + spec.head[1]) / 2;
  const headPx = (headMm / spec.h) * outH;
  const subjW = subject.w * img.w;
  const estHead = subjW * 0.62; // head height ≈ 62% of head-and-shoulders width
  const scale = headPx / Math.max(1, estHead);
  const crownY = outH * 0.1; // ~10% space above the head
  const cx = (subject.x + subject.w / 2) * img.w;
  return { scale, dx: outW / 2 - cx * scale, dy: crownY - subject.y * img.h * scale };
}
