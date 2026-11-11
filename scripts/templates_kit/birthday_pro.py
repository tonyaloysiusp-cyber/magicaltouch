"""Birthday Collection (November 2026) — 15 original creative directions.

Replaces the earlier birthday set. Each direction is a matching trio:
a 5x7 printed invitation (3 mm bleed), an Instagram post and a story.
All artwork is drawn here from vector shapes or uses licensed sample photos;
names, dates and venues are fictional placeholders.

  MT_FONT_DIR=... python3 birthday_pro.py --out FILE
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re

from kit import Doc, lin, rad, mix, shadow, FS_MULT, text_width
from common import text_metal, GOLD
from pro_pilot import artboard, PRINT_BLEED, button, rule

FMT = {"inv": (1500, 2100, "Invitation 5x7"), "post": (1080, 1080, "Instagram Post"), "story": (1080, 1920, "Instagram Story")}
CAT_ID = "db0fff91-be7d-4f68-8071-a2eb65357490"


class G:
    """Geometry for one document."""

    def __init__(self, d):
        self.d, self.W, self.H = d, d.W, d.H
        self.u = min(d.W, d.H) / 1000
        self.m = min(d.W, d.H) * 0.08
        self.sq = abs(d.W - d.H) < 10
        self.tall = d.H / d.W > 1.6

    def C(self, y, text, fam, size, col, w=None, **k):
        w = w or self.W - 2 * self.m
        return self.d.text((self.W - w) / 2, y, w, text, fam, size * self.u, col, align=k.pop("align", "center"), **k)

    def L(self, x, y, w, text, fam, size, col, **k):
        return self.d.text(x, y, w, text, fam, size * self.u, col, **k)

    def h(self, text, fam, size, w=None, **k):
        return self.d.measure(text, w or self.W - 2 * self.m, fam, size * self.u, **k)


# ------------------------------------------------------------- 1 Editorial magazine
def editorial(d, f):
    g, W, H, u, m = G(d), d.W, d.H, G(d).u, G(d).m
    d.bg("#EDE6DC")
    d.photo(1331, 0, 0, W, H, focus=(0.5, 0.3), name="Cover photo")
    d.rect(0, 0, W, H * 0.34, lin(0, 0, 0, H * 0.34, [(0, "rgba(10,10,12,0.55)"), (1, "rgba(10,10,12,0)")]), name="Shade")
    d.rect(0, H * 0.58, W, H * 0.42, lin(0, 0, 0, H * 0.42, [(0, "rgba(10,10,12,0)"), (1, "rgba(10,10,12,0.78)")]), name="Shade")
    g.L(m, m * 0.7, W - 2 * m, "THE BIRTHDAY ISSUE  ·  NO. 30  ·  NOVEMBER", "Inter", 17, "#FFFFFF", weight=600, spacing=300)
    big = d.fit("MAYA", W - 2 * m, "Playfair Display", (300 if not g.sq else 230) * u, weight=800)
    d.text(m, m * 0.7 + 34 * u, W - 2 * m, "MAYA", "Playfair Display", big, "#FFFFFF", weight=800, align="center", lh=0.9)
    y = H - m - (330 if not g.sq else 240) * u
    g.L(m, y, W * 0.62, "Thirty, and\nfinally fearless", "Playfair Display", 64 if not g.sq else 50, "#FFFFFF", italic=True, lh=1.05)
    rule(d, m, y + (170 if not g.sq else 130) * u, 80 * u, "#E7C58B", 4 * u)
    g.L(m, y + (195 if not g.sq else 150) * u, W - 2 * m, "Join us · Saturday 6 December · 8 PM\nThe Atrium, Al Seef", "Inter", 24, "#F3EEE7", weight=500, lh=1.45)
    g.L(W - m - 220 * u, m * 0.7 + 34 * u + big * 0.95, 220 * u, "EXCLUSIVE\nPARTY\nINSIDE", "Inter", 18, "#E7C58B", weight=700, align="right", spacing=250, lh=1.3)


# ------------------------------------------------------------- 2 Luxury black & gold
def black_gold(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg(rad(W / 2, H * 0.45, max(W, H) * 0.75, [(0, "#1B1A17"), (1, "#070707")]))
    d.frame_border(m * 0.5, "#C9A86A", 2.5 * u, double=14 * u)
    for k in (-1, 1):
        d.path([["M", W / 2 + k * 40 * u, m * 0.5 + 50 * u], ["L", W / 2, m * 0.5 + 20 * u], ["L", W / 2 - k * 40 * u, m * 0.5 + 50 * u]], fill="", stroke="#C9A86A", sw=2 * u, name="Ornament")
    blocks = [
        {"text": "YOU ARE INVITED TO CELEBRATE", "family": "Cinzel", "size": 26 * u, "color": "#C9A86A", "spacing": 400},
        ("gap", 40 * u),
        {"text": "Omar's", "family": "Cormorant Garamond", "size": (90 if g.sq else 120) * u, "color": "#F2E8D5", "italic": True},
        ("gap", 0),
        {"text": "FORTIETH", "family": "Cinzel", "size": d.fit("FORTIETH", W - 2.6 * m, "Cinzel", 150 * u, weight=700, spacing=120), "color": "#C9A86A", "weight": 700, "spacing": 120},
        ("gap", 30 * u),
        ("obj", 30 * u, lambda y: rule(d, W / 2 - 90 * u, y + 12 * u, 180 * u, "#C9A86A", 2 * u)),
        {"text": "Friday, 12 December 2026 · Eight in the evening", "family": "Cormorant Garamond", "size": (38 if g.sq else 48) * u, "color": "#F2E8D5"},
        ("gap", 18 * u),
        {"text": "THE GOLD ROOM · ONE&ONLY ROYAL MIRAGE", "family": "Cinzel", "size": 20 * u, "color": "#B9A781", "spacing": 300},
    ]
    if not g.sq:
        blocks += [("gap", 70 * u), {"text": "Black tie · RSVP to Lina by 1 December", "family": "Cormorant Garamond", "size": 30 * u, "color": "#C9A86A", "italic": True}]
    out, _ = d.stack(blocks, m * 1.1, W - 2.2 * m, center_y=H * 0.52)
    text_metal(None, out[2], GOLD)


# ------------------------------------------------------------- 3 Botanical memory collage
def sprig(d, x, y, L, ang, col):
    a = math.radians(ang)
    ex, ey = x + math.cos(a) * L, y + math.sin(a) * L
    d.line(x, y, ex, ey, col, max(1.5, L * 0.012), name="Stem")
    for i in range(1, 7):
        t = i / 7
        px, py = x + (ex - x) * t, y + (ey - y) * t
        for s in (-1, 1):
            d.leaf(px, py, L * 0.2 * (1 - t * 0.4), L * 0.08, ang + s * 48, col, opacity=0.95)


def botanical(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#F3EEE4")
    sprig(d, -20 * u, H * 0.12, 420 * u, 20, "#7C8B6A")
    sprig(d, W + 20 * u, H * 0.9, 420 * u, 200, "#9AA77F")
    if g.sq:
        pw = (W - 2 * m - 40 * u) / 3
        for i, (n, fr) in enumerate([(240, "arch"), (972, "arch"), (784, "arch")]):
            d.photo(n, m + i * (pw + 20 * u), m + 30 * u, pw, pw * 1.3, frame=fr, focus=(0.5, 0.35))
        top = m + 30 * u + pw * 1.3 + 50 * u
    else:
        pw = (W - 2 * m) * 0.56
        d.photo(240, m, m + 40 * u, pw, pw * 1.32, frame="arch", focus=(0.5, 0.3))
        rw, gap = (W - 2 * m) - pw - 24 * u, 24 * u
        h1 = pw * 0.74
        d.photo(972, W - m - rw, m + 40 * u, rw, h1, frame="rounded", rx=20 * u, focus=(0.5, 0.3))
        d.photo(784, W - m - rw, m + 40 * u + h1 + gap, rw, pw * 1.32 - h1 - gap, frame="rounded", rx=20 * u, focus=(0.5, 0.25))
        top = m + 40 * u + pw * 1.32 + 70 * u
    blocks = [
        {"text": "A garden of memories for", "family": "Cormorant Garamond", "size": 40 * u, "color": "#5E6B4E", "italic": True},
        {"text": "Amira at 25", "family": "Playfair Display", "size": (110 if not g.sq else 70) * u, "color": "#2F3A28", "weight": 500},
        ("gap", 20 * u),
        {"text": "SUNDAY 14 DECEMBER · 4 PM · THE GLASSHOUSE CAFÉ", "family": "Montserrat", "size": 20 * u, "color": "#5E6B4E", "weight": 600, "spacing": 300},
    ]
    d.stack(blocks, m, W - 2 * m, top=top)


# ------------------------------------------------------------- 4 Retro film
def film(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#141210")
    d.texture("grain", 0.35)
    stripW = W * (0.62 if not g.sq else 0.42)
    sx = (W - stripW) / 2 if not g.sq else W - m - stripW
    n = 3 if not g.sq else 2
    top = m * 1.4 if not g.sq else m
    fh = stripW * 0.72
    total = n * fh + (n + 1) * 22 * u
    d.rect(sx, top, stripW, total, "#000000", name="Film strip")
    for k in range(int(total / (34 * u))):
        for xx in (sx + 10 * u, sx + stripW - 26 * u):
            d.rect(xx, top + 10 * u + k * 34 * u, 16 * u, 20 * u, "#F2E9D8", rx=3 * u, opacity=0.9, name="Sprocket")
    for i, ph in enumerate([1219, 641, 1735][:n]):
        d.photo(ph, sx + 40 * u, top + 22 * u + i * (fh + 22 * u), stripW - 80 * u, fh, focus=(0.5, 0.35), filters=[{"type": "Grayscale", "mode": "average"}])
    if g.sq:
        x, w = m, W - 2 * m - stripW - 40 * u
        g.L(x, m + 20 * u, w, "NOW SHOWING", "Inter", 20, "#E2B65A", weight=700, spacing=400)
        g.L(x, m + 70 * u, w, "Sam's\n30th\nReel", "Bebas Neue", 150, "#F2E9D8", lh=0.88)
        g.L(x, H - m - 120 * u, w, "Sat 29 Nov · 9 PM\nVox Rooftop Cinema", "Inter", 26, "#CFC4B2", weight=500, lh=1.4)
        return
    y = top + total + 50 * u
    g.C(y, "NOW SHOWING", "Inter", 20, "#E2B65A", weight=700, spacing=500)
    g.C(y + 40 * u, "SAM'S 30TH REEL", "Bebas Neue", 130, "#F2E9D8")
    g.C(y + 190 * u, "Saturday 29 November · 9 PM · Vox Rooftop Cinema", "Inter", 24, "#CFC4B2", weight=500)


# ------------------------------------------------------------- 5 3D typography
def type3d(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg(lin(0, 0, W, H, [(0, "#FFD8C2"), (1, "#FF9F8A")]))
    size = (760 if not g.sq else 520) * u
    y = H * (0.36 if not g.sq else 0.4) - size * FS_MULT / 2
    for k in range(14, 0, -1):
        d.text(k * 3 * u, y + k * 4 * u, W, "21", "Archivo Black", size, mix("#7A1F3D", "#C2416B", k / 14), align="center", name="Depth")
    d.text(0, y, W, "21", "Archivo Black", size, "#FFF4EC", align="center", name="Number")
    by = y + size * FS_MULT * 0.95
    g.C(by, "MIA IS TWENTY-ONE", "Archivo Black", 60, "#7A1F3D", spacing=60)
    g.C(by + 90 * u, "Party · Friday 5 December · 9 PM · Kite Beach House", "Inter", 26, "#7A1F3D", weight=600)
    if not g.sq:
        button(d, W / 2, H - m - 60 * u, "RSVP · 050 000 0000", "#FFF4EC", "#7A1F3D", 24 * u)


# ------------------------------------------------------------- 6 Abstract colour explosion
def explosion(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#FFFDF8")
    r = random.Random(11)
    cols = ["#FF4D6D", "#FFB703", "#3A86FF", "#8338EC", "#06D6A0", "#FB5607"]
    for i in range(16):
        d.blob(r.uniform(0, W), r.uniform(0, H), r.uniform(120, 300) * u, cols[i % len(cols)], wobble=0.28, opacity=0.9, seed=i * 7)
    cw, ch = W * (0.7 if not g.sq else 0.66), H * (0.42 if not g.sq else 0.5)
    cx, cy = (W - cw) / 2, (H - ch) / 2
    d.rect(cx, cy, cw, ch, "#FFFFFF", rx=34 * u, shadow_=shadow("rgba(0,0,0,0.18)", 40 * u, 0, 16 * u), name="Card")
    blocks = [
        {"text": "LET'S MAKE SOME NOISE", "family": "Space Grotesk", "size": 22 * u, "color": "#8338EC", "weight": 700, "spacing": 300},
        ("gap", 14 * u),
        {"text": "Rafi turns 18", "family": "Space Grotesk", "size": d.fit("Rafi turns 18", cw - 100 * u, "Space Grotesk", 140 * u, weight=700), "color": "#14121F", "weight": 700, "lh": 1.0},
        ("gap", 22 * u),
        {"text": "Saturday 13 December · 7 PM\nThe Warehouse, Alserkal Avenue", "family": "Inter", "size": (26 if g.sq else 34) * u, "color": "#3E3B4A", "lh": 1.45},
    ]
    d.stack(blocks, cx + 50 * u, cw - 100 * u, center_y=cy + ch / 2)


# ------------------------------------------------------------- 7 Illustrated character
def character(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#FFF2D9")
    d.dots(0, 0, W, H, 60 * u, 4 * u, "#F2C879", opacity=0.6)
    s = (1.0 if not g.sq else 0.72) * u
    cx, cy = W / 2, H * (0.36 if not g.sq else 0.37)
    # balloons
    for dx, dy, c in ((-250, -170, "#FF6B6B"), (-170, -260, "#4D96FF"), (230, -220, "#6BCB77")):
        d.balloon(cx + dx * s, cy + dy * s, 60 * s, c, tail=150 * s)
    # body
    d.path([["M", cx - 120 * s, cy + 250 * s], ["C", cx - 120 * s, cy + 70 * s, cx + 120 * s, cy + 70 * s, cx + 120 * s, cy + 250 * s], ["Z"]], "#4D96FF", name="Body")
    d.circle(cx, cy, 95 * s, "#F6C9A4", name="Head")
    d.path([["M", cx - 95 * s, cy - 10 * s], ["C", cx - 100 * s, cy - 120 * s, cx + 100 * s, cy - 120 * s, cx + 95 * s, cy - 10 * s], ["C", cx + 40 * s, cy - 60 * s, cx - 40 * s, cy - 60 * s, cx - 95 * s, cy - 10 * s], ["Z"]], "#3B2A20", name="Hair")
    d.polygon([(cx - 45 * s, cy - 82 * s), (cx + 45 * s, cy - 82 * s), (cx + 10 * s, cy - 230 * s)], "#FFB703", name="Party hat")
    d.circle(cx + 10 * s, cy - 232 * s, 16 * s, "#FF6B6B", name="Pom-pom")
    for k in (-1, 1):
        d.circle(cx + k * 34 * s, cy + 5 * s, 9 * s, "#2B2B2B", name="Eye")
        d.circle(cx + k * 58 * s, cy + 35 * s, 14 * s, "#FF9A8B", opacity=0.6, name="Cheek")
    d.path([["M", cx - 28 * s, cy + 38 * s], ["Q", cx, cy + 66 * s, cx + 28 * s, cy + 38 * s]], fill="", stroke="#2B2B2B", sw=6 * s, name="Smile")
    d.rect(cx + 120 * s, cy + 100 * s, 120 * s, 80 * s, "#FFFFFF", rx=10 * s, name="Cake")
    d.rect(cx + 120 * s, cy + 100 * s, 120 * s, 22 * s, "#FF6B6B", rx=10 * s, name="Icing")
    d.rect(cx + 176 * s, cy + 60 * s, 8 * s, 40 * s, "#4D96FF", name="Candle")
    d.ellipse(cx + 180 * s, cy + 50 * s, 7 * s, 12 * s, "#FFB703", name="Flame")
    top = cy + 280 * s + 40 * u
    blocks = [
        {"text": "Yusuf is turning", "family": "Fredoka", "size": 44 * u, "color": "#6B4E3D", "weight": 500},
        {"text": "SEVEN!", "family": "Fredoka", "size": (150 if not g.sq else 96) * u, "color": "#FF6B6B", "weight": 700},
        ("gap", 10 * u),
        {"text": "Saturday 22 November · 3–6 PM · Funville, Mirdif", "family": "Fredoka", "size": 28 * u, "color": "#6B4E3D", "weight": 500},
    ]
    d.stack(blocks, m, W - 2 * m, top=top)


# ------------------------------------------------------------- 8 Minimalist photo story
def minimal(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#FAF9F6")
    if g.sq:
        d.photo(1148, m, m, W * 0.48, H - 2 * m, focus=(0.5, 0.35))
        x = m + W * 0.48 + 50 * u; w = W - x - m
        g.L(x, m + 10 * u, w, "35", "Playfair Display", 200, "#1A1A1A", weight=400)
        rule(d, x, m + 290 * u, 60 * u, "#1A1A1A", 2 * u)
        g.L(x, m + 320 * u, w, "Noor's birthday dinner", "Playfair Display", 40, "#1A1A1A", italic=True, lh=1.15)
        g.L(x, H - m - 110 * u, w, "Thursday 4 December\n8 PM · Zuma, DIFC", "Inter", 22, "#5A5A5A", lh=1.5)
        return
    ph = H * 0.56
    d.photo(1148, m, m, W - 2 * m, ph, focus=(0.5, 0.3))
    y = m + ph + 70 * u
    g.L(m, y, W * 0.4, "35", "Playfair Display", 220, "#1A1A1A")
    g.L(W * 0.45, y + 40 * u, W * 0.55 - m, "Noor's birthday dinner", "Playfair Display", 52, "#1A1A1A", italic=True, lh=1.1)
    rule(d, W * 0.45, y + 190 * u, 60 * u, "#1A1A1A", 2 * u)
    g.L(W * 0.45, y + 220 * u, W * 0.55 - m, "Thursday 4 December · 8 PM\nZuma, DIFC", "Inter", 24, "#5A5A5A", lh=1.55)


# ------------------------------------------------------------- 9 Scrapbook memory book
def tape(d, cx, cy, w, ang):
    d.rect(cx, cy, w, w * 0.28, "rgba(240,226,190,0.85)", origin_center=True, angle=ang, name="Tape")


def scrapbook(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#D9C3A0")
    d.texture("paper", 0.55)
    pol = [(724, -6, 0.27, 0.2), (2, 5, 0.73, 0.28), (1685, 3, 0.36, 0.53)] if not g.sq else [(724, -6, 0.26, 0.32), (2, 6, 0.74, 0.34)]
    pw = W * (0.44 if not g.sq else 0.36)
    for n, ang, fx, fy in pol:
        cx, cy = W * fx, H * fy
        d.rect(cx, cy, pw, pw * 1.18, "#FFFFFF", origin_center=True, angle=ang, shadow_=shadow("rgba(0,0,0,0.25)", 20 * u, 4 * u, 8 * u), name="Polaroid")
        a = math.radians(ang)
        ox, oy = -pw * 0.43, -pw * 0.52
        px = cx + ox * math.cos(a) - oy * math.sin(a)
        py = cy + ox * math.sin(a) + oy * math.cos(a)
        d.photo(n, px, py, pw * 0.86, pw * 0.86, angle=ang, focus=(0.5, 0.35))
        tape(d, cx + math.sin(a) * pw * 0.6, cy - math.cos(a) * pw * 0.6, pw * 0.42, ang + 4)
    y = H * (0.76 if not g.sq else 0.68)
    g.C(y, "Ten years of you & me", "Caveat", 96 if not g.sq else 80, "#3B2A1E", weight=700)
    g.C(y + (120 if not g.sq else 100) * u, "Happy birthday, Dana! Dinner at ours · Fri 28 Nov · 7 PM", "Caveat", 40, "#5B4330")


# ------------------------------------------------------------- 10 Cinematic poster
def cinematic(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#0B0B0E")
    d.photo(997, 0, 0, W, H, focus=(0.5, 0.4), name="Key art")
    d.rect(0, 0, W, H, lin(0, 0, 0, H, [(0, "rgba(5,5,8,0.25)"), (0.55, "rgba(5,5,8,0.35)"), (1, "rgba(5,5,8,0.95)")]), name="Grade")
    g.C(m, "A NIGHT IN HONOUR OF", "Oswald", 22, "#D9C9A3", weight=500, spacing=500)
    ty = H * (0.6 if not g.sq else 0.5)
    g.C(ty, "KARIM", "Bebas Neue", 230 if not g.sq else 190, "#F4EFE6", spacing=80)
    g.C(ty + (220 if not g.sq else 180) * u, "THE FIFTIETH", "Oswald", 46, "#C9A86A", weight=600, spacing=600)
    credits = "STARRING FAMILY & FRIENDS  ·  DINNER BY OSTERIA LUCA  ·  MUSIC BY DJ SAMI  ·  DRESS CODE CINEMATIC BLACK"
    g.C(H - m - (150 if not g.sq else 110) * u, credits, "Oswald", 17, "#A9A196", weight=400, spacing=150, lh=1.4)
    g.C(H - m - 40 * u, "SATURDAY 20 DECEMBER · 8 PM · THE CANVAS ROOM", "Oswald", 26, "#F4EFE6", weight=600, spacing=200)


# ------------------------------------------------------------- 11 Modern typography
def typographic(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#F1F0EC")
    d.rect(W * 0.66, 0, W * 0.34, H, "#FF5A36", name="Colour block")
    words = ["HAPPY", "BIRTH", "DAY"]
    size = d.fit("BIRTH", W - 2 * m, "Archivo Black", 400 * u)
    y = m
    for w_ in words:
        d.text(m, y, W - 2 * m, w_, "Archivo Black", size, "#111111", lh=0.85, name="Headline")
        y += size * FS_MULT * 0.86
    g.L(m, y + 30 * u, W * 0.55, "Leila — 27", "Archivo Black", 54, "#FF5A36")
    g.L(m, y + 110 * u, W * 0.55, "Drinks & dancing\nFriday 12 December, 9 PM\nBarasti Beach", "Inter", 26, "#333333", weight=500, lh=1.45)
    if not g.sq:
        g.L(W * 0.7, H - m - 60 * u, W * 0.26, "RSVP\n050 000 0000", "Inter", 22, "#FFFFFF", weight=700, lh=1.3)


# ------------------------------------------------------------- 12 Luxury floral
def flower(d, cx, cy, r, petal, centre, n=6, rot=0):
    for k in range(n):
        a = rot + k * 360 / n
        rr = math.radians(a)
        d.ellipse(cx + math.cos(rr) * r * 0.55, cy + math.sin(rr) * r * 0.55, r * 0.55, r * 0.32, petal, angle=a, opacity=0.95, name="Petal")
    d.circle(cx, cy, r * 0.28, centre, name="Flower centre")


def floral(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg(rad(W / 2, H / 2, max(W, H) * 0.7, [(0, "#2E1A24"), (1, "#170C12")]))
    def cluster(x, y, s):
        for i, (dx, dy, r, a) in enumerate([(0, 0, 90, 0), (110, 40, 70, 20), (-90, 60, 64, 10), (40, -100, 56, 30)]):
            d.leaf(x + dx * s - 60 * s, y + dy * s + 50 * s, 120 * s, 40 * s, 140 + i * 40, "#3E5B45")
        for i, (dx, dy, r, a) in enumerate([(0, 0, 90, 0), (110, 40, 70, 20), (-90, 60, 64, 10), (40, -100, 56, 30)]):
            flower(d, x + dx * s, y + dy * s, r * s, ["#E8B4B8", "#F3D9C9", "#C97B84", "#F7E6DA"][i], "#C9A86A", n=6 + i % 2, rot=a)
    k = 1.2 if g.sq else 1.7
    cluster(m * 0.6, m * 0.6, k * u)
    cluster(W - m * 0.6, H - m * 0.6, k * u)
    z = 1 if g.sq else 1.3
    blocks = [
        {"text": "please join us for", "family": "Cormorant Garamond", "size": 36 * z * u, "color": "#E8D5C4", "italic": True},
        ("gap", 10 * u),
        {"text": "Sofia's", "family": "Great Vibes", "size": 130 * z * 1.2 * u, "color": "#E3C08A"},
        {"text": "SIXTIETH BIRTHDAY", "family": "Cinzel", "size": 36 * z * u, "color": "#F3E6D8", "spacing": 300},
        ("gap", 30 * u),
        ("obj", 20 * u, lambda y: rule(d, W / 2 - 70 * u, y + 8 * u, 140 * u, "#C9A86A", 2 * u)),
        {"text": "Saturday, 6 December · 1 PM\nGarden luncheon at The Rose Pavilion", "family": "Cormorant Garamond", "size": 36 * z * u, "color": "#E8D5C4", "lh": 1.35},
    ]
    out, _ = d.stack(blocks, m * 1.4, W - 2.8 * m, center_y=H / 2)
    text_metal(None, out[1], GOLD)


# ------------------------------------------------------------- 13 Contemporary photo grid
def grid(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#FFFFFF")
    gut = 14 * u
    if g.sq:
        cells = [(0, 0, 0.5, 0.62, 1491), (0.5, 0, 0.5, 0.38, 784), (0.5, 0.38, 0.25, 0.24, 1409), (0.75, 0.38, 0.25, 0.24, 240)]
        area = (0, 0, W, H * 0.74)
    else:
        cells = [(0, 0, 0.6, 0.42, 1491), (0.6, 0, 0.4, 0.26, 784), (0.6, 0.26, 0.4, 0.16, 1409), (0, 0.42, 0.35, 0.22, 240), (0.35, 0.42, 0.65, 0.22, 1313)]
        area = (0, 0, W, H)
    for fx, fy, fw, fh, n in cells:
        d.photo(n, area[0] + fx * W + gut / 2, fy * H + gut / 2, fw * W - gut, fh * H - gut, focus=(0.5, 0.35))
    top = H * (0.66 if not g.sq else 0.74) + 30 * u
    d.rect(0, top - 30 * u, W, H - top + 30 * u, "#111111", name="Panel")
    g.L(m, top + 10 * u, W * 0.6, "Twenty-nine\nlooks good on Ali", "Space Grotesk", 64 if not g.sq else 44, "#FFFFFF", weight=700, lh=1.05)
    g.L(W * 0.64, top + 18 * u, W * 0.36 - m, "Sat 15 Nov · 8 PM\nSoho Garden\nRSVP 050 000 0000", "Inter", 24 if not g.sq else 20, "#BDBDBD", lh=1.5)


# ------------------------------------------------------------- 14 Kids illustrated
def kids(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg(lin(0, 0, 0, H, [(0, "#CFF1FF"), (1, "#FFF5E1")]))
    d.bunting(-20 * u, W + 20 * u, 40 * u, 70 * u, ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF"], flags=9)
    r = random.Random(4)
    for _ in range(14):
        d.star(r.uniform(m, W - m), r.uniform(H * 0.1, H * 0.5), r.uniform(10, 22) * u, r.choice(["#FFD93D", "#FF6B6B", "#4D96FF"]))
    for i, (fx, c) in enumerate(((0.2, "#FF6B6B"), (0.36, "#FFD93D"), (0.64, "#6BCB77"), (0.8, "#4D96FF"))):
        d.balloon(W * fx, H * (0.28 if not g.sq else 0.3) + (i % 2) * 40 * u, 70 * u, c, tail=180 * u)
    d.wave(0, W, H * (0.86 if not g.sq else 0.84), 18 * u, W / 3, fill="#8FD694", bottom=H)
    blocks = [
        {"text": "LEO TURNS", "family": "Fredoka", "size": 64 * u, "color": "#2D4A8A", "weight": 700, "spacing": 120},
        {"text": "5", "family": "Fredoka", "size": (300 if not g.sq else 200) * u, "color": "#FF6B6B", "weight": 700, "lh": 0.9},
        {"text": "Bouncy castle, cake & games!\nSunday 30 November · 2 PM · Safa Park", "family": "Fredoka", "size": (30 if g.sq else 38) * u, "color": "#2D4A8A", "weight": 500, "lh": 1.35},
    ]
    d.stack(blocks, m, W - 2 * m, center_y=H * (0.6 if not g.sq else 0.62))


# ------------------------------------------------------------- 15 Architectural geometric
def geometric(d, f):
    g = G(d); W, H, u, m = d.W, d.H, g.u, g.m
    d.bg("#EFE4D3")
    cols = ["#C4673F", "#2F4858", "#E3A73F", "#8C9F8E"]
    cell = (W - 2 * m) / 4
    rows = 2 if g.sq else (5 if g.tall else 4)
    for r_ in range(rows):
        for c_ in range(4):
            x, y = m + c_ * cell, m + r_ * cell
            k = (r_ * 4 + c_) % 5
            col = cols[(r_ + c_) % 4]
            if k == 0:
                d.path([["M", x, y + cell], ["L", x, y + cell / 2], ["A", cell / 2, cell / 2, 0, 0, 1, x + cell, y + cell / 2], ["L", x + cell, y + cell], ["Z"]], col, name="Arch")
            elif k == 1:
                d.circle(x + cell / 2, y + cell / 2, cell * 0.42, col, name="Circle")
            elif k == 2:
                d.path([["M", x, y], ["A", cell, cell, 0, 0, 1, x + cell, y + cell], ["L", x, y + cell], ["Z"]], col, name="Quarter")
            elif k == 3:
                d.rect(x + cell * 0.1, y + cell * 0.1, cell * 0.8, cell * 0.8, col, name="Square")
            else:
                d.polygon([(x, y + cell), (x + cell / 2, y), (x + cell, y + cell)], col, name="Triangle")
    top = m + rows * cell + 60 * u
    g.L(m, top, W - 2 * m, "HAPPY 40TH, RANIA", "Space Grotesk", 64 if g.sq else 90, "#2F4858", weight=700, lh=1.0)
    g.L(m, top + (120 if not g.sq else 90) * u, W - 2 * m, "An evening of good design and better company.\nThursday 11 December · 7:30 PM · Gallery Isabelle, Al Quoz", "Inter", 26 if not g.sq else 22, "#4A4A4A", lh=1.5)


# ------------------------------------------------------------- build
DIRECTIONS = [
    (editorial, "Editorial Magazine Cover", "birthday magazine cover, editorial, photo, 30th", ["style:modern-editorial", "style:high-fashion-editorial"]),
    (black_gold, "Black & Gold Fortieth", "luxury birthday, black and gold, 40th, black tie", ["style:black-gold", "style:luxury-typography"]),
    (botanical, "Botanical Memory Collage", "botanical birthday, photo collage, garden party", ["style:botanical-art", "style:organic"]),
    (film, "Retro Film Reel Birthday", "retro film birthday, cinema, black and white photos", ["style:analog-film", "style:retro"]),
    (type3d, "3D Typography Twenty-First", "3d typography birthday, 21st, bold number", ["style:experimental-typography", "style:playful"]),
    (explosion, "Abstract Colour Explosion Eighteenth", "abstract colourful birthday, 18th party", ["style:maximalist", "style:abstract-contemporary"]),
    (character, "Illustrated Character Seventh Birthday", "kids character birthday, illustrated, party hat", ["style:flat-illustration", "style:playful"]),
    (minimal, "Minimalist Photo Story Birthday", "minimal birthday dinner, photo, elegant", ["style:editorial-minimalism", "style:swiss-minimalism"]),
    (scrapbook, "Scrapbook Memory Book Birthday", "scrapbook birthday, polaroid, best friend", ["style:collage-art", "style:hand-drawn"]),
    (cinematic, "Cinematic Fiftieth Poster", "cinematic birthday poster, 50th, movie", ["style:cinematic"]),
    (typographic, "Modern Typography Birthday Invitation", "typography birthday invitation, swiss, bold", ["style:typography-led", "style:neo-brutalist"]),
    (floral, "Luxury Floral Sixtieth", "luxury floral birthday, 60th, garden luncheon", ["style:champagne-elegance", "style:botanical-art"]),
    (grid, "Contemporary Photo Grid Birthday", "photo grid birthday, contemporary, collage", ["style:modern-grid"]),
    (kids, "Kids Balloon Party Fifth Birthday", "kids birthday, balloons, bunting, 5th", ["style:playful", "style:flat-illustration"]),
    (geometric, "Architectural Geometric Fortieth", "geometric birthday, bauhaus-inspired, architectural", ["style:geometric-modernism", "style:bauhaus-inspired"]),
]
PIECES = [("inv", "Invitation"), ("post", "Post"), ("story", "Story")]


def build():
    out, i = [], 0
    for fn, title, kw, styles in DIRECTIONS:
        for fmt, label in PIECES:
            i += 1
            W, H, fname = FMT[fmt]
            pr = fmt == "inv"
            d = Doc(W, H, artboard(W, H, 7000 + i, pr), seed=7100 + i)
            if pr:
                d.bleed = PRINT_BLEED
            fn(d, fmt)
            for ob in d.objs:
                ob.pop("_h", None)
                ob.pop("__lines", None)
            name = f"{title} {label}"
            slug = "bdp-" + re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and")).strip("-")
            out.append({"name": name, "category": "Birthday", "category_id": CAT_ID, "slug": slug, "width": W, "height": H,
                        "sort": -6000 + i, "featured": True, "keywords": kw + f", birthday {label.lower()}, editable birthday template",
                        "tags": ["birthday-pro-2026-11", "birthday", "set-" + fn.__name__] + styles + (["print-ready", "bleed-3mm"] if pr else []),
                        "status": "published",
                        "description": f"{title} {label.lower()} from the Magical Touch birthday collection: an original {kw.split(',')[0]} design. Change the name, date, photos and colours online"
                                       + (", then download a print-ready PDF with 3 mm bleed." if pr else ", then download it for social media."),
                        "canvasJson": d.json()})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = build()
    json.dump(rows, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(rows))


if __name__ == "__main__":
    main()
