'use client';

// Admin → Content → Template Manager.
// One simple place to run the template library:
//  • left: the category tree — add, rename, move, reorder and delete
//    categories (their templates are moved, never lost);
//  • right: a large-preview grid that loads 48 at a time from the
//    database, with tabs for Published / Hidden / Drafts / Bin;
//  • per template: Edit design, Edit details, Duplicate, Publish/Hide,
//    Move to bin; and the same actions in bulk for a selection.
// "Move to bin" hides a template and keeps its page redirecting to its
// category. Only the Bin tab can delete forever, after typing DELETE.
// Every change is written to the template audit log.

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Eye, EyeOff, ExternalLink, FolderInput, FolderPlus,
  Loader2, MoreHorizontal, Pencil, Plus, RefreshCw, RotateCcw, Search, Settings2, Trash2, Wand2, X, LayoutGrid, Rows3, Folder, FolderOpen,
} from 'lucide-react';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { categorySlug } from '@/lib/templates/review';
import {
  BIN_TAG, Cat, CatNode, binTags, buildTree, canMoveUnder, copyName, flatten, inBin, rootName, sizeLabel, unbin, uniqueSlug, withDescendants,
} from '@/lib/templates/manage';

type Tab = 'all' | 'published' | 'unpublished' | 'draft' | 'bin';
type Row = {
  id: string; name: string; slug: string | null; category: string | null; category_id: string | null; status: string; tags: string[] | null;
  thumbnail: string | null; width: number; height: number; is_free: boolean | null; is_featured: boolean | null; description: string | null;
  search_keywords: string | null; updated_at: string | null; created_at: string | null;
};

const COLS = 'id,name,slug,category,category_id,status,tags,thumbnail,width,height,is_free,is_featured,description,search_keywords,updated_at,created_at';
const PAGE = 48;
const BRAND_TAGS = '{mt-internal,brand-promo}';
const TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' }, { id: 'published', label: 'Published' }, { id: 'unpublished', label: 'Hidden' }, { id: 'draft', label: 'Drafts' }, { id: 'bin', label: 'Bin' },
];
const COLLECTIONS: [string, string][] = [['', 'All collections'], ['universe-2026-11', 'Creative Universe'], ['pro-pilot-2026-11', 'Pro brand sets'], ['birthday-pro-2026-11', 'Birthday collection'], ['diwali-pro-2026-11', 'Diwali Pro'], ['albums-2026-11', 'Photo albums'], ['collection-500', 'Collection 500'], ['wave-2026-11', 'Wave 2'], ['mass-collection', 'Mass collection']];
const field = 'h-9 rounded-lg border border-mt-input-border bg-mt-surface px-2.5 text-[13px] text-mt-ink';
const btn = 'inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold border border-mt-border bg-mt-surface text-mt-ink hover:border-mt-ink/40 disabled:opacity-50';
const iconBtn = 'inline-grid place-items-center shrink-0 h-8 w-8 rounded-lg border border-mt-border bg-mt-surface text-mt-ink hover:border-mt-ink/40 disabled:opacity-50';
const btnDark = 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-mt-primary text-mt-onprimary hover:opacity-90 disabled:opacity-50';
const STATUS_BADGE: Record<string, string> = { published: 'bg-emerald-600 text-white', unpublished: 'bg-zinc-700 text-white', draft: 'bg-amber-500 text-white' };
const STATUS_LABEL: Record<string, string> = { published: 'Published', unpublished: 'Hidden', draft: 'Draft' };

async function readSetting(key: string): Promise<string> {
  const { data } = await supabase.from('site_settings').select('value').eq('key', key).maybeSingle();
  return (data as any)?.value || '';
}
async function writeSetting(key: string, value: string) {
  return supabase.from('site_settings').upsert({ key, value, updated_at: new Date().toISOString() });
}
async function editRedirects(fn: (r: Record<string, string>) => boolean) {
  let r: Record<string, string> = {};
  try { r = JSON.parse((await readSetting('template_redirects')) || '{}'); } catch { r = {}; }
  if (fn(r)) await writeSetting('template_redirects', JSON.stringify(r));
}
/** Runs `fn` over items, a few at a time. */
async function each<T>(items: T[], fn: (x: T) => Promise<void>, n = 8) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}
const editorUrl = (t: Pick<Row, 'id' | 'width' | 'height'>) => `/editor?w=${t.width}&h=${t.height}&templateId=${t.id}&editTemplate=1`;

type Confirm =
  | { kind: 'bin' | 'restore' | 'publish' | 'hide' | 'draft'; ids: string[] }
  | { kind: 'move'; ids: string[]; to: string }
  | { kind: 'delete'; ids: string[] };

export default function TemplateManager() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [me, setMe] = useState<string | null>(null);
  const [cats, setCats] = useState<Cat[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [tabCounts, setTabCounts] = useState<Record<string, number>>({});
  const [tab, setTab] = useState<Tab>('all');
  const [catSel, setCatSel] = useState<string>(''); // '' = all, 'none' = no category
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [q, setQ] = useState('');
  const [qInput, setQInput] = useState('');
  const [sort, setSort] = useState('new');
  const [collection, setCollection] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [typed, setTyped] = useState('');
  const [details, setDetails] = useState<Row | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [catEdit, setCatEdit] = useState<{ mode: 'add' | 'rename' | 'move' | 'delete'; cat?: CatNode; parent?: string | null } | null>(null);
  const [manageCats, setManageCats] = useState(false);
  const [catMenu, setCatMenu] = useState<string | null>(null);

  const tree = useMemo(() => buildTree(cats), [cats]);
  const flat = useMemo(() => flatten(tree), [tree]);
  const catName = useCallback((id: string | null) => cats.find((c) => c.id === id)?.name || 'No category', [cats]);
  const subtreeCount = useCallback((id: string) => withDescendants(id, cats).reduce((s, x) => s + (counts[x] || 0), 0), [cats, counts]);

  // ---------- access ----------
  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push('/login?next=/admin/library');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      setMe(user.id);
      try { const v = localStorage.getItem('mt-lib-view'); if (v === 'list' || v === 'grid') setView(v); } catch { /* ignore */ }
      setState('ok');
    })();
  }, [router]);

  // ---------- categories + counts ----------
  const loadCats = useCallback(async () => {
    const { data } = await supabase.from('template_categories').select('id,name,slug,parent_id,sort_order').order('sort_order').order('name');
    const list = ((data as any) || []) as Cat[];
    setCats(list);
    return list;
  }, []);
  const loadCounts = useCallback(async (list: Cat[]) => {
    const notBin = (qq: any) => qq.not('tags', 'cs', `{${BIN_TAG}}`);
    // Brand designs live in Admin → Brand workspace, not here.
    const head = () => supabase.from('templates').select('id', { count: 'exact', head: true }).not('tags', 'ov', BRAND_TAGS);
    const out: Record<string, number> = {};
    await each([...list.map((c) => c.id), 'none'], async (id) => {
      let qq: any = notBin(head());
      qq = id === 'none' ? qq.is('category_id', null) : qq.eq('category_id', id);
      const { count } = await qq; out[id] = count || 0;
    }, 10);
    setCounts(out);
    const t: Record<string, number> = {};
    await Promise.all([
      (async () => { t.all = (await notBin(head())).count || 0; })(),
      (async () => { t.published = (await head().eq('status', 'published')).count || 0; })(),
      (async () => { t.unpublished = (await notBin(head().eq('status', 'unpublished'))).count || 0; })(),
      (async () => { t.draft = (await notBin(head().eq('status', 'draft'))).count || 0; })(),
      (async () => { t.bin = (await head().contains('tags', [BIN_TAG])).count || 0; })(),
    ]);
    setTabCounts(t);
  }, []);
  useEffect(() => {
    if (state !== 'ok') return;
    loadCats().then(loadCounts);
  }, [state, loadCats, loadCounts]);

  // ---------- templates ----------
  const load = useCallback(async () => {
    if (state !== 'ok') return;
    setBusy(true);
    let qq: any = supabase.from('templates').select(COLS, { count: 'exact' }).not('tags', 'ov', BRAND_TAGS);
    if (tab === 'bin') qq = qq.contains('tags', [BIN_TAG]);
    else { qq = qq.not('tags', 'cs', `{${BIN_TAG}}`); if (tab !== 'all') qq = qq.eq('status', tab); }
    if (catSel === 'none') qq = qq.is('category_id', null);
    else if (catSel) qq = qq.in('category_id', withDescendants(catSel, cats));
    if (collection) qq = qq.contains('tags', [collection]);
    if (q) { const s = q.replace(/[%,()]/g, ' '); qq = qq.or(`name.ilike.%${s}%,slug.ilike.%${s}%,search_keywords.ilike.%${s}%`); }
    qq = sort === 'updated' ? qq.order('updated_at', { ascending: false, nullsFirst: false }) : sort === 'name' ? qq.order('name') : sort === 'old' ? qq.order('created_at') : qq.order('created_at', { ascending: false });
    const { data, count, error } = await qq.order('id').range(page * PAGE, page * PAGE + PAGE - 1);
    if (error) setMsg({ text: `Could not load templates: ${error.message}`, bad: true });
    setRows((data as any) || []);
    setTotal(count || 0);
    setBusy(false);
  }, [state, tab, catSel, cats, collection, q, sort, page]);
  useEffect(() => { load(); }, [load]);

  const reset = () => { setPage(0); setSel(new Set()); };
  const refreshAll = async () => { await load(); await loadCounts(cats); };

  // ---------- audit log ----------
  const log = async (entries: { id?: string; slug?: string | null; name?: string; action: string; detail?: string }[]) => {
    if (!entries.length) return;
    let list: any[] = [];
    try { list = JSON.parse((await readSetting('template_review_log')) || '[]'); } catch { list = []; }
    const at = new Date().toISOString();
    list = [...entries.map((e) => ({ at, by: me, ...e })), ...list].slice(0, 3000);
    await writeSetting('template_review_log', JSON.stringify(list));
  };

  // ---------- template actions ----------
  const fetchRows = async (ids: string[]) => {
    const out: Row[] = [];
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase.from('templates').select(COLS).in('id', ids.slice(i, i + 200));
      out.push(...((data as any) || []));
    }
    return out;
  };

  const run = async (c: Confirm) => {
    setBusy(true); setMsg(null);
    try {
      const list = await fetchRows(c.ids);
      const now = new Date().toISOString();
      let done = 0;
      if (c.kind === 'publish' || c.kind === 'hide' || c.kind === 'draft') {
        const status = c.kind === 'publish' ? 'published' : c.kind === 'hide' ? 'unpublished' : 'draft';
        const live = list.filter((t) => !inBin(t.tags));
        for (let i = 0; i < live.length; i += 200) {
          const patch: any = { status, updated_at: now };
          if (status === 'published') patch.published_at = now;
          const { error } = await supabase.from('templates').update(patch).in('id', live.slice(i, i + 200).map((t) => t.id));
          if (error) throw error;
        }
        if (status === 'published') await editRedirects((r) => { let ch = false; live.forEach((t) => { if (t.slug && r[t.slug]?.startsWith('/templates/category/')) { delete r[t.slug]; ch = true; } }); return ch; });
        done = live.length;
        await log(live.map((t) => ({ id: t.id, slug: t.slug, name: t.name, action: c.kind, detail: `from ${t.status}` })));
      }
      if (c.kind === 'move') {
        const rn = rootName(c.to, cats);
        for (let i = 0; i < list.length; i += 200) {
          const { error } = await supabase.from('templates').update({ category_id: c.to, category: rn, updated_at: now }).in('id', list.slice(i, i + 200).map((t) => t.id));
          if (error) throw error;
        }
        done = list.length;
        await log(list.map((t) => ({ id: t.id, slug: t.slug, name: t.name, action: 'move', detail: `${catName(t.category_id)} → ${catName(c.to)}` })));
      }
      if (c.kind === 'bin') {
        const go = list.filter((t) => !inBin(t.tags));
        await each(go, async (t) => {
          const { error } = await supabase.from('templates').update({ tags: binTags(t.tags, t.status), status: 'unpublished', updated_at: now }).eq('id', t.id);
          if (error) throw error;
        });
        await editRedirects((r) => { let ch = false; go.forEach((t) => { if (t.slug) { r[t.slug] = `/templates/category/${categorySlug(t.category || 'templates')}`; ch = true; } }); return ch; });
        done = go.length;
        await log(go.map((t) => ({ id: t.id, slug: t.slug, name: t.name, action: 'bin', detail: `was ${t.status}` })));
      }
      if (c.kind === 'restore') {
        const back = list.filter((t) => inBin(t.tags));
        await each(back, async (t) => {
          const u = unbin(t.tags);
          const { error } = await supabase.from('templates').update({ tags: u.tags, status: u.status, updated_at: now }).eq('id', t.id);
          if (error) throw error;
        });
        await editRedirects((r) => { let ch = false; back.forEach((t) => { if (t.slug && r[t.slug]) { delete r[t.slug]; ch = true; } }); return ch; });
        done = back.length;
        await log(back.map((t) => ({ id: t.id, slug: t.slug, name: t.name, action: 'restore' })));
      }
      if (c.kind === 'delete') {
        // Only templates already in the bin can be deleted forever.
        const gone = list.filter((t) => inBin(t.tags));
        for (let i = 0; i < gone.length; i += 100) {
          const { error } = await supabase.from('templates').delete().in('id', gone.slice(i, i + 100).map((t) => t.id));
          if (error) throw error;
        }
        done = gone.length;
        await log(gone.map((t) => ({ id: t.id, slug: t.slug, name: t.name, action: 'delete-forever' })));
      }
      const word = { publish: 'Published', hide: 'Hidden', draft: 'Moved to drafts', move: 'Moved', bin: 'Moved to the bin', restore: 'Restored', delete: 'Deleted forever' }[c.kind];
      setMsg({ text: `${word}: ${done} template${done === 1 ? '' : 's'}.${c.kind === 'move' ? ` Now in ${catName((c as any).to)}.` : ''} The public gallery shows changes after “Refresh site”.` });
      setConfirm(null); setTyped(''); setSel(new Set());
      await refreshAll();
    } catch (e: any) {
      setMsg({ text: `Could not save: ${e?.message || e}`, bad: true });
    }
    setBusy(false);
  };
  // One template: run straight away (except the bin / delete, which ask).
  const quick = (c: Confirm) => (c.kind === 'delete' || c.ids.length > 1 ? setConfirm(c) : run(c));

  const duplicate = async (t: Row) => {
    setBusy(true); setMsg(null);
    try {
      const { data: full, error } = await supabase.from('templates').select('*').eq('id', t.id).single();
      if (error || !full) throw error || new Error('Not found');
      const { id: _i, created_at: _c, updated_at: _u, published_at: _p, slug, ...rest } = full as any;
      const copy = {
        ...rest, name: copyName(full.name), status: 'draft', published_at: null,
        slug: slug ? `${slug}-copy-${Math.random().toString(36).slice(2, 6)}` : null,
        tags: ((full.tags || []) as string[]).filter((x) => x !== BIN_TAG && !x.startsWith('bin-from:') && !x.startsWith('review:') && x !== 'archived'),
        is_featured: false,
      };
      const { data: made, error: e2 } = await supabase.from('templates').insert(copy).select('id,name,width,height').single();
      if (e2) throw e2;
      await log([{ id: made.id, name: made.name, action: 'duplicate', detail: `from ${t.name}` }]);
      setMsg({ text: `Made a draft copy: “${made.name}”.` });
      await refreshAll();
    } catch (e: any) { setMsg({ text: `Could not duplicate: ${e?.message || e}`, bad: true }); }
    setBusy(false);
  };

  const saveDetails = async (d: Row) => {
    setBusy(true); setMsg(null);
    const patch = {
      name: d.name.trim() || 'Untitled', description: d.description || null, search_keywords: d.search_keywords || null,
      tags: (d.tags || []).map((x) => x.trim()).filter(Boolean), is_free: !!d.is_free, is_featured: !!d.is_featured,
      category_id: d.category_id, category: d.category_id ? rootName(d.category_id, cats) : d.category, updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('templates').update(patch).eq('id', d.id);
    if (error) setMsg({ text: `Could not save: ${error.message}`, bad: true });
    else { await log([{ id: d.id, slug: d.slug, name: patch.name, action: 'edit-details' }]); setDetails(null); setMsg({ text: `Saved “${patch.name}”.` }); await refreshAll(); }
    setBusy(false);
  };

  const refreshSite = async () => {
    setBusy(true);
    const { data } = await supabase.auth.getSession();
    const r = await fetch('/api/admin/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${data.session?.access_token || ''}` } }).catch(() => null);
    setMsg(r?.ok ? { text: 'Site refreshed — the gallery shows the latest templates on its next visit.' } : { text: 'Could not refresh the site. Try again in a minute.', bad: true });
    setBusy(false);
  };

  // ---------- category actions ----------
  // After the tree changes, every template's `category` text must be the
  // name of its top-level category (that is what the gallery groups by).
  const syncRootNames = async (ids: string[], list: Cat[]) => {
    await each(ids, async (id) => {
      const rn = rootName(id, list);
      if (rn) await supabase.from('templates').update({ category: rn }).eq('category_id', id).neq('category', rn);
    }, 6);
  };

  const saveCategory = async (mode: 'add' | 'rename' | 'move' | 'delete', input: { name?: string; parent?: string | null; target?: string | null; cat?: CatNode }) => {
    setBusy(true); setMsg(null);
    try {
      const c = input.cat;
      if (mode === 'add') {
        const name = (input.name || '').trim();
        if (!name) throw new Error('Type a name');
        const siblings = cats.filter((x) => x.parent_id === (input.parent || null));
        const { error } = await supabase.from('template_categories').insert({ name, slug: uniqueSlug(name, cats.map((x) => x.slug)), parent_id: input.parent || null, sort_order: Math.max(0, ...siblings.map((s) => s.sort_order ?? 0)) + 1 });
        if (error) throw error;
        await log([{ action: 'category-add', name, detail: input.parent ? `inside ${catName(input.parent)}` : 'top level' }]);
        setMsg({ text: `Added the category “${name}”.` });
      }
      if (mode === 'rename' && c) {
        const name = (input.name || '').trim();
        if (!name) throw new Error('Type a name');
        const { error } = await supabase.from('template_categories').update({ name }).eq('id', c.id);
        if (error) throw error;
        const list = cats.map((x) => (x.id === c.id ? { ...x, name } : x));
        if (!c.parent_id) await syncRootNames(withDescendants(c.id, list), list);
        await log([{ action: 'category-rename', name, detail: `was ${c.name}` }]);
        setMsg({ text: `Renamed “${c.name}” to “${name}”.` });
      }
      if (mode === 'move' && c) {
        const parent = input.parent || null;
        if (!canMoveUnder(c.id, parent, cats)) throw new Error('A category cannot go inside itself');
        const siblings = cats.filter((x) => x.parent_id === parent && x.id !== c.id);
        const { error } = await supabase.from('template_categories').update({ parent_id: parent, sort_order: Math.max(0, ...siblings.map((s) => s.sort_order ?? 0)) + 1 }).eq('id', c.id);
        if (error) throw error;
        const list = cats.map((x) => (x.id === c.id ? { ...x, parent_id: parent } : x));
        await syncRootNames(withDescendants(c.id, list), list);
        await log([{ action: 'category-move', name: c.name, detail: parent ? `into ${catName(parent)}` : 'to top level' }]);
        setMsg({ text: `Moved “${c.name}” ${parent ? `into ${catName(parent)}` : 'to the top level'}.` });
      }
      if (mode === 'delete' && c) {
        const n = counts[c.id] || 0;
        const target = input.target || null;
        if (n > 0 && !target) throw new Error('Choose where its templates should go');
        if (target === c.id) throw new Error('Choose a different category');
        // 1. children move up one level
        const kids = cats.filter((x) => x.parent_id === c.id);
        if (kids.length) {
          const { error } = await supabase.from('template_categories').update({ parent_id: c.parent_id }).eq('parent_id', c.id);
          if (error) throw error;
        }
        // 2. its templates move to the chosen category
        const list0 = cats.filter((x) => x.id !== c.id).map((x) => (x.parent_id === c.id ? { ...x, parent_id: c.parent_id } : x));
        if (n > 0 && target) {
          const { error } = await supabase.from('templates').update({ category_id: target, category: rootName(target, list0) }).eq('category_id', c.id);
          if (error) throw error;
        }
        // 3. remove the empty category
        const { error } = await supabase.from('template_categories').delete().eq('id', c.id);
        if (error) throw error;
        await syncRootNames(kids.flatMap((k) => withDescendants(k.id, list0)), list0);
        await log([{ action: 'category-delete', name: c.name, detail: `${n} templates → ${target ? catName(target) : '—'}${kids.length ? `; ${kids.length} sub-categories moved up` : ''}` }]);
        if (catSel === c.id) setCatSel(target || '');
        setMsg({ text: `Deleted the category “${c.name}”.${n ? ` Its ${n.toLocaleString()} templates are now in ${catName(target)}.` : ''}` });
      }
      setCatEdit(null);
      const list = await loadCats();
      await loadCounts(list);
      await load();
    } catch (e: any) { setMsg({ text: `Could not save: ${e?.message || e}`, bad: true }); }
    setBusy(false);
  };

  const reorder = async (c: CatNode, dir: -1 | 1) => {
    const siblings = flat.filter((x) => x.parent_id === c.parent_id);
    const i = siblings.findIndex((x) => x.id === c.id);
    const j = i + dir;
    if (j < 0 || j >= siblings.length) return;
    const order = siblings.map((s) => s.id);
    [order[i], order[j]] = [order[j], order[i]];
    setBusy(true);
    await each(order, async (id) => { await supabase.from('template_categories').update({ sort_order: order.indexOf(id) + 1 }).eq('id', id); }, 6);
    await loadCats();
    setBusy(false);
  };

  // ---------- render ----------
  if (state === 'loading') return <div className="min-h-screen grid place-items-center text-mt-muted"><Loader2 className="animate-spin" /></div>;
  if (state === 'denied') return <div className="min-h-screen grid place-items-center text-mt-muted">This page is for admins.</div>;

  const pages = Math.max(1, Math.ceil(total / PAGE));
  const allSel = rows.length > 0 && rows.every((r) => sel.has(r.id));
  const selIds = [...sel];
  const selRows = rows.filter((r) => sel.has(r.id));
  const inBinTab = tab === 'bin';
  const where = catSel === 'none' ? 'No category' : catSel ? catName(catSel) : 'All categories';

  const CatRow = ({ n }: { n: CatNode }) => {
    const kids = n.children.length > 0;
    const isOpen = open.has(n.id);
    const active = catSel === n.id;
    const siblings = flat.filter((x) => x.parent_id === n.parent_id);
    const idx = siblings.findIndex((x) => x.id === n.id);
    return (
      <>
        <div className={`group flex items-center gap-1 rounded-lg pr-1 ${active ? 'bg-mt-primary text-mt-onprimary' : 'hover:bg-mt-surface2 text-mt-ink'}`} style={{ paddingLeft: 4 + n.depth * 14 }}>
          <button type="button" aria-label={isOpen ? 'Collapse' : 'Expand'} onClick={() => setOpen((s) => { const x = new Set(s); x.has(n.id) ? x.delete(n.id) : x.add(n.id); return x; })} className={`h-7 w-5 grid place-items-center ${kids ? '' : 'invisible'}`}>
            <ChevronRight size={13} className={`transition-transform ${isOpen ? 'rotate-90' : ''}`} />
          </button>
          <button type="button" onClick={() => { setCatSel(n.id); reset(); if (kids) setOpen((x) => new Set(x).add(n.id)); }} className="flex-1 min-w-0 flex items-center gap-1.5 h-8 text-left text-[13px]">
            {active || isOpen ? <FolderOpen size={14} className="shrink-0 opacity-70" /> : <Folder size={14} className="shrink-0 opacity-70" />}
            <span className="truncate">{n.name}</span>
          </button>
          {manageCats ? (
            <button type="button" aria-label={`Organise ${n.name}`} onClick={() => setCatMenu(catMenu === n.id ? null : n.id)} className={`h-7 w-7 grid place-items-center rounded-md ${catMenu === n.id ? 'bg-mt-surface2 text-mt-ink' : ''}`}><MoreHorizontal size={14} /></button>
          ) : (
            <span className={`text-[11px] tabular-nums ${active ? 'opacity-80' : 'text-mt-muted'}`}>{subtreeCount(n.id).toLocaleString()}</span>
          )}
        </div>
        {manageCats && catMenu === n.id && (
          <div className="my-1 grid grid-cols-2 gap-1 rounded-lg border border-mt-border bg-mt-surface2 p-1.5 text-[12px]" style={{ marginLeft: 8 + n.depth * 14 }}>
            <button type="button" disabled={idx <= 0 || busy} onClick={() => reorder(n, -1)} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-mt-surface disabled:opacity-40"><ArrowUp size={12} /> Move up</button>
            <button type="button" disabled={idx >= siblings.length - 1 || busy} onClick={() => reorder(n, 1)} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-mt-surface disabled:opacity-40"><ArrowDown size={12} /> Move down</button>
            <button type="button" onClick={() => setCatEdit({ mode: 'rename', cat: n })} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-mt-surface"><Pencil size={12} /> Rename</button>
            <button type="button" onClick={() => setCatEdit({ mode: 'move', cat: n })} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-mt-surface"><FolderInput size={12} /> Move into…</button>
            <button type="button" onClick={() => setCatEdit({ mode: 'add', parent: n.id })} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-mt-surface"><Plus size={12} /> Add inside</button>
            <button type="button" onClick={() => setCatEdit({ mode: 'delete', cat: n })} className="flex items-center gap-1.5 h-7 px-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"><Trash2 size={12} /> Delete</button>
          </div>
        )}
        {kids && isOpen && n.children.map((k) => <CatRow key={k.id} n={k} />)}
      </>
    );
  };

  return (
    <AdminShell
      active="library"
      title="Template Manager"
      subtitle="Organise, edit, publish and tidy every template. Bin first, delete forever only from the Bin."
      actions={
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={refreshSite} disabled={busy} className={btn}><RefreshCw size={14} /> Refresh site</button>
          <Link href="/admin/templates?new=1" className={btnDark}><Plus size={14} /> New template</Link>
        </div>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* ---------- Category sidebar ---------- */}
        <aside className="lg:sticky lg:top-4 self-start rounded-2xl border border-mt-border bg-mt-surface p-2.5">
          <div className="flex items-center justify-between px-1.5 pb-2">
            <p className="text-[12px] font-semibold uppercase tracking-wide text-mt-muted">Categories</p>
            <div className="flex gap-1">
              <button type="button" title="Add a category" onClick={() => setCatEdit({ mode: 'add', parent: null })} className="h-7 w-7 grid place-items-center rounded-md text-mt-ink hover:bg-mt-surface2"><FolderPlus size={14} /></button>
              <button type="button" title={manageCats ? 'Done' : 'Organise categories'} onClick={() => setManageCats((v) => !v)} className={`h-7 px-2 rounded-md text-[12px] font-semibold inline-flex items-center gap-1 ${manageCats ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-ink hover:bg-mt-surface2'}`}>{manageCats ? <><Check size={12} /> Done</> : <><Settings2 size={12} /> Organise</>}</button>
            </div>
          </div>
          {manageCats && <p className="px-2 pb-2 text-[11.5px] text-mt-muted leading-snug">Press ⋯ next to a category to move it up or down, rename it, put it inside another, add a sub-category or delete it (you choose where its templates go).</p>}
          <div className="max-h-[60vh] lg:max-h-[calc(100vh-220px)] overflow-y-auto pr-0.5">
            <button type="button" onClick={() => { setCatSel(''); reset(); }} className={`w-full flex items-center justify-between h-8 px-2 rounded-lg text-[13px] ${catSel === '' ? 'bg-mt-primary text-mt-onprimary' : 'hover:bg-mt-surface2'}`}>
              <span className="font-semibold">All templates</span><span className="text-[11px] tabular-nums opacity-80">{(tabCounts.all ?? 0).toLocaleString()}</span>
            </button>
            {tree.map((n) => <CatRow key={n.id} n={n} />)}
            {(counts.none || 0) > 0 && (
              <button type="button" onClick={() => { setCatSel('none'); reset(); }} className={`mt-1 w-full flex items-center justify-between h-8 px-2 rounded-lg text-[13px] ${catSel === 'none' ? 'bg-mt-primary text-mt-onprimary' : 'hover:bg-mt-surface2 text-amber-700 dark:text-amber-400'}`}>
                <span>No category</span><span className="text-[11px] tabular-nums">{counts.none.toLocaleString()}</span>
              </button>
            )}
          </div>
          <div className="mt-2 border-t border-mt-border pt-2 px-1.5 text-[12px] space-y-1">
            <Link href="/admin/library/copy" className="flex items-center gap-1.5 text-mt-muted hover:text-mt-ink"><Pencil size={12} /> Titles, descriptions &amp; hashtags</Link>
            <Link href="/admin/review" className="flex items-center gap-1.5 text-mt-muted hover:text-mt-ink"><Wand2 size={12} /> Quality review</Link>
            <Link href="/admin/templates" className="flex items-center gap-1.5 text-mt-muted hover:text-mt-ink"><Settings2 size={12} /> Advanced tools (AI studio, sizes, images)</Link>
          </div>
        </aside>

        {/* ---------- Main ---------- */}
        <section className="min-w-0">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1 rounded-xl border border-mt-border bg-mt-surface p-1 w-fit">
            {TABS.map((t) => (
              <button key={t.id} type="button" onClick={() => { setTab(t.id); reset(); }} className={`h-8 px-3 rounded-lg text-[13px] font-semibold inline-flex items-center gap-1.5 ${tab === t.id ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted hover:text-mt-ink'}`}>
                {t.id === 'bin' && <Trash2 size={12} />}{t.label}
                <span className={`text-[11px] tabular-nums ${tab === t.id ? 'opacity-80' : ''}`}>{tabCounts[t.id] !== undefined ? tabCounts[t.id].toLocaleString() : ''}</span>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <form onSubmit={(e) => { e.preventDefault(); setQ(qInput.trim()); reset(); }} className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-mt-muted" />
              <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Search by name or keyword" className={`${field} pl-8 w-64`} aria-label="Search templates" />
              {q && <button type="button" aria-label="Clear search" onClick={() => { setQ(''); setQInput(''); reset(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-mt-muted"><X size={13} /></button>}
            </form>
            <select className={field} value={collection} onChange={(e) => { setCollection(e.target.value); reset(); }} aria-label="Collection">
              {COLLECTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className={field} value={sort} onChange={(e) => { setSort(e.target.value); reset(); }} aria-label="Sort">
              <option value="new">Newest first</option><option value="updated">Recently edited</option><option value="old">Oldest first</option><option value="name">Name A–Z</option>
            </select>
            <div className="ml-auto flex items-center gap-1 rounded-lg border border-mt-border p-0.5">
              {(['grid', 'list'] as const).map((v) => (
                <button key={v} type="button" aria-label={v === 'grid' ? 'Grid view' : 'List view'} onClick={() => { setView(v); try { localStorage.setItem('mt-lib-view', v); } catch { /* ignore */ } }} className={`h-7 w-8 grid place-items-center rounded-md ${view === v ? 'bg-mt-surface2 text-mt-ink' : 'text-mt-muted'}`}>{v === 'grid' ? <LayoutGrid size={14} /> : <Rows3 size={14} />}</button>
              ))}
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px] text-mt-muted">
            <p><span className="font-semibold text-mt-ink">{total.toLocaleString()}</span> templates · {where}{q ? ` · “${q}”` : ''}{busy && <Loader2 size={13} className="inline ml-2 animate-spin" />}</p>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none"><input type="checkbox" checked={allSel} onChange={() => setSel(allSel ? new Set() : new Set(rows.map((r) => r.id)))} /> Select this page</label>
          </div>

          {msg && (
            <div role="status" className={`mt-3 flex items-start justify-between gap-3 rounded-xl px-3.5 py-2.5 text-[13px] ${msg.bad ? 'bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200' : 'bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>
              <span>{msg.text}</span><button type="button" aria-label="Dismiss" onClick={() => setMsg(null)}><X size={14} /></button>
            </div>
          )}
          {inBinTab && <p className="mt-3 rounded-xl border border-mt-border bg-mt-surface2 px-3.5 py-2.5 text-[13px] text-mt-muted">Templates in the bin are hidden from customers and their pages redirect to the category. Restore puts them back as they were. <strong className="text-mt-ink">Delete forever</strong> cannot be undone; customers’ own designs made from a template are not affected.</p>}

          {/* Grid / list */}
          {rows.length === 0 && !busy ? (
            <div className="mt-10 text-center text-mt-muted text-sm">Nothing here. {q || collection || catSel ? 'Try clearing the search or picking another category.' : ''}</div>
          ) : view === 'grid' ? (
            <div className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {rows.map((t) => {
                const on = sel.has(t.id);
                return (
                  <div key={t.id} className={`group relative rounded-xl border bg-mt-surface overflow-hidden ${on ? 'border-mt-ink ring-2 ring-mt-ink/20' : 'border-mt-border'}`}>
                    <button type="button" onClick={() => (inBinTab ? setSel((s) => { const x = new Set(s); x.has(t.id) ? x.delete(t.id) : x.add(t.id); return x; }) : (window.location.href = editorUrl(t)))} className="block w-full aspect-[4/3] bg-mt-surface2 relative" title={inBinTab ? 'Select' : 'Edit design'}>
                      {t.thumbnail ? <img src={t.thumbnail} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-contain p-2" /> : <span className="absolute inset-0 grid place-items-center text-[12px] text-mt-muted">No preview</span>}
                      {!inBinTab && <span className="absolute inset-0 grid place-items-center opacity-0 group-hover:opacity-100 bg-black/35 transition-opacity"><span className="inline-flex items-center gap-1.5 rounded-full bg-white text-zinc-900 px-3 py-1.5 text-[12px] font-semibold"><Pencil size={12} /> Edit design</span></span>}
                    </button>
                    <label className="absolute left-2 top-2 h-6 w-6 grid place-items-center rounded-md bg-white/90 shadow cursor-pointer" aria-label="Select">
                      <input type="checkbox" checked={on} onChange={() => setSel((s) => { const x = new Set(s); x.has(t.id) ? x.delete(t.id) : x.add(t.id); return x; })} />
                    </label>
                    <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${inBin(t.tags) ? 'bg-red-600 text-white' : STATUS_BADGE[t.status] || 'bg-zinc-500 text-white'}`}>{inBin(t.tags) ? 'In bin' : STATUS_LABEL[t.status] || t.status}</span>
                    <div className="p-2.5">
                      <p className="text-[13px] font-semibold text-mt-ink truncate" title={t.name}>{t.name}</p>
                      <p className="text-[11.5px] text-mt-muted truncate">{catName(t.category_id)} · {sizeLabel(t.width, t.height)}</p>
                      <div className="mt-2 flex items-center gap-1">
                        {inBinTab ? (
                          <>
                            <button type="button" onClick={() => run({ kind: 'restore', ids: [t.id] })} disabled={busy} className={`${btn} h-8 flex-1 justify-center`}><RotateCcw size={13} /> Restore</button>
                            <button type="button" onClick={() => setConfirm({ kind: 'delete', ids: [t.id] })} disabled={busy} className="h-8 w-8 grid place-items-center rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40" title="Delete forever"><Trash2 size={13} /></button>
                          </>
                        ) : (
                          <>
                            <button type="button" onClick={() => setDetails({ ...t })} className={`${btn} h-8 flex-1 justify-center`}><Pencil size={13} /> Details</button>
                            {t.status === 'published'
                              ? <button type="button" title="Hide from customers" onClick={() => run({ kind: 'hide', ids: [t.id] })} disabled={busy} className={`${iconBtn}`}><EyeOff size={13} /></button>
                              : <button type="button" title="Publish" onClick={() => run({ kind: 'publish', ids: [t.id] })} disabled={busy} className={`${iconBtn} text-emerald-700`}><Eye size={13} /></button>}
                            <div className="relative">
                              <button type="button" aria-label="More" onClick={() => setMenu(menu === t.id ? null : t.id)} className={`${iconBtn}`}><MoreHorizontal size={14} /></button>
                              {menu === t.id && (
                                <div className="absolute right-0 bottom-9 z-20 w-48 rounded-xl border border-mt-border bg-mt-surface shadow-xl p-1 text-[13px]" onMouseLeave={() => setMenu(null)}>
                                  <a href={editorUrl(t)} className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-mt-surface2"><Wand2 size={13} /> Edit design</a>
                                  <button type="button" onClick={() => { setMenu(null); duplicate(t); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-mt-surface2"><Copy size={13} /> Duplicate</button>
                                  <button type="button" onClick={() => { setMenu(null); setSel(new Set([t.id])); setConfirm({ kind: 'move', ids: [t.id], to: t.category_id || flat[0]?.id || '' }); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-mt-surface2"><FolderInput size={13} /> Move to category</button>
                                  {t.slug && t.status === 'published' && <a href={`/templates/${t.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-mt-surface2"><ExternalLink size={13} /> View page</a>}
                                  {t.status !== 'draft' && <button type="button" onClick={() => { setMenu(null); run({ kind: 'draft', ids: [t.id] }); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-mt-surface2"><Pencil size={13} /> Back to draft</button>}
                                  <button type="button" onClick={() => { setMenu(null); setConfirm({ kind: 'bin', ids: [t.id] }); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600"><Trash2 size={13} /> Move to bin</button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3 rounded-xl border border-mt-border bg-mt-surface divide-y divide-mt-border">
              {rows.map((t) => (
                <div key={t.id} className="flex items-center gap-3 p-2">
                  <input type="checkbox" aria-label={`Select ${t.name}`} checked={sel.has(t.id)} onChange={() => setSel((s) => { const x = new Set(s); x.has(t.id) ? x.delete(t.id) : x.add(t.id); return x; })} />
                  <div className="h-12 w-16 shrink-0 rounded-md bg-mt-surface2 overflow-hidden">{t.thumbnail && <img src={t.thumbnail} alt="" loading="lazy" className="h-full w-full object-contain" />}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-mt-ink truncate">{t.name}</p>
                    <p className="text-[11.5px] text-mt-muted truncate">{catName(t.category_id)} · {sizeLabel(t.width, t.height)} · {inBin(t.tags) ? 'In bin' : STATUS_LABEL[t.status] || t.status}</p>
                  </div>
                  {inBinTab ? (
                    <>
                      <button type="button" onClick={() => run({ kind: 'restore', ids: [t.id] })} className={`${btn} h-8`}><RotateCcw size={13} /> Restore</button>
                      <button type="button" onClick={() => setConfirm({ kind: 'delete', ids: [t.id] })} className="h-8 px-2.5 rounded-lg border border-red-300 text-red-600 text-[12px] font-semibold">Delete forever</button>
                    </>
                  ) : (
                    <>
                      <a href={editorUrl(t)} className={`${btn} h-8`}><Wand2 size={13} /> Edit design</a>
                      <button type="button" onClick={() => setDetails({ ...t })} className={`${btn} h-8`}><Pencil size={13} /> Details</button>
                      <button type="button" onClick={() => run({ kind: t.status === 'published' ? 'hide' : 'publish', ids: [t.id] })} className={`${btn} h-8`}>{t.status === 'published' ? <><EyeOff size={13} /> Hide</> : <><Eye size={13} /> Publish</>}</button>
                      <button type="button" title="Duplicate" onClick={() => duplicate(t)} className={`${iconBtn}`}><Copy size={13} /></button>
                      <button type="button" title="Move to bin" onClick={() => setConfirm({ kind: 'bin', ids: [t.id] })} className={`${iconBtn} text-red-600`}><Trash2 size={13} /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-2 text-[13px]">
              <button type="button" disabled={page === 0 || busy} onClick={() => { setPage((p) => p - 1); setSel(new Set()); window.scrollTo({ top: 0 }); }} className={btn}><ChevronLeft size={14} /> Previous</button>
              <span className="text-mt-muted tabular-nums">Page {page + 1} of {pages.toLocaleString()}</span>
              <button type="button" disabled={page >= pages - 1 || busy} onClick={() => { setPage((p) => p + 1); setSel(new Set()); window.scrollTo({ top: 0 }); }} className={btn}>Next <ChevronRight size={14} /></button>
            </div>
          )}
          <div className="h-20" />
        </section>
      </div>

      {/* ---------- Bulk action bar ---------- */}
      {sel.size > 0 && !confirm && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-32px)] max-w-3xl rounded-2xl border border-mt-border bg-mt-surface shadow-2xl px-3 py-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-semibold text-mt-ink px-1">{sel.size} selected</span>
          <button type="button" onClick={() => setSel(new Set())} className="text-[12px] text-mt-muted underline mr-auto">Clear</button>
          {inBinTab ? (
            <>
              <button type="button" onClick={() => quick({ kind: 'restore', ids: selIds })} className={btn}><RotateCcw size={14} /> Restore</button>
              <button type="button" onClick={() => setConfirm({ kind: 'delete', ids: selIds })} className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-semibold bg-red-600 text-white"><Trash2 size={14} /> Delete forever</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => quick({ kind: 'publish', ids: selIds })} className={btn}><Eye size={14} /> Publish</button>
              <button type="button" onClick={() => quick({ kind: 'hide', ids: selIds })} className={btn}><EyeOff size={14} /> Hide</button>
              <button type="button" onClick={() => setConfirm({ kind: 'move', ids: selIds, to: selRows[0]?.category_id || flat[0]?.id || '' })} className={btn}><FolderInput size={14} /> Move to…</button>
              <button type="button" onClick={() => setConfirm({ kind: 'bin', ids: selIds })} className={`${btn} text-red-600`}><Trash2 size={14} /> Bin</button>
            </>
          )}
        </div>
      )}

      {/* ---------- Confirm dialog ---------- */}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !busy && (setConfirm(null), setTyped(''))}>
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-mt-surface border border-mt-border p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            {(() => {
              const n = confirm.ids.length;
              const s = `${n} template${n === 1 ? '' : 's'}`;
              const preview = rows.filter((r) => confirm.ids.includes(r.id)).slice(0, 6);
              const thumbs = (
                <div className="mt-3 flex gap-1.5 overflow-hidden">{preview.map((r) => <div key={r.id} className="h-14 w-14 shrink-0 rounded-md bg-mt-surface2 overflow-hidden">{r.thumbnail && <img src={r.thumbnail} alt="" className="h-full w-full object-contain" />}</div>)}{n > 6 && <div className="h-14 px-2 grid place-items-center text-[12px] text-mt-muted">+{n - 6}</div>}</div>
              );
              if (confirm.kind === 'move') return (
                <>
                  <h3 className="text-[16px] font-semibold text-mt-ink">Move {s}</h3>
                  {thumbs}
                  <label className="mt-4 block text-[13px] text-mt-muted">Move to
                    <select value={confirm.to} onChange={(e) => setConfirm({ ...confirm, to: e.target.value })} className={`${field} mt-1 w-full`}>
                      {flat.map((c) => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}
                    </select>
                  </label>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirm(null)} className={btn}>Cancel</button><button type="button" disabled={busy || !confirm.to} onClick={() => run(confirm)} className={btnDark}>{busy ? <Loader2 size={14} className="animate-spin" /> : <FolderInput size={14} />} Move</button></div>
                </>
              );
              if (confirm.kind === 'delete') return (
                <>
                  <h3 className="text-[16px] font-semibold text-red-600">Delete {s} forever?</h3>
                  {thumbs}
                  <p className="mt-3 text-[13px] text-mt-muted">This removes the template{n === 1 ? '' : 's'} and {n === 1 ? 'its' : 'their'} version history from the database. It <strong className="text-mt-ink">cannot be undone</strong>. Customers’ own saved designs are not touched, and old links keep redirecting to the category.</p>
                  <label className="mt-4 block text-[13px] text-mt-muted">Type <strong className="text-mt-ink">DELETE</strong> to confirm
                    <input autoFocus value={typed} onChange={(e) => setTyped(e.target.value)} className={`${field} mt-1 w-full`} />
                  </label>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => { setConfirm(null); setTyped(''); }} className={btn}>Cancel</button><button type="button" disabled={busy || typed.trim() !== 'DELETE'} onClick={() => run(confirm)} className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-red-600 text-white disabled:opacity-40">{busy ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete forever</button></div>
                </>
              );
              const copy: Record<string, [string, string, string]> = {
                bin: [`Move ${s} to the bin?`, 'They are hidden from customers and their pages redirect to the category. You can restore them from the Bin at any time.', 'Move to bin'],
                restore: [`Restore ${s}?`, 'They go back to the status they had before (published, hidden or draft).', 'Restore'],
                publish: [`Publish ${s}?`, 'Customers will see them in the gallery after the next site refresh.', 'Publish'],
                hide: [`Hide ${s}?`, 'Customers will no longer see them. Nothing is deleted.', 'Hide'],
                draft: [`Move ${s} back to drafts?`, 'Customers will no longer see them.', 'Move to drafts'],
              };
              const [h, p, b] = copy[confirm.kind];
              return (
                <>
                  <h3 className="text-[16px] font-semibold text-mt-ink">{h}</h3>
                  {thumbs}
                  <p className="mt-3 text-[13px] text-mt-muted">{p}</p>
                  <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setConfirm(null)} className={btn}>Cancel</button><button type="button" disabled={busy} onClick={() => run(confirm)} className={confirm.kind === 'bin' ? 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-red-600 text-white disabled:opacity-50' : btnDark}>{busy && <Loader2 size={14} className="animate-spin" />} {b}</button></div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* ---------- Details drawer ---------- */}
      {details && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => !busy && setDetails(null)}>
          <div role="dialog" aria-modal="true" aria-label="Template details" className="h-full w-full max-w-md bg-mt-surface border-l border-mt-border shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 z-10 flex items-center justify-between bg-mt-surface border-b border-mt-border px-4 py-3">
              <h3 className="text-[15px] font-semibold text-mt-ink">Template details</h3>
              <button type="button" aria-label="Close" onClick={() => setDetails(null)}><X size={16} /></button>
            </div>
            <div className="p-4 space-y-4">
              <div className="rounded-xl bg-mt-surface2 aspect-[4/3] relative overflow-hidden">{details.thumbnail && <img src={details.thumbnail} alt="" className="absolute inset-0 w-full h-full object-contain p-3" />}</div>
              <div className="flex gap-2">
                <a href={editorUrl(details)} className={`${btnDark} flex-1 justify-center`}><Wand2 size={14} /> Edit design</a>
                {details.slug && details.status === 'published' && <a href={`/templates/${details.slug}`} target="_blank" rel="noreferrer" className={btn}><ExternalLink size={14} /> View</a>}
              </div>
              <label className="block text-[13px] text-mt-muted">Name<input value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} className={`${field} mt-1 w-full`} /></label>
              <label className="block text-[13px] text-mt-muted">Category
                <select value={details.category_id || ''} onChange={(e) => setDetails({ ...details, category_id: e.target.value || null })} className={`${field} mt-1 w-full`}>
                  <option value="">No category</option>
                  {flat.map((c) => <option key={c.id} value={c.id}>{'— '.repeat(c.depth)}{c.name}</option>)}
                </select>
              </label>
              <label className="block text-[13px] text-mt-muted">Description<textarea rows={3} value={details.description || ''} onChange={(e) => setDetails({ ...details, description: e.target.value })} className="mt-1 w-full rounded-lg border border-mt-input-border bg-mt-surface px-2.5 py-2 text-[13px] text-mt-ink" /></label>
              <label className="block text-[13px] text-mt-muted">Tags <span className="text-[11px]">(comma separated)</span><input value={(details.tags || []).join(', ')} onChange={(e) => setDetails({ ...details, tags: e.target.value.split(',') })} className={`${field} mt-1 w-full`} /></label>
              <label className="block text-[13px] text-mt-muted">Search keywords<input value={details.search_keywords || ''} onChange={(e) => setDetails({ ...details, search_keywords: e.target.value })} className={`${field} mt-1 w-full`} /></label>
              <div className="flex gap-5 text-[13px] text-mt-ink">
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={details.is_free !== false} onChange={(e) => setDetails({ ...details, is_free: e.target.checked })} /> Free</label>
                <label className="inline-flex items-center gap-2"><input type="checkbox" checked={!!details.is_featured} onChange={(e) => setDetails({ ...details, is_featured: e.target.checked })} /> Featured</label>
              </div>
              <p className="text-[12px] text-mt-muted">{sizeLabel(details.width, details.height)} · {STATUS_LABEL[details.status] || details.status}{details.slug ? ` · /templates/${details.slug}` : ''}</p>
              <div className="flex gap-2 pt-2 border-t border-mt-border">
                <button type="button" onClick={() => setDetails(null)} className={btn}>Cancel</button>
                <button type="button" disabled={busy} onClick={() => saveDetails(details)} className={`${btnDark} flex-1 justify-center`}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Category dialog ---------- */}
      {catEdit && <CategoryDialog edit={catEdit} flat={flat} cats={cats} counts={counts} busy={busy} onClose={() => setCatEdit(null)} onSave={saveCategory} />}
    </AdminShell>
  );
}

function CategoryDialog({ edit, flat, cats, counts, busy, onClose, onSave }: {
  edit: { mode: 'add' | 'rename' | 'move' | 'delete'; cat?: CatNode; parent?: string | null };
  flat: CatNode[]; cats: Cat[]; counts: Record<string, number>; busy: boolean;
  onClose: () => void;
  onSave: (mode: 'add' | 'rename' | 'move' | 'delete', input: { name?: string; parent?: string | null; target?: string | null; cat?: CatNode }) => void;
}) {
  const c = edit.cat;
  const [name, setName] = useState(edit.mode === 'rename' ? c?.name || '' : '');
  const [parent, setParent] = useState<string>(edit.mode === 'move' ? c?.parent_id || '' : edit.parent || '');
  const [target, setTarget] = useState<string>(c?.parent_id || '');
  const n = c ? counts[c.id] || 0 : 0;
  const blocked = c ? withDescendants(c.id, cats) : [];
  const kids = c ? cats.filter((x) => x.parent_id === c.id).length : 0;
  const title = { add: 'Add a category', rename: `Rename “${c?.name}”`, move: `Move “${c?.name}”`, delete: `Delete “${c?.name}”` }[edit.mode];
  const ok = edit.mode === 'add' || edit.mode === 'rename' ? !!name.trim() : edit.mode === 'delete' ? (n === 0 || !!target) : true;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={() => !busy && onClose()}>
      <form role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-mt-surface border border-mt-border p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} onSubmit={(e) => { e.preventDefault(); if (ok) onSave(edit.mode, { name, parent: parent || null, target: target || null, cat: c }); }}>
        <h3 className={`text-[16px] font-semibold ${edit.mode === 'delete' ? 'text-red-600' : 'text-mt-ink'}`}>{title}</h3>
        {(edit.mode === 'add' || edit.mode === 'rename') && (
          <label className="mt-4 block text-[13px] text-mt-muted">Name<input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Restaurant menus" className={`${field} mt-1 w-full`} /></label>
        )}
        {edit.mode === 'rename' && !c?.parent_id && <p className="mt-2 text-[12px] text-mt-muted">This is a main category: its templates are updated to the new name. The web address of the category page stays the same.</p>}
        {(edit.mode === 'add' || edit.mode === 'move') && (
          <label className="mt-4 block text-[13px] text-mt-muted">{edit.mode === 'add' ? 'Put it inside' : 'Move inside'}
            <select value={parent} onChange={(e) => setParent(e.target.value)} className={`${field} mt-1 w-full`}>
              <option value="">Top level (main category)</option>
              {flat.filter((x) => !blocked.includes(x.id)).map((x) => <option key={x.id} value={x.id}>{'— '.repeat(x.depth)}{x.name}</option>)}
            </select>
          </label>
        )}
        {edit.mode === 'delete' && (
          <>
            <p className="mt-3 text-[13px] text-mt-muted">
              {n > 0 ? <>It has <strong className="text-mt-ink">{n.toLocaleString()} templates</strong>. They will be moved — nothing is deleted.</> : 'It has no templates of its own.'}
              {kids > 0 && <> Its {kids} sub-categor{kids === 1 ? 'y moves' : 'ies move'} up one level.</>}
            </p>
            {n > 0 && (
              <label className="mt-4 block text-[13px] text-mt-muted">Move its templates to
                <select value={target} onChange={(e) => setTarget(e.target.value)} className={`${field} mt-1 w-full`}>
                  <option value="">Choose a category…</option>
                  {flat.filter((x) => x.id !== c?.id).map((x) => <option key={x.id} value={x.id}>{'— '.repeat(x.depth)}{x.name}</option>)}
                </select>
              </label>
            )}
          </>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className={btn}>Cancel</button>
          <button type="submit" disabled={busy || !ok} className={edit.mode === 'delete' ? 'inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold bg-red-600 text-white disabled:opacity-40' : btnDark}>
            {busy && <Loader2 size={14} className="animate-spin" />}{{ add: 'Add category', rename: 'Rename', move: 'Move', delete: 'Delete category' }[edit.mode]}
          </button>
        </div>
      </form>
    </div>
  );
}
