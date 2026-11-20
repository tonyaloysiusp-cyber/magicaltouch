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
  const [ws, setWs] = useState(false);            // the full face workspace (preview | controls)
  const [mode, setMode] = useState<'split' | 'before' | 'after'>('split');
  const [region, setRegion] = useState<'face' | 'photo'>('face');
  const [cut, setCut] = useState(0.5);            // split divider position
  const edited = useRef<{ key: string; cv: HTMLCanvasElement } | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Landmarks belong to one picture size; a crop or resize means finding the face again.
  const curSize = target ? `${target.width}x${target.height}` : '';
  useEffect(() => { if (lm && curSize !== size) { setLm(null); setStatus('The picture changed size — find the face again.'); } }, [curSize, size, lm]);

  const find = async () => {
    if (!target) return;
    setStatus('Loading the face finder…');
    try {
      const pts = await detectFace(target, setStatus);
      if (!pts) { setLm(null); setStatus('No face found. Face tools need a clear, front-facing face.'); return; }
      setLm(pts); setSize(`${target.width}x${target.height}`); setStatus('Face found.'); setWs(true);
    } catch (e) {
      console.error(e);
      setStatus('The face finder could not load (it needs an internet connection the first time). Please try again.');
    }
  };

  // Preview: original and edited side by side with a draggable divider (or one of them),
  // on the face close-up or the whole photo. The photo itself is untouched until Apply.
  const box = useMemo(() => (lm ? faceBox(lm) : null), [lm]);
  useEffect(() => {
    const cv = prevRef.current;
    if (!cv || !target || !lm || !box) return;
    const id = setTimeout(() => {
      const key = JSON.stringify(edit) + curSize;
      if (!edited.current || edited.current.key !== key) edited.current = { key, cv: isFaceNeutral(edit) ? target : applyFaceEdit(target, lm, edit) };
      const after = edited.current.cv;
      let sx = 0, sy = 0, sw = target.width, sh = target.height;
      if (region === 'face') {
        const pad = Math.max(box.w, box.h) * 0.22;
        sx = Math.max(0, box.x - pad); sy = Math.max(0, box.y - pad);
        sw = Math.min(target.width - sx, box.w + 2 * pad); sh = Math.min(target.height - sy, box.h + 2 * pad);
      }
      const maxW = ws ? 1400 : 520, s = Math.min(1, maxW / Math.max(sw, sh));
      cv.width = Math.max(1, Math.round(sw * s)); cv.height = Math.max(1, Math.round(sh * s));
      const g = cv.getContext('2d')!;
      const m = compare ? 'before' : mode;
      g.drawImage(m === 'before' ? target : after, sx, sy, sw, sh, 0, 0, cv.width, cv.height);
      if (m === 'split') {
        const x = Math.round(cv.width * cut);
        g.save(); g.beginPath(); g.rect(0, 0, x, cv.height); g.clip();
        g.drawImage(target, sx, sy, sw, sh, 0, 0, cv.width, cv.height); g.restore();
        g.fillStyle = '#FFFFFF'; g.fillRect(x - 1, 0, 2, cv.height);
      }
    }, 90);
    return () => clearTimeout(id);
  }, [target, lm, box, edit, compare, mode, region, cut, ws, curSize]);
  const dragCut = (e: React.PointerEvent) => {
    const el = prevRef.current; if (!el || mode !== 'split') return;
    const move = (ev: PointerEvent) => { const r = el.getBoundingClientRect(); setCut(Math.max(0.02, Math.min(0.98, (ev.clientX - r.left) / r.width))); };
    move(e.nativeEvent); window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', () => window.removeEventListener('pointermove', move), { once: true });
  };

  const set = (p: Partial<FaceEdit>) => setEdit((e) => ({ ...e, ...p }));
  const pick = (id: string, k = strength) => { const p = FACE_PRESETS.find((x) => x.id === id); if (!p) return; setPreset(id); setEdit(presetAt(p.edit, k)); };
  const changed = (g: SliderGroup) => FACE_SLIDERS.filter((d) => d.group === g && (edit[d.key] as number) !== (NO_FACE_EDIT[d.key] as number)).length;
  const apply = () => {
    if (!target || !lm || isFaceNeutral(edit)) return;
    const t = target, l = lm, e = edit;
    onApply('Face retouch', () => applyFaceEdit(t, l, e));
    setEdit(NO_FACE_EDIT); setPreset(null); setWs(false);
  };
  const cancel = () => { setEdit(NO_FACE_EDIT); setPreset(null); setWs(false); };

  return (
    <div className="space-y-2" aria-label="Face tools">
      <p className="text-[11.5px] text-mt-muted">Eyes, brows, nose, lips and face shape — pick a look, set its strength, fine-tune any slider. The face is found on this device (the face finder is downloaded once; your photo is never uploaded). Shape changes are capped so faces stay natural.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={chip} disabled={!target || busy} onClick={find}>{lm ? 'Find face again' : 'Find face'}</button>
        {status && <span role="status" className="text-[11.5px] text-mt-muted">{status}</span>}
      </div>
      {lm && !ws && (
        <div className="space-y-2 rounded-xl border border-mt-line p-2.5">
          <p className="text-[12px]">{isFaceNeutral(edit) ? 'Face ready.' : 'You have face edits that are not applied yet.'}</p>
          <button type="button" className="w-full rounded-lg bg-[#3B82C4] px-3 py-2 text-[12.5px] font-semibold text-white" onClick={() => setWs(true)}>Open face workspace</button>
        </div>
      )}
      {lm && ws && (
        <div role="dialog" aria-modal="true" aria-label="Face workspace" className="fixed inset-0 z-[95] flex items-stretch justify-center bg-[#0B0B12]/55 p-2 sm:p-4 backdrop-blur-sm">
          <div className="flex w-full max-w-[1500px] flex-col overflow-hidden rounded-2xl border border-mt-border bg-mt-surface shadow-2xl">
            <div className="flex flex-wrap items-center gap-2 border-b border-mt-border px-4 py-2.5">
              <h2 className="mr-auto text-[14px] font-semibold">Face &amp; sculpt</h2>
              <div role="radiogroup" aria-label="Preview mode" className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px]">
                {(['before', 'split', 'after'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => setMode(v)} className={`h-7 rounded-full px-3 font-semibold ${mode === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'before' ? 'Before' : v === 'split' ? 'Split' : 'After'}</button>)}
              </div>
              <div role="radiogroup" aria-label="Preview area" className="inline-flex rounded-full border border-mt-border p-0.5 text-[12px]">
                {(['face', 'photo'] as const).map((v) => <button key={v} type="button" role="radio" aria-checked={region === v} onClick={() => setRegion(v)} className={`h-7 rounded-full px-3 font-semibold ${region === v ? 'bg-mt-ink text-mt-bg' : 'text-mt-muted'}`}>{v === 'face' ? 'Face' : 'Whole photo'}</button>)}
              </div>
              <button type="button" className={chip} onPointerDown={() => setCompare(true)} onPointerUp={() => setCompare(false)} onPointerLeave={() => setCompare(false)}>Hold to compare</button>
            </div>
            <div className="grid min-h-0 flex-1 lg:grid-cols-[minmax(0,1fr)_380px]">
              {/* Preview */}
              <div ref={wrapRef} className="relative flex min-h-[40vh] items-center justify-center overflow-auto bg-[#1B1B22] p-3">
                <canvas ref={prevRef} aria-label="Face preview" onPointerDown={dragCut} className={`max-h-[74vh] max-w-full rounded-lg ${mode === 'split' ? 'cursor-ew-resize touch-none' : ''}`} />
                {mode === 'split' && <span className="pointer-events-none absolute left-4 top-4 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">Before</span>}
                {mode === 'split' && <span className="pointer-events-none absolute right-4 top-4 rounded-md bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">After</span>}
                <span className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white">Preview only — the photo changes when you press Apply</span>
              </div>
              {/* Controls */}
              <div className="min-h-0 space-y-2 overflow-y-auto border-t border-mt-border p-3 lg:border-l lg:border-t-0">
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
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-mt-border px-4 py-2.5">
              <button type="button" className={chip} onClick={() => { setEdit(NO_FACE_EDIT); setPreset(null); }}>Reset</button>
              <span className="mr-auto text-[11.5px] text-mt-muted">{isFaceNeutral(edit) ? 'No changes yet' : `${FACE_SLIDERS.filter((d) => (edit[d.key] as number) !== (NO_FACE_EDIT[d.key] as number)).length} adjustments`}</span>
              <button type="button" className="h-9 rounded-lg border border-mt-border px-4 text-[13px] font-semibold hover:bg-mt-surface2" onClick={cancel}>Cancel</button>
              <button type="button" className="h-9 rounded-lg bg-[#3B82C4] px-4 text-[13px] font-semibold text-white disabled:opacity-50" disabled={busy || isFaceNeutral(edit)} onClick={apply}>Apply face edits</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
