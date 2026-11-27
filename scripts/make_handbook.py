"""Builds the Magical Touch Design learning guides from real screenshots of the live site
(captured by e2e/probe/capture*.mjs) — HTML → PDF with Chromium."""
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
.row > .side {{ width: 70mm; flex: none; }}
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

IMG = lambda n: f"file:///tmp/claude-0/-home-claude/d9c85f66-47a1-520f-8eef-15a0bfdbc77b/scratchpad/guides2/img/{n}.jpg"


def shot(n, cap):
    return f'<figure class="shot"><img src="{IMG(n)}"><figcaption>{cap}</figcaption></figure>'


def steps(*items):
    return '<ol class="steps">' + ''.join(f'<li>{i}</li>' for i in items) + '</ol>'


def tip(t):
    return f'<div class="tip"><b>Tip · </b>{t}</div>'


def side(n, cap, body):
    return f'<div class="row"><div class="side">{shot(n, cap)}</div><div class="txt">{body}</div></div>'


# ------------------------------------------------------------------ content
def T(rows, head=None):
    h = ('<tr>' + ''.join(f'<th>{c}</th>' for c in head) + '</tr>') if head else ''
    return '<table>' + h + ''.join('<tr><td class="k">' + r[0] + '</td>' + ''.join(f'<td>{c}</td>' for c in r[1:]) + '</tr>' for r in rows) + '</table>'

START = [
    ("Free for everyone", f"""
<p>Magical Touch Design is a complete design and print studio in your browser. <b>Every tool is free</b>: no sign-up, no login, no watermark on downloads. Nothing you make is uploaded to our servers — designs are saved as files on <b>your own device</b>, and photo tools run on your device too.</p>
{T([['Templates', 'Social posts, stories, flyers, posters, cards, invitations, menus, certificates, presentations, packaging and garments.'],
    ['Design Editor', 'Pages, text in 17+ scripts, translation into 37 languages, text effects, shapes, frames, QR codes and barcodes, drawing, layers, brand kit and print-ready export.'],
    ['Photo Studio', 'Adjustments, colour, looks, filters, retouch brushes, face &amp; sculpt, selections, layers, live text, crop and export.'],
    ['Background Remover', 'One photo or up to 60 at once, with Restore / Erase touch-up.'],
    ['Passport Photo Maker', 'Exact sizes for passports, visas, ID cards and exam forms; print sheets.'],
    ['Packaging', 'Real box dielines at your exact size, board and crease; print PDF, DXF and specification.'],
    ['Textile', 'Garments as real pattern pieces from sizes or your measurements; team names and numbers.'],
    ['Pattern Design &amp; Image Trace', 'Seamless repeats, rangoli and mandala; pictures turned into vectors.'],
    ['Print tools', 'Print &amp; cut, Print Layout (many-up, booklets), Print Size &amp; Binding calculator.']], ['Tool', 'What it does'])}
{tip('Your work stays yours: save a design with <b>Save</b> — it downloads a <b>.mtd</b> file you can open again any time from <b>Open</b> or by dropping it on the editor.')}
"""),
    ("Start anything: the Create page", f"""
{shot('tool-create', 'Create: search sizes and templates, start with a tool, or pick a design type.')}
{steps('Open <b>Create</b> in the top menu.', 'Type what you are making in the search box (“story”, “A4”, “wedding”) — or tap <b>Help me choose</b>.', '<b>Start with a tool</b>: Blank design, Photo Studio, Packaging Design Studio, Background Remover, Passport Photo Maker, Pattern Design, Textile Design Studio, Image Trace, Print Size &amp; Binding Calculator, Print Layout.', 'Or tap a design type (Social media post, Story or reel cover, Invitation, Flyer or poster, Greeting card, Business card, Resume / CV …) and choose a size.')}
"""),
    ("Templates", f"""
{shot('tool-templates', 'Templates: one gallery for social media, print, packaging and textile.')}
{T([['Search', 'Type what you make — “business flyer”, “gift box”, “team jersey”. Popular searches sit under the box.'],
    ['Kinds', 'Social media, Text styles, Print files, Packaging boxes, Garments.'],
    ['Groups', 'All templates, Social media, Print &amp; marketing, Invitations &amp; cards, Photos &amp; albums, Business &amp; documents, Packaging, Textile &amp; garments.'],
    ['Filters', 'Design type, Occasion, Style, Colour and More filters; sort by Recommended or newest.'],
    ['Open one', 'Tap a template, then <b>Use this template</b>. It opens in the editor as your own copy — the original never changes.']])}
"""),
]

EDITOR = [
    ("The editor at a glance", f"""
{shot('ed-selected', 'A flyer open in the editor with the headline selected: the text toolbar appears above the page.')}
{T([['Top bar', 'Back · design name · Undo / Redo · <b>Simple / Pro</b> · workspace <b>Design / Packaging / Textile</b> · <b>Resize</b> · light/dark · <b>PDF</b> (one-click vector PDF) · <b>Export</b> · <b>Save</b> (with more save options in the arrow).'],
    ['Left rail', 'Templates, Elements, Text, Upload, Print &amp; cut, QR &amp; barcode, Draw, Background, Patterns, Colours, Trace, Brand, Layers. Tap one to open its panel; tap again to close.'],
    ['Page bar', 'Above the page: <b>Page</b>, <b>Background</b> colour and <b>Resize</b>.'],
    ['Toolbar', 'Appears when something is selected — its options change with the item (text, picture, shape).'],
    ['Bottom', 'Page thumbnails and <b>+</b> to add a page · page number and arrows · copy / delete page · zoom slider and % · fit / full screen · help.']], ['Area', 'What is there'])}
"""),
    ("Templates, Elements, Text and Upload panels", f"""
<div class="row"><div class="side">{shot('ed-rail-elements', 'Elements.')}</div><div class="txt">
<h3 style="margin-top:0">Templates</h3><p>Search and filter templates without leaving the editor; tap one to place it on the page.</p>
<h3>Elements</h3><p>Search shapes, frames and stickers. <b>Photo frames</b> — drop a photo on a frame and it fills the shape. <b>Shapes</b> and <b>Lines</b> — recolour, add borders, round corners. <b>Add sticker</b> — emoji-style stickers.</p>
<h3>Upload</h3><p>Add your own photos and logos (JPG, PNG, WebP, SVG). They stay on your device.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-text', 'Text.')}</div><div class="txt">
<h3 style="margin-top:0">Text</h3>
{T([['Add', 'Add a heading · Add a subheading · Add a little bit of body text.'],
    ['Page numbers', 'Styles such as 3, Page 3, 3 / 12, Page 3 of 12 — on <b>This page</b> or <b>Every page</b>.'],
    ['Articles &amp; columns', 'A headline and a story that flows from column to column and onto new pages: 1, 2 or 3 columns.'],
    ['Text styles', 'Ready-made styled titles (script, bold sale, outlined…).'],
    ['Font pairings', 'Adds a heading and body text in fonts that go together.']])}</div></div>
"""),
    ("The text toolbar", f"""
{shot('ed-selected', 'Font, weight, size, colour, bold / italic / underline / strike, alignment, case, curve, Text frame, Effects, Write, Translate, Position, transparency, lock and duplicate.')}
{T([['Font &amp; weight', 'Hundreds of Google fonts, including Indian, Arabic, Chinese and other scripts; weights from thin to black.'],
    ['Size', 'Type a size or use − / +.'],
    ['Colour', 'Any colour, document colours and brand colours.'],
    ['B I U S', 'Bold, italic, underline, strikethrough.'],
    ['Align · Aa', 'Left, centre, right, justify · UPPER / lower / Title case.'],
    ['Curve', 'Bend text into an arc (also in Effects → Shape).'],
    ['Text frame', 'Box the text: fixed width with wrapping, padding and a background.'],
    ['Position', 'Layer order and align to page.'],
    ['Lock · Copy', 'Lock stops accidental moves; duplicate makes a copy next to it.']])}
"""),
    ("Effects — looks for text", f"""
<div class="row"><div class="side">{shot('ed-tool-effects', 'Effects → Looks.')}</div><div class="txt">
<p>Select text and tap <b>Effects</b>. Every look keeps the text editable — change the words at any time.</p>
{T([['Looks', 'None, Soft shadow, Hard shadow, Lift, Glow, Neon, Outline, Hollow, Sticker, Retro, Comic, Splice, Gold, Rose gold, Silver, Chrome, Sunset, Ocean, Spectrum, Fire, Candy, Marker, Emerald, Ice.'],
    ['Gradient fill', 'Fill the letters with a gradient.'],
    ['Outline', 'A stroke around the letters, any colour and width.'],
    ['Shadow &amp; glow', 'Colour, blur, distance and angle.'],
    ['Highlight', 'A coloured band behind the text.'],
    ['Shape', '<b>Curve</b> bends the line into an arc; <b>Wave</b> makes it ripple.']])}
</div></div>
{tip('Start from a look, then fine-tune Outline or Shadow &amp; glow — the look updates as you go.')}
"""),
    ("Write and Translate", f"""
<div class="row"><div class="side">{shot('ed-tool-write', 'Text writer.')}</div><div class="txt">
<h3 style="margin-top:0">Write</h3>
{steps('Select text and tap <b>Write</b> (or Edit → Text writer).', 'Type in the box. Tick <b>Type Tamil in English letters (Tanglish)</b> to type phonetically.', 'Set <b>Direction</b> (Auto, left to right, right to left).', 'Pick a language and tap <b>Translate text</b>, then <b>Replace selected text</b> or <b>Insert as new text</b>. Copy, Paste, Clear and Back to the original are there too.')}
</div></div>
<div class="row"><div class="side">{shot('ed-tool-translate', 'Translate.')}</div><div class="txt">
<h3 style="margin-top:0">Translate</h3>
{steps('Tap <b>Translate</b>. Search or pick a language — English, Arabic, Hindi, Malayalam, Tamil, Telugu, Kannada, Bengali, Gujarati, Punjabi, Marathi, Urdu and many more (37 in all).', 'Choose <b>Selected</b> text or the <b>Whole design</b>.', '<b>Keep in English</b>: brand or person names that must not change, separated by commas. Web and e-mail addresses, phone numbers, prices and @handles always stay as they are.', 'Leave <b>Use fonts made for …</b> ticked so each text keeps its style in the new script.', 'Tap <b>Translate to …</b>. One Undo brings the original back.')}
</div></div>
"""),
    ("Position, Text frame and Layers", f"""
<div class="row"><div class="side">{shot('ed-tool-position', 'Position.')}</div><div class="txt">
<p><b>Position</b> → <b>Layer order</b>: Forward, Backward, To front, To back. <b>Align to page</b>: left, centre, right, top, middle, bottom. Select several items to align them to each other or space them evenly.</p>
<p><b>Layers</b> (left rail) lists everything on the page: drag to reorder, hide with the eye, lock with the padlock, rename by double-click.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-layers', 'Layers.')}</div><div class="txt">{shot('ed-tool-text-frame', 'Text frame.')}</div></div>
"""),
    ("Move dialog — exact moves and step-and-repeat", f"""
{shot('ed-move', 'Selection tool + Enter: the Move dialog, with Preview on.')}
{steps('Pick the Selection tool (V) and click an object (or several).', 'Press <b>Enter</b> — or choose <b>Move…</b> from the right-click or Edit menu.', 'Type <b>Horizontal</b> and <b>Vertical</b> in the page unit (px, mm, cm, in or pt), or a <b>Distance</b> and <b>Angle</b> — the four fields stay linked.', 'Keep <b>Preview</b> on to watch it move.', '<b>OK</b> moves it. <b>Copy</b> leaves the original and places a copy at that offset. <b>Cancel</b> or Esc puts it back.')}
{T([['Horizontal', 'Positive right, negative left.'], ['Vertical', 'Positive <b>down</b>, negative up.'], ['Angle', '0° right, 90° up, 180° left, −90° down.']])}
<h3>Step-and-repeat a sheet of cards</h3>
{steps('Place the first card at the top-left.', 'Enter → Horizontal = card width + gap (e.g. 90 mm for 85 mm cards with a 5 mm gap), Vertical = 0 → <b>Copy</b>.', 'Enter → Copy again until the row is full — the values are remembered.', 'Select the row → Enter → Horizontal 0, Vertical = card height + gap → Copy for each row.')}
"""),
    ("Draw", f"""
<div class="row"><div class="side">{shot('ed-rail-draw', 'Draw.')}</div><div class="txt">
{T([['Tools', 'Brush, Marker, Highlighter, Pencil, Eraser. Draw on the page with a mouse, finger or stylus (Apple Pencil and pressure pens work).'],
    ['Brush library', 'Basic round, Hard round, Soft round, Calligraphy, Artistic, Ink, Dry brush, Texture, Watercolour style, Pencil, Marker, Highlighter, Dashed, Pattern.'],
    ['Colour', 'Swatches and a custom colour.'],
    ['Brush settings', 'Size, Opacity, Smoothing, Stabiliser, Pressure / speed thinning, Taper, Hardness, Nib angle, Nib roundness, Spacing, Line ends (round / flat).'],
    ['Vector tools', 'Pen, Pencil path, Edit points, Select — drawings stay editable vectors.']])}
<p>Tap <b>Done</b> in the bar under the page to finish.</p></div></div>
"""),
    ("Background, Patterns and Colours", f"""
<div class="row"><div class="side">{shot('ed-rail-background', 'Background.')}</div><div class="txt">
<p><b>Background</b>: colours, gradients and patterns in one tap; <b>Use a photo as the background</b>; or a <b>Custom</b> solid colour or gradient.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-patterns', 'Patterns.')}</div><div class="txt">
<p><b>Patterns</b>: pick a motif and a repeat (Grid, Brick, Half-drop, Diamond, Mirror, Rotational, Radial, Kaleidoscope, Geometric, Organic, Random); set tile size, motif scale, rotation, spacing, opacity and background colour; <b>Add the pattern as an editable vector layer</b>. <i>More in Pattern Studio</i> opens the full tool.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-colours', 'Colours.')}</div><div class="txt">
<p><b>Colours</b>: tabs <b>Palettes</b>, <b>Values</b>, <b>Contrast</b>, <b>Gradient</b>. Generate harmonies (Complementary, Analogous, Triadic, Split complementary, Tetradic, Monochromatic), <b>Apply</b> a palette to the whole page, save palettes, see the colours <b>In this design</b>, browse <b>Palettes by mood</b>, check text contrast, and build a 2- or 3-colour gradient.</p></div></div>
"""),
    ("Trace, Brand and QR & barcode", f"""
<div class="row"><div class="side">{shot('ed-rail-trace', 'Trace.')}</div><div class="txt">
<p><b>Trace</b>: select a picture on the page and turn it into vector shapes. Presets: Logo – clean, Black &amp; white, Silhouette, Line art &amp; sketch, Hand lettering, 3 / 4 / 6 / 8 / 16 colours, High fidelity photo, Shades of grey, Technical drawing, Sketch, Low fidelity photo. Sliders: Colours, Detail, Smoothness, Ignore specks, Corner sharpness, Clean-up; <b>Separate shapes</b> and <b>Remove white background</b>.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-brand', 'Brand.')}</div><div class="txt">
<p><b>Brand</b> — <i>your brand, only when you want it</i>: switch on Brand colours, Brand fonts and Logo on this page, then <b>Apply to this page</b>. Save several brands, run <b>Brand check</b> against the page, take colours from your logo, and keep business details for business cards and letterheads. <i>Reset colours</i> brings back the template’s own colours.</p></div></div>
<div class="row"><div class="side">{shot('ed-rail-qr-barcode', 'QR &amp; barcode.')}</div><div class="txt">
{T([['QR opens', 'Link, Username (social platforms), Text, Email, Phone, WhatsApp, Wi-Fi (network, security, password), SMS, Contact card, Event, Location.'],
    ['Look', 'Ready-made looks; dot style (Square, Rounded, Dots, Fluid, Bars, Leaf, Circle); corner frame and centre styles; code, second and background colours; frame &amp; caption (Box, Badge, Bubble, Ribbon, Border).'],
    ['Logo', 'Add a logo in the centre (error correction is raised automatically).'],
    ['Barcode', 'EAN-13, UPC-A, Code 128, ITF-14 and more: data, bar width, height, colours, transparent background.']])}</div></div>
"""),
    ("Print & cut", f"""
<div class="row"><div class="side">{shot('ed-rail-print-cut', 'Print &amp; cut.')}</div><div class="txt">
{T([['Tabs', 'Cut &amp; sticker · Large format · Separations · Imposition · Data merge · Print sizes.'],
    ['Cut types', 'Kiss cut, Die cut, Through cut, Laser cut, Engrave / score, Perforation, Crease / fold, Sticker border (white).'],
    ['Cut line', 'Border width, offset from edge and smoothing; <b>Make cut line</b> or mark a selected line as a cut.'],
    ['Sticker sheet', 'Copies (0 = fill the page) and gap — <b>Arrange copies on the page</b>.'],
    ['Cut line check', 'Warns about open paths and lines too close to the edge.'],
    ['Downloads', 'SVG and DXF cut files (one layer per operation), Print-and-cut PDF (CMYK + cut spot colour), Technical document and job sheet.'],
    ['Data merge', 'Load a CSV: one page per row with names, numbers, photos or QR codes; preview records before export.']])}</div></div>
"""),
    ("Resize and Export", f"""
<div class="row"><div class="side">{shot('ed-resize', 'Resize.')}</div><div class="txt">
<p><b>Resize</b> re-arranges the content to fit a new size — nothing gets stretched. Pick a size (Social media, Business, Print, Events, Publishing) or type a custom width, height and unit. <b>Make a resized copy</b> keeps the original; <b>Resize this page</b> changes it.</p></div></div>
{shot('ed-export', 'Export: file type, quality and print options.')}
{T([['Print files', 'Actual size, fit to print, normal / bleed only and the job report.'],
    ['PNG / JPG', 'Sharp graphics (PNG can be transparent) / small files for photos.'],
    ['PDF (vector)', 'Sharp text and shapes at any size — sending and printing at home.'],
    ['PDF for print shops', 'Vector CMYK (FOGRA39) with bleed and crop marks.'],
    ['SVG (vector)', 'Editable vectors for Illustrator, Inkscape, CorelDRAW and Figma.'],
    ['TIFF · WebP', 'Lossless for print / small files for websites.'],
    ['Animated video (MP4)', 'Your design comes to life — for reels, stories and posts.'],
    ['Quality', 'Screen, Standard, Print (300 dpi) or Custom dpi.'],
    ['Options', 'Transparent background, Include bleed, Crop marks &amp; colour bar, Technical document (a spec sheet as a second PDF), page range.']])}
{tip('Downloads are free and never watermarked. Print files carry no branding of ours.')}
"""),
    ("Pro mode", f"""
{shot('ed-pro', 'Pro: menus, rulers, the vertical tool bar, a Properties panel, artboards and layers.')}
{T([['Menus', 'File, Edit, Object, Type, Select, View, Window, Help.'],
    ['Tool bar', 'Selection, direct selection, pen, pencil, brush, eraser, type, shapes, hand, artboard and zoom.'],
    ['Properties', 'Position &amp; size (x, y, w, h, shear, rotation) in px, mm, cm, in or pt · Align to page · Layer opacity and blend mode · Text settings.'],
    ['Artboards', 'Several artboards per design; export one or all (PNG or PDF); Print Setup per artboard.'],
    ['Workspaces', 'Main Design and Photo Editing.']])}
{shot('ed-menu-object', 'Object menu: Group, Ungroup, Bring to Front, Bring Forward, Send Backward, Send to Back, Lock, Hide, Join, Break Path at Anchor, Reverse Path Direction, Artboard Tool, Artboards Panel.')}
<h3>Keyboard shortcuts</h3>
<table>
<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>Z</kbd></td><td>Undo</td><td><kbd>Ctrl/⌘</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></td><td>Redo</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>C</kbd>/<kbd>V</kbd>/<kbd>X</kbd></td><td>Copy / paste / cut</td><td><kbd>Ctrl/⌘</kbd>+<kbd>D</kbd></td><td>Duplicate</td></tr>
<tr><td><kbd>Ctrl/⌘</kbd>+<kbd>G</kbd></td><td>Group (Shift = ungroup)</td><td><kbd>Ctrl/⌘</kbd>+<kbd>S</kbd></td><td>Save</td></tr>
<tr><td><kbd>Enter</kbd></td><td>Move… dialog</td><td><kbd>Shift</kbd>+<kbd>Enter</kbd></td><td>Use the path as a mask</td></tr>
<tr><td>Arrows</td><td>Nudge 1 px (Shift = 10)</td><td><kbd>Delete</kbd></td><td>Delete</td></tr>
<tr><td><kbd>V</kbd> <kbd>P</kbd> <kbd>T</kbd></td><td>Select, Pen, Type</td><td><kbd>Ctrl/⌘</kbd>+<kbd>0</kbd></td><td>Fit to screen</td></tr>
</table>
"""),
]

PHOTO = [
    ("Open a photo", f"""
<div class="row"><div class="side">{shot('ps-start', 'Start page.')}</div><div class="txt">
{steps('Open <b>Photo Studio</b> (top menu or Tools).', 'Tap <b>Choose a photo</b> or drop an image — it opens at full resolution. Or start a blank canvas in any size, unit and dpi.', 'Switch between <b>Simple</b> (big friendly tools) and <b>Pro</b> (the full professional workspace) at the top.')}
<p>Everything runs on your device — your photo is never uploaded.</p></div></div>
{shot('ps-simple', 'Simple mode: Enhance, Looks, Crop, Background, Retouch, Resize, Export and Passport.')}
"""),
    ("The Pro workspace", f"""
{shot('ps-pro', 'Pro: menus, tool bar, options bar, panels (Properties, Adjust, Colour, Filters, Looks), Layers and the status bar.')}
{T([['Top bar', 'Name · Simple / Pro · Undo / Redo · <b>Split</b> (before | after) · <b>Before</b> · <b>Print preview</b> · zoom · full screen · Save.'],
    ['Menus', 'File, Edit, Image, Layer, Select, Filter, View, Window.'],
    ['Tool bar', 'Move V, Marquee M (Shift M ellipse), Lasso L, Pen P, Select subject W, Crop C, Eyedropper I, Healing brush J, Brush B, Eraser E, Gradient G, Paint bucket K, Blur R, Dodge O, Type T, Shape U, Hand H, Zoom Z.'],
    ['Options bar', 'Settings for the chosen tool.'],
    ['Panels', 'Properties, Adjust, Colour, Filters, Looks — with Layers below (blend mode, opacity, visibility, add, + Image, duplicate, order, merge, delete).'],
    ['Status bar', 'Zoom, pixel size, dpi and print size, layer count.']], ['Area', 'What is there'])}
"""),
    ("Adjust and portrait retouch", f"""
<div class="row"><div class="side">{shot('ps-pro', 'Adjust panel.')}</div><div class="txt">
{T([['Light', 'Exposure, Contrast, Highlights, Shadows, Whites, Blacks (Simple mode shows the essentials: Brightness, Contrast, Highlights, Shadows).'],
    ['Colour', 'Temperature (warmth), Tint, Vibrance, Saturation.'],
    ['Detail', 'Texture, Clarity, Dehaze, Noise reduction, Colour noise reduction, Sharpen, Soften / blur.'],
    ['Lens &amp; effects', 'Vignette, Film grain, Fade, Distortion, Chromatic aberration.'],
    ['Auto', 'Auto enhance balances light and colour in one tap.'],
    ['Portrait retouch', 'Skin smoothing · Keep skin texture (60 by default) · Even skin tone · Skin glow. Presets — Female: Natural beauty, Soft skin, Studio beauty, Glamour, Wedding portrait, Professional makeup, Natural glow. Male: Natural male retouch, Professional headshot, Business portrait, Clean skin, Beard enhancement, Studio portrait, Cinematic portrait.']])}
<p>Changes apply to the selected layer only — the note under the menus says which.</p></div></div>
"""),
    ("Face & sculpt — a real example", f"""
{shot('ps-face-vline', 'Face &amp; sculpt, Side by side: the V-line face look at 120% strength. Original left, result right.')}
{steps('Adjust → <b>Face — eyes, teeth, lips, shape</b> → <b>Find face</b>. The face finder downloads once; then everything runs on your device.', 'Choose a look: <b>Natural</b> (Fresh eyes, Well rested, Bright smile), <b>Beauty</b> (Soft glam, Big bright eyes, Rose lips), <b>Sculpt</b> (V-line face, Petite features, Balanced), <b>Portrait (men)</b> (Clean &amp; rested, Defined jaw, Strong brow).', 'Set <b>Strength</b> (0–150%). Fine-tune any slider.', 'Compare with <b>Side by side</b>, <b>Divider</b>, <b>Before</b>, <b>After</b>; preview the <b>Face</b> or the <b>Whole photo</b>; hold <b>Hold to see the original</b>.', 'Press <b>Apply face edits</b>.')}
{T([['Eyes', 'Brighten eye whites, Iris clarity, Dark circles, Eye size, Eye distance, Fix red eye.'],
    ['Brows &amp; forehead', 'Brow lift, Forehead height.'],
    ['Nose', 'Slim nose, Nose length.'],
    ['Mouth', 'Whiten teeth, Lip colour + any <b>Lip shade</b>, Lip saturation, Fuller lips, Mouth width, Smile lift.'],
    ['Face shape', 'Slim face, Slim jaw, Chin length.']], ['Group', 'Sliders'])}
<div class="row"><div class="side">{shot('face-original', 'Original.')}</div><div class="side">{shot('face-vline', 'V-line face.')}</div></div>
<div class="row"><div class="side">{shot('face-eyes', 'Big bright eyes.')}</div><div class="side">{shot('face-glam', 'Soft glam.')}</div></div>
{tip('Shape changes are capped so faces stay natural. Small steps (10–25) look best; layer opacity lets you blend the result back.')}
"""),
    ("Colour, Filters and Looks", f"""
<div class="row"><div class="side">{shot('ps-tab-colour', 'Colour.')}</div><div class="txt">
<p><b>Colour</b>: <b>Levels</b> (black point, mid-tones, white point, histogram, Auto levels), <b>Curves</b> (RGB or Red / Green / Blue), <b>Colour mixer</b> (hue, saturation and lightness per colour: Reds, Oranges, Yellows, Greens, Aquas, Blues, Purples, Magentas), <b>Colour grading</b> and <b>Black &amp; white</b>.</p></div></div>
<div class="row"><div class="side">{shot('ps-pro-filters', 'Filters.')}</div><div class="txt">
<p><b>Filters</b>: Blur, Motion blur, Sharpen, Add noise, Pixelate, Emboss, Posterize, Soft glow, Halftone, Sepia, Black &amp; white, Invert — on the layer, or only inside a selection.</p>
<p><b>Looks</b>: one-tap styles previewed on your own photo — Auto enhance, Vivid, Golden, Cool, Soft portrait, Matte, Film, Dramatic, Black &amp; white, Noir, Silver. Fine-tune any slider afterwards.</p></div></div>
"""),
    ("Retouch brushes and tools", f"""
{T([['Healing brush J', 'Paint over spots, dust or small objects — they blend away.'],
    ['Clone stamp', 'Alt-click a source, then paint to copy it.'],
    ['Brush B · Eraser E', 'Paint any colour · make the layer see-through.'],
    ['Smudge · Soften (Blur R)', 'Blend like wet paint · smooth skin or a busy area.'],
    ['Dodge O · Burn · Sharpen', 'Lighten · darken · crisp up details where you paint.'],
    ['Face brushes', 'Enlarge eyes, Slim nose, Reshape (drag to push features), Hair colour, Whiten.'],
    ['Gradient G · Paint bucket K', 'Linear or radial gradients · fill similar colours.'],
    ['Type T · Shape U', 'Live text with pro effects · rectangles, ellipses and lines on their own layers.'],
    ['Eyedropper I', 'Pick a colour from the photo.']])}
<div class="row"><div class="side">{shot('ps-tool-heal', 'Healing brush options.')}</div><div class="side">{shot('ps-tool-type', 'Type tool.')}</div></div>
"""),
    ("Selections, layers and the Move dialog", f"""
{T([['Marquee M', 'Rectangle; Shift M ellipse; hold Shift for a square or circle.'],
    ['Lasso L', 'Freehand or point to point.'],
    ['Pen P', 'Precise paths — Ctrl/⌘ + Enter makes a selection (+Shift adds, +Alt subtracts).'],
    ['Select subject W', 'Finds the person or product.'],
    ['With the selection', 'Content-aware fill, mask, layer via copy (Ctrl/⌘ J), delete, fill, invert (Ctrl/⌘ Shift I), adjust or filter inside it.'],
    ['Layers', 'New, + Image, duplicate, order (Ctrl/⌘ [ ]), merge down (Ctrl/⌘ E), flatten; blend modes and opacity; drop shadow, outer glow, stroke.']])}
{shot('ps-move-dialog', 'Move tool + Enter: the exact Move dialog in pixels — OK moves, Copy keeps the original.')}
<p>With nothing selected, OK moves the layer and Copy adds a moved copy on a new layer. With a selection, OK moves the selected pixels and Copy copies them to the new place.</p>
"""),
    ("Crop, size, print and export", f"""
<div class="row"><div class="side">{shot('ps-tab-crop', 'Crop.')}</div><div class="txt">
{T([['Crop C', 'Free, Original, 1:1, 4:5, 5:4, 3:2, 2:3, 4:3, 3:4, 16:9, 9:16; Straighten &amp; rotate.'],
    ['Exact size', 'Passport 35×45 mm, Visa 2×2 in, 10×10 cm, 4×6 and 5×7 in prints, A4, A5, Instagram post / story, Facebook cover.'],
    ['Image', 'Image size (pixels, mm, cm, in, dpi), canvas size, rotate, flip.'],
    ['Print preview', 'The real printed size before you export.'],
    ['Export', 'PNG (transparent), JPG, WebP, TIFF or PDF; RGB for screens or CMYK for print; quality and dpi.'],
    ['Save', 'A .mtd project with every layer and live text, on your device.']])}</div></div>
"""),
]

REMOVER = [
    ("Background Remover", f"""
{steps('Open <b>Background Remover</b>. Choose up to 60 photos or drop them (JPG, PNG or WebP).', 'Backgrounds are removed on your device — nothing is uploaded.', 'Pick the result: <b>Transparent</b>, <b>White</b> or any <b>Colour</b>; set <b>Edge</b> (soft to natural).', 'Tap <b>Edit</b> on a photo to restore or erase areas with a brush.', '<b>Download all</b> as a ZIP, <b>Save to a folder</b>, or download one as PNG.')}
{shot('tool-remover-result', 'A real result: the background removed, ready to download as a transparent PNG.')}
"""),
    ("Passport Photo Maker", f"""
{shot('tool-passport-result', 'A real result: India passport size 35 × 45 mm, background replaced and head sized automatically, with guides.')}
{steps('Choose the <b>Country</b> and filter by Passport, Visa / residence, ID card / licence, Exam &amp; job forms or Other.', 'Pick the purpose — for India for example: passport size photo 35 × 45 mm, Indian passport abroad 51 × 51 mm, e-Visa (square JPEG 10–300 KB), OCI card (up to 200 KB), PAN card 25 × 35 mm, UPSC, SSC, IBPS / SBI / RRB exam forms.', 'Upload a front-facing photo (even light, no shadows, shoulders visible).', 'Check the guides (top of head, chin) and touch up edges with the brush if needed.', 'Download the <b>Digital photo (JPG)</b> at the exact pixels and KB, the <b>Print photo (300 DPI)</b>, or a <b>print sheet</b> (e.g. 6 photos on 4 × 6 in paper) as JPG or PDF.')}
{tip('Rules change: check the official page for your application before you submit.')}
"""),
]

PACKAGING = [
    ("Start a box", f"""
{shot('tool-packaging', 'Packaging Design Studio: start a blank box or browse the templates.')}
{steps('Open <b>Packaging</b> (Tools → Packaging Design Studio).', '<b>Start a blank box</b> or pick a template and <b>Customise</b>.', 'The editor opens in the Packaging workspace with the box on its real dieline.')}
{shot('tool-packaging-editor', 'The Packaging panel: Box, Lines and Files tabs, every box style, and the flat blank.')}
"""),
    ("Size, board and crease", f"""
{T([['Size entered as', '<b>Inside size</b>, <b>Outside size</b>, or <b>Product + fitting gap</b>.'],
    ['Board', 'Folding boxboard (SBS, FBB), kraft, corrugated flutes or rigid board — weight and caliper; thickness added at every fold.'],
    ['Crease', 'The crease rule and channel for that board.'],
    ['Glue flap', 'Width, which panel, end angle, optional thumb notch.']], ['Setting', 'Meaning'])}
<p>Styles: reverse tuck end, straight tuck end, seal end (glued), folding carton, tuck top with 1-2-3 snap-lock or crash-lock bottom, gable box with handle, pillow box, sleeve, four-corner tray, tray with lid, tray and sleeve, mailer box, and shipping boxes (RSC, HSC, FOL).</p>
{T([['Tuck end', 'Reclosable — cosmetics, toys, small goods.'], ['Glued (full, partial, economy)', 'Strong, tamper-evident.'], ['1-2-3 snap lock', 'Folds and locks without glue — heavier products.'], ['Crash lock', 'Pre-glued auto bottom — fastest to pack.']], ['End', 'Use it for'])}
"""),
    ("Design on the dieline", f"""
{steps('The dieline sits locked on its own layer; clicks go through to your artwork.', 'Add text, photos, shapes and patterns on the panels (front, back and sides are marked).', 'Backgrounds run 3 mm past cut lines into the bleed; text and barcodes stay 3 mm inside creases.', 'Add a barcode from <b>QR &amp; barcode</b> (EAN-13, UPC-A, Code 128, ITF-14).', 'Read the <b>structure check</b> in the Lines tab — short flaps, tucks that will not lock, narrow glue flaps.')}
{T([['Bleed 3 mm', 'No white edges after cutting.'], ['Safe area 3 mm', 'Nothing important on a fold.'], ['Glue areas bare', 'Glue holds on bare board.'], ['Barcode', 'Dark bars on light ground, quiet zone clear, flat panel.'], ['Small text', '6 pt or larger in 100% black.'], ['Pictures', '300 ppi at printed size.']], ['Rule', 'Why'])}
"""),
    ("Files for the printer", f"""
{T([['Print PDF', 'Vector CMYK, dieline as overprinting spot colours (CutContour, Crease) on its own layer.'],
    ['Dieline template', 'A branded drawing of the flat blank with a line legend.'],
    ['DXF', 'For the die maker, one layer per line type.'],
    ['Technical document', 'Style, inside / outside / flat sizes, board, crease, glue, ends, panels, legend, checks and sign-off.']], ['File', 'For'])}
{tip('Print the dieline template at 100% on plain paper, fold it round the product, then send the files.')}
"""),
]

TEXTILE = [
    ("Garments as pattern pieces", f"""
{shot('tool-textile', 'Textile Design Studio: polo, T-shirt, kurti / kameez, sports jersey, frock / dress, churidar and dupatta.')}
{steps('Open <b>Textile</b> (Tools → Textile Design Studio).', '<b>Start a blank garment</b> or pick a template (12 ready designs) and Customise.', 'The editor opens in the Textile workspace with the pieces laid out.')}
{shot('tool-textile-editor', 'The Textile panel: Garment, Team, Fabric and Files tabs; size; measurements; fit and style.')}
"""),
    ("Size, measurements and fit", f"""
{T([['Garment', 'Polo shirt, T-shirt, Sports jersey, Kurti / kameez, Churidar, Frock / dress, Dupatta.'],
    ['Size', 'XS to XXXL, or Custom with your own measurements in cm.'],
    ['Measurements', 'Chest, body length, shoulder, armhole, sleeve length, upper arm and more (all 11 measurements).'],
    ['Fit &amp; style', 'Ease at the chest, shoulder drop, collar height, placket length, sleeve type, neck (round, V, boat) and skirt shape.'],
    ['Seam allowance', '10 mm by default; stitch line drawn inside the cut line.']])}
<p>Artwork is clipped to each piece and stays on it when you change the size.</p>
"""),
    ("Team, fabric and production files", f"""
{steps('<b>Team</b>: paste the roster — name, number, size per line — and tap <b>Add name and number</b>. Download one page per player.', '<b>Fabric</b>: fabric needed for one garment at your fabric width; warns when a piece is wider than the fabric.', '<b>Files</b>: Print PDF (CMYK, cut line as a spot colour), Pattern PDF (full size or tiled A4 with a 10 cm test square), DXF (cut, stitch, grain, notch layers), Technical document.')}
"""),
]

PRINT = [
    ("Print basics", f"""
{T([['Trim', 'The finished size.'], ['Bleed', '3 mm past the trim on every side (5 mm for large formats if asked).'], ['Safe area', 'Text and logos 3–5 mm inside the trim.'], ['Crop marks', 'Show where to cut — tick them in Export.'], ['Resolution', '300 ppi at printed size (150 ppi for posters seen from afar).'], ['RGB / CMYK', 'Screens RGB; presses CMYK. PDF for print shops converts to CMYK (FOGRA39).'], ['Black', 'Small text 100% black; large areas a rich black from your printer.'], ['Lines', 'At least 0.25 pt.']], ['Term', 'What to do'])}
<h3>Before you send it</h3>
{T([['Size', 'Trim correct, bleed on all sides.'], ['Text', 'Spelling checked; nothing in the 3 mm edge; small text 100% black.'], ['Pictures', 'No “Low” resolution in the technical document.'], ['Pages', 'Saddle-stitched booklets: page count a multiple of 4.']])}
"""),
    ("Print Layout", f"""
{shot('tool-print-layout', 'Many-up sheet: 9 business cards (85 × 55 mm, 3 mm bleed) on A4 with crop marks.')}
{steps('Choose a PDF or picture — e.g. a business card exported with bleed.', 'Set the item size (or pick Business card 85 × 55 mm), bleed and gap; the sheet (A4…), portrait or landscape and border margin.', 'Fit: <b>Best fit</b>, <b>Upright</b> or <b>Turned</b>; tick <b>Crop marks</b>.', '<b>Download print PDF</b>.')}
{shot('tool-print-layout-booklet', 'Booklet (saddle-stitch): pages put in printing order; exact spreads or two pages wide.')}
"""),
    ("Print Size & Binding Calculator", f"""
{shot('tool-print-size', 'Spine width and the full cover spread for a perfect-bound A4 book of 120 pages.')}
<p>Tabs: <b>Book, spine &amp; cover</b> · <b>Folding &amp; brochures</b> · <b>Paper size, DPI &amp; bleed</b>. Enter the binding (Perfect / softcover, Saddle stitch, Hardcover / case, Wire-O, Spiral, Comb), finished size, page count, paper weight and type, finish and cover stock — get the spine width, cover spread with bleed, leaves and book block. <b>Open cover in Design Editor</b> starts a page at exactly that size.</p>
{tip('Spine width comes from paper thickness — ask your printer for the paper’s caliper for an exact figure.')}
"""),
]

PATTERNS = [
    ("Pattern Design", f"""
{shot('tool-patterns', 'Repeat pattern: a half-drop repeat, with tile size and seamless edges shown.')}
{steps('Pick a motif — 160+ shapes in Basic, Geometric, Stars &amp; bursts, Floral, Nature, Celebration, Ornament, Lines &amp; marks, Tile &amp; textile, Sport, Traditional — or <b>Use your own drawing or logo</b>.', 'Choose the repeat: Grid, Brick, Half-drop, Diamond, Mirror, Rotational and more.', 'Change colours, size and spacing; preview at Actual size, 1 tile, 2×2, 3×3 or 5×5.', '<b>Edit single motifs</b>: tap one motif to move, turn, resize, recolour or hide just that one.', 'Pick a size and <b>Edit in a design</b> or <b>Save</b> a seamless tile (SVG, vector PDF or PNG).')}
<p>The <b>Rangoli &amp; Mandala</b> tab draws from the centre — petals, dots and rings, with festival presets.</p>
"""),
    ("Image Trace", f"""
{shot('tool-trace-result', 'A real trace of our logo: 3 colours, 20 shapes, ready as SVG, PDF or PNG.')}
{steps('Tap <b>Choose a picture</b> — a logo, sketch or photo.', 'Pick a preset: Logo – clean, Black &amp; white, Silhouette, Line art &amp; sketch, Hand lettering, 3–16 colours, High fidelity photo, Shades of grey, Technical drawing, Sketch, Low fidelity photo.', 'Adjust Colours and Detail; keep <b>Remove white background</b> on for logos; compare original and vector with the slider.', 'Download <b>SVG</b>, <b>PDF</b> or <b>PNG</b>, or <b>Edit as vectors</b> in the editor.')}
{tip('Tracing runs on your device. Your picture is never uploaded.')}
"""),
]

GUIDES = {
    'magical-touch-design-handbook': ('The Complete Handbook', 'Every tool, real screenshots', 'Templates, the design editor, Photo Studio with face &amp; sculpt, background remover, passport photos, packaging, textile, patterns, trace and print — step by step.', 'ed-selected', None, '01', ('ps-face-vline', 'tool-packaging-editor')),
    'design-editor-guide': ('Design Editor', 'Complete guide', 'Every panel, the text toolbar and effects, write and translate, draw, brand, QR and barcodes, print &amp; cut, the Move dialog, resize, export and Pro mode.', 'ed-selected', START + EDITOR, '02', ('ed-tool-effects', 'ed-tool-translate')),
    'photo-studio-guide': ('Photo Studio', 'Complete guide', 'Adjust, portrait retouch, face &amp; sculpt, colour, filters, brushes, selections, layers, the Move dialog, crop and export.', 'ps-face-vline', PHOTO, '03', ('ps-pro', 'ps-tab-colour')),
    'background-remover-guide': ('Background &amp; Passport', 'Complete guide', 'Remove backgrounds from one photo or sixty, and make passport, visa and exam photos at the exact size.', 'tool-remover-result', REMOVER, '04', ('tool-passport-result', '')),
    'packaging-guide': ('Packaging Design', 'Complete guide', 'Box styles and ends, sizes and board, designing on the dieline, artwork rules and the files a printer and die maker need.', 'tool-packaging-editor', PACKAGING, '05', ('tool-packaging', '')),
    'textile-guide': ('Textile Design', 'Complete guide', 'Garments as real pattern pieces: sizes and measurements, team names and numbers, fabric and production files.', 'tool-textile-editor', TEXTILE, '06', ('tool-textile', '')),
    'print-production-guide': ('Print Production', 'Complete guide', 'Print basics and checklist, Print Layout, booklets and the Print Size &amp; Binding calculator.', 'tool-print-layout', PRINT, '07', ('tool-print-size', '')),
    'patterns-trace-guide': ('Patterns and Trace', 'Complete guide', 'Seamless repeats, rangoli and mandala, and turning pictures into clean vectors.', 'tool-patterns', PATTERNS, '08', ('tool-trace-result', '')),
}
ALL = [(f'Getting started — {t}', c) for t, c in START] + [(f'Design Editor — {t}', c) for t, c in EDITOR] + [(f'Photo Studio — {t}', c) for t, c in PHOTO] + [(f'Photos — {t}', c) for t, c in REMOVER] + [(f'Packaging — {t}', c) for t, c in PACKAGING] + [(f'Textile — {t}', c) for t, c in TEXTILE] + [(f'Print — {t}', c) for t, c in PRINT] + [(f'Patterns and Trace — {t}', c) for t, c in PATTERNS]

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
<div class="foot"><span><b>magicaltouchdesign.com</b> · Free · No watermark</span><span>Edition November 2026 · real screenshots</span></div></div></div>
<div class="toc"><h2>Contents</h2><ol>{toc}</ol></div>
{body}
<div class="end"><img src="file://{LOGO}" style="height:12mm"><h2 style="margin-top:8mm">Now make something magical.</h2><p style="color:#6b7280">Every tool is free — no sign-up, no login, nothing stored on our servers. magicaltouchdesign.com</p></div>
</body></html>"""
    open(f'{slug}.html', 'w').write(doc)



for slug, (t, k, lead, hero, secs, no, extra) in GUIDES.items():
    build(slug, t, k, lead, hero, secs if secs is not None else ALL, no=no, extra=extra)
print('ok')
