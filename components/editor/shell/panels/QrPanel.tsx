'use client';

// QR code generator inside the design workspace. Paste a link, a social
// username, text, an email, a phone number or Wi-Fi details and get a
// real, scannable QR code. A logo in the centre is optional: the logo
// controls appear only when the switch is turned on.

import { useEffect, useMemo, useRef, useState } from 'react';
import { ImagePlus, Download, Plus, Link2, AtSign, Type, Mail, Phone, MessageCircle, Wifi, AlertTriangle, X } from 'lucide-react';
import {
  QrKind,
  QrStyle,
  QrFields,
  SOCIAL_PLATFORMS,
  buildQrPayload,
  contrastWarning,
  drawLogo,
  drawQr,
  layoutQr,
  qrSvg,
} from '@/lib/qrDesign';
import { PanelSection, cx } from '../ui';

const KINDS: { id: QrKind; label: string; icon: React.ReactNode }[] = [
  { id: 'link', label: 'Link', icon: <Link2 size={15} /> },
  { id: 'username', label: 'Username', icon: <AtSign size={15} /> },
  { id: 'text', label: 'Text', icon: <Type size={15} /> },
  { id: 'email', label: 'Email', icon: <Mail size={15} /> },
  { id: 'phone', label: 'Phone', icon: <Phone size={15} /> },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={15} /> },
  { id: 'wifi', label: 'Wi‑Fi', icon: <Wifi size={15} /> },
];

const PRESETS: { fg: string; bg: string; label: string }[] = [
  { fg: '#000000', bg: '#ffffff', label: 'Classic' },
  { fg: '#1F2A44', bg: '#ffffff', label: 'Navy' },
  { fg: '#3B1D5A', bg: '#F6F1FF', label: 'Plum' },
  { fg: '#0F4C3A', bg: '#F1FAF5', label: 'Forest' },
  { fg: '#7A1F2B', bg: '#FFF6F2', label: 'Wine' },
  { fg: '#000000', bg: 'transparent', label: 'No background' },
];

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

export function QrPanel({ onAdd, brandLogoUrl }: { onAdd: (pngDataUrl: string) => Promise<void> | void; brandLogoUrl?: string | null }) {
  const [kind, setKind] = useState<QrKind>('link');
  const [f, setF] = useState<QrFields>({ platform: 'instagram', security: 'WPA' });
  const [fg, setFg] = useState('#000000');
  const [bg, setBg] = useState('#ffffff');
  const [style, setStyle] = useState<QrStyle>('square');
  const [useLogo, setUseLogo] = useState(false);
  const [logo, setLogo] = useState<string | null>(null);
  const [logoImg, setLogoImg] = useState<HTMLImageElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = (patch: Partial<QrFields>) => setF((p) => ({ ...p, ...patch }));

  const payload = useMemo(() => buildQrPayload(kind, f), [kind, f]);
  const logoActive = useLogo && !!logoImg;

  const { layout, error } = useMemo(() => {
    if (!payload) return { layout: null, error: null };
    try {
      return { layout: layoutQr(payload, logoActive), error: null };
    } catch (e) {
      return { layout: null, error: (e as Error).message };
    }
  }, [payload, logoActive]);

  const warn = contrastWarning(fg, bg === 'transparent' ? '#ffffff' : bg);
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

  // Live preview: the very same drawing that gets exported.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    const px = cv.width;
    if (!layout) {
      ctx.clearRect(0, 0, px, px);
      return;
    }
    drawQr(ctx, layout, px, { fg, bg, style });
    if (logoActive && logoImg) drawLogo(ctx, layout, px, logoImg, bg);
  }, [layout, fg, bg, style, logoActive, logoImg]);

  const render = () => {
    if (!layout) return null;
    const cv = document.createElement('canvas');
    cv.width = cv.height = PX;
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    drawQr(ctx, layout, PX, { fg, bg, style });
    if (logoActive && logoImg) drawLogo(ctx, layout, PX, logoImg, bg);
    return cv.toDataURL('image/png');
  };

  const add = async () => {
    setNote(null);
    const url = render();
    if (!url) return;
    setBusy(true);
    try {
      await onAdd(url);
      setNote('Added to your design. Test it with your phone camera before you print or share.');
    } finally {
      setBusy(false);
    }
  };

  const download = (fmt: 'png' | 'svg') => {
    if (!layout) return;
    const name = 'qr-code';
    let href: string | null;
    if (fmt === 'png') href = render();
    else href = URL.createObjectURL(new Blob([qrSvg(layout, { fg, bg, style }, logoActive ? logo : null)], { type: 'image/svg+xml' }));
    if (!href) return;
    const a = document.createElement('a');
    a.href = href;
    a.download = `${name}.${fmt}`;
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
          {kind === 'text' ? (
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
              inputMode={kind === 'phone' || kind === 'whatsapp' ? 'tel' : kind === 'email' ? 'email' : 'url'}
              placeholder={placeholder[kind]}
              value={f.value || ''}
              onChange={(e) => set({ value: e.target.value })}
            />
          )}
          {kind === 'email' && <input aria-label="Subject" className={input} placeholder="Subject (optional)" value={f.subject || ''} onChange={(e) => set({ subject: e.target.value })} />}
          {(kind === 'email' || kind === 'whatsapp') && (
            <input aria-label="Message" className={input} placeholder="Message (optional)" value={f.message || ''} onChange={(e) => set({ message: e.target.value })} />
          )}
          {payload && kind !== 'text' && kind !== 'wifi' && (
            <p className="text-[11px] text-mt-muted break-all">
              Opens: <span className="text-mt-ink">{payload}</span>
            </p>
          )}
        </div>
      </PanelSection>

      <div className="mb-5 rounded-2xl border border-mt-border p-3" style={{ background: 'repeating-conic-gradient(#eef0f3 0 25%, #fff 0 50%) 50% / 14px 14px' }}>
        <canvas ref={canvasRef} width={480} height={480} className={cx('block w-full aspect-square', !layout && 'hidden')} aria-label="QR code preview" role="img" />
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

      <PanelSection title="Colours">
        <div className="grid grid-cols-6 gap-1.5">
          {PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              title={p.label}
              aria-label={`${p.label} colours`}
              onClick={() => {
                setFg(p.fg);
                setBg(p.bg);
              }}
              className={cx('aspect-square rounded-lg ring-1 ring-black/10 flex items-center justify-center', fg === p.fg && bg === p.bg && 'ring-2 ring-mt-primary')}
              style={{ background: p.bg === 'transparent' ? 'repeating-conic-gradient(#e5e7eb 0 25%, #fff 0 50%) 50% / 8px 8px' : p.bg }}
            >
              <span className="w-1/2 h-1/2 rounded-[3px]" style={{ background: p.fg }} />
            </button>
          ))}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-[12px] text-mt-muted">
            <input type="color" value={fg} onChange={(e) => setFg(e.target.value)} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Code colour" />
            Code
          </label>
          <label className="flex items-center gap-2 text-[12px] text-mt-muted">
            <input type="color" value={bg === 'transparent' ? '#ffffff' : bg} onChange={(e) => setBg(e.target.value)} className="w-8 h-8 rounded-md border border-mt-border" aria-label="Background colour" />
            Background
          </label>
        </div>
      </PanelSection>

      <PanelSection title="Style">
        <div className="grid grid-cols-3 gap-1.5">
          {(['square', 'rounded', 'dots'] as QrStyle[]).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={style === s}
              onClick={() => setStyle(s)}
              className={cx('h-9 rounded-xl border text-[13px] capitalize', style === s ? 'border-mt-primary bg-mt-primary/10 text-mt-ink font-medium' : 'border-mt-border text-mt-muted')}
            >
              {s}
            </button>
          ))}
        </div>
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
