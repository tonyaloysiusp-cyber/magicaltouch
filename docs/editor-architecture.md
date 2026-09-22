# Editor Architecture (new engine, `src/editor/`)

## Status: Phase 1 in progress

This document describes a **new, separate editing engine** being built from
scratch per an explicit rewrite request, living at `src/editor/` and mounted
at the `/studio` route. It does **not** replace the existing production
editor at `/editor` (`app/editor/page.tsx`, Fabric.js-based Main Design +
`components/photoEditor/PhotoEditorWorkspace.tsx`), which remains untouched
and in active use. The two are independent systems in the same repository
until/unless the new engine reaches parity and a deliberate migration
decision is made.

## Why a new tree instead of extending the Fabric.js editor

The rewrite was requested with a specific module layout (`core/`, `raster/`,
`vector/`, `tools/`, `panels/`, `ui/`) and its own command-based history,
tool-registry architecture, and rendering pipeline, distinct from how the
existing editor is built (a single large page component driving a shared
Fabric.js canvas). Building it as a new tree avoids destabilizing the
existing, shipped editor while the new one is developed in stages.

## High-level layers

```
UI (React, src/editor/ui + panels)
   │  reads snapshots from / calls methods on
   ▼
Editor (src/editor/core/Editor.ts)        <- single façade, one per mounted document
   │
   ├── EditorState        observable: active tool id, viewport, selection ids
   ├── Document            plain serializable data (layers, size, metadata)
   ├── CommandManager       undo/redo stack of Command objects
   ├── History              read-only view of CommandManager for the History panel
   ├── LayerManager         layer CRUD, each mutation wrapped in a Command
   ├── SelectionManager      which layer(s)/objects are selected
   ├── TransformManager      per-layer position (translate) — real, minimal in Phase 1
   ├── CoordinateSystem      screen <-> document point conversion (zoom/pan)
   └── EventManager          binds pointer/keyboard DOM events to the active Tool
   │
   ▼
Rendering (src/editor/raster/RasterCanvas.ts)
   composites visible layers (each an offscreen <canvas>) onto the
   on-screen <canvas> in z-order, honoring opacity, at the current
   viewport transform. Canvas2D only in Phase 1 — see rendering-architecture.md.
```

## React integration pattern

`Editor` is a plain TypeScript class with no React dependency. It exposes:

- `getSnapshot()` — returns an immutable-ish plain object describing
  everything the UI needs to render (document, viewport, selection, tool,
  canUndo/canRedo).
- `subscribe(listener)` — returns an unsubscribe function; called after any
  mutation.

`src/editor/ui/EditorShell.tsx` wraps this with React's
`useSyncExternalStore` so panels re-render only when the snapshot actually
changes, without duplicating state into React itself. This keeps the core
engine framework-agnostic (a stated requirement — "modern component
architecture", not "put everything in React state").

## Command / undo-redo model

Every mutation to a `Document` goes through a `Command`
(`execute()` / `undo()` / `redo()` / `label`). `CommandManager` owns two
stacks (`undone`, and the executed stack) and notifies subscribers on any
change. `LayerManager`'s methods (`addLayer`, `deleteLayer`, `renameLayer`,
`reorderLayer`, `setOpacity`, `setVisible`, `setLocked`, `translateLayer`)
each construct and execute a Command rather than mutating the document
directly — this is what makes every one of them undoable/redoable and
gives the History panel a real, meaningful label per action, per §33 and
§53 of the spec this implements.

## Tool system

`src/editor/tools/Tool.ts` defines the `Tool` interface from the spec
(`activate/deactivate/pointerDown/pointerMove/pointerUp/pointerCancel/
keyDown/keyUp/renderOverlay/commit/cancel/serializeState/restoreState`).
`ToolRegistry` is a simple map tools register themselves into; the Toolbar
UI is generated from the registry rather than hard-coded, per §48.

Phase 1 ships exactly two real tools — Hand (pan) and Zoom — because Phase
1's scope (per §52) is the editor shell, not the raster/vector tool set.
See `tool-capability-matrix.md` for the honest status of every tool named
in the spec.

## Persistence

`src/editor/core/ProjectStore.ts` wraps the browser's native `indexedDB`
API (no external dependency) — see `file-format.md` for the schema. No
cloud storage is implemented for this new engine yet; the existing
Supabase-backed save/load in the old `/editor` is unrelated and untouched.

## Testing approach

The existing project has no unit-test runner configured (no Jest/Vitest);
every prior round of this engagement has verified real behavior with
Playwright against a genuine production build (`next build && next start`).
Phase 1's tests follow that same, already-proven convention rather than
introducing a second, parallel test toolchain — see
`/home/user/magicaltouch` scratch test files referenced from the phase
report for what's actually been run.

## Non-goals for Phase 1

No brush engine, no vector paths, no selections-on-canvas, no filters, no
GPU/Worker rendering, no smart objects. These are explicitly later phases
(§52) and are marked `NOT_IMPLEMENTED` in `tool-capability-matrix.md`
rather than stubbed.
