"""Birthday 021–040: pastel, kids."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, metal, text_metal, vgrad, overlay, pill, divider

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def ribbon_banner(d, cx, cy, w, h, fill, fold, tail="#000"):
    """Flat ribbon banner with folded, notched ends."""
    t = h * 0.7
    for s in (-1, 1):
        x0 = cx + s * (w / 2 - t * 0.3)
        x1 = cx + s * (w / 2 + t * 1.1)
        d.polygon([(x0, cy - h / 2 + h * 0.25), (x1, cy - h / 2 + h * 0.25), (x1 - s * t * 0.45, cy + h * 0.25 / 2 + h * 0.12), (x1, cy + h / 2 + h * 0.25), (x0, cy + h / 2 + h * 0.25)], tail)
        d.polygon([(cx + s * w / 2, cy + h / 2), (x0, cy + h / 2 + h * 0.25), (x0, cy + h / 2)], fold)
    d.rect(cx - w / 2, cy - h / 2, w, h, fill, name="Ribbon banner")


def checker(d, x0, y0, x1, y1, s, a="#111", b="#fff"):
    d.rect(x0, y0, x1 - x0, y1 - y0, b)
    path = []
    j = 0
    y = y0
    while y < y1 - 0.1:
        x = x0 + (s if j % 2 else 0)
        while x < x1 - 0.1:
            path += [["M", x, y], ["L", min(x + s, x1), y], ["L", min(x + s, x1), min(y + s, y1)], ["L", x, min(y + s, y1)], ["Z"]]
            x += 2 * s
        y += s
        j += 1
    d.path(path, fill=a, name="Checker")


def gingham(d, x0, y0, x1, y1, s, color, alpha=0.35):
    d.stripes(x0, y0, x1, y1, s, s, rgba(color, alpha))
    path = []
    y = y0
    while y < y1:
        path += [["M", x0, y], ["L", x1, y], ["L", x1, min(y + s, y1)], ["L", x0, min(y + s, y1)], ["Z"]]
        y += 2 * s
    d.path(path, fill=rgba(color, alpha), name="Gingham")


# ------------------------------------------------------------------ pastel
@design(21)
def pink_arch_cake(d, c):
    W, H = d.W, d.H
    d.bg("#F9E1E3")
    d.dots(0, 0, W, H, 18, 1.2, "#F0B9C0", opacity=0.6)
    aw, ah = W * 0.66, H * 0.48
    ax, ay = (W - aw) / 2, H * 0.08
    d.path([["M", ax - 10, ay + ah + 10], ["L", ax - 10, ay + aw / 2], ["C", ax - 10, ay - 10 + aw * 0.06, ax + aw * 0.2, ay - 10, W / 2, ay - 10], ["C", ax + aw * 0.8, ay - 10, ax + aw + 10, ay + aw * 0.06 - 10, ax + aw + 10, ay + aw / 2], ["L", ax + aw + 10, ay + ah + 10], ["Z"]], fill="#FFFFFF", name="Arch mat")
    d.photo(1217, ax, ay, aw, ah, frame="arch", focus=(0.45, 0.38), zoom=1.1)
    d.sparkle(ax - 4, ay + aw * 0.2, 12, "#E37C8E")
    d.sparkle(ax + aw + 6, ay + aw * 0.42, 9, "#E37C8E")
    s = d.fit("Happy Birthday", W * 0.86, "Great Vibes", 80)
    y = ay + ah + H * 0.03
    d.text(0, y, W, "Happy Birthday", "Great Vibes", s, "#B2475A", align="center")
    d.text(W * 0.12, y + s * 1.5, W * 0.76, c["message"], "Montserrat", W * 0.03, "#7A4A52", weight=600, align="center", spacing=300, upper=True)
    d.scallop_edge(-d.bleed, W + d.bleed, H * 0.92, 14, "#FFFFFF", down=False, bottom=H + d.bleed)
    d.text(0, H * 0.935, W, c["signature"], "Playfair Display", W * 0.036, "#B2475A", italic=True, align="center")
    return {"layout": "cake photo in a white-matted arch, script greeting under it, scalloped footer", "typography": "Great Vibes, Montserrat caps, Playfair Display italic", "palette": "blush pink, raspberry, white", "decor": "polka dots, arch frame, scallop edge, sparkles"}


@design(22)
def pastel_hearts_ribbon(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#F4E6FF"), (1, "#FFE3EE")]))
    cols = ["#F7A8C4", "#C9B6F2", "#FFD3E0", "#B6E1F2"]
    for _ in range(26):
        x, y = d.rng.uniform(0, W), d.rng.uniform(0, H)
        if 120 < y < H - 120 and W * 0.12 < x < W * 0.88 and H * 0.28 < y < H * 0.78:
            continue
        d.heart(x, y, d.rng.uniform(30, 70), d.rng.choice(cols), angle=d.rng.uniform(-25, 25), opacity=0.9)
    d.art("heart-with-ribbon", W / 2, H * 0.22, W * 0.24)
    ribbon_banner(d, W / 2, H * 0.47, W * 0.66, 120, "#E86A92", "#B84269", "#D4557E")
    s = d.fit("Happy Birthday", W * 0.6, "Pacifico", 80)
    d.text(W * 0.17, H * 0.47 - s * FS_MULT / 2 - 6, W * 0.66, "Happy Birthday", "Pacifico", s, "#FFFFFF", align="center")
    d.text(0, H * 0.6, W, c["signature"], "Great Vibes", 150, "#8E4FB5", align="center")
    d.text(0, H * 0.78, W, c["message"], "Montserrat", 34, "#8E4FB5", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "ribbon banner across the middle, name in script below, hearts framing the edges", "typography": "Pacifico, Great Vibes, Montserrat caps", "palette": "lilac to pink, raspberry ribbon, violet", "decor": "scattered pastel hearts, heart-with-ribbon illustration"}


@design(23)
def pressed_wildflower(d, c):
    W, H = d.W, d.H
    d.bg("#EFE6D8")
    d.texture("paper", 0.6)
    m = W * 0.1
    d.rect(m * 0.6, m * 0.6, W - m * 1.2, H - m * 1.2, "", stroke="#B9A88F", sw=0.8)
    # pressed stems on the left
    for i, (x, ang, col) in enumerate([(W * 0.2, -96, "#8B9D6A"), (W * 0.29, -82, "#A7B381"), (W * 0.36, -100, "#7E8F5F")]):
        L = H * (0.34 + 0.06 * i)
        y0 = H * 0.9
        x1 = x + L * math.cos(math.radians(ang))
        y1 = y0 + L * math.sin(math.radians(ang))
        d.path([["M", x, y0], ["Q", (x + x1) / 2 + 14, (y0 + y1) / 2, x1, y1]], fill="", stroke=col, sw=1.6)
        for k in range(5):
            t = 0.25 + k * 0.15
            px, py = x + (x1 - x) * t, y0 + (y1 - y0) * t
            d.leaf(px, py, 26, 7, ang + (40 if k % 2 else -40), col, opacity=0.95)
        d.art(["cherry-blossom", "blossom", "hibiscus"][i], x1, y1, W * 0.13, angle=-10 + i * 12, opacity=0.95)
    x0 = W * 0.47
    cw = W - x0 - m
    s = d.fit("Birthday", cw, "Playfair Display", 70, 500, True)
    d.text(x0, H * 0.18, cw, "Happy", "Playfair Display", s * 0.8, "#5E4B3A", weight=500)
    d.text(x0, H * 0.18 + s * 0.95, cw, "Birthday", "Playfair Display", s, "#5E4B3A", italic=True, weight=500)
    d.line(x0, H * 0.18 + s * 2.35, x0 + 50, H * 0.18 + s * 2.35, "#A0866A", 1)
    d.text(x0, H * 0.18 + s * 2.6, cw, c["message"], "Lora", W * 0.042, "#6B5A48", italic=True, lh=1.5)
    d.text(x0, H * 0.84, cw, c["signature"], "Montserrat", W * 0.026, "#5E4B3A", weight=700, spacing=260, upper=True)
    return {"layout": "pressed-flower stems rising on the left, headline and wish set on the right", "typography": "Playfair Display roman + italic, Lora italic, Montserrat caps", "palette": "oat paper, sage, dusty rose, walnut", "decor": "paper grain, vector stems and leaves, blossom illustrations, hairline frame"}


@design(24)
def pastel_balloon_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFE9F1"), (1, "#E8F0FF")]))
    cols = ["#F7A8C4", "#C9B6F2", "#A8DCF2", "#FFD59E", "#B9E8C8", "#F9C0D3", "#D8C8FA"]
    spots = [(0.18, 0.13, 120), (0.42, 0.08, 135), (0.68, 0.12, 125), (0.88, 0.2, 100), (0.3, 0.27, 110), (0.58, 0.28, 120), (0.12, 0.36, 85), (0.82, 0.38, 90)]
    for k, (x, y, r) in enumerate(spots):
        d.balloon(W * x, H * y, r, cols[k % len(cols)], string="#C8A9B8", tail=H * 0.5 - H * y, hl=0.5)
    d.rect(W * 0.08, H * 0.54, W * 0.84, H * 0.4, "rgba(255,255,255,0.8)", rx=48, shadow_=shadow("rgba(180,130,170,0.25)", 40, 0, 16), name="Card")
    s = d.fit("it’s your\nbirthday!", W * 0.72, "Fredoka", 190, 700)
    d.text(W * 0.08, H * 0.565, W * 0.84, "it’s your\nbirthday!", "Fredoka", s, "#D24C83", weight=700, align="center", lh=0.95)
    y = H * 0.565 + s * FS_MULT * 1.95 + 24
    t = d.text(W * 0.14, y, W * 0.72, c["message"], "Fredoka", 42, "#7E5A8E", weight=500, align="center", lh=1.3)
    pill(d, W / 2, y + t["_h"] + 80, c["signature"], "Fredoka", 36, "#FFFFFF", "#D24C83", weight=600, spacing=80)
    return {"layout": "pastel balloon bouquet over a frosted card holding the invitation", "typography": "Fredoka bold and medium", "palette": "candy pink, lilac, sky, butter on a pink-to-blue sky", "decor": "eight glossy vector balloons, frosted card, RSVP pill"}


@design(25)
def cameo_peony_mum(d, c):
    W, H = d.W, d.H
    d.bg("#E6EBDF")
    d.dots(0, 0, W, H, 16, 1, "#CBD4C0", opacity=0.7)
    cx, cy, rx_, ry_ = W / 2, H * 0.3, W * 0.27, H * 0.21
    d.ellipse(cx, cy, rx_ + 14, ry_ + 14, "#FFFFFF", name="Cameo mat")
    d.ellipse(cx, cy, rx_ + 14, ry_ + 14, "", stroke="#C9A45A", sw=2)
    d.photo(303, cx - rx_, cy - ry_, 2 * rx_, 2 * ry_, frame="ellipse", focus=(0.5, 0.62), zoom=1.15)
    d.art("rose", cx - rx_ * 0.95, cy + ry_ * 0.8, W * 0.14, angle=-20)
    d.art("tulip", cx + rx_ * 0.95, cy + ry_ * 0.82, W * 0.12, angle=18)
    s = d.fit("Happy Birthday, Mum", W * 0.84, "Great Vibes", 70)
    y = H * 0.56
    d.text(0, y, W, "Happy Birthday, Mum", "Great Vibes", s, "#6F3B4A", align="center")
    divider(d, W / 2, y + s * 1.3, W * 0.3, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, y + s * 1.5, W * 0.76, c["message"], "Lora", W * 0.034, "#4F5A48", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#6F3B4A", weight=700, align="center", spacing=280, upper=True)
    return {"layout": "flower photo in a gold-rimmed oval cameo with roses at its base, script greeting below", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "sage, ivory, plum, antique gold", "decor": "dot texture, cameo frame, rose and tulip illustrations"}


@design(26)
def boho_arches(d, c):
    W, H = d.W, d.H
    d.bg("#F6EBDD")
    d.texture("paper", 0.5)
    cx, base = W / 2, H * 0.5
    cols = ["#C96F4A", "#E3A07A", "#F0C9A8", "#9DAF8C"]
    for k, col in enumerate(cols):
        r = W * (0.36 - k * 0.075)
        d.circle(cx, base, r, col, start=180, end=360)
    d.circle(W * 0.8, H * 0.12, W * 0.07, "#E8B04B", name="Sun")
    d.rect(-d.bleed, base, W + 2 * d.bleed, 3, "#C96F4A")
    s = d.fit("happy birthday", W * 0.8, "Playfair Display", 70, 500, True)
    d.text(0, base + H * 0.05, W, "happy birthday", "Playfair Display", s, "#5A3524", weight=500, italic=True, align="center")
    d.text(W * 0.12, base + H * 0.05 + s * 1.4, W * 0.76, c["message"], "Lora", W * 0.035, "#6E4A38", align="center", lh=1.5)
    d.text(0, H * 0.9, W, c["signature"], "Caveat", W * 0.06, "#C96F4A", weight=600, align="center")
    return {"layout": "boho rainbow of four arches sitting on a horizon line, text below", "typography": "Playfair Display italic, Lora, Caveat", "palette": "terracotta, apricot, sand, sage, mustard sun", "decor": "half-circle arches, sun, paper grain"}


@design(27)
def gingham_cake(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4F2")
    gingham(d, -d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 36, "#F4A3B4", 0.28)
    d.circle(W / 2, H * 0.44, W * 0.34, "#FFFFFF", shadow_=shadow("rgba(200,100,120,0.25)", 40, 0, 16), name="Plate")
    d.circle(W / 2, H * 0.44, W * 0.29, "", stroke="#F6C9D2", sw=4, name="Plate rim")
    d.art("shortcake", W / 2, H * 0.42, W * 0.42)
    d.rect(W * 0.1, H * 0.06, W * 0.8, 120, "#FFFFFF", rx=60, name="Title card")
    s = d.fit("a slice of happiness", W * 0.7, "Playfair Display", 80, 600, True)
    d.text(W * 0.1, H * 0.06 + (120 - s * FS_MULT) / 2, W * 0.8, "a slice of happiness", "Playfair Display", s, "#C2405E", weight=600, italic=True, align="center")
    pill(d, W / 2, H * 0.88, c["message"], "Montserrat", 34, "#FFFFFF", "#C2405E", weight=700, spacing=220)
    return {"layout": "cake slice on a white plate over pink gingham, title in a pill above", "typography": "Playfair Display semibold italic, Montserrat caps", "palette": "strawberry pink, cream, raspberry", "decor": "gingham pattern, plate with rim, cake illustration"}


@design(28)
def blush_bow_bestie(d, c):
    W, H = d.W, d.H
    d.bg("#FBE3E6")
    d.rect(-d.bleed, -d.bleed, W * 0.46 + d.bleed, H + 2 * d.bleed, "#F6C9CF", name="Panel")
    d.dots(-d.bleed, -d.bleed, W * 0.46, H + d.bleed, 20, 2.2, "#FFFFFF", opacity=0.75)
    d.art("ribbon", W * 0.23, H * 0.5, W * 0.36, angle=-6, shadow_=shadow("rgba(170,60,80,0.25)", 20, 0, 10))
    x0 = W * 0.52
    cw = W - x0 - W * 0.06
    s = d.fit("Happy Birthday,", cw, "Playfair Display", 60, 600, True)
    d.text(x0, H * 0.16, cw, "Happy Birthday,", "Playfair Display", s, "#9E2F48", weight=600, italic=True)
    d.text(x0, H * 0.16 + s * 1.1, cw, "Bestie", "Great Vibes", s * 2, "#D2566F")
    d.text(x0, H * 0.16 + s * 3.5, cw, c["message"], "Montserrat", W * 0.025, "#7A3B49", weight=600, spacing=160, upper=True, lh=1.6)
    d.text(x0, H * 0.82, cw, c["signature"], "Caveat", W * 0.05, "#9E2F48", weight=600)
    return {"layout": "split card: dotted blush panel with a big bow, headline on the right", "typography": "Playfair Display italic, Great Vibes, Montserrat caps, Caveat", "palette": "blush, rose, berry", "decor": "polka dots, ribbon bow illustration"}


@design(29)
def wish_list_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FFE7D6"), (1, "#F3DDF7")]))
    px, py, pw, ph = 90, 300, W - 180, H - 520
    d.rect(px + 18, py + 22, pw, ph, "#E9C6D9", rx=28, name="Paper shadow")
    d.rect(px, py, pw, ph, "#FFFDF8", rx=28, shadow_=shadow("rgba(150,100,120,0.18)", 30, 0, 10), name="Paper")
    for k in range(13):
        y = py + 330 + k * 92
        if y > py + ph - 60:
            break
        d.line(px + 60, y, px + pw - 60, y, "#E7D9E6", 2)
    d.line(px + 130, py + 30, px + 130, py + ph - 30, "#F3A5B5", 2)
    d.rect(W / 2 - 110, py - 30, 220, 60, "#F7B8C8", opacity=0.85, angle=-3, name="Washi tape")
    s = d.fit("birthday wish list", pw - 200, "Caveat", 140, 700)
    d.text(px + 150, py + 90, pw - 200, "birthday wish list", "Caveat", s, "#C24B73", weight=700)
    items = [x.strip() for x in c["message"].split("·")]
    for k, it in enumerate(items):
        y = py + 330 + k * 184 - 62
        d.rect(px + 160, y + 6, 46, 46, "", rx=8, stroke="#C24B73", sw=3)
        d.path([["M", px + 170, y + 30], ["L", px + 182, y + 44], ["L", px + 212, y - 2]], fill="", stroke="#3FA37A", sw=6)
        d.text(px + 236, y - 8, pw - 300, it, "Caveat", 70, "#4A3A44", weight=600)
    d.art("wrapped-gift", W - 170, py + ph - 80, 210, angle=10)
    d.art("sparkles", 170, 200, 130)
    d.text(0, H - 170, W, c["signature"], "Fredoka", 46, "#C24B73", weight=600, align="center")
    return {"layout": "lined notebook page with ticked wish-list items, gift tucked in the corner", "typography": "Caveat bold, Fredoka", "palette": "peach to lilac, cream paper, raspberry, mint ticks", "decor": "ruled lines, margin line, washi tape, gift and sparkle illustrations"}


@design(30)
def soft_blobs(d, c):
    W, H = d.W, d.H
    d.bg("#FBF4EA")
    for (x, y, r, col, sd) in [(0.15, 0.18, 0.26, "#F6D3C4", 1), (0.86, 0.22, 0.22, "#D7E3D0", 2), (0.82, 0.84, 0.3, "#F2DFA7", 3), (0.12, 0.86, 0.22, "#D9D3EE", 4), (0.5, 0.5, 0.33, "#FFFFFF", 5)]:
        d.blob(W * x, H * y, W * r, col, wobble=0.16, n=8, seed=sd)
    s = d.fit("birthday", W * 0.52, "Playfair Display", 150, 500, True)
    d.text(0, H * 0.36, W, "happy", "Playfair Display", s * 0.72, "#4E3D35", weight=500, align="center", lh=0.9)
    d.text(0, H * 0.36 + s * 0.7, W, "birthday", "Playfair Display", s, "#4E3D35", italic=True, weight=500, align="center", lh=0.9)
    d.text(0, H * 0.63, W, c["message"], "Montserrat", 28, "#8C6B5C", weight=600, align="center", spacing=320, upper=True)
    for x, y in [(0.3, 0.3), (0.72, 0.68)]:
        d.sparkle(W * x, H * y, 16, "#E39A7D")
    return {"layout": "soft organic blobs in four corners framing a white centre blob", "typography": "Playfair Display roman + italic, Montserrat caps", "palette": "peach, sage, butter, lilac on cream", "decor": "organic blob shapes, sparkles"}


# ------------------------------------------------------------------ kids
KID = "Fredoka"
FUN = "Luckiest Guy"


@design(31)
def dino_card(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#CFF1FF"), (1, "#EAFBEF")]))
    d.circle(W * 0.88, H * 0.14, 40, "#FFD45C", name="Sun")
    d.blob(W * 0.2, H * 0.16, 40, "#FFFFFF", wobble=0.1, n=6, seed=3)
    d.blob(W * 0.27, H * 0.15, 30, "#FFFFFF", wobble=0.1, n=6, seed=4)
    d.wave(-d.bleed, W + d.bleed, H * 0.74, 14, 140, fill="#7ACB6E", bottom=H + d.bleed)
    d.wave(-d.bleed, W + d.bleed, H * 0.82, 10, 100, fill="#5BB15A", bottom=H + d.bleed, phase=1)
    d.bunting(-10, W + 10, H * 0.02, 26, ["#FF6B6B", "#FFD45C", "#4FC3F7", "#9C7BEA"], flags=12, fh=34)
    d.art("t-rex", W * 0.24, H * 0.62, W * 0.34)
    d.art("sauropod", W * 0.8, H * 0.64, W * 0.3, flip=True)
    s = d.fit("Happy 5th Birthday,", W * 0.62, FUN, 70)
    d.text(0, H * 0.17, W, "Happy 5th Birthday,", FUN, s, "#2E7D32", align="center", stroke="#FFFFFF", sw=6)
    d.text(0, H * 0.17 + s * 1.05, W, "Leo!", FUN, s * 1.6, "#FF7043", align="center", stroke="#FFFFFF", sw=8)
    d.text(0, H * 0.88, W, c["message"], KID, W * 0.05, "#FFFFFF", weight=700, align="center")
    return {"layout": "landscape scene: bunting, rolling hills, two dinosaurs flanking a stacked headline", "typography": "Luckiest Guy with white outline, Fredoka", "palette": "sky blue, grass greens, tomato, sunshine", "decor": "bunting, clouds, sun, hills, T-rex and sauropod illustrations"}


@design(32)
def rocket_invite(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0B1240"), (0.6, "#24186B"), (1, "#3D1C7A")]))
    for _ in range(60):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.7), d.rng.uniform(0.8, 2.2), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    for _ in range(6):
        d.sparkle(d.rng.uniform(20, W - 20), d.rng.uniform(20, H * 0.5), d.rng.uniform(5, 10), "#FFE27A")
    d.art("ringed-planet", W * 0.82, H * 0.13, W * 0.24, angle=-10)
    d.art("crescent-moon", W * 0.13, H * 0.1, W * 0.13)
    d.art("rocket", W * 0.5, H * 0.3, W * 0.44, angle=0)
    s = d.fit("BLAST OFF!", W * 0.84, FUN, 90)
    d.text(0, H * 0.5, W, "BLAST OFF!", FUN, s, "#FFD54F", align="center", shadow_=shadow("rgba(255,120,60,0.6)", 0, 0, 5))
    parts = c["message"].split(" · ")
    d.text(0, H * 0.5 + s * 1.2, W, parts[0], KID, W * 0.045, "#FFFFFF", weight=600, align="center")
    d.rect(W * 0.12, H * 0.68, W * 0.76, H * 0.16, "rgba(255,255,255,0.1)", rx=18, stroke="rgba(255,255,255,0.35)", sw=1.5)
    d.text(W * 0.12, H * 0.695, W * 0.76, "\n".join(parts[1:]), KID, W * 0.036, "#E8E4FF", weight=500, align="center", lh=1.35)
    pill(d, W / 2, H * 0.9, c["signature"], KID, W * 0.03, "#2A1A63", "#FFD54F", weight=700, spacing=60)
    return {"layout": "rocket launching through a starry sky, mission details in a glass panel", "typography": "Luckiest Guy, Fredoka", "palette": "midnight navy to violet, rocket red, star yellow", "decor": "stars and sparkles, planet and moon illustrations, smoke puffs"}


@design(33)
def teddy_balloons(d, c):
    W, H = d.W, d.H
    d.bg("#EAF3FB")
    d.dots(0, 0, W, H, 22, 1.6, "#CFE0F1")
    for x, y, r, col in [(0.3, 0.15, 44, "#7FB3E6"), (0.5, 0.1, 50, "#F6C26B"), (0.7, 0.16, 44, "#F29BAF")]:
        d.balloon(W * x, H * y, r, col, string="#8C9BB0", tail=H * 0.42 - H * y)
    d.art("teddy-bear", W / 2, H * 0.5, W * 0.48, shadow_=shadow("rgba(60,90,130,0.2)", 20, 0, 10))
    s = d.fit("Beary Happy", W * 0.84, KID, 70, 700)
    d.text(0, H * 0.7, W, "Beary Happy", KID, s, "#3D6FA8", weight=700, align="center")
    d.text(0, H * 0.7 + s * 1.05, W, "Birthday!", KID, s, "#E06C8A", weight=700, align="center")
    d.text(0, H * 0.7 + s * 2.3, W, c["message"], KID, W * 0.04, "#5D7189", weight=500, align="center")
    return {"layout": "teddy bear holding three balloons, two-colour rounded headline below", "typography": "Fredoka bold", "palette": "powder blue, honey, pink", "decor": "dot pattern, glossy balloons, teddy illustration"}


@design(34)
def whale_post(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#BDEBFF"), (0.32, "#7FD3F5"), (1, "#1E6FB8")]))
    d.wave(-d.bleed, W + d.bleed, H * 0.3, 12, 120, fill="rgba(255,255,255,0.35)", bottom=H * 0.36)
    for _ in range(18):
        r = d.rng.uniform(6, 18)
        d.circle(d.rng.uniform(40, W - 40), d.rng.uniform(H * 0.38, H * 0.95), r, "", stroke="rgba(255,255,255,0.7)", sw=2.5)
    d.art("spouting-whale", W * 0.5, H * 0.54, W * 0.5)
    d.art("tropical-fish", W * 0.15, H * 0.72, W * 0.16, flip=True)
    d.art("octopus", W * 0.86, H * 0.82, W * 0.17)
    d.art("fish", W * 0.84, H * 0.46, W * 0.12)
    s = d.fit("Whale, hello there,", W * 0.86, FUN, 90)
    d.text(0, H * 0.05, W, "Whale, hello there,", FUN, s, "#0E4D8C", align="center")
    d.text(0, H * 0.05 + s * 1.05, W, "birthday boy!", FUN, s, "#FF7A59", align="center")
    d.text(W * 0.1, H * 0.88, W * 0.8, c["message"], KID, 44, "#FFFFFF", weight=700, align="center")
    return {"layout": "underwater scene: whale centre stage, sea friends around, headline at the surface", "typography": "Luckiest Guy, Fredoka", "palette": "aqua to ocean blue, coral", "decor": "surface wave, bubbles, whale, fish and octopus illustrations"}


@design(35)
def rainbow_bunny(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFF1F6"), (1, "#EEF4FF")]))
    d.art("rainbow", W / 2, H * 0.22, W * 0.82)
    for x, y, r in [(0.18, 0.31, 70), (0.82, 0.31, 70)]:
        d.blob(W * x, H * y, r, "#FFFFFF", wobble=0.08, n=7, seed=int(x * 10))
    d.art("rabbit", W * 0.5, H * 0.44, W * 0.42)
    s = d.fit("Some-bunny is", W * 0.8, KID, 140, 700)
    d.text(0, H * 0.56, W, "Some-bunny is", KID, s, "#7B61C9", weight=700, align="center")
    d.text(0, H * 0.56 + s * 1.05, W, "turning 4!", KID, s * 1.25, "#F06292", weight=700, align="center")
    parts = c["message"].split(" · ")
    y = H * 0.56 + s * 2.6
    d.rect(W * 0.12, y, W * 0.76, 230, "#FFFFFF", rx=40, shadow_=shadow("rgba(150,120,200,0.2)", 30, 0, 10))
    d.text(W * 0.12, y + 40, W * 0.76, parts[0].upper(), KID, 40, "#7B61C9", weight=700, align="center", spacing=200)
    d.text(W * 0.12, y + 100, W * 0.76, "  ·  ".join(parts[1:]), KID, 42, "#5C5470", weight=500, align="center")
    d.text(0, H * 0.93, W, c["signature"], "Caveat", 56, "#F06292", weight=700, align="center")
    return {"layout": "rainbow arching over a bunny, big two-line headline and a white details card", "typography": "Fredoka, Caveat", "palette": "candy pastels, violet, pink", "decor": "rainbow, clouds, bunny illustration, details card"}


@design(36)
def royal_castle(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#E9DDFB"), (1, "#FBE4F1")]))
    d.confetti(0, 0, W, H * 0.55, ["#C9A5F5", "#F7B6D2", "#FFE08A"], n=30, size=(5, 11), shapes=("star", "circle"))
    d.circle(W / 2, H * 0.33, W * 0.36, "rgba(255,255,255,0.55)")
    d.art("castle", W / 2, H * 0.31, W * 0.56)
    d.art("crown", W / 2, H * 0.07, W * 0.14)
    s = d.fit("A Royal Birthday", W * 0.86, "Great Vibes", 80)
    d.text(0, H * 0.58, W, "A Royal Birthday", "Great Vibes", s, "#7A3FA0", align="center")
    divider(d, W / 2, H * 0.58 + s * 1.3, W * 0.3, "#C99A4A", 1.2, gap=8)
    d.text(W * 0.12, H * 0.58 + s * 1.5, W * 0.76, c["message"], KID, W * 0.042, "#6A4E7E", weight=500, align="center", lh=1.35)
    return {"layout": "fairy-tale castle in a glowing circle under a crown, script title below", "typography": "Great Vibes, Fredoka", "palette": "lavender to pink, gold", "decor": "star confetti, glow circle, castle and crown illustrations"}


@design(37)
def jungle_lion(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.45, W * 0.8, [(0, "#FFE38A"), (1, "#FFB347")]))
    greens = ["#2E8B57", "#3FA66B", "#1F6E45", "#55B97A"]
    for k in range(16):
        side = k % 4
        if side == 0:
            x, y, ang = d.rng.uniform(-40, W + 40), -20, d.rng.uniform(40, 140)
        elif side == 1:
            x, y, ang = d.rng.uniform(-40, W + 40), H + 20, d.rng.uniform(-140, -40)
        elif side == 2:
            x, y, ang = -20, d.rng.uniform(0, H), d.rng.uniform(-40, 40)
        else:
            x, y, ang = W + 20, d.rng.uniform(0, H), d.rng.uniform(140, 220)
        d.leaf(x, y, d.rng.uniform(170, 260), d.rng.uniform(40, 60), ang, d.rng.choice(greens), vein="#1A5C38")
    d.circle(W / 2, H * 0.4, W * 0.24, "rgba(255,255,255,0.35)")
    d.art("lion", W / 2, H * 0.4, W * 0.4)
    s = d.fit("Happy Roar-thday!", W * 0.84, FUN, 120)
    d.text(0, H * 0.64, W, "Happy Roar-thday!", FUN, s, "#7A3B0C", align="center", stroke="#FFF3D6", sw=8)
    pill(d, W / 2, H * 0.64 + s * 1.7, c["message"], KID, 40, "#FFFFFF", "#2E8B57", weight=700, spacing=60, upper=False)
    return {"layout": "lion portrait framed by jungle leaves on all sides, headline and name pill below", "typography": "Luckiest Guy with cream outline, Fredoka", "palette": "sunshine to orange, jungle greens, brown", "decor": "vector monstera-style leaves, glow, lion illustration"}


@design(38)
def cupcake_parade(d, c):
    W, H = d.W, d.H
    d.bg("#FFE6EE")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 22, 22, "rgba(255,255,255,0.45)")
    d.rect(-d.bleed, H * 0.72, W + 2 * d.bleed, H * 0.28 + d.bleed, "#F48FB1", name="Table")
    d.scallop_edge(-d.bleed, W + d.bleed, H * 0.72, 16, "#F48FB1", down=False)
    for k, x in enumerate([0.12, 0.31, 0.5, 0.69, 0.88]):
        d.art(["cupcake", "doughnut", "cupcake", "ice-cream", "cupcake"][k], W * x, H * 0.7, W * 0.16 if k != 2 else W * 0.2)
    d.confetti(0, 0, W, H * 0.55, ["#FF6B9A", "#5AC8FA", "#FFD54F", "#8BC34A", "#B388FF"], n=46, size=(4, 10), shapes=("strip",))
    s = d.fit("Happy 8th Birthday,", W * 0.82, FUN, 50)
    d.text(0, H * 0.1, W, "Happy 8th Birthday,", FUN, s, "#C2185B", align="center")
    d.text(0, H * 0.1 + s * 1.05, W, "Maryam!", "Pacifico", s * 1.6, "#7E57C2", align="center")
    d.text(0, H * 0.84, W, c["message"], KID, W * 0.045, "#FFFFFF", weight=700, align="center")
    return {"layout": "parade of cupcakes and treats on a scalloped pink table, sprinkle confetti above the title", "typography": "Luckiest Guy, Pacifico, Fredoka", "palette": "bubblegum pink, grape, sprinkle brights", "decor": "candy stripes, scallop table edge, sprinkle confetti, treat illustrations"}


@design(39)
def race_car(d, c):
    W, H = d.W, d.H
    d.bg("#FFD23F")
    checker(d, -d.bleed, -d.bleed, W + d.bleed, H * 0.07, 22, "#111111", "#FFFFFF")
    checker(d, -d.bleed, H * 0.93, W + d.bleed, H + d.bleed, 22, "#111111", "#FFFFFF")
    road = [["M", -d.bleed, H * 0.5], ["C", W * 0.3, H * 0.36, W * 0.6, H * 0.6, W + d.bleed, H * 0.42], ["L", W + d.bleed, H * 0.55], ["C", W * 0.6, H * 0.73, W * 0.3, H * 0.5, -d.bleed, H * 0.64], ["Z"]]
    d.path(road, fill="#3A3A3A", name="Road")
    d.path([["M", -d.bleed, H * 0.57], ["C", W * 0.3, H * 0.43, W * 0.6, H * 0.665, W + d.bleed, H * 0.485]], fill="", stroke="#FFFFFF", sw=4, dash=[18, 14])
    d.art("racing-car", W * 0.56, H * 0.5, W * 0.48, angle=-4)
    s = d.fit("READY, SET,", W * 0.84, FUN, 80)
    d.text(0, H * 0.1, W, "READY, SET,", FUN, s, "#111111", align="center")
    d.text(0, H * 0.1 + s * 1.0, W, "PARTY!", FUN, s * 1.5, "#E53935", align="center", stroke="#111111", sw=3)
    parts = c["message"].split(" · ")
    d.text(W * 0.08, H * 0.7, W * 0.84, parts[0], KID, W * 0.042, "#111111", weight=700, align="center")
    d.text(W * 0.08, H * 0.7 + W * 0.065, W * 0.84, "  ·  ".join(parts[1:]), KID, W * 0.034, "#3A3A3A", weight=500, align="center", lh=1.3)
    pill(d, W / 2, H * 0.875, c["signature"], KID, W * 0.03, "#FFD23F", "#111111", weight=700, spacing=80)
    return {"layout": "chequered flags top and bottom, race car on a curving track, details below", "typography": "Luckiest Guy, Fredoka", "palette": "racing yellow, black, white, red", "decor": "checker bands, dashed road line, race car illustration"}


@design(40)
def one_derful(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#E9F3FF"), (1, "#FFF3E6")]))
    d.dots(0, 0, W, H, 40, 3, "#D6E6F7")
    d.circle(W / 2, H * 0.3, W * 0.36, "#FFFFFF", name="Photo mat", shadow_=shadow("rgba(90,120,160,0.2)", 40, 0, 16))
    d.photo(1121, W / 2 - W * 0.33, H * 0.3 - W * 0.33, W * 0.66, W * 0.66, frame="circle", focus=(0.45, 0.55), zoom=1.0)
    for x, y, r, col in [(0.13, 0.2, 70, "#9CC9F5"), (0.87, 0.24, 64, "#FFC48C"), (0.86, 0.06, 50, "#B8E3C6")]:
        d.balloon(W * x, H * y, r, col, string="#9AAAC0", tail=180)
    t = d.text(0, H * 0.5, W, "ONE", FUN, 300, "#5C8FD6", align="center", lh=0.9)
    t["fill"] = lin(0, 0, 0, t["_h"], [(0, "#7DB4F0"), (1, "#3F72C2")])
    d.text(0, H * 0.5 + 300, W, "-derful!", "Pacifico", 120, "#F28C38", align="center")
    d.text(W * 0.1, H * 0.76, W * 0.8, c["message"], KID, 56, "#3F5F8C", weight=600, align="center")
    d.text(W * 0.1, H * 0.76 + 90, W * 0.8, c["signature"], KID, 40, "#7D8CA3", weight=500, align="center", lh=1.3)
    return {"layout": "baby photo in a round white mat with balloons, giant ONE-derful wordmark below", "typography": "Luckiest Guy gradient, Pacifico, Fredoka", "palette": "baby blue, apricot, mint on soft sky", "decor": "dot pattern, balloons, circular photo mat"}
