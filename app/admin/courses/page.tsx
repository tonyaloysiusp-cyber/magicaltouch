'use client';

// Courses & certificates (admins only): review certificate requests and
// manage course content. Access is checked here and, for every read and
// write, by the database (is_admin() row-level security and triggers).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AdminShell } from '@/components/admin/AdminShell';
import { supabase } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { CertificateRequests } from '@/components/admin/courses/CertificateRequests';
import { CourseManager } from '@/components/admin/courses/CourseManager';

type Tab = 'requests' | 'courses';

export default function AdminCoursesPage() {
  const router = useRouter();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [tab, setTab] = useState<Tab>('requests');
  const [pending, setPending] = useState<number | null>(null);
  const onCount = useCallback((n: number) => setPending(n), []);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('tab') === 'courses') setTab('courses');
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login?next=/admin/courses');
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      setState(profile?.is_admin ? 'ok' : 'denied');
    })();
  }, [router]);

  if (state === 'loading') return <main className="min-h-screen flex items-center justify-center text-mt-faint bg-mt-bg">Loading…</main>;
  if (state === 'denied')
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-3 bg-mt-bg">
        <p className="text-lg font-semibold text-mt-ink">Administrators only</p>
        <Link href="/dashboard" className="text-sm text-mt-accent hover:underline">Back to your dashboard</Link>
      </main>
    );

  return (
    <AdminShell active="courses" title="Courses & certificates" accent="Courses" subtitle="Review certificate requests — approve, reject with a reason, and release — and manage the tutorials learners see." badges={pending ? { courses: pending } : {}}>
      <div role="tablist" aria-label="Courses admin" className="mb-5 inline-flex rounded-full border border-mt-border p-1">
        {(['requests', 'courses'] as Tab[]).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`h-9 px-4 rounded-full text-[14px] font-semibold ${tab === t ? 'bg-mt-primary text-mt-onprimary' : 'text-mt-muted'}`}>
            {t === 'requests' ? `Certificate requests${pending ? ` (${pending})` : ''}` : 'Courses & lessons'}
          </button>
        ))}
      </div>
      <div hidden={tab !== 'requests'}><CertificateRequests onCount={onCount} /></div>
      {tab === 'courses' && <CourseManager />}
    </AdminShell>
  );
}
