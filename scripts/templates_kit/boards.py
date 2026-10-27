"""
"Studio boards" collection: the bold social-media look of the October 2026
mood board (birthday stories, certificates, valentines, weddings, agency
posts, photo collages, Christmas).

Original compositions only: solid colour fields, geometric accents, photos
in shaped frames, script + heavy-sans type pairings. Everything is vector
(tiny files) except the CC0 photos already on the site
(/templates/photos/pro, docs/photo-credits.md).
"""

from __future__ import annotations

import math
import os
import random

from kit import PUBLIC, FS_MULT, lin, rad, rgba, mix, text_width, shadow
from pro import T, cta, rule

# ----------------------------------------------------------------- shapes
# Unit shapes (0..1 box) used both as photo clip paths and as outlines.


def _cubic_closed(pts):
    """Smooth closed path through points (Catmull-Rom -> cubic)."""
    n = len(pts)
    d = [["M", *pts[0]]]
    for i in range(n):
        p0, p1, p2, p3 = pts[i - 1], pts[i], pts[(i + 1) % n], pts[(i + 2) % n]
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d.append(["C", *c1, *c2, *p2])
    d.append(["Z"])
    return d


def unit_shape(kind, seed=1):
    if kind == "heart":
        return [["M", .5, .26], ["C", .5, .12, .38, 0, .24, 0], ["C", .09, 0, 0, .12, 0, .29], ["C", 0, .56, .3, .76, .5, 1],
                ["C", .7, .76, 1, .56, 1, .29], ["C", 1, .12, .91, 0, .76, 0], ["C", .62, 0, .5, .12, .5, .26], ["Z"]]
    if kind == "hexagon":
        return [["M", .5, 0], ["L", 1, .25], ["L", 1, .75], ["L", .5, 1], ["L", 0, .75], ["L", 0, .25], ["Z"]]
    if kind == "diamond":
        return [["M", .5, 0], ["L", 1, .5], ["L", .5, 1], ["L", 0, .5], ["Z"]]
    if kind == "slant":
        return [["M", 0, 0], ["L", 1, 0], ["L", 1, .84], ["L", 0, 1], ["Z"]]
    if kind == "slant2":
        return [["M", .16, 0], ["L", 1, 0], ["L", .84, 1], ["L", 0, 1], ["Z"]]
    if kind == "arch":
        return [["M", 0, 1], ["L", 0, .42], ["C", 0, .17, .22, 0, .5, 0], ["C", .78, 0, 1, .17, 1, .42], ["L", 1, 1], ["Z"]]
    if kind == "ticket":
        r = .1
        return [["M", r, 0], ["L", 1 - r, 0], ["Q", 1 - r, r, 1, r], ["L", 1, 1 - r], ["Q", 1 - r, 1 - r, 1 - r, 1], ["L", r, 1], ["Q", r, 1 - r, 0, 1 - r], ["L", 0, r], ["Q", r, r, r, 0], ["Z"]]
    if kind == "blob":
        rr = random.Random(seed)
        n = 7
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n - math.pi / 2
            k = 0.5 * (1 + rr.uniform(-0.14, 0.12))
            pts.append((0.5 + k * math.cos(a), 0.5 + k * math.sin(a)))
        d = _cubic_closed(pts)
        return _normalize(d)
    if kind == "circle":
        k = 0.5523
        return [["M", .5, 0], ["C", .5 + .5 * k, 0, 1, .5 - .5 * k, 1, .5], ["C", 1, .5 + .5 * k, .5 + .5 * k, 1, .5, 1], ["C", .5 - .5 * k, 1, 0, .5 + .5 * k, 0, .5], ["C", 0, .5 - .5 * k, .5 - .5 * k, 0, .5, 0], ["Z"]]
    if kind == "rounded":
        r = .08
        return [["M", r, 0], ["L", 1 - r, 0], ["Q", 1, 0, 1, r], ["L", 1, 1 - r], ["Q", 1, 1, 1 - r, 1], ["L", r, 1], ["Q", 0, 1, 0, 1 - r], ["L", 0, r], ["Q", 0, 0, r, 0], ["Z"]]
    if kind == "rect":
        return [["M", 0, 0], ["L", 1, 0], ["L", 1, 1], ["L", 0, 1], ["Z"]]
    raise ValueError(kind)


def _normalize(d):
    xs, ys = [], []
    for c in d:
        v = c[1:]
        xs += v[0::2]
        ys += v[1::2]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    out = []
    for c in d:
        v = c[1:]
        out.append([c[0]] + [((v[i] - x0) / (x1 - x0)) if i % 2 == 0 else ((v[i] - y0) / (y1 - y0)) for i in range(len(v))])
    return out


def scale_path(d, x, y, w, h):
    out = []
    for c in d:
        v = c[1:]
        out.append([c[0]] + [x + v[i] * w if i % 2 == 0 else y + v[i] * h for i in range(len(v))])
    return out


def shape(doc, kind, x, y, w, h, fill="", stroke=None, sw=0, opacity=1, name="Shape", seed=1, shadow_=None):
    return doc.path(scale_path(unit_shape(kind, seed), x, y, w, h), fill=fill, stroke=stroke, sw=sw, opacity=opacity, name=name, join="round", shadow_=shadow_)


def framed_photo(doc, name, x, y, w, h, kind="rect", focus=(0.5, 0.42), zoom=1.0, seed=1, label="Photo", shadow_=None):
    """Cover-fit a site photo into any unit shape (clip path in image space)."""
    from PIL import Image
    src = f"/templates/photos/pro/{name}.jpg"
    iw, ih = Image.open(os.path.join(PUBLIC, src.lstrip("/"))).size
    s = max(w / iw, h / ih) * zoom
    cw, ch = w / s, h / s
    cx = max(0, min(iw - cw, focus[0] * iw - cw / 2))
    cy = max(0, min(ih - ch, focus[1] * ih - ch / 2))
    o = {"type": "image", "left": x, "top": y, "width": round(cw, 2), "height": round(ch, 2), "cropX": round(cx, 2), "cropY": round(cy, 2),
         "scaleX": s, "scaleY": s, "src": src, "crossOrigin": "anonymous", "filters": []}
    if kind != "rect":
        p = [[c[0]] + [round(v * (cw if i % 2 == 0 else ch), 2) for i, v in enumerate(c[1:])] for c in unit_shape(kind, seed)]
        o["clipPath"] = {"type": "path", "version": "5.1.0", "originX": "center", "originY": "center", "left": 0, "top": 0, "fill": "#000000", "strokeWidth": 0, "path": p, "width": cw, "height": ch}
    o["__frame"] = {"kind": "rect" if kind == "rect" else ("circle" if kind == "circle" else "custom"), "empty": False}
    if shadow_:
        o["shadow"] = shadow_
    doc.notes.setdefault("photos", set()).add(name)
    return doc.add(o, label)


def snowflake(doc, cx, cy, r, color, opacity=1, sw=None):
    sw = sw or max(1.2, r * 0.09)
    d = []
    for i in range(6):
        a = math.radians(i * 60)
        ex, ey = cx + r * math.cos(a), cy + r * math.sin(a)
        d += [["M", cx, cy], ["L", ex, ey]]
        for t in (0.55,):
            mx, my = cx + r * t * math.cos(a), cy + r * t * math.sin(a)
            for s_ in (-1, 1):
                b = a + s_ * math.radians(38)
                d += [["M", mx, my], ["L", mx + r * 0.3 * math.cos(b), my + r * 0.3 * math.sin(b)]]
    return doc.path(d, fill="", stroke=color, sw=sw, opacity=opacity, name="Snowflake")


def ornament(doc, cx, top, length, r, color, cap="#D4AF37", string="#E9D8A6"):
    doc.line(cx, top, cx, top + length, string, max(1, r * 0.05))
    cy = top + length + r * 0.9
    doc.rect(cx - r * 0.28, top + length - r * 0.02, r * 0.56, r * 0.3, cap, rx=r * 0.06, name="Ornament cap")
    doc.circle(cx, cy, r, rad(r * 0.7, r * 0.6, r * 1.5, [(0, mix(color, "#ffffff", 0.45)), (0.55, color), (1, mix(color, "#000000", 0.3))]), name="Ornament")
    doc.ellipse(cx - r * 0.35, cy - r * 0.38, r * 0.18, r * 0.3, "#ffffff", opacity=0.45, angle=30, name="Ornament shine")


def rosette(doc, cx, cy, r, gold, ink="#1B1B1B", text="BEST\nAWARD", ribbon=None):
    """Award seal: ribbon tails, scalloped gold disc, inner ring."""
    ribbon = ribbon or gold
    for s_ in (-1, 1):
        doc.polygon([(cx + s_ * r * 0.15, cy + r * 0.4), (cx + s_ * r * 0.62, cy + r * 0.38), (cx + s_ * r * 0.75, cy + r * 1.55),
                     (cx + s_ * r * 0.46, cy + r * 1.32), (cx + s_ * r * 0.3, cy + r * 1.62)], ribbon, name="Ribbon")
    n = 24
    pts = []
    for i in range(n * 2):
        a = math.pi * i / n
        rr = r if i % 2 == 0 else r * 0.9
        pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    from common import GOLD
    doc.polygon(pts, lin(cx - r, cy - r, cx + r, cy + r, GOLD), name="Seal")
    doc.circle(cx, cy, r * 0.74, ink, name="Seal centre")
    doc.circle(cx, cy, r * 0.66, "", stroke=gold, sw=max(1, r * 0.03), name="Seal ring")
    lines = text.split("\n")
    fs = r * 0.2
    y = cy - (len(lines) * fs * FS_MULT * 1.05) / 2
    for ln in lines:
        doc.text(cx - r * 0.66, y, r * 1.32, ln, "Cinzel", fs, gold, weight=700, align="center", spacing=80)
        y += fs * FS_MULT * 1.05
    doc.star(cx, cy - r * 0.48, r * 0.07, gold)


def icon_bubble(doc, cx, cy, r, bg, fg, glyph="star"):
    doc.circle(cx, cy, r, lin(cx - r, cy - r, cx + r, cy + r, [(0, mix(bg, "#ffffff", 0.25)), (1, mix(bg, "#000000", 0.2))]), shadow_=shadow("rgba(0,0,0,0.25)", r * 0.5, 0, r * 0.15), name="Icon")
    if glyph == "star":
        doc.star(cx, cy, r * 0.5, fg)
    elif glyph == "heart":
        doc.heart(cx, cy, r * 1.05, fg)
    elif glyph == "play":
        doc.polygon([(cx - r * 0.25, cy - r * 0.38), (cx + r * 0.42, cy), (cx - r * 0.25, cy + r * 0.38)], fg, name="Play")
    elif glyph == "check":
        doc.path([["M", cx - r * 0.38, cy], ["L", cx - r * 0.1, cy + r * 0.3], ["L", cx + r * 0.42, cy - r * 0.3]], fill="", stroke=fg, sw=r * 0.16, name="Check")
    elif glyph == "bolt":
        doc.polygon([(cx + r * 0.1, cy - r * 0.55), (cx - r * 0.35, cy + r * 0.08), (cx - r * 0.02, cy + r * 0.08), (cx - r * 0.12, cy + r * 0.55), (cx + r * 0.35, cy - r * 0.1), (cx + r * 0.02, cy - r * 0.1)], fg, name="Bolt")


def bleed(doc):
    return doc.bleed


def fullbg(doc, fill):
    return doc.bg(fill)


def stacked(doc, items, y):
    """items: list of (fn(y) -> textbox, gap). Returns final y."""
    for fn, gap in items:
        o = fn(y)
        y += o["_h"] + gap
    return y


def measure(doc, items):
    start = len(doc.objs)
    total = stacked(doc, items, 0)
    del doc.objs[start:]
    return total - items[-1][1]


SCRIPTS = ["Great Vibes", "Pacifico", "Dancing Script", "Satisfy", "Parisienne", "Alex Brush", "Sacramento", "Allura"]
HEAVY = ["Anton", "Bebas Neue", "Archivo Black", "Oswald", "Staatliches", "Luckiest Guy"]

# ================================================================ birthday


def birthday(doc, c, p, v):
    """Bold birthday post/story: colour field, geometric accent, shaped photo."""
    W, H = doc.W, doc.H
    t = T(doc, "bold")
    b = doc.bleed
    rng = random.Random(v.get("seed", 1))
    doc.bg(p["bg"])
    kind = v.get("frame", "arch")
    script, heavy = v.get("script", "Great Vibes"), v.get("heavy", "Anton")
    story = H / W > 1.5
    u = t.u
    # -- accent geometry
    acc = v.get("accent", "band")
    if acc == "band":
        doc.polygon([(-b, H * 0.42), (W + b, H * 0.2), (W + b, H * 0.34), (-b, H * 0.56)], p["accent"], name="Accent band")
    elif acc == "corner":
        doc.polygon([(W * 0.45, -b), (W + b, -b), (W + b, H * 0.5)], p["accent"], name="Accent corner")
        doc.polygon([(-b, H * 0.9), (W * 0.16, H + b), (-b, H + b)], p["accent2"], name="Accent corner")
    elif acc == "circle":
        doc.circle(W * 0.78, H * 0.24, W * 0.42, p["accent"], name="Accent circle")
        doc.circle(-W * 0.02, H * 0.97, W * 0.13, p["accent2"], opacity=0.9, name="Accent circle")
    elif acc == "split":
        doc.rect(-b, -b, W * 0.4 + b, H + 2 * b, p["accent"], name="Accent panel")
    elif acc == "stripes":
        doc.stripes(W * 0.5, -b, W + b, H * 0.55, 18 * u, 30 * u, p["accent"], angle_deg=30, opacity=0.9)
    # -- photo
    if story:
        pw, ph = W * 0.8, H * 0.45
        px, py = (W - pw) / 2, H * 0.12
    elif acc == "split":
        pw, ph = W * 0.56, H * 0.52
        px, py = W * 0.12, H * 0.09
    else:
        pw, ph = W * 0.66, H * (0.52 if H > W else 0.56)
        px, py = (W - pw) / 2 + W * v.get("shift", 0), H * 0.07
    if kind in ("circle", "hexagon", "diamond", "blob", "heart"):
        side = min(pw, ph)
        px, py, pw, ph = px + (pw - side) / 2, py + (ph - side) / 2, side, side
    off = 18 * u
    shape(doc, kind, px + off, py + off, pw, ph, fill="", stroke=p["line"], sw=4 * u, seed=v.get("seed", 1), name="Frame line")
    framed_photo(doc, c["photo"], px, py, pw, ph, kind=kind, seed=v.get("seed", 1), focus=c.get("focus", (0.5, 0.4)),
                 shadow_=shadow("rgba(0,0,0,0.28)", 30 * u, 0, 14 * u))
    # -- sparkles / confetti
    for _ in range(5):
        doc.sparkle(rng.uniform(W * 0.05, W * 0.95), rng.uniform(H * 0.03, py + ph + 40 * u), rng.uniform(9, 20) * u, p["line"], opacity=0.9)
    doc.confetti(0, py + ph + 10 * u, W, H, [p["accent"], p["line"], "#FFFFFF"], n=10, size=(8 * u, 15 * u), shapes=("circle", "tri", "rect"),
                 avoid=[(W * 0.06, py + ph, W * 0.94, H * 0.95)])
    # -- type
    x0 = W * 0.08 if acc != "split" else W * 0.1
    cw = W - 2 * x0
    align = "center"
    items = [
        (lambda y: doc.text(x0, y, cw, c.get("script", "Happy"), script, 120 * u, p["script"], align=align, lh=0.9, name="Script"), -20 * u),
        (lambda y: t.head(x0, y, cw, c.get("big", "BIRTHDAY"), p["ink"], 190 if not story else 220, align=align, upper=True, lh=0.92, family=heavy, weight=400, max_lines=1), 6 * u),
        (lambda y: doc.text(x0, y, cw, c.get("sub", "TO YOU"), "Montserrat", 34 * u, p["ink"], weight=700, align=align, spacing=600, upper=True), 30 * u),
    ]
    if c.get("name"):
        items.append((lambda y: doc.text(x0, y, cw, c["name"], "Montserrat", 38 * u, p["script"], weight=800, align=align, spacing=120), 12 * u))
    if c.get("msg"):
        items.append((lambda y: doc.text(x0 + cw * 0.12, y, cw * 0.76, c["msg"], "Montserrat", 28 * u, rgba(p["ink"], 0.9), align=align, lh=1.4), 10 * u))
    total = measure(doc, items)
    top = py + ph + 50 * u
    room = H - 70 * u - top
    y = top + max(0, (room - total) / 2)
    stacked(doc, items, y)
    if c.get("tag"):
        doc.text(0, H - 52 * u, W, c["tag"], "Montserrat", 18 * u, rgba(p["ink"], 0.7), weight=600, align="center", spacing=400, upper=True, name="Tag")


# ============================================================ certificates


def certificate(doc, c, p, v):
    W, H = doc.W, doc.H
    b = doc.bleed
    from common import GOLD
    gold = p.get("gold", "#C9A24A")
    dark = p["dark"]
    style = v.get("style", "wave")
    doc.bg(p.get("paper", "#FFFFFF"))
    u = W / 1123
    goldg = lin(0, 0, W, H, GOLD)
    if style == "wave":
        doc.path([["M", -b, H * 0.62], ["C", W * 0.12, H * 0.72, W * 0.2, H * 0.98, W * 0.42, H + b], ["L", -b, H + b], ["Z"]], fill=dark, name="Wave")
        doc.path([["M", -b, H * 0.55], ["C", W * 0.14, H * 0.66, W * 0.24, H * 0.95, W * 0.5, H + b]], fill="", stroke=goldg, sw=6 * u, name="Gold wave")
        doc.path([["M", W * 0.66, -b], ["C", W * 0.8, H * 0.08, W * 0.86, H * 0.3, W + b, H * 0.36], ["L", W + b, -b], ["Z"]], fill=dark, name="Wave")
        doc.path([["M", W * 0.6, -b], ["C", W * 0.76, H * 0.12, W * 0.84, H * 0.36, W + b, H * 0.44]], fill="", stroke=goldg, sw=6 * u, name="Gold wave")
        cx, align, x0, cw = W * 0.5, "center", W * 0.19, W * 0.62
    elif style == "diagonal":
        doc.polygon([(-b, -b), (W * 0.36, -b), (-b, H * 0.55)], dark, name="Corner")
        doc.polygon([(W * 0.36 + 14 * u, -b), (W * 0.36 + 40 * u, -b), (-b, H * 0.55 + 40 * u), (-b, H * 0.55 + 14 * u)], goldg, name="Gold strip")
        doc.polygon([(W + b, H + b), (W * 0.64, H + b), (W + b, H * 0.45)], dark, name="Corner")
        doc.polygon([(W * 0.64 - 14 * u, H + b), (W * 0.64 - 40 * u, H + b), (W + b, H * 0.45 - 40 * u), (W + b, H * 0.45 - 14 * u)], goldg, name="Gold strip")
        cx, align, x0, cw = W * 0.5, "center", W * 0.19, W * 0.62
    elif style == "band":
        doc.rect(-b, -b, W * 0.27 + b, H + 2 * b, dark, name="Side band")
        doc.rect(W * 0.27, -b, 10 * u, H + 2 * b, goldg, name="Gold edge")
        doc.dots(20 * u, 20 * u, W * 0.25, H - 20 * u, 26 * u, 2.2 * u, rgba(gold, 0.35), opacity=1)
        cx, align, x0, cw = W * 0.62, "left", W * 0.34, W * 0.6
    elif style == "frame":
        doc.bg(p.get("paper", "#FBF7EE"))
        doc.rect(26 * u, 26 * u, W - 52 * u, H - 52 * u, "", stroke=dark, sw=14 * u, name="Border")
        doc.rect(48 * u, 48 * u, W - 96 * u, H - 96 * u, "", stroke=goldg, sw=3 * u, name="Gold border")
        for (x, y) in [(48, 48), (W / u - 48, 48), (48, H / u - 48), (W / u - 48, H / u - 48)]:
            doc.polygon([(x * u, y * u - 16 * u), (x * u + 16 * u, y * u), (x * u, y * u + 16 * u), (x * u - 16 * u, y * u)], goldg, name="Corner gem")
        cx, align, x0, cw = W * 0.5, "center", W * 0.14, W * 0.72
    else:  # ribbon
        doc.rect(-b, -b, W + 2 * b, H * 0.07 + b, dark, name="Top bar")
        doc.rect(-b, H * 0.93, W + 2 * b, H * 0.07 + b, dark, name="Bottom bar")
        doc.rect(-b, H * 0.07, W + 2 * b, 6 * u, goldg, name="Gold line")
        doc.rect(-b, H * 0.93 - 6 * u, W + 2 * b, 6 * u, goldg, name="Gold line")
        cx, align, x0, cw = W * 0.5, "center", W * 0.14, W * 0.72
    # -- text block
    title = c.get("title", "CERTIFICATE")
    kind = c.get("kind", "OF ACHIEVEMENT")
    tfam = v.get("title_font", "Cinzel")
    items = [
        (lambda y: doc.text(x0, y, cw, title, tfam, min(76 * u, 76 * u * (cw * 0.86) / max(1, text_width(title.upper(), tfam, 76 * u, 700, False, 200))), dark, weight=700, align=align, spacing=200, upper=True, name="Title"), 6 * u),
        (lambda y: doc.text(x0, y, cw, kind, "Montserrat", 24 * u, gold, weight=700, align=align, spacing=520, upper=True, name="Subtitle"), 34 * u),
        (lambda y: doc.text(x0, y, cw, c.get("lead", "This certificate is proudly presented to"), "Montserrat", 20 * u, "#555555", align=align, spacing=60, upper=True, name="Lead"), 10 * u),
        (lambda y: doc.text(x0, y, cw, c.get("name", "Aisha Rahman"), v.get("script", "Great Vibes"), 104 * u, dark, align=align, lh=1.0, name="Recipient"), 4 * u),
        (lambda y: doc.rect(x0 + (cw * 0.15 if align == "center" else 0), y, cw * (0.7 if align == "center" else 0.8), 2 * u, goldg, name="Name line") | {"_h": 2 * u}, 22 * u),
        (lambda y: doc.text(x0 + (cw * 0.08 if align == "center" else 0), y, cw * (0.84 if align == "center" else 0.9), c.get("body", ""), "Lora", 22 * u, "#444444", align=align, lh=1.5, name="Description"), 14 * u),
        (lambda y: doc.text(x0, y, cw, c.get("date", " "), "Montserrat", 15 * u, "#777777", align=align, spacing=200, upper=True, name="Date"), 0),
    ]
    total = measure(doc, items)
    top = H * 0.13
    sig_y = H * 0.78
    y = top + max(0, (sig_y - 40 * u - top - total) / 2)
    stacked(doc, items, y)
    # -- signatures + seal
    sx = [x0 + cw * 0.02, x0 + cw * 0.66] if align == "center" else [x0, x0 + cw * 0.66]
    sw_ = cw * 0.32
    sigs = c.get("sigs", [("Omar Haddad", "Director"), ("Lina Yusuf", "Programme Lead")])
    for (nm, role), xx in zip(sigs, sx):
        doc.text(xx, sig_y - 44 * u, sw_, nm, "Mrs Saint Delafield", 50 * u, dark, align="center", name="Signature")
        doc.rect(xx, sig_y + 4 * u, sw_, 1.5 * u, dark, name="Signature line")
        doc.text(xx, sig_y + 14 * u, sw_, nm, "Montserrat", 17 * u, dark, weight=700, align="center", spacing=80, upper=True, name="Signer")
        doc.text(xx, sig_y + 36 * u, sw_, role, "Montserrat", 15 * u, "#666666", align="center", name="Signer role")
    seal_x = (sx[0] + sx[1] + sw_) / 2
    seal_y = sig_y - 6 * u
    rosette(doc, seal_x, seal_y, 74 * u, gold, ink=dark, text=c.get("seal", "BEST\nAWARD"))
    if style == "band":
        doc.text(30 * u, H * 0.42, W * 0.27 - 60 * u, c.get("org", "Magical Academy"), "Cinzel", 26 * u, gold, weight=700, align="center", spacing=120, name="Organisation")


# ============================================================ valentine


def valentine(doc, c, p, v):
    W, H = doc.W, doc.H
    u = min(W, H * 0.8) / 1080
    rng = random.Random(v.get("seed", 3))
    doc.bg(lin(0, 0, 0, H, [(0, p["bg"]), (1, p["bg2"])]))
    lay = v.get("layout", "heart")
    # scattered hearts
    for _ in range(v.get("hearts", 16)):
        s_ = rng.uniform(30, 110) * u
        doc.heart(rng.uniform(0, W), rng.uniform(0, H), s_, rng.choice(p["hearts"]), opacity=rng.uniform(0.35, 0.95), angle=rng.uniform(-25, 25))
    if lay == "heart":
        hw = W * 0.7
        hx, hy = (W - hw) / 2, H * 0.08
        shape(doc, "heart", hx - 16 * u, hy - 16 * u, hw + 32 * u, hw * 0.9 + 32 * u, fill="#FFFFFF", name="Heart border", shadow_=shadow("rgba(80,0,20,0.35)", 40 * u, 0, 16 * u))
        framed_photo(doc, c["photo"], hx, hy, hw, hw * 0.9, kind="heart", focus=c.get("focus", (0.5, 0.35)))
        top = hy + hw * 0.9 + 50 * u
    elif lay == "polaroid":
        pw = W * 0.62
        ang = -5
        doc.rect(W / 2, H * 0.36, pw + 40 * u, pw * 1.05 + 120 * u, "#FFFFFF", angle=ang, origin_center=True, shadow_=shadow("rgba(0,0,0,0.3)", 36 * u, 0, 14 * u), name="Polaroid")
        o = framed_photo(doc, c["photo"], W / 2, H * 0.36 - 40 * u, pw, pw * 1.05, focus=c.get("focus", (0.5, 0.35)))
        o.update({"originX": "center", "originY": "center", "angle": ang})
        doc.heart(W / 2 + pw * 0.44, H * 0.36 - pw * 0.55, 140 * u, p["accent"], angle=14)
        top = H * 0.36 + pw * 0.52 + 110 * u
    else:  # arch
        aw = W * 0.64
        shape(doc, "arch", (W - aw) / 2 - 14 * u, H * 0.07 - 14 * u, aw + 28 * u, aw * 1.15 + 28 * u, fill="", stroke="#FFFFFF", sw=6 * u, name="Arch line")
        framed_photo(doc, c["photo"], (W - aw) / 2, H * 0.07, aw, aw * 1.15, kind="arch", focus=c.get("focus", (0.5, 0.35)))
        top = H * 0.07 + aw * 1.15 + 50 * u
    x0, cw = W * 0.08, W * 0.84
    items = [
        (lambda y: doc.text(x0, y, cw, c.get("script", "Happy Valentine's Day"), v.get("script", "Great Vibes"), 120 * u, p["ink"], align="center", lh=1.0, name="Script"), 12 * u),
        (lambda y: doc.text(x0, y, cw, c.get("sub", "LOVE YOU FOREVER"), "Montserrat", 30 * u, p["ink2"], weight=700, align="center", spacing=520, upper=True), 18 * u),
    ]
    if c.get("msg"):
        items.append((lambda y: doc.text(x0 + cw * 0.1, y, cw * 0.8, c["msg"], "Lora", 30 * u, rgba(p["ink"], 0.9), italic=True, align="center", lh=1.45), 0))
    total = measure(doc, items)
    y = top + max(0, (H - 50 * u - top - total) / 2)
    stacked(doc, items, y)


# ============================================================ wedding


def wedding(doc, c, p, v):
    W, H = doc.W, doc.H
    u = min(W, H * 0.8) / 1080
    b = doc.bleed
    doc.bg(p["bg"])
    m = W * 0.065
    card = v.get("card", True)
    if card:
        doc.rect(m, m, W - 2 * m, H - 2 * m, p["card"], rx=6 * u, shadow_=shadow("rgba(0,0,0,0.18)", 30 * u, 0, 10 * u), name="Card")
        doc.rect(m + 16 * u, m + 16 * u, W - 2 * m - 32 * u, H - 2 * m - 32 * u, "", stroke=p["accent"], sw=1.5 * u, name="Card line")
    kind = v.get("frame", "arch")
    pw = W * 0.56
    ph = pw * (1.2 if kind == "arch" else 1.0 if kind == "circle" else 0.8)
    px, py = (W - pw) / 2, m + 70 * u
    framed_photo(doc, c["photo"], px, py, pw, ph, kind=kind, focus=c.get("focus", (0.5, 0.35)))
    # leaf sprigs at the photo's lower corners
    leaf = p["leaf"]
    for sx, sg in ((px + pw * 0.02, -1), (px + pw * 0.98, 1)):
        by = py + ph * 0.92
        for i in range(6):
            a = -90 + sg * (25 + i * 14)
            doc.leaf(sx, by - i * 6 * u, (120 - i * 9) * u, (32 - i * 2) * u, a, leaf, opacity=0.95 - i * 0.06)
        doc.circle(sx + sg * 6 * u, by + 8 * u, 9 * u, p["accent"], name="Berry")
    x0, cw = W * 0.12, W * 0.76
    items = [
        (lambda y: doc.text(x0, y, cw, c.get("kicker", "TOGETHER WITH THEIR FAMILIES"), "Montserrat", 19 * u, p["accent"], weight=700, align="center", spacing=420, upper=True), 16 * u),
        (lambda y: doc.text(x0, y, cw, c["names"], v.get("script", "Great Vibes"), min(112 * u, 112 * u * cw * 0.94 / max(1, text_width(c["names"], v.get("script", "Great Vibes"), 112 * u))), p["ink"], align="center", lh=1.0, name="Names"), 10 * u),
        (lambda y: doc.text(x0, y, cw, c.get("line", "INVITE YOU TO CELEBRATE THEIR WEDDING"), "Cormorant Garamond", 26 * u, p["ink"], weight=700, align="center", spacing=200, upper=True), 18 * u),
        (lambda y: doc.text(x0, y, cw, c["date"], "Cormorant Garamond", 40 * u, p["ink"], weight=700, align="center", spacing=60), 6 * u),
        (lambda y: doc.text(x0, y, cw, c["venue"], "Montserrat", 20 * u, rgba(p["ink"], 0.75), align="center", spacing=160, upper=True), 0),
    ]
    total = measure(doc, items)
    top = py + ph + 36 * u
    y = top + max(0, (H - m - 40 * u - top - total) / 2)
    stacked(doc, items, y)


# ============================================================ agency / marketing


def agency(doc, c, p, v):
    W, H = doc.W, doc.H
    u = min(W, H * 0.8) / 1080
    b = doc.bleed
    t = T(doc, "bold")
    doc.bg(lin(0, 0, W, H, [(0, p["bg"]), (1, mix(p["bg"], "#000000", 0.35))]))
    lay = v.get("layout", "circle")
    m = W * 0.07
    if lay == "circle":
        r = W * 0.27
        cx, cy = W * 0.71, H * 0.6
        doc.circle(cx, cy, r + 26 * u, "", stroke=p["accent"], sw=10 * u, name="Ring")
        doc.circle(cx + r * 0.75, cy - r * 0.82, 26 * u, p["accent"], name="Dot")
        framed_photo(doc, c["photo"], cx - r, cy - r, 2 * r, 2 * r, kind="circle", focus=c.get("focus", (0.5, 0.35)))
        text_w = W * 0.44
        bubbles = [(cx - r * 1.02, cy + r * 0.55, 46 * u, "star"), (cx + r * 1.0, cy + r * 0.2, 38 * u, "check")]
    elif lay == "slant":
        doc.polygon([(W * 0.42, -b), (W + b, -b), (W + b, H + b), (W * 0.58, H + b)], p["accent"], name="Panel")
        framed_photo(doc, c["photo"], W * 0.48, -b, W * 0.52 + b, H + 2 * b, kind="slant2", focus=c.get("focus", (0.5, 0.3)))
        text_w = W * 0.38
        bubbles = [(W * 0.5, H * 0.72, 44 * u, "bolt")]
    else:  # bottom photo
        ph = H * 0.48
        doc.polygon([(-b, H - ph - 30 * u), (W + b, H - ph - 120 * u), (W + b, H + b), (-b, H + b)], p["accent"], name="Panel")
        framed_photo(doc, c["photo"], -b, H - ph, W + 2 * b, ph + b, kind="slant", focus=c.get("focus", (0.5, 0.3)))
        text_w = W - 2 * m
        bubbles = [(W - m - 30 * u, H - ph - 60 * u, 46 * u, "heart")]
    for (bx, by, br, g) in bubbles:
        icon_bubble(doc, bx, by, br, p["accent"], p["bg"], g)
    y = m * 0.9
    o = doc.text(m, y, text_w, c.get("kicker", "WE ARE"), "Montserrat", 22 * u, p["accent"], weight=700, spacing=420, upper=True)
    y += o["_h"] + 10 * u
    for i, ln in enumerate(c["title"].split("\n")):
        outline = v.get("outline") == i
        o = t.head(m, y, text_w, ln, "#FFFFFF" if not outline else "rgba(0,0,0,0)", 150, upper=True, lh=0.9, family=v.get("heavy", "Anton"), weight=400, max_lines=1)
        if outline:
            o.update({"stroke": "#FFFFFF", "strokeWidth": 2.5 * u, "paintFirst": "stroke"})
        y += o["_h"] + 2 * u
    y += 18 * u
    if c.get("sub"):
        o = doc.text(m, y, text_w * 0.95, c["sub"], "Montserrat", 26 * u, rgba("#FFFFFF", 0.88), lh=1.4)
        y += o["_h"] + 26 * u
    if lay != "bottom" and c.get("services"):
        o = doc.text(m, y, text_w, "OUR SERVICES", "Montserrat", 18 * u, p["accent"], weight=700, spacing=300)
        y += o["_h"] + 12 * u
        for s_ in c["services"]:
            doc.circle(m + 9 * u, y + 13 * u, 9 * u, p["accent"], name="Bullet")
            o = doc.text(m + 30 * u, y, text_w - 30 * u, s_, "Montserrat", 24 * u, "#FFFFFF", weight=600)
            y += o["_h"] + 10 * u
        y += 16 * u
    if c.get("cta"):
        cta(doc, t, m, min(y, H - 160 * u) if lay != "bottom" else y, c["cta"], p["bg"], p["accent"], size=20)
    if lay != "bottom":
        doc.text(m, H - m * 0.9, text_w, c.get("web", "www.yourbrand.com"), "Montserrat", 18 * u, "#FFFFFF", weight=600, spacing=160, name="Website")


# ============================================================ collage

GRIDS = {
    "hero3": [(0, 0, .62, 1), (.64, 0, .36, .49), (.64, .51, .36, .49)],
    "quad": [(0, 0, .49, .49), (.51, 0, .49, .49), (0, .51, .49, .49), (.51, .51, .49, .49)],
    "strips": [(0, 0, .32, 1), (.34, 0, .32, 1), (.68, 0, .32, 1)],
    "mosaic5": [(0, 0, .49, .62), (.51, 0, .49, .38), (.51, .40, .49, .60), (0, .64, .24, .36), (.25, .64, .24, .36)],
    "six": [(0, 0, .32, .49), (.34, 0, .32, .49), (.68, 0, .32, .49), (0, .51, .32, .49), (.34, .51, .32, .49), (.68, .51, .32, .49)],
    "tall2": [(0, 0, .49, 1), (.51, 0, .49, 1)],
}


def collage(doc, c, p, v):
    W, H = doc.W, doc.H
    u = min(W, H * 0.8) / 1080
    rng = random.Random(v.get("seed", 5))
    doc.bg(p["bg"])
    if v.get("dots"):
        doc.dots(0, 0, W, H, 34 * u, 2.4 * u, rgba(p["ink"], 0.12))
    lay = v.get("layout", "hero3")
    photos = c["photos"]
    m = W * 0.06
    title_h = H * 0.22
    if lay == "polaroids":
        spots = [(W * 0.3, H * 0.33, -8), (W * 0.7, H * 0.3, 6), (W * 0.32, H * 0.68, 5), (W * 0.7, H * 0.66, -6)]
        pw = W * 0.36
        for (cx, cy, ang), ph_ in zip(spots, photos):
            doc.rect(cx, cy, pw + 28 * u, pw * 0.95 + 90 * u, "#FFFFFF", angle=ang, origin_center=True, shadow_=shadow("rgba(0,0,0,0.25)", 24 * u, 0, 8 * u), name="Polaroid")
            o = framed_photo(doc, ph_, cx, cy - 26 * u, pw, pw * 0.95)
            o.update({"originX": "center", "originY": "center", "angle": ang})
            doc.rect(cx, cy - pw * 0.52 - 30 * u, 120 * u, 34 * u, rgba(p["accent"], 0.75), angle=ang + rng.uniform(-8, 8), origin_center=True, name="Tape")
        tw = min(W * 0.8, text_width(c["title"], v.get("script", "Pacifico"), 84 * u) + 90 * u)
        doc.rect(W / 2, H * 0.5, tw, 130 * u, p["accent"], rx=65 * u, origin_center=True, shadow_=shadow("rgba(0,0,0,0.25)", 20 * u, 0, 6 * u), name="Title pill")
        doc.text(W / 2 - tw / 2, H * 0.5 - 62 * u, tw, c["title"], v.get("script", "Pacifico"), 84 * u, "#FFFFFF", align="center", name="Title")
        return
    if lay == "circles":
        pts = [(W * 0.5, H * 0.42, W * 0.25), (W * 0.2, H * 0.24, W * 0.14), (W * 0.82, H * 0.22, W * 0.12), (W * 0.18, H * 0.66, W * 0.12), (W * 0.82, H * 0.64, W * 0.14)]
        for (cx, cy, r), ph_ in zip(pts, photos):
            doc.circle(cx, cy, r + 10 * u, "#FFFFFF", shadow_=shadow("rgba(0,0,0,0.2)", 20 * u, 0, 6 * u), name="Ring")
            framed_photo(doc, ph_, cx - r, cy - r, 2 * r, 2 * r, kind="circle")
        for _ in range(6):
            doc.leaf(rng.uniform(0, W), rng.uniform(H * 0.05, H * 0.75), rng.uniform(40, 80) * u, rng.uniform(14, 22) * u, rng.uniform(0, 360), p["accent"], opacity=0.8)
        gy = H * 0.8
    else:
        cells = GRIDS[lay]
        gx, gy0, gw, gh = m, m, W - 2 * m, H - 2 * m - title_h
        if v.get("title_top"):
            gy0 = m + title_h
        for (cx_, cy_, cw_, ch_), ph_ in zip(cells, photos):
            framed_photo(doc, ph_, gx + cx_ * gw, gy0 + cy_ * gh, cw_ * gw, ch_ * gh, kind="rounded" if v.get("round") else "rect")
        gy = m if v.get("title_top") else gy0 + gh + 10 * u
    x0, cw = m, W - 2 * m
    items = [
        (lambda y: doc.text(x0, y, cw, c["title"], v.get("script", "Pacifico"), 100 * u, p["ink"], align="center", lh=1.0, name="Title"), 8 * u),
        (lambda y: doc.text(x0, y, cw, c.get("sub", "SUMMER 2026"), "Montserrat", 24 * u, p["accent"], weight=700, align="center", spacing=520, upper=True), 0),
    ]
    total = measure(doc, items)
    band = title_h if lay != "circles" else H - gy
    stacked(doc, items, gy + max(0, (band - total - 20 * u) / 2))


# ============================================================ christmas


def christmas(doc, c, p, v):
    W, H = doc.W, doc.H
    u = min(W, H * 0.8) / 1080
    rng = random.Random(v.get("seed", 9))
    t = T(doc, "bold")
    doc.bg(rad(W / 2, H * 0.4, max(W, H) * 0.8, [(0, mix(p["bg"], "#ffffff", 0.12)), (1, mix(p["bg"], "#000000", 0.3))]))
    for _ in range(18):
        snowflake(doc, rng.uniform(0, W), rng.uniform(0, H), rng.uniform(10, 30) * u, "#FFFFFF", opacity=rng.uniform(0.25, 0.7))
    # hanging ornaments
    for i, (fx, L, r) in enumerate([(0.12, 90, 34), (0.26, 160, 26), (0.74, 140, 30), (0.88, 80, 38)]):
        ornament(doc, W * fx, -doc.bleed, L * u + doc.bleed, r * u, p["orn"][i % len(p["orn"])], cap=p["gold"])
    lay = v.get("layout", "photo")
    x0, cw = W * 0.08, W * 0.84
    if lay == "photo":
        r = W * 0.27
        cx, cy = W / 2, H * 0.36
        doc.circle(cx, cy, r + 18 * u, "", stroke=p["gold"], sw=6 * u, name="Gold ring")
        framed_photo(doc, c["photo"], cx - r, cy - r, 2 * r, 2 * r, kind="circle", focus=c.get("focus", (0.5, 0.4)))
        top = cy + r + 50 * u
        items = [
            (lambda y: doc.text(x0, y, cw, c.get("script", "Merry Christmas"), v.get("script", "Great Vibes"), 116 * u, "#FFFFFF", align="center", lh=1.0), 8 * u),
            (lambda y: doc.text(x0, y, cw, c.get("sub", "AND A HAPPY NEW YEAR"), "Montserrat", 24 * u, p["gold"], weight=700, align="center", spacing=480, upper=True), 18 * u),
            (lambda y: doc.text(x0 + cw * 0.1, y, cw * 0.8, c.get("msg", ""), "Lora", 22 * u, rgba("#FFFFFF", 0.85), italic=True, align="center", lh=1.45), 0),
        ]
    else:  # sale
        top = H * 0.24
        items = [
            (lambda y: doc.text(x0, y, cw, c.get("script", "Christmas"), v.get("script", "Great Vibes"), 130 * u, "#FFFFFF", align="center", lh=1.0), -10 * u),
            (lambda y: t.head(x0, y, cw, c.get("big", "SALE"), p["gold"], 300, align="center", upper=True, lh=0.9, family="Anton", weight=400, max_lines=1), 8 * u),
            (lambda y: doc.text(x0, y, cw, c.get("sub", "UP TO 50% OFF"), "Montserrat", 40 * u, "#FFFFFF", weight=800, align="center", spacing=300, upper=True), 28 * u),
            (lambda y: doc.text(x0 + cw * 0.12, y, cw * 0.76, c.get("msg", ""), "Montserrat", 22 * u, rgba("#FFFFFF", 0.85), align="center", lh=1.45), 0),
        ]
        # gift photo strip at the bottom
        framed_photo(doc, c["photo"], W * 0.18, H * 0.66, W * 0.64, H * 0.26, kind="ticket", focus=c.get("focus", (0.5, 0.5)))
    total = measure(doc, items)
    bottom = H - 50 * u if lay == "photo" else H * 0.64
    y = top + max(0, (bottom - top - total) / 2)
    stacked(doc, items, y)
    if lay == "sale" and c.get("cta"):
        pass


ARCH = {"birthday": birthday, "certificate": certificate, "valentine": valentine, "wedding": wedding, "agency": agency, "collage": collage, "christmas": christmas}


def build(doc, spec):
    ARCH[spec["arch"]](doc, spec["c"], spec["p"], spec.get("v", {}))
    return doc
