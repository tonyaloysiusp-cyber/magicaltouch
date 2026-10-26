"""Birthday 061–080: retro & scrapbook, invitations."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, SILVER, metal, text_metal, vgrad, overlay, pill, divider
from birthday_b import checker

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def polaroid(d, x, y, w, photo, angle, focus=(0.5, 0.4), caption=None, tape="#F3C6CF"):
    h = w * 1.18
    cx, cy = x + w / 2, y + h / 2
    d.rect(cx, cy, w, h, "#FFFFFF", angle=angle, origin_center=True, shadow_=shadow("rgba(0,0,0,0.22)", 14, 0, 6), name="Polaroid")
    pw = w * 0.88
    # photo rotated about the polaroid centre
    a = math.radians(angle)
    ox, oy = 0, -h * 0.07
    pcx, pcy = cx + ox * math.cos(a) - oy * math.sin(a), cy + ox * math.sin(a) + oy * math.cos(a)
    o = d.photo(photo, 0, 0, pw, pw, focus=focus)
    s = o["scaleX"]
    o.update({"originX": "center", "originY": "center", "left": pcx, "top": pcy, "angle": angle})
    if caption:
        ccx, ccy = cx + (-(h * 0.4) * math.sin(a)) * -1 * 0 + (h * 0.4) * -math.sin(a) * -1, cy + (h * 0.4) * math.cos(a)
        d.text(ccx - w / 2, ccy - 12, w, caption, "Caveat", w * 0.11, "#444", align="center", angle=0)
    d.rect(cx + (-h / 2) * -math.sin(a), cy + (-h / 2) * math.cos(a), w * 0.36, w * 0.1, tape, opacity=0.85, angle=angle - 4, origin_center=True, name="Tape")


# ------------------------------------------------------------------ retro & scrapbook
@design(61)
def groovy(d, c):
    W, H = d.W, d.H
    d.bg("#FFF1D6")
    cols = ["#E8572A", "#F29B30", "#F6C744", "#8A4B2A", "#E8572A", "#F29B30"]
    for k, col in enumerate(cols):
        d.wave(-d.bleed, W + d.bleed, H * 0.58 + k * 70, 26, 260, fill=col, bottom=H + d.bleed, phase=k * 0.6)
    for x, y, s_ in [(0.12, 0.12, 150), (0.88, 0.1, 120), (0.82, 0.46, 100), (0.1, 0.5, 90)]:
        d.art("blossom", W * x, H * y, s_, angle=d.rng.uniform(-30, 30))
    s = d.fit("groovy", W * 0.7, "Righteous", 300)
    d.text(0, H * 0.14, W, "groovy", "Righteous", s, "#E8572A", align="center", stroke="#8A4B2A", sw=6, shadow_=shadow("#8A4B2A", 0, 10, 10))
    d.text(0, H * 0.14 + s * 1.12, W, "BIRTHDAY, BABY", "Righteous", 76, "#8A4B2A", align="center", spacing=120)
    d.text(W * 0.1, H * 0.14 + s * 1.12 + 110, W * 0.8, c["message"], "Fredoka", 40, "#8A4B2A", weight=600, align="center")
    return {"layout": "70s wavy stripes rising from the bottom, chunky retro wordmark above", "typography": "Righteous with drop shadow, Fredoka", "palette": "burnt orange, tangerine, mustard, chocolate on cream", "decor": "six wavy stripe bands, flower-power daisies"}


@design(62)
def scrapbook_bff(d, c):
    W, H = d.W, d.H
    d.bg("#F2E8DA")
    d.texture("paper", 0.7)
    d.dots(0, 0, W, H, 16, 0.9, "#D8C7AE")
    polaroid(d, W * 0.06, H * 0.06, W * 0.46, 656, -6, focus=(0.5, 0.35))
    polaroid(d, W * 0.48, H * 0.14, W * 0.44, 784, 7, focus=(0.5, 0.3), tape="#B9DCC9")
    d.art("sparkles", W * 0.86, H * 0.08, W * 0.14)
    d.art("red-heart", W * 0.14, H * 0.48, W * 0.1, angle=-15)
    s = d.fit("Happy Birthday,", W * 0.84, "Caveat", 70, 700)
    d.text(0, H * 0.56, W, "Happy Birthday,", "Caveat", s, "#2D2A26", weight=700, align="center")
    d.rect(W * 0.2, H * 0.56 + s * 1.12, W * 0.6, s * 1.15, "#FFD84D", angle=-2, name="Highlighter")
    d.text(0, H * 0.56 + s * 1.12, W, "best friend!", "Caveat", s * 1.05, "#2D2A26", weight=700, align="center")
    d.text(W * 0.1, H * 0.56 + s * 2.5, W * 0.8, c["message"], "Caveat", W * 0.052, "#4A4036", align="center", lh=1.1)
    d.text(0, H * 0.92, W, c["signature"], "Caveat", W * 0.06, "#C2405E", weight=700, align="center")
    return {"layout": "two taped polaroids overlapping at the top, handwritten note below", "typography": "Caveat bold", "palette": "kraft paper, black ink, highlighter yellow, rose", "decor": "polaroids with washi tape, dot grid, heart and sparkle stickers"}


@design(63)
def synthwave(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#12002E"), (0.55, "#3B0A5E"), (1, "#0B0020")]))
    for _ in range(70):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.45), d.rng.uniform(0.8, 2.4), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    hz = H * 0.6
    cx = W / 2
    d.circle(cx, hz - 40, W * 0.34, lin(0, 0, 0, W * 0.68, [(0, "#FFE36E"), (0.5, "#FF7B54"), (1, "#FF2E88")]), name="Sun")
    for k in range(7):
        y = hz - 40 + k * 34 - 90
        d.rect(cx - W * 0.36, y, W * 0.72, 6 + k * 3, "#3B0A5E")
    d.polygon([(-d.bleed, hz), (W * 0.18, hz - 150), (W * 0.32, hz - 60), (W * 0.45, hz)], "#1A0638")
    d.polygon([(W * 0.55, hz), (W * 0.74, hz - 190), (W * 0.88, hz - 90), (W + d.bleed, hz)], "#1A0638")
    d.rect(-d.bleed, hz, W + 2 * d.bleed, H - hz + d.bleed, "#0B0020")
    for k in range(12):
        t = (k / 11) ** 1.8
        y = hz + t * (H - hz)
        d.line(-d.bleed, y, W + d.bleed, y, "#FF2E88", 2.5, opacity=0.8)
    for k in range(-10, 11):
        d.line(cx + k * 40, hz, cx + k * 260, H + d.bleed, "#FF2E88", 2.5, opacity=0.8)
    s = d.fit("HAPPY\nBIRTHDAY", W * 0.86, "Monoton", 200)
    t = d.text(0, H * 0.07, W, "HAPPY\nBIRTHDAY", "Monoton", s, "#FFFFFF", align="center", lh=1.05, shadow_=shadow("rgba(255,46,136,0.9)", 30, 0, 0))
    t["fill"] = lin(0, 0, 0, t["_h"], [(0, "#E8F7FF"), (0.48, "#7FD6FF"), (0.52, "#FF6EC7"), (1, "#FFE36E")])
    d.text(0, H * 0.82, W, c["message"], "Righteous", 54, "#7FF3FF", align="center", shadow_=shadow("rgba(127,243,255,0.8)", 18, 0, 0))
    return {"layout": "neon wordmark over a striped synth sun, mountains and a perspective grid", "typography": "Monoton with chrome gradient and glow, Righteous", "palette": "midnight purple, hot pink, cyan, sunset gold", "decor": "stars, retro sun stripes, perspective grid"}


@design(64)
def vintage_label(d, c):
    W, H = d.W, d.H
    d.bg("#2C1A12")
    d.texture("grain", 0.3)
    d.rect(W * 0.08, H * 0.07, W * 0.84, H * 0.86, "#F1E4C8", rx=24, name="Label")
    d.rect(W * 0.11, H * 0.09, W * 0.78, H * 0.82, "", rx=18, stroke="#7A2E1F", sw=2)
    d.rect(W * 0.125, H * 0.1, W * 0.75, H * 0.8, "", rx=14, stroke="#7A2E1F", sw=0.8)
    d.text(0, H * 0.14, W, "EST. 1976 · RESERVE", "Cinzel", W * 0.03, "#7A2E1F", weight=700, align="center", spacing=300)
    d.text(0, H * 0.2, W, "Vintage", "Great Vibes", W * 0.13, "#7A2E1F", align="center")
    s = d.fit("FIFTY", W * 0.62, "Abril Fatface", 120)
    d.text(0, H * 0.33, W, "FIFTY", "Abril Fatface", s, "#2C1A12", align="center")
    ry = H * 0.33 + s * 1.25
    d.polygon([(W * 0.16, ry), (W * 0.84, ry), (W * 0.8, ry + 24), (W * 0.84, ry + 48), (W * 0.16, ry + 48), (W * 0.2, ry + 24)], "#7A2E1F")
    d.text(W * 0.2, ry + 10, W * 0.6, c["signature"], "Cinzel", W * 0.032, "#F1E4C8", weight=700, align="center", spacing=200, upper=True)
    d.text(W * 0.18, ry + 80, W * 0.64, c["message"], "Libre Baskerville", W * 0.036, "#4A2A1C", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.84, W, "★  100% LEGEND  ★", "Cinzel", W * 0.028, "#7A2E1F", weight=700, align="center", spacing=200)
    return {"layout": "vintage bottle label: double rounded border, script over a heavy FIFTY, ribbon banner", "typography": "Great Vibes, Abril Fatface, Cinzel, Libre Baskerville italic", "palette": "cream label, oxblood, dark walnut", "decor": "laurel, cut-end ribbon, double border, grain"}


@design(65)
def newspaper(d, c):
    W, H = d.W, d.H
    m = W * 0.06
    d.bg("#F4EFE4")
    d.texture("paper", 0.6)
    ink = "#1E1B18"
    d.text(m, m, W - 2 * m, "The Birthday Times", "Playfair Display", d.fit("The Birthday Times", W - 2 * m, "Playfair Display", 70, 800), ink, weight=800, align="center")
    y = m + 70
    d.line(m, y, W - m, y, ink, 2)
    d.text(m, y + 6, W - 2 * m, "SPECIAL EDITION", "Inter", 9, ink, weight=700, spacing=200)
    d.text(m, y + 6, W - 2 * m, "PRICE: ONE SLICE OF CAKE", "Inter", 9, ink, weight=700, spacing=200, align="right")
    d.line(m, y + 24, W - m, y + 24, ink, 0.8)
    s = d.fit("LOCAL LEGEND\nTURNS 30", W - 2 * m, "Anton", 90)
    d.text(m, y + 36, W - 2 * m, "LOCAL LEGEND\nTURNS 30", "Anton", s, ink, lh=0.95)
    y2 = y + 36 + s * FS_MULT * 1.95 + 10
    ph = H * 0.26
    d.photo(1409, m, y2, W - 2 * m, ph, focus=(0.45, 0.45), filters=[{"type": "Grayscale", "mode": "average"}])
    d.text(m, y2 + ph + 4, W - 2 * m, "Pictured: the cake, moments before the incident.", "Libre Baskerville", 8.5, "#55504A", italic=True)
    y3 = y2 + ph + 26
    cw = (W - 2 * m - 18) / 2
    d.text(m, y3, cw, c["message"], "Libre Baskerville", 11.5, ink, lh=1.5)
    d.line(m + cw + 9, y3, m + cw + 9, H - m - 10, ink, 0.6)
    d.text(m + cw + 18, y3, cw, c["signature"], "Libre Baskerville", 11.5, ink, italic=True, lh=1.5)
    d.rect(m + cw + 18, H - m - 70, cw, 60, ink)
    d.text(m + cw + 18, H - m - 56, cw, "PARTY TONIGHT\nDETAILS INSIDE", "Anton", 15, "#F4EFE4", align="center", lh=1.1)
    return {"layout": "front page: masthead, banner headline, black-and-white photo, two columns", "typography": "Playfair Display masthead, Anton headline, Libre Baskerville body", "palette": "newsprint, ink black", "decor": "paper texture, rules, grayscale cake photo, boxed teaser"}


@design(66)
def diner_shake(d, c):
    W, H = d.W, d.H
    d.bg("#7FD1C7")
    checker(d, -d.bleed, H * 0.7, W + d.bleed, H + d.bleed, 60, "#111111", "#FFFFFF")
    d.rect(-d.bleed, H * 0.66, W + 2 * d.bleed, H * 0.05, "#E8456B")
    d.circle(W / 2, H * 0.47, W * 0.24, "#FFE1E8", stroke="#E8456B", sw=10)
    d.art("soft-ice-cream", W * 0.43, H * 0.46, W * 0.3, angle=-8)
    d.art("tropical-drink", W * 0.6, H * 0.49, W * 0.25, angle=8)
    d.art("sparkles", W * 0.84, H * 0.22, 100)
    s = d.fit("Shake it,", W * 0.6, "Pacifico", 120)
    d.text(0, H * 0.05, W, "Shake it,", "Pacifico", s, "#E8456B", align="center", stroke="#FFFFFF", sw=6)
    d.text(0, H * 0.05 + s * 1.55, W, "IT’S YOUR BIRTHDAY!", "Righteous", 54, "#1B4D57", align="center", spacing=60)
    pill(d, W / 2, H * 0.78, c["message"], "Pacifico", 54, "#FFFFFF", "#E8456B", upper=False, spacing=0, weight=400)
    return {"layout": "retro diner: milkshake and soda in a pink disc above a chequered floor", "typography": "Pacifico, Righteous", "palette": "mint, cherry pink, black and white", "decor": "checker floor, ringed disc, dessert illustrations"}


@design(67)
def mixtape(d, c):
    W, H = d.W, d.H
    d.bg("#F2A541")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 30, 30, "rgba(255,255,255,0.12)", angle_deg=25)
    x, y, w, h = W * 0.14, H * 0.14, W * 0.72, H * 0.72
    d.rect(x, y, w, h, "#2B2B2B", rx=22, shadow_=shadow("rgba(0,0,0,0.35)", 20, 0, 12), name="Cassette")
    d.rect(x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.56, "#FFF4E0", rx=10, name="Label")
    d.rect(x + w * 0.06, y + h * 0.08, w * 0.88, h * 0.1, "#E2552D", rx=0)
    d.rect(x + w * 0.06, y + h * 0.18, w * 0.88, h * 0.04, "#3E8E7E")
    d.text(x + w * 0.1, y + h * 0.095, w * 0.4, "SIDE A", "Righteous", h * 0.06, "#FFF4E0")
    d.text(x + w * 0.5, y + h * 0.095, w * 0.4, "90 MIN", "Righteous", h * 0.06, "#FFF4E0", align="right")
    s = d.fit("Happy Birthday, Rami", w * 0.82, "Caveat", 60, 700)
    d.text(x + w * 0.09, y + h * 0.26, w * 0.82, "Happy Birthday, Rami", "Caveat", s, "#2B2B2B", weight=700, align="center")
    d.rect(x + w * 0.24, y + h * 0.42, w * 0.52, h * 0.17, "#2B2B2B", rx=h * 0.085)
    for cx_ in (x + w * 0.34, x + w * 0.66):
        d.circle(cx_, y + h * 0.505, h * 0.06, "#FFF4E0")
        d.circle(cx_, y + h * 0.505, h * 0.03, "#2B2B2B")
    d.polygon([(x + w * 0.2, y + h), (x + w * 0.26, y + h * 0.76), (x + w * 0.74, y + h * 0.76), (x + w * 0.8, y + h)], "#3A3A3A")
    for k in range(4):
        d.circle(x + w * (0.32 + k * 0.12), y + h * 0.88, 5, "#1B1B1B")
    d.text(x + w * 0.06, y + h * 0.66, w * 0.88, c["message"], "Caveat", h * 0.075, "#FFF4E0", align="center")
    return {"layout": "big cassette tape with a handwritten label on diagonal retro stripes", "typography": "Caveat bold, Righteous", "palette": "tape black, cream label, orange, teal, marigold", "decor": "vector cassette with reels and screws, diagonal stripes"}


@design(68)
def stamps_story(d, c):
    W, H = d.W, d.H
    d.bg("#F6EEDF")
    d.texture("paper", 0.6)
    # airmail border
    stripe = []
    k = 0
    for side in range(4):
        pass
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, 40, 40, 40, "#D64545", angle_deg=-35)
    d.stripes(-d.bleed, H - 40, W + d.bleed, H + d.bleed, 40, 40, "#2F5DA8", angle_deg=-35)
    def stamp(cx, cy, w, h, art, bg, ang):
        d.rect(cx, cy, w, h, "#FFFFFF", origin_center=True, angle=ang, shadow_=shadow("rgba(0,0,0,0.18)", 10, 0, 4), name="Stamp")
        d.rect(cx, cy, w - 28, h - 28, bg, origin_center=True, angle=ang)
        d.art(art, cx, cy - h * 0.05, min(w, h) * 0.6, angle=ang)
        d.circle(cx, cy, w * 0.5 + 6, "", stroke="#FFFFFF", sw=10, dash=[1, 15], opacity=0)
    stamp(W * 0.3, H * 0.2, 300, 360, "rose", "#F7D6D0", -6)
    stamp(W * 0.72, H * 0.24, 280, 340, "birthday-cake", "#D8E7F5", 5)
    stamp(W * 0.5, H * 0.42, 260, 310, "wrapped-gift", "#FCE9B8", -2)
    for cx_, cy_ in [(W * 0.66, H * 0.36)]:
        d.circle(cx_, cy_, 120, "", stroke="#5A4A3A", sw=4, opacity=0.6)
        d.circle(cx_, cy_, 96, "", stroke="#5A4A3A", sw=2, opacity=0.6)
        for k in range(4):
            d.wave(cx_ + 110, cx_ + 360, cy_ - 40 + k * 26, 6, 60, stroke="#5A4A3A", sw=3, opacity=0.6)
    s = d.fit("Special\ndelivery!", W * 0.84, "Playfair Display", 190, 800, True)
    d.text(0, H * 0.56, W, "Special\ndelivery!", "Playfair Display", s, "#2F5DA8", weight=800, italic=True, align="center", lh=1.0)
    d.text(W * 0.08, H * 0.56 + s * 2.35, W * 0.84, c["message"], "Caveat", 60, "#D64545", weight=700, align="center")
    pill(d, W / 2, H * 0.92, "par avion · first class", "Montserrat", 30, "#F6EEDF", "#2F5DA8", spacing=200)
    return {"layout": "three postage stamps and a postmark above an airmail headline", "typography": "Playfair Display black italic, Caveat, Montserrat caps", "palette": "envelope cream, airmail red and blue", "decor": "airmail stripes, stamps with illustrations, postmark waves"}


@design(69)
def pop_art(d, c):
    W, H = d.W, d.H
    d.bg("#FFE234")
    step = 22
    path = []
    for j in range(int(H / step) + 1):
        for i in range(int(W / step) + 1):
            x, y = i * step + (step / 2 if j % 2 else 0), j * step
            r = 4.5
            path += [["M", x - r, y], ["C", x - r, y - r * .55, x - r * .55, y - r, x, y - r], ["C", x + r * .55, y - r, x + r, y - r * .55, x + r, y], ["C", x + r, y + r * .55, x + r * .55, y + r, x, y + r], ["C", x - r * .55, y + r, x - r, y + r * .55, x - r, y], ["Z"]]
    d.path(path, fill="#F7B500", name="Halftone")
    d.star(W / 2, H * 0.4, W * 0.48, "#111111", points=14, inner=0.72, angle=-80)
    d.star(W / 2 - 10, H * 0.4 - 10, W * 0.46, "#E52521", points=14, inner=0.72, angle=-80)
    d.star(W / 2 - 10, H * 0.4 - 10, W * 0.3, "#FFFFFF", points=12, inner=0.8, angle=-70)
    s = d.fit("POW!", W * 0.5, "Bangers" if False else "Luckiest Guy", 260)
    d.text(0, H * 0.4 - s * 0.62, W, "POW!", "Luckiest Guy", s, "#1E5BC6", align="center", stroke="#111111", sw=8, angle=0)
    d.rect(W * 0.1 + 12, H * 0.74 + 12, W * 0.8, 150, "#111111")
    d.rect(W * 0.1, H * 0.74, W * 0.8, 150, "#FFFFFF", stroke="#111111", sw=6)
    d.text(W * 0.1, H * 0.74 + 22, W * 0.8, "IT’S YOUR BIRTHDAY!", "Luckiest Guy", 64, "#E52521", align="center")
    d.text(W * 0.1, H * 0.74 + 92, W * 0.8, c["message"], "Fredoka", 36, "#111111", weight=600, align="center")
    return {"layout": "comic burst with POW!, caption box below with a hard shadow", "typography": "Luckiest Guy outlined, Fredoka", "palette": "comic yellow, red, blue, black", "decor": "halftone dots, layered starbursts"}


@design(70)
def washi_letter(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    step = 16
    path = []
    x = 0
    while x <= W:
        path += [["M", x, -d.bleed], ["L", x, H + d.bleed]]
        x += step
    y = 0
    while y <= H:
        path += [["M", -d.bleed, y], ["L", W + d.bleed, y]]
        y += step
    d.path(path, fill="", stroke="#DCE8F2", sw=0.8, name="Grid paper")
    d.rect(-10, H * 0.05, W * 0.5, 30, "#F7B7C7", opacity=0.85, angle=-4, name="Washi tape")
    d.stripes(0, H * 0.04, W * 0.48, H * 0.1, 6, 10, "rgba(255,255,255,0.6)", angle_deg=-30)
    d.rect(W * 0.6, H * 0.9, W * 0.5, 30, "#A8D8C8", opacity=0.85, angle=5, name="Washi tape")
    m = W * 0.1
    s = d.fit("happy birthday!!", W * 0.8, "Caveat", 70, 700)
    d.text(m, H * 0.13, W - 2 * m, "happy birthday!!", "Caveat", s, "#E0457B", weight=700)
    d.text(m, H * 0.16 + s * 1.1, W - 2 * m, "Dear birthday person,", "Caveat", W * 0.065, "#2E3A59", weight=600)
    d.text(m, H * 0.16 + s * 1.1 + W * 0.12, W - 2 * m, c["message"], "Caveat", W * 0.08, "#2E3A59", lh=1.2)
    d.text(m, H * 0.74, W - 2 * m, c["signature"], "Caveat", W * 0.07, "#E0457B", weight=700)
    for x, y in [(0.84, 0.16), (0.78, 0.72)]:
        d.star(W * x, H * y, 16, "#FFC93C", stroke="#2E3A59", sw=1.5)
    d.heart(W * 0.88, H * 0.66, 30, "#E0457B")
    d.art("love-letter", W * 0.8, H * 0.82, W * 0.18, angle=-8)
    return {"layout": "handwritten letter on grid paper held by washi tape, doodles in the margin", "typography": "Caveat", "palette": "white grid, ink navy, pink, mint, star yellow", "decor": "grid lines, washi tape strips, doodle stars and heart, letter illustration"}


# ------------------------------------------------------------------ invitations
def details_lines(c):
    return [p.strip() for p in c["message"].split("·")]


@design(71)
def pool_party(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#5FD3F3"), (1, "#1F9FD6")]))
    for k in range(9):
        d.wave(-d.bleed, W + d.bleed, H * (0.08 + k * 0.1), 6, 70, stroke="rgba(255,255,255,0.35)", sw=3, phase=k)
    d.art("ring-buoy", W * 0.2, H * 0.16, W * 0.3, angle=-12)
    d.art("tropical-drink", W * 0.82, H * 0.14, W * 0.22, angle=10)
    s = d.fit("POOL\nPARTY", W * 0.6, "Luckiest Guy", 110)
    d.text(0, H * 0.27, W, "POOL\nPARTY", "Luckiest Guy", s, "#FFFFFF", align="center", lh=0.95, stroke="#0E6C9C", sw=6, shadow_=shadow("#FF6F61", 0, 6, 6))
    p = details_lines(c)
    y = H * 0.6
    d.rect(W * 0.08, y, W * 0.84, H * 0.28, "#FFFFFF", rx=20, shadow_=shadow("rgba(0,60,90,0.25)", 20, 0, 8))
    d.text(W * 0.1, y + 16, W * 0.8, p[0], "Fredoka", W * 0.05, "#FF6F61", weight=700, align="center")
    d.text(W * 0.1, y + 16 + W * 0.075, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.035, "#1F5E7A", weight=500, align="center", lh=1.35)
    pill(d, W / 2, H * 0.93, c["signature"], "Fredoka", W * 0.03, "#FFFFFF", "#FF6F61", weight=700, spacing=60)
    return {"layout": "pool-water background with floats, big outlined title, white details card", "typography": "Luckiest Guy, Fredoka", "palette": "pool blues, coral, white", "decor": "ripple lines, ring float, drink and sunglasses illustrations"}


@design(72)
def navy_blush_dinner(d, c):
    W, H = d.W, d.H
    d.bg("#14213D")
    aw, ah = W * 0.72, H * 0.78
    ax, ay = (W - aw) / 2, H * 0.12
    d.path([["M", ax, ay + ah], ["L", ax, ay + aw / 2], ["C", ax, ay + aw * 0.22, ax + aw * 0.22, ay, W / 2, ay], ["C", ax + aw * 0.78, ay, ax + aw, ay + aw * 0.22, ax + aw, ay + aw / 2], ["L", ax + aw, ay + ah], ["Z"]], fill="#F6DCD5", name="Arch")
    d.art("wine-glass", W / 2, ay + aw * 0.22, W * 0.12)
    d.text(ax, ay + aw * 0.36, aw, "a birthday dinner honouring", "Lora", W * 0.034, "#14213D", italic=True, align="center")
    s = d.fit("Hessa Al Mansoori", aw * 0.84, "Great Vibes", 70)
    d.text(ax, ay + aw * 0.44, aw, "Hessa Al Mansoori", "Great Vibes", s, "#14213D", align="center")
    divider(d, W / 2, ay + aw * 0.44 + s * 1.35, aw * 0.4, "#B48A4A", 1, gap=8)
    d.text(ax + aw * 0.08, ay + aw * 0.44 + s * 1.55, aw * 0.84, c["message"].replace(" · ", "\n"), "Cinzel", W * 0.032, "#14213D", weight=600, align="center", lh=1.6, spacing=60)
    d.text(ax + aw * 0.08, ay + ah - W * 0.12, aw * 0.84, c["signature"].replace(" · ", "\n"), "Montserrat", W * 0.022, "#5B6378", weight=600, align="center", spacing=200, upper=True, lh=1.7)
    return {"layout": "blush arch panel on navy holding a formal dinner invitation", "typography": "Great Vibes name, Lora italic, Cinzel details, Montserrat caps", "palette": "navy, blush, antique gold", "decor": "arch panel, wine glass illustration, diamond divider"}


@design(73)
def slumber_party(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1D1347"), (1, "#4A2B8C")]))
    for _ in range(50):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.6), d.rng.uniform(0.6, 2), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    d.art("crescent-moon", W * 0.84, H * 0.37, W * 0.13)
    d.rect(-d.bleed, H * 0.58, W + 2 * d.bleed, H * 0.42 + d.bleed, "#2E1E66")
    d.art("tent", W * 0.26, H * 0.52, W * 0.34)
    d.art("tent", W * 0.72, H * 0.53, W * 0.3, flip=True)
    d.art("popcorn", W * 0.5, H * 0.56, W * 0.16)
    s = d.fit("SLUMBER\nPARTY", W * 0.8, "Luckiest Guy", 90)
    d.text(0, H * 0.08, W, "SLUMBER\nPARTY", "Luckiest Guy", s, "#FFD36E", align="center", lh=0.95)
    p = details_lines(c)
    d.text(W * 0.08, H * 0.66, W * 0.84, p[0], "Fredoka", W * 0.042, "#FFFFFF", weight=600, align="center")
    d.text(W * 0.08, H * 0.66 + W * 0.13, W * 0.84, "\n".join(p[1:]), "Fredoka", W * 0.036, "#D9CCFF", weight=500, align="center", lh=1.35)
    pill(d, W / 2, H * 0.92, c["signature"], "Fredoka", W * 0.028, "#2E1E66", "#FFD36E", weight=700, spacing=40)
    return {"layout": "night campout: two tents and popcorn under the moon, title in the stars", "typography": "Luckiest Guy, Fredoka", "palette": "night indigo, violet, star yellow", "decor": "stars, moon, tents and popcorn illustrations"}


@design(74)
def brunch_bubbles(d, c):
    W, H = d.W, d.H
    d.bg("#FCE4D6")
    d.circle(W / 2, H * 0.27, W * 0.3, "#F8CBB4", name="Plate")
    d.circle(W / 2, H * 0.27, W * 0.25, "#FFFFFF")
    d.art("pancakes", W * 0.44, H * 0.27, W * 0.3)
    d.art("clinking-glasses", W * 0.66, H * 0.2, W * 0.2, angle=8)
    d.art("hot-beverage", W * 0.24, H * 0.36, W * 0.14)
    s = d.fit("brunch & bubbles", W * 0.86, "Great Vibes", 80)
    d.text(0, H * 0.5, W, "brunch & bubbles", "Great Vibes", s, "#B5523B", align="center")
    p = details_lines(c)
    d.text(W * 0.1, H * 0.5 + s * 1.35, W * 0.8, p[0], "Lora", W * 0.04, "#6E3B2E", italic=True, align="center")
    d.text(W * 0.1, H * 0.5 + s * 1.35 + W * 0.08, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.03, "#6E3B2E", weight=600, align="center", lh=1.6, spacing=120, upper=True)
    d.text(0, H * 0.9, W, c["signature"], "Caveat", W * 0.055, "#B5523B", weight=700, align="center")
    return {"layout": "pancakes on a plate with bubbly and coffee, script title and details below", "typography": "Great Vibes, Lora italic, Montserrat caps, Caveat", "palette": "peach, terracotta, cocoa", "decor": "plate rings, brunch illustrations"}


@design(75)
def superhero(d, c):
    W, H = d.W, d.H
    d.bg("#1E4FD8")
    d.rays(W / 2, H * 0.3, 0, H * 1.2, 24, "#2C63F0", start=0, end=360)
    # skyline
    x = -d.bleed
    while x < W + d.bleed:
        bw = d.rng.uniform(40, 80)
        bh = d.rng.uniform(H * 0.1, H * 0.24)
        d.rect(x, H * 0.62 - bh, bw, bh + H * 0.4, "#122E85")
        x += bw + 4
    # shield emblem
    cx, cy, r = W / 2, H * 0.27, W * 0.22
    d.path([["M", cx, cy - r], ["L", cx + r, cy - r * 0.7], ["C", cx + r, cy + r * 0.3, cx + r * 0.5, cy + r * 0.8, cx, cy + r], ["C", cx - r * 0.5, cy + r * 0.8, cx - r, cy + r * 0.3, cx - r, cy - r * 0.7], ["Z"]], fill="#FFD23F", stroke="#111111", sw=5, name="Shield")
    d.star(cx, cy - r * 0.05, r * 0.55, "#E63946", stroke="#111111", sw=4)
    d.text(cx - r, cy - r * 0.32, 2 * r, "7", "Luckiest Guy", r * 0.6, "#FFFFFF", align="center", stroke="#111111", sw=3)
    s = d.fit("CALLING ALL\nHEROES!", W * 0.86, "Luckiest Guy", 80)
    d.text(0, H * 0.5, W, "CALLING ALL\nHEROES!", "Luckiest Guy", s, "#FFD23F", align="center", lh=0.95, stroke="#111111", sw=5)
    p = details_lines(c)
    y = H * 0.5 + s * 2.2
    d.rect(W * 0.08, y, W * 0.84, H * 0.22, "#FFFFFF", stroke="#111111", sw=4)
    d.text(W * 0.1, y + 12, W * 0.8, p[0], "Fredoka", W * 0.038, "#E63946", weight=700, align="center")
    d.text(W * 0.1, y + 12 + W * 0.11, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.032, "#122E85", weight=600, align="center", lh=1.35)
    pill(d, W / 2, H * 0.94, c["signature"], "Fredoka", W * 0.028, "#111111", "#FFD23F", weight=700, spacing=40)
    return {"layout": "comic-rays sky over a city skyline, original star shield with the age, mission card", "typography": "Luckiest Guy outlined, Fredoka", "palette": "hero blue, gold, red, black", "decor": "sunburst rays, skyline, shield emblem"}


@design(76)
def tea_party_80(d, c):
    W, H = d.W, d.H
    d.bg("#FFF8F2")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H * 0.1, 18, 18, "#F7D6DF")
    d.scallop_edge(-d.bleed, W + d.bleed, H * 0.1, 12, "#F7D6DF")
    d.art("teapot", W * 0.38, H * 0.27, W * 0.34)
    d.art("teacup-without-handle", W * 0.66, H * 0.31, W * 0.2)
    d.art("rose", W * 0.16, H * 0.33, W * 0.14, angle=-15)
    d.art("tulip", W * 0.85, H * 0.21, W * 0.13, angle=15)
    s = d.fit("Birthday Tea Party", W * 0.86, "Great Vibes", 80)
    d.text(0, H * 0.43, W, "Birthday Tea Party", "Great Vibes", s, "#A23B5C", align="center")
    p = details_lines(c)
    d.text(W * 0.1, H * 0.43 + s * 1.3, W * 0.8, p[0], "Lora", W * 0.042, "#5A3D46", italic=True, align="center")
    divider(d, W / 2, H * 0.43 + s * 1.3 + W * 0.1, W * 0.3, "#C99A4A", 1, gap=7)
    d.text(W * 0.1, H * 0.43 + s * 1.3 + W * 0.13, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.028, "#5A3D46", weight=600, align="center", lh=1.7, spacing=120, upper=True)
    d.text(W * 0.1, H * 0.86, W * 0.8, c["signature"].replace(" · ", "\n"), "Lora", W * 0.03, "#A23B5C", italic=True, align="center", lh=1.4)
    return {"layout": "awning stripes, teapot and teacup with flowers, script title and details", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "rose, cream, berry, gold", "decor": "candy-stripe awning with scallops, tea and flower illustrations"}


@design(77)
def disco_roller(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.25, H, [(0, "#4A1670"), (1, "#0E0420")]))
    d.rays(W / 2, H * 0.22, 60, H * 1.1, 18, "#FF4FD8", opacity=0.12, width_deg=4)
    for _ in range(40):
        col = d.rng.choice(["#FF4FD8", "#59F0FF", "#FFE45C"])
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(3, 9), col, opacity=0.8)
    d.art("mirror-ball", W / 2, H * 0.2, W * 0.46, shadow_=shadow("rgba(255,79,216,0.5)", 60, 0, 0))
    d.art("roller-skate", W * 0.17, H * 0.3, W * 0.24, angle=-14)
    s = d.fit("DISCO &\nROLLER\nNIGHT", W * 0.84, "Monoton", 220)
    d.text(0, H * 0.38, W, "DISCO &\nROLLER\nNIGHT", "Monoton", s, "#FFFFFF", align="center", lh=1.05, shadow_=shadow("rgba(255,79,216,0.95)", 26, 0, 0))
    p = details_lines(c)
    y = H * 0.38 + s * FS_MULT * 3.2 + 30
    d.text(W * 0.08, y, W * 0.84, p[0], "Righteous", 58, "#59F0FF", align="center", shadow_=shadow("rgba(89,240,255,0.8)", 14, 0, 0))
    d.text(W * 0.08, y + 90, W * 0.84, "  ·  ".join(p[1:]), "DM Sans", 40, "#F3E8FF", weight=600, align="center", lh=1.35)
    pill(d, W / 2, H * 0.93, c["signature"], "DM Sans", 32, "#0E0420", "#FFE45C", weight=700, spacing=60, upper=False)
    return {"layout": "glowing mirror ball and roller skate over a neon three-line title", "typography": "Monoton neon, Righteous, DM Sans", "palette": "disco violet, neon pink, cyan, yellow", "decor": "light beams, glitter dots, mirror ball and skate illustrations"}


@design(78)
def big_date_35(d, c):
    W, H = d.W, d.H
    d.bg("#0F0F10")
    s = d.fit("35", W * 0.7, "Anton", 600)
    d.text(0, H * 0.04, W, "35", "Anton", s, "#FF5F1F", align="center", lh=0.85)
    s2 = d.fit("INVITED", W * 0.84, "Anton", 120)
    y = H * 0.04 + s * FS_MULT * 0.95
    t = d.text(W * 0.08, y, W * 0.84, "YOU’RE\nINVITED", "Anton", s2, "#FFFFFF", lh=0.95)
    y += t["_h"] + 26
    p = details_lines(c)
    d.line(W * 0.08, y, W * 0.92, y, "#FF5F1F", 2)
    t = d.text(W * 0.08, y + 14, W * 0.84, p[0], "DM Sans", W * 0.048, "#FFFFFF", weight=600, lh=1.3)
    d.text(W * 0.08, y + 30 + t["_h"], W * 0.84, "\n".join(p[1:]), "DM Sans", W * 0.042, "#BDBDBD", weight=500, lh=1.4)
    d.text(W * 0.08, H * 0.92, W * 0.84, c["signature"], "DM Sans", W * 0.04, "#FF5F1F", weight=700)
    return {"layout": "tall slim card: giant 35, stacked YOU'RE INVITED, details under an orange rule", "typography": "Anton, DM Sans", "palette": "black, blaze orange, white", "decor": "rule line only — type carries the design"}


@design(79)
def into_the_wild(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0F2A44"), (1, "#27496D")]))
    for _ in range(40):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.45), d.rng.uniform(0.6, 1.8), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    d.circle(W * 0.1, H * 0.14, 24, "#FFF3C4")
    d.polygon([(-d.bleed, H * 0.72), (W * 0.22, H * 0.38), (W * 0.42, H * 0.72)], "#3B6B8C")
    d.polygon([(W * 0.3, H * 0.72), (W * 0.58, H * 0.32), (W * 0.86, H * 0.72)], "#2E5A78")
    d.polygon([(W * 0.7, H * 0.72), (W * 0.9, H * 0.45), (W + d.bleed, H * 0.72)], "#3B6B8C")
    for (x, y, s_) in [(W * 0.22, H * 0.38, 0.4), (W * 0.58, H * 0.32, 0.4)]:
        d.polygon([(x, y), (x - 30 * s_ * 3, y + 60 * s_ * 2), (x + 30 * s_ * 3, y + 60 * s_ * 2)], "#E8F1F8")
    d.rect(-d.bleed, H * 0.72, W + 2 * d.bleed, H * 0.28 + d.bleed, "#1C3B2A")
    for k in range(12):
        x = W * (k + 0.5) / 12
        h = d.rng.uniform(70, 110)
        d.polygon([(x, H * 0.74 - h), (x - h * 0.3, H * 0.76), (x + h * 0.3, H * 0.76)], "#14532D")
    d.art("camping", W * 0.18, H * 0.84, W * 0.2)
    d.text(W * 0.33, H * 0.06, W * 0.62, "Into the Wild", "Great Vibes", d.fit("Into the Wild", W * 0.6, "Great Vibes", 60), "#FFF3C4", align="center")
    p = details_lines(c)
    d.text(W * 0.33, H * 0.78, W * 0.62, p[0], "Fredoka", W * 0.03, "#FFFFFF", weight=700, align="center")
    d.text(W * 0.33, H * 0.78 + W * 0.045, W * 0.62, "  ·  ".join(p[1:]), "Fredoka", W * 0.024, "#CFE3D4", weight=500, align="center")
    d.text(W * 0.33, H * 0.92, W * 0.62, c["signature"], "Fredoka", W * 0.022, "#FFF3C4", weight=600, align="center")
    return {"layout": "landscape night: snowy peaks, pine line and campsite with details on the ground", "typography": "Great Vibes, Fredoka", "palette": "night blue, slate peaks, pine greens, moon cream", "decor": "stars, moon, mountain polygons, pine trees, camping illustration"}


@design(80)
def art_party(d, c):
    W, H = d.W, d.H
    d.bg("#FFFDF7")
    for x, y, r, col, sd in [(0.12, 0.12, 120, "#FF5A5F", 1), (0.9, 0.1, 100, "#3EC1D3", 2), (0.86, 0.78, 140, "#FFC93C", 3), (0.05, 0.93, 100, "#8E6CEF", 4), (0.55, 0.06, 60, "#2BD67B", 5)]:
        d.blob(W * x, H * y, r, col, wobble=0.35, n=11, seed=sd)
        for k in range(5):
            a = d.rng.uniform(0, 2 * math.pi)
            dd = r * d.rng.uniform(1.15, 1.6)
            d.circle(W * x + dd * math.cos(a), H * y + dd * math.sin(a), d.rng.uniform(6, 16), col)
    d.art("artist-palette", W * 0.5, H * 0.28, W * 0.34, angle=-10)
    d.art("paintbrush", W * 0.72, H * 0.26, W * 0.2, angle=20)
    s = d.fit("ART PARTY!", W * 0.84, "Luckiest Guy", 150)
    t = d.text(0, H * 0.45, W, "ART PARTY!", "Luckiest Guy", s, "#111111", align="center")
    t["fill"] = lin(0, 0, t["width"], 0, [(0, "#FF5A5F"), (0.33, "#FFC93C"), (0.66, "#3EC1D3"), (1, "#8E6CEF")])
    t.update({"stroke": "#111111", "strokeWidth": 4, "paintFirst": "stroke"})
    p = details_lines(c)
    d.text(W * 0.15, H * 0.45 + s * 1.3, W * 0.7, p[0], "Fredoka", 44, "#111111", weight=700, align="center")
    d.text(W * 0.15, H * 0.45 + s * 1.3 + 70, W * 0.7, "  ·  ".join(p[1:]), "Fredoka", 34, "#444444", weight=500, align="center", lh=1.35)
    d.text(W * 0.15, H * 0.86, W * 0.7, c["signature"], "Caveat", 46, "#FF5A5F", weight=700, align="center")
    return {"layout": "paint splats in the corners, palette and brush above a rainbow-filled title", "typography": "Luckiest Guy rainbow gradient, Fredoka, Caveat", "palette": "primary paint brights on white", "decor": "splat blobs with droplets, palette and paintbrush illustrations"}
