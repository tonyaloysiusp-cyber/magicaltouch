'use client';

// "Upload your screenshot" step of a practical lesson.

import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle2, Loader2, RefreshCw } from 'lucide-react';
import { listEvidence, uploadEvidence } from '@/lib/courseEvidence';

export function EvidenceUpload({ userId, courseId, lessonId, locked, onChange }: { userId: string; courseId: string; lessonId: string; locked?: boolean; onChange: (has: boolean) => void }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let live = true;
    listEvidence(userId, courseId).then((m) => { if (!live) return; const e = m[lessonId]; setUrl(e?.url || null); onChange(!!e); }).catch(() => onChange(false));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, courseId, lessonId]);

  const pick = async (f: File) => {
    setBusy(true); setMsg(null);
    try {
      const size = await uploadEvidence(userId, courseId, lessonId, f);
      const m = await listEvidence(userId, courseId);
      setUrl(m[lessonId]?.url || null);
      onChange(true);
      setMsg(`Saved (${Math.max(1, Math.round(size / 1024))} KB, a small copy for review).`);
    } catch (e: any) {
      setMsg(e?.message || 'Upload failed. Please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="rounded-xl border border-dashed border-mt-border p-3 flex flex-wrap items-center gap-3">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="Your uploaded screenshot" className="h-20 w-28 object-cover rounded-lg border border-mt-border" />
      ) : (
        <span className="h-20 w-28 rounded-lg bg-mt-surface2 grid place-items-center text-mt-faint"><Camera size={22} aria-hidden /></span>
      )}
      <div className="flex-1 min-w-[180px]">
        <p className="text-[14px] font-medium inline-flex items-center gap-1.5">{url ? <><CheckCircle2 size={16} className="text-emerald-600" aria-hidden /> Screenshot uploaded</> : 'Upload a screenshot of your design'}</p>
        <p className="text-[12px] text-mt-muted">Open any template, make the changes from this lesson, then take a screenshot. It is shrunk to a small copy only our team sees.</p>
        {msg && <p role="status" className="text-[12px] mt-1 text-mt-muted">{msg}</p>}
      </div>
      {!locked && (
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="h-10 px-4 rounded-full border border-mt-border bg-mt-surface text-[14px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" aria-hidden /> : url ? <RefreshCw size={15} aria-hidden /> : <Camera size={15} aria-hidden />} {url ? 'Replace' : 'Upload'}
        </button>
      )}
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) pick(f); }} />
    </div>
  );
}
