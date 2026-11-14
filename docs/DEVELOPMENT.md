# Magical Touch Creative Studio — development summary

Read this first in every new session. It records what exists, what was
verified, and what is still missing. Keep it current. Last update: 14 Nov 2026.

## How to run
- `npm install && npm run dev` (Next.js 14, App Router). Production: `npm run build && npx next start`.
- Deploy: push `main` → Cloudflare Workers (OpenNext) builds and deploys. Work happens on `nov-updates`. Then run `git checkout main && git reset --hard nov-updates && git push`.
- CI (`.github/workflows/e2e.yml`, on push to `nov-updates`) runs `e2e/ci.sh`:
  - type check (`tsc`)
  - unit tests: `node --experimental-strip-types --test e2e/unit/*.test.mjs`
  - production build
  - Playwright scenarios (`e2e/scenarios.mjs`)
  - SEO audit (`e2e/seo-audit.mjs`)
  - Lighthouse (`e2e/lighthouse.sh`)

  Results are printed in the log.
- Library files import siblings with `.ts`. Type-only imports must use `import type`, because tests run with Node strip-types.
- Supabase project `rqkjogzljsbufbrdlbfr` provides auth, Postgres (RLS and admin RPCs) and storage.

## Tools (order from the 14 Nov brief)
The single source of truth is `lib/toolsCatalog.ts`. It drives the header menu, `/tools`, `/create`, the footer and the tool search.

| # | Tool | Route |
|---|---|---|
| 1 | Design Editor | `/create` → `/editor` |
| 2 | Photo Studio | `/photo-studio` |
| 3 | Image Trace | `/trace` |
| 4 | Pattern Design (Repeat pattern + Rangoli & Mandala mode) | `/patterns`, `/patterns?mode=rangoli` |
| 5 | Textile Designer (jersey V/round neck, polo with placket buttons, T-shirt) | `/textile-designer?garment=jersey\|polo\|tshirt` |
| 6 | Wallpaper & Wall Sticker Designer | `/wallpaper-designer`, `?mode=sticker` |
| 7 | Print Size & Binding Calculator | `/print-size-calculator` (book tab + the original size tab) |
| 8 | Print Layout: Imposition studio + quick layout | `/print-layout` |
| – | Background remover, Passport photos, Colour Explorer (+ gradient backgrounds) | `/remove-background`, `/passport-photo-maker`, `/colours#gradients` |

Old addresses redirect permanently (`next.config.mjs`): `/custom-jersey-designer`, `/polo-shirt-designer`, `/custom-t-shirt-designer` → Textile Designer; `/wall-designer` → `/wallpaper-designer`; `/rangoli-mandala-maker` → `/patterns?mode=rangoli`; `/gradient-background-generator` → `/colours#gradients`. AI Studio is out of the navigation (admin-only page kept). The wall *poster* mode is not offered any more (owner's instruction); the WallDesigner component still has it behind `wallpaperOnly={false}`.

### Design continuity (local only)
- `lib/assets/library.ts`: IndexedDB `mt-local-library` — assets with stable ids (`pattern | palette | gradient | logo | image | svg | text-style`) and per-tool states. Writes resolve only after the transaction completes. Changes broadcast on `BroadcastChannel('mt-assets')` and the `mt-assets` window event.
- Patterns saved in Pattern Design (or a rangoli via "Use it elsewhere") are the same asset in the Textile and Wallpaper pickers. `?pattern=<id>` opens a tool with that asset; projects keep a copy plus the id, and offer "use the new version" when the asset changed.
- The Textile Designer keeps one state for all garments (`mt:textile`), so switching jersey ↔ polo ↔ T-shirt never loses the pattern or design. The Wallpaper designer restores its last state (`mt:wall`). The binding calculator keeps its inputs (`mt:binding`).
- `/storage` shows space used/quota, persistence ("Keep my library safe"), library backup/restore (JSON), delete with confirmation, work in progress and recent files.
- Saving design files: device only (File System Access API or download). `DEVICE_ONLY_SAVES` in the editor; Photo Studio saves `.mtd` to the device; cloud providers are hidden.

## Project files
- **`.mtd`** (`lib/mtd/format.ts`) is the single project format. It is gzip JSON wrapped in a self-opening SVG (`Name.mtd.svg`) or plain `.mtd`. It holds:
  - the editor canvas (vectors, text, masks, artboards)
  - de-duplicated assets
  - fonts (names only)
  - a thumbnail
  - **`tool: { kind, version, data }`** for tool projects (`jersey | polo | tshirt | pattern | wall`)
- **Tool projects** use `lib/mtd/toolProject.ts`:
  - `saveToolProject` uses the File System Access API with a download fallback, and writes the IndexedDB recent list.
  - `openToolFile` reads `.mtd`, and also migrates older `.mtdt` files (`lib/mtdt.ts`).
  - `takeToolHandoff` receives files opened from the Dashboard, Open page or editor; `toolUrlFor` routes them to their tool.
- **Saved on the device:**
  - editor drafts in IndexedDB (`lib/editor/draftStore.ts`)
  - the recent local files list in IndexedDB (`lib/mtd/recent.ts`)
  - the shared asset library and tool states in IndexedDB (`lib/assets/library.ts`); old `mt:patterns` are migrated once
  - textile projects in localStorage (`mt:textile-projects`), autosave `mt:textile`
- Photo Studio `.mtd` files keep every layer (`canvas.photoStudio`: pixels, names, visibility, opacity, blend, adjustments, live text) next to the flattened picture, so they reopen unflattened.
- Nothing is uploaded. Two older cloud designs (one user) remain in Supabase untouched; re-saving them goes to the device.

## PDF and export
- **Editor:**
  - vector PDF (`lib/editor/pdfVector.ts`), with fonts embedded through `lib/editor/pdfFonts.ts`
  - SVG export (`lib/editor/svgExport.ts`), which keeps groups and clip paths and inlines pattern tiles as vectors
  - print marks (`printMarks.ts`) and preflight (`preflight.ts`, `PreflightModal`)
  - **Press CMYK PDF/TIFF** (`lib/export/printFiles.ts`) is DeviceCMYK *raster* pages with a FOGRA39 output intent. It is not vector and not verified PDF/X, so never claim PDF/X compliance.
- **Tools:**
  - SVG→PDF converter (`lib/svgToPdf.ts`) for garments, roster print sheets, wallpaper strips and rangoli. All vector.
  - `/print-layout` **Imposition studio** (`lib/impose/model.ts`, `lib/impose/pdf.ts`, `components/tools/ImpositionStudio.tsx`): PDF analysis (trim/bleed/media/crop/art boxes, rotation, fonts and embedding, images, colour spaces, mixed sizes, blank pages, likely marks); commands — booklet (+creep), n-up 2/4/6/8/9/16/custom with duplex long/short, step & repeat, join two pages, tile, manual imposition (new sheet, place page, drag/nudge/rotate), reverse, shuffle even/odd, shuffle for imposing (cut & stack), insert blank/insert pages/delete/duplicate/move/rotate, define bleeds, adjust page sizes, trim & shift, creep, info/modify (set trim box), stick on text & numbers, stick on PDF pages, masking tape, peel off, sample document, automation sequences, undo/redo, repeat last (remembered). Export: print-ready vector, editable with optional-content layers, front only, back only, flattened (pdf.js raster at 150/200/300 dpi). Quick layout (the earlier many-up/booklet tool) is kept as a tab.
- **PDF import into the editor** (`lib/editor/pdfVectorImport.ts`): pages become separate editable layers — vector paths (fill, stroke, dash, caps, joins, opacity), linear/radial gradients, clipping masks, pictures and editable text (fonts substituted where not available, reported). "One flattened picture per page" is an explicit choice, never automatic. Not kept (reported): soft masks, blend modes, mesh gradients, tiling patterns, image stencil masks, nested clip intersections.
- **Our PDFs reopen exactly**: every editor PDF export attaches the `.mtd` project (`lib/editor/pdfProject.ts`, embedded file `magical-touch-design.mtd`); importing such a PDF offers "Open the original design".
- **Binding calculator** (`lib/binding.ts`): spine from caliper (entered, or estimated from gsm × bulk profile and labelled "Estimate"), perfect binding (hinge scores, glue allowance), saddle stitch (multiple of 4, sheets, creep per sheet), hardcover (boards, squares, joints, turn-ins, endpapers). Outputs: cover template SVG/PDF with bleed, safe area, folds/scores, crop marks; plain-text spec; "Open cover in Design Editor" with fold guides (`?guidesV=`/`guidesH=` in the editor).
- **Wall stickers** (`lib/sticker.ts`, `components/wall/StickerDesigner.tsx`): contour cut path from the artwork's alpha (white border offset or cut-inside bleed), sheet layout via `nUpPlan`, registration marks, magenta 0.25 pt cut line on its own layer, PDF/SVG.

## Verified by tests (CI, 13 Nov 2026)
- 40 browser scenarios and 110+ unit tests. They cover:
  - pattern vector export
  - jersey roster to one print PDF
  - click-to-edit the shirt, save a project, the leave prompt, `.mtd` save and reopen
  - polo quantities, wall poster size, wallpaper strips PDF and roll estimate
  - colour export, rangoli PDF
  - print layout: 85×55 cards with front and back on A4, and a 6→8 page booklet with correct order, both vector
  - plus the editor, template, course and admin flows
- The SEO audit of every sitemap page passes.
- Lighthouse scores SEO 100 on every tested page.

## Known gaps (not done — say so, never claim them)
- **Vector:**
  - Pathfinder exists only as Shape Builder (unite/subtract/intersect/exclude via polygon-clipping); there are no live boolean effects.
  - No compound-path editing UI beyond what Fabric offers.
- **Publishing:** no facing-page spread view in the editor, no brochure fold-panel guides, no page-numbering automation.
- **Print:**
  - Booklet creep is not compensated.
  - Sticker cut paths (contour) are not generated; many-up uses rectangles only.
  - The press CMYK PDF is raster.
- **Apparel:**
  - No hoodie or uniform blocks.
  - Garment blocks are generic standard shapes, not supplied factory specifications. Garments must be checked against the factory's own pattern before production.
- **Wallpaper:** the rolls calculator is an estimate. Wallpaper print strips cover one wall at a time.
- **Photo:** face tools are manual brushes; there is no automatic face detection. Before/after compare is not built.
- **Creative:** the mockup studio was retired (not realistic enough); brand guidelines documents do not exist yet.
- **Dashboard:** the brief's full list (My Assets, My Patterns, Export history) is not all present yet.
- **Speed (mobile Lighthouse):** `/templates` scores about 59 (2.4 s blocking time) and the jersey designer about 65.
- **Thin pages:** Photo Studio has almost no indexable text.

## Next steps (in order)
1. A Dashboard "Recent projects" view that merges editor drafts, `.mtd` recent files and tool projects, with real thumbnails.
2. Brochure fold guides (bi-fold, tri-fold, Z-fold) as editor artboard presets with panel guides.
3. A sticker sheet with contour cut path (trace the alpha outline, offset it, export as a spot-colour path).
4. Hoodie block, but only from supplied garment specifications.
5. A web worker for the template search index (`/templates` speed).
6. Before/after compare and HSL/colour-grading panels in Photo Studio (check what `lib/photo/adjust.ts` already supports first).

## Rules from the owner (keep)
- Never collapse, hide or remove existing design tool options to simplify the interface. Reorganise only when it is safe; otherwise leave the layout as it is.
- Never auto-delete or publish templates; never delete user projects or assets.
- No dummy tools, fake buttons or fake success messages. Mark anything unfinished as incomplete.
- Destructive SQL and storage deletions need explicit approval. No DNS changes.
