// After an admin changes templates (create, edit, new thumbnail, category,
// publish / hide, delete), the public lists (home page, gallery, category
// pages) are refreshed automatically: one quiet call, a moment after the
// last change, that clears the cached lists. Non-admins are refused by the
// server, so calling it from shared code is safe.

import { supabase } from './supabase';

let timer: ReturnType<typeof setTimeout> | null = null;

export function refreshPublicLists(delayMs = 1500): void {
  if (typeof window === 'undefined') return;
  if (timer) clearTimeout(timer);
  timer = setTimeout(async () => {
    timer = null;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      await fetch('/api/admin/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
    } catch { /* the hourly refresh still catches up */ }
  }, delayMs);
}
