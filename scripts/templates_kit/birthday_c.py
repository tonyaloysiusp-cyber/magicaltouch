"""Birthday 041–060: floral, modern geometric."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, metal, text_metal, vgrad, overlay, pill, divider

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def corner_cluster(d, x, y, size, flip=1, flipy=1, flowers=("rose", "hibiscus", "cherry-blossom"), leafc=("#7C9A6B", "#9DB38A")):
    for k in range(7):
        ang = (-10 + k * 16) if flip > 0 else (190 - k * 16)
        if flipy < 0:
            ang = -ang
        d.leaf(x, y, size * (0.9 + 0.2 * (k % 2)), size * 0.26, ang, leafc[k % 2])
    pts = [(0.28, 0.12, 0.62), (0.08, 0.32, 0.5), (0.48, 0.38, 0.42)]
    for (dx, dy, s), f in zip(pts, flowers):
        d.art(f, x + flip * dx * size * 1.6, y + flipy * dy * size * 1.6, size * s * 1.5, angle=d.rng.uniform(-20, 20))


# ------------------------------------------------------------------ floral
@design(41)
def peony_corners(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6F0")
    d.texture("paper", 0.4)
    corner_cluster(d, 0, 0, W * 0.42)
    corner_cluster(d, W, H, W * 0.42, flip=-1, flipy=-1, flowers=("hibiscus", "rose", "blossom"))
    s = d.fit("Happy Birthday", W * 0.74, "Great Vibes", 80)
    y = H * 0.37
    d.text(0, y, W, "Happy Birthday", "Great Vibes", s, "#9C4058", align="center")
    divider(d, W / 2, y + s * 1.35, W * 0.28, "#C9A45A", 1, gap=7)
    d.text(W * 0.16, y + s * 1.55, W * 0.68, c["message"], "Lora", W * 0.038, "#5C4A48", italic=True, align="center", lh=1.5)
    d.text(W * 0.16, H * 0.66, W * 0.68, c["signature"], "Montserrat", W * 0.026, "#9C4058", weight=700, align="center", spacing=260, upper=True)
    return {"layout": "flower clusters in opposite corners, centred script greeting", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "ivory, peony pink, leaf greens, gold", "decor": "paper grain, leaf sprays with rose, hibiscus and blossom illustrations"}


@design(42)
def leaf_wreath(d, c):
    W, H = d.W, d.H
    d.bg("#E8EEDF")
    cx, cy, R = W / 2, H * 0.47, W * 0.33
    n = 36
    for i in range(n):
        a = 2 * math.pi * i / n
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        tang = math.degrees(a) + 90
        col = ["#6E8B5B", "#8FA97A", "#5A7449"][i % 3]
        d.leaf(x, y, 70, 20, tang + 30, col)
        d.leaf(x, y, 56, 16, tang - 150 + 180 - 30, col)
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.3
        d.art("blossom", cx + R * math.cos(a), cy + R * math.sin(a), 90, angle=i * 20)
    d.text(0, cy - 150, W, "happy", "Great Vibes", 150, "#4C6340", align="center")
    s = d.fit("BIRTHDAY", R * 1.4, "Cinzel", 110, 600, spacing=120)
    d.text(0, cy + 10, W, "BIRTHDAY", "Cinzel", s, "#4C6340", weight=600, align="center", spacing=120)
    d.text(0, H * 0.88, W, c["message"], "Lora", 40, "#4C6340", italic=True, align="center")
    d.art("seedling", W * 0.88, H * 0.88, 90)
    return {"layout": "round leaf wreath with daisies, greeting inside the ring", "typography": "Great Vibes, Cinzel, Lora italic", "palette": "sage, moss, white daisies", "decor": "36-leaf wreath, blossom illustrations"}


@design(43)
def tulip_border(d, c):
    W, H = d.W, d.H
    d.bg("#FFF7EF")
    d.rect(-d.bleed, H * 0.72, W + 2 * d.bleed, H * 0.28 + d.bleed, "#F6E1D1")
    n = 7
    for k in range(n):
        x = W * (k + 0.5) / n
        d.art("tulip", x, H * 0.76 - (k % 2) * 14, W * 0.15, angle=(-8 if k % 2 else 8))
    s = d.fit("Happy Birthday!", W * 0.7, "Playfair Display", 70, 700, True)
    d.text(0, H * 0.1, W, "Happy Birthday!", "Playfair Display", s, "#B03A5B", weight=700, italic=True, align="center")
    d.text(W * 0.14, H * 0.1 + s * 1.4, W * 0.72, c["message"], "Lora", W * 0.03, "#5F4A44", align="center", lh=1.5)
    d.text(0, H * 0.1 + s * 1.4 + W * 0.11, W, c["signature"], "Caveat", W * 0.045, "#B03A5B", weight=600, align="center")
    return {"layout": "landscape card with a row of tulips along the bottom edge", "typography": "Playfair Display bold italic, Lora, Caveat", "palette": "cream, blush ground, tulip pinks and greens", "decor": "seven tulip illustrations"}


@design(44)
def botanical_line_sage(d, c):
    W, H = d.W, d.H
    d.bg("#8FA58A")
    stroke = "#F4F1E8"
    # line-art sprigs
    for (x0, y0, ang, L) in [(W * 0.1, H * 1.02, -70, H * 0.5), (W * 0.88, H * 1.02, -110, H * 0.46), (W * 0.95, -10, 120, H * 0.3)]:
        a = math.radians(ang)
        x1, y1 = x0 + L * math.cos(a), y0 + L * math.sin(a)
        d.path([["M", x0, y0], ["Q", (x0 + x1) / 2 + 20, (y0 + y1) / 2, x1, y1]], fill="", stroke=stroke, sw=1.4)
        for k in range(8):
            t = 0.15 + k * 0.1
            px, py = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            sd = 1 if k % 2 else -1
            L2 = 40 * (1 - t * 0.4)
            ang2 = ang + sd * 45
            ux, uy = math.cos(math.radians(ang2)), math.sin(math.radians(ang2))
            tip = (px + ux * L2, py + uy * L2)
            mx, my = (px + tip[0]) / 2, (py + tip[1]) / 2
            nx, ny = -uy * 11, ux * 11
            d.path([["M", px, py], ["Q", mx + nx, my + ny, tip[0], tip[1]], ["Q", mx - nx, my - ny, px, py]], fill="", stroke=stroke, sw=1.2)
    d.frame_border(W * 0.05, stroke, 0.8)
    d.text(0, H * 0.2, W, c["headline"], "Montserrat", W * 0.032, stroke, weight=600, align="center", spacing=500, upper=True)
    s = d.fit("Grow,\nbloom,\nrepeat.", W * 0.6, "Playfair Display", 110, 500, True)
    d.text(0, H * 0.27, W, "Grow,\nbloom,\nrepeat.", "Playfair Display", s, "#FFFFFF", weight=500, italic=True, align="center", lh=1.0)
    d.text(W * 0.15, H * 0.27 + s * 3.6, W * 0.7, c["signature"], "Lora", W * 0.033, stroke, align="center", lh=1.4)
    return {"layout": "three-line motto centred, hand-drawn line botanicals growing in from the edges", "typography": "Playfair Display italic, Montserrat caps, Lora", "palette": "sage, chalk white", "decor": "single-line leaf sprigs, hairline frame"}


@design(45)
def moon_sister_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1B1440"), (0.6, "#4B2C7A"), (1, "#C76FA6")]))
    for _ in range(80):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.75), d.rng.uniform(0.8, 2.6), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    d.circle(W * 0.5, H * 0.27, W * 0.3, rad(W * 0.3, W * 0.3, W * 0.3, [(0, "rgba(255,230,180,0.35)"), (1, "rgba(255,230,180,0)")]))
    d.art("crescent-moon", W * 0.5, H * 0.27, W * 0.46, angle=-15)
    for k in range(8):
        d.art(["cherry-blossom", "tulip", "blossom", "hibiscus"][k % 4], W * (k + 0.5) / 8, H * (0.94 - (k % 2) * 0.03), W * 0.2, angle=d.rng.uniform(-15, 15))
    s = d.fit("Happy Birthday", W * 0.84, "Great Vibes", 200)
    d.text(0, H * 0.5, W, "Happy Birthday", "Great Vibes", s, "#FFE9C7", align="center", shadow_=shadow("rgba(255,200,150,0.5)", 30, 0, 0))
    d.text(W * 0.1, H * 0.5 + s * 1.35, W * 0.8, c["message"], "Playfair Display", 72, "#FFFFFF", italic=True, align="center")
    pill(d, W / 2, H * 0.74, c["signature"], "Montserrat", 30, "#4B2C7A", "#FFE9C7", spacing=100, upper=False, weight=600)
    return {"layout": "glowing moon in a starry sky, flowers along the foot, script greeting mid-page", "typography": "Great Vibes, Playfair Display italic, Montserrat", "palette": "midnight indigo to orchid, moon gold", "decor": "stars, moon glow, flower row illustrations"}


@design(46)
def midnight_garden(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H / 2, H * 0.7, [(0, "#1B2A22"), (1, "#0A110D")]))
    corner_cluster(d, W * 0.05, H * 0.02, W * 0.34, leafc=("#2F5240", "#3F6B52"), flowers=("rose", "hibiscus", "tulip"))
    corner_cluster(d, W * 0.95, H * 0.98, W * 0.34, flip=-1, flipy=-1, leafc=("#2F5240", "#3F6B52"), flowers=("hibiscus", "rose", "cherry-blossom"))
    s = d.fit("Happy\nBirthday", W * 0.62, "Playfair Display", 90, 500, True)
    t = d.text(0, H * 0.34, W, "Happy\nBirthday", "Playfair Display", s, "#E9C877", italic=True, weight=500, align="center", lh=1.0)
    text_metal(d, t)
    divider(d, W / 2, H * 0.34 + t["_h"] + 18, W * 0.26, "#C9A45A", 1, gap=7)
    d.text(W * 0.18, H * 0.34 + t["_h"] + 34, W * 0.64, c["message"], "Lora", W * 0.036, "#D9E2D8", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.34 + t["_h"] + 34 + W * 0.2, W, c["signature"], "Montserrat", W * 0.026, "#C9A45A", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "dark garden: flower clusters in two corners, gold italic headline centred", "typography": "Playfair Display italic gold, Lora italic, Montserrat caps", "palette": "midnight green, deep leaves, gold, bloom pinks", "decor": "corner flower clusters, gold divider"}


@design(47)
def cherry_blossom_name(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFF0F3"), (1, "#FCE4EC")]))
    d.path([["M", -20, H * 0.05], ["C", W * 0.25, H * 0.12, W * 0.35, H * 0.06, W * 0.62, H * 0.2]], fill="", stroke="#6D4C41", sw=14)
    d.path([["M", W * 0.25, H * 0.1], ["C", W * 0.3, H * 0.2, W * 0.28, H * 0.26, W * 0.34, H * 0.3]], fill="", stroke="#6D4C41", sw=8)
    for x, y, sz in [(0.1, 0.06, 120), (0.24, 0.1, 140), (0.38, 0.1, 110), (0.5, 0.15, 130), (0.62, 0.2, 100), (0.33, 0.29, 110), (0.18, 0.15, 80)]:
        d.art("cherry-blossom", W * x, H * y, sz, angle=d.rng.uniform(-30, 30))
    for _ in range(30):
        d.ellipse(d.rng.uniform(0, W), d.rng.uniform(H * 0.25, H), d.rng.uniform(6, 12), d.rng.uniform(4, 7), d.rng.choice(["#F8BBD0", "#F48FB1", "#FFCDD2"]), angle=d.rng.uniform(0, 180), opacity=0.9)
    d.text(0, H * 0.42, W, "Happy Birthday", "Playfair Display", 70, "#AD4D6B", weight=600, italic=True, align="center")
    s = d.fit(c["signature"], W * 0.7, "Great Vibes", 300)
    d.text(0, H * 0.5, W, c["signature"], "Great Vibes", s, "#D25C83", align="center")
    d.text(0, H * 0.85, W, c["message"], "Montserrat", 32, "#AD4D6B", weight=600, align="center", spacing=360, upper=True)
    return {"layout": "blossoming branch across the top, falling petals, oversized script name", "typography": "Playfair Display italic, Great Vibes, Montserrat caps", "palette": "petal pinks, bark brown", "decor": "vector branch, cherry-blossom illustrations, falling petals"}


@design(48)
def eucalyptus_arch(d, c):
    W, H = d.W, d.H
    d.bg("#FBFAF6")
    aw, ah = W * 0.7, H * 0.78
    ax, ay = (W - aw) / 2, H * 0.11
    d.path([["M", ax, ay + ah], ["L", ax, ay + aw / 2], ["C", ax, ay + aw * 0.22, ax + aw * 0.22, ay, W / 2, ay], ["C", ax + aw * 0.78, ay, ax + aw, ay + aw * 0.22, ax + aw, ay + aw / 2], ["L", ax + aw, ay + ah], ["Z"]], fill="#EEF2EA", stroke="#A7B8A0", sw=1.2, name="Arch")
    # eucalyptus: round leaves climbing both sides
    for side in (-1, 1):
        for k in range(14):
            t = k / 13
            if t < 0.55:
                x = W / 2 + side * aw / 2
                y = ay + ah - t / 0.55 * (ah - aw / 2)
            else:
                a = math.pi / 2 * (1 - (t - 0.55) / 0.45 * 0.75)
                x = W / 2 + side * aw / 2 * math.sin(a + 0) if False else W / 2 + side * (aw / 2) * math.cos(math.pi / 2 - a)
                y = ay + aw / 2 - (aw / 2) * math.sin(math.pi / 2 - a)
            r = 15 - 5 * t
            col = ["#8FA79A", "#A8BDB1", "#7A9486"][k % 3]
            d.circle(x + side * 12, y, r, col, opacity=0.95)
            d.circle(x - side * 10, y - 14, r * 0.85, col, opacity=0.9)
    d.text(0, ay + aw * 0.28, W, "please join us for", "Lora", W * 0.034, "#6A7B70", italic=True, align="center")
    s = d.fit(c["headline"], aw * 0.8, "Great Vibes", 80)
    d.text(0, ay + aw * 0.36, W, c["headline"], "Great Vibes", s, "#3F5547", align="center")
    parts = c["message"].split(" · ")
    y = ay + aw * 0.36 + s * 1.4
    d.text(ax + aw * 0.1, y, aw * 0.8, parts[0], "Cinzel", W * 0.04, "#3F5547", weight=600, align="center", spacing=160)
    d.text(ax + aw * 0.1, y + W * 0.08, aw * 0.8, "\n".join(parts[1:]), "Lora", W * 0.035, "#4E5F55", align="center", lh=1.5)
    d.text(ax + aw * 0.1, ay + ah - W * 0.14, aw * 0.8, c["signature"].replace(" · ", "\n"), "Montserrat", W * 0.022, "#6A7B70", weight=600, align="center", spacing=200, upper=True, lh=1.7)
    return {"layout": "tall arch outlined in eucalyptus leaves, invitation text centred inside", "typography": "Great Vibes, Cinzel, Lora, Montserrat caps", "palette": "white, eucalyptus sage, forest", "decor": "round eucalyptus leaves climbing the arch"}


@design(49)
def sunflowers(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFF6D6"), (1, "#FFE08A")]))
    d.rays(W / 2, H * 1.0, 40, H * 1.1, 22, "#FFFFFF", opacity=0.35, start=180, end=360)
    for x, y, s_ in [(0.18, 0.86, 0.36), (0.5, 0.8, 0.44), (0.82, 0.86, 0.36), (0.34, 0.95, 0.3), (0.67, 0.96, 0.3)]:
        d.art("sunflower", W * x, H * y, W * s_)
    s = d.fit("You are my\nsunshine", W * 0.8, "Pacifico", 70)
    d.text(0, H * 0.1, W, "You are my\nsunshine", "Pacifico", s, "#7A4A00", align="center", lh=1.05)
    d.text(W * 0.14, H * 0.1 + s * 2.5, W * 0.72, c["message"], "Lora", W * 0.038, "#6B4E1A", italic=True, align="center", lh=1.45)
    pill(d, W / 2, H * 0.1 + s * 2.5 + W * 0.2, c["signature"], "Montserrat", W * 0.026, "#FFF6D6", "#7A4A00", spacing=200)
    return {"layout": "sun rays rising from the foot behind a bunch of sunflowers, handwritten headline above", "typography": "Pacifico, Lora italic, Montserrat caps", "palette": "buttercream to sunflower yellow, chocolate", "decor": "white sun rays, five sunflower illustrations"}


@design(50)
def lavender_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#F7E9F2"), (0.55, "#D9C6EE"), (1, "#9F86C9")]))
    d.circle(W * 0.5, H * 0.52, W * 0.22, "#FFE2B8", opacity=0.9, name="Sun")
    for row, (y0, h0, col) in enumerate([(H * 0.62, H * 0.12, "#8A6FBF"), (H * 0.7, H * 0.16, "#6E54A8"), (H * 0.8, H * 0.2, "#5A4196")]):
        d.wave(-d.bleed, W + d.bleed, y0 + h0 * 0.35, 10, 160, fill=mix(mix(col, "#2F5A3A", 0.3), "#FFFFFF", 0.15), bottom=H + d.bleed)
        stems, buds = [], []
        for k in range(16):
            x = W * (k + 0.5) / 16 + d.rng.uniform(-14, 14)
            top = y0 - d.rng.uniform(0, h0 * 0.4)
            stems += [["M", x, top + 90], ["L", x, y0 + h0 * 0.7]]
            for j in range(8):
                bx, by = x + (7 if j % 2 else -7), top + j * 13
                ang = math.radians(-70 if j % 2 else -110)
                ux, uy = math.cos(ang) * 13, math.sin(ang) * 13
                px, py = -uy * 0.6, ux * 0.6
                buds += [["M", bx - ux, by - uy], ["Q", bx + px, by + py, bx + ux, by + uy], ["Q", bx - px, by - py, bx - ux, by - uy], ["Z"]]
        d.path(stems, fill="", stroke="#4E7A4E", sw=3, name="Lavender stems")
        d.path(buds, fill=col, name="Lavender")
    s = d.fit("Happy Birthday", W * 0.8, "Playfair Display", 140, 500, True)
    d.text(0, H * 0.14, W, "Happy Birthday", "Playfair Display", s, "#5A3F8C", weight=500, italic=True, align="center")
    d.text(W * 0.14, H * 0.14 + s * 1.4, W * 0.72, c["message"], "Lora", 50, "#6E5596", align="center", lh=1.4)
    d.art("butterfly", W * 0.82, H * 0.36, 120, angle=15)
    d.art("honeybee", W * 0.18, H * 0.42, 90, angle=-10)
    return {"layout": "lavender rows rolling toward the horizon under a low sun, headline in the sky", "typography": "Playfair Display italic, Lora", "palette": "blush to lavender sky, violet field", "decor": "three rows of vector lavender, sun, butterfly and bee illustrations"}


# ------------------------------------------------------------------ modern geometric
@design(51)
def glass_card(d, c):
    W, H = d.W, d.H
    d.bg("#140F2E")
    for x, y, r, col in [(0.2, 0.25, 0.42, "#FF4FA3"), (0.85, 0.2, 0.38, "#4F7BFF"), (0.7, 0.85, 0.45, "#00D4C8"), (0.15, 0.9, 0.3, "#FFB547")]:
        d.circle(W * x, H * y, W * r, rad(W * r, W * r, W * r, [(0, rgba(col, 0.95)), (1, rgba(col, 0))]))
    d.rect(W * 0.12, H * 0.2, W * 0.76, H * 0.6, "rgba(255,255,255,0.14)", rx=48, stroke="rgba(255,255,255,0.45)", sw=2, shadow_=shadow("rgba(0,0,0,0.25)", 60, 0, 30), name="Glass card")
    d.text(W * 0.18, H * 0.26, W * 0.64, "✦ achievement", "DM Sans", 32, "#FFFFFF", weight=600, spacing=200, upper=True, opacity=0.85)
    s = d.fit("HAPPY\nBIRTHDAY", W * 0.6, "Outfit", 180, 800)
    d.text(W * 0.18, H * 0.33, W * 0.64, "HAPPY\nBIRTHDAY", "Outfit", s, "#FFFFFF", weight=800, lh=0.95)
    d.text(W * 0.18, H * 0.33 + s * 2.3, W * 0.64, c["message"], "DM Sans", 52, "#FFFFFF", weight=500)
    d.rect(W * 0.18, H * 0.66, W * 0.64, 14, "rgba(255,255,255,0.25)", rx=7)
    d.rect(W * 0.18, H * 0.66, W * 0.64 * 0.86, 14, lin(0, 0, W * 0.55, 0, [(0, "#FFB547"), (1, "#FF4FA3")]), rx=7)
    d.text(W * 0.18, H * 0.7, W * 0.64, c["signature"], "DM Sans", 32, "#FFFFFF", weight=500, opacity=0.8)
    return {"layout": "frosted glass card floating over glowing gradient orbs, game-style progress bar", "typography": "Outfit ExtraBold, DM Sans", "palette": "ink violet, neon pink, blue, teal, amber", "decor": "radial glow orbs, glass card, gradient progress bar"}


@design(52)
def bauhaus(d, c):
    W, H = d.W, d.H
    d.bg("#F1E9DA")
    g = 120
    x0, y0 = 60, 60
    cols = ["#E2412E", "#F2B630", "#1F4E9A", "#111111"]
    for j in range(5):
        for i in range(8):
            x, y = x0 + i * g, y0 + j * g
            k = (i * 3 + j * 5) % 7
            col = cols[(i + 2 * j) % 4]
            if k == 0:
                d.rect(x, y, g, g, col)
            elif k == 1:
                d.circle(x + g / 2, y + g / 2, g / 2, col)
            elif k == 2:
                d.path([["M", x, y + g], ["L", x, y], ["Q", x + g, y, x + g, y + g], ["Z"]], fill=col)
            elif k == 3:
                d.circle(x + g / 2, y + g, g / 2, col, start=180, end=360)
            elif k == 4:
                d.polygon([(x, y + g), (x + g / 2, y), (x + g, y + g)], col)
            elif k == 5:
                d.rect(x + g * 0.3, y, g * 0.4, g, col)
    s = d.fit("HAPPY\nBIRTHDAY", W - 120, "Archivo Black", 220)
    d.text(60, y0 + 5 * g + 50, W - 120, "HAPPY\nBIRTHDAY", "Archivo Black", s, "#111111", lh=0.92)
    d.text(60, H - 110, W - 120, c["message"], "DM Sans", 40, "#111111", weight=700, spacing=60)
    d.circle(W - 110, H - 90, 40, "#E2412E")
    return {"layout": "Bauhaus tile grid of circles, arcs and triangles over a heavy two-line headline", "typography": "Archivo Black, DM Sans", "palette": "Bauhaus red, yellow, blue, black on paper", "decor": "40-cell shape grid"}


@design(53)
def holographic_18(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FDE2FF"), (0.3, "#C9E7FF"), (0.6, "#E8D5FF"), (1, "#FFE0EC")]))
    for x, y, r, col in [(0.2, 0.2, 0.5, "#9FF3FF"), (0.85, 0.5, 0.5, "#FFB8F0"), (0.3, 0.85, 0.45, "#D6B8FF")]:
        d.circle(W * x, H * y, W * r, rad(W * r, W * r, W * r, [(0, rgba(col, 0.8)), (1, rgba(col, 0))]))
    t = d.text(0, H * 0.14, W, "18", "Outfit", W * 0.78, "#FFFFFF", weight=900, align="center", lh=0.9)
    t["fill"] = lin(0, 0, t["width"], t["_h"], [(0, "#FFFFFF"), (0.35, "#C7D2FF"), (0.55, "#FFD1F2"), (0.8, "#B8F1FF"), (1, "#FFFFFF")])
    t["shadow"] = shadow("rgba(120,90,200,0.35)", 50, 0, 20)
    for x, y, r in [(0.18, 0.12, 40), (0.85, 0.16, 28), (0.82, 0.48, 46), (0.14, 0.5, 24)]:
        d.sparkle(W * x, H * y, r, "#FFFFFF")
    s = d.fit("happy eighteenth", W * 0.8, "Outfit", 130, 700)
    d.text(0, H * 0.62, W, "happy eighteenth", "Outfit", s, "#3B2A6E", weight=700, align="center")
    d.text(0, H * 0.62 + s * 1.4, W, c["message"], "DM Sans", 50, "#5B4A8E", weight=500, align="center")
    pill(d, W / 2, H * 0.86, "18 · level up", "DM Sans", 34, "#FFFFFF", "#3B2A6E", spacing=200)
    return {"layout": "huge iridescent 18 on a holographic gradient, lowercase headline below", "typography": "Outfit Black / Bold, DM Sans", "palette": "iridescent pink, cyan, lilac, deep violet text", "decor": "glow orbs, white sparkles, label pill"}


@design(54)
def diagonal_duotone(d, c):
    W, H = d.W, d.H
    b = d.bleed
    d.bg("#FFD400")
    d.polygon([(-b, H * 0.62), (W + b, H * 0.3), (W + b, H + b), (-b, H + b)], "#111111")
    s1 = d.fit("HAPPY", W * 0.86, "Anton", 400)
    d.text(W * 0.06, H * 0.04, W * 0.88, "HAPPY", "Anton", s1, "#111111", lh=0.9, angle=0)
    s2 = d.fit("BIRTHDAY", W * 0.86, "Anton", 400)
    d.text(W * 0.06, H * 0.95 - s2 * FS_MULT * 0.95, W * 0.88, "BIRTHDAY", "Anton", s2, "#FFD400", lh=0.9)
    d.circle(W * 0.78, H * 0.44, 110, "#FFFFFF", shadow_=shadow("rgba(0,0,0,0.3)", 30, 0, 10))
    d.text(W * 0.78 - 110, H * 0.44 - 50, 220, c["signature"], "Pacifico", 70, "#111111", align="center")
    d.stripes(W * 0.06, H * 0.42, W * 0.5, H * 0.47, 10, 12, "#111111", angle_deg=-30)
    return {"layout": "diagonal split: HAPPY on yellow, BIRTHDAY on black, name in a white disc on the seam", "typography": "Anton, Pacifico", "palette": "electric yellow, black, white", "decor": "hazard stripes, drop-shadow disc"}


@design(55)
def sunset_rings(d, c):
    W, H = d.W, d.H
    d.bg("#2B1B3D")
    cx, cy = W / 2, H * 0.42
    for k, col in enumerate(["#3E2452", "#5A2D5E", "#83355F", "#B4485C", "#E0694F", "#F59E4C", "#FBD35E"]):
        d.circle(cx, cy, W * (0.52 - k * 0.06), col)
    for k in range(6):
        y = cy + W * 0.05 + k * 16
        d.rect(cx - W * 0.2, y, W * 0.4, 4 + k * 1.6, "#2B1B3D")
    d.rect(-d.bleed, H * 0.62, W + 2 * d.bleed, H * 0.38 + d.bleed, "#2B1B3D")
    s = d.fit("golden hour", W * 0.8, "Playfair Display", 80, 600, True)
    d.text(0, H * 0.64, W, "golden hour", "Playfair Display", s, "#FBD35E", weight=600, italic=True, align="center")
    d.text(W * 0.1, H * 0.64 + s * 1.35, W * 0.8, c["message"], "Lora", W * 0.04, "#F3D8C2", align="center")
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.026, "#E0694F", weight=700, align="center", spacing=300, upper=True)
    return {"layout": "concentric sunset rings with a striped retro sun, text on the dusk ground", "typography": "Playfair Display italic, Lora, Montserrat caps", "palette": "plum dusk through coral to sun gold", "decor": "seven-ring sunset, cut stripes"}


@design(56)
def memphis_teal(d, c):
    W, H = d.W, d.H
    d.bg("#2EC4B6")
    d.dots(0, 0, W * 0.3, H * 0.3, 26, 4, "#FFFFFF", opacity=0.6)
    d.dots(W * 0.7, H * 0.7, W, H, 26, 4, "#111111", opacity=0.5)
    zig = [["M", W * 0.62, H * 0.08]] + [["L", W * 0.62 + i * 34, H * 0.08 + (24 if i % 2 else 0)] for i in range(1, 10)]
    d.path(zig, fill="", stroke="#111111", sw=8, join="miter")
    d.path([["M", W * 0.06, H * 0.8], ["Q", W * 0.12, H * 0.72, W * 0.18, H * 0.8], ["Q", W * 0.24, H * 0.88, W * 0.3, H * 0.8]], fill="", stroke="#FFBE0B", sw=12)
    d.polygon([(W * 0.85, H * 0.32), (W * 0.95, H * 0.44), (W * 0.8, H * 0.46)], "#FF5DA2")
    d.circle(W * 0.14, H * 0.44, 46, "#FFBE0B")
    d.rect(W * 0.12 + 22, H * 0.24 + 22, W * 0.76, H * 0.46, "#111111", name="Offset shadow")
    d.rect(W * 0.12, H * 0.24, W * 0.76, H * 0.46, "#FFFFFF", stroke="#111111", sw=6, name="Card")
    FUN = "Luckiest Guy"
    s = d.fit("HAPPY\nB-DAY!", W * 0.62, FUN, 170)
    d.text(W * 0.12, H * 0.27, W * 0.76, "HAPPY\nB-DAY!", FUN, s, "#FF5DA2", align="center", lh=0.95, stroke="#111111", sw=4)
    d.text(W * 0.15, H * 0.27 + s * FS_MULT * 1.95 + 20, W * 0.7, c["message"], "Fredoka", 44, "#111111", weight=600, align="center")
    d.sparkle(W * 0.86, H * 0.85, 30, "#FFFFFF")
    return {"layout": "white card with a hard offset shadow among Memphis shapes", "typography": "Luckiest Guy outlined, Fredoka", "palette": "teal, hot pink, sunflower, black", "decor": "dot grids, zigzag, squiggle, triangle, circle"}


@design(57)
def group_chat_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#1C1B33"), (1, "#30214D")]))
    d.text(80, 140, W - 160, "the group chat 🎉" if False else "the group chat", "DM Sans", 40, "#B9B2E6", weight=600, align="center")
    d.text(80, 196, W - 160, "4 members · online", "DM Sans", 28, "#7F78A8", align="center")
    bubbles = [("Sara", "is it today??", 0), ("Omar", "IT IS TODAY 🎂" .replace(" 🎂", ""), 1), ("Lina", "Happy birthday Maryam!!", 0), ("you", "queen of the group chat", 1)]
    y = 330
    grads = [("#FF6FB5", "#FF9A6B"), ("#6B8BFF", "#9B6BFF"), ("#22C7A9", "#58A6FF"), ("#FFB547", "#FF6FB5")]
    for k, (who, msg, right) in enumerate(bubbles):
        tw = min(W * 0.66, text_width(msg, "DM Sans", 46, 600) + 80)
        x = W - 80 - tw if right else 80
        d.text(x + 10, y - 40, tw, who, "DM Sans", 26, "#9A93C8", weight=600, align="right" if right else "left")
        g0, g1 = grads[k]
        d.rect(x, y, tw, 96, lin(0, 0, tw, 0, [(0, g0), (1, g1)]), rx=48)
        d.text(x, y + 22, tw, msg, "DM Sans", 46, "#FFFFFF", weight=600, align="center")
        y += 170
    s = d.fit("Happy Birthday\nMaryam", W * 0.84, "Outfit", 170, 800)
    d.text(0, y + 40, W, "Happy Birthday\nMaryam", "Outfit", s, "#FFFFFF", weight=800, align="center", lh=1.0)
    d.text(W * 0.1, y + 60 + s * 2.3, W * 0.8, c["message"], "DM Sans", 46, "#D9D4FF", weight=500, align="center", lh=1.3)
    d.text(0, H - 160, W, c["signature"], "DM Sans", 38, "#FF9A6B", weight=600, align="center")
    d.art("party-popper", W * 0.86, 150, 170, angle=-10)
    return {"layout": "group-chat thread of gradient message bubbles above a bold greeting", "typography": "Outfit ExtraBold, DM Sans", "palette": "night violet, gradient pinks, blues, teal", "decor": "chat bubbles with gradients, party popper illustration"}


@design(58)
def isometric_cake(d, c):
    W, H = d.W, d.H
    d.bg("#EDE7FF")
    d.dots(0, 0, W, H, 40, 2.2, "#D3C8FA")
    cx, top = W / 2, H * 0.24
    a, b_ = 260, 150  # half width, half depth
    tiers = [("#FF8FB1", "#E26A92", "#FFC2D4", 150), ("#8FD3FF", "#5DB2E6", "#C8EBFF", 130), ("#FFD36E", "#E6B240", "#FFEAB0", 110)]
    yb = top + 520
    scale = 1.0
    for k, (side, side2, topc, hgt) in enumerate(tiers):
        A, B = a * scale, b_ * scale * 0.58
        ytop = yb - hgt
        d.polygon([(cx - A, yb), (cx, yb + B), (cx, ytop + B), (cx - A, ytop)], side)
        d.polygon([(cx + A, yb), (cx, yb + B), (cx, ytop + B), (cx + A, ytop)], side2)
        d.polygon([(cx - A, ytop), (cx, ytop - B), (cx + A, ytop), (cx, ytop + B)], topc)
        yb = ytop
        scale *= 0.74
    A, B = a * scale / 0.74, b_ * scale / 0.74 * 0.58
    for k, dx in enumerate([-0.45, 0, 0.45]):
        x = cx + dx * A
        y = yb + abs(dx) * B * 0.1
        d.rect(x - 8, y - 90, 16, 90, ["#7C5CFF", "#FF5D8F", "#2EC4B6"][k], rx=4)
        d.ellipse(x, y - 108, 12, 20, "#FFB547")
    s = d.fit("HAPPY BIRTHDAY", W * 0.84, "Outfit", 120, 800)
    d.text(0, H * 0.08, W, "HAPPY BIRTHDAY", "Outfit", s, "#2E2163", weight=800, align="center")
    d.text(0, H * 0.84, W, c["message"], "DM Sans", 50, "#5A4BA0", weight=600, align="center")
    return {"layout": "three-tier isometric cake with candles centred on a dot grid", "typography": "Outfit ExtraBold, DM Sans", "palette": "lavender, bubblegum, sky, butter, deep violet", "decor": "isometric vector cake, dot grid"}


@design(59)
def halftone_pink(d, c):
    W, H = d.W, d.H
    d.bg("#FF8FB8")
    # halftone fade from the bottom-right corner
    step = 18
    path = []
    for j in range(int(H / step) + 2):
        for i in range(int(W / step) + 2):
            x, y = i * step, j * step
            dist = math.hypot(W - x, H - y) / math.hypot(W, H)
            r = max(0, (0.62 - dist)) * 16
            if r > 0.6:
                path += [["M", x - r, y], ["C", x - r, y - r * 0.55, x - r * 0.55, y - r, x, y - r], ["C", x + r * 0.55, y - r, x + r, y - r * 0.55, x + r, y], ["C", x + r, y + r * 0.55, x + r * 0.55, y + r, x, y + r], ["C", x - r * 0.55, y + r, x - r, y + r * 0.55, x - r, y], ["Z"]]
    d.path(path, fill="#E8457F", name="Halftone")
    s = d.fit("birthday", W * 0.86, "Outfit", 140, 800)
    d.text(W * 0.07, H * 0.1, W * 0.86, "happy", "Outfit", s, "#111111", weight=800, lh=0.9)
    d.text(W * 0.07, H * 0.1 + s * 0.95, W * 0.86, "birthday", "Outfit", s, "#FFFFFF", weight=800, lh=0.9, stroke="#111111", sw=2)
    d.text(W * 0.07, H * 0.1 + s * 2.15, W * 0.6, c["message"], "DM Sans", W * 0.05, "#111111", weight=700, lh=1.2)
    d.art("confetti-ball", W * 0.74, H * 0.68, W * 0.36, angle=10)
    return {"layout": "big lowercase two-tone headline top-left, halftone fade from the corner", "typography": "Outfit ExtraBold, DM Sans Bold", "palette": "hot pink, magenta halftone, black, white", "decor": "halftone dots, confetti ball illustration"}


@design(60)
def tiles_40(d, c):
    W, H = d.W, d.H
    d.bg("#1E2A3A")
    n = 5
    g = W / n
    cols = ["#F4A259", "#5B8E7D", "#BC4B51", "#F4E285", "#8CB369"]
    for j in range(n):
        for i in range(n):
            x, y = i * g, j * g
            if 1 <= i <= 3 and 1 <= j <= 3:
                continue
            k = (i + j * 2) % 4
            col = cols[(i * 2 + j) % 5]
            d.rect(x, y, g, g, "#F7F1E3" if (i + j) % 2 else "#EFE5CF")
            if k == 0:
                d.path([["M", x, y], ["L", x + g, y], ["Q", x + g, y + g, x, y + g], ["Z"]], fill=col)
            elif k == 1:
                d.circle(x + g / 2, y + g / 2, g * 0.36, col)
            elif k == 2:
                d.circle(x, y + g, g, col, start=270, end=360)
            else:
                d.polygon([(x, y), (x + g, y), (x + g, y + g)], col)
    d.rect(g, g, 3 * g, 3 * g, "#1E2A3A")
    t = d.text(g, g * 1.1, 3 * g, "40", "Playfair Display", g * 1.3, "#F4E285", weight=700, align="center", lh=0.9)
    d.text(g, g * 2.6 + 6, 3 * g, "HAPPY BIRTHDAY", "Montserrat", g * 0.17, "#F7F1E3", weight=700, align="center", spacing=360)
    d.text(g, g * 2.95, 3 * g, c["message"].replace(" ✶ 40", ""), "Great Vibes", g * 0.42, "#F4A259", align="center")
    return {"layout": "frame of patterned geometric tiles around a dark centre square holding 40", "typography": "Playfair Display, Montserrat caps, Great Vibes", "palette": "navy, cream, tangerine, sage, brick, lemon", "decor": "16 geometric tiles with quarter circles, triangles and dots"}
