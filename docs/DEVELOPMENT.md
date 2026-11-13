# Magical Touch Creative Studio — development summary

Read this first in every new session. It records what exists, what was
verified, and what is still missing. Keep it current. Last update: 13 Nov 2026.

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

## Studios (parent categories) → tools
The single source of truth is `lib/toolsCatalog.ts`. It drives the header menu, `/tools`, `/create`, the footer and the tool search.

| Studio | Tools (route) |
|---|---|
| Graphic Design & Publishing | Design editor (`/editor`, sizes via `/create`), templates (`/templates`) |
| Apparel & Textile | Jersey (`/custom-jersey-designer`), Polo (`/polo-shirt-designer`), T-shirt (`/custom-t-shirt-designer`) |
| Wallpaper & Wall Design | Wall poster + wallpaper strips + room/rolls calculator (`/wall-designer`) |
| Photo & ID | Photo Studio (`/photo-studio`), Background remover (`/remove-background`), Passport/visa/ID photos (`/passport-photo-maker`) |
| Vector & Illustration | Image Trace (`/trace`). Pen, direct selection and Shape Builder live in the editor |
| Patterns & Colour | Pattern Design (`/patterns`), Rangoli/Mandala (`/rangoli-mandala-maker`), Colour Explorer (`/colours`), Gradients (`/gradient-background-generator`) |
| Print & Production | Print size calculator (`/print-size-calculator`), Print Layout: many-up and booklet (`/print-layout`) |
| Creative & AI | AI Studio (`/ai-studio`). The mockup generator was retired (`/mockups` redirects) |

Tools link to each other:
- Pattern → jersey/polo/T-shirt/wallpaper/editor, through "Latest from Pattern Studio" in the pickers.
- Colours → jersey (`?colors=`), pattern and editor.
- Garments → editor ("Edit in editor").
- "Back to …" (`components/tools/BackChip.tsx` and the `lib/toolsCatalog.ts` trail) returns to the previous tool. The editor's Back does the same.
- A "Save before you leave?" guard (`components/garments/LeaveGuard.tsx`) protects garment work.

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
- **Saved in the browser:**
  - editor drafts in IndexedDB (`lib/editor/draftStore.ts`)
  - the recent local files list in IndexedDB (`lib/mtd/recent.ts`)
  - garment projects in localStorage (`mt:textile-projects`), with autosave per tool (`mt:garment:<kind>`)
  - patterns in localStorage (`mt:patterns`, `mt:pattern-draft`)
- Nothing is uploaded unless the user saves to their account or cloud.

## PDF and export
- **Editor:**
  - vector PDF (`lib/editor/pdfVector.ts`), with fonts embedded through `lib/editor/pdfFonts.ts`
  - SVG export (`lib/editor/svgExport.ts`), which keeps groups and clip paths and inlines pattern tiles as vectors
  - print marks (`printMarks.ts`) and preflight (`preflight.ts`, `PreflightModal`)
  - **Press CMYK PDF/TIFF** (`lib/export/printFiles.ts`) is DeviceCMYK *raster* pages with a FOGRA39 output intent. It is not vector and not verified PDF/X, so never claim PDF/X compliance.
- **Tools:**
  - SVG→PDF converter (`lib/svgToPdf.ts`) for garments, roster print sheets, wallpaper strips and rangoli. All vector.
  - `/print-layout` uses **pdf-lib** to place the customer's own PDF pages as vectors (many-up with bleed, crop marks and a mirrored back; saddle-stitch booklets).

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
