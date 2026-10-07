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
//
// Since migration 0011, templates are managed platform content with
// hierarchical categories, tags, publishing states and immutable version
// snapshots. Browsing never downloads a template's editable design
// (canvas_json) -- only small metadata and a thumbnail URL. The design
// itself is fetched once, by fetchTemplateById(), when the customer taps
// "Use Template", and the editor turns it into the customer's own copy.
// ---------------------------------------------------------------------

import { supabase } from './supabase';
import { uploadTemplateImages } from './templates/media';

// Display name of a template's category. Kept as a plain string because
// admins can now add categories without a code change.
export type Category = string;

export interface Template {
  id?: string; // present for real rows loaded from Supabase; absent for the static fallback below
  name: string;
  category: Category;
  width: number;
  height: number;
  colors: [string, string];
  // Present only once a real editable design has been generated for this
  // row (see lib/templates/renderTemplate.ts) -- the static fallback
  // array and any pre-migration row never have these, and /templates'
  // "Use Template" degrades to today's blank-canvas behavior for them.
  canvasJson?: any;
  thumbnail?: string | null;
  rightsStatus?: string;
  slug?: string | null;
  description?: string | null;
  categoryId?: string | null;
  tags?: string[];
  status?: TemplateStatus;
  isFeatured?: boolean;
  isFree?: boolean;
  unit?: string;
  dpi?: number;
  colorMode?: string;
  preview?: string | null;
  currentVersion?: string;
  publishedAt?: string | null;
  orientation?: 'landscape' | 'portrait' | 'square';
  occasion?: string | null;
  industry?: string | null;
  language?: string | null;
  searchKeywords?: string | null;
  sortOrder?: number;
}

export type TemplateStatus = 'draft' | 'review' | 'published' | 'unpublished' | 'archived';
export const TEMPLATE_STATUSES: TemplateStatus[] = ['draft', 'review', 'published', 'unpublished', 'archived'];

export interface TemplateCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  sortOrder: number;
}

export interface TemplateVersion {
  id: string;
  version: string;
  thumbnail: string | null;
  width: number;
  height: number;
  notes: string | null;
  createdAt: string;
}

export const CATEGORIES: Category[] = ['Business Card', 'Letterhead', 'Flyer', 'Resume', 'Invitation', 'Poster', 'Social Media'];

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

// ---------------------------------------------------------------------
// Database rows
// ---------------------------------------------------------------------

// Everything the gallery and admin list need -- deliberately NOT
// canvas_json, which can be megabytes per template.
const LIST_COLUMNS =
  'id, name, category, width, height, color1, color2, sort_order, thumbnail, rights_status, slug, description, category_id, tags, status, is_featured, is_free, unit, dpi, color_mode, preview, current_version, published_at, orientation, occasion, industry, language, search_keywords';

interface TemplateRow {
  id: string;
  name: string;
  category: string;
  width: number;
  height: number;
  color1: string;
  color2: string;
  sort_order: number;
  canvas_json?: any;
  thumbnail?: string | null;
  rights_status?: string;
  slug?: string | null;
  description?: string | null;
  category_id?: string | null;
  tags?: string[] | null;
  status?: TemplateStatus;
  is_featured?: boolean;
  is_free?: boolean;
  unit?: string;
  dpi?: number;
  color_mode?: string;
  preview?: string | null;
  current_version?: string;
  published_at?: string | null;
  orientation?: 'landscape' | 'portrait' | 'square';
  occasion?: string | null;
  industry?: string | null;
  language?: string | null;
  search_keywords?: string | null;
}

function rowToTemplate(row: TemplateRow): Template {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    width: row.width,
    height: row.height,
    colors: [row.color1, row.color2],
    canvasJson: row.canvas_json,
    thumbnail: row.thumbnail,
    rightsStatus: row.rights_status,
    slug: row.slug,
    description: row.description,
    categoryId: row.category_id,
    tags: row.tags || [],
    status: row.status,
    isFeatured: row.is_featured,
    isFree: row.is_free,
    unit: row.unit,
    dpi: row.dpi,
    colorMode: row.color_mode,
    preview: row.preview,
    currentVersion: row.current_version,
    publishedAt: row.published_at,
    orientation: row.orientation,
    occasion: row.occasion,
    industry: row.industry,
    language: row.language,
    searchKeywords: row.search_keywords,
    sortOrder: row.sort_order,
  };
}

// Editable fields an admin can save. Undefined fields are left as-is.
export interface TemplateInput {
  name: string;
  category: string;
  categoryId?: string | null;
  width: number;
  height: number;
  colors: [string, string];
  description?: string | null;
  tags?: string[];
  isFeatured?: boolean;
  isFree?: boolean;
  unit?: string;
  dpi?: number;
  colorMode?: string;
  occasion?: string | null;
  industry?: string | null;
  language?: string | null;
  searchKeywords?: string | null;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export function parseTags(input: string): string[] {
  return Array.from(new Set(input.split(',').map((t) => slugify(t.trim())).filter(Boolean))).slice(0, 30);
}

function inputToRow(t: TemplateInput) {
  const row: Record<string, unknown> = {
    name: t.name,
    category: t.category,
    width: t.width,
    height: t.height,
    color1: t.colors[0],
    color2: t.colors[1],
  };
  const optional: [keyof TemplateInput, string][] = [
    ['categoryId', 'category_id'], ['description', 'description'], ['tags', 'tags'],
    ['isFeatured', 'is_featured'], ['isFree', 'is_free'], ['unit', 'unit'], ['dpi', 'dpi'],
    ['colorMode', 'color_mode'], ['occasion', 'occasion'], ['industry', 'industry'],
    ['language', 'language'], ['searchKeywords', 'search_keywords'],
  ];
  for (const [k, col] of optional) if (t[k] !== undefined) row[col] = t[k];
  return row;
}

// ---------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------

// Admin list: every status. RLS returns only published rows to anyone
// who isn't an admin, so this is safe even if called elsewhere.
export async function fetchTemplates(): Promise<Template[]> {
  const { data, error } = await supabase.from('templates').select(LIST_COLUMNS).order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) {
    if (error) console.error('Failed to load templates, falling back to the built-in list:', error);
    return TEMPLATES;
  }
  return (data as TemplateRow[]).map(rowToTemplate);
}

// Customer gallery: published templates that have real editable content.
// The canvas_json filter runs in the database, so the content itself is
// never transferred while browsing.
export async function fetchPublicTemplates(): Promise<Template[]> {
  const { data, error } = await supabase
    .from('templates')
    .select(LIST_COLUMNS)
    .eq('status', 'published')
    .not('canvas_json', 'is', null)
    .order('is_featured', { ascending: false })
    .order('sort_order', { ascending: true });
  if (error || !data || data.length === 0) {
    if (error) console.error('Failed to load templates, falling back to the built-in list:', error);
    return TEMPLATES;
  }
  return (data as TemplateRow[]).map(rowToTemplate);
}

// The full template, including its editable design -- only called when
// a customer actually uses a template (or an admin edits one).
export async function fetchTemplateById(id: string): Promise<Template | null> {
  const { data, error } = await supabase.from('templates').select('*').eq('id', id).single();
  if (error || !data) return null;
  return rowToTemplate(data as TemplateRow);
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------

export async function fetchCategories(): Promise<TemplateCategory[]> {
  const { data, error } = await supabase
    .from('template_categories')
    .select('id, name, slug, parent_id, sort_order')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });
  if (error || !data) {
    if (error) console.warn('Template categories unavailable:', error.message);
    return [];
  }
  return data.map((c: any) => ({ id: c.id, name: c.name, slug: c.slug, parentId: c.parent_id, sortOrder: c.sort_order }));
}

export async function createCategory(name: string, parentId: string | null): Promise<TemplateCategory | null> {
  const { data, error } = await supabase
    .from('template_categories')
    .insert({ name: name.trim(), slug: `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`, parent_id: parentId })
    .select('id, name, slug, parent_id, sort_order')
    .single();
  if (error || !data) {
    console.error('Failed to create category:', error);
    return null;
  }
  return { id: data.id, name: data.name, slug: data.slug, parentId: data.parent_id, sortOrder: data.sort_order };
}

export async function renameCategory(id: string, name: string): Promise<boolean> {
  const { error } = await supabase.from('template_categories').update({ name: name.trim() }).eq('id', id);
  if (error) console.error('Failed to rename category:', error);
  return !error;
}

// Templates in a deleted category keep working; they just lose the link.
export async function deleteCategory(id: string): Promise<boolean> {
  const { error } = await supabase.from('template_categories').delete().eq('id', id);
  if (error) console.error('Failed to delete category:', error);
  return !error;
}

// ---------------------------------------------------------------------
// Writing (admin only -- enforced by RLS, not just the UI)
// ---------------------------------------------------------------------

export async function createTemplate(t: TemplateInput, userId: string): Promise<Template | null> {
  const { data, error } = await supabase
    .from('templates')
    .insert({ ...inputToRow(t), slug: `${slugify(t.name)}-${Math.random().toString(36).slice(2, 7)}`, status: 'draft', created_by: userId })
    .select(LIST_COLUMNS)
    .single();
  if (error) {
    console.error('Failed to create template:', error);
    return null;
  }
  return rowToTemplate(data as TemplateRow);
}

export async function updateTemplate(id: string, t: TemplateInput): Promise<boolean> {
  const { error } = await supabase
    .from('templates')
    .update({ ...inputToRow(t), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    console.error('Failed to update template:', error);
    return false;
  }
  return true;
}

// Deleting a template never touches customer designs made from it --
// those are independent copies.
export async function deleteTemplate(id: string): Promise<boolean> {
  const { error } = await supabase.from('templates').delete().eq('id', id);
  if (error) {
    console.error('Failed to delete template:', error);
    return false;
  }
  return true;
}

// Replaces a template's editable content (e.g. from one of the admin's
// saved designs) and uploads fresh thumbnail/preview images.
export async function setTemplateContent(
  id: string,
  version: string,
  canvasJson: any,
  imageSrc: string | null,
): Promise<boolean> {
  const update: Record<string, unknown> = { canvas_json: canvasJson, updated_at: new Date().toISOString() };
  if (imageSrc) {
    const media = await uploadTemplateImages(id, version, imageSrc);
    update.thumbnail = media?.thumbnail ?? imageSrc;
    update.preview = media?.preview ?? null;
  }
  const { error } = await supabase.from('templates').update(update).eq('id', id);
  if (error) console.error('Failed to set template content:', error);
  return !error;
}

export async function replaceThumbnail(id: string, version: string, file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const media = await uploadTemplateImages(id, version, url);
    if (!media) return null;
    const { error } = await supabase.from('templates').update({ thumbnail: media.thumbnail, preview: media.preview }).eq('id', id);
    return error ? null : media.thumbnail;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------
// Versions + publishing
// ---------------------------------------------------------------------

function nextVersion(v: string): string {
  const [major, minor] = v.split('.').map((n) => parseInt(n, 10) || 0);
  return `${major}.${minor + 1}`;
}

export async function listVersions(templateId: string): Promise<TemplateVersion[]> {
  const { data, error } = await supabase
    .from('template_versions')
    .select('id, version, thumbnail, width, height, notes, created_at')
    .eq('template_id', templateId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return data.map((v: any) => ({ id: v.id, version: v.version, thumbnail: v.thumbnail, width: v.width, height: v.height, notes: v.notes, createdAt: v.created_at }));
}

// Saves an immutable snapshot of the template as it is right now.
async function snapshot(templateId: string, version: string, userId: string, notes: string | null): Promise<boolean> {
  const full = await fetchTemplateById(templateId);
  if (!full) return false;
  const { error } = await supabase.from('template_versions').insert({
    template_id: templateId,
    version,
    canvas_json: full.canvasJson ?? null,
    thumbnail: full.thumbnail ?? null,
    preview: full.preview ?? null,
    width: full.width,
    height: full.height,
    notes,
    created_by: userId,
  });
  // 23505 = this version already has a snapshot, which is fine.
  if (error && error.code !== '23505') {
    console.error('Failed to save template version:', error);
    return false;
  }
  return true;
}

// "Create Version": freezes the current state as the current version
// number, then moves the template on to the next number for new edits.
export async function createVersion(t: Template, userId: string, notes: string | null): Promise<string | null> {
  if (!t.id) return null;
  const current = t.currentVersion || '1.0';
  if (!(await snapshot(t.id, current, userId, notes))) return null;
  const next = nextVersion(current);
  const { error } = await supabase.from('templates').update({ current_version: next }).eq('id', t.id);
  return error ? null : next;
}

export async function setTemplateStatus(t: Template, status: TemplateStatus, userId: string): Promise<string | null> {
  if (!t.id) return 'This template is not saved in the database yet.';
  if (status === 'published') {
    const full = await fetchTemplateById(t.id);
    if (!full?.canvasJson) return 'Add the design content first (Set content), then publish.';
    if (!full.thumbnail) return 'Add a thumbnail before publishing.';
    // Every published state is captured as a version.
    await snapshot(t.id, t.currentVersion || '1.0', userId, 'Published');
  }
  const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
  if (status === 'published') update.published_at = new Date().toISOString();
  const { error } = await supabase.from('templates').update(update).eq('id', t.id);
  if (error) {
    console.error('Failed to change template status:', error);
    return 'Could not change the status.';
  }
  return null;
}

// Admin "Duplicate": a brand-new draft template; the original is untouched.
export async function duplicateTemplate(t: Template, userId: string): Promise<Template | null> {
  if (!t.id) return null;
  const full = await fetchTemplateById(t.id);
  if (!full) return null;
  const { data, error } = await supabase
    .from('templates')
    .insert({
      ...inputToRow({
        name: `${full.name} (copy)`,
        category: full.category,
        categoryId: full.categoryId ?? null,
        width: full.width,
        height: full.height,
        colors: full.colors,
        description: full.description ?? null,
        tags: full.tags ?? [],
        isFree: full.isFree ?? true,
        unit: full.unit,
        dpi: full.dpi,
        colorMode: full.colorMode,
        occasion: full.occasion ?? null,
        industry: full.industry ?? null,
        language: full.language ?? null,
        searchKeywords: full.searchKeywords ?? null,
      }),
      canvas_json: full.canvasJson ?? null,
      thumbnail: full.thumbnail ?? null,
      preview: full.preview ?? null,
      slug: `${slugify(full.name)}-copy-${Math.random().toString(36).slice(2, 7)}`,
      status: 'draft',
      current_version: '1.0',
      created_by: userId,
    })
    .select(LIST_COLUMNS)
    .single();
  if (error) {
    console.error('Failed to duplicate template:', error);
    return null;
  }
  return rowToTemplate(data as TemplateRow);
}

// Runs every builder in lib/templates/builders.ts through the real
// headless render pipeline and upserts the result into the templates
// table (matched by name+category, like the original 0003 seed, so this
// is safe to re-run after editing a builder). Real, original, editable
// designs -- not a copy of anything -- see that module's own header.
export async function generateStarterTemplates(userId: string): Promise<{ created: number; updated: number; errors: string[] }> {
  const { TEMPLATE_BUILDERS } = await import('@/lib/templates/builders');
  const { renderTemplate } = await import('@/lib/templates/renderTemplate');

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (let i = 0; i < TEMPLATE_BUILDERS.length; i++) {
    const def = TEMPLATE_BUILDERS[i];
    try {
      const { canvasJson, thumbnail } = await renderTemplate(def);
      const { data: existing } = await supabase
        .from('templates')
        .select('id')
        .eq('name', def.name)
        .eq('category', def.category)
        .maybeSingle();

      const payload = {
        name: def.name,
        category: def.category,
        width: def.width,
        height: def.height,
        color1: def.color1,
        color2: def.color2,
        canvas_json: canvasJson,
        thumbnail,
        rights_status: 'verified',
        created_by: userId,
        updated_at: new Date().toISOString(),
        // Negative, so real templates always sort ahead of the legacy
        // 0003 seed's rows (sort_order 0-12) in the unfiltered admin view,
        // rather than colliding with whatever value already sits at i.
        sort_order: i - TEMPLATE_BUILDERS.length,
      };

      let id: string;
      if (existing) {
        const { error } = await supabase.from('templates').update(payload).eq('id', existing.id);
        if (error) throw error;
        id = existing.id;
        updated++;
      } else {
        // Starter templates are original, verified content, so they go
        // live straight away (admins can unpublish them like any other).
        const { data: inserted, error } = await supabase
          .from('templates')
          .insert({ ...payload, status: 'published', published_at: new Date().toISOString(), slug: `${slugify(def.name)}-${i}` })
          .select('id')
          .single();
        if (error) throw error;
        id = inserted.id;
        created++;
      }
      // Move the rendered thumbnail out of the table into storage.
      if (thumbnail) {
        const media = await uploadTemplateImages(id, '1.0', thumbnail);
        if (media) await supabase.from('templates').update({ thumbnail: media.thumbnail, preview: media.preview }).eq('id', id);
      }
    } catch (err: any) {
      errors.push(`${def.name}: ${err?.message || String(err)}`);
    }
  }

  return { created, updated, errors };
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
