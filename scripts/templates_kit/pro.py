"""
Pro collection: photo-led layouts built the way a studio designer would.

Every design is one of a small set of archetypes (full-bleed hero, split
panel, framed card, arch, magazine cover, sale, collage) filled with a
real CC0 photograph, a two-font pairing and a three-colour palette. All
sizes are relative to the page, so one archetype works for posts,
stories, posters and cards.

Photos live in /templates/photos/pro/<name>.jpg (CC0, docs/photo-credits.md).
"""

from __future__ import annotations

import os

from kit import PUBLIC, FS_MULT, lin, rgba, text_width, wrap, shadow
from common import overlay, pill

# ------------------------------------------------------------------ type
PAIRS = {
    "editorial": dict(head="Playfair Display", hw=700, body="Montserrat", bw=400, kick="Montserrat", kw=700),
    "classic": dict(head="Cormorant Garamond", hw=700, body="Montserrat", bw=400, kick="Montserrat", kw=700),
    "bold": dict(head="Anton", hw=400, body="DM Sans", bw=400, kick="DM Sans", kw=700),
    "poster": dict(head="Bebas Neue", hw=400, body="Montserrat", bw=400, kick="Montserrat", kw=700),
    "modern": dict(head="DM Sans", hw=700, body="DM Sans", bw=400, kick="DM Sans", kw=700),
    "luxe": dict(head="Cinzel", hw=400, body="Montserrat", bw=400, kick="Montserrat", kw=700),
    "romance": dict(head="Great Vibes", hw=400, body="Cormorant Garamond", bw=400, kick="Montserrat", kw=700),
    "script": dict(head="Playfair Display", hw=400, body="Lato", bw=400, kick="Lato", kw=700, accent="Great Vibes"),
    "friendly": dict(head="Fredoka", hw=700, body="Nunito", bw=400, kick="Nunito", kw=700),
    "soft": dict(head="Lora", hw=400, body="Lato", bw=400, kick="Lato", kw=700, accent="Dancing Script"),
}


def photo(doc, name, x, y, w, h, frame="rect", rx=0, focus=(0.5, 0.5), zoom=1.0, label="Photo", opacity=1, filters=None, shadow_=None, stroke=None, sw=0):
    from PIL import Image
    src = f"/templates/photos/pro/{name}.jpg"
    iw, ih = Image.open(os.path.join(PUBLIC, src.lstrip("/"))).size
    s = max(w / iw, h / ih) * zoom
    cw, ch = w / s, h / s
    cx = max(0, min(iw - cw, focus[0] * iw - cw / 2))
    cy = max(0, min(ih - ch, focus[1] * ih - ch / 2))
    o = {"type": "image", "left": x, "top": y, "width": round(cw, 2), "height": round(ch, 2), "cropX": round(cx, 2), "cropY": round(cy, 2),
         "scaleX": s, "scaleY": s, "src": src, "crossOrigin": "anonymous", "filters": filters or [], "opacity": opacity}
    clip = doc._clip(frame, cw, ch, rx / s if rx else 0)
    if clip:
        o["clipPath"] = clip
    o["__frame"] = {"kind": frame if frame != "rounded" else "rect", "empty": False}
    if shadow_:
        o["shadow"] = shadow_
    if stroke:
        o.update({"stroke": stroke, "strokeWidth": sw})
    doc.notes.setdefault("photos", set()).add(name)
    return doc.add(o, label)


class T:
    """Type helper bound to a page: sizes are given in 1080-wide units."""

    def __init__(self, doc, pair):
        self.d = doc
        self.p = PAIRS[pair]
        self.u = min(doc.W, doc.H * 0.8) / 1080

    def s(self, v):
        return v * self.u

    def kicker(self, x, y, w, text, color, size=24, align="left", spacing=320):
        return self.d.text(x, y, w, text, self.p["kick"], self.s(size), color, weight=self.p["kw"], align=align, spacing=spacing, upper=True, name="Kicker")

    def head(self, x, y, w, text, color, size, align="left", lh=1.04, fit=True, upper=False, spacing=0, family=None, weight=None, max_lines=None):
        fam = family or self.p["head"]
        wt = weight if weight is not None else self.p["hw"]
        sz = self.s(size)
        if fit:
            t = text.upper() if upper else text
            # The longest single word must fit; the text may wrap onto up to
            # `max_lines` lines (3 by default) at that size.
            words = [x for x in t.replace("\n", " ").split(" ") if x]
            longest = max(words, key=lambda l: text_width(l, fam, 100, wt, False, spacing))
            while sz > 8 and text_width(longest, fam, sz, wt, False, spacing) > w * 0.97:
                sz *= 0.96
            ml = max_lines or 3
            while sz > 8 and len(wrap(t, w * 0.995, fam, sz, wt, False, spacing)) > ml:
                sz *= 0.96
        return self.d.text(x, y, w, text, fam, sz, color, weight=wt, align=align, lh=lh, upper=upper, spacing=spacing, name="Headline")

    def accent(self, x, y, w, text, color, size, align="center"):
        fam = self.p.get("accent", "Great Vibes")
        return self.d.text(x, y, w, text, fam, self.s(size), color, align=align, lh=1.0, name="Accent")

    def body(self, x, y, w, text, color, size=30, align="left", lh=1.45, weight=None, spacing=0, upper=False, italic=False, family=None):
        return self.d.text(x, y, w, text, family or self.p["body"], self.s(size), color, weight=weight if weight is not None else self.p["bw"], align=align, lh=lh, spacing=spacing, upper=upper, italic=italic, name="Body")

    def h(self, o):
        return o["_h"]


def cta(doc, t, x, y, text, fg, bg, size=24, align="left", outline=False):
    """A pill button; x is the left edge (align=left) or the centre (align=center). Returns (w, h)."""
    fam, wt = t.p["kick"], t.p["kw"]
    sz = t.s(size)
    tw = text_width(text.upper(), fam, sz, wt, False, 160)
    px, py = sz * 1.5, sz * 0.8
    w, h = tw + 2 * px, sz * FS_MULT + 2 * py
    left = x - w / 2 if align == "center" else x
    doc.rect(left, y, w, h, "rgba(0,0,0,0)" if outline else bg, rx=h / 2, stroke=bg if outline else None, sw=t.s(2.2) if outline else 0, name="Button")
    doc.text(left, y + py, w, text, fam, sz, fg, weight=wt, align="center", spacing=160, upper=True, name="Button label")
    return w, h


def rule(doc, x, y, w, color, sw=2, opacity=1):
    return doc.rect(x, y, w, sw, color, opacity=opacity, name="Rule")


def bleed_rect(doc, x, y, w, h, fill, opacity=1, name="Panel"):
    """A rect that runs into the bleed when it touches a page edge."""
    b = doc.bleed
    x0 = x - b if x <= 0 else x
    y0 = y - b if y <= 0 else y
    x1 = x + w + b if x + w >= doc.W else x + w
    y1 = y + h + b if y + h >= doc.H else y + h
    return doc.rect(x0, y0, x1 - x0, y1 - y0, fill, opacity=opacity, name=name)


def full_photo(doc, name, focus=(0.5, 0.5), zoom=1.0):
    b = doc.bleed
    return photo(doc, name, -b, -b, doc.W + 2 * b, doc.H + 2 * b, focus=focus, zoom=zoom)


def stack_down(items, y):
    """items: list of (fn(y)->obj or height, gap_after). Returns the y after the last item."""
    for fn, gap in items:
        o = fn(y)
        h = o["_h"] if isinstance(o, dict) else o
        y += h + gap
    return y


def measure_stack(doc, t, items):
    return sum(h + g for h, g in items)


# ------------------------------------------------------------ archetypes
# c: content dict. Keys used: kicker, title, sub, body, details (list of
# lines), cta, brand, accent, price, big.
# p: palette dict: bg, ink, accent, panel, on_panel, shade (overlay colour)


def hero_bottom(doc, c, p, pair, focus=(0.5, 0.4), shade=0.86, align="left", title_size=150, upper=False, max_lines=3):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    full_photo(doc, c["photo"], focus)
    overlay(doc, 0, shade, p.get("shade", "#000000"), y0=H * 0.32)
    if c.get("top_shade", True):
        overlay(doc, 0.45, 0, p.get("shade", "#000000"), y0=0, y1=H * 0.22, name="Top shade")
    m = W * 0.075
    cw = W - 2 * m
    if c.get("brand"):
        t.kicker(m, m * 0.9, cw, c["brand"], p.get("on_photo", "#FFFFFF"), size=22, align=align, spacing=380)
    # measure bottom block, then place it from the bottom margin up
    ink = p.get("on_photo", "#FFFFFF")
    blocks = []
    if c.get("kicker"):
        blocks.append(("k", lambda y: t.kicker(m, y, cw, c["kicker"], p["accent"], size=24, align=align), t.s(26)))
    blocks.append(("h", lambda y: t.head(m, y, cw, c["title"], ink, title_size, align=align, upper=upper, max_lines=max_lines), t.s(30)))
    if c.get("sub"):
        blocks.append(("s", lambda y: t.body(m, y, cw * (0.86 if align == "left" else 1), c["sub"], rgba("#FFFFFF", 0.88) if ink == "#FFFFFF" else ink, size=31, align=align), t.s(34)))
    if c.get("details"):
        blocks.append(("d", lambda y: t.body(m, y, cw, "  ·  ".join(c["details"]), ink, size=24, align=align, weight=700, spacing=120, upper=True), t.s(40)))
    # dry run to measure
    import copy
    start = len(doc.objs)
    y = 0
    for _, fn, gap in blocks:
        y += fn(y)["_h"] + gap
    total = y
    del doc.objs[start:]
    btn_h = 0
    if c.get("cta"):
        btn_h = t.s(24) * FS_MULT + 2 * t.s(24) * 0.8
        total += btn_h
    else:
        total -= blocks[-1][2]
    y = H - m - total
    for kind, fn, gap in blocks:
        o = fn(y)
        y += o["_h"] + gap
        if kind == "k" and align == "left":
            pass
    if c.get("cta"):
        cta(doc, t, m if align == "left" else W / 2, y, c["cta"], p.get("cta_fg", "#111111"), p.get("cta_bg", "#FFFFFF"), align=align)


def hero_center(doc, c, p, pair, focus=(0.5, 0.5), tint=0.5, frame=True, title_size=170, upper=False, max_lines=4):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    full_photo(doc, c["photo"], focus)
    b = doc.bleed
    doc.rect(-b, -b, W + 2 * b, H + 2 * b, rgba(p.get("shade", "#000000"), tint), name="Tint")
    m = W * 0.08
    if frame:
        doc.rect(m * 0.5, m * 0.5, W - m, H - m, "rgba(0,0,0,0)", stroke=rgba("#FFFFFF", 0.7), sw=t.s(2), name="Frame")
    cw = W - 2 * m * 1.3
    x = (W - cw) / 2
    ink = p.get("on_photo", "#FFFFFF")
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p.get("kick_on_photo", "#FFFFFF"), size=24, align="center"), t.s(30)))
    if c.get("accent"):
        items.append((lambda y: t.accent(x, y, cw, c["accent"], p.get("kick_on_photo", "#FFFFFF"), 110), t.s(6)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, title_size, align="center", upper=upper, max_lines=max_lines), t.s(34)))
    if c.get("sub"):
        items.append((lambda y: t.body(x + cw * 0.08, y, cw * 0.84, c["sub"], rgba("#FFFFFF", 0.9), size=31, align="center"), t.s(40)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), ink, size=25, align="center", weight=700, spacing=200, upper=True, lh=1.7), t.s(44)))
    start = len(doc.objs)
    total = stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    btn_h = 0
    if c.get("cta"):
        btn_h = t.s(24) * FS_MULT + 2 * t.s(24) * 0.8 + t.s(44)
    y = (H - total - btn_h) / 2
    y = stack_down(items, y)
    if c.get("cta"):
        cta(doc, t, W / 2, y - items[-1][1] + t.s(44), c["cta"], p.get("cta_fg", "#111111"), p.get("cta_bg", "#FFFFFF"), align="center")
    if c.get("brand"):
        t.kicker(x, H - m * 1.15, cw, c["brand"], ink, size=20, align="center", spacing=400)


def split(doc, c, p, pair, ratio=0.56, focus=(0.5, 0.5), title_size=110, side="top", upper=False, panel_photo_inset=False):
    """Photo on one side, solid panel with the copy on the other."""
    W, H = doc.W, doc.H
    t = T(doc, pair)
    b = doc.bleed
    if side == "top":
        ph = H * ratio
        photo(doc, c["photo"], -b, -b, W + 2 * b, ph + b, focus=focus)
        bleed_rect(doc, 0, ph, W, H - ph, p["panel"])
        px, py, pw, phh = 0, ph, W, H - ph
    elif side == "left":
        pw_ = W * ratio
        photo(doc, c["photo"], -b, -b, pw_ + b, H + 2 * b, focus=focus)
        bleed_rect(doc, pw_, 0, W - pw_, H, p["panel"])
        px, py, pw, phh = pw_, 0, W - pw_, H
    else:  # right
        pw_ = W * ratio
        bleed_rect(doc, 0, 0, W - pw_, H, p["panel"])
        photo(doc, c["photo"], W - pw_, -b, pw_ + b, H + 2 * b, focus=focus)
        px, py, pw, phh = 0, 0, W - pw_, H
    m = min(W, H) * 0.07
    x, cw = px + m, pw - 2 * m
    ink = p["on_panel"]
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=23), t.s(24)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, title_size, upper=upper, max_lines=3), t.s(26)))
    if c.get("sub"):
        items.append((lambda y: t.body(x, y, cw, c["sub"], rgba(ink, 0.78), size=29), t.s(30)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), ink, size=24, weight=700, spacing=100, upper=True, lh=1.65), t.s(34)))
    start = len(doc.objs)
    total = stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    btn = t.s(24) * FS_MULT + 2 * t.s(24) * 0.8 + t.s(34) if c.get("cta") else 0
    foot = t.s(60) if c.get("brand") else 0
    y = py + max(m, (phh - total - btn - foot) / 2)
    y = stack_down(items, y)
    if c.get("cta"):
        cta(doc, t, x, y - items[-1][1] + t.s(34), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]))
    if c.get("brand"):
        t.kicker(x, py + phh - m - t.s(22), cw, c["brand"], rgba(ink, 0.7), size=20, spacing=340)
    if c.get("badge"):
        r = t.s(105)
        bx = (W - m - r) if side != "right" else (W - W * ratio - r * 0.3)
        by = (H * ratio) if side == "top" else (m + r)
        bx = min(bx, W - m - r)
        doc.circle(bx, by, r, p["accent"], name="Badge", shadow_=shadow("rgba(0,0,0,0.18)", 24, 0, 8))
        lines = c["badge"].split("\n")
        t.d.text(bx - r, by - r * 0.52, 2 * r, lines[0], t.p["kick"], t.s(22), p.get("badge_ink", "#FFFFFF"), weight=700, align="center", spacing=200, upper=True)
        t.head(bx - r * 0.86, by - r * 0.28, r * 1.72, lines[1] if len(lines) > 1 else "", p.get("badge_ink", "#FFFFFF"), 66, align="center")


def framed(doc, c, p, pair, shape="rounded", focus=(0.5, 0.5), title_size=110, photo_h=0.5, border=True):
    """Paper card: inset photo on top, centred copy beneath."""
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    m = W * 0.085
    if border:
        doc.rect(m * 0.42, m * 0.42, W - m * 0.84, H - m * 0.84, "rgba(0,0,0,0)", stroke=rgba(p["accent"], 0.75), sw=t.s(2), name="Border")
    pw = W - 2 * m
    ph = H * photo_h
    if shape == "arch":
        pw = min(pw, ph * 0.78)
    if shape == "circle":
        pw = ph = min(pw, ph)
    x0 = (W - pw) / 2
    y0 = m * 1.05
    photo(doc, c["photo"], x0, y0, pw, ph, frame=shape, rx=t.s(18) if shape == "rounded" else 0, focus=focus)
    cw = W - 2 * m * 1.2
    x = (W - cw) / 2
    ink = p["ink"]
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=22, align="center"), t.s(20)))
    if c.get("accent"):
        items.append((lambda y: t.accent(x, y, cw, c["accent"], p["accent"], 96), t.s(2)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, title_size, align="center", max_lines=2), t.s(22)))
    if c.get("sub"):
        items.append((lambda y: t.body(x + cw * 0.06, y, cw * 0.88, c["sub"], rgba(ink, 0.75), size=28, align="center"), t.s(26)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), ink, size=22, align="center", weight=700, spacing=220, upper=True, lh=1.7), t.s(20)))
    start = len(doc.objs)
    total = stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    top = y0 + ph
    foot = t.s(56) if c.get("brand") else 0
    avail = H - m - foot - top
    y = top + max(t.s(30), (avail - total) / 2)
    stack_down(items, y)
    if c.get("brand"):
        t.kicker(x, H - m - t.s(20), cw, c["brand"], rgba(ink, 0.6), size=19, align="center", spacing=360)


def arch(doc, c, p, pair, focus=(0.5, 0.45), title_size=120):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    m = W * 0.1
    aw = W - 2 * m
    ah = min(H * 0.55, aw * 1.25)
    photo(doc, c["photo"], m, m * 0.9, aw, ah, frame="arch", focus=focus)
    doc.add({"type": "path", "path": [["M", 0, ah], ["L", 0, aw / 2], ["C", 0, aw * 0.22, aw * 0.22, 0, aw / 2, 0], ["C", aw * 0.78, 0, aw, aw * 0.22, aw, aw / 2], ["L", aw, ah]],
             "left": m - t.s(14), "top": m * 0.9 - t.s(14), "width": aw, "height": ah, "scaleX": (aw + t.s(28)) / aw, "scaleY": (ah + t.s(14)) / ah,
             "fill": "", "stroke": p["accent"], "strokeWidth": t.s(2) / ((aw + t.s(28)) / aw), "strokeUniform": True}, "Arch line")
    framed_text(doc, t, c, p, m * 0.9 + ah)


def framed_text(doc, t, c, p, top):
    W, H = doc.W, doc.H
    m = W * 0.09
    cw = W - 2 * m
    x = m
    ink = p["ink"]
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=22, align="center"), t.s(18)))
    if c.get("accent"):
        items.append((lambda y: t.accent(x, y, cw, c["accent"], p["accent"], 92), t.s(0)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, 112, align="center", max_lines=2), t.s(20)))
    if c.get("sub"):
        items.append((lambda y: t.body(x + cw * 0.06, y, cw * 0.88, c["sub"], rgba(ink, 0.75), size=27, align="center"), t.s(22)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), ink, size=21, align="center", weight=700, spacing=220, upper=True, lh=1.7), t.s(20)))
    start = len(doc.objs)
    total = stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    avail = H - m * 0.8 - top
    stack_down(items, top + max(t.s(26), (avail - total) / 2))


def magazine(doc, c, p, pair, focus=(0.5, 0.35), mast_size=300):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    full_photo(doc, c["photo"], focus)
    overlay(doc, 0.5, 0, "#000000", y0=0, y1=H * 0.3, name="Top shade")
    overlay(doc, 0, 0.8, "#000000", y0=H * 0.5)
    m = W * 0.06
    ink = "#FFFFFF"
    mast = t.head(m, m * 0.7, W - 2 * m, c["brand"], ink, mast_size, align="center", upper=True, lh=0.9, spacing=40)
    t.kicker(m, m * 0.7 + mast["_h"] + t.s(4), W - 2 * m, c.get("issue", "Issue 12 · Spring 2027"), ink, size=20, align="center", spacing=420)
    y = H - m * 1.1
    lines = c.get("lines", [])
    cw = W * 0.55
    # cover lines, bottom left
    blocks = []
    for i, (big, small) in enumerate(lines):
        blocks.append((big, small))
    yy = H * 0.56
    for big, small in blocks:
        rule(doc, m, yy, t.s(60), p["accent"], sw=t.s(5))
        yy += t.s(22)
        o = t.head(m, yy, cw, big, ink, 70, lh=1.0, max_lines=2)
        yy += o["_h"] + t.s(8)
        o = t.body(m, yy, cw, small, rgba("#FFFFFF", 0.85), size=24)
        yy += o["_h"] + t.s(34)
    if c.get("title"):
        t.head(W * 0.5, H - m - t.s(200), W * 0.5 - m, c["title"], p["accent"], 96, align="right", lh=1.0, max_lines=3, family=PAIRS["editorial"]["head"], weight=400)


def sale(doc, c, p, pair, focus=(0.5, 0.5), photo_side="top"):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    b = doc.bleed
    m = W * 0.07
    ph = H * 0.42
    photo(doc, c["photo"], -b, -b, W + 2 * b, ph + b, focus=focus)
    # big number band overlapping the photo edge
    big = c["big"]
    bs = t.head(m, 0, W - 2 * m, big, p["ink"], 290, align="left", lh=0.86, upper=True)
    bh = bs["_h"]
    doc.objs.remove(bs)
    y = ph + t.s(46)
    t.head(m, y, W - 2 * m, big, p["accent"], 290, align="left", lh=0.86, upper=True)
    y += bh + t.s(10)
    o = t.head(m, y, W - 2 * m, c["title"], p["ink"], 80, align="left", upper=True, lh=1.0, max_lines=2)
    y += o["_h"] + t.s(20)
    if c.get("sub"):
        o = t.body(m, y, W * 0.7, c["sub"], rgba(p["ink"], 0.75), size=28)
        y += o["_h"] + t.s(34)
    room = True
    if c.get("cta"):
        _, bh_ = cta(doc, t, m, y, c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["ink"]))
        room = y + bh_ + t.s(30) < H - m - t.s(20)
    if c.get("brand") and room:
        t.kicker(m, H - m - t.s(20), W - 2 * m, c["brand"], rgba(p["ink"], 0.65), size=20, spacing=380)
    if c.get("code") and room:
        t.kicker(m, H - m - t.s(20), W - 2 * m, c["code"], p["ink"], size=20, align="right", spacing=200)


def collage(doc, c, p, pair, title_size=110):
    """Three photos (one tall, two stacked) over a solid panel with the copy."""
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    g = W * 0.022
    m = W * 0.06
    gh = H * 0.56
    lw = (W - 2 * m - g) * 0.58
    rw = W - 2 * m - g - lw
    ph = c["photos"]
    rx = t.s(10)
    photo(doc, ph[0], m, m, lw, gh, frame="rounded", rx=rx)
    photo(doc, ph[1], m + lw + g, m, rw, (gh - g) / 2, frame="rounded", rx=rx)
    photo(doc, ph[2], m + lw + g, m + (gh - g) / 2 + g, rw, (gh - g) / 2, frame="rounded", rx=rx)
    x, cw = m, W - 2 * m
    ink = p["ink"]
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=22), t.s(20)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, title_size, max_lines=2), t.s(22)))
    if c.get("sub"):
        items.append((lambda y: t.body(x, y, cw * 0.85, c["sub"], rgba(ink, 0.75), size=28), t.s(26)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "  ·  ".join(c["details"]), ink, size=22, weight=700, spacing=140, upper=True), t.s(20)))
    start = len(doc.objs)
    total = stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    top = m + gh
    btn = t.s(24) * FS_MULT + 2 * t.s(24) * 0.8 + t.s(30) if c.get("cta") else 0
    y = top + max(t.s(40), (H - m - top - total - btn) / 2)
    y = stack_down(items, y)
    if c.get("cta"):
        cta(doc, t, x, y - items[-1][1] + t.s(30), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]))


def menu(doc, c, p, pair):
    """Menu / price list: photo band on top, two-column price list."""
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    b = doc.bleed
    ph = H * 0.3
    photo(doc, c["photo"], -b, -b, W + 2 * b, ph + b, focus=c.get("focus", (0.5, 0.5)))
    m = W * 0.08
    y = ph + t.s(60)
    o = t.kicker(m, y, W - 2 * m, c["kicker"], p["accent"], size=22, align="center")
    y += o["_h"] + t.s(14)
    o = t.head(m, y, W - 2 * m, c["title"], p["ink"], 120, align="center")
    y += o["_h"] + t.s(40)
    secs = c["sections"]
    colw = (W - 2 * m - t.s(60)) / 2
    for ci, col in enumerate([secs[: (len(secs) + 1) // 2], secs[(len(secs) + 1) // 2:]]):
        x = m + ci * (colw + t.s(60))
        yy = y
        for name, items in col:
            o = t.kicker(x, yy, colw, name, p["accent"], size=21, spacing=300)
            yy += o["_h"] + t.s(10)
            rule(doc, x, yy, colw, rgba(p["ink"], 0.25), sw=t.s(1.5))
            yy += t.s(18)
            for it, price in items:
                o = t.body(x, yy, colw * 0.78, it, p["ink"], size=27, weight=700)
                t.body(x + colw * 0.78, yy, colw * 0.22, price, p["ink"], size=27, align="right")
                yy += o["_h"] + t.s(16)
            yy += t.s(26)
    if c.get("brand"):
        t.kicker(m, H - m * 0.9, W - 2 * m, c["brand"], rgba(p["ink"], 0.6), size=19, align="center", spacing=360)


ARCH = {"hero_bottom": hero_bottom, "hero_center": hero_center, "split": split, "framed": framed, "arch": arch, "magazine": magazine, "sale": sale, "collage": collage, "menu": menu}


def build(doc, spec):
    fn = ARCH[spec["arch"]]
    kw = dict(spec.get("opts", {}))
    fn(doc, spec["c"], spec["p"], spec["pair"], **kw)
    return doc
