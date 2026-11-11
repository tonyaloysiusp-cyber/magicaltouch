"""
Photo albums v2 (Nov 2026): page counts in multiples of 8 and NO repeated
page design inside an album.

  MT_FONT_DIR=... python3 albums8.py [--out file.json]

Every page is one of ~45 hand-built layouts (covers, full-bleed, collages,
film strip, polaroids, timeline, ticket, numbers, letter, chapter openers,
contents, guest wall…). Each album picks its own sequence, so a 40-page
wedding album has 40 different pages. Photos rotate through a wide pool.
Original layouts: inspired by editorial and photo-book design in general,
not copied from any company's product.
"""

import argparse
import json
import math
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

from kit import Doc, lin, rgba, shadow  # noqa: E402
from pro import photo as _photo  # noqa: E402
from build_mass import board, GAP  # noqa: E402

# ------------------------------------------------------------------ styles
STYLES = {
    "ivory": dict(bg="#F7F2EA", paper="#FFFFFF", ink="#2A2522", soft="#8C8279", accent="#B08D57", tint="#EADFCF", dark="#1F1B18",
                  head="Cormorant Garamond", hw=600, script="Parisienne", body="Montserrat", kick="Montserrat"),
    "ocean": dict(bg="#F3EEE4", paper="#FFFFFF", ink="#12324A", soft="#5F7686", accent="#E2683C", tint="#D3E6EA", dark="#0E2638",
                  head="DM Serif Display", hw=400, script="Caveat", body="DM Sans", kick="Space Grotesk"),
    "pastel": dict(bg="#FBF6F1", paper="#FFFFFF", ink="#4A3F44", soft="#978A90", accent="#E59AA4", tint="#D6EAE4", dark="#4A3F44",
                   head="Fredoka", hw=600, script="Dancing Script", body="Nunito", kick="Nunito"),
    "sage": dict(bg="#EEF0E8", paper="#FFFFFF", ink="#263127", soft="#6C776A", accent="#7E9A6E", tint="#DCE4D3", dark="#1E2A20",
                 head="Playfair Display", hw=600, script="Allura", body="Lato", kick="Lato"),
    "pop": dict(bg="#FFF4E6", paper="#FFFFFF", ink="#1E1B3A", soft="#67647F", accent="#FF5A5F", tint="#FFD166", dark="#1E1B3A",
                head="Archivo Black", hw=400, script="Pacifico", body="Poppins", kick="Poppins", accent3="#3DC1D3"),
}


class Page:
    """One album page: style, scale and helpers."""

    def __init__(self, d, S, A):
        self.d, self.S, self.A = d, S, A
        self.W, self.H = d.W, d.H
        self.k = min(d.W, d.H) / 1200
        self.m = round(min(d.W, d.H) * 0.075)

    # -- photos and text
    def ph(self, x, y, w, h, frame="rect", r=0, name=None, shadow_=None, stroke=None, sw=0):
        return _photo(self.d, name or self.A.take(), x, y, w, h, frame=frame, rx=r, label="Photo", shadow_=shadow_, stroke=stroke, sw=sw)

    def t(self, x, y, w, text, size, font=None, color=None, weight=400, align="left", upper=False, spacing=0, lh=1.2, italic=False, fit=True, angle=0, opacity=1):
        S = self.S
        fam = {"head": S["head"], "script": S["script"], "body": S["body"], "kick": S["kick"]}.get(font or "body", font)
        if font == "head" and weight == 400:
            weight = S["hw"]
        if font == "kick" and weight == 400:
            weight = 700
            spacing = spacing or 260
            upper = True
        if font == "kick":
            size = max(size, 17)
        elif font in (None, "body"):
            size = max(size, 24)
        size = size * self.k
        if fit:
            longest = max(text.split("\n"), key=len) if "\n" in text else text
            if " " not in longest.strip() or len(longest) < 16:
                size = min(size, self.d.fit(longest, w, fam, size, weight, italic, spacing, upper))
        return self.d.text(x, y, w, text, fam, size, color=color or S["ink"], weight=weight, align=align, upper=upper, spacing=spacing, lh=lh, italic=italic, angle=angle, opacity=opacity)

    def h(self, text, w, size, font="body", weight=400, upper=False, spacing=0, lh=1.2, italic=False):
        fam = {"head": self.S["head"], "script": self.S["script"], "body": self.S["body"], "kick": self.S["kick"]}.get(font, font)
        if font == "kick":
            weight, upper, spacing = 700, True, spacing or 260
        return self.d.measure(text, w, fam, size * self.k, weight, italic, lh, spacing, upper)

    def bg(self, c=None):
        self.d.bg(c or self.S["bg"])

    def rule(self, x1, y, x2, color=None, sw=1.2, opacity=1):
        self.d.line(x1, y, x2, y, stroke=color or self.S["accent"], sw=sw * self.k, opacity=opacity)

    def caption(self, x, y, w, text, align="left", color=None):
        return self.t(x, y, w, text, 15, "kick", color=color or self.S["soft"], align=align)


# ------------------------------------------------------------------ content
class Album:
    def __init__(self, spec):
        self.spec = spec
        self.pool = spec["photos"]
        self.i = spec.get("start", 0)
        self.rng = random.Random(spec["slug"])
        self.cap_i = 0
        self.ch_i = 0

    def take(self, n=None):
        if n is None:
            name = self.pool[self.i % len(self.pool)]
            self.i += 1
            return name
        return [self.take() for _ in range(n)]

    def cap(self):
        c = self.spec["captions"][self.cap_i % len(self.spec["captions"])]
        self.cap_i += 1
        return c

    def chapter(self):
        c = self.spec["chapters"][self.ch_i % len(self.spec["chapters"])]
        self.ch_i += 1
        return self.ch_i, c


# ================================================================== layouts
L = {}


def layout(name):
    def deco(fn):
        L[name] = fn
        return fn
    return deco


# ---------------------------------------------------------------- covers
@layout("cover_monogram")
def cover_monogram(p):
    S, A, W, H, m = p.S, p.A, p.W, p.H, p.m
    p.bg(S["dark"])
    p.ph(-p.d.bleed, -p.d.bleed, W + 2 * p.d.bleed, H + 2 * p.d.bleed)
    p.d.rect(-p.d.bleed, -p.d.bleed, W + 2 * p.d.bleed, H + 2 * p.d.bleed, fill=lin(0, 0, 0, H + 2 * p.d.bleed, [(0, rgba("#000000", 0.05)), (0.45, rgba("#000000", 0.1)), (1, rgba("#000000", 0.72))]), name="Shade")
    p.d.frame_border(m * 0.5, "#FFFFFF", sw=1.4 * p.k, opacity=0.7)
    p.t(m, H * 0.56, W - 2 * m, A.spec["monogram"], 150, "head", color="#FFFFFF", align="center")
    p.t(m, H * 0.73, W - 2 * m, A.spec["title"], 34, "kick", color="#FFFFFF", align="center")
    p.t(m, H * 0.8, W - 2 * m, A.spec["date"], 30, "script", color="#FFFFFF", align="center")


@layout("cover_window")
def cover_window(p):
    S, A, W, H, m = p.S, p.A, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.07, W - 2 * m, A.spec["kicker"], 15, "kick", color=S["soft"], align="center")
    fw = W * 0.5
    p.ph((W - fw) / 2, H * 0.14, fw, H * 0.55, frame="arch")
    e = 16 * p.k
    _arch_line(p, (W - fw) / 2 - e, H * 0.14 - e, fw + 2 * e, H * 0.55 + 2 * e, S["accent"], 1.4 * p.k)
    p.t(m, H * 0.74, W - 2 * m, A.spec["title"], 86, "script", color=S["ink"], align="center")
    p.t(m, H * 0.89, W - 2 * m, A.spec["date"], 16, "kick", color=S["accent"], align="center")


@layout("cover_split")
def cover_split(p):
    S, A, W, H, m = p.S, p.A, p.W, p.H, p.m
    p.bg(S["paper"])
    pw = W * 0.56
    p.ph(-p.d.bleed, -p.d.bleed, pw + p.d.bleed, H + 2 * p.d.bleed)
    x = pw + m * 0.8
    w = W - x - m * 0.7
    p.t(x, H * 0.12, w, A.spec["kicker"], 14, "kick", color=S["accent"])
    words = A.spec["title"].split()
    y = H * 0.24
    for wd in words:
        o = p.t(x, y, w, wd, 120, "head", color=S["ink"], lh=1.0)
        y += o["_h"] * 0.92
    p.rule(x, y + 30 * p.k, x + w * 0.4, sw=2)
    p.t(x, y + 60 * p.k, w, A.spec["sub"], 22, "body", color=S["soft"], lh=1.4)
    p.t(x, H - m - 30 * p.k, w, A.spec["date"], 15, "kick", color=S["ink"])


@layout("cover_collage")
def cover_collage(p):
    S, A, W, H, m = p.S, p.A, p.W, p.H, p.m
    p.bg(S["tint"])
    p.d.dots(0, 0, W, H, 40 * p.k, 2.4 * p.k, S["paper"], opacity=0.8)
    cards = [(W * 0.3, H * 0.36, -8), (W * 0.7, H * 0.34, 6), (W * 0.5, H * 0.52, -2)]
    cw = W * 0.34
    for cx, cy, ang in cards:
        _polaroid(p, cx, cy, cw, ang, "")
    p.t(m, H * 0.76, W - 2 * m, A.spec["title"], 84, "head", color=S["ink"], align="center", lh=1.0)
    p.t(m, H * 0.88, W - 2 * m, A.spec["sub"], 34, "script", color=S["accent"], align="center")


@layout("cover_year")
def cover_year(p):
    S, A, W, H, m = p.S, p.A, p.W, p.H, p.m
    p.bg(S["paper"])
    p.t(-W * 0.05, H * 0.08, W * 1.1, A.spec["year"], 430, "head", color=S["tint"], align="center", lh=0.9, fit=False)
    r = min(W, H) * 0.22
    p.ph(W / 2 - r, H * 0.24, 2 * r, 2 * r, frame="circle")
    p.d.circle(W / 2, H * 0.24 + r, r + 16 * p.k, fill=None, stroke=S["accent"], sw=2 * p.k)
    p.t(m, H * 0.74, W - 2 * m, A.spec["title"], 76, "head", color=S["ink"], align="center", lh=1.0)
    p.t(m, H * 0.87, W - 2 * m, A.spec["sub"], 16, "kick", color=S["soft"], align="center")


# ---------------------------------------------------------------- helpers
def _polaroid(p, cx, cy, w, angle, caption, tape=True):
    """An instant-photo card rotated by `angle` around its centre."""
    S = p.S
    h = w * 1.2
    a = math.radians(angle)
    inset = w * 0.06
    pw = w - 2 * inset

    def at(oy):  # point on the card's vertical axis, oy from the card centre
        return cx - math.sin(a) * oy, cy + math.cos(a) * oy

    card = p.d.rect(cx, cy, w, h, fill=S["paper"], angle=angle, shadow_=shadow("rgba(0,0,0,0.18)", 18 * p.k, 0, 8 * p.k), origin_center=True, name="Photo card")
    pcx, pcy = at(-h / 2 + inset + pw / 2)
    o = p.ph(pcx - pw / 2, pcy - pw / 2, pw, pw)
    o.update(originX="center", originY="center", left=pcx, top=pcy, angle=angle)
    if caption:
        ccx, ccy = at((-h / 2 + inset + pw + h / 2) / 2)
        t = p.t(ccx - pw / 2, ccy, pw, caption, 30, "script", color=S["ink"], align="center")
        t.update(originX="center", originY="center", left=ccx, top=ccy, angle=angle)
    if tape:
        tx, ty = at(-h / 2)
        p.d.rect(tx, ty, w * 0.32, w * 0.09, fill=rgba(S["accent"], 0.5), angle=angle - 4, origin_center=True, name="Tape")
    return card


def _arch_line(p, x, y, w, h, color, sw):
    """Outline of an arch (round top) — matches the arch photo frame."""
    p.d.path([["M", x, y + h], ["L", x, y + w / 2], ["C", x, y + w * 0.22, x + w * 0.22, y, x + w / 2, y],
              ["C", x + w * 0.78, y, x + w, y + w * 0.22, x + w, y + w / 2], ["L", x + w, y + h]], fill=None, stroke=color, sw=sw, name="Arch line")


def _num(i):
    return f"{i:02d}"


# ---------------------------------------------------------------- interiors
@layout("full_bleed")
def full_bleed(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.ph(-b, -b, W + 2 * b, H + 2 * b)
    p.d.rect(m * 0.6, H - m * 0.6 - 56 * p.k, 300 * p.k, 56 * p.k, fill=rgba("#FFFFFF", 0.92), name="Caption card")
    p.t(m * 0.6 + 20 * p.k, H - m * 0.6 - 40 * p.k, 260 * p.k, p.A.cap(), 13, "kick", color=S["ink"])


@layout("matted")
def matted(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    p.ph(m, m, W - 2 * m, H - 2.6 * m)
    p.t(m, H - 1.25 * m, W - 2 * m, p.A.cap(), 34, "script", color=S["ink"], align="center")


@layout("duo_vertical")
def duo_vertical(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    g = m * 0.35
    w = (W - 2 * m - g) / 2
    p.ph(m, m, w, H - 2.4 * m)
    p.ph(m + w + g, m, w, H - 2.4 * m)
    p.caption(m, H - 1.05 * m, w, p.A.cap())
    p.caption(m + w + g, H - 1.05 * m, w, p.A.cap(), align="right")


@layout("hero_side")
def hero_side(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    g = m * 0.3
    bw = (W - 2 * m - g) * 0.64
    sw = W - 2 * m - g - bw
    p.ph(m, m, bw, H - 2 * m)
    sh = (H - 2 * m - g) / 2
    p.ph(m + bw + g, m, sw, sh)
    p.ph(m + bw + g, m + sh + g, sw, sh)


@layout("hero_row3")
def hero_row3(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    g = m * 0.3
    th = (H - 2 * m - g) * 0.6
    p.ph(m, m, W - 2 * m, th)
    w = (W - 2 * m - 2 * g) / 3
    for i in range(3):
        p.ph(m + i * (w + g), m + th + g, w, H - 2 * m - th - g)


@layout("chapter_number")
def chapter_number(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    p.bg()
    p.ph(W * 0.36, 0 - p.d.bleed, W * 0.64 + p.d.bleed, H + 2 * p.d.bleed)
    p.t(m * 0.7, H * 0.12, W * 0.5, _num(n), 300, "head", color=S["accent"], lh=0.9, fit=False)
    p.t(m * 0.7, H * 0.52, W * 0.27, name, 64, "head", color=S["ink"], lh=1.05)
    p.rule(m * 0.7, H * 0.82, m * 0.7 + 80 * p.k, sw=2)
    p.t(m * 0.7, H * 0.85, W * 0.27, "Chapter " + _num(n), 13, "kick", color=S["soft"])


@layout("quote_circle")
def quote_circle(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    r = min(W, H) * 0.13
    p.ph(W / 2 - r, H * 0.12, 2 * r, 2 * r, frame="circle")
    q, who = p.A.spec["quotes"][(p.A.cap_i) % len(p.A.spec["quotes"])]
    p.A.cap_i += 1
    p.t(W / 2 - 30 * p.k, H * 0.42, 60 * p.k, "“", 140, "head", color=S["accent"], align="center", fit=False)
    p.t(m * 1.4, H * 0.52, W - 2.8 * m, q, 62, "head", color=S["ink"], align="center", lh=1.25, italic=True)
    p.t(m, H * 0.84, W - 2 * m, who, 14, "kick", color=S["soft"], align="center")


@layout("arch_trio")
def arch_trio(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    g = m * 0.45
    w = (W - 2 * m - 2 * g) / 3
    ph_h = H * 0.56
    top = H * 0.18
    p.t(m, H * 0.06, W - 2 * m, p.A.spec["trio_title"], 54, "script", color=S["ink"], align="center")
    for i in range(3):
        x = m + i * (w + g)
        p.ph(x, top, w, ph_h, frame="arch")
        p.t(x, top + ph_h + 26 * p.k, w, p.A.cap(), 14, "kick", color=S["soft"], align="center")


@layout("diagonal")
def diagonal(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.ph(-b, -b, W + 2 * b, H + 2 * b)
    p.d.polygon([(-b, H * 0.62), (W + b, H * 0.42), (W + b, H + b), (-b, H + b)], fill=S["paper"], name="Panel")
    p.d.line(-b, H * 0.62, W + b, H * 0.42, stroke=S["accent"], sw=3 * p.k)
    p.t(m, H * 0.66, W * 0.62, p.A.spec["diag_title"], 78, "head", color=S["ink"], lh=1.0)
    p.t(m, H * 0.86, W * 0.6, p.A.spec["sub"], 20, "body", color=S["soft"])


@layout("bento5")
def bento5(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    g = m * 0.22
    X0, Y0, IW, IH = m, m, W - 2 * m, H - 2 * m
    c1 = IW * 0.42
    c2 = IW - c1 - g
    p.ph(X0, Y0, c1, IH * 0.62)
    p.ph(X0, Y0 + IH * 0.62 + g, c1, IH * 0.38 - g)
    r1 = IH * 0.36
    p.ph(X0 + c1 + g, Y0, c2, r1)
    hw = (c2 - g) / 2
    p.ph(X0 + c1 + g, Y0 + r1 + g, hw, IH - r1 - g)
    p.ph(X0 + c1 + 2 * g + hw, Y0 + r1 + g, hw, (IH - r1 - 2 * g) * 0.55)
    ty = Y0 + r1 + 2 * g + (IH - r1 - 2 * g) * 0.55
    p.d.rect(X0 + c1 + 2 * g + hw, ty, hw, Y0 + IH - ty, fill=S["accent"], name="Colour tile")
    p.t(X0 + c1 + 2 * g + hw + 20 * p.k, ty + 24 * p.k, hw - 40 * p.k, p.A.cap(), 32, "script", color="#FFFFFF")


@layout("film_strip")
def film_strip(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.1, W - 2 * m, p.A.spec["film_title"], 70, "head", color=S["ink"], align="center")
    sy, sh = H * 0.3, H * 0.42
    b = p.d.bleed
    p.d.rect(-b, sy, W + 2 * b, sh, fill="#141414", name="Film")
    hole = 16 * p.k
    n = int((W + 2 * b) / (hole * 2.4))
    for i in range(n):
        x = -b + i * hole * 2.4 + hole * 0.7
        p.d.rect(x, sy + hole * 0.6, hole, hole * 0.8, fill="#F3F0EA", rx=3 * p.k)
        p.d.rect(x, sy + sh - hole * 1.4, hole, hole * 0.8, fill="#F3F0EA", rx=3 * p.k)
    fh = sh - hole * 4.2
    fw = (W - 2 * m * 0.6 - 3 * 18 * p.k) / 4
    for i in range(4):
        p.ph(m * 0.6 + i * (fw + 18 * p.k), sy + hole * 2.1, fw, fh)
    p.t(m, H * 0.78, W - 2 * m, p.A.spec["sub"], 16, "kick", color=S["soft"], align="center")


@layout("polaroid_scatter")
def polaroid_scatter(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["tint"])
    cw = W * 0.36
    spots = [(W * 0.29, H * 0.29, -6), (W * 0.71, H * 0.27, 5), (W * 0.31, H * 0.71, 4), (W * 0.7, H * 0.72, -5)]
    for cx, cy, a in spots:
        _polaroid(p, cx, cy, cw, a, p.A.cap())


@layout("story_spread")
def story_spread(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    b = p.d.bleed
    p.ph(W * 0.5, -b, W * 0.5 + b, H + 2 * b)
    x, w = m, W * 0.5 - 1.6 * m
    p.t(x, H * 0.1, w, p.A.spec["kicker"], 13, "kick", color=S["accent"])
    hd = p.t(x, H * 0.16, w, p.A.spec["story_title"], 62, "head", color=S["ink"], lh=1.05)
    y = H * 0.16 + hd["_h"] + 30 * p.k
    p.rule(x, y, x + 60 * p.k, sw=2)
    p.t(x, y + 30 * p.k, w, p.A.spec["story"], 19, "body", color=S["soft"], lh=1.6, fit=False)
    p.t(x, H - m - 40 * p.k, w, p.A.cap(), 30, "script", color=S["accent"])


@layout("timeline")
def timeline(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.07, W - 2 * m, p.A.spec["timeline_title"], 58, "head", color=S["ink"], align="center")
    x0 = W * 0.5
    p.d.line(x0, H * 0.2, x0, H * 0.93, stroke=S["accent"], sw=2 * p.k)
    items = p.A.spec["timeline"]
    n = len(items)
    step = (H * 0.72) / n
    ph_h = step * 0.86
    pw = min(W * 0.36, ph_h * 1.45)
    for i, (time, what) in enumerate(items):
        cy = H * 0.2 + step * (i + 0.5)
        p.d.circle(x0, cy, 9 * p.k, fill=S["accent"])
        left = i % 2 == 0
        if left:
            p.ph(x0 - 40 * p.k - pw, cy - ph_h / 2, pw, ph_h)
            p.t(x0 + 40 * p.k, cy - 46 * p.k, pw, time, 40, "head", color=S["accent"])
            p.t(x0 + 40 * p.k, cy + 8 * p.k, pw, what, 18, "body", color=S["ink"])
        else:
            p.ph(x0 + 40 * p.k, cy - ph_h / 2, pw, ph_h)
            p.t(x0 - 40 * p.k - pw, cy - 46 * p.k, pw, time, 40, "head", color=S["accent"], align="right")
            p.t(x0 - 40 * p.k - pw, cy + 8 * p.k, pw, what, 18, "body", color=S["ink"], align="right")


@layout("contact_sheet")
def contact_sheet(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    g = m * 0.18
    c = (W - 2 * m - 2 * g) / 3
    r = (H - 2 * m - 2 * g) / 3
    for i in range(9):
        x, y = m + (i % 3) * (c + g), m + (i // 3) * (r + g)
        if i == 4:
            p.d.rect(x, y, c, r, fill=S["dark"], name="Text tile")
            p.t(x + 20 * p.k, y + r * 0.3, c - 40 * p.k, p.A.spec["sheet_title"], 46, "head", color="#FFFFFF", align="center", lh=1.05)
            p.t(x + 20 * p.k, y + r * 0.72, c - 40 * p.k, p.A.spec["date"], 12, "kick", color=S["tint"], align="center")
        else:
            p.ph(x, y, c, r)


@layout("overlap_pair")
def overlap_pair(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.ph(m, m, W * 0.56, H * 0.62)
    p.ph(W * 0.4, H * 0.36, W * 0.6 - m, H * 0.5, shadow_=shadow("rgba(0,0,0,0.22)", 30 * p.k, 0, 14 * p.k), stroke=S["paper"], sw=14 * p.k)
    p.t(m, H * 0.7, W * 0.32, p.A.cap(), 44, "script", color=S["ink"], lh=1.1)
    p.t(m, H * 0.86, W * 0.32, p.A.spec["date"], 12, "kick", color=S["soft"])


@layout("panorama")
def panorama(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    b = p.d.bleed
    p.t(m, H * 0.12, W - 2 * m, p.A.spec["pano_title"], 92, "head", color=S["ink"], align="center", lh=1.0)
    p.ph(-b, H * 0.34, W + 2 * b, H * 0.38)
    p.t(m * 2, H * 0.78, W - 4 * m, p.A.spec["pano_text"], 19, "body", color=S["soft"], align="center", lh=1.6, fit=False)


@layout("band_stack")
def band_stack(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.bg(S["accent"])
    p.ph(-b, -b, W + 2 * b, H * 0.4 + b)
    p.ph(-b, H * 0.6, W + 2 * b, H * 0.4 + b)
    p.t(m, H * 0.445, W - 2 * m, p.A.cap(), 54, "script", color="#FFFFFF", align="center")


@layout("offset_block")
def offset_block(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    off = 34 * p.k
    p.d.rect(m + off, m + off, W - 2 * m - off * 1.5, H * 0.7, fill=S["tint"], name="Colour block")
    p.ph(m, m, W - 2 * m - off * 1.5, H * 0.7)
    p.t(m, H * 0.7 + m + 40 * p.k, W * 0.5, p.A.spec["offset_title"], 50, "head", color=S["ink"], lh=1.05)
    p.t(W * 0.58, H * 0.7 + m + 46 * p.k, W * 0.42 - m, p.A.spec["offset_text"], 17, "body", color=S["soft"], lh=1.6, fit=False)


@layout("details_grid")
def details_grid(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.08, W - 2 * m, p.A.spec["details_title"], 64, "script", color=S["ink"], align="center")
    g = m * 0.3
    s = min((W - 2 * m * 1.6 - g) / 2, (H * 0.72 - g) / 2)
    x0 = (W - 2 * s - g) / 2
    y0 = H * 0.22
    for i in range(4):
        p.ph(x0 + (i % 2) * (s + g), y0 + (i // 2) * (s + g), s, s)


@layout("letter")
def letter(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["tint"])
    cw, ch = W * 0.6, H * 0.76
    cx, cy = W * 0.4, H * 0.48
    p.d.rect(cx, cy, cw, ch, fill=S["paper"], angle=-2, origin_center=True, shadow_=shadow("rgba(0,0,0,0.12)", 24 * p.k, 0, 10 * p.k), name="Letter")
    x, w = cx - cw / 2 + 60 * p.k, cw - 120 * p.k
    p.t(x, cy - ch / 2 + 70 * p.k, w, p.A.spec["letter_to"], 48, "script", color=S["ink"])
    p.t(x, cy - ch / 2 + 170 * p.k, w, p.A.spec["letter"], 21, "body", color=S["soft"], lh=1.7, fit=False)
    p.t(x, cy + ch / 2 - 130 * p.k, w, p.A.spec["letter_from"], 40, "script", color=S["accent"])
    pw = min(W, H) * 0.3
    _polaroid(p, W * 0.8, H * 0.66, pw, 7, "", tape=True)


@layout("ticket")
def ticket(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.ph(m, m, W - 2 * m, H * 0.5)
    tx, ty, tw, th = m * 1.5, H * 0.5, W - 3 * m, H * 0.34
    p.d.rect(tx, ty, tw, th, fill=S["paper"], rx=18 * p.k, shadow_=shadow("rgba(0,0,0,0.15)", 24 * p.k, 0, 10 * p.k), name="Ticket")
    stub = tx + tw * 0.72
    p.d.line(stub, ty + 20 * p.k, stub, ty + th - 20 * p.k, stroke=S["soft"], sw=2 * p.k, dash=[8 * p.k, 8 * p.k])
    p.d.circle(stub, ty, 16 * p.k, fill=S["bg"])
    p.d.circle(stub, ty + th, 16 * p.k, fill=S["bg"])
    T = p.A.spec["ticket"]
    p.t(tx + 40 * p.k, ty + 34 * p.k, tw * 0.6, T["label"], 13, "kick", color=S["accent"])
    p.t(tx + 40 * p.k, ty + 74 * p.k, tw * 0.3, T["from"], 64, "head", color=S["ink"])
    p.t(tx + tw * 0.36, ty + 92 * p.k, tw * 0.06, "→", 40, "body", color=S["accent"], fit=False)
    p.t(tx + tw * 0.44, ty + 74 * p.k, tw * 0.26, T["to"], 64, "head", color=S["ink"])
    for i, (k_, v) in enumerate(T["fields"]):
        fx = tx + 40 * p.k + i * tw * 0.22
        p.t(fx, ty + th - 110 * p.k, tw * 0.2, k_, 11, "kick", color=S["soft"])
        p.t(fx, ty + th - 80 * p.k, tw * 0.2, v, 22, "body", color=S["ink"], weight=700)
    p.t(stub + 20 * p.k, ty + th * 0.3, tx + tw - stub - 40 * p.k, T["stub"], 30, "script", color=S["accent"], align="center")


@layout("route_map")
def route_map(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["tint"])
    p.d.dots(0, 0, W, H, 34 * p.k, 1.8 * p.k, S["paper"], opacity=0.9)
    p.t(m, H * 0.07, W - 2 * m, p.A.spec["route_title"], 60, "head", color=S["ink"], align="center")
    stops = p.A.spec["route"]
    pts = [(W * 0.18, H * 0.72), (W * 0.36, H * 0.36), (W * 0.62, H * 0.6), (W * 0.82, H * 0.3)][:len(stops)]
    cmds = [["M", *pts[0]]]
    for (x1, y1), (x2, y2) in zip(pts, pts[1:]):
        cmds.append(["Q", (x1 + x2) / 2, min(y1, y2) - H * 0.12, x2, y2])
    p.d.path(cmds, fill=None, stroke=S["accent"], sw=3 * p.k, dash=[14 * p.k, 10 * p.k], name="Route")
    r = W * 0.075
    for (x, y), name in zip(pts, stops):
        p.ph(x - r, y - r, 2 * r, 2 * r, frame="circle", stroke=S["paper"], sw=8 * p.k)
        p.d.circle(x, y + r + 18 * p.k, 8 * p.k, fill=S["accent"])
        p.t(x - W * 0.12, y + r + 36 * p.k, W * 0.24, name, 16, "kick", color=S["ink"], align="center")


@layout("circle_cluster")
def circle_cluster(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    R = W * 0.27
    p.ph(W * 0.42 - R, H * 0.42 - R, 2 * R, 2 * R, frame="circle")
    r = W * 0.13
    p.ph(W * 0.76 - r, H * 0.2 - r, 2 * r, 2 * r, frame="circle", stroke=S["paper"], sw=10 * p.k)
    r2 = W * 0.11
    p.ph(W * 0.72 - r2, H * 0.66 - r2, 2 * r2, 2 * r2, frame="circle", stroke=S["paper"], sw=10 * p.k)
    p.d.circle(W * 0.15, H * 0.16, 40 * p.k, fill=S["tint"])
    p.t(m, H * 0.82, W - 2 * m, p.A.cap(), 50, "script", color=S["ink"], align="center")


@layout("ovals")
def ovals(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    w = W * 0.36
    p.ph(W * 0.12, H * 0.12, w, H * 0.56, frame="ellipse")
    p.ph(W * 0.52, H * 0.3, w, H * 0.56, frame="ellipse")
    p.t(W * 0.52, H * 0.12, w, p.A.cap(), 40, "script", color=S["accent"], align="center")
    p.t(W * 0.12, H * 0.74, w, p.A.spec["date"], 13, "kick", color=S["soft"], align="center")


@layout("glass_card")
def glass_card(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.ph(-b, -b, W + 2 * b, H + 2 * b)
    cw, ch = W * 0.56, H * 0.3
    p.d.rect((W - cw) / 2, (H - ch) / 2, cw, ch, fill=rgba(S["paper"], 0.86), rx=24 * p.k, name="Card")
    p.t((W - cw) / 2 + 40 * p.k, (H - ch) / 2 + ch * 0.18, cw - 80 * p.k, p.A.spec["glass_title"], 60, "head", color=S["ink"], align="center", lh=1.05)
    p.t((W - cw) / 2 + 40 * p.k, (H - ch) / 2 + ch * 0.7, cw - 80 * p.k, p.A.spec["date"], 13, "kick", color=S["accent"], align="center")


@layout("triptych")
def triptych(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["dark"])
    b = p.d.bleed
    g = 10 * p.k
    w = (W + 2 * b - 2 * g) / 3
    for i in range(3):
        p.ph(-b + i * (w + g), -b, w, H + 2 * b)


@layout("l_shape")
def l_shape(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.bg(S["accent"])
    p.ph(-b, -b, W * 0.64 + b, H + 2 * b)
    p.ph(W * 0.64 + 12 * p.k, -b, W * 0.36 + b, H * 0.56 + b)
    x = W * 0.64 + 40 * p.k
    p.t(x, H * 0.62, W * 0.36 - 80 * p.k, p.A.spec["l_title"], 46, "head", color="#FFFFFF", lh=1.05)
    p.t(x, H * 0.86, W * 0.36 - 80 * p.k, p.A.cap(), 12, "kick", color="#FFFFFF")


@layout("numbers")
def numbers(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    p.t(m, H * 0.08, W - 2 * m, p.A.spec["numbers_title"], 58, "head", color=S["ink"], align="center")
    facts = p.A.spec["numbers"]
    w = (W - 2 * m) / len(facts)
    for i, (num, lab) in enumerate(facts):
        x = m + i * w
        p.t(x, H * 0.22, w, num, 110, "head", color=S["accent"], align="center", lh=1.0)
        p.t(x + 10 * p.k, H * 0.36, w - 20 * p.k, lab, 13, "kick", color=S["soft"], align="center")
    p.ph(m, H * 0.47, W - 2 * m, H * 0.53 - m)


@layout("guest_wall")
def guest_wall(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.07, W - 2 * m, p.A.spec["guest_title"], 62, "script", color=S["ink"], align="center")
    names = p.A.spec["guests"]
    cols = 3
    r = W * 0.11
    gx = (W - 2 * m) / cols
    for i, nm in enumerate(names[:6]):
        cx = m + gx * (i % cols + 0.5)
        cy = H * 0.34 + (i // cols) * H * 0.34
        people = p.A.spec.get("people")
        p.ph(cx - r, cy - r, 2 * r, 2 * r, frame="circle", name=people[i % len(people)] if people else None)
        p.d.circle(cx, cy, r + 8 * p.k, fill=None, stroke=S["accent"], sw=1.5 * p.k)
        p.t(cx - gx / 2, cy + r + 22 * p.k, gx, nm, 15, "kick", color=S["ink"], align="center")


@layout("details_list")
def details_list(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    b = p.d.bleed
    p.ph(-b, -b, W * 0.44 + b, H + 2 * b)
    x, w = W * 0.5, W * 0.5 - m
    p.t(x, H * 0.1, w, p.A.spec["list_title"], 56, "head", color=S["ink"], lh=1.05)
    y = H * 0.27
    for k_, v in p.A.spec["list"]:
        p.t(x, y, w, k_, 12, "kick", color=S["accent"])
        o = p.t(x, y + 30 * p.k, w, v, 24, "body", color=S["ink"], lh=1.3, fit=False)
        y += 30 * p.k + o["_h"] + 22 * p.k
        p.rule(x, y, x + w, color=S["tint"], sw=1.2)
        y += 26 * p.k


@layout("wave_edge")
def wave_edge(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.bg(S["paper"])
    p.ph(-b, -b, W + 2 * b, H * 0.68 + b)
    p.d.wave(-b, W + b, H * 0.64, 22 * p.k, W / 3, fill=S["paper"], bottom=H + b)
    p.t(m, H * 0.74, W - 2 * m, p.A.spec["wave_title"], 64, "head", color=S["ink"], align="center")
    p.t(m, H * 0.87, W - 2 * m, p.A.cap(), 14, "kick", color=S["soft"], align="center")


@layout("double_frame")
def double_frame(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.ph(-b, -b, W + 2 * b, H + 2 * b)
    p.d.frame_border(m * 0.55, "#FFFFFF", sw=2 * p.k)
    p.d.frame_border(m * 0.55 + 12 * p.k, "#FFFFFF", sw=0.8 * p.k)
    p.d.rect(W / 2 - W * 0.22, H * 0.82 - 10 * p.k, W * 0.44, 80 * p.k, fill=rgba(S["dark"], 0.55), name="Caption band")
    p.t(W / 2 - W * 0.22, H * 0.82 + 8 * p.k, W * 0.44, p.A.cap(), 36, "script", color="#FFFFFF", align="center")


@layout("big_small")
def big_small(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.ph(m, m, W * 0.62, H * 0.62)
    p.ph(W * 0.52, H * 0.5, W * 0.48 - m, H * 0.5 - m, stroke=S["bg"], sw=16 * p.k)
    p.t(m, H * 0.7, W * 0.36, p.A.spec["bs_title"], 52, "head", color=S["ink"], lh=1.05)
    p.t(m, H * 0.88, W * 0.36, p.A.spec["date"], 12, "kick", color=S["accent"])


@layout("rounded_cards")
def rounded_cards(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["tint"])
    g = m * 0.35
    cw = (W - 2 * m - g) / 2
    ch = (H - 2 * m - g) / 2
    for i in range(4):
        x, y = m + (i % 2) * (cw + g), m + (i // 2) * (ch + g)
        p.d.rect(x, y, cw, ch, fill=S["paper"], rx=26 * p.k, shadow_=shadow("rgba(0,0,0,0.08)", 16 * p.k, 0, 6 * p.k), name="Card")
        p.ph(x + 16 * p.k, y + 16 * p.k, cw - 32 * p.k, ch - 86 * p.k, frame="rounded", r=18 * p.k)
        p.t(x + 16 * p.k, y + ch - 56 * p.k, cw - 32 * p.k, p.A.cap(), 14, "kick", color=S["ink"], align="center")


@layout("center_columns")
def center_columns(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    pw = W * 0.4
    p.ph((W - pw) / 2, m, pw, H - 2 * m)
    cw = (W - pw) / 2 - m * 1.4
    p.t(m, H * 0.3, cw, p.A.spec["col_left"], 40, "script", color=S["accent"], align="right", lh=1.2)
    p.t(W - m - cw, H * 0.56, cw, p.A.spec["col_right"], 17, "body", color=S["soft"], lh=1.6, fit=False)


@layout("contents")
def contents(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    b = p.d.bleed
    p.ph(W * 0.6, -b, W * 0.4 + b, H + 2 * b)
    p.t(m, H * 0.1, W * 0.5, "Contents", 72, "head", color=S["ink"])
    y = H * 0.27
    chs = p.A.spec["chapters"]
    pages = p.A.spec["pages"]
    for i, c in enumerate(chs):
        pg = 4 + round(i * (pages - 6) / max(1, len(chs)))
        p.t(m, y, 60 * p.k, _num(i + 1), 20, "head", color=S["accent"])
        p.t(m + 70 * p.k, y + 2 * p.k, W * 0.36, c, 20, "body", color=S["ink"])
        p.t(W * 0.46, y + 2 * p.k, 60 * p.k, str(pg), 16, "body", color=S["soft"], align="right")
        y += (H * 0.62) / max(1, len(chs))


@layout("chapter_colour")
def chapter_colour(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    p.bg(S["accent"])
    r = min(W, H) * 0.16
    p.ph(W / 2 - r, H * 0.12, 2 * r, 2 * r, frame="circle", stroke="#FFFFFF", sw=10 * p.k)
    p.t(m, H * 0.5, W - 2 * m, "Chapter " + _num(n), 14, "kick", color="#FFFFFF", align="center")
    p.t(m, H * 0.56, W - 2 * m, name, 92, "head", color="#FFFFFF", align="center", lh=1.0)
    p.d.line(W / 2 - 40 * p.k, H * 0.8, W / 2 + 40 * p.k, H * 0.8, stroke="#FFFFFF", sw=2 * p.k)


@layout("chapter_script")
def chapter_script(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    p.bg(S["paper"])
    p.ph(m, H * 0.36, W - 2 * m, H * 0.64 - m)
    p.t(m, H * 0.08, W - 2 * m, _num(n), 22, "kick", color=S["accent"], align="center")
    p.t(m, H * 0.14, W - 2 * m, name, 110, "script", color=S["ink"], align="center")


@layout("chapter_band")
def chapter_band(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    b = p.d.bleed
    p.ph(-b, -b, W + 2 * b, H + 2 * b)
    p.d.rect(-b, H * 0.62, W + 2 * b, H * 0.22, fill=rgba(S["dark"], 0.78), name="Band")
    p.t(m, H * 0.655, W - 2 * m, "Chapter " + _num(n), 13, "kick", color=S["tint"], align="center")
    p.t(m, H * 0.7, W - 2 * m, name, 76, "head", color="#FFFFFF", align="center", lh=1.0)


@layout("chapter_vertical")
def chapter_vertical(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    p.bg(S["tint"])
    p.ph(W * 0.3, m, W * 0.7 - m, H - 2 * m, frame="arch")
    t = p.t(0, 0, H * 0.8, name.upper(), 70, "head", color=S["ink"], align="center", spacing=120)
    t.update(originX="center", originY="center", left=W * 0.15, top=H / 2, angle=-90)
    p.t(m * 0.6, m, W * 0.2, _num(n), 26, "head", color=S["accent"])


@layout("chapter_minimal")
def chapter_minimal(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    n, name = p.A.chapter()
    p.bg(S["paper"])
    p.t(m, H * 0.26, W - 2 * m, _num(n), 20, "kick", color=S["accent"], align="center")
    p.t(m, H * 0.32, W - 2 * m, name, 100, "head", color=S["ink"], align="center", lh=1.0)
    p.rule(W / 2 - 50 * p.k, H * 0.52, W / 2 + 50 * p.k, sw=2)
    g = m * 0.2
    w = (W - 2 * m - 3 * g) / 4
    for i in range(4):
        p.ph(m + i * (w + g), H * 0.62, w, w * 1.15)


@layout("milestones")
def milestones(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg()
    p.t(m, H * 0.06, W - 2 * m, p.A.spec["milestone_title"], 58, "head", color=S["ink"], align="center")
    g = m * 0.25
    c = (W - 2 * m - 3 * g) / 4
    for i in range(8):
        x, y = m + (i % 4) * (c + g), H * 0.2 + (i // 4) * (c * 1.3 + g)
        p.ph(x, y, c, c, frame="rounded", r=20 * p.k)
        p.d.circle(x + c - 26 * p.k, y + 26 * p.k, 26 * p.k, fill=S["accent"])
        p.t(x + c - 52 * p.k, y + 12 * p.k, 52 * p.k, str(i + 1), 22, "head", color="#FFFFFF", align="center", fit=False)
        p.t(x, y + c + 12 * p.k, c, p.A.spec["milestones"][i % len(p.A.spec["milestones"])], 13, "kick", color=S["soft"], align="center")


@layout("wish")
def wish(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["dark"])
    p.d.confetti(0, 0, W, H * 0.35, [S["accent"], S["tint"], S.get("accent3", S["accent"]), "#FFFFFF"], n=60, size=(8 * p.k, 18 * p.k))
    r = min(W, H) * 0.22
    p.ph(W / 2 - r, H * 0.16, 2 * r, 2 * r, frame="circle", stroke=S["tint"], sw=12 * p.k)
    p.t(m, H * 0.66, W - 2 * m, p.A.spec["wish_title"], 96, "script", color="#FFFFFF", align="center")
    p.t(m, H * 0.84, W - 2 * m, p.A.spec["wish_text"], 18, "body", color=S["tint"], align="center")


@layout("stripes_frame")
def stripes_frame(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    p.bg(S["tint"])
    p.d.dots(0, 0, W, H, 30 * p.k, 4 * p.k, S["paper"], opacity=0.9)
    p.d.rect(m * 0.8, m * 0.8, W - 1.6 * m, H - 1.6 * m, fill=S["paper"], name="Panel")
    p.ph(m * 1.3, m * 1.3, W - 2.6 * m, H * 0.62)
    p.t(m * 1.3, H * 0.62 + m * 1.6, W - 2.6 * m, p.A.spec["stripes_title"], 56, "head", color=S["ink"], align="center")


@layout("half_tone")
def half_tone(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    b = p.d.bleed
    p.bg(S["tint"])
    p.ph(-b, -b, W / 2 + b, H + 2 * b)
    p.ph(W / 2 + m * 0.6, m, W / 2 - 1.6 * m, W / 2 - 1.6 * m, frame="rounded", r=24 * p.k)
    y = m + W / 2 - 1.6 * m + 50 * p.k
    p.t(W / 2 + m * 0.6, y, W / 2 - 1.6 * m, p.A.spec["half_title"], 48, "head", color=S["ink"], lh=1.05)
    p.t(W / 2 + m * 0.6, H - m - 30 * p.k, W / 2 - 1.6 * m, p.A.cap(), 12, "kick", color=S["accent"])


@layout("stamp_row")
def stamp_row(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["paper"])
    p.t(m, H * 0.1, W - 2 * m, p.A.spec["stamp_title"], 64, "head", color=S["ink"], align="center")
    n = 3
    g = m * 0.5
    w = (W - 2 * m - (n - 1) * g) / n
    hh = w * 1.25
    y = H * 0.32
    for i in range(n):
        x = m + i * (w + g)
        p.d.rect(x - 10 * p.k, y - 10 * p.k, w + 20 * p.k, hh + 20 * p.k, fill=S["paper"], stroke=S["accent"], sw=2 * p.k, dash=[6 * p.k, 6 * p.k], name="Stamp edge")
        p.ph(x, y, w, hh)
        p.t(x, y + hh + 30 * p.k, w, p.A.cap(), 14, "kick", color=S["soft"], align="center")


@layout("back_cover")
def back_cover(p):
    S, W, H, m = p.S, p.W, p.H, p.m
    p.bg(S["dark"])
    r = min(W, H) * 0.13
    p.ph(W / 2 - r, H * 0.24, 2 * r, 2 * r, frame="circle")
    p.t(m, H * 0.56, W - 2 * m, p.A.spec["end_title"], 72, "script", color="#FFFFFF", align="center")
    p.t(m, H * 0.7, W - 2 * m, p.A.spec["title"] + " · " + p.A.spec["date"], 13, "kick", color=S["tint"], align="center")


# ================================================================== albums
COMMON_Q = [("Collect moments, not things.", "Memories"), ("Some days are worth remembering forever.", "Today"),
            ("Home is wherever we are together.", "Together"), ("Here's to the moments that took our breath away.", "Cheers")]

ALBUMS = [
    dict(slug="wedding-album-ivory-gold-40-pages", name="Wedding Album Ivory & Gold 40 Pages", kind="wedding album", style="ivory", size=(1200, 1200), pages=40, people=["x_family2", "x_friends", "couple2", "x_family3", "x_friends3", "fatherson"],
         photos=["couple", "x_bride", "rings", "bridebouquet", "x_couple5", "weddingtable", "whiteflowers", "couple2", "x_rings2", "venue2", "x_couple6", "champagne", "roses", "engagement",
                 "gala", "x_bouquet3", "flowers", "x_roses3", "blossom", "champagne2", "venue", "jewelry", "table", "flowers2", "x_lights"],
         title="Our Wedding", monogram="A & R", kicker="The wedding of Ava & Rayan", sub="Two hearts, one beautiful story", date="12 · 12 · 2026", year="2026",
         chapters=["Getting Ready", "The Ceremony", "Just Us", "The Details", "Family & Friends", "The Reception", "First Dance", "Thank You"],
         captions=["first look", "the rings", "vows", "just married", "golden hour", "our people", "the cake", "cheers!", "dancing", "forever", "the dress", "love notes"],
         quotes=[("Whatever our souls are made of, his and mine are the same.", "Our story"), ("I have found the one whom my soul loves.", "The ceremony")] + COMMON_Q,
         trio_title="Little moments", diag_title="The best day of our lives", film_title="Behind the scenes", story_title="How it all began",
         story="We met on a rainy afternoon and talked until the café closed. Three years, two cities and one very nervous proposal later, we said yes in front of everyone we love.",
         timeline_title="Our day", timeline=[("10:00", "Getting ready"), ("14:00", "The ceremony"), ("16:30", "Portraits"), ("19:00", "Dinner & toasts"), ("21:00", "First dance")],
         sheet_title="All the little things", pano_title="Together", pano_text="Surrounded by the people who made us who we are.", offset_title="The vows",
         offset_text="Promises made with shaking hands and steady hearts — to laugh, to listen and to choose each other every day.", details_title="The details",
         letter_to="Dear Ava,", letter="Today I promised you forever. Every day after this one I will keep choosing you — on the easy days and the hard ones.", letter_from="— Rayan",
         glass_title="Just married", l_title="The reception", numbers_title="Our day in numbers", numbers=[("180", "guests"), ("12", "hours"), ("1", "yes")],
         guest_title="Our people", guests=["Mum & Dad", "Sara", "Omar", "Grandma", "Lina", "The Khans"], list_title="The wedding",
         list=[("Venue", "The Rose Garden, Dubai"), ("Date", "12 December 2026"), ("Our song", "Perfect"), ("Flowers", "White roses & eucalyptus")],
         wave_title="Forever starts today", bs_title="Golden hour", col_left="You are my today and all of my tomorrows", col_right="We danced until our feet hurt and laughed until our cheeks ached.",
         stripes_title="Cheers to love", half_title="The first dance", stamp_title="Sweet details", end_title="Happily ever after",
         order=["cover_monogram", "contents", "story_spread", "chapter_number", "full_bleed", "duo_vertical", "details_grid", "chapter_colour", "arch_trio", "matted",
                "quote_circle", "hero_side", "letter", "chapter_script", "glass_card", "ovals", "overlap_pair", "film_strip", "chapter_band", "double_frame",
                "bento5", "rounded_cards", "timeline", "chapter_vertical", "contact_sheet", "big_small", "panorama", "guest_wall", "chapter_minimal", "l_shape",
                "numbers", "half_tone", "triptych", "center_columns", "wave_edge", "stamp_row", "details_list", "offset_block", "stripes_frame", "back_cover"]),

    dict(slug="travel-album-ocean-journal-32-pages", name="Travel Album Ocean Journal 32 Pages", kind="travel album", style="ocean", size=(1500, 1050), pages=32, people=["x_friends", "x_friends2", "x_man", "x_man2", "x_friends3", "x_sunglass"],
         photos=["travel", "beach", "mountains", "city", "x_beach3", "travel2", "ocean", "x_mount2", "x_city2", "travel3", "beach2", "hotel", "x_pool", "food", "sushi", "coffee",
                 "latte", "x_croiss", "finedining", "x_sunglass", "car", "camera", "picnic", "restaurant", "x_pasta2", "dessert"],
         title="Wander Often", monogram="Wander", kicker="A travel journal", sub="Places we will never forget", date="Summer 2026", year="2026",
         chapters=["Departure", "The City", "The Coast", "Local Food", "Hidden Gems", "Home Again"],
         captions=["day one", "lost & found", "best view", "street food", "sunset", "on the road", "new friends", "slow mornings", "souvenirs", "last swim"],
         quotes=[("The world is a book, and those who do not travel read only one page.", "On the road"), ("Not all those who wander are lost.", "Day five")] + COMMON_Q,
         trio_title="Postcards", diag_title="Somewhere new", film_title="Roll no. 1", story_title="Why we left",
         story="Two weeks, one backpack each and no plan after day three. We followed the coast, ate everything and said yes to every detour.",
         timeline_title="A day on the coast", timeline=[("07:00", "Sunrise swim"), ("10:00", "Market"), ("13:00", "Long lunch"), ("18:30", "Sunset")],
         sheet_title="Snapshots", pano_title="The coast road", pano_text="Two hundred kilometres of blue on one side and mountains on the other.", offset_title="Getting lost",
         offset_text="The best places we found were never on the map — only down the next small street.", details_title="Tiny things",
         letter_to="Dear future us,", letter="Remember the warm bread, the wrong turns and how the sea looked at six in the evening. Let's go back.", letter_from="— us, July 2026",
         glass_title="Out of office", l_title="Market mornings", numbers_title="The trip in numbers", numbers=[("14", "days"), ("6", "cities"), ("1,240", "km")],
         guest_title="People we met", guests=["Marco", "Ines", "Yuki", "Leo", "Amira", "Tom"], list_title="Trip notes",
         list=[("Where", "Lisbon → Porto → Algarve"), ("When", "June – July 2026"), ("Best meal", "Grilled sardines"), ("Pack next time", "Less!")],
         wave_title="Salt in our hair", bs_title="Golden coast", col_left="Collect moments, not things", col_right="We kept the tickets, the receipts and a little sand in every bag.",
         stripes_title="Beach days", half_title="Old town walks", stamp_title="Postcards home", end_title="Until next time",
         ticket=dict(label="Boarding pass", **{"from": "DXB", "to": "LIS"}, fields=[("Flight", "MT 2026"), ("Seat", "14A"), ("Gate", "B7")], stub="Bon voyage"),
         route_title="Our route", route=["Lisbon", "Porto", "Sintra", "Algarve"],
         order=["cover_split", "contents", "ticket", "chapter_number", "panorama", "hero_row3", "route_map", "story_spread", "chapter_colour", "polaroid_scatter",
                "full_bleed", "film_strip", "duo_vertical", "chapter_script", "timeline", "bento5", "numbers", "glass_card", "chapter_vertical", "contact_sheet",
                "offset_block", "stamp_row", "letter", "chapter_band", "l_shape", "wave_edge", "half_tone", "details_list", "quote_circle", "triptych", "big_small", "back_cover"]),

    dict(slug="baby-first-year-album-pastel-24-pages", name="Baby's First Year Album Pastel 24 Pages", kind="baby album", style="pastel", size=(1200, 1200), pages=24, people=["motherchild", "fatherson", "family", "x_family2", "x_kids", "x_family3"],
         photos=["newborn", "babyfeet", "babyshoes", "x_baby2", "motherchild", "family", "x_family2", "balloons", "x_cake2", "cupcakes", "x_kids", "fatherson", "x_family3",
                 "x_balloons2", "picnic", "x_cake3", "x_couple7", "blossom"],
         title="Hello, Little One", monogram="Mia", kicker="Mia's first year", sub="Twelve months of firsts", date="Born 3 March 2026", year="2026",
         chapters=["Hello World", "First Smiles", "Little Hands", "First Steps", "One Today"],
         captions=["tiny toes", "first bath", "sleepy", "giggles", "bath time", "first food", "so big!", "best friends", "nap time", "first tooth", "park day", "cuddles"],
         quotes=[("A baby fills a place in your heart you never knew was empty.", "Mum"), ("Small hands, big love.", "Month three")] + COMMON_Q,
         trio_title="Firsts", diag_title="Welcome to the world", film_title="Sleepy days", story_title="The day you arrived",
         story="You arrived at 6:42 in the morning, weighing 3.2 kg, with a full head of hair and the loudest little voice. Everything changed — in the best way.",
         timeline_title="Your first day", timeline=[("06:42", "Hello, world"), ("09:00", "First cuddle"), ("15:00", "Meeting family"), ("21:00", "First night home")],
         sheet_title="Little moments", pano_title="Our family", pano_text="Three of us now — and a home full of tiny socks.", offset_title="Tiny hands",
         offset_text="Ten fingers, ten toes and a grip strong enough to hold all of our hearts.", details_title="Tiny things",
         letter_to="Dear Mia,", letter="One day you will read this and wonder how small you were. We will always remember how you changed our world.", letter_from="— Mum & Dad",
         glass_title="Month by month", l_title="Bath time", numbers_title="Hello in numbers", numbers=[("3.2", "kg"), ("50", "cm"), ("06:42", "am")],
         guest_title="Your people", guests=["Mum", "Dad", "Nana", "Grandpa", "Aunt Lina", "Leo"], list_title="All about you",
         list=[("Name", "Mia Noor"), ("Born", "3 March 2026, 6:42 am"), ("Weight", "3.2 kg"), ("First word", "Dada!")],
         wave_title="Sweet dreams", bs_title="Sunny Sundays", col_left="Love at first sight", col_right="You fell asleep on Dad's chest every afternoon, and we never wanted to move.",
         stripes_title="Happy first birthday", half_title="First steps", stamp_title="Favourite things", end_title="Love you forever",
         milestone_title="Month by month", milestones=["1 month", "2 months", "3 months", "4 months", "5 months", "6 months", "9 months", "12 months"],
         wish_title="Happy first birthday", wish_text="One year of you — our favourite year.",
         order=["cover_window", "story_spread", "details_list", "chapter_colour", "matted", "milestones", "duo_vertical", "chapter_script", "circle_cluster", "rounded_cards",
                "letter", "chapter_band", "half_tone", "ovals", "polaroid_scatter", "chapter_number", "wave_edge", "details_grid", "numbers", "chapter_minimal",
                "wish", "big_small", "guest_wall", "back_cover"]),

    dict(slug="family-album-sage-16-pages", name="Family Album Sage 16 Pages", kind="family album", style="sage", size=(1200, 1200), pages=16, people=["fatherson", "motherchild", "x_kids", "x_family2", "couple3", "x_family3"],
         photos=["family", "x_family2", "x_family3", "picnic", "motherchild", "fatherson", "couple3", "x_couple7", "x_dog2", "house", "livingroom", "kitchen",
                 "x_kids", "plants", "autumn", "blossom", "cooking", "table"],
         title="Our Family", monogram="The Khans", kicker="The Khan family", sub="Our year together", date="2026", year="2026",
         chapters=["Spring", "Summer", "Autumn", "Winter"],
         captions=["sunday lunch", "garden days", "road trip", "movie night", "first snow", "picnic", "baking", "together", "home", "grandma's"],
         quotes=[("Home is wherever we are together.", "Always"), ("Family is not an important thing. It's everything.", "Our home")] + COMMON_Q,
         trio_title="Seasons", diag_title="Our happy place", film_title="Weekends", story_title="This year",
         story="A new house, a new puppy and more Sunday lunches than we can count. This is the year we want to remember.",
         sheet_title="Everyday joy", pano_title="Together", pano_text="The best part of every day is coming home to each other.", offset_title="Sunday lunch",
         offset_text="Grandma's recipe, too much food and everyone talking at once.", details_title="Little things",
         glass_title="Our year", l_title="Garden days", numbers_title="Our year", numbers=[("4", "of us"), ("1", "puppy"), ("52", "Sundays")],
         guest_title="Our family", guests=["Dad", "Mum", "Adam", "Sara", "Nana", "Biscuit"], list_title="Favourites",
         list=[("Place", "The beach at sunset"), ("Meal", "Sunday biryani"), ("Film", "Paddington"), ("Game", "Uno — always")],
         wave_title="Summer days", bs_title="Autumn walks", col_left="Love lives here", col_right="Laughter in the kitchen, muddy boots at the door and the dog on the sofa again.",
         stripes_title="Holiday season", half_title="Winter nights", stamp_title="Our favourite things", end_title="To be continued",
         order=["cover_year", "story_spread", "chapter_colour", "hero_row3", "glass_card", "chapter_script", "bento5", "guest_wall", "chapter_number", "overlap_pair",
                "panorama", "chapter_band", "stamp_row", "numbers", "quote_circle", "back_cover"]),

    dict(slug="birthday-album-pop-8-pages", name="Birthday Album Pop 8 Pages", kind="birthday album", style="pop", size=(1200, 1200), pages=8,
         photos=["cake", "x_cake2", "party", "balloons", "x_friends", "confetti", "x_balloons3", "sparkler", "cupcakes", "x_friends3", "gifts", "champagne", "x_cupcakes2", "x_balloons2", "gifts2", "x_friends2", "fireworks", "dj", "x_lights", "fireworks2", "x_cake3"],
         title="Sam Turns 30", monogram="30", kicker="Sam's 30th birthday", sub="Another trip around the sun", date="18 · 08 · 2026", year="30",
         chapters=["The Party", "The Cake"], captions=["surprise!", "the cake", "best friends", "make a wish", "dance floor", "gifts!", "cheers", "the crew"],
         quotes=COMMON_Q, trio_title="Party time", sheet_title="Party pics", wish_title="Make a wish", wish_text="Thirty candles, one wish and the best people in the room.",
         numbers_title="30 in numbers", numbers=[("30", "candles"), ("42", "guests"), ("3", "cakes")], half_title="The cake",
         order=["cover_collage", "contact_sheet", "wish", "arch_trio", "numbers", "polaroid_scatter", "half_tone", "back_cover"]),
]
ALBUMS[4]["end_title"] = "Here's to 31"


def build_album(spec):
    S = STYLES[spec["style"]]
    W, H = spec["size"]
    assert len(spec["order"]) == spec["pages"], (spec["slug"], len(spec["order"]))
    assert spec["pages"] % 8 == 0
    dup = [x for x in set(spec["order"]) if spec["order"].count(x) > 1]
    assert not dup, (spec["slug"], dup)
    A = Album(spec)
    objs, photos = [], set()
    for n, lay in enumerate(spec["order"], 1):
        ab = board(f"alb8_{spec['slug'][:20]}", n, W, H)
        d = Doc(W, H, ab, seed=n * 31 + len(spec["slug"]))
        L[lay](Page(d, S, A))
        dx = (n - 1) * (W + GAP)
        ab["left"] = dx
        objs.append(ab)
        for o in d.objs:
            o.pop("_h", None)
            o.pop("__lines", None)
            o["left"] = o.get("left", 0) + dx
            objs.append(o)
        photos |= set(d.notes.get("photos", []))
    orient = "square" if W == H else ("portrait" if H > W else "landscape")
    kind = spec["kind"]
    tags = ["albums-2026-11-v2", "photo album", "photo book", "multi-page", f"{spec['pages']}-pages", kind, spec["style"]] + (["wedding", "wedding album"] if "wedding" in kind else [])
    return {
        "name": spec["name"], "category": "Photo Collage", "sub": None, "slug": spec["slug"], "width": W, "height": H, "pages": spec["pages"],
        "color1": S["bg"], "color2": S["accent"], "sort": 880, "premium": False, "featured": True,
        "keywords": f"{kind}, {spec['pages']} page {kind}, photo book template, printable album, {spec['title'].lower()}",
        "tags": tags, "occasion": "Wedding" if "wedding" in kind else None, "orientation": orient,
        "description": f"{spec['pages']}-page {kind}: every page a different layout — {spec['sub'].lower()}. Drop in your photos, change the words and print.",
        "photos": sorted(photos), "canvasJson": {"version": "5.1.0", "objects": objs},
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(ROOT, "data/collections/albums-2026-11-v2.json"))
    ap.add_argument("--only")
    a = ap.parse_args()
    specs = [s for s in ALBUMS if not a.only or a.only in s["slug"]]
    out = [build_album(s) for s in specs]
    json.dump(out, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print(len(out), [(x["slug"], x["pages"]) for x in out], os.path.getsize(a.out) // 1024, "KB")


if __name__ == "__main__":
    main()
