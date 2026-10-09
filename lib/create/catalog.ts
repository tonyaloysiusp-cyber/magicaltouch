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

// Templates whose page has the same shape as the chosen size (within 4%),
// templates from the preferred categories first, then featured ones.
export function matchTemplates(all: Template[], w: number, h: number, prefer: string[] = [], limit = 12): Template[] {
  const ratio = w / h;
  const fits = all.filter((t) => t.id && t.width && t.height && Math.abs(t.width / t.height / ratio - 1) < 0.04);
  const rank = (t: Template) => {
    const i = prefer.indexOf(t.category);
    return (i === -1 ? 100 : i * 10) - (t.isFeatured ? 1 : 0);
  };
  return [...fits].sort((a, b) => rank(a) - rank(b)).slice(0, limit);
}

export function sizeOf(p: SizePreset) {
  return presetToPx(p);
}

export function templateImage(t: Template): string | null {
  return t.preview || t.thumbnail || null;
}
