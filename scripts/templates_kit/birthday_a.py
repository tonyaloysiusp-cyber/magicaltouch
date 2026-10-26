"""Birthday 001–020: minimalist, luxury black & gold."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width
from common import GOLD, SILVER, metal, text_metal, vgrad, overlay, pill, divider

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


# ------------------------------------------------------------------ minimalist
@design(1)
def cream_lowercase(d, c):
    W, H = d.W, d.H
    m = W * 0.085
    d.bg("#F4EEE6")
    d.texture("paper", 0.55)
    d.circle(W * 0.8, H * 0.36, W * 0.34, "#EBC9B4", opacity=0.55, name="Soft sun")
    d.text(m, H * 0.075, W - 2 * m, "a little note for you", "Montserrat", W * 0.026, "#8A7C70", weight=600, spacing=260, upper=True)
    s = d.fit("birthday", W - 2 * m, "Cormorant Garamond", 140, 400, True)
    y = H * 0.2
    d.text(m, y, W - 2 * m, "happy", "Cormorant Garamond", s, "#2B2724", weight=500, lh=0.8)
    d.text(m, y + s * 0.86, W - 2 * m, "birthday", "Cormorant Garamond", s, "#2B2724", italic=True, lh=0.8)
    for x, yy, r in [(W * 0.78, H * 0.17, 9), (W * 0.86, H * 0.23, 5), (W * 0.71, H * 0.235, 4)]:
        d.sparkle(x, yy, r, "#C08A64")
    y2 = y + s * 2.05
    d.line(m, y2, m + W * 0.22, y2, "#2B2724", 1.2)
    t = d.text(m, y2 + H * 0.03, W * 0.72, c["message"], "Montserrat", W * 0.031, "#5C544D", lh=1.65)
    d.text(m, H - m - W * 0.03, W - 2 * m, c["signature"], "Montserrat", W * 0.024, "#2B2724", weight=700, spacing=300, upper=True)
    return {"layout": "editorial left stack: label, two-line headline, rule, wish, signature at the foot", "typography": "Cormorant Garamond roman + italic, Montserrat tracked caps", "palette": "warm cream, blush sun, espresso ink, copper sparkles", "decor": "paper grain, soft blush circle, three sparkles"}


@design(2)
def thirty_outline(d, c):
    W, H = d.W, d.H
    m = W * 0.09
    d.bg(vgrad(H, "#F3E9DD", "#E7D3BF"))
    d.texture("paper", 0.4)
    num = d.text(0, H * 0.035, W, "30", "Playfair Display", W * 0.62, "", weight=800, align="center", lh=0.9, stroke="#B07A4E", sw=2.2)
    num["fill"] = "rgba(0,0,0,0)"
    d.confetti(m, H * 0.04, W - m, H * 0.5, ["#C7955F", "#E3B98A", "#8E5A36"], n=24, size=(4, 9), shapes=("circle", "star", "rect"), opacity=0.9, avoid=[(W * 0.15, H * 0.08, W * 0.85, H * 0.48)])
    hs = d.fit("Happy Birthday", W * 0.86, "Great Vibes", 92)
    y = H * 0.5
    d.text(0, y, W, "Happy Birthday", "Great Vibes", hs, "#3A2A20", align="center")
    y += hs * 1.3
    divider(d, W / 2, y, W * 0.36, "#B07A4E", 1, gap=8)
    t = d.text(m, y + H * 0.035, W - 2 * m, c["message"], "Playfair Display", W * 0.058, "#3A2A20", italic=True, align="center", lh=1.3)
    d.rect(W / 2 - W * 0.2, H - m - 46, W * 0.4, 34, "#3A2A20", rx=17, name="Label")
    d.text(W / 2 - W * 0.2, H - m - 37, W * 0.4, c["signature"], "Montserrat", W * 0.028, "#F3E9DD", weight=700, align="center", spacing=300, upper=True)
    return {"layout": "large outlined 30 at the top, script greeting and italic wish below, name on a pill", "typography": "Playfair Display outline numeral and italic, Great Vibes, Montserrat caps", "palette": "sand gradient, toffee outline, espresso", "decor": "copper confetti and stars, diamond divider, name label"}


@design(3)
def vertical_letters_green(d, c):
    W, H = d.W, d.H
    band = W * 0.3
    d.bg("#F6F3EC")
    d.rect(-d.bleed, -d.bleed, band + d.bleed, H + 2 * d.bleed, vgrad(H + 2 * d.bleed, "#2F4A3A", "#1E3327"), name="Green band")
    letters = "HAPPY"
    ls = H * 0.13
    top = H * 0.12
    for i, ch in enumerate(letters):
        d.text(0, top + i * ls * 1.02, band, ch, "Cinzel", ls * 0.78, "#F1E7D2", weight=600, align="center")
    d.line(band / 2, H * 0.84, band / 2, H * 0.92, "#C9B27C", 1.2)
    m = band + W * 0.08
    cw = W - m - W * 0.08
    d.art("herb", W - W * 0.2, H * 0.17, W * 0.3, angle=-12)
    d.art("leaf-fluttering-in-wind", m + W * 0.04, H * 0.1, W * 0.13, angle=10, opacity=0.9)
    s = d.fit("Birthday", cw, "Playfair Display", 90, 500, True)
    d.text(m, H * 0.3, cw, "Birthday", "Playfair Display", s, "#1E3327", italic=True, weight=500, lh=0.9)
    y = H * 0.3 + s * 1.25
    d.line(m, y, m + cw * 0.3, y, "#C9A55C", 1.5)
    t = d.text(m, y + H * 0.035, cw, c["message"], "Lora", W * 0.036, "#3E4A42", lh=1.55)
    d.art("seedling", m + cw - W * 0.08, H * 0.78, W * 0.14)
    d.line(m, H * 0.84, m + cw, H * 0.84, "#C9A55C", 0.8)
    d.text(m, H * 0.86, cw, c["signature"], "Montserrat", W * 0.026, "#1E3327", weight=700, spacing=240, upper=True)
    return {"layout": "deep-green side band with HAPPY set vertically; headline and wish on cream", "typography": "Cinzel letters, Playfair Display italic, Lora, Montserrat caps", "palette": "forest green, cream, brass", "decor": "botanical sprig illustrations, brass rules"}


@design(4)
def circle_badge(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H / 2, W * 0.75, [(0, "#F7EFE4"), (1, "#EADAC6")]))
    d.texture("grain", 0.35)
    cx, cy, R = W / 2, H * 0.47, W * 0.33
    d.rays(cx, cy, R * 1.1, R * 1.27, 48, "#C8673F", opacity=0.9, width_deg=2.2)
    d.circle(cx, cy, R, rad(R * 0.7, R * 0.6, R * 1.5, [(0, "#D97A50"), (1, "#B9542F")]), shadow_=shadow("rgba(120,60,30,0.25)", 40, 0, 18), name="Badge")
    d.circle(cx, cy, R * 0.9, "", stroke="#F7E3CF", sw=2, dash=[2, 8], name="Stitch ring")
    d.text(cx - R, cy - R * 0.62, 2 * R, "★  2026  ★" if False else "✦  today  ✦", "Montserrat", W * 0.024, "#F7E3CF", weight=600, align="center", spacing=300, upper=True)
    hs = d.fit("Birthday", R * 1.55, "Playfair Display", 200, 700, True)
    d.text(cx - R, cy - hs * 1.02, 2 * R, "Happy", "Playfair Display", hs * 0.78, "#FFF6EC", weight=600, align="center", lh=0.9)
    d.text(cx - R, cy - hs * 0.18, 2 * R, "Birthday", "Playfair Display", hs, "#FFF6EC", italic=True, weight=700, align="center", lh=0.9)
    d.text(0, H * 0.905, W, c["message"], "Montserrat", W * 0.028, "#6B3A24", weight=600, align="center", spacing=420, upper=True)
    d.sparkle(W * 0.17, H * 0.18, 18, "#C8673F")
    d.sparkle(W * 0.84, H * 0.75, 14, "#C8673F")
    return {"layout": "centred seal badge with a ring of short rays", "typography": "Playfair Display roman + italic, Montserrat tracked caps", "palette": "terracotta, oat cream", "decor": "ray ring, dashed stitch, grain, sparkles"}


@design(5)
def black_block_name(d, c):
    W, H = d.W, d.H
    m = W * 0.075
    d.bg("#F2F0EB")
    bh = H * 0.6
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, bh + d.bleed, "#111111", name="Black block")
    d.dots(m, m, W * 0.42, H * 0.12, 14, 1.6, "#3A3A3A", offset_rows=False)
    head = "Happy\nBirthday,\nNoor."
    s = d.fit(head, W - 2 * m, "Inter", 120, 800, spacing=-30)
    d.text(m, bh - s * 3.2, W - 2 * m, head, "Inter", s, "#FFFFFF", weight=800, lh=0.95, spacing=-30)
    d.circle(W - m - 14, bh - s * 0.72, 12, "#FF4D2E", name="Accent dot")
    d.text(m, bh + H * 0.06, W * 0.7, c["message"], "Inter", W * 0.04, "#111111", weight=500, lh=1.45)
    d.line(m, H - m - 34, W - m, H - m - 34, "#111111", 1)
    d.text(m, H - m - 24, W - 2 * m, c["signature"], "Inter", W * 0.03, "#111111", weight=600)
    d.text(m, H - m - 24, W - 2 * m, "No. 01", "Inter", W * 0.03, "#8A8A8A", weight=500, align="right")
    return {"layout": "Swiss poster: black top block with a three-line name headline, message below", "typography": "Inter ExtraBold tight, Inter Medium", "palette": "black, off-white, signal red", "decor": "dot grid, red full stop dot, hairline footer"}


@design(6)
def single_candle_story(d, c):
    W, H = d.W, d.H
    d.bg("#0B0806")
    d.photo(1339, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.55, 0.62), name="Photo")
    overlay(d, 0.75, 0.0, y0=0, y1=H * 0.55)
    overlay(d, 0.0, 0.85, y0=H * 0.55, y1=H)
    s = d.fit("make a wish", W * 0.84, "Great Vibes", 260)
    d.text(0, H * 0.12, W, "make a wish", "Great Vibes", s, "#FFF3DE", align="center", shadow_=shadow("rgba(255,170,80,0.55)", 40, 0, 0))
    d.text(0, H * 0.12 + s * 1.3, W, c["message"], "Montserrat", 40, "#F5D9A8", weight=600, align="center", spacing=700)
    d.sparkle(W * 0.18, H * 0.1, 22, "#FFE2A8")
    d.sparkle(W * 0.84, H * 0.26, 16, "#FFE2A8")
    d.text(0, H * 0.88, W, "close your eyes · blow · believe", "Montserrat", 30, "#E9D6B8", weight=500, align="center", spacing=300, opacity=0.9)
    return {"layout": "full-bleed candle photo, script headline in the dark sky above", "typography": "Great Vibes with warm glow, Montserrat tracked caps", "palette": "candlelight amber on near-black", "decor": "top and bottom shades, sparkles"}


@design(7)
def hbd_grid(d, c):
    W, H = d.W, d.H
    m = 60
    d.bg("#EFEBE3")
    gw = W - 2 * m
    cell = gw / 3
    top = m + 64
    bottom = H - m - 64
    th = (bottom - top) * 0.58
    d.text(m, m, gw, "Vol. 26 — a birthday issue", "DM Sans", 28, "#111111", weight=600)
    d.text(m, m, gw, "Mono series", "DM Sans", 28, "#7A746B", weight=500, align="right")
    for i, (ch, bgc, fg) in enumerate([("H", "#111111", "#EFEBE3"), ("B", "#EFEBE3", "#111111"), ("D", "#111111", "#EFEBE3")]):
        x = m + i * cell
        d.rect(x, top, cell, th, bgc, stroke="#111111", sw=3)
        fs = cell * 1.12
        d.text(x, top + (th - fs * 1.13) / 2, cell, ch, "Archivo Black", fs, fg, align="center", lh=1)
    y2 = top + th
    h2 = bottom - y2
    d.rect(m, y2, cell, h2, "#FF5A36", stroke="#111111", sw=3)
    d.art("birthday-cake", m + cell / 2, y2 + h2 / 2, min(cell, h2) * 0.72)
    d.rect(m + cell, y2, cell * 2, h2, "#111111", stroke="#111111", sw=3)
    ms = 58
    d.text(m + cell + 40, y2 + 44, cell * 2 - 80, c["message"], "DM Sans", ms, "#EFEBE3", weight=700, lh=1.1)
    d.text(m + cell + 40, y2 + h2 - 80, cell * 2 - 80, "★ ★ ★ ★ ★", "DM Sans", 30, "#FF5A36", weight=700, spacing=200)
    d.text(m, H - m - 32, gw, "happy birthday ✦ happy birthday ✦ happy birthday", "DM Sans", 28, "#111111", weight=600)
    return {"layout": "three-column letter grid H-B-D over a cake tile and a message tile", "typography": "Archivo Black letters, DM Sans", "palette": "black, bone, signal orange", "decor": "heavy rules, cake illustration, star rating"}


@design(8)
def classic_quote_dad(d, c):
    W, H = d.W, d.H
    m = W * 0.09
    d.bg("#F7F3EA")
    d.texture("paper", 0.45)
    d.frame_border(W * 0.045, "#1F2D47", 1.4, double=6)
    d.text(0, H * 0.1, W, c["headline"], "Cinzel", W * 0.036, "#1F2D47", weight=600, align="center", spacing=260, upper=True)
    divider(d, W / 2, H * 0.17, W * 0.3, "#B48A4A", 1, gap=8)
    d.text(0, H * 0.18, W, "“", "Playfair Display", W * 0.32, "#B48A4A", align="center", lh=0.8)
    s = W * 0.088
    d.text(m, H * 0.36, W - 2 * m, c["message"], "Playfair Display", s, "#1F2D47", italic=True, align="center", lh=1.12)
    d.art("necktie", W / 2, H * 0.72, W * 0.16)
    d.text(0, H * 0.79, W, c["signature"], "Great Vibes", W * 0.085, "#1F2D47", align="center")
    return {"layout": "framed quote print: caps kicker, oversized quote mark, italic quote, script sign-off", "typography": "Cinzel, Playfair Display italic, Great Vibes", "palette": "navy, warm paper, antique gold", "decor": "double hairline frame, diamond divider, necktie illustration"}


@design(9)
def three_wishes(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6F1")
    cols = ["#F6B7A6", "#B9D7E8", "#F7DD8C"]
    R = W * 0.25
    pts = [(W * 0.38, H * 0.4), (W * 0.62, H * 0.4), (W * 0.5, H * 0.6)]
    for (x, y), col in zip(pts, cols):
        o = d.circle(x, y, R, col, opacity=0.85)
        o["globalCompositeOperation"] = "multiply"
    for (x, y), lab in zip(pts, ["joy", "luck", "love"]):
        dx = (x - W / 2) * 0.55
        dy = (y - H * 0.47) * 0.75
        d.text(x + dx - 80, y + dy - 18, 160, lab, "Playfair Display", 34, "#3A2C2A", italic=True, align="center")
    s = d.fit("happy birthday", W * 0.8, "Playfair Display", 110, 500)
    d.text(0, H * 0.06, W, "happy birthday", "Playfair Display", s, "#3A2C2A", weight=500, align="center")
    d.text(0, H * 0.88, W, c["message"], "Montserrat", 30, "#3A2C2A", weight=600, align="center", spacing=420, upper=True)
    for x, y in [(W * 0.14, H * 0.3), (W * 0.86, H * 0.66), (W * 0.2, H * 0.76)]:
        d.sparkle(x, y, 14, "#E28E73")
    return {"layout": "Venn of three translucent circles labelled joy / luck / love, headline above", "typography": "Playfair Display, Montserrat tracked caps", "palette": "peach, sky, butter on warm white", "decor": "multiply-blended circles, sparkles"}


@design(10)
def kraft_grandma(d, c):
    W, H = d.W, d.H
    m = W * 0.09
    d.bg("#D2B48C")
    d.texture("paper", 0.9)
    d.rect(m * 0.7, H * 0.06, W - m * 1.4, H * 0.88, "#FBF6EC", rx=6, shadow_=shadow("rgba(80,50,20,0.25)", 18, 0, 6), name="Note card")
    d.rect(W / 2 - 46, H * 0.045, 92, 26, "#E9A6A0", opacity=0.85, angle=-4, name="Washi tape")
    d.dots(W / 2 - 40, H * 0.05, W / 2 + 40, H * 0.07, 8, 1.2, "#FFFFFF", opacity=0.7)
    d.art("teapot", W * 0.36, H * 0.24, W * 0.3)
    d.art("tulip", W * 0.62, H * 0.22, W * 0.22, angle=8)
    d.art("red-heart", W * 0.76, H * 0.14, W * 0.09, angle=12)
    s = d.fit("Happy Birthday", W * 0.74, "Caveat", 70, 700)
    d.text(0, H * 0.37, W, "Happy Birthday", "Caveat", s, "#5B3A25", weight=700, align="center")
    d.text(0, H * 0.37 + s * 1.05, W, "Grandma", "Great Vibes", s * 1.15, "#C0504A", align="center")
    d.text(m * 1.3, H * 0.62, W - m * 2.6, c["message"], "Caveat", W * 0.06, "#5B3A25", align="center", lh=1.15)
    d.text(0, H * 0.84, W, c["signature"], "Caveat", W * 0.065, "#C0504A", weight=600, align="center")
    return {"layout": "cream note card on kraft with washi tape, illustrated teapot and tulip, handwritten text", "typography": "Caveat, Great Vibes", "palette": "kraft brown, cream, rosy red", "decor": "paper texture, washi tape, teapot / tulip / heart illustrations"}


# ------------------------------------------------------------------ luxury black & gold
def _black(d, top="#1A1714", bottom="#050505"):
    d.bg(rad(d.W / 2, d.H * 0.35, max(d.W, d.H) * 0.9, [(0, top), (1, bottom)]))


@design(11)
def gold_script_frame(d, c):
    W, H = d.W, d.H
    _black(d)
    d.rect(W * 0.06, W * 0.06, W * 0.88, H - W * 0.12, "", stroke=metal(W, H), sw=2.5, name="Gold frame")
    d.rect(W * 0.085, W * 0.085, W * 0.83, H - W * 0.17, "", stroke=metal(W, H), sw=0.8, name="Gold frame")
    for x, y in [(W * 0.06, W * 0.06), (W * 0.94, W * 0.06), (W * 0.06, H - W * 0.06), (W * 0.94, H - W * 0.06)]:
        d.polygon([(x, y - 7), (x + 7, y), (x, y + 7), (x - 7, y)], "#E9C877")
    d.confetti(W * 0.12, H * 0.1, W * 0.88, H * 0.3, ["#E9C877", "#B68A3A", "#F7E3A3"], n=22, size=(3, 7), shapes=("circle", "star"))
    s = d.fit("Happy\nBirthday", W * 0.76, "Great Vibes", 120)
    t = d.text(0, H * 0.27, W, "Happy\nBirthday", "Great Vibes", s, "#E9C877", align="center", lh=0.95)
    text_metal(d, t)
    y = H * 0.27 + t["_h"] + H * 0.03
    divider(d, W / 2, y, W * 0.34, "#C9A45A", 1, gap=8)
    d.text(W * 0.15, y + H * 0.04, W * 0.7, c["message"], "Cormorant Garamond", W * 0.05, "#EDE3CF", italic=True, align="center", lh=1.3)
    d.text(0, H * 0.83, W, c["signature"], "Cinzel", W * 0.05, "#E9C877", weight=600, align="center", spacing=500, upper=True)
    return {"layout": "double gold frame with corner diamonds; script headline centred", "typography": "Great Vibes gold gradient, Cormorant Garamond italic, Cinzel caps", "palette": "black, gold foil gradient, champagne", "decor": "gold confetti, diamond divider"}


@design(12)
def art_deco_50(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#0E1A2B", "#060B13"))
    cx = W / 2
    d.rays(cx, H * 0.36, W * 0.2, W * 0.62, 26, "#C9A45A", opacity=0.22, start=180, end=360, width_deg=3)
    for k in range(4):
        r = W * (0.18 + k * 0.05)
        d.circle(cx, H * 0.36, r, "", stroke="#C9A45A", sw=1, opacity=0.6 - k * 0.12, start=180, end=360)
    d.frame_border(W * 0.05, "#C9A45A", 1.2, double=8)
    t = d.text(0, H * 0.17, W, "50", "Cinzel", W * 0.42, "#E9C877", weight=700, align="center", lh=0.9)
    text_metal(d, t)
    d.text(0, H * 0.43, W, "a golden birthday", "Cinzel", W * 0.04, "#E9C877", weight=600, align="center", spacing=420, upper=True)
    d.text(W * 0.12, H * 0.5, W * 0.76, "Celebration", "Great Vibes", W * 0.14, "#F2E6CB", align="center")
    divider(d, cx, H * 0.66, W * 0.4, "#C9A45A", 1, gap=9)
    d.text(W * 0.12, H * 0.69, W * 0.76, c["message"].replace(" · ", "\n"), "Cormorant Garamond", W * 0.045, "#F2E6CB", weight=500, align="center", lh=1.35)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=360, upper=True)
    return {"layout": "deco sunburst behind a gold 50, event details in a stacked centre column", "typography": "Cinzel, Great Vibes, Cormorant Garamond, Montserrat caps", "palette": "midnight navy, antique gold", "decor": "fan rays, concentric arcs, double frame"}


@design(13)
def gold_balloons_40(d, c):
    W, H = d.W, d.H
    _black(d, "#1C1A17", "#070707")
    goldb = [("#D9B45B", 1), ("#151515", 0), ("#E8D3A0", 1), ("#C59A45", 1), ("#202020", 0)]
    pos = [(W * 0.2, H * 0.24, 105), (W * 0.36, H * 0.15, 90), (W * 0.8, H * 0.2, 110), (W * 0.66, H * 0.12, 85), (W * 0.9, H * 0.42, 70)]
    for (x, y, r), (col, _) in zip(pos, goldb):
        d.balloon(x, y, r, col, string="#8C7A55", tail=r * 2.2)
    d.confetti(40, 40, W - 40, H - 40, ["#E9C877", "#B68A3A", "#F7E3A3"], n=55, size=(5, 12), shapes=("circle", "rect", "strip"), avoid=[(W * 0.1, H * 0.48, W * 0.9, H * 0.9)])
    s = d.fit("Cheers to 40", W * 0.86, "Great Vibes", 230)
    t = d.text(0, H * 0.52, W, "Cheers to 40", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    d.text(0, H * 0.52 + s * 1.25, W, c["message"], "Cinzel", 42, "#F2E6CB", weight=600, align="center", spacing=520)
    return {"layout": "balloon cluster across the top, script toast centred below", "typography": "Great Vibes gold gradient, Cinzel caps", "palette": "black, gold, champagne", "decor": "vector gold and black balloons, gold confetti"}


@design(14)
def gold_diamond_monogram(d, c):
    W, H = d.W, d.H
    _black(d, "#16201C", "#050806")
    cx, cy = W / 2, H * 0.33
    R = W * 0.24
    d.polygon([(cx, cy - R), (cx + R, cy), (cx, cy + R), (cx - R, cy)], "", stroke="#C9A45A", sw=1.6)
    d.polygon([(cx, cy - R * 0.86), (cx + R * 0.86, cy), (cx, cy + R * 0.86), (cx - R * 0.86, cy)], "#0F1A15", stroke="#C9A45A", sw=0.8)
    t = d.text(cx - R, cy - R * 0.62, 2 * R, "S", "Cinzel", R * 1.05, "#E9C877", weight=500, align="center", lh=1)
    text_metal(d, t)
    for a in (-1, 1):
        d.line(cx + a * R * 1.2, cy, cx + a * W * 0.42, cy, "#C9A45A", 0.8)
    s = d.fit("Happy Birthday", W * 0.8, "Great Vibes", 90)
    t2 = d.text(0, H * 0.58, W, "Happy Birthday", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t2)
    d.text(W * 0.14, H * 0.58 + s * 1.3, W * 0.72, c["message"], "Cormorant Garamond", W * 0.042, "#E7E1D2", italic=True, align="center", lh=1.35)
    d.text(0, H * 0.9, W, c["signature"], "Cinzel", W * 0.04, "#C9A45A", weight=600, align="center", spacing=600, upper=True)
    return {"layout": "monogram inside a gold diamond, script headline and wish below", "typography": "Cinzel monogram, Great Vibes, Cormorant Garamond italic", "palette": "near-black emerald, gold", "decor": "nested diamonds, gold hairlines"}


@design(15)
def champagne_story(d, c):
    W, H = d.W, d.H
    d.bg("#0A0806")
    d.bg(rad(W / 2, H * 0.3, H * 0.9, [(0, "#3A2A14"), (1, "#070504")]))
    for _ in range(26):
        r = d.rng.uniform(30, 120)
        col = d.rng.choice(["#E9C877", "#F7E3A3", "#C9873A"])
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.6), r, rad(r, r, r, [(0, rgba(col, 0.35)), (0.7, rgba(col, 0.18)), (1, rgba(col, 0))]), name="Bokeh")
    d.art("bottle-with-popping-cork", W * 0.5, H * 0.33, W * 0.62, angle=-8, shadow_=shadow("rgba(0,0,0,0.5)", 40, 0, 20))
    d.confetti(60, 80, W - 60, H * 0.55, ["#E9C877", "#F7E3A3", "#FFFFFF"], n=40, size=(6, 14), shapes=("circle", "star", "strip"))
    s = d.fit("Pop the bubbly", W * 0.86, "Playfair Display", 170, 700, True)
    t = d.text(0, H * 0.6, W, "Pop the bubbly", "Playfair Display", s, "#E9C877", weight=700, italic=True, align="center")
    text_metal(d, t)
    parts = c["message"].split(" · ")
    d.text(0, H * 0.6 + s * 1.35, W, parts[0], "Cinzel", 46, "#F7EBD3", weight=600, align="center", spacing=260)
    d.text(W * 0.1, H * 0.6 + s * 1.35 + 90, W * 0.8, "  ·  ".join(parts[1:]), "Montserrat", 38, "#E9D6B8", weight=500, align="center", spacing=200)
    pill(d, W / 2, H * 0.9, "You're invited", "Montserrat", 30, "#1A140C", "#E9C877")
    return {"layout": "golden bokeh photo, champagne illustration bursting into confetti, invitation text below", "typography": "Playfair Display bold italic gold, Cinzel, Montserrat", "palette": "black, gold bokeh, champagne", "decor": "photo shade, confetti, gold label"}


@design(16)
def laurel_60(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#123326", "#0A1F17"))
    d.frame_border(W * 0.05, "#C9A45A", 1, double=7)
    cx, cy = W / 2, H * 0.3
    d.laurel(cx, cy, W * 0.21, "#C9A45A", leaves=8, size=W * 0.07, sweep=150)
    t = d.text(0, cy - W * 0.17, W, "60", "Playfair Display", W * 0.26, "#E9C877", weight=600, align="center", lh=1)
    text_metal(d, t)
    head = c["headline"].replace(" 60th Birthday", "")
    d.text(0, H * 0.52, W, "the 60th birthday of", "Cormorant Garamond", W * 0.042, "#E7DFC9", italic=True, align="center")
    d.text(W * 0.08, H * 0.565, W * 0.84, head.replace("’s", ""), "Cinzel", W * 0.075, "#E9C877", weight=600, align="center", spacing=120)
    divider(d, cx, H * 0.665, W * 0.36, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.69, W * 0.76, c["message"].replace(" · ", "\n"), "Cormorant Garamond", W * 0.043, "#F1EAD8", weight=500, align="center", lh=1.35)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=360, upper=True)
    return {"layout": "gold laurel wreath around 60, formal invitation lines centred", "typography": "Playfair Display numeral, Cinzel name, Cormorant Garamond", "palette": "bottle green, antique gold, ivory", "decor": "vector laurel, double frame, diamond divider"}


@design(17)
def gold_confetti_bold(d, c):
    W, H = d.W, d.H
    _black(d)
    d.confetti(0, 0, W, H, ["#E9C877", "#B68A3A", "#F7E3A3", "#8A6A2E"], n=140, size=(6, 16), shapes=("circle", "rect", "strip", "star"), avoid=[(W * 0.06, H * 0.28, W * 0.94, H * 0.74)])
    s = d.fit("HAPPY", W * 0.86, "Anton", 400)
    t1 = d.text(0, H * 0.27, W, "HAPPY", "Anton", s, "#E9C877", align="center", lh=0.9)
    t2 = d.text(0, H * 0.27 + s * 0.98, W, "BIRTHDAY", "Anton", d.fit("BIRTHDAY", W * 0.86, "Anton", 400), "#E9C877", align="center", lh=0.9)
    text_metal(d, t1); text_metal(d, t2)
    d.text(0, H * 0.82, W, c["message"], "Great Vibes", 76, "#F7EBD3", align="center")
    return {"layout": "two stacked condensed words filling the width inside a ring of falling confetti", "typography": "Anton gold gradient, Great Vibes", "palette": "black and gold", "decor": "140 pieces of gold confetti"}


@design(18)
def queen_crown(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#4A1B3A"), (1, "#1C0716")]))
    d.dots(0, 0, W, H, 22, 0.9, "#C9A45A", opacity=0.18)
    d.circle(W / 2, H * 0.25, W * 0.26, rad(W * 0.26, W * 0.26, W * 0.26, [(0, "rgba(233,200,119,0.45)"), (1, "rgba(233,200,119,0)")]), name="Glow")
    d.art("crown", W / 2, H * 0.24, W * 0.42, shadow_=shadow("rgba(0,0,0,0.4)", 24, 0, 10))
    s = d.fit("Queen of the Day", W * 0.84, "Playfair Display", 80, 700, True)
    t = d.text(0, H * 0.43, W, "Queen of the Day", "Playfair Display", s, "#E9C877", weight=700, italic=True, align="center")
    text_metal(d, t)
    divider(d, W / 2, H * 0.43 + s * 1.35, W * 0.3, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.43 + s * 1.6, W * 0.76, c["message"], "Cormorant Garamond", W * 0.05, "#F3E6EE", italic=True, align="center", lh=1.3)
    d.text(0, H * 0.86, W, c["signature"], "Great Vibes", W * 0.07, "#E9C877", align="center")
    return {"layout": "glowing crown illustration above a gold italic title", "typography": "Playfair Display bold italic, Cormorant Garamond, Great Vibes", "palette": "deep plum, gold", "decor": "gold dot texture, glow, crown illustration"}


@design(19)
def gold_band_21(d, c):
    W, H = d.W, d.H
    _black(d)
    d.rect(W * 0.08, -d.bleed, 18, H + 2 * d.bleed, metal(18, H), name="Gold band")
    d.rect(W * 0.08 + 30, -d.bleed, 4, H + 2 * d.bleed, metal(4, H), name="Gold band")
    n = d.text(0, H * 0.13, W, "21", "Playfair Display", W * 0.66, "", weight=800, align="center", lh=0.9, stroke="#C9A45A", sw=3)
    n["fill"] = "rgba(0,0,0,0)"
    s = d.fit("Happy 21st", W * 0.8, "Great Vibes", 220)
    t = d.text(0, H * 0.43, W, "Happy 21st", "Great Vibes", s, "#E9C877", align="center", shadow_=shadow("rgba(0,0,0,0.8)", 20, 0, 0))
    text_metal(d, t)
    d.text(W * 0.15, H * 0.43 + s * 1.3, W * 0.7, c["message"], "Cormorant Garamond", 62, "#F2E6CB", italic=True, align="center", lh=1.2)
    d.confetti(W * 0.15, H * 0.68, W * 0.95, H * 0.84, ["#E9C877", "#F7E3A3"], n=26, size=(5, 12), shapes=("circle", "star"))
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 32, "#1A140C", "#E9C877", upper=False, spacing=60)
    return {"layout": "giant outlined 21 behind a script greeting; gold stripe at the edge", "typography": "Playfair Display outline, Great Vibes, Cormorant Garamond", "palette": "black and gold", "decor": "gold stripes, sparkle confetti, handle label"}


@design(20)
def velvet_gift(d, c):
    W, H = d.W, d.H
    d.bg(rad(W * 0.5, H * 0.35, H, [(0, "#7A1428"), (1, "#2A0510")]))
    d.texture("grain", 0.3)
    d.rect(W / 2 - 9, -d.bleed, 18, H * 0.36 + d.bleed, metal(18, H * 0.4), name="Ribbon")
    d.art("wrapped-gift", W / 2, H * 0.33, W * 0.46, shadow_=shadow("rgba(0,0,0,0.45)", 30, 0, 14))
    d.confetti(W * 0.08, H * 0.08, W * 0.92, H * 0.5, ["#E9C877", "#F7E3A3"], n=26, size=(4, 9), shapes=("circle", "star"), avoid=[(W * 0.25, H * 0.15, W * 0.75, H * 0.52)])
    s = d.fit("A little something", W * 0.84, "Playfair Display", 70, 500, True)
    d.text(0, H * 0.56, W, "A little something", "Playfair Display", s, "#F7E8D4", italic=True, weight=500, align="center")
    t = d.text(0, H * 0.56 + s * 1.05, W, "golden", "Great Vibes", s * 2.0, "#E9C877", align="center")
    text_metal(d, t)
    d.text(W * 0.12, H * 0.56 + s * 3.4, W * 0.76, c["message"], "Cormorant Garamond", W * 0.045, "#F2DCDC", italic=True, align="center", lh=1.3)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.026, "#E9C877", weight=600, align="center", spacing=320, upper=True)
    return {"layout": "gift illustration hanging from a gold ribbon, two-tone headline below", "typography": "Playfair Display italic, Great Vibes gold, Cormorant Garamond", "palette": "velvet burgundy, gold", "decor": "grain, gold ribbon, sparkles"}
