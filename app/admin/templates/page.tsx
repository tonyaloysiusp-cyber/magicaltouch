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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MoreVertical, Plus, Search, X } from 'lucide-react';
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
  generateStarterTemplates,
  parseTags,
} from '@/lib/templatesData';

const STATUS_STYLE: Record<TemplateStatus, string> = {
  draft: 'bg-gray-100 text-gray-600',
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

const input = 'mt-1 w-full border rounded-lg px-2.5 py-2 text-sm text-gray-800 bg-white';
const label = 'text-xs text-gray-500';

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<'templates' | 'categories'>('templates');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<TemplateCategory[]>([]);
  const [statusFilter, setStatusFilter] = useState<TemplateStatus | 'all'>('all');
  const [query, setQuery] = useState('');
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
    const [t, c] = await Promise.all([fetchTemplates(), fetchCategories()]);
    setTemplates(t.filter((x) => !!x.id));
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
      if (!q) return true;
      return [t.name, t.category, t.description, ...(t.tags || [])].some((v) => v?.toLowerCase().includes(q));
    });
  }, [templates, statusFilter, query]);

  // ---------- edit ----------
  const startNew = () => {
    setFormError(null);
    setForm({ ...EMPTY_FORM, categoryId: categoryOptions[0]?.id || '' });
    setEditing('new');
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
  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">Not authorized</p>
        <p className="text-sm text-gray-500 max-w-sm">This page is only available to admin accounts.</p>
        <Link href="/dashboard" className="text-sm text-[#6C4FD1] hover:underline">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" onClick={() => setMenuFor(null)}>
      <input ref={thumbInput} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onThumbnailFile} />

      <header className="bg-white border-b px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Template Manager</h1>
          <p className="text-xs text-gray-500 mt-0.5">Templates are provided by Magical Touch Design. Customers only see published ones.</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/templates" target="_blank" className="text-[#6C4FD1] hover:underline">View gallery</Link>
          <Link href="/admin/email" className="text-[#6C4FD1] hover:underline">Email Center</Link>
          <Link href="/dashboard" className="text-gray-500 hover:underline">Dashboard</Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-4">
        <div className="flex gap-1 border-b">
          {(['templates', 'categories'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium -mb-px border-b-2 ${tab === t ? 'border-[#6C4FD1] text-[#6C4FD1]' : 'border-transparent text-gray-500'}`}
            >
              {t === 'templates' ? 'Templates' : 'Categories'}
            </button>
          ))}
        </div>
      </div>

      {notice && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-3">
          <div className="text-sm bg-[#F3F0FF] text-[#4B2FB0] rounded-lg px-4 py-2.5">{notice}</div>
        </div>
      )}

      {tab === 'templates' ? (
        <main className="max-w-6xl mx-auto p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, tag, category…" className="w-full pl-9 pr-3 py-2 border rounded-full text-sm bg-white" />
            </div>
            <button onClick={runGenerate} disabled={generating} className="text-sm font-medium text-gray-700 bg-white border rounded-full px-4 py-2 disabled:opacity-50">
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
                className={`shrink-0 text-xs font-medium rounded-full px-3 py-1.5 border ${statusFilter === s ? 'bg-[#14121F] text-white border-[#14121F]' : 'bg-white text-gray-600'}`}
              >
                {s === 'all' ? 'All' : STATUS_LABEL[s]} <span className="opacity-60">{counts[s] || 0}</span>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visible.map((t) => {
              const status = (t.status || 'published') as TemplateStatus;
              return (
                <div key={t.id} className="bg-white border rounded-xl overflow-hidden flex flex-col">
                  <div className="relative h-40 bg-gray-100">
                    {t.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.thumbnail} alt="" loading="lazy" className="w-full h-full object-contain" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400" style={{ background: `linear-gradient(135deg, ${t.colors[0]}22, ${t.colors[1]}22)` }}>
                        No thumbnail yet
                      </div>
                    )}
                    <span className={`absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${STATUS_STYLE[status]}`}>
                      {STATUS_LABEL[status]}
                    </span>
                    {t.isFeatured && <span className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#6C4FD1] text-white">Featured</span>}
                  </div>
                  <div className="p-3 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 truncate">{t.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {categoryName(t.categoryId) || t.category} · {t.width}×{t.height} · v{t.currentVersion || '1.0'}
                        </p>
                      </div>
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setMenuFor(menuFor === t.id ? null : t.id!)} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" aria-label="Actions">
                          <MoreVertical size={16} />
                        </button>
                        {menuFor === t.id && (
                          <div className="absolute right-0 top-8 z-20 w-52 bg-white border rounded-lg shadow-lg py-1 text-sm">
                            <MenuItem onClick={() => { setMenuFor(null); startEdit(t); }}>Edit details</MenuItem>
                            <MenuItem onClick={() => openContent(t)}>Set content from a design</MenuItem>
                            <MenuItem onClick={() => uploadMtd(t)}>Upload .mtd file</MenuItem>
                            <MenuItem onClick={() => pickThumbnail(t)}>Replace thumbnail</MenuItem>
                            <MenuItem onClick={() => { setMenuFor(null); window.open(`/templates?template=${t.id}`, '_blank'); }}>Preview</MenuItem>
                            <MenuItem onClick={() => duplicate(t)}>Duplicate</MenuItem>
                            <MenuItem onClick={() => openVersions(t)}>Versions…</MenuItem>
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
                          <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">#{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {visible.length === 0 && <p className="text-center text-sm text-gray-400 py-16">No templates here yet.</p>}
        </main>
      ) : (
        <main className="max-w-3xl mx-auto p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Add categories any time — no code changes needed.</p>
            <button onClick={() => addCategory(null)} className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2">
              <Plus size={15} /> Category
            </button>
          </div>
          <div className="bg-white border rounded-xl divide-y">
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
            {topLevel.length === 0 && <p className="p-6 text-center text-sm text-gray-400">No categories yet. Run the database setup (migration 0011) to add the default list.</p>}
          </div>
        </main>
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
            <label className="col-span-1 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
            <label className="col-span-1 flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={form.isFree} onChange={(e) => setForm({ ...form, isFree: e.target.checked })} /> Free</label>
          </div>
          <div className="flex justify-end gap-2 mt-5">
            <button onClick={() => setEditing(null)} className="text-sm px-4 py-2 rounded-full border text-gray-600">Cancel</button>
            <button onClick={save} disabled={saving} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {/* ---------- Set content ---------- */}
      {contentFor && (
        <Modal title={`Set content: ${contentFor.name}`} onClose={() => !busy && setContentFor(null)}>
          <p className="text-xs text-gray-500 mb-3">
            Design the template in the editor and save it, then pick it here. The template gets its own copy — later changes to your design won&apos;t affect it.
          </p>
          {designs === null ? (
            <p className="text-sm text-gray-400 py-6 text-center">Loading your designs…</p>
          ) : designs.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">No saved designs yet. <Link href="/create" className="text-[#6C4FD1]">Create one</Link>.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[55vh] overflow-y-auto">
              {designs.map((d) => (
                <button key={d.id} disabled={busy} onClick={() => applyDesignAsContent(d)} className="text-left border rounded-lg overflow-hidden hover:border-[#6C4FD1] disabled:opacity-50">
                  <div className="h-24 bg-gray-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {d.thumbnail && <img src={d.thumbnail} alt="" loading="lazy" className="w-full h-full object-contain" />}
                  </div>
                  <p className="text-xs font-medium text-gray-700 px-2 py-1.5 truncate">{d.name}</p>
                </button>
              ))}
            </div>
          )}
          {busy && <p className="text-xs text-[#6C4FD1] mt-3">Saving content and images…</p>}
        </Modal>
      )}

      {/* ---------- Upload .mtd: validation report ---------- */}
      {mtdUpload && (
        <Modal title={`Upload: ${mtdUpload.fileName}`} onClose={() => !busy && setMtdUpload(null)}>
          <p className="text-xs text-gray-500 mb-3">
            {mtdUpload.opened.document.width}×{mtdUpload.opened.document.height}px · {mtdUpload.result.stats.layers} layers · {mtdUpload.result.stats.images} images ·{' '}
            {mtdUpload.result.stats.texts} text · fonts: {mtdUpload.result.stats.fonts.join(', ') || 'none'}
          </p>
          {mtdUpload.opened.thumbnail && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mtdUpload.opened.thumbnail} alt="" className="w-full max-h-48 object-contain bg-gray-100 rounded-lg mb-3" />
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
            <button onClick={() => setMtdUpload(null)} disabled={busy} className="text-sm px-4 py-2 rounded-full border text-gray-600">Cancel</button>
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
      {versionsFor && (
        <Modal title={`Versions: ${versionsFor.name}`} onClose={() => !busy && setVersionsFor(null)}>
          <p className="text-xs text-gray-500 mb-3">
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
                <div className="w-14 h-10 bg-gray-100 rounded shrink-0 overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.thumbnail && <img src={v.thumbnail} alt="" className="w-full h-full object-contain" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">v{v.version}</p>
                  <p className="text-xs text-gray-500 truncate">{new Date(v.createdAt).toLocaleString()} {v.notes ? `· ${v.notes}` : ''}</p>
                </div>
              </div>
            ))}
            {versions.length === 0 && <p className="p-4 text-center text-xs text-gray-400">No saved versions yet. Publishing saves one automatically.</p>}
          </div>
        </Modal>
      )}
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${danger ? 'text-red-600' : 'text-gray-700'}`}>
      {children}
    </button>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600" aria-label="Close"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CategoryRow({ c, count, onAdd, onRename, onDelete }: { c: TemplateCategory; count: number; onAdd?: () => void; onRename: () => void; onDelete: () => void }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm text-gray-800">
        {c.name} <span className="text-xs text-gray-400">({count})</span>
      </span>
      <span className="flex gap-3 text-xs">
        {onAdd && <button onClick={onAdd} className="text-[#6C4FD1]">+ Sub</button>}
        <button onClick={onRename} className="text-gray-500">Rename</button>
        <button onClick={onDelete} className="text-red-500">Delete</button>
      </span>
    </div>
  );
}
