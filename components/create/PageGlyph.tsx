'use client';

// A tiny page drawn at the real proportions of a document size, so people
// can see the shape before they pick it.

export function PageGlyph({ w, h, box = 76, active, background = '#ffffff', accent = true }: { w: number; h: number; box?: number; active?: boolean; background?: string; accent?: boolean }) {
  const r = w / h;
  const width = r >= 1 ? box : Math.max(10, box * r);
  const height = r >= 1 ? Math.max(8, box / r) : box;
  const transparent = background === 'transparent';
  return (
    <span
      aria-hidden
      className="relative inline-block rounded-[5px] overflow-hidden transition-transform duration-300 group-hover:-translate-y-0.5"
      style={{
        width,
        height,
        background: transparent ? 'repeating-conic-gradient(#e4e4e7 0% 25%, #ffffff 0% 50%) 50% / 10px 10px' : background,
        boxShadow: active ? '0 0 0 2px #3B82C4, 0 14px 28px -12px rgba(59,130,196,0.55)' : '0 0 0 1px rgba(9,9,11,0.08), 0 10px 22px -14px rgba(9,9,11,0.45)',
      }}
    >
      {accent && (
        <>
          <span className="absolute inset-x-0 top-0 h-[22%] mt-spectrum opacity-90" />
          <span className="absolute left-[14%] right-[30%] top-[36%] h-[7%] rounded-full bg-zinc-900/15" />
          <span className="absolute left-[14%] right-[46%] top-[50%] h-[5%] rounded-full bg-zinc-900/10" />
          <span className="absolute left-[14%] right-[54%] top-[61%] h-[5%] rounded-full bg-zinc-900/10" />
        </>
      )}
    </span>
  );
}
