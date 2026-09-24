// ---------------------------------------------------------------------
// lib/templatesData.ts
// Shared template catalog — used by both the /templates page and the
// homepage's design gallery / template showcase, so there's one list to
// keep honest instead of two that can drift apart.
//
// The real source of truth is the `templates` table (see
// supabase/migrations/0003_templates_and_admin.sql), managed from
// /admin/templates. TEMPLATES below stays as a fallback for local/dev
// use before that migration has been applied, or if the table is
// unreachable — the app never shows an empty gallery just because a
// database round-trip failed.
// ---------------------------------------------------------------------

import { supabase } from './supabase';

export type Category = 'Business Card' | 'Letterhead' | 'Flyer' | 'Resume' | 'Invitation' | 'Poster';

export interface Template {
  id?: string; // present for real rows loaded from Supabase; absent for the static fallback below
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

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  color1: string;
  color2: string;
  sort_order: number;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    category: row.category as Category,
    width: row.width,
    height: row.height,
    colors: [row.color1, row.color2],
  };
}

// The real gallery — reads from the `templates` table an admin manages
// at /admin/templates. Falls back to the static TEMPLATES array above
// (never an empty gallery) if the table doesn't exist yet (migration not
// applied) or the request fails for any other reason.
export async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from('templates').select('*').order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) {
    if (error) console.error('Failed to load templates, falling back to the built-in list:', error);
    return TEMPLATES;
  }
  return (data as TemplateRow[]).map(rowToTemplate);
}

export async function createTemplate(t: Omit<Template, 'id'>, userId: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .insert({
      name: t.name,
      category: t.category,
      width: t.width,
      height: t.height,
      color1: t.colors[0],
      color2: t.colors[1],
      created_by: userId,
    })
    .select('*')
    .single();
  if (error) {
    console.error('Failed to create template:', error);
    return null;
  }
  return rowToTemplate(data as TemplateRow);
}

export async function updateTemplate(id: string, t: Omit<Template, 'id'>): Promise<boolean> {
  const { error } = await supabase
    .from('templates')
    .update({
      name: t.name,
      category: t.category,
      width: t.width,
      height: t.height,
      color1: t.colors[0],
      color2: t.colors[1],
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) {
    console.error('Failed to update template:', error);
    return false;
  }
  return true;
}

export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
  return true;
}

export async function reorderTemplates(orderedIds: string[]): Promise<boolean> {
  const results = await Promise.all(
    orderedIds.map((id, index) => supabase.from('templates').update({ sort_order: index }).eq('id', id))
  );
  const failed = results.find((r) => r.error);
  if (failed?.error) {
    console.error('Failed to reorder templates:', failed.error);
    return false;
  }
  return true;
}
