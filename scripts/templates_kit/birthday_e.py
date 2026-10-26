"""Birthday 081–100: milestones, for someone special."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, SILVER, ROSE_GOLD, metal, text_metal, vgrad, overlay, pill, divider

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


# ------------------------------------------------------------------ milestones
@design(81)
def sweet_16(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FFD1E8"), (1, "#D7C6FF")]))
    d.confetti(0, 0, W, H, ["#FFFFFF", "#FF8CC6", "#B79CFF", "#FFE08A"], n=70, size=(5, 14), shapes=("star", "circle"), avoid=[(W * 0.1, H * 0.15, W * 0.9, H * 0.8)])
    t = d.text(0, H * 0.14, W, "16", "Playfair Display", W * 0.62, "#FFFFFF", weight=800, align="center", lh=0.9, shadow_=shadow("rgba(150,60,150,0.35)", 40, 0, 16))
    text_metal(d, t, ROSE_GOLD)
    s = d.fit("Sweet", W * 0.5, "Great Vibes", 220)
    d.text(0, H * 0.12, W, "Sweet", "Great Vibes", s, "#C2187A", align="center", shadow_=shadow("rgba(255,255,255,0.9)", 10, 0, 0))
    d.art("gem-stone", W * 0.8, H * 0.2, 140, angle=15)
    d.text(0, H * 0.68, W, c["message"], "Playfair Display", 56, "#6A2C70", italic=True, align="center")
    pill(d, W / 2, H * 0.84, c["signature"], "Montserrat", 32, "#FFFFFF", "#C2187A", spacing=200)
    return {"layout": "rose-gold 16 with Sweet in script across it, sparkle confetti around the edges", "typography": "Playfair Display black rose-gold, Great Vibes, Montserrat caps", "palette": "pink to lilac, rose gold, magenta", "decor": "star and dot confetti, gem illustration"}


@design(82)
def admit_one_18(d, c):
    W, H = d.W, d.H
    d.bg("#1E1B2E")
    d.dots(0, 0, W, H, 18, 1, "#3A3555")
    x, y, w, h = W * 0.06, H * 0.12, W * 0.88, H * 0.76
    d.rect(x, y, w, h, "#F4E9D2", rx=14, shadow_=shadow("rgba(0,0,0,0.4)", 24, 0, 10), name="Ticket")
    sx = x + w * 0.74
    for cy in (y, y + h):
        d.circle(sx, cy, 18, "#1E1B2E")
    d.line(sx, y + 24, sx, y + h - 24, "#B33A3A", 2, dash=[6, 6])
    d.rect(x + 14, y + 14, w * 0.74 - 28, h - 28, "", rx=8, stroke="#B33A3A", sw=1.5)
    d.text(x + 30, y + 30, w * 0.7 - 30, "HAPPY 18TH BIRTHDAY", "Montserrat", W * 0.02, "#B33A3A", weight=700, spacing=300)
    s = d.fit("EIGHTEEN", w * 0.64, "Bebas Neue", 140)
    d.text(x + 30, y + 54, w * 0.7 - 30, "EIGHTEEN", "Bebas Neue", s, "#1E1B2E")
    d.text(x + 30, y + 54 + s * 1.05, w * 0.66, "the main character era starts now.", "Playfair Display", W * 0.03, "#4A3F55", italic=True)
    d.text(x + 30, y + h - 70, w * 0.66, c["signature"].upper(), "Montserrat", W * 0.022, "#1E1B2E", weight=700, spacing=200)
    d.text(sx + 10, y + h * 0.18, w * 0.24, "ADMIT\nONE", "Bebas Neue", W * 0.06, "#B33A3A", align="center", lh=0.95)
    d.art("star", sx + w * 0.13, y + h * 0.62, W * 0.1)
    d.text(sx + 10, y + h - 60, w * 0.24, "No. 0018", "Montserrat", W * 0.02, "#4A3F55", weight=600, align="center")
    return {"layout": "cinema ticket with a perforated stub reading ADMIT ONE", "typography": "Bebas Neue, Playfair Display italic, Montserrat caps", "palette": "midnight, ticket cream, cinema red", "decor": "notches, dashed perforation, inner border, star"}


@design(83)
def key_21(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#22305A"), (1, "#0E1530")]))
    d.art("old-key", W * 0.5, H * 0.26, W * 0.62, angle=-20, shadow_=shadow("rgba(0,0,0,0.4)", 24, 0, 10))
    t = d.text(0, H * 0.43, W, "21", "Playfair Display", W * 0.3, "#E9C877", weight=700, align="center", lh=0.9)
    text_metal(d, t)
    d.text(0, H * 0.43 + W * 0.3, W, "the key to the door", "Great Vibes", W * 0.1, "#F2E6CB", align="center")
    d.text(W * 0.12, H * 0.72, W * 0.76, c["message"], "Lora", W * 0.035, "#D7DCEB", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.026, "#E9C877", weight=700, align="center", spacing=300, upper=True)
    return {"layout": "gold key illustration above a gold 21 and script line", "typography": "Playfair Display gold, Great Vibes, Lora italic", "palette": "midnight blue, gold, ivory", "decor": "radial glow, old key illustration"}


@design(84)
def thirty_thriving(d, c):
    W, H = d.W, d.H
    d.bg("#FF6B5A")
    s = d.fit("THIRTY", W * 0.86, "Anton", 500)
    lh = s * FS_MULT * 0.86
    sc = d.fit("& thriving.", W * 0.66, "Great Vibes", 240)
    total = 3 * lh + sc * 0.9
    if total > H * 0.8:
        k = H * 0.8 / total
        s, sc, lh = s * k, sc * k, lh * k
    y = H * 0.05
    for k in range(3):
        d.text(0, y, W, "THIRTY", "Anton", s, "#FFF4E8" if k == 2 else "rgba(0,0,0,0)", align="center", lh=0.86, stroke="#FFF4E8", sw=3)
        y += lh
    d.text(0, y - sc * 0.2, W, "& thriving.", "Great Vibes", sc, "#2B1B4A", align="center")
    d.art("sparkles", W * 0.86, H * 0.08, 150)
    d.text(0, H * 0.91, W, c["message"].upper(), "Montserrat", 36, "#2B1B4A", weight=800, align="center", spacing=420)
    return {"layout": "THIRTY repeated three times (two outlined, one solid) with a script tag", "typography": "Anton outline and solid, Great Vibes, Montserrat caps", "palette": "coral, cream, aubergine", "decor": "type repetition, sparkle illustration"}


@design(85)
def emerald_40(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#0F5A43"), (1, "#062A20")]))
    d.frame_border(W * 0.05, "#C9A45A", 1.2, double=7)
    d.rays(W / 2, H * 0.06, 0, H * 0.45, 14, "#C9A45A", opacity=0.18, start=40, end=140, width_deg=4)
    t = d.text(0, H * 0.12, W, "40", "Playfair Display", W * 0.4, "#E9C877", weight=700, align="center", lh=0.9)
    text_metal(d, t)
    d.text(0, H * 0.12 + W * 0.42, W, "& FABULOUS", "Cinzel", W * 0.07, "#E9C877", weight=700, align="center", spacing=260)
    divider(d, W / 2, H * 0.53, W * 0.4, "#C9A45A", 1, gap=8)
    parts = [p.strip() for p in c["message"].split("·")]
    d.text(W * 0.12, H * 0.57, W * 0.76, parts[0], "Cormorant Garamond", W * 0.05, "#F1EAD8", italic=True, align="center", lh=1.3)
    d.text(W * 0.12, H * 0.7, W * 0.76, "\n".join(parts[1:]), "Cinzel", W * 0.034, "#F1EAD8", weight=600, align="center", lh=1.6)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.022, "#C9A45A", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "deco rays over a gold 40, invitation details centred under a divider", "typography": "Playfair Display, Cinzel, Cormorant Garamond italic", "palette": "emerald, gold, ivory", "decor": "fan rays, double frame, diamond divider"}


@design(86)
def golden_50(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6EA")
    d.texture("paper", 0.45)
    cx, cy = W / 2, H * 0.3
    d.circle(cx, cy, W * 0.24, "#F3E6C5")
    d.laurel(cx, cy, W * 0.25, "#B48A3A", leaves=9, size=W * 0.07, sweep=155)
    t = d.text(0, cy - W * 0.17, W, "50", "Playfair Display", W * 0.27, "#B48A3A", weight=700, align="center", lh=1)
    text_metal(d, t)
    s = d.fit("Happy 50th, Ammar", W * 0.84, "Playfair Display", 60, 600, True)
    d.text(0, H * 0.56, W, "Happy 50th, Ammar", "Playfair Display", s, "#3E3020", weight=600, italic=True, align="center")
    d.text(W * 0.12, H * 0.56 + s * 1.5, W * 0.76, c["message"], "Lora", W * 0.036, "#5B4B38", align="center", lh=1.55)
    d.text(0, H * 0.88, W, c["signature"], "Great Vibes", W * 0.07, "#B48A3A", align="center")
    return {"layout": "gold laurel around 50 in a soft medallion, italic greeting below", "typography": "Playfair Display gold, Lora, Great Vibes", "palette": "ivory, champagne, gold, walnut", "decor": "vector laurel, medallion, paper grain"}


@design(87)
def diamond_60(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#EAF2FB"), (1, "#C9D8EA")]))
    for _ in range(30):
        d.sparkle(d.rng.uniform(40, W - 40), d.rng.uniform(40, H * 0.5), d.rng.uniform(6, 16), "#FFFFFF")
    d.circle(W / 2, H * 0.24, W * 0.3, rad(W * 0.3, W * 0.3, W * 0.3, [(0, "rgba(255,255,255,0.95)"), (1, "rgba(255,255,255,0)")]))
    d.art("gem-stone", W / 2, H * 0.24, W * 0.42)
    t = d.text(0, H * 0.4, W, "60", "Playfair Display", 240, "#7E8590", weight=700, align="center", lh=0.9)
    text_metal(d, t, [(0, "#4A5A70"), (0.45, "#B8C4D3"), (0.6, "#6B7C93"), (1, "#3E4D63")])
    t["shadow"] = shadow("rgba(60,80,110,0.35)", 20, 0, 8)
    d.text(0, H * 0.4 + 260, W, "A DIAMOND BIRTHDAY", "Cinzel", 64, "#2E4560", weight=700, align="center", spacing=200)
    parts = [p.strip() for p in c["message"].split("·")]
    y = H * 0.62
    d.rect(W * 0.1, y, W * 0.8, H * 0.22, "rgba(255,255,255,0.75)", rx=36, stroke="#FFFFFF", sw=2)
    d.text(W * 0.1, y + 40, W * 0.8, parts[0], "Playfair Display", 60, "#2E4560", italic=True, align="center")
    d.text(W * 0.1, y + 130, W * 0.8, "\n".join(parts[1:]), "Montserrat", 40, "#3E5672", weight=600, align="center", lh=1.5)
    d.text(W * 0.1, H * 0.89, W * 0.8, c["signature"], "Lora", 44, "#2E4560", italic=True, align="center")
    return {"layout": "glowing diamond over a silver 60, frosted details card", "typography": "Playfair Display silver, Cinzel, Montserrat, Lora italic", "palette": "ice blue, silver, slate navy", "decor": "white sparkles, glow, gem illustration, frosted card"}


@design(88)
def rose_wreath_70(d, c):
    W, H = d.W, d.H
    d.bg("#FBEFEF")
    cx, cy, R = W / 2, H * 0.3, W * 0.27
    for i in range(24):
        a = 2 * math.pi * i / 24
        d.leaf(cx + R * math.cos(a), cy + R * math.sin(a), 30, 9, math.degrees(a) + 120, "#7FA07A" if i % 2 else "#5F8160")
    for i in range(8):
        a = 2 * math.pi * i / 8 + 0.2
        d.art("rose" if i % 2 else "hibiscus", cx + R * math.cos(a), cy + R * math.sin(a), W * 0.12, angle=i * 30)
    t = d.text(0, cy - W * 0.13, W, "70", "Playfair Display", W * 0.22, "#A23B5C", weight=600, italic=True, align="center", lh=1)
    s = d.fit("Seventy years of love", W * 0.84, "Great Vibes", 70)
    d.text(0, H * 0.56, W, "Seventy years of love", "Great Vibes", s, "#A23B5C", align="center")
    d.text(W * 0.12, H * 0.56 + s * 1.4, W * 0.76, c["message"], "Lora", W * 0.036, "#5A3D46", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.026, "#A23B5C", weight=700, align="center", spacing=280, upper=True)
    return {"layout": "rose wreath around an italic 70, script title and wish below", "typography": "Playfair Display italic, Great Vibes, Lora italic", "palette": "blush, rose, sage", "decor": "leaf ring with rose and hibiscus illustrations"}


@design(89)
def silver_25(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H / 2, W * 0.8, [(0, "#3A3F47"), (1, "#14161A")]))
    d.confetti(0, 0, W, H, ["#E8EBEF", "#A9B0BA", "#FFFFFF"], n=80, size=(4, 12), shapes=("circle", "star", "strip"), avoid=[(W * 0.1, H * 0.12, W * 0.9, H * 0.86)])
    t = d.text(0, H * 0.1, W, "25", "Playfair Display", W * 0.56, "#E8EBEF", weight=800, align="center", lh=0.9)
    text_metal(d, t, SILVER)
    d.text(0, H * 0.6, W, "A QUARTER CENTURY OF YOU", "Cinzel", 40, "#E8EBEF", weight=600, align="center", spacing=160)
    divider(d, W / 2, H * 0.68, W * 0.4, "#A9B0BA", 1.5, gap=10)
    d.text(0, H * 0.72, W, c["message"], "Great Vibes", 110, "#FFFFFF", align="center")
    return {"layout": "giant silver 25 with a caps line and script wish, silver confetti border", "typography": "Playfair Display silver gradient, Cinzel, Great Vibes", "palette": "graphite, silver, white", "decor": "silver confetti, diamond divider"}


@design(90)
def centenarian(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.35, H, [(0, "#6E1A2E"), (1, "#2E0812")]))
    d.frame_border(W * 0.05, "#C9A45A", 1.4, double=8)
    for x, y in [(W * 0.05, W * 0.05), (W * 0.95, W * 0.05), (W * 0.05, H - W * 0.05), (W * 0.95, H - W * 0.05)]:
        d.circle(x, y, 14, "#2E0812", stroke="#C9A45A", sw=1.4)
        d.sparkle(x, y, 9, "#E9C877")
    d.laurel(W / 2, H * 0.26, W * 0.26, "#C9A45A", leaves=10, size=W * 0.06, sweep=160)
    t = d.text(0, H * 0.26 - W * 0.14, W, "100", "Playfair Display", W * 0.22, "#E9C877", weight=700, align="center", lh=1)
    text_metal(d, t)
    d.text(0, H * 0.48, W, "ONE HUNDRED YEARS", "Cinzel", W * 0.055, "#E9C877", weight=700, align="center", spacing=200)
    divider(d, W / 2, H * 0.55, W * 0.36, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.58, W * 0.76, c["message"], "Cormorant Garamond", W * 0.05, "#F3E3E3", italic=True, align="center", lh=1.35)
    d.text(0, H * 0.86, W, c["signature"], "Great Vibes", W * 0.075, "#E9C877", align="center")
    return {"layout": "laurel-crowned 100 in a gold double frame with sparkle corners", "typography": "Playfair Display gold, Cinzel caps, Cormorant Garamond italic, Great Vibes", "palette": "burgundy, gold, rose ivory", "decor": "laurel, double frame, corner medallions"}


# ------------------------------------------------------------------ for someone special
@design(91)
def heart_garland_mom(d, c):
    W, H = d.W, d.H
    d.bg("#FFF5F1")
    d.path([["M", -10, H * 0.06], ["Q", W / 2, H * 0.2, W + 10, H * 0.06]], fill="", stroke="#C98B7C", sw=1.4)
    for k in range(9):
        t = (k + 0.5) / 9
        x = -10 + (W + 20) * t
        y = H * 0.06 + (H * 0.14) * 2 * t * (1 - t)
        d.line(x, y, x, y + 12, "#C98B7C", 1)
        d.heart(x, y + 26, 30, ["#F28B9B", "#F7B6A6", "#E8546F"][k % 3])
    d.art("bouquet", W / 2, H * 0.36, W * 0.4)
    s = d.fit("Happy Birthday, Mom", W * 0.86, "Great Vibes", 80)
    d.text(0, H * 0.53, W, "Happy Birthday, Mom", "Great Vibes", s, "#B33A55", align="center")
    d.text(W * 0.12, H * 0.53 + s * 1.4, W * 0.76, c["message"], "Lora", W * 0.038, "#5A3D46", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.065, "#B33A55", weight=700, align="center")
    return {"layout": "heart garland swagged across the top, bouquet centred, script greeting", "typography": "Great Vibes, Lora italic, Caveat", "palette": "cream, rose, coral, cranberry", "decor": "garland string with nine hearts, bouquet illustration"}


@design(92)
def plaid_dad(d, c):
    W, H = d.W, d.H
    d.bg("#2F4A6B")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 30, 50, "rgba(176,59,59,0.55)")
    path = []
    y = -d.bleed
    while y < H + d.bleed:
        path += [["M", -d.bleed, y], ["L", W + d.bleed, y], ["L", W + d.bleed, y + 30], ["L", -d.bleed, y + 30], ["Z"]]
        y += 80
    d.path(path, fill="rgba(176,59,59,0.45)")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 3, 77, "rgba(255,255,255,0.18)")
    px, py, pw, ph = W * 0.14, H * 0.3, W * 0.72, H * 0.58
    d.rect(px, py, pw, ph, "#F5EEE2", rx=10, shadow_=shadow("rgba(0,0,0,0.35)", 20, 0, 10), name="Pocket")
    d.rect(px + 10, py + 10, pw - 20, ph - 20, "", rx=6, stroke="#B03B3B", sw=1.4, dash=[7, 5])
    d.polygon([(px, py), (px + pw, py), (px + pw, py + ph * 0.2), (W / 2, py + ph * 0.27), (px, py + ph * 0.2)], "#E8DECC")
    d.circle(W / 2, py + ph * 0.2, 9, "#2F4A6B")
    d.art("necktie", W * 0.5, H * 0.13, W * 0.18, angle=0)
    s = d.fit("HAPPY BIRTHDAY,\nDAD", pw * 0.84, "Alfa Slab One", 60)
    d.text(px, py + ph * 0.32, pw, "HAPPY BIRTHDAY,\nDAD", "Alfa Slab One", s, "#2F4A6B", align="center", lh=1.05)
    d.text(px + pw * 0.1, py + ph * 0.32 + s * 2.6, pw * 0.8, c["message"], "Lora", W * 0.034, "#3E3A36", italic=True, align="center", lh=1.45)
    d.text(px, py + ph - 46, pw, c["signature"], "Caveat", W * 0.055, "#B03B3B", weight=700, align="center")
    return {"layout": "plaid shirt background with a stitched pocket holding the message", "typography": "Alfa Slab One, Lora italic, Caveat", "palette": "denim blue, flannel red, canvas cream", "decor": "woven plaid stripes, dashed stitching, button, necktie illustration"}


@design(93)
def two_mugs(d, c):
    W, H = d.W, d.H
    d.bg("#F3E3D3")
    d.texture("paper", 0.35)
    d.rect(-d.bleed, H * 0.66, W + 2 * d.bleed, H * 0.34 + d.bleed, "#C99D7A", name="Table")
    d.art("hot-beverage", W * 0.38, H * 0.56, W * 0.34)
    d.art("hot-beverage", W * 0.62, H * 0.57, W * 0.32, flip=True)
    d.heart(W * 0.5, H * 0.32, 70, "#E36A6A")
    for x in (0.4, 0.6):
        d.path([["M", W * x, H * 0.42], ["C", W * x - 20, H * 0.38, W * x + 20, H * 0.35, W * x, H * 0.31]], fill="", stroke="rgba(255,255,255,0.9)", sw=6)
    s = d.fit("Happy birthday\nto my person", W * 0.8, "Playfair Display", 90, 600, True)
    d.text(0, H * 0.05, W, "Happy birthday\nto my person", "Playfair Display", s, "#5A3424", weight=600, italic=True, align="center", lh=1.05)
    d.text(0, H * 0.78, W, c["message"], "Caveat", 64, "#FFF6EE", weight=700, align="center")
    d.text(0, H * 0.87, W, c["signature"], "Montserrat", 30, "#FFF6EE", weight=700, align="center", spacing=300, upper=True)
    return {"layout": "two mugs side by side on a table with a heart rising from the steam", "typography": "Playfair Display italic, Caveat, Montserrat caps", "palette": "latte, walnut table, cream, heart red", "decor": "paper grain, steam curls, mug illustrations"}


@design(94)
def rose_wife(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#8E1B2C"), (1, "#3D0812")]))
    for _ in range(18):
        d.ellipse(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(6, 12), d.rng.uniform(4, 8), "#C2304A", angle=d.rng.uniform(0, 180), opacity=0.7)
    d.art("bouquet", W / 2, H * 0.27, W * 0.5, shadow_=shadow("rgba(0,0,0,0.35)", 20, 0, 10))
    s = d.fit("To my wife,", W * 0.7, "Great Vibes", 90)
    d.text(0, H * 0.49, W, "To my wife,", "Great Vibes", s, "#F7D9C4", align="center")
    d.text(W * 0.1, H * 0.49 + s * 1.3, W * 0.8, c["message"], "Cormorant Garamond", W * 0.044, "#F7E8E8", italic=True, align="center", lh=1.35)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#F7D9C4", weight=700, align="center", spacing=300, upper=True)
    return {"layout": "rose bouquet on deep red with drifting petals, love letter text below", "typography": "Great Vibes, Cormorant Garamond italic, Montserrat caps", "palette": "deep rose red, blush, ivory", "decor": "radial glow, petals, bouquet illustration"}


@design(95)
def sisters(d, c):
    W, H = d.W, d.H
    d.bg("#F6E7DF")
    d.rect(W * 0.1 + 20, H * 0.08 + 20, W * 0.8, H * 0.52, "#E7B8A8", rx=40)
    d.photo(656, W * 0.1, H * 0.08, W * 0.8, H * 0.52, frame="rounded", rx=40, focus=(0.5, 0.4))
    d.art("two-hearts", W * 0.86, H * 0.1, 150, angle=12)
    s = d.fit("sisters by chance,", W * 0.84, "Playfair Display", 90, 500, True)
    d.text(0, H * 0.65, W, "sisters by chance,", "Playfair Display", s, "#5A3424", weight=500, italic=True, align="center")
    d.text(0, H * 0.65 + s * 1.15, W, "friends by choice", "Great Vibes", s * 1.4, "#C25B4A", align="center")
    d.text(0, H * 0.9, W, c["message"], "Montserrat", 30, "#5A3424", weight=700, align="center", spacing=360)
    return {"layout": "rounded photo with an offset colour block, two-line quote below", "typography": "Playfair Display italic, Great Vibes, Montserrat caps", "palette": "sand, clay, terracotta, cocoa", "decor": "offset photo shadow block, hearts illustration"}


@design(96)
def level_up(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0D0A1F"), (1, "#24124A")]))
    step = 54
    path = []
    for k in range(0, int(W / step) + 2):
        path += [["M", k * step, -d.bleed], ["L", k * step, H + d.bleed]]
    for k in range(0, int(H / step) + 2):
        path += [["M", -d.bleed, k * step], ["L", W + d.bleed, k * step]]
    d.path(path, fill="", stroke="rgba(120,90,255,0.12)", sw=1.5)
    d.art("video-game", W / 2, H * 0.22, W * 0.5, shadow_=shadow("rgba(140,90,255,0.6)", 60, 0, 0))
    s = d.fit("LEVEL 30", W * 0.84, "Bungee", 220)
    d.text(0, H * 0.4, W, "LEVEL 30", "Bungee", s, "#59F0FF", align="center", shadow_=shadow("rgba(89,240,255,0.7)", 24, 0, 0))
    d.text(0, H * 0.4 + s * 1.15, W, "UNLOCKED", "Bungee", s * 0.6, "#FF4FD8", align="center", shadow_=shadow("rgba(255,79,216,0.7)", 20, 0, 0))
    stats = [s_.strip() for s_ in c["message"].split("·")]
    y = H * 0.62
    for k, st in enumerate(stats):
        d.text(W * 0.12, y, W * 0.4, st.split(" ", 1)[1].upper(), "Bungee", 40, "#FFFFFF")
        d.rect(W * 0.5, y + 4, W * 0.38, 36, "rgba(255,255,255,0.12)", rx=6)
        d.rect(W * 0.5, y + 4, W * 0.38 * (0.55 + 0.15 * k), 36, ["#FFD54F", "#FF4FD8", "#59F0FF"][k % 3], rx=6)
        d.text(W * 0.5, y + 6, W * 0.38, st.split(" ", 1)[0], "Bungee", 28, "#0D0A1F", align="center")
        y += 90
    d.text(W * 0.1, H * 0.86, W * 0.8, c["signature"], "DM Sans", 42, "#D9D4FF", weight=600, align="center", lh=1.3)
    return {"layout": "glowing controller above an arcade LEVEL UNLOCKED title and stat bars", "typography": "Bungee with neon glow, DM Sans", "palette": "arcade night, cyan, magenta, gold", "decor": "grid, neon glow, stat bars, controller illustration"}


@design(97)
def grandpa_chair(d, c):
    W, H = d.W, d.H
    d.bg("#F1E6D2")
    d.texture("paper", 0.4)
    d.rect(-d.bleed, H * 0.5, W + 2 * d.bleed, H * 0.5 + d.bleed, "#E3CFAF")
    d.stripes(-d.bleed, H * 0.5, W + d.bleed, H + d.bleed, 4, 38, "rgba(140,100,60,0.18)")
    d.art("couch-and-lamp", W * 0.46, H * 0.43, W * 0.46)
    d.art("hot-beverage", W * 0.82, H * 0.46, W * 0.16)
    d.art("books", W * 0.16, H * 0.47, W * 0.16)
    s = d.fit("Happy Birthday, Grandpa", W * 0.84, "Playfair Display", 70, 700, True)
    d.text(0, H * 0.05, W, "Happy Birthday,", "Playfair Display", s * 1.1, "#4A3524", weight=700, italic=True, align="center")
    d.text(0, H * 0.05 + s * 1.35, W, "Grandpa", "Great Vibes", s * 1.4, "#9A5B2E", align="center")
    d.text(W * 0.1, H * 0.6, W * 0.8, c["message"], "Lora", W * 0.04, "#4A3524", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#9A5B2E", weight=700, align="center", spacing=260, upper=True)
    return {"layout": "cosy corner — sofa, lamp, tea and books on a striped floor, greeting above", "typography": "Playfair Display italic, Great Vibes, Lora italic", "palette": "parchment, oak, tobacco brown", "decor": "paper grain, floorboards, living-room illustrations"}


@design(98)
def neon_heart(d, c):
    W, H = d.W, d.H
    d.bg("#2A1C24")
    bw, bh = 120, 50
    path = []
    for j in range(int(H / bh) + 2):
        off = (bw / 2) if j % 2 else 0
        for i in range(-1, int(W / bw) + 2):
            x, y = i * bw + off, j * bh
            path += [["M", x + 3, y + 3], ["L", x + bw - 3, y + 3], ["L", x + bw - 3, y + bh - 3], ["L", x + 3, y + bh - 3], ["Z"]]
    d.path(path, fill="#3A2630", name="Brick wall")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, rad(W / 2, H * 0.4, W * 0.8, [(0, "rgba(255,60,140,0.25)"), (1, "rgba(0,0,0,0.6)")]))
    hp = "M0 -0.3C0 -0.62 -0.5 -0.72 -0.5 -0.3C-0.5 0 -0.2 0.22 0 0.42C0.2 0.22 0.5 0 0.5 -0.3C0.5 -0.72 0 -0.62 0 -0.3Z"
    from kit import parse_d, transform_path
    hh = transform_path(parse_d(hp), 560, W / 2, H * 0.4)
    d.path(hh, fill="", stroke="#FF3D8B", sw=26, opacity=0.35, shadow_=shadow("rgba(255,61,139,1)", 60, 0, 0))
    d.path(hh, fill="", stroke="#FFB3D1", sw=10, shadow_=shadow("rgba(255,61,139,1)", 30, 0, 0))
    s = d.fit("happy birthday", W * 0.6, "Sacramento", 200)
    d.text(0, H * 0.33, W, "happy birthday", "Sacramento", s, "#FFFFFF", align="center", shadow_=shadow("rgba(89,240,255,1)", 24, 0, 0))
    d.text(0, H * 0.82, W, c["message"], "Righteous", 54, "#59F0FF", align="center", shadow_=shadow("rgba(89,240,255,0.8)", 18, 0, 0))
    return {"layout": "neon heart sign on a brick wall with a glowing script greeting", "typography": "Sacramento neon, Righteous", "palette": "brick plum, neon pink, ice cyan", "decor": "brick pattern, layered neon glow"}


@design(99)
def chalkboard_teacher(d, c):
    W, H = d.W, d.H
    d.bg("#8B5A2B")
    d.rect(W * 0.04, H * 0.06, W * 0.92, H * 0.88, lin(0, 0, W, H, [(0, "#2F4A3D"), (1, "#25392F")]), rx=6, name="Chalkboard")
    d.texture("grain", 0.25)
    d.rect(W * 0.04, H * 0.88, W * 0.92, H * 0.06, "#A87442")
    d.rect(W * 0.7, H * 0.86, 40, 10, "#FFFFFF", rx=3)
    s = d.fit("Happy Birthday, Ms. Reem!", W * 0.8, "Caveat", 70, 700)
    d.text(W * 0.08, H * 0.12, W * 0.84, "Happy Birthday, Ms. Reem!", "Caveat", s, "#FFFFFF", weight=700, align="center")
    d.line(W * 0.2, H * 0.12 + s * 1.15, W * 0.8, H * 0.12 + s * 1.15, "#F7E27A", 3, opacity=0.9)
    d.text(W * 0.14, H * 0.12 + s * 1.4, W * 0.72, c["message"], "Caveat", W * 0.042, "#E8F0EA", align="center", lh=1.2)
    d.text(W * 0.14, H * 0.72, W * 0.72, c["signature"], "Caveat", W * 0.05, "#F7E27A", weight=700, align="center")
    d.art("books", W * 0.12, H * 0.76, W * 0.12)
    d.art("pencil", W * 0.88, H * 0.74, W * 0.1, angle=30)
    d.text(W * 0.06, H * 0.08, 60, "A+", "Caveat", 30, "#F79AA8", weight=700)
    d.star(W * 0.9, H * 0.16, 14, "", stroke="#FFFFFF", sw=1.5)
    return {"layout": "wood-framed chalkboard with chalk handwriting, books and pencil in the corners", "typography": "Caveat in chalk white and yellow", "palette": "chalkboard green, oak, chalk", "decor": "grain texture, chalk ledge, doodles, school illustrations"}


@design(100)
def desk_flatlay(d, c):
    W, H = d.W, d.H
    d.bg("#E9E4DC")
    d.texture("grain", 0.3)
    d.art("laptop", W * 0.26, H * 0.24, W * 0.42, angle=-8)
    d.art("hot-beverage", W * 0.82, H * 0.16, W * 0.2)
    d.art("cupcake", W * 0.82, H * 0.8, W * 0.22)
    d.art("pencil", W * 0.1, H * 0.62, W * 0.16, angle=40)
    d.art("party-popper", W * 0.14, H * 0.86, W * 0.14, angle=-20)
    for (x, y, col, ang) in [(0.52, 0.12, "#FFE27A", 4)]:
        d.rect(W * x, H * y, 180, 180, col, angle=ang, shadow_=shadow("rgba(0,0,0,0.15)", 10, 0, 4))
        d.text(W * x + 14, H * y + 30, 160, "cake @ 3pm\nkitchen!", "Caveat", 40, "#3A3A3A", weight=700, angle=ang)
    cx, cy, w, h = W * 0.2, H * 0.42, W * 0.6, H * 0.38
    d.rect(cx, cy, w, h, "#FFFFFF", rx=20, shadow_=shadow("rgba(0,0,0,0.12)", 30, 0, 12), name="Note card")
    s = d.fit("Happy birthday to\nthe best teammate", w * 0.86, "Outfit", 80, 800)
    d.text(cx + w * 0.07, cy + 40, w * 0.86, "Happy birthday to\nthe best teammate", "Outfit", s, "#1F2A44", weight=800, lh=1.05)
    d.text(cx + w * 0.07, cy + 60 + s * 2.4, w * 0.86, c["message"], "DM Sans", 34, "#4A5468", weight=500, lh=1.35)
    d.text(cx + w * 0.07, cy + h - 64, w * 0.86, c["signature"], "DM Sans", 30, "#E2552D", weight=700)
    return {"layout": "top-down desk flat-lay around a white note card, sticky note and treats", "typography": "Outfit ExtraBold, DM Sans, Caveat", "palette": "linen desk, navy ink, sticky-note yellow, orange", "decor": "grain, laptop, coffee, cupcake, pencil, popper illustrations"}
