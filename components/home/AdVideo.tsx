'use client';

// The home page film: a 47-second tour of the advanced features (business
// templates, editing, brand kit, background removal with touch-up, magic
// resize, 37 languages, Photo Studio layers, print-ready export).
// Muted, looping, plays only while on screen; phones get the 720p file.
// Two versions: light and dark, following the site's theme switch.

import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

export function AdVideo() {
  const v = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [small, setSmall] = useState<boolean | null>(null);
  const [dark, setDark] = useState(false);

  // Follow the site theme (useAppTheme puts `dark` on <html>).
  useEffect(() => {
    const el = document.documentElement;
    const read = () => setDark(el.classList.contains('dark'));
    read();
    const mo = new MutationObserver(read);
    mo.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    setSmall(window.matchMedia('(max-width: 900px)').matches || ((navigator as any).connection?.saveData ?? false));
  }, []);

  // Play while visible, pause when scrolled away (saves battery and data).
  useEffect(() => {
    const el = v.current;
    if (!el || small === null) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !reduce) el.play().catch(() => {});
      else el.pause();
    }, { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, [small, dark]);

  const toggle = () => {
    const el = v.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <div className="relative bg-[#F4F6FB] dark:bg-[#070A14] aspect-video">
      {small !== null && (
        <video
          ref={v}
          className="absolute inset-0 w-full h-full object-cover"
          key={dark ? 'dark' : 'light'}
          src={`/api/media/home/ad/magical-touch-ad${dark ? '' : '-light'}${small ? '-720' : ''}.mp4?v=4`}
          poster={`/home/ad/cover${dark ? '' : '-light'}${small ? '-720' : ''}.webp?v=3`}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          aria-label="Magical Touch Design in 47 seconds: professional templates, editing, brand kit, background removal, magic resize, 37 languages, Photo Studio and print-ready export"
        />
      )}
      <div className="absolute right-3 bottom-3 flex gap-2">
        <button type="button" onClick={() => { const el = v.current; if (el) { el.currentTime = 0; el.play().catch(() => {}); } }} aria-label="Play from the start" className="h-10 w-10 rounded-full bg-black/55 text-white backdrop-blur inline-flex items-center justify-center hover:bg-black/70">
          <RotateCcw size={16} />
        </button>
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} className="h-10 w-10 rounded-full bg-black/55 text-white backdrop-blur inline-flex items-center justify-center hover:bg-black/70">
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </div>
  );
}
