// ---------------------------------------------------------------------
// lib/templatesData.ts
// Shared template catalog — used by both the /templates page and the
// homepage's design gallery / template showcase, so there's one list to
// keep honest instead of two that can drift apart.
// ---------------------------------------------------------------------

export type Category = 'Business Card' | 'Letterhead' | 'Flyer' | 'Resume' | 'Invitation' | 'Poster';

export interface Template {
  name: string;
  category: Category;
  width: number;
  height: number;
  colors: [string, string];
}

export const CATEGORIES: Category[] = ['Business Card', 'Letterhead', 'Flyer', 'Resume', 'Invitation', 'Poster'];

export const TEMPLATES: Template[] = [
  { name: 'Studio Minimal', category: 'Business Card', width: 1050, height: 600, colors: ['#14121F', '#FAF9F6'] },
  { name: 'Bold Contact', category: 'Business Card', width: 1050, height: 600, colors: ['#6C4FD1', '#FF6F91'] },
  { name: 'Classic Letterpress', category: 'Business Card', width: 1050, height: 600, colors: ['#F5B942', '#14121F'] },

  { name: 'Clean Correspondence', category: 'Letterhead', width: 850, height: 1100, colors: ['#FAF9F6', '#6C4FD1'] },
  { name: 'Studio Header', category: 'Letterhead', width: 850, height: 1100, colors: ['#14121F', '#F5B942'] },

  { name: 'Night Market Flyer', category: 'Flyer', width: 1080, height: 1350, colors: ['#14121F', '#6C4FD1'] },
  { name: 'Bloom Festival', category: 'Flyer', width: 1080, height: 1350, colors: ['#FF6F91', '#F5B942'] },
  { name: 'Grand Opening', category: 'Flyer', width: 1080, height: 1350, colors: ['#6C4FD1', '#14121F'] },

  { name: 'Modern Resume', category: 'Resume', width: 850, height: 1100, colors: ['#14121F', '#FAF9F6'] },
  { name: 'Creative Portfolio', category: 'Resume', width: 850, height: 1100, colors: ['#6C4FD1', '#F5B942'] },

  { name: 'Paper & Ink Invite', category: 'Invitation', width: 1200, height: 1200, colors: ['#FF6F91', '#F5B942'] },
  { name: 'Golden Hour', category: 'Invitation', width: 1200, height: 1200, colors: ['#F5B942', '#FF6F91'] },

  { name: 'Quarterly Showcase', category: 'Poster', width: 1240, height: 1754, colors: ['#6C4FD1', '#FF6F91'] },
];
