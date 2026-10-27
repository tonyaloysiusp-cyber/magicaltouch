// Fonts by language, for the font picker's language filter. Every
// language has at least 6–8 styles: plain (sans), book (serif), bold
// display and handwritten / calligraphic ones. All are free Google Fonts.

export interface FontLanguage { code: string; label: string; sample: string; fonts: string[] }

export const FONT_LANGUAGES: FontLanguage[] = [
  { code: 'ta', label: 'Tamil · தமிழ்', sample: 'வணக்கம்', fonts: ['Noto Sans Tamil', 'Noto Serif Tamil', 'Catamaran', 'Hind Madurai', 'Mukta Malar', 'Baloo Thambi 2', 'Arima', 'Kavivanar', 'Coiny', 'Pavanam', 'Meera Inimai', 'Anek Tamil', 'Tiro Tamil'] },
  { code: 'ml', label: 'Malayalam · മലയാളം', sample: 'നമസ്കാരം', fonts: ['Noto Sans Malayalam', 'Noto Serif Malayalam', 'Manjari', 'Gayathri', 'Chilanka', 'Baloo Chettan 2', 'Arima', 'Anek Malayalam'] },
  { code: 'hi', label: 'Hindi / Marathi · हिन्दी', sample: 'नमस्ते', fonts: ['Mukta', 'Hind', 'Poppins', 'Noto Serif Devanagari', 'Rozha One', 'Kalam', 'Amita', 'Yatra One', 'Khand', 'Martel', 'Laila', 'Eczar', 'Teko', 'Baloo 2', 'Tiro Devanagari Hindi'] },
  { code: 'te', label: 'Telugu · తెలుగు', sample: 'నమస్కారం', fonts: ['Noto Sans Telugu', 'Noto Serif Telugu', 'Hind Guntur', 'Mandali', 'Mallanna', 'Baloo Tammudu 2', 'Ramaraja', 'Ponnala', 'Gurajada', 'Dhurjati', 'Timmana', 'Lakki Reddy'] },
  { code: 'kn', label: 'Kannada · ಕನ್ನಡ', sample: 'ನಮಸ್ಕಾರ', fonts: ['Noto Sans Kannada', 'Noto Serif Kannada', 'Baloo Tamma 2', 'Hubballi', 'Akaya Kanadaka', 'Anek Kannada', 'Tiro Kannada'] },
  { code: 'bn', label: 'Bengali · বাংলা', sample: 'নমস্কার', fonts: ['Hind Siliguri', 'Noto Serif Bengali', 'Baloo Da 2', 'Galada', 'Atma', 'Mina', 'Anek Bangla', 'Tiro Bangla'] },
  { code: 'gu', label: 'Gujarati · ગુજરાતી', sample: 'નમસ્તે', fonts: ['Noto Sans Gujarati', 'Noto Serif Gujarati', 'Hind Vadodara', 'Baloo Bhai 2', 'Farsan', 'Mogra', 'Shrikhand', 'Kumar One', 'Rasa', 'Anek Gujarati'] },
  { code: 'pa', label: 'Punjabi · ਪੰਜਾਬੀ', sample: 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', fonts: ['Noto Sans Gurmukhi', 'Noto Serif Gurmukhi', 'Mukta Mahee', 'Baloo Paaji 2', 'Anek Gurmukhi', 'Tiro Gurmukhi'] },
  { code: 'ar', label: 'Arabic · العربية', sample: 'مرحبا', fonts: ['Cairo', 'Tajawal', 'Almarai', 'Noto Kufi Arabic', 'Changa', 'El Messiri', 'Amiri', 'Noto Naskh Arabic', 'Markazi Text', 'Scheherazade New', 'Reem Kufi', 'Lalezar', 'Lemonada', 'Marhey', 'Rakkas', 'Jomhuria', 'Aref Ruqaa', 'Mirza', 'Katibeh', 'Vazirmatn'] },
  { code: 'ur', label: 'Urdu / Persian · اردو', sample: 'سلام', fonts: ['Noto Nastaliq Urdu', 'Gulzar', 'Vazirmatn', 'Noto Naskh Arabic', 'Lalezar', 'Mirza', 'Amiri'] },
  { code: 'si', label: 'Sinhala · සිංහල', sample: 'ආයුබෝවන්', fonts: ['Noto Sans Sinhala', 'Noto Serif Sinhala', 'Yaldevi', 'Abhaya Libre', 'Gemunu Libre'] },
  { code: 'th', label: 'Thai · ไทย', sample: 'สวัสดี', fonts: ['Noto Sans Thai', 'Noto Serif Thai', 'Kanit', 'Prompt', 'Sarabun', 'Charm', 'Mitr', 'Itim', 'Sriracha', 'Chonburi'] },
  { code: 'he', label: 'Hebrew · עברית', sample: 'שלום', fonts: ['Heebo', 'Rubik', 'Frank Ruhl Libre', 'Secular One', 'Amatic SC', 'Suez One', 'Varela Round', 'Assistant'] },
  { code: 'zh', label: 'Chinese · 中文', sample: '你好', fonts: ['Noto Sans SC', 'Noto Serif SC', 'ZCOOL QingKe HuangYou', 'Ma Shan Zheng', 'ZCOOL KuaiLe', 'Zhi Mang Xing', 'Long Cang', 'Noto Sans TC', 'Noto Serif TC', 'LXGW WenKai TC'] },
  { code: 'ja', label: 'Japanese · 日本語', sample: 'こんにちは', fonts: ['Noto Sans JP', 'Noto Serif JP', 'Dela Gothic One', 'Yuji Syuku', 'Zen Maru Gothic', 'Kosugi Maru', 'Klee One', 'Yusei Magic', 'Hachi Maru Pop'] },
  { code: 'ko', label: 'Korean · 한국어', sample: '안녕하세요', fonts: ['Noto Sans KR', 'Noto Serif KR', 'Black Han Sans', 'Nanum Pen Script', 'Nanum Myeongjo', 'Do Hyeon', 'Gaegu', 'Jua', 'Gamja Flower'] },
];

/** Fonts to add to the catalogue for these languages (beyond what it has). */
export const EXTRA_WORLD_FONTS: { family: string; weights: number[] }[] = [
  // Tamil
  { family: 'Hind Madurai', weights: [300, 400, 500, 600, 700] },
  { family: 'Mukta Malar', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Baloo Thambi 2', weights: [400, 500, 600, 700, 800] },
  { family: 'Arima', weights: [400, 700] },
  { family: 'Coiny', weights: [400] },
  { family: 'Pavanam', weights: [400] },
  { family: 'Meera Inimai', weights: [400] },
  { family: 'Anek Tamil', weights: [400, 700] },
  { family: 'Tiro Tamil', weights: [400] },
  // Malayalam
  { family: 'Manjari', weights: [100, 400, 700] },
  { family: 'Baloo Chettan 2', weights: [400, 500, 600, 700, 800] },
  { family: 'Anek Malayalam', weights: [400, 700] },
  // Devanagari
  { family: 'Amita', weights: [400, 700] },
  { family: 'Yatra One', weights: [400] },
  { family: 'Khand', weights: [300, 400, 500, 600, 700] },
  { family: 'Martel', weights: [200, 300, 400, 600, 700, 800, 900] },
  { family: 'Laila', weights: [300, 400, 500, 600, 700] },
  { family: 'Eczar', weights: [400, 500, 600, 700, 800] },
  { family: 'Teko', weights: [300, 400, 500, 600, 700] },
  { family: 'Tiro Devanagari Hindi', weights: [400] },
  // Telugu
  { family: 'Hind Guntur', weights: [300, 400, 500, 600, 700] },
  { family: 'Mandali', weights: [400] },
  { family: 'Mallanna', weights: [400] },
  { family: 'Baloo Tammudu 2', weights: [400, 500, 600, 700, 800] },
  { family: 'Gurajada', weights: [400] },
  { family: 'Dhurjati', weights: [400] },
  { family: 'Timmana', weights: [400] },
  { family: 'Lakki Reddy', weights: [400] },
  // Kannada
  { family: 'Hubballi', weights: [400] },
  { family: 'Anek Kannada', weights: [400, 700] },
  { family: 'Tiro Kannada', weights: [400] },
  // Bengali
  { family: 'Baloo Da 2', weights: [400, 500, 600, 700, 800] },
  { family: 'Mina', weights: [400, 700] },
  { family: 'Anek Bangla', weights: [400, 700] },
  { family: 'Tiro Bangla', weights: [400] },
  // Gujarati
  { family: 'Hind Vadodara', weights: [300, 400, 500, 600, 700] },
  { family: 'Mogra', weights: [400] },
  { family: 'Shrikhand', weights: [400] },
  { family: 'Kumar One', weights: [400] },
  { family: 'Rasa', weights: [300, 400, 500, 600, 700] },
  { family: 'Anek Gujarati', weights: [400, 700] },
  // Gurmukhi
  { family: 'Mukta Mahee', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'Anek Gurmukhi', weights: [400, 700] },
  { family: 'Tiro Gurmukhi', weights: [400] },
  // Arabic / Urdu
  { family: 'Almarai', weights: [300, 400, 700, 800] },
  { family: 'Noto Kufi Arabic', weights: [100, 200, 300, 400, 500, 600, 700, 800, 900] },
  { family: 'Changa', weights: [200, 300, 400, 500, 600, 700, 800] },
  { family: 'El Messiri', weights: [400, 500, 600, 700] },
  { family: 'Markazi Text', weights: [400, 500, 600, 700] },
  { family: 'Scheherazade New', weights: [400, 700] },
  { family: 'Lemonada', weights: [300, 400, 500, 600, 700] },
  { family: 'Marhey', weights: [300, 400, 500, 600, 700] },
  { family: 'Rakkas', weights: [400] },
  { family: 'Jomhuria', weights: [400] },
  { family: 'Mirza', weights: [400, 500, 600, 700] },
  { family: 'Katibeh', weights: [400] },
  { family: 'Gulzar', weights: [400] },
  // Sinhala
  { family: 'Abhaya Libre', weights: [400, 500, 600, 700, 800] },
  { family: 'Gemunu Libre', weights: [200, 300, 400, 500, 600, 700, 800] },
  // Thai
  { family: 'Mitr', weights: [200, 300, 400, 500, 600, 700] },
  { family: 'Itim', weights: [400] },
  { family: 'Sriracha', weights: [400] },
  { family: 'Chonburi', weights: [400] },
  // Hebrew
  { family: 'Suez One', weights: [400] },
  { family: 'Varela Round', weights: [400] },
  { family: 'Assistant', weights: [200, 300, 400, 500, 600, 700, 800] },
  // Chinese / Japanese / Korean
  { family: 'ZCOOL KuaiLe', weights: [400] },
  { family: 'Zhi Mang Xing', weights: [400] },
  { family: 'Long Cang', weights: [400] },
  { family: 'Zen Maru Gothic', weights: [300, 400, 500, 700, 900] },
  { family: 'Kosugi Maru', weights: [400] },
  { family: 'Klee One', weights: [400, 600] },
  { family: 'Yusei Magic', weights: [400] },
  { family: 'Hachi Maru Pop', weights: [400] },
  { family: 'Nanum Myeongjo', weights: [400, 700, 800] },
  { family: 'Do Hyeon', weights: [400] },
  { family: 'Gaegu', weights: [300, 400, 700] },
  { family: 'Jua', weights: [400] },
  { family: 'Gamja Flower', weights: [400] },
];

/** Which language a piece of text is written in (by its letters), if any. */
export function detectFontLanguage(text: string): string | null {
  const t = text || '';
  if (/[஀-௿]/.test(t)) return 'ta';
  if (/[ഀ-ൿ]/.test(t)) return 'ml';
  if (/[ऀ-ॿ]/.test(t)) return 'hi';
  if (/[ఀ-౿]/.test(t)) return 'te';
  if (/[ಀ-೿]/.test(t)) return 'kn';
  if (/[ঀ-৿]/.test(t)) return 'bn';
  if (/[઀-૿]/.test(t)) return 'gu';
  if (/[਀-੿]/.test(t)) return 'pa';
  if (/[඀-෿]/.test(t)) return 'si';
  if (/[฀-๿]/.test(t)) return 'th';
  if (/[֐-׿]/.test(t)) return 'he';
  if (/[؀-ۿ]/.test(t)) return /[پچژگھہے]/.test(t) ? 'ur' : 'ar';
  if (/[぀-ヿ]/.test(t)) return 'ja';
  if (/[가-힯]/.test(t)) return 'ko';
  if (/[一-鿿]/.test(t)) return 'zh';
  return null;
}
