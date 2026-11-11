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

## Next (in order)
1. Paginated server-side gallery search (remove the 5 MB list).
2. Style / composition / palette columns (migration) + filters in the gallery + Creative Universe discovery page.
3. Palette recolouring of templates with contrast protection.
4. Vector engine phase G (direct selection first).
5. Admin production workflow (review statuses, QC checklist).

## Blocked / needs the owner
- GitHub secrets `SUPABASE_DB_URL` and `BACKUP_PASSPHRASE` (backups + schema migrations).
