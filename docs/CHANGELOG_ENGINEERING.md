# Engineering Changelog

Tracks real, verified engineering work against the findings in
`docs/ENGINEERING_AUDIT.md`. Each entry states the problem, what was
actually done, what was tested, and what's deliberately left for later.

---

## 2026-09-29 (2) — PDF export investigation + Photo Studio's first PDF export

**Investigated:** a report that "PDF exporting across the application" is
not working correctly. Built two comprehensive Playwright suites against
the running app (not just code review) covering the spec's own test
matrix: create an A4 @ 300 DPI document, add a real image and real text,
export, then parse the raw PDF bytes with pdfjs-dist to check page size/
text/images rather than trusting appearances
(`test_pdf_export_scenario.js`, 12/12), plus a harder path — transparency
(real opacity), a gradient fill (the rasterization-fallback code path),
and the full Export dialog with bleed + crop marks
(`test_pdf_bleed_marks_transparency.js`, 5/5). Also re-confirmed
changing the display unit (px→in) does not alter the exported PDF's
physical size, per the spec's own critical requirement. Could not
reproduce any Main Design PDF export failure under any scenario
constructed, including the harder ones. Root cause of the report: **Photo
Studio had no PDF export at all** (PNG only) — if that's what was tried,
"PDF doesn't work" is accurate without any bug in Main Design's pipeline.

**Shipped:** Photo Studio's first real PDF export. Added
`exportRasterToPDF()` to the existing shared `lib/editor/pdfExport.ts`
(not a new duplicate module) — Photo Studio's document model is a single
flattened raster image rather than Fabric objects on an artboard, so this
is a simpler entry point than `exportCanvasToPDF`/`exportArtboardsToPDF`:
it computes the PDF's physical page size from the image's *real* pixel
dimensions and *real* DPI (`widthPx / dpi * 72` for the page width in
points), correctly distinct from `pdfExport.ts`'s own `toPt()` (which
intentionally assumes Main Design's fixed 96px/inch document-geometry
convention — see that file's header comment for why those are two
different, both-correct conversions). Wired into `/photo-studio` via a
small PNG/PDF format selector next to the existing Export button.
Verified with a new suite (`test_photo_studio_pdf_export.js`, 7/7): a
real embedded image XObject, correct A4 physical page size derived from
the document's actual 2480×3508px @ 300 DPI, and no regression to the
existing PNG export. Full regression re-run: 19/19 workspace/editor,
12/12 Photo Studio pro tools, 11/11 Perspective — all still passing.

**Still open** on the "unify PDF/export" front (spec sections 3-18, 35):
the global `UnitSystem`/document-level unit preference (today: 4
disconnected local unit states), consolidating `pdfExport.ts`'s and
`preflight.ts`'s independently-redefined `72/96` constants into
`lib/editor/units.ts`, and Photo Studio's own two disconnected DPI
sources (`img.__dpi` vs. artboard `__print.dpi`).

## 2026-09-29 — Photo Studio: real Perspective transform + resize-bug investigation

**Investigated:** a report that "canvas resizes while typing width/height"
in Photo Studio. Wrote a targeted Playwright repro
(`test_photo_studio_resize_bug.js`) against both in-editor resize surfaces
(the Resize Image dialog and the Crop tool's "Set Size" inputs) plus
re-ran the existing `/create` and `ArtboardsPanel` suite
(`test_workspace_editor_changes.js`, 19/19). All 7 new checks and all 19
existing checks pass: typing in any of these fields only updates local
draft state, never the live canvas, until an explicit Apply/Set Size
click. Could not reproduce the bug anywhere in the current build — most
likely a stale build the report was made against. No code change was
needed; flagging this in case it resurfaces with a more specific repro.

**Shipped:** a real Perspective (corner-pin distort) tool — the first
piece of the "more advanced transforms" ask. Fabric.js has no built-in
projective transform for image objects, so this is a genuine new
capability, not a relabeled Skew: `lib/editor/perspective.ts` implements
a real 4-point homography (direct linear transform, solved via Gaussian
elimination) and warps the image's actual pixels via inverse-mapped
bilinear sampling, baked into a new raster the same way Crop and Resize
already bake their own pixel operations. Four draggable handles (`'perspective'`
tool, Shift+T) show a live outline of the target quadrilateral while
dragging; Apply performs the real warp, Reset snaps the handles back,
Cancel discards with no pixel change. Verified with a new Playwright
suite (`test_perspective_tool.js`, 11/11): handles/outline creation,
drag-without-baking, a genuine pixel-content diff after Apply (not just
a dimension check), cleanup after both Apply and Cancel, and the Shift+T
shortcut. Also backfilled several real shortcuts that existed in code but
were missing from `ShortcutsModal.tsx` (Skew, Clone Stamp, Blur, Sharpen,
Sponge, Paint Bucket, Hue/Saturation) alongside the new Perspective entry.

**Still planned for the "more advanced" transforms area:** Warp
(mesh-based distort) and a unified Free Transform UI wrapping
move/scale/rotate/skew/perspective in one mode — see audit §9.

## 2026-09-28 — Photo Studio: Blur, Sharpen, Sponge, Paint Bucket, Skew, layer blend modes

**Problem:** the previous audit (§9) mapped the "full Photoshop" brief's
tool list against what's actually real in Photo Studio and found several
Painting/Retouching/Transform/Layers items genuinely missing: Blur,
Sharpen, Sponge, Paint Bucket, a transform beyond move/scale/rotate, and
layer blend modes. This entry ships six of those for real, each reusing
this codebase's existing, proven architecture rather than inventing a
new pattern per tool.

**What was done:**
- `lib/editor/photoBrush.ts` gained three new pixel-math functions
  following the file's own established signature
  (`(source, mask, amount): string`): `blurInMask` (real Gaussian blur
  via the canvas 2D context's own `filter`, blended into the mask by its
  alpha — the same "feather overlapping dabs" convention `dodgeBurnInMask`
  already uses), `sharpenInMask` (real unsharp-mask:
  `original + amount*(original-blurred)`, clamped and mask-blended the
  same way), and `spongeInMask` (reuses the same RGB↔HSL round-trip
  `applyHueSaturation` already has, scaling saturation within the brush
  stroke instead of the whole image).
- `components/photoEditor/PhotoEditorWorkspace.tsx`: added `'blur'`,
  `'sharpen'`, `'sponge'` to `PAINT_TOOLS` (so they get the existing
  drag-brush mechanics — soft dabs, stroke smoothing, bake-on-mouse-up —
  for free, with their own strength/radius property panels mirroring
  Dodge/Burn's), `'paint-bucket'` as a single-click tool (reuses
  `magicWandMask()` — the same flood-fill Background Removal already
  used — to build the fill region, then the existing `paintColorInMask()`
  to fill it), and `'skew'` as a tool whose panel sets the active layer's
  real Fabric `skewX`/`skewY` properties directly via confirm-on-blur/
  Enter number inputs (matching this engagement's established resize-
  input pattern) with a Reset control. All five get real toolbar icons,
  keyboard shortcuts, and toolbar-group placement.
- `components/editor/LayersPanel.tsx`: a new opt-in `onBlendModeChange`
  prop (following the exact same opt-in pattern `onOpacityChange` already
  established) renders a blend-mode dropdown per layer when provided,
  setting the real Fabric `globalCompositeOperation` — Main Design's own
  usage of this shared component doesn't pass the new prop, so its layer
  list is unaffected.

**Real bug found and fixed while testing this:**
`PhotoEditorWorkspace.tsx`'s `addLayerFromSource` loaded its base image
via a plain `new Image()` with no `crossOrigin` set. Every source fed to
it before the 2026-09-28 (workspace/editor) entry's Photo Studio reopen
path was always a local `data:` URL, so this never mattered — but a
cross-origin signed URL taints the crop canvas the moment it's drawn,
throwing a `SecurityError` on the first `toDataURL()` after. Fixed by
setting `crossOrigin = 'anonymous'` before assigning `.src`.

**Deliberately not done in this pass** (see the audit's §9 table for the
full remaining list): the ML-dependent selection tools (Magnetic Lasso,
Select Subject, Select and Mask), a literal drag-brush healing/patch
tool distinct from the existing Content-Aware Fill, Warp/Distort/
Perspective/Free Transform, Gradient Map/Channel Mixer/Selective Color/
Color Balance, a full Lightroom-style HSL-per-color-band panel, Texture/
Clarity/Dehaze/Vignette/Grain, gradient- or color-range-driven masks, and
layer grouping/clipping. None of these are stubbed with non-functional
buttons — they simply don't appear yet.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_photo_studio_pro_tools.js`, 12/12) against a real two-color
test image: Blur and Sharpen strokes verified to genuinely change pixel
data (tested against a moderate-contrast edge, not a saturated 0/255
primary — an unsharp mask has no headroom to change a value already at
0 or 255 in the direction that would clip straight back to itself, which
looks like "no change" but is actually just clamping, not a bug); Sponge
verified to move a solid color's RGB channels toward gray; Paint Bucket
verified to fill the exact clicked region with the chosen color; Skew X/Y
verified against the real Fabric object properties (including Reset);
blend mode verified against the real `globalCompositeOperation`; Save
still succeeds after exercising all six. Building this suite surfaced and
required fixing two real test-driver issues along the way, noted here
because they're the kind of thing worth knowing for future Photo Studio
tests: (1) `page.mouse.move/down/up` with a page coordinate computed once
goes stale the moment a taller property panel reflows the canvas
container — later interactions need coordinates computed fresh,
immediately before use; (2) Fabric stacks a non-interactive
`lowerCanvasEl` behind the real interactive `upperCanvasEl`, so a generic
`canvas` element locator can resolve to the wrong one. Re-ran the full
adjacent regression surface: `test_photo_studio.js` (13/13),
`test_workspace_editor_changes.js` (19/19), `test_maindesign_storage.js`
(10/10), `test_storage_dedup.js` (8/8) — all still passing.

**Not verified:** real Supabase Storage CORS/signed-URL behavior against
production infrastructure (same standing limitation as every prior
storage-related entry in this log).

---

## 2026-09-28 — Workspace cleanup, unit-system UX, and Photo Studio/Main Design separation

**Problem** (the "Major Workspace & Editor Changes" brief, a large,
multi-week program spanning workspace structure, a full Photoshop-class
tool suite, a unit-conversion system, and project-data-model changes).
Per this engagement's established practice, the full brief was audited
against the real codebase first (see `docs/ENGINEERING_AUDIT.md` §9)
rather than assumed — that audit found several core Photo Studio tools
already real (marquee/lasso/magic-wand, brush/eraser, dodge/burn, clone
stamp, gradient, crop, eyedropper, levels, curves, hue/sat, a real
Bézier pen, a paintable layer mask, and a real content-aware
fill/object-removal), so this pass focuses on the concrete, scoped items
that were genuinely missing, rather than re-building tools that already
work or faking the much larger remaining tool list.

**What was done:**

- **Workspace cleanup** (`app/dashboard/page.tsx`): removed the "Studio
  (Preview)" nav link and the "+ Photo Project" button (which opened
  Main Design's embedded Photo Editor as a weaker, redundant entry point
  into the same underlying engine `/photo-studio` already wraps fully).
  The dashboard now shows exactly two workspace products — New Design
  and Photo Studio — matching the brief's naming. `/studio`'s own route
  and Main Design's in-context "edit this one image" Photo Editor
  integration are untouched; only the top-level advertising of them as
  separate workspace entries was removed.
- **Aspect-ratio lock, ESC-cancel, inline validation** (`app/create/page.tsx`,
  `components/editor/ArtboardsPanel.tsx`): both the document-creation
  screen and the open editor's per-artboard resize controls already
  resized only on blur/Enter, never per-keystroke (verified by reading
  the existing code before touching it) — what was missing was a lock
  icon between Width/Height that keeps the ratio when toggled on, ESC
  restoring the previous value instead of applying an in-progress edit,
  and an inline "Enter a valid size greater than 0." message instead of
  silently no-op'ing on invalid input.
- **`editor_type` project data model** (`supabase/migrations/
  0007_designs_editor_type.sql`): Photo Studio and Main Design write into
  the same `designs` table with no discriminator, so `/photo-studio`
  could only ever create new designs — reopening a Photo Studio design
  from the dashboard always landed in the generic `/editor`. The new
  column (additive, `default 'design'`, so every existing row keeps
  working exactly as before) is now set on save by both editors, the
  dashboard's Edit link routes accordingly, and `/photo-studio` gained a
  `?designId=` load path that fetches the row and extracts its flattened
  image + DPI back out of `canvas_json` (the same flattening
  `buildPhotoDesignPayload.ts` already does on save — reopening is
  exactly as non-destructive as the save that produced it, not a new
  limitation).
- **Real bug found and fixed while testing the above**:
  `PhotoEditorWorkspace.tsx`'s `addLayerFromSource` loaded its base image
  via a plain `new Image()` with no `crossOrigin` set. Every path that
  fed it an image before this change was always a local `data:` URL
  (upload, blank canvas), so this never mattered — but the new Photo
  Studio reopen path feeds it a real cross-origin signed URL, which
  taints the crop canvas the moment it's drawn and throws a
  `SecurityError` on the first `toDataURL()` call after. Fixed by setting
  `crossOrigin = 'anonymous'` before assigning `.src`, matching the same
  pattern already used elsewhere in this codebase for signed-URL images.

**Deliberately not done in this pass** (see the audit's §9 tool-status
table for the full breakdown): the large remaining tool list — magnetic
lasso, select-and-mask, a literal drag-brush healing/patch tool, warp/
distort/perspective transforms, gradient map, channel mixer, selective
color, a full Lightroom-style HSL/effects panel, layer blend modes and
grouping — is not built or stubbed. Each is its own scoped follow-up;
several (select subject, select-and-mask, magnetic lasso) are ML-
integration projects, not something to fake with non-functional buttons.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_workspace_editor_changes.js`, 19/19): dashboard no longer
shows Studio (Preview)/+ Photo Project while still showing Photo Studio/
New Design; aspect lock correctly computes the paired dimension on both
`/create` and the open editor's ArtboardsPanel; ESC restores the
pre-edit value without resizing; invalid input shows the inline message
and leaves the committed size untouched; Main Design's save writes
`editor_type: 'design'` and Photo Studio's writes `'photo-studio'`; the
dashboard routes each design's Edit link to the correct editor; and
reopening a Photo Studio design via `?designId=` skips the blank "Open"
screen and lands directly in the editing stage with real content loaded
— which is what caught the crossOrigin bug above (this suite failed
until it was fixed). Re-ran the full existing regression surface
touched by this change: `test_real_templates.js` (14/14),
`test_storage_dedup.js` (8/8), `test_legacy_template_filter.js` (15/15),
`test_maindesign_storage.js` (10/10), and `test_photo_studio.js`
(13/13) — all still passing.

**Not verified:** real Supabase Storage CORS/signed-URL behavior against
production infrastructure (same standing limitation as every prior
storage-related entry in this log — this sandbox only ever mocks it).
The `0007` migration needs to be applied by hand in the Supabase SQL
editor before `editor_type` will actually be recorded.

---

## 2026-09-28 — Templates: hide legacy content-less rows from public galleries

**Problem** (user-reported: "I ran it, it still shows blank" — after
applying the migrations and running "Generate Starter Templates," the
user still hit a blank artboard from `/templates`): the `templates` table
carries 13 pre-existing rows from the original `0003_templates_and_admin.sql`
seed, created before `canvas_json` existed as a column. Those 13 rows
still have `canvas_json = null`. `generateStarterTemplates` adds 6 new
real rows but never touched the legacy ones, and both `fetchTemplates()`
(unfiltered, used everywhere) and the public gallery pages listed them
side by side with no visual distinction and no way to tell which is which
without opening one. The 6 real rows also defaulted to `sort_order: 0`
via `.length` on insert, colliding with the legacy rows' own `sort_order`
0-12 range. The user was almost certainly clicking one of the 13 old,
identical-looking, non-functional rows.

**What was done:**
- `generateStarterTemplates` (`lib/templatesData.ts`) now sets each real
  row's `sort_order` to a negative value (`i - TEMPLATE_BUILDERS.length`),
  so real templates always sort ahead of any legacy row in an unfiltered
  listing.
- New `fetchPublicTemplates()` (`lib/templatesData.ts`): calls the
  existing `fetchTemplates()`, then filters to only rows with real
  `canvas_json`. If none exist yet (fresh install, migration applied but
  generation never run, or literally only legacy rows in the table), it
  falls back to the static `TEMPLATES` placeholder array — the same
  fallback `fetchTemplates()` already uses when the table itself is
  empty or unreachable, so a visitor never sees either an empty gallery
  or a legacy dead-end row.
- `/templates` (`app/templates/page.tsx`) and the homepage's
  `TemplateShowcase` (`components/home/TemplateShowcase.tsx`) now both
  call `fetchPublicTemplates()` instead of `fetchTemplates()`.
  `/admin/templates` deliberately still calls the unfiltered
  `fetchTemplates()` — an admin needs to see the 13 legacy rows to delete
  or eventually upgrade them, which is why this is a filter on the public
  read path, not a data migration or deletion.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_legacy_template_filter.js`, 15/15) that reproduces the exact
production scenario: seeds the mocked `templates` table with the 13
legacy no-`canvas_json` rows first, confirms the public gallery falls
back to the static placeholder list (not the legacy DB rows) before
generation has run, then generates the 6 real rows on top (19 rows total
in the table) and confirms: only the 6 real ones render on `/templates`
and the homepage showcase, a legacy row ("Bold Contact") never appears in
either public listing, clicking a real template still loads real content
even with legacy rows present in the same table, and `/admin/templates`
still shows all 19 rows unfiltered. Re-ran `test_real_templates.js`
(14/14) to confirm the existing generation/use-template/save flow is
unaffected.

**Deliberately not done:** the 13 legacy rows are not deleted or
backfilled with real content by this change — they're now simply hidden
from public view. Deleting them (optional cleanup) or upgrading them to
real designs is a separate, low-risk follow-up an admin can do anytime
from `/admin/templates` now that they can no longer confuse a visitor.

---

## 2026-09-26 — Storage: real object storage cutover for Main Design

**Problem** (audit §1, deferred from the Photo Studio slice): Main
Design's own image insertion paths — the toolbar Upload button
(`handleImageUpload`) and File > Import / PDF-page-rasterized import
(`insertImageDataUrl`) — still embedded every image as base64 directly
in the Fabric object's `src`, the same cost the Photo Studio slice fixed
for its own, smaller surface.

**What was done:** a `backgroundUploadAsset(img)` helper in
`app/editor/page.tsx`. The image is still added to the canvas
immediately from the local data URL — placing an image is never slower
or dependent on the network, unchanged from before. In the background,
its bytes are uploaded via the same `uploadDesignAsset` helper the Photo
Studio slice introduced, and once that resolves, `img.setSrc(signedUrl,
cb, {crossOrigin: 'anonymous'})` swaps the object's source in place
(same position/scale/filters/`__uid` — nothing else about the object
changes) and records `__assetId`. Wired into both `handleImageUpload`
and `insertImageDataUrl` (so File > Import and PDF-page imports get it
too, since they share that function), and also into `applyPhotoEdits`
(the Photo Editor's "Apply to Design") — a photo edit produces fresh
pixels, so its stale `__assetId` is cleared immediately and a new
upload kicks off for the edited result. A failed upload (offline, or
the storage migration not applied) degrades silently: the image just
stays embedded for that session, the same graceful-fallback pattern
already used elsewhere in this app (e.g. a missing thumbnail column).

**Why deferred, now not:** the audit flagged this specifically as
higher-risk than Photo Studio because exports, thumbnails, undo/redo,
and every already-saved design all read image data directly. The design
here avoids disturbing any of that: existing designs with embedded
base64 are untouched (this only changes what a *future* insert or photo
edit produces), Fabric already serializes `crossOrigin` as part of an
Image object's JSON (confirmed in the Photo Studio work), so a reload
correctly re-establishes the same cross-origin-safe loading automatically,
and the swap itself doesn't call `pushHistory()` (it's not a user
action, so it doesn't create a spurious undo step or make an old,
pre-swap history entry disagree with a newer one — both still resolve
to the same visible image either way).

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New 10-check
Playwright suite: an uploaded image's src becomes a real signed URL
with a real `__assetId`, `crossOrigin` is set correctly, exactly one
real upload happens, Export as PNG still works with a cross-origin
image (no tainted-canvas error), Save writes `canvas_json` referencing
the URL (not base64), reloading a saved design correctly re-loads the
URL-sourced image, and uploading identical content again dedupes
instead of re-uploading. Existing regression suites re-run and still
passing: guides/grid/snap (14/14), photo export sync (4/4) and dialog
(4/4), dashboard thumbnail backfill (5/5), and the real-templates suite
(14/14, confirming the templates cutover from the previous slice still
works after these editor changes).

**Not verified (same honest limitation as the Photo Studio slice):**
real Supabase Storage CORS/signed-URL behavior against production
infrastructure — only mocked in this sandbox.

---

## 2026-09-26 — Templates: real, original editable designs (first batch)

**Problem** (audit §3): `templates` held no editable design content at
all — just a name/category/size/two hex colors, rendered as a color
swatch. Clicking "Use Template" opened a blank document at the right
size with nothing else loaded; `templateId` only changed a back-link
label. The "original template library" brief is legitimate greenfield
work, not a migration.

**What was done — following the brief's own anti-copying rule strictly:**
every shape, position, and color below is authored directly in
`lib/templates/builders.ts`, not traced, adapted, or copied from Canva,
Adobe, Envato, Freepik, Pinterest, Behance, or anywhere else.
- `supabase/migrations/0006_template_designs.sql` — adds `canvas_json`,
  `thumbnail`, `rights_status` to `templates` (purely additive).
- `lib/templates/builders.ts` — six real, structurally distinct template
  compositions (not one master recolored): Modern Grid (Business Card,
  two-panel color block), Diagonal Edge (Flyer, wedge cutout + CTA
  pill), Confetti Pop (Invitation, scattered dot pattern + rounded
  frame), Golden Frame (Invitation, nested double border — deliberately
  a different construction technique from Confetti Pop despite sharing
  a category), Sale Burst (Social Media, rotated-triangle starburst),
  Editorial Minimal (Resume, sidebar + content grid). `rights_status`
  defaults to `'verified'` since the content is generated code, not
  sourced material.
- `lib/templates/renderTemplate.ts` — mirrors
  `lib/editor/buildPhotoDesignPayload.ts`'s pattern: a real headless
  Fabric `StaticCanvas` with a proper Artboard object, producing
  byte-compatible `canvas_json` + a real thumbnail via `toDataURL`.
- A "Generate Starter Templates" action in `/admin/templates`
  (`generateStarterTemplates` in `lib/templatesData.ts`) runs every
  builder through the pipeline and upserts by `(name, category)` — a
  real, repeatable generation pipeline, not templates hardcoded into
  React components.
- `/templates`' "Use Template" now passes the template's real `id`;
  Main Design's editor bootstrap loads that template's `canvas_json` as
  a fresh document's starting content when one resolves (copy-on-use —
  `designId` stays unset, so the first Save creates a new design and
  never mutates the template). Falls back to today's blank-canvas
  behavior for ids that don't resolve (old links, deleted templates, or
  the static fallback array).
- Both `/templates` and `/admin/templates` render the real thumbnail
  when present, falling back to the existing color-swatch placeholder
  otherwise.

**Deliberately NOT done in this batch:** this ships 6 original templates
to prove the full pipeline for real, not 10,000+ — producing a large
library is a content effort as much as an engineering one (see the
audit's own scope table). Font/image licensing metadata, the full
originality-review workflow, and template packs are not built yet.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New 14-check
Playwright suite: generation produces 6 real rows with genuinely
different object counts (6–22 objects, confirming distinct
compositions, not recolors) and real thumbnails; re-running generation
updates the same rows instead of duplicating them; opening a template
via "Use Template" loads its actual objects into the editor (verified by
reading back real text like "Jordan Ellis" from the live canvas, not a
blank one); saving creates a new design and never mutates the template
row. Existing regression suites (guides/grid/snap, templates/dashboard)
re-run and still passing.

---

## 2026-09-26 — Storage: real object storage + content dedup (first slice)

**Problem** (audit §1): every design image was embedded as a base64
data URL directly inside `designs.canvas_json` / `design_versions.canvas_json`,
multiplied up to 50x by version history, with no asset table, no object
storage for design content, and no content-based deduplication.

**What was done:**
- `supabase/migrations/0005_design_assets.sql` — a private `design-assets`
  Storage bucket (owner-scoped RLS, same folder-prefix pattern as the
  existing `avatars` bucket but not public) and a `public.assets`
  metadata table (`storage_key`, `mime_type`, `width`, `height`,
  `file_size`, `hash`, unique per `(user_id, hash)`). Purely additive —
  no existing table, column, or row touched.
- `lib/storage/assets.ts` — `uploadDesignAsset(blob, userId)`: computes a
  real SHA-256 content hash, checks for an existing asset with the same
  hash for that user before uploading (dedup), uploads new content to
  `design-assets/{userId}/{hash}.{ext}`, records metadata, and returns a
  long-lived signed URL.
- Wired into **Photo Studio's Save** (`lib/editor/buildPhotoDesignPayload.ts`) —
  the flattened composite is uploaded via `uploadDesignAsset` and
  referenced by its signed URL (plus a new `__assetId` custom property)
  in `canvas_json`, instead of being embedded as base64. `__assetId` was
  added to the three places that must agree on which custom properties
  survive save/undo/reload (`app/editor/page.tsx`'s save function,
  `hooks/useEditorHistory.ts`'s `SNAPSHOT_PROPS`, and this module's own
  list), matching the existing pattern for every other custom property
  in this codebase.

**Deliberately NOT done in this slice** (see audit §8 for why): Main
Design's own mature upload path (`handleImageUpload`/`insertImageDataUrl`
in `app/editor/page.tsx`) still embeds base64 — it's a much larger,
higher-risk migration (exports, thumbnails, undo/redo, PDF/SVG export,
and every already-saved design all currently assume a self-contained
`src`), and is the natural next slice once this pattern is proven out.
Cross-user deduplication was also deliberately not attempted (dedup is
scoped to `(user_id, hash)`) — see the migration's own comment on the
privacy review that would need to happen first.

**Known scope limitation, stated plainly:** the signed URL is long-lived
(10 years) and baked directly into `canvas_json`, rather than storing
just the `assetId` and re-resolving a fresh signed URL at load time. The
latter is more correct long-term (and is what template/asset reuse
across documents will eventually need) but requires an async resolution
step in Main Design's canvas-load path — out of scope for this slice.

**Tested:**
- `npx tsc --noEmit` and `npm run build` clean.
- New Playwright suite (`test_storage_dedup`, 8/8 passing) against
  mocked Storage/`assets` endpoints: upload happens once, the object
  reference in `canvas_json` is a real signed URL (not base64), the
  image carries a real `__assetId`, the `assets` row has a genuine
  content hash/dimensions/file size, and **saving the same unchanged
  content a second time does not re-upload** (confirms real
  content-based dedup, not just a plausible-looking one).
- Full Photo Studio end-to-end suite (13/13) and the Resize-dialog
  unit-conversion suite (6/6) re-run and still passing with the new
  storage path wired in.
- Existing regression suites re-run unchanged and passing: Main Design
  guides/grid/snap (14/14), Photo Editor export sync (4/4) and export
  dialog (4/4).

**Not verified (stated honestly):** real Supabase Storage CORS and
signed-URL behavior against production infrastructure — this sandbox's
Supabase project is a mocked placeholder domain used purely for
Playwright route interception, with no reachable real Storage backend.
The migration SQL needs to be applied by hand in the Supabase SQL editor
(this app has no migration runner wired up, matching every prior
migration's own note) before Photo Studio's Save will work against the
real project; a real save should be spot-checked once that's done.
