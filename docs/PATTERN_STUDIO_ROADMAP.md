# Pattern Studio

## Live now (`/patterns`, `lib/patterns.ts`, `components/patterns/PatternStudio.tsx`)
- 10 repeat types: grid, brick, half-drop, mirror, rotational, radial, kaleidoscope, geometric (hex lattice), organic, random (seeded, seamless with edge wrapping).
- 14 original motifs + letters + the user's own PNG/JPG/WebP/SVG.
- Controls: tile size, motif scale, rotation, horizontal/vertical spacing, offset, density, symmetry, opacity, outline + line width, motif colours, background, 7 palettes, shuffle.
- “Show tile edges” to check the seams.
- Mockups: cushion (fabric), wallpaper, gift wrap, tote (clothing), notebook (stationery), jar label (packaging).
- Export: full-sheet SVG (vector, uses `<pattern>`), single seamless tile SVG, PNG at post / story / A4 / banner / wallpaper sizes.
- Save patterns on the device; open the pattern as a background in the editor (logged-in; otherwise login then back).
- Unit tests: `e2e/unit/patterns.test.mjs`.

## Next
- Draw a motif with the editor pen, then “Make pattern” from a selection (editor integration).
- Pattern as an editable fill on shapes inside the editor (fabric `Pattern` fill from the SVG tile).
- Accounts: save patterns to the user’s account.
- More mockups (mug, phone case, curtain) with perspective warp.
