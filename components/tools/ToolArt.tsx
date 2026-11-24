// Card artwork for every tool: one consistent system — a soft tinted stage
// with a fine dot grid, one clean app window (title bar, tool area) and a
// small floating chip that names the result. Flat line art in the brand
// colours, no faces or clip-art. Plain inline SVG, sharp on every screen.

import type React from 'react';

const SPECTRUM = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];
const INK = '#16161F', MUTED = '#8A8A9A', LINE = '#E4E4EC', SOFT = '#F5F5F9', BLUE = '#3B82C4';
const CUT = '#E4007C', CREASE = '#00A0E3';

/** The stage: tinted wash, dot grid, one spectrum hairline, and the window frame. */
function Stage({ id, tint, title, children, chip }: { id: string; tint: string; title: string; children: React.ReactNode; chip?: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0.14" />
          <stop offset="1" stopColor={tint} stopOpacity="0.03" />
        </linearGradient>
        <linearGradient id={`${id}-sp`} x1="0" y1="0" x2="1" y2="0">
          {SPECTRUM.map((c, i) => <stop key={c} offset={i / (SPECTRUM.length - 1)} stopColor={c} />)}
        </linearGradient>
        <pattern id={`${id}-dots`} width="12" height="12" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.9" fill={INK} opacity="0.09" /></pattern>
        <filter id={`${id}-sh`} x="-10%" y="-10%" width="120%" height="135%">
          <feDropShadow dx="0" dy="5" stdDeviation="6" floodColor="#16161F" floodOpacity="0.12" />
        </filter>
      </defs>
      <rect width="320" height="180" fill="#FBFBFD" />
      <rect width="320" height="180" fill={`url(#${id}-wash)`} />
      <rect width="320" height="180" fill={`url(#${id}-dots)`} />
      <g filter={`url(#${id}-sh)`}>
        <rect x="52" y="20" width="216" height="146" rx="10" fill="#fff" />
      </g>
      <rect x="52" y="20" width="216" height="146" rx="10" fill="none" stroke={LINE} />
      <path d="M52 40H268" stroke={LINE} />
      {[0, 1, 2].map((i) => <circle key={i} cx={64 + i * 9} cy="30" r="2.6" fill={i === 0 ? '#F2708F' : i === 1 ? '#DDE23B' : '#5DCCB8'} opacity="0.8" />)}
      <text x="160" y="33" textAnchor="middle" fontFamily="Inter, Arial, sans-serif" fontSize="7.5" fontWeight="600" fill={MUTED}>{title}</text>
      <rect x="52" y="164" width="216" height="2" rx="1" fill={`url(#${id}-sp)`} opacity="0.9" />
      {children}
      {chip}
    </svg>
  );
}

/** Floating chip at the lower right: a short result label. */
const Chip = ({ text, dot = '#5DCCB8', x = 214, y = 142, w = 78 }: { text: string; dot?: string; x?: number; y?: number; w?: number }) => (
  <g>
    <rect x={x} y={y} width={w} height="22" rx="11" fill="#fff" stroke={LINE} />
    <circle cx={x + 11} cy={y + 11} r="4" fill={dot} />
    <text x={x + 20} y={y + 14.4} fontFamily="Inter, Arial, sans-serif" fontSize="8.5" fontWeight="600" fill={INK}>{text}</text>
  </g>
);

const bar = (x: number, y: number, w: number, c = LINE, h = 4) => <rect x={x} y={y} width={w} height={h} rx={h / 2} fill={c} />;
const handles = (x: number, y: number, w: number, h: number) => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={BLUE} strokeWidth="1" />
    {[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].map(([a, b], i) => <rect key={i} x={a - 2.5} y={b - 2.5} width="5" height="5" rx="1" fill="#fff" stroke={BLUE} strokeWidth="1" />)}
  </g>
);
/** A simple landscape picture (sky, sun, hills) — used instead of faces. */
const scene = (x: number, y: number, w: number, h: number, grey = false) => {
  const c = (a: string, g: string) => (grey ? g : a);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c('#CFEAF7', '#E2E2E8')} />
      <circle cx={x + w * 0.72} cy={y + h * 0.3} r={h * 0.12} fill={c('#FFD66B', '#C9C9D1')} />
      <path d={`M${x} ${y + h * 0.75}L${x + w * 0.3} ${y + h * 0.45}L${x + w * 0.52} ${y + h * 0.68}L${x + w * 0.7} ${y + h * 0.52}L${x + w} ${y + h * 0.8}V${y + h}H${x}Z`} fill={c('#5DCCB8', '#B4B4BE')} />
      <path d={`M${x} ${y + h * 0.88}C${x + w * 0.3} ${y + h * 0.78} ${x + w * 0.6} ${y + h * 0.95} ${x + w} ${y + h * 0.84}V${y + h}H${x}Z`} fill={c('#2E9C86', '#9A9AA6')} />
    </g>
  );
};

/** The leaf (bezier) sampled into pixels for the "before" side of Image Trace. */
const LEAF_PIXELS: [number, number][] = (() => {
  const bz = (p: number[], t: number) => { const u = 1 - t; return [u * u * u * p[0] + 3 * u * u * t * p[2] + 3 * u * t * t * p[4] + t * t * t * p[6], u * u * u * p[1] + 3 * u * u * t * p[3] + 3 * u * t * t * p[5] + t * t * t * p[7]]; };
  const poly: number[][] = [];
  for (let i = 0; i <= 20; i++) poly.push(bz([0, 40, 0, 14, 22, 0, 46, 0], i / 20));
  for (let i = 1; i < 20; i++) poly.push(bz([46, 0, 46, 26, 30, 46, 0, 40], i / 20));
  const inside = (x: number, y: number) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c; } return c; };
  const out: [number, number][] = [];
  for (let y = 0; y < 12; y++) for (let x = 0; x < 11; x++) if (inside((x * 7 + 3.5 - 16) / 1.05, (y * 7 + 3.5 - 24) / 1.05)) out.push([x, y]);
  return out;
})();

const ART: Record<string, { title: string; draw: (id: string) => React.ReactNode }> = {
  editor: {
    title: 'Design Editor',
    draw: (id) => (
      <>
        {/* tool rail */}
        <rect x="52" y="40" width="20" height="124" fill={SOFT} />
        {[50, 64, 78, 92, 106].map((y, i) => <rect key={y} x="57" y={y} width="10" height="8" rx="2" fill={i === 1 ? BLUE : '#D9D9E3'} />)}
        {/* page */}
        <rect x="88" y="48" width="96" height="108" rx="2" fill="#fff" stroke={LINE} />
        <rect x="96" y="56" width="80" height="46" rx="3" fill={`url(#${id}-sp)`} opacity="0.85" />
        <circle cx="160" cy="70" r="7" fill="#fff" opacity="0.85" />
        <path d="M96 102L120 82L136 96L148 88L176 102Z" fill={INK} opacity="0.18" />
        {bar(96, 110, 54, INK, 6)}
        {bar(96, 121, 72)}
        {bar(96, 129, 60)}
        <rect x="96" y="139" width="30" height="9" rx="4.5" fill={BLUE} />
        {handles(93, 107, 60, 12)}
        {/* properties */}
        <rect x="196" y="48" width="62" height="70" rx="6" fill={SOFT} />
        {bar(203, 56, 30, '#CFCFDA')}
        {['#F2708F', '#35C2F1', '#8CC84B', INK].map((c, i) => <rect key={c} x={203 + i * 12.5} y="66" width="10" height="10" rx="3" fill={c} />)}
        {bar(203, 84, 46, '#E1E1EA')}
        {bar(203, 92, 38, '#E1E1EA')}
        {bar(203, 104, 48, '#E1E1EA')}
      </>
    ),
  },
  'photo-studio': {
    title: 'Photo Studio',
    draw: (id) => (
      <>
        <clipPath id={`${id}-ph`}><rect x="62" y="48" width="132" height="108" rx="4" /></clipPath>
        <g clipPath={`url(#${id}-ph)`}>
          {scene(62, 48, 132, 108, true)}
          <clipPath id={`${id}-half`}><rect x="128" y="48" width="66" height="108" /></clipPath>
          <g clipPath={`url(#${id}-half)`}>{scene(62, 48, 132, 108)}</g>
        </g>
        <line x1="128" y1="48" x2="128" y2="156" stroke="#fff" strokeWidth="2" />
        <circle cx="128" cy="102" r="7" fill="#fff" stroke={BLUE} strokeWidth="1.6" />
        <path d="M125 102H131M125 102l2-2M125 102l2 2M131 102l-2-2M131 102l-2 2" stroke={BLUE} strokeWidth="1" strokeLinecap="round" />
        <text x="68" y="60" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill="#fff">BEFORE</text>
        <text x="188" y="60" textAnchor="end" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill="#fff">AFTER</text>
        <rect x="202" y="48" width="58" height="108" rx="6" fill={SOFT} />
        {[['Light', 0.7], ['Colour', 0.5], ['Detail', 0.62], ['Tone', 0.38]].map(([l, v], i) => (
          <g key={String(l)} transform={`translate(209 ${60 + i * 24})`}>
            <text y="0" fontFamily="Inter, Arial" fontSize="6.5" fill={MUTED}>{l}</text>
            {bar(0, 6, 44, '#E1E1EA', 3)}
            {bar(0, 6, 44 * Number(v), SPECTRUM[i + 1], 3)}
            <circle cx={44 * Number(v)} cy="7.5" r="3.6" fill="#fff" stroke={SPECTRUM[i + 1]} strokeWidth="1.6" />
          </g>
        ))}
      </>
    ),
  },
  packaging: {
    title: 'Packaging · Reverse tuck end',
    draw: () => {
      // a reverse tuck end blank: glue flap | side | front | side | back; top tuck on the back, bottom tuck on the front
      const cut = 'M66 80L74 76V66L88 64L90 76H120L122 64L136 66V60L138 50Q140 48 144 48H158Q162 48 164 50L166 60V122H136V132L122 134L120 122V138L118 148Q116 150 112 150H98Q94 150 92 148L90 138V122L88 134L74 132V122L66 118Z';
      const crease = 'M74 76V122M90 76V122M120 76V122M136 76V122M74 76H90M120 76H166M136 60H166M74 122H136M90 138H120';
      return (
        <>
          <g transform="translate(4 -2)">
            <path d={cut} fill="#fff" />
            <rect x="90" y="76" width="30" height="46" fill="#FDE7F0" />
            <rect x="136" y="76" width="30" height="46" fill="#E3F4FB" />
            <path d="M96 88h18M96 94h12" stroke={CUT} strokeOpacity="0.4" strokeWidth="3" strokeLinecap="round" />
            <path d={cut} fill="none" stroke={CUT} strokeWidth="1.2" strokeLinejoin="round" />
            <path d={crease} fill="none" stroke={CREASE} strokeWidth="0.9" strokeDasharray="3 2" />
          </g>
          <g transform="translate(200 62)">
            <path d="M0 16L26 4L52 16L26 28Z" fill="#F5F7FA" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M0 16V64L26 76V28Z" fill="#FDE7F0" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M52 16V64L26 76V28Z" fill="#E3F4FB" stroke={INK} strokeWidth="1" strokeLinejoin="round" />
            <path d="M6 30h12M6 35h8" stroke={CUT} strokeOpacity="0.4" strokeWidth="2.4" strokeLinecap="round" transform="skewY(26)" />
          </g>
        </>
      );
    },
  },
  'remove-background': {
    title: 'Background Remover',
    draw: (id) => {
      const plant = (
        <g>
          <path d="M112 76C96 70 92 54 98 46C110 50 116 62 118 76ZM124 74C124 56 134 44 146 42C150 56 140 70 128 78ZM120 80C108 86 92 84 86 74C98 66 112 70 122 80Z" fill="#2E9C86" />
          <path d="M120 84V96" stroke="#2E9C86" strokeWidth="2.4" />
          <path d="M100 96H140L135 130H105Z" fill="#F2708F" />
          <rect x="98" y="92" width="44" height="8" rx="2" fill="#E25C7D" />
        </g>
      );
      return (
        <>
          <clipPath id={`${id}-l`}><rect x="62" y="48" width="58" height="108" rx="4" /></clipPath>
          <clipPath id={`${id}-r`}><rect x="120" y="48" width="66" height="108" /></clipPath>
          <g clipPath={`url(#${id}-l)`}><rect x="62" y="48" width="124" height="108" fill="#FFE9B8" /><rect x="62" y="120" width="124" height="36" fill="#E9D3A0" /></g>
          <g clipPath={`url(#${id}-r)`}>{Array.from({ length: 7 * 12 }, (_, i) => { const x = i % 7, y = Math.floor(i / 7); return <rect key={i} x={120 + x * 9.5} y={48 + y * 9.5} width="9.5" height="9.5" fill={(x + y) % 2 ? '#ECECF2' : '#fff'} />; })}</g>
          <g transform="translate(4 14)">{plant}</g>
          <line x1="120" y1="48" x2="120" y2="156" stroke={BLUE} strokeWidth="1.4" strokeDasharray="3 2" />
          <rect x="62" y="48" width="124" height="108" rx="4" fill="none" stroke={LINE} />
          <rect x="196" y="48" width="64" height="58" rx="6" fill={SOFT} />
          {bar(203, 56, 34, '#CFCFDA')}
          {['#fff', '#FFE9B8', '#CFEAF7', INK].map((c, i) => <rect key={c} x={203 + i * 13} y="66" width="10" height="10" rx="3" fill={c} stroke={LINE} />)}
          {bar(203, 84, 44, '#E1E1EA')}
          {bar(203, 92, 36, '#E1E1EA')}
        </>
      );
    },
  },
  passport: {
    title: 'Passport Photo',
    draw: () => (
      <>
        <rect x="64" y="48" width="122" height="96" rx="3" fill={SOFT} />
        {Array.from({ length: 8 }, (_, i) => { const c = i % 4, r = Math.floor(i / 4); const x = 70 + c * 28.5, y = 54 + r * 43; return (
          <g key={i}>
            <rect x={x} y={y} width="24" height="38" fill="#fff" stroke="#D6D6E0" strokeWidth="0.6" />
            <circle cx={x + 12} cy={y + 15} r="6.5" fill="#B9C3D3" />
            <path d={`M${x + 3} ${y + 38}C${x + 3} ${y + 26} ${x + 21} ${y + 26} ${x + 21} ${y + 38}Z`} fill="#8C9AB0" />
          </g>
        ); })}
        <path d="M70 52v-2h3M94 52v-2h-3" stroke={MUTED} strokeWidth="0.8" fill="none" />
        <rect x="196" y="48" width="64" height="70" rx="6" fill={SOFT} />
        <text x="203" y="62" fontFamily="Inter, Arial" fontSize="9" fontWeight="700" fill={INK}>35 × 45</text>
        <text x="203" y="72" fontFamily="Inter, Arial" fontSize="6.5" fill={MUTED}>millimetres</text>
        {bar(203, 82, 46, '#E1E1EA')}
        {bar(203, 90, 34, '#E1E1EA')}
        {bar(203, 102, 40, '#5DCCB8', 6)}
      </>
    ),
  },
  patterns: {
    title: 'Pattern Design',
    draw: (id) => {
      const motif = (x: number, y: number, k: number) => (
        <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>
          {[0, 60, 120].map((a) => <ellipse key={a} rx="8" ry="3" fill={SPECTRUM[k % 6]} transform={`rotate(${a})`} opacity="0.9" />)}
          <circle r="2.4" fill="#fff" />
        </g>
      );
      return (
        <>
          <clipPath id={`${id}-pc`}><rect x="62" y="48" width="196" height="108" rx="4" /></clipPath>
          <g clipPath={`url(#${id}-pc)`}>
            <rect x="62" y="48" width="196" height="108" fill="#FFF8EF" />
            {Array.from({ length: 9 * 6 }, (_, i) => { const cx = i % 9, cy = Math.floor(i / 9); return motif(70 + cx * 24 + (cy % 2) * 12, 56 + cy * 21, cx + cy * 2); })}
            {Array.from({ length: 9 * 6 }, (_, i) => { const cx = i % 9, cy = Math.floor(i / 9); return <circle key={`d${i}`} cx={82 + cx * 24 + (cy % 2) * 12} cy={66 + cy * 21} r="1.6" fill={INK} opacity="0.35" />; })}
          </g>
          <rect x="130" y="77" width="48" height="42" fill="none" stroke={BLUE} strokeWidth="1.3" strokeDasharray="4 3" />
          {[[130, 77], [178, 77], [130, 119], [178, 119]].map(([a, b], i) => <rect key={i} x={a - 2.5} y={b - 2.5} width="5" height="5" rx="1" fill="#fff" stroke={BLUE} strokeWidth="1" />)}
        </>
      );
    },
  },
  textile: {
    title: 'Textile Studio · Tee',
    draw: () => (
      <>
        {/* technical flat, front */}
        <g transform="translate(70 52)" fill="none" stroke={INK} strokeWidth="1.1" strokeLinejoin="round">
          <path d="M28 2L40 0C42 7 54 7 56 0L68 2L90 18L80 32L70 26V100H14V26L4 32L-6 18Z" fill="#fff" />
          <path d="M40 0C42 9 54 9 56 0" strokeWidth="1.6" />
          <path d="M16 96H68M8 28L-2 20M76 28L86 20" strokeDasharray="2 1.6" strokeWidth="0.7" />
          <rect x="28" y="34" width="28" height="22" rx="2" fill="#E3F4FB" stroke={CREASE} strokeWidth="0.8" strokeDasharray="2.5 2" />
        </g>
        {/* pattern pieces */}
        <g transform="translate(176 50)">
          <path d="M6 6L18 2C20 8 30 8 32 2L44 6L46 22L40 24V66H10V24L4 22Z" fill="#FDE7F0" stroke={CUT} strokeWidth="1" />
          <path d="M25 24V58M22 27L25 24L28 27M22 55L25 58L28 55" stroke={INK} strokeWidth="0.7" fill="none" />
          <path d="M54 10C62 4 74 4 82 10L84 34H52Z" fill="#E7F7EF" stroke={CUT} strokeWidth="1" />
          <path d="M8 74H44V104H8Z" fill="#EFEAFB" stroke={CUT} strokeWidth="1" />
          <path d="M54 44H84V60H54Z" fill="#FFF6D6" stroke={CUT} strokeWidth="1" />
          <text x="26" y="92" textAnchor="middle" fontFamily="Inter, Arial" fontSize="6" fill={MUTED}>Back</text>
          <text x="69" y="27" textAnchor="middle" fontFamily="Inter, Arial" fontSize="6" fill={MUTED}>Sleeve ×2</text>
        </g>
      </>
    ),
  },
  trace: {
    title: 'Image Trace',
    draw: () => {
      const leaf = 'M0 40C0 14 22 0 46 0C46 26 30 46 0 40Z';
      return (
        <>
          <g transform="translate(66 56)">
            <rect width="78" height="90" rx="4" fill={SOFT} />
            {LEAF_PIXELS.map(([x, y], i) => <rect key={i} x={x * 7} y={y * 7} width="7" height="7" fill={(x + y) % 3 ? '#8CC84B' : '#77B83D'} />)}
          </g>
          <path d="M150 100H168M162 94L168 100L162 106" stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <g transform="translate(176 56)">
            <rect width="80" height="90" rx="4" fill="#fff" stroke={LINE} />
            <g transform="translate(16 24) scale(1.05)">
              <path d={leaf} fill="#8CC84B" stroke={BLUE} strokeWidth="0.9" />
              <path d="M0 40C14 28 28 16 46 0" stroke="#fff" strokeWidth="1.4" fill="none" />
              <path d="M0 14L0 40L22 2" stroke={BLUE} strokeWidth="0.6" fill="none" />
              {[[0, 40], [46, 0], [0, 14], [22, 2]].map(([a, b], i) => i < 2 ? <rect key={i} x={a - 2.6} y={b - 2.6} width="5.2" height="5.2" fill="#fff" stroke={BLUE} strokeWidth="1" /> : <circle key={i} cx={a} cy={b} r="2" fill={BLUE} />)}
            </g>
          </g>
        </>
      );
    },
  },
  'print-size': {
    title: 'Print Size & Binding',
    draw: () => (
      <>
        <rect x="74" y="58" width="74" height="86" fill="#fff" stroke={LINE} />
        <rect x="148" y="58" width="10" height="86" fill="#EFEAFB" stroke={LINE} />
        <rect x="158" y="58" width="74" height="86" fill="#fff" stroke={LINE} />
        <rect x="70" y="54" width="166" height="94" fill="none" stroke="#E30613" strokeWidth="0.8" strokeDasharray="3 2" />
        <rect x="84" y="70" width="54" height="34" rx="2" fill="#A69BD3" opacity="0.55" />
        {bar(84, 112, 44)}
        {bar(84, 120, 34)}
        <rect x="168" y="70" width="54" height="44" rx="2" fill="#35C2F1" opacity="0.5" />
        {bar(168, 122, 48)}
        <path d="M148 50V58M158 50V58" stroke="#00A651" strokeWidth="1" strokeDasharray="2 1.5" />
        <text x="153" y="47" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fontWeight="700" fill="#00A651">spine 7.5 mm</text>
        <path d="M74 152H232M74 149V155M232 149V155" stroke={INK} strokeWidth="0.9" />
        <rect x="134" y="147" width="38" height="10" rx="5" fill="#fff" />
        <text x="153" y="154.5" textAnchor="middle" fontFamily="Inter, Arial" fontSize="7" fill={INK}>433.5 mm</text>
      </>
    ),
  },
  'print-layout': {
    title: 'Print Layout · SRA3',
    draw: () => (
      <>
        <rect x="80" y="48" width="160" height="108" rx="2" fill={SOFT} />
        {Array.from({ length: 10 }, (_, i) => { const c = i % 5, r = Math.floor(i / 5); const x = 88 + c * 30, y = 58 + r * 46; return (
          <g key={i}>
            <rect x={x} y={y} width="26" height="40" rx="1.5" fill="#fff" stroke={LINE} />
            <rect x={x} y={y} width="26" height="12" rx="1.5" fill={SPECTRUM[i % 6]} opacity="0.85" />
            {bar(x + 4, y + 18, 16, '#CFCFDA', 3)}
            {bar(x + 4, y + 24, 12, '#E1E1EA', 2.5)}
            {bar(x + 4, y + 30, 14, '#E1E1EA', 2.5)}
          </g>
        ); })}
        {[86, 116, 146, 176, 206, 234].map((x) => <path key={x} d={`M${x} 50V55M${x} 149V154`} stroke={INK} strokeWidth="0.6" />)}
        {[58, 98, 104, 144].map((y) => <path key={y} d={`M82 ${y}H86M234 ${y}H238`} stroke={INK} strokeWidth="0.6" />)}
      </>
    ),
  },
};

const CHIPS: Record<string, React.ReactNode> = {
  editor: <Chip text="Print-ready PDF" dot="#3B82C4" w={80} />,
  'photo-studio': <Chip text="Before · after" dot="#F2708F" w={72} x={220} />,
  packaging: <Chip text="Dieline + 3D" dot={CUT} w={70} x={222} />,
  'remove-background': <Chip text="Transparent PNG" dot="#5DCCB8" w={82} x={210} />,
  passport: <Chip text="Ready to print" dot="#5DCCB8" w={76} x={216} />,
  patterns: <Chip text="Seamless tile" dot="#A69BD3" w={70} x={222} />,
  textile: <Chip text="Pattern pieces" dot={CUT} w={76} x={216} />,
  trace: <Chip text="SVG vector" dot={BLUE} w={62} x={230} />,
  'print-size': <Chip text="Cover size" dot="#00A651" w={62} x={230} />,
  'print-layout': <Chip text="10-up · marks" dot="#35C2F1" w={72} x={220} />,
};

export function ToolArt({ id, tint }: { id: string; tint: string }) {
  const art = ART[id];
  if (!art) return null;
  const uid = `ta-${id}`;
  return <Stage id={uid} tint={tint} title={art.title} chip={CHIPS[id]}>{art.draw(uid)}</Stage>;
}
export const hasToolArt = (id: string) => !!ART[id];
