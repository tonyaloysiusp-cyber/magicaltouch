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
<p>Every design starts in one of three ways: from one of more than 8,000 templates, from a blank page in any size, or from a photo in Photo Studio. Everything is free, with no watermark.</p>
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
{steps('Tap a text once to select it; tap again (or double-click) to type.', 'Change the font, weight and size in the bar. Fonts load automatically, including Arabic and Hindi fonts.', 'Pick a colour — your brand colours and the colours already in the design are offered first.', 'Open <b>Effects</b> for shadow, glow, outline, echo, neon and curved text.', 'Use <b>Translate</b> to translate one text or the whole design; the right fonts are chosen for the new language.')}
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
    ("Download and share", f"""
{side('export', 'Export: PNG, JPG, vector PDF, PDF for print shops (CMYK), TIFF and WebP.', steps('Tap <b>Export</b> (or <b>PDF</b> for one-click vector PDF).', 'Choose the file type: PNG for sharing, JPG for photos, <b>PDF (vector)</b> for printing at home, <b>PDF for print shops</b> for professional printing.', 'Pick the quality: Screen, Standard, Print (300 dpi) or Custom.', 'Optional: transparent background, bleed, crop marks and colour bar for print.', 'Tap <b>Download</b>. Or Save to keep working later — designs are saved in your Dashboard.') + tip('For a printer, choose <b>PDF for print shops</b> with bleed and crop marks — it is what they expect.'))}
<h3>Keyboard shortcuts</h3>
<table>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>Z</kbd></td><td>Undo</td><td><kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd></td><td>Redo</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>C</kbd> / <kbd>V</kbd></td><td>Copy / paste</td><td><kbd>Ctrl/⌘</kbd> + <kbd>D</kbd></td><td>Duplicate</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd> + <kbd>S</kbd></td><td>Save</td><td><kbd>Ctrl/⌘</kbd> + <kbd>0</kbd></td><td>Fit page to screen</td></tr>
<tr><td><kbd>Delete</kbd></td><td>Delete selection</td><td>Arrow keys</td><td>Nudge (Shift = 10×)</td></tr>
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
<tr><td class="k">Move</td><td>Drag with Move (V). Parts pushed outside the canvas are only hidden — move them back and they return.</td></tr>
</table>""")}
{tip('Each layer has its own adjustments: brighten a cut-out without touching the background.')}
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
{side('ps-file-menu-crop', 'File menu.', steps('<b>Save</b> keeps the project (with layers and live text) in your account or as a .mtd file on your device.', '<b>File → Export</b>: PNG (transparent), JPG, WebP, TIFF or PDF.', 'Choose <b>RGB</b> for screens or <b>CMYK</b> for print shops, and the dpi.', '<b>Quick download</b> saves a PNG in one tap; <b>Apply to design</b> sends the photo into a design in the editor.'))}
{tip('Keep the .mtd project: you can reopen it later with every layer and text still editable.')}
"""),
]

GUIDES = {
    'design-editor-guide': ('Design Editor', 'Complete guide', 'Templates, text and pro text effects, photos, elements, brand kit, pages, resizing and print-ready downloads — step by step.', 'editor', EDITOR, '02', ('ed-fx', 'gallery')),
    'background-remover-guide': ('Background Remover', 'Complete guide', 'One photo or sixty: remove backgrounds on your device, then touch up every edge by hand.', 'rm-result', REMOVER, '03', ('rm-overlay', 'rm-results')),
    'photo-studio-guide': ('Photo Studio', 'Complete guide', 'Every tool explained: adjustments, colour, looks, filters, retouching, selections, layers, live text effects, crop and print-ready export.', 'ps-text-gold', PHOTO, '04', ('ps-looks', 'ps-colour')),
}


ACCENT = {'01': '#F7A1C4', '02': '#B7A8FF', '03': '#6FE3CB', '04': '#7FD4F5'}


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
allsecs = [(f'Design Editor — {t}', c) for t, c in EDITOR] + [(f'Background Remover — {t}', c) for t, c in REMOVER] + [(f'Photo Studio — {t}', c) for t, c in PHOTO]
build('magical-touch-design-handbook', 'The Complete Handbook', 'Every tool, one guide', 'The design editor, Photo Studio and the background remover — everything you need to design like a pro, free.', 'editor', allsecs, no='01', extra=('ps-text-gold', 'rm-result'))
print('ok')
