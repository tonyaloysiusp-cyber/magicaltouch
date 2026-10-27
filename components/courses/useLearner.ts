'use client';

// The signed-in learner and their course progress rows.

import { useCallback, useEffect, useState } from 'react';
import { supabase, getSessionUser } from '@/lib/supabase';
import type { CourseProgress } from '@/lib/courses';

export interface Learner {
  ready: boolean;
  userId: string | null;
  email: string | null;
  profileName: string;
  progress: Record<string, CourseProgress>; // by course_id
  error: string | null;
  reload: () => Promise<void>;
  setRow: (row: CourseProgress) => void;
}

export function useLearner(): Learner {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profileName, setProfileName] = useState('');
  const [progress, setProgress] = useState<Record<string, CourseProgress>>({});
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      const { data: { user } } = await getSessionUser();
      if (!user) {
        setUserId(null);
        setProgress({});
        return;
      }
      setUserId(user.id);
      setEmail(user.email || null);
      const [{ data: rows, error: e1 }, { data: prof }] = await Promise.all([
        supabase.from('course_progress').select('*').eq('user_id', user.id),
        supabase.from('profiles').select('name').eq('id', user.id).maybeSingle(),
      ]);
      if (e1) throw e1;
      setProfileName(((prof as any)?.name as string) || '');
      const map: Record<string, CourseProgress> = {};
      ((rows as CourseProgress[]) || []).forEach((r) => (map[r.course_id] = { ...r, completed_lessons: r.completed_lessons || [] }));
      setProgress(map);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Could not load your progress.');
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const setRow = useCallback((row: CourseProgress) => setProgress((p) => ({ ...p, [row.course_id]: row })), []);
  return { ready, userId, email, profileName, progress, error, reload, setRow };
}

// Save the set of completed lessons. Creates the row on first use. The
// database keeps only real lesson ids and refuses changes once approved.
export async function saveCompleted(userId: string, courseId: string, existing: CourseProgress | undefined, completed: string[]) {
  if (existing) {
    const { data, error } = await supabase.from('course_progress').update({ completed_lessons: completed }).eq('id', existing.id).select('*').single();
    if (error) throw error;
    return data as CourseProgress;
  }
  const { data, error } = await supabase.from('course_progress').insert({ user_id: userId, course_id: courseId, completed_lessons: completed, status: 'in_progress' }).select('*').single();
  if (error) throw error;
  return data as CourseProgress;
}

export async function requestCertificate(row: CourseProgress, name: string) {
  const { data, error } = await supabase.from('course_progress').update({ status: 'pending', learner_name: name }).eq('id', row.id).select('*').single();
  if (error) throw error;
  // Best effort: email a receipt to the learner (the admin inbox message is
  // created by the database itself).
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) await fetch('/api/courses/notify', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ progressId: row.id, event: 'requested' }) });
  } catch {}
  return data as CourseProgress;
}

export async function downloadCertificate(path: string) {
  const { data, error } = await supabase.storage.from('certificates').createSignedUrl(path, 120, { download: true });
  if (error || !data?.signedUrl) throw new Error(error?.message || 'Could not prepare the download.');
  return data.signedUrl;
}
