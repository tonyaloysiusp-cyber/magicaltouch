// ---------------------------------------------------------------------
// components/ArtworkPanel.tsx
// A decorative "creative workspace" illustration panel, built entirely
// from inline SVG shapes and gradients — no external image assets, so
// there's zero licensing risk (the brief specifically asked for that).
// Two variants share one composition (overlapping color swatches, a
// stylized pen-tool path, and a floating artboard card) recolored for a
// light "day" mood and a moodier, neon-accented "night" one.
// ---------------------------------------------------------------------

export function ArtworkPanel({ variant }: { variant: 'day' | 'night' }) {
  const isNight = variant === 'night';

  const bg = isNight
    ? 'linear-gradient(160deg, #14121F 0%, #1E1B2E 55%, #241F3A 100%)'
    : 'linear-gradient(160deg, #FDF4F8 0%, #F3EEFC 55%, #EAF6FB 100%)';

  const cardBg = isNight ? '#242038' : '#FFFFFF';
  const cardBorder = isNight ? '#3A355A' : 'rgba(20,18,31,0.08)';
  const textMuted = isNight ? '#8B85AE' : '#8A8496';
  const swatches = isNight
    ? ['#FF6F91', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#C4DA3B']
    : ['#EC1E79', '#8B6FC4', '#3FA9E8', '#4FC8C0', '#7ED33E'];

  return (
    <div className="relative w-full h-full overflow-hidden" style={{ background: bg }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={`blob1-${variant}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={isNight ? '#8B6FC4' : '#EC1E79'} stopOpacity={isNight ? 0.35 : 0.25} />
            <stop offset="100%" stopColor={isNight ? '#3FA9E8' : '#8B6FC4'} stopOpacity={isNight ? 0.25 : 0.18} />
          </linearGradient>
          <linearGradient id={`blob2-${variant}`} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={isNight ? '#4FC8C0' : '#4FC8C0'} stopOpacity={isNight ? 0.3 : 0.2} />
            <stop offset="100%" stopColor={isNight ? '#14121F' : '#FFFFFF'} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft ambient shapes */}
        <circle cx="470" cy="140" r="220" fill={`url(#blob1-${variant})`} />
        <circle cx="80" cy="620" r="260" fill={`url(#blob2-${variant})`} />

        {/* Subtle dot grid, the same "workspace" texture cue as the
            editor's own pasteboard */}
        {Array.from({ length: 8 }).map((_, row) =>
          Array.from({ length: 6 }).map((_, col) => (
            <circle
              key={`${row}-${col}`}
              cx={60 + col * 100}
              cy={80 + row * 100}
              r={1.4}
              fill={isNight ? '#4A4470' : '#D8D3E8'}
            />
          ))
        )}

        {/* A stylized pen-tool path, echoing the editor's own Pen tool */}
        <path
          d="M90 260 C 180 180, 260 340, 340 240 S 480 140, 540 220"
          fill="none"
          stroke={isNight ? '#4FC8C0' : '#3FA9E8'}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="1 10"
          opacity="0.6"
        />
        <circle cx="90" cy="260" r="5" fill={isNight ? '#4FC8C0' : '#3FA9E8'} opacity="0.8" />
        <circle cx="340" cy="240" r="5" fill={isNight ? '#4FC8C0' : '#3FA9E8'} opacity="0.8" />
        <circle cx="540" cy="220" r="5" fill={isNight ? '#4FC8C0' : '#3FA9E8'} opacity="0.8" />
      </svg>

      {/* Floating "artboard" card — an abstract sample design, not a
          real screenshot, matching this app's own template-preview
          visual language (a gradient panel with a mock headline). */}
      <div
        className="absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 w-56 rounded-2xl shadow-2xl overflow-hidden rotate-[-4deg]"
        style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
      >
        <div
          className="h-32 flex flex-col items-center justify-center gap-2 text-center px-4"
          style={{ background: `linear-gradient(135deg, ${swatches[0]}, ${swatches[1]})` }}
        >
          <span className="w-8 h-8 rounded-full bg-white/90" />
          <span className="text-white text-xs font-semibold tracking-wide">Make it magical</span>
        </div>
        <div className="p-3 flex items-center gap-1.5">
          {swatches.map((c) => (
            <span key={c} className="w-4 h-4 rounded-full" style={{ background: c }} />
          ))}
        </div>
      </div>

      {/* A second, smaller card peeking from behind for depth */}
      <div
        className="absolute left-1/2 top-[62%] -translate-x-1/2 -translate-y-1/2 w-36 h-20 rounded-xl shadow-lg rotate-[6deg]"
        style={{ background: `linear-gradient(135deg, ${swatches[2]}, ${swatches[3]})`, opacity: 0.9 }}
      />

      <div className="absolute bottom-8 left-0 right-0 text-center px-8">
        <p className="text-sm font-medium" style={{ color: isNight ? '#D8D3E8' : '#4A4750' }}>
          A creative, professional design workspace
        </p>
        <p className="text-xs mt-1" style={{ color: textMuted }}>
          {isNight ? 'Design late into the night.' : 'Bring your ideas to life, every day.'}
        </p>
      </div>
    </div>
  );
}
