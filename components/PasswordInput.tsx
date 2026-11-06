'use client';

// One password box for the whole site (log in, sign up, reset password).
// A clear "Show / Hide" button lets people check what they typed, a
// "Caps Lock is on" hint catches the most common wrong-password cause,
// and a confirm box can show "✓ Passwords match" as you type.

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function PasswordInput({
  value,
  onChange,
  placeholder = 'Password',
  autoComplete = 'current-password',
  minLength,
  matchWith,
  shown,
  onToggle,
  className = '',
  required = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  minLength?: number;
  /** Confirm box: the first password, to show "match / no match". */
  matchWith?: string;
  /** Share one Show/Hide between two boxes (password + confirm). */
  shown?: boolean;
  onToggle?: () => void;
  className?: string;
  required?: boolean;
}) {
  const [own, setOwn] = useState(false);
  const [caps, setCaps] = useState(false);
  const show = shown ?? own;
  const toggle = onToggle ?? (() => setOwn((v) => !v));
  const isConfirm = matchWith !== undefined;
  const mismatch = isConfirm && !!value && value !== matchWith;
  const short = !!minLength && !!value && value.length < minLength;

  return (
    <div>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          aria-label={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyUp={(e) => setCaps(e.getModifierState?.('CapsLock') ?? false)}
          onBlur={() => setCaps(false)}
          autoComplete={autoComplete}
          minLength={minLength}
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required={required}
          className={`w-full border bg-mt-surface text-mt-ink p-3 pr-[5.5rem] rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue ${mismatch ? 'border-rose-500' : 'border-mt-border dark:border-white/15'} ${className}`}
        />
        <button
          type="button"
          onClick={toggle}
          aria-pressed={show}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-9 px-2.5 rounded-md inline-flex items-center gap-1.5 text-[13px] font-semibold text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"
        >
          {show ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
          {show ? 'Hide' : 'Show'}
        </button>
      </div>
      {(caps || short || (isConfirm && value)) && (
        <p className="mt-1 flex flex-wrap gap-x-3 text-[12px] font-medium" aria-live="polite">
          {caps && <span className="text-amber-600">Caps Lock is on</span>}
          {short && <span className="text-mt-muted">At least {minLength} characters ({value.length} so far)</span>}
          {isConfirm && value && <span className={mismatch ? 'text-rose-600' : 'text-emerald-600'}>{mismatch ? 'Passwords do not match yet' : '✓ Passwords match'}</span>}
        </p>
      )}
    </div>
  );
}
