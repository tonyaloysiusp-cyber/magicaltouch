'use client';

import Image from 'next/image';
import { AppTheme } from '@/hooks/useAppTheme';

interface Props {
  theme: AppTheme;
  width?: number;
  height?: number;
  className?: string;
  priority?: boolean;
}

// One reusable, theme-aware logo instead of every page hard-coding
// `<Image src="/logo.png">` and never showing correctly on a dark
// background. `logo-white.png` is the same mark with a white wordmark,
// for exactly that case.
export function BrandLogo({ theme, width = 140, height = 28, className, priority }: Props) {
  return (
    <Image
      src={theme === 'dark' ? '/logo-white.png' : '/logo.png'}
      alt="Magical Touch"
      width={width}
      height={height}
      className={className}
      priority={priority}
    />
  );
}
