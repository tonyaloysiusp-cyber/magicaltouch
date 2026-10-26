# Template kit

Generates the Collection 500 templates in the editor's own format, with
measured typography (text is fitted with the real font files).

```
# fonts: google/fonts .ttf files for the families used, in one folder
MT_FONT_DIR=/path/to/fonts python3 build.py birthday --out preview.json   # try
MT_FONT_DIR=/path/to/fonts python3 build.py birthday --write              # update the collection + manifest
python3 ../validate_collection500.py
```

- `kit.py` — document, shapes, text measurement and fitting, photo frames, illustrations, decor.
- `common.py` — metallic gradients, overlays, labels, dividers.
- `birthday_a.py` … `birthday_e.py` — one function per template (`@design(n)` = record n).

Previews and thumbnails are rendered with Fabric 5.3 in headless Chromium
(the same engine as the editor): thumbnail 520 px wide, preview 1300 px on
the long side.
