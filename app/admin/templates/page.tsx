'use client';

// ---------------------------------------------------------------------
// app/admin/templates/page.tsx -- Template Manager
// Admin-only. The page checks is_admin for the UI, but the real
// protection is in the database (migration 0011): non-admins can't read
// drafts or write anything, whatever this page does.
//
// Lifecycle: create (draft) -> set content from one of your saved
// designs -> add thumbnail -> send to review -> publish. Publishing and
// "Create version" save immutable snapshots, so updating a template never
// changes customer designs already made from it.
// ---------------------------------------------------------------------

import { AdminShell } from '@/components/admin/AdminShell';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { loadPhotoLibrary, filterPhotos, LibraryPhoto } from '@/components/editor/shell/panels/PhotosPanel';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Plus, Search, X } from 'lucide-react';
import { countPhotosInJson, stripTemplatePhotos } from '@/lib/templates/stripPhotos';
import { renderTemplatePages } from '@/lib/templates/renderPages';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { listProjects, getProject, ProjectSummary } from '@/lib/api/projects';
import { readMtd, MtdError, OpenedMtd } from '@/lib/mtd/format';
import { pickMtdFile } from '@/lib/mtd/fileAccess';
import { validateTemplateMtd, TemplateValidation } from '@/lib/templates/validateMtd';
import {
  Template,
  TemplateCategory,
  TemplateInput,
  TemplateStatus,
  TemplateVersion,
  TEMPLATE_STATUSES,
  fetchTemplates,
  fetchCategories,
  createCategory,
  renameCategory,
  deleteCategory,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
  setTemplateContent,
  replaceThumbnail,
  setTemplateStatus,
  createVersion,
  listVersions,
  restoreVersion,
  fetchTemplateById,
  generateStarterTemplates,
  parseTags,
} from '@/lib/templatesData';

interface TemplateRef { template_id: string; manifest_id: string; collection: string; category: string; subcategory: string; design_brief: string; inspiration_reference_url: string; inspiration_pin_url: string | null; reference_type: string; reference_verified: boolean; design_notes: Record<string, unknown> | null }

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft: 'bg-mt-surface2 text-mt-muted',
  review: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  unpublished: 'bg-slate-200 text-slate-600',
  archived: 'bg-rose-100 text-rose-600',
};

const STATUS_LABEL: Record<TemplateStatus, string> = {
  draft: 'Draft',
  review: 'Review',
  published: 'Published',
  unpublished: 'Unpublished',
  archived: 'Archived',
};

interface FormState {
  name: string;
  categoryId: string;
  width: number;
  height: number;
  color1: string;
  color2: string;
  description: string;
  tags: string;
  isFeatured: boolean;
  isFree: boolean;
  unit: string;
  dpi: number;
  occasion: string;
  industry: string;
  language: string;
  searchKeywords: string;
}

const EMPTY_FORM: FormState = {
  name: '',
  categoryId: '',
  width: 1080,
  height: 1080,
  color1: '#14121F',
  color2: '#FAF9F6',
  description: '',
  tags: '',
  isFeatured: false,
  isFree: true,
  unit: 'px',
  dpi: 72,
  occasion: '',
  industry: '',
  language: '',
  searchKeywords: '',
};

const input = 'mt-1 w-full border rounded-lg px-2.5 py-2 text-sm text-mt-ink bg-mt-surface';
const label = 'text-xs text-mt-muted';

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'templates' | 'categories' | 'images'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [shown, setShown] = useState(60);
  const [bulkBusy, setBulkBusy] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [contentFor, setContentFor] = useState<Template | null>(null);
  const [designs, setDesigns] = useState<ProjectSummary[] | null>(null);
  const [versionsFor, setVersionsFor] = useState<Template | null>(null);
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [versionNotes, setVersionNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [refs, setRefs] = useState<Record<string, TemplateRef>>({});
  const [refFor, setRefFor] = useState<Template | null>(null);
  const [refDraft, setRefDraft] = useState({ url: '', pin: '', verified: false, brief: '' });
  const [generating, setGenerating] = useState(false);

  // Upload a native .mtd project as a template's content (spec §14, §21-22).
  const [mtdUpload, setMtdUpload] = useState<{ template: Template; fileName: string; opened: OpenedMtd; result: TemplateValidation } | null>(null);

  const thumbInput = useRef<HTMLInputElement>(null);
  const thumbTarget = useRef<Template | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/admin/templates');
        return;
      }
      setUserId(user.id);
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      const admin = !!profile?.is_admin;
      setIsAdmin(admin);
      if (admin) await reload();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const reload = async () => {
    const [t, c, rf] = await Promise.all([fetchTemplates(), fetchCategories(), supabase.from('template_references').select('*')]);
    const map: Record<string, TemplateRef> = {};
    ((rf.data as TemplateRef[]) || []).forEach((r) => (map[r.template_id] = r));
    setRefs(map);
    // The company's own brand kit lives in /admin/brand, never in the public catalogue.
    setTemplates(t.filter((x) => !!x.id && !(x.tags || []).includes('mt-internal')));
    setCategories(c);
  };

  const flash = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice((n) => (n === msg ? null : n)), 4000);
  };

  // ---------- category helpers ----------
  const topLevel = categories.filter((c) => !c.parentId);
  const childrenOf = (id: string) => categories.filter((c) => c.parentId === id);
  const categoryName = (id: string | null | undefined) => categories.find((c) => c.id === id)?.name;
  const categoryOptions = topLevel.flatMap((p) => [
    { id: p.id, label: p.name },
    ...childrenOf(p.id).map((c) => ({ id: c.id, label: `${p.name} › ${c.name}` })),
  ]);

  const counts = useMemo(() => {
    const out: Record<string, number> = { all: templates.length };
    for (const s of TEMPLATE_STATUSES) out[s] = templates.filter((t) => (t.status || 'published') === s).length;
    return out;
  }, [templates]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (statusFilter !== 'all' && (t.status || 'published') !== statusFilter) return false;
      if (catFilter !== 'all' && (categoryName(t.categoryId) || t.category) !== catFilter && t.category !== catFilter) return false;
      if (!q) return true;
      return [t.name, t.category, t.description, ...(t.tags || [])].some((v) => v?.toLowerCase().includes(q));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templates, statusFilter, query, catFilter, categories]);
  useEffect(() => setShown(60), [statusFilter, query, catFilter]);
  const allCats = useMemo(() => [...new Set(templates.map((t) => t.category).filter(Boolean))].sort(), [templates]);

  // ---------- edit ----------
  const startNew = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM, categoryId: categoryOptions[0]?.id || '' });
    setEditing('new');
  };

  // Opens the template's real design in the editor; the editor shows a
  // "Save to template" bar for admins (see app/editor/page.tsx).
  const editDesign = (t: Template) => {
    if (!t.id) return;
    window.location.href = `/editor?w=${t.width}&h=${t.height}&templateId=${t.id}&editTemplate=1`;
  };

  const startEdit = (t: Template) => {
    setFormError(null);
    setForm({
      name: t.name,
      categoryId: t.categoryId || '',
      width: t.width,
      height: t.height,
      color1: t.colors[0],
      color2: t.colors[1],
      description: t.description || '',
      tags: (t.tags || []).join(', '),
      isFeatured: !!t.isFeatured,
      isFree: t.isFree !== false,
      unit: t.unit || 'px',
      dpi: t.dpi || 72,
      occasion: t.occasion || '',
      industry: t.industry || '',
      language: t.language || '',
      searchKeywords: t.searchKeywords || '',
    });
    setEditing(t);
  };

  const save = async () => {
    if (!form.name.trim()) return setFormError('Name is required.');
    if (form.width <= 0 || form.height <= 0) return setFormError('Width and height must be greater than zero.');
    setSaving(true);
    setFormError(null);
    const payload: TemplateInput = {
      name: form.name.trim(),
      category: categoryName(form.categoryId) || 'Uncategorized',
      categoryId: form.categoryId || null,
      width: form.width,
      height: form.height,
      colors: [form.color1, form.color2],
      description: form.description.trim() || null,
      tags: parseTags(form.tags),
      isFeatured: form.isFeatured,
      isFree: form.isFree,
      unit: form.unit,
      dpi: form.dpi,
      occasion: form.occasion.trim() || null,
      industry: form.industry.trim() || null,
      language: form.language.trim() || null,
      searchKeywords: form.searchKeywords.trim() || null,
    };
    if (editing === 'new') {
      const created = userId ? await createTemplate(payload, userId) : null;
      if (created) {
        setTemplates((prev) => [created, ...prev]);
        setEditing(null);
        flash('Draft created. Next: tap ⋮ → Set content.');
      } else setFormError('Could not create the template. Has the database setup (migration 0011) been run?');
    } else if (editing && editing.id) {
      if (await updateTemplate(editing.id, payload)) {
        await reload();
        setEditing(null);
      } else setFormError('Could not save changes.');
    }
    setSaving(false);
  };

  // ---------- actions ----------
  const changeStatus = async (t: Template, status: TemplateStatus) => {
    if (!userId) return;
    setMenuFor(null);
    const problem = await setTemplateStatus(t, status, userId);
    if (problem) return flash(problem);
    await reload();
    flash(`"${t.name}" is now ${STATUS_LABEL[status].toLowerCase()}.`);
    // Spec §34: offer an announcement, but never e-mail anyone automatically.
    if (status === 'published' && window.confirm(`Would you like to announce "${t.name}" by e-mail?`)) {
      router.push(`/admin/email?announce=${t.id}`);
    }
  };

  // ---------- bulk (multi-select) ----------
  const toggle = (id: string) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const selectedList = templates.filter((t) => t.id && selected.has(t.id));
  const runPool = async <T,>(items: T[], fn: (x: T) => Promise<void>, size = 6) => {
    let i = 0;
    await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
  };
  const bulkStatus = async (status: TemplateStatus) => {
    if (!userId || !selectedList.length) return;
    const n = selectedList.length;
    if (!window.confirm(`Change ${n} template${n > 1 ? "s" : ""} to “${STATUS_LABEL[status]}”?`)) return;
    setBulkBusy(`${STATUS_LABEL[status]}…`);
    let ok = 0;
    const failed: string[] = [];
    await runPool<Template>(selectedList, async (t) => {
      const problem = await setTemplateStatus(t, status, userId);
      if (problem) failed.push(`${t.name}: ${problem}`);
      else ok++;
    });
    await reload();
    setSelected(new Set());
    setBulkBusy(null);
    flash(`${ok} template${ok === 1 ? '' : 's'} now ${STATUS_LABEL[status].toLowerCase()}.${failed.length ? ` ${failed.length} skipped — ${failed.slice(0, 2).join('; ')}` : ''}`);
  };
  // Photos → empty photo frames. Reversible: the current design is saved as
  // a version first (Versions → Restore brings it back).
  const bulkRemovePhotos = async () => {
    if (!userId || !selectedList.length) return;
    const n = selectedList.length;
    if (!window.confirm(`Replace the photos in ${n} template${n > 1 ? 's' : ''} with empty photo frames?\n\nLayout, text, colours, logos and graphics stay the same. Each template's current design is saved as a version first, so you can restore it from Versions.`)) return;
    setBulkBusy('Removing photos…');
    let changed = 0, photos = 0, none = 0;
    const failed: string[] = [];
    await runPool<Template>(selectedList, async (t) => {
      try {
        const full = await fetchTemplateById(t.id!);
        if (!full?.canvasJson) return void failed.push(`${t.name}: no design`);
        if (!countPhotosInJson(full.canvasJson)) return void none++;
        const next = await createVersion(full, userId, 'Before removing photos');
        if (!next) return void failed.push(`${t.name}: could not save a backup version`);
        const { json, replaced } = await stripTemplatePhotos(full.canvasJson);
        if (!replaced) return void none++;
        const pages = await renderTemplatePages(json, 1100);
        const ok = await setTemplateContent(t.id!, next, json, pages[0]?.url || null);
        if (!ok) return void failed.push(`${t.name}: could not save`);
        changed++;
        photos += replaced;
      } catch (e: any) {
        failed.push(`${t.name}: ${e?.message || e}`);
      }
    }, 2);
    await reload();
    setSelected(new Set());
    setBulkBusy(null);
    flash(`Replaced ${photos} photo${photos === 1 ? '' : 's'} in ${changed} template${changed === 1 ? '' : 's'}.${none ? ` ${none} had no photos.` : ''}${failed.length ? ` ${failed.length} failed — ${failed.slice(0, 2).join('; ')}` : ''}`);
  };

  const restore = async (v: TemplateVersion) => {
    if (!versionsFor?.id) return;
    if (!window.confirm(`Restore v${v.version}${v.notes ? ` (${v.notes})` : ''} as the current design of “${versionsFor.name}”?`)) return;
    setBusy(true);
    const ok = await restoreVersion(versionsFor.id, v.id);
    setBusy(false);
    await reload();
    flash(ok ? `Restored v${v.version}.` : 'Could not restore that version.');
  };

  const openRef = (t: Template) => {
    setMenuFor(null);
    const r = t.id ? refs[t.id] : undefined;
    setRefFor(t);
    setRefDraft({ url: r?.inspiration_reference_url || '', pin: r?.inspiration_pin_url || '', verified: !!r?.reference_verified, brief: r?.design_brief || t.description || '' });
  };
  const saveRef = async () => {
    if (!refFor?.id) return;
    const url = refDraft.url.trim(), pinUrl = refDraft.pin.trim();
    if (!/^https:\/\/\S+$/.test(url)) return flash('Enter the inspiration link (https://…).');
    if (pinUrl && !/^https:\/\/(www\.|[a-z]{2}\.)?pinterest\.[a-z.]+\/pin\/\d+\/?$/.test(pinUrl)) return flash('A pin link looks like https://www.pinterest.com/pin/123456789/');
    if (refDraft.verified && !pinUrl) return flash('Add the pin link you checked before marking it verified.');
    if (refDraft.brief.trim().length < 20) return flash('Write a short design brief (20+ characters).');
    const existing = refs[refFor.id];
    const row = { inspiration_reference_url: url, inspiration_pin_url: pinUrl || null, reference_type: pinUrl ? 'pinterest_pin' : /pinterest\.[a-z.]+\/search/.test(url) ? 'pinterest_search' : 'other', reference_verified: refDraft.verified && !!pinUrl, design_brief: refDraft.brief.trim(), updated_at: new Date().toISOString() };
    setBusy(true);
    const { error } = existing
      ? await supabase.from('template_references').update(row).eq('template_id', refFor.id)
      : await supabase.from('template_references').insert({ ...row, template_id: refFor.id, manifest_id: `custom-${String(Object.keys(refs).filter((k) => refs[k].manifest_id.startsWith('custom-')).length + 1).padStart(3, '0')}`, collection: 'admin', category: refFor.category || 'Other', subcategory: '' });
    setBusy(false);
    if (error) return flash(`Could not save: ${error.message}`);
    setRefFor(null);
    await reload();
    flash('Inspiration and brief saved.');
  };

  const bulkDelete = async () => {
    const ids = selectedList.map((t) => t.id!).filter(Boolean);
    if (!ids.length) return;
    if (!window.confirm(`Delete ${ids.length} template${ids.length > 1 ? 's' : ''} permanently? Customer designs made from them are not affected. Tip: Archive keeps them instead.`)) return;
    setBulkBusy('Deleting…');
    let ok = 0;
    await runPool<string>(ids, async (id) => { if (await deleteTemplate(id)) ok++; });
    setTemplates((prev) => prev.filter((x) => !x.id || !ids.includes(x.id) || false));
    await reload();
    setSelected(new Set());
    setBulkBusy(null);
    flash(`Deleted ${ok} of ${ids.length}.`);
  };

  const duplicate = async (t: Template) => {
    if (!userId) return;
    setMenuFor(null);
    const copy = await duplicateTemplate(t, userId);
    if (copy) {
      setTemplates((prev) => [copy, ...prev]);
      flash('Duplicated as a new draft.');
    } else flash('Could not duplicate this template.');
  };

  const remove = async (t: Template) => {
    setMenuFor(null);
    if (!t.id) return;
    if (!window.confirm(`Delete "${t.name}" permanently? Customer designs made from it are not affected. Tip: Archive keeps it instead.`)) return;
    if (await deleteTemplate(t.id)) setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    else flash('Could not delete this template.');
  };

  const openContent = async (t: Template) => {
    setMenuFor(null);
    setContentFor(t);
    setDesigns(null);
    try {
      setDesigns((await listProjects()).filter((d) => (d.editor_type || 'design') === 'design'));
    } catch {
      setDesigns([]);
    }
  };

  const applyDesignAsContent = async (d: ProjectSummary) => {
    if (!contentFor?.id) return;
    setBusy(true);
    try {
      const full = await getProject(d.id);
      const ok = await setTemplateContent(contentFor.id, contentFor.currentVersion || '1.0', full.canvas_json, full.thumbnail);
      if (ok && (full.width !== contentFor.width || full.height !== contentFor.height)) {
        await updateTemplate(contentFor.id, {
          name: contentFor.name,
          category: contentFor.category,
          width: full.width,
          height: full.height,
          colors: contentFor.colors,
        });
      }
      await reload();
      setContentFor(null);
      flash(ok ? `Content set from "${d.name}".` : 'Could not set the content.');
    } catch {
      flash('Could not load that design.');
    }
    setBusy(false);
  };

  const uploadMtd = async (t: Template) => {
    setMenuFor(null);
    const picked = await pickMtdFile();
    if (!picked) return;
    try {
      const opened = await readMtd(picked.file);
      setMtdUpload({ template: t, fileName: picked.file.name, opened, result: validateTemplateMtd(opened) });
    } catch (err) {
      flash(err instanceof MtdError ? err.message : 'That file could not be read.');
    }
  };

  const applyMtdUpload = async () => {
    if (!mtdUpload?.template.id) return;
    const { template: t, opened } = mtdUpload;
    setBusy(true);
    const ok = await setTemplateContent(t.id!, t.currentVersion || '1.0', opened.canvas, opened.thumbnail);
    if (ok && (opened.document.width !== t.width || opened.document.height !== t.height)) {
      await updateTemplate(t.id!, { name: t.name, category: t.category, width: opened.document.width, height: opened.document.height, colors: t.colors });
    }
    setBusy(false);
    setMtdUpload(null);
    await reload();
    flash(ok ? `"${t.name}" now uses ${mtdUpload.fileName}.` : 'Could not save the template content.');
  };

  const pickThumbnail = (t: Template) => {
    setMenuFor(null);
    thumbTarget.current = t;
    thumbInput.current?.click();
  };

  const onThumbnailFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const t = thumbTarget.current;
    e.target.value = '';
    if (!file || !t?.id) return;
    setBusy(true);
    const url = await replaceThumbnail(t.id, t.currentVersion || '1.0', file);
    setBusy(false);
    if (url) {
      await reload();
      flash('Thumbnail replaced.');
    } else flash('Could not upload the thumbnail. Has the database setup (migration 0011) been run?');
  };

  const openVersions = async (t: Template) => {
    setMenuFor(null);
    setVersionsFor(t);
    setVersionNotes('');
    setVersions(t.id ? await listVersions(t.id) : []);
  };

  const saveVersion = async () => {
    if (!versionsFor || !userId) return;
    setBusy(true);
    const next = await createVersion(versionsFor, userId, versionNotes.trim() || null);
    setBusy(false);
    if (!next) return flash('Could not save the version.');
    await reload();
    setVersions(versionsFor.id ? await listVersions(versionsFor.id) : []);
    setVersionsFor({ ...versionsFor, currentVersion: next });
    setVersionNotes('');
    flash(`Saved. Edits now continue as version ${next}.`);
  };

  const runGenerate = async () => {
    if (!userId) return;
    setGenerating(true);
    const { created, updated, errors } = await generateStarterTemplates(userId);
    await reload();
    flash(errors.length ? `${created} created, ${updated} updated, ${errors.length} failed.` : `${created} created, ${updated} updated.`);
    setGenerating(false);
  };

  // ---------- categories tab ----------
  const addCategory = async (parentId: string | null) => {
    const name = window.prompt(parentId ? 'New sub-category name' : 'New category name');
    if (!name?.trim()) return;
    if (await createCategory(name, parentId)) setCategories(await fetchCategories());
    else flash('Could not create the category.');
  };
  const rename = async (c: TemplateCategory) => {
    const name = window.prompt('Rename category', c.name);
    if (!name?.trim() || name === c.name) return;
    if (await renameCategory(c.id, name)) setCategories(await fetchCategories());
  };
  const removeCategory = async (c: TemplateCategory) => {
    const used = templates.filter((t) => t.categoryId === c.id).length;
    if (!window.confirm(`Delete "${c.name}"?${used ? ` ${used} template(s) will become uncategorized.` : ''}`)) return;
    if (await deleteCategory(c.id)) setCategories(await fetchCategories());
  };

  // ---------- render ----------
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-mt-faint">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-mt-ink">Not authorized</p>
        <p className="text-sm text-mt-muted max-w-sm">This page is only available to admin accounts.</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <AdminShell active="templates" title="Template Manager" accent="Template" subtitle="Templates are provided by Magical Touch Design. Customers only see published ones." actions={<Link href="/templates" target="_blank" className="h-9 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 border border-mt-border text-mt-ink hover:bg-mt-surface2">View the gallery</Link>}>
    <div onClick={() => setMenuFor(null)}>
      <input ref={thumbInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onThumbnailFile} />


      <div className="">
        <div className="flex gap-1 border-b">
          {(['templates', 'images', 'categories'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === t ? 'border-mt-accent text-mt-accent' : 'border-transparent text-mt-muted'}`}
            >
              {t === 'templates' ? 'Templates' : t === 'images' ? 'Image library' : 'Categories'}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="mt-3">
          <div className="text-sm bg-mt-accentsoft text-[#4B2FB0] rounded-lg px-4 py-2.5">{notice}</div>
        </div>
      )}

      {tab === 'images' ? (
        <ImageLibrary />
      ) : tab === 'templates' ? (
        <section className="py-4 sm:py-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, tag, category…" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm bg-mt-surface" />
            </div>
            <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} aria-label="Category" className="py-2 px-3 border rounded-full text-sm bg-mt-surface text-mt-ink">
              <option value="all">All categories</option>
              {allCats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={runGenerate} disabled={generating} className="text-sm font-medium text-mt-ink bg-mt-surface border rounded-full px-4 py-2 disabled:opacity-50">
              {generating ? 'Generating…' : 'Generate starter templates'}
            </button>
            <button onClick={startNew} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2">
              <Plus size={15} /> New template
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {(['all', ...TEMPLATE_STATUSES] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border ${statusFilter === s ? 'bg-[#14121F] text-white border-[#14121F]' : 'bg-mt-surface text-mt-muted'}`}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]} <span className="opacity-60">{counts[s] || 0}</span>
              </button>
            ))}
          </div>

          <div className="sticky top-2 z-20 mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-mt-border bg-mt-surface/95 backdrop-blur px-3 py-2 shadow-sm" onClick={(e) => e.stopPropagation()}>
            <label className="inline-flex items-center gap-2 text-sm text-mt-ink cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 accent-[#3B82C4]"
                checked={visible.length > 0 && visible.every((t) => t.id && selected.has(t.id))}
                onChange={(e) => setSelected(e.target.checked ? new Set(visible.map((t) => t.id!).filter(Boolean)) : new Set())}
                aria-label="Select all shown"
              />
              {selected.size ? <b>{selected.size} selected</b> : <span className="text-mt-muted">Select all {visible.length}</span>}
            </label>
            {selected.size > 0 && (
              <>
                <span className="w-px h-5 bg-mt-border mx-1" />
                {bulkBusy ? (
                  <span className="text-sm text-mt-muted">{bulkBusy}</span>
                ) : (
                  <>
                    <button onClick={() => bulkStatus('published')} className="h-8 px-3 rounded-full text-[13px] font-semibold bg-emerald-600 text-white">Publish</button>
                    <button onClick={() => bulkStatus('unpublished')} className="h-8 px-3 rounded-full text-[13px] font-medium border border-mt-border text-mt-ink hover:bg-mt-surface2">Unpublish</button>
                    <button onClick={() => bulkStatus('draft')} className="h-8 px-3 rounded-full text-[13px] font-medium border border-mt-border text-mt-ink hover:bg-mt-surface2">Move to draft</button>
                    <button onClick={() => bulkStatus('archived')} className="h-8 px-3 rounded-full text-[13px] font-medium border border-mt-border text-mt-ink hover:bg-mt-surface2">Archive</button>
                    <button onClick={bulkRemovePhotos} className="h-8 px-3 rounded-full text-[13px] font-medium border border-mt-border text-mt-ink hover:bg-mt-surface2" title="Replace photos with empty photo frames (reversible)">Remove photos</button>
                    <button onClick={bulkDelete} className="h-8 px-3 rounded-full text-[13px] font-semibold bg-rose-600 text-white">Delete</button>
                    <button onClick={() => setSelected(new Set())} className="h-8 px-3 rounded-full text-[13px] text-mt-muted hover:text-mt-ink">Clear</button>
                  </>
                )}
              </>
            )}
            <span className="ml-auto text-[12px] text-mt-faint">Tip: tick the box on any card to select it</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.slice(0, shown).map((t) => {
              const status = (t.status || 'published') as TemplateStatus;
              return (
                <div key={t.id} className={`bg-mt-surface border rounded-xl flex flex-col ${t.id && selected.has(t.id) ? 'ring-2 ring-[#3B82C4] border-transparent' : ''}`}>
                  <div className="relative h-40 bg-mt-surface2 rounded-t-xl overflow-hidden cursor-pointer" onClick={(e) => { e.stopPropagation(); if (t.id && (selected.size || e.shiftKey || e.metaKey || e.ctrlKey)) toggle(t.id); }}>
                    {t.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt="" loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-mt-faint" style={{ background: `linear-gradient(135deg, ${t.colors[0]}22, ${t.colors[1]}22)` }}>
                        No thumbnail yet
                      </div>
                    )}
                    <label className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white/90 shadow flex items-center justify-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="w-4 h-4 accent-[#3B82C4]" checked={!!t.id && selected.has(t.id)} onChange={() => t.id && toggle(t.id)} aria-label={`Select ${t.name}`} />
                    </label>
                    <span className={`absolute top-2 left-11 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {t.isFeatured && <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-mt-creative text-[#09090B]">Featured</span>}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-mt-ink truncate">{t.name}</p>
                        <p className="text-xs text-mt-muted mt-0.5">
                          {categoryName(t.categoryId) || t.category} · {t.width}×{t.height} · v{t.currentVersion || '1.0'}
                        </p>
                        {t.id && refs[t.id] && (
                          <p className="text-[11px] mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-mono text-mt-faint">{refs[t.id].manifest_id}</span>
                            <a href={refs[t.id].reference_verified && refs[t.id].inspiration_pin_url ? refs[t.id].inspiration_pin_url! : refs[t.id].inspiration_reference_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-[#3B82C4] hover:underline" onClick={(e) => e.stopPropagation()}>View inspiration ↗</a>
                            <span className={refs[t.id].reference_verified ? 'text-emerald-600' : 'text-mt-faint'}>{refs[t.id].reference_verified ? 'verified pin' : 'search link · unverified'}</span>
                          </p>
                        )}
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuFor(menuFor === t.id ? null : t.id!)} className="p-1.5 rounded hover:bg-mt-surface2 text-mt-muted" aria-label="Actions">
                          <MoreVertical size={16} />
                        </button>
                        {menuFor === t.id && (
                          <div className="absolute right-0 top-8 z-30 w-64 max-h-[70vh] overflow-y-auto bg-mt-surface border rounded-lg shadow-lg py-1 text-sm">
                            <MenuItem onClick={() => { setMenuFor(null); editDesign(t); }}>Edit design (colours, text, elements)</MenuItem>
                            <MenuItem onClick={() => { setMenuFor(null); startEdit(t); }}>Edit details (name, category, tags)</MenuItem>
                            <MenuItem onClick={() => openContent(t)}>Set content from a design</MenuItem>
                            <MenuItem onClick={() => uploadMtd(t)}>Upload .mtd file</MenuItem>
                            <MenuItem onClick={() => pickThumbnail(t)}>Replace thumbnail</MenuItem>
                            <MenuItem onClick={() => { setMenuFor(null); window.open(`/templates?template=${t.id}`, '_blank'); }}>Preview</MenuItem>
                            <MenuItem onClick={() => duplicate(t)}>Duplicate</MenuItem>
                            <MenuItem onClick={() => openVersions(t)}>Versions…</MenuItem>
                            <MenuItem onClick={() => openRef(t)}>Inspiration & brief…</MenuItem>
                            <div className="border-t my-1" />
                            {status !== 'review' && status !== 'published' && <MenuItem onClick={() => changeStatus(t, 'review')}>Send to review</MenuItem>}
                            {status !== 'published' && <MenuItem onClick={() => changeStatus(t, 'published')}>Publish</MenuItem>}
                            {status === 'published' && <MenuItem onClick={() => changeStatus(t, 'unpublished')}>Unpublish</MenuItem>}
                            {status !== 'draft' && status !== 'published' && <MenuItem onClick={() => changeStatus(t, 'draft')}>Back to draft</MenuItem>}
                            {status !== 'archived' && <MenuItem onClick={() => changeStatus(t, 'archived')}>Archive</MenuItem>}
                            <div className="border-t my-1" />
                            <MenuItem danger onClick={() => remove(t)}>Delete</MenuItem>
                          </div>
                        )}
                      </div>
                    </div>
                    {!!t.tags?.length && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {t.tags.slice(0, 6).map((tag) => (
                          <span key={tag} className="text-[10px] bg-mt-surface2 text-mt-muted rounded px-1.5 py-0.5">#{tag}</span>
                        ))}
                      </div>
                    )}
                    <div className="mt-auto pt-3 grid grid-cols-2 gap-2">
                      <button onClick={() => editDesign(t)} className="text-xs font-semibold text-white bg-brand-gradient rounded-full px-3 py-2">
                        Edit design
                      </button>
                      <button onClick={() => startEdit(t)} className="text-xs font-medium text-mt-ink border rounded-full px-3 py-2 hover:bg-mt-surface2">
                        Edit details
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {visible.length > shown && (
            <div className="mt-6 flex justify-center">
              <button onClick={() => setShown((n) => n + 120)} className="h-10 px-5 rounded-full border border-mt-border text-sm font-medium text-mt-ink hover:bg-mt-surface2">Show more ({visible.length - shown} left)</button>
            </div>
          )}
          {visible.length === 0 && <p className="text-center text-sm text-mt-faint py-16">No templates here yet.</p>}
        </section>
      ) : (
        <section className="max-w-3xl py-4 sm:py-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-mt-muted">Add categories any time — no code changes needed.</p>
            <button onClick={() => addCategory(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2">
              <Plus size={15} /> Category
            </button>
          </div>
          <div className="bg-mt-surface border rounded-xl divide-y">
            {topLevel.map((p) => (
              <div key={p.id} className="p-3">
                <CategoryRow c={p} count={templates.filter((t) => t.categoryId === p.id).length} onAdd={() => addCategory(p.id)} onRename={() => rename(p)} onDelete={() => removeCategory(p)} />
                <div className="ml-5 mt-1">
                  {childrenOf(p.id).map((c) => (
                    <CategoryRow key={c.id} c={c} count={templates.filter((t) => t.categoryId === c.id).length} onRename={() => rename(c)} onDelete={() => removeCategory(c)} />
                  ))}
                </div>
              </div>
            ))}
            {topLevel.length === 0 && <p className="p-6 text-center text-sm text-mt-faint">No categories yet. Run the database setup (migration 0011) to add the default list.</p>}
          </div>
        </section>
      )}

      {/* ---------- Edit details ---------- */}
      {editing && (
        <Modal title={editing === 'new' ? 'New template' : 'Edit template'} onClose={() => setEditing(null)}>
          {formError && <p className="text-xs text-red-500 mb-3">{formError}</p>}
          <div className="grid grid-cols-2 gap-3">
            <label className={`${label} col-span-2`}>Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} /></label>
            <label className={`${label} col-span-2`}>
              Category
              <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={input}>
                <option value="">Uncategorized</option>
                {categoryOptions.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </label>
            <label className={`${label} col-span-2`}>Description<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} /></label>
            <label className={`${label} col-span-2`}>Tags (comma separated)<input value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="business, modern, blue" className={input} /></label>
            <label className={label}>Width<input type="number" min={1} value={form.width} onChange={(e) => setForm({ ...form, width: parseInt(e.target.value, 10) || 0 })} className={input} /></label>
            <label className={label}>Height<input type="number" min={1} value={form.height} onChange={(e) => setForm({ ...form, height: parseInt(e.target.value, 10) || 0 })} className={input} /></label>
            <label className={label}>
              Unit
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={input}>
                {['px', 'mm', 'cm', 'in'].map((u) => <option key={u}>{u}</option>)}
              </select>
            </label>
            <label className={label}>DPI<input type="number" min={36} value={form.dpi} onChange={(e) => setForm({ ...form, dpi: parseInt(e.target.value, 10) || 72 })} className={input} /></label>
            <label className={label}>Occasion<input value={form.occasion} onChange={(e) => setForm({ ...form, occasion: e.target.value })} placeholder="Wedding, Diwali…" className={input} /></label>
            <label className={label}>Industry<input value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })} placeholder="Restaurant, Real estate…" className={input} /></label>
            <label className={label}>Language<input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} placeholder="English" className={input} /></label>
            <label className={label}>Search keywords<input value={form.searchKeywords} onChange={(e) => setForm({ ...form, searchKeywords: e.target.value })} className={input} /></label>
            <label className={label}>Color 1<input type="color" value={form.color1} onChange={(e) => setForm({ ...form, color1: e.target.value })} className="mt-1 w-full h-9 border rounded-lg" /></label>
            <label className={label}>Color 2<input type="color" value={form.color2} onChange={(e) => setForm({ ...form, color2: e.target.value })} className="mt-1 w-full h-9 border rounded-lg" /></label>
            <label className="col-span-1 flex items-center gap-2 text-sm text-mt-ink"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            <label className="col-span-1 flex items-center gap-2 text-sm text-mt-ink"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free</label>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditing(null)} className="text-sm px-4 py-2 rounded-full border text-mt-muted">Cancel</button>
            <button onClick={save} disabled={saving} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* ---------- Set content ---------- */}
      {contentFor && (
        <Modal title={`Set content: ${contentFor.name}`} onClose={() => !busy && setContentFor(null)}>
          <p className="text-xs text-mt-muted mb-3">
            Design the template in the editor and save it, then pick it here. The template gets its own copy — later changes to your design won&apos;t affect it.
          </p>
          {designs === null ? (
            <p className="text-sm text-mt-faint py-6 text-center">Loading your designs…</p>
          ) : designs.length === 0 ? (
            <p className="text-sm text-mt-faint py-6 text-center">No saved designs yet. <Link href="/create" className="text-mt-accent">Create one</Link>.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
              {designs.map((d) => (
                <button key={d.id} disabled={busy} onClick={() => applyDesignAsContent(d)} className="text-left border rounded-lg overflow-hidden hover:border-mt-accent disabled:opacity-50">
                  <div className="h-24 bg-mt-surface2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {d.thumbnail && <img src={d.thumbnail} alt="" loading="lazy" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs font-medium text-mt-ink px-2 py-1.5 truncate">{d.name}</p>
                </button>
              ))}
            </div>
          )}
          {busy && <p className="text-xs text-mt-accent mt-3">Saving content and images…</p>}
        </Modal>
      )}

      {/* ---------- Upload .mtd: validation report ---------- */}
      {mtdUpload && (
        <Modal title={`Upload: ${mtdUpload.fileName}`} onClose={() => !busy && setMtdUpload(null)}>
          <p className="text-xs text-mt-muted mb-3">
            {mtdUpload.opened.document.width}×{mtdUpload.opened.document.height}px · {mtdUpload.result.stats.layers} layers · {mtdUpload.result.stats.images} images ·{' '}
            {mtdUpload.result.stats.texts} text · fonts: {mtdUpload.result.stats.fonts.join(', ') || 'none'}
          </p>
          {mtdUpload.opened.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mtdUpload.opened.thumbnail} alt="" className="w-full max-h-48 object-contain bg-mt-surface2 rounded-lg mb-3" />
          )}
          {mtdUpload.result.errors.length > 0 ? (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm mb-3">
              <p className="font-semibold mb-1">Template validation failed.</p>
              <ul className="list-disc pl-5 space-y-0.5">
                {mtdUpload.result.errors.map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          ) : (
            <p className="bg-emerald-50 text-emerald-700 rounded-lg p-3 text-sm mb-3 font-medium">Checks passed. This file can be used.</p>
          )}
          {mtdUpload.result.warnings.length > 0 && (
            <ul className="text-xs text-amber-700 list-disc pl-5 mb-3 space-y-0.5">
              {mtdUpload.result.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button onClick={() => setMtdUpload(null)} disabled={busy} className="text-sm px-4 py-2 rounded-full border text-mt-muted">Cancel</button>
            <button
              onClick={applyMtdUpload}
              disabled={busy || mtdUpload.result.errors.length > 0}
              className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-40"
            >
              {busy ? 'Saving…' : `Use for "${mtdUpload.template.name}"`}
            </button>
          </div>
        </Modal>
      )}

      {/* ---------- Versions ---------- */}
      {refFor && (
        <Modal title={`Inspiration & brief: ${refFor.name}`} onClose={() => !busy && setRefFor(null)}>
          <div className="flex flex-col gap-3 text-sm">
            <label className="text-[13px] font-medium text-mt-ink">Inspiration link (search or page)
              <input value={refDraft.url} onChange={(e) => setRefDraft({ ...refDraft, url: e.target.value })} placeholder="https://www.pinterest.com/search/pins/?q=…" className="mt-1 w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
            <label className="text-[13px] font-medium text-mt-ink">Specific pin you checked (optional)
              <input value={refDraft.pin} onChange={(e) => setRefDraft({ ...refDraft, pin: e.target.value })} placeholder="https://www.pinterest.com/pin/…" className="mt-1 w-full h-10 rounded-xl border border-mt-input-border bg-mt-surface px-3 text-sm" />
            </label>
            <label className="inline-flex items-center gap-2 text-[13px] text-mt-ink">
              <input type="checkbox" checked={refDraft.verified} onChange={(e) => setRefDraft({ ...refDraft, verified: e.target.checked })} className="w-4 h-4" /> I opened this pin myself and it matches the design
            </label>
            <label className="text-[13px] font-medium text-mt-ink">Design brief
              <textarea value={refDraft.brief} onChange={(e) => setRefDraft({ ...refDraft, brief: e.target.value })} rows={4} className="mt-1 w-full rounded-xl border border-mt-input-border bg-mt-surface px-3 py-2 text-sm" />
            </label>
            {refFor.id && refs[refFor.id]?.design_notes && Object.keys(refs[refFor.id].design_notes || {}).length > 0 && (
              <dl className="rounded-xl bg-mt-surface2 p-3 grid grid-cols-[90px_1fr] gap-x-3 gap-y-1 text-[12px]">
                {Object.entries(refs[refFor.id].design_notes as Record<string, string>).map(([k, v]) => (<Fragment key={k}><dt className="text-mt-muted capitalize">{k}</dt><dd className="text-mt-ink">{String(v)}</dd></Fragment>))}
              </dl>
            )}
            <div className="flex gap-2 justify-end">
              {refDraft.url && <a href={refDraft.url} target="_blank" rel="noopener noreferrer" className="text-sm px-4 py-2 rounded-full border border-mt-border">Open link ↗</a>}
              <button onClick={saveRef} disabled={busy} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-50">Save</button>
            </div>
          </div>
        </Modal>
      )}
      {versionsFor && (
        <Modal title={`Versions: ${versionsFor.name}`} onClose={() => !busy && setVersionsFor(null)}>
          <p className="text-xs text-mt-muted mb-3">
            Currently editing <strong>v{versionsFor.currentVersion || '1.0'}</strong>. Saving a version freezes it forever; customer designs never change when you update a template.
          </p>
          <div className="flex gap-2 mb-4">
            <input value={versionNotes} onChange={(e) => setVersionNotes(e.target.value)} placeholder="What changed? (optional)" className="flex-1 border rounded-lg px-2.5 py-2 text-sm" />
            <button onClick={saveVersion} disabled={busy} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-50 shrink-0">
              Save v{versionsFor.currentVersion || '1.0'}
            </button>
          </div>
          <div className="divide-y border rounded-lg max-h-[45vh] overflow-y-auto">
            {versions.map((v) => (
              <div key={v.id} className="flex items-center gap-3 p-2.5">
                <div className="w-14 h-10 bg-mt-surface2 rounded shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-contain" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-mt-ink">v{v.version}</p>
                  <p className="text-xs text-mt-muted truncate">{new Date(v.createdAt).toLocaleString()} {v.notes ? `· ${v.notes}` : ''}</p>
                </div>
                <button onClick={() => restore(v)} disabled={busy} className="ml-auto text-xs px-3 py-1.5 rounded-full border border-mt-border text-mt-ink hover:bg-mt-surface2 disabled:opacity-50 shrink-0">Restore</button>
              </div>
            ))}
            {versions.length === 0 && <p className="p-4 text-center text-xs text-mt-faint">No saved versions yet. Publishing saves one automatically.</p>}
          </div>
        </Modal>
      )}
    </div>
    </AdminShell>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 hover:bg-mt-surface2 ${danger ? 'text-red-600' : 'text-mt-ink'}`}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-mt-surface rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-mt-ink">{title}</h2>
          <button onClick={onClose} className="p-1 text-mt-faint hover:text-mt-muted" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryRow({ c, count, onAdd, onRename, onDelete }: { c: TemplateCategory; count: number; onAdd?: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-mt-ink">
        {c.name} <span className="text-xs text-mt-faint">({count})</span>
      </span>
      <span className="flex gap-3 text-xs">
        {onAdd && <button onClick={onAdd} className="text-mt-accent">+ Sub</button>}
        <button onClick={onRename} className="text-mt-muted">Rename</button>
        <button onClick={onDelete} className="text-red-500">Delete</button>
      </span>
    </div>
  );
}


// Every photo already used in our templates, with the templates that use it
// and search words — reuse them when building new templates (open a design
// and use the Photos panel in the editor, or copy the address).
function ImageLibrary() {
  const [all, setAll] = useState<LibraryPhoto[] | null>(null);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  useEffect(() => { loadPhotoLibrary().then(setAll); }, []);
  const list = useMemo(() => filterPhotos(all || [], q), [all, q]);
  const copy = (src: string) => navigator.clipboard?.writeText(src).then(() => { setCopied(src); setTimeout(() => setCopied(null), 1200); });
  return (
    <section className="py-4 sm:py-6">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-mt-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search photos by subject or template…" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm bg-mt-surface" />
        </div>
        <p className="text-[13px] text-mt-muted">{all ? `${list.length} of ${all.length} photos` : 'Loading…'} · In the editor, open <b>Photos</b> on the left to add any of these to a design.</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {list.map((p) => (
          <div key={p.file} className="bg-mt-surface border rounded-xl overflow-hidden flex flex-col">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.thumb} alt={p.tags.slice(0, 3).join(', ')} loading="lazy" className="w-full aspect-[4/3] object-cover bg-mt-surface2" />
            <div className="p-2.5 flex-1 flex flex-col gap-1.5">
              <p className="text-[12px] font-mono text-mt-muted">{p.file} · {p.w}×{p.h}</p>
              <div className="flex flex-wrap gap-1">{p.tags.slice(0, 5).map((t) => <span key={t} className="text-[10px] bg-mt-surface2 text-mt-muted rounded px-1.5 py-0.5">{t}</span>)}</div>
              <p className="text-[12px] text-mt-muted">Used in {p.uses} template{p.uses === 1 ? '' : 's'}</p>
              {p.templates.slice(0, 3).map((t) => t.slug ? <a key={t.slug} href={`/templates/${t.slug}`} target="_blank" className="text-[12px] text-[#3B82C4] truncate hover:underline">{t.name}</a> : <span key={t.name} className="text-[12px] truncate">{t.name}</span>)}
              <button onClick={() => copy(p.src)} className="mt-auto text-[12px] font-medium border rounded-full px-3 py-1.5 hover:bg-mt-surface2">{copied === p.src ? 'Copied' : 'Copy image address'}</button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
