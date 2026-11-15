'use client';

// Face retouch panel of the Photo Studio: finds the face on the device, then
// eyes, mouth and gentle shape edits with a live close-up preview. Nothing is
// applied to the photo until "Apply face edits".

import { useEffect, useMemo, useRef, useState } from 'react';
import { FACE_PRESETS, FACE_SLIDERS, FaceEdit, NO_FACE_EDIT, Pt, applyFaceEdit, detectFace, faceBox, isFaceNeutral } from '@/lib/photo/face';

const chip = 'rounded-full border border-mt-line px-2.5 py-1 text-[12px] hover:bg-mt-surface2';

export function FaceTools({ target, busy, onApply }: { target: HTMLCanvasElement | null; busy: boolean; onApply: (label: string, fn: () => HTMLCanvasElement) => void }) {
  const [lm, setLm] = useState<Pt[] | null>(null);
  const [size, setSize] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [edit, setEdit] = useState<FaceEdit>(NO_FACE_EDIT);
  const [compare, setCompare] = useState(false);
  const prevRef = useRef<HTMLCanvasElement>(null);

  // Landmarks belong to one picture size; a crop or resize means finding the face again.
  const curSize = target ? `${target.width}x${target.height}` : '';
  useEffect(() => { if (lm && curSize !== size) { setLm(null); setStatus('The picture changed size — find the face again.'); } }, [curSize, size, lm]);

  const find = async () => {
    if (!target) return;
    setStatus('Loading the face finder…');
    try {
      const pts = await detectFace(target, setStatus);
      if (!pts) { setLm(null); setStatus('No face found. Face tools need a clear, front-facing face.'); return; }
      setLm(pts); setSize(`${target.width}x${target.height}`); setStatus('Face found.');
    } catch (e) {
      console.error(e);
      setStatus('The face finder could not load (it needs an internet connection the first time). Please try again.');
    }
  };

  // Close-up preview of the face with the edit (or the original when comparing).
  const box = useMemo(() => (lm ? faceBox(lm) : null), [lm]);
  useEffect(() => {
    const cv = prevRef.current;
    if (!cv || !target || !lm || !box) return;
    const id = setTimeout(() => {
      const pad = Math.max(box.w, box.h) * 0.15;
      const sx = Math.max(0, box.x - pad), sy = Math.max(0, box.y - pad);
      const sw = Math.min(target.width - sx, box.w + 2 * pad), sh = Math.min(target.height - sy, box.h + 2 * pad);
      const src = compare || isFaceNeutral(edit) ? target : applyFaceEdit(target, lm, edit);
      const s = Math.min(1, 520 / Math.max(sw, sh));
      cv.width = Math.max(1, Math.round(sw * s)); cv.height = Math.max(1, Math.round(sh * s));
      cv.getContext('2d')!.drawImage(src, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
    }, 120);
    return () => clearTimeout(id);
  }, [target, lm, box, edit, compare]);

  const set = (p: Partial<FaceEdit>) => setEdit((e) => ({ ...e, ...p }));
  const apply = () => {
    if (!target || !lm || isFaceNeutral(edit)) return;
    const t = target, l = lm, e = edit;
    onApply('Face retouch', () => applyFaceEdit(t, l, e));
    setEdit(NO_FACE_EDIT);
  };

  return (
    <div className="space-y-2" aria-label="Face tools">
      <p className="text-[11.5px] text-mt-muted">Eyes, teeth, lips and face shape. The face is found on this device (the face finder is downloaded once; your photo is never uploaded). Shape changes are capped so faces stay natural.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chip} disabled={!target || busy} onClick={find}>{lm ? 'Find face again' : 'Find face'}</button>
        {status && <span role="status" className="text-[11.5px] text-mt-muted">{status}</span>}
      </div>
      {lm && (
        <>
          <canvas ref={prevRef} aria-label="Face preview" className="w-full rounded-lg bg-mt-surface2" />
          <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Show original</label>
          {(['Female portrait', 'Male portrait'] as const).map((g) => (
            <div key={g} role="group" aria-label={`${g} face presets`}>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mt-faint">{g}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {FACE_PRESETS.filter((p) => p.group === g).map((p) => (
                  <button key={p.id} type="button" className={chip} onClick={() => setEdit({ ...NO_FACE_EDIT, ...p.edit })}>{p.name}</button>
                ))}
              </div>
            </div>
          ))}
          {(['Eyes', 'Mouth', 'Shape'] as const).map((g) => (
            <div key={g} role="group" aria-label={`Face ${g.toLowerCase()}`} className="space-y-1.5">
              <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-mt-faint">{g}</p>
              {FACE_SLIDERS.filter((d) => d.group === g).map((d) => (
                <label key={d.key} className="block text-[12px]">
                  <span className="flex justify-between"><span>{d.label}</span><span className="tabular-nums text-mt-faint">{edit[d.key] as number}</span></span>
                  <input type="range" className="w-full" aria-label={d.label} min={d.min} max={d.max} value={edit[d.key] as number} onChange={(e) => set({ [d.key]: +e.target.value } as Partial<FaceEdit>)} />
                </label>
              ))}
              {g === 'Eyes' && <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={edit.redEye} onChange={(e) => set({ redEye: e.target.checked })} /> Fix red eye</label>}
              {g === 'Mouth' && <label className="flex items-center gap-2 text-[12px]">Lip shade <input type="color" aria-label="Lip shade" value={edit.lipColour} onChange={(e) => set({ lipColour: e.target.value, lipAmount: edit.lipAmount || 35 })} /></label>}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" className="rounded-lg bg-[#3B82C4] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50" disabled={busy || isFaceNeutral(edit)} onClick={apply}>Apply face edits</button>
            <button type="button" className={chip} onClick={() => setEdit(NO_FACE_EDIT)}>Reset</button>
          </div>
        </>
      )}
    </div>
  );
}
