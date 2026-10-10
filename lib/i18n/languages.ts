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
