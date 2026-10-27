// Parts of a text that must never be translated: web and e-mail addresses,
// @handles and #tags, phone numbers, prices and other numbers, and any
// words the person asked to keep (a brand name, a person's name).
// A text is split into pieces; only the plain-language pieces are sent to
// the translator and the kept pieces are put back exactly as they were.

export interface Piece { text: string; keep: boolean }

const AUTO = [
  /(?:https?:\/\/|www\.)\S+/gi,
  /[\w.+-]+@[\w-]+\.[\w.-]+/g,
  /[@#][\p{L}\p{N}_]+/gu,
  /\+?\d[\d\s().-]{6,}\d/g, // phone numbers
  /[$€£₹¥]?\s?\d[\d,.:/%-]*\s?(?:AED|USD|INR|SAR|QAR|KWD|OMR|BHD|EUR|GBP|%|am|pm|AM|PM)?/g,
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function splitProtected(text: string, keepWords: string[] = []): Piece[] {
  const ranges: [number, number][] = [];
  const add = (re: RegExp) => {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (!m[0].trim()) { re.lastIndex++; continue; }
      ranges.push([m.index, m.index + m[0].length]);
    }
  };
  AUTO.forEach(add);
  keepWords.map((w) => w.trim()).filter((w) => w.length > 1).forEach((w) => add(new RegExp(`(?<![\\p{L}\\p{N}])${esc(w)}(?![\\p{L}\\p{N}])`, 'giu')));
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  ranges.forEach((r) => {
    const last = merged[merged.length - 1];
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push([...r]);
  });
  const out: Piece[] = [];
  let at = 0;
  merged.forEach(([s, e]) => {
    if (s > at) out.push({ text: text.slice(at, s), keep: false });
    out.push({ text: text.slice(s, e), keep: true });
    at = e;
  });
  if (at < text.length) out.push({ text: text.slice(at), keep: false });
  return out.length ? out : [{ text, keep: false }];
}
