// Document sizes for New Design, Resize and the quick-start screen.
// Sizes are given in their natural unit and converted exactly
// (1 in = 25.4 mm = 72 pt = 96 px).

export type PresetUnit = 'px' | 'mm' | 'in';

export interface SizePreset {
  id: string;
  label: string;
  w: number;
  h: number;
  unit: PresetUnit;
  dpi?: number; // print sizes default to 300
  print?: boolean;
  templateCategory?: string; // matching template category
}

export interface SizeGroup {
  id: string;
  label: string;
  items: SizePreset[];
}

const px = (id: string, label: string, w: number, h: number, templateCategory?: string): SizePreset => ({ id, label, w, h, unit: 'px', templateCategory });
const mm = (id: string, label: string, w: number, h: number, templateCategory?: string): SizePreset => ({ id, label, w, h, unit: 'mm', print: true, dpi: 300, templateCategory });
const inch = (id: string, label: string, w: number, h: number, templateCategory?: string): SizePreset => ({ id, label, w, h, unit: 'in', print: true, dpi: 300, templateCategory });

export const SIZE_GROUPS: SizeGroup[] = [
  {
    id: 'social',
    label: 'Social media',
    items: [
      px('ig-post', 'Instagram post', 1080, 1350, 'Social Media'),
      px('ig-square', 'Instagram square', 1080, 1080, 'Social Media'),
      px('ig-story', 'Instagram story', 1080, 1920, 'Social Media'),
      px('fb-post', 'Facebook post', 1200, 630, 'Social Media'),
      px('fb-cover', 'Facebook cover', 1640, 624, 'Social Media'),
      px('yt-thumb', 'YouTube thumbnail', 1280, 720, 'Social Media'),
      px('yt-banner', 'YouTube banner', 2560, 1440, 'Social Media'),
      px('tiktok', 'TikTok post', 1080, 1920, 'Social Media'),
      px('linkedin', 'LinkedIn post', 1200, 1200, 'Social Media'),
      px('pinterest', 'Pinterest pin', 1000, 1500, 'Social Media'),
      px('whatsapp', 'WhatsApp status', 1080, 1920, 'Social Media'),
    ],
  },
  {
    id: 'business',
    label: 'Business',
    items: [
      mm('business-card', 'Business card', 85, 55, 'Business'),
      mm('letterhead', 'Letterhead (A4)', 210, 297, 'Business'),
      mm('invoice', 'Invoice (A4)', 210, 297, 'Business'),
      mm('receipt', 'Receipt', 80, 200, 'Business'),
      mm('flyer', 'Flyer (A5)', 148, 210, 'Marketing'),
      mm('brochure', 'Brochure (A4 landscape)', 297, 210, 'Marketing'),
      mm('poster', 'Poster (A3)', 297, 420, 'Marketing'),
      px('advert', 'Advertisement', 1200, 1200, 'Marketing'),
      px('presentation', 'Presentation (16:9)', 1920, 1080, 'Business'),
      mm('certificate', 'Certificate (A4 landscape)', 297, 210, 'Certificates'),
      mm('id-card', 'ID card', 85.6, 54, 'Business'),
      mm('menu', 'Menu (A4)', 210, 297, 'Menus'),
      mm('price-list', 'Price list (A4)', 210, 297, 'Menus'),
      mm('resume', 'Resume (A4)', 210, 297, 'Resume'),
    ],
  },
  {
    id: 'print',
    label: 'Print',
    items: [
      mm('a4', 'A4', 210, 297),
      mm('a5', 'A5', 148, 210),
      mm('a3', 'A3', 297, 420),
      mm('a2', 'A2', 420, 594),
      mm('a1', 'A1', 594, 841),
      inch('letter', 'US Letter', 8.5, 11),
      inch('legal', 'US Legal', 8.5, 14),
    ],
  },
  {
    id: 'events',
    label: 'Events',
    items: [
      inch('birthday', 'Birthday invitation', 5, 7, 'Birthday'),
      inch('wedding', 'Wedding invitation', 5, 7, 'Wedding'),
      inch('anniversary', 'Anniversary card', 5, 7, 'Cards'),
      inch('baby-shower', 'Baby shower invite', 5, 7, 'Events'),
      inch('graduation', 'Graduation announcement', 5, 7, 'Events'),
      px('party', 'Party invitation (phone)', 1080, 1920, 'Birthday'),
      mm('festival', 'Festival poster (A3)', 297, 420, 'Events'),
      inch('religious', 'Religious event flyer', 5.5, 8.5, 'Events'),
      inch('celebration', 'Celebration card', 6, 4, 'Cards'),
    ],
  },
  {
    id: 'publishing',
    label: 'Publishing',
    items: [
      inch('magazine-cover', 'Magazine cover', 8.5, 11),
      inch('magazine-page', 'Magazine page', 8.5, 11),
      inch('newspaper', 'Newspaper (tabloid)', 11, 17),
      inch('book-cover', 'Book cover (6×9)', 6, 9),
      inch('book-page', 'Book page (6×9)', 6, 9),
      mm('newsletter', 'Newsletter (A4)', 210, 297),
      mm('catalog', 'Catalogue (A4)', 210, 297),
    ],
  },
];

export const ALL_PRESETS: SizePreset[] = SIZE_GROUPS.flatMap((g) => g.items);

const PER_UNIT: Record<PresetUnit, number> = { px: 1, mm: 96 / 25.4, in: 96 };

export function presetToPx(p: SizePreset) {
  return { width: p.w * PER_UNIT[p.unit], height: p.h * PER_UNIT[p.unit] };
}

export function presetLabel(p: SizePreset) {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));
  return `${fmt(p.w)} × ${fmt(p.h)} ${p.unit}`;
}
