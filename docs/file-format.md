# File Format — new engine (`/studio`)

## Document JSON schema (v1)

```jsonc
{
  "version": 1,
  "document": {
    "id": "uuid",
    "name": "Untitled",
    "width": 1200,
    "height": 800,
    "resolution": 72,
    "colorMode": "rgb",
    "background": "#ffffff",
    "createdAt": "2026-09-22T00:00:00.000Z",
    "updatedAt": "2026-09-22T00:00:00.000Z"
  },
  "layers": [
    {
      "id": "uuid",
      "name": "Layer 1",
      "type": "raster",
      "visible": true,
      "locked": false,
      "opacity": 1,
      "blendMode": "normal",
      "x": 0,
      "y": 0,
      "zIndex": 0,
      "fill": "#3fa9e8",
      "pixelDataUrl": null
    }
  ],
  "vectorObjects": [],
  "artboards": [],
  "guides": [],
  "metadata": {}
}
```

Field notes, matched to what's actually implemented in Phase 1:

- `layers[].type` — only `"raster"` exists so far. `"vector"`, `"text"`,
  `"shape"`, `"group"`, `"adjustment"`, `"fill"` are reserved names for
  later phases and must not be written by Phase 1 code.
- `layers[].fill` — a Phase-1-only convenience: a new raster layer is
  seeded with a solid fill color (chosen at creation) so it's visible in
  the canvas and its thumbnail before any paint tool exists to put real
  content on it. This is not a permanent "fill layer" feature (§9) — that
  reserved layer type is unbuilt.
- `layers[].pixelDataUrl` — reserved for when a layer has been painted on
  (Phase 2+); `null` for a Phase-1 solid-fill layer. When present, it's a
  PNG data URL of that layer's own offscreen canvas.
- `vectorObjects`, `artboards`, `guides` — always empty arrays in Phase 1;
  present in the schema now so later phases don't need a format migration
  to add them, only to start populating them.

## IndexedDB storage

Database: `magicaltouch-studio` (version 1)
Object store: `documents`, `keyPath: "document.id"`

`src/editor/core/ProjectStore.ts` exposes:

- `saveDocument(snapshot)` — `put()`s the full JSON above.
- `loadDocument(id)` — `get()`s it back.
- `listDocuments()` — returns `{ id, name, updatedAt }` for every stored
  document, for a future "Open" list.
- `deleteDocument(id)`.

This is entirely local-browser storage. No network request is made and no
claim of cloud sync is made anywhere in the `/studio` UI — the existing
Supabase-backed `designs` table used by the old `/editor` route is a
completely separate system and is not read or written by this code.

## Versioning policy

`version` is bumped whenever a field's meaning changes incompatibly (not
for additive fields). `ProjectStore.loadDocument` will refuse to load a
`version` newer than the running code understands, surfacing an explicit
error rather than silently misinterpreting the data.
