"""
Brand promo designs (Admin → SEO → Social → Promo designs): Magical Touch
posts for Instagram, stories, Facebook, LinkedIn, Pinterest and YouTube,
built from real template previews. Saved as editable (draft) templates
tagged "brand-promo", so the admin can change any word, colour or picture
in the editor.

  MT_FONT_DIR=... python3 promo.py --out FILE
"""

import argparse
import json
import os
import re
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

from kit import Doc, lin, rad, rgba, shadow, FS_MULT, text_width  # noqa: E402
from common import pill  # noqa: E402

PUB = os.path.join(ROOT, "public")
BOARD = json.load(open(os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")))[0]["canvasJson"]["objects"][0]
BG = "#FFFFFF"
VIOLET = "#8E7FD0"
COUNT = "5,450+"


def img(doc, src, x, y, w, h, angle=0, border=0, rx=0, name="Template picture", sh=True):
    iw, ih = Image.open(os.path.join(PUB, src.lstrip("/"))).size
    s = max(w / iw, h / ih)
    cw, ch = w / s, h / s
    o = {"type": "image", "left": x + w / 2, "top": y + h / 2, "originX": "center", "originY": "center", "width": cw, "height": ch,
         "cropX": (iw - cw) / 2, "cropY": (ih - ch) / 2, "scaleX": s, "scaleY": s, "angle": angle, "src": src, "crossOrigin": "anonymous", "filters": [],
         "__frame": {"kind": "roundRect" if rx else "rect", "empty": False}}
    if rx:
        o["clipPath"] = {"type": "rect", "version": "5.1.0", "originX": "center", "originY": "center", "left": 0, "top": 0, "width": cw, "height": ch, "rx": rx / s, "ry": rx / s, "fill": "#000"}
    if border:
        doc.rect(x + w / 2, y + h / 2, w + 2 * border, h + 2 * border, "#FFFFFF", rx=rx + border if rx else 0, angle=angle, origin_center=True, shadow_=shadow("rgba(0,0,0,0.18)", 30, 0, 14) if sh else None, name="Print")
    return doc.add(o, name)


def logo(doc, x, y, w):
    h = w * 403 / 2809
    doc.add({"type": "image", "left": x, "top": y, "width": 2809, "height": 403, "scaleX": w / 2809, "scaleY": w / 2809, "src": "/logo.png", "crossOrigin": "anonymous", "filters": []}, "Logo")
    return h


P = lambda slug: f"/templates/collection/{slug}-preview.jpg"
PICS = ["new-collection-launch-post", "heart-photo-frame-love-post", "skincare-product-poster", "balloons-kids-party-invitation", "lifestyle-magazine-cover",
        "summer-memories-photo-collage", "elegant-gold-birthday-invitation", "diwali-greeting-card", "navy-sidebar-designer-resume", "corporate-event-poster"]

# ---------------------------------------------------------------- brand
# Magical Touch brand (app/globals.css): Poppins, ink #09090B, the logo's
# spectrum (rose → lilac → sky → teal → green → yellow), soft pastel washes
# on white, or black with a spectrum bar and a blue/violet glow.
INK = "#09090B"
LILAC = "#8E7FD0"
SPECTRUM = [(0, "#F2708F"), (0.22, "#A69BD3"), (0.45, "#35C2F1"), (0.64, "#5DCCB8"), (0.82, "#8CC84B"), (1, "#DDE23B")]
SPEC_TEXT = [(0, "#EC5F84"), (0.3, "#8E7FD0"), (0.58, "#1FAEE6"), (0.8, "#33B79C"), (1, "#6DB33A")]


def light(doc):
    W, H, b = doc.W, doc.H, doc.bleed
    doc.bg("#FFFFFF")
    for cx, cy, r, col in [(0, 0, 0.9, "#F3A6B8"), (1, 0, 0.8, "#8CCBFF"), (0.5, 1.05, 0.9, "#BFE8C8"), (1, 1, 0.5, "#F6F1A8")]:
        R = max(W, H) * r
        doc.rect(-b, -b, W + 2 * b, H + 2 * b, rad(cx * W + b, cy * H + b, R, [(0, rgba(col, 0.55)), (1, rgba(col, 0))]), name="Wash")


def dark(doc):
    W, H, b = doc.W, doc.H, doc.bleed
    doc.bg(INK)
    R = max(W, H) * 0.9
    doc.rect(-b, -b, W + 2 * b, H + 2 * b, rad(W * 1.0 + b, H * 0.55 + b, R * 0.7, [(0, "rgba(31,174,230,0.32)"), (1, "rgba(31,174,230,0)")]), name="Glow")
    doc.rect(-b, -b, W + 2 * b, H + 2 * b, rad(0 + b, H + b, R * 0.7, [(0, "rgba(124,58,237,0.38)"), (1, "rgba(124,58,237,0)")]), name="Glow")
    doc.rect(-b, -b, W + 2 * b, max(8, H * 0.008) + b, lin(0, 0, W + 2 * b, 0, SPECTRUM), name="Spectrum bar")


def spectrum_rule(doc, x, y, w, h=6):
    doc.rect(x, y, w, h, lin(0, 0, w, 0, SPECTRUM), rx=h / 2, name="Spectrum line")


def brand_logo(doc, x, y, w, on_dark=False):
    h = w * 403 / 2809
    doc.add({"type": "image", "left": x, "top": y, "width": 2809, "height": 403, "scaleX": w / 2809, "scaleY": w / 2809,
             "src": "/logo-white.png" if on_dark else "/logo.png", "crossOrigin": "anonymous", "filters": []}, "Logo")
    return h


def headline(doc, x, y, w, size, l1, l2, on_dark=False, align="left", gradient=True):
    o = doc.text(x, y, w, l1, "Poppins", size, "#FFFFFF" if on_dark else INK, weight=700, align=align, lh=1.04, spacing=-10, name="Headline")
    o2 = doc.text(x, y + o["_h"], w, l2, "Poppins", size, LILAC, weight=700, align=align, lh=1.04, spacing=-10, name="Headline 2")
    if gradient:
        tw = min(w, text_width(l2, "Poppins", size, 700, False, -10))
        x0 = (w - tw) / 2 if align == "center" else 0
        o2["fill"] = lin(x0, 0, x0 + tw, 0, SPEC_TEXT)
    return o["_h"] + o2["_h"]


def body(doc, x, y, w, text, size, on_dark=False, align="left"):
    return doc.text(x, y, w, text, "Poppins", size, rgba("#FFFFFF", 0.8) if on_dark else "#52525B", weight=400, align=align, lh=1.4, name="Body")


def cta(doc, cx, cy, text, size, on_dark=False):
    return pill(doc, cx, cy, text, "Poppins", size, INK if on_dark else "#FFFFFF", "#FFFFFF" if on_dark else INK, weight=600, upper=False, spacing=0)


def fan(doc, slugs, cx, cy, w, h, spread, tilt=7, border=8):
    n = len(slugs)
    for i, sl in enumerate(slugs):
        k = i - (n - 1) / 2
        img(doc, P(sl), cx + k * spread - w / 2, cy - h / 2 + abs(k) * h * 0.06, w, h, angle=k * tilt, border=border, rx=12)


def insta(doc):
    W, H = doc.W, doc.H
    dark(doc)
    m = 80
    brand_logo(doc, m, 95, 390, on_dark=True)
    hh = headline(doc, m, 190, W - 2 * m, 104, "Design anything.", "Free. Forever.", on_dark=True)
    body(doc, m, 200 + hh + 30, W - 2 * m, f"{COUNT} templates · AI Template Studio · Photo Studio · print-ready PDF", 36, on_dark=True)
    fan(doc, [PICS[6], PICS[3], PICS[0], PICS[7], PICS[9]], W / 2, 900, 280, 350, 185, tilt=8)
    cta(doc, 220, H - 120, "Start free →", 38, on_dark=True)
    doc.text(W - m - 420, H - 145, 420, "magicaltouchdesign.com", "Poppins", 32, rgba("#FFFFFF", 0.85), weight=600, align="right", name="Website")


def square_grid(doc):
    W, H = doc.W, doc.H
    light(doc)
    g, m = 14, 44
    cw = (W - 2 * m - 2 * g) / 3
    for i in range(6):
        r, c = divmod(i, 3)
        img(doc, P(PICS[i]), m + c * (cw + g), m + r * (cw * 1.15 + g), cw, cw * 1.15, rx=16)
    y = m + 2 * (cw * 1.15 + g) + 26
    hh = headline(doc, m, y, W - 2 * m, 60, f"{COUNT} templates.", "All free. No watermark.", align="center")
    doc.text(m, y + hh + 12, W - 2 * m, "magicaltouchdesign.com", "Poppins", 26, "#52525B", weight=600, align="center", name="Website")


def story(doc):
    W, H = doc.W, doc.H
    light(doc)
    m = 90
    brand_logo(doc, m, 150, 420)
    hh = headline(doc, m, 290, W - 2 * m, 92, "Design anything.", "Make it magical.")
    body(doc, m, 290 + hh + 30, W - 2 * m, f"{COUNT} free templates — posters, invitations, posts, menus and more.", 40)
    spectrum_rule(doc, m, 290 + hh + 210, 520, 8)
    fan(doc, [PICS[4], PICS[1], PICS[5]], W / 2, 1230, 380, 475, 250, tilt=8, border=10)
    cta(doc, W / 2, H - 170, "Start designing — it's free", 38)


def wide(doc, title=("Design anything.", "Make it magical."), sub=None, on_dark=False):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 60
    brand_logo(doc, m, 70, 300, on_dark=on_dark)
    hh = headline(doc, m, 160, 620, 62, title[0], title[1], on_dark=on_dark)
    body(doc, m, 160 + hh + 22, 560, sub or f"{COUNT} free templates · posters, flyers, social posts, menus, invitations & more", 26, on_dark=on_dark)
    spectrum_rule(doc, m, H - 130, 560, 6)
    doc.text(m, H - 100, 560, "magicaltouchdesign.com", "Poppins", 26, "#FFFFFF" if on_dark else INK, weight=500, name="Website")
    for (sl, x, y, a) in [(PICS[0], 690, 40, -4), (PICS[4], 930, 70, 5), (PICS[2], 720, 320, 4), (PICS[3], 960, 340, -4)]:
        img(doc, P(sl), x, y, 200, 250, angle=a, border=7, rx=10)


def founder(doc):
    W, H = doc.W, doc.H
    dark(doc)
    m = 90
    brand_logo(doc, m, 90, 320, on_dark=True)
    doc.text(m, 190, 200, "“", "Poppins", 200, LILAC, weight=700, lh=0.8, name="Quote mark")["fill"] = lin(0, 0, 120, 0, SPEC_TEXT)
    doc.text(m, 360, W - 2 * m, "We built a design tool where every feature is free — for creators and small businesses everywhere.", "Poppins", 50, "#FFFFFF", weight=600, lh=1.25, name="Quote")
    spectrum_rule(doc, m, 740, 140, 6)
    doc.text(m, 770, W - 2 * m, "Tony Aloysius · Founder, Magical Touch Design · Tamil Nadu, India", "Poppins", 26, rgba("#FFFFFF", 0.75), weight=500, name="Author")
    for i, sl in enumerate(PICS[5:9]):
        img(doc, P(sl), m + i * 228, 860, 200, 160, rx=14)


def pin(doc):
    W, H = doc.W, doc.H
    light(doc)
    m = 70
    brand_logo(doc, m, 80, 340)
    hh = headline(doc, m, 175, W - 2 * m, 84, f"{COUNT}", "free templates")
    body(doc, m, 175 + hh + 16, W - 2 * m, "Invitations · posters · resumes · menus · social posts", 30)
    cw = (W - 2 * m - 20) / 2
    for i, sl in enumerate([PICS[1], PICS[6], PICS[8], PICS[9]]):
        r, c = divmod(i, 2)
        img(doc, P(sl), m + c * (cw + 20), 470 + r * (cw * 1.0 + 20), cw, cw, rx=18, border=6)
    cta(doc, W / 2, H - 100, "magicaltouchdesign.com", 30)


def spotlight(doc, title, sub, slugs, on_dark=False):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 70
    brand_logo(doc, m, 70, 300, on_dark=on_dark)
    doc.text(m, 150, W - 2 * m, "TEMPLATE SPOTLIGHT", "Poppins", 22, LILAC, weight=600, spacing=300, name="Kicker")
    hh = headline(doc, m, 190, W - 2 * m, 78, title[0], title[1], on_dark=on_dark)
    body(doc, m, 190 + hh + 10, W - 2 * m, sub, 28, on_dark=on_dark)
    cw = (W - 2 * m - 30) / 2
    for i, sl in enumerate(slugs[:4]):
        r, c = divmod(i, 2)
        img(doc, P(sl), m + c * (cw + 30), 470 + r * (cw * 0.76 + 26), cw, cw * 0.76, rx=20, border=6)
    cta(doc, W / 2, H - 70, "Free at magicaltouchdesign.com", 26, on_dark=on_dark)


def yt(doc):
    W, H = doc.W, doc.H
    dark(doc)
    brand_logo(doc, 60, 60, 300, on_dark=True)
    o = doc.text(60, 150, 640, COUNT, "Poppins", 150, "#FFFFFF", weight=800, lh=1.0, name="Number")
    o2 = doc.text(60, 150 + o["_h"], 640, "FREE TEMPLATES", "Poppins", 74, LILAC, weight=800, lh=1.0, name="Headline")
    o2["fill"] = lin(0, 0, 600, 0, SPEC_TEXT)
    cta(doc, 210, 560, "No watermark →", 32, on_dark=True)
    for (sl, x, y, a) in [(PICS[0], 720, 50, -6), (PICS[3], 980, 100, 6), (PICS[4], 760, 360, 4), (PICS[1], 1010, 380, -5)]:
        img(doc, P(sl), x, y, 200, 250, angle=a, border=6, rx=10)


DESIGNS = [
    ("Magical Touch Instagram Launch Post", (1080, 1350), insta),
    ("Magical Touch Template Grid Post", (1080, 1080), square_grid),
    ("Magical Touch Instagram Story", (1080, 1920), story),
    ("Magical Touch Facebook Post", (1200, 630), wide),
    ("Magical Touch LinkedIn Post", (1200, 627), lambda d: wide(d, ("Design without", "a design budget."), f"For small businesses: {COUNT} templates, brand kits and print-ready PDF — free.", on_dark=True)),
    ("Magical Touch Founder Quote Post", (1080, 1080), founder),
    ("Magical Touch Pinterest Pin", (1000, 1500), pin),
    ("Magical Touch Birthday Spotlight", (1080, 1350), lambda d: spotlight(d, ("Birthday", "templates."), "Invitations, wishes and party posts — 570+ designs, all free.", ["balloons-kids-party-invitation", "elegant-gold-birthday-invitation", "circle-photo-frame-birthday", "pastel-birthday-invitation-post"])),
    ("Magical Touch Business Spotlight", (1080, 1350), lambda d: spotlight(d, ("Business", "templates."), "Resumes, business cards, letterheads, flyers and slides — all free.", ["navy-sidebar-designer-resume", "corporate-event-poster", "skincare-product-poster", "classic-gold-certificate-of-achievement"], on_dark=True)),
    ("Magical Touch YouTube Thumbnail", (1280, 720), yt),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = []
    for i, (name, (W, H), fn) in enumerate(DESIGNS, 1):
        ab = json.loads(json.dumps(BOARD))
        ab.update(width=W, height=H, name="Page 1", left=0, top=0)
        ab["__artboardId"] = f"artboard_promo_{i:02d}"
        ab.pop("__print", None)
        d = Doc(W, H, ab, seed=i)
        fn(d)
        for o in d.objs:
            o.pop("_h", None)
            o.pop("__lines", None)
        slug = "mtd-promo-" + re.sub(r"[^a-z0-9]+", "-", name.lower().replace("magical touch ", "")).strip("-")
        out.append({"name": name, "category": "Brand Promo", "sub": None, "slug": slug, "width": W, "height": H, "pages": 1, "color1": BG, "color2": VIOLET, "sort": i,
                    "premium": False, "featured": False, "keywords": "magical touch design promo", "tags": ["brand-promo"], "status": "draft", "orientation": "square",
                    "description": "Magical Touch Design brand promo post — edit in the editor.", "canvasJson": d.json()})
    json.dump(out, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(out))


if __name__ == "__main__":
    main()
