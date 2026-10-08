'use client';

import { useBackgroundAnimationEnabled } from '@/hooks/useBackgroundAnimationEnabled';

interface Props {
  className?: string;
}

// A reusable, continuously-drifting ambient background -- two soft
// gradient blobs any section can drop behind its content. Transform-only
// keyframes (translate + scale, registered in tailwind.config.ts as
// bg-float-a/bg-float-b) so the browser compositor handles this without
// ever triggering layout, and animation-play-state is driven live by
// useBackgroundAnimationEnabled: a hidden tab, prefers-reduced-motion,
// or a device that can't hold a steady frame rate all pause it rather
// than fighting the page for no visible benefit.
export function AnimatedDesignBackground({ className }: Props) {
  const enabled = useBackgroundAnimationEnabled();
  const playState = enabled ? 'running' : 'paused';

  // No overflow-hidden on the wrapper below -- the original static
  // blobs this replaces were allowed to bleed past their container at
  // larger breakpoints (see CreativeHeroArt's own `sm:overflow-visible`);
  // clipping stays the calling section's own decision, not this
  // component's.
  return (
    <div className={`pointer-events-none absolute inset-0 ${className || ''}`} aria-hidden="true">
      {/* Base position is baked into the bg-float-a/b keyframes
          themselves (matching the original static -translate-x-16
          -translate-y-10 / translate-x-24 translate-y-16 offsets) --
          an animation's `transform` keyframes fully own that property
          for the element, so a separate static translate-* utility
          class here would just get overridden the instant the
          animation starts. */}
      <span
        className="absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#8CCBFF]/20 blur-3xl animate-bg-float-a"
        style={{ animationPlayState: playState }}
      />
      <span
        className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[#F8C7D2]/20 blur-3xl animate-bg-float-b"
        style={{ animationPlayState: playState }}
      />
    </div>
  );
}
