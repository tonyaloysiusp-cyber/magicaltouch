'use client';

import { useId } from 'react';

// The hero's brand curves: two ribbons in the logo spectrum that slowly
// sway, with a point of light that leaves the pen tip and runs along
// the ribbon. `layer="back"` draws the ribbons (behind the editor);
// `layer="front"` draws the floating stylus on top. Both layers share
// one coordinate system, so the pen tip always meets the light.
// SVG animation only — nothing to download, and it stops for people
// who ask their device for reduced motion (see globals.css).

const D1 = 'M-40 430 C 90 300, 180 170, 300 120 C 390 84, 450 130, 420 190 C 392 246, 318 248, 330 196 C 348 120, 500 70, 640 110 C 760 145, 820 220, 960 210 C 1090 200, 1150 110, 1270 96 C 1360 86, 1400 150, 1368 196 C 1340 236, 1290 220, 1312 176 C 1350 104, 1500 90, 1740 140';
const D2 = 'M-40 444 C 100 320, 190 150, 310 112 C 402 82, 456 142, 426 200 C 396 252, 322 250, 336 200 C 354 128, 512 92, 652 130 C 772 165, 832 198, 972 188 C 1102 180, 1162 126, 1282 112 C 1372 100, 1410 162, 1376 208 C 1346 246, 1296 228, 1318 186 C 1356 114, 1506 112, 1740 118';
const D3 = 'M-40 418 C 84 288, 172 186, 292 132 C 382 92, 446 122, 416 182 C 388 238, 314 244, 326 192 C 344 116, 490 56, 630 96 C 750 128, 812 236, 952 226 C 1082 216, 1142 98, 1262 84 C 1352 74, 1394 140, 1362 186 C 1334 226, 1284 212, 1306 168 C 1344 96, 1496 74, 1740 156';
// Second, thinner ribbon a little lower, out of phase.
const E1 = 'M-60 470 C 160 380, 300 300, 520 300 C 720 300, 820 360, 1020 340 C 1220 320, 1380 230, 1760 250';
const E2 = 'M-60 456 C 170 360, 320 320, 530 316 C 730 312, 840 340, 1030 322 C 1230 304, 1390 250, 1760 232';
// The light's route: from the pen tip along the ribbon to the right.
const LIGHT = 'M 330 196 C 348 120, 500 70, 640 110 C 760 145, 820 220, 960 210 C 1090 200, 1150 110, 1270 96 C 1360 86, 1400 150, 1368 196 C 1340 236, 1290 220, 1312 176 C 1350 104, 1500 90, 1740 140';
const TIP = { x: 330, y: 196 };

export function HeroCurves({ layer, className = '' }: { layer: 'back' | 'front'; className?: string }) {
  const id = useId().replace(/:/g, '');
  const grad = `hc-g-${id}`, glow = `hc-glow-${id}`, fade = `hc-f-${id}`, mask = `hc-m-${id}`, body = `hc-b-${id}`;
  if (layer === 'front') {
    return (
      <svg viewBox="0 0 1700 520" fill="none" className={`mt-hero-curves ${className}`} aria-hidden>
        <defs>
          <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4A4A52" />
            <stop offset="0.35" stopColor="#141418" />
            <stop offset="0.7" stopColor="#050507" />
            <stop offset="1" stopColor="#2A2A30" />
          </linearGradient>
          <radialGradient id={glow}>
            <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="0.35" stopColor="#8FE3FF" stopOpacity="0.55" />
            <stop offset="1" stopColor="#35C2F1" stopOpacity="0" />
          </radialGradient>
        </defs>
        {/* soft light where the tip touches */}
        <circle cx={TIP.x} cy={TIP.y} r="10" fill={`url(#${glow})`} className="mt-pen-pulse" />
        {/* the stylus, floating gently; drawn pointing to the tip */}
        <g className="mt-pen-float">
          <g transform={`translate(${TIP.x} ${TIP.y}) rotate(-133)`}>
            <path d="M0 0 L 30 -8 L 30 8 Z" fill="#D9D9DE" />
            <path d="M0 0 L 9 -2.4 L 9 2.4 Z" fill="#4B4B52" />
            <rect x="30" y="-9.5" width="220" height="19" rx="9.5" fill={`url(#${body})`} />
            <rect x="30" y="-9.5" width="220" height="5" rx="2.5" fill="#FFFFFF" opacity="0.14" />
            <rect x="196" y="-9.5" width="4" height="19" fill="#5A5A62" opacity="0.6" />
          </g>
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 1700 520" fill="none" className={`mt-hero-curves ${className}`} aria-hidden>
      <defs>
        <linearGradient id={grad} x1="0" y1="0" x2="1700" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0.04" stopColor="#F2708F" />
          <stop offset="0.24" stopColor="#A69BD3" />
          <stop offset="0.44" stopColor="#35C2F1" />
          <stop offset="0.62" stopColor="#5DCCB8" />
          <stop offset="0.8" stopColor="#8CC84B" />
          <stop offset="0.96" stopColor="#DDE23B" />
          <animateTransform attributeName="gradientTransform" type="translate" values="-90 0; 90 0; -90 0" dur="14s" repeatCount="indefinite" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="0.3" stopColor="#E9FBFF" stopOpacity="0.8" />
          <stop offset="1" stopColor="#35C2F1" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={fade} x1="0" y1="0" x2="1700" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.16" stopColor="#fff" stopOpacity="1" />
          <stop offset="0.86" stopColor="#fff" stopOpacity="1" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id={mask} maskUnits="userSpaceOnUse" x="-100" y="-100" width="1900" height="720">
          <rect x="-100" y="-100" width="1900" height="720" fill={`url(#${fade})`} />
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <path d={E1} stroke={`url(#${grad})`} strokeWidth="9" strokeLinecap="round" opacity="0.45">
          <animate attributeName="d" values={`${E1};${E2};${E1}`} dur="11s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1" />
        </path>
        <path d={D1} stroke={`url(#${grad})`} strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" className="mt-ribbon-draw" pathLength={1}>
          <animate attributeName="d" values={`${D1};${D2};${D1};${D3};${D1}`} dur="16s" repeatCount="indefinite" calcMode="spline" keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1" />
        </path>
        {/* the light leaving the pen and running along the ribbon */}
        <g className="mt-hero-light">
          <circle r="34" fill={`url(#${glow})`} opacity="0.85">
            <animateMotion path={LIGHT} dur="6s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.4 0 0.2 1" />
            <animate attributeName="opacity" values="0;0.95;0.95;0" keyTimes="0;0.08;0.85;1" dur="6s" repeatCount="indefinite" />
          </circle>
        </g>
      </g>
    </svg>
  );
}
