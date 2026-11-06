"""Builds the Magical Touch Design PDF guides (HTML → PDF with Chromium)."""
import os, html

FONTS = '/tmp/claude-0/-home-claude/d9c85f66-47a1-520f-8eef-15a0bfdbc77b/scratchpad/fontsflat'
LOGO = '/home/claude/magicaltouch/public/logo.png'

CSS = f"""
@font-face {{ font-family: Poppins; src: url('file://{FONTS}/Poppins-SemiBold.ttf'); font-weight: 600; }}
@font-face {{ font-family: Poppins; src: url('file://{FONTS}/Poppins-Bold.ttf'); font-weight: 700; }}
@font-face {{ font-family: Inter; src: url('file://{FONTS}/Inter[opsz,wght].ttf'); font-weight: 100 900; }}
@page {{ size: A4; margin: 18mm 16mm 18mm 16mm; }}
* {{ box-sizing: border-box; }}
body {{ font-family: Inter, sans-serif; color: #1f2430; font-size: 10.5pt; line-height: 1.55; margin: 0; }}
h1, h2, h3 {{ font-family: Poppins, sans-serif; color: #0b0d12; margin: 0; }}
h2 {{ font-size: 21pt; line-height: 1.15; margin: 0 0 4mm; }}
h3 {{ font-size: 12.5pt; margin: 6mm 0 2mm; }}
p {{ margin: 0 0 3mm; }}
.spectrum {{ height: 4px; border-radius: 4px; background: linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B); }}
.cover {{ height: 255mm; display: flex; flex-direction: column; page-break-after: always; }}
.cover .logo {{ height: 11mm; }}
.cover .mid {{ margin-top: 48mm; }}
.cover .kicker {{ font-family: Poppins; font-weight: 600; letter-spacing: .18em; font-size: 9.5pt; color: #3B82C4; text-transform: uppercase; }}
.cover h1 {{ font-size: 40pt; line-height: 1.05; margin: 4mm 0 6mm; }}
.cover .lead {{ font-size: 13pt; color: #565d6d; max-width: 140mm; }}
.cover .hero {{ margin-top: 12mm; border-radius: 5mm; overflow: hidden; box-shadow: 0 6mm 14mm -6mm rgba(0,0,0,.35); }}
.cover .hero img {{ width: 100%; display: block; }}
.cover .foot {{ margin-top: auto; display: flex; justify-content: space-between; color: #8b91a0; font-size: 9pt; }}
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
    ("Open a photo", f"""
<p>Photo Studio is a full photo editor in your browser: adjustments, filters, retouching, layers, selections, background removal and print-ready export. Everything happens on your device.</p>
{shot('photo', 'Photo Studio: open a photo, or start a blank canvas in any size.')}
{steps('Tap <b>Photo Studio</b> in the top menu (or Tools → Photo Studio).', 'Tap <b>Choose a photo</b> or drop an image — it opens at full resolution.', 'Or <b>Start from a blank canvas</b>: pick a preset (square, story, A4, US letter, 4×6 in print…) or type the size and dpi.')}
"""),
    ("Adjust and enhance", f"""
<table>
<tr><td class="k">Auto enhance</td><td>One tap for balanced brightness, contrast and colour.</td></tr>
<tr><td class="k">Adjust</td><td>Brightness, contrast, highlights, shadows, warmth, saturation, sharpness, black point.</td></tr>
<tr><td class="k">Filters</td><td>Ready-made looks; set the amount with the slider.</td></tr>
<tr><td class="k">Crop &amp; straighten</td><td>Free or fixed ratios (1:1, 4:5, 9:16, 16:9, 3:2…), print sizes, and an angle slider to level the horizon.</td></tr>
<tr><td class="k">Image size</td><td>Change the pixel size or print size and dpi.</td></tr>
</table>
{tip('Do adjustments before retouching and cutting out — every later step looks better on a well-exposed photo.')}
"""),
    ("Retouch", f"""
<table>
<tr><td class="k">Healing brush</td><td>Paint over spots, dust or small blemishes; they blend into the surrounding area.</td></tr>
<tr><td class="k">Content-aware fill</td><td>Select an unwanted object and fill the area from its surroundings.</td></tr>
<tr><td class="k">Dodge / Burn</td><td>Lighten or darken areas by painting — great for eyes, highlights and depth.</td></tr>
<tr><td class="k">Blur / Sharpen</td><td>Soften a background or sharpen details where you paint.</td></tr>
<tr><td class="k">Brush, Eraser, Gradient</td><td>Paint, erase and add colour gradients; brush size and hardness are adjustable.</td></tr>
</table>
"""),
    ("Layers and selections", f"""
<p>Like a professional photo editor, Photo Studio works with <b>layers</b>: duplicate a layer before big changes, add a <b>layer mask</b> to hide parts without erasing them, and use layer styles such as drop shadow and stroke.</p>
<table>
<tr><td class="k">Selections</td><td>Rectangular and elliptical marquee, lasso; Inverse, Deselect, Copy to new layer, Delete selection, Fill with black / white.</td></tr>
<tr><td class="k">Layers</td><td>Duplicate, delete, bring forward / send backward, blend modes, opacity, flatten image.</td></tr>
<tr><td class="k">History</td><td>Step back through every change.</td></tr>
</table>
{tip('Remove a background on its own layer, keep the original underneath and hide it — you can always go back.')}
"""),
    ("Export", f"""
{steps('Open <b>File → Export</b>.', 'Choose PNG (transparent), JPG or a print file; RGB for screens, CMYK for print shops.', 'Or tap <b>Apply to design</b> to send the photo straight into a design in the editor.')}
{tip('For social media, crop to the platform ratio first (4:5 for Instagram posts, 9:16 for stories) so nothing important is cut off.')}
"""),
]

GUIDES = {
    'design-editor-guide': ('Design Editor', 'Complete guide', 'Templates, text, photos, elements, brand kit, pages, resizing and print-ready downloads — step by step.', 'home', EDITOR),
    'background-remover-guide': ('Background Remover', 'Complete guide', 'One photo or sixty: remove backgrounds on your device, then touch up every edge by hand.', 'rm-overlay', REMOVER),
    'photo-studio-guide': ('Photo Studio', 'Complete guide', 'Enhance, retouch, select and export photos like a pro — right in your browser.', 'photo', PHOTO),
}


def build(slug, title, kicker, lead, hero, sections, chapters=None):
    toc = ''.join(f'<li>{html.escape(t)}</li>' for t, _ in sections)
    body = ''.join(f'<div class="section"><div class="spectrum"></div><p class="num">{("PART " + chapters[i] + " · ") if chapters else ""}{i + 1:02d}</p><h2>{html.escape(t)}</h2>{c}</div>' for i, (t, c) in enumerate(sections))
    doc = f"""<!doctype html><html><head><meta charset="utf-8"><title>{title} — Magical Touch Design</title><style>{CSS}</style></head><body>
<div class="cover"><img class="logo" src="file://{LOGO}"><div class="mid"><div class="spectrum" style="width:40mm"></div><p class="kicker" style="margin-top:6mm">{kicker}</p><h1>{title}</h1><p class="lead">{lead}</p></div>
<div class="hero"><img src="{IMG(hero)}"></div><div class="foot"><span>magicaltouchdesign.com</span><span>Free · No watermark · Edition November 2026</span></div></div>
<div class="toc"><h2>Contents</h2><ol>{toc}</ol></div>
{body}
<div class="end"><img src="file://{LOGO}" style="height:12mm"><h2 style="margin-top:8mm">Now make something magical.</h2><p style="color:#6b7280">Free lessons with certificates: magicaltouchdesign.com/tutorials</p></div>
</body></html>"""
    open(f'{slug}.html', 'w').write(doc)


for slug, (t, k, lead, hero, secs) in GUIDES.items():
    build(slug, t, k, lead, hero, secs)
allsecs = [(f'Design Editor — {t}', c) for t, c in EDITOR] + [(f'Background Remover — {t}', c) for t, c in REMOVER] + [(f'Photo Studio — {t}', c) for t, c in PHOTO]
build('magical-touch-design-handbook', 'The Complete Handbook', 'Every tool, one guide', 'The design editor, Photo Studio and the background remover — everything you need to design like a pro, free.', 'editor', allsecs)
print('ok')
