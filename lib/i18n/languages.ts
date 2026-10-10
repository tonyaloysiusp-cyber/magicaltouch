// Languages a design can be translated into, with a font that has the
// script's letters (null = keep the design's own fonts: Latin, Cyrillic
// and Greek are covered by most of them).

export interface TranslateLang {
  code: string; // Google Translate code
  name: string; // English name
  native: string; // name in the language itself
  font: string | null;
  rtl?: boolean;
}

export const LANGUAGES: TranslateLang[] = [
  { code: 'en', name: 'English', native: 'English', font: null },
  { code: 'ar', name: 'Arabic', native: 'العربية', font: 'Cairo', rtl: true },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी', font: 'Hind' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം', font: 'Noto Sans Malayalam' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்', font: 'Noto Sans Tamil' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు', font: 'Noto Sans Telugu' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ', font: 'Noto Sans Kannada' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা', font: 'Hind Siliguri' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી', font: 'Noto Sans Gujarati' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ', font: 'Noto Sans Gurmukhi' },
  { code: 'mr', name: 'Marathi', native: 'मराठी', font: 'Hind' },
  { code: 'ur', name: 'Urdu', native: 'اردو', font: 'Noto Nastaliq Urdu', rtl: true },
  { code: 'si', name: 'Sinhala', native: 'සිංහල', font: 'Noto Sans Sinhala' },
  { code: 'ne', name: 'Nepali', native: 'नेपाली', font: 'Hind' },
  { code: 'fa', name: 'Persian', native: 'فارسی', font: 'Vazirmatn', rtl: true },
  { code: 'he', name: 'Hebrew', native: 'עברית', font: 'Heebo', rtl: true },
  { code: 'fr', name: 'French', native: 'Français', font: null },
  { code: 'es', name: 'Spanish', native: 'Español', font: null },
  { code: 'de', name: 'German', native: 'Deutsch', font: null },
  { code: 'it', name: 'Italian', native: 'Italiano', font: null },
  { code: 'pt', name: 'Portuguese', native: 'Português', font: null },
  { code: 'nl', name: 'Dutch', native: 'Nederlands', font: null },
  { code: 'tr', name: 'Turkish', native: 'Türkçe', font: null },
  { code: 'ru', name: 'Russian', native: 'Русский', font: null },
  { code: 'uk', name: 'Ukrainian', native: 'Українська', font: null },
  { code: 'pl', name: 'Polish', native: 'Polski', font: null },
  { code: 'el', name: 'Greek', native: 'Ελληνικά', font: null },
  { code: 'id', name: 'Indonesian', native: 'Bahasa Indonesia', font: null },
  { code: 'ms', name: 'Malay', native: 'Bahasa Melayu', font: null },
  { code: 'tl', name: 'Filipino', native: 'Filipino', font: null },
  { code: 'vi', name: 'Vietnamese', native: 'Tiếng Việt', font: null },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', font: null },
  { code: 'th', name: 'Thai', native: 'ไทย', font: 'Noto Sans Thai' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文', font: 'Noto Sans SC' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', native: '繁體中文', font: 'Noto Sans TC' },
  { code: 'ja', name: 'Japanese', native: '日本語', font: 'Noto Sans JP' },
  { code: 'ko', name: 'Korean', native: '한국어', font: 'Noto Sans KR' },
];

export const langByCode = (code: string) => LANGUAGES.find((l) => l.code === code);

/** Sends texts to /api/translate in chunks; returns them in the same order. */
export async function translateTexts(texts: string[], target: string): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < texts.length; i += 40) {
    const chunk = texts.slice(i, i + 40);
    const res = await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts: chunk, target }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.error || 'Translation is not available right now.');
    const j = await res.json();
    out.push(...(j.texts as string[]));
  }
  return out;
}

// ---------------------------------------------------------------------
// Keeping the design's typography when the script changes.
//
// A design rarely uses one font: a script headline, a bold display title,
// a serif quote, sans body text. Translating should keep that variety, so
// each text gets a font for the new script in the SAME style as its own
// (script → a calligraphic/handwritten one, display → a heavy poster one,
// serif → serif, sans → sans). Weight and italic are kept on the text, and
// every font below has the weights listed in lib/editor/googleFonts.ts.
// ---------------------------------------------------------------------

export type FontStyleKind = 'sans' | 'serif' | 'display' | 'script';
type StyleSet = Record<FontStyleKind, string>;

const ARABIC: StyleSet = { sans: 'Cairo', serif: 'Amiri', display: 'Lalezar', script: 'Aref Ruqaa' };
const DEVANAGARI: StyleSet = { sans: 'Mukta', serif: 'Noto Serif Devanagari', display: 'Rozha One', script: 'Kalam' };

export const SCRIPT_FONTS: Record<string, StyleSet> = {
  ar: ARABIC,
  fa: { sans: 'Vazirmatn', serif: 'Noto Naskh Arabic', display: 'Lalezar', script: 'Noto Nastaliq Urdu' },
  ur: { sans: 'Noto Nastaliq Urdu', serif: 'Noto Naskh Arabic', display: 'Noto Nastaliq Urdu', script: 'Noto Nastaliq Urdu' },
  he: { sans: 'Heebo', serif: 'Frank Ruhl Libre', display: 'Secular One', script: 'Amatic SC' },
  hi: DEVANAGARI,
  mr: DEVANAGARI,
  ne: DEVANAGARI,
  bn: { sans: 'Hind Siliguri', serif: 'Noto Serif Bengali', display: 'Galada', script: 'Atma' },
  ta: { sans: 'Noto Sans Tamil', serif: 'Noto Serif Tamil', display: 'Catamaran', script: 'Kavivanar' },
  ml: { sans: 'Noto Sans Malayalam', serif: 'Noto Serif Malayalam', display: 'Gayathri', script: 'Chilanka' },
  te: { sans: 'Noto Sans Telugu', serif: 'Noto Serif Telugu', display: 'Ramaraja', script: 'Ponnala' },
  kn: { sans: 'Noto Sans Kannada', serif: 'Noto Serif Kannada', display: 'Baloo Tamma 2', script: 'Akaya Kanadaka' },
  gu: { sans: 'Noto Sans Gujarati', serif: 'Noto Serif Gujarati', display: 'Baloo Bhai 2', script: 'Farsan' },
  pa: { sans: 'Noto Sans Gurmukhi', serif: 'Noto Serif Gurmukhi', display: 'Baloo Paaji 2', script: 'Baloo Paaji 2' },
  si: { sans: 'Noto Sans Sinhala', serif: 'Noto Serif Sinhala', display: 'Yaldevi', script: 'Noto Serif Sinhala' },
  th: { sans: 'Noto Sans Thai', serif: 'Noto Serif Thai', display: 'Kanit', script: 'Charm' },
  'zh-CN': { sans: 'Noto Sans SC', serif: 'Noto Serif SC', display: 'ZCOOL QingKe HuangYou', script: 'Ma Shan Zheng' },
  'zh-TW': { sans: 'Noto Sans TC', serif: 'Noto Serif TC', display: 'Noto Sans TC', script: 'LXGW WenKai TC' },
  ja: { sans: 'Noto Sans JP', serif: 'Noto Serif JP', display: 'Dela Gothic One', script: 'Yuji Syuku' },
  ko: { sans: 'Noto Sans KR', serif: 'Noto Serif KR', display: 'Black Han Sans', script: 'Nanum Pen Script' },
  // Alphabets most Latin fonts don't cover: only used when the design's
  // own font is missing the letters (checked in the browser).
  ru: { sans: 'Montserrat', serif: 'Lora', display: 'Oswald', script: 'Caveat' },
  uk: { sans: 'Montserrat', serif: 'Lora', display: 'Oswald', script: 'Caveat' },
  el: { sans: 'Noto Sans', serif: 'Noto Serif', display: 'Comfortaa', script: 'Noto Serif' },
  vi: { sans: 'Be Vietnam Pro', serif: 'Lora', display: 'Oswald', script: 'Dancing Script' },
};

// Fonts that already have a script's letters, so the design's own choice
// can simply stay.
const COVERS: Record<string, string[]> = {
  arab: ['Cairo', 'Tajawal', 'Vazirmatn', 'Amiri', 'Noto Naskh Arabic', 'Lalezar', 'Reem Kufi', 'Aref Ruqaa', 'Noto Nastaliq Urdu'],
  hebr: ['Heebo', 'Rubik', 'Frank Ruhl Libre', 'Secular One', 'Amatic SC'],
  deva: ['Poppins', 'Hind', 'Mukta', 'Baloo 2', 'Kalam', 'Noto Serif Devanagari', 'Rozha One'],
  thai: ['Prompt', 'Sarabun', 'Kanit', 'Charm', 'Noto Sans Thai', 'Noto Serif Thai'],
};
const SCRIPT_OF: Record<string, string> = { ar: 'arab', fa: 'arab', ur: 'arab', he: 'hebr', hi: 'deva', mr: 'deva', ne: 'deva', th: 'thai' };

/** Alphabets checked against the design's own font before swapping. */
export const CHECK_COVERAGE = new Set(['ru', 'uk', 'el', 'vi']);

/** The style family of a font, from the editor's font list category. */
export function fontStyleKind(category: string | undefined, family: string, googleFamily?: string): FontStyleKind {
  const g = googleFamily || family;
  if (category === 'Serif' || /^(Tinos|Gelasio)$/.test(g) || /Serif|Garamond|Playfair|Lora|Merriweather|Amiri|Naskh|Frank Ruhl/i.test(family)) return 'serif';
  if (category === 'Script' || /Script|Ruqaa|Nastaliq|Pen |Kalam|Caveat|Charm/i.test(family)) return 'script';
  if (category === 'Display') return 'display';
  return 'sans';
}

/** A font for `code` in the same style as `original`, or null to keep it. */
export function pickFontFor(code: string, original: string, kind: FontStyleKind, weight: number): string | null {
  const set = SCRIPT_FONTS[code];
  if (!set) return null;
  const script = SCRIPT_OF[code];
  if (script && COVERS[script]?.includes(original)) return null;
  void weight; // kept on the text itself; every sans/serif pick has the full range
  return set[kind];
}
