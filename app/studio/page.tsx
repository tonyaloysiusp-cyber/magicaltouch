'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { EditorShell } from '@editor/ui/EditorShell';

// Studio: the new ground-up editor engine (src/editor/), Phase 1 only —
// see docs/editor-architecture.md. Separate from the existing production
// editor at /editor, which is unaffected by this route. Storage is local
// (IndexedDB) only; no Supabase design is read or written here. The auth
// guard is kept purely for consistency with every other editing surface
// in this app (a logged-out visitor shouldn't land on an editing screen
// at all), not because this route talks to any backend.
function StudioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const documentId = searchParams.get('documentId') || undefined;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  if (checkingAuth) {
    return <div className="h-screen flex items-center justify-center text-sm text-gray-400">Checking access…</div>;
  }

  return <EditorShell documentId={documentId} />;
}

export default function StudioPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>}>
      <StudioContent />
    </Suspense>
  );
}
