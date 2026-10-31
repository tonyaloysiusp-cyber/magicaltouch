"""
Studio collection (Nov 2026): the template types the library was missing,
built the way a studio designer would — a clear grid, two typefaces, a
three-colour palette, real CC0 photographs in editable photo frames.

New archetypes
  grid        photo collage: 2-9 photos on a clean grid, title band
  polaroid    photo-album page: tilted instant prints with handwritten captions
  shape       one photo in a shaped frame (circle, arch, heart, flower…)
  resume      A4 CV: sidebar with photo, contact and skills; experience
  certificate A4 landscape: border, title, name in script, signatures, seal
  product     product poster: photo, name, three benefits, price badge, button
  banner      wide banners / ads: photo on one side, copy on the other
  quote       quote post: big marks, quote, author
  tips        "5 tips" list post / carousel cover
Multi-page books (magazine, photo album) are built page by page (see
build_studio.py) from these and the Pro archetypes.

Photos: /templates/photos/pro/<name>.jpg (CC0, docs/photo-credits.md).
"""

from __future__ import annotations

import math

from kit import FS_MULT, lin, rgba, text_width, parse_d, shadow
from pro import PAIRS, T, cta, photo, rule, bleed_rect, full_photo
import pro

PAIRS.update({
    "grotesk": dict(head="Space Grotesk", hw=700, body="Inter", bw=400, kick="Space Grotesk", kw=700),
    "display": dict(head="DM Serif Display", hw=400, body="Work Sans", bw=400, kick="Work Sans", kw=600),
    "abril": dict(head="Abril Fatface", hw=400, body="Raleway", bw=400, kick="Raleway", kw=700),
    "oswald": dict(head="Oswald", hw=700, body="Poppins", bw=400, kick="Poppins", kw=600),
    "hand": dict(head="Poppins", hw=700, body="Poppins", bw=400, kick="Poppins", kw=600, accent="Caveat"),
    "elegant": dict(head="Cormorant Garamond", hw=600, body="Raleway", bw=400, kick="Raleway", kw=600, accent="Allura"),
})


# ------------------------------------------------------------- frames
def _scaled(d100, w, h):
    cmds = parse_d(d100)
    out = []
    for c in cmds:
        out.append([c[0]] + [v * (w / 100 if i % 2 == 0 else h / 100) for i, v in enumerate(c[1:])])
    return out


HEART = "M 50 92 C 22 72 2 54 2 32 C 2 14 16 2 31 2 C 40 2 46 7 50 14 C 54 7 60 2 69 2 C 84 2 98 14 98 32 C 98 54 78 72 50 92 Z"
BLOB = "M 52 2 C 72 0 92 12 97 32 C 102 52 92 64 88 78 C 82 96 62 102 44 98 C 24 94 6 84 2 64 C -2 44 6 26 20 14 C 30 6 40 3 52 2 Z"


def _petals(w, h, n, depth, out):
    p = []
    for i in range(n + 1):
        a = -math.pi / 2 + i * 2 * math.pi / n
        am = a - math.pi / n
        sp = math.pi / n / 1.6
        x, y = w / 2 + math.cos(a) * w / 2 * depth, h / 2 + math.sin(a) * h / 2 * depth
        if i == 0:
            p.append(["M", x, y])
        else:
            p.append(["C", w / 2 + math.cos(am - sp) * w / 2 * out, h / 2 + math.sin(am - sp) * h / 2 * out,
                      w / 2 + math.cos(am + sp) * w / 2 * out, h / 2 + math.sin(am + sp) * h / 2 * out, x, y])
    p.append(["Z"])
    return p


def _poly(w, h, n, rot):
    p = [["M" if i == 0 else "L", w / 2 + math.cos(rot + i * 2 * math.pi / n) * w / 2, h / 2 + math.sin(rot + i * 2 * math.pi / n) * h / 2] for i in range(n)]
    return p + [["Z"]]


def _squircle(w, h):
    p = []
    for i in range(64):
        a = i / 64 * 2 * math.pi
        c, s = math.cos(a), math.sin(a)
        p.append(["M" if i == 0 else "L", w / 2 + w / 2 * math.copysign(abs(c) ** 0.5, c), h / 2 + h / 2 * math.copysign(abs(s) ** 0.5, s)])
    return p + [["Z"]]


def clip_for(doc, kind, w, h, r=0):
    """Clip path in the editor's own frame shapes (lib/editor/shapePaths.ts)."""
    base = {"version": "5.1.0", "originX": "center", "originY": "center", "left": 0, "top": 0, "fill": "#000000", "strokeWidth": 0}
    if kind in ("rect", "rounded", "circle", "ellipse", "arch"):
        return doc._clip(kind, w, h, r)
    path = {
        "heart": lambda: _scaled(HEART, w, h), "blob": lambda: _scaled(BLOB, w, h),
        "hexagon": lambda: _poly(w, h, 6, 0), "octagon": lambda: _poly(w, h, 8, -math.pi / 8),
        "flower": lambda: _petals(w, h, 8, 0.72, 1.3), "scallop": lambda: _petals(w, h, 20, 0.9, 1.1),
        "squircle": lambda: _squircle(w, h),
        "diamond": lambda: [["M", w / 2, 0], ["L", w, h / 2], ["L", w / 2, h], ["L", 0, h / 2], ["Z"]],
        "slant": lambda: [["M", w * 0.14, 0], ["L", w, 0], ["L", w * 0.86, h], ["L", 0, h], ["Z"]],
        "leaf": lambda: [["M", min(w, h) / 2, 0], ["L", w, 0], ["L", w, h - min(w, h) / 2], ["Q", w, h, w - min(w, h) / 2, h], ["L", 0, h], ["L", 0, min(w, h) / 2], ["Q", 0, 0, min(w, h) / 2, 0], ["Z"]],
    }[kind]()
    return dict(base, type="path", path=path, width=w, height=h)


KIND = {"rounded": "roundRect", "rect": "rect", "circle": "circle", "ellipse": "ellipse"}


def framed_photo(doc, name, x, y, w, h, kind="rect", r=0, focus=(0.5, 0.5), zoom=1.0, label="Photo", shadow_=None):
    """A photo in an editable frame of any editor shape."""
    o = photo(doc, name, x, y, w, h, frame="rect", focus=focus, zoom=zoom, label=label, shadow_=shadow_)
    s = o["scaleX"]
    clip = clip_for(doc, kind, o["width"], o["height"], r / s if r else 0)
    if clip:
        o["clipPath"] = clip
    o["__frame"] = {"kind": KIND.get(kind, kind), "empty": False}
    return o


def bg(doc, fill):
    return doc.bg(fill)


# -------------------------------------------------------------- collage
LAYOUTS = {
    # (x, y, w, h) in 0..1 of the photo area
    "2v": [(0, 0, 0.5, 1), (0.5, 0, 0.5, 1)],
    "2h": [(0, 0, 1, 0.5), (0, 0.5, 1, 0.5)],
    "3a": [(0, 0, 0.6, 1), (0.6, 0, 0.4, 0.5), (0.6, 0.5, 0.4, 0.5)],
    "3b": [(0, 0, 1, 0.58), (0, 0.58, 0.5, 0.42), (0.5, 0.58, 0.5, 0.42)],
    "4": [(0, 0, 0.5, 0.5), (0.5, 0, 0.5, 0.5), (0, 0.5, 0.5, 0.5), (0.5, 0.5, 0.5, 0.5)],
    "4a": [(0, 0, 0.62, 0.62), (0.62, 0, 0.38, 0.31), (0.62, 0.31, 0.38, 0.31), (0, 0.62, 1, 0.38)],
    "5": [(0, 0, 0.5, 0.6), (0.5, 0, 0.5, 0.3), (0.5, 0.3, 0.5, 0.3), (0, 0.6, 0.5, 0.4), (0.5, 0.6, 0.5, 0.4)],
    "6": [(c / 3, r / 2, 1 / 3, 0.5) for r in range(2) for c in range(3)],
    "6p": [(c / 2, r / 3, 0.5, 1 / 3) for r in range(3) for c in range(2)],
    "9": [(c / 3, r / 3, 1 / 3, 1 / 3) for r in range(3) for c in range(3)],
}


def grid(doc, c, p, pair, layout="4", band="bottom", gap=0.018, rounded=0.0, title_size=96, frame="rect", band_h=None):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.05
    g = W * gap
    has_text = bool(c.get("title"))
    bh = (band_h if band_h is not None else (0.2 if H > W else 0.22)) * H if has_text else 0
    ax, aw = m, W - 2 * m
    if band == "top":
        ay, ah = m + bh, H - 2 * m - bh
    else:
        ay, ah = m, H - 2 * m - bh
    for i, (fx, fy, fw, fh) in enumerate(LAYOUTS[layout]):
        x = ax + fx * aw + (g / 2 if fx > 0 else 0)
        y = ay + fy * ah + (g / 2 if fy > 0 else 0)
        w = fw * aw - (g / 2 if fx > 0 else 0) - (g / 2 if fx + fw < 0.999 else 0)
        h = fh * ah - (g / 2 if fy > 0 else 0) - (g / 2 if fy + fh < 0.999 else 0)
        names = c["photos"]
        framed_photo(doc, names[i % len(names)], x, y, w, h, kind="rounded" if rounded else frame, r=rounded * W, label=f"Photo {i + 1}")
    if not has_text:
        return
    by = m if band == "top" else H - m - bh
    cw = W - 2 * m
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(m, y, cw, c["kicker"], p["accent"], size=22, align="center"), t.s(16)))
    if c.get("accent"):
        items.append((lambda y: t.accent(m, y, cw, c["accent"], p["accent"], 84), t.s(4)))
    items.append((lambda y: t.head(m, y, cw, c["title"], p["ink"], title_size, align="center", max_lines=2, upper=c.get("upper", False)), t.s(14)))
    if c.get("sub"):
        items.append((lambda y: t.body(m, y, cw, c["sub"], rgba(p["ink"], 0.75), size=26, align="center"), 0))
    start = len(doc.objs)
    total = pro.stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    pro.stack_down(items, by + (bh - total) / 2 + (g if band == "bottom" else -g) * 0.3)


# ------------------------------------------------------------- polaroid
def polaroid_card(doc, t, name, cx, cy, w, angle, caption, p, focus=(0.5, 0.5)):
    pad = w * 0.06
    ph = w - 2 * pad
    h = w * 1.18
    x, y = cx - w / 2, cy - h / 2
    # rotate the whole card about its centre by placing each piece with the same angle
    card = doc.rect(cx, cy, w, h, "#FFFFFF", angle=angle, shadow_=shadow("rgba(0,0,0,0.18)", 24, 0, 10), name="Print", origin_center=True)
    rad = math.radians(angle)

    def rot(px, py):  # point relative to card centre -> page
        return cx + px * math.cos(rad) - py * math.sin(rad), cy + px * math.sin(rad) + py * math.cos(rad)

    # photo centre sits pad+ph/2 from the top
    pcx, pcy = rot(0, -h / 2 + pad + ph / 2)
    o = framed_photo(doc, name, pcx - ph / 2, pcy - ph / 2, ph, ph, label="Photo", focus=focus)
    o["originX"] = o["originY"] = "center"
    o["left"], o["top"] = pcx, pcy
    o["angle"] = angle
    tcx, tcy = rot(0, h / 2 - (h - w) / 2 - pad * 0.2)
    fam = PAIRS["hand"]["accent"]
    sz = w * 0.075
    tx = doc.text(tcx - w * 0.45, tcy - sz * 0.6, w * 0.9, caption, fam, sz, p.get("hand", "#3A3A3A"), align="center", name="Caption", angle=angle)
    tx["originX"], tx["originY"] = "center", "center"
    tx["left"], tx["top"] = tcx, tcy
    return card


def polaroid(doc, c, p, pair, title_size=110):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    doc.dots(0, 0, W, H, W * 0.045, W * 0.0028, rgba(p["ink"], 0.12))
    names = c["photos"]
    n = len(names)
    caps = c.get("captions") or [""] * n
    shape_ = "portrait" if H > W * 1.1 else ("square" if H > W * 0.9 else "land")
    land = shape_ != "portrait"
    L = {
        ("portrait", 2): (0.46, [(0.33, 0.27, -6), (0.66, 0.47, 5)]),
        ("portrait", 3): (0.36, [(0.29, 0.24, -6), (0.71, 0.30, 5), (0.42, 0.55, -3)]),
        ("portrait", 4): (0.33, [(0.29, 0.2, -6), (0.71, 0.24, 5), (0.3, 0.5, 4), (0.7, 0.54, -5)]),
        ("square", 2): (0.38, [(0.3, 0.36, -6), (0.7, 0.4, 5)]),
        ("square", 3): (0.32, [(0.22, 0.33, -6), (0.5, 0.29, 4), (0.79, 0.36, -3)]),
        ("square", 4): (0.25, [(0.16, 0.34, -6), (0.39, 0.38, 4), (0.61, 0.32, -3), (0.84, 0.39, 6)]),
        ("land", 2): (0.32, [(0.3, 0.38, -6), (0.7, 0.4, 5)]),
        ("land", 3): (0.27, [(0.21, 0.36, -6), (0.5, 0.32, 4), (0.79, 0.38, -3)]),
        ("land", 4): (0.21, [(0.15, 0.36, -6), (0.38, 0.4, 4), (0.62, 0.34, -3), (0.85, 0.41, 6)]),
    }
    k, spots = L[(shape_, min(4, max(2, n)))]
    cw = W * k
    for i, name in enumerate(names):
        sx, sy, a = spots[i]
        polaroid_card(doc, t, name, sx * W, sy * H, cw, a, caps[i], p)
    # title
    m = W * 0.07
    if c.get("title"):
        ty = H * (0.78 if not land else 0.74)
        if c.get("accent"):
            a_h = t.s(90) * FS_MULT
            t.accent(m, ty - a_h * 0.92, W - 2 * m, c["accent"], p["accent"], 90)
        t.head(m, ty, W - 2 * m, c["title"], p["ink"], title_size, align="center", max_lines=2)
        if c.get("sub"):
            t.body(m, H - m * 1.25, W - 2 * m, c["sub"], rgba(p["ink"], 0.7), size=22, align="center", spacing=260, upper=True, weight=600)


# ---------------------------------------------------------------- shape
def shape(doc, c, p, pair, kind="circle", title_size=110, layout="top", ring=True):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.08
    land = W > H * 1.1
    if land:
        s = min(H * 0.74, W * 0.42)
        px, py = W * 0.08, (H - s) / 2
    elif layout == "center":
        s = min(W * 0.72, H * 0.5)
        px, py = (W - s) / 2, H * 0.14
    else:
        s = min(W * 0.66, H * 0.48)
        px, py = (W - s) / 2, H * 0.1
    ph = s * (1.25 if kind in ("arch",) else 1.0)
    if kind == "arch" and not land:
        s2 = s * 0.86
        px += (s - s2) / 2
        s = s2
        ph = s * 1.3
    if ring:
        off = s * 0.045
        ring_kind = kind
        clip = clip_for(doc, ring_kind, s, ph)
        # outline of the same shape, offset down-right
        if clip and clip.get("type") == "path":
            doc.path([[q[0]] + [v + (off + (px if i % 2 == 0 else py)) for i, v in enumerate(q[1:])] for q in clip["path"]], fill="rgba(0,0,0,0)", stroke=p["accent"], sw=t.s(3), name="Outline")
        elif kind in ("circle", "ellipse"):
            doc.ellipse(px + s / 2 + off, py + ph / 2 + off, s / 2, ph / 2, fill="rgba(0,0,0,0)", stroke=p["accent"], sw=t.s(3))
        elif kind == "arch":
            arch = doc._clip("arch", s, ph, 0)["path"]
            doc.path([[q[0]] + [v + (off + (px if i % 2 == 0 else py)) for i, v in enumerate(q[1:])] for q in arch], fill="rgba(0,0,0,0)", stroke=p["accent"], sw=t.s(3), name="Outline")
        else:
            doc.rect(px + off, py + off, s, ph, "rgba(0,0,0,0)", stroke=p["accent"], sw=t.s(3), rx=s * 0.06 if kind == "rounded" else 0)
    framed_photo(doc, c["photo"], px, py, s, ph, kind=kind, r=s * 0.08 if kind == "rounded" else 0, focus=c.get("focus", (0.5, 0.45)))
    for (dx, dy, rr) in c.get("sparkles", [(0.86, 0.12, 0.03), (0.1, 0.5, 0.02)]) if c.get("sparkles", True) else []:
        doc.sparkle(dx * W, dy * H, rr * W, p["accent"])
    if land:
        x = px + s + W * 0.06
        cw = W - x - W * 0.07
        y0 = H * 0.18
        align = "left"
    else:
        x = m
        cw = W - 2 * m
        y0 = py + ph + H * 0.05
        align = "center"
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=24, align=align), t.s(18)))
    if c.get("accent"):
        items.append((lambda y: t.accent(x, y, cw, c["accent"], p["accent"], 92, align=align), t.s(2)))
    items.append((lambda y: t.head(x, y, cw, c["title"], p["ink"], title_size, align=align, max_lines=3, upper=c.get("upper", False)), t.s(22)))
    if c.get("sub"):
        items.append((lambda y: t.body(x, y, cw, c["sub"], rgba(p["ink"], 0.78), size=28, align=align), t.s(26)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), p["ink"], size=23, align=align, weight=700, spacing=180, upper=True, lh=1.65), 0))
    start = len(doc.objs)
    total = pro.stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    if land:
        y0 = (H - total) / 2
    else:
        y0 = y0 + max(0, (H - m - y0 - total) / 2) * 0.6
    y = pro.stack_down(items, y0)
    if c.get("cta"):
        cta(doc, t, W / 2 if align == "center" else x, y + t.s(10), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align=align)


# --------------------------------------------------------------- resume
def resume(doc, c, p, pair, side="left"):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    u = W / 794
    bg(doc, "#FFFFFF")
    sw = W * 0.34
    sx = 0 if side == "left" else W - sw
    bleed_rect(doc, sx, 0, sw, H, p["panel"], name="Sidebar")
    on = p["on_panel"]
    pad = 30 * u
    # photo
    ps = sw * 0.62
    framed_photo(doc, c["photo"], sx + (sw - ps) / 2, 46 * u, ps, ps, kind=c.get("frame", "circle"), focus=c.get("focus", (0.5, 0.35)), label="Your photo")
    doc.circle(sx + sw / 2, 46 * u + ps / 2, ps / 2 + 6 * u, "rgba(0,0,0,0)", stroke=p["accent"], sw=2 * u) if c.get("frame", "circle") == "circle" else None
    y = 46 * u + ps + 34 * u
    fam_k, fam_b = t.p["kick"], t.p["body"]

    def side_head(y, text):
        doc.text(sx + pad, y, sw - 2 * pad, text, fam_k, 11.5 * u, p["accent"], weight=700, spacing=300, upper=True, name="Section")
        doc.rect(sx + pad, y + 20 * u, 26 * u, 2 * u, p["accent"], name="Rule")
        return y + 34 * u

    y = side_head(y, "Contact")
    for line in c["contact"]:
        o = doc.text(sx + pad, y, sw - 2 * pad, line, fam_b, 10.5 * u, on, lh=1.35, name="Contact")
        y += o["_h"] + 8 * u
    y += 18 * u
    y = side_head(y, "Skills")
    for name, lvl in c["skills"]:
        doc.text(sx + pad, y, sw - 2 * pad, name, fam_b, 10.5 * u, on, name="Skill")
        y += 17 * u
        doc.rect(sx + pad, y, sw - 2 * pad, 4 * u, rgba(on, 0.22), rx=2 * u, name="Skill track")
        doc.rect(sx + pad, y, (sw - 2 * pad) * lvl, 4 * u, p["accent"], rx=2 * u, name="Skill level")
        y += 16 * u
    if c.get("languages"):
        y += 18 * u
        y = side_head(y, "Languages")
        o = doc.text(sx + pad, y, sw - 2 * pad, "\n".join(c["languages"]), fam_b, 10.5 * u, on, lh=1.6, name="Languages")
    # main column
    mx = (sw + 40 * u) if side == "left" else 40 * u
    mw = W - sw - 80 * u
    y = 56 * u
    o = doc.text(mx, y, mw, c["name"], t.p["head"], doc.fit(c["name"], mw, t.p["head"], 40 * u, t.p["hw"]), p["ink"], weight=t.p["hw"], lh=1.0, name="Name")
    y += o["_h"] + 8 * u
    o = doc.text(mx, y, mw, c["role"], fam_k, 12.5 * u, p["accent"], weight=700, spacing=280, upper=True, name="Role")
    y += o["_h"] + 22 * u
    doc.rect(mx, y, mw, 1.2 * u, rgba(p["ink"], 0.18), name="Rule")
    y += 22 * u

    def main_head(y, text):
        doc.text(mx, y, mw, text, fam_k, 12 * u, p["ink"], weight=700, spacing=300, upper=True, name="Section")
        return y + 26 * u

    y = main_head(y, "Profile")
    o = doc.text(mx, y, mw, c["profile"], fam_b, 10.5 * u, rgba(p["ink"], 0.8), lh=1.5, name="Profile")
    y += o["_h"] + 24 * u
    y = main_head(y, "Experience")
    for role, place, when, what in c["experience"]:
        doc.circle(mx + 4 * u, y + 7 * u, 3.5 * u, p["accent"], name="Dot")
        o = doc.text(mx + 16 * u, y, mw * 0.68, role, fam_b, 11.5 * u, p["ink"], weight=700, name="Job title")
        doc.text(mx + mw * 0.68, y, mw * 0.32, when, fam_b, 9.5 * u, rgba(p["ink"], 0.6), align="right", name="Dates")
        y += o["_h"] + 3 * u
        o = doc.text(mx + 16 * u, y, mw - 16 * u, place, fam_b, 10 * u, p["accent"], weight=600, name="Company")
        y += o["_h"] + 5 * u
        o = doc.text(mx + 16 * u, y, mw - 16 * u, what, fam_b, 10 * u, rgba(p["ink"], 0.78), lh=1.45, name="Duties")
        y += o["_h"] + 16 * u
    y += 6 * u
    y = main_head(y, "Education")
    for deg, school, when in c["education"]:
        o = doc.text(mx, y, mw * 0.72, deg, fam_b, 11 * u, p["ink"], weight=700, name="Degree")
        doc.text(mx + mw * 0.7, y, mw * 0.3, when, fam_b, 9.5 * u, rgba(p["ink"], 0.6), align="right", name="Dates")
        y += o["_h"] + 3 * u
        o = doc.text(mx, y, mw, school, fam_b, 10 * u, rgba(p["ink"], 0.75), name="School")
        y += o["_h"] + 14 * u


# ---------------------------------------------------------- certificate
def certificate(doc, c, p, pair, style="classic"):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    u = W / 1123
    bg(doc, p["bg"])
    if style == "band":
        bleed_rect(doc, 0, 0, W * 0.08, H, p["panel"], name="Band")
        bleed_rect(doc, W * 0.08, 0, W * 0.012, H, p["accent"], name="Band line")
    else:
        doc.rect(24 * u, 24 * u, W - 48 * u, H - 48 * u, "rgba(0,0,0,0)", stroke=p["panel"], sw=10 * u, name="Border")
        doc.rect(42 * u, 42 * u, W - 84 * u, H - 84 * u, "rgba(0,0,0,0)", stroke=p["accent"], sw=1.6 * u, name="Inner border")
        for (x, y) in ((42, 42), (W / u - 42, 42), (42, H / u - 42), (W / u - 42, H / u - 42)):
            doc.rect(x * u, y * u, 18 * u, 18 * u, p["accent"], angle=45, origin_center=True, name="Corner")
    cx0 = W * (0.54 if style == "band" else 0.5)
    cw = W * 0.7
    x = cx0 - cw / 2
    y = H * 0.14
    o = doc.text(x, y, cw, c.get("kicker", "Certificate"), t.p["head"], 54 * u, p["ink"], weight=t.p["hw"], align="center", spacing=500, upper=True, name="Title")
    y += o["_h"] + 6 * u
    o = doc.text(x, y, cw, c.get("of", "of achievement"), t.p["kick"], 15 * u, p["accent"], weight=700, align="center", spacing=600, upper=True, name="Subtitle")
    y += o["_h"] + 34 * u
    o = doc.text(x, y, cw, c.get("lead", "This certificate is proudly presented to"), t.p["body"], 14 * u, rgba(p["ink"], 0.7), align="center", name="Lead")
    y += o["_h"] + 10 * u
    fam = PAIRS.get(pair, {}).get("accent") or "Great Vibes"
    sz = doc.fit(c["name"], cw * 0.9, fam, 74 * u)
    o = doc.text(x, y, cw, c["name"], fam, sz, p["ink"], align="center", lh=1.0, name="Recipient")
    y += o["_h"] + 4 * u
    doc.rect(cx0 - cw * 0.3, y, cw * 0.6, 1.2 * u, rgba(p["ink"], 0.35), name="Rule")
    y += 20 * u
    doc.text(x + cw * 0.08, y, cw * 0.84, c["body"], t.p["body"], 13 * u, rgba(p["ink"], 0.75), align="center", lh=1.5, name="Description")
    # signatures
    sy = H * 0.8
    for i, (nm, role) in enumerate(c["sign"]):
        sx = cx0 + (-1 if i == 0 else 1) * cw * 0.3
        doc.rect(sx - 90 * u, sy, 180 * u, 1.2 * u, rgba(p["ink"], 0.5), name="Signature line")
        doc.text(sx - 110 * u, sy + 8 * u, 220 * u, nm, t.p["body"], 12 * u, p["ink"], weight=700, align="center", name="Signer")
        doc.text(sx - 110 * u, sy + 26 * u, 220 * u, role, t.p["body"], 10 * u, rgba(p["ink"], 0.6), align="center", name="Signer role")
    # seal
    r = 46 * u
    scx, scy = cx0, sy + 4 * u
    doc.path([["M", 0, 0], ["L", 18 * u, 0], ["L", 18 * u, 44 * u], ["L", 9 * u, 36 * u], ["L", 0, 44 * u], ["Z"]], fill=p["panel"], name="Ribbon").update({"left": scx - 22 * u, "top": scy + r * 0.5})
    doc.path([["M", 0, 0], ["L", 18 * u, 0], ["L", 18 * u, 44 * u], ["L", 9 * u, 36 * u], ["L", 0, 44 * u], ["Z"]], fill=p["panel"], name="Ribbon").update({"left": scx + 4 * u, "top": scy + r * 0.5})
    doc.star(scx, scy, r, p["accent"], points=24, inner=0.88)
    doc.circle(scx, scy, r * 0.74, p["panel"], name="Seal")
    doc.circle(scx, scy, r * 0.64, "rgba(0,0,0,0)", stroke=p["accent"], sw=1.2 * u, name="Seal ring")
    doc.text(scx - r * 0.7, scy - 9 * u, r * 1.4, c.get("seal", "2026"), t.p["kick"], 13 * u, p["accent"], weight=700, align="center", spacing=200, name="Seal text")


# -------------------------------------------------------------- product
def product(doc, c, p, pair, kind="circle", title_size=120):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    land = W > H
    if land:
        t.u = H / 640
    m = W * 0.07
    # colour block behind the product
    if land:
        bleed_rect(doc, W * 0.5, 0, W * 0.5, H, p["panel"], name="Panel")
        s = H * 0.7
        px, py = W * 0.75 - s / 2, (H - s) / 2
    else:
        bleed_rect(doc, 0, 0, W, H * 0.5, p["panel"], name="Panel")
        s = W * 0.62
        px, py = (W - s) / 2, H * 0.12
    framed_photo(doc, c["photo"], px, py, s, s, kind=kind, r=s * 0.08, focus=c.get("focus", (0.5, 0.5)), shadow_=shadow("rgba(0,0,0,0.22)", 40, 0, 18))
    # price badge
    br = s * 0.17
    bx, by = px + s - br * 0.4, py + br * 0.6
    doc.star(bx, by, br, p["accent"], points=18, inner=0.86)
    doc.text(bx - br, by - br * 0.5, br * 2, c.get("price_label", "Only"), t.p["kick"], br * 0.24, p.get("cta_fg", "#FFFFFF"), weight=700, align="center", spacing=120, upper=True, name="Price label")
    doc.text(bx - br, by - br * 0.22, br * 2, c["price"], t.p["head"], doc.fit(c["price"], br * 1.5, t.p["head"], br * 0.62, t.p["hw"]), p.get("cta_fg", "#FFFFFF"), weight=t.p["hw"], align="center", name="Price")
    if land:
        x, cw, align = m, W * 0.5 - 2 * m, "left"
        y0 = H * 0.16
    else:
        x, cw, align = m, W - 2 * m, "center"
        y0 = py + s + H * 0.045
    items = []
    if c.get("brand"):
        items.append((lambda y: t.kicker(x, y, cw, c["brand"], p["accent"], size=24, align=align), t.s(14)))
    items.append((lambda y: t.head(x, y, cw, c["title"], p["ink"], title_size, align=align, max_lines=2, upper=c.get("upper", False)), t.s(18)))
    if c.get("sub"):
        items.append((lambda y: t.body(x, y, cw, c["sub"], rgba(p["ink"], 0.78), size=27, align=align), t.s(22)))
    if c.get("points"):
        items.append((lambda y: t.body(x, y, cw, "   ".join("✓ " + q for q in c["points"]) if not land else "\n".join("✓  " + q for q in c["points"]), p["ink"], size=23, align=align, weight=600, lh=1.7), t.s(26)))
    start = len(doc.objs)
    total = pro.stack_down(items, 0)
    del doc.objs[start:]
    if land:
        y0 = (H - total - t.s(80)) / 2
    y = pro.stack_down(items, y0)
    if c.get("cta"):
        cta(doc, t, W / 2 if align == "center" else x, y, c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align=align)
    if c.get("web"):
        t.body(m, H - m * 0.85, W - 2 * m, c["web"], rgba(p["ink"], 0.6), size=20, align="center" if not land else "left", weight=600, spacing=200, upper=True)


# --------------------------------------------------------------- banner
def banner(doc, c, p, pair, photo_side="right", title_size=None, kind="slant"):
    W, H = doc.W, doc.H
    bg(doc, p["bg"])
    k = H / 400  # banners are designed on a 400-tall grid
    pw = W * (0.46 if W / H < 3.5 else 0.38)
    px = W - pw if photo_side == "right" else 0
    b = doc.bleed
    framed_photo(doc, c["photo"], px - (0 if photo_side == "right" else b), -b, pw + b, H + 2 * b, kind=kind if photo_side == "right" else "rect", focus=c.get("focus", (0.5, 0.5)))
    x = (W * 0.05) if photo_side == "right" else pw + W * 0.05
    cw = W - pw - W * 0.1
    fam_h, wt = PAIRS[pair]["head"], PAIRS[pair]["hw"]
    fam_k, kw = PAIRS[pair]["kick"], PAIRS[pair]["kw"]
    y = H * 0.17
    small = H < 150
    if c.get("kicker") and not small:
        o = doc.text(x, y, cw, c["kicker"], fam_k, 17 * k, p["accent"], weight=kw, spacing=320, upper=True, name="Kicker")
        y += o["_h"] + 10 * k
    tsz = doc.fit(c["title"], cw, fam_h, (title_size or 74) * k, wt, upper=c.get("upper", False))
    o = doc.text(x, y, cw, c["title"], fam_h, tsz, p["ink"], weight=wt, lh=1.0, upper=c.get("upper", False), name="Headline")
    y += o["_h"] + 14 * k
    if c.get("sub") and not small:
        o = doc.text(x, y, cw * 0.92, c["sub"], PAIRS[pair]["body"], 21 * k, rgba(p["ink"], 0.78), lh=1.35, name="Body")
        y += o["_h"] + 20 * k
    if c.get("cta"):
        sz = (16 if not small else 14) * k
        tw = text_width(c["cta"].upper(), fam_k, sz, kw, False, 160)
        bh = sz * FS_MULT + sz * 1.4
        by = y if not small else (H - bh) / 2
        bx = x if not small else W - pw - tw - sz * 4
        doc.rect(bx, by, tw + sz * 3, bh, p.get("cta_bg", p["accent"]), rx=bh / 2, name="Button")
        doc.text(bx, by + sz * 0.7, tw + sz * 3, c["cta"], fam_k, sz, p.get("cta_fg", "#FFFFFF"), weight=kw, align="center", spacing=160, upper=True, name="Button label")
    if c.get("web") and not small:
        doc.text(x, H - H * 0.12 - 14 * k, cw, c["web"], fam_k, 14 * k, rgba(p["ink"], 0.55), weight=kw, spacing=240, upper=True, name="Website")


# ---------------------------------------------------------------- quote
def quote(doc, c, p, pair, title_size=96, photo_bg=False):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    if photo_bg and c.get("photo"):
        full_photo(doc, c["photo"], c.get("focus", (0.5, 0.5)))
        doc.rect(-doc.bleed, -doc.bleed, W + 2 * doc.bleed, H + 2 * doc.bleed, rgba(p["panel"], 0.72), name="Tint")
        ink = p["on_panel"]
    else:
        bg(doc, p["bg"])
        ink = p["ink"]
    m = W * 0.11
    cw = W - 2 * m
    doc.text(m - t.s(10), H * 0.16, cw, "“", "Playfair Display", t.s(300), p["accent"], weight=700, lh=0.8, name="Quote mark")
    items = [(lambda y: t.head(m, y, cw, c["title"], ink, title_size, align="left", lh=1.18, max_lines=7), t.s(46)),
             (lambda y: (doc.rect(m, y, t.s(60), t.s(4), p["accent"], name="Rule"), {"_h": t.s(4)})[1], t.s(24)),
             (lambda y: t.kicker(m, y, cw, c["author"], ink, size=24, spacing=260), 0)]
    start = len(doc.objs)
    total = pro.stack_down(items, 0)
    del doc.objs[start:]
    y0 = max(H * 0.32, (H - total) / 2 + H * 0.04)
    pro.stack_down(items, y0)
    if c.get("handle"):
        t.body(m, H - m * 0.9, cw, c["handle"], rgba(ink, 0.6), size=22, weight=600, spacing=160)
    if c.get("page"):
        t.body(m, H - m * 0.9, cw, c["page"], rgba(ink, 0.6), size=22, weight=600, align="right")


# ----------------------------------------------------------------- tips
def tips(doc, c, p, pair, title_size=100):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.08
    cw = W - 2 * m
    y = m * 1.1
    o = t.kicker(m, y, cw, c.get("kicker", ""), p["accent"], size=24)
    y += o["_h"] + t.s(18)
    o = t.head(m, y, cw, c["title"], p["ink"], title_size, max_lines=3)
    y += o["_h"] + t.s(40)
    items = c["items"]
    avail = H - y - m * 1.6
    rowh = min(t.s(230), avail / len(items))
    for i, (head, body) in enumerate(items):
        ry = y + i * rowh
        doc.rect(m, ry, cw, rowh - t.s(16), p.get("card", "#FFFFFF"), rx=t.s(22), name="Card")
        n = min(t.s(84), max(t.s(60), rowh * 0.42))
        doc.circle(m + t.s(26) + n / 2, ry + (rowh - t.s(16)) / 2, n / 2, p["accent"], name="Number dot")
        doc.text(m + t.s(26), ry + (rowh - t.s(16)) / 2 - n * 0.27, n, str(i + 1), t.p["head"], n * 0.47, p.get("cta_fg", "#FFFFFF"), weight=t.p["hw"], align="center", name="Number")
        tx = m + t.s(26) + n + t.s(24)
        tw = cw - (tx - m) - t.s(24)
        hs = min(t.s(40), max(t.s(28), rowh * 0.2))
        bs = min(t.s(28), max(t.s(21), rowh * 0.14))
        bh_ = doc.measure(body, tw, t.p["body"], bs, lh=1.3) if body else 0
        top = ry + (rowh - t.s(16) - (hs * FS_MULT + (t.s(6) + bh_ if body else 0))) / 2
        doc.text(tx, top, tw, head, t.p["head"], hs, p["ink"], weight=t.p["hw"], name="Tip")
        if body:
            doc.text(tx, top + hs * FS_MULT + t.s(6), tw, body, t.p["body"], bs, rgba(p["ink"], 0.7), lh=1.3, name="Tip detail")
    if c.get("handle"):
        t.body(m, H - m * 1.0, cw, c["handle"], rgba(p["ink"], 0.6), size=22, weight=600, spacing=160)
    if c.get("swipe"):
        t.body(m, H - m * 1.0, cw, c["swipe"] + "  →", p["accent"], size=22, weight=700, spacing=160, align="right", upper=True)


# ---------------------------------------------------------- magazine pages
def contents_page(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.08
    cw = W - 2 * m
    t.kicker(m, m, cw, c.get("issue", "Inside this issue"), p["accent"], size=22)
    o = t.head(m, m + t.s(50), cw, c.get("title", "Contents"), p["ink"], 150, max_lines=1)
    y = m + t.s(50) + o["_h"] + t.s(30)
    ph = H * 0.3
    framed_photo(doc, c["photo"], m, y, cw, ph, focus=c.get("focus", (0.5, 0.5)))
    y += ph + t.s(40)
    for i, (num, head, sub) in enumerate(c["items"]):
        doc.text(m, y, t.s(110), num, t.p["head"], t.s(52), p["accent"], weight=t.p["hw"], name="Page number")
        o = doc.text(m + t.s(130), y + t.s(4), cw - t.s(130), head, t.p["head"], t.s(34), p["ink"], weight=t.p["hw"], name="Story")
        o2 = doc.text(m + t.s(130), y + t.s(4) + o["_h"] + t.s(6), cw - t.s(130), sub, t.p["body"], t.s(22), rgba(p["ink"], 0.7), lh=1.35, name="Story summary")
        y += max(t.s(64), o["_h"] + o2["_h"] + t.s(10)) + t.s(22)
        doc.rect(m, y - t.s(12), cw, 1, rgba(p["ink"], 0.15), name="Rule")


def article_page(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.08
    cw = W - 2 * m
    ph = H * 0.42
    b = doc.bleed
    framed_photo(doc, c["photo"], -b, -b, W + 2 * b, ph + b, focus=c.get("focus", (0.5, 0.5)))
    y = ph + t.s(46)
    o = t.kicker(m, y, cw, c["kicker"], p["accent"], size=22)
    y += o["_h"] + t.s(14)
    o = t.head(m, y, cw, c["title"], p["ink"], 104, max_lines=2)
    y += o["_h"] + t.s(18)
    o = t.body(m, y, cw, c["dek"], rgba(p["ink"], 0.8), size=28, italic=True, family=t.p["head"] if t.p["head"] in ("Playfair Display", "Lora", "Cormorant Garamond") else None)
    y += o["_h"] + t.s(26)
    colw = (cw - t.s(40)) / 2
    paras = c["body"]
    half = (len(paras) + 1) // 2
    for col, chunk in enumerate((paras[:half], paras[half:])):
        yy = y
        for para in chunk:
            o = doc.text(m + col * (colw + t.s(40)), yy, colw, para, t.p["body"], t.s(20), rgba(p["ink"], 0.85), lh=1.55, name="Article text")
            yy += o["_h"] + t.s(14)
    t.body(m, H - m * 0.7, cw, c.get("folio", ""), rgba(p["ink"], 0.5), size=18, weight=600, spacing=200, upper=True)


def photo_page(doc, c, p, pair):
    """Full-page photo essay: big photo, caption."""
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["bg"])
    m = W * 0.06
    framed_photo(doc, c["photos"][0], m, m, W - 2 * m, H * 0.62, focus=c.get("focus", (0.5, 0.5)))
    g = W * 0.02
    w2 = (W - 2 * m - g) / 2
    y2 = m + H * 0.62 + g
    framed_photo(doc, c["photos"][1], m, y2, w2, H - y2 - m * 2.4, label="Photo 2")
    framed_photo(doc, c["photos"][2], m + w2 + g, y2, w2, H - y2 - m * 2.4, label="Photo 3")
    t.body(m, H - m * 1.9, W - 2 * m, c["caption"], rgba(p["ink"], 0.75), size=22, italic=True)


def back_page(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    bg(doc, p["panel"])
    m = W * 0.1
    cw = W - 2 * m
    o = t.head(m, H * 0.38, cw, c["title"], p["on_panel"], 120, align="center", max_lines=2)
    t.body(m, H * 0.38 + o["_h"] + t.s(30), cw, c["sub"], rgba(p["on_panel"], 0.8), size=26, align="center")
    t.kicker(m, H - m, cw, c.get("brand", ""), p["accent"], size=20, align="center")


ARCH = {"grid": grid, "polaroid": polaroid, "shape": shape, "resume": resume, "certificate": certificate, "product": product, "banner": banner,
        "quote": quote, "tips": tips, "contents": contents_page, "article": article_page, "photo_page": photo_page, "back": back_page}
ARCH.update({k: v for k, v in pro.ARCH.items() if k not in ARCH})


def build(doc, arch, c, p, pair, opts=None):
    ARCH[arch](doc, c, p, pair, **(opts or {}))
