// ---------------------------------------------------------------------
// lib/editor/pdfFonts.ts
// Embeds the actual Google Font a text object uses into a jsPDF document,
// instead of the old behavior of collapsing every font family down to
// whichever of jsPDF's three built-in fonts (helvetica/times/courier)
// looked closest by name. jsPDF ships those three and nothing else — any
// other family has to be registered with real glyph data via addFont(),
// or the exported PDF silently shows the wrong typeface.
//
// The TTF bytes come from /api/font-file, a same-origin proxy in front
// of Google Fonts (see that route for why it has to be server-side).
// ---------------------------------------------------------------------

import { googleFontByName } from './googleFonts';

export interface RegisteredPdfFont {
  // The name jsPDF knows this font by — always registered under all four
  // style slots ('normal' | 'bold' | 'italic' | 'bolditalic') so
  // pdf.setFont(name, anyOfThose) never fails to resolve, even though a
  // family without a real bold/italic cut reuses its regular glyph data
  // for those slots. That's still a correct typeface, which is the part
  // that was actually broken — a faked weight/slant is a much smaller gap.
  name: string;
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

async function fetchFontBase64(family: string, weight: 400 | 700): Promise<string | null> {
  try {
    const res = await fetch(`/api/font-file?family=${encodeURIComponent(family)}&weight=${weight}`);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    return arrayBufferToBase64(buf);
  } catch {
    return null;
  }
}

// One export call may render many objects using the same font — cache by
// family so each is only fetched and registered with jsPDF once.
type FontCache = Map<string, RegisteredPdfFont | null>;

// Which families already have their bold cut registered, per document.
const boldLoaded = new WeakMap<object, Set<string>>();

export function createPdfFontCache(): FontCache {
  return new Map();
}

// Registers `family` with the given jsPDF document if it's one of our
// curated Google Fonts, fetching bold glyphs too when the design actually
// uses bold text for it and the family ships a real bold cut. Returns
// null for anything else (system fonts, unrecognized names), so the
// caller falls back to the old family-name approximation.
export async function ensurePdfFont(
  pdf: any,
  cache: FontCache,
  family: string | undefined,
  needsBold: boolean
): Promise<RegisteredPdfFont | null> {
  const key = family || '';
  // A family first used without bold only had its regular cut loaded:
  // load the bold cut the first time bold text needs it.
  const hit = cache.get(key);
  if (hit !== undefined && (!needsBold || !hit || boldLoaded.has(pdf) && boldLoaded.get(pdf)!.has(key))) return hit;
  if (hit && needsBold) {
    const def0 = googleFontByName(key);
    if (def0 && def0.weights.includes(700)) {
      const b64 = await fetchFontBase64(def0.googleFamily || def0.family, 700);
      if (b64) {
        const vfs = `${def0.family.replace(/\s+/g, '-')}-Bold.ttf`;
        pdf.addFileToVFS(vfs, b64);
        pdf.addFont(vfs, hit.name, 'bold');
        pdf.addFont(vfs, hit.name, 'bolditalic');
      }
    }
    if (!boldLoaded.has(pdf)) boldLoaded.set(pdf, new Set());
    boldLoaded.get(pdf)!.add(key);
    return hit;
  }

  const def = googleFontByName(key);
  if (!def) {
    cache.set(key, null);
    return null;
  }

  // Fetch by the real Google Fonts family (an alias like Arial resolves
  // to its replacement, e.g. Arimo) but register/name it in the PDF as
  // the display family, so pdf.setFont(obj.fontFamily, style) still works
  // unchanged regardless of whether this entry is aliased.
  const sourceFamily = def.googleFamily || def.family;
  const regularB64 = await fetchFontBase64(sourceFamily, 400);
  if (!regularB64) {
    cache.set(key, null);
    return null;
  }

  const canBold = needsBold && def.weights.includes(700);
  const boldB64 = canBold ? await fetchFontBase64(sourceFamily, 700) : null;

  const vfsName = `${def.family.replace(/\s+/g, '-')}.ttf`;
  const boldVfsName = boldB64 ? `${def.family.replace(/\s+/g, '-')}-Bold.ttf` : vfsName;
  const pdfName = def.family;

  pdf.addFileToVFS(vfsName, regularB64);
  pdf.addFont(vfsName, pdfName, 'normal');
  pdf.addFont(vfsName, pdfName, 'italic');

  if (boldB64) {
    pdf.addFileToVFS(boldVfsName, boldB64);
    pdf.addFont(boldVfsName, pdfName, 'bold');
    pdf.addFont(boldVfsName, pdfName, 'bolditalic');
  } else {
    // No real bold cut available — reuse the regular glyphs so
    // setFont(name, 'bold') still resolves to the *correct family*
    // rather than falling back to a generic default.
    pdf.addFont(vfsName, pdfName, 'bold');
    pdf.addFont(vfsName, pdfName, 'bolditalic');
  }

  if (canBold) {
    if (!boldLoaded.has(pdf)) boldLoaded.set(pdf, new Set());
    boldLoaded.get(pdf)!.add(key);
  }
  const result: RegisteredPdfFont = { name: pdfName };
  cache.set(key, result);
  return result;
}
