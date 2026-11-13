'use client';

// Home page, festival days only: a greeting card from Magical Touch and a
// short celebration animation (crackers for Diwali, snow for Christmas…).
// Plays once per visitor per day (then just the card); never on other days.
// Admin preview: /?festivalPreview=Diwali

import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { DEFAULT_WISHES, WishEffect, WishItem, localDay, parseWishes } from '@/lib/festivalWishes';

const SPEC = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B', '#FFD27A'];
const key = (d: string) => `mt:wish:${d}`;

type P = { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: string; rot: number; vr: number };

function runEffect(canvas: HTMLCanvasElement, effect: WishEffect, seconds: number, onEnd: () => void, emojis: string[] = []) {
  const ctx = canvas.getContext('2d')!;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const resize = () => { canvas.width = innerWidth * dpr; canvas.height = innerHeight * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  window.addEventListener('resize', resize);
  const W = () => innerWidth, H = () => innerHeight;
  const ps: P[] = [];
  const rnd = (a: number, b: number) => a + Math.random() * (b - a);
  const pick = <T,>(l: T[]) => l[Math.floor(Math.random() * l.length)];
  const burst = (x: number, y: number) => {
    const col = pick(SPEC), n = 46;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, sp = rnd(2.2, 4.6);
      ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(55, 80), size: rnd(1.6, 2.8), color: Math.random() < 0.3 ? '#FFFFFF' : col, kind: 'spark', rot: 0, vr: 0 });
    }
  };
  const t0 = performance.now();
  let last = 0, raf = 0;
  const loop = (now: number) => {
    const t = (now - t0) / 1000;
    const spawning = t < seconds - 1.2;
    ctx.clearRect(0, 0, W(), H());
    // spawn
    // The festival's own emojis drift across now and then.
    if (spawning && emojis.length && Math.random() < 0.035) ps.push({ x: rnd(0, W()), y: H() + 30, vx: rnd(-0.3, 0.3), vy: -rnd(0.9, 1.7), life: 0, max: 900, size: rnd(22, 34), color: pick(emojis), kind: 'emoji', rot: rnd(-0.3, 0.3), vr: rnd(-0.005, 0.005) });
    if (spawning && now - last > (effect === 'fireworks' ? 420 : effect === 'diyas' || effect === 'moon' ? 260 : 70)) {
      last = now;
      if (effect === 'diyas') ps.push({ x: rnd(W() * 0.04, W() * 0.96), y: H() + 20, vx: rnd(-0.15, 0.15), vy: -rnd(0.6, 1.2), life: 0, max: 900, size: rnd(12, 20), color: pick(['#FFB347', '#FFD27A', '#FF9F43']), kind: 'diya', rot: rnd(0, 6), vr: rnd(0.02, 0.05) });
      else if (effect === 'flowers') ps.push({ x: rnd(0, W()), y: -20, vx: rnd(-0.5, 0.5), vy: rnd(0.8, 1.6), life: 0, max: 900, size: rnd(9, 15), color: pick(['#F59E0B', '#F2708F', '#FDE047', '#FB7185', '#FFFFFF']), kind: 'flower', rot: rnd(0, 6), vr: rnd(-0.03, 0.03) });
      else if (effect === 'moon') { if (!ps.some((q) => q.kind === 'moon')) ps.push({ x: W() * 0.82, y: H() * 0.18, vx: 0, vy: 0, life: 0, max: seconds * 60, size: Math.min(70, W() * 0.08), color: '#FFE9A8', kind: 'moon', rot: 0, vr: 0 }); ps.push({ x: rnd(0, W()), y: rnd(0, H() * 0.75), vx: 0, vy: 0, life: 0, max: rnd(60, 120), size: rnd(5, 10), color: pick(['#FFFFFF', '#FFE9A8']), kind: 'star', rot: 0, vr: 0 }); }
      else
      if (effect === 'fireworks') ps.push({ x: rnd(W() * 0.12, W() * 0.88), y: H() + 10, vx: rnd(-0.6, 0.6), vy: -rnd(9, 12.5), life: 0, max: rnd(42, 58), size: 2.4, color: '#FFE08A', kind: 'rocket', rot: 0, vr: 0 });
      else if (effect === 'snow') for (let i = 0; i < 3; i++) ps.push({ x: rnd(0, W()), y: -10, vx: rnd(-0.4, 0.4), vy: rnd(0.8, 1.8), life: 0, max: 900, size: rnd(2, 5), color: '#FFFFFF', kind: 'snow', rot: rnd(0, 6), vr: rnd(0.01, 0.03) });
      else if (effect === 'lanterns') ps.push({ x: rnd(W() * 0.05, W() * 0.95), y: H() + 20, vx: rnd(-0.2, 0.2), vy: -rnd(0.8, 1.6), life: 0, max: 900, size: rnd(14, 24), color: pick(['#FFD27A', '#FFB86B', '#F6E7B0']), kind: 'lantern', rot: rnd(0, 6), vr: rnd(0.01, 0.03) });
      else if (effect === 'colours') { const x = rnd(0, W()), y = rnd(H() * 0.1, H() * 0.8), c = pick(SPEC); for (let i = 0; i < 16; i++) { const a = rnd(0, 6.28), sp = rnd(0.5, 3); ps.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0, max: rnd(60, 100), size: rnd(6, 16), color: c, kind: 'puff', rot: 0, vr: 0 }); } }
      else if (effect === 'hearts') ps.push({ x: rnd(0, W()), y: H() + 20, vx: rnd(-0.3, 0.3), vy: -rnd(1.2, 2.4), life: 0, max: 900, size: rnd(10, 20), color: pick(['#F2708F', '#FF8FB1', '#A69BD3']), kind: 'heart', rot: rnd(-0.4, 0.4), vr: rnd(-0.01, 0.01) });
      else if (effect === 'leaves') ps.push({ x: rnd(0, W()), y: -20, vx: rnd(-0.6, 0.6), vy: rnd(1, 2), life: 0, max: 900, size: rnd(9, 15), color: pick(['#E07A2E', '#D9480F', '#F2A541', '#B5651D']), kind: 'leaf', rot: rnd(0, 6), vr: rnd(-0.05, 0.05) });
      else if (effect === 'stars') ps.push({ x: rnd(0, W()), y: rnd(0, H() * 0.7), vx: 0, vy: 0, life: 0, max: rnd(60, 120), size: rnd(6, 12), color: pick(['#FFFFFF', '#FFD27A', '#A69BD3']), kind: 'star', rot: 0, vr: 0 });
      else for (let i = 0; i < 3; i++) ps.push({ x: rnd(0, W()), y: -10, vx: rnd(-1, 1), vy: rnd(2, 4), life: 0, max: 900, size: rnd(6, 10), color: pick(SPEC), kind: 'confetti', rot: rnd(0, 6), vr: rnd(-0.2, 0.2) });
    }
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life++;
      p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      if (p.kind === 'spark') { p.vy += 0.045; p.vx *= 0.985; p.vy *= 0.985; }
      if (p.kind === 'puff') { p.vx *= 0.96; p.vy *= 0.96; p.size *= 1.01; }
      if (p.kind === 'snow' || p.kind === 'leaf' || p.kind === 'lantern' || p.kind === 'flower' || p.kind === 'diya' || p.kind === 'emoji') p.x += Math.sin(p.rot) * 0.6;
      if (p.kind === 'rocket' && (p.life >= p.max || p.vy > -1)) { burst(p.x, p.y); ps.splice(i, 1); continue; }
      if (p.kind === 'rocket') p.vy += 0.12;
      const fade = p.kind === 'moon' ? Math.min(1, p.life / 30, (p.max - p.life) / 40) : p.kind === 'spark' || p.kind === 'puff' || p.kind === 'star' ? 1 - p.life / p.max : t > seconds - 1.2 ? Math.max(0, (seconds - t) / 1.2) : 1;
      if (p.life > p.max || p.y > H() + 40 || p.y < -60 || fade <= 0) { ps.splice(i, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, fade));
      ctx.translate(p.x, p.y);
      ctx.fillStyle = p.color;
      switch (p.kind) {
        case 'rocket': ctx.fillRect(-1, -6, 2, 12); break;
        case 'spark': ctx.shadowColor = p.color; ctx.shadowBlur = 8; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.29); ctx.fill(); break;
        case 'snow': ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.29); ctx.fill(); break;
        case 'puff': ctx.globalAlpha *= 0.55; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.29); ctx.fill(); break;
        case 'lantern': ctx.shadowColor = p.color; ctx.shadowBlur = 18; ctx.beginPath(); ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, 6.29); ctx.fill(); break;
        case 'heart': ctx.rotate(p.rot); ctx.beginPath(); const s = p.size; ctx.moveTo(0, s * 0.3); ctx.bezierCurveTo(-s, -s * 0.4, -s * 0.4, -s, 0, -s * 0.4); ctx.bezierCurveTo(s * 0.4, -s, s, -s * 0.4, 0, s * 0.3); ctx.fill(); break;
        case 'leaf': ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.45, 0, 0, 6.29); ctx.fill(); break;
        case 'star': { ctx.globalAlpha *= Math.sin((p.life / p.max) * Math.PI); ctx.beginPath(); for (let k = 0; k < 8; k++) { const r = k % 2 ? p.size * 0.25 : p.size; const a = (k / 8) * 6.283; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.fill(); break; }
        case 'emoji': ctx.rotate(p.rot); ctx.font = `${p.size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(p.color, 0, 0); break;
        case 'diya': { const fl = p.size * (0.55 + Math.sin(p.rot) * 0.08); ctx.shadowColor = '#FFB347'; ctx.shadowBlur = 20; ctx.fillStyle = '#FFE08A'; ctx.beginPath(); ctx.ellipse(0, -p.size * 0.35, fl * 0.32, fl * 0.6, 0, 0, 6.29); ctx.fill(); ctx.shadowBlur = 0; ctx.fillStyle = '#B45309'; ctx.beginPath(); ctx.ellipse(0, p.size * 0.15, p.size * 0.7, p.size * 0.3, 0, 0, Math.PI); ctx.fill(); break; }
        case 'flower': { ctx.rotate(p.rot); for (let k = 0; k < 5; k++) { ctx.rotate(1.2566); ctx.beginPath(); ctx.ellipse(0, -p.size * 0.5, p.size * 0.28, p.size * 0.5, 0, 0, 6.29); ctx.fill(); } ctx.fillStyle = '#FDE68A'; ctx.beginPath(); ctx.arc(0, 0, p.size * 0.22, 0, 6.29); ctx.fill(); break; }
        case 'moon': { ctx.shadowColor = '#FFE9A8'; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(0, 0, p.size, 0, 6.29); ctx.fill(); ctx.globalCompositeOperation = 'destination-out'; ctx.shadowBlur = 0; ctx.beginPath(); ctx.arc(p.size * 0.42, -p.size * 0.18, p.size * 0.88, 0, 6.29); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break; }
        default: ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      }
      ctx.restore();
    }
    if (t < seconds || ps.length) raf = requestAnimationFrame(loop);
    else { window.removeEventListener('resize', resize); onEnd(); }
  };
  raf = requestAnimationFrame(loop);
  return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
}

export function FestivalWish() {
  const [wish, setWish] = useState<WishItem | null>(null);
  const [card, setCard] = useState(false);
  const [playing, setPlaying] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const preview = new URLSearchParams(location.search).get('festivalPreview');
    const today = localDay();
    if (preview) {
      const d = DEFAULT_WISHES[preview] || { title: `Happy ${preview}!`, message: 'From all of us at Magical Touch Design.', effect: 'confetti' as WishEffect, emoji: '✨' };
      setWish({ date: today, name: preview, enabled: true, ...d }); setCard(true); setPlaying(true);
      return;
    }
    supabase.from('site_settings').select('value').eq('key', 'festival_wishes').maybeSingle().then(({ data }) => {
      const s = parseWishes((data as any)?.value);
      if (!s.enabled) return;
      const w = s.items.find((i) => i.enabled && i.date === today);
      if (!w) return;
      setWish(w);
      let seen: string | null = null;
      try { seen = localStorage.getItem(key(today)); } catch { /* private mode */ }
      if (seen === 'closed') return;
      setCard(true);
      const calm = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (!seen && !calm) setTimeout(() => setPlaying(true), 1400); // after the intro
      try { localStorage.setItem(key(today), 'seen'); } catch { /* private mode */ }
    });
  }, []);

  useEffect(() => {
    if (!playing || !wish || !canvasRef.current) return;
    // Split "🪔 🪷 🎆" into single emojis (space separated).
    const emojis = (wish.emoji || '').split(/\s+/).filter(Boolean);
    return runEffect(canvasRef.current, wish.effect, 8, () => setPlaying(false), emojis);
  }, [playing, wish]);

  if (!wish) return null;
  const close = () => { setCard(false); setPlaying(false); try { localStorage.setItem(key(localDay()), 'closed'); } catch { /* private mode */ } };

  return (
    <>
      {playing && <canvas ref={canvasRef} aria-hidden className="fixed inset-0 z-[60] pointer-events-none" style={{ width: '100vw', height: '100vh' }} />}
      {card && (
        <div role="status" className="fixed z-[61] left-1/2 -translate-x-1/2 bottom-4 sm:bottom-6 w-[calc(100%-24px)] max-w-[460px] rounded-2xl p-[1.5px] shadow-2xl" style={{ background: 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)', animation: 'mtWishIn .6s cubic-bezier(.2,.9,.3,1.2)' }}>
          <style>{`@keyframes mtWishIn{from{opacity:0;transform:translate(-50%,24px) scale(.96)}to{opacity:1;transform:translate(-50%,0) scale(1)}}`}</style>
          {/* Uses the site's light / dark theme colours, so it reads well in both. */}
          <div className="rounded-[15px] bg-mt-surface text-mt-ink px-4 py-3.5 flex items-center gap-3">
            <span className="text-[28px] leading-none select-none whitespace-nowrap" aria-hidden>{wish.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[16px] leading-tight">{wish.title}</p>
              <p className="text-[12.5px] text-mt-muted mt-0.5 leading-snug">{wish.message}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <button type="button" onClick={close} aria-label="Close" className="p-1 rounded-full text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"><X size={16} /></button>
              {!playing && <button type="button" onClick={() => setPlaying(true)} className="text-[11px] font-semibold text-[#3B82C4] hover:underline">Celebrate ✨</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
