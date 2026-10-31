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

from kit import Doc, lin, rgba, shadow, FS_MULT, text_width  # noqa: E402
from common import pill  # noqa: E402

PUB = os.path.join(ROOT, "public")
BOARD = json.load(open(os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")))[0]["canvasJson"]["objects"][0]
INK, VIOLET, PINK, BG = "#14111F", "#7C3AED", "#F2708F", "#FFF7F2"
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


def head(doc, x, y, w, size, align="left", lines=("Design anything.", "Make it magical.")):
    o = doc.text(x, y, w, lines[0], "Poppins", size, INK, weight=800, align=align, lh=1.05, name="Headline")
    o2 = doc.text(x, y + o["_h"], w, lines[1], "Poppins", size, VIOLET, weight=800, align=align, lh=1.05, name="Headline 2")
    return o["_h"] + o2["_h"]


def bgfill(doc):
    doc.bg(lin(0, 0, doc.W, doc.H, [(0, "#FFF1F4"), (0.55, BG), (1, "#EEF4FF")]))
    doc.circle(doc.W * 0.95, doc.H * 0.04, doc.W * 0.3, rgba(VIOLET, 0.1), name="Glow")
    doc.circle(doc.W * 0.02, doc.H * 0.98, doc.W * 0.25, rgba(PINK, 0.12), name="Glow")


def insta(doc):
    W, H = doc.W, doc.H
    bgfill(doc)
    m = 80
    logo(doc, m, m, 300)
    hh = head(doc, m, 200, W - 2 * m, 104)
    doc.text(m, 200 + hh + 30, W * 0.78, f"{COUNT} free templates — posters, flyers, invitations, posts and menus. No watermark.", "Poppins", 34, rgba(INK, 0.75), lh=1.4, name="Body")
    for i, (sl, x, y, a) in enumerate([(PICS[0], 70, 760, -7), (PICS[2], 330, 720, 3), (PICS[3], 590, 770, -3), (PICS[1], 830, 730, 6)]):
        img(doc, P(sl), x, y, 220, 275, angle=a, border=8)
    pill(doc, W / 2, H - 90, "magicaltouchdesign.com", "Poppins", 28, "#FFFFFF", VIOLET, weight=700, upper=False)


def square_grid(doc):
    W, H = doc.W, doc.H
    doc.bg("#FFFFFF")
    g, m = 14, 40
    cw = (W - 2 * m - 2 * g) / 3
    for i in range(6):
        r, c = divmod(i, 3)
        img(doc, P(PICS[i]), m + c * (cw + g), m + r * (cw * 1.18 + g), cw, cw * 1.18, rx=18)
    y = m + 2 * (cw * 1.18 + g) + 20
    doc.text(m, y, W - 2 * m, f"{COUNT} templates. All free.", "Poppins", 62, INK, weight=800, align="center", name="Headline")
    doc.text(m, y + 82, W - 2 * m, "Edit online · download PDF, PNG or JPG · magicaltouchdesign.com", "Poppins", 26, rgba(INK, 0.65), align="center", name="Body")


def story(doc):
    W, H = doc.W, doc.H
    bgfill(doc)
    m = 90
    logo(doc, m, 120, 340)
    hh = head(doc, m, 260, W - 2 * m, 96)
    doc.text(m, 260 + hh + 34, W - 2 * m, f"{COUNT} free templates for every moment.", "Poppins", 40, rgba(INK, 0.75), lh=1.35, name="Body")
    for (sl, x, y, a) in [(PICS[4], 120, 860, -6), (PICS[5], 570, 820, 5), (PICS[6], 150, 1290, 4), (PICS[7], 590, 1260, -5)]:
        img(doc, P(sl), x, y, 360, 440, angle=a, border=10)
    pill(doc, W / 2, H - 140, "Tap the link to start designing", "Poppins", 32, "#FFFFFF", VIOLET, weight=700, upper=False)


def wide(doc, title="Free Online Design Tool", sub=None):
    W, H = doc.W, doc.H
    bgfill(doc)
    m = 60
    logo(doc, m, 60, 260)
    doc.text(m, 150, 620, title, "Poppins", 58, INK, weight=800, lh=1.08, name="Headline")
    doc.text(m, 300, 560, sub or f"{COUNT} templates · photo studio · print-ready PDF. Free, no watermark.", "Poppins", 26, rgba(INK, 0.72), lh=1.4, name="Body")
    pill(doc, m + 170, 470, "magicaltouchdesign.com", "Poppins", 22, "#FFFFFF", VIOLET, weight=700, upper=False)
    for (sl, x, y, a) in [(PICS[0], 720, 70, -5), (PICS[4], 950, 100, 5), (PICS[2], 760, 330, 4), (PICS[3], 980, 350, -4)]:
        img(doc, P(sl), x, y, 190, 235, angle=a, border=6)


def founder(doc):
    W, H = doc.W, doc.H
    doc.bg("#14111F")
    m = 90
    doc.text(m, 110, W - 2 * m, "“", "Playfair Display", 260, VIOLET, weight=700, lh=0.8, name="Quote mark")
    doc.text(m, 330, W - 2 * m, "We built a design tool where every feature is free — for creators and small businesses everywhere.", "Playfair Display", 52, "#FFFFFF", lh=1.25, name="Quote")
    doc.text(m, 720, W - 2 * m, "TONY ALOYSIUS · FOUNDER, MAGICAL TOUCH DESIGN · TAMIL NADU, INDIA", "Poppins", 20, rgba("#FFFFFF", 0.7), weight=600, spacing=200, name="Author")
    for i, sl in enumerate(PICS[5:9]):
        img(doc, P(sl), m + i * 228, 820, 200, 200, rx=16)


def pin(doc):
    W, H = doc.W, doc.H
    bgfill(doc)
    m = 70
    logo(doc, m, 70, 300)
    doc.text(m, 170, W - 2 * m, f"{COUNT} FREE TEMPLATES", "Poppins", 74, INK, weight=800, lh=1.05, name="Headline")
    doc.text(m, 360, W - 2 * m, "Invitations · posters · resumes · menus · social posts", "Poppins", 30, VIOLET, weight=600, name="Body")
    cw = (W - 2 * m - 20) / 2
    for i, sl in enumerate([PICS[1], PICS[6], PICS[8], PICS[9]]):
        r, c = divmod(i, 2)
        img(doc, P(sl), m + c * (cw + 20), 440 + r * (cw * 1.02 + 20), cw, cw * 1.02, rx=20)
    doc.text(m, H - 90, W - 2 * m, "magicaltouchdesign.com", "Poppins", 30, INK, weight=700, align="center", name="Website")


def spotlight(doc, title, sub, slugs):
    W, H = doc.W, doc.H
    doc.bg("#FFFFFF")
    m = 70
    doc.text(m, 70, W - 2 * m, "TEMPLATE SPOTLIGHT", "Poppins", 24, VIOLET, weight=700, spacing=300, name="Kicker")
    doc.text(m, 115, W - 2 * m, title, "Poppins", 80, INK, weight=800, lh=1.05, name="Headline")
    doc.text(m, 310, W - 2 * m, sub, "Poppins", 30, rgba(INK, 0.7), lh=1.4, name="Body")
    cw = (W - 2 * m - 30) / 2
    for i, sl in enumerate(slugs[:4]):
        r, c = divmod(i, 2)
        img(doc, P(sl), m + c * (cw + 30), 420 + r * (cw * 0.82 + 26), cw, cw * 0.82, rx=22)
    pill(doc, W / 2, H - 70, "Free at magicaltouchdesign.com", "Poppins", 26, "#FFFFFF", INK, weight=700, upper=False)


def yt(doc):
    W, H = doc.W, doc.H
    doc.bg(VIOLET)
    doc.text(60, 120, 620, f"{COUNT}\nFREE\nTEMPLATES", "Poppins", 100, "#FFFFFF", weight=900, lh=0.98, name="Headline")
    pill(doc, 230, 620, "No watermark", "Poppins", 30, VIOLET, "#FFFFFF", weight=800, upper=False)
    for (sl, x, y, a) in [(PICS[0], 720, 60, -6), (PICS[3], 980, 110, 6), (PICS[4], 760, 360, 4), (PICS[1], 1010, 380, -5)]:
        img(doc, P(sl), x, y, 200, 250, angle=a, border=6)


DESIGNS = [
    ("Magical Touch Instagram Launch Post", (1080, 1350), insta),
    ("Magical Touch Template Grid Post", (1080, 1080), square_grid),
    ("Magical Touch Instagram Story", (1080, 1920), story),
    ("Magical Touch Facebook Post", (1200, 630), wide),
    ("Magical Touch LinkedIn Post", (1200, 627), lambda d: wide(d, "Design without a design budget", f"For small businesses: {COUNT} templates, brand kits and print-ready PDF — free.")),
    ("Magical Touch Founder Quote Post", (1080, 1080), founder),
    ("Magical Touch Pinterest Pin", (1000, 1500), pin),
    ("Magical Touch Birthday Spotlight", (1080, 1350), lambda d: spotlight(d, "Birthday templates", "Invitations, wishes and party posts — 570+ designs, all free.", ["balloons-kids-party-invitation", "elegant-gold-birthday-invitation", "circle-photo-frame-birthday", "pastel-birthday-invitation-post"])),
    ("Magical Touch Business Spotlight", (1080, 1350), lambda d: spotlight(d, "Business templates", "Resumes, business cards, letterheads, flyers and slides — all free.", ["navy-sidebar-designer-resume", "corporate-event-poster", "skincare-product-poster", "classic-gold-certificate-of-achievement"])),
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
