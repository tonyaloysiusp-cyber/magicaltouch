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


# ------------------------------------------------------------ building blocks
def glow_ring(d, cx, cy, r, on_dark):
    """The brand centrepiece: a soft spectrum halo behind the festival art."""
    for i, col in enumerate(["#A69BD3", "#35C2F1", "#F2708F"]):
        d.circle(cx + [-1, 1, 0][i] * r * 0.18, cy + [0.1, -0.05, 0.15][i] * r, r * 0.95, rad(r * 0.95, r * 0.95, r * 0.95, [(0, rgba(col, 0.55 if on_dark else 0.42)), (1, rgba(col, 0))]), name="Glow")
    d.circle(cx, cy, r * 0.82, "", stroke=lin(0, 0, r * 1.64, 0, SPECTRUM), sw=6, opacity=0.95, name="Spectrum ring")
    d.circle(cx, cy, r * 0.94, "", stroke=lin(0, 0, r * 1.88, 0, SPECTRUM), sw=2, opacity=0.5, dash=[3, 12], name="Spectrum dots")


def sparkles(d, pts, on_dark):
    for i, (x, y, s) in enumerate(pts):
        d.sparkle(x, y, s, SPEC[i % len(SPEC)] if not on_dark or i % 2 else "#FFFFFF", opacity=0.95)


def title(d, y, l1, l2, on_dark, size2=112):
    W = d.W
    o = d.text(70, y, W - 140, l1, "Poppins", 76, "#FFFFFF" if on_dark else INK, weight=600, align="center", lh=1.05, name="Headline")
    size2 = min(size2, d.fit(l2, W - 140, "Poppins", size2, weight=800))
    o2 = d.text(70, y + o["_h"] - 6, W - 140, l2, "Poppins", size2, "#8E7FD0", weight=800, align="center", lh=1.04, spacing=-10, name="Headline 2")
    tw = min(W - 140, text_width(l2, "Poppins", size2, 800, False, -10))
    x0 = (W - 140 - tw) / 2
    o2["fill"] = lin(x0, 0, x0 + tw, 0, SPEC_TEXT)
    return y + o["_h"] + o2["_h"]


def footer(d, msg, on_dark, button, y):
    W, H = d.W, d.H
    d.text(110, y, W - 220, msg, "Poppins", 32, rgba("#FFFFFF", 0.82) if on_dark else "#52525B", weight=400, align="center", lh=1.4, name="Message")
    spectrum_rule(d, W / 2 - 70, H - 175, 140, 6)
    cta(d, W / 2, H - 112, button, 30, on_dark=on_dark)
    d.text(70, H - 62, W - 140, "magicaltouchdesign.com", "Poppins", 24, rgba("#FFFFFF", 0.7) if on_dark else "#71717A", weight=500, align="center", name="Website")


def header(d, kicker, on_dark):
    W = d.W
    brand_logo(d, 76, 70, 420, on_dark=on_dark)
    tw = text_width(kicker.upper(), "Poppins", 20, 600, False, 160) + 44
    d.rect(W - 80 - tw, 76, tw, 46, rgba("#FFFFFF", 0.1) if on_dark else rgba(INK, 0.05), rx=23, stroke=rgba("#FFFFFF", 0.3) if on_dark else rgba(INK, 0.15), sw=1.5, name="Kicker pill")
    d.text(W - 80 - tw, 87, tw, kicker.upper(), "Poppins", 20, "#FFFFFF" if on_dark else INK, weight=600, align="center", spacing=160, name="Kicker")


def star_field(d, n, on_dark):
    for _ in range(n):
        d.circle(d.rng.uniform(20, d.W - 20), d.rng.uniform(150, d.H * 0.62), d.rng.uniform(1.2, 3.2), "#FFFFFF" if on_dark else d.rng.choice(SPEC), opacity=d.rng.uniform(0.35, 0.9))


def fw(d, pts):
    for i, (x, y, r) in enumerate(pts):
        fireworks(d, x, y, r, SPEC[i % len(SPEC)], n=16, sw=3)


def arts(d, items):
    for name, x, y, s, a in items:
        d.art(name, x, y, s, angle=a)


# ------------------------------------------------------------ the festivals
CX, CY = 540, 500
F = []  # (occasion, kicker, l1, l2, message, button, dark, decor)


def fest(occ, kicker, l1, l2, msg, button, on_dark):
    def deco(fn):
        F.append((occ, kicker, l1, l2, msg, button, on_dark, fn))
        return fn
    return deco


@fest("Diwali", "Festival of lights", "Happy", "Diwali", "May every lamp you light bring joy, colour and new beginnings.", "Design your Diwali greetings free", True)
def _(d):
    fw(d, [(170, 300, 70), (900, 260, 90), (980, 520, 50)])
    rangoli(d, CX, CY + 60, 250, ["#F2708F", "#A69BD3", "#35C2F1", "#8CC84B", "#DDE23B"])
    for x in (310, 540, 770):
        d.circle(x, CY + 230, 80, rad(80, 80, 80, [(0, "rgba(255,190,80,0.6)"), (1, "rgba(255,190,80,0)")]))
        d.art("diya-lamp", x, CY + 238, 150)


@fest("Christmas", "Season's greetings", "Merry", "Christmas", "Wishing you a season of warmth, wonder and beautiful moments.", "Design your Christmas cards free", True)
def _(d):
    snow(d, 90, 0, 140, d.W, d.H * 0.66)
    tree(d, CX, CY + 250, 470, color="#2E7D5B", star="#DDE23B")
    arts(d, [("wrapped-gift", 330, CY + 270, 150, -8), ("wrapped-gift", 760, CY + 280, 130, 6), ("snowflake", 220, 330, 90, 0), ("snowflake", 880, 380, 70, 20)])


@fest("New Year's Day", "Hello 2027", "Happy New Year", "2027", "New year, new ideas. Let's make it the most creative one yet.", "Design your New Year posts free", True)
def _(d):
    fw(d, [(300, 420, 120), (780, 380, 150), (540, 650, 90), (190, 700, 60), (900, 690, 70)])
    fw(d, [(CX, CY - 60, 150)])
    arts(d, [("glowing-star", CX, CY - 60, 130, 0), ("clinking-glasses", CX, CY + 190, 170, 0), ("party-popper", 260, CY + 230, 120, -10), ("bottle-with-popping-cork", 820, CY + 230, 120, 10)])
    d.confetti(60, 160, d.W - 60, 900, SPEC, n=60)


@fest("Eid al-Fitr", "Eid al-Fitr", "Eid", "Mubarak", "May this Eid fill your home with peace, happiness and blessings.", "Design your Eid greetings free", True)
def _(d):
    islamic_star_pattern(d, 0, 140, d.W, 900, 90, "#FFFFFF", sw=1, opacity=0.06)
    arts(d, [("crescent-moon", CX + 30, CY - 10, 380, -15)])
    for x, top, h in ((250, 210, 300), (830, 250, 260), (680, 420, 190)):
        fanous(d, x, top, h, body_col="#E9C877", glass="#FFE7A8")
    star_field(d, 50, True)


@fest("Ramadan begins", "Ramadan", "Ramadan", "Kareem", "Wishing you a blessed month of peace, kindness and reflection.", "Design your Ramadan posts free", True)
def _(d):
    islamic_star_pattern(d, 0, 140, d.W, 900, 90, "#FFFFFF", sw=1, opacity=0.06)
    arts(d, [("crescent-moon", CX - 110, CY - 70, 300, -15)])
    fanous(d, 740, 260, 360, body_col="#E9C877", glass="#FFE7A8")
    arts(d, [("mosque", CX - 40, CY + 250, 220, 0)])
    star_field(d, 60, True)


@fest("Eid al-Adha", "Eid al-Adha", "Eid al-Adha", "Mubarak", "May your sacrifices be accepted and your days filled with blessings.", "Design your Eid greetings free", True)
def _(d):
    islamic_star_pattern(d, 0, 140, d.W, 900, 90, "#FFFFFF", sw=1, opacity=0.06)
    arts(d, [("crescent-moon", CX, CY - 90, 280, -15)])
    fanous(d, 260, 300, 260); fanous(d, 820, 300, 260)
    arts(d, [("kaaba", CX, CY + 200, 200, 0)])
    star_field(d, 50, True)


@fest("Islamic New Year", "Hijri new year", "Happy", "Islamic New Year", "A new Hijri year — may it bring peace, health and hope.", "Design your greetings free", True)
def _(d):
    arts(d, [("crescent-moon", CX, CY, 400, -15)])
    islamic_star_pattern(d, 0, 140, d.W, 900, 90, "#FFFFFF", sw=1, opacity=0.06)
    star_field(d, 80, True)


@fest("Holi", "Festival of colours", "Happy", "Holi", "Play with colour, share the laughter and celebrate together.", "Design your Holi posts free", False)
def _(d):
    for i, (x, y, r) in enumerate([(280, 420, 210), (800, 400, 230), (540, 700, 220), (200, 760, 150), (900, 760, 160), (540, 300, 160)]):
        d.blob(x, y - 40, r * 0.9, rgba(SPEC[i % 6], 0.5), wobble=0.3, n=9)
    for i in range(70):
        d.circle(d.rng.uniform(60, 1020), d.rng.uniform(170, 900), d.rng.uniform(3, 10), SPEC[i % 6], opacity=0.85)
    arts(d, [("water-pistol" if False else "artist-palette", CX, CY + 40, 260, -8)])


@fest("Pongal / Makar Sankranti", "Harvest festival", "Happy", "Pongal", "May the harvest bring you sweetness, prosperity and joy.", "Design your Pongal greetings free", False)
def _(d):
    d.rays(CX, CY - 30, 140, 360, 24, "#DDE23B", opacity=0.35)
    arts(d, [("sun", CX, CY - 40, 280, 0), ("kite", 230, 330, 150, -15), ("kite", 860, 300, 120, 12), ("sheaf-of-rice" if False else "leafy-green", 330, CY + 230, 140, -20), ("leafy-green", 750, CY + 230, 140, 20)])
    rangoli(d, CX, CY + 250, 120, ["#F2708F", "#35C2F1", "#8CC84B", "#DDE23B"])


@fest("Republic Day (India)", "Republic Day", "Happy", "Republic Day", "Proud of our nation, its people and its spirit.", "Design your Republic Day posts free", False)
def _(d):
    for i, col in enumerate(["#FF9933", "#FFFFFF", "#138808"]):
        d.wave(-20, d.W + 20, 300 + i * 70, 26, 520, fill=rgba(col, 0.75) if col != "#FFFFFF" else rgba("#E5E7EB", 0.6), bottom=300 + i * 70 + 60)
    d.circle(CX, CY + 40, 110, "", stroke="#1D4ED8", sw=8, name="Chakra")
    d.rays(CX, CY + 40, 10, 105, 24, "#1D4ED8", opacity=0.9, width_deg=1.5)


@fest("Independence Day (India)", "Independence Day", "Happy", "Independence Day", "Celebrating freedom, unity and the dreams we build together.", "Design your Independence Day posts free", False)
def _(d):
    for i, col in enumerate(["#FF9933", "#E5E7EB", "#138808"]):
        d.blob(300 + i * 240, CY - 20 + (i % 2) * 60, 170, rgba(col, 0.55), wobble=0.25)
    d.circle(CX, CY + 20, 120, "", stroke="#1D4ED8", sw=8)
    d.rays(CX, CY + 20, 10, 115, 24, "#1D4ED8", opacity=0.9, width_deg=1.5)
    arts(d, [("dove", 270, 330, 130, -10), ("dove", 830, 360, 110, 10)])


@fest("UAE National Day", "Eid Al Etihad", "Happy", "National Day", "Celebrating the spirit of the Union, its people and its future.", "Design your National Day posts free", True)
def _(d):
    uae_flag(d, CX - 230, CY - 120, 460, 250)
    fw(d, [(220, 330, 90), (880, 310, 110), (900, 760, 60)])
    arts(d, [("sparkles", CX + 230, CY + 170, 120, 0), ("glowing-star", CX - 240, CY + 180, 100, 0)])


@fest("UAE Flag Day", "Flag Day", "Proud of our", "UAE Flag", "Raise the flag and celebrate the nation together.", "Design your Flag Day posts free", False)
def _(d):
    uae_flag(d, CX - 260, CY - 150, 520, 290)
    d.line(CX - 270, CY - 200, CX - 270, CY + 260, "#71717A", 8)


@fest("Emirati Women's Day", "Emirati Women's Day", "Celebrating", "Emirati Women", "Honouring the women who inspire, lead and shape the future.", "Design your posts free", False)
def _(d):
    arts(d, [("rose", CX - 120, CY + 30, 220, -12), ("tulip", CX + 120, CY + 20, 220, 10), ("sparkles", CX, CY - 180, 120, 0)])


@fest("Saudi National Day", "Saudi National Day", "Happy", "Saudi National Day", "Celebrating the Kingdom's heritage, pride and vision.", "Design your posts free", True)
def _(d):
    d.circle(CX, CY, 230, rad(230, 230, 230, [(0, "rgba(0,108,53,0.85)"), (1, "rgba(0,108,53,0)")]), name="Green glow")
    arts(d, [("palm-tree", CX, CY - 10, 230, 0)])
    fw(d, [(230, 330, 90), (860, 330, 100)])


@fest("Chinese New Year", "Lunar new year", "Happy", "Lunar New Year", "Wishing you luck, health and prosperity in the year ahead.", "Design your Lunar New Year posts free", True)
def _(d):
    for x, y, s in ((260, 330, 190), (820, 300, 220), (540, 260, 140)):
        d.line(x, 140, x, y - s * 0.4, "#E9C877", 3)
        d.art("red-paper-lantern", x, y, s)
    fw(d, [(220, 700, 80), (880, 680, 90)])
    arts(d, [("dragon", CX, CY + 160, 300, 0)])


@fest("Valentine's Day", "With love", "Happy", "Valentine's Day", "Love is in the details. Say it beautifully.", "Design your Valentine's cards free", False)
def _(d):
    for i in range(16):
        d.heart(d.rng.uniform(80, 1000), d.rng.uniform(180, 880), d.rng.uniform(30, 70), SPEC[i % 3], opacity=0.75, angle=d.rng.uniform(-20, 20))
    arts(d, [("heart-with-ribbon", CX, CY + 20, 330, -6)])


@fest("International Women's Day", "8 March", "Happy", "Women's Day", "To every woman who creates, leads and inspires — thank you.", "Design your Women's Day posts free", False)
def _(d):
    arts(d, [("tulip", CX - 150, CY + 40, 200, -15), ("blossom", CX, CY - 40, 220, 0), ("tulip", CX + 150, CY + 40, 200, 15)])
    sparkles(d, [(260, 330, 30), (820, 360, 26), (900, 700, 22), (190, 720, 24)], False)


@fest("Mother's Day (US, India & more)", "Mother's Day", "Happy", "Mother's Day", "For the one who made everything beautiful — thank you, Mum.", "Design your Mother's Day cards free", False)
def _(d):
    arts(d, [("bouquet", CX, CY, 330, 0), ("red-heart", 280, 380, 100, -12), ("red-heart", 820, 400, 80, 12)])


@fest("Father's Day", "Father's Day", "Happy", "Father's Day", "To the hero, the coach and the best joke teller — happy Father's Day.", "Design your Father's Day cards free", True)
def _(d):
    arts(d, [("necktie", CX - 110, CY + 20, 230, -10), ("trophy", CX + 130, CY + 10, 230, 8)])
    star_field(d, 50, True)


@fest("Easter", "Easter", "Happy", "Easter", "Wishing you a joyful Easter full of hope and new beginnings.", "Design your Easter cards free", False)
def _(d):
    for i, (x, y, a) in enumerate([(380, CY + 130, -12), (540, CY + 150, 0), (700, CY + 130, 12)]):
        d.ellipse(x, y, 85, 110, lin(0, 0, 170, 0, [(0, SPEC[i * 2]), (1, SPEC[i * 2 + 1])]), angle=a, name="Egg")
        d.stripes(x - 80, y - 20, x + 80, y + 10, 10, 14, "#FFFFFF", opacity=0.6)
    arts(d, [("rabbit", CX, CY - 110, 220, 0), ("tulip", 220, CY + 160, 150, -10), ("tulip", 860, CY + 160, 150, 10)])


@fest("Halloween", "Halloween", "Happy", "Halloween", "Spooky, sweet and totally free to design.", "Design your Halloween posts free", True)
def _(d):
    d.circle(CX + 160, CY - 150, 150, rad(150, 150, 150, [(0, "#FFF6C2"), (1, "#F6E7B0")]))
    arts(d, [("jack-o-lantern", CX - 60, CY + 120, 300, 0), ("ghost", 260, 360, 150, -10), ("ghost", 880, 640, 110, 12)])
    star_field(d, 40, True)


@fest("Thanksgiving (US)", "Thanksgiving", "Happy", "Thanksgiving", "Grateful for you — and for every beautiful thing we create together.", "Design your Thanksgiving posts free", False)
def _(d):
    for i in range(14):
        d.art(d.rng.choice(["fallen-leaf", "maple-leaf"]), d.rng.uniform(80, 1000), d.rng.uniform(200, 880), d.rng.uniform(60, 110), angle=d.rng.uniform(-40, 40))
    arts(d, [("pie", CX, CY + 30, 300, 0)])


@fest("Black Friday", "Black Friday", "Black Friday", "Free. Always.", "No discount needed — every template on Magical Touch is free.", "Start designing free", True)
def _(d):
    d.text(70, CY - 210, d.W - 140, "100%", "Poppins", 220, "#FFFFFF", weight=800, align="center", name="Big number")
    d.text(70, CY + 40, d.W - 140, "FREE TEMPLATES", "Poppins", 54, "#FFFFFF", weight=700, align="center", spacing=200, name="Big label")
    arts(d, [("shopping-bags" if False else "money-bag", 220, CY + 230, 120, -12), ("wrapped-gift", 860, CY + 230, 120, 12)])


@fest("Children's Day (India)", "Children's Day", "Happy", "Children's Day", "Every child is an artist. Let's keep the colours bright.", "Design your Children's Day posts free", False)
def _(d):
    d.balloon(300, CY - 40, 90, "#F2708F"); d.balloon(780, CY - 80, 100, "#35C2F1"); d.balloon(560, CY - 160, 80, "#8CC84B")
    arts(d, [("crayon", CX - 80, CY + 220, 150, -20), ("teddy-bear", CX + 120, CY + 200, 200, 6)])


@fest("Teachers' Day (India)", "Teachers' Day", "Happy", "Teachers' Day", "Thank you for teaching us to learn, create and dream.", "Design your Teachers' Day cards free", False)
def _(d):
    arts(d, [("books", CX - 90, CY + 80, 240, -6), ("graduation-cap", CX + 120, CY - 60, 200, 10), ("pencil", 230, 380, 120, -30)])


@fest("Onam (Thiruvonam)", "Onam", "Happy", "Onam", "May the spirit of Onam bring prosperity and togetherness.", "Design your Onam greetings free", False)
def _(d):
    rangoli(d, CX, CY + 30, 300, ["#F97316", "#FACC15", "#F2708F", "#8CC84B", "#A69BD3"])
    arts(d, [("hibiscus", 220, 340, 130, -10), ("hibiscus", 870, 360, 120, 15), ("leafy-green", 210, 820, 140, 20), ("leafy-green", 880, 820, 140, -20)])


@fest("Vishu", "Vishu", "Happy", "Vishu", "Wishing you a bright new year full of abundance.", "Design your Vishu greetings free", False)
def _(d):
    rangoli(d, CX, CY + 10, 200, ["#FACC15", "#F97316", "#8CC84B"])
    arts(d, [("diya-lamp", CX, CY + 200, 200, 0), ("blossom", CX - 210, CY - 40, 170, -10), ("blossom", CX + 210, CY - 60, 160, 12), ("sunflower", CX, CY - 170, 180, 0)])


@fest("Ganesh Chaturthi", "Ganesh Chaturthi", "Happy", "Ganesh Chaturthi", "May new beginnings bring wisdom, success and happiness.", "Design your greetings free", True)
def _(d):
    rangoli(d, CX, CY + 20, 240, ["#F97316", "#FACC15", "#F2708F", "#A69BD3"])
    arts(d, [("lotus", CX, CY + 10, 240, 0), ("diya-lamp", 290, CY + 260, 120, 0), ("diya-lamp", 790, CY + 260, 120, 0)])


@fest("Navratri begins", "Navratri", "Happy", "Navratri", "Nine nights of music, dance and colour — celebrate in style.", "Design your Navratri posts free", True)
def _(d):
    for i in range(9):
        a = 2 * math.pi * i / 9 - math.pi / 2
        d.circle(CX + 250 * math.cos(a), CY + 250 * math.sin(a), 34, SPEC[i % 6], name="Light")
    arts(d, [("musical-notes", CX - 90, CY - 20, 180, -10), ("diya-lamp", CX + 70, CY + 60, 200, 0)])


@fest("Dussehra", "Vijayadashami", "Happy", "Dussehra", "May good always win. Wishing you strength and success.", "Design your Dussehra greetings free", True)
def _(d):
    fw(d, [(240, 330, 100), (860, 330, 110), (540, 260, 70)])
    arts(d, [("bow-and-arrow" if False else "fire", CX, CY + 80, 280, 0), ("diya-lamp", 290, CY + 260, 120, 0), ("diya-lamp", 790, CY + 260, 120, 0)])


@fest("Raksha Bandhan", "Raksha Bandhan", "Happy", "Raksha Bandhan", "A thread of love, a lifetime of care.", "Design your Rakhi cards free", False)
def _(d):
    d.wave(80, 1000, CY + 20, 40, 400, stroke=lin(0, 0, 920, 0, SPECTRUM), sw=10)
    d.circle(CX, CY + 20, 90, rad(90, 90, 90, [(0, "#FDE68A"), (1, "#F59E0B")]))
    rangoli(d, CX, CY + 20, 110, ["#F2708F", "#A69BD3", "#35C2F1"])
    arts(d, [("wrapped-gift", 260, CY - 170, 130, -10), ("two-hearts", 820, CY - 170, 130, 10)])


@fest("Friendship Day", "Friendship Day", "Happy", "Friendship Day", "Here's to the friends who make every moment brighter.", "Design your Friendship Day posts free", False)
def _(d):
    arts(d, [("two-hearts", CX, CY - 40, 260, 0), ("party-popper", 260, CY + 200, 140, -15), ("sparkles", 820, CY + 200, 140, 10)])


@fest("Earth Day", "22 April", "Happy", "Earth Day", "Design for a greener planet — every small step counts.", "Design your Earth Day posts free", False)
def _(d):
    arts(d, [("world-map", CX, CY, 330, 0), ("seedling", 260, CY + 220, 140, -10), ("potted-plant", 820, CY + 220, 150, 10)])


@fest("Labour Day", "1 May", "Happy", "Labour Day", "Celebrating every hand that builds, makes and creates.", "Design your Labour Day posts free", False)
def _(d):
    arts(d, [("hammer-and-wrench", CX - 100, CY + 20, 230, -10), ("briefcase", CX + 130, CY + 30, 210, 8), ("light-bulb", CX, CY - 190, 150, 0)])


@fest("Janmashtami", "Janmashtami", "Happy", "Janmashtami", "May joy, love and devotion fill your home.", "Design your greetings free", True)
def _(d):
    rangoli(d, CX, CY + 20, 230, ["#3B82F6", "#A69BD3", "#FACC15", "#8CC84B"])
    arts(d, [("lotus", CX, CY, 220, 0), ("musical-notes", 270, 360, 130, -12), ("diya-lamp", 820, CY + 240, 130, 0)])


# ------------------------------------------------------------ build
def poster(d, occ, kicker, l1, l2, msg, button, on_dark, decor):
    (dark if on_dark else light)(d)
    glow_ring(d, CX, CY, 320, on_dark)
    decor(d)
    header(d, kicker, on_dark)
    sparkles(d, [(150, 230, 18), (950, 200, 14), (110, 860, 14), (970, 870, 18)], on_dark)
    end = title(d, 840, l1, l2, on_dark)
    footer(d, msg, on_dark, button, end + 14)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = []
    for i, (occ, kicker, l1, l2, msg, button, on_dark, decor) in enumerate(F, 1):
        W, H = 1080, 1350
        ab = json.loads(json.dumps(BOARD))
        ab.update(width=W, height=H, name="Page 1", left=0, top=0)
        ab["__artboardId"] = f"artboard_fest_{i:03d}"
        ab.pop("__print", None)
        d = Doc(W, H, ab, seed=100 + i)
        poster(d, occ, kicker, l1, l2, msg, button, on_dark, decor)
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
