// Passport, visa, ID and exam photo specifications by country and purpose,
// plus print-sheet layout and the file-size targeting used for online
// uploads (pure functions — no browser APIs here).
//
// Print sizes are in mm with the chin-to-crown head height range in mm.
// `digital` describes the file an online portal accepts (pixels, KB,
// format). Where an official page was checked, `source` links to it.
// Rules change — the tool always tells people to check the official page.

export type Purpose = 'passport' | 'visa' | 'id' | 'exam' | 'other';

export interface DigitalSpec {
  w: number; h: number;            // pixels we produce
  minW?: number; minH?: number;    // the portal's accepted range (for the checklist)
  maxW?: number; maxH?: number;
  minKB?: number; maxKB?: number;
  format: 'jpeg' | 'png';
  dpi?: number;                    // written into the file (default 300)
  square?: boolean;
}

export interface PhotoSpec {
  id: string; country: string; purpose: Purpose; label: string;
  region: string;                  // kept for older callers (= country)
  w: number; h: number; head: [number, number]; bg: string; note: string;
  digital?: DigitalSpec; source?: string;
}

export const PURPOSES: { id: Purpose; label: string }[] = [
  { id: 'passport', label: 'Passport' }, { id: 'visa', label: 'Visa / residence' }, { id: 'id', label: 'ID card / licence' },
  { id: 'exam', label: 'Exam & job forms' }, { id: 'other', label: 'Other' },
];

const S = (o: Omit<PhotoSpec, 'region' | 'label'> & { label?: string }): PhotoSpec => ({ ...o, region: o.country, label: o.label || `${o.country} ${PURPOSES.find((p) => p.id === o.purpose)!.label.toLowerCase()} · ${o.w} × ${o.h} mm` });
const WHITE = '#FFFFFF', LIGHT = '#F2F2F2';
const ICAO: [number, number] = [32, 36]; // 35 × 45 mm photos: face 70–80% of height

export const PHOTO_SPECS: PhotoSpec[] = [
  // India
  S({ id: 'in-35x45', country: 'India', purpose: 'other', label: 'India passport size photo (forms, bank KYC) · 35 × 45 mm', w: 35, h: 45, head: [25, 32], bg: WHITE, note: 'The common “passport size” for Indian forms, admissions and bank KYC.' }),
  S({ id: 'in-passport', country: 'India', purpose: 'passport', label: 'Indian passport (applying abroad / by post) · 51 × 51 mm', w: 51, h: 51, head: [25, 35], bg: WHITE, note: 'Square 2 × 2 inch, plain white background. In India, Passport Seva Kendras take your photo at the appointment.' }),
  S({ id: 'in-evisa', country: 'India', purpose: 'visa', label: 'India e-Visa (upload) · square JPEG 10–300 KB', w: 51, h: 51, head: [25, 35], bg: WHITE, note: 'Square JPEG between 350 × 350 and 1000 × 1000 pixels, 10 KB to 300 KB, plain white background.', digital: { w: 600, h: 600, minW: 350, minH: 350, maxW: 1000, maxH: 1000, minKB: 10, maxKB: 300, format: 'jpeg', square: true }, source: 'https://indianvisaonline.gov.in/visa/VSS_IMAGE.pdf' }),
  S({ id: 'in-oci', country: 'India', purpose: 'visa', label: 'OCI card (upload) · square JPEG up to 200 KB', w: 51, h: 51, head: [33, 41], bg: '#F2F2F2', note: 'Square JPEG 200–900 pixels, up to 200 KB, plain light background (not white), face about 80% of the photo.', digital: { w: 600, h: 600, minW: 200, minH: 200, maxW: 900, maxH: 900, maxKB: 200, format: 'jpeg', square: true }, source: 'https://cgiedinburgh.gov.in/content/OCI-FAQ-1.pdf' }),
  S({ id: 'in-pan', country: 'India', purpose: 'id', label: 'PAN card (Form 49A) · 25 × 35 mm', w: 25, h: 35, head: [18, 24], bg: WHITE, note: 'Printed photo for the PAN form. For online applications, follow the size shown on the NSDL / UTIITSL upload page.' }),
  S({ id: 'in-upsc', country: 'India', purpose: 'exam', label: 'UPSC exams (upload) · square JPEG 20–300 KB', w: 35, h: 35, head: [20, 26], bg: WHITE, note: 'Square JPG 350–1000 pixels, 20–300 KB, taken within the last 10 days, name and date printed below if the notice asks for it.', digital: { w: 550, h: 550, minW: 350, minH: 350, maxW: 1000, maxH: 1000, minKB: 20, maxKB: 300, format: 'jpeg', square: true } }),
  S({ id: 'in-ssc', country: 'India', purpose: 'exam', label: 'SSC exams (upload) · JPEG 20–50 KB', w: 35, h: 45, head: [25, 32], bg: WHITE, note: 'Where SSC asks for an uploaded photo: 3.5 × 4.5 cm, JPEG 20–50 KB, no cap or glasses. Recent SSC forms take a live photo instead.', digital: { w: 413, h: 531, minKB: 20, maxKB: 50, format: 'jpeg' } }),
  S({ id: 'in-ibps', country: 'India', purpose: 'exam', label: 'IBPS / SBI / RBI bank exams · 200 × 230 px, 20–50 KB', w: 35, h: 45, head: [25, 32], bg: WHITE, note: 'JPEG 200 × 230 pixels, 20–50 KB, light background.', digital: { w: 200, h: 230, minKB: 20, maxKB: 50, format: 'jpeg', dpi: 200 } }),
  S({ id: 'in-neet', country: 'India', purpose: 'exam', label: 'NEET / JEE (NTA) passport photo · JPEG 10–200 KB', w: 35, h: 45, head: [25, 32], bg: WHITE, note: 'Passport-size JPG, 10–200 KB, white background, 80% face visible, ears visible. Check the year’s NTA notice for name/date rules.', digital: { w: 413, h: 531, minKB: 10, maxKB: 200, format: 'jpeg' } }),
  S({ id: 'stamp', country: 'India', purpose: 'other', label: 'Stamp size · 20 × 25 mm', w: 20, h: 25, head: [14, 18], bg: WHITE, note: 'Small photo for admit cards and forms.' }),

  // United States
  S({ id: 'us', country: 'United States', purpose: 'passport', label: 'US passport (printed) · 2 × 2 in', w: 51, h: 51, head: [25, 35], bg: WHITE, note: 'White or off-white background; head 1 to 1⅜ inches, eyes 1⅛ to 1⅜ inches from the bottom.' }),
  S({ id: 'us-passport-online', country: 'United States', purpose: 'passport', label: 'US passport online renewal (upload) · 600–1200 px square', w: 51, h: 51, head: [25, 35], bg: WHITE, note: 'Square JPEG, at least 600 × 600 pixels, 54 KB to 10 MB, white background, unedited.', digital: { w: 1200, h: 1200, minW: 600, minH: 600, maxW: 1200, maxH: 1200, minKB: 54, maxKB: 10240, format: 'jpeg', square: true }, source: 'https://travel.state.gov/content/travel/en/passports/how-apply/online-renewal-photo.html' }),
  S({ id: 'us-visa', country: 'United States', purpose: 'visa', label: 'US visa DS-160 (upload) · 600 × 600 px, max 240 KB', w: 51, h: 51, head: [26, 35], bg: WHITE, note: 'Square JPEG 600–1200 pixels, 240 KB or less, sRGB, head 50–69% of the image height.', digital: { w: 600, h: 600, minW: 600, minH: 600, maxW: 1200, maxH: 1200, maxKB: 240, format: 'jpeg', square: true }, source: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html' }),
  S({ id: 'us-dv', country: 'United States', purpose: 'visa', label: 'US Green Card lottery (DV) · exactly 600 × 600 px', w: 51, h: 51, head: [26, 35], bg: WHITE, note: 'Exactly 600 × 600 pixel JPEG, 240 KB or less, head 50–69% of the height.', digital: { w: 600, h: 600, minW: 600, minH: 600, maxW: 600, maxH: 600, maxKB: 240, format: 'jpeg', square: true } }),

  // United Kingdom
  S({ id: 'uk', country: 'United Kingdom', purpose: 'passport', label: 'UK passport (printed) · 35 × 45 mm', w: 35, h: 45, head: [29, 34], bg: LIGHT, note: 'Plain light grey or cream background, neutral expression, mouth closed.' }),
  S({ id: 'uk-online', country: 'United Kingdom', purpose: 'passport', label: 'UK passport online (upload) · at least 600 × 750 px', w: 35, h: 45, head: [29, 34], bg: LIGHT, note: 'At least 600 × 750 pixels, 50 KB to 10 MB, colour, plain light background, taken in the last month. Show head, shoulders and upper body.', digital: { w: 900, h: 1157, minW: 600, minH: 750, minKB: 50, maxKB: 10240, format: 'jpeg' }, source: 'https://www.gov.uk/photos-for-passports/rules-for-printed-photos' }),
  S({ id: 'uk-visa', country: 'United Kingdom', purpose: 'visa', label: 'UK visa / BRP · 35 × 45 mm', w: 35, h: 45, head: [29, 34], bg: LIGHT, note: 'Same rules as the UK passport photo.' }),

  // Europe
  S({ id: 'schengen', country: 'Schengen area', purpose: 'visa', label: 'Schengen visa · 35 × 45 mm', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'Light background; face 70–80% of the photo height (ICAO standard).' }),
  S({ id: 'de-passport', country: 'Germany', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'Biometric photo, neutral expression, light grey background preferred.' }),
  S({ id: 'fr-passport', country: 'France', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'Light grey or light blue background (not white).' }),
  S({ id: 'ie-passport', country: 'Ireland', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'Plain light background, face 32–36 mm.' }),
  S({ id: 'nl-passport', country: 'Netherlands', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'Light grey or light blue background.' }),
  S({ id: 'it-passport', country: 'Italy', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'Plain light background.' }),
  S({ id: 'es-passport', country: 'Spain', purpose: 'passport', w: 32, h: 26, head: [17, 21], bg: WHITE, note: 'Spain DNI / passport photo 32 × 26 mm, white background.' }),

  // Americas
  S({ id: 'canada', country: 'Canada', purpose: 'passport', label: 'Canada passport · 50 × 70 mm', w: 50, h: 70, head: [31, 36], bg: WHITE, note: 'White or light background; face 31–36 mm.' }),
  S({ id: 'ca-ircc', country: 'Canada', purpose: 'visa', label: 'Canada visa / PR / citizenship (upload) · min 420 × 540 px', w: 35, h: 45, head: [31, 36], bg: WHITE, note: 'JPEG at least 420 × 540 pixels, up to 4 MB, plain white or light background.', digital: { w: 700, h: 900, minW: 420, minH: 540, maxKB: 4096, format: 'jpeg' }, source: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/application/application-forms-guides/citizenship-application-photograph-specifications/grant-online.html' }),
  S({ id: 'br-passport', country: 'Brazil', purpose: 'passport', w: 50, h: 70, head: [31, 36], bg: WHITE, note: 'White background.' }),
  S({ id: 'mx-passport', country: 'Mexico', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background, no glasses.' }),

  // Middle East
  S({ id: 'uae', country: 'UAE', purpose: 'visa', label: 'UAE visa / Emirates ID · 43 × 55 mm', w: 43, h: 55, head: [31, 39], bg: WHITE, note: 'White background, recent photo, no shadows. Online (ICP / GDRFA) uploads accept JPEG.' }),
  S({ id: 'sa-visa', country: 'Saudi Arabia', purpose: 'visa', label: 'Saudi visa · 40 × 60 mm', w: 40, h: 60, head: [30, 38], bg: WHITE, note: 'White background, full face, no glasses.' }),
  S({ id: 'qa-visa', country: 'Qatar', purpose: 'visa', label: 'Qatar visa · 38 × 48 mm', w: 38, h: 48, head: [28, 34], bg: WHITE, note: 'White background.' }),

  // Asia-Pacific
  S({ id: 'cn-visa', country: 'China', purpose: 'visa', label: 'China visa (online form) · 354 × 472 px, 40–120 KB', w: 33, h: 48, head: [28, 33], bg: WHITE, note: 'JPEG up to 354 × 472 pixels, 40–120 KB, white or near-white background.', digital: { w: 354, h: 472, maxW: 354, maxH: 472, minKB: 40, maxKB: 120, format: 'jpeg' }, source: 'https://www.visaforchina.cn/FLR2_EN/generalinformation/faq/283373.shtml' }),
  S({ id: 'jp-passport', country: 'Japan', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'Plain background, no shadows.' }),
  S({ id: 'kr-passport', country: 'South Korea', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background, ears visible.' }),
  S({ id: 'sg-passport', country: 'Singapore', purpose: 'passport', label: 'Singapore passport / IC (upload) · 400 × 514 px', w: 35, h: 45, head: [25, 35], bg: WHITE, note: 'Must be 400 × 514 pixels when uploaded via ICA e-Services; JPG/PNG up to 8 MB; white background.', digital: { w: 400, h: 514, minW: 400, minH: 514, maxW: 400, maxH: 514, maxKB: 8192, format: 'jpeg' }, source: 'https://ica.gov.sg/photo-guidelines' }),
  S({ id: 'my-passport', country: 'Malaysia', purpose: 'passport', w: 35, h: 50, head: [30, 36], bg: WHITE, note: 'White background, no head covering except for religious reasons.' }),
  S({ id: 'ph-passport', country: 'Philippines', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background, collared top.' }),
  S({ id: 'pk-passport', country: 'Pakistan', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
  S({ id: 'lk-passport', country: 'Sri Lanka', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
  S({ id: 'bd-passport', country: 'Bangladesh', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
  S({ id: 'np-passport', country: 'Nepal', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
  S({ id: 'au', country: 'Australia', purpose: 'passport', label: 'Australia passport · 35 × 45 mm', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'Plain white or light grey background.' }),
  S({ id: 'nz-passport', country: 'New Zealand', purpose: 'passport', label: 'New Zealand passport / visa (upload) · 900 × 1200 px', w: 35, h: 45, head: ICAO, bg: LIGHT, note: 'JPEG 900 × 1200 to 2250 × 3000 pixels (3:4), 250 KB to 10 MB, plain light background.', digital: { w: 900, h: 1200, minW: 900, minH: 1200, maxW: 2250, maxH: 3000, minKB: 250, maxKB: 10240, format: 'jpeg' } }),

  // Africa
  S({ id: 'ng-passport', country: 'Nigeria', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background, ears visible.' }),
  S({ id: 'za-passport', country: 'South Africa', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
  S({ id: 'ke-passport', country: 'Kenya', purpose: 'passport', w: 35, h: 45, head: ICAO, bg: WHITE, note: 'White background.' }),
];

export const COUNTRIES = [...new Set(PHOTO_SPECS.map((s) => s.country))];

export const SHEETS: { id: string; label: string; w: number; h: number }[] = [
  { id: '4x6', label: '4 × 6 in photo paper (102 × 152 mm)', w: 102, h: 152 },
  { id: 'a4', label: 'A4 paper (210 × 297 mm)', w: 210, h: 297 },
  { id: '5x7', label: '5 × 7 in (127 × 178 mm)', w: 127, h: 178 },
  { id: 'letter', label: 'US Letter (216 × 279 mm)', w: 216, h: 279 },
];

export const mmToPx = (mm: number, dpi = 300) => Math.round((mm / 25.4) * dpi);

/** A custom size (any form or portal not in the list). */
export function customSpec(o: { w: number; h: number; unit: 'mm' | 'px'; dpi: number; minKB?: number; maxKB?: number; bg: string }): PhotoSpec {
  const wmm = o.unit === 'mm' ? o.w : (o.w / o.dpi) * 25.4, hmm = o.unit === 'mm' ? o.h : (o.h / o.dpi) * 25.4;
  const digital: DigitalSpec = { w: o.unit === 'px' ? Math.round(o.w) : mmToPx(o.w, o.dpi), h: o.unit === 'px' ? Math.round(o.h) : mmToPx(o.h, o.dpi), minKB: o.minKB || undefined, maxKB: o.maxKB || undefined, format: 'jpeg', dpi: o.dpi };
  const r = Math.round(hmm * 0.7 * 10) / 10;
  return { id: 'custom', country: 'Custom', region: 'Custom', purpose: 'other', label: 'Custom size', w: Math.round(wmm * 10) / 10, h: Math.round(hmm * 10) / 10, head: [Math.round(r * 0.9 * 10) / 10, r], bg: o.bg, note: 'Your own size — set it to match the form you are filling in.', digital };
}

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
 * `head` (optional, 0–1 units) is the detected crown-to-chin box; without it
 * the head is estimated from the head-and-shoulders width.
 */
export function autoFit(subject: { x: number; y: number; w: number; h: number }, img: { w: number; h: number }, spec: PhotoSpec, outW: number, outH: number, head?: { top: number; chin: number; cx: number } | null) {
  const headMm = (spec.head[0] + spec.head[1]) / 2;
  const headPx = (headMm / spec.h) * outH;
  const top = head ? head.top : subject.y;
  const estHead = head ? (head.chin - head.top) * img.h : subject.w * img.w * 0.62;
  const scale = headPx / Math.max(1, estHead);
  // Space above the crown: the rest of the frame above the head is split so
  // the face sits a little above the middle (eyes ~55–65% up the photo).
  const crownY = Math.max(outH * 0.06, (outH - headPx) * 0.32);
  const cx = (head ? head.cx : subject.x + subject.w / 2) * img.w;
  return { scale, dx: outW / 2 - cx * scale, dy: crownY - top * img.h * scale };
}

/** Pixel size and DPI of the file to produce for a spec (digital rules or 300 DPI print size). */
export function outputSize(spec: PhotoSpec): { w: number; h: number; dpi: number } {
  if (spec.digital) return { w: spec.digital.w, h: spec.digital.h, dpi: spec.digital.dpi || 300 };
  return { w: mmToPx(spec.w), h: mmToPx(spec.h), dpi: 300 };
}

/**
 * Finds a JPEG quality (and, if needed, a smaller pixel size within the
 * allowed range) that lands the file inside [minKB, maxKB].
 * `encode(w, h, q)` returns the byte size for those settings.
 */
export async function fitFileSize(spec: DigitalSpec, encode: (w: number, h: number, q: number) => Promise<number>): Promise<{ w: number; h: number; q: number; bytes: number; ok: boolean }> {
  const maxB = (spec.maxKB ?? Infinity) * 1024 * 0.98, minB = (spec.minKB ?? 0) * 1024 * 1.02;
  let w = spec.w, h = spec.h;
  const minW = spec.minW ?? Math.round(spec.w * 0.6), minH = spec.minH ?? Math.round(spec.h * 0.6);
  for (let round = 0; round < 6; round++) {
    let lo = 0.4, hi = 0.97, best: { q: number; bytes: number } | null = null;
    const top = await encode(w, h, hi);
    if (top <= maxB && top >= minB) return { w, h, q: hi, bytes: top, ok: true };
    if (top < minB) {
      // Too small even at top quality: go up in size if allowed, else max quality.
      const maxW = spec.maxW ?? w * 2, maxH = spec.maxH ?? h * 2;
      const k = Math.min(maxW / w, maxH / h, 1.4);
      if (k > 1.01) { w = Math.round(w * k); h = spec.square ? w : Math.round(h * k); continue; }
      const b = await encode(w, h, 1);
      return { w, h, q: 1, bytes: b, ok: b >= minB && b <= maxB };
    }
    for (let i = 0; i < 9; i++) {
      const q = (lo + hi) / 2;
      const b = await encode(w, h, q);
      if (b <= maxB) { if (b >= minB) best = { q, bytes: b }; lo = q; } else hi = q;
    }
    if (best) return { w, h, ...best, ok: true };
    const low = await encode(w, h, 0.4);
    if (low <= maxB) return { w, h, q: 0.4, bytes: low, ok: low >= minB };
    // Still too big: shrink within the allowed range and try again.
    const nw = Math.max(minW, Math.round(w * 0.85)), nh = spec.square ? nw : Math.max(minH, Math.round(h * 0.85));
    if (nw === w && nh === h) return { w, h, q: 0.4, bytes: low, ok: false };
    w = nw; h = nh;
  }
  const b = await encode(w, h, 0.6);
  return { w, h, q: 0.6, bytes: b, ok: b <= maxB && b >= minB };
}

/** Pass/fail checks for the finished file. */
export function checkFile(spec: PhotoSpec, f: { w: number; h: number; bytes: number; format: string; dpi: number }): { label: string; ok: boolean; detail: string }[] {
  const d = spec.digital;
  const out: { label: string; ok: boolean; detail: string }[] = [];
  const kb = Math.round((f.bytes / 1024) * 10) / 10;
  if (d) {
    const wOk = (!d.minW || f.w >= d.minW) && (!d.maxW || f.w <= d.maxW), hOk = (!d.minH || f.h >= d.minH) && (!d.maxH || f.h <= d.maxH);
    out.push({ label: 'Pixel size', ok: wOk && hOk && (!d.square || f.w === f.h), detail: `${f.w} × ${f.h} px${d.minW || d.maxW ? ` (allowed ${d.minW ?? '—'}–${d.maxW ?? 'any'} × ${d.minH ?? '—'}–${d.maxH ?? 'any'})` : ''}` });
    out.push({ label: 'File size', ok: (!d.minKB || kb >= d.minKB) && (!d.maxKB || kb <= d.maxKB), detail: `${kb} KB${d.minKB || d.maxKB ? ` (allowed ${d.minKB ?? 0}–${d.maxKB ?? '∞'} KB)` : ''}` });
    out.push({ label: 'Format', ok: f.format === d.format, detail: f.format.toUpperCase() });
  } else {
    out.push({ label: 'Print size', ok: true, detail: `${spec.w} × ${spec.h} mm = ${f.w} × ${f.h} px at ${f.dpi} DPI` });
    out.push({ label: 'File size', ok: true, detail: `${kb} KB` });
  }
  out.push({ label: 'Resolution', ok: f.dpi >= 200 || !!d, detail: `${f.dpi} DPI written in the file` });
  return out;
}
