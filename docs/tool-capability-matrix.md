# Tool Capability Matrix — new engine (`/studio`)

Honest, developer-facing status of every tool named in the source spec.
`STATUS` is the only column that matters for "is this real" — the rest
describe what it will support once built. A tool marked `NOT_IMPLEMENTED`
does **not** appear in the `/studio` UI at all (no disabled button, no
"coming soon" — per the no-fake-features policy).

Legend: ✅ yes · ➖ n/a · ❌ no/not yet · — not evaluated yet

| Tool | STATUS | Raster | Vector | Real-time | Undo | GPU | Worker | Touch | Stylus | Phase |
|---|---|---|---|---|---|---|---|---|---|---|
| Hand | **IMPLEMENTED** | ✅ | ✅ | ✅ | ➖ (view-only) | ➖ | ➖ | ✅ | ✅ | 1 |
| Zoom | **IMPLEMENTED** | ✅ | ✅ | ✅ | ➖ (view-only) | ➖ | ➖ | ✅ | ✅ | 1 |
| Layer create/delete/rename/reorder/visibility/lock/opacity | **IMPLEMENTED** | ✅ | ➖ | ✅ | ✅ | ➖ | ➖ | ➖ | ➖ | 1 |
| Layer translate (position) | **IMPLEMENTED** | ✅ | ➖ | ✅ | ✅ | ➖ | ➖ | — | — | 1 |
| Save / Load (IndexedDB) | **IMPLEMENTED** | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | 1 |
| Move | NOT_IMPLEMENTED | Raster | Vector | — | — | — | — | — | — | 2 |
| Marquee (rect/ellipse/row/column) | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Lasso / Polygonal / Magnetic | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | ✅ (magnetic) | — | — | 2 |
| Quick Selection | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Magic Wand (raster) | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Object Selection | NOT_IMPLEMENTED — no segmentation model installed; will ship as geometric/color-based selection, explicitly labeled as such, never as "AI" | Raster | ➖ | — | — | — | — | — | — | 2/3 |
| Crop (free/ratio/fixed/straighten) | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Eyedropper | NOT_IMPLEMENTED | Raster | Vector | — | — | — | — | — | — | 2 |
| Spot Healing / Healing Brush | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Patch | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Clone Stamp | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Brush | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | Pressure planned | 2 |
| Pencil | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Color Replacement | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Mixer Brush | NOT_IMPLEMENTED — will ship as a documented simplified paint-mixing algorithm, never labeled "physically accurate" | Raster | ➖ | — | — | — | — | — | — | 3 |
| Eraser / Background Eraser / Magic Eraser | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2/3 |
| Gradient (raster) | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Paint Bucket | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 2 |
| Dodge / Burn / Sponge | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Blur / Sharpen | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Smudge | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 3 |
| Pen (Bézier path) | NOT_IMPLEMENTED | Path only | Vector | — | — | — | — | — | — | 6 |
| Freeform Pen | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 6 |
| Add/Delete/Convert Anchor | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 6 |
| Type (point/area/path text) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 7 |
| Shape tools (rect/ellipse/polygon/star/line/custom) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 6 |
| Illustrator-style Selection / Direct Selection / Group Selection | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 6 |
| Vector Magic Wand (by appearance) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 6 |
| Artboard tool | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 8 |
| Vector painting (Paintbrush/Blob/Pencil/Path Eraser) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 8 |
| Gradient / Mesh (vector) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 8 |
| Live Paint | NOT_IMPLEMENTED — only if the scene-graph architecture ends up supporting it; may remain unavailable | ➖ | Vector | — | — | — | — | — | — | 8 |
| Shape Builder | NOT_IMPLEMENTED — requires a real computational-geometry library | ➖ | Vector | — | — | — | — | — | — | 8 |
| Boolean ops (union/subtract/intersect/exclude) | NOT_IMPLEMENTED — requires a real computational-geometry library, not visual approximation | ➖ | Vector | — | — | — | — | — | — | 6 |
| Vector transform tools (Rotate/Reflect/Scale/Shear/Reshape/Width/Warp family) | NOT_IMPLEMENTED — each will only ship once its actual algorithm exists; several (Twirl/Pucker/Bloat/Scallop/Crystallize/Wrinkle/Puppet Warp) may never ship if no real algorithm is implemented | ➖ | Vector | — | — | — | — | — | — | 6/8 |
| Symbols | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 8 |
| Graphs (column/bar/line/area/scatter/pie/radar) | NOT_IMPLEMENTED | ➖ | Vector | — | — | — | — | — | — | 8 |
| Slice / export regions | NOT_IMPLEMENTED | ✅ | ✅ | — | — | — | — | — | — | 10 |
| Curves / Levels / HSL / adjustment layers | NOT_IMPLEMENTED | Raster | ➖ | — | — | GPU shader planned | — | — | — | 4/5 |
| Layer masks | NOT_IMPLEMENTED | Raster | ➖ | — | — | — | — | — | — | 5 |
| Smart Object equivalent | NOT_IMPLEMENTED | ✅ | ✅ | — | — | — | — | — | — | 5 |
| PSD/AI import | NOT_IMPLEMENTED — no fake parser; will either get a genuine parser or stay explicitly unsupported | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | unscheduled |
| PDF export | NOT_IMPLEMENTED — no generation pipeline exists yet in this new engine | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | 10 |
| Cloud storage (new engine) | NOT_IMPLEMENTED — no backend wired to `/studio`; IndexedDB only | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | unscheduled |
| AI object detection / generative fill / content-aware fill (new engine) | NOT_IMPLEMENTED — no model installed; will not be simulated | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | ➖ | unscheduled |

## Notes

- "Phase" numbers refer to §52 of the source spec (Editor shell → Core
  raster → Retouch → Adjustments → Masks → Vector → Typography → Advanced
  vector → Performance → Export/import).
- A tool moves from `NOT_IMPLEMENTED` to `IMPLEMENTED` in this file only
  after it has a real, tested Playwright pass proving the behavior — see
  the phase report accompanying each round of work.
- The pre-existing `/editor` route (Fabric.js) already has real, shipped
  equivalents for several of these (pen/shapes/layers/masks/adjustments/
  crop/content-aware fill) — this matrix tracks the **new** `/studio`
  engine only, not the old one.
