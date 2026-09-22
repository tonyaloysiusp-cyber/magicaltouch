# Rendering Architecture

## Phase 1: Canvas2D compositing (current)

Each layer owns its own offscreen `<canvas>` (`HTMLCanvasElement`, not
attached to the DOM) sized to the document's pixel dimensions. The visible
`<canvas>` (`src/editor/raster/RasterCanvas.ts`) is a single compositor:

1. Clear to the document background color.
2. Apply the current viewport transform (`CoordinateSystem`: pan offset +
   zoom scale) via `ctx.setTransform(...)`.
3. Walk the document's layers bottom-to-top; for each visible layer, set
   `globalAlpha = layer.opacity`, apply the layer's own position offset,
   and `drawImage` its offscreen canvas.
4. Render tool overlays (selection marching ants, transform handles, brush
   cursor ring, etc.) in a **separate** overlay `<canvas>` stacked on top,
   redrawn independently so a moving overlay (e.g. a live brush cursor)
   never requires re-compositing every pixel layer.

This is genuinely real-time: `EventManager` triggers a re-render on every
`pointermove` while panning/zooming, not just on release, per §35 of the
source spec.

Rendering is triggered by an internal `requestAnimationFrame` loop that
only actually draws when a `dirty` flag is set (by any mutation or
viewport change) — an idle document does not redraw every frame.

## Planned for later phases (not built yet)

- **Dirty-region compositing**: currently the whole visible canvas is
  recomposited on every change. Restricting redraw to the bounding box
  that actually changed is planned for Phase 9 (Performance) once there
  are tools that make small, frequent changes (e.g. a brush stroke) where
  this matters.
- **OffscreenCanvas + Web Workers**: moving the compositor (and, later,
  filter/adjustment pixel math) off the main thread. Not needed for Phase
  1's layer-only content; planned alongside the Brush/Filter engines in
  Phases 2-4.
- **WebGL/WebGPU**: reserved for GPU-bound work — real-time HSL/curve
  preview over large images, blur/sharpen, blend modes at high layer
  counts. Not implemented in Phase 1; Canvas2D is sufficient for
  compositing a handful of opaque/semi-transparent raster layers.
- **Vector scene graph rendering**: the vector engine (`src/editor/vector/`)
  is unbuilt. When it lands, vector objects will render via `Path2D` /
  SVG path data drawn into the same Canvas2D compositor (or a dedicated
  SVG layer, decision deferred to Phase 6), not a separate rendering
  stack that has to be kept in sync by hand.

## Why not start with WebGL

The spec asks for WebGL/WebGPU "where beneficial" — for Phase 1's actual
content (empty/solid-color raster layers, pan, zoom), a GPU pipeline adds
real complexity (shader compilation, context loss handling, texture
upload) with no measurable benefit yet. Introducing it before there's a
GPU-bound operation to justify it would itself violate the "don't build
things that don't do anything real" principle — the same logic the source
spec applies to tools applies to infrastructure.
