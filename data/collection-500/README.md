# Collection 500

500 original templates with one design brief and one inspiration reference each.

- `collection500-*.json` (here): the manifest. One record per template: id (`birthday-001`…), title, category, brief, design notes (layout, typography, palette, decor), content, size, preview paths, and `inspiration_reference_url`.
- `public/templates/collection/collection500-*.json`: the editable designs (the editor's own canvas format) with thumbnails and previews next to them.
- `VALIDATION.md`: the latest report from `python3 scripts/validate_collection500.py`.

## About the inspiration links

Every link is a Pinterest **search** for that template's own style, colours and layout, for example
`https://www.pinterest.com/search/pins/?q=minimalist%20cream%20typography%20birthday%20card`.
Pinterest could not be opened from the build environment, so no individual pin was looked at:
`reference_verified` is `false` and `inspiration_pin_url` is empty for every record. An admin can
add a specific pin and mark it verified in **Admin → Templates → ⋯ → Inspiration & brief**.
The designs are original vector compositions; no Pinterest images are used.

## Import (repeatable)

1. Deploy, so the collection file is live.
2. Insert the templates by slug (skips ones that already exist), then the matching rows in
   `template_references` (admin-only table) by slug and `manifest_id` (unique) — rerunning
   never duplicates.
3. Run the validator.
