'use client';

// A gradient-and-label stand-in for a real design thumbnail — used
// wherever we show a template/design preview but don't have real
// artwork/photography to render (the homepage gallery and the
// templates page both use this exact same honest placeholder, rather
// than each inventing its own).
export function MockDesignCard({ colors, label }: { colors: [string, string]; label: string }) {
  return (
    <div
      className="w-full h-full flex items-end p-4"
      style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
    >
      <span className="text-white text-xs font-semibold tracking-tight opacity-90">{label}</span>
    </div>
  );
}
