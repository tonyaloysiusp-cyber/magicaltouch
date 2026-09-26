# Engineering Changelog

Tracks real, verified engineering work against the findings in
`docs/ENGINEERING_AUDIT.md`. Each entry states the problem, what was
actually done, what was tested, and what's deliberately left for later.

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
