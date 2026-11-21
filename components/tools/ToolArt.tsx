// Card artwork for every tool: a small, crisp vector illustration of what the
// tool makes (not a screenshot, no repeated title) on a soft brand-gradient
// stage. Plain inline SVG — sharp on every screen, light and dark.

const SPECTRUM = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B', '#DDE23B'];

function Stage({ id, tint, children }: { id: string; tint: string; children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 320 180" className="h-full w-full" role="img" aria-hidden preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id={`${id}-wash`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={tint} stopOpacity="0.16" />
          <stop offset="1" stopColor={tint} stopOpacity="0.04" />
        </linearGradient>
        <linearGradient id={`${id}-sp`} x1="0" y1="0" x2="1" y2="0">
          {SPECTRUM.map((c, i) => <stop key={c} offset={i / (SPECTRUM.length - 1)} stopColor={c} />)}
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="0.5" cy="0.55" r="0.55">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <filter id={`${id}-sh`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#0B0B12" floodOpacity="0.16" />
        </filter>
      </defs>
      <rect width="320" height="180" fill={`url(#${id}-wash)`} />
      <ellipse cx="160" cy="98" rx="150" ry="80" fill={`url(#${id}-glow)`} />
      <path d="M-10 166C60 140 120 176 190 156S290 132 330 150" fill="none" stroke={`url(#${id}-sp)`} strokeWidth="7" strokeLinecap="round" opacity="0.55" />
      <g filter={`url(#${id}-sh)`}>{children}</g>
    </svg>
  );
}

const handles = (x: number, y: number, w: number, h: number, c = '#3B82C4') => (
  <g>
    <rect x={x} y={y} width={w} height={h} fill="none" stroke={c} strokeWidth="1.4" />
    {[[x, y], [x + w, y], [x, y + h], [x + w, y + h], [x + w / 2, y], [x + w / 2, y + h]].map(([a, b], i) => <rect key={i} x={a - 3} y={b - 3} width="6" height="6" rx="1" fill="#fff" stroke={c} strokeWidth="1.3" />)}
  </g>
);

const ART: Record<string, (id: string) => React.ReactNode> = {
  editor: (id) => (
    <>
      <rect x="92" y="22" width="136" height="140" rx="6" fill="#fff" />
      <rect x="102" y="32" width="116" height="66" rx="4" fill={`url(#${id}-sp)`} opacity="0.85" />
      <circle cx="190" cy="54" r="12" fill="#fff" opacity="0.8" />
      <path d="M102 98L136 66L160 86L178 72L218 98Z" fill="#0B0B12" opacity="0.25" />
      <rect x="102" y="108" width="80" height="9" rx="2" fill="#0B0B12" />
      <rect x="102" y="123" width="104" height="5" rx="2.5" fill="#C9C9D6" />
      <rect x="102" y="133" width="88" height="5" rx="2.5" fill="#C9C9D6" />
      <rect x="102" y="145" width="42" height="10" rx="5" fill="#3B82C4" />
      {handles(98, 104, 88, 17)}
      <g transform="translate(236 70)"><rect width="56" height="62" rx="8" fill="#fff" /><rect x="8" y="9" width="40" height="7" rx="3.5" fill="#E6E6EE" /><rect x="8" y="22" width="18" height="18" rx="4" fill="#F2708F" /><rect x="30" y="22" width="18" height="18" rx="4" fill="#35C2F1" /><rect x="8" y="46" width="40" height="6" rx="3" fill="#E6E6EE" /></g>
      <g transform="translate(30 58)"><rect width="46" height="76" rx="8" fill="#fff" />{[12, 26, 40, 54].map((y) => <rect key={y} x="12" y={y} width="22" height="8" rx="2" fill={y === 26 ? '#3B82C4' : '#E6E6EE'} />)}</g>
    </>
  ),
  'photo-studio': (id) => (
    <>
      <rect x="70" y="20" width="132" height="142" rx="8" fill="#fff" />
      <clipPath id={`${id}-ph`}><rect x="78" y="28" width="116" height="126" rx="5" /></clipPath>
      <g clipPath={`url(#${id}-ph)`}>
        <rect x="78" y="28" width="116" height="126" fill="#BFE6F6" />
        <path d="M78 28H136V154H78Z" fill="#FCE3E8" opacity="0.6" />
        <circle cx="136" cy="82" r="24" fill="#E9B79A" />
        <path d="M110 76C112 52 160 50 162 78C158 64 116 62 110 76Z" fill="#3A2A24" />
        <path d="M96 154C98 120 174 120 176 154Z" fill="#3B82C4" />
        <line x1="136" y1="28" x2="136" y2="154" stroke="#fff" strokeWidth="2" />
      </g>
      <circle cx="136" cy="91" r="6" fill="#fff" stroke="#3B82C4" strokeWidth="2" />
      <g transform="translate(214 36)">
        <rect width="78" height="110" rx="8" fill="#fff" />
        {[['Light', 0.7], ['Colour', 0.45], ['Face', 0.6], ['Skin', 0.35]].map(([l, v], i) => (
          <g key={String(l)} transform={`translate(10 ${16 + i * 24})`}>
            <rect width="58" height="3" rx="1.5" fill="#E6E6EE" />
            <rect width={58 * Number(v)} height="3" rx="1.5" fill={SPECTRUM[i + 1]} />
            <circle cx={58 * Number(v)} cy="1.5" r="4.5" fill="#fff" stroke={SPECTRUM[i + 1]} strokeWidth="2" />
          </g>
        ))}
      </g>
    </>
  ),
  trace: (id) => (
    <>
      <rect x="40" y="36" width="104" height="104" rx="8" fill="#fff" />
      {Array.from({ length: 64 }, (_, i) => { const x = i % 8, y = Math.floor(i / 8); const d = Math.hypot(x - 3.5, y - 3.5); return d < 3.6 ? <rect key={i} x={50 + x * 10.5} y={46 + y * 10.5} width="10" height="10" fill={d < 2 ? '#F2708F' : '#A69BD3'} opacity={d < 3 ? 1 : 0.6} /> : null; })}
      <path d="M152 88H176" stroke="#0B0B12" strokeWidth="3" strokeLinecap="round" /><path d="M170 80L178 88L170 96" fill="none" stroke="#0B0B12" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="186" y="36" width="104" height="104" rx="8" fill="#fff" />
      <circle cx="238" cy="88" r="38" fill="#A69BD3" /><circle cx="238" cy="88" r="21" fill="#F2708F" />
      <circle cx="238" cy="88" r="38" fill="none" stroke="#3B82C4" strokeWidth="1.3" />
      {[0, 60, 120, 180, 240, 300].map((a) => { const r = (a * Math.PI) / 180; return <rect key={a} x={238 + 38 * Math.cos(r) - 3} y={88 + 38 * Math.sin(r) - 3} width="6" height="6" fill="#fff" stroke="#3B82C4" strokeWidth="1.3" />; })}
      <text x="238" y="158" textAnchor="middle" fontFamily="Arial" fontSize="11" fontWeight="700" fill="#3B82C4">SVG</text>
    </>
  ),
  patterns: (id) => {
    const motif = (x: number, y: number, c: string, k: number) => <g key={`${x}-${y}`} transform={`translate(${x} ${y})`}>{[0, 45, 90, 135].map((a) => <ellipse key={a} rx="11" ry="4.2" fill={c} transform={`rotate(${a})`} opacity="0.9" />)}<circle r="3.6" fill={k % 2 ? '#DDE23B' : '#fff'} /></g>;
    return (
      <>
        <rect x="64" y="22" width="192" height="138" rx="10" fill="#1B1830" />
        <clipPath id={`${id}-pc`}><rect x="64" y="22" width="192" height="138" rx="10" /></clipPath>
        <g clipPath={`url(#${id}-pc)`}>
          {Array.from({ length: 7 * 5 }, (_, i) => { const cx = i % 7, cy = Math.floor(i / 7); return motif(72 + cx * 32 + (cy % 2) * 16, 34 + cy * 30, SPECTRUM[(cx + cy) % 6], i); })}
        </g>
        <rect x="128" y="62" width="64" height="60" fill="none" stroke="#fff" strokeWidth="1.6" strokeDasharray="5 4" />
      </>
    );
  },
  textile: (id) => (
    <>
      <path d="M80 44L106 30C112 42 136 42 142 30L168 44L184 74L164 82L160 70V156H88V70L84 82L64 74Z" fill="#fff" />
      <path d="M106 30C112 42 136 42 142 30" fill="none" stroke="#3B82C4" strokeWidth="5" strokeLinecap="round" />
      <path d="M88 118H160V128H88Z" fill={`url(#${id}-sp)`} />
      <text x="124" y="108" textAnchor="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="34" fill="#0B0B12">07</text>
      <text x="124" y="66" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="10" letterSpacing="2" fill="#0B0B12">ARUN</text>
      <g transform="translate(196 26)">
        <path d="M18 0H46L52 10L64 22L58 34L54 30V132H10V30L6 34L0 22L12 10Z" fill="#fff" />
        <path d="M32 2V40" stroke="#F2708F" strokeWidth="3" />
        <path d="M10 112H54" stroke="#0B0B12" strokeWidth="1.4" strokeDasharray="4 3" />
        <path d="M20 60C26 70 38 70 44 60M20 78C26 88 38 88 44 78" fill="none" stroke="#A69BD3" strokeWidth="2.2" />
      </g>
      <g transform="translate(36 120)"><rect width="34" height="34" rx="6" fill="#fff" /><path d="M8 26L26 8M8 8L26 26" stroke="#5DCCB8" strokeWidth="2" strokeDasharray="2.5 2" /></g>
    </>
  ),
  'print-size': () => (
    <>
      <path d="M78 40H160V150H78Z" fill="#fff" />
      <path d="M160 40H170V150H160Z" fill="#EBE7FF" />
      <path d="M170 40H252V150H170Z" fill="#fff" />
      <rect x="90" y="56" width="58" height="36" rx="3" fill="#A69BD3" opacity="0.6" />
      <rect x="182" y="56" width="58" height="46" rx="3" fill="#35C2F1" opacity="0.55" />
      <rect x="90" y="102" width="46" height="5" rx="2.5" fill="#C9C9D6" /><rect x="182" y="112" width="52" height="5" rx="2.5" fill="#C9C9D6" />
      <rect x="74" y="36" width="182" height="118" fill="none" stroke="#E30613" strokeWidth="1" strokeDasharray="3 2" />
      <path d="M78 164H252M78 160V168M252 160V168" stroke="#0B0B12" strokeWidth="1.2" />
      <text x="165" y="176" textAnchor="middle" fontFamily="Arial" fontSize="9" fill="#5D5D6E">433.5 mm</text>
      <path d="M160 26V40M170 26V40" stroke="#00A651" strokeWidth="1.4" strokeDasharray="3 2" />
      <text x="165" y="22" textAnchor="middle" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#00A651">spine 7.5</text>
    </>
  ),
  'print-layout': () => (
    <>
      <rect x="84" y="18" width="152" height="146" rx="4" fill="#fff" />
      {Array.from({ length: 10 }, (_, i) => { const c = i % 2, r = Math.floor(i / 2); return <g key={i} transform={`translate(${98 + c * 66} ${30 + r * 26})`}><rect width="58" height="21" rx="2" fill={i % 3 === 0 ? '#0B0B12' : '#F5F5FA'} stroke="#E6E6EE" strokeWidth="0.8" /><rect x="5" y="6" width="10" height="10" rx="5" fill={SPECTRUM[i % 6]} /><rect x="19" y="7" width="26" height="3" rx="1.5" fill={i % 3 === 0 ? '#fff' : '#9C9CAD'} /><rect x="19" y="12" width="18" height="2.5" rx="1.25" fill={i % 3 === 0 ? '#9C9CAD' : '#C9C9D6'} /></g>; })}
      {[94, 160, 226].map((x) => <path key={x} d={`M${x} 18V26M${x} 156V164`} stroke="#0B0B12" strokeWidth="0.8" />)}
      {[28, 158].map((y) => <path key={y} d={`M84 ${y}H92M228 ${y}H236`} stroke="#0B0B12" strokeWidth="0.8" />)}
    </>
  ),
  'remove-background': (id) => (
    <>
      <clipPath id={`${id}-rb`}><rect x="74" y="24" width="172" height="134" rx="8" /></clipPath>
      <g clipPath={`url(#${id}-rb)`}>
        <rect x="74" y="24" width="86" height="134" fill="#9BD3A2" />
        <path d="M74 120C100 100 130 116 160 104V158H74Z" fill="#5DA66A" />
        {Array.from({ length: 9 * 14 }, (_, i) => { const x = i % 9, y = Math.floor(i / 9); return (x + y) % 2 ? <rect key={i} x={160 + x * 9.6} y={24 + y * 9.6} width="9.6" height="9.6" fill="#ECECF2" /> : <rect key={i} x={160 + x * 9.6} y={24 + y * 9.6} width="9.6" height="9.6" fill="#fff" />; })}
        <circle cx="160" cy="78" r="26" fill="#E9B79A" />
        <path d="M132 72C134 46 186 44 188 74C182 58 140 56 132 72Z" fill="#3A2A24" />
        <path d="M116 158C118 116 202 116 204 158Z" fill="#F2708F" />
      </g>
      <line x1="160" y1="20" x2="160" y2="162" stroke="#fff" strokeWidth="3" />
      <circle cx="160" cy="92" r="9" fill="#fff" stroke="#3B82C4" strokeWidth="2" />
    </>
  ),
  passport: () => (
    <>
      <rect x="66" y="30" width="188" height="124" rx="6" fill="#fff" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i} transform={`translate(${78 + i * 43} 44)`}>
          <rect width="36" height="46" fill="#FFFFFF" stroke="#D5D5E0" strokeWidth="0.8" />
          <circle cx="18" cy="19" r="9" fill="#E9B79A" />
          <path d="M8 16C9 6 27 6 28 16C25 10 11 10 8 16Z" fill="#3A2A24" />
          <path d="M5 46C6 31 30 31 31 46Z" fill="#1E3A5F" />
        </g>
      ))}
      <rect x="78" y="100" width="164" height="42" rx="6" fill="#F5F5FA" />
      <text x="90" y="118" fontFamily="Arial" fontSize="10" fontWeight="700" fill="#0B0B12">35 × 45 mm</text>
      <text x="90" y="133" fontFamily="Arial" fontSize="9" fill="#5D5D6E">white background · 50 KB</text>
      <circle cx="224" cy="121" r="11" fill="#5DCCB8" /><path d="M219 121L223 125L230 117" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  laser: () => (
    <>
      <g transform="translate(70 30)"><rect width="180" height="120" rx="8" fill="#fff" />
        <path d="M30 90L60 30L90 90Z" fill="none" stroke="#FF0000" strokeWidth="1.4" /><circle cx="130" cy="60" r="30" fill="none" stroke="#FF0000" strokeWidth="1.4" /><path d="M110 60H150M130 40V80" stroke="#0000FF" strokeWidth="1.2" strokeDasharray="3 2" />
        <path d="M60 30V8" stroke="#DC2626" strokeWidth="2" /><path d="M54 8H66L60 0Z" fill="#0B0B12" /><circle cx="60" cy="30" r="3" fill="#FACC15" />
      </g>
    </>
  ),
  labels: () => (
    <>
      <g transform="translate(70 28)"><path d="M60 6C88 6 104 28 100 52C112 64 110 92 88 100C76 122 40 122 30 100C6 94 2 66 16 52C10 26 32 6 60 6Z" fill="#fff" /><path d="M60 6C88 6 104 28 100 52C112 64 110 92 88 100C76 122 40 122 30 100C6 94 2 66 16 52C10 26 32 6 60 6Z" fill="none" stroke="#EC008C" strokeWidth="1.4" /><circle cx="58" cy="62" r="32" fill="#F59E0B" /><circle cx="48" cy="54" r="5" fill="#0B0B12" /><circle cx="68" cy="54" r="5" fill="#0B0B12" /><path d="M44 72C52 80 64 80 72 72" stroke="#0B0B12" strokeWidth="4" fill="none" strokeLinecap="round" /></g>
      <g transform="translate(196 52)"><circle cx="36" cy="36" r="34" fill="#fff" stroke="#EC008C" strokeWidth="1.4" /><circle cx="36" cy="36" r="24" fill="#5DCCB8" /><rect x="0" y="84" width="72" height="34" rx="8" fill="#fff" stroke="#EC008C" strokeWidth="1.4" /><rect x="10" y="94" width="40" height="5" rx="2.5" fill="#C9C9D6" /><rect x="10" y="104" width="28" height="5" rx="2.5" fill="#C9C9D6" /></g>
    </>
  ),
  vdp: () => (
    <>
      {['Arun Kumar', 'Priya Nair', 'Ravi Shankar'].map((n, i) => (
        <g key={n} transform={`translate(${74 + i * 22} ${36 + i * 22})`}>
          <rect width="128" height="80" rx="8" fill="#fff" />
          <rect width="128" height="18" rx="8" fill={['#7C3AED', '#3B82C4', '#5DCCB8'][i]} />
          <text x="64" y="46" textAnchor="middle" fontFamily="Arial" fontWeight="700" fontSize="12" fill="#0B0B12">{n}</text>
          <text x="64" y="62" textAnchor="middle" fontFamily="Arial" fontSize="8" fill="#6B7280">{`No. 000${i + 1}`}</text>
        </g>
      ))}
    </>
  ),
  'large-format': () => (
    <>
      <g transform="translate(96 18)">
        <rect width="128" height="150" fill="#fff" />
        <circle cx="64" cy="80" r="52" fill="#35C2F1" /><circle cx="64" cy="80" r="34" fill="#F2708F" /><circle cx="64" cy="80" r="16" fill="#DDE23B" />
        {[42.7, 85.3].map((x) => <path key={x} d={`M${x} 0V150`} stroke="#3B82C4" strokeWidth="1.2" strokeDasharray="4 3" />)}
        {[50, 100].map((y) => <path key={y} d={`M0 ${y}H128`} stroke="#3B82C4" strokeWidth="1.2" strokeDasharray="4 3" />)}
      </g>
    </>
  ),
  separation: () => (
    <>
      {[['#00A0E3', 0], ['#E6007E', 1], ['#FFED00', 2], ['#1A1A1A', 3]].map(([c, i]) => (
        <g key={String(c)} transform={`translate(${70 + Number(i) * 26} ${30 + Number(i) * 10})`}>
          <rect width="104" height="104" rx="6" fill="#fff" />
          {Array.from({ length: 49 }, (_, k) => { const x = k % 7, y = Math.floor(k / 7); const r = 1.2 + ((x + y + Number(i)) % 5) * 0.9; return <circle key={k} cx={14 + x * 12.6} cy={14 + y * 12.6} r={r} fill={String(c)} />; })}
        </g>
      ))}
    </>
  ),
  barcode: () => (
    <>
      <g transform="translate(86 34)"><rect width="148" height="112" rx="8" fill="#fff" />
        {[3,1,1,2,1,3,2,1,1,1,2,3,1,2,1,1,3,1,2,1,1,2,1,3,1,1,2,1,1,3].reduce((acc: { x: number; els: any[] }, w, i) => { if (i % 2 === 0) acc.els.push(<rect key={i} x={14 + acc.x} y={14} width={w * 1.6} height={i < 2 || i > 27 || (i > 13 && i < 16) ? 72 : 64} fill="#0B0B12" />); acc.x += w * 1.9; return acc; }, { x: 0, els: [] }).els}
        <text x="74" y="100" textAnchor="middle" fontFamily="Arial" fontSize="11" letterSpacing="2" fill="#0B0B12">4 006381 333931</text>
      </g>
    </>
  ),
  preflight: () => (
    <>
      <g transform="translate(72 22)"><path d="M0 0H86L110 24V140H0Z" fill="#fff" /><path d="M86 0V24H110" fill="#EEF0F4" />
        {[34, 50, 66, 82, 98, 114].map((y, i) => <g key={y}><circle cx="16" cy={y} r="4.5" fill={i === 2 ? '#F59E0B' : i === 4 ? '#DC2626' : '#10B981'} /><rect x="27" y={y - 3} width={i % 2 ? 58 : 70} height="6" rx="3" fill="#E4E4EA" /></g>)}
      </g>
      <g transform="translate(196 60)"><circle cx="34" cy="34" r="30" fill="#fff" stroke="#0B0B12" strokeWidth="5" /><path d="M56 56L80 80" stroke="#0B0B12" strokeWidth="9" strokeLinecap="round" /><path d="M22 34L31 43L47 25" fill="none" stroke="#10B981" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" /></g>
    </>
  ),
  'packaging-editor': () => (
    <>
      <g transform="translate(30 18)">
        <rect width="260" height="146" rx="8" fill="#fff" />
        <rect width="260" height="14" rx="8" fill="#0B0B12" /><rect y="8" width="260" height="6" fill="#0B0B12" />
        <rect x="0" y="14" width="16" height="132" fill="#F1F2F5" />
        {[24, 38, 52, 66, 80].map((y) => <rect key={y} x="4" y={y} width="8" height="8" rx="2" fill={y === 24 ? '#0B0B12' : '#C9CCD4'} />)}
        <rect x="16" y="14" width="56" height="132" fill="#FAFAFB" />
        {[26, 36, 46, 62, 72].map((y, i) => <rect key={y} x="22" y={y} width={i % 2 ? 34 : 44} height="5" rx="2.5" fill="#E4E4EA" />)}
        <rect x="216" y="14" width="44" height="132" fill="#FAFAFB" />
        {[26, 36, 46].map((y) => <rect key={y} x="222" y={y} width="32" height="5" rx="2.5" fill="#E4E4EA" />)}
        <g transform="translate(86 40)">
          <path d="M10 20H34V86H10ZM34 20H74V86H34ZM74 20H98V86H74ZM98 20H122V86H98Z" fill="#fff" />
          <path d="M0 26L10 20V86L0 80ZM34 20V4H74V20M34 86V102H74V86" fill="#fff" stroke="#EC008C" strokeWidth="1.2" strokeLinejoin="round" />
          <path d="M10 20H122V86H10Z" fill="none" stroke="#EC008C" strokeWidth="1.2" />
          <path d="M34 20V86M74 20V86M98 20V86" fill="none" stroke="#00A0E3" strokeWidth="1" strokeDasharray="3 2" />
          <rect x="40" y="38" width="28" height="22" rx="2" fill="none" stroke="#2563eb" strokeWidth="1" strokeDasharray="2 1.5" />
        </g>
      </g>
    </>
  ),
  packaging: () => (
    <>
      <g transform="translate(40 30)">
        <path d="M14 30H40V118H14Z" fill="#fff" /><path d="M40 30H96V118H40Z" fill="#fff" /><path d="M96 30H122V118H96Z" fill="#fff" /><path d="M122 30H178V118H122Z" fill="#fff" />
        <path d="M0 40L14 30V118L0 108Z" fill="#fff" />
        <path d="M122 30V6C122 0 126 -2 132 -2H168C174 -2 178 0 178 6V30" fill="#fff" />
        <path d="M40 118V142C40 148 44 150 50 150H86C92 150 96 148 96 142V118" fill="#fff" />
        <path d="M14 30L22 12H40V30M96 30V12H114L122 30M14 118L22 136H40M96 136H114L122 118" fill="#fff" />
        <path d="M0 40L14 30M14 30L22 12H40V30H96V12H114L122 30V6C122 0 126 -2 132 -2H168C174 -2 178 0 178 6V118H96V136H114L122 118M96 118V142C96 148 92 150 86 150H50C44 150 40 148 40 142V118H14L22 136H40M14 118L0 108V40" fill="none" stroke="#EC008C" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M14 30V118M40 30V118M96 30V118M122 30V118M14 30H40M96 30H178M14 118H96M122 118H178M40 118H96M122 6H178" fill="none" stroke="#00A0E3" strokeWidth="1.1" strokeDasharray="4 2.5" />
      </g>
      <g transform="translate(236 66)">
        <path d="M0 18L30 0L60 18L30 36Z" fill="#F7F8FA" stroke="#0B0B12" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M0 18V70L30 88V36Z" fill="#fff" stroke="#0B0B12" strokeWidth="1.2" strokeLinejoin="round" />
        <path d="M60 18V70L30 88V36Z" fill="#EEF0F4" stroke="#0B0B12" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    </>
  ),
  colours: () => (
    <>
      <g transform="translate(160 92)">
        {Array.from({ length: 12 }, (_, i) => { const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 1) / 12) * Math.PI * 2, R = 62, r = 30; const p = (a: number, rr: number) => `${rr * Math.cos(a)} ${rr * Math.sin(a)}`; return <path key={i} d={`M${p(a0, r)}L${p(a0, R)}A${R} ${R} 0 0 1 ${p(a1, R)}L${p(a1, r)}A${r} ${r} 0 0 0 ${p(a0, r)}Z`} fill={`hsl(${i * 30} 75% 62%)`} stroke="#fff" strokeWidth="1.5" />; })}
        <circle r="26" fill="#fff" />
        <circle cx="0" cy="-46" r="7" fill="none" stroke="#0B0B12" strokeWidth="2.2" />
      </g>
      <g transform="translate(236 40)">{['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B'].map((c, i) => <rect key={c} y={i * 22} width="56" height="18" rx="5" fill={c} />)}</g>
      <g transform="translate(30 56)"><rect width="56" height="66" rx="8" fill="#fff" /><text x="10" y="22" fontFamily="Arial" fontSize="9" fontWeight="700" fill="#0B0B12">#35C2F1</text><text x="10" y="38" fontFamily="Arial" fontSize="8" fill="#5D5D6E">CMYK</text><text x="10" y="50" fontFamily="Arial" fontSize="8" fill="#5D5D6E">AA ✓</text></g>
    </>
  ),
};

export function ToolArt({ id, tint }: { id: string; tint: string }) {
  const draw = ART[id];
  if (!draw) return null;
  const uid = `ta-${id}`;
  return <Stage id={uid} tint={tint}>{draw(uid)}</Stage>;
}
export const hasToolArt = (id: string) => !!ART[id];
