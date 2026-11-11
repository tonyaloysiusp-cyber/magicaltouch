# Implementation progress

## Done — 11 Nov 2026
- Research + audit documents (this folder).
- Library clean-up: 1,457 clip-art templates hidden and 316 old birthday templates retired (reversible, redirected; backups in `site_settings`); 1,730 duplicates hidden earlier. Published: 5,263.
- New original birthday collection: 15 directions × invitation (5×7, 3 mm bleed, 300 dpi) / post / story = 45 templates (`scripts/templates_kit/birthday_pro.py`, prefix `bdp-`).
- Home page: corporate hero (architecture photo, floating templates, print-spec card) replacing the 6 MB film; studio section redesigned light/corporate.
- Pattern Studio (`/patterns`) — functional, tested.
- Colour Explorer (`/colours`) + colour search API.
- SEO standard: `fitTitle`/`fitDescription`, canonicals, image sitemap, redirects; audit tool.
- Self-opening design files (`.mtd.html`), Tutorials redesign, clean-up of unused code and files (earlier today).

## Done — 11 Nov 2026 (afternoon)
- Hero: self-playing product tour (templates → edit → brand colours → translate → Image Trace → patterns → print export).
- Tools hub (`/tools`) with every creative tool; Tools menu updated.
- Image Trace (`/trace`, `lib/trace.ts`): black & white, line drawing, 2–32 colours, logo mode; SVG/PNG export; “Edit as vectors” opens editable paths in the editor. Unit tested.
- Creative Universe library: 13,320 new templates (`scripts/templates_kit/universe.py`) — 30 industries × 3 fictional brand sets × 12 formats × 12 layout archetypes, plus business cards and letterheads. Thumbnails (640 px WebP) live in Supabase storage bucket `template-thumbs` (keeps the Worker under its static-file limit), copied by the `copy-thumbs` edge function from branch `thumbs-u`. Tagged `universe-2026-11`, `industry-*`, `layout-*`, `brand-set-*`.
- Published library: about 18,580.

## Next (in order)
1. Paginated server-side gallery search (remove the 5 MB list).
2. Style / composition / palette columns (migration) + filters in the gallery + Creative Universe discovery page.
3. Palette recolouring of templates with contrast protection.
4. Vector engine phase G (direct selection first).
5. Admin production workflow (review statuses, QC checklist).

## Blocked / needs the owner
- GitHub secrets `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` (backups + schema migrations).
