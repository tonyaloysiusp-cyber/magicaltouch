"""Diwali Pro collection (November 2026): ~180 original, editable Diwali designs.

Wish posts, stories, greeting cards, corporate greetings, photo collages,
party invitations, celebration posters and festive offers. Every motif —
diyas, marigold torans, sky lanterns, rangoli, fireworks, Mughal arches —
is drawn here as editable vector shapes; photos are the site's own sample
photos (/templates/photos) and are meant to be replaced.

  MT_FONT_DIR=... python3 diwali_pro.py --out FILE
"""

from __future__ import annotations

import argparse
import json
import math
import random
import re

from kit import Doc, lin, rad, rgba, mix, shadow, wrap, FS_MULT, text_width
from common import GOLD, ROSE_GOLD, text_metal, overlay, divider

# ------------------------------------------------------------------ palettes
PAL = {
    "maroon":   dict(name="Royal Maroon", dark=True, bg=("rad", "#9A2236", "#3A0610"), text="#F8E7C9", sub="#E7C9A0", acc="#E9C877", title="gold",
                     cols=["#F77F00", "#FCBF49", "#E9C877", "#D62828", "#FFF3D6"], lant=["#D62828", "#F77F00", "#FCBF49"]),
    "midnight": dict(name="Midnight Gold", dark=True, bg=("rad", "#1F2F66", "#060B1E"), text="#EEE6D3", sub="#C9C2B0", acc="#E9C877", title="gold",
                     cols=["#E9C877", "#F4A261", "#FFFFFF", "#7B8CDE", "#E76F51"], lant=["#F4A261", "#E9C877", "#E76F51"]),
    "plum":     dict(name="Plum Marigold", dark=True, bg=("rad", "#6B1A5C", "#1E0718"), text="#F7E6D8", sub="#E2C4D6", acc="#FCBF49", title="gold",
                     cols=["#FCBF49", "#F77F00", "#FF4D8D", "#FFFFFF", "#9D4EDD"], lant=["#FF4D8D", "#FCBF49", "#F77F00"]),
    "emerald":  dict(name="Emerald", dark=True, bg=("rad", "#167257", "#04261C"), text="#F1EBDA", sub="#CFE3D8", acc="#E9C877", title="gold",
                     cols=["#E9C877", "#FFB703", "#FB8500", "#FFFFFF", "#E63946"], lant=["#E63946", "#FFB703", "#FB8500"]),
    "sunset":   dict(name="Saffron Sunset", dark=True, bg=("lin", "#FF8A00", "#D1006F", "#3F0D6B"), text="#FFF4DE", sub="#FFE0C2", acc="#FFE08A", title="#FFFFFF",
                     cols=["#FFE08A", "#FFFFFF", "#FFB703", "#FF4D8D", "#3F0D6B"], lant=["#FFE08A", "#FFFFFF", "#FFB703"]),
    "ivory":    dict(name="Ivory Gold", dark=False, bg=("rad", "#FFFBF2", "#F3E6CC"), text="#5B2333", sub="#7A4A52", acc="#B8862F", title="gold",
                     cols=["#B8862F", "#E85D04", "#9E2A2B", "#F4A261", "#5B2333"], lant=["#9E2A2B", "#E85D04", "#B8862F"]),
    "blush":    dict(name="Blush Rose", dark=False, bg=("rad", "#FFF3F1", "#F6D6D1"), text="#6B2737", sub="#8A4B57", acc="#C0716B", title="rose",
                     cols=["#C0716B", "#E9A6A0", "#B8862F", "#F2C4BE", "#6B2737"], lant=["#C0716B", "#B8862F", "#E9A6A0"]),
    "noir":     dict(name="Noir Gold", dark=True, bg=("rad", "#2A2118", "#050505"), text="#EDE3CF", sub="#B9AE98", acc="#E2C27A", title="gold",
                     cols=["#E2C27A", "#B68A3A", "#F7E3A3", "#8A6A2E", "#FFFFFF"], lant=["#E2C27A", "#B68A3A", "#F7E3A3"]),
    "teal":     dict(name="Teal Coral", dark=True, bg=("rad", "#13697D", "#062A33"), text="#F2EFE6", sub="#C6E0E3", acc="#FFB38A", title="#FFD7A8",
                     cols=["#FF7F50", "#FFB38A", "#FFE29A", "#FFFFFF", "#2EC4B6"], lant=["#FF7F50", "#FFE29A", "#FFB38A"]),
    "neon":     dict(name="Indigo Glow", dark=True, bg=("rad", "#3D128A", "#12022E"), text="#F3ECFF", sub="#CBB8F2", acc="#FF6FB5", title="#FFFFFF",
                     cols=["#FF6FB5", "#3DD6F5", "#FFD166", "#FFFFFF", "#9B5DE5"], lant=["#FF6FB5", "#3DD6F5", "#FFD166"]),
    "marigold": dict(name="Marigold", dark=False, bg=("lin", "#FFD166", "#FFA41B", "#F47C20"), text="#4A1240", sub="#5E2350", acc="#7A1F5C", title="#4A1240",
                     cols=["#7A1F5C", "#D1006F", "#FFFFFF", "#4A1240", "#FFF1C1"], lant=["#7A1F5C", "#D1006F", "#FFFFFF"]),
    "royal":    dict(name="Royal Blue", dark=True, bg=("rad", "#2C3FC4", "#0B1257"), text="#F2F0FF", sub="#C9CCF5", acc="#FFC857", title="gold",
                     cols=["#FFC857", "#FF5DA2", "#FFFFFF", "#F77F00", "#7FDBFF"], lant=["#FF5DA2", "#FFC857", "#F77F00"]),
}

# type pairings: title family/weight, script?, body family/italic, caps family
TYPE = [
    dict(t="Great Vibes", tw=400, script=True, b="Cormorant Garamond", bi=True, bw=500, c="Cinzel", cw=600),
    dict(t="Parisienne", tw=400, script=True, b="Lora", bi=True, bw=400, c="Montserrat", cw=600),
    dict(t="Playfair Display", tw=700, script=False, b="DM Sans", bi=False, bw=400, c="Montserrat", cw=600),
    dict(t="Cinzel", tw=700, script=False, b="Cormorant Garamond", bi=True, bw=500, c="Montserrat", cw=500),
    dict(t="Allura", tw=400, script=True, b="Raleway", bi=False, bw=400, c="Raleway", cw=600),
    dict(t="DM Serif Display", tw=400, script=False, b="DM Sans", bi=False, bw=400, c="DM Sans", cw=700),
    dict(t="Poppins", tw=700, script=False, b="Poppins", bi=False, bw=400, c="Poppins", cw=600),
    dict(t="Abril Fatface", tw=400, script=False, b="Lato", bi=False, bw=400, c="Lato", cw=700),
]

MSG = [
    "May the glow of a thousand diyas fill your home with joy, peace and prosperity.",
    "Wishing you a Diwali full of light, laughter and sweet moments with the ones you love.",
    "May this festival of lights brighten every corner of your life.",
    "Let every diya you light bring new hope and new beginnings.",
    "May Goddess Lakshmi bless your home with health, wealth and happiness.",
    "Sweets, sparkles and the warmth of family — have a beautiful Diwali.",
    "May your Diwali sparkle with moments of love, laughter and goodwill.",
    "Here’s to light over darkness and joy over everything.",
    "May the lights of Diwali guide you to happiness and success.",
    "Wishing you and your family a bright, safe and joyful Diwali.",
]
CORP_MSG = [
    "Thank you for being part of our journey. May this Diwali bring you prosperity and success.",
    "Wishing our clients, partners and team a bright and prosperous Diwali.",
    "May the festival of lights illuminate new opportunities for you and your business.",
    "Your trust lights our way. Warm Diwali wishes from all of us.",
    "Here’s to a year of growth, light and shared success.",
    "May this Diwali bring abundance, good health and new milestones to you and your family.",
]
SIGN = ["With love, the Sharma family", "Warm wishes, Priya & Arjun", "From the Iyer family", "Love, Ananya", "The Menon family",
        "Rahul, Neha & the kids", "With love, the Kapoors", "Warmly, Meera & Dev", "From our home to yours", "Love & light, the Reddys"]
CO = ["Aurora Technologies", "Sterling & Co. Advisors", "Bluepeak Consulting", "Nova Realty Group", "Lumen Health Clinic",
      "Crescent Logistics", "Zenith Financial Services", "Greenleaf Interiors", "Orbit Digital Studio", "Kaveri Jewellers",
      "Summit Infra Projects", "Pixelcraft Media", "Harbor Legal Partners", "Saffron Hotels", "Vertex Engineering"]
KICK = ["Wishing you a", "Warm wishes", "Festival of lights", "With love & light", "Season’s greetings", "Celebrate the light"]
TITLES = ["Happy Diwali", "Happy Diwali", "Shubh Deepavali", "Happy Deepavali", "Happy Diwali", "Diwali Greetings"]

FAMILY = [386, 1024, 764, 1140, 131, 136, 1009, 168, 1987, 386, 1024, 764]
LIGHTS = [182, 253, 1339, 262, 1027, 1167, 997, 1212]
CORP_PH = [1400, 1289, 943, 1878, 1028]

FORMATS = {
    "post": (1080, 1080, "Instagram Post"), "portrait": (1080, 1350, "Portrait Post"), "story": (1080, 1920, "Story"),
    "card": (1500, 2100, "Greeting Card"), "landscape": (1920, 1080, "Wide Banner"), "linkedin": (1200, 627, "LinkedIn Post"),
    "a5": (1748, 2480, "A5 Card"), "hcard": (2100, 1500, "Folded Card"),
}
PRINT_FMTS = {"card", "a5", "hcard"}


# ------------------------------------------------------------------ helpers
def U(d):
    return min(d.W, d.H) / 1080


def F(d):
    r = d.H / d.W
    if r > 1.6:
        return 1.48
    if r > 1.15:
        return 1.14
    if 1 / r > 1.6:
        return 1.5
    if 1 / r > 1.3:
        return 1.2
    return 1.0


def background(d, P):
    k = P["bg"]
    W, H = d.W, d.H
    if k[0] == "rad":
        d.bg(rad(W / 2, H * 0.42, max(W, H) * 0.8, [(0, k[1]), (1, k[2])]))
    else:
        d.bg(lin(0, 0, W * 0.25, H, [(0, k[1]), (0.55, k[2]), (1, k[3])]))


def glow(d, cx, cy, r, color, a=0.5):
    d.circle(cx, cy, r, rad(r, r, r, [(0, rgba(color, a)), (0.45, rgba(color, a * 0.35)), (1, rgba(color, 0))]), name="Glow")


def gold_fill(t, P):
    if P["title"] == "gold":
        text_metal(None, t, GOLD if P["dark"] else [(0, "#7A5418"), (0.35, "#C99A3E"), (0.6, "#8C6420"), (1, "#B8862F")])
    elif P["title"] == "rose":
        text_metal(None, t, [(0, "#9E4A50"), (0.4, "#D98E86"), (0.7, "#A8565C"), (1, "#C0716B")])


def title_color(P):
    return P["title"] if P["title"].startswith("#") else (P["acc"])


def sparkles(d, P, n, box=None, rng=None):
    rng = rng or d.rng
    W, H = d.W, d.H
    x0, y0, x1, y1 = box or (0, 0, W, H)
    u = U(d)
    col = "#FFFFFF" if P["dark"] else P["acc"]
    for _ in range(n):
        x, y = rng.uniform(x0, x1), rng.uniform(y0, y1)
        if rng.random() < 0.35:
            d.sparkle(x, y, rng.uniform(6, 14) * u, col, opacity=rng.uniform(0.55, 0.95))
        else:
            d.circle(x, y, rng.uniform(1.2, 3.2) * u, col, opacity=rng.uniform(0.3, 0.8), name="Star")


def bokeh(d, P, n, box=None):
    rng = d.rng
    W, H = d.W, d.H
    x0, y0, x1, y1 = box or (0, 0, W, H)
    u = U(d)
    for _ in range(n):
        r = rng.uniform(14, 60) * u
        c = rng.choice(P["cols"][:3])
        d.circle(rng.uniform(x0, x1), rng.uniform(y0, y1), r, rad(r, r, r, [(0, rgba(c, 0.32)), (0.8, rgba(c, 0.12)), (1, rgba(c, 0))]), name="Bokeh")


# ------------------------------------------------------------------ motifs
def diya(d, cx, cy, s, P, flame=True, body=None):
    """Clay diya, s = bowl width; cy = rim line."""
    bcol = body or ("#C2410C" if P["dark"] else "#B4441A")
    if flame:
        glow(d, cx, cy - s * 0.42, s * 1.05, "#FFB347", 0.55)
    # spout + bowl as one teardrop
    bowl = [["M", cx - s * 0.5, cy], ["C", cx - s * 0.48, cy + s * 0.42, cx + s * 0.3, cy + s * 0.44, cx + s * 0.5, cy + s * 0.06],
            ["L", cx + s * 0.66, cy - s * 0.1], ["Q", cx + s * 0.4, cy - s * 0.02, cx - s * 0.5, cy], ["Z"]]
    d.path(bowl, lin(0, 0, s * 1.2, s * 0.5, [(0, mix(bcol, "#000000", 0.25)), (0.5, bcol), (1, mix(bcol, "#FFD08A", 0.35))]), name="Diya")
    d.ellipse(cx, cy, s * 0.5, s * 0.075, mix(bcol, "#3A0A00", 0.45), name="Diya rim")
    for i in range(7):
        t = (i + 1) / 8
        x = cx - s * 0.42 + s * 0.8 * t
        y = cy + s * 0.17 + math.sin(t * math.pi) * s * 0.06
        d.circle(x, y, s * 0.028, "#FFD27A", name="Diya dot")
    if flame:
        f = [["M", cx, cy - s * 0.78], ["C", cx + s * 0.17, cy - s * 0.46, cx + s * 0.15, cy - s * 0.12, cx, cy - s * 0.08],
             ["C", cx - s * 0.15, cy - s * 0.12, cx - s * 0.17, cy - s * 0.46, cx, cy - s * 0.78], ["Z"]]
        d.path(f, lin(0, 0, 0, s * 0.7, [(0, "#FFF7C2"), (0.45, "#FFC93C"), (1, "#FF6A00")]), name="Flame")
        g = [["M", cx, cy - s * 0.5], ["C", cx + s * 0.07, cy - s * 0.34, cx + s * 0.07, cy - s * 0.16, cx, cy - s * 0.14],
             ["C", cx - s * 0.07, cy - s * 0.16, cx - s * 0.07, cy - s * 0.34, cx, cy - s * 0.5], ["Z"]]
        d.path(g, "#FFFDF0", name="Flame core")


def rangoli(d, cx, cy, R, cols, style=0):
    if style == 0:
        for k, col in enumerate(cols[:4]):
            r = R * (1 - k * 0.2)
            n = 8 + k * 4
            for i in range(n):
                a = 2 * math.pi * i / n + k * 0.25
                d.leaf(cx + r * 0.27 * math.cos(a), cy + r * 0.27 * math.sin(a), r * 0.72, r * 0.2, math.degrees(a), col)
        d.circle(cx, cy, R * 0.17, cols[-1])
        d.circle(cx, cy, R * 0.09, cols[0])
    elif style == 1:  # mandala: dotted rings + petals
        d.circle(cx, cy, R, "", stroke=cols[0], sw=R * 0.012, dash=[R * 0.02, R * 0.03], name="Ring")
        for i in range(36):
            a = 2 * math.pi * i / 36
            d.circle(cx + R * 0.93 * math.cos(a), cy + R * 0.93 * math.sin(a), R * 0.022, cols[1])
        for i in range(16):
            a = 2 * math.pi * i / 16
            d.leaf(cx + R * 0.52 * math.cos(a), cy + R * 0.52 * math.sin(a), R * 0.5, R * 0.17, math.degrees(a), cols[2] if i % 2 else cols[3])
        d.circle(cx, cy, R * 0.34, cols[4] if len(cols) > 4 else cols[0])
        for i in range(8):
            a = 2 * math.pi * i / 8 + math.pi / 8
            d.leaf(cx + R * 0.17 * math.cos(a), cy + R * 0.17 * math.sin(a), R * 0.3, R * 0.12, math.degrees(a), cols[0])
        d.circle(cx, cy, R * 0.08, cols[1])
    else:  # lotus star
        for k, col in enumerate(cols[:3]):
            n = 8
            r = R * (1 - k * 0.27)
            for i in range(n):
                a = 2 * math.pi * i / n + (math.pi / n if k % 2 else 0)
                d.leaf(cx + r * 0.3 * math.cos(a), cy + r * 0.3 * math.sin(a), r * 0.66, r * 0.34, math.degrees(a), col)
        d.circle(cx, cy, R * 0.2, cols[3], stroke=cols[0], sw=R * 0.02)
        for i in range(12):
            a = 2 * math.pi * i / 12
            d.circle(cx + R * 1.05 * math.cos(a), cy + R * 1.05 * math.sin(a), R * 0.03, cols[0])


def lantern(d, cx, top, cy, s, col, gold="#E9C877", style=0):
    """Hanging sky lantern: string from top to body centred at cy."""
    d.line(cx, top, cx, cy - s * 0.62, gold, max(1, s * 0.02), opacity=0.8, name="String")
    glow(d, cx, cy, s * 1.1, col, 0.4)
    if style == 0:
        pts = [(cx - s * 0.3, cy - s * 0.5), (cx + s * 0.3, cy - s * 0.5), (cx + s * 0.5, cy), (cx + s * 0.3, cy + s * 0.5), (cx - s * 0.3, cy + s * 0.5), (cx - s * 0.5, cy)]
        d.polygon(pts, col, name="Lantern")
        inner = [(cx - s * 0.17, cy - s * 0.38), (cx + s * 0.17, cy - s * 0.38), (cx + s * 0.3, cy), (cx + s * 0.17, cy + s * 0.38), (cx - s * 0.17, cy + s * 0.38), (cx - s * 0.3, cy)]
        d.polygon(inner, mix(col, "#FFF4C2", 0.55), name="Lantern light")
        d.line(cx - s * 0.5, cy, cx + s * 0.5, cy, gold, s * 0.03)
    else:
        d.ellipse(cx, cy, s * 0.42, s * 0.5, col, name="Lantern")
        for k in (-0.26, 0, 0.26):
            d.ellipse(cx + k * s * 0.4, cy, s * 0.42 * (1 - abs(k) * 2.2) if k else s * 0.06, s * 0.5, "", stroke=mix(col, "#000000", 0.25), sw=s * 0.02)
        d.ellipse(cx, cy, s * 0.2, s * 0.3, mix(col, "#FFF4C2", 0.55), opacity=0.8, name="Lantern light")
    d.rect(cx - s * 0.2, cy - s * 0.62, s * 0.4, s * 0.12, gold, rx=s * 0.03, name="Cap")
    d.rect(cx - s * 0.2, cy + s * 0.5, s * 0.4, s * 0.1, gold, rx=s * 0.03, name="Cap")
    for k in range(-2, 3):
        d.line(cx + k * s * 0.07, cy + s * 0.6, cx + k * s * 0.09, cy + s * 1.0, col, max(1, s * 0.025), name="Tassel")


def toran(d, P, y=0, s=1.0, strands=True):
    """Marigold garland across the top with hanging strands."""
    W = d.W
    u = U(d) * s
    leaf_cols = ["#2D6A4F", "#40916C", "#1B4332"]
    n_sw = max(3, round(W / (300 * u)))
    pts = [W * i / n_sw for i in range(n_sw + 1)]
    b = 15 * u
    for i in range(n_sw):
        x0, x1 = pts[i], pts[i + 1]
        sag = (x1 - x0) * 0.28
        steps = int((x1 - x0) / (b * 1.5))
        for k in range(steps + 1):
            t = k / steps
            x = x0 + (x1 - x0) * t
            yy = y + 18 * u + 4 * sag * t * (1 - t)
            d.circle(x, yy, b, "#F77F00" if k % 2 else "#FCBF49", name="Marigold")
            d.circle(x, yy, b * 0.35, "#E85D04" if k % 2 else "#F48C06", opacity=0.8, name="Marigold")
    for x in pts:
        for j, a in enumerate((-35, 0, 35)):
            d.leaf(x + math.sin(math.radians(a)) * 22 * u, y + 20 * u + 18 * u, 58 * u, 18 * u, 90 + a, leaf_cols[j % 3])
        if strands:
            L = 5 + (int(x) % 3)
            for k in range(L):
                d.circle(x, y + 40 * u + k * b * 1.7, b * 0.9, "#FCBF49" if k % 2 else "#F77F00", name="Marigold")
            d.circle(x, y + 40 * u + L * b * 1.7 + 4 * u, b * 0.7, "#E9C877", name="Bell")


def burst(d, cx, cy, r, col, n=18, sw=None, rng=None):
    rng = rng or d.rng
    sw = sw or max(1.5, r * 0.025)
    for i in range(n):
        a = 2 * math.pi * i / n + rng.uniform(-0.05, 0.05)
        L = r * rng.uniform(0.7, 1.0)
        d.line(cx + r * 0.22 * math.cos(a), cy + r * 0.22 * math.sin(a), cx + L * math.cos(a), cy + L * math.sin(a), col, sw, opacity=0.9, name="Firework")
        d.circle(cx + (L + sw * 3) * math.cos(a), cy + (L + sw * 3) * math.sin(a), sw * 1.1, col, name="Firework")
    d.sparkle(cx, cy, r * 0.16, "#FFFFFF")


def ogee(x, y, w, h):
    """Mughal (ogee) arch outline: apex at (x+w/2, y), base at y+h."""
    return [["M", x, y + h], ["L", x, y + h * 0.36],
            ["C", x, y + h * 0.16, x + w * 0.34, y + h * 0.16, x + w * 0.44, y + h * 0.05], ["Q", x + w * 0.49, y + h * 0.02, x + w * 0.5, y],
            ["Q", x + w * 0.51, y + h * 0.02, x + w * 0.56, y + h * 0.05], ["C", x + w * 0.66, y + h * 0.16, x + w, y + h * 0.16, x + w, y + h * 0.36],
            ["L", x + w, y + h], ["Z"]]


def corner_rangoli(d, P, R=None):
    R = R or min(d.W, d.H) * 0.2
    for cx, cy in ((0, 0), (d.W, 0), (0, d.H), (d.W, d.H)):
        rangoli(d, cx, cy, R, P["cols"], 1)


def border(d, P, inset=None, double=True):
    u = U(d)
    inset = inset or 34 * u
    d.frame_border(inset, P["acc"], 2 * u, double=10 * u if double else 0, opacity=0.85)


# ------------------------------------------------------------------ text block
def words(d, P, T, C, x, w, top=None, center=None, bottom=None, align="center", scale=1.0, title_max=None, with_kicker=True, rule=True):
    if d.W / d.H > 1.3:
        scale = max(scale, 0.95)
    u = U(d) * scale * F(d)
    title = C["title"]
    script = T["script"]
    tsz = 10
    if title:
      tsz = d.fit(title.replace("\n", " ") if script else title.split("\n")[0] if "\n" in title else title, w, T["t"], title_max or (190 * u if script else 120 * u), T["tw"], upper=not script and T["t"] in ("Cinzel",))
    if title and not script and "\n" in title:
        tsz = min(d.fit(l, w, T["t"], title_max or 150 * u, T["tw"]) for l in title.split("\n"))
    blocks = []
    if with_kicker and C.get("kicker"):
        blocks += [dict(text=C["kicker"], family=T["c"], size=24 * u, color=P["acc"], weight=T["cw"], spacing=320, upper=True), ("gap", 18 * u)]
    blocks.append(dict(text=title, family=T["t"], size=tsz, color=title_color(P), weight=T["tw"], lh=1.0 if script else 1.05, upper=T["t"] == "Cinzel", name="Title"))
    if rule:
        blocks += [("gap", 22 * u), ("obj", 4 * u, lambda yy: divider(d, x + w / 2 if align == "center" else x + 60 * u, yy, 120 * u, P["acc"], 1.5 * u, gap=9 * u)), ("gap", 24 * u)]
    else:
        blocks.append(("gap", 26 * u))
    if C.get("msg"):
        blocks.append(dict(text=C["msg"], family=T["b"], size=(36 if T["bi"] else 31) * u, color=P["text"], italic=T["bi"], weight=T["bw"], lh=1.38, w=w * 0.92 if align == "center" else w))
    if C.get("sign"):
        blocks += [("gap", 26 * u), dict(text=C["sign"], family=T["c"], size=20 * u, color=P["acc"], weight=T["cw"], spacing=220, upper=True)]
    if not title:
        blocks = [b for b in blocks if not (isinstance(b, dict) and b.get('name') == 'Title')]
    out, _tot = d.stack(blocks, x, w, top=top, bottom=bottom, center_y=center, align=align)
    for t in out:
        if t.get("name") == "Title":
            gold_fill(t, P)
            if P["dark"]:
                t["shadow"] = shadow("rgba(0,0,0,0.35)", 18 * u, 0, 4 * u)
    return out


def text_zone(d):
    """(x, w, center_y) for the text below/next to the hero."""
    W, H = d.W, d.H
    if W / H > 1.3:
        return W * 0.5, W * 0.44, H * 0.5
    if H / W > 1.6:
        return W * 0.1, W * 0.8, H * 0.7
    if H / W > 1.15:
        return W * 0.1, W * 0.8, H * 0.73
    return W * 0.1, W * 0.8, H * 0.735


def hero_zone(d):
    W, H = d.W, d.H
    if W / H > 1.3:
        return W * 0.26, H * 0.5, H * 0.34
    if H / W > 1.6:
        return W / 2, H * 0.34, W * 0.34
    if H / W > 1.15:
        return W / 2, H * 0.34, W * 0.27
    return W / 2, H * 0.32, W * 0.215


# ------------------------------------------------------------------ heroes
def hero(d, P, kind, cx, cy, R, style=0):
    u = U(d)
    if kind == "mandala":
        glow(d, cx, cy, R * 1.4, P["cols"][0], 0.25 if P["dark"] else 0.18)
        rangoli(d, cx, cy, R, P["cols"], style % 3)
    elif kind == "diyas":
        glow(d, cx, cy, R * 1.5, "#FFB347", 0.18)
        rangoli(d, cx, cy - R * 0.1, R * 0.95, P["cols"], 1)
        for k, (dx, sc) in enumerate(((-0.62, 0.42), (0, 0.55), (0.62, 0.42))):
            diya(d, cx + dx * R, cy + R * 0.78 - (0.05 * R if k == 1 else 0), R * sc, P)
    elif kind == "diya":
        rangoli(d, cx, cy + R * 0.2, R * 0.95, P["cols"], style % 3)
        diya(d, cx, cy + R * 0.3, R * 0.75, P)
    elif kind == "lanterns":
        cols = P["lant"]
        for k, (dx, dy, sc) in enumerate(((-0.75, 0.05, 0.36), (0, 0.3, 0.5), (0.75, -0.05, 0.36))):
            lantern(d, cx + dx * R, cy - R * 2.2, cy + dy * R, R * sc, cols[k % len(cols)], P["acc"], style % 2)
    elif kind == "fireworks":
        cols = P["cols"]
        burst(d, cx, cy, R * 0.7, cols[0], 22)
        burst(d, cx - R * 0.85, cy + R * 0.35, R * 0.42, cols[1], 16)
        burst(d, cx + R * 0.85, cy - R * 0.25, R * 0.48, cols[2] if P["dark"] else cols[4], 16)
        diya(d, cx, cy + R * 0.78, R * 0.3, P)
    elif kind == "lotus":
        glow(d, cx, cy, R * 1.3, P["cols"][1], 0.3)
        d.circle(cx, cy, R, "", stroke=P["acc"], sw=2 * u)
        d.circle(cx, cy, R * 0.92, "", stroke=P["acc"], sw=1 * u, dash=[3 * u, 7 * u])
        d.art("lotus", cx, cy - R * 0.08, R * 1.25)
        diya(d, cx - R * 0.78, cy + R * 0.72, R * 0.36, P)
        diya(d, cx + R * 0.78, cy + R * 0.72, R * 0.36, P)
    elif kind == "arch":
        w, h = R * 1.5, R * 2.0
        d.path(ogee(cx - w / 2, cy - h / 2, w, h), rgba(P["acc"], 0.08), stroke=P["acc"], sw=3 * u, name="Arch")
        d.path(ogee(cx - w / 2 + 16 * u, cy - h / 2 + 22 * u, w - 32 * u, h - 38 * u), "", stroke=P["acc"], sw=1.2 * u, name="Arch")
        rangoli(d, cx, cy + h * 0.06, w * 0.3, P["cols"], 2)
        diya(d, cx, cy + h * 0.36, w * 0.3, P)
        d.line(cx - w / 2 - 30 * u, cy + h / 2, cx + w / 2 + 30 * u, cy + h / 2, P["acc"], 2 * u)
    elif kind == "photo":
        n = LIGHTS[style % len(LIGHTS)]
        d.circle(cx, cy, R * 1.07, "", stroke=P["acc"], sw=3 * u)
        d.circle(cx, cy, R * 1.14, "", stroke=P["acc"], sw=1 * u, dash=[2 * u, 8 * u])
        d.photo(n, cx - R, cy - R, 2 * R, 2 * R, frame="circle")
        d.art("diya-lamp", cx + R * 0.78, cy + R * 0.78, R * 0.5)
    elif kind == "gift":
        glow(d, cx, cy, R * 1.3, P["acc"], 0.3)
        rangoli(d, cx, cy, R * 0.95, P["cols"], 1)
        d.art("wrapped-gift", cx, cy, R * 0.95)
        d.art("sparkles", cx + R * 0.6, cy - R * 0.6, R * 0.4)


def page(d, P, decor, rng):
    background(d, P)
    W, H = d.W, d.H
    u = U(d)
    if P["dark"]:
        sparkles(d, P, int(40 * W * H / 1080 / 1080) + 10)
    if "bokeh" in decor:
        bokeh(d, P, 14)
    if "dots" in decor:
        d.dots(0, 0, W, H, 34 * u, 1.6 * u, P["acc"], opacity=0.18)
    if "corners" in decor:
        corner_rangoli(d, P)
    if "border" in decor:
        border(d, P)


# ------------------------------------------------------------------ layouts
def L_classic(d, P, T, C, o):
    """Hero motif above (or beside) the greeting."""
    page(d, P, o.get("decor", ()), d.rng)
    if "toran" in o.get("decor", ()):
        toran(d, P, 0, 0.9 if d.W < 1300 else 1.1, strands=d.H / d.W > 1.15)
    cx, cy, R = hero_zone(d)
    if "toran" in o.get("decor", ()) and d.W / d.H <= 1.3:
        cy += R * 0.15
    hero(d, P, o["hero"], cx, cy, R, o.get("style", 0))
    x, w, ty = text_zone(d)
    words(d, P, T, C, x, w, center=ty, align="center", scale=o.get("ts", 1.0))


def L_lantern_sky(d, P, T, C, o):
    page(d, P, (), d.rng)
    W, H = d.W, d.H
    u = U(d)
    n = 5 if W >= H else 4
    cols = P["lant"]
    for i in range(n):
        x = W * (i + 0.5) / n
        L = H * (0.18 + 0.12 * ((i * 7) % 3)) * (0.75 if W > H else 1)
        lantern(d, x, -10, L, 70 * u * F(d) * (1.15 if i % 2 else 0.95), cols[i % len(cols)], P["acc"], o.get("style", 0))
    if W / H > 1.3:
        words(d, P, T, C, W * 0.15, W * 0.7, center=H * 0.68, scale=0.85)
    else:
        words(d, P, T, C, W * 0.1, W * 0.8, center=H * 0.68)
    for k, x in enumerate((0.12, 0.88)):
        diya(d, W * x, H * 0.93, 90 * u, P)


def L_typo(d, P, T, C, o):
    """Bold type: giant DIWALI with an outlined echo."""
    page(d, P, ("dots",) if not P["dark"] else (), d.rng)
    W, H = d.W, d.H
    u = U(d)
    fam = o.get("fam", "Anton")
    word = "DIWALI"
    size = d.fit(word, W * 0.86, fam, 400 * u, 400, spacing=60)
    yc = H * 0.46
    hh = size * FS_MULT
    d.text(0, yc - hh * 0.5 - hh * 0.62, W, word, fam, size, "", align="center", spacing=60, stroke=P["acc"], sw=2 * u, opacity=0.55)
    t = d.text(0, yc - hh * 0.5, W, word, fam, size, title_color(P), align="center", spacing=60, name="Title")
    if P["title"] == "gold":
        gold_fill(t, P)
    d.text(0, yc + hh * 0.62 - hh * 0.5, W, word, fam, size, "", align="center", spacing=60, stroke=P["acc"], sw=2 * u, opacity=0.3)
    d.text(0, yc - hh * 0.5 - hh * 0.62 - 80 * u, W, C.get("kicker") or "Happy", T["t"] if T["script"] else "Great Vibes", 92 * u, P["text"], align="center")
    words(d, P, T, dict(title="", msg=C["msg"], sign=C.get("sign")), W * 0.14, W * 0.72, top=yc + hh * 1.2 + 40 * u, scale=0.9, with_kicker=False, rule=False) if C.get("msg") else None
    if not C.get("msg"):
        diya(d, W * 0.5, H - 110 * u * F(d), 110 * u * F(d), P)


def L_minimal(d, P, T, C, o):
    """Quiet, premium: thin gold line diya and lots of space."""
    background(d, P)
    W, H = d.W, d.H
    u = U(d)
    border(d, P, 48 * u, double=False)
    cx, cy = W / 2, H * (0.3 if H >= W else 0.34)
    s = 150 * u * F(d)
    col = P["acc"]
    d.path([["M", cx - s * 0.5, cy], ["C", cx - s * 0.45, cy + s * 0.42, cx + s * 0.45, cy + s * 0.42, cx + s * 0.5, cy], ["Z"]], "", stroke=col, sw=2.5 * u, name="Line diya")
    d.path([["M", cx, cy - s * 0.62], ["C", cx + s * 0.15, cy - s * 0.38, cx + s * 0.12, cy - s * 0.1, cx, cy - s * 0.08], ["C", cx - s * 0.12, cy - s * 0.1, cx - s * 0.15, cy - s * 0.38, cx, cy - s * 0.62], ["Z"]], "", stroke=col, sw=2.5 * u, name="Line flame")
    for k in range(5):
        a = math.radians(-90 + (k - 2) * 28)
        d.line(cx + math.cos(a) * s * 0.78, cy - s * 0.35 + math.sin(a) * s * 0.78 + s * 0.35 - s * 0.35, cx + math.cos(a) * s * 0.98, cy - s * 0.35 + math.sin(a) * s * 0.98, col, 2 * u)
    if W / H > 1.3:
        words(d, P, T, C, W * 0.2, W * 0.6, center=H * 0.66, scale=0.8)
    else:
        words(d, P, T, C, W * 0.14, W * 0.72, center=H * (0.66 if H / W < 1.6 else 0.6))


def L_photo_full(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d)
    d.bg("#000000")
    d.photo(o["photo"], -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, name="Photo")
    overlay(d, 0.15, 0.85, "#0B0610")
    border(d, dict(P, acc=P["acc"]), 36 * u)
    words(d, dict(P, dark=True, text="#FFF4E2"), T, C, W * 0.12, W * 0.76, bottom=H * (0.88 if H > W else 0.86))


def L_split(d, P, T, C, o):
    """Photo on one side, greeting on the other."""
    W, H = d.W, d.H
    u = U(d)
    background(d, P)
    if W >= H * 1.05:
        pw = W * 0.46
        d.photo(o["photo"], -d.bleed, -d.bleed, pw + d.bleed, H + 2 * d.bleed)
        d.rect(pw - 3 * u, 0, 6 * u, H, P["acc"], name="Rule")
        if P["dark"]:
            sparkles(d, P, 20, (pw, 0, W, H))
        words(d, P, T, C, pw + W * 0.06, W - pw - W * 0.12, center=H / 2, scale=0.82 if W / H < 1.6 else 0.72)
        rangoli(d, W, H, H * 0.24, P["cols"], 1)
    else:
        ph = H * 0.5
        d.photo(o["photo"], -d.bleed, -d.bleed, W + 2 * d.bleed, ph + d.bleed)
        d.wave(-d.bleed, W + d.bleed, ph, 18 * u, 180 * u, fill=d.objs[0]["fill"], bottom=H + d.bleed)
        d.circle(W / 2, ph, 74 * u, d.objs[0]["fill"], stroke=P["acc"], sw=3 * u)
        diya(d, W / 2, ph + 22 * u, 80 * u, P)
        words(d, P, T, C, W * 0.1, W * 0.8, center=ph + (H - ph) * 0.55, scale=0.9)


def L_arch_photo(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d)
    page(d, P, ("dots",), d.rng)
    if W / H > 1.3:
        aw, ah = H * 0.62, H * 0.82
        ax, ay = W * 0.1, (H - ah) / 2
        tx, tw, ty = W * 0.48, W * 0.46, H / 2
    else:
        aw = W * 0.62
        ah = aw * 1.25
        ax, ay = (W - aw) / 2, H * (0.07 if H / W < 1.6 else 0.1)
        tx, tw, ty = W * 0.1, W * 0.8, ay + ah + (H - ay - ah) * 0.5
    d.path(ogee(ax - 14 * u, ay - 18 * u, aw + 28 * u, ah + 18 * u), P["acc"], name="Arch")
    d.photo(o["photo"], ax, ay, aw, ah, frame="arch", name="Photo")
    for x in (ax - 14 * u, ax + aw + 14 * u):
        d.circle(x, ay + ah * 0.36, 9 * u, P["acc"])
    diya(d, ax + aw / 2, ay + ah + 6 * u, 90 * u, P)
    words(d, P, T, C, tx, tw, center=ty, scale=0.78 if H / W < 1.15 else 0.9)


def L_corporate(d, P, T, C, o):
    """Formal company greeting: logo slot, greeting, message, company sign-off."""
    W, H = d.W, d.H
    u = U(d)
    background(d, P)
    variant = o.get("v", 0)
    if P["dark"]:
        sparkles(d, P, 18)
    # logo slot
    lx, ly = (W * 0.08, H * 0.08) if variant != 1 else (W / 2, H * 0.09)
    u = u * F(d)
    logo_w, logo_h = 220 * u, 64 * u
    lxx = lx if variant != 1 else lx - logo_w / 2
    d.rect(lxx, ly, logo_w, logo_h, "", rx=10 * u, stroke=P["acc"], sw=1.5 * u, dash=[6 * u, 6 * u], name="Logo area")
    d.text(lxx, ly + logo_h / 2 - 12 * u, logo_w, "YOUR LOGO", "Montserrat", 18 * u, P["acc"], weight=700, align="center", spacing=300)
    co = C["company"]
    if variant == 0:  # left-aligned, rangoli on the right edge
        rr = min(W, H) * 0.34
        rangoli(d, W, H, rr, P["cols"], 1)
        d.circle(W, H, rr * 1.12, "", stroke=P["acc"], sw=1.5 * u)
        d.circle(W, 0, rr * 0.6, "", stroke=P["acc"], sw=1.5 * u, dash=[3 * u, 8 * u])
        tw = W * (0.5 if W > H else 0.72)
        words(d, P, T, dict(C, sign=None), W * 0.08, tw, center=H * 0.5, align="left", scale=0.85 if W > H else 0.95)
        d.rect(W * 0.08, H * 0.86, 60 * u, 3 * u, P["acc"])
        d.text(W * 0.08, H * 0.875, W * 0.6, co, T["c"], 26 * u, P["text"], weight=T["cw"], spacing=120)
    elif variant == 1:  # centred, arch window
        cx, cy, R = W / 2, H * 0.36, min(W, H) * 0.17
        if W / H > 1.3:
            cx, cy, R = W * 0.25, H * 0.55, H * 0.24
        hero(d, P, "arch", cx, cy, R, 0)
        if W / H > 1.3:
            words(d, P, T, dict(C, sign=co), W * 0.48, W * 0.44, center=H * 0.55, scale=0.75)
        else:
            words(d, P, T, dict(C, sign=co), W * 0.1, W * 0.8, center=H * 0.73, scale=0.9)
    else:  # band header
        bh = H * 0.13
        d.rect(-d.bleed, H - bh, W + 2 * d.bleed, bh + d.bleed, P["acc"], name="Band")
        d.text(0, H - bh / 2 - 16 * u, W, co, "Montserrat", 26 * u, "#FFFFFF" if not P["dark"] else "#1A1208", weight=700, align="center", spacing=200, upper=True)
        cx, cy, R = hero_zone(d)
        if W / H > 1.3:
            hero(d, P, o.get("hero", "diyas"), W * 0.24, H * 0.46, H * 0.27, 1)
            words(d, P, T, dict(C, sign=None), W * 0.48, W * 0.44, center=H * 0.44, scale=0.72)
        else:
            hero(d, P, o.get("hero", "diyas"), cx, cy, R * 0.85, 1)
            words(d, P, T, dict(C, sign=None), W * 0.1, W * 0.8, center=H * 0.68, scale=0.88)


def L_collage(d, P, T, C, o):
    """Photo grid with a festive header."""
    W, H = d.W, d.H
    u = U(d)
    page(d, P, (), d.rng)
    photos = o["photos"]
    n = len(photos)
    g = 14 * u
    m = 50 * u
    head = H * (0.24 if H / W < 1.15 else 0.2 if H / W < 1.6 else 0.17)
    if W / H > 1.3:
        head = 0
    top = m + head
    if W / H > 1.3:
        area = (W * 0.42, m, W - m, H - m)
    else:
        area = (m, top, W - m, H - m - (70 * u if H / W > 1.15 else 40 * u))
    x0, y0, x1, y1 = area
    aw, ah = x1 - x0, y1 - y0
    cells = grid_cells(n, x0, y0, aw, ah, g, o.get("g", 0))
    for (cx, cy, cw, ch), ph in zip(cells, photos):
        d.rect(cx - 6 * u, cy - 6 * u, cw + 12 * u, ch + 12 * u, "#FFFFFF" if not P["dark"] else rgba(P["acc"], 0.9), rx=6 * u, shadow_=shadow("rgba(0,0,0,0.25)", 18 * u, 0, 6 * u), name="Photo mat")
        d.photo(ph, cx, cy, cw, ch, frame="rounded", rx=4 * u)
    if W / H > 1.3:
        toran(d, P, 0, 0.8, strands=False)
        words(d, P, T, C, W * 0.05, W * 0.33, center=H * 0.55, scale=0.72)
    else:
        toran(d, P, 0, 0.75, strands=False)
        words(d, P, T, dict(C, msg=None), m, W - 2 * m, center=m + head * 0.62, scale=0.62 if H / W < 1.15 else 0.72, title_max=150 * u)
        if H / W > 1.15 and C.get("msg"):
            d.text(m, H - m - 40 * u, W - 2 * m, C["msg"], T["b"], 26 * u, P["text"], italic=T["bi"], align="center")
        for x in (m + 20 * u, W - m - 20 * u):
            pass


def grid_cells(n, x0, y0, w, h, g, var=0):
    if n == 2:
        if w > h:
            return [(x0, y0, (w - g) / 2, h), (x0 + (w + g) / 2, y0, (w - g) / 2, h)]
        return [(x0, y0, w, (h - g) / 2), (x0, y0 + (h + g) / 2, w, (h - g) / 2)]
    if n == 3:
        if var == 0:
            lw = (w - g) * 0.58
            return [(x0, y0, lw, h), (x0 + lw + g, y0, w - lw - g, (h - g) / 2), (x0 + lw + g, y0 + (h + g) / 2, w - lw - g, (h - g) / 2)]
        th = (h - g) * 0.58
        return [(x0, y0, w, th), (x0, y0 + th + g, (w - g) / 2, h - th - g), (x0 + (w + g) / 2, y0 + th + g, (w - g) / 2, h - th - g)]
    if n == 4:
        cw, ch = (w - g) / 2, (h - g) / 2
        return [(x0 + i % 2 * (cw + g), y0 + i // 2 * (ch + g), cw, ch) for i in range(4)]
    if n == 5:
        th = (h - g) * 0.5
        cw = (w - g) / 2
        bw = (w - 2 * g) / 3
        return [(x0, y0, cw, th), (x0 + cw + g, y0, cw, th)] + [(x0 + i * (bw + g), y0 + th + g, bw, h - th - g) for i in range(3)]
    if n == 6:
        if h >= w:
            cw, ch = (w - g) / 2, (h - 2 * g) / 3
            return [(x0 + i % 2 * (cw + g), y0 + i // 2 * (ch + g), cw, ch) for i in range(6)]
        cw, ch = (w - 2 * g) / 3, (h - g) / 2
        return [(x0 + i % 3 * (cw + g), y0 + i // 3 * (ch + g), cw, ch) for i in range(6)]
    raise ValueError(n)


def L_polaroid(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d)
    page(d, P, ("bokeh",), d.rng)
    rng = random.Random(o.get("seed", 1))
    photos = o["photos"]
    caps = o.get("caps", ["lighting diyas", "rangoli time", "sweet treats", "family pooja", "sparklers!", "together"])
    # string lights
    sy = H * (0.1 if H > W else 0.12)
    d.path([["M", -20, sy], ["Q", W / 2, sy + 90 * u, W + 20, sy]], "", stroke=P["acc"], sw=2 * u, name="String")
    for i in range(14):
        t = (i + 0.5) / 14
        x = -20 + (W + 40) * t
        y = sy + 2 * (1 - t) * t * 90 * u * 2 * 0.5 * 2
        c = P["cols"][i % 3]
        glow(d, x, y + 12 * u, 26 * u, c, 0.55)
        d.ellipse(x, y + 12 * u, 7 * u, 11 * u, mix(c, "#FFFFFF", 0.35))
    n = len(photos)
    if H / W > 1.6:
        slots = [(0.3, 0.3), (0.7, 0.36), (0.32, 0.56), (0.7, 0.62)][:n]
        pw = W * 0.4
    elif H / W > 1.1:
        slots = [(0.28, 0.32), (0.72, 0.34), (0.3, 0.64), (0.72, 0.64)][:n]
        pw = W * 0.38
    else:
        slots = [(0.24, 0.42), (0.5, 0.38), (0.76, 0.43)][:n]
        pw = W * 0.28
    for k, ((fx, fy), ph) in enumerate(zip(slots, photos)):
        ang = rng.uniform(-7, 7)
        cx, cy = W * fx, H * fy
        fw, fh = pw, pw * 1.18
        grp_x, grp_y = cx - fw / 2, cy - fh / 2
        d.rect(cx, cy, fw, fh, "#FFFFFF", origin_center=True, angle=ang, shadow_=shadow("rgba(0,0,0,0.35)", 22 * u, 0, 8 * u), name="Polaroid")
        inner = fw * 0.88
        o_ = d.photo(ph, cx - inner / 2, cy - fh / 2 + fw * 0.06, inner, inner)
        # rotate photo about the frame centre
        o_.update(originX="center", originY="center", left=cx + math.sin(math.radians(-ang)) * 0 + (-(fh / 2 - fw * 0.06 - inner / 2)) * -math.sin(math.radians(ang)),
                  top=cy - (fh / 2 - fw * 0.06 - inner / 2) * math.cos(math.radians(ang)), angle=ang)
        cap_y = fh / 2 - fw * 0.11
        t = d.text(cx - fw / 2, cy + cap_y - 22 * u, fw, caps[k % len(caps)], "Caveat", 34 * u, "#3A2A2A", align="center")
        t.update(originX="center", originY="center", left=cx - math.sin(math.radians(ang)) * cap_y, top=cy + math.cos(math.radians(ang)) * cap_y, angle=ang)
        d.rect(cx + math.sin(math.radians(ang)) * fh / 2 * 1, cy - math.cos(math.radians(ang)) * fh / 2, 70 * u, 22 * u, rgba(P["acc"], 0.75), origin_center=True, angle=ang + rng.uniform(-12, 12), name="Tape")
    words(d, P, T, dict(C, sign=None, kicker=None), W * 0.08, W * 0.84, center=H * (0.86 if H > W * 1.1 else 0.82), scale=0.7 if H <= W * 1.1 else 0.8, title_max=150 * U(d), rule=False)


def L_invite(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d)
    page(d, P, ("border",) if o.get("border", True) else (), d.rng)
    toran(d, P, 0, 0.85, strands=False)
    u2 = u * F(d) * (0.9 if H / W < 1.2 else 1)
    cx, cy = W / 2, H * (0.25 if H / W > 1.15 else 0.3)
    if W / H > 1.3:
        cx, cy = W * 0.24, H * 0.55
    burst(d, cx - 160 * u2, cy - 40 * u2, 90 * u2, P["cols"][0])
    burst(d, cx + 170 * u2, cy - 60 * u2, 110 * u2, P["cols"][1])
    burst(d, cx, cy - 120 * u2, 70 * u2, P["cols"][2])
    diya(d, cx, cy + 90 * u2, 150 * u2, P)
    det = C["details"]
    blocks_x, blocks_w = (W * 0.1, W * 0.8) if W / H <= 1.3 else (W * 0.46, W * 0.48)
    top = cy + 180 * u2 if W / H <= 1.3 else H * 0.18
    words(d, P, T, dict(C, msg=C.get("msg"), sign=None), blocks_x, blocks_w, top=top, scale=0.85 if H / W < 1.6 else 1.0)
    last = d.objs[-1]
    y = last["top"] + last["_h"] + 36 * u
    for i, line in enumerate(det):
        uu = u * F(d)
        fam, sz, wgt, col, sp = (T["c"], 26 * uu, T["cw"], P["acc"], 160) if i == 0 else (T["b"], 28 * uu, 500, P["text"], 0)
        t = d.text(blocks_x, y, blocks_w, line, fam, sz, col, weight=wgt, align="center", spacing=sp, upper=i == 0)
        y += t["_h"] + 14 * u
    if C.get("rsvp"):
        from common import pill
        pill(d, blocks_x + blocks_w / 2, min(y + 40 * u, H - 90 * u), C["rsvp"], "Montserrat", 20 * u * F(d), "#1A1208" if P["dark"] else "#FFFFFF", P["acc"])


def L_sale(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d) * F(d)
    page(d, P, ("bokeh",), d.rng)
    cols = P["lant"]
    n = 3
    for i in range(n):
        x = W * (0.15 + 0.35 * i)
        lantern(d, x, -10, H * (0.14 + 0.05 * (i % 2)), 64 * u, cols[i % 3], P["acc"], i % 2)
    from common import pill
    big = C["offer"]
    fam = o.get("fam", "Anton")
    kick = C.get("kicker", "Diwali Sale")
    if W / H > 1.3:
        x, w = W * 0.42, W * 0.52
        yc = H * 0.5
    else:
        x, w = W * 0.08, W * 0.84
        yc = H * (0.52 if H / W < 1.15 else 0.5)
    s1 = d.fit(kick, w, T["t"], 150 * u, T["tw"])
    t1 = d.text(x, yc - 230 * u, w, kick, T["t"], s1, title_color(P), weight=T["tw"], align="center")
    gold_fill(t1, P)
    s2 = d.fit(big, w, fam, 260 * u, 400, upper=True)
    t2 = d.text(x, t1["top"] + t1["_h"] + 10 * u, w, big, fam, s2, P["text"], align="center", upper=True)
    d.text(x, t2["top"] + t2["_h"] + 14 * u, w, C["msg"], T["b"], 32 * u, P["sub"], italic=T["bi"], align="center")
    pill(d, x + w / 2, t2["top"] + t2["_h"] + 140 * u, C["cta"], "Montserrat", 24 * u, "#1A1208" if P["dark"] else "#FFFFFF", P["acc"])
    d.text(0, H - 80 * u, W, C["company"], "Montserrat", 22 * u, P["acc"], weight=700, align="center", spacing=260, upper=True)
    if W / H > 1.3:
        hero(d, P, "diyas", W * 0.2, H * 0.5, H * 0.26, 1)


def L_fireworks_night(d, P, T, C, o):
    W, H = d.W, d.H
    u = U(d)
    page(d, P, (), d.rng)
    rng = random.Random(o.get("seed", 3))
    for i in range(7):
        r = rng.uniform(70, 170) * u
        burst(d, rng.uniform(W * 0.08, W * 0.92), rng.uniform(H * 0.08, H * 0.45), r, P["cols"][i % 4], n=rng.choice((16, 20, 24)), rng=rng)
    # skyline of little rooftops with diyas
    base = H * 0.86
    pts = [(-d.bleed, H + d.bleed), (-d.bleed, base)]
    x = -d.bleed
    while x < W + d.bleed:
        w = rng.uniform(80, 160) * u
        h = rng.uniform(40, 140) * u
        pts += [(x, base - h), (x + w * 0.5, base - h - 30 * u), (x + w, base - h)]
        x += w
    pts += [(W + d.bleed, base), (W + d.bleed, H + d.bleed)]
    d.polygon(pts, "#05030A" if P["dark"] else mix(P["text"], "#000000", 0.3), name="Skyline")
    for i in range(int(W / (70 * u))):
        x = (i + 0.5) * 70 * u
        d.circle(x, base + 20 * u, 5 * u, "#FFC93C", name="Lamp")
        glow(d, x, base + 20 * u, 22 * u, "#FFB347", 0.6)
    words(d, P, T, C, W * 0.1, W * 0.8, center=H * (0.62 if H / W > 1.15 else 0.64), scale=0.85 if H <= W * 1.1 else 1)


LAYOUTS = dict(classic=L_classic, lanterns=L_lantern_sky, typo=L_typo, minimal=L_minimal, photo=L_photo_full, split=L_split, arch=L_arch_photo,
               corp=L_corporate, collage=L_collage, polaroid=L_polaroid, invite=L_invite, sale=L_sale, night=L_fireworks_night)


# ------------------------------------------------------------------ the collection
def spec():
    S = []  # (group, layout, fmt, pal, type, copy, opts, name)
    pals = list(PAL)
    heroes = ["mandala", "diyas", "diya", "lanterns", "fireworks", "lotus", "arch", "photo", "mandala", "diyas"]
    decors = [("toran",), ("corners",), ("border",), ("bokeh",), ("dots",), (), ("toran", "border"), ("bokeh", "border")]
    i = 0
    # 1) wish posts / portrait / stories / cards — classic hero layouts (64)
    for fmt, count in (("post", 22), ("portrait", 14), ("story", 16), ("card", 12)):
        for k in range(count):
            j = len(S)
            p = pals[(j * 7 + 3) % len(pals)]
            h = heroes[(j * 3) % len(heroes)]
            t = (j * 5 + 1) % len(TYPE)
            dec = decors[(j * 5) % len(decors)]
            C = dict(title=TITLES[(i + k) % len(TITLES)], kicker=KICK[(i * 2 + k) % len(KICK)], msg=MSG[(i + k * 3) % len(MSG)],
                     sign=SIGN[(i + k) % len(SIGN)] if fmt in ("card", "story") or k % 2 else None)
            S.append(("wish", "classic", fmt, p, t, C, dict(hero=h, decor=dec, style=i + k), h))
            i += 1
    # 2) lantern skies, fireworks nights, typographic, minimal (32)
    for k in range(8):
        fmt = ["post", "story", "portrait", "post", "card", "landscape", "story", "post"][k]
        S.append(("wish", "lanterns", fmt, pals[(k * 3 + 1) % 12], (k + 2) % 8, dict(title=TITLES[k % 6], kicker=KICK[k % 6], msg=MSG[(k + 4) % 10]), dict(style=k), "lantern sky"))
        S.append(("celebration", "night", ["story", "post", "portrait", "landscape", "post", "story", "portrait", "post"][k], ["midnight", "neon", "royal", "noir", "plum", "teal", "maroon", "midnight"][k], (k + 5) % 8,
                  dict(title=["Happy Diwali", "Let’s Celebrate", "Shubh Deepavali", "Happy Diwali", "Light it Up", "Happy Diwali", "Festival of Lights", "Sparkle On"][k], kicker=KICK[(k + 1) % 6], msg=MSG[(k + 2) % 10]), dict(seed=k), "fireworks night"))
        S.append(("wish", "typo", ["post", "story", "portrait", "post", "post", "story", "portrait", "landscape"][k], ["sunset", "noir", "marigold", "neon", "maroon", "teal", "royal", "emerald"][k], (k + 1) % 8,
                  dict(title="DIWALI", kicker="Happy", msg=MSG[(k + 6) % 10] if k % 2 == 0 else None), dict(fam=["Anton", "Bebas Neue", "Archivo Black", "Oswald"][k % 4]), "bold type"))
        S.append(("wish", "minimal", ["post", "card", "portrait", "story", "a5", "post", "linkedin", "card"][k], ["ivory", "blush", "noir", "midnight", "ivory", "emerald", "ivory", "blush"][k], [0, 1, 3, 4, 0, 1, 3, 4][k],
                  dict(title=TITLES[(k + 2) % 6], kicker=KICK[(k + 3) % 6], msg=MSG[(k + 7) % 10], sign=SIGN[(k + 3) % 10]), {}, "minimal line"))
    # 3) photo wishes (16)
    for k in range(16):
        lay = ["photo", "split", "arch"][k % 3]
        fmt = ["post", "portrait", "story", "post", "landscape", "card", "portrait", "post", "story", "linkedin", "post", "portrait", "story", "post", "card", "post"][k]
        S.append(("wish", lay, fmt, pals[(k * 7) % 12], (k + 1) % 8, dict(title=TITLES[k % 6], kicker=KICK[k % 6], msg=MSG[(k + 1) % 10], sign=SIGN[k % 10] if k % 2 else None),
                  dict(photo=LIGHTS[k % len(LIGHTS)] if lay != "arch" or k % 2 else FAMILY[k % len(FAMILY)]), "photo " + lay))
    # 4) corporate (30)
    cfmt = ["post", "linkedin", "landscape", "portrait", "hcard", "post", "story", "card", "linkedin", "post"]
    cpal = ["midnight", "ivory", "noir", "emerald", "maroon", "royal", "ivory", "teal", "noir", "midnight", "blush", "maroon", "emerald", "ivory", "plum"]
    for k in range(30):
        co = CO[k % len(CO)]
        lay = "corp" if k % 5 else "split"
        o = dict(v=k % 3, hero=["diyas", "mandala", "gift", "lotus"][k % 4], photo=LIGHTS[(k + 3) % len(LIGHTS)])
        S.append(("corporate", lay, cfmt[k % len(cfmt)], cpal[k % len(cpal)], [2, 3, 5, 0, 6, 1][k % 6],
                  dict(title=["Happy Diwali", "Diwali Greetings", "Season’s Greetings", "Happy Deepavali", "Wishing You a Happy Diwali"][k % 5],
                       kicker=["Warm wishes from", "With gratitude", "Celebrating with you", "Season’s greetings", "From all of us"][k % 5], msg=CORP_MSG[k % len(CORP_MSG)], sign=co, company=co), o, "corporate"))
    # 5) collages (24)
    cl = [("post", 4, 0), ("portrait", 5, 0), ("story", 6, 0), ("post", 3, 0), ("portrait", 3, 1), ("story", 4, 0), ("landscape", 4, 0), ("post", 2, 0),
          ("portrait", 6, 0), ("story", 3, 1), ("post", 5, 0), ("landscape", 6, 0), ("portrait", 4, 0), ("post", 6, 0), ("story", 5, 0), ("post", 3, 1)]
    ctitles = ["Diwali Memories", "Our Diwali", "Festival of Lights", "Diwali with Family", "Lights & Laddoos", "Diwali Diaries", "Glow Moments", "Happy Diwali"]
    for k, (fmt, n, g) in enumerate(cl):
        ph = [(FAMILY + LIGHTS)[(k * 3 + j * 5) % 20] for j in range(n)]
        ph = [x for j, x in enumerate(ph)]
        mixp = []
        for j in range(n):
            mixp.append(LIGHTS[(k + j) % 8] if j % 2 else FAMILY[(k * 2 + j) % len(FAMILY)])
        S.append(("collage", "collage", fmt, pals[(k * 5 + 2) % 12], (k + 4) % 8, dict(title=ctitles[k % 8], kicker="Our", msg="Lights, laughter and the people we love — Diwali 2026"), dict(photos=mixp, g=g), f"{n}-photo collage"))
    for k in range(8):
        fmt = ["post", "story", "portrait", "post", "story", "portrait", "post", "portrait"][k]
        n = 3 if fmt == "post" else 4
        ph = [FAMILY[(k + j * 2) % len(FAMILY)] if j % 2 == 0 else LIGHTS[(k + j) % 8] for j in range(n)]
        S.append(("collage", "polaroid", fmt, ["midnight", "plum", "maroon", "noir", "emerald", "royal", "neon", "teal"][k], [1, 4, 0, 1, 4, 0, 1, 4][k],
                  dict(title=["Diwali Memories", "Our Festival of Lights", "Diwali Diaries", "Happy Diwali", "Glow & Gather", "Family Diwali", "Diwali Night", "Little Lights"][k]),
                  dict(photos=ph, seed=k), "polaroid collage"))
    # 6) invitations (12)
    inv = [
        ("Diwali Party", "You’re invited to an evening of lights, sweets and celebration", ["Saturday · 7 November", "7 PM onwards · The Kapoor Residence", "Dinner · Music · Sparklers"], "RSVP to Priya"),
        ("Diwali Night", "Join us for diyas, dinner and dancing", ["Saturday · 7 November · 7 PM", "Rooftop, Sunrise Towers", "Dress code: festive ethnic"], "RSVP by 5 November"),
        ("Office Diwali Celebration", "Let’s light up the workplace together", ["Friday · 6 November · 3 PM", "Main cafeteria · Level 2", "Ethnic day · Rangoli contest · Lunch"], "All teams welcome"),
        ("Lakshmi Puja", "Please join our family for the Lakshmi Puja", ["Sunday · 8 November", "Puja at 6:30 PM · Dinner after", "The Iyer home, 14 Lotus Lane"], "With blessings"),
        ("Diwali Mela", "Food stalls, games, music and fireworks for the whole community", ["7–8 November · 4 PM till late", "Community Park grounds", "Free entry · family friendly"], "See you there"),
        ("Diwali Dinner", "An evening of good food and great company", ["Saturday · 7 November · 8 PM", "Saffron Hotels, Ballroom", "Festive set menu"], "Book your table"),
    ]
    for k in range(12):
        title, msg, det, rsvp = inv[k % 6]
        fmt = ["card", "story", "post", "portrait", "a5", "landscape"][k % 6]
        S.append(("invitation", "invite", fmt, ["maroon", "midnight", "emerald", "plum", "ivory", "royal", "noir", "teal", "blush", "sunset", "maroon", "midnight"][k], [0, 3, 2, 1, 4, 5, 3, 0, 1, 2, 4, 3][k],
                  dict(title=title, kicker="You’re invited", msg=msg, details=det, rsvp=rsvp), dict(border=k % 2 == 0), "invitation"))
    # 7) sale / offers (10)
    offers = [("Diwali Sale", "Flat 50% off", "On everything in store · this week only", "Shop now"), ("Festive Offer", "Up to 40% off", "Gold, silver and diamond jewellery", "Visit us today"),
              ("Diwali Dhamaka", "Buy 1 get 1", "On all sweets and gift boxes", "Order now"), ("Diwali Deals", "30% off", "Home décor, lights and lamps", "Shop the collection"),
              ("Festival Sale", "Extra 20% off", "Use code DIWALI20 at checkout", "Shop online")]
    stores = ["Kaveri Jewellers", "Lumière Home", "Mithai House", "Urban Threads", "Glow Electronics"]
    for k in range(10):
        kick, off, msg, cta = offers[k % 5]
        S.append(("sale", "sale", ["post", "story", "portrait", "post", "landscape", "post", "story", "portrait", "post", "linkedin"][k], ["maroon", "neon", "marigold", "noir", "royal", "sunset", "emerald", "plum", "teal", "midnight"][k], [2, 6, 3, 5, 7, 6, 2, 3, 5, 6][k],
                  dict(kicker=kick, offer=off, msg=msg, cta=cta, company=stores[k % 5]), dict(fam=["Anton", "Bebas Neue", "Archivo Black", "Oswald", "Anton"][k % 5]), "sale"))
    # 8) other Diwali days (10)
    days = [("Happy Dhanteras", "May this Dhanteras bring wealth, health and good fortune to your home.", "gift"),
            ("Happy Choti Diwali", "May the lights of Choti Diwali chase away every darkness.", "diya"),
            ("Happy Govardhan Puja", "May Lord Krishna bless you with love, peace and abundance.", "lotus"),
            ("Happy Bhai Dooj", "To the bond that grows stronger every year — happy Bhai Dooj.", "mandala"),
            ("Shubh Labh", "Wishing you auspicious beginnings and lasting prosperity.", "diyas")]
    for k in range(10):
        t, m, h = days[k % 5]
        S.append(("wish", "classic", ["post", "story"][k // 5], ["emerald", "plum", "royal", "maroon", "midnight", "ivory", "sunset", "teal", "noir", "blush"][k], [0, 1, 2, 4, 3][k % 5],
                  dict(title=t, kicker="Wishing you", msg=m, sign=SIGN[(k + 5) % 10] if k % 2 else None), dict(hero=h, decor=decors[(k + 3) % len(decors)], style=k), "festival day"))
    return S


GROUP = {
    "wish": ("Festivals", None, "diwali wishes, happy diwali greeting, deepavali wishes"),
    "celebration": ("Festivals", None, "diwali celebration, fireworks, festival of lights"),
    "corporate": ("Festivals", None, "corporate diwali greeting, company diwali wishes, business deepavali card, client greeting"),
    "collage": ("Photo Collage", None, "diwali photo collage, family photos, festival memories"),
    "invitation": ("Events", "Party", "diwali party invitation, deepavali invite, puja invitation"),
    "sale": ("Marketing", "Poster", "diwali sale, festive offer, deepavali discount post"),
}
FMT_KW = {"post": "instagram post", "portrait": "instagram portrait post", "story": "instagram story, whatsapp status", "card": "greeting card",
          "landscape": "banner, email header, screen", "linkedin": "linkedin post, email", "a5": "printable card a5", "hcard": "folded card"}


def artboard(W, H, i, printable):
    ab = {"type": "rect", "version": "5.1.0", "left": 0, "top": 0, "width": W, "height": H, "fill": "#ffffff", "name": "Page 1", "__isArtboard": True,
          "__artboardId": f"artboard_dwp_{i:04d}", "selectable": False, "evented": False, "strokeWidth": 0, "hasControls": False}
    if printable:
        b = 3 / 25.4 * 300 * (W / 1748 if W < H else W / 2480) if False else 30
        ab["__print"] = {"bleed": {"top": b, "right": b, "bottom": b, "left": b}, "bleedLinked": True, "slug": {"top": 0, "right": 0, "bottom": 0, "left": 0}, "slugLinked": True,
                         "safeArea": {"top": b, "right": b, "bottom": b, "left": b}, "safeAreaLinked": True, "dpi": 300, "marks": {"crop": False, "registration": False, "colorBar": False}}
    return ab


def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower().replace("’", "").replace("'", "")).strip("-")


def build():
    out = []
    seen = set()
    for i, (group, lay, fmt, pal, ti, C, o, label) in enumerate(spec(), 1):
        W, H, fname = FORMATS[fmt]
        P = PAL[pal]
        T = TYPE[ti]
        d = Doc(W, H, artboard(W, H, i, fmt in PRINT_FMTS), seed=7000 + i)
        if fmt in PRINT_FMTS:
            d.bleed = 30
        LAYOUTS[lay](d, P, T, C, o)
        for ob in d.objs:
            ob.pop("_h", None)
            ob.pop("__lines", None)
        head = C.get("title") or C.get("kicker") or "Diwali"
        if group == "corporate":
            name = f"{P['name']} Corporate Diwali {fname}"
        elif group == "collage":
            name = f"{P['name']} Diwali {label.title()} {fname}"
        elif group == "invitation":
            name = f"{P['name']} {head} Invitation {fname}"
        elif group == "sale":
            name = f"{P['name']} {head} {C['offer'].title()} {fname}"
        else:
            name = f"{P['name']} {head} {label.title()} {fname}"
        name = re.sub(r"\s+", " ", name.replace("\n", " "))
        base = slugify(name)
        slug = f"dwp-{base}"
        n = 2
        while slug in seen:
            slug = f"dwp-{base}-{n}"
            n += 1
        seen.add(slug)
        cat, sub, kw = GROUP[group]
        if fmt in ("card", "a5", "hcard") and group == "wish":
            cat, sub = "Cards", None
        bgc = P["bg"][1]
        out.append({"name": name, "category": cat, "sub": sub, "slug": slug, "width": W, "height": H, "pages": 1, "color1": P["bg"][-1], "color2": P["acc"],
                    "sort": -3000 + i, "premium": False, "featured": i <= 24, "keywords": f"{kw}, {FMT_KW[fmt]}, {P['name'].lower()}, diwali 2026",
                    "tags": ["diwali-pro-2026-11", "festivals", "occasion-diwali", group], "occasion": "Diwali", "status": "published",
                    "orientation": "landscape" if W > H * 1.05 else "square" if abs(W - H) < 5 else "portrait",
                    "description": f"{P['name']} Diwali {group} design ({fname.lower()}) — fully editable online: change the words, colours and photos.", "canvasJson": d.json()})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    rows = build()
    if a.only:
        rows = [r for r in rows if re.search(a.only, r["slug"])]
    json.dump(rows, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(rows))


if __name__ == "__main__":
    main()
