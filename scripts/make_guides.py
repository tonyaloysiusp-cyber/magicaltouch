"""Builds the Magical Touch Design PDF guides (HTML → PDF with Chromium)."""
import os, html

FONTS = '/tmp/claude-0/-home-claude/d9c85f66-47a1-520f-8eef-15a0bfdbc77b/scratchpad/fontsflat'
LOGO = '/home/claude/magicaltouch/public/logo.png'
LOGO_W = '/home/claude/magicaltouch/public/logo-white.png'

CSS = f"""
@font-face {{ font-family: Poppins; src: url('file://{FONTS}/Poppins-SemiBold.ttf'); font-weight: 600; }}
@font-face {{ font-family: Poppins; src: url('file://{FONTS}/Poppins-Bold.ttf'); font-weight: 700; }}
@font-face {{ font-family: Inter; src: url('file://{FONTS}/Inter[opsz,wght].ttf'); font-weight: 100 900; }}
@page {{ size: A4; margin: 18mm 16mm 18mm 16mm; }}
@page :first {{ margin: 0; }}
* {{ box-sizing: border-box; }}
body {{ font-family: Inter, sans-serif; color: #1f2430; font-size: 10.5pt; line-height: 1.55; margin: 0; }}
h1, h2, h3 {{ font-family: Poppins, sans-serif; color: #0b0d12; margin: 0; }}
h2 {{ font-size: 21pt; line-height: 1.15; margin: 0 0 4mm; }}
h3 {{ font-size: 12.5pt; margin: 6mm 0 2mm; }}
p {{ margin: 0 0 3mm; }}
.spectrum {{ height: 4px; border-radius: 4px; background: linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B); }}
.cover {{ width: 210mm; height: 297mm; position: relative; overflow: hidden; page-break-after: always; background: #090B18; color: #fff; }}
.cover .glow1 {{ position: absolute; width: 170mm; height: 170mm; border-radius: 50%; left: -50mm; top: -60mm; background: radial-gradient(circle, rgba(242,112,143,.55), rgba(242,112,143,0) 65%); }}
.cover .glow2 {{ position: absolute; width: 190mm; height: 190mm; border-radius: 50%; right: -70mm; top: 40mm; background: radial-gradient(circle, rgba(53,194,241,.45), rgba(53,194,241,0) 65%); }}
.cover .glow3 {{ position: absolute; width: 160mm; height: 160mm; border-radius: 50%; left: 30mm; bottom: -80mm; background: radial-gradient(circle, rgba(140,200,75,.35), rgba(140,200,75,0) 65%); }}
.cover .grid {{ position: absolute; inset: 0; background-image: linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px); background-size: 12mm 12mm; }}
.cover .in {{ position: absolute; inset: 18mm 18mm 16mm 18mm; display: flex; flex-direction: column; }}
.cover .top {{ display: flex; justify-content: space-between; align-items: center; }}
.cover .logo {{ height: 9mm; }}
.cover .no {{ font: 600 8.5pt Poppins; letter-spacing: .22em; color: rgba(255,255,255,.65); border: 1px solid rgba(255,255,255,.25); border-radius: 20mm; padding: 1.6mm 4mm; }}
.cover .mid {{ margin-top: 30mm; }}
.cover .kicker {{ display: inline-block; font: 600 8.5pt Poppins; letter-spacing: .24em; text-transform: uppercase; color: #fff; background: linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1); padding: 1.8mm 4mm; border-radius: 2mm; }}
.cover h1 {{ font-size: 50pt; line-height: 1.0; margin: 7mm 0 6mm; color: #fff; letter-spacing: -.02em; }}
.cover h1 span {{ color: var(--accent); }}
.cover .lead {{ font-size: 12.5pt; color: rgba(255,255,255,.78); max-width: 140mm; line-height: 1.5; }}
.cover .hero {{ margin-top: auto; position: relative; height: 104mm; }}
.cover .hero .f {{ position: absolute; border-radius: 3.5mm; overflow: hidden; border: 1px solid rgba(255,255,255,.18); box-shadow: 0 10mm 22mm -8mm rgba(0,0,0,.7); background: #111; }}
.cover .hero .f img {{ width: 100%; display: block; }}
.cover .hero .a {{ width: 150mm; left: 24mm; top: 6mm; transform: rotate(-2deg); }}
.cover .hero .b {{ width: 74mm; left: 0; top: 46mm; transform: rotate(-7deg); }}
.cover .hero .c {{ width: 74mm; right: 0; top: 52mm; transform: rotate(6deg); }}
.cover .foot {{ margin-top: 8mm; display: flex; justify-content: space-between; align-items: center; font-size: 8.5pt; color: rgba(255,255,255,.6); border-top: 1px solid rgba(255,255,255,.15); padding-top: 4mm; }}
.cover .foot b {{ color: #fff; font-family: Poppins; font-weight: 600; }}
.toc {{ page-break-after: always; }}
.toc ol {{ padding-left: 0; list-style: none; counter-reset: c; }}
.toc li {{ counter-increment: c; display: flex; gap: 4mm; padding: 3mm 0; border-bottom: 1px solid #e7e9ee; font-size: 11.5pt; }}
.toc li::before {{ content: counter(c, decimal-leading-zero); font-family: Poppins; font-weight: 700; color: #3B82C4; width: 9mm; }}
.section {{ page-break-before: always; }}
.section .num {{ font-family: Poppins; font-weight: 700; color: #3B82C4; font-size: 10pt; letter-spacing: .14em; margin: 2mm 0 1mm; }}
.shot {{ margin: 3mm 0 5mm; border: 1px solid #e3e6ec; border-radius: 3mm; overflow: hidden; break-inside: avoid; }}
.shot img {{ width: 100%; display: block; }}
.shot figcaption {{ font-size: 8.5pt; color: #6b7280; padding: 2mm 3mm; background: #f7f8fa; border-top: 1px solid #e3e6ec; }}
.row {{ display: flex; gap: 6mm; align-items: flex-start; break-inside: avoid; }}
.row > .side {{ width: 62mm; flex: none; }}
.row > .txt {{ flex: 1; }}
ol.steps {{ padding-left: 0; list-style: none; counter-reset: s; margin: 0 0 4mm; }}
ol.steps li {{ counter-increment: s; position: relative; padding: 0 0 2.4mm 9mm; }}
ol.steps li::before {{ content: counter(s); position: absolute; left: 0; top: .3mm; width: 6mm; height: 6mm; border-radius: 50%; background: #0b0d12; color: #fff; font: 600 8.5pt Poppins; display: grid; place-items: center; line-height: 6mm; text-align: center; }}
.tip {{ border-left: 3px solid #35C2F1; background: #f1f8fd; padding: 3mm 4mm; border-radius: 0 2mm 2mm 0; margin: 3mm 0 4mm; break-inside: avoid; font-size: 10pt; }}
.tip b {{ color: #1f6fae; }}
table {{ width: 100%; border-collapse: collapse; margin: 2mm 0 5mm; font-size: 9.8pt; break-inside: avoid; }}
td, th {{ text-align: left; padding: 2mm 2.5mm; border-bottom: 1px solid #e7e9ee; vertical-align: top; }}
th {{ font-family: Poppins; font-weight: 600; font-size: 9pt; color: #6b7280; }}
.k {{ font-family: Poppins; font-weight: 600; white-space: nowrap; }}
kbd {{ font: 600 8.5pt Inter; border: 1px solid #cfd4dc; border-bottom-width: 2px; border-radius: 1.2mm; padding: 0 1.4mm; background: #fff; }}
.end {{ page-break-before: always; text-align: center; padding-top: 70mm; }}
.end h2 {{ font-size: 26pt; }}
"""

IMG = lambda n: f"file:///tmp/claude-0/-home-claude/d9c85f66-47a1-520f-8eef-15a0bfdbc77b/scratchpad/guides/img/{n}.jpg"


def shot(n, cap):
    return f'<figure class="shot"><img src="{IMG(n)}"><figcaption>{cap}</figcaption></figure>'


def steps(*items):
    return '<ol class="steps">' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>'


def tip(t):
    return f'<div class="tip"><b>Tip · </b>{t}</div>'


def side(n, cap, body):
    return f'<div class="row"><div class="side">{shot(n, cap)}</div><div class="txt">{body}</div></div>'


# ------------------------------------------------------------------ content
EDITOR = [
    ("Start a design", f"""
<p>Every design starts in one of three ways: from a template, from a blank page in any size, or from a photo in Photo Studio. Everything is free, with no watermark and no account needed.</p>
{shot('gallery', 'Templates → search by what you make (“business flyer”, “wedding album”) or filter by type, occasion, style and colour.')}
{steps('Open <b>Templates</b> in the top menu.', 'Search, or tap a group (Social media, Print &amp; marketing, Invitations &amp; cards, Photos &amp; albums, Business &amp; documents).', 'Open a template and tap <b>Use this template</b>. It opens in the editor as your own copy — the original never changes.', 'Prefer a blank page? Tap <b>New design</b> and choose a size (post, story, A4, banner…) or type your own.')}
{tip('Search understands design types: “photo album” shows albums, “birthday story” shows 9:16 stories. Add a colour or style word to narrow it down.')}
"""),
    ("The workspace", f"""
{shot('editor', 'The editor: tools on the left, the page in the middle, page controls and zoom at the bottom, Save and Export at the top right.')}
<table>
<tr><th>Area</th><th>What it does</th></tr>
<tr><td class="k">Left rail</td><td>Templates, Elements (shapes, frames, stickers), Text, Upload, QR code, Draw, Background, Brand, Layers, Pages and Help. Tap one to open its panel.</td></tr>
<tr><td class="k">Top bar</td><td>Design name, Undo / Redo, <b>Simple</b> / <b>Pro</b> mode, Resize, light/dark, one-click PDF, Export and Save.</td></tr>
<tr><td class="k">Selection bar</td><td>Appears above the page with the tools for whatever you tap — text, photo, shape, several items or the page.</td></tr>
<tr><td class="k">Page bar</td><td>Page thumbnails, add / copy / delete / reorder pages, zoom and Fit to screen.</td></tr>
</table>
{tip('<b>Simple</b> mode keeps only the essentials. Switch to <b>Pro</b> for menus (File, Edit, Object, Type, Select, View), rulers, guides, layers and exact sizes.')}
"""),
    ("Text", f"""
{shot('text-bar', 'Tap any text: font, weight, size, colour, bold / italic, alignment, spacing, effects, text frame and translate.')}
{steps('Tap a text once to select it; tap again (or double-click) to type.', 'Change the font, weight and size in the bar. Fonts load automatically for 17+ languages and scripts — Tamil, Malayalam, Hindi, Telugu, Kannada, Bengali, Arabic, Urdu, Chinese, Japanese, Korean and more.', 'Pick a colour — your brand colours and the colours already in the design are offered first.', 'Open <b>Effects</b> for shadow, glow, outline, echo, neon and curved text.', 'Use <b>Translate</b> to translate one text or the whole design; the right fonts are chosen for the new language.')}
{side('text', 'The Text panel.', '<h3>Adding new text</h3><p>Open <b>Text</b> on the left: Add a heading, a subheading or body text, ready-made font pairings, page numbers (this page or every page) and article columns that flow from column to column.</p>' + tip('Keep to two fonts per design: one for headings, one for body text.'))}
"""),
    ("Pro text effects", f"""
<p>Select any text and open <b>Effects</b> in the bar above the page. The <b>Pro effects</b> gallery shows every look on real letters: 3D Block, Retro, Vintage, Gold, Chrome, Holographic, Glass, Fire, Ice, Neon tube, Bubble, Comic, Sticker and Splice. Your text stays live — change the words, font and size any time and the effect follows.</p>
{shot('ed-fx', 'Gold applied to a heading in the editor.')}
{steps('Tap the text, then <b>Effects</b>.', 'Pick a Pro effect. Some (3D Block, Glass, Neon tube, Bubble, Sticker, Splice) let you choose the effect colour.', 'Combine with curve or wave below, or tap <b>Remove effect</b> to go back to plain text.')}
{tip('Effects come out exactly as on screen in PNG, JPG and PDF downloads.')}
"""),
    ("Photos", f"""
{shot('photo-bar', 'Tap a photo: Replace, Crop, Adjust, Remove BG, Edit photo, Mask (shape), transparency and Position.')}
{steps('Tap <b>Upload</b> on the left to add your photos — they go straight into the design.', 'Drag a photo onto an existing photo or frame to replace it; it keeps the frame, size and effects.', '<b>Crop</b> to re-frame (pinch or use the zoom slider), <b>Adjust</b> for brightness, contrast, warmth and filters.', '<b>Remove BG</b> cuts out the person or product; fix edges with the Restore / Erase brushes, then Apply.', '<b>Mask</b> puts the photo inside a shape (circle, arch, heart, star…).')}
{tip('Photo frames from <b>Elements → Photo frames</b> are empty placeholders: drop a photo on them and it fits perfectly.')}
"""),
    ("Templates, elements and background", f"""
<div class="row"><div class="side">{shot('templates', 'Templates panel inside the editor.')}</div><div class="txt"><h3>Templates panel</h3><p>Swap the whole design for another template without leaving the editor, or add a template as a new page.</p><h3>Elements</h3><p>Shapes, lines, arrows, photo frames, stickers and icons. Search “arrow”, “badge”, “frame”…</p></div></div>
<div class="row"><div class="side">{shot('background', 'Background panel.')}</div><div class="txt"><h3>Background</h3><p>Solid colours, gradients, patterns or a photo as the page background. The colour picker includes an eyedropper to take a colour from the design.</p>{tip('Long-press or right-click any item for quick actions: copy, paste, duplicate, lock, bring forward, delete.')}</div></div>
"""),
    ("Brand kit", f"""
{side('brand', 'Brand panel.', '<p>Save your logo, brand colours and heading / body fonts once. Then:</p>' + steps('Open <b>Brand</b> on the left and add your logo, colours and fonts.', 'Tap <b>Apply to this page</b> (or all pages) — the template takes your colours and fonts.', 'Add the logo with one tap; turn on <b>Brand check</b> to spot off-brand colours and fonts.', 'Start a new design with “Use my brand” to get it already on-brand.') + tip('One Undo brings the template’s original colours back.'))}
"""),
    ("Pages, sizes and layout", f"""
<h3>Pages</h3>
{steps('Add a page with <b>+</b> in the page bar; copy, delete or move pages with the buttons next to it.', 'Multi-page designs (albums, brochures, magazines) export as one PDF with every page.')}
<h3>Resize</h3>
<p><b>Resize</b> (top bar) changes the size of a page — or makes a copy in a new size — and re-arranges the text and photos to fit: post → story, A4 → poster, banner → thumbnail.</p>
<h3>Alignment</h3>
<p>Select an item and use <b>Position</b> to align it to the page (left, centre, right, top, middle, bottom) or change the layer order. Select several items to align them to each other or space them evenly. Pro mode adds rulers, guides, a layout grid and snapping.</p>
{tip('On a phone, the row of big buttons above the tools gives one-tap <b>Centre</b>, <b>Align</b>, <b>Copy</b> and <b>Delete</b>.')}
"""),
    ("Move dialog: exact moves and step-and-repeat", f"""
<p>For exact positioning — and for setting up print sheets — use the <b>Move</b> dialog, which works like the one in professional vector software.</p>
{steps('Pick the <b>Selection</b> tool and click an object (or several).', 'Press <b>Enter</b> — or choose <b>Move…</b> from the right-click menu or the Edit menu.', 'Type the <b>Horizontal</b> and <b>Vertical</b> distance in the page unit (px, mm, cm, in or pt). Or type a <b>Distance</b> and an <b>Angle</b> — the four fields stay linked.', 'Keep <b>Preview</b> on to watch it move before you commit.', '<b>OK</b> moves the object. <b>Copy</b> leaves the original where it is and places a copy at that offset. <b>Cancel</b> (or Esc) puts it back.')}
<table>
<tr><th>Field</th><th>Meaning</th></tr>
<tr><td class="k">Horizontal</td><td>Positive moves right, negative moves left.</td></tr>
<tr><td class="k">Vertical</td><td>Positive moves <b>down</b>, negative moves up.</td></tr>
<tr><td class="k">Distance / Angle</td><td>The same move as a length and a direction: 0° is right, 90° is straight up, 180° left, −90° down.</td></tr>
</table>
<h3>Step-and-repeat: a sheet of labels or cards</h3>
{steps('Place the first label at the top-left of the sheet.', 'Press Enter, type Horizontal = label width + gap (for example 90 mm for an 85 mm card with a 5 mm gap), Vertical = 0, and press <b>Copy</b>.', 'Press Enter again and Copy — the last values are remembered — until the row is full.', 'Select the whole row, press Enter, type Horizontal = 0, Vertical = label height + gap, and Copy for each row.')}
{tip('Ctrl/⌘ + D duplicates with a small offset; the Move dialog is for exact offsets. Arrow keys nudge by 1 px, Shift + arrow by 10 px.')}
"""),
    ("Download and share", f"""
{side('export', 'Export: PNG, JPG, vector PDF, PDF for print shops (CMYK), TIFF and WebP.', steps('Tap <b>Export</b> (or <b>PDF</b> for one-click vector PDF).', 'Choose the file type: PNG for sharing, JPG for photos, <b>PDF (vector)</b> for printing at home, <b>PDF for print shops</b> for professional printing.', 'Pick the quality: Screen, Standard, Print (300 dpi) or Custom.', 'Optional: transparent background, bleed, crop marks and colour bar for print.', 'Tap <b>Download</b>. Or Save to keep working later — the design is saved as a .mtd file on your own device. Nothing is stored on our servers.') + tip('For a printer, choose <b>PDF for print shops</b> with bleed and crop marks — it is what they expect.'))}
<h3>Keyboard shortcuts</h3>
<table>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd></td><td>Undo</td><td><kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td><td>Redo</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>C</kbd> / <kbd>V</kbd></td><td>Copy / paste</td><td><kbd>Ctrl/⌘</kbd> + <kbd>D</kbd></td><td>Duplicate</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>S</kbd></td><td>Save</td><td><kbd>Ctrl/⌘</kbd> + <kbd>0</kbd></td><td>Fit page to screen</td></tr>
<tr><td><kbd>Delete</kbd></td><td>Delete selection</td><td>Arrow keys</td><td>Nudge (Shift = 10×)</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Move… dialog (Selection tool)</td><td><kbd>Shift</kbd> + <kbd>Enter</kbd></td><td>Use the path as a mask</td></tr>
</table>
"""),
]

REMOVER = [
    ("One photo or a whole folder", f"""
<p>The background remover finds the person, product, pet or logo in a photo and removes everything else. It runs <b>on your own device</b> — your photos are never uploaded — and it is free with no watermark.</p>
{shot('rm-page', 'Tools → Remove background.')}
{steps('Open <b>Tools → Remove background</b> in the top menu.', 'Tap <b>Choose photos</b> or drop up to 60 photos on the page (JPG, PNG or WEBP).', 'The first photo takes a few seconds while the remover loads; the rest follow one after another.', 'Choose the background for all photos: <b>Transparent</b> (PNG), <b>White</b> or any <b>Colour</b> (JPG).', 'Use <b>Edge</b> to make all edges sharper or softer.')}
"""),
    ("Results, saving and the Edit button", f"""
{shot('rm-results', 'Every finished photo has ✎ Edit (touch up), × (remove from the list) and a download button.')}
{steps('Download one photo with the <b>PNG</b> / <b>JPG</b> button under it.', '<b>Download all</b> saves every photo in one ZIP file.', 'On a computer, <b>Save to a folder</b> writes them straight into a folder you choose.', 'If a photo needs correcting, tap <b>✎ Edit</b> on it.')}
"""),
    ("Touch up: Restore and Erase", f"""
{shot('rm-overlay', 'The touch-up editor in Red overlay view: red shows exactly what will be removed.')}
<p>Like the mask brush in a professional photo editor, the touch-up editor lets you correct the cut-out by hand:</p>
<table>
<tr><td class="k">Restore (green)</td><td>Paint over parts that were removed by mistake — a hand, hair, the edge of a product.</td></tr>
<tr><td class="k">Erase (red)</td><td>Paint over background that is still there.</td></tr>
<tr><td class="k">Move</td><td>Drag the picture around when zoomed in (also: middle mouse button).</td></tr>
<tr><td class="k">Size</td><td>Brush size. With an Apple Pencil or pen, pressing harder paints wider.</td></tr>
<tr><td class="k">Undo / Redo</td><td>At the top; every brush stroke can be undone.</td></tr>
</table>
"""),
    ("Check the result", f"""
<div class="row"><div class="side">{shot('rm-result', 'Result view.')}</div><div class="side">{shot('rm-before', 'Before view.')}</div></div>
{steps('<b>Red overlay</b> — the original photo, with removed areas in red. Best for painting.', '<b>Result</b> — the finished cut-out on the background you chose.', '<b>Before</b> — the original photo.', 'Zoom with <b>+</b> / <b>−</b> at the bottom; tap the percentage to fit the photo again.')}
<h3>Edges</h3>
<table>
<tr><td class="k">Cut-off</td><td>Higher keeps less (cleaner background), lower keeps more (safer for fine details).</td></tr>
<tr><td class="k">Softness</td><td>How gently the edge fades — raise it for hair and fur.</td></tr>
<tr><td class="k">Feather</td><td>Blurs the edge slightly so the cut-out blends into new backgrounds.</td></tr>
</table>
{steps('Tap <b>Save</b> to keep the corrections (the photo shows “Touched up”), or <b>Download</b> to save the picture straight away.', '<b>Start again</b> clears all brush work and edge settings.')}
{tip('Hair looks most natural with Softness around 40–60% and a little Feather. Products with hard edges look best with low Softness.')}
"""),
    ("Inside a design", f"""
<p>You can also remove a background inside the editor: tap a photo in your design, then <b>Remove BG</b> in the bar above the page. The same Restore / Erase brushes and edge settings appear; tap <b>Apply</b> to put the cut-out back into the design.</p>
{shot('photo-bar', 'In the editor: tap the photo → Remove BG.')}
{tip('Put the cut-out in front of a colour block or shape and add a soft shadow (Effects) — it instantly looks like a studio shot.')}
"""),
]

PHOTO = [
    ("Open a photo or start blank", f"""
<p>Photo Studio is a complete photo editor in your browser — adjustments, colour grading, filters, retouching, selections, layers, live text, shapes, background removal and print-ready export. Everything runs on your own device; your photos are never uploaded to edit them.</p>
{shot('ps-start', 'Photo Studio start page: open a photo, or create a blank canvas in any size.')}
{steps('Open <b>Photo Studio</b> from the top menu (or <b>Tools → Photo Studio</b>).', 'Tap <b>Choose a photo</b> or drop an image — it opens at full resolution.', 'Or <b>Start from a blank canvas</b>: choose a preset (square post, A4, US letter, 4×6 in print…) or type the width, height, unit and dpi.')}
<h3>Simple and Pro</h3>
<p>The switch at the top changes the workspace. <b>Simple</b> shows big, friendly tools (Enhance, Looks, Crop, Background, Retouch, Resize, Export) — ideal on phones. <b>Pro</b> shows the full professional workspace with a tool bar, menus, panels, layers and history.</p>
{shot('ps-simple', 'Simple mode: the essentials, one tap each.')}
"""),
    ("The Pro workspace", f"""
<table>
<tr><th>Area</th><th>What it does</th></tr>
<tr><td class="k">Menu bar</td><td><b>File</b> (open, place picture as layer, export, quick download), <b>Edit</b> (undo, redo), <b>Image</b> (size, canvas, rotate, flip), <b>Layer</b>, <b>Select</b>, <b>Filter</b>, <b>View</b>, <b>Window</b>.</td></tr>
<tr><td class="k">Tool bar (left)</td><td>Every canvas tool, with its keyboard shortcut shown on hover.</td></tr>
<tr><td class="k">Options bar (top)</td><td>Settings for the tool you picked — size, mode, colour, shape type…</td></tr>
<tr><td class="k">Panels (right)</td><td><b>Properties</b>, <b>Adjust</b>, <b>Colour</b>, <b>Filters</b>, <b>Looks</b>; below them <b>History</b> and <b>Layers</b>.</td></tr>
<tr><td class="k">Status bar</td><td>Zoom, pixel size, dpi and print size, cursor position and number of layers.</td></tr>
</table>
<h3>Keyboard shortcuts</h3>
<table>
<tr><td><kbd>V</kbd> Move</td><td><kbd>M</kbd> Marquee</td><td><kbd>L</kbd> Lasso</td><td><kbd>P</kbd> Pen</td><td><kbd>W</kbd> Select subject</td></tr>
<tr><td><kbd>C</kbd> Crop</td><td><kbd>I</kbd> Eyedropper</td><td><kbd>J</kbd> Healing brush</td><td><kbd>B</kbd> Brush</td><td><kbd>E</kbd> Eraser</td></tr>
<tr><td><kbd>G</kbd> Gradient</td><td><kbd>K</kbd> Paint bucket</td><td><kbd>R</kbd> Blur</td><td><kbd>O</kbd> Dodge</td><td><kbd>T</kbd> Type</td></tr>
<tr><td><kbd>U</kbd> Shape</td><td><kbd>H</kbd> Hand</td><td><kbd>Z</kbd> Zoom</td><td><kbd>Ctrl Z</kbd> Undo</td><td><kbd>Ctrl ]</kbd> / <kbd>Ctrl [</kbd> Layer up / down</td></tr>
<tr><td><kbd>Enter</kbd> Move…</td><td><kbd>Ctrl J</kbd> Layer via copy</td><td><kbd>Ctrl Shift I</kbd> Invert selection</td><td><kbd>Ctrl A</kbd> / <kbd>Ctrl D</kbd> Select all / none</td><td><kbd>Ctrl E</kbd> Merge down</td></tr>
</table>
"""),
    ("Adjust: light, colour and detail", f"""
{side('ps-adjust-panel', 'Adjust panel.', """<p>Every adjustment applies to the <b>selected layer only</b> — other layers never change. Drag a slider and see the result live.</p>
<table>
<tr><td class="k">Light</td><td>Exposure, Contrast, Highlights, Shadows, Whites, Blacks.</td></tr>
<tr><td class="k">Colour</td><td>Temperature (warm/cool), Tint, Vibrance, Saturation.</td></tr>
<tr><td class="k">Detail &amp; effects</td><td>Clarity, Sharpen, Soften / blur, Vignette, Film grain, Fade.</td></tr>
<tr><td class="k">Auto</td><td><b>Auto enhance</b> balances light and colour in one tap.</td></tr>
</table>
<p>The note at the top says which layer you are adjusting. Pick another layer to adjust it separately.</p>""")}
{tip('Use <b>Before</b> at the top to compare with the original at any time.')}
"""),
    ("Colour: levels, curves and HSL", f"""
{side('ps-colour-panel', 'Colour panel: levels and curves.', """<table>
<tr><td class="k">Levels</td><td>Black point, mid-tones and white point with a live histogram. <b>Auto levels</b> sets them for you.</td></tr>
<tr><td class="k">Curves</td><td>Drag points on the curve for the whole image (RGB) or for Red, Green and Blue separately — the classic way to add contrast or a colour cast.</td></tr>
<tr><td class="k">HSL</td><td>Change the hue, saturation and lightness of one colour family only: Reds, Oranges, Yellows, Greens, Aquas, Blues, Purples, Magentas.</td></tr>
</table>""")}
{tip('Make skies deeper with HSL → Blues: lower lightness a little and raise saturation.')}
"""),
    ("Looks and filters", f"""
{side('ps-looks-panel', 'Looks: one-tap styles.', """<h3 style="margin-top:0">Looks</h3><p>One tap applies a complete style, previewed on your own photo: Auto enhance, Vivid, Golden, Cool, Soft portrait, Matte, Film, Dramatic, Black &amp; white, Noir and Silver. Adjust any slider afterwards to fine-tune.</p>""")}
{side('ps-filters-panel', 'Filters panel.', """<h3 style="margin-top:0">Filters</h3>
<table>
<tr><td class="k">Blur / Motion blur</td><td>Soft even blur, or streaks in one direction.</td></tr>
<tr><td class="k">Sharpen</td><td>Crisper edges (unsharp mask).</td></tr>
<tr><td class="k">Add noise</td><td>Film-like grain.</td></tr>
<tr><td class="k">Pixelate</td><td>Hide a face or number plate.</td></tr>
<tr><td class="k">Emboss, Posterize, Halftone</td><td>Stamped, poster and printed-dot looks.</td></tr>
<tr><td class="k">Soft glow, Sepia, B&amp;W, Invert</td><td>Dreamy, vintage and graphic effects.</td></tr>
</table>
<p>Filters work on the selected layer — or only inside a selection if you made one.</p>""")}
"""),
    ("Retouch brushes", f"""
{side('ps-heal-panel', 'Brush panel with every retouch brush.', """<table>
<tr><td class="k">Healing brush</td><td>Paint over spots, dust, blemishes or small objects — they blend into the surroundings.</td></tr>
<tr><td class="k">Brush</td><td>Paint in any colour on the selected layer, with size, opacity and hardness.</td></tr>
<tr><td class="k">Eraser</td><td>Makes the layer see-through where you paint.</td></tr>
<tr><td class="k">Smudge</td><td>Push and blend colours like a finger in wet paint.</td></tr>
<tr><td class="k">Soften (Blur)</td><td>Smooth skin or a busy background.</td></tr>
<tr><td class="k">Dodge / Burn</td><td>Lighten or darken by painting — eyes, highlights, depth.</td></tr>
<tr><td class="k">Sharpen</td><td>Crisp up details such as eyes and textures.</td></tr>
</table>""")}
{tip('Zoom in (Z or the + button) for small spots and use a brush a little bigger than the spot.')}
"""),
    ("Selections and cut-outs", f"""
{side('ps-select-panel', 'Selection panel.', """<table>
<tr><td class="k">Marquee</td><td>Rectangle or ellipse; hold Shift for a square or circle.</td></tr>
<tr><td class="k">Lasso</td><td>Draw freehand, or click point to point.</td></tr>
<tr><td class="k">Pen</td><td>Precise paths with curves for clean product cut-outs.</td></tr>
<tr><td class="k">Select subject</td><td>Finds the person or product automatically.</td></tr>
<tr><td class="k">Modes</td><td>New, Add (Shift), Subtract (Alt), Intersect; Select all, Invert, Deselect.</td></tr>
</table>
<p>With a selection you can: <b>Content-aware fill</b> (remove what is selected), mask the layer, copy to a new layer, delete, fill with a colour, or apply adjustments and filters only inside it.</p>""")}
{shot('ps-subject', 'Background removal: Select subject / Background → cut-off, edge softness, feather, then Restore and Erase brushes to touch up.')}
"""),
    ("Layers", f"""
{side('ps-layer-menu-crop', 'Layer menu.', """<p>Work like a professional: keep each part on its own layer so you can change it later.</p>
<table>
<tr><td class="k">Add</td><td>New empty layer, picture as a new layer, duplicate, layer via copy.</td></tr>
<tr><td class="k">Order</td><td>Bring forward / send backward, merge down, flatten image.</td></tr>
<tr><td class="k">Blend &amp; opacity</td><td>Normal, Multiply, Screen, Overlay, Soft light, Darken, Lighten, Difference, Colour, Luminosity.</td></tr>
<tr><td class="k">Layer styles</td><td>Drop shadow, outer glow and stroke.</td></tr>
<tr><td class="k">Move</td><td>Drag with Move (V), or press Enter for an exact Move… with Copy. Parts pushed outside the canvas are only hidden — move them back and they return.</td></tr>
</table>""")}
{tip('Each layer has its own adjustments: brighten a cut-out without touching the background.')}
"""),
    ("Portrait retouch: skin", f"""
<p>Open <b>Adjust → Portrait retouch</b>. The skin is found on your device — nothing is uploaded — and only skin is changed, so eyes, hair and clothes stay sharp.</p>
<table>
<tr><th>Slider</th><th>What it does</th></tr>
<tr><td class="k">Skin smoothing</td><td>Evens out pores, small lines and blotches.</td></tr>
<tr><td class="k">Keep skin texture</td><td>How much natural texture comes back on top of the smoothing (60 by default) — keeps faces from looking plastic.</td></tr>
<tr><td class="k">Even skin tone</td><td>Reduces redness and patchy colour.</td></tr>
<tr><td class="k">Skin glow</td><td>A soft, healthy sheen.</td></tr>
</table>
<h3>One-tap presets</h3>
<table>
<tr><td class="k">Female portrait</td><td>Natural beauty, Soft skin, Studio beauty, Glamour, Wedding portrait, Professional makeup, Natural glow.</td></tr>
<tr><td class="k">Male portrait</td><td>Natural male retouch, Professional headshot, Business portrait, Clean skin, Beard enhancement, Studio portrait, Cinematic portrait.</td></tr>
</table>
{tip('Start with a preset, then lower Skin smoothing until you can see pores again at 100% zoom — that is the natural look.')}
"""),
    ("Face and sculpt: eyes, lips and face shape", f"""
<p>Open <b>Adjust → Face — eyes, teeth, lips, shape</b>. The face finder loads once (it needs an internet connection the first time), finds a clear, front-facing face and then everything runs on your device. Move a slider and the preview updates; press <b>Apply face edits</b> to put it on the photo. Hold <b>Original</b> to compare; double-click a slider to reset it.</p>
<table>
<tr><th>Group</th><th>Sliders</th></tr>
<tr><td class="k">Eyes</td><td>Brighten eye whites · Iris clarity · Dark circles · Eye size · Eye distance · Fix red eye</td></tr>
<tr><td class="k">Brows &amp; forehead</td><td>Brow lift · Forehead height</td></tr>
<tr><td class="k">Nose</td><td>Slim nose · Nose length</td></tr>
<tr><td class="k">Mouth</td><td>Whiten teeth · Lip colour with any <b>Lip shade</b> · Lip saturation · Fuller lips · Mouth width · Smile lift</td></tr>
<tr><td class="k">Face shape</td><td>Slim face · Slim jaw · Chin length</td></tr>
</table>
<h3>Looks with a Strength slider</h3>
<table>
<tr><td class="k">Natural</td><td>Fresh eyes, Well rested, Bright smile</td></tr>
<tr><td class="k">Beauty</td><td>Soft glam, Big bright eyes, Rose lips</td></tr>
<tr><td class="k">Sculpt</td><td>V-line face, Petite features, Balanced</td></tr>
<tr><td class="k">Portrait (men)</td><td>Clean &amp; rested, Defined jaw, Strong brow</td></tr>
</table>
<p>Strength scales every shape and tone value of the look from 0 to 150 %; colours such as the lip shade are kept. Fine-tune any slider afterwards.</p>
{tip('Shape sliders work best in small steps: 10–25 looks natural. Lipstick: pick the shade, then set Lip colour to 30–50 so the lip texture shows through.')}
"""),
    ("Face brushes: reshape by hand", f"""
<p>In <b>Retouch</b>, the face brushes change shape and colour exactly where you paint:</p>
<table>
<tr><td class="k">Enlarge eyes</td><td>Click (or brush gently) on an eye. Size the brush to the eye; click again for more.</td></tr>
<tr><td class="k">Slim nose</td><td>Click on the nose — or any feature — to make it smaller and slimmer.</td></tr>
<tr><td class="k">Reshape</td><td>Drag to push features: lift eyebrows, shape the jaw, tidy the hairline.</td></tr>
<tr><td class="k">Hair colour</td><td>Choose a colour and paint over the hair; light and shade stay natural.</td></tr>
<tr><td class="k">Whiten</td><td>Paint over teeth or the whites of the eyes.</td></tr>
</table>
{tip('Use a brush about the size of the feature and several light clicks rather than one strong one. Ctrl/⌘ + Z undoes each click.')}
"""),
    ("Move dialog and exact transforms", f"""
<p>Like the design editor, Photo Studio has an exact <b>Move</b> dialog, measured in the photo's own pixels.</p>
{steps('Choose the <b>Move</b> tool (V) — or make a selection with the Marquee, Lasso or Pen.', 'Press <b>Enter</b> (or tap <b>Move…</b> in the options bar).', 'Type Horizontal and Vertical (or Distance and Angle) in pixels; keep Preview on to see it.', '<b>OK</b> moves, <b>Copy</b> keeps the original and places a copy, <b>Cancel</b> puts it back.')}
<table>
<tr><th>What is selected</th><th>OK</th><th>Copy</th></tr>
<tr><td class="k">No selection</td><td>Moves the whole layer.</td><td>Adds a new layer with a moved copy.</td></tr>
<tr><td class="k">A selection</td><td>Moves only the selected pixels; the selection moves with them.</td><td>Copies the selected pixels to the new place on the same layer.</td></tr>
</table>
<p>Other transforms: <b>Image</b> menu → image size, canvas size, rotate 90°/180°, flip horizontal or vertical; <b>Crop → Straighten &amp; rotate</b> for any angle; <b>Layer</b> → bring forward / send backward.</p>
{tip('Repeat a pattern of stamps or logos: select it, press Enter, type the offset and Copy; press Enter and Copy again — the values are remembered.')}
"""),
    ("Live text and pro text effects", f"""
{shot('ps-text-gold', 'Text with the Gold effect — still live, editable text.')}
{steps('Pick <b>Type</b> (T) and click where the text should start. Type, then press <b>Enter</b> (Shift+Enter for a new line).', 'Choose the font, size, bold/italic, alignment, letter spacing and colour — the text updates live.', 'Pick a <b>Pro effect</b>: 3D Block, Retro, Vintage, Gold, Chrome, Holographic, Glass, Fire, Ice, Neon tube, Bubble, Comic, Sticker or Splice. Simple looks (shadow, lift, glow, outline, highlight) are there too.', 'To change it later, click the text again with Type, or double-click it with Move. Edit the words in the panel.')}
<div class="row"><div class="side">{shot('ps-fx-panel', 'Pro effects gallery.')}</div><div class="txt">{shot('ps-text-neon', 'The same text switched to Neon tube and moved.')}</div></div>
{tip('Text stays editable until you paint or erase on its layer — then it becomes pixels, like in professional editors.')}
"""),
    ("Shapes, gradients and colour tools", f"""
<table>
<tr><td class="k">Shape (U)</td><td>Rectangle, ellipse or line; filled or outline, border width and corner radius. Each shape goes on its own layer.</td></tr>
<tr><td class="k">Gradient (G)</td><td>Linear or radial, from the foreground to the background colour — on a new layer or inside a selection.</td></tr>
<tr><td class="k">Paint bucket (K)</td><td>Fills similar colours with one click; set the tolerance.</td></tr>
<tr><td class="k">Eyedropper (I)</td><td>Picks a colour from the photo.</td></tr>
</table>
<div class="row"><div class="side">{shot('ps-shape', 'Shape tool.')}</div><div class="side">{shot('ps-gradient', 'Gradient tool.')}</div></div>
"""),
    ("Crop, size and print", f"""
{side('ps-crop-panel', 'Crop panel: ratios and exact print sizes.', """<table>
<tr><td class="k">Crop (C)</td><td>Free, original, 1:1, 4:5, 5:4, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16 — plus straighten.</td></tr>
<tr><td class="k">Exact sizes</td><td>Passport 35×45 mm, visa 2×2 in, 10×10 cm, 4×6 and 5×7 in prints, A4, A5, Instagram post and story, Facebook cover.</td></tr>
<tr><td class="k">Image size</td><td>Change pixels or print size (mm, cm, in) and resolution (dpi).</td></tr>
<tr><td class="k">Canvas, rotate, flip</td><td>From the Image menu.</td></tr>
<tr><td class="k">Print preview</td><td>See the real printed size before you export.</td></tr>
</table>""")}
"""),
    ("Save and export", f"""
{side('ps-file-menu-crop', 'File menu.', steps('<b>Save</b> keeps the project (with layers and live text) as a .mtd file on your own device — nothing is uploaded.', '<b>File → Export</b>: PNG (transparent), JPG, WebP, TIFF or PDF.', 'Choose <b>RGB</b> for screens or <b>CMYK</b> for print shops, and the dpi.', '<b>Quick download</b> saves a PNG in one tap; <b>Apply to design</b> sends the photo into a design in the editor.'))}
{tip('Keep the .mtd project: you can reopen it later with every layer and text still editable.')}
"""),
]

PACKAGING = [
    ("Start a box", f"""
<p>Open <b>Packaging</b> from the Tools menu (or go to magicaltouchdesign.com/packaging-dieline). Pick a ready design or a blank box style. <b>Customise</b> opens the full design editor with the box on its real dieline and the <b>Packaging</b> panel on the right.</p>
{shot('tour-packaging', 'A packaging design in the editor: box styles on the left, the flat blank with its dieline in the middle.')}
{steps('Choose a template, or <b>Start a blank box</b> and pick a style.', 'The editor opens in the Packaging workspace: packaging and design tools only.', 'Set the size and board in the Packaging panel, then design on the flat blank.')}
{tip('Change the size at any time — the dieline is redrawn and your artwork stays on its panel.')}
"""),
    ("Size, board and crease", f"""
<table>
<tr><th>Setting</th><th>What it means</th></tr>
<tr><td class="k">Size entered as</td><td><b>Inside size</b> (what fits in), <b>Outside size</b>, or <b>Product + fitting gap</b> — the product's length, width and height plus a small clearance.</td></tr>
<tr><td class="k">Board</td><td>Folding boxboard (SBS, FBB), kraft, corrugated flutes or rigid board, with its weight and caliper (thickness). The thickness is added at every fold.</td></tr>
<tr><td class="k">Crease</td><td>The crease rule and channel the die maker needs for that board.</td></tr>
<tr><td class="k">Glue flap</td><td>Its width, which panel it is attached to, the angle of its ends and an optional thumb notch.</td></tr>
</table>
{tip('Measure the product, not the box. “Product + fitting gap” gives a box that closes cleanly around it.')}
"""),
    ("Box styles and ends", f"""
<p>Styles: reverse tuck end, straight tuck end, seal end, folding carton (choose each end), tuck top with 1-2-3 snap-lock or crash-lock bottom, gable box with handle, pillow box, sleeve, four-corner tray, tray with lid, tray and sleeve, mailer box, and corrugated shipping boxes (RSC, HSC, FOL).</p>
<table>
<tr><th>End</th><th>Use it for</th></tr>
<tr><td class="k">Tuck end</td><td>Reclosable top — cosmetics, toys, small goods.</td></tr>
<tr><td class="k">Glued (full, partial, economy)</td><td>Strong, tamper-evident ends; economy uses the least board.</td></tr>
<tr><td class="k">1-2-3 snap lock</td><td>A bottom that folds and locks without glue — heavier products.</td></tr>
<tr><td class="k">Crash lock</td><td>Pre-glued auto bottom that opens in one move — fastest to pack.</td></tr>
</table>
"""),
    ("Design on the dieline", f"""
{steps('The dieline sits on its own layer. <b>Locked</b>, clicks go straight through it to your artwork; unlock it to select a line.', 'Add text, photos, shapes and patterns on the panels. Front, back and sides are marked on the blank.', 'Keep text and barcodes at least 3 mm inside crease lines; let backgrounds run past the cut line into the bleed.', 'Add a barcode from <b>QR &amp; barcode</b> on the left (EAN-13, UPC-A, Code 128, ITF-14 and more).')}
{tip('Draw a window or a special outline with the pen, then mark it as a cut or crease line in the Lines tab.')}
"""),
    ("Lines and the structure check", f"""
<p>The <b>Lines</b> tab lists every cut, crease, perforation and glue line. The <b>structure check</b> warns when a flap is too short for the board, a tuck will not lock, or the glue flap is too narrow — before anything is printed.</p>
{tip('Print and fold one plain sample on the real board before a print run. It is the cheapest proof there is.')}
"""),
    ("Artwork rules for boxes", f"""
<table>
<tr><th>Rule</th><th>Why</th></tr>
<tr><td class="k">Bleed 3 mm past every cut line</td><td>Cutting is never perfectly on the line; colour that runs past it leaves no white edge.</td></tr>
<tr><td class="k">Safe area 3 mm inside creases and cuts</td><td>Text, logos and barcodes that sit on a fold crack or wrap round the corner.</td></tr>
<tr><td class="k">Glue areas free of ink and varnish</td><td>Glue holds on bare board. Leave the glue flap and the panel it sticks to plain where they meet.</td></tr>
<tr><td class="k">Barcode: dark bars on a light ground</td><td>Black or dark blue on white scans best; keep the quiet zone (the white margin beside the bars) clear and don't shrink it far below its standard size.</td></tr>
<tr><td class="k">Small text 6 pt or larger, in one ink</td><td>Fine text in four colours goes fuzzy if the plates are slightly off. Use 100 % black for small type.</td></tr>
<tr><td class="k">Pictures at 300 ppi at their printed size</td><td>Lower resolution prints soft; the technical document marks low pictures.</td></tr>
<tr><td class="k">Dieline as a spot colour, set to overprint</td><td>The printer and die maker read it, but it never prints. The Print PDF does this for you.</td></tr>
</table>
{tip('Fold the printed dieline template before exporting: upside-down panels and text that runs onto the lid show up at once.')}
"""),
    ("From product to printed box, step by step", f"""
{steps('Measure the product (length × width × height) and its weight.', 'Pick a style: tuck end for light retail goods, snap-lock or crash-lock bottom for heavier products, mailer or shipping box for posting.', 'Enter the size as <b>Product + fitting gap</b> and choose the board; the dieline is drawn with the board thickness at every fold.', 'Read the <b>structure check</b> and fix anything it flags.', 'Design on the flat blank: background past the bleed, text inside the safe area, barcode on a flat panel away from folds.', 'Print the <b>Dieline template</b> at 100 % on plain paper, cut, fold and test with the real product.', 'Export the <b>Print PDF</b> (CMYK, dieline on its own layer), the <b>DXF</b> for the die maker and the <b>Technical document</b> for sign-off.', 'Ask the printer for a hard proof before the run.')}
"""),
    ("Files for the printer", f"""
<table>
<tr><th>File</th><th>For</th></tr>
<tr><td class="k">Print PDF</td><td>The printer: vector, CMYK, with the dieline as overprinting spot colours (CutContour, Crease) on their own layer.</td></tr>
<tr><td class="k">Dieline template</td><td>A branded drawing of the flat blank with a line legend — to send to a designer or client.</td></tr>
<tr><td class="k">DXF</td><td>The die maker, with one layer per line type.</td></tr>
<tr><td class="k">Technical document</td><td>A packaging specification: style, inside / outside / flat sizes, board, crease, glue, ends, panels, line legend, checks and sign-off.</td></tr>
</table>
"""),
]

TEXTILE = [
    ("Start a garment", f"""
<p>Open <b>Textile Studio</b> from the Tools menu. Pick a garment design or a blank garment — polo, T-shirt, jersey, kurti, churidar, frock or dupatta. <b>Customise</b> opens the editor in the Textile workspace with the pattern pieces laid out and the <b>Textile</b> panel on the right.</p>
{shot('tour-textile', 'A polo shirt as pattern pieces: front, back, sleeves and collar, with the Textile panel.')}
"""),
    ("Garment, size and fit", f"""
<table>
<tr><th>Setting</th><th>What it does</th></tr>
<tr><td class="k">Size</td><td>Ready sizes XS to XXXL, or <b>Custom</b> with your own body measurements in cm.</td></tr>
<tr><td class="k">Measurements</td><td>Chest, body length, shoulder, armhole, sleeve length, upper arm and more — the pieces are drafted from them.</td></tr>
<tr><td class="k">Fit and style</td><td>Ease added to the chest, shoulder drop, collar height, placket length and sleeve type.</td></tr>
<tr><td class="k">Seam allowance</td><td>Added around every piece (10 mm by default); the stitch line is drawn inside the cut line.</td></tr>
</table>
{tip('Artwork is clipped to its piece and stays on it when you change the size.')}
"""),
    ("Team names and numbers", f"""
{steps('Open the <b>Team</b> tab and paste the roster, one player per line: <b>name, number, size</b>.', 'Tap <b>Add name and number</b> — a name and a back number are placed on the design. Style them like any text.', 'Download the <b>team PDF</b>: one page per player, each with their own name, number and size.')}
{tip('Check spellings once in the roster; every page is made from it.')}
"""),
    ("Fabric", f"""
<p>The <b>Fabric</b> tab shows how much fabric one garment needs for the fabric width you choose, and how much of it the pieces cover. It warns when a piece is wider than the fabric.</p>
"""),
    ("Production files", f"""
<table>
<tr><th>File</th><th>For</th></tr>
<tr><td class="k">Print PDF</td><td>Sublimation or digital textile printing: CMYK, the cut line as a spot colour.</td></tr>
<tr><td class="k">Pattern PDF</td><td>Full size, or tiled on A4 sheets with a 10 cm test square — print at 100% and measure it.</td></tr>
<tr><td class="k">DXF</td><td>Cutting machines: cut, stitch, grain and notch layers.</td></tr>
<tr><td class="k">Technical document</td><td>A garment specification: size, measurements, pieces, seam allowance, fabric, roster and sign-off.</td></tr>
</table>
"""),
]

PRINT = [
    ("Print basics: bleed, safe area, resolution and colour", f"""
<table>
<tr><th>Term</th><th>What to do</th></tr>
<tr><td class="k">Trim</td><td>The finished size — where the paper is cut.</td></tr>
<tr><td class="k">Bleed</td><td>Extend backgrounds and photos 3 mm past the trim on every side (some printers ask for 5 mm on large formats).</td></tr>
<tr><td class="k">Safe area</td><td>Keep text and logos at least 3–5 mm inside the trim; more for booklets (the binding takes some).</td></tr>
<tr><td class="k">Crop marks</td><td>Short lines outside the bleed that show the cutter where to trim. Turn them on in Export.</td></tr>
<tr><td class="k">Resolution</td><td>Photos at 300 ppi at the printed size for close-up print; 150 ppi is enough for posters seen from a distance.</td></tr>
<tr><td class="k">RGB and CMYK</td><td>Screens use RGB; presses use CMYK inks. <b>PDF for print shops</b> converts to CMYK (FOGRA39). Very bright RGB greens, blues and oranges look duller in CMYK — check the preview.</td></tr>
<tr><td class="k">Black</td><td>Small text in 100 % black only. Large black areas look deeper as a “rich black” (black plus some cyan, magenta and yellow) — ask your printer for their mix.</td></tr>
<tr><td class="k">Lines</td><td>Keep lines at least 0.25 pt thick; thinner lines may not print.</td></tr>
</table>
"""),
    ("Set up a print file, step by step", f"""
{steps('Start a page at the finished size (New design → custom size in mm or in), or open a print template.', 'Open <b>Document &amp; Print Setup</b> (size, bleed, margins, marks) and set 3 mm bleed; run backgrounds to the bleed edge.', 'Place text inside the safe area. Use the Position tools and the <b>Move</b> dialog (Enter) for exact distances.', 'For several copies on one sheet, use <b>Print Layout</b> — or step-and-repeat with Move → Copy (see the Design Editor guide).', '<b>Export → PDF for print shops</b>: tick bleed, crop marks and colour bar; choose 300 dpi.', 'Turn on <b>Technical document</b> to get a spec sheet with sizes, colours, fonts and picture resolution for the printer.')}
<h3>Before you send it</h3>
<table>
<tr><td class="k">Size</td><td>Trim size correct, bleed on all sides.</td></tr>
<tr><td class="k">Text</td><td>Spelling checked, nothing inside the 3 mm edge zone, small text 100 % black.</td></tr>
<tr><td class="k">Pictures</td><td>No “Low” resolution warnings in the technical document.</td></tr>
<tr><td class="k">Colour</td><td>CMYK print PDF; brand colours checked on a printed proof.</td></tr>
<tr><td class="k">Pages</td><td>Booklet page count a multiple of 4 for saddle stitch.</td></tr>
</table>
{tip('Print files carry no branding of ours — only your design. The technical document is a separate sheet.')}
"""),
    ("Print-ready files", f"""
<p>Every design can be exported for a print shop: <b>PDF for print shops</b> converts colours to CMYK with the FOGRA39 profile, adds bleed, crop marks and a colour bar, and keeps text as real vector type. Turn on <b>Technical document</b> in Export to get a branded spec sheet with page sizes, colours, fonts and picture resolution.</p>
{tip('Pictures marked Low in the technical document may print soft at that size — replace them or print smaller.')}
"""),
    ("Print and cut", f"""
<p>Open <b>Print &amp; cut</b> in the editor. Mark any shape or outline as a cut line: kiss cut, die cut, through cut, laser cut, engrave / score, perforation or crease. The cut file downloads as SVG and DXF with one layer per operation, and the job sheet lists each operation with its line count and length.</p>
<p>The same panel holds <b>Large format</b> (posters tiled over several sheets), <b>Separations</b>, <b>Imposition</b>, <b>Data merge</b> (one page per row of a spreadsheet, with names, numbers and QR codes) and <b>Print sizes</b>.</p>
"""),
    ("Print Layout", f"""
{shot('tour-print-layout', 'Print Layout: business cards nine-up on an A4 sheet with crop marks.')}
{steps('Choose a PDF or picture — for example a business card exported with bleed.', 'Pick the item and sheet size; the layout puts as many as fit, with crop marks.', 'Or make a booklet: pages are put in printing order.', 'Download the print PDF.')}
"""),
    ("Print Size and Binding", f"""
{shot('tour-print-size', 'Spine width and the full cover spread for a perfect-bound book.')}
<p>Enter the finished size, page count, paper weight and binding — perfect bound, saddle stitch, hardcover, wire-O, spiral or comb — and get the spine width and the flat cover size with bleed. <b>Open cover in Design Editor</b> starts a page at exactly that size.</p>
{tip('The spine is worked out from the paper thickness. Ask your printer for the paper’s caliper for an exact figure.')}
"""),
]

PATTERNS = [
    ("Pattern Design", f"""
{shot('tour-patterns', 'A seamless half-drop repeat with the tile edges.')}
{steps('Pick a motif — 160+ shapes in groups (floral, geometric, celebration, traditional) — or use your own drawing or logo.', 'Choose the repeat: grid, brick, half-drop, diamond, mirror, rotational or kaleidoscope.', 'Change colours, size and spacing; tap a single motif to move or recolour just that one.', 'Download a seamless tile (SVG, vector PDF or PNG), or tap <b>Edit in a design</b>.')}
<p>The <b>Rangoli &amp; Mandala</b> tab draws from the centre: petals, dots and rings, with festival presets.</p>
"""),
    ("Image Trace", f"""
{shot('tour-image-trace', 'A logo traced into four colours of vector shapes.')}
{steps('Choose a picture — a logo, sketch or photo.', 'Pick a preset: logo, black and white, line art, hand lettering, 3–16 colours, shades of grey or photo.', 'Adjust colours and detail; compare original and vector with the slider.', 'Download SVG, PDF or PNG, or <b>Edit as vectors</b> in the design editor.')}
{tip('Tracing runs on your device. Your picture is never uploaded.')}
"""),
]

GUIDES = {
    'design-editor-guide': ('Design Editor', 'Complete guide', 'Templates, text and pro text effects, photos, elements, brand kit, pages, resizing and print-ready downloads — step by step.', 'editor', EDITOR, '02', ('ed-fx', 'gallery')),
    'background-remover-guide': ('Background Remover', 'Complete guide', 'One photo or sixty: remove backgrounds on your device, then touch up every edge by hand.', 'rm-result', REMOVER, '03', ('rm-overlay', 'rm-results')),
    'photo-studio-guide': ('Photo Studio', 'Complete guide', 'Every tool explained: adjustments, colour, looks, filters, retouching, selections, layers, live text effects, crop and print-ready export.', 'ps-text-gold', PHOTO, '04', ('ps-looks', 'ps-colour')),
    'packaging-guide': ('Packaging Design', 'Complete guide', 'Box styles and ends, sizes and board, designing on the dieline, and the files a printer and die maker need.', 'tour-packaging', PACKAGING, '05', ('', '')),
    'textile-guide': ('Textile Design', 'Complete guide', 'Garments as real pattern pieces: sizes and measurements, team names and numbers, fabric and production files.', 'tour-textile', TEXTILE, '06', ('', '')),
    'print-production-guide': ('Print Production', 'Complete guide', 'Print-ready PDFs, print and cut, large format, data merge, print layouts, booklets and spine widths.', 'tour-print-layout', PRINT, '07', ('', 'tour-print-size')),
    'patterns-trace-guide': ('Patterns and Trace', 'Complete guide', 'Seamless repeats, rangoli and mandala, and turning pictures into clean vector shapes.', 'tour-patterns', PATTERNS, '08', ('', 'tour-image-trace')),
}


ACCENT = {'01': '#F7A1C4', '02': '#B7A8FF', '03': '#6FE3CB', '04': '#7FD4F5', '05': '#B6E388', '06': '#F7A1C4', '07': '#7FD4F5', '08': '#E7EC7A'}


def build(slug, title, kicker, lead, hero, sections, chapters=None, no='01', extra=('', '')):
    toc = ''.join(f'<li>{html.escape(t)}</li>' for t, _ in sections)
    body = ''.join(f'<div class="section"><div class="spectrum"></div><p class="num">{("PART " + chapters[i] + " · ") if chapters else ""}{i + 1:02d}</p><h2>{html.escape(t)}</h2>{c}</div>' for i, (t, c) in enumerate(sections))
    words = title.split(' ')
    t_html = ' '.join(words[:-1]) + (' ' if len(words) > 1 else '') + f'<span>{words[-1]}</span>'
    b_img, c_img = extra
    side_imgs = (f'<div class="f b"><img src="{IMG(b_img)}"></div>' if b_img else '') + (f'<div class="f c"><img src="{IMG(c_img)}"></div>' if c_img else '')
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>{title} — Magical Touch Design</title><style>{CSS}</style></head><body>
<div class="cover" style="--accent:{ACCENT.get(no, '#7FD4F5')}"><div class="glow1"></div><div class="glow2"></div><div class="glow3"></div><div class="grid"></div>
<div class="in"><div class="top"><img class="logo" src="file://{LOGO_W}"><span class="no">GUIDE {no}</span></div>
<div class="mid"><span class="kicker">{kicker}</span><h1>{t_html}</h1><p class="lead">{lead}</p></div>
<div class="hero"><div class="f a"><img src="{IMG(hero)}"></div>{side_imgs}</div>
<div class="foot"><span><b>magicaltouchdesign.com</b> · Free · No watermark</span><span>Edition November 2026</span></div></div></div>
<div class="toc"><h2>Contents</h2><ol>{toc}</ol></div>
{body}
<div class="end"><img src="file://{LOGO}" style="height:12mm"><h2 style="margin-top:8mm">Now make something magical.</h2><p style="color:#6b7280">Free lessons with certificates: magicaltouchdesign.com/tutorials</p></div>
</body></html>"""
    open(f'{slug}.html', 'w').write(doc)


for slug, (t, k, lead, hero, secs, no, extra) in GUIDES.items():
    build(slug, t, k, lead, hero, secs, no=no, extra=extra)
allsecs = [(f'Design Editor — {t}', c) for t, c in EDITOR] + [(f'Background Remover — {t}', c) for t, c in REMOVER] + [(f'Photo Studio — {t}', c) for t, c in PHOTO] + [(f'Packaging — {t}', c) for t, c in PACKAGING] + [(f'Textile — {t}', c) for t, c in TEXTILE] + [(f'Print production — {t}', c) for t, c in PRINT] + [(f'Patterns and Trace — {t}', c) for t, c in PATTERNS]
build('magical-touch-design-handbook', 'The Complete Handbook', 'Every tool, one guide', 'The design editor, Photo Studio, background remover, packaging, textile, print production, patterns and trace — everything you need to design like a pro, free.', 'editor', allsecs, no='01', extra=('ps-text-gold', 'rm-result'))
print('ok')
