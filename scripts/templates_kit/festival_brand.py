"""
Magical Touch festival collection (Nov 2026): one brand poster per occasion
(Instagram/Facebook post 1080 x 1350), editable in the editor. Admin only:
status draft, tags brand-promo + festival, `occasion` = the name in the
site's festival calendar (occasions table) so Admin → Social media can
show them by date and make a video from each.

Always the brand: Poppins, the logo, the logo's spectrum (headline,
glow ring, lines), on the dark ink night or the light pastel wash —
plus the festival's own elements.

  MT_FONT_DIR=... python3 festival_brand.py --out FILE
"""

import argparse
import json
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from kit import Doc, lin, rad, rgba, text_width  # noqa: E402
from promo import light, dark, brand_logo, spectrum_rule, cta, INK, BOARD, SPECTRUM, SPEC_TEXT  # noqa: E402
from seasonal import fanous, crescent, fireworks, snow, tree, rangoli, uae_flag, islamic_star_pattern  # noqa: E402

SPEC = ["#F2708F", "#A69BD3", "#35C2F1", "#5DCCB8", "#8CC84B", "#DDE23B"]


# ------------------------------------------------------------ grid
# 1080 x 1350.  Margins 80.  Header row centred on y = 104.
# Hero circle: centre (540, 470), ring radius 280 — all festival art stays
# inside it; paired elements sit symmetrically at x = 540 ± 380, y = 600.
# Text block starts at y = 790; footer is fixed (rule 1162, button 1216,
# website 1284). Background details stay in y 150..740, outside the ring.
W0, H0, M = 1080, 1350, 80
CX, CY, R = 540, 470, 280


def logo(d, on_dark):
    w = 330
    h = w * 129 / 900
    d.add({"type": "image", "left": M, "top": 104 - h / 2, "width": 900, "height": 129, "scaleX": w / 900, "scaleY": w / 900,
           "src": "/logo-white.png" if on_dark else "/logo.png", "crossOrigin": "anonymous", "filters": []}, "Logo")


def header(d, kicker, on_dark):
    logo(d, on_dark)
    tw = text_width(kicker.upper(), "Poppins", 19, 600, False, 180) + 48
    d.rect(W0 - M - tw, 104 - 23, tw, 46, rgba("#FFFFFF", 0.08) if on_dark else rgba(INK, 0.04), rx=23, stroke=rgba("#FFFFFF", 0.28) if on_dark else rgba(INK, 0.14), sw=1.5, name="Kicker pill")
    d.text(W0 - M - tw, 104 - 13, tw, kicker.upper(), "Poppins", 19, "#FFFFFF" if on_dark else INK, weight=600, align="center", spacing=180, name="Kicker")


def hero_ring(d, on_dark):
    for i, col in enumerate(["#A69BD3", "#35C2F1", "#F2708F"]):
        rr = R * 1.15
        d.circle(CX + [-1, 1, 0][i] * 40, CY + [10, -10, 20][i], rr, rad(rr, rr, rr, [(0, rgba(col, 0.5 if on_dark else 0.36)), (1, rgba(col, 0))]), name="Glow")
    d.circle(CX, CY, R, "", stroke=lin(0, 0, 2 * R, 0, SPECTRUM), sw=6, name="Spectrum ring")
    d.circle(CX, CY, R + 26, "", stroke=lin(0, 0, 2 * R + 52, 0, SPECTRUM), sw=2.5, opacity=0.55, dash=[2, 14], name="Spectrum dots")


def pair(d, left, right, size=130, dy=130):
    """The same kind of element on both sides of the ring, mirrored."""
    if left:
        d.art(left, CX - 380, CY + dy, size, angle=-8)
    if right:
        d.art(right or left, CX + 380, CY + dy, size, angle=8, flip=(right == left))


def scatter(d, kind, on_dark, n=40):
    """Background details in the hero band, never inside the ring or over text."""
    pts = []
    tries = 0
    while len(pts) < n and tries < 4000:
        tries += 1
        x, y = d.rng.uniform(40, W0 - 40), d.rng.uniform(170, 740)
        if math.hypot(x - CX, y - CY) < R + 50 or (y < 160):
            continue
        if abs(x - (CX - 380)) < 90 and abs(y - (CY + 130)) < 90 or abs(x - (CX + 380)) < 90 and abs(y - (CY + 130)) < 90:
            continue
        pts.append((x, y))
    for i, (x, y) in enumerate(pts):
        if kind == "stars":
            d.circle(x, y, d.rng.uniform(1.2, 3.0), "#FFFFFF" if on_dark else SPEC[i % 6], opacity=d.rng.uniform(0.35, 0.9))
        elif kind == "snow":
            d.circle(x, y, d.rng.uniform(2, 5), "#FFFFFF", opacity=d.rng.uniform(0.5, 1))
        elif kind == "confetti":
            d.rect(x, y, 10, 18, SPEC[i % 6], rx=3, angle=d.rng.uniform(0, 180), opacity=0.9)
        elif kind == "hearts":
            d.heart(x, y, d.rng.uniform(18, 34), SPEC[i % 3], opacity=0.7, angle=d.rng.uniform(-20, 20))
        elif kind == "dots":
            d.circle(x, y, d.rng.uniform(4, 9), SPEC[i % 6], opacity=0.85)
    # four corner sparkles, always in the same places
    for i, (x, y, sz) in enumerate([(150, 230, 18), (930, 230, 16), (150, 720, 14), (930, 720, 18)]):
        d.sparkle(x, y, sz, "#FFFFFF" if on_dark else SPEC[i * 2 % 6], opacity=0.95)


def fw(d, pts):
    for i, (x, y, r) in enumerate(pts):
        fireworks(d, x, y, r, SPEC[i % len(SPEC)], n=16, sw=3)


def art(d, name, dx=0, dy=0, size=300, angle=0):
    d.art(name, CX + dx, CY + dy, size, angle=angle)


def text_block(d, l1, l2, msg, on_dark):
    W = W0
    y = 790
    o = d.text(M, y, W - 2 * M, l1, "Poppins", 62, "#FFFFFF" if on_dark else INK, weight=600, align="center", lh=1.05, name="Headline")
    size2 = min(116, d.fit(l2, W - 2 * M, "Poppins", 116, weight=800))
    o2 = d.text(M, y + o["_h"], W - 2 * M, l2, "Poppins", size2, "#8E7FD0", weight=800, align="center", lh=1.04, spacing=-10, name="Headline 2")
    tw = min(W - 2 * M, text_width(l2, "Poppins", size2, 800, False, -10))
    x0 = (W - 2 * M - tw) / 2
    o2["fill"] = lin(x0, 0, x0 + tw, 0, SPEC_TEXT)
    y2 = y + o["_h"] + o2["_h"] + 18
    d.text(M + 60, y2, W - 2 * M - 120, msg, "Poppins", 29, rgba("#FFFFFF", 0.8) if on_dark else "#52525B", weight=400, align="center", lh=1.42, name="Message")


def footer(d, button, on_dark):
    spectrum_rule(d, W0 / 2 - 60, 1160, 120, 5)
    cta(d, W0 / 2, 1216, button, 28, on_dark=on_dark)
    d.text(M, 1270, W0 - 2 * M, "magicaltouchdesign.com", "Poppins", 23, rgba("#FFFFFF", 0.65) if on_dark else "#71717A", weight=500, align="center", spacing=40, name="Website")


# ------------------------------------------------------------ the festivals
F = []


def fest(occ, kicker, l1, l2, msg, button, on_dark, bg="stars"):
    def deco(fn):
        F.append((occ, kicker, l1, l2, msg, button, on_dark, bg, fn))
        return fn
    return deco


@fest("Diwali", "Festival of lights", "Happy", "Diwali", "May every lamp you light bring joy, colour and new beginnings.", "Design your Diwali greetings free", True)
def _(d):
    fw(d, [(170, 300, 64), (910, 300, 72)])
    rangoli(d, CX, CY - 40, 190, ["#F2708F", "#A69BD3", "#35C2F1", "#8CC84B", "#DDE23B"])
    for dx in (-130, 0, 130):
        d.circle(CX + dx, CY + 160, 70, rad(70, 70, 70, [(0, "rgba(255,190,80,0.55)"), (1, "rgba(255,190,80,0)")]))
        art(d, "diya-lamp", dx, 168, 130)


@fest("Christmas", "Season's greetings", "Merry", "Christmas", "Wishing you a season of warmth, wonder and beautiful moments.", "Design your Christmas cards free", True, bg="snow")
def _(d):
    tree(d, CX, CY + 150, 380, color="#2E7D5B", star="#DDE23B")
    pair(d, "wrapped-gift", "wrapped-gift")
    d.art("snowflake", CX - 380, CY - 150, 80); d.art("snowflake", CX + 380, CY - 150, 80)


@fest("New Year's Day", "Hello 2027", "Happy New Year", "2027", "New year, new ideas. Let's make it the most creative one yet.", "Design your New Year posts free", True, bg="confetti")
def _(d):
    fw(d, [(CX, CY - 60, 140)])
    art(d, "glowing-star", 0, -60, 120)
    art(d, "clinking-glasses", 0, 140, 190)
    pair(d, "party-popper", "bottle-with-popping-cork")


@fest("Eid al-Fitr", "Eid al-Fitr", "Eid", "Mubarak", "May this Eid fill your home with peace, happiness and blessings.", "Design your Eid greetings free", True)
def _(d):
    islamic_star_pattern(d, 0, 150, W0, 760, 90, "#FFFFFF", sw=1, opacity=0.05)
    art(d, "crescent-moon", 20, -10, 330, -15)
    fanous(d, CX - 380, 300, 230); fanous(d, CX + 380, 300, 230)


@fest("Ramadan begins", "Ramadan", "Ramadan", "Kareem", "Wishing you a blessed month of peace, kindness and reflection.", "Design your Ramadan posts free", True)
def _(d):
    islamic_star_pattern(d, 0, 150, W0, 760, 90, "#FFFFFF", sw=1, opacity=0.05)
    art(d, "crescent-moon", -60, -90, 220, -15)
    art(d, "mosque", 10, 90, 260)
    fanous(d, CX - 380, 300, 230); fanous(d, CX + 380, 300, 230)


@fest("Eid al-Adha", "Eid al-Adha", "Eid al-Adha", "Mubarak", "May your sacrifices be accepted and your days filled with blessings.", "Design your Eid greetings free", True)
def _(d):
    islamic_star_pattern(d, 0, 150, W0, 760, 90, "#FFFFFF", sw=1, opacity=0.05)
    art(d, "crescent-moon", 70, -110, 180, -15)
    art(d, "kaaba", -10, 50, 280)
    fanous(d, CX - 380, 300, 230); fanous(d, CX + 380, 300, 230)


@fest("Islamic New Year", "Hijri new year", "Happy", "Islamic New Year", "A new Hijri year — may it bring peace, health and hope.", "Design your greetings free", True)
def _(d):
    islamic_star_pattern(d, 0, 150, W0, 760, 90, "#FFFFFF", sw=1, opacity=0.05)
    art(d, "crescent-moon", 10, 0, 340, -15)


@fest("Holi", "Festival of colours", "Happy", "Holi", "Play with colour, share the laughter and celebrate together.", "Design your Holi posts free", False, bg="dots")
def _(d):
    for i, a in enumerate(range(0, 360, 60)):
        t = math.radians(a)
        d.blob(CX + 120 * math.cos(t), CY + 120 * math.sin(t), 120, rgba(SPEC[i], 0.55), wobble=0.28, n=9)
    art(d, "artist-palette", 0, 0, 230, -8)


@fest("Pongal / Makar Sankranti", "Harvest festival", "Happy", "Pongal", "May the harvest bring you sweetness, prosperity and joy.", "Design your Pongal greetings free", False)
def _(d):
    d.rays(CX, CY - 40, 120, 250, 24, "#F5B83A", opacity=0.35)
    art(d, "sun", 0, -40, 220)
    rangoli(d, CX, CY + 175, 85, ["#F2708F", "#35C2F1", "#8CC84B", "#DDE23B"])
    pair(d, "kite", "kite", 120, -150)
    pair(d, "leafy-green", "leafy-green", 120)


@fest("Republic Day (India)", "Republic Day", "Happy", "Republic Day", "Proud of our nation, its people and its spirit.", "Design your Republic Day posts free", False)
def _(d):
    for i, col in enumerate(["#FF9933", "#E5E7EB", "#138808"]):
        d.rect(CX - 200, CY - 120 + i * 80, 400, 80, rgba(col, 0.85), rx=0)
    d.circle(CX, CY, 34, "", stroke="#1D4ED8", sw=4)
    d.rays(CX, CY, 4, 33, 24, "#1D4ED8", opacity=0.9, width_deg=2)
    pair(d, "dove", "dove", 120, -150)


@fest("Independence Day (India)", "Independence Day", "Happy", "Independence Day", "Celebrating freedom, unity and the dreams we build together.", "Design your Independence Day posts free", False)
def _(d):
    for i, col in enumerate(["#FF9933", "#E5E7EB", "#138808"]):
        d.rect(CX - 200, CY - 120 + i * 80, 400, 80, rgba(col, 0.85), rx=0)
    d.circle(CX, CY, 34, "", stroke="#1D4ED8", sw=4)
    d.rays(CX, CY, 4, 33, 24, "#1D4ED8", opacity=0.9, width_deg=2)
    pair(d, "kite", "kite", 120, -150)


@fest("UAE National Day", "Eid Al Etihad", "Happy", "National Day", "Celebrating the spirit of the Union, its people and its future.", "Design your National Day posts free", True)
def _(d):
    uae_flag(d, CX - 200, CY - 110, 400, 220)
    fw(d, [(170, 290, 70), (910, 290, 80)])


@fest("UAE Flag Day", "Flag Day", "Proud of our", "UAE Flag", "Raise the flag and celebrate the nation together.", "Design your Flag Day posts free", False)
def _(d):
    d.line(CX - 210, CY - 150, CX - 210, CY + 190, "#71717A", 7)
    uae_flag(d, CX - 205, CY - 150, 410, 220)


@fest("Emirati Women's Day", "Emirati Women's Day", "Celebrating", "Emirati Women", "Honouring the women who inspire, lead and shape the future.", "Design your posts free", False)
def _(d):
    art(d, "rose", -80, 20, 220, -12); art(d, "tulip", 90, 10, 220, 10); art(d, "sparkles", 0, -150, 100)


@fest("Saudi National Day", "Saudi National Day", "Happy", "Saudi National Day", "Celebrating the Kingdom's heritage, pride and vision.", "Design your posts free", True)
def _(d):
    d.circle(CX, CY, 200, rad(200, 200, 200, [(0, "rgba(0,108,53,0.85)"), (1, "rgba(0,108,53,0)")]))
    art(d, "palm-tree", 0, 0, 280)
    fw(d, [(170, 290, 70), (910, 290, 80)])


@fest("Chinese New Year", "Lunar new year", "Happy", "Lunar New Year", "Wishing you luck, health and prosperity in the year ahead.", "Design your Lunar New Year posts free", True)
def _(d):
    art(d, "dragon", 0, 10, 330)
    for dx in (-380, 380):
        d.line(CX + dx, 150, CX + dx, CY - 140, "#E9C877", 3)
        d.art("red-paper-lantern", CX + dx, CY - 60, 170)


@fest("Valentine's Day", "With love", "Happy", "Valentine's Day", "Love is in the details. Say it beautifully.", "Design your Valentine's cards free", False, bg="hearts")
def _(d):
    art(d, "heart-with-ribbon", 0, 0, 310, -6)


@fest("International Women's Day", "8 March", "Happy", "Women's Day", "To every woman who creates, leads and inspires — thank you.", "Design your Women's Day posts free", False)
def _(d):
    art(d, "tulip", -120, 30, 190, -15); art(d, "blossom", 0, -40, 210); art(d, "tulip", 120, 30, 190, 15)


@fest("Mother's Day (US, India & more)", "Mother's Day", "Happy", "Mother's Day", "For the one who made everything beautiful — thank you, Mum.", "Design your Mother's Day cards free", False)
def _(d):
    art(d, "bouquet", 0, 0, 320)
    pair(d, "red-heart", "red-heart", 100, -150)


@fest("Father's Day", "Father's Day", "Happy", "Father's Day", "To the hero, the coach and the best joke teller — happy Father's Day.", "Design your Father's Day cards free", True)
def _(d):
    art(d, "necktie", -95, 10, 230, -10); art(d, "trophy", 105, 10, 220, 8)


@fest("Easter", "Easter", "Happy", "Easter", "Wishing you a joyful Easter full of hope and new beginnings.", "Design your Easter cards free", False)
def _(d):
    art(d, "rabbit", 0, -90, 210)
    for i, dx in enumerate((-130, 0, 130)):
        d.ellipse(CX + dx, CY + 110, 64, 84, lin(0, 0, 128, 0, [(0, SPEC[i * 2]), (1, SPEC[i * 2 + 1])]), angle=(-10, 0, 10)[i], name="Egg")
    pair(d, "tulip", "tulip", 120)


@fest("Halloween", "Halloween", "Happy", "Halloween", "Spooky, sweet and totally free to design.", "Design your Halloween posts free", True)
def _(d):
    d.circle(CX + 90, CY - 90, 120, rad(120, 120, 120, [(0, "#FFF6C2"), (1, "#F6E7B0")]))
    art(d, "jack-o-lantern", -40, 70, 250)
    pair(d, "ghost", "ghost", 120, -150)


@fest("Thanksgiving (US)", "Thanksgiving", "Happy", "Thanksgiving", "Grateful for you — and for every beautiful thing we create together.", "Design your Thanksgiving posts free", False)
def _(d):
    art(d, "pie", 0, 10, 280)
    pair(d, "maple-leaf", "fallen-leaf", 110, -150)
    pair(d, "fallen-leaf", "maple-leaf", 110, 130)


@fest("Black Friday", "Black Friday", "Black Friday", "Free. Always.", "No discount needed — every template on Magical Touch is free.", "Start designing free", True)
def _(d):
    d.text(CX - 250, CY - 120, 500, "100%", "Poppins", 170, "#FFFFFF", weight=800, align="center", name="Big number")
    d.text(CX - 250, CY + 80, 500, "FREE TEMPLATES", "Poppins", 38, "#FFFFFF", weight=700, align="center", spacing=220, name="Big label")
    pair(d, "money-bag", "wrapped-gift", 120)


@fest("Children's Day (India)", "Children's Day", "Happy", "Children's Day", "Every child is an artist. Let's keep the colours bright.", "Design your Children's Day posts free", False)
def _(d):
    art(d, "teddy-bear", 0, 40, 260)
    pair(d, "crayon", "crayon", 110, 130)
    d.balloon(CX - 380, CY - 150, 60, "#F2708F"); d.balloon(CX + 380, CY - 150, 60, "#35C2F1")


@fest("Teachers' Day (India)", "Teachers' Day", "Happy", "Teachers' Day", "Thank you for teaching us to learn, create and dream.", "Design your Teachers' Day cards free", False)
def _(d):
    art(d, "books", -60, 50, 230, -6); art(d, "graduation-cap", 80, -90, 170, 10)
    pair(d, "pencil", "light-bulb", 110, -150)


@fest("Onam (Thiruvonam)", "Onam", "Happy", "Onam", "May the spirit of Onam bring prosperity and togetherness.", "Design your Onam greetings free", False)
def _(d):
    rangoli(d, CX, CY, 240, ["#F97316", "#FACC15", "#F2708F", "#8CC84B", "#A69BD3"])
    pair(d, "hibiscus", "hibiscus", 110, -150)
    pair(d, "leafy-green", "leafy-green", 110, 130)


@fest("Vishu", "Vishu", "Happy", "Vishu", "Wishing you a bright new year full of abundance.", "Design your Vishu greetings free", False)
def _(d):
    rangoli(d, CX, CY - 40, 170, ["#FACC15", "#F97316", "#8CC84B"])
    art(d, "diya-lamp", 0, 160, 150)
    pair(d, "blossom", "sunflower", 120)


@fest("Ganesh Chaturthi", "Ganesh Chaturthi", "Happy", "Ganesh Chaturthi", "May new beginnings bring wisdom, success and happiness.", "Design your greetings free", True)
def _(d):
    rangoli(d, CX, CY, 220, ["#F97316", "#FACC15", "#F2708F", "#A69BD3"])
    art(d, "lotus", 0, 0, 200)
    pair(d, "diya-lamp", "diya-lamp", 110)


@fest("Navratri begins", "Navratri", "Happy", "Navratri", "Nine nights of music, dance and colour — celebrate in style.", "Design your Navratri posts free", True)
def _(d):
    for i in range(9):
        a = 2 * math.pi * i / 9 - math.pi / 2
        d.circle(CX + 200 * math.cos(a), CY + 200 * math.sin(a), 26, SPEC[i % 6], name="Light")
    art(d, "diya-lamp", 0, 20, 220)


@fest("Dussehra", "Vijayadashami", "Happy", "Dussehra", "May good always win. Wishing you strength and success.", "Design your Dussehra greetings free", True)
def _(d):
    art(d, "fire", 0, 0, 260)
    fw(d, [(170, 290, 70), (910, 290, 80)])
    pair(d, "diya-lamp", "diya-lamp", 110)


@fest("Raksha Bandhan", "Raksha Bandhan", "Happy", "Raksha Bandhan", "A thread of love, a lifetime of care.", "Design your Rakhi cards free", False)
def _(d):
    d.wave(CX - R + 10, CX + R - 10, CY, 30, 260, stroke=lin(0, 0, 2 * R, 0, SPECTRUM), sw=10)
    d.circle(CX, CY, 80, rad(80, 80, 80, [(0, "#FDE68A"), (1, "#F59E0B")]))
    rangoli(d, CX, CY, 100, ["#F2708F", "#A69BD3", "#35C2F1"])
    pair(d, "wrapped-gift", "two-hearts", 110, -150)


@fest("Friendship Day", "Friendship Day", "Happy", "Friendship Day", "Here's to the friends who make every moment brighter.", "Design your Friendship Day posts free", False, bg="confetti")
def _(d):
    art(d, "two-hearts", 0, 0, 280)


@fest("Earth Day", "22 April", "Happy", "Earth Day", "Design for a greener planet — every small step counts.", "Design your Earth Day posts free", False)
def _(d):
    art(d, "world-map", 0, 0, 300)
    pair(d, "seedling", "potted-plant", 120)


@fest("Labour Day", "1 May", "Happy", "Labour Day", "Celebrating every hand that builds, makes and creates.", "Design your Labour Day posts free", False)
def _(d):
    art(d, "hammer-and-wrench", -90, 30, 210, -10); art(d, "briefcase", 100, 40, 200, 8); art(d, "light-bulb", 0, -140, 130)


@fest("Janmashtami", "Janmashtami", "Happy", "Janmashtami", "May joy, love and devotion fill your home.", "Design your greetings free", True)
def _(d):
    rangoli(d, CX, CY, 220, ["#3B82F6", "#A69BD3", "#FACC15", "#8CC84B"])
    art(d, "lotus", 0, 0, 190)
    pair(d, "musical-notes", "diya-lamp", 110)


# ------------------------------------------------------------ build
def poster(d, occ, kicker, l1, l2, msg, button, on_dark, bg, decor):
    (dark if on_dark else light)(d)
    hero_ring(d, on_dark)
    scatter(d, bg, on_dark, n=46 if bg in ("stars", "snow") else 26)
    decor(d)
    header(d, kicker, on_dark)
    text_block(d, l1, l2, msg, on_dark)
    footer(d, button, on_dark)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = []
    for i, (occ, kicker, l1, l2, msg, button, on_dark, bg, decor) in enumerate(F, 1):
        W, H = 1080, 1350
        ab = json.loads(json.dumps(BOARD))
        ab.update(width=W, height=H, name="Page 1", left=0, top=0)
        ab["__artboardId"] = f"artboard_fest_{i:03d}"
        ab.pop("__print", None)
        d = Doc(W, H, ab, seed=100 + i)
        poster(d, occ, kicker, l1, l2, msg, button, on_dark, bg, decor)
        for o in d.objs:
            o.pop("_h", None)
            o.pop("__lines", None)
        key = re.sub(r"[^a-z0-9]+", "-", occ.lower().replace("'", "")).strip("-")
        slug = f"mtd-festival-{key}"
        out.append({"name": f"Magical Touch Festival · {occ}", "category": "Brand Promo", "sub": None, "slug": slug, "width": W, "height": H, "pages": 1,
                    "color1": INK if on_dark else "#FFFFFF", "color2": "#8E7FD0", "sort": 900 + i, "premium": False, "featured": False,
                    "keywords": f"{occ.lower()} brand poster, magical touch festival", "tags": ["brand-promo", "festival", "promo-post"], "status": "draft",
                    "orientation": "portrait", "occasion": occ, "description": f"Magical Touch Design {occ} brand poster — admin only, edit in the editor.", "canvasJson": d.json()})
    json.dump(out, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(out))


if __name__ == "__main__":
    main()
