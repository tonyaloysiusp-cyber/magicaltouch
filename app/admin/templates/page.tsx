'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import {
  Template,
  Category,
  CATEGORIES,
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '@/lib/templatesData';

interface TemplateForm {
  name: string;
  category: Category;
  width: number;
  height: number;
  color1: string;
  color2: string;
}

const DEFAULT_FORM: TemplateForm = {
  name: '',
  category: CATEGORIES[0],
  width: 1050,
  height: 600,
  color1: '#14121F',
  color2: '#FAF9F6',
};

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [editing, setEditing] = useState<Template | 'new' | null>(null);
  const [form, setForm] = useState<TemplateForm>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login?next=/admin/templates');
        return;
      }
      setUserId(user.id);
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      const admin = !!profile?.is_admin;
      setIsAdmin(admin);
      if (admin) {
        setTemplates(await fetchTemplates());
      }
      setLoading(false);
    })();
  }, [router]);

  const startNew = () => {
    setError(null);
    setForm(DEFAULT_FORM);
    setEditing('new');
  };

  const startEdit = (t: Template) => {
    setError(null);
    setForm({ name: t.name, category: t.category, width: t.width, height: t.height, color1: t.colors[0], color2: t.colors[1] });
    setEditing(t);
  };

  const save = async () => {
    if (!form.name.trim()) {
      setError('Name is required.');
      return;
    }
    if (form.width <= 0 || form.height <= 0) {
      setError('Width and height must be greater than zero.');
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      category: form.category,
      width: form.width,
      height: form.height,
      colors: [form.color1, form.color2] as [string, string],
    };

    if (editing === 'new') {
      const created = userId ? await createTemplate(payload, userId) : null;
      if (created) {
        setTemplates((prev) => [...prev, created]);
        setEditing(null);
      } else {
        setError('Failed to create template — has the templates migration been applied to this database yet?');
      }
    } else if (editing) {
      const ok = editing.id ? await updateTemplate(editing.id, payload) : false;
      if (ok) {
        setTemplates((prev) => prev.map((t) => (t.id === editing.id ? { ...t, ...payload } : t)));
        setEditing(null);
      } else {
        setError('Failed to save changes.');
      }
    }
    setSaving(false);
  };

  const remove = async (t: Template) => {
    if (!t.id) return;
    if (!window.confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    const ok = await deleteTemplate(t.id);
    if (ok) setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    else window.alert('Failed to delete this template.');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-lg font-semibold text-gray-800">Not authorized</p>
        <p className="text-sm text-gray-500 max-w-sm">
          This page is only available to admin accounts. Ask an existing admin to grant your account access.
        </p>
        <Link href="/dashboard" className="text-sm text-[#6C4FD1] hover:underline">
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-800">Template Admin</h1>
          <p className="text-xs text-gray-500 mt-0.5">Manage the templates shown on the homepage and the /templates gallery.</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/templates" target="_blank" className="text-sm text-[#6C4FD1] hover:underline">
            View public gallery
          </Link>
          <Link href="/dashboard" className="text-sm text-gray-500 hover:underline">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <div className="flex justify-end mb-4">
          <button onClick={startNew} className="text-sm font-semibold text-white bg-brand-gradient rounded-full px-4 py-2 hover:shadow-md transition-shadow">
            + Add Template
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-[11px] text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 font-medium">Preview</th>
                <th className="px-4 py-2 font-medium">Name</th>
                <th className="px-4 py-2 font-medium">Category</th>
                <th className="px-4 py-2 font-medium">Size</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t) => (
                <tr key={t.id || t.name} className="border-t">
                  <td className="px-4 py-2">
                    <div
                      className="w-12 h-8 rounded shrink-0"
                      style={{ background: `linear-gradient(135deg, ${t.colors[0]}, ${t.colors[1]})` }}
                    />
                  </td>
                  <td className="px-4 py-2 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-2 text-gray-500">{t.category}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {t.width}×{t.height}
                  </td>
                  <td className="px-4 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => startEdit(t)}
                      disabled={!t.id}
                      title={!t.id ? 'Built-in fallback template — apply the templates migration to make it editable' : undefined}
                      className="text-xs text-[#6C4FD1] hover:underline mr-3 disabled:text-gray-300 disabled:no-underline"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => remove(t)}
                      disabled={!t.id}
                      title={!t.id ? 'Built-in fallback template — apply the templates migration to make it editable' : undefined}
                      className="text-xs text-red-500 hover:underline disabled:text-gray-300 disabled:no-underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400 text-sm">
                    No templates yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {editing && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 px-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-semibold text-gray-800 mb-4">{editing === 'new' ? 'Add Template' : 'Edit Template'}</h2>
            {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
            <div className="flex flex-col gap-3">
              <label className="text-xs text-gray-500">
                Name
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                />
              </label>
              <label className="text-xs text-gray-500">
                Category
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as Category }))}
                  className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-500">
                  Width (px)
                  <input
                    type="number"
                    min={1}
                    value={form.width}
                    onChange={(e) => setForm((f) => ({ ...f, width: parseInt(e.target.value, 10) || 0 }))}
                    className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Height (px)
                  <input
                    type="number"
                    min={1}
                    value={form.height}
                    onChange={(e) => setForm((f) => ({ ...f, height: parseInt(e.target.value, 10) || 0 }))}
                    className="mt-1 w-full border rounded px-2 py-1.5 text-sm text-gray-800"
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs text-gray-500">
                  Color 1
                  <input
                    type="color"
                    value={form.color1}
                    onChange={(e) => setForm((f) => ({ ...f, color1: e.target.value }))}
                    className="mt-1 w-full h-8 border rounded cursor-pointer"
                  />
                </label>
                <label className="text-xs text-gray-500">
                  Color 2
                  <input
                    type="color"
                    value={form.color2}
                    onChange={(e) => setForm((f) => ({ ...f, color2: e.target.value }))}
                    className="mt-1 w-full h-8 border rounded cursor-pointer"
                  />
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setEditing(null)} className="text-sm px-3 py-1.5 rounded border text-gray-600 hover:bg-gray-50">
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving}
                className="text-sm px-3 py-1.5 rounded bg-brand-gradient text-white disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
