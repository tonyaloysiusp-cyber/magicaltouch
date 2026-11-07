import { typesOf, topicText, hasWord } from '@/lib/designTypes';
// What people make, mapped to real document sizes and to the template
// categories that suit them. Used by the New Design page and its wizard.

import { ALL_PRESETS, SizePreset, presetToPx } from '@/lib/editor/sizePresets';
import type { Template } from '@/lib/templatesData';

export type GoalId = 'social' | 'story' | 'invitation' | 'flyer' | 'card' | 'businesscard' | 'resume' | 'certificate' | 'menu' | 'presentation' | 'print' | 'publishing';

export interface Goal {
  id: GoalId;
  label: string;
  hint: string;
  presets: string[]; // SizePreset ids, best first
  categories: string[]; // template categories, best first
}

export const GOALS: Goal[] = [
  { id: 'social', label: 'Social media post', hint: 'Instagram, Facebook, LinkedIn', presets: ['ig-post', 'ig-square', 'fb-post', 'linkedin', 'pinterest', 'yt-thumb'], categories: ['Social Media', 'Marketing', 'Business', 'Birthday', 'Events'] },
  { id: 'story', label: 'Story or reel cover', hint: 'Tall phone screens', presets: ['ig-story', 'tiktok', 'whatsapp', 'party'], categories: ['Social Media', 'Birthday', 'Events', 'Marketing'] },
  { id: 'invitation', label: 'Invitation', hint: 'Birthday, wedding, party', presets: ['birthday', 'wedding', 'baby-shower', 'graduation', 'party'], categories: ['Birthday', 'Wedding', 'Events', 'Cards'] },
  { id: 'flyer', label: 'Flyer or poster', hint: 'Events, sales, notices', presets: ['flyer', 'poster', 'festival', 'religious', 'advert'], categories: ['Events', 'Marketing', 'Business'] },
  { id: 'card', label: 'Greeting card', hint: 'Thank you, congratulations', presets: ['anniversary', 'celebration'], categories: ['Cards', 'Wedding', 'Birthday'] },
  { id: 'businesscard', label: 'Business card', hint: 'Print-ready 85 × 55 mm', presets: ['business-card', 'id-card'], categories: ['Business'] },
  { id: 'resume', label: 'Resume / CV', hint: 'A4, ready to print or send', presets: ['resume', 'letter'], categories: ['Resume'] },
  { id: 'certificate', label: 'Certificate', hint: 'Awards and achievements', presets: ['certificate'], categories: ['Certificates'] },
  { id: 'menu', label: 'Menu or price list', hint: 'Restaurants, cafés, salons', presets: ['menu', 'price-list'], categories: ['Menus'] },
  { id: 'presentation', label: 'Presentation', hint: 'Slides and thumbnails, 16:9', presets: ['presentation', 'yt-thumb'], categories: ['Business', 'Marketing', 'Events'] },
  { id: 'print', label: 'Letterhead or invoice', hint: 'Business paperwork', presets: ['letterhead', 'invoice', 'receipt', 'a4', 'letter'], categories: ['Business'] },
  { id: 'publishing', label: 'Magazine or book', hint: 'Covers, pages, newsletters', presets: ['magazine-cover', 'book-cover', 'newsletter', 'magazine-page', 'catalog'], categories: [] },
];

export const presetById = (id: string): SizePreset | undefined => ALL_PRESETS.find((p) => p.id === id);

// "Help me choose" results: templates that ARE what was picked — the right
// design type (business card, invitation, menu…) and, for sizes tied to an
// occasion (wedding, birthday…), that occasion. Same page shape first, then
// the same orientation. Nothing unrelated is shown just because it fits.
const GOAL_TYPES: Record<string, string[]> = {
  social: ['social-post'], story: ['story'], invitation: ['invitation'], flyer: ['flyer', 'poster', 'ad'],
  card: ['greeting-card'], businesscard: ['business-card'], resume: ['resume'], certificate: ['certificate'],
  menu: ['menu'], presentation: ['presentation', 'thumbnail'], print: ['letterhead', 'invoice'], publishing: ['magazine', 'brochure', 'photo-album'],
};
const PRESET_TOPIC: Record<string, string[]> = {
  birthday: ['birthday'], wedding: ['wedding', 'nikah', 'engagement', 'save the date'], 'baby-shower': ['baby', 'shower'],
  graduation: ['graduation', 'graduate'], anniversary: ['anniversary'], festival: ['festival', 'diwali', 'eid', 'christmas', 'holi', 'new year', 'ramadan'],
  religious: ['church', 'mosque', 'temple', 'prayer', 'eid', 'ramadan', 'christmas', 'easter'], 'id-card': ['id', 'badge'],
  'price-list': ['price'], invoice: ['invoice'], receipt: ['receipt'], 'yt-thumb': ['youtube', 'thumbnail'],
};
const PRESET_TYPES: Record<string, string[]> = { 'yt-thumb': ['thumbnail'], 'id-card': ['business-card', 'label'], invoice: ['invoice'], receipt: ['invoice'], letterhead: ['letterhead'], newsletter: ['magazine'], catalog: ['brochure', 'magazine'] };

export function matchTemplates(all: Template[], w: number, h: number, goalId = '', presetId = '', limit = 12): Template[] {
  const types = PRESET_TYPES[presetId] || GOAL_TYPES[goalId] || [];
  const topics = PRESET_TOPIC[presetId] || [];
  const ratio = w / h;
  const scored: [Template, number][] = [];
  for (const t of all) {
    if (!t.id || !t.width || !t.height) continue;
    const src = { name: t.name, category: t.category, width: t.width, height: t.height, tags: t.tags, occasion: t.occasion, industry: t.industry, searchKeywords: t.searchKeywords };
    if (types.length && !typesOf(src).some((x) => types.includes(x))) continue;
    if (topics.length) { const tx = topicText(src); if (!topics.some((k) => hasWord(tx, k))) continue; }
    const r = t.width / t.height;
    const same = Math.abs(r / ratio - 1) < 0.04;
    const sameOrient = (r > 1.05) === (ratio > 1.05) && (r < 0.95) === (ratio < 0.95);
    scored.push([t, (same ? 0 : sameOrient ? 10 : 20) - (t.isFeatured ? 1 : 0)]);
  }
  return scored.sort((a, b) => a[1] - b[1]).slice(0, limit).map((x) => x[0]);
}

export function sizeOf(p: SizePreset) {
  return presetToPx(p);
}

export function templateImage(t: Template): string | null {
  return t.preview || t.thumbnail || null;
}
