'use client';

import { useId } from 'react';

// A single flowing stroke in the logo's colours, drawn once when the
// page loads. It echoes the hand-drawn "m" in the Magical Touch mark.
// Both ends melt away softly, so wherever the ribbon stops (inside a
// hero, at the edge of a very wide screen) it never shows a cut end.
export function BrandRibbon({ className = '', still = false, fade = 'both' }: { className?: string; still?: boolean; fade?: 'both' | 'start' | 'none' }) {
  const id = useId().replace(/:/g, '');
  const grad = `mt-ribbon-grad-${id}`;
  const mask = `mt-ribbon-mask-${id}`;
  const fadeGrad = `mt-ribbon-fade-${id}`;
  return (
    <svg viewBox="0 0 1700 460" fill="none" className={`mt-ribbon ${className}`} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1700" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.04" stopColor="#F2708F" />
          <stop offset="0.24" stopColor="#A69BD3" />
          <stop offset="0.44" stopColor="#35C2F1" />
          <stop offset="0.62" stopColor="#5DCCB8" />
          <stop offset="0.8" stopColor="#8CC84B" />
          <stop offset="0.96" stopColor="#DDE23B" />
        </linearGradient>
        {fade !== 'none' && (
          <>
            <linearGradient id={fadeGrad} x1="0" y1="0" x2="1700" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.2" stopColor="#fff" stopOpacity="1" />
              <stop offset={fade === 'both' ? '0.84' : '1'} stopColor="#fff" stopOpacity="1" />
              <stop offset="1" stopColor="#fff" stopOpacity={fade === 'both' ? '0' : '1'} />
            </linearGradient>
            <mask id={mask} maskUnits="userSpaceOnUse" x="-100" y="-100" width="1900" height="660">
              <rect x="-100" y="-100" width="1900" height="660" fill={`url(#${fadeGrad})`} />
            </mask>
          </>
        )}
      </defs>
      <g mask={fade !== 'none' ? `url(#${mask})` : undefined}>
        <path
          className={still ? undefined : 'mt-ribbon-path'}
          pathLength={1}
          d="M-40 430 C 90 300, 180 170, 300 120 C 390 84, 450 130, 420 190 C 392 246, 318 248, 330 196 C 348 120, 500 70, 640 110 C 760 145, 820 220, 960 210 C 1090 200, 1150 110, 1270 96 C 1360 86, 1400 150, 1368 196 C 1340 236, 1290 220, 1312 176 C 1350 104, 1500 90, 1740 140"
          stroke={`url(#${grad})`}
          strokeWidth={30}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
