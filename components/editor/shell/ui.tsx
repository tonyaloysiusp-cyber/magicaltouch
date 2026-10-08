'use client';

// Small building blocks shared by the editor's panels and toolbars.

import { ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

// Icon button with an accessible name and a tooltip (help text shows on
// hover and on keyboard focus).
export function IconButton({
  label,
  hint,
  onClick,
  active,
  disabled,
  children,
  className,
  size = 'md',
  tone = 'default',
}: {
  label: string;
  hint?: string;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  size?: 'sm' | 'md';
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active === undefined ? undefined : active}
      title={hint ? `${label} — ${hint}` : label}
      onClick={onClick}
      disabled={disabled}
      className={cx(
        'inline-flex items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] disabled:opacity-35 disabled:pointer-events-none shrink-0',
        size === 'sm' ? 'h-8 min-w-8 px-1.5' : 'h-9 min-w-9 px-2',
        active ? 'mt-active-blue text-mt-ink' : 'border-transparent text-mt-muted hover:text-mt-ink hover:bg-mt-surface2',
        tone === 'danger' && !active && 'hover:text-red-600',
        className
      )}
    >
      {children}
    </button>
  );
}

// A labelled toolbar button (icon + short text).
export function ToolButton({
  label,
  hint,
  icon,
  onClick,
  active,
  disabled,
  special,
}: {
  label: string;
  hint?: string;
  icon: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  active?: boolean;
  disabled?: boolean;
  special?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={hint ? `${label} — ${hint}` : label}
      aria-pressed={active === undefined ? undefined : active}
      className={cx(
        'inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[13px] font-medium whitespace-nowrap transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8CCBFF] disabled:opacity-35 disabled:pointer-events-none',
        active ? 'mt-active-blue text-mt-ink' : special ? 'mt-spectrum-border text-mt-ink hover:bg-mt-surface2' : 'border-transparent text-mt-ink hover:bg-mt-surface2'
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

export function Divider({ vertical = true }: { vertical?: boolean }) {
  return vertical ? <span aria-hidden className="w-px h-6 bg-mt-border mx-1 shrink-0" /> : <div aria-hidden className="h-px bg-mt-border my-2" />;
}

// Anchored dropdown panel. Closes on outside click and Escape.
export function Popover({
  trigger,
  children,
  align = 'start',
  width = 288,
  open: controlledOpen,
  onOpenChange,
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode | ((close: () => void) => ReactNode);
  align?: 'start' | 'center' | 'end';
  width?: number;
  open?: boolean;
  onOpenChange?: (o: boolean) => void;
}) {
  const [innerOpen, setInnerOpen] = useState(false);
  const open = controlledOpen ?? innerOpen;
  const setOpen = (o: boolean) => {
    if (controlledOpen === undefined) setInnerOpen(o);
    onOpenChange?.(o);
  };
  const anchorRef = useRef<HTMLSpanElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; maxH: number } | null>(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const place = () => {
      const r = anchorRef.current!.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = Math.min(width, vw - 16);
      let left = align === 'end' ? r.right - w : align === 'center' ? r.left + r.width / 2 - w / 2 : r.left;
      left = Math.max(8, Math.min(vw - w - 8, left));
      const below = vh - r.bottom - 12;
      const top = below > 260 || below > r.top ? r.bottom + 6 : Math.max(8, r.top - Math.min(480, r.top - 16) - 6);
      setPos({ left, top, maxH: below > 260 || below > r.top ? below : Math.min(480, r.top - 16) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, width, align]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || anchorRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = () => setOpen(false);
  return (
    <>
      <span ref={anchorRef} className="inline-flex">
        {trigger({ open, toggle: () => setOpen(!open) })}
      </span>
      {open &&
        pos &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            style={{ position: 'fixed', left: pos.left, top: pos.top, width: Math.min(width, window.innerWidth - 16), maxHeight: pos.maxH }}
            className="z-[120] overflow-y-auto rounded-2xl border border-mt-border bg-mt-surface text-mt-ink shadow-[0_20px_50px_-12px_rgba(9,9,11,0.28)] p-3 animate-[mt-pop_140ms_ease-out]"
          >
            {typeof children === 'function' ? (children as (c: () => void) => ReactNode)(close) : children}
          </div>,
          document.body
        )}
    </>
  );
}

// Range slider that records one undo step when the drag ends, on mouse,
// touch, stylus and keyboard.
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  onCommit,
  suffix,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  onCommit?: (v: number) => void;
  suffix?: string;
  disabled?: boolean;
}) {
  const latest = useRef(value);
  latest.current = value;
  const commit = () => onCommit?.(latest.current);
  return (
    <label className={cx('block', disabled && 'opacity-40 pointer-events-none')}>
      <span className="flex items-center justify-between text-xs text-mt-muted mb-1">
        <span>{label}</span>
        <span className="tabular-nums text-mt-ink">
          {Math.round(value * 100) / 100}
          {suffix}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={commit}
        onKeyUp={commit}
        onTouchEnd={commit}
        className="w-full accent-[#3B82C4]"
      />
    </label>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; hint?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div role="radiogroup" className="inline-flex p-0.5 rounded-xl bg-mt-surface2 border border-mt-border">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          title={o.hint}
          onClick={() => onChange(o.value)}
          className={cx(
            'rounded-[10px] font-medium transition-colors whitespace-nowrap',
            size === 'sm' ? 'text-xs px-2.5 py-1' : 'text-[13px] px-3 py-1.5',
            value === o.value ? 'bg-mt-surface text-mt-ink shadow-sm' : 'text-mt-muted hover:text-mt-ink'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PanelSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="mb-5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[13px] font-semibold text-mt-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function SearchField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="w-full h-10 rounded-xl border border-mt-border bg-mt-surface px-3 text-sm text-mt-ink placeholder:text-mt-faint focus:outline-none"
    />
  );
}
