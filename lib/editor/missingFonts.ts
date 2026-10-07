// Fonts a design uses that the site doesn't offer (storage spec §23).
// Fonts are never shipped inside templates or .mtd files for licensing
// reasons, so a design made elsewhere may name a font we can't load; the
// browser then shows a substitute and the customer should know why.

import { GOOGLE_FONT_NAMES } from './googleFonts';

const known = new Set(GOOGLE_FONT_NAMES.map((f) => f.toLowerCase()));

export function missingFontsIn(canvasJson: any): string[] {
  const found = new Set<string>();
  const visit = (node: any) => {
    if (Array.isArray(node)) node.forEach(visit);
    else if (node && typeof node === 'object') {
      if (typeof node.fontFamily === 'string' && !known.has(node.fontFamily.toLowerCase())) found.add(node.fontFamily);
      for (const v of Object.values(node)) if (v && typeof v === 'object') visit(v);
    }
  };
  visit(canvasJson);
  return Array.from(found).sort();
}

export function fontRequiredMessage(fonts: string[]): string | null {
  if (!fonts.length) return null;
  const list = fonts.slice(0, 4).join(', ') + (fonts.length > 4 ? ` and ${fonts.length - 4} more` : '');
  return `Font required: ${list}. ${fonts.length === 1 ? "It isn't" : "They aren't"} available here, so a similar font is shown. Select the text and choose an available font to fix the look.`;
}
