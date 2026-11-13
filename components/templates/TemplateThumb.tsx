'use client';

// The one template thumbnail used across the site. It always comes from the
// template's own `thumbnail` (the single source of truth the admin edits),
// keeps its box size while loading, loads lazily, and if the picture is
// genuinely unavailable shows a neutral tile with the template's colours and
// name — never a different template's image.

import { useState } from 'react';

export function TemplateThumb({ src, alt, color1, color2, label, className = '', imgClassName = '', style, eager = false, onBroken }: {
  src: string | null | undefined; alt: string; color1?: string | null; color2?: string | null; label?: string;
  className?: string; imgClassName?: string; style?: React.CSSProperties; eager?: boolean; onBroken?: () => void;
}) {
  const [broken, setBroken] = useState(!src);
  if (broken) {
    return (
      <div role="img" aria-label={alt} className={`grid place-items-center text-center p-2 ${className}`} style={{ ...style, background: `linear-gradient(135deg, ${color1 || '#E8ECF3'}, ${color2 || '#CBD5E1'})` }}>
        <span className="text-[11px] font-semibold text-white/90 [text-shadow:0_1px_2px_rgba(0,0,0,.35)] line-clamp-3">{label || alt}</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src!} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" className={`${className} ${imgClassName}`} style={style}
      onError={() => { setBroken(true); onBroken?.(); }} />
  );
}
