// Tanglish → Tamil transliteration, fully in the browser.
//
// Phonetic scheme as Tamil typists know it (Google Input Tools / Azhagi):
//   vowels   a aa/A i ii/ee/I u uu/oo/U e E/ae ai o O au
//   k g c ch s j sh S h ng nj/ny N(ண) n(ந/ன) t(ட) th(த) d(ட) dh(த) p b m y r R(ற) l L(ள) zh(ழ) v w f(ஃப) x(க்ஸ)
// A consonant with no vowel after it takes a pulli (்). Word-initial "n" is ந,
// elsewhere ன, and n before t/th/d/dh is ந (ந்த) or ண (ண்ட). Common words
// whose spelling the rules can't guess (vanakkam → வணக்கம்) come from a small
// dictionary first. English words are left alone unless the user converts them.

const VOWELS: [string, string, string][] = [
  // latin, independent, sign
  ['aa', 'ஆ', 'ா'], ['A', 'ஆ', 'ா'], ['ai', 'ஐ', 'ை'], ['au', 'ஔ', 'ௌ'], ['ee', 'ஈ', 'ீ'], ['ii', 'ஈ', 'ீ'], ['I', 'ஈ', 'ீ'],
  ['oo', 'ஊ', 'ூ'], ['uu', 'ஊ', 'ூ'], ['U', 'ஊ', 'ூ'], ['ae', 'ஏ', 'ே'], ['E', 'ஏ', 'ே'], ['O', 'ஓ', 'ோ'], ['oa', 'ஓ', 'ோ'],
  ['a', 'அ', ''], ['i', 'இ', 'ி'], ['u', 'உ', 'ு'], ['e', 'எ', 'ெ'], ['o', 'ஒ', 'ொ'],
];
const CONS: [string, string][] = [
  ['ksh', 'க்ஷ'], ['sh', 'ஷ'], ['ch', 'ச'], ['zh', 'ழ'], ['ng', 'ங'], ['nj', 'ஞ'], ['ny', 'ஞ'], ['th', 'த'], ['dh', 'த'], ['tr', 'ற்ற'],
  ['k', 'க'], ['g', 'க'], ['c', 'ச'], ['s', 'ச'], ['S', 'ஸ'], ['j', 'ஜ'], ['h', 'ஹ'], ['N', 'ண'], ['T', 'ட'], ['t', 'ட'], ['d', 'ட'], ['D', 'ட'],
  ['p', 'ப'], ['b', 'ப'], ['m', 'ம'], ['y', 'ய'], ['R', 'ற'], ['r', 'ர'], ['L', 'ள'], ['l', 'ல'], ['v', 'வ'], ['w', 'வ'], ['f', 'ஃப'], ['q', 'க'], ['z', 'ஸ'], ['x', 'க்ஸ'],
];
const PULLI = '்';

/** Common words the rules can't spell (dictionary, lower case). */
export const TAMIL_WORDS: Record<string, string> = {
  vanakkam: 'வணக்கம்', nandri: 'நன்றி', nanri: 'நன்றி', eppadi: 'எப்படி', irukkinga: 'இருக்கீங்க', irukkeenga: 'இருக்கீங்க', irukeenga: 'இருக்கீங்க', irukinga: 'இருக்கீங்க',
  iruken: 'இருக்கேன்', irukken: 'இருக்கேன்', naan: 'நான்', nan: 'நான்', neenga: 'நீங்க', nee: 'நீ', avan: 'அவன்', aval: 'அவள்', avanga: 'அவங்க',
  tamil: 'தமிழ்', thamizh: 'தமிழ்', tamizh: 'தமிழ்', amma: 'அம்மா', appa: 'அப்பா', anna: 'அண்ணா', akka: 'அக்கா', thambi: 'தம்பி', thangachi: 'தங்கச்சி',
  kalyanam: 'கல்யாணம்', pongal: 'பொங்கல்', deepavali: 'தீபாவளி', vazhthukkal: 'வாழ்த்துக்கள்', vaazhthukkal: 'வாழ்த்துக்கள்', valthukkal: 'வாழ்த்துக்கள்', iniya: 'இனிய',
  piranthanaal: 'பிறந்தநாள்', pirandhanaal: 'பிறந்தநாள்', puthandu: 'புத்தாண்டு', puththaandu: 'புத்தாண்டு', anbu: 'அன்பு', kadhal: 'காதல்', kaadhal: 'காதல்',
  enna: 'என்ன', yen: 'ஏன்', enga: 'எங்க', inga: 'இங்க', anga: 'அங்க', seri: 'சரி', sari: 'சரி', illa: 'இல்ல', illai: 'இல்லை', aamaa: 'ஆமா', ama: 'ஆமா',
  ungal: 'உங்கள்', unga: 'உங்க', enakku: 'எனக்கு', ungalukku: 'உங்களுக்கு', nalla: 'நல்ல', romba: 'ரொம்ப', sapadu: 'சாப்பாடு', saapadu: 'சாப்பாடு', vaanga: 'வாங்க', ponga: 'போங்க',
  kudumbam: 'குடும்பம்', kovil: 'கோவில்', vizha: 'விழா', thiruvizha: 'திருவிழா', manamakkal: 'மணமக்கள்', thirumanam: 'திருமணம்', ulagam: 'உலகம்', makkal: 'மக்கள்',
};

const isUpperish = (c: string) => /[ANTDRLSEIUO]/.test(c);
const startsAt = (s: string, i: number, t: string) => s.startsWith(t, i);

/** Transliterates one Latin word by the rules (no dictionary). */
export function tanglishWord(w: string): string {
  let out = '';
  let i = 0;
  const n = w.length;
  let prevCons = false; // last output was a bare consonant (with pulli to be decided)
  const vowelAt = (j: number): [string, string, string] | null => { for (const v of VOWELS) if (startsAt(w, j, v[0]) || (!isUpperish(v[0]) && startsAt(w.toLowerCase(), j, v[0]) && w[j] === w[j].toLowerCase())) { if (startsAt(w, j, v[0])) return v; } return null; };
  while (i < n) {
    const v = vowelAt(i);
    if (v) {
      if (prevCons) { out = out.slice(0, -PULLI.length) + v[2]; prevCons = false; }
      else out += v[1];
      i += v[0].length;
      continue;
    }
    // Consonants (with the n / nth rules).
    let cons: string | null = null, len = 1;
    if (w[i] === 'n' || w[i] === 'N' && false) {
      const next = w.slice(i + 1, i + 3);
      if (w[i + 1] === 'g' ) { cons = 'ங'; len = 2; if (w[i + 2] === 'g') { /* ngg */ } }
      else if (w[i + 1] === 'j' || w[i + 1] === 'y') { cons = 'ஞ'; len = 2; }
      else if (/^(th|dh)/.test(next)) cons = 'ந';
      else if (/^[tdTD]/.test(next)) cons = 'ண';
      else cons = i === 0 ? 'ந' : 'ன';
    } else {
      for (const [lat, ta] of CONS) if (startsAt(w, i, lat)) { cons = ta; len = lat.length; break; }
      if (!cons) for (const [lat, ta] of CONS) if (lat === lat.toLowerCase() && startsAt(w.toLowerCase(), i, lat)) { cons = ta; len = lat.length; break; }
    }
    if (cons) {
      // "ng" before a vowel at word end-ish (inga → இங்க): ங் + க.
      if (cons === 'ங' && vowelAt(i + 2)) { out += 'ங' + PULLI + 'க' + PULLI; prevCons = true; i += 2; continue; }
      out += cons + PULLI; prevCons = true; i += len;
      continue;
    }
    out += w[i]; prevCons = false; i++;
  }
  return out;
}

/** Transliterates text: dictionary words first, then the rules, keeping punctuation, digits and spacing. */
export function tanglishToTamil(text: string, o: { keep?: Set<string> } = {}): string {
  return text.replace(/[A-Za-z]+/g, (w) => {
    if (o.keep?.has(w.toLowerCase())) return w;
    const hit = TAMIL_WORDS[w.toLowerCase()];
    return hit || tanglishWord(normCase(w));
  });
}

/** Word-by-word suggestions (dictionary + rules), for an accept / keep choice per word. */
export function tanglishSuggest(text: string): { latin: string; tamil: string; known: boolean; start: number }[] {
  const out: { latin: string; tamil: string; known: boolean; start: number }[] = [];
  const re = /[A-Za-z]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) { const hit = TAMIL_WORDS[m[0].toLowerCase()]; out.push({ latin: m[0], tamil: hit || tanglishWord(normCase(m[0])), known: !!hit, start: m.index }); }
  return out;
}

/** Does this look like Tamil written in Latin letters (not English)? Rough, for the "convert?" prompt only. */
export function looksTanglish(text: string): boolean {
  const words = text.toLowerCase().match(/[a-z]+/g) || [];
  if (!words.length) return false;
  const known = words.filter((w) => TAMIL_WORDS[w]).length;
  const tamilish = words.filter((w) => /(zh|aa|ee|oo|kk|pp|tt|nga|nja|thu|dhu)/.test(w) || /[aiu]$/.test(w)).length;
  return known > 0 || tamilish / words.length > 0.6;
}

/** A capitalised word (Tamil Nadu, Arun) is not a request for ண / ட / ற: only capitals inside a word select those letters. */
function normCase(w: string): string { return /^[A-Z][a-z]/.test(w) || /^[A-Z]+$/.test(w) ? w.toLowerCase() : w; }

/** Other spellings of a word: n → ந / ன / ண, l → ல / ள / ழ, r → ர / ற, t → ட / த, short ↔ long vowels. Shown when the first guess is wrong. */
export function tanglishAlternatives(word: string, max = 8): string[] {
  const base = normCase(word);
  const swaps: [RegExp, string[]][] = [[/n/g, ['n', 'N']], [/l/g, ['l', 'L', 'zh']], [/r/g, ['r', 'R']], [/t(?!h)/g, ['t', 'th']], [/d(?!h)/g, ['d', 'dh']], [/(?<!a)a(?![aiu])/g, ['a', 'aa']], [/(?<![ai])i(?!i)/g, ['i', 'ee']], [/(?<![au])u(?!u)/g, ['u', 'oo']], [/e(?!e)/g, ['e', 'E']], [/o(?!o)/g, ['o', 'O']]];
  const seen = new Set<string>([tanglishToTamil(word)]);
  const out: string[] = [];
  for (const [re, opts] of swaps) {
    const idx: number[] = []; let m: RegExpExecArray | null; re.lastIndex = 0;
    while ((m = re.exec(base))) idx.push(m.index);
    for (const at of idx) for (const o of opts) {
      const len = base[at] === 't' || base[at] === 'd' ? 1 : 1;
      const v = base.slice(0, at) + o + base.slice(at + len);
      const t = tanglishWord(v);
      if (!seen.has(t)) { seen.add(t); out.push(t); if (out.length >= max) return out; }
    }
  }
  return out;
}
