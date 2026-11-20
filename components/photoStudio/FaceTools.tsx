'use client';

// Face retouch panel of the Photo Studio: finds the face on the device, then
// eyes, mouth and gentle shape edits with a live close-up preview. Nothing is
// applied to the photo until "Apply face edits".

import { useEffect, useMemo, useRef, useState } from 'react';
import { FACE_PRESETS, FACE_SLIDERS, FaceEdit, NO_FACE_EDIT, Pt, SLIDER_GROUPS, applyFaceEdit, detectFace, faceBox, isFaceNeutral, presetAt, type PresetGroup, type SliderGroup } from '@/lib/photo/face';

const chip = 'rounded-full border border-mt-line px-2.5 py-1 text-[12px] hover:bg-mt-surface2';

export function FaceTools({ target, busy, onApply }: { target: HTMLCanvasElement | null; busy: boolean; onApply: (label: string, fn: () => HTMLCanvasElement) => void }) {
  const [lm, setLm] = useState<Pt[] | null>(null);
  const [size, setSize] = useState<string>('');
  const [status, setStatus] = useState<string>('');
  const [edit, setEdit] = useState<FaceEdit>(NO_FACE_EDIT);
  const [compare, setCompare] = useState(false);
  const [preset, setPreset] = useState<string | null>(null);
  const [strength, setStrength] = useState(100);
  const [open, setOpen] = useState<SliderGroup | null>('Eyes');
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
  const pick = (id: string, k = strength) => { const p = FACE_PRESETS.find((x) => x.id === id); if (!p) return; setPreset(id); setEdit(presetAt(p.edit, k)); };
  const changed = (g: SliderGroup) => FACE_SLIDERS.filter((d) => d.group === g && (edit[d.key] as number) !== (NO_FACE_EDIT[d.key] as number)).length;
  const apply = () => {
    if (!target || !lm || isFaceNeutral(edit)) return;
    const t = target, l = lm, e = edit;
    onApply('Face retouch', () => applyFaceEdit(t, l, e));
    setEdit(NO_FACE_EDIT); setPreset(null);
  };

  return (
    <div className="space-y-2" aria-label="Face tools">
      <p className="text-[11.5px] text-mt-muted">Eyes, brows, nose, lips and face shape — pick a look, set its strength, fine-tune any slider. The face is found on this device (the face finder is downloaded once; your photo is never uploaded). Shape changes are capped so faces stay natural.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chip} disabled={!target || busy} onClick={find}>{lm ? 'Find face again' : 'Find face'}</button>
        {status && <span role="status" className="text-[11.5px] text-mt-muted">{status}</span>}
      </div>
      {lm && (
        <>
          <canvas ref={prevRef} aria-label="Face preview" className="w-full rounded-lg bg-mt-surface2" />
          <div className="flex items-center gap-3 text-[12px]"><label className="flex items-center gap-2"><input type="checkbox" checked={compare} onChange={(e) => setCompare(e.target.checked)} /> Show original</label><button type="button" className={chip} onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}>Hold to compare</button></div>
          {/* One-tap looks, then one Strength slider — anyone can use it; every slider below stays editable. */}
          {(['Natural', 'Beauty', 'Sculpt', 'Portrait (men)'] as PresetGroup[]).map((g) => (
            <div key={g} role="group" aria-label={`${g} face presets`}>
              <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-mt-faint">{g}</p>
              <div className="mt-1 grid grid-cols-3 gap-1.5">
                {FACE_PRESETS.filter((p) => p.group === g).map((p) => (
                  <button key={p.id} type="button" aria-pressed={preset === p.id} onClick={() => pick(p.id)}
                    className={`rounded-xl border px-2 py-2 text-[11.5px] font-semibold leading-tight ${preset === p.id ? 'border-[#3B82C4] bg-[#3B82C4]/10 text-mt-ink' : 'border-mt-line hover:bg-mt-surface2'}`}>{p.name}</button>
                ))}
              </div>
            </div>
          ))}
          {preset && (
            <label className="block rounded-xl bg-mt-surface2 p-2.5 text-[12px]">
              <span className="flex justify-between font-semibold"><span>Strength</span><span className="tabular-nums">{strength}%</span></span>
              <input type="range" className="w-full" aria-label="Preset strength" min={0} max={150} step={5} value={strength} onChange={(e) => { const k = +e.target.value; setStrength(k); pick(preset, k); }} />
            </label>
          )}
          {SLIDER_GROUPS.map((g) => (
            <div key={g} role="group" aria-label={`Face ${g.toLowerCase()}`} className="rounded-xl border border-mt-line">
              <button type="button" aria-expanded={open === g} onClick={() => setOpen(open === g ? null : g)} className="w-full flex items-center justify-between px-2.5 py-2 text-[12px] font-semibold">
                <span>{g}{changed(g) ? <span className="ml-1.5 rounded-full bg-[#3B82C4] px-1.5 text-[10px] text-white">{changed(g)}</span> : null}</span>
                <span aria-hidden className="text-mt-faint">{open === g ? '−' : '+'}</span>
              </button>
              {open === g && (
                <div className="space-y-1.5 px-2.5 pb-2.5">
                  {FACE_SLIDERS.filter((d) => d.group === g).map((d) => (
                    <label key={d.key} className="block text-[12px]" title="Double-click to reset">
                      <span className="flex justify-between"><span>{d.label}</span><span className="tabular-nums text-mt-faint">{edit[d.key] as number}</span></span>
                      <input type="range" className="w-full" aria-label={d.label} min={d.min} max={d.max} value={edit[d.key] as number} onDoubleClick={() => set({ [d.key]: NO_FACE_EDIT[d.key] } as Partial<FaceEdit>)} onChange={(e) => set({ [d.key]: +e.target.value } as Partial<FaceEdit>)} />
                    </label>
                  ))}
                  {g === 'Eyes' && <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={edit.redEye} onChange={(e) => set({ redEye: e.target.checked })} /> Fix red eye</label>}
                  {g === 'Mouth' && <label className="flex items-center gap-2 text-[12px]">Lip shade <input type="color" aria-label="Lip shade" value={edit.lipColour} onChange={(e) => set({ lipColour: e.target.value, lipAmount: edit.lipAmount || 35 })} /></label>}
                  {changed(g) > 0 && <button type="button" className="text-[11.5px] font-semibold text-[#3B82C4]" onClick={() => set(Object.fromEntries(FACE_SLIDERS.filter((d) => d.group === g).map((d) => [d.key, NO_FACE_EDIT[d.key]])) as Partial<FaceEdit>)}>Reset {g.toLowerCase()}</button>}
                </div>
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-1">
            <button type="button" className="rounded-lg bg-[#3B82C4] px-3 py-1.5 text-[12.5px] font-medium text-white disabled:opacity-50" disabled={busy || isFaceNeutral(edit)} onClick={apply}>Apply face edits</button>
            <button type="button" className={chip} onClick={() => { setEdit(NO_FACE_EDIT); setPreset(null); }}>Reset</button>
          </div>
        </>
      )}
    </div>
  );
}
