"""
Mass collection (Nov 2026): more layouts so every category can have 115+
distinct, clean templates. Graphic (illustration-led) designs need no
photo; business layouts cover cards, letterheads, slides and brochures.

  typo        bold typography on colour with geometric accents
  party       confetti, balloons / bunting and an illustration
  elegant     classic bordered card: script accent, divider, serif type
  wave        two-tone page split by a wave, illustration on top
  badge       big circular badge with an illustration, text below
  bizcard     business card (2 pages: front, back)
  letterhead  A4 letterhead with header, body placeholder and footer
  slide_*     16:9 presentation pages (title, agenda, content, stats, end)
  yt          YouTube thumbnail: photo, huge words, sticker
Everything else comes from studio.py / pro.py.
"""

from __future__ import annotations

import math

from kit import FS_MULT, lin, rgba, text_width, shadow
from pro import PAIRS, T, cta, photo, rule, bleed_rect, full_photo
from common import divider, pill
import pro
import studio
from studio import framed_photo


def _stack(doc, items, y0=None, center=None, bottom=None):
    start = len(doc.objs)
    total = pro.stack_down(items, 0)
    del doc.objs[start:]
    total -= items[-1][1]
    if center is not None:
        y0 = center - total / 2
    elif bottom is not None:
        y0 = bottom - total
    return pro.stack_down(items, y0), total


def _copy_items(doc, t, c, p, x, cw, align, ink, title_size, max_lines=3, upper=False):
    items = []
    if c.get("kicker"):
        items.append((lambda y: t.kicker(x, y, cw, c["kicker"], p["accent"], size=24, align=align), t.s(20)))
    if c.get("accent"):
        items.append((lambda y: t.accent(x, y, cw, c["accent"], p["accent"], 96, align=align), t.s(4)))
    items.append((lambda y: t.head(x, y, cw, c["title"], ink, title_size, align=align, max_lines=max_lines, upper=upper or c.get("upper", False)), t.s(24)))
    if c.get("sub"):
        items.append((lambda y: t.body(x + (cw * 0.06 if align == "center" else 0), y, cw * (0.88 if align == "center" else 0.92), c["sub"], rgba(ink, 0.8), size=29, align=align), t.s(28)))
    if c.get("details"):
        items.append((lambda y: t.body(x, y, cw, "\n".join(c["details"]), ink, size=24, align=align, weight=700, spacing=160, upper=True, lh=1.6), t.s(20)))
    return items


DECOS = ("circles", "blob", "dots", "arcs", "corner", "stripes", "rings", "grid")


def deco(doc, kind, p, t):
    W, H = doc.W, doc.H
    a, k = p["accent"], p.get("panel", p["ink"])
    if kind == "circles":
        doc.circle(W * 0.92, H * 0.06, W * 0.28, rgba(a, 0.9), name="Shape")
        doc.circle(W * 0.06, H * 0.97, W * 0.2, rgba(k, 0.12), name="Shape")
    elif kind == "blob":
        doc.blob(W * 0.9, H * 0.12, W * 0.3, rgba(a, 0.85), seed=3)
        doc.blob(W * 0.1, H * 0.9, W * 0.24, rgba(k, 0.1), seed=7)
    elif kind == "dots":
        doc.dots(W * 0.62, H * 0.04, W * 0.96, H * 0.2, W * 0.035, W * 0.006, rgba(a, 0.8))
        doc.dots(W * 0.04, H * 0.82, W * 0.32, H * 0.96, W * 0.035, W * 0.006, rgba(k, 0.25))
    elif kind == "arcs":
        for i in range(4):
            doc.circle(W, 0, W * (0.18 + i * 0.07), "rgba(0,0,0,0)", stroke=rgba(a, 0.9 - i * 0.18), sw=t.s(6))
    elif kind == "corner":
        doc.polygon([(W, 0), (W, H * 0.3), (W * 0.62, 0)], rgba(a, 0.95))
        doc.polygon([(0, H), (0, H * 0.78), (W * 0.3, H)], rgba(k, 0.14))
    elif kind == "stripes":
        doc.stripes(W * 0.7, -H * 0.05, W * 1.05, H * 0.25, t.s(10), t.s(22), rgba(a, 0.7), angle_deg=-35)
    elif kind == "rings":
        doc.circle(W * 0.98, H * 0.04, W * 0.2, "rgba(0,0,0,0)", stroke=a, sw=t.s(10))
        doc.circle(W * 0.02, H * 0.98, W * 0.14, "rgba(0,0,0,0)", stroke=rgba(k, 0.2), sw=t.s(6))
    elif kind == "grid":
        step = W / 12
        for i in range(1, 12):
            doc.rect(i * step, 0, 1, H, rgba(k, 0.06), name="Grid")
        for j in range(1, int(H / step)):
            doc.rect(0, j * step, W, 1, rgba(k, 0.06), name="Grid")


def typo(doc, c, p, pair, deco_kind="circles", align="left", title_size=170, gradient=False):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    if gradient:
        doc.bg(lin(0, 0, W, H, [(0, p["bg"]), (1, studio_mix(p["bg"], p["accent"], 0.35))]))
    else:
        doc.bg(p["bg"])
    deco(doc, deco_kind, p, t)
    if c.get("art"):
        doc.art(c["art"], W * (0.78 if align == "left" else 0.5), H * (0.24 if align == "left" else 0.22), min(W, H) * 0.3)
    m = W * 0.09
    cw = W - 2 * m
    items = _copy_items(doc, t, c, p, m, cw, align, p["ink"], title_size, max_lines=4)
    y, total = _stack(doc, items, center=H * (0.56 if c.get("art") else 0.5))
    if c.get("cta"):
        cta(doc, t, m if align == "left" else W / 2, y + t.s(10), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align=align)
    if c.get("brand"):
        t.kicker(m, H - m * 0.85, cw, c["brand"], rgba(p["ink"], 0.6), size=20, align=align, spacing=300)


def studio_mix(a, b, k):
    from kit import mix
    return mix(a, b, k)


def party(doc, c, p, pair, style="balloons", title_size=150):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    cols = [p["accent"], p.get("panel", p["ink"]), studio_mix(p["accent"], "#FFFFFF", 0.4), studio_mix(p["accent"], p["ink"], 0.4)]
    m = W * 0.08
    if style == "balloons":
        for i, (x, y, r) in enumerate([(0.12, 0.2, 0.09), (0.25, 0.13, 0.075), (0.84, 0.17, 0.09), (0.73, 0.1, 0.07)]):
            doc.balloon(x * W, y * H, r * W, cols[i % len(cols)])
    elif style == "bunting":
        doc.bunting(-W * 0.02, W * 1.02, H * 0.04, H * 0.06, cols, flags=11)
    doc.confetti(0, H * 0.02, W, H, cols, n=46, size=(t.s(8), t.s(18)), avoid=[(m, H * 0.4, W - m, H * 0.86)])
    if c.get("art"):
        doc.art(c["art"], W / 2, H * 0.3, min(W, H) * 0.26)
    items = _copy_items(doc, t, c, p, m, W - 2 * m, "center", p["ink"], title_size, max_lines=3)
    y, _ = _stack(doc, items, center=H * 0.62)
    if c.get("cta"):
        cta(doc, t, W / 2, y + t.s(10), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align="center")


def elegant(doc, c, p, pair, laurel=False, title_size=120, art_top=True):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    doc.texture("paper", 0.35)
    i = W * 0.05
    doc.frame_border(i, p["accent"], sw=t.s(3), double=t.s(12))
    m = W * 0.13
    cw = W - 2 * m
    top = H * 0.16
    if c.get("art") and art_top:
        doc.art(c["art"], W / 2, H * 0.17, min(W, H) * 0.16)
        top = H * 0.27
    if laurel:
        doc.laurel(W / 2, H * 0.5, W * 0.36, rgba(p["accent"], 0.35), leaves=10, sweep=160)
    items = _copy_items(doc, t, c, p, m, cw, "center", p["ink"], title_size, max_lines=4)
    items.insert(len(items) - (1 if c.get("details") else 0), ((lambda y: (divider(doc, W / 2, y + t.s(6), W * 0.3, p["accent"], sw=t.s(1.6), gap=t.s(12)), {"_h": t.s(12)})[1]), t.s(28)))
    _stack(doc, items, center=(top + H * 0.88) / 2)
    if c.get("brand"):
        t.kicker(m, H - W * 0.11, cw, c["brand"], rgba(p["ink"], 0.65), size=19, align="center", spacing=360)


def wave(doc, c, p, pair, title_size=140):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    y = H * 0.48
    doc.wave(-doc.bleed, W + doc.bleed, y, H * 0.035, W * 0.5, fill=p["panel"], bottom=H + doc.bleed)
    if c.get("art"):
        doc.circle(W / 2, H * 0.25, min(W, H) * 0.2, rgba(p["accent"], 0.18))
        doc.art(c["art"], W / 2, H * 0.25, min(W, H) * 0.3)
    m = W * 0.09
    on = p["on_panel"]
    items = _copy_items(doc, t, dict(c, kicker=c.get("kicker")), dict(p, accent=p["accent"]), m, W - 2 * m, "center", on, title_size, max_lines=3)
    y2, _ = _stack(doc, items, center=H * 0.72)
    if c.get("cta"):
        cta(doc, t, W / 2, y2 + t.s(8), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align="center")


def badge(doc, c, p, pair, title_size=130):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    doc.bg(p["bg"])
    r = min(W, H * 0.62) * 0.3
    cy = H * 0.3
    doc.star(W / 2, cy, r * 1.12, rgba(p["accent"], 0.25), points=28, inner=0.9)
    doc.circle(W / 2, cy, r, p["panel"])
    doc.circle(W / 2, cy, r * 0.88, "rgba(0,0,0,0)", stroke=p["accent"], sw=t.s(3), dash=[t.s(4), t.s(8)])
    if c.get("art"):
        doc.art(c["art"], W / 2, cy, r * 1.25)
    for (x, y) in ((0.15, 0.12), (0.86, 0.2), (0.2, 0.48), (0.82, 0.45)):
        doc.sparkle(x * W, y * H, W * 0.022, p["accent"])
    m = W * 0.09
    items = _copy_items(doc, t, c, p, m, W - 2 * m, "center", p["ink"], title_size, max_lines=3)
    y, _ = _stack(doc, items, y0=cy + r * 1.25 + H * 0.04)
    if c.get("cta"):
        cta(doc, t, W / 2, y + t.s(6), c["cta"], p.get("cta_fg", "#FFFFFF"), p.get("cta_bg", p["accent"]), align="center")


# ---------------------------------------------------------------- business
def _mark(doc, cx, cy, r, letters, p, fam, style="circle"):
    if style == "circle":
        doc.circle(cx, cy, r, p["accent"], name="Logo")
    elif style == "square":
        doc.rect(cx - r, cy - r, 2 * r, 2 * r, p["accent"], rx=r * 0.28, name="Logo")
    else:
        doc.polygon([(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)], p["accent"], name="Logo")
    doc.text(cx - r, cy - r * 0.52, 2 * r, letters, fam, r * 0.92, p.get("cta_fg", "#FFFFFF"), weight=700, align="center", name="Logo letters")


def bizcard_front(doc, c, p, pair, style="split"):
    W, H = doc.W, doc.H
    fam_h, wh = PAIRS[pair]["head"], PAIRS[pair]["hw"]
    fam_b = PAIRS[pair]["body"]
    if style == "split":
        doc.bg("#FFFFFF")
        bleed_rect(doc, 0, 0, W * 0.38, H, p["panel"], name="Panel")
        _mark(doc, W * 0.19, H * 0.5, H * 0.17, c["initials"], p, fam_h, c.get("mark", "circle"))
        x, cw = W * 0.45, W * 0.5
        ink = p["panel"] if p["panel"] != "#FFFFFF" else p["ink"]
    elif style == "dark":
        doc.bg(p["panel"])
        _mark(doc, W * 0.13, H * 0.24, H * 0.11, c["initials"], p, fam_h, c.get("mark", "circle"))
        x, cw = W * 0.08, W * 0.84
        ink = p["on_panel"]
    else:  # minimal
        doc.bg(p["bg"])
        doc.rect(0, H - H * 0.06, W, H * 0.06 + doc.bleed, p["accent"], name="Bar")
        x, cw = W * 0.08, W * 0.84
        ink = p["ink"]
    y = H * (0.2 if style == "split" else 0.44 if style == "dark" else 0.18)
    o = doc.text(x, y, cw, c["name"], fam_h, doc.fit(c["name"], cw, fam_h, H * 0.12, wh), ink, weight=wh, name="Name")
    y += o["_h"] + H * 0.02
    o = doc.text(x, y, cw, c["role"], PAIRS[pair]["kick"], H * 0.045, p["accent"], weight=700, spacing=200, upper=True, name="Role")
    y += o["_h"] + H * 0.07
    for line in c["lines"]:
        o = doc.text(x, y, cw, line, fam_b, H * 0.052, rgba(ink, 0.85), name="Contact")
        y += o["_h"] + H * 0.018


def bizcard_back(doc, c, p, pair, style="split"):
    W, H = doc.W, doc.H
    fam_h, wh = PAIRS[pair]["head"], PAIRS[pair]["hw"]
    doc.bg(p["panel"] if style != "minimal" else p["accent"])
    on = p["on_panel"] if style != "minimal" else p.get("cta_fg", "#FFFFFF")
    _mark(doc, W / 2, H * 0.38, H * 0.13, c["initials"], dict(p, accent=p["accent"] if style != "minimal" else p["panel"]), fam_h, c.get("mark", "circle"))
    doc.text(W * 0.1, H * 0.58, W * 0.8, c["company"], fam_h, doc.fit(c["company"], W * 0.8, fam_h, H * 0.09, wh), on, weight=wh, align="center", name="Company")
    doc.text(W * 0.1, H * 0.74, W * 0.8, c.get("tagline", ""), PAIRS[pair]["kick"], H * 0.04, rgba(on, 0.75), weight=600, align="center", spacing=260, upper=True, name="Tagline")


def letterhead(doc, c, p, pair, style="band"):
    W, H = doc.W, doc.H
    u = W / 794
    fam_h, wh = PAIRS[pair]["head"], PAIRS[pair]["hw"]
    fam_b, fam_k = PAIRS[pair]["body"], PAIRS[pair]["kick"]
    doc.bg("#FFFFFF")
    if style == "band":
        bleed_rect(doc, 0, 0, W, 120 * u, p["panel"], name="Header")
        _mark(doc, 70 * u, 60 * u, 26 * u, c["initials"], p, fam_h, c.get("mark", "circle"))
        doc.text(110 * u, 38 * u, 380 * u, c["company"], fam_h, 24 * u, p["on_panel"], weight=wh, name="Company")
        doc.text(110 * u, 70 * u, 380 * u, c["tagline"], fam_k, 9.5 * u, p["accent"], weight=700, spacing=280, upper=True, name="Tagline")
        doc.text(470 * u, 36 * u, 290 * u, "\n".join(c["lines"]), fam_b, 9.5 * u, rgba(p["on_panel"], 0.85), align="right", lh=1.55, name="Contact")
        top = 170 * u
    else:
        _mark(doc, 70 * u, 70 * u, 24 * u, c["initials"], p, fam_h, c.get("mark", "circle"))
        doc.text(108 * u, 50 * u, 400 * u, c["company"], fam_h, 22 * u, p["ink"], weight=wh, name="Company")
        doc.text(108 * u, 80 * u, 400 * u, c["tagline"], fam_k, 9 * u, p["accent"], weight=700, spacing=280, upper=True, name="Tagline")
        doc.rect(40 * u, 118 * u, W - 80 * u, 2 * u, p["accent"], name="Rule")
        top = 160 * u
    doc.text(60 * u, top, 300 * u, "Date: 31 October 2026", fam_b, 10.5 * u, rgba(p["ink"], 0.7), name="Date")
    doc.text(60 * u, top + 40 * u, 674 * u, "Dear Sir / Madam,", fam_b, 11 * u, p["ink"], name="Greeting")
    body = ("Write your letter here. This letterhead keeps your name, address and contact details on every page, so all you need to add is the message. "
            "Replace this text with your own words, change the colours to your brand and download a print-ready PDF.")
    doc.text(60 * u, top + 74 * u, 674 * u, body, fam_b, 11 * u, rgba(p["ink"], 0.8), lh=1.7, name="Letter")
    doc.text(60 * u, top + 210 * u, 300 * u, "Yours sincerely,\n\n\n" + c.get("signer", "Your name") + "\n" + c.get("signer_role", "Your role"), fam_b, 11 * u, p["ink"], lh=1.5, name="Sign off")
    fy = H - 70 * u
    bleed_rect(doc, 0, fy + 40 * u, W, 30 * u, p["accent"] if style == "band" else p["panel"], name="Footer bar")
    doc.text(60 * u, fy, 674 * u, "   ·   ".join(c["lines"]), fam_b, 9 * u, rgba(p["ink"], 0.65), align="center", name="Footer")


# ------------------------------------------------------------------ slides
def _slide_t(doc, pair):
    t = T(doc, pair)
    t.u = doc.H / 1080 * 1.0
    return t


def slide_title(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = _slide_t(doc, pair)
    doc.bg(p["bg"])
    framed_photo(doc, c["photo"], W * 0.52, -doc.bleed, W * 0.48 + doc.bleed, H + 2 * doc.bleed, kind="slant", focus=c.get("focus", (0.5, 0.5)))
    m = W * 0.06
    items = _copy_items(doc, t, c, p, m, W * 0.42, "left", p["ink"], 130, max_lines=3)
    _stack(doc, items, center=H / 2)
    if c.get("brand"):
        t.kicker(m, H - m, W * 0.4, c["brand"], rgba(p["ink"], 0.6), size=22)


def slide_agenda(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = _slide_t(doc, pair)
    doc.bg(p["bg"])
    bleed_rect(doc, 0, 0, W * 0.34, H, p["panel"], name="Panel")
    m = W * 0.05
    t.kicker(m, H * 0.18, W * 0.26, c.get("kicker", "Today"), p["accent"], size=24)
    t.head(m, H * 0.24, W * 0.26, c.get("agenda_title", "Agenda"), p["on_panel"], 120, max_lines=2)
    x = W * 0.4
    y = H * 0.18
    for i, it in enumerate(c["agenda"]):
        doc.text(x, y, t.s(110), f"{i + 1:02d}", t.p["head"], t.s(56), p["accent"], weight=t.p["hw"], name="Number")
        doc.text(x + t.s(130), y + t.s(10), W * 0.48, it, t.p["head"], t.s(42), p["ink"], weight=t.p["hw"], name="Agenda item")
        y += H * 0.14
        doc.rect(x, y - H * 0.035, W * 0.54, 1.5, rgba(p["ink"], 0.15), name="Rule")


def slide_content(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = _slide_t(doc, pair)
    doc.bg(p["bg"])
    m = W * 0.06
    framed_photo(doc, c["photo2"], m, H * 0.14, W * 0.4, H * 0.72, kind="rounded", r=W * 0.015, focus=c.get("focus2", (0.5, 0.5)))
    x = W * 0.53
    cw = W * 0.41
    o = t.kicker(x, H * 0.16, cw, c.get("kicker2", "Why us"), p["accent"], size=24)
    o = t.head(x, H * 0.22, cw, c["content_title"], p["ink"], 84, max_lines=2)
    y = H * 0.22 + o["_h"] + t.s(40)
    for b in c["bullets"]:
        doc.circle(x + t.s(10), y + t.s(18), t.s(8), p["accent"], name="Bullet")
        o = doc.text(x + t.s(36), y, cw - t.s(36), b, t.p["body"], t.s(30), rgba(p["ink"], 0.85), lh=1.35, name="Point")
        y += o["_h"] + t.s(26)


def slide_stats(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = _slide_t(doc, pair)
    doc.bg(p["panel"])
    m = W * 0.07
    t.kicker(m, H * 0.14, W - 2 * m, c.get("kicker3", "By the numbers"), p["accent"], size=24, align="center")
    t.head(m, H * 0.2, W - 2 * m, c["stats_title"], p["on_panel"], 90, align="center", max_lines=2)
    n = len(c["stats"])
    cw = (W - 2 * m) / n
    for i, (num, label) in enumerate(c["stats"]):
        x = m + i * cw
        doc.text(x, H * 0.47, cw, num, t.p["head"], t.s(150), p["accent"], weight=t.p["hw"], align="center", name="Number")
        doc.text(x + cw * 0.1, H * 0.7, cw * 0.8, label, t.p["body"], t.s(28), rgba(p["on_panel"], 0.8), align="center", lh=1.35, name="Label")


def slide_end(doc, c, p, pair):
    W, H = doc.W, doc.H
    t = _slide_t(doc, pair)
    full_photo(doc, c["photo"], c.get("focus", (0.5, 0.5)))
    doc.rect(-doc.bleed, -doc.bleed, W + 2 * doc.bleed, H + 2 * doc.bleed, rgba(p["panel"], 0.78), name="Tint")
    m = W * 0.1
    o = t.head(m, H * 0.36, W - 2 * m, c.get("end", "Thank you"), p["on_panel"], 160, align="center", max_lines=1)
    t.body(m, H * 0.36 + o["_h"] + t.s(30), W - 2 * m, c.get("contact", ""), rgba(p["on_panel"], 0.85), size=30, align="center")


# --------------------------------------------------------------- youtube
def yt(doc, c, p, pair, side="right"):
    W, H = doc.W, doc.H
    t = T(doc, pair)
    t.u = H / 720
    doc.bg(p["bg"])
    pw = W * 0.5
    px = W - pw if side == "right" else 0
    framed_photo(doc, c["photo"], px - (doc.bleed if side == "left" else 0), -doc.bleed, pw + doc.bleed, H + 2 * doc.bleed, focus=c.get("focus", (0.5, 0.45)))
    if side == "right":
        doc.rect(px - t.s(14), -doc.bleed, t.s(14), H + 2 * doc.bleed, p["accent"], name="Edge")
    x = W * 0.05 if side == "right" else pw + W * 0.05
    cw = W * 0.42
    words = c["title"].upper()
    hl = c.get("hl", "").upper()
    fam, wt = t.p["head"], t.p["hw"]
    sz = doc.fit(max((words + " " + hl).split(), key=len), cw, fam, t.s(150), wt)
    while sz > 20:
        h1 = doc.measure(words, cw, fam, sz, wt, lh=0.98)
        h2 = doc.measure(hl, cw, fam, sz * 0.9, wt, lh=0.98) if hl else 0
        if h1 + h2 + t.s(10) <= H * 0.62:
            break
        sz *= 0.94
    o = doc.text(x, H * 0.1, cw, words, fam, sz, p["ink"], weight=wt, lh=0.98, name="Headline")
    if hl:
        doc.text(x, H * 0.1 + o["_h"] + t.s(10), cw, hl, fam, sz * 0.9, p["accent"], weight=wt, lh=0.98, name="Highlight")
    if c.get("sticker"):
        pill(doc, x + t.s(120), H * 0.86, c["sticker"], t.p["kick"], t.s(30), p.get("cta_fg", "#FFFFFF"), p["accent"], weight=800)


ARCH = {"typo": typo, "party": party, "elegant": elegant, "wave": wave, "badge": badge, "letterhead": letterhead,
        "bizcard_front": bizcard_front, "bizcard_back": bizcard_back,
        "slide_title": slide_title, "slide_agenda": slide_agenda, "slide_content": slide_content, "slide_stats": slide_stats, "slide_end": slide_end,
        "yt": yt}
for k, v in ARCH.items():
    studio.ARCH[k] = v
