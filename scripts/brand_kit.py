"""
Magical Touch brand kit: the official designs in Admin → Brand workspace.

  python3 scripts/brand_kit.py out.json

Builds editor-format canvas JSON (Fabric 5) for
  · 4 secure certificate masters (guilloche border, microtext, watermark,
    {{tokens}} and a "Verification slot" where the QR + code is printed)
  · stationery: letterhead, envelope (DL), invoice, business card front/back
  · ID card front/back (CR80) with lanyard slot
  · roll-up banner 850 × 2000 mm
  · digital screens 1920 × 1080 and 1080 × 1920
Every design is vector (paths, shapes, text) except the logo image.
"""
import json, math, sys, itertools

SITE = 'https://www.magicaltouchdesign.com'
LOGO, LOGO_W = '/logo.png', '/logo-white.png'  # same-origin, so the canvas loads them on www and the bare domain
SPEC = ['#F2708F', '#A69BD3', '#35C2F1', '#5DCCB8', '#8CC84B']
_uid = itertools.count()


def base(o, ab):
    o.setdefault('version', '5.1.0')
    o['__uid'] = f'mtb_{next(_uid)}'
    o['__artboardId'] = ab
    return o


def grad(x1, y1, x2, y2, stops=SPEC):
    n = len(stops) - 1
    return {'type': 'linear', 'gradientUnits': 'pixels', 'coords': {'x1': x1, 'y1': y1, 'x2': x2, 'y2': y2},
            'colorStops': [{'offset': round(i / n, 3), 'color': c} for i, c in enumerate(stops)]}


class D:
    def __init__(self, name, w, h, dpi=300, bg='#FFFFFF', bleed=0):
        self.name, self.w, self.h = name, w, h
        self.ab = f'artboard_mtb_{next(_uid)}'
        b = {'top': bleed, 'left': bleed, 'right': bleed, 'bottom': bleed}
        z = {'top': 0, 'left': 0, 'right': 0, 'bottom': 0}
        self.objs = [base({'type': 'rect', 'left': 0, 'top': 0, 'width': w, 'height': h, 'fill': bg, 'name': 'Artboard 1', '__isArtboard': True,
                           '__print': {'dpi': dpi, 'slug': z, 'bleed': b, 'marks': {'crop': bool(bleed), 'colorBar': False, 'registration': False},
                                       'safeArea': z, 'slugLinked': True, 'bleedLinked': True, 'safeAreaLinked': True}}, self.ab)]

    def add(self, o):
        self.objs.append(base(o, self.ab)); return o

    def rect(self, x, y, w, h, fill='#000', rx=0, stroke=None, sw=0, opacity=1, name=None, **k):
        o = {'type': 'rect', 'left': x, 'top': y, 'width': w, 'height': h, 'fill': fill, 'rx': rx, 'ry': rx, 'opacity': opacity}
        if stroke: o.update(stroke=stroke, strokeWidth=sw)
        if name: o['name'] = name
        o.update(k); return self.add(o)

    def circle(self, cx, cy, r, fill='', stroke=None, sw=0, opacity=1):
        o = {'type': 'circle', 'left': cx - r, 'top': cy - r, 'radius': r, 'width': 2 * r, 'height': 2 * r, 'fill': fill, 'opacity': opacity}
        if stroke: o.update(stroke=stroke, strokeWidth=sw, left=cx - r - sw / 2, top=cy - r - sw / 2)
        return self.add(o)

    def text(self, s, x, y, w, size, font='Poppins', color='#0B0D12', weight='normal', align='left', lh=1.2, cs=0, italic=False, opacity=1, name=None, angle=0):
        o = {'type': 'textbox', 'text': s, 'left': x, 'top': y, 'width': w, 'fontSize': size, 'fontFamily': font, 'fill': color, 'fontWeight': weight,
             'textAlign': align, 'lineHeight': lh, 'charSpacing': cs, 'styles': {}, 'minWidth': 20, 'splitByGrapheme': False, 'opacity': opacity, 'angle': angle}
        if italic: o['fontStyle'] = 'italic'
        if name: o['name'] = name
        return self.add(o)

    def path(self, d, stroke='#000', sw=1, fill='', opacity=1, name=None):
        import re
        out, cmd, buf = [], None, []
        for tok in re.findall(r'[MLZ]|-?\d+(?:\.\d+)?', d):
            if tok in 'MLZ':
                cmd = tok
                if tok == 'Z': out.append(['Z'])
                continue
            buf.append(float(tok))
            if len(buf) == 2:
                out.append([cmd, buf[0], buf[1]]); buf = []
                if cmd == 'M': cmd = 'L'
        xs = [c[1] for c in out if len(c) == 3]; ys = [c[2] for c in out if len(c) == 3]
        x0, y0, x1, y1 = min(xs), min(ys), max(xs), max(ys)
        o = {'type': 'path', 'path': out, 'left': x0 - sw / 2, 'top': y0 - sw / 2, 'width': x1 - x0, 'height': y1 - y0,
             'pathOffset': {'x': (x0 + x1) / 2, 'y': (y0 + y1) / 2}, 'fill': fill, 'stroke': stroke, 'strokeWidth': sw,
             'opacity': opacity, 'strokeLineCap': 'round', 'strokeLineJoin': 'round', 'objectCaching': False}
        if name: o['name'] = name
        return self.add(o)

    def image(self, src, x, y, w, natural=(900, 129), opacity=1, name=None):
        s = w / natural[0]
        return self.add({'type': 'image', 'src': src, 'left': x, 'top': y, 'width': natural[0], 'height': natural[1], 'scaleX': s, 'scaleY': s,
                         'crossOrigin': 'anonymous', 'opacity': opacity, 'name': name or 'Logo'})

    def spectrum(self, x, y, w, h, rx=0):
        return self.rect(x, y, w, h, fill=grad(0, 0, w, 0), rx=rx)

    def json(self):
        return {'version': '5.1.0', 'objects': self.objs}


def pts_d(pts, close=False):
    return 'M' + ' L'.join(f'{x:.1f},{y:.1f}' for x, y in pts) + (' Z' if close else '')


# ---------------- security artwork
def guilloche_band(d, x, y, w, h, color, lines=7, waves=40, sw=0.9, opacity=0.9):
    """Interlaced sine ribbons along a rectangle frame band (x,y,w,h = outer box, band ~ h_band)."""
    band = 26
    sides = [((x, y + band / 2), (x + w, y + band / 2)), ((x, y + h - band / 2), (x + w, y + h - band / 2)),
             ((x + band / 2, y), (x + band / 2, y + h)), ((x + w - band / 2, y), (x + w - band / 2, y + h))]
    for (ax, ay), (bx, by) in sides:
        L = math.hypot(bx - ax, by - ay); ux, uy = (bx - ax) / L, (by - ay) / L; nx, ny = -uy, ux
        n = max(2, int(L / 5))
        for k in range(lines):
            ph = 2 * math.pi * k / lines
            pts = []
            for i in range(n + 1):
                t = i / n; s = t * L
                off = (band / 2 - 2) * math.sin(2 * math.pi * s / (L / waves) + ph) * (0.75 + 0.25 * math.cos(4 * math.pi * t + ph))
                pts.append((ax + ux * s + nx * off, ay + uy * s + ny * off))
            d.path(pts_d(pts), stroke=color, sw=sw, opacity=opacity, name='Guilloche border')


def rosette(d, cx, cy, R, color, petals=18, rings=6, sw=0.8, opacity=0.9, name='Guilloche rosette'):
    for k in range(rings):
        r0 = R * (0.55 + 0.45 * k / max(1, rings - 1))
        pts = []
        for i in range(361):
            t = 2 * math.pi * i / 360
            r = r0 * (0.86 + 0.14 * math.sin(petals * t + k * 0.7)) * (0.95 + 0.05 * math.cos(3 * petals * t))
            pts.append((cx + r * math.cos(t), cy + r * math.sin(t)))
        d.path(pts_d(pts, True), stroke=color, sw=sw, opacity=opacity, name=name)


def microtext_line(d, x, y, w, color, size=5.2, word='MAGICAL TOUCH DESIGN · VERIFIED CERTIFICATE · '):
    reps = int(w / (size * 0.6 * len(word))) + 2
    d.text((word * reps)[: int(w / (size * 0.58))], x, y, w, size, font='Inter', color=color, opacity=0.85, name='Security microtext', lh=1)


def watermark(d, color, text='MAGICAL TOUCH DESIGN'):
    for row in range(6):
        d.text((text + '   ·   ') * 3, -200, 80 + row * 220, d.w + 600, 38, font='Poppins', weight='bold', color=color, opacity=0.045, angle=-12, name='Watermark', cs=200)


# ---------------- certificates
CERT = dict(w=1754, h=1240)
THEMES = [
    ('Classic Gold', '#FBF7EC', '#B08A3E', '#1B2A41', '#8C6A26'),
    ('Royal Navy', '#FFFFFF', '#1D3557', '#0B1B33', '#C9A227'),
    ('Emerald', '#FFFFFF', '#0F6E56', '#0B2B22', '#B08A3E'),
    ('Modern Spectrum', '#FFFFFF', '#3B82C4', '#0B0D12', '#F2708F'),
]


def certificate(theme):
    name, paper, ink, text_c, accent = theme
    W, H = CERT['w'], CERT['h']
    d = D(f'MT Brand · Secure certificate — {name}', W, H, dpi=150, bg=paper)
    watermark(d, ink)
    # emblem watermark in the middle
    rosette(d, W / 2, H / 2 + 20, 330, ink, petals=24, rings=10, sw=0.6, opacity=0.08, name='Watermark rosette')
    # frame: outer line, guilloche band, inner line
    m = 46
    d.rect(m - 14, m - 14, W - 2 * (m - 14), H - 2 * (m - 14), fill='', stroke=ink, sw=3)
    guilloche_band(d, m, m, W - 2 * m, H - 2 * m, ink, lines=6, waves=46, sw=0.8)
    if name == 'Modern Spectrum':
        d.spectrum(m - 14, m - 26, W - 2 * (m - 14), 8)
    d.rect(m + 34, m + 34, W - 2 * (m + 34), H - 2 * (m + 34), fill='', stroke=accent, sw=1.5)
    for cx, cy in [(m + 13, m + 13), (W - m - 13, m + 13), (m + 13, H - m - 13), (W - m - 13, H - m - 13)]:
        rosette(d, cx, cy, 34, ink, petals=10, rings=4, sw=0.7, name='Corner rosette')
    microtext_line(d, m + 44, m + 40, W - 2 * (m + 44), ink)
    microtext_line(d, m + 44, H - m - 48, W - 2 * (m + 44), ink)
    # header
    d.image(LOGO, W / 2 - 170, 128, 340)
    d.text('CERTIFICATE', 0, 205, W, 92, font='Cinzel', weight='bold', color=text_c, align='center', cs=300, name='Certificate heading')
    d.text('{{title}}', 160, 318, W - 320, 34, font='Cormorant Garamond', weight='bold', color=accent, align='center', italic=True, name='Certificate title')
    d.text('This is to certify that', 0, 410, W, 26, font='Inter', color=text_c, align='center', opacity=0.75)
    d.text('{{recipient}}', 120, 455, W - 240, 104, font='Great Vibes', color=text_c, align='center', name='Recipient name')
    d.rect(W / 2 - 360, 590, 720, 1.6, fill=accent)
    d.text('{{description}}', 260, 615, W - 520, 25, font='Inter', color=text_c, align='center', lh=1.45, opacity=0.85, name='Description')
    # signatures
    for i, (who, role) in enumerate([('Authorised signatory', 'Magical Touch Design'), ('Issued on {{date}}', 'Certificate No. {{code}}')]):
        x = 230 + i * 520
        d.rect(x, 905, 380, 1.4, fill=text_c)
        d.text(who, x, 918, 380, 22, font='Poppins', weight='600', color=text_c, align='center')
        d.text(role, x, 950, 380, 18, font='Inter', color=text_c, align='center', opacity=0.7, name='Certificate number' if i else None)
    # seal (left) and verification slot (right)
    rosette(d, 1340, 930, 92, accent, petals=20, rings=6, sw=0.9, name='Security seal')
    d.circle(1340, 930, 54, fill=paper, stroke=accent, sw=2)
    d.text('VERIFIED', 1286, 912, 108, 15, font='Poppins', weight='bold', color=accent, align='center', cs=150)
    d.text('{{date}}', 1276, 934, 128, 11, font='Inter', color=text_c, align='center')
    d.rect(1462, 840, 170, 170, fill='#FFFFFF', stroke=ink, sw=1, rx=8, name='Verification slot')
    d.text('Scan to verify · {{verify}}', 1420, 1022, 254, 12, font='Inter', color=text_c, align='center', opacity=0.75)
    return d, ['mt-internal', 'certificate', 'certificate-master', 'secure', 'brand-kit']


# ---------------- stationery and brand basics
CONTACT = 'magicaltouchdesign.com  ·  Your phone  ·  Your e-mail  ·  Your address'


def letterhead():
    W, H = 2480, 3508  # A4 at 300 dpi
    d = D('MT Brand · Letterhead (A4)', W, H, dpi=300, bleed=36)
    d.spectrum(0, 0, W, 22)
    d.image(LOGO, 180, 170, 760)
    d.text('Design · Print · Packaging · Textile', 1500, 190, 800, 34, font='Poppins', weight='600', color='#0B0D12', align='right')
    d.text('magicaltouchdesign.com', 1500, 240, 800, 30, font='Inter', color='#6B7280', align='right')
    d.rect(180, 360, W - 360, 3, fill='#E5E7EB')
    d.text('Date', 180, 470, 600, 34, font='Inter', color='#6B7280')
    d.text('To\nName of the person\nCompany\nAddress', 180, 560, 1100, 40, font='Inter', color='#0B0D12', lh=1.5)
    d.text('Subject: Your subject here', 180, 900, 2100, 44, font='Poppins', weight='600', color='#0B0D12')
    d.text('Dear Sir / Madam,\n\nWrite your letter here. This letterhead keeps the logo, contact details and footer in place, with a 15 mm margin on every side so nothing is lost when it is printed.\n\nKind regards,', 180, 1010, 2100, 40, font='Inter', color='#1F2430', lh=1.6)
    d.text('Name\nDesignation · Magical Touch Design', 180, 2050, 1200, 38, font='Inter', weight='600', color='#0B0D12', lh=1.5)
    rosette(d, W - 420, H - 620, 300, '#3B82C4', petals=20, rings=6, sw=1.2, opacity=0.08, name='Watermark rosette')
    d.rect(0, H - 220, W, 220, fill='#0B0D12')
    d.spectrum(0, H - 230, W, 10)
    d.text(CONTACT, 180, H - 140, W - 360, 34, font='Inter', color='#FFFFFF', align='center')
    return d, ['mt-internal', 'stationery', 'letterhead', 'brand-kit']


def envelope():
    W, H = 2598, 1299  # DL 220 × 110 mm at 300 dpi
    d = D('MT Brand · Envelope (DL 220 × 110 mm)', W, H, dpi=300, bleed=36)
    d.image(LOGO, 150, 140, 560)
    d.text('magicaltouchdesign.com\nYour address line 1\nYour address line 2', 150, 260, 900, 32, font='Inter', color='#4B5160', lh=1.45)
    d.rect(1240, 560, 1180, 430, fill='', stroke='#CBD5E1', sw=3, rx=18, name='Address window guide')
    d.text('Recipient name\nAddress line 1\nAddress line 2\nCity · Postcode', 1300, 610, 1060, 44, font='Inter', color='#0B0D12', lh=1.5)
    d.spectrum(0, H - 40, W, 40)
    return d, ['mt-internal', 'stationery', 'envelope', 'brand-kit']


def invoice():
    W, H = 2480, 3508
    d = D('MT Brand · Invoice (A4)', W, H, dpi=300, bleed=36)
    d.spectrum(0, 0, W, 22)
    d.image(LOGO, 180, 180, 700)
    d.text('INVOICE', 1500, 160, 800, 110, font='Poppins', weight='bold', color='#0B0D12', align='right', cs=100)
    d.text('Invoice no.  INV-0001\nDate  01 Jan 2027\nDue  15 Jan 2027', 1500, 310, 800, 34, font='Inter', color='#4B5160', align='right', lh=1.55)
    d.text('BILL TO', 180, 560, 800, 30, font='Poppins', weight='600', color='#3B82C4', cs=200)
    d.text('Client name\nCompany\nAddress\nTax / VAT no.', 180, 610, 1000, 38, font='Inter', color='#0B0D12', lh=1.5)
    d.text('FROM', 1300, 560, 800, 30, font='Poppins', weight='600', color='#3B82C4', cs=200)
    d.text('Magical Touch Design\nmagicaltouchdesign.com\nYour address\nTax / VAT no.', 1300, 610, 1000, 38, font='Inter', color='#0B0D12', lh=1.5)
    y = 1000
    d.rect(180, y, W - 360, 90, fill='#0B0D12', rx=10)
    for x, t, a in [(220, 'Description', 'left'), (1350, 'Qty', 'right'), (1700, 'Rate', 'right'), (2100, 'Amount', 'right')]:
        d.text(t, x - (180 if a == 'right' else 0), y + 25, 260 if a == 'right' else 900, 34, font='Poppins', weight='600', color='#FFFFFF', align=a)
    rows = [('Logo design', '1', '0.00', '0.00'), ('Business cards (500)', '1', '0.00', '0.00'), ('Packaging dieline', '1', '0.00', '0.00'), ('Print-ready files', '1', '0.00', '0.00')]
    for i, r in enumerate(rows):
        yy = y + 110 + i * 110
        if i % 2 == 0: d.rect(180, yy - 18, W - 360, 100, fill='#F6F7F9')
        for x, t, a in zip([220, 1350, 1700, 2100], r, ['left', 'right', 'right', 'right']):
            d.text(t, x - (180 if a == 'right' else 0), yy + 10, 260 if a == 'right' else 900, 36, font='Inter', color='#0B0D12', align=a)
    ty = y + 110 + len(rows) * 110 + 60
    for i, (k, v) in enumerate([('Subtotal', '0.00'), ('Tax', '0.00'), ('Total', '0.00')]):
        bold = k == 'Total'
        d.text(k, 1500, ty + i * 70, 400, 40 if bold else 34, font='Poppins' if bold else 'Inter', weight='bold' if bold else 'normal', color='#0B0D12')
        d.text(v, 1900, ty + i * 70, 400, 40 if bold else 34, font='Poppins' if bold else 'Inter', weight='bold' if bold else 'normal', color='#0B0D12', align='right')
    d.rect(1500, ty + 130, 800, 4, fill='#0B0D12')
    d.text('Payment details\nBank · Account name · Account no. · IBAN / IFSC\n\nThank you for your business.', 180, ty, 1200, 34, font='Inter', color='#4B5160', lh=1.55)
    d.rect(0, H - 160, W, 160, fill='#F6F7F9')
    d.text(CONTACT, 180, H - 105, W - 360, 30, font='Inter', color='#4B5160', align='center')
    return d, ['mt-internal', 'stationery', 'invoice', 'brand-kit']


def business_card(side):
    W, H = 1063, 697  # 90 × 59 mm incl. 2.5 mm bleed area handled by bleed setting → 85 × 55 mm at 300 dpi = 1004 × 650
    W, H = 1004, 650
    d = D(f'MT Brand · Business card — {side} (85 × 55 mm)', W, H, dpi=300, bg='#0B0D12' if side == 'front' else '#FFFFFF', bleed=36)
    if side == 'front':
        rosette(d, W / 2, H / 2, 260, '#FFFFFF', petals=22, rings=7, sw=0.8, opacity=0.08, name='Guilloche pattern')
        d.image(LOGO_W, W / 2 - 300, H / 2 - 50, 600)
        d.spectrum(0, H - 16, W, 16)
    else:
        d.spectrum(0, 0, 16, H)
        d.text('Your Name', 80, 120, 840, 64, font='Poppins', weight='bold', color='#0B0D12')
        d.text('Designation', 80, 200, 840, 32, font='Inter', color='#3B82C4', weight='600')
        d.text('+000 00 000 0000\nyou@yourmail.com\nmagicaltouchdesign.com', 80, 300, 700, 30, font='Inter', color='#1F2430', lh=1.6)
        d.image(LOGO, 640, 560, 290)
    return d, ['mt-internal', 'stationery', 'business card', 'brand-kit']


def id_card(side):
    W, H = 638, 1013  # CR80 54 × 86 mm at 300 dpi
    d = D(f'MT Brand · Staff ID card — {side} (54 × 86 mm)', W, H, dpi=300, bleed=24)
    d.rect(W / 2 - 70, 34, 140, 24, fill='#E5E7EB', rx=12, name='Lanyard slot')
    if side == 'front':
        d.rect(0, 0, W, 300, fill=grad(0, 0, W, 300, ['#1D3557', '#3B82C4']))
        d.spectrum(0, 300, W, 10)
        d.image(LOGO_W, 110, 100, 418)
        d.circle(W / 2, 430, 120, fill='#F1F5F9', stroke='#FFFFFF', sw=10)
        d.text('PHOTO', W / 2 - 80, 415, 160, 26, font='Poppins', weight='600', color='#94A3B8', align='center', name='Photo placeholder')
        d.text('Full Name', 40, 590, W - 80, 52, font='Poppins', weight='bold', color='#0B0D12', align='center')
        d.text('Designation', 40, 655, W - 80, 30, font='Inter', color='#3B82C4', weight='600', align='center')
        d.text('ID  MTD-0001\nValid till  12 / 2027', 40, 730, W - 80, 26, font='Inter', color='#4B5160', align='center', lh=1.55)
        d.rect(0, H - 90, W, 90, fill='#0B0D12')
        d.text('STAFF', 0, H - 68, W, 40, font='Poppins', weight='bold', color='#FFFFFF', align='center', cs=600)
    else:
        rosette(d, W / 2, 470, 230, '#1D3557', petals=18, rings=6, sw=0.8, opacity=0.07, name='Guilloche pattern')
        d.text('If found, please return to', 40, 130, W - 80, 26, font='Inter', color='#4B5160', align='center')
        d.image(LOGO, 110, 180, 418)
        d.text('magicaltouchdesign.com\nYour address\nYour phone', 40, 270, W - 80, 26, font='Inter', color='#0B0D12', align='center', lh=1.55)
        d.rect(W / 2 - 110, 430, 220, 220, fill='#FFFFFF', stroke='#CBD5E1', sw=2, rx=10, name='QR code area')
        d.text('QR code', W / 2 - 110, 525, 220, 22, font='Inter', color='#94A3B8', align='center')
        d.text('This card belongs to Magical Touch Design and must be shown on request. Not transferable.', 50, 700, W - 100, 22, font='Inter', color='#4B5160', align='center', lh=1.45)
        d.rect(140, 850, W - 280, 2, fill='#0B0D12')
        d.text('Authorised signature', 40, 862, W - 80, 20, font='Inter', color='#6B7280', align='center')
        d.spectrum(0, H - 14, W, 14)
    return d, ['mt-internal', 'id card', 'badge', 'brand-kit']


def rollup():
    W, H = 2409, 5669  # 850 × 2000 mm at 72 dpi
    d = D('MT Brand · Roll-up banner (850 × 2000 mm)', W, H, dpi=72, bg='#0B0B16', bleed=0)
    d.rect(0, 0, W, H, fill=grad(0, 0, 0, H, ['#1B1236', '#0B0B16', '#0B1A2E']))
    rosette(d, W * 0.78, 900, 900, '#A69BD3', petals=26, rings=9, sw=3, opacity=0.12, name='Guilloche pattern')
    d.image(LOGO_W, 240, 300, 1500)
    d.text('Design anything.', 240, 900, W - 480, 210, font='Poppins', weight='bold', color='#FFFFFF', lh=1.0)
    d.text('Free for everyone.', 240, 1160, W - 480, 210, font='Poppins', weight='bold', color='#35C2F1', lh=1.0)
    items = ['Free templates', 'Design editor', 'Photo Studio', 'Packaging dielines', 'Textile patterns', 'Print-ready files']
    for i, t in enumerate(items):
        y = 1800 + i * 300
        d.circle(300, y + 60, 34, fill=SPEC[i % 5])
        d.text(t, 400, y, 1800, 110, font='Poppins', weight='600', color='#FFFFFF')
    d.rect(240, 3800, W - 480, 6, fill=grad(0, 0, W - 480, 0))
    d.text('No login · No watermark · Files stay on your device', 240, 3900, W - 480, 90, font='Inter', color='#C7C9D9', lh=1.3)
    d.text('magicaltouchdesign.com', 240, 4400, W - 480, 150, font='Poppins', weight='bold', color='#FFFFFF')
    d.rect(0, H - 284, W, 284, fill='#000000', opacity=0.35, name='Bottom 100 mm — hidden in the stand')
    d.text('Keep the bottom 100 mm clear — it sits inside the stand', 0, H - 190, W, 60, font='Inter', color='#6B7280', align='center')
    return d, ['mt-internal', 'roll-up', 'banner', 'brand-kit']


def screen(vertical=False):
    W, H = (1080, 1920) if vertical else (1920, 1080)
    d = D(f'MT Brand · Digital screen {"vertical 1080 × 1920" if vertical else "16:9 1920 × 1080"}', W, H, dpi=72, bg='#0B0B16')
    d.rect(0, 0, W, H, fill=grad(0, 0, W, H, ['#1B1236', '#0B0B16', '#0B1A2E']))
    rosette(d, W * 0.8, H * 0.25, min(W, H) * 0.45, '#35C2F1', petals=24, rings=8, sw=1.6, opacity=0.14, name='Guilloche pattern')
    d.image(LOGO_W, 90, 80, 520)
    if vertical:
        d.text('Design anything.', 90, 520, W - 180, 84, font='Poppins', weight='bold', color='#FFFFFF', lh=1.02)
        d.text('Free for everyone.', 90, 620, W - 180, 84, font='Poppins', weight='bold', color='#35C2F1', lh=1.02)
        y0 = 1000
    else:
        d.text('Design anything.', 90, 320, 1300, 130, font='Poppins', weight='bold', color='#FFFFFF', lh=1.0)
        d.text('Free for everyone.', 90, 460, 1300, 130, font='Poppins', weight='bold', color='#35C2F1', lh=1.0)
        y0 = 700
    for i, t in enumerate(['100% free', 'No login', 'Free export', 'No watermark']):
        x = 90 + (i % 2 if vertical else i) * (440 if vertical else 330)
        y = y0 + (i // 2 if vertical else 0) * 130
        d.rect(x, y, 400 if vertical else 300, 90, fill='#FFFFFF', opacity=0.08, rx=45)
        d.circle(x + 45, y + 45, 12, fill=SPEC[i])
        d.text(t, x + 70, y + 24, 320 if vertical else 220, 34, font='Poppins', weight='600', color='#FFFFFF')
    d.text('magicaltouchdesign.com', 90, H - 150, W - 180, 54, font='Poppins', weight='bold', color='#FFFFFF')
    d.spectrum(0, H - 16, W, 16)
    return d, ['mt-internal', 'digital screen', 'signage', 'brand-kit']


def all_designs():
    # Certificates: the original secure masters are kept as they are (restored 28 Nov), not generated here.
    out = [letterhead(), envelope(), invoice(), business_card('front'), business_card('back'), id_card('front'), id_card('back'), rollup(), screen(False), screen(True)]
    rows = []
    for d, tags in out:
        slug = 'mt-brand-' + ''.join(c if c.isalnum() else '-' for c in d.name.lower().replace('mt brand · ', '')).strip('-')
        while '--' in slug: slug = slug.replace('--', '-')
        rows.append({'slug': slug[:80], 'name': d.name, 'width': d.w, 'height': d.h, 'tags': tags, 'canvasJson': d.json()})
    return rows


if __name__ == '__main__':
    rows = all_designs()
    json.dump(rows, open(sys.argv[1] if len(sys.argv) > 1 else 'brand_kit.json', 'w'))
    print(len(rows), 'designs', [r['slug'] for r in rows])
