'use client';

import { Sun, Moon } from 'lucide-react';
import type { AppTheme } from '@/hooks/useAppTheme';

// The ONE day/night switch used on every page, so the control looks and
// behaves the same everywhere.
export function ThemeSwitch({ theme, onToggle, size = 'md', className = '' }: { theme: AppTheme; onToggle: () => void; size?: 'sm' | 'md'; className?: string }) {
  const isDark = theme === 'dark';
  const sm = size === 'sm';
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'Switch to day theme' : 'Switch to night theme'}
      title={isDark ? 'Day theme' : 'Night theme'}
      className={`${className || 'relative'} inline-flex items-center shrink-0 rounded-full border border-mt-border transition-colors duration-300 ${
        sm ? 'w-11 h-6' : 'w-14 h-8'
      } ${isDark ? 'bg-[#1C1C20]' : 'bg-[#EFEFF3]'}`}
    >
      <span
        className={`absolute left-0.5 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 ${
          sm ? 'w-5 h-5' : 'w-6 h-6 left-1'
        } ${isDark ? `${sm ? 'translate-x-5' : 'translate-x-6'} bg-[#2E2E34] text-[#C4DA3B]` : 'translate-x-0 bg-white text-[#F5B942]'}`}
      >
        {isDark ? <Moon size={sm ? 11 : 13} /> : <Sun size={sm ? 11 : 13} />}
      </span>
    </button>
  );
}
