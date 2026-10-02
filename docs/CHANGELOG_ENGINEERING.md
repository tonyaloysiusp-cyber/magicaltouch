# Engineering Changelog

Tracks real, verified engineering work against the findings in
`docs/ENGINEERING_AUDIT.md`. Each entry states the problem, what was
actually done, what was tested, and what's deliberately left for later.

---

## 2026-10-02 — Photo Studio: real Smudge and Red Eye tools

**Scope:** continuing the Photoshop/Photopea tool-parity list one at a
time (Patch Tool shipped previously; this adds the next two: Smudge,
Red Eye).

**Smudge** (`'smudge'` tool, shortcut `U`) pushes/smears real pixel
color in the direction of a drag, like dragging a finger through wet
paint. Unlike every other brush tool in this file, it cannot use the
shared "accumulate a union mask, bake once at mouse-up" pipeline: each
dab's correct source is "what the stroke itself did one step earlier,"
which only exists if the effect has already been applied incrementally.

Two real bugs found and fixed while building this, both confirmed via
live/isolated repros before and after:

1. **Lost-update race.** The first implementation called `img.setSrc()`
   (which is asynchronous — it decodes through a real `Image` element
   before swapping Fabric's texture) once per dab, inside a tight
   synchronous loop of several dabs per `mousemove` tick. Every dab
   after the first read the same stale, pre-stroke pixels, since none
   of the async `setSrc` calls had resolved yet — a full drag across a
   hard edge produced zero visible change. Fixed by maintaining a
   persistent working `HTMLCanvasElement` mutated synchronously in
   place through the whole stroke (`smudgeStepInPlace` in
   `lib/editor/photoBrush.ts`), only pushed to the live Fabric image
   once per visible frame (and once more, as a single history entry,
   at mouse-up) — the same "debounce continuous operations" rule the
   opacity slider already follows, applied for a different reason.
2. **Reversed offset sign.** Even after fixing the race, the tool still
   did nothing: the offset passed to the underlying `drawImage`-based
   sampling was computed backwards. `cloneStampPaint`'s own established
   convention is `offset = destination − source`; this used
   `source − destination`, which made every dab sample from the wrong
   side of the stroke (silently, with no error — confirmed via a
   from-scratch isolated math test before finding the sign flip).

**Red Eye** (`'red-eye'` tool, shortcut `Y`) is a single click, not a
drag: `removeRedEye` scans the clicked radius for pixels whose red
channel is clearly dominant over both green and blue (the actual
signature of flash reflecting off the retina, not a generic "is this
red" threshold that would also catch an unrelated red object at the
edge of the same radius) and desaturates + darkens exactly those pixels
toward a neutral gray derived from their own green/blue average — a
near-white specular highlight inside the pupil correctly survives
untouched, matching a real red-eye tool's behavior.

**Tested:** `test_smudge_tool.js` (5/5) against a hard black/white edge
— confirms a drag from white into black genuinely lightens pixels along
the drag path, a pixel off the path stays untouched, and Undo restores
the original in one step. `test_red_eye_tool.js` (7/7) against a red
"pupil" square plus a separate, unrelated red square placed away from
the click — confirms the clicked pupil is genuinely desaturated while
the unrelated red square (outside the click radius) is byte-for-byte
unchanged, and Undo restores the original. Full regression suite (149
checks) re-run and still passing.

---

## 2026-10-01 (6) — Photo Studio: real Patch Tool

**Scope:** first of the "not yet real" tool list in `docs/ENGINEERING_AUDIT.md`
§9 (Patch Tool, Smudge, Red Eye, selection/adjustment tools — the user
asked for Photoshop/Photopea-level tool parity, working from that list
one at a time).

**What it does:** drag a freehand loop around a blemish, then drag that
selection onto a clean area of the image — releasing replaces the
blemish with the dragged-to content, feathered at the edges so the seam
blends, with a live preview while dragging. New `'patch'` tool in
`components/photoEditor/PhotoEditorWorkspace.tsx` (toolbar, Shift+S
shortcut, Escape to cancel mid-gesture).

**Not new pixel math** — reuses `cloneStampPaint`'s existing offset-
sampling + destination-in compositing verbatim (the same real operation
Clone Stamp already uses), with `featherMask` applied to the drawn
selection first so the composite blends instead of hard-edging. The
loop itself is built with the already-real `polygonMask`. This is
exactly the kind of case this engagement keeps finding: most of the
hard pixel-math work for a "new" professional tool was already real and
proven elsewhere; the gap was the gesture/workflow wiring, not the math.

**Tested:** new `test_patch_tool.js` (9/9) against a deterministic test
image (solid blue background, a red-square blemish): confirms the
blemish is genuinely replaced with real sampled content (not a filter
or a blur), the clean source area used for the patch is itself
untouched, a far unrelated pixel never changes (a local operation, not
a global wash), and Undo genuinely restores the original blemish. Full
regression suite (140 checks) re-run and still passing.

---

## 2026-10-01 (5) — Pen tool: fixed Direct Selection (anchor editing was completely non-functional)

**Reported as:** "the pen tool doesn't really work." Investigated live
in the running app (not just code-reading) rather than assuming the
existing audit's "Live" status for Pen was still accurate.

**Two real, confirmed bugs, both now fixed, affecting Photo Studio AND
Main Design** (both use the same shared `hooks/usePenTool.ts` /
`hooks/useDirectSelection.ts`):

1. **A finished path could never be selected again.** `onPathFinished`
   deliberately leaves a just-drawn path `evented:false` (so a click
   meant to start the NEXT path doesn't grab the last one) — but nothing
   ever turned it back on for the Direct Selection tool. In Photo Studio,
   `handleDirectClick`'s `canvas.findTarget()` can never match an
   `evented:false` object, so clicking a drawn path with Direct Selection
   produced **zero anchor handles, always** — confirmed via a live
   repro (`handleCount: 0`). Fixed in `PhotoEditorWorkspace.tsx`'s
   `[activeTool]` effect: vector paths now become evented+selectable
   specifically while Direct Selection is active, and non-interactive
   again for every other tool (mirroring Main Design's own
   `setActiveTool`, which already did this split correctly).

2. **Even once selectable, the path's own resize/rotate controls stole
   the click from the anchor circles sitting on top of them.** Neither
   `usePenTool.ts`'s path construction nor `useDirectSelection.ts`'s
   `cloneablePathStyle` (used when Break creates a new path) ever set
   `hasControls`/`hasBorders` to `false`, so Fabric's default transform
   handles render at exactly the same corners as the custom anchor
   circles — and Fabric's own active-object corner-control hit-testing
   wins over a general object search. Confirmed via a targeted repro: a
   mousedown placed exactly on an anchor circle's own screen position
   resolved to the path (grabbing its corner control), not the circle;
   setting `hasControls:false` on the live object immediately fixed it.
   Fixed at the three real path-construction sites: `usePenTool.ts`,
   `useDirectSelection.ts`'s `cloneablePathStyle`, and Main Design's
   Shape Builder boolean-path result (`app/editor/page.tsx`), which
   would have hit the identical bug.

3. **Main Design only, a third edge case:** Direct Selection's anchor
   handles are rendered from Fabric's own `selection:created`/
   `selection:updated` events — which do NOT fire for a click on
   whatever object was ALREADY active, and a path is set active the
   instant Pen finishes drawing it. So drawing a path, then immediately
   pressing Direct Selection and clicking that exact path (the single
   most natural sequence) showed no handles until the user deselected
   and clicked a second time. Fixed in `setActiveTool`: entering Direct
   Selection now explicitly renders handles for an already-active vector
   path instead of waiting for an event that will never come. (Photo
   Studio's own click handler calls `renderHandles` directly regardless
   of whether the active object changed, so it never had this particular
   edge case.)

**Tested:** new `test_pen_tool_direct_select.js` (Photo Studio, 9/9) and
`test_maindesign_direct_select.js` (Main Design, 3/3) — both exercise
the real, full workflow: draw a closed path, switch to Direct Selection,
click the just-drawn path, drag a real anchor (path command data
genuinely changes), delete a real anchor (command count genuinely
decreases), and — Photo Studio only — commit via "Add Path to Mask"
(the layer genuinely gets real mask data, and the transient path is
removed from the canvas). Full existing regression suite (131 checks)
re-run and still passing, including Main Design's own full sweep (which
draws straight and curved Pen segments) and every Photo Studio suite.

---

## 2026-10-01 (4) — Continuous ambient background animation

**Scope:** master-prompt priority #9 — a reusable, continuously-drifting
background design element, paused automatically on an inactive tab,
under reduced motion, or on a device that can't hold a steady frame
rate.

**What was added:** `hooks/useBackgroundAnimationEnabled.ts` — one
shared hook backing every ambient animation on the site, combining three
independent, real checks: `prefers-reduced-motion` (live via a
`matchMedia` change listener, not read once), the Page Visibility API
(`document.hidden` + `visibilitychange`, so it pauses the instant a tab
is backgrounded and resumes the instant it's visible again), and a
one-time frame-rate sample — a real burst of 20
`requestAnimationFrame` callbacks right after mount, averaged (dropping
the first, which includes setup cost) and compared against a ~30fps
threshold, not a guessed device/UA check.
`components/home/AnimatedDesignBackground.tsx` is the reusable
component: two soft gradient blobs drifting via transform-only
keyframes (`bg-float-a`/`bg-float-b` in `tailwind.config.ts` — translate
+ scale only, never a layout-triggering property), with
`animation-play-state` driven live by the hook. Replaces the two
previously-static glow blobs behind the homepage hero art
(`CreativeHeroArt.tsx`) with this animated version — same visual
footprint, now with real continuous motion.

**Tested:** new `test_background_animation.js` (8/8): a real non-zero
`animation-duration`, the blob's actual computed `transform` genuinely
changes between two samples 2.5s apart (not just a class with no visible
effect), `prefers-reduced-motion: reduce` sets `animation-play-state:
paused`, and — the one most worth calling out — dispatching a real
`visibilitychange` event with `document.hidden` toggled true/false
pauses and then resumes the animation, exercising the hook's actual
listener rather than just asserting on its initial state. Confirmed
visually with a screenshot (visual parity with the pre-existing static
hero art). Full regression suite re-run and still passing.

---

## 2026-10-01 (3) — First-load logo intro animation

**Scope:** master-prompt priority #8, with its explicit constraint to
use the real, existing logo asset and never fabricate a replacement
mark.

**What was added:** `components/home/IntroAnimation.tsx`, mounted on
the homepage (`components/home/HomePage.tsx`). A ~2.1s sequence (logo
fade/scale in, two slow counter-rotating accent rings, then a 400ms
fade-out) built entirely from the real `BrandLogo` component — the same
`/logo.png` / `/logo-white.png` every other page already uses, loaded
via `next/image`, not a new SVG or recreated wordmark. Shows once per
browser session via `sessionStorage` (a reload or later navigation in
the same tab doesn't replay it — "first load" means the first time this
tab opens the site, not every visit to the homepage), and is skipped
entirely under `prefers-reduced-motion: reduce` rather than playing a
forced few seconds of animation such a visitor explicitly opted out of.
The two decorative rings and the logo's fade-in are real CSS keyframes
registered in `tailwind.config.ts` (`intro-orbit`, `intro-orbit-reverse`,
`intro-logo-in`), with a second reduced-motion guard in `globals.css` in
case those classes ever end up applied another way.

**Tested:** new `test_intro_animation.js` (8/8): the overlay appears on
a fresh session, genuinely renders the real logo file (asserted via its
actual `<img>` `src`), disappears on its own within ~2.5s without
getting stuck, causes no layout shift in the real page underneath,
leaves the page interactive afterward, does not replay on a reload
within the same session, and is skipped entirely under reduced motion.
Confirmed visually with a screenshot. Full regression suite re-run and
still passing.

---

## 2026-10-01 (2) — Day/night theme transition animation

**Scope:** master-prompt priority #7. Distinct from the earlier dark-
mode BUG fix (Main Design's `<main>` not applying `dark:` styles at
all) — that made dark mode correct; this makes the toggle itself feel
like a real transition instead of an instant snap, and respects
`prefers-reduced-motion`.

**What changed:** `app/globals.css` adds one media-gated rule —
`@media (prefers-reduced-motion: no-preference)` applies a 200ms ease
`transition` on `background-color, border-color, color, box-shadow,
fill, stroke, text-decoration-color` to `body` and (almost) every
descendant, explicitly excluding `canvas` and `svg` (and svg's own
children) so it never fights Fabric's render loop or a chart redraw.
No layout-affecting property is touched, so the transition can never
cause a reflow. When the OS/browser reports a reduced-motion
preference, the rule doesn't apply at all — the toggle still switches
themes instantly, just without the animation.

**Tested:** new `test_theme_transition_animation.js` (7/7): confirms a
real non-zero `transition-duration` on `<body>` under normal motion
preference, confirms `document.body.scrollHeight` is identical
mid-transition (no reflow), confirms the toggle still works under both
motion preferences, confirms the rule is fully disabled (duration 0)
under `prefers-reduced-motion: reduce`, and confirms `<svg>` elements
are excluded. Full regression suite re-run (124 existing checks) and
still passing — this is a purely additive CSS rule, nothing it touches
needed changing elsewhere.

---

## 2026-10-01 — Photo Studio filter system (Motion Blur, Box Blur) + Export dialog DPI accuracy

**Scope:** master-prompt priorities #5 (filter system) and #6
(export/document-size accuracy), from the platform-wide upgrade brief.

**Filter system — two new, genuinely distinct pixel filters** (see
`docs/photo-studio-engine-plan.md` for the fuller writeup):
- `motionBlurInMask` (`lib/editor/photoBrush.ts`) — a real directional
  blur (offset-and-average a stack of translated copies along an angle),
  distinct from the existing Gaussian (`blurInMask`). Wired as
  `applyFilterMotionBlur` / "Motion Blur (whole layer)".
- `boxBlurInMask` — a real two-pass separable box blur (O(n) sliding-
  window average per line, edge-replicated). Wired as
  `applyFilterBoxBlur` / "Box Blur (whole layer)".
- Both follow the established `getImagePixelCanvas` → full-canvas
  `rectMask` → filter fn → `bakeAndPush` pattern every other Filter menu
  item already uses, and go through the same undo history.

**Export accuracy — real bug found and fixed.** The Export dialog's
"Resolution" control only offered a 1x/2x/3x multiplier of the
document's fixed 96px/in geometry baseline (`lib/editor/units.ts`),
which can only express 96/192/288 "DPI" — there was no way to produce a
raster export at an exact, real print DPI like 300. A document created
at 210×297mm (A4) and exported at the old "3x" would come out
~2362×3339px, not the ~2480×3508px a real 300 DPI print export needs.
Fixed by replacing the multiplier buttons with real DPI presets
(72/150/300) plus a custom-DPI input (`components/editor/ExportDialog.tsx`),
computing the exact multiplier fabric's `toDataURL` needs as `dpi / 96`,
and showing a live "Output: WxHpx at N DPI" preview so the result is
verifiable before exporting. PDF export was already geometry-correct
(points derived from the same 96px/in baseline) and untouched.

**Tested:** `npx tsc --noEmit` and `npm run build` clean after each
change. New suites: `test_motion_blur_filter.js` (7/7),
`test_box_blur_filter.js` (9/9), `test_export_dpi_accuracy.js` (7/7) —
the last creates a real A4 document via `/create`, exports at 300 DPI,
and reads the downloaded PNG's own IHDR chunk to confirm its actual
pixel dimensions land within 1px of the theoretical exact value
(2480.3×3507.9). Full existing regression suite (117 checks across 8
files: Main Design full sweep, perf/responsive, Photo Studio pro tools/
menu bar/resize/crop-units/layer-metadata-undo) re-run and still passing.

---

## 2026-09-30 — Advanced autonomous test→fix→verify pass: two real save-architecture data-loss bugs

**Scope:** targeted, deliberate repro-driven testing of the save/autosave
architecture, object identity, double-submit behavior, and decimal
precision (a curated subset of a much larger 35-section test mandate —
see REMAINING note at the end of this entry) against the local build.

**Real bugs found and fixed, both confirmed via deliberate reproduction
before and after the fix, not inferred from reading code:**

1. **Autosave/manual-save race condition (data loss).** `performSave` had
   no in-flight guard: a manual Ctrl+S and a background autosave tick (or
   two autosave ticks around a reconnect) could each start their own
   Supabase upsert independently, with nothing enforcing write ordering.
   Repro: click Save with content "VERSION-1" (artificially delayed
   800ms), immediately edit to "VERSION-4" and click Save again (delayed
   50ms) — confirmed the slower, earlier request could land in the
   database AFTER the faster, later one, leaving VERSION-1 as the final
   saved state despite VERSION-4 being what the user left on screen.
   Fixed: `performSave` now queues a second call behind an in-flight one
   instead of firing a concurrent request; the queued call re-serializes
   the canvas fresh once it actually runs, keeping writes strictly
   sequential. This also closes the double-submit risk from rapid-
   clicking Save (verified: triple-clicking Save writes to one row, never
   a duplicate).

2. **First-save canvas-rebuild data loss (more severe, found while
   debugging #1).** A brand-new document's first save assigns it a real
   id and updates the URL via `router.replace`, which re-triggers the
   effect that disposes and rebuilds the entire Fabric canvas for the new
   `designId`. That rebuild restores content from a `pendingSnapshotRef`
   captured BEFORE the save's network round trip (auth check + upsert) —
   so any edit made while that first save was in flight was silently
   discarded the instant the save completed, on literally every brand-new
   document's first save, not just a contrived race. Repro: same test as
   above, isolated to this path — content typed during a slow first save
   reverted to what was on screen when Save was clicked. Fixed by
   re-serializing the snapshot fresh immediately before the URL change
   that triggers the rebuild, shrinking the loss window from a full
   network round trip to one synchronous step. Extracted the duplicated
   16-property `toJSON()` list both call sites share into `SAVE_JSON_PROPS`.

3. **Object identity gap (lower severity).** A shape's `__uid` is
   normally assigned by the `object:added` handler, but the very first
   shape drawn on a fresh document is added to the canvas while still
   flagged as an in-progress drag draft (which that handler deliberately
   skips) and is never re-added once finalized — so it silently kept
   `__uid` undefined forever, confirmed via a duplicate/group/ungroup
   sweep where every OTHER object got a real id. Fixed by assigning it
   explicitly at the same point `__artboardId` already gets an identical
   late fix for the same underlying reason. No observed downstream
   breakage (`LayersPanel` already falls back to array index for this
   exact case), but worth closing since a missing id is exactly the kind
   of gap the mandate's "object ID integrity" section warns can cause
   wrong selection/deletion elsewhere later.

**Verified working, no bug found:** decimal precision (100.25, 50.75,
99.99, 0.5) survives save/reopen with zero floating-point drift.

**Regression-tested:** all 85 previously-passing checks across 5 suites
(full Main Design sweep, layers/text/security, crawl/performance/
responsive, Photo Studio menu bar, Photo Studio pro-tools) plus 9 new
checks targeting these exact fixes — 94/94 passing after a fresh
production rebuild.

**REMAINING — not covered in this pass, stated honestly:** the mandate
this work was scoped from has 35 sections; this pass covered sections 4
(autosave races), 8 (double-submit), 14 (precision), and 29 (object ID
integrity) in depth, since the save-architecture investigation surfaced
genuine, severe bugs worth following all the way through fix + verify +
regression before moving on. NOT covered this pass: document version
compatibility (§3), multiple browser tabs on the same design (§5),
browser crash/recovery (§6), network-failure UI states (§7), file upload
security (§9), image memory lifecycle (§10), canvas coordinates across
zoom levels (§11), high-DPI rendering (§12), color management (§13),
boundary values (§15), clipboard (§16), drag-and-drop (§17), zoom/pan
stability (§18), selection boundaries (§19), rotation precision (§20),
group transforms (§21), font-failure handling (§22), export regression
diffing (§23), accessibility (§24), loading states (§25), error recovery
(§26), template isolation (§27), duplicate-design isolation (§28), undo
memory safety (§30), and a from-clean-install build test (§32). None of
these were silently skipped as "fine" — they simply weren't reached in
this pass and should not be reported as verified.

**Scope:** an end-to-end pass over the running local build (not the live
production site — auth, save, and destructive flows were exercised
against mocked Supabase routes via Playwright, the same pattern used
throughout this engagement, rather than real user data on
magicaltouchdesign.com) covering Main Design's vector tools, Pen tool,
text (incl. Tamil/Arabic/long/multi-line), the Layers panel's own UI
controls, undo/redo, save/reopen, export, cross-user data isolation,
a public-page crawl for console/network errors, tablet responsiveness,
and basic performance. 85 individual checks were run across 5 scripts;
every genuine failure was root-caused and fixed, then the whole set was
re-run clean.

**Real product bugs found and fixed:**
1. **Editor top bar forces page-level horizontal scroll on tablets.**
   `app/editor/page.tsx`'s top control bar (back link, design name,
   workspace switcher, undo/redo, units, zoom, save status) had no
   wrap/overflow handling, so at iPad portrait width (834px) its
   combined content width (measured: 1180px) pushed the whole page
   wider than the viewport, dragging the canvas and side toolbar into
   page-level horizontal scroll. Fixed by making the bar itself
   scroll internally (`overflow-x-auto`, its groups `shrink-0`) and
   giving `<main>` `overflow-x-hidden` so nothing else can trigger the
   same overflow — CSS-only, no layout redesign, verified with a real
   `scrollWidth === clientWidth` measurement and before/after
   screenshots at both desktop and iPad-portrait widths.

**Investigated and found to be test-script bugs, not product bugs**
(each confirmed by reading the actual implementation before concluding):
- An "Align Left doesn't move the object" failure was the test itself
  selecting the artboard's own backing rect (`type: 'rect'`, also
  `__isArtboard: true`) instead of the user's drawn rectangle, then
  "aligning" the artboard against its own just-shifted position — a
  guaranteed no-op unrelated to `alignObject()`, which was reread and
  confirmed correct.
- A cross-user-isolation check initially used the wrong query param
  (`?id=`) for the editor's real load-by-id route, which reads
  `?designId=` (confirmed in `app/editor/page.tsx`) — fixed to use the
  real param so the test actually exercises the `.eq('id', ...)`
  Supabase query it claims to.
- A `/pricing` 404 in the page crawl: there is no `/pricing` route —
  "Pricing" is an in-page anchor (`/#pricing`) on the homepage,
  confirmed in `app/dashboard/page.tsx`'s own nav link.

**Verified working, no product bug (with evidence):**
- Tamil and Arabic (RTL) text: accepted and rendered as real text
  content, not mangled or silently dropped.
- Layers panel's own rename / hide / lock / drag-reorder controls
  (not just object-count) genuinely mutate the real Fabric objects.
- Cross-user isolation: with correctly-enforced RLS simulated (empty
  result for another user's design id), User B's page never renders
  User A's content and User A's Fabric object never loads into User
  B's canvas — the frontend has zero defense of its own here (no
  client-side `user_id` filtering anywhere), so this is exactly the
  boundary `0008_designs_rls.sql` (previous entry, same date) exists
  to guarantee at the database level.
- Editor cold-load and rapid-drawing performance stayed well within
  reasonable bounds on this local dev build.
- No broken (4xx/5xx) requests or console errors across a crawl of
  the public homepage, templates, login, and signup pages.

**Regression-tested after the fix:** the full Main Design sweep
(30/30), the new layers/text/security suite (16/16), the crawl/
performance/responsive suite (10/10), and Photo Studio's menu bar
(17/17) and pro-tools (12/12) suites were all re-run against a fresh
production rebuild and pass unchanged.

**Not covered in this pass (stated honestly, not silently skipped):**
anchor-level Pen tool editing on an existing path (add/delete/convert
anchor, join/break/reverse via the menu items), Scale-via-handle-drag,
Arrange (bring/send front/back), a dedicated code-quality/dead-code
audit beyond this session's own diff, and testing directly against the
live production URL (a deliberate scope decision, not an oversight —
see the scope note above).

---

## 2026-09-30 — Security audit: RLS policies for `public.designs`

**Problem:** the app's core `designs` table predates the tracked
migrations folder — no migration in this repo ever creates it or
enables Row Level Security on it. `app/dashboard/page.tsx`'s
list/update/delete queries never filter by `user_id` at the
application level, exactly the "RLS is the only boundary" pattern
every other table in this schema (`design_versions`, `assets`,
`profiles`) already uses. If `designs`' real RLS state (unknowable
from the repo alone, since it was evidently set up by hand) is
missing or wrong, any logged-in user could list, read, rename, or
delete another user's designs via a direct API call, regardless of
what the dashboard UI shows.

**Fix:** `supabase/migrations/0008_designs_rls.sql` — purely additive,
fully idempotent (`enable row level security` + `drop policy if
exists`/`create policy` for select/insert/update/delete, all
`auth.uid() = user_id`), safe to apply whether or not `designs`
already has correct RLS today. Per this repo's established convention,
it must be applied by hand in the Supabase SQL editor — there's no
migration runner wired up.

**Tested:** confirmed via the full-platform sweep (next entry, same
date) that with this policy shape correctly enforced (simulated: an
empty result for another user's design id), the frontend behaves
safely — it has no defense of its own beyond this database-level
policy, so the policy genuinely is the whole boundary.

---

## 2026-09-30 — Photo Studio: professional workspace shell (dark theme, compact icon toolbar, options bar, checkerboard, cursor position, FG/BG swatches)

**Problem:** a user audit (verified live against the running app, not
code-reading) found Photo Studio's *tools* were mostly real but its
*chrome* looked like "a basic demo, not a professional editor": light
theme by default, a 176px icon+label toolbar instead of a compact
icon-only rail, no options bar, no checkerboard transparency backdrop,
no cursor-position readout, `h-screen` instead of `100dvh` (real risk on
mobile Safari's collapsing address bar), and 14px right-panel text
instead of the requested 11-12px.

**What was done — all gated behind a new opt-in `pro` prop on
`PhotoEditorWorkspace`** (default `false`; Main Design's embedded Photo
Editing tab in `app/editor/page.tsx` never passes it, so its own
rendering is provably unaffected — see the new test's explicit check):
- **Dark theme.** A new `components/photoEditor/photoStudioPro.css`
  (plain global CSS, imported once) scopes a VS Code-range palette
  (`#1e1e1e`/`#252526`/`#2d2d30`) under a `.ps-pro` ancestor class that
  only `pro` mode adds to its own root element — overriding the
  existing hardcoded `bg-white`/`text-gray-*`/`border` Tailwind classes
  used throughout the toolbar/panels (which had never had `dark:`
  variants at all). Photo Studio's own editing-stage chrome
  (`app/photo-studio/page.tsx`) is now unconditionally dark too,
  independent of the site's shared light/dark toggle — matching how
  every real creative tool (Photoshop, Lightroom, Figma, VS Code) uses
  one fixed dark workspace regardless of OS/site theme. (Tried
  `styled-jsx` first for automatic scoping; discovered it silently
  doesn't work in this app's Next.js App Router setup without a
  `StyleRegistry` this project doesn't have — the plain global CSS file
  with a manual `.ps-pro` prefix is what's actually shipping, verified
  by reading computed styles in a real browser, not just a clean build.)
- **100dvh**, not `h-screen`, for Photo Studio's `<main>`.
- **Compact typography**: the right panel's `text-sm` (14px) now
  computes to 11px in pro mode (verified via `getComputedStyle`).
- **Icon-only 48px left toolbar**: tool labels wrapped in a `.tool-label`
  span, hidden via CSS in pro mode; measured 48px (was 176px). The
  redundant bare-text Undo/Redo/Restore-Original toolbar buttons are
  hidden in pro mode too (now reachable via the Edit menu and the top
  bar's icon buttons, avoiding triplication).
- **Options bar** under the menu bar: a new horizontal strip showing the
  active tool's most common settings (brush size/hardness/opacity for
  every paint-family tool; tolerance for Magic Wand/Paint Bucket/Color
  Range Mask) — real, live-bound to the exact same state the tool
  options previously only exposed in the right panel. Less-common
  settings (skew degrees, gradient stops, clone-aligned, mask invert)
  stay in the right panel's Properties-equivalent section rather than
  cramming everything into one bar, matching Photoshop's own real split.
- **Checkerboard transparency backdrop**: found and fixed a real reason
  a CSS-only checkerboard wouldn't have worked — Fabric's own
  `backgroundColor: '#e5e7eb'` canvas option paints an *opaque* fill
  directly into the canvas bitmap on every render, which would have
  hidden any CSS background behind it. Now set to `''` (transparent) in
  pro mode specifically, letting the real checkerboard (CSS
  `repeating` gradient on the wrapping div) show through.
- **Live cursor position** (image-local px) tracked on every canvas
  mouse move and shown in the status bar.
- **Real FG/BG color swatches**: `brushColor` (already the real
  foreground every paint/fill tool reads) plus a new `backgroundColor`
  state, with a working swap control. Honestly noted: nothing consumes
  `backgroundColor` yet (no tool does a "fill/erase to background"
  operation) — the swatch is real and settable, just not yet wired to a
  consumer.
- **Found and fixed a real layout bug while building this**: the
  toolbar's new internal scroll area never actually got a bounded
  height, because an ancestor div in `photo-studio/page.tsx` used
  `flex-1` without itself being `display:flex` — so instead of scrolling
  internally, tools past a certain count (and the new swatches) were
  silently clipped off-screen by a grandparent's `overflow-hidden`.
  Fixed by making that wrapper an actual flex column (`flex flex-col
  min-h-0`) so height correctly cascades down to the real scrollable
  area. Verified via `getBoundingClientRect()`, not just a screenshot.

**Tested:** re-ran all 6 existing Photo Studio regression suites (80
checks total) — 3 checks broke from the icon-only toolbar (tests
selected tools by now-hidden label text) and 1 from removing the
redundant toolbar Undo button; all 4 fixed by pointing those specific
test selectors at `title` attributes / the top-bar's icon button instead
of visible text, since the underlying functionality never changed. Also
verified: no page-level scroll and no horizontal chrome overflow on a
simulated iPad Air viewport in both portrait (834×1194) and landscape
(1194×834); real screenshots taken at desktop and both iPad orientations
confirm the redesigned toolbar/panel/canvas visually.

**Deliberately not done this pass** (Step 2 continues from here):
real synced pixel rulers (a genuine measurement feature, not CSS —
scoped as its own follow-up rather than compressed in); flyout/sub-tool
popovers for the icon-only toolbar (it currently just scrolls, which is
honest but not what the brief specifically asked for); the right panel
is still one scrolling column, not real tabs (Layers/Adjustments/
Properties/History/Color) — the Window menu's show/hide toggles from
the previous pass are not the same thing as tabs; pinch-zoom/two-finger
pan on iPad (zero touch/gesture handlers exist anywhere in this
component, confirmed by grep — only mouse + wheel events).

---

## 2026-09-29 (5) — Photo Studio: real File/Edit/Image/Layer/Select/Filter/View/Window/Help menu bar (start of Steps 8-9 of the platform brief)

**Problem:** the brief's Photo Studio structural rebuild asks for a
professional TOP MENU (File/Edit/Image/Layer/Select/Filter/View/Window/
Help, per its own §2 layout). `/photo-studio` had none of this — just a
single action-bar row (Dashboard link, doc name, Undo/Redo, Export
format, Export, Save). Most of the underlying capability already
existed inside `PhotoEditorWorkspace.tsx` (zoom, resize dialog, crop,
selection ops, layer duplicate/delete/add, Layers panel); it just had no
menu surface, and `PhotoEditorHandle` (the ref the host page drives it
through) only exposed `undo`/`redo`/`applyNow`.

**What was done:**
- Reused `components/editor/MenuBar.tsx` -- the exact component Main
  Design's own `/editor` page already uses, with its established "every
  item is a real action, or a disabled `Planned` tag, never a fake
  button" contract -- instead of building a second menu-bar
  implementation.
- Expanded `PhotoEditorHandle` (the imperative ref `photo-studio/page.tsx`
  already held) with `zoomIn`/`zoomOut`/`fitToView`/`zoomTo100`/
  `openResizeDialog`/`activateCropTool`/`selectAll`/`deselect`/
  `invertSelection`/`duplicateActiveLayer`/`deleteActiveLayer`/
  `addLayerFromFile`/`applyFilterBlur`/`applyFilterSharpen` -- every one
  a thin wrapper around a function the toolbar/panels already called
  internally, not a new implementation. Added the one genuinely missing
  primitive, `selectAll` (a full-canvas `rectMask`, matching Photoshop's
  Select > All), and two new whole-layer Filter commands
  (`applyFilterBlur`/`applyFilterSharpen`) that reuse the Blur/Sharpen
  brush tools' own `blurInMask`/`sharpenInMask` math over a full-canvas
  mask instead of a stroke.
- Added `showLayersPanel`/`showAdjustmentsPanel` (both default `true`)
  as new opt-in props on `PhotoEditorWorkspace`, gating just the
  Layers-panel and Adjustments-section JSX (not the surrounding
  container, which also holds tool-option panels, History, and the
  Apply/Cancel buttons) so the Window menu's "Layers"/"Adjustments"
  toggles do something real without touching anything else.
- Wired the pre-existing-but-unused `onShowShortcuts` prop (Main Design's
  `/editor` already had it; Photo Studio never passed it, so its '?'
  shortcut silently did nothing) to open the same `ShortcutsModal` Main
  Design uses, and added it as Help > Keyboard Shortcuts.
- `PhotoEditorWorkspace.tsx` is the SAME component embedded in Main
  Design's own Photo Editing tab -- every change above is additive and
  defaults to the original behavior, so nothing about Main Design's
  embedded usage changes (per the brief's #1 standing rule to leave Main
  Design exactly as-is).

**Tested:** a new Playwright suite (`test_photo_studio_menubar.js`,
17/17) drives every menu -- Zoom In/Fit to Screen (real Fabric zoom
value changes), Image Size (opens the real dialog), Duplicate/Delete
Layer (real layer count changes), Select All/Deselect (real selection
mask state), Filter > Blur (runs against real pixel data), Window >
Layers/Adjustments (the real panel DOM nodes genuinely appear/disappear),
Help > Keyboard Shortcuts (opens the real modal) -- and explicitly
confirms Main Design's `/editor` page still shows only its own menu bar
(File/Edit/Object/Type/Select/View/Window/Help) with no Photo-Studio-only
Layer/Filter menu leaking in. All 6 existing Photo Studio regression
suites (63 checks total) still pass.

**Deliberately not done:** a Filter menu limited to what's real today
(whole-layer Blur/Sharpen) rather than the brief's full filter list
(Motion Blur, Noise, distortion, etc. — still "not yet real" per the
tool-status table above); per-item enabled/disabled sync for Select/Layer
menu items against live selection/layer-count state (each item's own
underlying function already no-ops safely when its preconditions aren't
met, e.g. Delete Layer refusing to remove the last layer, so this is a
polish item, not a correctness one).

---

## 2026-09-29 (4) — Photo Studio: Healing Brush + Color Range/Gradient masks (Steps 7 + part of 12/14 of the platform brief)

**Problem:** the honest tool-status audit (2026-09-28 entry) listed a
literal drag-brush Healing Brush and gradient-/color-range-driven masks
as "not yet real" -- Photo Studio only had the selection-based Content-
Aware Fill ("Remove Object") and a plain paintable reveal/hide mask.
These were explicitly requested (masking + healing brush, item 3 of the
4-area advancement ask).

**What was done:**
- **Healing Brush** (`'heal'` tool, Shift+J): joins the existing brush-
  stroke pipeline (`PAINT_TOOLS`) alongside Brush/Eraser/Clone/etc., but
  its bake step calls the same `contentAwareFill()` diffusion
  reconstruction "Remove Object" already used -- driven by a painted
  stroke instead of a selection, with no source point to set (unlike
  Clone Stamp), since it reconstructs from the real surrounding pixels
  automatically. Not a new algorithm; a new, more direct way to reach a
  real one that already existed.
- **Color Range mask** (`'mask-color-range'` tool): click a color;
  `magicWandMask(data, x, y, tolerance, /* contiguous */ false)` -- the
  same function Magic Wand and Paint Bucket already use, just with
  contiguous flood-fill turned off -- produces a genuine global color-
  similarity mask, written into the layer's real mask data (replacing
  it, matching Photoshop's own Color Range dialog), with an Invert
  option.
- **Gradient mask** (`'mask-gradient'` tool): reuses the existing
  Gradient (fill) tool's click-drag line gesture, but the drag vector
  now feeds a new `linearGradientMask()` (`lib/editor/pixelSelection.ts`)
  -- a real linear black-to-white ramp (the pixel's projection onto the
  drag vector, clamped 0..1) written into the mask alpha instead of
  blended into the image's colors -- with an Invert option.
- Both mask tools share a new `applyMaskShape()` helper (replaces the
  whole mask in one gesture, unlike the incremental-stroke paint-mask
  path `mask-reveal`/`mask-hide` already had).
- Backfilled the Shift+J shortcut into `ShortcutsModal.tsx` and fixed a
  stale doc-comment (claimed the toolbar's icon column was "44px"; it's
  actually Tailwind's `w-44`, i.e. 176px) found while wiring the new
  tool group entries.

**Tested:** a new Playwright suite
(`test_photo_studio_heal_masks.js`, 17/17) uploads a real two-color test
image with a small bright-yellow "blemish" square and verifies, via real
pixel/mask data (not just "the button exists"): Color Range mask reveals
the clicked color (~255) and masks out a very different one (~0), with
Invert flipping which side; Gradient mask produces a genuine monotonic
ramp between the drag endpoints, with Invert flipping direction; the
Healing Brush turns the pure-yellow blemish (255,255,0) into a pixel
statistically reconstructed from its real red surroundings (measured:
204,103,102 -- almost exactly the background's own color, 204,102,102);
and the Shift+J shortcut activates the tool. All 5 existing regression
suites (pro-tools, resize-bug, perspective, global-unit-system, PDF
export -- 46 checks total) still pass with no changes.

**Also fixed as part of this pass:** the misleading `w-44`/"44px" doc
comment above (Step 7, code/CSS cleanup) -- the dead `/studio` route and
`src/editor/core/` engine remain deliberately untouched per the user's
own earlier explicit "keep it for now" instruction; a broader cleanup
pass (the duplicated zoom-handling implementation between the Fabric-
based Photo Editor and `src/editor/core/CoordinateSystem.ts`, and the
handful of fixed non-responsive panel widths noted in the audit) is
still deferred, not attempted here, since it's unrelated to any concrete
bug and the brief says not to touch working code without reason.

**Deliberately not done:** Radial Gradient mask and Luminosity mask
(only Linear Gradient and Color Range are live); a literal drag-brush
Spot Healing variant with its own separate blend-mode options (Photoshop
draws a real distinction between "Healing Brush" and "Spot Healing
Brush" -- the latter needs no user-set brush size/source at all and
auto-detects the sampling area; what's live here is the former, the
one the user's own "healing brush" wording named).

---

## 2026-09-29 (3) — Centralized global UnitSystem (Steps 3-6 of the platform brief)

**Problem:** the previous audit found `lib/editor/units.ts` was already a
real, correct conversion module, but nothing tied its consumers
together: Main Design's editor, `/create`, Photo Studio's document-
creation screen, and Photo Studio's Resize dialog each held their own
disconnected `useState<DocUnit>('px')` -- choosing "mm" in one had zero
effect on any other. `pdfExport.ts` and `preflight.ts` also each
independently redefined the same `72/96` px-per-point constant instead
of importing it.

**Shipped:**
- `lib/editor/units.ts` gains `PT_PER_PX`/`toPt` as their one canonical
  home (re-exported from `pdfExport.ts` for every existing caller, so no
  call site needed to change) and a real global display-unit preference:
  `getDisplayUnit()`/`setDisplayUnit()`/`useDisplayUnit()`, backed by
  `localStorage` (survives navigating between these separate Next.js
  pages) and kept live across open tabs via the native `storage` event,
  built on `useSyncExternalStore` (handles SSR/hydration correctly, no
  mismatch warnings). It is deliberately a *display-only* preference --
  no document geometry lives here, and nothing here can resize a
  document, matching the brief's "changing the unit must never change
  the document" requirement.
- `preflight.ts` and `printSetup.ts` now import `PT_PER_PX`/`PX_PER_INCH`
  from `units.ts` instead of each keeping their own copy.
- Main Design's editor, `/create`, Photo Studio's document-creation
  screen, and Photo Studio's Resize dialog all now call the same
  `useDisplayUnit()` -- choosing "mm" anywhere is "mm" everywhere else,
  persisted across page loads. Removed the now-meaningless per-tab
  `unit` field from Main Design's tab-snapshot mechanism (unit is a
  global preference now, not something a tab-switch should restore).

**Real bug found and fixed along the way:** making the unit global
exposed a genuine latent bug in Photo Studio's document-creation screen.
Its Width/Height inputs stored the *displayed* number directly
(`widthInput`/`heightInput` as raw strings), unlike `/create`'s already-
correct pattern of keeping `widthPx`/`heightPx` as the source of truth
and deriving the displayed value. Landing on that screen with the global
unit set to "in" (e.g. from Main Design) while the stale default
"1080"/"1080" was still showing would create a **1080-inch** document
instead of a sane default -- exactly the "never store only the displayed
unit" failure mode the brief warns about. Fixed by switching Photo
Studio's creation screen to the same stable-px-source-of-truth pattern
`/create` already used.

**Tested:** a new suite (`test_global_unit_system.js`, 9/9) verifies the
full flow end to end: set "mm" on `/create` → persists to localStorage →
Main Design's editor opens already showing "mm" (not reset to px) →
changing to "in" in the editor doesn't touch the document's real px
size → Photo Studio's creation screen and its Resize dialog both already
show "in" → no hydration-mismatch console warnings. Full regression
re-run: 19/19 workspace/editor, 12/12 Photo Studio pro tools, 11/11
Perspective, 7/7 Photo Studio PDF export, 12/12 + 5/5 PDF investigation,
7/7 resize-bug repro -- 82 checks total, all passing, zero console
errors.

**Still open** on the unit-system front: DPI itself is still two
disconnected sources within Photo Studio (`img.__dpi` on the Resize
dialog vs. the artboard's own `__print.dpi`) -- unifying those is a
separate, smaller follow-up from this pass's scope (making the *display
unit* global).

## 2026-09-29 (2) — PDF export investigation + Photo Studio's first PDF export

**Investigated:** a report that "PDF exporting across the application" is
not working correctly. Built two comprehensive Playwright suites against
the running app (not just code review) covering the spec's own test
matrix: create an A4 @ 300 DPI document, add a real image and real text,
export, then parse the raw PDF bytes with pdfjs-dist to check page size/
text/images rather than trusting appearances
(`test_pdf_export_scenario.js`, 12/12), plus a harder path — transparency
(real opacity), a gradient fill (the rasterization-fallback code path),
and the full Export dialog with bleed + crop marks
(`test_pdf_bleed_marks_transparency.js`, 5/5). Also re-confirmed
changing the display unit (px→in) does not alter the exported PDF's
physical size, per the spec's own critical requirement. Could not
reproduce any Main Design PDF export failure under any scenario
constructed, including the harder ones. Root cause of the report: **Photo
Studio had no PDF export at all** (PNG only) — if that's what was tried,
"PDF doesn't work" is accurate without any bug in Main Design's pipeline.

**Shipped:** Photo Studio's first real PDF export. Added
`exportRasterToPDF()` to the existing shared `lib/editor/pdfExport.ts`
(not a new duplicate module) — Photo Studio's document model is a single
flattened raster image rather than Fabric objects on an artboard, so this
is a simpler entry point than `exportCanvasToPDF`/`exportArtboardsToPDF`:
it computes the PDF's physical page size from the image's *real* pixel
dimensions and *real* DPI (`widthPx / dpi * 72` for the page width in
points), correctly distinct from `pdfExport.ts`'s own `toPt()` (which
intentionally assumes Main Design's fixed 96px/inch document-geometry
convention — see that file's header comment for why those are two
different, both-correct conversions). Wired into `/photo-studio` via a
small PNG/PDF format selector next to the existing Export button.
Verified with a new suite (`test_photo_studio_pdf_export.js`, 7/7): a
real embedded image XObject, correct A4 physical page size derived from
the document's actual 2480×3508px @ 300 DPI, and no regression to the
existing PNG export. Full regression re-run: 19/19 workspace/editor,
12/12 Photo Studio pro tools, 11/11 Perspective — all still passing.

**Still open** on the "unify PDF/export" front (spec sections 3-18, 35):
the global `UnitSystem`/document-level unit preference (today: 4
disconnected local unit states), consolidating `pdfExport.ts`'s and
`preflight.ts`'s independently-redefined `72/96` constants into
`lib/editor/units.ts`, and Photo Studio's own two disconnected DPI
sources (`img.__dpi` vs. artboard `__print.dpi`).

## 2026-09-29 — Photo Studio: real Perspective transform + resize-bug investigation

**Investigated:** a report that "canvas resizes while typing width/height"
in Photo Studio. Wrote a targeted Playwright repro
(`test_photo_studio_resize_bug.js`) against both in-editor resize surfaces
(the Resize Image dialog and the Crop tool's "Set Size" inputs) plus
re-ran the existing `/create` and `ArtboardsPanel` suite
(`test_workspace_editor_changes.js`, 19/19). All 7 new checks and all 19
existing checks pass: typing in any of these fields only updates local
draft state, never the live canvas, until an explicit Apply/Set Size
click. Could not reproduce the bug anywhere in the current build — most
likely a stale build the report was made against. No code change was
needed; flagging this in case it resurfaces with a more specific repro.

**Shipped:** a real Perspective (corner-pin distort) tool — the first
piece of the "more advanced transforms" ask. Fabric.js has no built-in
projective transform for image objects, so this is a genuine new
capability, not a relabeled Skew: `lib/editor/perspective.ts` implements
a real 4-point homography (direct linear transform, solved via Gaussian
elimination) and warps the image's actual pixels via inverse-mapped
bilinear sampling, baked into a new raster the same way Crop and Resize
already bake their own pixel operations. Four draggable handles (`'perspective'`
tool, Shift+T) show a live outline of the target quadrilateral while
dragging; Apply performs the real warp, Reset snaps the handles back,
Cancel discards with no pixel change. Verified with a new Playwright
suite (`test_perspective_tool.js`, 11/11): handles/outline creation,
drag-without-baking, a genuine pixel-content diff after Apply (not just
a dimension check), cleanup after both Apply and Cancel, and the Shift+T
shortcut. Also backfilled several real shortcuts that existed in code but
were missing from `ShortcutsModal.tsx` (Skew, Clone Stamp, Blur, Sharpen,
Sponge, Paint Bucket, Hue/Saturation) alongside the new Perspective entry.

**Still planned for the "more advanced" transforms area:** Warp
(mesh-based distort) and a unified Free Transform UI wrapping
move/scale/rotate/skew/perspective in one mode — see audit §9.

## 2026-09-28 — Photo Studio: Blur, Sharpen, Sponge, Paint Bucket, Skew, layer blend modes

**Problem:** the previous audit (§9) mapped the "full Photoshop" brief's
tool list against what's actually real in Photo Studio and found several
Painting/Retouching/Transform/Layers items genuinely missing: Blur,
Sharpen, Sponge, Paint Bucket, a transform beyond move/scale/rotate, and
layer blend modes. This entry ships six of those for real, each reusing
this codebase's existing, proven architecture rather than inventing a
new pattern per tool.

**What was done:**
- `lib/editor/photoBrush.ts` gained three new pixel-math functions
  following the file's own established signature
  (`(source, mask, amount): string`): `blurInMask` (real Gaussian blur
  via the canvas 2D context's own `filter`, blended into the mask by its
  alpha — the same "feather overlapping dabs" convention `dodgeBurnInMask`
  already uses), `sharpenInMask` (real unsharp-mask:
  `original + amount*(original-blurred)`, clamped and mask-blended the
  same way), and `spongeInMask` (reuses the same RGB↔HSL round-trip
  `applyHueSaturation` already has, scaling saturation within the brush
  stroke instead of the whole image).
- `components/photoEditor/PhotoEditorWorkspace.tsx`: added `'blur'`,
  `'sharpen'`, `'sponge'` to `PAINT_TOOLS` (so they get the existing
  drag-brush mechanics — soft dabs, stroke smoothing, bake-on-mouse-up —
  for free, with their own strength/radius property panels mirroring
  Dodge/Burn's), `'paint-bucket'` as a single-click tool (reuses
  `magicWandMask()` — the same flood-fill Background Removal already
  used — to build the fill region, then the existing `paintColorInMask()`
  to fill it), and `'skew'` as a tool whose panel sets the active layer's
  real Fabric `skewX`/`skewY` properties directly via confirm-on-blur/
  Enter number inputs (matching this engagement's established resize-
  input pattern) with a Reset control. All five get real toolbar icons,
  keyboard shortcuts, and toolbar-group placement.
- `components/editor/LayersPanel.tsx`: a new opt-in `onBlendModeChange`
  prop (following the exact same opt-in pattern `onOpacityChange` already
  established) renders a blend-mode dropdown per layer when provided,
  setting the real Fabric `globalCompositeOperation` — Main Design's own
  usage of this shared component doesn't pass the new prop, so its layer
  list is unaffected.

**Real bug found and fixed while testing this:**
`PhotoEditorWorkspace.tsx`'s `addLayerFromSource` loaded its base image
via a plain `new Image()` with no `crossOrigin` set. Every source fed to
it before the 2026-09-28 (workspace/editor) entry's Photo Studio reopen
path was always a local `data:` URL, so this never mattered — but a
cross-origin signed URL taints the crop canvas the moment it's drawn,
throwing a `SecurityError` on the first `toDataURL()` after. Fixed by
setting `crossOrigin = 'anonymous'` before assigning `.src`.

**Deliberately not done in this pass** (see the audit's §9 table for the
full remaining list): the ML-dependent selection tools (Magnetic Lasso,
Select Subject, Select and Mask), a literal drag-brush healing/patch
tool distinct from the existing Content-Aware Fill, Warp/Distort/
Perspective/Free Transform, Gradient Map/Channel Mixer/Selective Color/
Color Balance, a full Lightroom-style HSL-per-color-band panel, Texture/
Clarity/Dehaze/Vignette/Grain, gradient- or color-range-driven masks, and
layer grouping/clipping. None of these are stubbed with non-functional
buttons — they simply don't appear yet.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_photo_studio_pro_tools.js`, 12/12) against a real two-color
test image: Blur and Sharpen strokes verified to genuinely change pixel
data (tested against a moderate-contrast edge, not a saturated 0/255
primary — an unsharp mask has no headroom to change a value already at
0 or 255 in the direction that would clip straight back to itself, which
looks like "no change" but is actually just clamping, not a bug); Sponge
verified to move a solid color's RGB channels toward gray; Paint Bucket
verified to fill the exact clicked region with the chosen color; Skew X/Y
verified against the real Fabric object properties (including Reset);
blend mode verified against the real `globalCompositeOperation`; Save
still succeeds after exercising all six. Building this suite surfaced and
required fixing two real test-driver issues along the way, noted here
because they're the kind of thing worth knowing for future Photo Studio
tests: (1) `page.mouse.move/down/up` with a page coordinate computed once
goes stale the moment a taller property panel reflows the canvas
container — later interactions need coordinates computed fresh,
immediately before use; (2) Fabric stacks a non-interactive
`lowerCanvasEl` behind the real interactive `upperCanvasEl`, so a generic
`canvas` element locator can resolve to the wrong one. Re-ran the full
adjacent regression surface: `test_photo_studio.js` (13/13),
`test_workspace_editor_changes.js` (19/19), `test_maindesign_storage.js`
(10/10), `test_storage_dedup.js` (8/8) — all still passing.

**Not verified:** real Supabase Storage CORS/signed-URL behavior against
production infrastructure (same standing limitation as every prior
storage-related entry in this log).

---

## 2026-09-28 — Workspace cleanup, unit-system UX, and Photo Studio/Main Design separation

**Problem** (the "Major Workspace & Editor Changes" brief, a large,
multi-week program spanning workspace structure, a full Photoshop-class
tool suite, a unit-conversion system, and project-data-model changes).
Per this engagement's established practice, the full brief was audited
against the real codebase first (see `docs/ENGINEERING_AUDIT.md` §9)
rather than assumed — that audit found several core Photo Studio tools
already real (marquee/lasso/magic-wand, brush/eraser, dodge/burn, clone
stamp, gradient, crop, eyedropper, levels, curves, hue/sat, a real
Bézier pen, a paintable layer mask, and a real content-aware
fill/object-removal), so this pass focuses on the concrete, scoped items
that were genuinely missing, rather than re-building tools that already
work or faking the much larger remaining tool list.

**What was done:**

- **Workspace cleanup** (`app/dashboard/page.tsx`): removed the "Studio
  (Preview)" nav link and the "+ Photo Project" button (which opened
  Main Design's embedded Photo Editor as a weaker, redundant entry point
  into the same underlying engine `/photo-studio` already wraps fully).
  The dashboard now shows exactly two workspace products — New Design
  and Photo Studio — matching the brief's naming. `/studio`'s own route
  and Main Design's in-context "edit this one image" Photo Editor
  integration are untouched; only the top-level advertising of them as
  separate workspace entries was removed.
- **Aspect-ratio lock, ESC-cancel, inline validation** (`app/create/page.tsx`,
  `components/editor/ArtboardsPanel.tsx`): both the document-creation
  screen and the open editor's per-artboard resize controls already
  resized only on blur/Enter, never per-keystroke (verified by reading
  the existing code before touching it) — what was missing was a lock
  icon between Width/Height that keeps the ratio when toggled on, ESC
  restoring the previous value instead of applying an in-progress edit,
  and an inline "Enter a valid size greater than 0." message instead of
  silently no-op'ing on invalid input.
- **`editor_type` project data model** (`supabase/migrations/
  0007_designs_editor_type.sql`): Photo Studio and Main Design write into
  the same `designs` table with no discriminator, so `/photo-studio`
  could only ever create new designs — reopening a Photo Studio design
  from the dashboard always landed in the generic `/editor`. The new
  column (additive, `default 'design'`, so every existing row keeps
  working exactly as before) is now set on save by both editors, the
  dashboard's Edit link routes accordingly, and `/photo-studio` gained a
  `?designId=` load path that fetches the row and extracts its flattened
  image + DPI back out of `canvas_json` (the same flattening
  `buildPhotoDesignPayload.ts` already does on save — reopening is
  exactly as non-destructive as the save that produced it, not a new
  limitation).
- **Real bug found and fixed while testing the above**:
  `PhotoEditorWorkspace.tsx`'s `addLayerFromSource` loaded its base image
  via a plain `new Image()` with no `crossOrigin` set. Every path that
  fed it an image before this change was always a local `data:` URL
  (upload, blank canvas), so this never mattered — but the new Photo
  Studio reopen path feeds it a real cross-origin signed URL, which
  taints the crop canvas the moment it's drawn and throws a
  `SecurityError` on the first `toDataURL()` call after. Fixed by setting
  `crossOrigin = 'anonymous'` before assigning `.src`, matching the same
  pattern already used elsewhere in this codebase for signed-URL images.

**Deliberately not done in this pass** (see the audit's §9 tool-status
table for the full breakdown): the large remaining tool list — magnetic
lasso, select-and-mask, a literal drag-brush healing/patch tool, warp/
distort/perspective transforms, gradient map, channel mixer, selective
color, a full Lightroom-style HSL/effects panel, layer blend modes and
grouping — is not built or stubbed. Each is its own scoped follow-up;
several (select subject, select-and-mask, magnetic lasso) are ML-
integration projects, not something to fake with non-functional buttons.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_workspace_editor_changes.js`, 19/19): dashboard no longer
shows Studio (Preview)/+ Photo Project while still showing Photo Studio/
New Design; aspect lock correctly computes the paired dimension on both
`/create` and the open editor's ArtboardsPanel; ESC restores the
pre-edit value without resizing; invalid input shows the inline message
and leaves the committed size untouched; Main Design's save writes
`editor_type: 'design'` and Photo Studio's writes `'photo-studio'`; the
dashboard routes each design's Edit link to the correct editor; and
reopening a Photo Studio design via `?designId=` skips the blank "Open"
screen and lands directly in the editing stage with real content loaded
— which is what caught the crossOrigin bug above (this suite failed
until it was fixed). Re-ran the full existing regression surface
touched by this change: `test_real_templates.js` (14/14),
`test_storage_dedup.js` (8/8), `test_legacy_template_filter.js` (15/15),
`test_maindesign_storage.js` (10/10), and `test_photo_studio.js`
(13/13) — all still passing.

**Not verified:** real Supabase Storage CORS/signed-URL behavior against
production infrastructure (same standing limitation as every prior
storage-related entry in this log — this sandbox only ever mocks it).
The `0007` migration needs to be applied by hand in the Supabase SQL
editor before `editor_type` will actually be recorded.

---

## 2026-09-28 — Templates: hide legacy content-less rows from public galleries

**Problem** (user-reported: "I ran it, it still shows blank" — after
applying the migrations and running "Generate Starter Templates," the
user still hit a blank artboard from `/templates`): the `templates` table
carries 13 pre-existing rows from the original `0003_templates_and_admin.sql`
seed, created before `canvas_json` existed as a column. Those 13 rows
still have `canvas_json = null`. `generateStarterTemplates` adds 6 new
real rows but never touched the legacy ones, and both `fetchTemplates()`
(unfiltered, used everywhere) and the public gallery pages listed them
side by side with no visual distinction and no way to tell which is which
without opening one. The 6 real rows also defaulted to `sort_order: 0`
via `.length` on insert, colliding with the legacy rows' own `sort_order`
0-12 range. The user was almost certainly clicking one of the 13 old,
identical-looking, non-functional rows.

**What was done:**
- `generateStarterTemplates` (`lib/templatesData.ts`) now sets each real
  row's `sort_order` to a negative value (`i - TEMPLATE_BUILDERS.length`),
  so real templates always sort ahead of any legacy row in an unfiltered
  listing.
- New `fetchPublicTemplates()` (`lib/templatesData.ts`): calls the
  existing `fetchTemplates()`, then filters to only rows with real
  `canvas_json`. If none exist yet (fresh install, migration applied but
  generation never run, or literally only legacy rows in the table), it
  falls back to the static `TEMPLATES` placeholder array — the same
  fallback `fetchTemplates()` already uses when the table itself is
  empty or unreachable, so a visitor never sees either an empty gallery
  or a legacy dead-end row.
- `/templates` (`app/templates/page.tsx`) and the homepage's
  `TemplateShowcase` (`components/home/TemplateShowcase.tsx`) now both
  call `fetchPublicTemplates()` instead of `fetchTemplates()`.
  `/admin/templates` deliberately still calls the unfiltered
  `fetchTemplates()` — an admin needs to see the 13 legacy rows to delete
  or eventually upgrade them, which is why this is a filter on the public
  read path, not a data migration or deletion.

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New Playwright
suite (`test_legacy_template_filter.js`, 15/15) that reproduces the exact
production scenario: seeds the mocked `templates` table with the 13
legacy no-`canvas_json` rows first, confirms the public gallery falls
back to the static placeholder list (not the legacy DB rows) before
generation has run, then generates the 6 real rows on top (19 rows total
in the table) and confirms: only the 6 real ones render on `/templates`
and the homepage showcase, a legacy row ("Bold Contact") never appears in
either public listing, clicking a real template still loads real content
even with legacy rows present in the same table, and `/admin/templates`
still shows all 19 rows unfiltered. Re-ran `test_real_templates.js`
(14/14) to confirm the existing generation/use-template/save flow is
unaffected.

**Deliberately not done:** the 13 legacy rows are not deleted or
backfilled with real content by this change — they're now simply hidden
from public view. Deleting them (optional cleanup) or upgrading them to
real designs is a separate, low-risk follow-up an admin can do anytime
from `/admin/templates` now that they can no longer confuse a visitor.

---

## 2026-09-26 — Storage: real object storage cutover for Main Design

**Problem** (audit §1, deferred from the Photo Studio slice): Main
Design's own image insertion paths — the toolbar Upload button
(`handleImageUpload`) and File > Import / PDF-page-rasterized import
(`insertImageDataUrl`) — still embedded every image as base64 directly
in the Fabric object's `src`, the same cost the Photo Studio slice fixed
for its own, smaller surface.

**What was done:** a `backgroundUploadAsset(img)` helper in
`app/editor/page.tsx`. The image is still added to the canvas
immediately from the local data URL — placing an image is never slower
or dependent on the network, unchanged from before. In the background,
its bytes are uploaded via the same `uploadDesignAsset` helper the Photo
Studio slice introduced, and once that resolves, `img.setSrc(signedUrl,
cb, {crossOrigin: 'anonymous'})` swaps the object's source in place
(same position/scale/filters/`__uid` — nothing else about the object
changes) and records `__assetId`. Wired into both `handleImageUpload`
and `insertImageDataUrl` (so File > Import and PDF-page imports get it
too, since they share that function), and also into `applyPhotoEdits`
(the Photo Editor's "Apply to Design") — a photo edit produces fresh
pixels, so its stale `__assetId` is cleared immediately and a new
upload kicks off for the edited result. A failed upload (offline, or
the storage migration not applied) degrades silently: the image just
stays embedded for that session, the same graceful-fallback pattern
already used elsewhere in this app (e.g. a missing thumbnail column).

**Why deferred, now not:** the audit flagged this specifically as
higher-risk than Photo Studio because exports, thumbnails, undo/redo,
and every already-saved design all read image data directly. The design
here avoids disturbing any of that: existing designs with embedded
base64 are untouched (this only changes what a *future* insert or photo
edit produces), Fabric already serializes `crossOrigin` as part of an
Image object's JSON (confirmed in the Photo Studio work), so a reload
correctly re-establishes the same cross-origin-safe loading automatically,
and the swap itself doesn't call `pushHistory()` (it's not a user
action, so it doesn't create a spurious undo step or make an old,
pre-swap history entry disagree with a newer one — both still resolve
to the same visible image either way).

**Tested:** `npx tsc --noEmit` and `npm run build` clean. New 10-check
Playwright suite: an uploaded image's src becomes a real signed URL
with a real `__assetId`, `crossOrigin` is set correctly, exactly one
real upload happens, Export as PNG still works with a cross-origin
image (no tainted-canvas error), Save writes `canvas_json` referencing
the URL (not base64), reloading a saved design correctly re-loads the
URL-sourced image, and uploading identical content again dedupes
instead of re-uploading. Existing regression suites re-run and still
passing: guides/grid/snap (14/14), photo export sync (4/4) and dialog
(4/4), dashboard thumbnail backfill (5/5), and the real-templates suite
(14/14, confirming the templates cutover from the previous slice still
works after these editor changes).

**Not verified (same honest limitation as the Photo Studio slice):**
real Supabase Storage CORS/signed-URL behavior against production
infrastructure — only mocked in this sandbox.

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
