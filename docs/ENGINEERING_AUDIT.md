# Magical Touch Design — Engineering Audit

Written from direct inspection of this repository (not assumptions). Every
claim below was verified against actual source files, migrations, and
`grep` results at the time of writing. Where something the brief asked
about simply doesn't exist yet, this says so plainly rather than
describing an aspirational version of it.

## 1. Storage Architecture (highest-impact finding)

**There is no object storage for design content.** The only Supabase
Storage bucket in the whole app is `avatars` (`lib/profile.ts`,
`supabase/migrations/0001_profiles_and_avatars.sql`). Every other
"file" in the product — every uploaded photo, every design's visual
content, every thumbnail — is a **base64 data URL embedded directly
inside a JSON column**:

- `designs.canvas_json` (`jsonb`) — the live Fabric.js scene graph.
  Every `fabric.Image` object's `src` field is a full base64 data URL of
  that image at whatever resolution it was uploaded/edited at. There is
  no `assetId` indirection anywhere — the pixels live inline, once per
  image object, every time the design is saved.
- `designs.thumbnail` (`text`, added in `0004_designs_thumbnail.sql`) —
  a base64 JPEG data URL, regenerated and rewritten on every save.
- `design_versions.canvas_json` + `design_versions.thumbnail`
  (`0002_design_versions.sql`) — **a full copy of the above, per save**,
  capped at the 50 most recent versions per design by
  `trim_design_versions_trigger`. A design with one 3 MB embedded photo
  that's saved 50 times over its life can retain on the order of
  **150 MB in `design_versions` alone**, on top of the live row.

Consequences, mapped to the storage brief's own language:
- "Never store multiple copies of the same original asset" — currently
  violated structurally: the *save* mechanism itself is a copy
  mechanism (version history = N full copies of every embedded image).
- "Database should store metadata, not large files" — currently
  inverted: the database *is* the file store.
- "Content-based deduplication" / "template asset reuse" — impossible
  today, because nothing has a stable content identity independent of
  the JSON blob it happens to be embedded in.
- Export cache / template preview caching — moot for a different
  reason: **no export or template preview is ever persisted
  server-side today** (see §3). Exports are pure client-side
  `canvas.toDataURL()` → browser download; nothing is written back to
  Supabase. So this specific worry from the brief doesn't apply yet,
  but it also means there's no reuse of a previous render either.

This is the single highest-leverage fix available: introducing a real
asset table + Storage bucket (images referenced by `assetId`/hash
instead of inlined) would cut `designs` and `design_versions` storage
by roughly an order of magnitude for any design with real photos in it,
with no loss of editing or export quality (the source pixels are
unchanged — only *where* they live changes).

## 2. Fonts

No font files are stored or bundled by this app at all.
`app/api/font-file/route.ts` proxies live requests through to Google
Fonts' own `fonts.googleapis.com` CSS API and re-serves the resulting
`@font-face` rules same-origin (to survive ad/tracker blockers, per the
comment in `app/editor/page.tsx`'s font-loading code). There is no font
registry, no license metadata table, and no redistribution risk from
this app's side, because it never redistributes a font file — it's
always fetched live from Google under Google's own license terms for
each family. This is a materially different (and lower-risk) situation
than the brief assumes ("do not simply install random fonts" / "font
license registry") — there's nothing installed to audit. Worth
documenting as-is rather than building a registry for a problem that
doesn't currently exist.

## 3. Templates — this is the biggest gap versus the brief's expectations

`public.templates` (`supabase/migrations/0003_templates_and_admin.sql`)
is **not an editable-template system**. Its columns are:

```
id, name, category, width, height, color1, color2, sort_order,
created_by, created_at, updated_at
```

There is no `canvas_json`, no `thumbnail`, no `assets`, no `fonts`, no
`rightsStatus`. The 13 seed rows are literally just a name, a category,
a size, and two hex colors — `/templates` and `/admin/templates` render
these as **procedurally-generated color-swatch cards**, not real
designs. Clicking a template does not load an editable Fabric document
with real text/image/shape objects, because none exists in the
database to load.

This means the "original template library" brief (10,000+ templates,
editable objects, licensing metadata, asset reuse across templates) is
**greenfield work**, not a migration of existing content. The good
news is the schema and admin-panel *pattern* already exists
(RLS-gated, admin-only writes) and can be extended rather than
replaced; the templates themselves — the actual design content — do
not exist yet in any form and would need to be created (by a
human/design process, or an AI-assisted content pipeline) and then
given a real schema: `canvas_json` (editable Fabric objects, matching
the same schema `designs.canvas_json` already uses so the *same*
editor can open both), `assetIds`, `fontIds` referencing whatever asset
registry gets built per §1, and rights/license metadata per the brief's
§15–20.

## 4. Editor Architecture

- **Framework**: Next.js 14.2.5 App Router, TypeScript, Tailwind,
  Supabase (Postgres + Auth + Storage), Fabric.js v5.5.2.
- **Two separate editor engines exist side by side**:
  - `app/editor/page.tsx` (**4,135 lines**, single client component) —
    the real, production editor. Fabric.js-based. Contains Main
    Design + an embedded Photo Editor workspace
    (`components/photoEditor/PhotoEditorWorkspace.tsx`), plus a newer
    standalone Photo Studio page (`app/photo-studio/page.tsx`) sharing
    that same component. This file mixes UI, tool logic, history,
    save/load, and export in one component — there is no separate
    Document/Geometry/Renderer layer; Fabric.js's own canvas *is* the
    document model, and most "engines" the architecture brief asks for
    (SelectionManager, TransformEngine, UnitSystem, SnapEngine, etc.)
    exist as informal groups of functions/hooks inside or alongside
    this file rather than as named, isolated modules. This is real,
    working technical debt, not a fabricated problem — Fabric.js
    itself provides selection/transform/undo primitives that this app
    builds on directly rather than wrapping in an editor-owned engine
    layer.
  - `src/editor/` (`/studio` route) — a from-scratch rewrite documented
    in `docs/editor-architecture.md`, currently Phase 1 only
    (pan/zoom/layers/undo), explicitly marked "Preview" in the nav and
    saved to `localStorage` only. This is the closest existing thing to
    the brief's target document/geometry/renderer separation, but it is
    far from feature-complete versus the production editor.
- **What's already real** (verified against the task history and code,
  not assumed): artboards vs. selection tool separation is already
  correctly implemented (this was specifically audited and confirmed
  earlier in this engagement); a real per-object custom-property
  serialization system for save/undo; real guides/grid/snap; a real
  unit system (`lib/editor/units.ts`, `DocUnit` = px/mm/cm/in/pt) used
  consistently on `/create` and in the Photo Editor's Resize dialog;
  real Pen/path tool with masking in the Photo Editor; real
  layers/masks/curves/dodge-burn/clone-stamp/gradient tools; an honest
  `lib/editor/tool-registry.ts` that marks every tool
  live/beta/planned and surfaces a Roadmap modal — this app already has
  the "don't fake it" discipline the brief asks for.
- **What does not exist**: a Boolean/Pathfinder engine, Shape Builder
  beyond a stub, a true Bézier-anchor Direct Selection editing model
  independent of Fabric's own path objects, Image Trace (see §5), CMYK
  color management (the whole pipeline is RGB, and the codebase is
  explicit about this — `lib/editor/printSetup.ts`'s comment on the
  color bar explicitly says it's "RGB screen approximations," not real
  ink values), true vector PDF export of arbitrary geometry (current
  PDF/SVG export paths exist but their fidelity for complex compound
  paths hasn't been audited here), and any of the named
  engine/controller modules (`SelectionManager`, `TransformEngine`,
  `PathEngine`, `SnapEngine` as isolated classes) the architecture
  brief specifies — the equivalent *behavior* mostly exists, just not
  factored into those named modules.

## 5. Image Trace

**Does not exist anywhere in this codebase.** Verified via exhaustive
search (`imagetrace`, `image.trace`, `trace.*vector` across `app/`,
`components/`, `lib/`) — zero matches. The 71-section Image Trace +
Expand specification describes a net-new subsystem, not an
audit-and-fix target. Building even the "Phase 1 — Core" slice from
that spec (B/W threshold trace, connected components, contour
extraction, path simplification, basic Expand into native Fabric
objects) is itself a substantial, multi-session engineering effort done
properly (not faked as a plain image filter).

## 6. Export

Exports are 100% client-side: `canvas.toDataURL()` / a constructed PDF
buffer, triggered as a direct browser download. Nothing is uploaded to
Supabase. There is no export cache (nothing to cache against — every
export request already only touches the browser), and no "storing
every export" problem exists today, contrary to what the storage brief
assumes as a starting condition.

## 7. Security / Auth

Supabase Auth (email+password), RLs on `profiles`/`designs`/
`design_versions`/`templates` scoped to `auth.uid()`, admin-only writes
to `templates` gated by a `profiles.is_admin` flag. This wasn't
re-audited line-by-line in this pass beyond confirming the RLS policies
above exist and read plausible — a full auth/API security audit (brief
§53–56) is its own scoped piece of work, not done here.

## 8. Summary — scope reality check

Everything asked for across the four briefs is legitimate and mostly
non-overlapping in *what* it touches, but wildly different in size:

| Program | Real starting point | Rough shape of the work |
|---|---|---|
| **Storage optimization** | Base64-in-JSONB is real and fixable | Introduce an `assets` table + Storage bucket, migrate image references, add version/thumbnail lifecycle limits. Concrete, scoped, high ROI. |
| **Original template library** | Templates table has no design content at all today | Greenfield: schema extension (`canvas_json`/assets/fonts/rights columns) + actually producing original design content at scale. The engineering part is small; the content part is not something code alone solves. |
| **Full editor architecture rebuild** | Editor works and has real (not fake) tools already, but is a monolith without named engine modules | A large, incremental refactor program (the brief's own 10-phase migration plan is realistic in shape, not in one sitting). |
| **Image Trace engine** | Doesn't exist | A substantial net-new subsystem; even a competent "Phase 1" slice is multi-session work. |

None of these can be honestly completed in one pass without faking
depth somewhere. Given this engagement's established pattern, the next
step is to pick where to start rather than attempt all four broadly and
shallowly.

## 9. Photo Studio — professional tool status (2026-09-28 workspace/editor brief)

The "Major Workspace & Editor Changes" brief asks for a large
Photoshop-class tool list and explicitly forbids faking tool buttons.
Before adding or renaming anything, here is what `components/photoEditor/
PhotoEditorWorkspace.tsx` (2878 lines, shared by `/photo-studio` and
Main Design's in-context Photo Editor) actually implements today, real
mouse/keyboard behavior and all — this is dramatically more than a
first read of the brief would assume, so the honest next step is mostly
*connecting and being clear about* what's real, not building 40 new
tools from zero.

**Live** (real tool definition + activation + pointer/keyboard behavior +
undo/redo, per `PhotoTool` in `PhotoEditorWorkspace.tsx:124-144`):

| Brief's tool | Status | Evidence |
|---|---|---|
| Move | Live | `'select'` tool, drag-to-move on the active layer |
| Marquee Rectangle / Ellipse | Live | `'marquee-rect'`/`'marquee-ellipse'`, `lib/editor/pixelSelection.ts` |
| Lasso | Live | `'lasso'`, freeform polygon selection, `pixelSelection.ts` |
| Magic Wand | Live | `'magic-wand'`, flood-fill color-similarity selection |
| Crop | Live | `'crop'` tool with its own panel (`PhotoEditorWorkspace.tsx:2306`) |
| Pen (real Bézier) | Live (corrected 2026-10-01) | `'pen'`/`'direct'`, real anchors/handles/add-delete-convert/open-close path (shipped as task #18/#40-42). **Drawing was always real; anchor EDITING was not** — Direct Selection could never actually select a finished path at all (confirmed via live repro, both Photo Studio and Main Design), so the single most common Pen workflow (draw, then refine) was silently non-functional. Root-caused and fixed (`evented`/`hasControls` conflicts — see `docs/CHANGELOG_ENGINEERING.md`'s 2026-10-01 entry); re-verified live with real anchor-drag/delete repros, not just re-reading the code. |
| Brush / Eraser | Live | `'brush'`/`'eraser'`, real paintable mask via `lib/editor/photoBrush.ts` |
| Dodge / Burn | Live | `'dodge'`/`'burn'`, `dodgeBurnInMask()` |
| Clone Stamp | Live | `'clone'`, offset-sampling clone with a settable source point |
| Gradient | Live | `'gradient'`, draggable linear gradient fill |
| Eyedropper / Color Picker | Live | `'eyedropper'` |
| Levels | Live | `'levels'` panel |
| Curves | Live | `lib/editor/curves.ts` + `components/photoEditor/CurveEditor.tsx`, real per-channel curve + histogram |
| Hue/Saturation | Live | `'hue-sat'` panel |
| Exposure, Vibrance (+ full basic set) | Live | `lib/editor/photoFilters.ts`'s `DEFAULT_ADJUSTMENTS` |
| Layer Mask (paint reveal/hide) | Live | `'mask-reveal'`/`'mask-hide'`, unified paintable + path-based mask (task #26) |
| Healing / object removal | Live, different UX than a brush | "Remove Object (Content-Aware Fill)" menu action on a pixel selection (`lib/editor/inpaint.ts`'s `contentAwareFill` — real harmonic-diffusion reconstruction from real neighboring pixels, not a blur or solid fill; its own header honestly states it doesn't reproduce fine texture/pattern in a large hole) |
| Layers (opacity, rename, reorder, visibility, lock) | Live | Shares `components/editor/LayersPanel.tsx` with Main Design |
| Undo/redo + keyboard shortcuts | Live | `canUndo`/`canRedo`, full shortcut table (task #34) |
| Blur | Live (2026-09-28) | `'blur'` brush, `blurInMask()` — real Gaussian blur (canvas 2D `filter`) blended into the masked region by mask alpha |
| Sharpen | Live (2026-09-28) | `'sharpen'` brush, `sharpenInMask()` — real unsharp-mask (`original + amount*(original-blurred)`) |
| Sponge | Live (2026-09-28) | `'sponge'` brush, `spongeInMask()` — real HSL saturation scaling, localized to the brush stroke, with a Saturate/Desaturate mode toggle |
| Paint Bucket | Live (2026-09-28) | `'paint-bucket'` tool, single-click flood-fill reusing `magicWandMask()` (the same algorithm Background Removal already used) + `paintColorInMask()` |
| Skew | Live (2026-09-28) | `'skew'` tool, real Fabric `skewX`/`skewY` object properties set via a confirm-on-blur/Enter panel with a Reset control |
| Layer blend modes | Live (2026-09-28) | `components/editor/LayersPanel.tsx`'s new opt-in `onBlendModeChange` dropdown sets the real Fabric `globalCompositeOperation` (Multiply, Screen, Overlay, Darken, Lighten, Color Dodge/Burn, Hard/Soft Light, Difference, Exclusion, Hue, Saturation, Color, Luminosity) — verified to actually composite correctly at both live render and flatten-on-apply (`handleApply`'s multi-layer path calls `canvas.toDataURL()`, which respects it natively) |
| Perspective (corner-pin distort) | Live (2026-09-29) | `'perspective'` tool, `lib/editor/perspective.ts` — a real 4-point homography (DLT + Gaussian elimination) with inverse-mapped bilinear sampling, baked into a new raster on Apply (Fabric has no native projective transform for image objects, so this is a genuine pixel warp, not a CSS trick or a skew relabeled). No live per-pixel warp preview while dragging handles — see the file's own header for why; the live outline shows the target shape, the real warped pixels appear on Apply, same "position then commit" flow Crop/Resize already use |
| Healing Brush (drag-brush spot healing) | Live (2026-09-29) | `'heal'` tool (Shift+J) — same real diffusion-based `contentAwareFill()` reconstruction "Remove Object" already used, but driven by a painted brush stroke instead of a selection, and with no source point to set (unlike Clone Stamp) since it reconstructs from the real surrounding pixels automatically |
| Color Range mask | Live (2026-09-29) | `'mask-color-range'` tool — click a color; every pixel within tolerance anywhere in the image (a genuine global, non-contiguous match via `magicWandMask(..., false)`, not a flood fill) becomes the new layer mask, with an Invert option. Distinct from the existing paintable reveal/hide mask |
| Gradient mask | Live (2026-09-29; Radial style added 2026-10-02) | `'mask-gradient'` tool — drag a line (Linear) or drag out from a center point (Radial, new); `linearGradientMask()`/`radialGradientMask()` write a real black-to-white ramp into the layer mask alpha, with an Invert option. Style toggle lives in the one tool's panel, matching Photoshop's own Gradient tool |
| Luminosity mask | Live (2026-10-02) | A "Generate Luminosity Mask" button in the always-visible Mask panel (not a selectable tool — there's no gesture to perform) — `luminosityMask()` writes real Rec. 709 relative luma per pixel directly as the mask alpha, with an Invert option |
| Patch Tool | Live (2026-10-01) | `'patch'` tool — drag a freehand loop around a blemish, then drag it onto a clean area; releases to a feathered `cloneStampPaint` composite (`featherMask` applied to the drawn `polygonMask` first) |
| Smudge | Live (2026-10-01) | `'smudge'` tool — `smudgeStepInPlace` pulls color from a step earlier along the stroke into the current dab, applied incrementally against a persistent working canvas (not deferred to mouse-up like every other brush here, since each dab's source is relative to the stroke's own motion) |
| Red Eye | Live (2026-10-01) | `'red-eye'` tool — a single click; `removeRedEye` scans the clicked radius for genuinely red-dominant pixels (red clearly over both green and blue, not a generic red threshold) and desaturates/darkens exactly those, leaving a near-white specular highlight inside the pupil untouched |
| Polygon Lasso | Live (2026-10-02) | `'polygon-lasso'` tool (Shift+L) — a real multi-click (not drag) gesture: each click adds a confirmed vertex, a rubber-band line previews the pending edge, clicking back within `ANCHOR_HIT_RADIUS` of the first vertex (or Enter) closes the shape into a real `polygonMask` fed through the same selection pipeline as Lasso/Marquee; Escape discards the draft |
| Pattern Stamp | Live (2026-10-02) | `'pattern-stamp'` tool (N) — paints a real tiled pattern (dots/stripes/checkerboard/grid, generated procedurally, not Photoshop/Photopea assets) via `patternStampInMask()`, reusing the same accumulate-mask-then-bake brush pipeline every other static-source brush here uses; the tile is anchored to the image's own origin so repeated strokes stay seamlessly aligned |
| Mixer Brush | Live (2026-10-02) | `'mixer-brush'` tool (Shift+B) — blends the brush color into existing pixels at a real "Wetness" strength via `mixerBrushStepInPlace()`, mutating a persistent working canvas per dab (Smudge's own incremental architecture) so repeated overlapping passes genuinely build up more paint, unlike a deferred single-bake brush; "Load" (paint reservoir fading over a stroke) not yet modeled |

**Not yet real — planned, not faked** (no tool id, no panel, no code path
exists for these; do not show them as clickable until they are):
Magnetic Lasso, Object Selection, Quick Selection, Select
Subject, Select and Mask (these four all imply ML-based segmentation —
none exists in this codebase); Perspective Crop, Slice, Distort, Warp
(today's transforms are Skew and Perspective — see above — plus what
Fabric's own selection handles give: move/scale/rotate; a unified "Free
Transform" UI wrapping all of these in one mode is still a separate,
smaller follow-up); Freeform Pen as a separate tool from the existing real Pen; Shape
tools inside Photo Studio specifically (Main Design has real shape tools,
Photo Studio does not yet); Color Balance, Selective Color, Gradient Map,
Channel Mixer, Black & White as its own adjustment (a `blackAndWhite`
adjustment toggle already exists in the Adjustments panel — this item is
about a dedicated Black & White *mixer* with per-channel response, which
doesn't), a full HSL panel (Hue/Saturation exists, the fuller
Lightroom-style HSL-per-color-band panel does not); Texture, Clarity,
Dehaze, Vignette, Grain (Linear + Radial Gradient Mask, Color Range
Mask, and Luminosity Mask are now live per above); layer grouping/
clipping (blend mode is now live per above; grouping/clipping is not).

**Workspace structure — menu bar (2026-09-29):** `/photo-studio` now has
a real File/Edit/Image/Layer/Select/Filter/View/Window/Help menu bar
(`app/photo-studio/page.tsx`, reusing `components/editor/MenuBar.tsx` —
the same component and "real action or a disabled Planned tag, never a
fake button" contract Main Design's own menu bar already uses). Every
item wraps a real, pre-existing function via an expanded, opt-in
`PhotoEditorHandle` imperative ref (`zoomIn`/`zoomOut`/`fitToView`/
`openResizeDialog`/`activateCropTool`/`selectAll`/`deselect`/
`invertSelection`/`duplicateActiveLayer`/`deleteActiveLayer`/
`addLayerFromFile`/`applyFilterBlur`/`applyFilterSharpen`) plus two new
opt-in `showLayersPanel`/`showAdjustmentsPanel` props (both default
`true`) for the Window menu's real panel-visibility toggles, and two new
whole-layer Filter commands (`applyFilterBlur`/`applyFilterSharpen`)
that reuse the exact same `blurInMask`/`sharpenInMask` math the
Blur/Sharpen brush tools already use, just run over a full-canvas mask.
`PhotoEditorWorkspace.tsx` is shared with Main Design's own embedded
Photo Editing tab (`app/editor/page.tsx`), so every addition here is
additive-and-optional specifically so that usage is completely
unaffected — verified directly in `test_photo_studio_menubar.js`, which
confirms Main Design's own menu bar still shows only its own items
(File/Edit/Object/Type/Select/View/Window/Help) with no Photo-Studio-only
menu leaking in.

**Workspace structure — dark theme + compact toolbar + options bar
(2026-09-30):** a live-tested audit (Playwright against the running app,
not code-reading) found the tool functionality above was mostly real,
but the surrounding chrome still read as "a basic demo": light theme by
default, a 176px icon+label toolbar, no options bar, no checkerboard
transparency backdrop, no cursor-position readout, `h-screen` instead of
`100dvh`, 14px panel text instead of 11-12px. All now real, gated behind
a new opt-in `pro` prop (default `false` — Main Design's embedded usage
never passes it, confirmed unaffected by the same menu-bar test):
dark VS Code-range theme (`components/photoEditor/photoStudioPro.css`,
scoped under a `.ps-pro` ancestor class — plain global CSS, not
styled-jsx, which turned out not to work in this app's Next.js App
Router setup without a `StyleRegistry`), a real 48px icon-only toolbar,
a real options bar under the menu bar (brush size/hardness/opacity/
tolerance, live-bound to the same state the right panel already used), a
genuine checkerboard transparency backdrop (required making Fabric's own
canvas `backgroundColor` transparent in pro mode, since it opaquely
painted over any CSS background), a live cursor-position readout in the
status bar, and real foreground/background color swatches (background
color is a real, settable, swappable state — nothing consumes it yet,
noted honestly rather than silently). Verified with real screenshots and
`getBoundingClientRect()` measurements at desktop and simulated iPad
portrait/landscape (no page-level scroll or chrome overflow in either
orientation); a real pre-existing layout bug was found and fixed along
the way (an ancestor `flex-1` div that wasn't itself `display:flex` was
silently clipping toolbar overflow instead of letting it scroll). **Not
yet real**: pixel rulers, toolbar flyout sub-tools (the icon rail just
scrolls today), a tabbed right-panel dock (still one scrolling column;
the Window menu's show/hide toggles are not the same as tabs), and
pinch-zoom/two-finger pan on iPad (zero touch/gesture handlers exist in
this component — confirmed by grep, only mouse + wheel events).

**What this means for the brief's priorities:** items 1-2 (remove Studio
Preview, merge Photo Project into Photo Studio), 9-11 (unit system),
12-16 (confirm-on-blur resize, ESC-cancel, inline validation, aspect
lock) and part of 20-21 (an `editor_type` column + Photo Studio's own
reopen path) are implemented in this pass — see the changelog entry
dated 2026-09-28. The tool list above is the honest state of item 4's
"real professional workspace" requirement: a genuinely substantial
subset is real today, and the remaining items are each their own
scoped follow-up (e.g. "Select and Mask" alone is an ML-integration
project, not an afternoon's work) rather than something to stub out with
non-functional buttons.
