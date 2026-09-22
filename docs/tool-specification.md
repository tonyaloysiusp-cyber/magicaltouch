# Tool Specification

## The `Tool` interface

Every tool registered with `ToolRegistry` implements this shape
(`src/editor/tools/Tool.ts`), matching the schema this rewrite was
specified with:

```ts
interface Tool {
  id: string;
  name: string;
  category: string;
  shortcut: string | null;
  icon: string;              // key into the icon set, original SVGs only
  cursor: string;             // CSS cursor value or custom cursor id
  description: string;        // short, honest — never claims unbuilt behavior
  supportedModes: Array<'raster' | 'vector'>;
  defaultOptions: Record<string, unknown>;
  optionsSchema: ToolOptionField[];

  activate(ctx: ToolContext): void;
  deactivate(ctx: ToolContext): void;
  pointerDown(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerMove(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerUp(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerCancel(ctx: ToolContext): void;
  keyDown(ctx: ToolContext, e: KeyboardEvent): void;
  keyUp(ctx: ToolContext, e: KeyboardEvent): void;
  renderOverlay(ctx: ToolContext, overlayCtx: CanvasRenderingContext2D): void;
  commit(ctx: ToolContext): void;
  cancel(ctx: ToolContext): void;
  serializeState(): unknown;
  restoreState(state: unknown): void;
}
```

`ToolContext` is the object `EventManager` passes to every hook: the active
`Editor`, the current `Document`, `CoordinateSystem` (for screen->document
conversion), and the tool's own live options.

## Options bar generation

`optionsSchema` is a list of `{ key, label, type, min?, max?, step?,
options? }` describing each configurable property. `OptionsBar.tsx` renders
form controls purely from this schema — it never hard-codes a tool's
options, per §31 of the source spec ("Do not hard-code unrelated
options").

## Registering a tool

```ts
registerTool({
  id: 'nav.hand',
  name: 'Hand',
  category: 'navigation',
  shortcut: 'H',
  icon: 'hand',
  cursor: 'grab',
  description: 'Pans the canvas view. Does not modify the document.',
  supportedModes: ['raster', 'vector'],
  defaultOptions: {},
  optionsSchema: [],
  activate, deactivate, pointerDown, pointerMove, pointerUp,
  pointerCancel, keyDown, keyUp, renderOverlay, commit, cancel,
  serializeState, restoreState,
});
```

`Toolbar.tsx` reads `ToolRegistry.list()` grouped by `category` — adding a
new tool later never requires editing `Toolbar.tsx` itself.

## Phase 1 tools (the only two currently registered)

### Hand (`nav.hand`)
- Real viewport pan: `pointerDown` records the start point, `pointerMove`
  updates `CoordinateSystem`'s pan offset by the screen-space delta,
  `pointerUp` commits nothing to history (panning is view-only, not a
  document mutation — matches Photoshop/Illustrator's own convention of
  not putting pan in the undo stack).
- Modifier: holding Space with any other tool active temporarily switches
  to Hand and restores the previous tool on release (`EventManager`).

### Zoom (`nav.zoom`)
- Click zooms in centered on the click point; Alt/Option-click zooms out.
- Ctrl/Cmd + `+` / `-` / `0` / `1` are global shortcuts (not gated on the
  Zoom tool being active) handled by `EventManager`, matching §27.
- Real, immediate re-render at the new scale — not a CSS transform.

## Every other tool named in the source spec

Every remaining tool listed in the spec (Move, Marquee, Lasso, Quick
Selection, Magic Wand, Object Selection, Crop, Eyedropper, healing tools,
Brush, Pencil, Color Replacement, Mixer Brush, Clone Stamp, Eraser family,
Gradient, Paint Bucket, Dodge/Burn/Sponge, Blur/Sharpen/Smudge, Pen family,
Type, Shapes, and the full vector tool set) is **not yet registered** in
`ToolRegistry`. They do not appear in the Phase 1 toolbar at all — per the
source spec's own rule ("Keep the tool hidden or disabled" when not
genuinely implemented), rather than appearing as a disabled or fake
button. See `tool-capability-matrix.md` for the per-tool status and which
development phase (§52) each is scheduled for.
