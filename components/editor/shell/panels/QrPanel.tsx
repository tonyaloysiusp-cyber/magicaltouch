'use client';

// QR code generator inside the design workspace. Paste a link, a social
// username, text, an email, a phone number or Wi-Fi details and get a
// real, scannable QR code. A logo in the centre is optional: the logo
// controls appear only when the switch is turned on.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Download, Plus, Link2, AtSign, Type, Mail, Phone, MessageCircle, Wifi, AlertTriangle, X, MessageSquare, Contact, CalendarDays, MapPin } from 'lucide-react';
import { QrKind, QrFields, SOCIAL_PLATFORMS, buildQrPayload, contrastWarning } from '@/lib/qrDesign';
import { QrLook, DEFAULT_LOOK, LOOK_PRESETS, DotShape, EyeFrame, EyeBall, FrameStyle, buildGrid, qrDesignSvg, qrDesignPng } from '@/lib/qrStyle';
import { PanelSection, cx } from '../ui';

const KINDS: { id: QrKind; label: string; icon: React.ReactNode }[] = [
  { id: 'link', label: 'Link', icon: <Link2 size={15} /> },
  { id: 'username', label: 'Username', icon: <AtSign size={15} /> },
  { id: 'text', label: 'Text', icon: <Type size={15} /> },
  { id: 'email', label: 'Email', icon: <Mail size={15} /> },
  { id: 'phone', label: 'Phone', icon: <Phone size={15} /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={15} /> },
  { id: 'wifi', label: 'Wi‑Fi', icon: <Wifi size={15} /> },
  { id: 'sms', label: 'SMS', icon: <MessageSquare size={15} /> },
  { id: 'vcard', label: 'Contact', icon: <Contact size={15} /> },
  { id: 'event', label: 'Event', icon: <CalendarDays size={15} /> },
  { id: 'location', label: 'Location', icon: <MapPin size={15} /> },
];

const DOTS: { id: DotShape; label: string }[] = [
  { id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'dots', label: 'Dots' }, { id: 'fluid', label: 'Fluid' },
  { id: 'vbars', label: 'Bars ↕' }, { id: 'hbars', label: 'Bars ↔' },
];
// Only corner shapes that phone cameras reliably find (checked in tests).
const FRAMES_EYE: { id: EyeFrame; label: string }[] = [{ id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'leaf', label: 'Leaf' }];
const BALLS: { id: EyeBall; label: string }[] = [{ id: 'square', label: 'Square' }, { id: 'rounded', label: 'Rounded' }, { id: 'circle', label: 'Circle' }, { id: 'leaf', label: 'Leaf' }];
const FRAMES: { id: FrameStyle; label: string }[] = [{ id: 'none', label: 'None' }, { id: 'box', label: 'Box' }, { id: 'badge', label: 'Badge' }, { id: 'bubble', label: 'Bubble' }, { id: 'ribbon', label: 'Ribbon' }, { id: 'border', label: 'Border' }];
const CAPTIONS = ['SCAN ME', 'SCAN TO PAY', 'SEE OUR MENU', 'FOLLOW US', 'VISIT OUR WEBSITE', 'JOIN WI-FI', 'SAVE CONTACT', 'RSVP'];


const PX = 1600; // export size: sharp in print up to ~13 cm at 300 dpi

const input = 'w-full h-10 rounded-lg border border-mt-border bg-mt-surface px-3 text-sm text-mt-ink placeholder:text-mt-faint focus:outline-none focus:ring-2 focus:ring-mt-primary/30';

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="min-w-0">
        <span className="block text-[13px] font-medium text-mt-ink">{label}</span>
        {hint && <span className="block text-[11px] text-mt-muted">{hint}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        onClick={() => onChange(!on)}
        className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${on ? 'bg-mt-primary' : 'bg-mt-border'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : ''}`} />
      </button>
    </div>
  );
}

const readAsDataUrl = (f: File) =>
  new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(f);
  });

// Brand logos live on another origin; turn them into a data URL so the
// finished PNG can be exported without tainting the canvas.
async function toDataUrl(url: string) {
  if (url.startsWith('data:')) return url;
  const blob = await fetch(url, { mode: 'cors' }).then((r) => {
    if (!r.ok) throw new Error('fetch');
    return r.blob();
  });
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = () => rej(new Error('read'));
    r.readAsDataURL(blob);
  });
}

const loadImage = (src: string) =>
  new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error('img'));
    i.src = src;
  });

const CHIP = (on: boolean) => cx('h-8 px-1 rounded-lg border text-[11px] truncate', on ? 'border-mt-primary bg-mt-primary/10 text-mt-ink font-medium' : 'border-mt-border text-mt-muted hover:text-mt-ink');

function ColorRow({ label, value, fallback, onChange }: { label: string; value: string | null; fallback: string; onChange: (v: string | null) => void }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-mt-muted">
      <input type="color" value={value || fallback} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-md border border-mt-border" aria-label={label} />
      <span className="truncate">{label}</span>
      {value && <button type="button" onClick={() => onChange(null)} aria-label={`Reset ${label}`} className="text-mt-faint hover:text-mt-ink"><X size={12} /></button>}
    </span>
  );
}

export function QrPanel({ onAdd, brandLogoUrl }: { onAdd: (pngDataUrl: string) => Promise<void> | void; brandLogoUrl?: string | null }) {
  const [kind, setKind] = useState<QrKind>('link');
  const [f, setF] = useState<QrFields>({ platform: 'instagram', security: 'WPA' });
  const [look, setLook] = useState<QrLook>(() => {
    try {
      const l = { ...DEFAULT_LOOK, ...JSON.parse(localStorage.getItem('mt:qrLook') || '{}') };
      if (!FRAMES_EYE.some((x) => x.id === l.eyeFrame)) l.eyeFrame = 'rounded';
      if (!BALLS.some((x) => x.id === l.eyeBall)) l.eyeBall = 'rounded';
      if (!DOTS.some((x) => x.id === l.dot)) l.dot = 'rounded';
      return l;
    } catch { return DEFAULT_LOOK; }
  });
  const L = (patch: Partial<QrLook>) => setLook((x) => ({ ...x, ...patch }));
  useEffect(() => { try { localStorage.setItem('mt:qrLook', JSON.stringify(look)); } catch {} }, [look]);
  const { fg, bg } = look;
  const [useLogo, setUseLogo] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<QrFields>) => setF((p) => ({ ...p, ...patch }));

  const payload = useMemo(() => buildQrPayload(kind, f), [kind, f]);
  const logoActive = useLogo && !!logoImg;

  const { layout, error } = useMemo(() => {
    if (!payload) return { layout: null, error: null };
    try {
      return { layout: buildGrid(payload, look, logoActive), error: null };
    } catch (e) {
      return { layout: null, error: (e as Error).message };
    }
  }, [payload, logoActive, look]);

  // Live preview: the very same SVG that gets exported.
  const preview = useMemo(() => {
    if (!layout) return null;
    const { svg } = qrDesignSvg(layout, look, logoActive ? logo : null, 480);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  }, [layout, look, logoActive, logo]);

  // Every colour used for the code must stand out from the background.
  const bgc = bg === 'transparent' ? '#ffffff' : bg;
  const warn = [fg, ...(look.fill === 'solid' ? [] : [look.fg2]), look.eyeColor, look.eyeBallColor].filter(Boolean).map((c) => contrastWarning(c as string, bgc)).find(Boolean) || null;
  const dense = layout && layout.modules > 57 ? 'This code holds a lot of data, so its squares are small. Print it at least 3 cm wide, or shorten the text.' : null;

  useEffect(() => {
    if (!logo) {
      setLogoImg(null);
      return;
    }
    let live = true;
    loadImage(logo)
      .then((i) => live && setLogoImg(i))
      .catch(() => {
        if (!live) return;
        setLogoImg(null);
        setNote('That logo couldn’t be opened. Try a PNG, JPG or SVG file.');
      });
    return () => {
      live = false;
    };
  }, [logo]);


  const render = async () => (layout ? qrDesignPng(layout, look, logoActive ? logo : null, 1600) : null);

  const add = async () => {
    setNote(null);
    setBusy(true);
    const url = await render().catch(() => null);
    if (!url) { setBusy(false); return; }
    try {
      await onAdd(url);
      setNote('Added to your design. Test it with your phone camera before you print or share.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (fmt: 'png' | 'svg') => {
    if (!layout) return;
    let href: string | null;
    if (fmt === 'png') href = await render();
    else href = URL.createObjectURL(new Blob([qrDesignSvg(layout, look, logoActive ? logo : null, 1024).svg], { type: 'image/svg+xml' }));
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = `qr-code.${fmt}`;
    a.click();
    if (fmt === 'svg') setTimeout(() => URL.revokeObjectURL(href as string), 2000);
  };

  const pickLogo = async (file?: File) => {
    if (!file) return;
    if (!/^image\//.test(file.type)) {
      setNote('Please choose an image file for the logo.');
      return;
    }
    try {
      setLogo(await readAsDataUrl(file));
      setNote(null);
    } catch {
      setNote('That logo couldn’t be read. Try another file.');
    }
  };

  const useBrandLogo = async () => {
    if (!brandLogoUrl) return;
    try {
      setLogo(await toDataUrl(brandLogoUrl));
      setNote(null);
    } catch {
      setNote('Your brand logo couldn’t be loaded here. Upload the logo file instead.');
    }
  };

  const placeholder: Partial<Record<QrKind, string>> = {
    link: 'Paste a website link, e.g. yoursite.com',
    username: '@yourname or paste your profile link',
    email: 'name@example.com',
    phone: '+971 50 123 4567',
    whatsapp: 'Number with country code, e.g. +971 50 123 4567',
    sms: 'Phone number, e.g. +971 50 123 4567',
    event: 'Event name',
    location: 'Address, place name or “25.2048, 55.2708”',
  };

  return (
    <div>
      <PanelSection title="What should it open?">
        <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="QR code type">
          {KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              role="radio"
              aria-checked={kind === k.id}
              onClick={() => setKind(k.id)}
              className={cx(
                'flex flex-col items-center gap-1 rounded-xl border py-2 text-[11px] font-medium transition-colors',
                kind === k.id ? 'border-mt-primary bg-mt-primary/10 text-mt-ink' : 'border-mt-border text-mt-muted hover:text-mt-ink'
              )}
            >
              {k.icon}
              {k.label}
            </button>
          ))}
        </div>

        <div className="mt-3 space-y-2">
          {kind === 'username' && (
            <select aria-label="Platform" value={f.platform} onChange={(e) => set({ platform: e.target.value })} className={input}>
              {SOCIAL_PLATFORMS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
          {kind === 'vcard' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <input aria-label="First name" className={input} placeholder="First name" value={f.firstName || ''} onChange={(e) => set({ firstName: e.target.value })} />
                <input aria-label="Last name" className={input} placeholder="Last name" value={f.lastName || ''} onChange={(e) => set({ lastName: e.target.value })} />
              </div>
              <input aria-label="Company" className={input} placeholder="Company" value={f.org || ''} onChange={(e) => set({ org: e.target.value })} />
              <input aria-label="Job title" className={input} placeholder="Job title" value={f.title || ''} onChange={(e) => set({ title: e.target.value })} />
              <input aria-label="Phone" className={input} inputMode="tel" placeholder="Phone" value={f.phone || ''} onChange={(e) => set({ phone: e.target.value })} />
              <input aria-label="Email" className={input} inputMode="email" placeholder="Email" value={f.email || ''} onChange={(e) => set({ email: e.target.value })} />
              <input aria-label="Website" className={input} placeholder="Website" value={f.website || ''} onChange={(e) => set({ website: e.target.value })} />
              <input aria-label="Address" className={input} placeholder="Address" value={f.address || ''} onChange={(e) => set({ address: e.target.value })} />
            </>
          ) : kind === 'event' ? (
            <>
              <input aria-label="Event name" className={input} placeholder={placeholder.event} value={f.value || ''} onChange={(e) => set({ value: e.target.value })} />
              <label className="block text-[11px] text-mt-muted">Starts<input type="datetime-local" className={input} value={f.start || ''} onChange={(e) => set({ start: e.target.value })} /></label>
              <label className="block text-[11px] text-mt-muted">Ends (optional)<input type="datetime-local" className={input} value={f.end || ''} onChange={(e) => set({ end: e.target.value })} /></label>
              <input aria-label="Place" className={input} placeholder="Place (optional)" value={f.location || ''} onChange={(e) => set({ location: e.target.value })} />
            </>
          ) : kind === 'text' ? (
            <textarea aria-label="Text" rows={4} value={f.value || ''} onChange={(e) => set({ value: e.target.value })} placeholder="Type or paste any text" className={cx(input, 'h-auto py-2 resize-y')} />
          ) : kind === 'wifi' ? (
            <>
              <input aria-label="Network name" className={input} placeholder="Network name (SSID)" value={f.ssid || ''} onChange={(e) => set({ ssid: e.target.value })} />
              <select aria-label="Security" className={input} value={f.security} onChange={(e) => set({ security: e.target.value as QrFields['security'] })}>
                <option value="WPA">WPA / WPA2 / WPA3</option>
                <option value="WEP">WEP</option>
                <option value="nopass">No password</option>
              </select>
              {f.security !== 'nopass' && <input aria-label="Password" className={input} placeholder="Password" value={f.password || ''} onChange={(e) => set({ password: e.target.value })} />}
            </>
          ) : (
            <input
              aria-label={KINDS.find((k) => k.id === kind)?.label}
              className={input}
              inputMode={kind === 'phone' || kind === 'whatsapp' || kind === 'sms' ? 'tel' : kind === 'email' ? 'email' : kind === 'location' ? 'text' : 'url'}
              placeholder={placeholder[kind]}
              value={f.value || ''}
              onChange={(e) => set({ value: e.target.value })}
            />
          )}
          {kind === 'email' && <input aria-label="Subject" className={input} placeholder="Subject (optional)" value={f.subject || ''} onChange={(e) => set({ subject: e.target.value })} />}
          {(kind === 'email' || kind === 'whatsapp' || kind === 'sms') && (
            <input aria-label="Message" className={input} placeholder="Message (optional)" value={f.message || ''} onChange={(e) => set({ message: e.target.value })} />
          )}
          {payload && !['text', 'wifi', 'vcard', 'event'].includes(kind) && (
            <p className="text-[11px] text-mt-muted break-all">
              Opens: <span className="text-mt-ink">{payload}</span>
            </p>
          )}
        </div>
      </PanelSection>

      <div className="mb-5 rounded-2xl border border-mt-border p-3" style={{ background: 'repeating-conic-gradient(#eef0f3 0 25%, #fff 0 50%) 50% / 14px 14px' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="QR code preview" data-testid="qr-preview" className="block w-full h-auto" />}
        {!layout && <div className="aspect-square flex items-center justify-center text-center text-[13px] text-mt-muted px-6 bg-mt-surface/80 rounded-xl">{error || 'Your QR code appears here as soon as you type something.'}</div>}
      </div>

      {(warn || dense) && layout && (
        <p className="mb-4 flex gap-2 rounded-xl bg-amber-50 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200 p-2.5 text-[12px]">
          <AlertTriangle size={15} className="shrink-0 mt-0.5" />
          {warn || dense}
        </p>
      )}

      <PanelSection title="Logo in the centre">
        <Switch on={useLogo} onChange={setUseLogo} label="Add a logo" hint={useLogo ? 'Extra error correction keeps it scannable.' : 'Off — a plain QR code.'} />
        {useLogo && (
          <div className="mt-2 space-y-2">
            {logo ? (
              <div className="flex items-center gap-3 rounded-xl border border-mt-border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="Logo" className="w-12 h-12 object-contain rounded-lg bg-white" />
                <button type="button" onClick={() => fileRef.current?.click()} className="text-[13px] font-medium text-mt-ink underline">
                  Replace
                </button>
                <button type="button" aria-label="Remove logo" onClick={() => setLogo(null)} className="ml-auto p-1.5 rounded-lg text-mt-muted hover:text-mt-ink">
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => fileRef.current?.click()} className="w-full h-10 rounded-xl border border-dashed border-mt-border text-[13px] font-medium text-mt-ink flex items-center justify-center gap-2 hover:bg-mt-surface2">
                <ImagePlus size={16} /> Upload a logo
              </button>
            )}
            {brandLogoUrl && !logo && (
              <button type="button" onClick={useBrandLogo} className="w-full h-9 rounded-xl border border-mt-border text-[13px] text-mt-ink hover:bg-mt-surface2">
                Use my brand logo
              </button>
            )}
            <input ref={fileRef} data-testid="qr-logo-input" type="file" accept="image/*" hidden onChange={(e) => { pickLogo(e.target.files?.[0]); e.target.value = ''; }} />
          </div>
        )}
      </PanelSection>

      <PanelSection title="Ready-made looks">
        <div className="grid grid-cols-5 gap-1.5">
          {LOOK_PRESETS.map((p) => {
            const look2 = { ...look, ...p.look };
            let src = '';
            try {
              const g = buildGrid('https://mt.design', look2, false);
              src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrDesignSvg(g, look2, null, 96).svg)}`;
            } catch {}
            return (
              <button key={p.name} type="button" title={p.name} aria-label={`${p.name} look`} onClick={() => L(p.look)} className="rounded-lg border border-mt-border p-1 hover:border-mt-primary bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {src && <img src={src} alt="" className="w-full h-auto" />}
                <span className="block text-[9px] text-center text-neutral-600 truncate">{p.name}</span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <PanelSection title="Dots">
        <div className="grid grid-cols-3 gap-1.5">
          {DOTS.map((d) => <button key={d.id} type="button" aria-pressed={look.dot === d.id} onClick={() => L({ dot: d.id })} className={CHIP(look.dot === d.id)}>{d.label}</button>)}
        </div>
      </PanelSection>

      <PanelSection title="Corners">
        <p className="text-[11px] text-mt-muted mb-1">Frame</p>
        <div className="grid grid-cols-3 gap-1.5">
          {FRAMES_EYE.map((d) => <button key={d.id} type="button" aria-pressed={look.eyeFrame === d.id} onClick={() => L({ eyeFrame: d.id })} className={CHIP(look.eyeFrame === d.id)}>{d.label}</button>)}
        </div>
        <p className="text-[11px] text-mt-muted mt-2 mb-1">Centre</p>
        <div className="grid grid-cols-4 gap-1.5">
          {BALLS.map((d) => <button key={d.id} type="button" aria-pressed={look.eyeBall === d.id} onClick={() => L({ eyeBall: d.id })} className={CHIP(look.eyeBall === d.id)}>{d.label}</button>)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <ColorRow label="Frame colour" value={look.eyeColor} fallback={fg} onChange={(v) => L({ eyeColor: v })} />
          <ColorRow label="Centre colour" value={look.eyeBallColor} fallback={look.eyeColor || fg} onChange={(v) => L({ eyeBallColor: v })} />
        </div>
      </PanelSection>

      <PanelSection title="Colours">
        <div className="grid grid-cols-3 gap-1.5 mb-2">
          {(['solid', 'linear', 'radial'] as const).map((m) => <button key={m} type="button" aria-pressed={look.fill === m} onClick={() => L({ fill: m })} className={CHIP(look.fill === m)}>{m === 'solid' ? 'Solid' : m === 'linear' ? 'Gradient' : 'Radial'}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-[12px] text-mt-muted">
            <input type="color" value={fg} onChange={(e) => L({ fg: e.target.value })} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Code colour" />
            {look.fill === 'solid' ? 'Code' : 'Colour 1'}
          </label>
          {look.fill !== 'solid' ? (
            <label className="flex items-center gap-2 text-[12px] text-mt-muted">
              <input type="color" value={look.fg2} onChange={(e) => L({ fg2: e.target.value })} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Second colour" />
              Colour 2
            </label>
          ) : <span />}
          <label className="flex items-center gap-2 text-[12px] text-mt-muted">
            <input type="color" value={bg === 'transparent' ? '#ffffff' : bg} onChange={(e) => L({ bg: e.target.value })} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Background colour" />
            Background
          </label>
          <label className="flex items-center gap-2 text-[12px] text-mt-muted">
            <input type="checkbox" checked={bg === 'transparent'} onChange={(e) => L({ bg: e.target.checked ? 'transparent' : '#ffffff' })} /> See-through
          </label>
        </div>
        {look.fill === 'linear' && (
          <label className="mt-2 block text-[11px] text-mt-muted">Direction {look.angle}°
            <input type="range" min={0} max={360} step={15} value={look.angle} onChange={(e) => L({ angle: +e.target.value })} className="w-full" />
          </label>
        )}
      </PanelSection>

      <PanelSection title="Frame & caption">
        <div className="grid grid-cols-3 gap-1.5">
          {FRAMES.map((d) => <button key={d.id} type="button" aria-pressed={look.frame === d.id} onClick={() => L({ frame: d.id })} className={CHIP(look.frame === d.id)}>{d.label}</button>)}
        </div>
        {look.frame !== 'none' && (
          <div className="mt-2 space-y-2">
            <input aria-label="Caption" list="qr-captions" className={input} maxLength={24} value={look.caption} onChange={(e) => L({ caption: e.target.value.toUpperCase() })} placeholder="SCAN ME" />
            <datalist id="qr-captions">{CAPTIONS.map((c) => <option key={c} value={c} />)}</datalist>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-[12px] text-mt-muted"><input type="color" value={look.frameColor} onChange={(e) => L({ frameColor: e.target.value })} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Frame colour" /> Frame</label>
              <label className="flex items-center gap-2 text-[12px] text-mt-muted"><input type="color" value={look.captionColor} onChange={(e) => L({ captionColor: e.target.value })} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Caption colour" /> Caption</label>
            </div>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Advanced">
        <label className="block text-[11px] text-mt-muted">Margin around the code: {look.quiet} squares
          <input type="range" min={2} max={6} step={1} value={look.quiet} onChange={(e) => L({ quiet: +e.target.value })} className="w-full" />
        </label>
        <label className="mt-2 block text-[11px] text-mt-muted">Error correction {logoActive ? '(High — needed for the logo)' : ''}
          <select disabled={logoActive} value={logoActive ? 'H' : look.ecc} onChange={(e) => L({ ecc: e.target.value as QrLook['ecc'] })} className={input}>
            <option value="auto">Automatic (Medium)</option>
            <option value="L">Low — smallest code (7%)</option>
            <option value="M">Medium (15%)</option>
            <option value="Q">Quartile (25%)</option>
            <option value="H">High — survives damage (30%)</option>
          </select>
        </label>
        {useLogo && (
          <>
            <label className="mt-2 block text-[11px] text-mt-muted">Logo size: {Math.round(look.logoScale * 100)}%
              <input type="range" min={0.15} max={0.26} step={0.01} value={look.logoScale} onChange={(e) => L({ logoScale: +e.target.value })} className="w-full" />
            </label>
            <div className="mt-2 grid grid-cols-3 gap-1.5">
              {(['square', 'circle', 'none'] as const).map((m) => <button key={m} type="button" aria-pressed={look.logoPlate === m} onClick={() => L({ logoPlate: m })} className={CHIP(look.logoPlate === m)}>{m === 'none' ? 'No plate' : m === 'circle' ? 'Round plate' : 'Square plate'}</button>)}
            </div>
          </>
        )}
        <button type="button" onClick={() => setLook(DEFAULT_LOOK)} className="mt-3 text-[12px] text-mt-muted underline">Reset all styling</button>
      </PanelSection>

      <button
        type="button"
        disabled={!layout || busy}
        onClick={add}
        className="w-full h-11 rounded-xl bg-mt-primary text-mt-onprimary text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40"
      >
        <Plus size={16} /> {busy ? 'Adding…' : 'Add to design'}
      </button>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" disabled={!layout} onClick={() => download('png')} className="h-9 rounded-xl border border-mt-border text-[13px] text-mt-ink flex items-center justify-center gap-1.5 disabled:opacity-40">
          <Download size={14} /> PNG
        </button>
        <button type="button" disabled={!layout} onClick={() => download('svg')} className="h-9 rounded-xl border border-mt-border text-[13px] text-mt-ink flex items-center justify-center gap-1.5 disabled:opacity-40">
          <Download size={14} /> SVG
        </button>
      </div>
      {note && <p className="mt-3 text-[12px] text-mt-muted" role="status">{note}</p>}
    </div>
  );
}
