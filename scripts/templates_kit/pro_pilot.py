"""Pro pilot (November 2026): hand-composed template sets on one house style.

Ten brands, each a matching set across digital and print sizes. Every piece is
composed individually (no formula variations) on a shared system:
  * margins = 7.5% of the short side; everything aligns to that frame
  * one display face + one text face per brand, a strict size scale
  * 3-4 colour palettes per brand, photos treated consistently
All brands, names and contact details are fictional placeholders.

  MT_FONT_DIR=... python3 pro_pilot.py --out FILE
"""

from __future__ import annotations

import argparse
import json
import math
import re

from kit import Doc, lin, rad, rgba, mix, shadow, FS_MULT, text_width
from common import pill

PRINT_BLEED = 36  # 3 mm at 300 dpi

FMT = {
    "a4": (2480, 3508, "A4 Flyer"), "post": (1080, 1080, "Instagram Post"), "story": (1080, 1920, "Instagram Story"),
    "portrait": (1080, 1350, "Portrait Post"), "linkedin": (1200, 627, "LinkedIn Post"), "card": (1050, 600, "Business Card"),
    "letter": (2480, 3508, "Letterhead"), "invoice": (2480, 3508, "Invoice"), "inv57": (1500, 2100, "Invitation 5x7"),
    "rsvp": (1500, 1050, "RSVP Card"), "stage": (4000, 2000, "Stage Backdrop"), "led": (1920, 1080, "LED Screen"),
    "badge": (1240, 1748, "Name Badge"), "rollup": (1700, 4000, "Roll-up Banner"), "menu": (2480, 3508, "A4 Menu"),
}
PRINT = {"a4", "card", "letter", "invoice", "inv57", "rsvp", "stage", "badge", "rollup", "menu"}

CAT = {  # key -> (category text, category_id)
    "flyer": ("Business", "417e7368-40e5-4117-ae1b-8c35466efbef"), "poster": ("Marketing", "8774b67a-5ff6-463f-affa-2cb6e4106602"),
    "instagram": ("Social Media", "38442849-cdd2-4bd7-b2ba-b70cc9ba0847"), "social": ("Social Media", "65e88898-24a0-4e66-852c-07e0c3842f70"),
    "bcard": ("Business", "bd449e8c-bdd2-451d-a752-8902ed78069b"), "letterhead": ("Business", "25594259-9447-49b6-8a3c-9cc8c505e5e0"),
    "business": ("Business", "2a6a1b35-4295-4d90-a075-85007c68e964"), "menu": ("Menus", "7bc7ad94-8233-4a06-a9b4-319e445ea973"),
    "winv": ("Wedding", "46de7551-5e15-4b22-bda3-222a181b1bc6"), "std": ("Wedding", "30254ec4-c05b-4e0d-b166-ced0d8a6a164"),
    "wedding": ("Wedding", "b0d2aa6a-4411-4ba0-a47c-a61e9c309e16"), "birthday": ("Birthday", "db0fff91-be7d-4f68-8071-a2eb65357490"),
    "conference": ("Events", "7cacdf4f-40bb-4552-a7bd-a9b3deb2bea4"), "events": ("Events", "749176a0-c538-4d9d-b70d-e40fe96bcdb2"),
    "banner": ("Marketing", "f5eaf327-62dc-4191-9f05-065cd9918efb"),
}


# ------------------------------------------------------------------ system
class S:
    """Per-document scale helpers."""

    def __init__(self, d):
        self.d = d
        self.u = min(d.W, d.H) / 1000
        if d.W == 2480:      # A4 pages read at arm's length: smaller type
            self.u *= 0.88 if getattr(d, "kind", "") in ("letter", "invoice") else 0.65
        elif d.W == 1050:    # business cards: type must stay legible at 3.5 in
            self.u *= 1.9
        self.m = min(d.W, d.H) * 0.075


def T(d, x, y, w, text, fam, size, col, **k):
    return d.text(x, y, w, text, fam, size, col, **k)


def eyebrow(d, x, y, w, text, col, size, fam="Inter", weight=600, align="left", sp=320):
    return d.text(x, y, w, text, fam, size, col, weight=weight, align=align, spacing=sp, upper=True)


def logo(d, x, y, name, col, size, fam="Montserrat", mark="circle", acc=None, align="left", weight=700, sp=260, tag=None):
    """Editable placeholder logo: simple mark + wordmark."""
    acc = acc or col
    s = size * 1.5
    tw = text_width(name.upper(), fam, size, weight, spacing=sp)
    total = s + size * 0.7 + tw
    if align == "center":
        x = x - total / 2
    if mark == "circle":
        d.circle(x + s / 2, y + s / 2, s / 2, "", stroke=acc, sw=max(1.5, s * 0.08), name="Logo mark")
        d.circle(x + s / 2, y + s / 2, s * 0.16, acc, name="Logo mark")
    elif mark == "square":
        d.rect(x, y, s, s, acc, name="Logo mark")
        d.rect(x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.4, col if col != acc else "#FFFFFF", name="Logo mark")
    elif mark == "arch":
        d.path([["M", x, y + s], ["L", x, y + s * 0.5], ["A", s / 2, s / 2, 0, 0, 1, x + s, y + s * 0.5], ["L", x + s, y + s], ["Z"]], acc, name="Logo mark")
    elif mark == "tri":
        d.polygon([(x + s / 2, y), (x + s, y + s), (x, y + s)], acc, name="Logo mark")
    elif mark == "leaf":
        d.leaf(x + s / 2, y + s / 2, s, s * 0.5, -45, acc)
    t = d.text(x + s + size * 0.7, y + s / 2 - size * FS_MULT / 2, tw + size, name, fam, size, col, weight=weight, spacing=sp, upper=True, name="Logo")
    if tag:
        d.text(x + s + size * 0.7, y + s / 2 + size * 0.55, tw + size * 4, tag, "Inter", size * 0.42, col, spacing=300, upper=True, opacity=0.7)
    return total


def button(d, cx, cy, text, fg, bg, size, fam="Inter", weight=600, stroke=None):
    return pill(d, cx, cy, text, fam, size, fg, bg, pad_x=size * 1.6, pad_y=size * 0.85, weight=weight, spacing=180, stroke=stroke)


def rule(d, x, y, w, col, sw, opacity=1):
    d.rect(x, y, w, sw, col, opacity=opacity, name="Rule")


def qr(d, x, y, s, col, bg="#FFFFFF"):
    d.rect(x, y, s, s, bg, name="QR area")
    n = 21
    c = s / (n + 2)
    import random
    r = random.Random(int(x + y))
    for i in range(n):
        for j in range(n):
            finder = (i < 7 and j < 7) or (i < 7 and j >= n - 7) or (i >= n - 7 and j < 7)
            if finder:
                continue
            if r.random() < 0.45:
                d.rect(x + c * (j + 1), y + c * (i + 1), c, c, col, name="QR")
    for fi, fj in ((0, 0), (0, n - 7), (n - 7, 0)):
        X, Y = x + c * (fj + 1), y + c * (fi + 1)
        d.rect(X, Y, 7 * c, 7 * c, col)
        d.rect(X + c, Y + c, 5 * c, 5 * c, bg)
        d.rect(X + 2 * c, Y + 2 * c, 3 * c, 3 * c, col)


def contact_cols(d, x, y, w, items, lab_col, val_col, size, fam="Inter", gap=None, dividers=None):
    n = len(items)
    gap = gap if gap is not None else size * 2
    cw = (w - gap * (n - 1)) / n
    hmax = 0
    for i, (lab, val) in enumerate(items):
        X = x + i * (cw + gap)
        eyebrow(d, X, y, cw, lab, lab_col, size * 0.72, fam=fam, sp=260)
        t = d.text(X, y + size * 1.5, cw, val, fam, size, val_col, weight=500, lh=1.35)
        hmax = max(hmax, size * 1.5 + t["_h"])
        if dividers and i:
            d.rect(X - gap / 2, y, 1.5 * size / 20, size * 3.2, dividers, opacity=0.5)
    return hmax


# ------------------------------------------------------------------ 1 Café grand opening
CAFE = dict(bg="#F4EDE4", ink="#2B1D14", acc="#C8643B", mut="#8A7462", disp="DM Serif Display", body="Inter", brand="Ember & Oak")


def cafe(d, f):
    B, s = CAFE, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    d.bg(B["bg"])
    ph = {"a4": 0.56, "post": 0.52, "story": 0.5}[f]
    d.photo(880, -d.bleed, -d.bleed, W + 2 * d.bleed, H * ph + d.bleed, focus=(0.5, 0.6))
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.16, lin(0, 0, 0, H * 0.16, [(0, "rgba(20,12,6,0.55)"), (1, "rgba(20,12,6,0)")]), name="Shade")
    logo(d, m, m * 0.8, B["brand"], "#FFFFFF", 30 * u, fam="Montserrat", mark="arch", acc="#FFFFFF", tag="Coffee · Bakery")
    # badge on the photo edge
    br = 118 * u if f != "story" else 150 * u
    bx, by = W - m - br, H * ph
    d.circle(bx, by, br, B["acc"], name="Badge")
    d.circle(bx, by, br * 0.86, "", stroke="#FFFFFF", sw=1.5 * u, dash=[3 * u, 5 * u])
    T(d, bx - br, by - br * 0.52, br * 2, "20%", B["disp"], br * 0.62, "#FFFFFF", align="center")
    T(d, bx - br, by + br * 0.12, br * 2, "OFF ALL WEEK", "Inter", br * 0.15, "#FFFFFF", weight=700, align="center", spacing=200)
    y = H * ph + (70 if f == "a4" else 60) * u
    eyebrow(d, m, y, W * 0.6, "Now open · Downtown", B["acc"], 22 * u)
    y += 60 * u
    hs = d.fit("Grand Opening", W - 2 * m, B["disp"], {"a4": 250, "post": 140, "story": 140}[f] * u)
    t = T(d, m - hs * 0.03, y, W - 2 * m, "Grand Opening", B["disp"], hs, B["ink"], lh=0.95)
    y += t["_h"] + 34 * u
    if f != "post":
        t = T(d, m, y, W * (0.62 if f == "a4" else 0.84), "Specialty coffee roasted in-house, fresh pastries every morning and a quiet corner for your best ideas. Come say hello.",
              B["body"], 27 * u, B["mut"], lh=1.5)
        y += t["_h"] + 40 * u
    if f == "story":
        button(d, W / 2, H - m - 210 * u, "Visit us this week", "#FFFFFF", B["ink"], 26 * u)
    # footer info
    fy = H - m - (110 if f != "post" else 90) * u
    rule(d, m, fy - 30 * u, W - 2 * m, B["ink"], 2 * u, 0.25)
    items = [("When", "Sat 14 Nov · 8 AM"), ("Where", "Boulevard Plaza, G12"), ("Online", "emberandoak.coffee")]
    if f == "post":
        items = items[:2] + [("Online", "@emberandoak")]
    contact_cols(d, m, fy, W - 2 * m, items, B["acc"], B["ink"], 24 * u, dividers=B["ink"])


# ------------------------------------------------------------------ 2 Consulting services
CONS = dict(dark="#0E2233", light="#F4F6F8", acc="#F2B544", mut="#5E6E7E", disp="Montserrat", body="Inter", brand="Northline")


def consulting(d, f):
    B, s = CONS, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    d.bg(B["light"])
    if f == "a4":
        cw = W * 0.44
        d.rect(-d.bleed, -d.bleed, cw + d.bleed, H + 2 * d.bleed, B["dark"], name="Panel")
        d.photo(1400, cw, -d.bleed, W - cw + d.bleed, H * 0.52 + d.bleed, focus=(0.55, 0.4))
        logo(d, m, m, B["brand"], "#FFFFFF", 30 * u, mark="tri", acc=B["acc"], tag="Consulting")
        y = H * 0.24
        eyebrow(d, m, y, cw - 2 * m, "Business advisory", B["acc"], 22 * u)
        t = T(d, m, y + 64 * u, cw - 1.6 * m, "Strategy that moves your business forward", B["disp"], 92 * u, "#FFFFFF", weight=700, lh=1.08)
        y += 64 * u + t["_h"] + 46 * u
        rule(d, m, y, 90 * u, B["acc"], 6 * u)
        T(d, m, y + 50 * u, cw - 2 * m, "We help growing companies plan, fund and scale — with clear numbers and practical roadmaps.", B["body"], 27 * u, "#C9D3DC", lh=1.55)
        # stats
        sy = H * 0.72
        for i, (n, l) in enumerate((("12+", "years of advisory"), ("340", "companies supported"), ("AED 2B", "capital raised"))):
            yy = sy + i * 190 * u
            T(d, m, yy, cw - 2 * m, n, B["disp"], 64 * u, B["acc"], weight=700)
            T(d, m, yy + 82 * u, cw - 2 * m, l, B["body"], 22 * u, "#C9D3DC", spacing=100, upper=True)
        # services
        x0 = cw + m
        y = H * 0.52 + 90 * u
        eyebrow(d, x0, y, W - x0 - m, "What we do", B["mut"], 22 * u)
        y += 70 * u
        for i, (ti, de) in enumerate((("Growth strategy", "Market entry, pricing and expansion plans built on real data."),
                                      ("Financial planning", "Budgets, forecasts and investor-ready financial models."),
                                      ("Operations", "Leaner processes, clearer roles and the right systems."))):
            T(d, x0, y, 90 * u, f"0{i + 1}", B["disp"], 44 * u, B["acc"], weight=700)
            T(d, x0 + 110 * u, y + 4 * u, W - x0 - m - 110 * u, ti, B["disp"], 36 * u, B["dark"], weight=700)
            t = T(d, x0 + 110 * u, y + 58 * u, W - x0 - m - 110 * u, de, B["body"], 24 * u, B["mut"], lh=1.5)
            y += 58 * u + t["_h"] + 60 * u
        d.rect(cw, H - 230 * u, W - cw + d.bleed, 230 * u + d.bleed, B["acc"], name="Contact band")
        contact_cols(d, x0, H - 175 * u, W - x0 - m, [("Call", "+971 4 000 0000"), ("Visit", "northline.ae")], B["dark"], B["dark"], 26 * u)
    else:
        # post / linkedin: photo right, text left on navy
        d.bg(B["dark"])
        pw = W * (0.42 if f == "post" else 0.4)
        d.photo(1400, W - pw, -d.bleed, pw + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.35))
        d.rect(W - pw - 8 * u, 0, 8 * u, H, B["acc"], name="Accent bar")
        k = 1.0 if f == "post" else 1.35
        u = u * k
        logo(d, m, m * 0.9, B["brand"], "#FFFFFF", 22 * u, mark="tri", acc=B["acc"])
        tw = W - pw - 2 * m
        hs = 66 * u if f == "post" else 52 * u
        y = H * (0.3 if f == "post" else 0.27)
        eyebrow(d, m, y, tw, "Free consultation", B["acc"], 18 * u)
        t = T(d, m, y + 50 * u, tw, "Ready to grow with a clear plan?", B["disp"], hs, "#FFFFFF", weight=700, lh=1.1)
        y += 50 * u + t["_h"] + 30 * u
        t = T(d, m, y, tw * 0.95, "Book a 30-minute strategy call with our senior advisors.", B["body"], 22 * u, "#C9D3DC", lh=1.5)
        y += t["_h"] + 50 * u
        button(d, m + 150 * u, min(y + 20 * u, H - m - 30 * u), "Book a call", B["dark"], B["acc"], 19 * u)
        if f == "post":
            T(d, m, H - m - 22 * u, tw, "northline.ae", B["body"], 20 * u, "#C9D3DC", spacing=120)


# ------------------------------------------------------------------ 3 Fashion campaign
FASH = dict(ink="#0E0E0E", ivory="#F3EFE9", acc="#C1121F", disp="Playfair Display", body="Montserrat", brand="Maison Vera")


def fashion(d, f):
    B, s = FASH, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    if f == "post":
        d.bg(B["acc"])
        d.photo(1928, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.35))
        d.rect(-d.bleed, H * 0.55, W + 2 * d.bleed, H * 0.45 + d.bleed, lin(0, 0, 0, H * 0.45, [(0, "rgba(10,0,0,0)"), (1, "rgba(10,0,0,0.75)")]), name="Shade")
        T(d, 0, m * 0.8, W, B["brand"], B["body"], 24 * u, "#FFFFFF", weight=600, align="center", spacing=600, upper=True)
        T(d, m, H - m - 300 * u, W - 2 * m, "The Autumn", B["disp"], 110 * u, "#FFFFFF", italic=True)
        T(d, m, H - m - 185 * u, W - 2 * m, "EDIT", B["disp"], 150 * u, "#FFFFFF", weight=700, spacing=200)
        T(d, W - m - 300 * u, H - m - 34 * u, 300 * u, "Shop the collection →", B["body"], 20 * u, "#FFFFFF", weight=600, align="right", spacing=100)
        T(d, m, H - m - 34 * u, 400 * u, "New season · 2026", B["body"], 20 * u, "#FFFFFF", spacing=100)
    elif f == "story":
        d.bg(B["ink"])
        d.photo(1331, -d.bleed, H * 0.1, W + 2 * d.bleed, H * 0.52, focus=(0.5, 0.3))
        T(d, 0, m, W, B["brand"], B["body"], 28 * u, B["ivory"], weight=600, align="center", spacing=600, upper=True)
        rule(d, W / 2 - 40 * u, m + 70 * u, 80 * u, B["acc"], 4 * u)
        T(d, m, H * 0.63, W - 2 * m, "-30%", B["disp"], 240 * u, B["acc"], weight=700, align="center")
        T(d, m, H * 0.63 + 280 * u, W - 2 * m, "Mid-season sale", B["disp"], 74 * u, B["ivory"], italic=True, align="center")
        T(d, m, H * 0.63 + 390 * u, W - 2 * m, "Selected styles · online and in store", B["body"], 24 * u, "#B9B4AD", align="center", spacing=80)
        button(d, W / 2, H - m - 80 * u, "Shop now", B["ink"], B["ivory"], 24 * u, fam=B["body"])
    elif f == "portrait":
        d.bg(B["ivory"])
        pw = W * 0.62
        d.photo(1735, -d.bleed, -d.bleed, pw + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.4))
        x = pw + 50 * u
        tw = W - x - m * 0.7
        T(d, x, m, tw, B["brand"], B["body"], 18 * u, B["ink"], weight=700, spacing=400, upper=True)
        T(d, x, H * 0.3, tw, "Noir", B["disp"], 96 * u, B["ink"], italic=True)
        T(d, x, H * 0.3 + 120 * u, tw, "Collection", B["disp"], 44 * u, B["ink"])
        rule(d, x, H * 0.3 + 200 * u, 60 * u, B["acc"], 4 * u)
        T(d, x, H * 0.3 + 240 * u, tw, "Timeless black, cut for the modern woman.", B["body"], 22 * u, "#555049", lh=1.6)
        T(d, x, H - m - 80 * u, tw, "Available\n20 November", B["body"], 20 * u, B["ink"], weight=600, spacing=150, upper=True, lh=1.5)
    else:  # a4 poster
        d.bg(B["acc"])
        d.photo(1928, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.3))
        d.frame_border(m * 0.6, "#FFFFFF", 3 * u)
        T(d, 0, m * 1.2, W, B["brand"], B["body"], 34 * u, "#FFFFFF", weight=600, align="center", spacing=700, upper=True)
        d.rect(-d.bleed, H * 0.62, W + 2 * d.bleed, H * 0.38 + d.bleed, lin(0, 0, 0, H * 0.38, [(0, "rgba(40,0,4,0)"), (1, "rgba(40,0,4,0.82)")]), name="Shade")
        T(d, m * 1.3, H * 0.7, W, "The Autumn", B["disp"], 170 * u, "#FFFFFF", italic=True)
        T(d, m * 1.3, H * 0.7 + 190 * u, W, "EDIT", B["disp"], 260 * u, "#FFFFFF", weight=700, spacing=300)
        T(d, m * 1.3, H - m * 1.5 - 60 * u, W * 0.5, "Opening night\nFriday 20 November · 7 PM", B["body"], 30 * u, "#FFFFFF", weight=500, lh=1.5)
        T(d, W * 0.5, H - m * 1.5 - 60 * u, W * 0.5 - m * 1.3, "City Walk, Building 7\nmaisonvera.com", B["body"], 30 * u, "#FFFFFF", weight=500, lh=1.5, align="right")


# ------------------------------------------------------------------ 4 Restaurant promo
REST = dict(green="#1F3A2E", cream="#F6F0E3", acc="#D9A441", mut="#6B7A6F", disp="Playfair Display", body="Lato", brand="Saffron Table")


def restaurant(d, f):
    B, s = REST, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    if f == "menu":
        d.bg(B["cream"])
        d.photo(1178, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.17 + d.bleed, focus=(0.5, 0.5))
        d.rect(-d.bleed, H * 0.17, W + 2 * d.bleed, 10 * u, B["acc"])
        logo(d, W / 2, H * 0.17 + 70 * u, B["brand"], B["green"], 30 * u, mark="leaf", acc=B["acc"], align="center")
        T(d, 0, H * 0.17 + 150 * u, W, "Weekend Brunch", B["disp"], 120 * u, B["green"], italic=True, align="center")
        T(d, 0, H * 0.17 + 300 * u, W, "Saturday & Sunday · 9 AM – 3 PM", B["body"], 26 * u, B["mut"], align="center", spacing=150, upper=True)
        secs = [("To start", [("Burrata & heirloom tomato", "Basil oil, sourdough", "42"), ("Mezze board", "Hummus, muhammara, warm pita", "48"), ("Açaí bowl", "Granola, berries, honey", "38")]),
                ("Mains", [("Shakshuka", "Two eggs, spiced tomato, feta", "55"), ("Truffle eggs benedict", "Brioche, hollandaise", "62"), ("Za'atar flatbread", "Labneh, olives, herbs", "49"), ("Buttermilk pancakes", "Maple, berries, cream", "45")]),
                ("To drink", [("Saffron latte", "House blend, oat or whole", "24"), ("Fresh juices", "Orange, watermelon, green", "22")])]
        y = H * 0.17 + 420 * u
        cx0, cw = m * 1.5, W - 3 * m
        for title, items in secs:
            T(d, cx0, y, cw, title, B["disp"], 52 * u, B["green"], italic=True)
            rule(d, cx0, y + 82 * u, cw, B["acc"], 2 * u)
            y += 120 * u
            for n, desc, p in items:
                T(d, cx0, y, cw * 0.8, n, B["body"], 32 * u, B["green"], weight=700)
                T(d, cx0 + cw * 0.8, y, cw * 0.2, p, B["disp"], 34 * u, B["acc"], weight=700, align="right")
                T(d, cx0, y + 46 * u, cw * 0.8, desc, B["body"], 24 * u, B["mut"], italic=True)
                y += 98 * u
            y += 20 * u
        d.rect(-d.bleed, H - 150 * u, W + 2 * d.bleed, 150 * u + d.bleed, B["green"])
        T(d, 0, H - 98 * u, W, "Prices in AED · Reservations +971 4 000 0000 · saffrontable.ae", B["body"], 24 * u, B["cream"], align="center", spacing=80)
        return
    d.bg(B["green"])
    if f == "post":
        d.photo(1178, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.6, focus=(0.5, 0.5))
        y = H * 0.6
        d.rect(-d.bleed, y, W + 2 * d.bleed, H * 0.4 + d.bleed, B["green"])
        cx, cy, r = W - m - 100 * u, y, 100 * u
    else:
        d.photo(1178, -d.bleed, H * 0.08, W + 2 * d.bleed, H * 0.5, focus=(0.5, 0.5))
        y = H * 0.58
        cx, cy, r = W - m - 130 * u, y, 130 * u
        logo(d, W / 2, m * 0.6, B["brand"], B["cream"], 26 * u, mark="leaf", acc=B["acc"], align="center")
    d.circle(cx, cy, r, B["acc"], name="Price badge")
    T(d, cx - r, cy - r * 0.55, 2 * r, "AED", B["body"], r * 0.2, B["green"], weight=700, align="center", spacing=200)
    T(d, cx - r, cy - r * 0.32, 2 * r, "89", B["disp"], r * 0.72, B["green"], weight=700, align="center")
    T(d, cx - r, cy + r * 0.42, 2 * r, "per person", B["body"], r * 0.15, B["green"], align="center")
    y += (60 if f == "post" else 110) * u
    eyebrow(d, m, y, W * 0.6, "Sat & Sun · 9 AM – 3 PM", B["acc"], 20 * u, fam=B["body"])
    T(d, m, y + 50 * u, W - 2 * m, "Weekend Brunch", B["disp"], (96 if f == "post" else 112) * u, B["cream"], italic=True)
    if f == "story":
        T(d, m, y + 210 * u, W * 0.8, "Unlimited coffee, fresh juices and our full brunch menu with friends and family.", B["body"], 28 * u, "#C9D4CC", lh=1.5)
        button(d, W / 2, H - m - 120 * u, "Reserve a table", B["green"], B["acc"], 26 * u, fam=B["body"])
        T(d, 0, H - m - 40 * u, W, "saffrontable.ae", B["body"], 22 * u, "#C9D4CC", align="center", spacing=150)
    else:
        T(d, m, H - m - 30 * u, W - 2 * m, "Reserve · saffrontable.ae", B["body"], 22 * u, "#C9D4CC", spacing=100)


# ------------------------------------------------------------------ 5 Architecture identity
ARCH = dict(char="#1E1E1E", white="#F7F5F1", acc="#B87333", mut="#7A7570", disp="Montserrat", body="Inter", brand="Atlas & Co.")


def arch_id(d, f):
    B, s = ARCH, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    if f == "card_front":
        d.bg(B["char"])
        for i in range(9):
            d.line(W * 0.62 + i * 40 * u, -10, W * 0.62 + i * 40 * u + H * 0.6, H + 10, B["acc"], 1.2 * u, opacity=0.25)
        logo(d, W / 2, H / 2 - 40 * u, B["brand"], B["white"], 40 * u, mark="square", acc=B["acc"], align="center")
        T(d, 0, H / 2 + 50 * u, W, "Architecture · Interiors", B["body"], 20 * u, "#B5AEA6", align="center", spacing=400, upper=True)
    elif f == "card_back":
        d.bg(B["white"])
        d.rect(-d.bleed, -d.bleed, 20 * u + d.bleed, H + 2 * d.bleed, B["acc"])
        x = m + 30 * u
        T(d, x, m, W, "Layla Haddad", B["disp"], 54 * u, B["char"], weight=700)
        T(d, x, m + 76 * u, W, "Principal Architect", B["body"], 24 * u, B["acc"], weight=600, spacing=200, upper=True)
        rule(d, x, H * 0.5, 60 * u, B["char"], 3 * u)
        lines = ["+971 50 000 0000", "layla@atlasco.ae", "atlasco.ae", "Studio 4, Alserkal Avenue, Dubai"]
        for i, l in enumerate(lines):
            T(d, x, H * 0.5 + 34 * u + i * 40 * u, W * 0.6, l, B["body"], 24 * u, B["char"])
        logo(d, W - m - 50 * u, H - m - 60 * u, "", B["char"], 34 * u, mark="square", acc=B["char"])
    elif f == "letter":
        d.bg("#FFFFFF")
        logo(d, m, m, B["brand"], B["char"], 40 * u, mark="square", acc=B["acc"], tag="Architecture · Interiors")
        T(d, W - m - 700 * u, m, 700 * u, "Studio 4, Alserkal Avenue\nAl Quoz, Dubai, UAE\n+971 4 000 0000 · atlasco.ae", B["body"], 22 * u, B["mut"], align="right", lh=1.6)
        rule(d, m, m + 170 * u, W - 2 * m, B["acc"], 3 * u)
        y = m + 260 * u
        T(d, m, y, W, "9 November 2026", B["body"], 26 * u, B["char"])
        T(d, m, y + 110 * u, W, "Mr. Daniel Brooks\nBrooks Holdings\nBusiness Bay, Dubai", B["body"], 26 * u, B["char"], lh=1.6)
        T(d, m, y + 330 * u, W, "Re: Concept design for the Marina residence", B["body"], 28 * u, B["char"], weight=700)
        body = ("Dear Mr. Brooks,\n\nThank you for meeting with our team last week. Following our conversation, we are pleased to share the attached concept "
                "proposal for the Marina residence, including the site analysis, initial massing studies and an outline of the design timeline.\n\n"
                "We have focused on natural light, cross-ventilation and a calm material palette that ages beautifully in the local climate. "
                "We would welcome the chance to walk you through the proposal in person.\n\nKind regards,")
        t = T(d, m, y + 420 * u, W - 2 * m, body, B["body"], 26 * u, "#333333", lh=1.6)
        T(d, m, y + 420 * u + t["_h"] + 70 * u, W, "Layla Haddad\nPrincipal Architect", B["body"], 26 * u, B["char"], weight=600, lh=1.6)
        d.rect(-d.bleed, H - 40 * u, W + 2 * d.bleed, 40 * u + d.bleed, B["char"])
        d.rect(-d.bleed, H - 40 * u, W * 0.3, 40 * u + d.bleed, B["acc"])
    else:  # invoice
        d.bg("#FFFFFF")
        logo(d, m, m, B["brand"], B["char"], 40 * u, mark="square", acc=B["acc"])
        T(d, W - m - 900 * u, m - 10 * u, 900 * u, "INVOICE", B["disp"], 70 * u, B["char"], weight=700, align="right", spacing=150)
        T(d, W - m - 900 * u, m + 110 * u, 900 * u, "No. AC-2026-118 · 9 November 2026", B["body"], 24 * u, B["mut"], align="right")
        y = m + 280 * u
        for i, (lab, txt) in enumerate((("Billed to", "Brooks Holdings\nBusiness Bay, Dubai\naccounts@brooks.ae"), ("From", "Atlas & Co. Architects\nAlserkal Avenue, Dubai\nTRN 100 000 000 000 003"))):
            x = m + i * (W - 2 * m) / 2
            eyebrow(d, x, y, 800 * u, lab, B["acc"], 22 * u)
            T(d, x, y + 50 * u, 900 * u, txt, B["body"], 26 * u, B["char"], lh=1.6)
        y += 330 * u
        d.rect(m, y, W - 2 * m, 80 * u, B["char"])
        cols = [(0, "Description", "left"), (0.58, "Qty", "right"), (0.74, "Rate", "right"), (1, "Amount", "right")]
        def row(yy, vals, col, wgt=400):
            for (fx, _, al), v in zip(cols, vals):
                if al == "left":
                    T(d, m + 30 * u, yy, 1000 * u, v, B["body"], 24 * u, col, weight=wgt)
                else:
                    T(d, m + (W - 2 * m) * fx - 330 * u - (30 * u if fx == 1 else 0), yy, 330 * u, v, B["body"], 24 * u, col, weight=wgt, align="right")
        row(y + 26 * u, [c[1] for c in cols], "#FFFFFF", 600)
        y += 80 * u
        items = [("Site analysis & survey", "1", "8,500", "8,500"), ("Concept design package", "1", "24,000", "24,000"), ("3D visualisation (per view)", "4", "1,750", "7,000"), ("Client workshops", "2", "2,000", "4,000")]
        for i, it in enumerate(items):
            if i % 2:
                d.rect(m, y, W - 2 * m, 90 * u, "#F4F1EC")
            row(y + 30 * u, it, B["char"])
            y += 90 * u
        y += 40 * u
        for lab, val, big in (("Subtotal", "AED 43,500", False), ("VAT 5%", "AED 2,175", False), ("Total due", "AED 45,675", True)):
            T(d, W - m - 900 * u, y, 500 * u, lab, B["body"], (30 if big else 24) * u, B["char"], weight=700 if big else 400, align="right")
            T(d, W - m - 380 * u, y, 380 * u - 30 * u, val, B["body"], (30 if big else 24) * u, B["acc"] if big else B["char"], weight=700 if big else 400, align="right")
            y += 60 * u
        py = max(y + 80 * u, H - m - 300 * u)
        eyebrow(d, m, py, 900 * u, "Payment details", B["acc"], 22 * u)
        T(d, m, py + 55 * u, 1100 * u, "Bank: Emirates Bank · IBAN AE00 0000 0000 0000 0000 000\nPayment due within 14 days. Thank you for your business.", B["body"], 24 * u, B["mut"], lh=1.6)
        d.rect(-d.bleed, H - 40 * u, W + 2 * d.bleed, 40 * u + d.bleed, B["char"])
        d.rect(-d.bleed, H - 40 * u, W * 0.3, 40 * u + d.bleed, B["acc"])


# ------------------------------------------------------------------ 6 Creative studio identity
BLOOM = dict(blush="#F6E1DA", plum="#3D1F3A", coral="#E86A58", sage="#A8BBA2", disp="DM Serif Display", body="DM Sans", brand="Bloom Studio")


def bloom_shapes(d, x, y, s, B):
    d.circle(x, y, s, B["coral"], name="Shape")
    d.circle(x + s * 1.1, y + s * 0.6, s * 0.7, B["sage"], name="Shape")
    d.path([["M", x - s * 0.9, y + s * 1.6], ["A", s * 0.9, s * 0.9, 0, 0, 1, x + s * 0.9, y + s * 1.6], ["Z"]], B["plum"], name="Shape")


def bloom_id(d, f):
    B, s = BLOOM, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    if f == "card_front":
        d.bg(B["plum"])
        bloom_shapes(d, W * 0.78, H * 0.28, 120 * u, dict(B, plum=B["blush"]))
        T(d, m, H - m - 140 * u, W, "Bloom", B["disp"], 110 * u, B["blush"])
        T(d, m, H - m - 20 * u, W, "BRANDING · ILLUSTRATION · WEB", B["body"], 18 * u, B["sage"], weight=700, spacing=300)
    elif f == "card_back":
        d.bg(B["blush"])
        T(d, m, m, W, "Noor Al-Mansouri", B["disp"], 56 * u, B["plum"])
        T(d, m, m + 80 * u, W, "Creative Director", B["body"], 24 * u, B["coral"], weight=700, spacing=150, upper=True)
        for i, l in enumerate(["hello@bloomstudio.ae", "+971 55 000 0000", "@bloom.studio"]):
            T(d, m, H - m - 140 * u + i * 44 * u, W * 0.6, l, B["body"], 26 * u, B["plum"])
        bloom_shapes(d, W - m - 120 * u, H - m - 140 * u, 54 * u, B)
    elif f == "letter":
        d.bg("#FFFFFF")
        bloom_shapes(d, W - m - 150 * u, m + 30 * u, 70 * u, B)
        T(d, m, m, W, "Bloom Studio", B["disp"], 80 * u, B["plum"])
        T(d, m, m + 110 * u, W, "Branding · Illustration · Web", B["body"], 22 * u, B["coral"], weight=700, spacing=250, upper=True)
        y = m + 360 * u
        T(d, m, y, W, "9 November 2026", B["body"], 26 * u, B["plum"])
        T(d, m, y + 110 * u, W, "Hello Sara,", B["disp"], 44 * u, B["plum"])
        body = ("It was lovely to hear about your new bakery! As promised, here is a summary of our branding proposal: a warm, hand-crafted identity with a "
                "custom logotype, a seasonal colour palette and packaging that feels as good as your bread tastes.\n\nThe full proposal, timeline and "
                "investment are attached. We can start as soon as next week.\n\nWith warmth,")
        t = T(d, m, y + 200 * u, W - 2 * m, body, B["body"], 27 * u, "#4A3A48", lh=1.7)
        T(d, m, y + 200 * u + t["_h"] + 100 * u, W, "Noor Al-Mansouri\nCreative Director", B["body"], 26 * u, B["plum"], weight=700, lh=1.6)
        d.rect(-d.bleed, H - 200 * u, W + 2 * d.bleed, 200 * u + d.bleed, B["blush"])
        contact_cols(d, m, H - 150 * u, W - 2 * m, [("Email", "hello@bloomstudio.ae"), ("Phone", "+971 55 000 0000"), ("Studio", "d3, Dubai Design District")], B["coral"], B["plum"], 24 * u)
    else:  # invoice
        d.bg("#FFFFFF")
        d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, 440 * u + d.bleed, B["plum"])
        bloom_shapes(d, W - m - 170 * u, m + 60 * u, 80 * u, dict(B, plum=B["blush"]))
        T(d, m, m, W, "Invoice", B["disp"], 120 * u, B["blush"])
        T(d, m, m + 160 * u, W, "No. 0427 · Issued 9 Nov 2026 · Due 23 Nov 2026", B["body"], 24 * u, B["sage"])
        y = 520 * u
        eyebrow(d, m, y, 800 * u, "Billed to", B["coral"], 22 * u, fam=B["body"])
        T(d, m, y + 50 * u, 1000 * u, "Crumb & Co. Bakery\nSara Lindqvist\nJumeirah 1, Dubai", B["body"], 26 * u, B["plum"], lh=1.6)
        y += 290 * u
        items = [("Brand strategy workshop", "AED 4,500"), ("Logo & visual identity", "AED 12,000"), ("Packaging design (3 items)", "AED 7,500"), ("Brand guidelines", "AED 3,000")]
        rule(d, m, y, W - 2 * m, B["plum"], 3 * u)
        y += 40 * u
        for n, p in items:
            T(d, m, y, 1400 * u, n, B["body"], 28 * u, B["plum"])
            T(d, W - m - 500 * u, y, 500 * u, p, B["body"], 28 * u, B["plum"], weight=700, align="right")
            y += 52 * u
            rule(d, m, y, W - 2 * m, B["plum"], 1.5 * u, 0.25)
            y += 28 * u
        d.rect(W - m - 900 * u, y + 30 * u, 900 * u, 200 * u, B["blush"], rx=24 * u)
        T(d, W - m - 860 * u, y + 70 * u, 500 * u, "Total (incl. VAT)", B["body"], 26 * u, B["plum"])
        T(d, W - m - 860 * u, y + 115 * u, 820 * u, "AED 28,350", B["disp"], 70 * u, B["coral"])
        T(d, m, y + 300 * u, W - 2 * m, "Thank you for blooming with us! Bank transfer to IBAN AE00 0000 0000 0000 0000 000 · hello@bloomstudio.ae", B["body"], 24 * u, B["mut"] if "mut" in B else "#7A6A78", lh=1.6)


# ------------------------------------------------------------------ 7 Wedding suite
WED = dict(ivory="#FBF8F2", sage="#8A9A82", gold="#B8975A", ink="#3B3B3B", disp="Parisienne", serif="Cormorant Garamond", body="Montserrat")


def sprig(d, x, y, s, angle, col, n=6):
    a = math.radians(angle)
    ex, ey = x + math.cos(a) * s, y + math.sin(a) * s
    d.line(x, y, ex, ey, col, max(1, s * 0.012), name="Stem")
    for i in range(1, n + 1):
        t = i / (n + 1)
        px, py = x + (ex - x) * t, y + (ey - y) * t
        for sgn in (-1, 1):
            la = angle + sgn * 42
            L = s * 0.2 * (1 - t * 0.4)
            d.leaf(px + math.cos(math.radians(la)) * L * 0.5, py + math.sin(math.radians(la)) * L * 0.5, L, L * 0.42, la, col)


def wedding(d, f):
    B, s = WED, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    d.bg(B["ivory"])
    if f in ("inv57", "rsvp"):
        d.frame_border(m * 0.55, B["gold"], 2 * u, double=12 * u)
    if f == "inv57":
        sprig(d, W / 2, H * 0.17, 230 * u, -150, B["sage"])
        sprig(d, W / 2, H * 0.17, 230 * u, -30, B["sage"])
        d.circle(W / 2, H * 0.17, 8 * u, B["gold"])
        y = H * 0.24
        T(d, 0, y, W, "TOGETHER WITH THEIR FAMILIES", B["body"], 20 * u, B["ink"], weight=500, align="center", spacing=350)
        T(d, 0, y + 80 * u, W, "Aisha", B["disp"], 150 * u, B["ink"], align="center")
        T(d, 0, y + 270 * u, W, "&", B["serif"], 70 * u, B["gold"], italic=True, align="center")
        T(d, 0, y + 340 * u, W, "Omar", B["disp"], 150 * u, B["ink"], align="center")
        T(d, m * 1.5, y + 560 * u, W - 3 * m, "request the pleasure of your company at the celebration of their marriage", B["serif"], 34 * u, B["ink"], italic=True, align="center", lh=1.4)
        y2 = y + 720 * u
        rule(d, W / 2 - 240 * u, y2, 480 * u, B["gold"], 1.5 * u)
        T(d, 0, y2 + 34 * u, W / 2 - 40 * u, "SATURDAY", B["body"], 22 * u, B["ink"], weight=600, align="right", spacing=300)
        T(d, W / 2 - 40 * u, y2 + 10 * u, 80 * u, "12", B["serif"], 64 * u, B["gold"], weight=600, align="center")
        T(d, W / 2 + 40 * u, y2 + 34 * u, W / 2 - 40 * u, "DECEMBER", B["body"], 22 * u, B["ink"], weight=600, spacing=300)
        rule(d, W / 2 - 240 * u, y2 + 110 * u, 480 * u, B["gold"], 1.5 * u)
        T(d, 0, y2 + 150 * u, W, "at six o'clock in the evening", B["serif"], 30 * u, B["ink"], italic=True, align="center")
        T(d, 0, y2 + 220 * u, W, "THE GARDEN PAVILION · DUBAI", B["body"], 22 * u, B["ink"], weight=600, align="center", spacing=300)
        T(d, 0, H - m * 1.4 - 30 * u, W, "Dinner and dancing to follow", B["serif"], 28 * u, B["sage"], italic=True, align="center")
    elif f == "portrait_std":
        d.photo(1078, m * 0.6, m * 0.6, W - 1.2 * m, H * 0.62, focus=(0.5, 0.4))
        y = m * 0.6 + H * 0.62 + 60 * u
        T(d, 0, y, W, "SAVE THE DATE", B["body"], 26 * u, B["ink"], weight=600, align="center", spacing=500)
        T(d, 0, y + 60 * u, W, "Aisha & Omar", B["disp"], 120 * u, B["ink"], align="center")
        T(d, 0, y + 240 * u, W, "12 . 12 . 2026", B["serif"], 52 * u, B["gold"], weight=600, align="center", spacing=200)
        T(d, 0, y + 330 * u, W, "Dubai · formal invitation to follow", B["serif"], 30 * u, B["sage"], italic=True, align="center")
    elif f == "rsvp":
        T(d, 0, m * 1.4, W, "Kindly Reply", B["disp"], 110 * u, B["ink"], align="center")
        T(d, 0, m * 1.4 + 150 * u, W, "BY THE FIRST OF DECEMBER", B["body"], 20 * u, B["ink"], weight=600, align="center", spacing=350)
        y = m * 1.4 + 250 * u
        T(d, m * 1.6, y, 200 * u, "M", B["serif"], 40 * u, B["ink"], italic=True)
        d.line(m * 1.6 + 50 * u, y + 46 * u, W - m * 1.6, y + 46 * u, B["gold"], 1.5 * u)
        for i, l in enumerate(("Joyfully accepts", "Regretfully declines")):
            yy = y + 110 * u + i * 70 * u
            d.circle(m * 1.6 + 16 * u, yy + 20 * u, 14 * u, "", stroke=B["gold"], sw=1.5 * u)
            T(d, m * 1.6 + 50 * u, yy, W, l, B["serif"], 34 * u, B["ink"], italic=True)
        T(d, m * 1.6, y + 280 * u, W, "Number of guests  ______", B["serif"], 32 * u, B["ink"], italic=True)
        sprig(d, W - m * 1.6 - 40 * u, H - m * 1.3, 150 * u, -120, B["sage"], 5)
    else:  # story announcement
        d.photo(794, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.6, focus=(0.5, 0.5))
        d.path([["M", -d.bleed, H * 0.56], ["Q", W / 2, H * 0.64, W + d.bleed, H * 0.56], ["L", W + d.bleed, H + d.bleed], ["L", -d.bleed, H + d.bleed], ["Z"]], B["ivory"])
        y = H * 0.64
        T(d, 0, y, W, "WE'RE GETTING MARRIED", B["body"], 26 * u, B["ink"], weight=600, align="center", spacing=450)
        T(d, 0, y + 70 * u, W, "Aisha & Omar", B["disp"], 130 * u, B["ink"], align="center")
        T(d, 0, y + 260 * u, W, "12 December 2026 · Dubai", B["serif"], 44 * u, B["gold"], weight=600, align="center")
        sprig(d, W / 2, H - m - 40 * u, 160 * u, -160, B["sage"], 5)
        sprig(d, W / 2, H - m - 40 * u, 160 * u, -20, B["sage"], 5)


# ------------------------------------------------------------------ 8 Birthday
BDAY = dict(navy="#14213D", gold="#E5B769", pink="#F4A6C1", disp="Abril Fatface", serif="Playfair Display", body="Montserrat")


def confetti(d, B, n, box, u, seed=3):
    import random
    r = random.Random(seed)
    x0, y0, x1, y1 = box
    for _ in range(n):
        c = r.choice([B["gold"], B["pink"], "#FFFFFF"])
        x, y = r.uniform(x0, x1), r.uniform(y0, y1)
        k = r.random()
        if k < 0.4:
            d.circle(x, y, r.uniform(4, 9) * u, c, opacity=0.9, name="Confetti")
        elif k < 0.8:
            d.rect(x, y, r.uniform(8, 16) * u, r.uniform(20, 34) * u, c, origin_center=True, angle=r.uniform(0, 180), name="Confetti")
        else:
            d.sparkle(x, y, r.uniform(10, 18) * u, c)


def birthday(d, f):
    B, s = BDAY, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    d.bg(rad(W / 2, H * 0.4, max(W, H) * 0.8, [(0, "#22335E"), (1, B["navy"])]))
    confetti(d, B, 70 if f != "post" else 50, (0, 0, W, H * 0.42), u)
    if f == "inv57":
        d.frame_border(m * 0.55, B["gold"], 2 * u)
    big = {"inv57": 560, "post": 330, "story": 600}[f] * u
    cy = H * (0.38 if f != "post" else 0.42)
    t = T(d, 0, cy - big * FS_MULT / 2, W, "30", B["disp"], big, B["gold"], align="center", shadow_=shadow("rgba(0,0,0,0.3)", 30 * u, 0, 10 * u))
    from common import text_metal, GOLD
    text_metal(None, t, GOLD)
    T(d, 0, cy - big * 0.6 - (130 if f == "post" else 90) * u, W, "Zara is turning", B["serif"], 60 * u, "#FFFFFF", italic=True, align="center")
    y = cy + big * 0.55
    T(d, 0, y, W, "LET'S CELEBRATE", B["body"], 26 * u, B["pink"], weight=700, align="center", spacing=500)
    if f == "post":
        T(d, 0, y + 60 * u, W, "Saturday 21 November · 8 PM · Skyview Lounge", B["body"], 24 * u, "#FFFFFF", align="center")
        return
    rule(d, W / 2 - 60 * u, y + 70 * u, 120 * u, B["gold"], 3 * u)
    T(d, m, y + 110 * u, W - 2 * m, "Saturday, 21 November\n8 PM until late", B["serif"], 48 * u, "#FFFFFF", align="center", lh=1.3)
    T(d, m, y + 270 * u, W - 2 * m, "Skyview Lounge · Level 52 · Dubai Marina", B["body"], 26 * u, "#C9CFE0", align="center")
    button(d, W / 2, H - m - (120 if f == "story" else 90) * u, "RSVP to Leena · 050 000 0000", B["navy"], B["gold"], 22 * u)


# ------------------------------------------------------------------ 9 Conference
CONF = dict(bg="#0A0F2C", vio="#6C5CE7", cyan="#00D2D3", white="#FFFFFF", mut="#9AA3C7", disp="Space Grotesk", body="Inter")


def conf_bg(d, B, u):
    W, H = d.W, d.H
    d.bg(B["bg"])
    R = max(W, H) * 0.55
    d.circle(W * 0.88, H * 0.1, R, rad(R, R, R, [(0, rgba(B["vio"], 0.55)), (1, rgba(B["vio"], 0))]), name="Glow")
    R2 = max(W, H) * 0.4
    d.circle(W * 0.05, H * 0.95, R2, rad(R2, R2, R2, [(0, rgba(B["cyan"], 0.35)), (1, rgba(B["cyan"], 0))]), name="Glow")
    step = min(W, H) / 12
    for i in range(int(W / step) + 1):
        d.line(i * step, 0, i * step, H, "#FFFFFF", 1 * u, opacity=0.05, name="Grid")
    for j in range(int(H / step) + 1):
        d.line(0, j * step, W, j * step, "#FFFFFF", 1 * u, opacity=0.05, name="Grid")


def conf_mark(d, x, y, s, B):
    d.circle(x, y, s, "", stroke=B["cyan"], sw=s * 0.12, name="Event mark")
    d.circle(x + s * 0.55, y, s, "", stroke=B["vio"], sw=s * 0.12, name="Event mark")


def conference(d, f):
    B, s = CONF, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    conf_bg(d, B, u)
    title = "Future Forward\nSummit 2026"
    if f in ("stage", "led"):
        conf_mark(d, m + 40 * u, m + 40 * u, 40 * u, B)
        T(d, m + 140 * u, m + 18 * u, W, "FFS · DUBAI", B["body"], 26 * u, B["mut"], weight=600, spacing=400)
        if f == "stage":
            tt = T(d, m, H * 0.22, W * 0.62, title, B["disp"], 150 * u, B["white"], weight=700, lh=1.0)
            T(d, m, H * 0.22 + tt["_h"] + 40 * u, W * 0.5, "AI · Sustainability · The future of work", B["body"], 44 * u, B["cyan"], weight=500)
            rule(d, m, H - m - 120 * u, W - 2 * m, "#FFFFFF", 2 * u, 0.2)
            T(d, m, H - m - 80 * u, W, "18–19 November 2026  ·  Dubai World Trade Centre", B["body"], 36 * u, B["white"], weight=500, spacing=60)
            T(d, W - m - 900 * u, H - m - 80 * u, 900 * u, "#FFS2026", B["disp"], 40 * u, B["vio"], weight=700, align="right")
            # big ring motif on the right
            for k in range(5):
                d.circle(W * 0.82, H * 0.48, (300 + k * 90) * u, "", stroke=B["cyan"] if k % 2 else B["vio"], sw=3 * u, opacity=0.6 - k * 0.1, name="Ring")
            T(d, W * 0.82 - 300 * u, H * 0.48 - 90 * u, 600 * u, "WELCOME", B["disp"], 64 * u, B["white"], weight=700, align="center", spacing=300)
        else:  # LED speaker slide
            d.circle(W * 0.72, H * 0.52, 300 * u, "", stroke=B["cyan"], sw=6 * u)
            d.photo(1289, W * 0.72 - 280 * u, H * 0.52 - 280 * u, 560 * u, 560 * u, frame="circle", focus=(0.5, 0.35))
            eyebrow(d, m, H * 0.32, W * 0.5, "Keynote · 10:30 AM", B["cyan"], 26 * u)
            T(d, m, H * 0.32 + 60 * u, W * 0.5, "Daniel Reyes", B["disp"], 110 * u, B["white"], weight=700)
            T(d, m, H * 0.32 + 200 * u, W * 0.48, "Chief Technology Officer, Helix Labs", B["body"], 36 * u, B["mut"])
            T(d, m, H * 0.32 + 290 * u, W * 0.48, "Designing products for an AI-first world", B["disp"], 48 * u, B["white"], weight=500, lh=1.2)
            T(d, m, H - m - 30 * u, W, "Main stage · Future Forward Summit 2026", B["body"], 26 * u, B["mut"])
    elif f == "post":
        d.photo(1289, W * 0.48, H * 0.12, W * 0.42, W * 0.42, frame="circle", focus=(0.5, 0.35))
        d.circle(W * 0.69, H * 0.12 + W * 0.21, W * 0.235, "", stroke=B["cyan"], sw=5 * u)
        eyebrow(d, m, m, W, "Speaker announcement", B["cyan"], 20 * u)
        T(d, m, H * 0.64, W - 2 * m, "Daniel Reyes", B["disp"], 84 * u, B["white"], weight=700)
        T(d, m, H * 0.64 + 110 * u, W - 2 * m, "CTO, Helix Labs", B["body"], 30 * u, B["mut"])
        rule(d, m, H - m - 70 * u, W - 2 * m, "#FFFFFF", 2 * u, 0.2)
        T(d, m, H - m - 40 * u, W, "Future Forward Summit · 18–19 Nov · Dubai", B["body"], 22 * u, B["white"], weight=500)
    elif f == "badge":
        d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.3 + d.bleed, lin(0, 0, W, H * 0.3, [(0, B["vio"]), (1, B["cyan"])]), name="Header")
        d.circle(W / 2, 70 * u, 26 * u, B["bg"], name="Lanyard hole")
        T(d, 0, H * 0.12, W, "Future Forward Summit 2026", B["disp"], 44 * u, B["white"], weight=700, align="center")
        T(d, 0, H * 0.4, W, "Sarah", B["disp"], 150 * u, B["white"], weight=700, align="center")
        T(d, 0, H * 0.4 + 170 * u, W, "Thompson", B["disp"], 70 * u, B["white"], weight=500, align="center")
        T(d, 0, H * 0.4 + 280 * u, W, "Head of Product · Nimbus Cloud", B["body"], 34 * u, B["mut"], align="center")
        qr(d, W / 2 - 130 * u, H - m - 420 * u, 260 * u, B["bg"])
        d.rect(-d.bleed, H - m - 120 * u, W + 2 * d.bleed, 120 * u + m + d.bleed, B["cyan"], name="Pass type")
        T(d, 0, H - m - 85 * u, W, "SPEAKER", B["disp"], 52 * u, B["bg"], weight=700, align="center", spacing=500)
    else:  # rollup
        conf_mark(d, W / 2 - 60 * u, m + 60 * u, 60 * u, B)
        T(d, m, H * 0.12, W - 2 * m, "Future\nForward\nSummit", B["disp"], 230 * u, B["white"], weight=700, lh=0.98)
        T(d, m, H * 0.12 + 720 * u, W - 2 * m, "2026", B["disp"], 230 * u, B["cyan"], weight=700)
        for k in range(4):
            d.circle(W * 0.7, H * 0.55, (260 + k * 90) * u, "", stroke=B["vio"] if k % 2 else B["cyan"], sw=4 * u, opacity=0.7 - k * 0.12)
        y = H * 0.68
        for i, l in enumerate(("40+ speakers", "3 stages", "2,000 innovators")):
            T(d, m, y + i * 120 * u, W - 2 * m, l, B["disp"], 66 * u, B["white"], weight=500)
            rule(d, m, y + i * 120 * u + 96 * u, W - 2 * m, "#FFFFFF", 2 * u, 0.15)
        T(d, m, H - m - 160 * u, W - 2 * m, "18–19 November\nDubai World Trade Centre", B["body"], 44 * u, B["mut"], weight=500, lh=1.4)
        qr(d, W - m - 200 * u, H - m - 200 * u, 200 * u, B["bg"])


# ------------------------------------------------------------------ 10 Product launch
LAUNCH = dict(red="#5A0B12", black="#0B0708", gold="#D8B26E", rose="#E8B4B0", disp="Cormorant Garamond", body="Montserrat", brand="Velvet Rouge")


def launch(d, f):
    B, s = LAUNCH, S(d)
    W, H, u, m = d.W, d.H, s.u, s.m
    d.bg(rad(W / 2, H / 2, max(W, H) * 0.8, [(0, "#7A1520"), (1, B["black"])]))
    if f == "stage":
        # step-and-repeat wall with a centre title panel
        cols, rows = 6, 4
        for i in range(cols):
            for j in range(rows):
                x = W * (i + 0.5) / cols
                y = H * (j + 0.5) / rows
                if abs(x - W / 2) < W * 0.22 and abs(y - H / 2) < H * 0.3:
                    continue
                T(d, x - 300 * u, y - 20 * u, 600 * u, B["brand"].upper(), B["body"], 22 * u, B["gold"], weight=600, align="center", spacing=300, opacity=0.55)
        d.rect(W * 0.28, H * 0.2, W * 0.44, H * 0.6, rgba(B["black"], 0.6), stroke=B["gold"], sw=3 * u, name="Title panel")
        T(d, W * 0.28, H * 0.28, W * 0.44, "Introducing", B["disp"], 80 * u, B["rose"], italic=True, align="center")
        vs = d.fit("VELVET ROUGE", W * 0.38, B["body"], 110 * u, 300, spacing=300)
        T(d, W * 0.28, H * 0.4, W * 0.44, "VELVET ROUGE", B["body"], vs, "#FFFFFF", weight=300, align="center", spacing=300)
        T(d, W * 0.28, H * 0.54, W * 0.44, "The Matte Collection", B["disp"], 70 * u, B["gold"], italic=True, align="center")
        T(d, W * 0.28, H * 0.68, W * 0.44, "LAUNCH EVENT · 26.11.2026", B["body"], 30 * u, "#FFFFFF", weight=500, align="center", spacing=400)
        return
    if f == "led":
        d.photo(1011, W * 0.48, -d.bleed, W * 0.52 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
        d.rect(W * 0.48, -d.bleed, W * 0.2, H + 2 * d.bleed, lin(0, 0, W * 0.2, 0, [(0, rgba(B["black"], 1)), (1, rgba(B["black"], 0))]), name="Fade")
        T(d, m, m, W, B["brand"].upper(), B["body"], 26 * u, B["gold"], weight=600, spacing=600)
        T(d, m, H * 0.3, W * 0.5, "The Matte", B["disp"], 130 * u, "#FFFFFF", italic=True)
        T(d, m, H * 0.3 + 150 * u, W * 0.5, "COLLECTION", B["body"], 72 * u, "#FFFFFF", weight=300, spacing=400)
        rule(d, m, H * 0.3 + 270 * u, 100 * u, B["gold"], 4 * u)
        T(d, m, H * 0.3 + 310 * u, W * 0.42, "Twelve new shades. Weightless, long-lasting colour.", B["body"], 30 * u, B["rose"], lh=1.5)
        T(d, m, H - m - 30 * u, W, "Launching 26 November 2026", B["body"], 26 * u, B["gold"], weight=600, spacing=200)
        return
    if f == "post":
        d.photo(1011, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.62, focus=(0.5, 0.45))
        y = H * 0.62
        d.rect(-d.bleed, y, W + 2 * d.bleed, H * 0.38 + d.bleed, B["black"])
        T(d, m, y + 50 * u, W, "You're invited", B["disp"], 70 * u, B["rose"], italic=True)
        T(d, m, y + 145 * u, W - 2 * m, "VELVET ROUGE LAUNCH", B["body"], 40 * u, "#FFFFFF", weight=300, spacing=350)
        T(d, m, H - m - 30 * u, W - 2 * m, "26 Nov · 7 PM · The Opus, Business Bay", B["body"], 22 * u, B["gold"], weight=600, spacing=100)
    else:  # story
        d.photo(1011, -d.bleed, H * 0.18, W + 2 * d.bleed, H * 0.5, focus=(0.5, 0.45))
        T(d, 0, m, W, B["brand"].upper(), B["body"], 28 * u, B["gold"], weight=600, align="center", spacing=600)
        T(d, 0, H * 0.72, W, "You're invited", B["disp"], 96 * u, B["rose"], italic=True, align="center")
        T(d, m, H * 0.72 + 130 * u, W - 2 * m, "to the launch of The Matte Collection", B["body"], 28 * u, "#FFFFFF", align="center")
        T(d, 0, H * 0.72 + 220 * u, W, "26 NOVEMBER · 7 PM", B["body"], 30 * u, B["gold"], weight=600, align="center", spacing=300)
        button(d, W / 2, H - m - 80 * u, "RSVP · Limited guest list", B["black"], B["gold"], 22 * u)


# ------------------------------------------------------------------ catalogue
SETS = [
    # (fn, piece, fmt, name, cat, keywords)
    (cafe, "a4", "a4", "Ember & Oak Café Grand Opening Flyer", "flyer", "grand opening flyer, cafe opening, coffee shop poster"),
    (cafe, "post", "post", "Ember & Oak Café Grand Opening Post", "instagram", "grand opening post, cafe instagram, coffee shop"),
    (cafe, "story", "story", "Ember & Oak Café Grand Opening Story", "instagram", "grand opening story, cafe story, coffee shop"),
    (consulting, "a4", "a4", "Northline Consulting Services Flyer", "flyer", "business services flyer, consulting brochure, corporate flyer"),
    (consulting, "post", "post", "Northline Consulting Free Consultation Post", "instagram", "business consulting post, corporate social media"),
    (consulting, "linkedin", "linkedin", "Northline Consulting LinkedIn Post", "social", "linkedin post, corporate, consulting"),
    (fashion, "post", "post", "Maison Vera Autumn Edit Fashion Post", "instagram", "fashion post, clothing brand, new collection"),
    (fashion, "story", "story", "Maison Vera Fashion Sale Story", "instagram", "fashion sale story, discount, clothing"),
    (fashion, "portrait", "portrait", "Maison Vera Noir Collection Portrait Post", "instagram", "fashion lookbook, collection launch, boutique"),
    (fashion, "a4", "a4", "Maison Vera Autumn Edit Fashion Poster", "poster", "fashion poster, store opening, collection"),
    (restaurant, "post", "post", "Saffron Table Weekend Brunch Post", "instagram", "restaurant post, brunch offer, food promotion"),
    (restaurant, "story", "story", "Saffron Table Weekend Brunch Story", "instagram", "restaurant story, brunch, food"),
    (restaurant, "menu", "menu", "Saffron Table Brunch Menu", "menu", "restaurant menu, brunch menu, cafe menu a4"),
    (arch_id, "card_front", "card", "Atlas & Co. Architects Business Card Front", "bcard", "business card, architect, minimal"),
    (arch_id, "card_back", "card", "Atlas & Co. Architects Business Card Back", "bcard", "business card back, contact details"),
    (arch_id, "letter", "letter", "Atlas & Co. Architects Letterhead", "letterhead", "letterhead, company letter, stationery"),
    (arch_id, "invoice", "invoice", "Atlas & Co. Architects Invoice", "business", "invoice template, tax invoice, vat, business"),
    (bloom_id, "card_front", "card", "Bloom Studio Creative Business Card Front", "bcard", "creative business card, designer, studio"),
    (bloom_id, "card_back", "card", "Bloom Studio Creative Business Card Back", "bcard", "business card back, creative studio"),
    (bloom_id, "letter", "letter", "Bloom Studio Letterhead", "letterhead", "creative letterhead, studio stationery"),
    (bloom_id, "invoice", "invoice", "Bloom Studio Invoice", "business", "creative invoice, freelancer invoice"),
    (wedding, "inv57", "inv57", "Sage Garden Wedding Invitation", "winv", "wedding invitation, botanical, elegant"),
    (wedding, "portrait_std", "inv57", "Sage Garden Save the Date", "std", "save the date, wedding photo card"),
    (wedding, "rsvp", "rsvp", "Sage Garden Wedding RSVP Card", "wedding", "wedding rsvp card, reply card"),
    (wedding, "story", "story", "Sage Garden Wedding Announcement Story", "wedding", "wedding announcement story, engagement"),
    (birthday, "inv57", "inv57", "Midnight Gold 30th Birthday Invitation", "birthday", "30th birthday invitation, milestone party"),
    (birthday, "post", "post", "Midnight Gold 30th Birthday Post", "birthday", "birthday party post, celebration"),
    (birthday, "story", "story", "Midnight Gold 30th Birthday Story", "birthday", "birthday story, party invite"),
    (conference, "stage", "stage", "Future Forward Summit Stage Backdrop", "conference", "stage backdrop, conference, event branding"),
    (conference, "led", "led", "Future Forward Summit LED Speaker Slide", "conference", "led screen, speaker slide, event screen"),
    (conference, "post", "post", "Future Forward Summit Speaker Announcement", "conference", "speaker announcement post, conference social"),
    (conference, "badge", "badge", "Future Forward Summit Name Badge", "conference", "name badge, event pass, lanyard"),
    (conference, "rollup", "rollup", "Future Forward Summit Roll-up Banner", "banner", "roll up banner, pull up banner, event standee"),
    (launch, "stage", "stage", "Velvet Rouge Launch Step-and-Repeat Backdrop", "events", "step and repeat, launch backdrop, media wall"),
    (launch, "led", "led", "Velvet Rouge Launch LED Screen", "events", "product launch screen, led display"),
    (launch, "post", "post", "Velvet Rouge Launch Invitation Post", "events", "product launch invitation, beauty brand"),
    (launch, "story", "story", "Velvet Rouge Launch Invitation Story", "events", "launch event story, invite"),
]


def artboard(W, H, i, printable):
    ab = {"type": "rect", "version": "5.1.0", "left": 0, "top": 0, "width": W, "height": H, "fill": "#ffffff", "name": "Page 1", "__isArtboard": True,
          "__artboardId": f"artboard_pro_{i:04d}", "selectable": False, "evented": False, "strokeWidth": 0, "hasControls": False}
    if printable:
        b = PRINT_BLEED
        ab["__print"] = {"bleed": {"top": b, "right": b, "bottom": b, "left": b}, "bleedLinked": True, "slug": {"top": 0, "right": 0, "bottom": 0, "left": 0}, "slugLinked": True,
                         "safeArea": {"top": b, "right": b, "bottom": b, "left": b}, "safeAreaLinked": True, "dpi": 300, "marks": {"crop": False, "registration": False, "colorBar": False}}
    return ab


def build():
    out = []
    for i, (fn, piece, fmt, name, cat, kw) in enumerate(SETS, 1):
        W, H, fname = FMT[fmt]
        pr = fmt in PRINT
        d = Doc(W, H, artboard(W, H, i, pr), seed=9100 + i)
        if pr:
            d.bleed = PRINT_BLEED
        d.kind = fmt
        fn(d, piece)
        for ob in d.objs:
            ob.pop("_h", None)
            ob.pop("__lines", None)
        slug = "pro-" + re.sub(r"[^a-z0-9]+", "-", name.lower().replace("&", "and").replace("'", "")).strip("-")
        c, cid = CAT[cat]
        brand = name.split(" ")[0]
        out.append({"name": name, "category": c, "category_id": cid, "slug": slug, "width": W, "height": H, "color1": "#111111", "color2": "#FFFFFF",
                    "sort": -5000 + i, "featured": True, "keywords": kw + ", professional template, matching set",
                    "tags": ["pro-pilot-2026-11", "pro-set", "set-" + fn.__name__], "status": "published",
                    "description": f"Professional {fname.lower()} from a matching brand set — edit the words, colours and photos online.", "canvasJson": d.json()})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    rows = build()
    json.dump(rows, open(a.out, "w"), ensure_ascii=False, separators=(",", ":"))
    print("built", len(rows))


if __name__ == "__main__":
    main()
