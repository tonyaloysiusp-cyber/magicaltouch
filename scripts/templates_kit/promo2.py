"""
Brand promo set (Nov 2026): ~230 Magical Touch Design promo designs for
social media, Google Business posts, YouTube and Pinterest — admin-only
drafts (status draft, tag brand-promo), editable in the editor.

Always in the brand: Poppins, the logo, the logo's spectrum, pastel washes
on white or black with a glow. Every design shows real templates from the
site (their preview pictures), never anyone else's work.

  MT_FONT_DIR=... python3 promo2.py --out FILE
"""

import argparse
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from kit import Doc, lin, rgba  # noqa: E402
import promo  # noqa: E402
from promo import light, dark, brand_logo, headline, body, cta, img, spectrum_rule, INK, LILAC, SPEC_TEXT, BOARD, PUB  # noqa: E402

COUNT = "8,450+"
COL = os.path.join(PUB, "templates/collection")


def pool(pred, n=12, portrait=True):
    out = []
    for f in sorted(glob.glob(os.path.join(PUB, "../data/collections", "mass-2026-11-*.json"))) + [os.path.join(PUB, "../data/collections", "studio-2026-11.json")] + sorted(glob.glob(os.path.join(PUB, "../data/collections", "collection500-*.json"))):
        try:
            data = json.load(open(f))
        except Exception:
            continue
        for t in data:
            if not pred(t):
                continue
            if portrait and t["height"] < t["width"]:
                continue
            if os.path.exists(os.path.join(COL, t["slug"] + "-preview.jpg")) and t["slug"] not in out:
                out.append(t["slug"])
            if len(out) >= n:
                return out
    return out


def by_cat(cat, sub=None, words=None, portrait=True):
    def p(t):
        if cat and t["category"] != cat:
            return False
        if sub and t.get("sub") != sub:
            return False
        if words and not any(w in t["name"].lower() for w in words):
            return False
        return True
    return pool(p, 12, portrait)


P = lambda slug: f"/templates/collection/{slug}-preview.jpg"  # noqa: E731
_AR = {}


def card(doc, slug, x, y, w, h, **kw):
    """A template picture in a cell; a much wider/taller picture keeps its shape (no awkward crop)."""
    from PIL import Image
    if slug not in _AR:
        iw, ih = Image.open(os.path.join(COL, slug + "-preview.jpg")).size
        _AR[slug] = iw / ih
    ar, cell = _AR[slug], w / h
    if ar > cell * 1.3:
        nh = w / ar
        y, h = y + (h - nh) / 2, nh
    elif ar < cell / 1.3:
        nw = h * ar
        x, w = x + (w - nw) / 2, nw
    return img(doc, P(slug), x, y, w, h, **kw)

SPOTS = [  # (name, l1, l2, sub, slugs)
    ("Birthday", "Birthday", "templates.", "Invitations, wishes and party posts — all free.", by_cat("Birthday")),
    ("Wedding", "Wedding", "invitations.", "Invitations, save the dates and reception cards.", by_cat("Wedding")),
    ("Christmas", "Christmas", "templates.", "Cards, party invites, posts and sale posters.", by_cat(None, words=["christmas", "xmas", "santa", "merry"])),
    ("Valentine's Day", "Valentine's", "templates.", "Love notes, cards and date-night invites.", by_cat(None, words=["valentine", "love"])),
    ("Mother's Day", "Mother's Day", "templates.", "Cards and posts to say thank you, Mum.", by_cat(None, words=["mother", "mum", "mom"])),
    ("Father's Day", "Father's Day", "templates.", "Cards and posts for the best dad.", by_cat(None, words=["father", "dad"])),
    ("Diwali", "Diwali", "templates.", "Greetings, cards and festive offers.", by_cat(None, words=["diwali", "deepavali"])),
    ("Eid", "Eid", "templates.", "Eid Mubarak cards, posts and invitations.", by_cat(None, words=["eid", "ramadan"])),
    ("New Year", "New Year", "templates.", "Countdown parties, greetings and planners.", by_cat(None, words=["new year"])),
    ("Resume", "Resume", "templates.", "Clean CVs that get noticed — edit in minutes.", by_cat("Resume")),
    ("Business Card", "Business card", "templates.", "Front and back, print-ready.", by_cat("Business", "Business Card", portrait=False)),
    ("Flyer", "Flyer", "templates.", "Offers, events and services — print or post.", by_cat("Business", "Flyer")),
    ("Menu", "Menu", "templates.", "Cafés, restaurants and bakeries.", by_cat("Menus")),
    ("Poster", "Poster", "templates.", "Events, sales and announcements.", by_cat("Marketing", "Poster")),
    ("Instagram", "Instagram", "posts.", "Posts and stories that stop the scroll.", by_cat("Social Media", "Instagram")),
    ("Magazine", "Magazine", "templates.", "Covers and 8–16 page magazines, print-ready.", by_cat("Marketing", "Magazine")),
    ("Photo Album", "Photo album", "templates.", "Collages and 8–12 page photo books.", by_cat("Photo Collage")),
    ("Certificate", "Certificate", "templates.", "Awards, courses and recognition.", by_cat("Certificates", portrait=False)),
    ("Presentation", "Presentation", "templates.", "Slides for pitches, classes and reports.", by_cat("Business", "Presentation", portrait=False)),
    ("Invitation", "Invitation", "templates.", "Parties, launches and celebrations.", by_cat("Events")),
]
FEATURES = [
    ("Background Remover", "Remove backgrounds", "free.", "One photo or 60 at once — right on your device.", "/remove-background"),
    ("Mockups", "104 free", "mockups.", "Your design on phones, frames, mugs, bags and more.", "/mockups"),
    ("Photo Studio", "Photo editing,", "made easy.", "Retouch, filters and background removal in your browser.", "/photo-studio"),
    ("AI Template Studio", "Describe it.", "We design it.", "Turn an idea or a picture into an editable template.", "/ai-studio"),
    ("Print-ready PDF", "Print-ready", "PDF.", "Bleed, crop marks and CMYK-friendly colours.", "/templates"),
    ("No Watermark", "No watermark.", "Ever.", "Download PNG, JPG or PDF — free.", "/templates"),
    ("Brand Kit", "Your brand,", "every design.", "Save your logo, colours and fonts once.", "/create"),
    ("QR Codes", "QR codes", "with your logo.", "Free, scannable and print-ready.", "/free-qr-code-generator"),
]
MESSAGES = [
    ("Design anything.", "Free. Forever."), ("Design anything.", "Make it magical."), ("Your next post", "starts here."), ("Big ideas,", "zero budget."), ("Templates for", "every moment."),
    ("Made for", "small businesses."), ("From idea", "to print."), ("Celebrate", "beautifully."), ("Create in", "minutes."), ("Look professional,", "pay nothing."),
    ("Every occasion.", "One place."), ("Designed", "for the world."), ("Fresh templates", "every week."), ("Print it.", "Post it. Share it."), ("Creativity", "without limits."), ("Start from", "a template."),
]
QUOTES = [
    "We built a design tool where every feature is free — for creators and small businesses everywhere.",
    "Good design should not depend on your budget. That's why every template here is free.",
    "From Tamil Nadu to the world: beautiful templates for every celebration and every business.",
    "Design is how people feel about your brand. We want everyone to start with something beautiful.",
    "No watermark, no catch — just good design you can use today.",
]
ALL_MIX = [s for _, _, _, _, sl in SPOTS for s in sl[:2]]


def fan(doc, slugs, cx, cy, w, h, spread, tilt=7, border=8):
    n = len(slugs)
    for i, sl in enumerate(slugs):
        k = i - (n - 1) / 2
        card(doc, sl, cx + k * spread - w / 2, cy - h / 2 + abs(k) * h * 0.06, w, h, angle=k * tilt, border=border, rx=12)


def picks(slugs, k, n):
    if not slugs:
        slugs = ALL_MIX
    return [slugs[(k + i) % len(slugs)] for i in range(n)]


# --------------------------------------------------------------- layouts
def L_post(doc, l1, l2, sub, slugs, on_dark, k, web="magicaltouchdesign.com", button="Start free →"):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 80
    brand_logo(doc, m, 90, 380, on_dark=on_dark)
    hh = headline(doc, m, 185, W - 2 * m, 100, l1, l2, on_dark=on_dark)
    body(doc, m, 195 + hh + 26, W - 2 * m, sub, 36, on_dark=on_dark)
    fan(doc, picks(slugs, k, 5), W / 2, H * 0.68, 270, 340, 180, tilt=8)
    cta(doc, 220, H - 115, button, 36, on_dark=on_dark)
    doc.text(W - m - 440, H - 140, 440, web, "Poppins", 30, rgba("#FFFFFF", 0.85) if on_dark else INK, weight=600, align="right", name="Website")


def L_story(doc, l1, l2, sub, slugs, on_dark, k, button="Start designing — it's free"):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 90
    brand_logo(doc, m, 150, 420, on_dark=on_dark)
    hh = headline(doc, m, 290, W - 2 * m, 96, l1, l2, on_dark=on_dark)
    body(doc, m, 290 + hh + 30, W - 2 * m, sub, 40, on_dark=on_dark)
    spectrum_rule(doc, m, 290 + hh + 200, 480, 8)
    fan(doc, picks(slugs, k, 3), W / 2, 1240, 380, 475, 250, tilt=8, border=10)
    cta(doc, W / 2, H - 170, button, 38, on_dark=on_dark)


def L_grid(doc, l1, l2, sub, slugs, on_dark, k):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    g, m = 14, 44
    cw = (W - 2 * m - 2 * g) / 3
    for i, sl in enumerate(picks(slugs, k, 6)):
        r, c = divmod(i, 3)
        card(doc, sl, m + c * (cw + g), m + r * (cw * 1.15 + g), cw, cw * 1.15, rx=16)
    y = m + 2 * (cw * 1.15 + g) + 26
    hh = headline(doc, m, y, W - 2 * m, 58, l1, l2, on_dark=on_dark, align="center")
    doc.text(m, y + hh + 10, W - 2 * m, "magicaltouchdesign.com", "Poppins", 26, rgba("#FFFFFF", 0.8) if on_dark else "#52525B", weight=600, align="center", name="Website")


def L_wide(doc, l1, l2, sub, slugs, on_dark, k):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 60
    s = H / 630
    brand_logo(doc, m, 70 * s, 300 * s, on_dark=on_dark)
    hh = headline(doc, m, 160 * s, W * 0.52, 62 * s, l1, l2, on_dark=on_dark)
    body(doc, m, 160 * s + hh + 22 * s, W * 0.47, sub, 26 * s, on_dark=on_dark)
    spectrum_rule(doc, m, H - 130 * s, W * 0.45, 6)
    doc.text(m, H - 100 * s, W * 0.47, "magicaltouchdesign.com", "Poppins", 26 * s, "#FFFFFF" if on_dark else INK, weight=500, name="Website")
    cw, chh = 200 * s, 250 * s
    for i, (sl, x, y, a) in enumerate(zip(picks(slugs, k, 4), [0.575, 0.775, 0.6, 0.8], [0.06, 0.11, 0.51, 0.54], [-4, 5, 4, -4])):
        card(doc, sl, W * x, H * y, cw, chh, angle=a, border=7, rx=10)


def L_google(doc, l1, l2, sub, slugs, on_dark, k):
    """Google Business Profile post (1200 × 900)."""
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 70
    brand_logo(doc, m, 70, 330, on_dark=on_dark)
    hh = headline(doc, m, 170, W * 0.5, 76, l1, l2, on_dark=on_dark)
    body(doc, m, 170 + hh + 22, W * 0.46, sub, 30, on_dark=on_dark)
    cta(doc, m + 170, H - 110, "Visit magicaltouchdesign.com", 28, on_dark=on_dark)
    fan(doc, picks(slugs, k, 3), W * 0.77, H * 0.5, 260, 330, 120, tilt=7)


def L_pin(doc, l1, l2, sub, slugs, on_dark, k):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 70
    brand_logo(doc, m, 80, 340, on_dark=on_dark)
    hh = headline(doc, m, 175, W - 2 * m, 84, l1, l2, on_dark=on_dark)
    body(doc, m, 175 + hh + 16, W - 2 * m, sub, 30, on_dark=on_dark)
    cw = (W - 2 * m - 20) / 2
    for i, sl in enumerate(picks(slugs, k, 4)):
        r, c = divmod(i, 2)
        card(doc, sl, m + c * (cw + 20), 500 + r * (cw * 1.0 + 20), cw, cw, rx=18, border=6)
    cta(doc, W / 2, H - 90, "magicaltouchdesign.com", 30, on_dark=on_dark)


def L_yt(doc, l1, l2, sub, slugs, on_dark, k):
    W, H = doc.W, doc.H
    dark(doc)
    brand_logo(doc, 60, 60, 300, on_dark=True)
    o = doc.text(60, 150, 640, l1, "Poppins", 104, "#FFFFFF", weight=800, lh=1.0, name="Headline")
    o2 = doc.text(60, 150 + o["_h"] + 6, 640, l2.upper(), "Poppins", 70, LILAC, weight=800, lh=1.0, name="Headline 2")
    o2["fill"] = lin(0, 0, 600, 0, SPEC_TEXT)
    cta(doc, 210, 580, "Free · No watermark →", 30, on_dark=True)
    for (sl, x, y, a) in zip(picks(slugs, k, 4), [720, 980, 760, 1010], [50, 100, 360, 380], [-6, 6, 4, -5]):
        card(doc, sl, x, y, 200, 250, angle=a, border=6, rx=10)


def L_header(doc, l1, l2, sub, slugs, on_dark, k):
    """X / LinkedIn header 1500 × 500 (no logo on the left third: profile photo)."""
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    x0 = W * 0.34
    hh = headline(doc, x0, 70, W * 0.38, 64, l1, l2, on_dark=on_dark)
    ob = body(doc, x0, 70 + hh + 14, W * 0.38, sub, 26, on_dark=on_dark)
    doc.text(x0, min(H - 60, 70 + hh + 14 + ob["_h"] + 20), 520, "magicaltouchdesign.com", "Poppins", 26, "#FFFFFF" if on_dark else INK, weight=600, name="Website")
    for i, sl in enumerate(picks(slugs, k, 3)):
        card(doc, sl, W * 0.775 + i * 110 - 70, 50 + (i % 2) * 40, 170, 215, angle=[-6, 4, -3][i], border=6, rx=10)


def L_quote(doc, text, slugs, on_dark, k):
    W, H = doc.W, doc.H
    (dark if on_dark else light)(doc)
    m = 90
    brand_logo(doc, m, 90, 320, on_dark=on_dark)
    q = doc.text(m, 190, 200, "“", "Poppins", 200, LILAC, weight=700, lh=0.8, name="Quote mark")
    q["fill"] = lin(0, 0, 120, 0, SPEC_TEXT)
    doc.text(m, 360, W - 2 * m, text, "Poppins", 48, "#FFFFFF" if on_dark else INK, weight=600, lh=1.25, name="Quote")
    spectrum_rule(doc, m, 760, 140, 6)
    doc.text(m, 790, W - 2 * m, "Tony Aloysius · Founder, Magical Touch Design", "Poppins", 26, rgba("#FFFFFF", 0.75) if on_dark else "#52525B", weight=500, name="Author")
    for i, sl in enumerate(picks(slugs, k, 4)):
        card(doc, sl, m + i * 228, 870, 200, 150, rx=14)


SIZE = {"post": (1080, 1350), "square": (1080, 1080), "story": (1080, 1920), "fb": (1200, 630), "linkedin": (1200, 627), "google": (1200, 900), "pin": (1000, 1500), "yt": (1280, 720), "header": (1500, 500)}
LAY = {"post": L_post, "square": L_grid, "story": L_story, "fb": L_wide, "linkedin": L_wide, "google": L_google, "pin": L_pin, "yt": L_yt, "header": L_header}
FMT_NAME = {"post": "Instagram Post", "square": "Square Post", "story": "Story", "fb": "Facebook Post", "linkedin": "LinkedIn Post", "google": "Google Business Post", "pin": "Pinterest Pin", "yt": "YouTube Thumbnail", "header": "X Header"}


def designs():
    out = []
    for k, (nm, l1, l2, sub, sl) in enumerate(SPOTS):
        for j, fmt in enumerate(["post", "story", "google", "square", "pin"]):
            out.append((f"{nm} Templates {FMT_NAME[fmt]}", fmt, (l1, l2, sub, sl, (k + j) % 2 == 1, k * 3 + j), f"{nm.lower()} templates promo"))
    for k, (nm, l1, l2, sub, url) in enumerate(FEATURES):
        for j, fmt in enumerate(["post", "story", "google", "fb", "linkedin"]):
            out.append((f"{nm} {FMT_NAME[fmt]}", fmt, (l1, l2, sub, ALL_MIX, (k + j) % 2 == 0, k * 5 + j), f"{nm.lower()} promo"))
    for k, (l1, l2) in enumerate(MESSAGES):
        sub = [f"{COUNT} free templates — posters, invitations, posts, menus and more.", f"{COUNT} templates · edit online · download free", "Invitations, flyers, resumes and social posts — no watermark."][k % 3]
        for j, fmt in enumerate(["post", "square", "fb", "yt", "header", "google"]):
            if (k + j) % 6 == 5 and fmt != "google":
                continue
            out.append((f"Brand Message {k + 1} {FMT_NAME[fmt]}", fmt, (l1, l2, sub, ALL_MIX, (k + j) % 2 == 0, k * 7 + j), "magical touch design promo"))
    for k, q in enumerate(QUOTES):
        for j, on_dark in enumerate([True, False]):
            out.append((f"Founder Quote {k + 1} {'Dark' if on_dark else 'Light'}", "quote", (q, ALL_MIX, on_dark, k * 2 + j), "founder quote, magical touch design"))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    out = []
    seen = set()
    for i, (name, fmt, args, kw) in enumerate(designs(), 1):
        W, H = SIZE["square" if fmt == "quote" else fmt]
        ab = json.loads(json.dumps(BOARD))
        ab.update(width=W, height=H, name="Page 1", left=0, top=0)
        ab["__artboardId"] = f"artboard_promo2_{i:03d}"
        ab.pop("__print", None)
        d = Doc(W, H, ab, seed=i)
        if fmt == "quote":
            L_quote(d, *args)
        else:
            LAY[fmt](d, *args)
        for o in d.objs:
            o.pop("_h", None)
            o.pop("__lines", None)
        full = f"Magical Touch {name}"
        slug = "mtd-promo2-" + re.sub(r"[^a-z0-9]+", "-", name.lower().replace("'", "")).strip("-")
        if slug in seen:
            continue
        seen.add(slug)
        orient = "square" if W == H else ("portrait" if H > W else "landscape")
        out.append({"name": full, "category": "Brand Promo", "sub": None, "slug": slug, "width": W, "height": H, "pages": 1, "color1": "#FFFFFF", "color2": "#8E7FD0", "sort": 100 + i,
                    "premium": False, "featured": False, "keywords": kw, "tags": ["brand-promo", f"promo-{fmt}"], "status": "draft", "orientation": orient,
                    "description": "Magical Touch Design brand promo — admin only, edit in the editor.", "canvasJson": d.json()})
    json.dump(out, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(out))


if __name__ == "__main__":
    main()
