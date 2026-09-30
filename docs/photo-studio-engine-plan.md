# Photo Studio: professional-editor upgrade plan

## Status: Phase 1, slice 1 of 8 phases

This tracks a large, explicitly-requested upgrade of `/photo-studio`
(`components/photoEditor/PhotoEditorWorkspace.tsx`) toward professional,
Photoshop/Lightroom-category capability, using Photopea as a functional
reference only (no copied code/assets/branding — this is an original
implementation).

## Decision: extend the existing editor, not the abandoned `/studio` engine

Before this work started, the repo already had TWO candidate foundations:

1. **`/photo-studio`** (this doc's subject) — Fabric.js-based, shipped,
   real users depend on it today. Per `docs/ENGINEERING_AUDIT.md` §9, the
   large majority of a professional tool list is already real and working:
   Move, Marquee, Lasso, Magic Wand, Crop, a genuine Bézier Pen, a real
   paintable Brush/Eraser, Dodge/Burn, Clone Stamp, Gradient, Eyedropper,
   Levels, Curves+histogram, Hue/Saturation, Exposure/Vibrance, layer
   masks (paint + color-range + gradient), content-aware healing,
   Blur/Sharpen/Sponge brushes, Paint Bucket, Skew, Perspective warp, real
   layer blend modes, a real menu bar, a dark pro workspace shell.
2. **`/studio`** (`src/editor/`, see `docs/editor-architecture.md`) — a
   from-scratch engine with genuinely the module layout this new request
   describes (`Document`/`LayerManager`/`CommandManager`/
   `SelectionManager`/`TransformManager`/`CoordinateSystem`/`EventManager`,
   a real `Tool` interface + registry). But it stalled at Phase 1/2: only
   Hand + Zoom tools exist, Canvas2D only, IndexedDB-only storage (no
   account/cloud integration), and it is not linked anywhere in the live
   site.

**Decision (explicit, from the user): extend #1.** Rebuilding months of
already-working functionality from zero in #2, plus building its cloud
save from scratch, was judged not worth it versus strengthening the
engine under what's already shipped and tested. This mirrors the spec's
own "do not unnecessarily rewrite the whole application" / "reuse working
systems where possible" rules.

## Ground rule for every phase

`PhotoEditorWorkspace.tsx`'s visible layout, toolbar, and panels stay
exactly as they are throughout. Every phase changes what's *underneath*
them. No phase merges a change that alters existing tool behavior without
the full regression suite (below) passing first.

## Phase breakdown

| Phase | Scope |
|---|---|
| **1 — Engine foundation** | A real module layer (`components/photoEditor/engine/`): typed `Document`/`Layer` model, a `Command`-based `CommandManager`/`History`, and (later slices) a thin engine façade. No visible change. |
| 2 | Selection + crop hardening: formalize existing tools onto a real `Tool` registry; crop presets + rule-of-thirds |
| 3 | Brush engine upgrade: hardness/flow/spacing/roundness/angle/smoothing, brush presets, pressure/tilt via Pointer Events |
| 4 | Vector + shapes in Photo Studio (port Main Design's real shape tools + boolean paths) |
| 5 | Adjustments → Lightroom-style panel (Highlights/Shadows/Whites/Blacks, Temperature/Tint, per-channel curves, Color Mixer) |
| 6 | Missing retouch tools: Patch, Smudge, Red Eye, built on existing real diffusion/sampling primitives |
| 7 | Free Transform unifying Skew/Perspective/Fabric handles + perspective crop |
| 8 | Performance + format hardening: layer/thumbnail caching, debounced continuous-op history, large-image safeguards, PSD investigation |

## Phase 1, slice 1 (this entry): Command/History primitives

Added `components/photoEditor/engine/`:

- `Command.ts` — the `Command` interface (`label`/`execute`/`undo`/
  `redo?`) and `MacroCommand`, which groups a run of continuous
  sub-operations into one history entry — the spec's explicit "do not
  create a history entry for every mousemove; group continuous operations
  into a single transaction" requirement.
- `CommandManager.ts` — a real, depth-capped undo/redo stack
  (`execute`/`undo`/`redo`/`canUndo`/`canRedo`/`getEntries`/`subscribe`),
  independent of any renderer. Verified with 19 real behavioral checks
  (execute/undo/redo correctness, redo-branch discard on a new edit after
  undo, depth-cap retaining the most recent entries, named entries for a
  History panel, `MacroCommand` transaction grouping, subscribe/
  unsubscribe) — pure logic, run directly under Node via the TypeScript
  compiler's `transpileModule`, no browser needed.
- `PhotoDocument.ts` — typed `PhotoDocument`/`PhotoLayer`/`PhotoAdjustments`/
  `LayerMask` types, documenting (not yet replacing) the real custom
  fields `PhotoEditorWorkspace.tsx` already stashes on live Fabric layers
  (`__layerId`, `__maskData`, `__adjustments`, `__cropRect`, ...).

**Not yet done, stated honestly:** none of this is wired into
`PhotoEditorWorkspace.tsx` yet — it's new, unimported, unit-tested
modules only (confirmed zero bundle-size impact on a full production
build). The existing per-layer, snapshot-based undo (`pushLayerHistory`,
`MAX_LOCAL_HISTORY = 30`, already depth-capped with compressed-PNG mask
storage — corrected from an earlier, inaccurate claim in this same pass
that it was unbounded) stays exactly as-is until a specific tool is
migrated onto `CommandManager` in a later, carefully regression-tested
slice. Migrating tools one at a time (starting with the simplest —
opacity/visibility/rename/reorder — before anything raster/pixel-based)
is the deliberate next step, not a single big-bang swap.

## Regression suite this work must keep passing

`test_photo_studio_menubar.js` (17 checks), `test_photo_studio_pro_tools.js`
(12 checks), plus the full-platform sweep and Main Design suites this
engagement has already built — see `docs/CHANGELOG_ENGINEERING.md` for
the running total. Re-run all of them, not just the ones that look
related, after any slice that touches `PhotoEditorWorkspace.tsx` itself.
