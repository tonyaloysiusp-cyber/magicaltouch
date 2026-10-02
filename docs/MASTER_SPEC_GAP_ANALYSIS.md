# Master Spec Gap Analysis

Cross-references the 180-part "Magical Touch Design" master specification
against the actual current codebase. Based on three independent code
audits (data/storage/persistence, editor document model, templates/
creator/admin) run 2026-10-02. Every claim below traces to file:line
evidence gathered by those audits — this document is the synthesis, not
new investigation.

**Purpose:** decide what to keep vs. build before writing any new code,
per the spec's own Part 1 instruction. This is a planning document, not
an implementation log — see `CHANGELOG_ENGINEERING.md` for that.

---

## 0. Urgent — verify before anything else

**`designs` table RLS may not be live in production.** Every migration
in `supabase/migrations/` other than `0008_designs_rls.sql` predates the
`designs` table's own creation — it was evidently set up by hand
directly in the Supabase dashboard, outside this migration history, and
`0008` is a *reactive* patch adding RLS to it after the fact. There is
**no server-side ownership check anywhere in the app** (the only API
route in the whole codebase is `app/api/font-file/route.ts`, unrelated)
— every `designs`/`templates`/`assets` read/write goes straight from the
browser to Postgres via the anon-key client, with RLS as the **sole**
authorization boundary.

**If `0008` has not been applied to the live Supabase project, any
authenticated user can currently read, rename, or delete any other
user's designs** via a direct API call, with nothing else standing in
the way.

**Action needed now, independent of any roadmap decision below:**
confirm `0008_designs_rls.sql` is applied to the live project. If it
isn't, apply it immediately — this isn't a backlog item.

---

## 1. What's genuinely real and worth keeping

The spec's Part 135 ("No Fake Tools") and Part 134 ("Remove Broken
Features") are largely already honored going forward — the codebase has
a real, consistent discipline of marking unfinished things
`planned: true` rather than wiring fake buttons (Pathfinder panel, Vertical
Type, Text on Path all confirmed honestly stubbed, not faked). Concretely
real and solid:

- **Multi-page/artboards (Main Design)** — real Fabric rects with their
  own per-artboard print settings (bleed/safe/DPI/marks), full CRUD +
  reorder, verified crop-mark geometry against real Adobe reference
  PDFs, DPI genuinely drives export pixel dimensions (not cosmetic).
- **Vector Pen tool** — real Bézier anchor/handle editor: corner/smooth
  toggle, insert/delete anchor via exact curve subdivision, join/break/
  reverse/close path. Real boolean ops (union/subtract/intersect/
  exclude) via the installed `polygon-clipping` package.
- **Masks** — non-destructive in both editors: Main Design's vector
  clipPath (fully removable) and Photo Studio's unified paint+path
  raster alpha mask (toggle/invert/feather/remove), with a separate,
  honestly-distinct *destructive* "clear masked pixels" action that
  never gets confused with the non-destructive default.
- **Text engine** — real first-class Fabric `Textbox`, genuine per-
  character styling when there's a text selection, honest Character/
  Paragraph split.
- **Photo Studio** — real multi-layer raster editing, blend modes,
  opacity, and (per this session's own extensive work) a long, tested
  list of real pixel-level tools (brushes, masks, filters) — see
  `ENGINEERING_AUDIT.md` for the full tool-by-tool status.
- **Asset storage** — real SHA-256 hashing + per-user dedup
  (`lib/storage/assets.ts`), private bucket + signed URLs.
- **Autosave** (Main Design) — real, debounced (3s), with best-effort
  version snapshots into `design_versions`.
- **Templates: copy-on-use** — "Use Template" genuinely clones into a
  new `designs` row and never mutates the master template row. The
  render pipeline (`lib/templates/renderTemplate.ts`) produces real
  `canvas_json` + thumbnails via a real headless Fabric canvas, not
  hand-waved placeholders.

None of this needs to be rebuilt. The gaps below are additive or
architectural, not "rip out and redo."

---

## 2. What's completely absent (zero code, not even stubs)

Confirmed via repo-wide grep in all three audits — these aren't
"partially implemented," they don't exist in any form:

- Retention/expiration (Parts 74–77, 146–147) — no 14/30/35-day concept,
  no cleanup job, no cron, nothing.
- Background job infrastructure of any kind (Part 112–114) — no queue,
  no `supabase/functions/`, no cron. Thumbnailing/rendering/versioning
  all run synchronously in the browser today.
- API route layer (Parts 155, 115) — one unrelated route exists
  (`font-file`). No route handlers for designs/templates/assets at all.
- Native portable file format / MTD (Parts 78–93) — no structured,
  re-importable export exists. All exports (PNG/JPG/PDF/SVG) are
  one-way, render-only artifacts.
- Creator submission → review → approval → credit pipeline (Parts
  94–101, 144) — no submissions table, no review UI, no credit ledger,
  no idempotency (nothing to protect yet).
- Favorites (Part 104) — no table, no column, no UI, anywhere.
- Template tags (Part 102–103) — zero concept, not even a column.
- Template usage analytics (Part 105) — nothing tracked, anywhere.
- DB-managed template categories (Part 8) — hardcoded TS union type;
  adding a category requires a code change + redeploy.
- Template versioning (Part 11) — no version field on `templates`, and
  no `template_id`/`template_version` recorded on a `designs` row even
  though copy-on-use is implemented correctly by accident of being a
  full one-time deep copy.
- Admin storage/job monitoring dashboards (Part 153–154) — `app/admin/`
  has exactly one page (template CRUD). No storage, queue, or health
  view exists.
- Optimistic concurrency / save-conflict detection (Part 61) — every
  save is a last-write-wins `upsert`; two tabs editing the same design
  silently clobber each other.
- Smart Objects (Part 22) and a real adjustment-layer *stack* (Part 39)
  — a narrower non-destructive mechanism exists for one photo's settings
  across sessions, but "Apply" always flattens to a single PNG; there is
  no stack of independently toggleable/reorderable adjustments.
- Multi-stop gradients (Part 48) — the gradient fill is real but
  hardcoded to exactly 2 stops.
- Pattern fills (Part 49) — zero references anywhere.
- CMYK / real print color management (Part 55) — the color-bar code is
  explicit that this pipeline is RGB-only and honestly labels its own
  color bar as a screen approximation, not real ink values.

## 3. Architecturally significant, not just "missing a feature"

Two findings matter more than the rest because almost everything else
in the spec sits on top of them:

**a. The document "model" is Fabric.js's own `toJSON()`.** There is no
app-owned typed schema (`Document { pages, layers, objects }`) in either
production editor — React state is auxiliary UI state, not the
document of record. A real typed, Command-pattern-undo schema *does*
exist, but only in the unshipped `/studio` (Lumen) prototype, which is
raster-only and persists to IndexedDB, not Supabase — it's a good
architectural reference, not a drop-in replacement.

This blocks: MTD (which needs a portable, Fabric-independent
representation), a real adjustment-layer stack, Smart Objects, and
scalable undo/redo.

**b. Undo/redo is full-document-snapshot-per-change in both production
editors**, not a command/operation pattern — confirmed by reading the
hook bodies, not inferred. Main Design pushes a full JSON string of the
whole canvas on every tracked change (capped at 100 entries); Photo
Studio pushes a full re-encoded PNG string per layer per edit. For a
design with embedded images, this is a real memory-growth risk at the
"large project" scale the spec explicitly asks to test for (Parts 118,
163, 168). The only real command-pattern implementation in the codebase
is, again, in the unshipped Lumen prototype.

---

## 4. Recommended phasing

This is a recommendation, not a decision — sequencing here has real
cost tradeoffs and architecture bets that are worth confirming before
committing weeks of work to one path over another.

| Phase | Focus | Why this order |
|---|---|---|
| **0** | Verify/fix `designs` RLS (§0 above) | Potential live data exposure; not deferrable |
| **1** | Introduce a real API route layer for designs/templates/assets with server-side ownership checks | Nothing else below is safe to build without this — background jobs, MTD import validation, rate limits, and admin actions all need a server-side place to live |
| **2** | Minimal background job mechanism + retention/expiration + move thumbnailing off the save path | Spec-required (Parts 74–77) AND fixes a real scalability risk (unbounded `design_versions` growth, synchronous thumbnailing) |
| **3** | MTD v1 — scoped as a packaged wrapper around the existing `canvas_json` (manifest + document.json + embedded/deduped assets, zip container), not a ground-up document-model rewrite | Real customer-facing win (Parts 78–93) achievable without first solving §3a's deeper document-model problem; defers the bigger architectural bet |
| **4** | Template marketplace + creator economy — DB-managed categories, tags, template versioning fields, submission/review pipeline, idempotent creator credits, favorites, analytics, admin review queue | Large but mostly additive; no architectural blockers once Phase 1 exists |
| **5** | Editor depth — multi-stop gradients, patterns, real adjustment-layer stack, command-pattern undo/redo migration, nested layer tree UI, text-on-path/vertical-type, scoped CMYK/print-color decision | Highest effort-per-feature; benefits most from Phase 1/3 groundwork being in place first |

## 5. Open decisions (need your call before Phase 1+ starts)

1. **Background jobs**: Supabase Edge Functions + `pg_cron`, or a
   separate worker/queue? This affects Phase 2 and everything after.
2. **MTD scope for v1**: ship the "wraps existing canvas_json" version
   now (faster, real, but doesn't yet solve the deeper document-model
   gap), or hold MTD until a real typed schema exists (slower, more
   "correct," blocks a visible feature for longer)?
3. **Priority order**: does Phase 0/1 (security + API layer) take
   precedence over continuing the Photo Studio tool-parity work already
   in flight this session, or run in parallel?
