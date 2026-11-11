# Vector engine roadmap

The editor uses fabric.js 5.1. Paths are stored as SVG path commands, so vector data is never flattened during editing.

## Exists today
Pen tool, freehand drawing (perfect-freehand), shapes with live path generation (`lib/editor/shapePaths.ts`), boolean ops library installed (`polygon-clipping`), layers, groups, clip frames, undo/redo, snapping, rulers, guides, SVG/PDF export.

## Phase G — next
| Feature | Approach | Effort |
|---|---|---|
| Direct selection + anchor editing | Custom fabric control set per path command; drag anchors and Bézier handles; add/remove/convert anchor | High |
| Pathfinder (unite, subtract, intersect, exclude) | Flatten curves to polylines → `polygon-clipping` → refit with curves (or keep polygonal) | Medium |
| Join / split / open / close paths | Path command manipulation | Medium |
| Offset path, simplify | Clipper-style offset (add `clipper-lib`, MIT) / Ramer–Douglas–Peucker | Medium |
| Compound paths, clipping & opacity masks | fabric `clipPath`, even-odd fill | Medium |
| Live corners | Corner radius stored per shape, regenerated path | Low |
| Variable-width strokes | perfect-freehand outline with pressure profile | Medium |
| Gradients (linear/radial), freeform gradient | fabric gradients; freeform via mesh of radial stops (approximation) | Medium |
| Symbols | Shared definition + instances (store in document `symbols` map) | Medium |

Each feature ships only when save → close → reopen → edit → undo/redo → export is tested in the e2e suite.
