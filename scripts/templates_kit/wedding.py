"""Collection 500 — Wedding and engagement (wedding-001 … wedding-050)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT, parse_d, transform_path
from common import GOLD, SILVER, ROSE_GOLD, metal, text_metal, vgrad, overlay, pill, divider

CATEGORY = "Wedding and engagement"
SITE_CATEGORY = "Wedding"
TAG = "wedding"

# (subcategory, title, w, h, headline, message, signature, pinterest query, keywords)
SPEC = [
    ("Invitation", "Blush Peony Watercolour Wedding Invitation", 480, 673, "Layla & Omar", "request the pleasure of your company · Saturday 17 April 2027 · four o’clock · The Rose Garden, Al Barari", "Reception to follow", "blush peony watercolor wedding invitation", "wedding invitation, peony, blush, floral"),
    ("Invitation", "Classic Ivory Calligraphy Invitation", 559, 794, "Sara & Adam", "together with their families invite you to celebrate their marriage · Friday 7 May 2027 · 6 PM · One&Only Royal Mirage", "Kindly reply by 1 April", "ivory calligraphy classic wedding invitation", "classic wedding invitation, calligraphy, ivory"),
    ("Invitation", "Emerald and Gold Arch Invitation", 559, 794, "Noor & Faisal", "invite you to their wedding celebration · Thursday 20 May 2027 · 7:30 PM · Emirates Palace, Abu Dhabi", "Black tie", "emerald green gold arch wedding invitation", "emerald wedding invitation, gold, arch, luxury"),
    ("Invitation", "Modern Monogram Minimal Invitation", 480, 673, "Hana & James", "are getting married · 12.06.2027 · Alserkal Avenue, Dubai", "Dinner & dancing after", "modern minimalist monogram wedding invitation", "minimal wedding invitation, monogram, modern"),
    ("Invitation", "Desert Sunset Boho Invitation", 480, 673, "Mariam & Yousef", "invite you to a desert wedding at golden hour · Saturday 13 November 2027 · 4 PM · Al Maha Desert Resort", "Boho chic attire", "boho desert sunset wedding invitation", "boho wedding invitation, desert, sunset"),
    ("Invitation", "Navy and Gold Foil Invitation", 559, 794, "Aisha & Karim", "request the honour of your presence at their wedding · Friday 3 December 2027 · 7 PM · The Ritz-Carlton, DIFC", "Formal attire", "navy gold foil elegant wedding invitation", "navy wedding invitation, gold foil, elegant"),
    ("Invitation", "Garden Greenery Invitation", 480, 673, "Reem & Tariq", "are tying the knot in the garden · Saturday 6 March 2027 · 5 PM · Safa Park Lawn", "Garden party to follow", "greenery eucalyptus garden wedding invitation", "greenery wedding invitation, eucalyptus, garden"),
    ("Invitation", "Mediterranean Tile Invitation", 480, 673, "Lina & Sami", "say ‘I do’ by the sea · 25 September 2027 · Santorini, Greece", "Celebration until sunset", "mediterranean blue tile wedding invitation", "mediterranean wedding invitation, blue tiles, destination"),
    ("Invitation", "Black Tie Art Deco Invitation", 559, 794, "Dana & Rami", "invite you to an evening of celebration · Saturday 31 December 2027 · 8 PM · The Grand Ballroom", "Black tie · Dancing till midnight", "art deco black gold gatsby wedding invitation", "art deco wedding invitation, gatsby, black and gold"),
    ("Invitation", "Photo Overlay Wedding Invitation", 559, 794, "Zara & Ali", "are getting married · Friday 9 April 2027 · 6 PM · Bvlgari Resort, Dubai", "RSVP by 1 March", "photo wedding invitation modern overlay", "photo wedding invitation, modern, couple photo"),
    ("Invitation", "Arabesque Arch Nikah Invitation", 559, 794, "Fatima & Hamdan", "With the blessings of Allah, we invite you to the Nikah of · Friday 14 May 2027 · after Maghrib · Al Habtoor Palace", "Walima to follow", "arabesque pattern nikah invitation gold", "nikah invitation, arabesque, islamic pattern, gold"),
    ("Invitation", "Terracotta Arches Invitation", 480, 673, "Yara & Nabil", "invite you to celebrate love · Saturday 2 October 2027 · 5 PM · The Courtyard, Al Quoz", "Dinner under the stars", "terracotta arches modern wedding invitation", "terracotta wedding invitation, arches, modern boho"),
    ("Invitation", "Lavender Fields Invitation", 480, 673, "Salma & Ahmed", "are getting married among the lavender · 19 June 2027 · Provence, France", "Lunch & celebration to follow", "lavender provence wedding invitation", "lavender wedding invitation, provence, purple"),
    ("Invitation", "Midnight Starry Night Invitation", 480, 673, "Maya & Hadi", "under the stars, we say forever · Saturday 23 October 2027 · 8 PM · Hatta Dome Park", "Celestial attire welcome", "celestial starry night wedding invitation navy", "celestial wedding invitation, stars, moon, navy"),
    ("Save the Date", "Polaroid Save the Date Card", 673, 480, "Save the Date", "Sara & Adam · 07.05.2027 · Dubai", "Formal invitation to follow", "polaroid photo save the date card", "save the date, polaroid, photo"),
    ("Save the Date", "Calendar Heart Save the Date", 480, 673, "Save the Date", "Noor & Faisal are getting married · May 2027", "Abu Dhabi · invitation to follow", "calendar heart save the date", "save the date, calendar, heart"),
    ("Save the Date", "Big Date Typography Save the Date Poster", 1080, 1350, "06.12.27", "Hana & James are getting married", "Dubai · save the date", "big bold typography save the date", "save the date, typography, modern"),
    ("Save the Date", "Film Strip Save the Date Story", 1080, 1920, "Save our Date", "Reem & Tariq · 06.03.2027", "Safa Park · Dubai", "film strip photo save the date", "save the date story, film strip, photos"),
    ("Save the Date", "Airmail Destination Save the Date", 673, 480, "Save the Date", "Lina & Sami · Santorini · 25.09.2027", "Pack your bags — details to follow", "airmail destination wedding save the date", "destination wedding, save the date, airmail"),
    ("Save the Date", "Gold Rings Save the Date Post", 1080, 1080, "Save the Date", "Dana & Rami · 31 December 2027", "New Year’s Eve wedding", "gold rings save the date instagram", "save the date post, gold rings"),
    ("Save the Date", "Botanical Line Save the Date", 480, 673, "Save the Date", "Salma & Ahmed · 19.06.2027", "Provence, France", "line art botanical save the date", "save the date, botanical, line art"),
    ("Save the Date", "Sunset Beach Save the Date Story", 1080, 1920, "Save the Date", "Maya & Hadi · 23.10.2027", "Ras Al Khaimah · beach wedding", "sunset beach save the date photo", "save the date, beach, sunset photo"),
    ("Engagement", "We’re Engaged Ring Post", 1080, 1080, "We’re Engaged!", "Layla & Omar", "14.02.2027", "we're engaged announcement ring instagram", "engagement announcement, ring, we're engaged"),
    ("Engagement", "She Said Yes Champagne Post", 1080, 1080, "She said yes!", "Cheers to Mariam & Yousef", "", "she said yes champagne engagement post", "she said yes, engagement, champagne"),
    ("Engagement", "Engagement Party Invitation", 559, 794, "Engagement Party", "Join us to celebrate Aisha & Karim · Saturday 6 February 2027 · 8 PM · La Petite Maison", "RSVP to Huda · 050 123 4567", "engagement party invitation elegant", "engagement party invitation, elegant"),
    ("Engagement", "Engagement Photo Announcement Story", 1080, 1920, "Engaged", "Zara & Ali", "The beginning of forever · 2027", "engagement announcement photo story", "engagement story, photo announcement"),
    ("Engagement", "Rose Gold Engagement Card", 480, 673, "Congratulations on your engagement", "Wishing you a lifetime of love, laughter and happily ever after.", "With love, the Haddad family", "rose gold engagement congratulations card", "engagement card, rose gold, congratulations"),
    ("Engagement", "Henna Night Invitation", 559, 794, "Henna Night", "Celebrating Fatima before her wedding · Wednesday 12 May 2027 · 7 PM · Al Habtoor Palace, Majlis", "Ladies only · traditional attire", "henna night mehndi invitation mandala", "henna night invitation, mehndi, mandala"),
    ("Details", "Classic RSVP Card", 673, 480, "R.S.V.P.", "Kindly respond by 1 April 2027 · ___ joyfully accepts · ___ regretfully declines · Number of guests ___", "Sara & Adam", "classic wedding rsvp card", "rsvp card, wedding, classic"),
    ("Details", "Wedding Details Card", 480, 673, "The Details", "Ceremony 4 PM · Reception 6 PM · Dinner 7 PM · Dancing 9 PM", "The Rose Garden, Al Barari · parking on site", "wedding details card timeline", "wedding details card, timeline, venue"),
    ("Details", "Wedding Weekend Itinerary", 374, 794, "Wedding Weekend", "Friday · welcome drinks 7 PM · Saturday · ceremony 4 PM · reception 6 PM · Sunday · farewell brunch 11 AM", "Lina & Sami · Santorini", "wedding weekend itinerary card", "wedding itinerary, weekend, schedule"),
    ("Details", "Travel and Stay Card", 673, 480, "Travel & Stay", "Fly into Santorini (JTR) · Rooms held at Canaves Oia until 1 August · Code: LINASAMI27", "Questions? Message Sami", "wedding travel accommodation card", "wedding accommodation card, travel"),
    ("Details", "Dress Code Card", 480, 673, "Dress Code", "Black tie · Gowns & tuxedos · Jewel tones encouraged", "Dana & Rami · 31.12.2027", "wedding dress code card black tie", "dress code card, wedding, black tie"),
    ("Details", "Wedding Hashtag Card", 480, 673, "Share the love", "#ZaraAndAliForever", "Tag your photos so we can see the day through your eyes", "wedding hashtag sign card", "wedding hashtag card, social"),
    ("Menu & Program", "Elegant Wedding Dinner Menu", 374, 794, "Dinner Menu", "Burrata, heirloom tomato, basil · Slow-roasted lamb, saffron rice · Pistachio rose cake", "Aisha & Karim · 03.12.2027", "elegant wedding dinner menu card", "wedding menu, dinner menu, elegant"),
    ("Menu & Program", "Garden Wedding Menu", 374, 794, "Menu", "Mezze to share · Grilled sea bass, lemon & herbs · Orange blossom panna cotta", "Reem & Tariq", "garden greenery wedding menu", "wedding menu, garden, greenery"),
    ("Menu & Program", "Order of Service Ceremony Card", 559, 794, "Ceremony Program", "Processional · Welcome · Readings · Exchange of vows & rings · Pronouncement · Recessional", "Sara & Adam · 07.05.2027", "wedding ceremony program classic", "wedding program, ceremony, order of service"),
    ("Menu & Program", "Order of the Day Timeline", 559, 794, "Order of the Day", "4:00 Ceremony · 5:00 Drinks & canapés · 6:30 Dinner · 8:00 Speeches · 9:00 First dance · 12:00 Carriages", "Hana & James", "wedding order of the day timeline sign", "order of the day, wedding timeline, sign"),
    ("Menu & Program", "Wedding Table Number Card", 480, 673, "Table", "7", "Layla & Omar · 17.04.2027", "elegant wedding table number card", "table number, wedding, elegant"),
    ("Menu & Program", "Escort Place Card", 673, 480, "Welcome", "Ms. Huda Al Mansoori · Table 4", "Noor & Faisal", "wedding place card escort card", "place card, escort card, wedding"),
    ("Thank You", "Photo Thank You Card", 673, 480, "Thank you", "for celebrating with us. Your love made our day unforgettable.", "Love, Zara & Ali", "photo wedding thank you card", "wedding thank you card, photo"),
    ("Thank You", "Leafy Arc Thank You Card", 480, 673, "Thank You", "Thank you for your love, your laughter and the beautiful gift. We feel so lucky.", "Reem & Tariq", "botanical wedding thank you card", "thank you card, botanical, wedding"),
    ("Thank You", "Gold Script Thank You Post", 1080, 1080, "Thank you", "To everyone who celebrated with us — we love you.", "Mr & Mrs Haddad", "gold script thank you instagram wedding", "thank you post, gold script, wedding"),
    ("Thank You", "Newlyweds Thank You Story", 1080, 1920, "Just married", "Thank you for being part of our story", "Mariam & Yousef", "newlyweds thank you story photo", "just married story, thank you, photo"),
    ("Thank You", "Minimal Thank You Card", 480, 673, "thank you", "We are so grateful you were there. Here’s to many more celebrations together.", "Hana & James", "minimal modern thank you card wedding", "thank you card, minimal, modern"),
    ("Welcome & Signs", "Welcome to Our Wedding Sign", 559, 794, "Welcome", "to the wedding of Layla & Omar", "17 April 2027", "welcome wedding sign floral", "welcome sign, wedding, floral"),
    ("Welcome & Signs", "Signature Drinks Bar Sign", 559, 794, "Signature Drinks", "His · Sparkling rose lemonade · Hers · Passion fruit mojito · Ours · Pomegranate spritz", "Cheers to Dana & Rami", "wedding signature drinks bar sign", "bar sign, signature drinks, wedding"),
    ("Welcome & Signs", "Unplugged Ceremony Sign", 559, 794, "Unplugged ceremony", "Welcome to our unplugged ceremony. Please turn off your phones and cameras — be present with us in this moment.", "Sara & Adam", "unplugged ceremony sign wedding", "unplugged ceremony sign, wedding"),
    ("Welcome & Signs", "Just Married Post", 1080, 1080, "Just Married", "Mr & Mrs Al Mansoori", "17.04.2027", "just married instagram post", "just married post, wedding announcement"),
    ("Welcome & Signs", "Days To Go Wedding Countdown Story", 1080, 1920, "30 days to go", "until Maya & Hadi say ‘I do’", "23.10.2027 · Ras Al Khaimah", "wedding countdown instagram story", "wedding countdown, story, days to go"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def couple(d, y, text, size, color, family="Great Vibes", w=None, x=0):
    w = w or d.W
    s = d.fit(text, w * 0.86, family, size)
    t = d.text(x, y, w, text, family, s, color, align="center")
    return t


def details_block(d, x, y, w, parts, family, size, color, lh=1.55, upper=False, spacing=0, weight=400):
    return d.text(x, y, w, "\n".join(parts), family, size, color, align="center", lh=lh, upper=upper, spacing=spacing, weight=weight)


def floral_corner(d, x, y, s, flip=1, flipy=1, flowers=("rose", "white-flower", "blossom"), leaves=("#8DA68A", "#B5C4A7")):
    for k in range(7):
        ang = (-15 + k * 17) if flip > 0 else (195 - k * 17)
        if flipy < 0:
            ang = -ang
        d.leaf(x, y, s * (0.85 + 0.25 * (k % 2)), s * 0.26, ang, leaves[k % 2])
    for (dx, dy, k), f in zip([(0.3, 0.12, 0.62), (0.06, 0.34, 0.5), (0.48, 0.42, 0.42)], flowers):
        d.art(f, x + flip * dx * s * 1.6, y + flipy * dy * s * 1.6, s * k * 1.5, angle=d.rng.uniform(-20, 20))


def mandala(d, cx, cy, R, color, rings=4, opacity=1):
    for k in range(rings):
        r = R * (0.3 + 0.7 * k / max(1, rings - 1))
        n = 8 + 4 * k
        L = R * 0.22
        path = []
        for i in range(n):
            a = 2 * math.pi * i / n + (k % 2) * math.pi / n
            ux, uy = math.cos(a), math.sin(a)
            bx, by = cx + (r - L) * ux, cy + (r - L) * uy
            tx, ty = cx + r * ux, cy + r * uy
            px, py = -uy * L * 0.38, ux * L * 0.38
            mx, my = (bx + tx) / 2, (by + ty) / 2
            path += [["M", bx, by], ["Q", mx + px, my + py, tx, ty], ["Q", mx - px, my - py, bx, by], ["Z"]]
        d.path(path, fill="", stroke=color, sw=max(0.8, R * 0.008), opacity=opacity, name="Mandala")
        d.circle(cx, cy, r - L - R * 0.02, "", stroke=color, sw=max(0.6, R * 0.005), opacity=opacity, dash=[2, 4] if k % 2 else None)
    d.circle(cx, cy, R * 0.06, color, opacity=opacity)


def tile_pattern(d, x0, y0, x1, y1, s, a="#1F4E8C", b="#FFFFFF"):
    d.rect(x0, y0, x1 - x0, y1 - y0, b)
    y = y0
    j = 0
    path, path2 = [], []
    while y < y1:
        x = x0
        i = 0
        while x < x1:
            cx, cy = x + s / 2, y + s / 2
            # four quarter circles in the corners and a star in the middle
            r = s * 0.42
            for (qx, qy) in [(x, y), (x + s, y), (x, y + s), (x + s, y + s)]:
                sx = 1 if qx == x else -1
                sy = 1 if qy == y else -1
                path += [["M", qx, qy], ["L", qx + sx * r, qy], ["Q", qx + sx * r, qy + sy * r, qx, qy + sy * r], ["Z"]]
            k = s * 0.16
            path2 += [["M", cx, cy - k * 1.6], ["L", cx + k * 0.5, cy - k * 0.5], ["L", cx + k * 1.6, cy], ["L", cx + k * 0.5, cy + k * 0.5], ["L", cx, cy + k * 1.6], ["L", cx - k * 0.5, cy + k * 0.5], ["L", cx - k * 1.6, cy], ["L", cx - k * 0.5, cy - k * 0.5], ["Z"]]
            x += s
            i += 1
        y += s
        j += 1
    d.path(path, fill=a, name="Tile pattern")
    d.path(path2, fill=a, name="Tile pattern")


# ---------------------------------------------------------------- invitations
@design(1)
def blush_peony(d, c):
    W, H = d.W, d.H
    d.bg("#FDF7F4")
    d.texture("paper", 0.4)
    floral_corner(d, 0, 0, W * 0.32, flowers=("rose", "cherry-blossom", "white-flower"))
    floral_corner(d, W, H, W * 0.24, flip=-1, flipy=-1, flowers=("cherry-blossom", "rose", "blossom"))
    p = lines(c["message"])
    d.text(0, H * 0.25, W, "together with their families", "Lora", W * 0.03, "#8A6B6B", italic=True, align="center")
    t = couple(d, H * 0.29, "Layla\n& Omar", 90, "#9C4F5E")
    t["lineHeight"] = 0.95
    y = H * 0.29 + t["_h"] + 6
    d.text(W * 0.12, y, W * 0.76, p[0], "Lora", W * 0.033, "#6B5050", italic=True, align="center")
    divider(d, W / 2, y + W * 0.1, W * 0.3, "#C9A45A", 1, gap=7)
    d.text(W * 0.12, y + W * 0.13, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.031, "#4E3A3A", weight=600, align="center", lh=1.6, spacing=80)
    d.text(0, H * 0.875, W, c["signature"], "Great Vibes", W * 0.055, "#9C4F5E", align="center")
    return {"layout": "peony clusters in opposite corners framing a centred invitation", "typography": "Great Vibes names, Lora italic, Cinzel details", "palette": "blush, rose, sage leaves, gold", "decor": "paper grain, flower and leaf corners, diamond divider"}


@design(2)
def ivory_calligraphy(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F1")
    d.texture("paper", 0.5)
    d.frame_border(W * 0.05, "#B9A27A", 0.8, double=6)
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.13, W * 0.76, p[0], "Cormorant Garamond", W * 0.036, "#5E5243", italic=True, align="center", lh=1.4)
    s = d.fit("Sara", W * 0.5, "Mrs Saint Delafield", 130)
    d.text(0, H * 0.25, W, "Sara", "Mrs Saint Delafield", s, "#2F2A24", align="center")
    d.text(0, H * 0.25 + s * 0.95, W, "&", "Cormorant Garamond", s * 0.45, "#B9A27A", italic=True, align="center")
    d.text(0, H * 0.25 + s * 1.35, W, "Adam", "Mrs Saint Delafield", s, "#2F2A24", align="center")
    y = H * 0.25 + s * 2.55
    divider(d, W / 2, y, W * 0.3, "#B9A27A", 1, gap=7)
    d.text(W * 0.12, y + 16, W * 0.76, "\n".join(p[1:]), "Cormorant Garamond", W * 0.036, "#3E362D", weight=500, align="center", lh=1.4)
    d.text(0, H * 0.9, W, c["signature"], "Cinzel", W * 0.024, "#8A7556", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "classic centred stack with calligraphy names and ampersand inside a double frame", "typography": "Mrs Saint Delafield calligraphy, Cormorant Garamond, Cinzel caps", "palette": "ivory, charcoal ink, taupe gold", "decor": "paper grain, double hairline frame, diamond divider"}


@design(3)
def emerald_arch(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#0F5A43"), (1, "#05271D")]))
    aw, ah = W * 0.74, H * 0.82
    ax, ay = (W - aw) / 2, H * 0.09
    arch = [["M", ax, ay + ah], ["L", ax, ay + aw / 2], ["C", ax, ay + aw * 0.22, ax + aw * 0.22, ay, W / 2, ay], ["C", ax + aw * 0.78, ay, ax + aw, ay + aw * 0.22, ax + aw, ay + aw / 2], ["L", ax + aw, ay + ah], ["Z"]]
    d.path(arch, fill="", stroke=metal(aw, ah), sw=2.4, name="Gold arch")
    d.path(transform_path(arch, 0.94, W * 0.03, H * 0.035), fill="", stroke="#C9A45A", sw=0.8)
    d.art("white-flower", W / 2, ay + 4, W * 0.12)
    d.text(0, ay + aw * 0.3, W, "you are invited to the wedding of", "Cormorant Garamond", W * 0.034, "#E8E2CF", italic=True, align="center")
    t = couple(d, ay + aw * 0.38, "Noor & Faisal", 80, "#E9C877")
    text_metal(d, t)
    y = ay + aw * 0.38 + t["_h"] + 10
    divider(d, W / 2, y, W * 0.32, "#C9A45A", 1, gap=8)
    p = lines(c["message"])
    d.text(ax + 20, y + 20, aw - 40, "\n".join(p[1:]), "Cinzel", W * 0.032, "#F1EAD8", weight=600, align="center", lh=1.7, spacing=60)
    d.text(ax, ay + ah - W * 0.1, aw, c["signature"], "Montserrat", W * 0.022, "#C9A45A", weight=600, align="center", spacing=360, upper=True)
    return {"layout": "double gold arch on deep emerald holding a centred invitation", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel, Montserrat caps", "palette": "emerald, gold, ivory", "decor": "gold arch outlines, flower at the apex, diamond divider"}


@design(4)
def monogram_minimal(d, c):
    W, H = d.W, d.H
    d.bg("#F5F3EF")
    cx, cy = W / 2, H * 0.26
    d.circle(cx, cy, W * 0.17, "", stroke="#1E1E1E", sw=1)
    d.text(cx - W * 0.17, cy - W * 0.1, W * 0.34, "H|J", "Cormorant Garamond", W * 0.13, "#1E1E1E", weight=500, align="center")
    s = d.fit("HANA & JAMES", W * 0.84, "Cinzel", 60, 500, spacing=200)
    d.text(0, H * 0.46, W, "HANA & JAMES", "Cinzel", s, "#1E1E1E", weight=500, align="center", spacing=200)
    p = lines(c["message"])
    d.text(0, H * 0.46 + s * 1.6, W, p[0], "Cormorant Garamond", W * 0.05, "#4A4A4A", italic=True, align="center")
    d.line(W * 0.42, H * 0.64, W * 0.58, H * 0.64, "#1E1E1E", 0.8)
    d.text(0, H * 0.67, W, p[1], "Montserrat", W * 0.045, "#1E1E1E", weight=300, align="center", spacing=300)
    d.text(0, H * 0.74, W, p[2], "Montserrat", W * 0.026, "#4A4A4A", weight=500, align="center", spacing=200, upper=True)
    d.text(0, H * 0.88, W, c["signature"], "Cormorant Garamond", W * 0.034, "#4A4A4A", italic=True, align="center")
    return {"layout": "ringed monogram above spaced caps names and a single date line", "typography": "Cormorant Garamond, Cinzel spaced caps, Montserrat Light", "palette": "warm white, ink black, grey", "decor": "thin circle and hairline only"}


@design(5)
def desert_boho(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#F7E3CF"), (0.55, "#F2C7A5"), (1, "#E9A27A")]))
    d.circle(W / 2, H * 0.36, W * 0.22, "#F8D9A0", name="Sun")
    d.wave(-d.bleed, W + d.bleed, H * 0.47, 22, 300, fill="#D9895E", bottom=H + d.bleed)
    d.wave(-d.bleed, W + d.bleed, H * 0.55, 18, 240, fill="#C46F48", bottom=H + d.bleed, phase=1.3)
    d.wave(-d.bleed, W + d.bleed, H * 0.64, 14, 200, fill="#A85A3A", bottom=H + d.bleed, phase=0.4)
    d.art("cactus", W * 0.12, H * 0.6, W * 0.16)
    d.art("palm-tree", W * 0.86, H * 0.52, W * 0.2)
    d.text(0, H * 0.06, W, "join us at golden hour", "Lora", W * 0.033, "#7A3E26", italic=True, align="center")
    t = couple(d, H * 0.1, "Mariam & Yousef", 70, "#7A3E26")
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.71, W * 0.8, "\n".join(p[1:]), "Cinzel", W * 0.032, "#FFF4E8", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.91, W, c["signature"], "Caveat", W * 0.05, "#FFE3C4", weight=600, align="center")
    return {"layout": "layered dunes under a low sun, names in the sky, details on the sand", "typography": "Great Vibes, Lora italic, Cinzel, Caveat", "palette": "sand, apricot, terracotta, rust", "decor": "three dune waves, sun disc, cactus and palm illustrations"}


@design(6)
def navy_gold_foil(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.35, H, [(0, "#1D2B4F"), (1, "#0B1226")]))
    d.texture("grain", 0.25)
    for x, y, fx, fy in [(W * 0.06, W * 0.06, 1, 1), (W * 0.94, W * 0.06, -1, 1), (W * 0.06, H - W * 0.06, 1, -1), (W * 0.94, H - W * 0.06, -1, -1)]:
        d.path([["M", x, y + fy * 70], ["L", x, y], ["L", x + fx * 70, y]], fill="", stroke="#C9A45A", sw=1.6)
        d.path([["M", x + fx * 10, y + fy * 50], ["L", x + fx * 10, y + fy * 10], ["L", x + fx * 50, y + fy * 10]], fill="", stroke="#C9A45A", sw=0.8)
    d.confetti(W * 0.1, H * 0.08, W * 0.9, H * 0.24, ["#E9C877", "#F7E3A3"], n=18, size=(3, 7), shapes=("circle", "star"))
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.16, W * 0.76, p[0], "Cormorant Garamond", W * 0.036, "#E1D9C5", italic=True, align="center", lh=1.4)
    t = couple(d, H * 0.29, "Aisha\n& Karim", 100, "#E9C877")
    t["lineHeight"] = 0.95
    text_metal(d, t)
    y = H * 0.29 + t["_h"] + 14
    divider(d, W / 2, y, W * 0.36, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, y + 18, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#F1EAD8", weight=600, align="center", lh=1.7, spacing=60)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=360, upper=True)
    return {"layout": "foil-style corner brackets on navy; names in gold calligraphy centred", "typography": "Great Vibes gold gradient, Cormorant Garamond italic, Cinzel", "palette": "midnight navy, gold foil, ivory", "decor": "corner brackets, gold confetti, grain, divider"}


@design(7)
def garden_greenery(d, c):
    W, H = d.W, d.H
    d.bg("#F7F8F3")
    for side in (-1, 1):
        x0 = W / 2 + side * W * 0.5
        for k in range(16):
            y = H * (0.02 + k * 0.062)
            d.circle(x0 - side * (14 + 10 * math.sin(k)), y, 15 - (k % 3) * 2, ["#8FA79A", "#A8BDB1", "#7A9486"][k % 3], opacity=0.95)
            d.leaf(x0, y, 60, 16, 180 + side * -20 if side > 0 else -20, ["#6E8B6B", "#93AB8A"][k % 2]) if k % 2 else None
    d.art("herb", W / 2, H * 0.1, W * 0.2)
    p = lines(c["message"])
    t = couple(d, H * 0.2, "Reem & Tariq", 64, "#3D5A47")
    d.text(W * 0.14, H * 0.2 + t["_h"] + 4, W * 0.72, p[0], "Lora", W * 0.036, "#5E7363", italic=True, align="center")
    d.line(W * 0.4, H * 0.42, W * 0.6, H * 0.42, "#8FA79A", 1)
    d.text(W * 0.14, H * 0.45, W * 0.72, "\n".join(p[1:]), "Cinzel", W * 0.034, "#3D5A47", weight=600, align="center", lh=1.65, spacing=60)
    d.text(0, H * 0.82, W, c["signature"], "Great Vibes", W * 0.06, "#3D5A47", align="center")
    return {"layout": "eucalyptus garlands running down both edges, centred garden invitation", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "sage, eucalyptus, forest, white", "decor": "round-leaf garlands, herb sprig illustration"}


@design(8)
def mediterranean_tile(d, c):
    W, H = d.W, d.H
    tile_pattern(d, -d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 48, "#1F4E8C", "#F4F7FB")
    d.rect(W * 0.1, H * 0.1, W * 0.8, H * 0.8, "#FFFFFF", rx=8, shadow_=shadow("rgba(20,50,100,0.25)", 20, 0, 6), name="Card")
    d.rect(W * 0.125, H * 0.12, W * 0.75, H * 0.76, "", rx=4, stroke="#1F4E8C", sw=1.4)
    d.art("sailboat", W / 2, H * 0.2, W * 0.2)
    t = couple(d, H * 0.29, "Lina & Sami", 60, "#1F4E8C")
    p = lines(c["message"])
    d.text(W * 0.16, H * 0.29 + t["_h"] + 4, W * 0.68, p[0], "Lora", W * 0.04, "#38557F", italic=True, align="center")
    d.text(W * 0.16, H * 0.55, W * 0.68, p[1].upper(), "Cinzel", W * 0.04, "#1F4E8C", weight=700, align="center", spacing=120)
    d.text(W * 0.16, H * 0.61, W * 0.68, p[2], "Lora", W * 0.036, "#38557F", align="center")
    d.text(W * 0.16, H * 0.76, W * 0.68, c["signature"], "Montserrat", W * 0.024, "#1F4E8C", weight=600, align="center", spacing=240, upper=True)
    return {"layout": "white card over blue-and-white Mediterranean tiles", "typography": "Great Vibes, Lora italic, Cinzel, Montserrat caps", "palette": "Aegean blue, white", "decor": "vector tile pattern with quarter circles and stars, sailboat illustration"}


@design(9)
def black_tie_deco(d, c):
    W, H = d.W, d.H
    d.bg("#0B0B0C")
    cx = W / 2
    d.rays(cx, H * 0.2, W * 0.06, W * 0.5, 22, "#C9A45A", opacity=0.3, start=180, end=360, width_deg=2.2)
    for k in range(3):
        d.circle(cx, H * 0.2, W * (0.08 + k * 0.05), "", stroke="#C9A45A", sw=1, start=180, end=360)
    d.frame_border(W * 0.05, "#C9A45A", 1.2, double=8)
    d.polygon([(cx, H * 0.27), (cx + 12, H * 0.29), (cx, H * 0.31), (cx - 12, H * 0.29)], "#E9C877")
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.34, W * 0.76, p[0], "Cinzel", W * 0.03, "#E1D9C5", weight=600, align="center", spacing=200, upper=True, lh=1.5)
    s = d.fit("DANA & RAMI", W * 0.8, "Cinzel", 80, 700, spacing=100)
    t = d.text(0, H * 0.43, W, "DANA & RAMI", "Cinzel", s, "#E9C877", weight=700, align="center", spacing=100)
    text_metal(d, t)
    divider(d, cx, H * 0.43 + s * 1.5, W * 0.4, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.43 + s * 1.75, W * 0.76, "\n".join(p[1:]), "Cormorant Garamond", W * 0.045, "#F1EAD8", weight=500, align="center", lh=1.45)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.022, "#C9A45A", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "Gatsby-style deco fan above gold caps names inside a double frame", "typography": "Cinzel gold caps, Cormorant Garamond, Montserrat caps", "palette": "black, antique gold, ivory", "decor": "fan rays, concentric arcs, double frame"}


@design(10)
def photo_overlay(d, c):
    W, H = d.W, d.H
    d.bg("#1A1714")
    d.photo(1140, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.4))
    overlay(d, 0.15, 0.85, y0=H * 0.35, y1=H)
    d.text(0, H * 0.54, W, "we’re getting married", "Montserrat", W * 0.03, "#FFFFFF", weight=600, align="center", spacing=400, upper=True)
    t = couple(d, H * 0.58, "Zara & Ali", 90, "#FFFFFF")
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.58 + t["_h"] + 10, W * 0.8, "  ·  ".join(p[1:3]), "Cormorant Garamond", W * 0.045, "#F3EDE4", weight=500, align="center")
    d.text(W * 0.1, H * 0.58 + t["_h"] + 10 + W * 0.07, W * 0.8, p[3], "Cormorant Garamond", W * 0.045, "#F3EDE4", italic=True, align="center")
    pill(d, W / 2, H * 0.92, c["signature"], "Montserrat", W * 0.022, "#1A1714", "#F3EDE4", spacing=200)
    return {"layout": "full-bleed couple photo fading to dark, invitation set over the shade", "typography": "Great Vibes white, Montserrat caps, Cormorant Garamond", "palette": "photo tones, warm white, charcoal", "decor": "gradient shade, RSVP label"}


@design(11)
def arabesque_nikah(d, c):
    W, H = d.W, d.H
    d.bg("#F7F1E6")
    d.texture("paper", 0.4)
    mandala(d, W / 2, -W * 0.05, W * 0.55, "#C9A45A", rings=4, opacity=0.6)
    mandala(d, W / 2, H + W * 0.05, W * 0.55, "#C9A45A", rings=4, opacity=0.6)
    aw = W * 0.7
    ax = (W - aw) / 2
    ay, ah = H * 0.17, H * 0.66
    d.path([["M", ax, ay + ah], ["L", ax, ay + aw * 0.42], ["Q", ax, ay + aw * 0.12, W / 2, ay], ["Q", ax + aw, ay + aw * 0.12, ax + aw, ay + aw * 0.42], ["L", ax + aw, ay + ah], ["Z"]], fill="#FFFDF8", stroke="#C9A45A", sw=1.6, name="Arch")
    p = lines(c["message"])
    d.text(ax + 20, ay + aw * 0.22, aw - 40, p[0], "Cormorant Garamond", W * 0.036, "#5E4B2E", italic=True, align="center", lh=1.35)
    t = couple(d, ay + aw * 0.45, "Fatima\n& Hamdan", 80, "#8A6A2E", w=aw, x=ax)
    t["lineHeight"] = 1.0
    text_metal(d, t)
    y = ay + aw * 0.45 + t["_h"] + 8
    divider(d, W / 2, y, aw * 0.4, "#C9A45A", 1, gap=7)
    d.text(ax + 16, y + 16, aw - 32, "\n".join(p[1:]), "Cinzel", W * 0.03, "#4A3A22", weight=600, align="center", lh=1.65, spacing=60)
    d.text(ax, ay + ah - W * 0.09, aw, c["signature"], "Montserrat", W * 0.022, "#8A6A2E", weight=600, align="center", spacing=280, upper=True)
    return {"layout": "pointed arch panel between two gold mandala medallions", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "parchment, antique gold, walnut ink", "decor": "line mandalas, ogee arch, paper grain"}


@design(12)
def terracotta_arches(d, c):
    W, H = d.W, d.H
    d.bg("#F4E4D6")
    cols = ["#C8694A", "#E2A27F", "#D9B99B"]
    for k, (x, w_, h_) in enumerate([(0.06, 0.28, 0.42), (0.36, 0.28, 0.5), (0.66, 0.28, 0.38)]):
        X, Wd, Hh = W * x, W * w_, H * h_
        d.path([["M", X, H * 0.5], ["L", X, H * 0.5 - Hh + Wd / 2], ["C", X, H * 0.5 - Hh, X + Wd, H * 0.5 - Hh, X + Wd, H * 0.5 - Hh + Wd / 2], ["L", X + Wd, H * 0.5], ["Z"]], fill=cols[k])
    d.circle(W * 0.5, H * 0.16, W * 0.06, "#F7D9A0")
    d.rect(-d.bleed, H * 0.5, W + 2 * d.bleed, 2, "#8E4A33")
    t = couple(d, H * 0.53, "Yara & Nabil", 70, "#7A3E2A")
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.53 + t["_h"], W * 0.8, p[0], "Lora", W * 0.036, "#6E4A38", italic=True, align="center")
    d.text(W * 0.1, H * 0.53 + t["_h"] + W * 0.08, W * 0.8, "\n".join(p[1:]), "Cinzel", W * 0.031, "#5A3524", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.92, W, c["signature"], "Caveat", W * 0.05, "#C8694A", weight=600, align="center")
    return {"layout": "three terracotta arches of different heights on a horizon line, text below", "typography": "Great Vibes, Lora italic, Cinzel, Caveat", "palette": "clay, apricot, sand, rust", "decor": "arch shapes, sun disc, horizon rule"}


@design(13)
def lavender_invite(d, c):
    W, H = d.W, d.H
    d.bg("#F6F2FA")
    for side in (-1, 1):
        stems, buds = [], []
        for k in range(5):
            x = W / 2 + side * (W * 0.36 + k * 10)
            base = H * 1.0
            top = H * (0.56 + k * 0.05)
            stems += [["M", x, base], ["Q", x - side * 20, (base + top) / 2, x - side * 30, top]]
            for j in range(9):
                t = j / 9
                bx = x - side * 30 * (1 - t * 0.0) + (5 if j % 2 else -5)
                by = top + j * 10
                ux, uy = (math.cos(math.radians(-70 if j % 2 else -110)) * 8, math.sin(math.radians(-70 if j % 2 else -110)) * 8)
                px, py = -uy * 0.6, ux * 0.6
                buds += [["M", bx - ux, by - uy], ["Q", bx + px, by + py, bx + ux, by + uy], ["Q", bx - px, by - py, bx - ux, by - uy], ["Z"]]
        d.path(stems, fill="", stroke="#6F8C5E", sw=1.5)
        d.path(buds, fill="#8E74C4")
    d.art("butterfly", W * 0.8, H * 0.12, W * 0.12, angle=15)
    p = lines(c["message"])
    t = couple(d, H * 0.15, "Salma\n& Ahmed", 90, "#5B4391")
    t["lineHeight"] = 0.95
    y = H * 0.15 + t["_h"] + 10
    d.text(W * 0.14, y, W * 0.72, p[0], "Lora", W * 0.036, "#6D5B92", italic=True, align="center")
    d.text(W * 0.14, y + W * 0.13, W * 0.72, "\n".join(p[1:]), "Cinzel", W * 0.034, "#4A3A78", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.88, W, c["signature"], "Lora", W * 0.03, "#6D5B92", italic=True, align="center")
    return {"layout": "lavender stems rising from both bottom corners, invitation centred", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "lavender mist, violet, sage", "decor": "vector lavender sprays, butterfly"}


@design(14)
def starry_night(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0B1430"), (1, "#1E2A55")]))
    for _ in range(90):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.5, 1.8), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    for _ in range(8):
        d.sparkle(d.rng.uniform(20, W - 20), d.rng.uniform(20, H - 20), d.rng.uniform(4, 9), "#F3DFA2")
    d.art("crescent-moon", W / 2, H * 0.14, W * 0.2)
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.25, W * 0.76, p[0], "Cormorant Garamond", W * 0.04, "#E3E6F2", italic=True, align="center")
    t = couple(d, H * 0.31, "Maya\n& Hadi", 100, "#F3DFA2")
    t["lineHeight"] = 0.95
    text_metal(d, t)
    y = H * 0.31 + t["_h"] + 10
    divider(d, W / 2, y, W * 0.3, "#F3DFA2", 1, gap=7)
    d.text(W * 0.12, y + 18, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#E3E6F2", weight=600, align="center", lh=1.65, spacing=60)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#F3DFA2", weight=600, align="center", spacing=280, upper=True)
    return {"layout": "crescent moon over gold names in a star-scattered night sky", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "midnight navy, starlight gold, ice white", "decor": "stars, sparkles, moon illustration"}


# ---------------------------------------------------------------- save the date
def polaroid_photo(d, cx, cy, w, n, ang, focus=(0.5, 0.4)):
    h = w * 1.18
    d.rect(cx, cy, w, h, "#FFFFFF", angle=ang, origin_center=True, shadow_=shadow("rgba(0,0,0,0.22)", 14, 0, 6), name="Polaroid")
    a = math.radians(ang)
    oy = -h * 0.07
    o = d.photo(n, 0, 0, w * 0.88, w * 0.88, focus=focus)
    o.update({"originX": "center", "originY": "center", "left": cx - oy * math.sin(a), "top": cy + oy * math.cos(a), "angle": ang})


@design(15)
def polaroid_std(d, c):
    W, H = d.W, d.H
    d.bg("#F3EDE4")
    d.texture("paper", 0.5)
    polaroid_photo(d, W * 0.3, H * 0.5, W * 0.38, 138, -5, focus=(0.5, 0.35))
    d.rect(W * 0.3, H * 0.5 - W * 0.38 * 0.59 - 6, 80, 22, "#E9C6C0", opacity=0.85, angle=-8, origin_center=True)
    x0 = W * 0.56
    s = d.fit("Save the", W * 0.38, "Playfair Display", 70, 500, True)
    d.text(x0, H * 0.14, W * 0.4, "Save the", "Playfair Display", s, "#3A2E28", weight=500, italic=True)
    d.text(x0, H * 0.14 + s * 1.05, W * 0.4, "Date", "Great Vibes", s * 1.6, "#B05A5A")
    p = lines(c["message"])
    d.text(x0, H * 0.58, W * 0.4, p[0], "Cinzel", W * 0.03, "#3A2E28", weight=700, spacing=100)
    d.text(x0, H * 0.66, W * 0.4, p[1], "Montserrat", W * 0.05, "#3A2E28", weight=300, spacing=200)
    d.text(x0, H * 0.77, W * 0.4, p[2], "Lora", W * 0.028, "#6E5A50", italic=True)
    d.text(x0, H * 0.86, W * 0.4, c["signature"], "Montserrat", W * 0.018, "#6E5A50", weight=600, spacing=200, upper=True)
    return {"layout": "tilted taped polaroid on the left, save-the-date text on the right", "typography": "Playfair Display italic, Great Vibes, Cinzel, Montserrat Light", "palette": "linen, cocoa, rose", "decor": "paper grain, polaroid, washi tape"}


@design(16)
def calendar_heart(d, c):
    W, H = d.W, d.H
    d.bg("#FFF8F5")
    s = d.fit("Save the Date", W * 0.8, "Great Vibes", 80)
    d.text(0, H * 0.06, W, "Save the Date", "Great Vibes", s, "#B23A55", align="center")
    d.text(0, H * 0.06 + s * 1.2, W, "MAY 2027", "Cinzel", W * 0.05, "#3A2A30", weight=700, align="center", spacing=300)
    gx, gy = W * 0.12, H * 0.3
    cw = W * 0.76 / 7
    for i, dname in enumerate("SMTWTFS"):
        d.text(gx + i * cw, gy, cw, dname, "Montserrat", W * 0.026, "#9A7A84", weight=700, align="center")
    day = 1
    start = 6  # May 1 2027 is a Saturday
    for k in range(start, start + 31):
        r, col = divmod(k, 7)
        x, y = gx + col * cw, gy + 30 + r * cw * 0.85
        if day == 7:
            d.heart(x + cw / 2, y + cw * 0.3, cw * 1.05, "#E85D7A")
            d.text(x, y + cw * 0.08, cw, str(day), "Montserrat", W * 0.032, "#FFFFFF", weight=700, align="center")
        else:
            d.text(x, y + cw * 0.08, cw, str(day), "Montserrat", W * 0.03, "#3A2A30", weight=400, align="center")
        day += 1
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.78, W * 0.8, p[0], "Playfair Display", W * 0.045, "#3A2A30", italic=True, align="center")
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#B23A55", weight=600, align="center", spacing=240, upper=True)
    return {"layout": "month calendar with the wedding day circled by a heart", "typography": "Great Vibes, Cinzel, Montserrat, Playfair Display italic", "palette": "blush white, raspberry, plum grey", "decor": "calendar grid, heart marker"}


@design(17)
def big_date(d, c):
    W, H = d.W, d.H
    d.bg("#EFE8DC")
    s = d.fit("06.12", W * 0.9, "Anton", 600)
    d.text(0, H * 0.08, W, "06.12", "Anton", s, "#1E1E1E", align="center", lh=0.85)
    s2 = d.fit("2027", W * 0.9, "Anton", 600)
    t = d.text(0, H * 0.08 + s * FS_MULT * 0.85, W, "2027", "Anton", s2, "rgba(0,0,0,0)", align="center", lh=0.85, stroke="#1E1E1E", sw=3)
    d.text(0, H * 0.7, W, "Hana & James", "Great Vibes", 150, "#B5523B", align="center")
    d.text(0, H * 0.84, W, "ARE GETTING MARRIED · DUBAI", "Montserrat", 34, "#1E1E1E", weight=700, align="center", spacing=360)
    return {"layout": "the date set huge in two lines, one solid and one outlined, script names over it", "typography": "Anton solid and outline, Great Vibes, Montserrat caps", "palette": "bone, ink, terracotta", "decor": "type only"}


@design(18)
def film_strip(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE8")
    fx, fw = W * 0.18, W * 0.64
    d.rect(fx, -d.bleed, fw, H + 2 * d.bleed, "#1B1B1B", name="Film")
    for k in range(int(H / 60) + 2):
        for xx in (fx + 14, fx + fw - 34):
            d.rect(xx, k * 60 + 10, 20, 30, "#F4EFE8", rx=4)
    for k, (n, f) in enumerate([(579, (0.5, 0.35)), (1078, (0.5, 0.35)), (793, (0.5, 0.4))]):
        d.photo(n, fx + 56, 120 + k * 520, fw - 112, 470, focus=f)
    d.rect(0, H * 0.74, W, H * 0.2, "rgba(244,239,232,0.94)")
    s = d.fit("Save our Date", W * 0.84, "Great Vibes", 180)
    d.text(0, H * 0.745, W, "Save our Date", "Great Vibes", s, "#2A2A2A", align="center")
    d.text(0, H * 0.745 + s * 1.2, W, c["message"], "Cinzel", 46, "#2A2A2A", weight=700, align="center", spacing=160)
    d.text(0, H * 0.745 + s * 1.2 + 70, W, c["signature"], "Montserrat", 30, "#6A6A6A", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "vertical film strip with three couple photos, a pale band holding the date", "typography": "Great Vibes, Cinzel, Montserrat caps", "palette": "film black, cream, photo tones", "decor": "film sprocket holes, three photo frames"}


@design(19)
def airmail_std(d, c):
    W, H = d.W, d.H
    d.bg("#FBF7EE")
    d.texture("paper", 0.5)
    k = 0
    for (x0, y0, x1, y1) in [(-d.bleed, -d.bleed, W + d.bleed, 18), (-d.bleed, H - 18, W + d.bleed, H + d.bleed)]:
        d.stripes(x0, y0, x1, y1, 26, 26, "#D64545" if k == 0 else "#2F5DA8", angle_deg=-40)
        k += 1
    d.art("airplane", W * 0.82, H * 0.22, W * 0.18, angle=-10)
    d.path([["M", W * 0.2, H * 0.3], ["Q", W * 0.5, H * 0.08, W * 0.74, H * 0.24]], fill="", stroke="#2F5DA8", sw=1.6, dash=[6, 6])
    d.rect(W * 0.07, H * 0.12, W * 0.16, W * 0.2, "#FFFFFF", stroke="#D64545", sw=2, dash=[3, 3])
    d.art("palm-tree", W * 0.15, H * 0.12 + W * 0.1, W * 0.12)
    s = d.fit("Save the Date", W * 0.6, "Great Vibes", 80)
    d.text(0, H * 0.32, W, "Save the Date", "Great Vibes", s, "#2F5DA8", align="center")
    p = lines(c["message"])
    d.text(0, H * 0.32 + s * 1.25, W, p[0], "Cinzel", W * 0.035, "#2A2A2A", weight=700, align="center", spacing=160)
    d.text(0, H * 0.32 + s * 1.25 + W * 0.06, W, f"{p[1]}  ·  {p[2]}", "Montserrat", W * 0.028, "#D64545", weight=600, align="center", spacing=240, upper=True)
    d.text(0, H * 0.82, W, c["signature"], "Caveat", W * 0.04, "#2F5DA8", weight=600, align="center")
    return {"layout": "airmail envelope with a stamp, dashed flight path and plane", "typography": "Great Vibes, Cinzel, Montserrat caps, Caveat", "palette": "envelope cream, airmail red and blue", "decor": "airmail stripes, stamp, dashed route, plane and palm illustrations"}


@design(20)
def gold_rings_post(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.4, W * 0.8, [(0, "#1E1B18"), (1, "#0A0908")]))
    for cx_ in (W * 0.43, W * 0.57):
        d.circle(cx_, H * 0.33, W * 0.14, "", stroke=metal(W * 0.28, W * 0.28), sw=16)
    d.art("gem-stone", W * 0.43, H * 0.33 - W * 0.15, W * 0.08)
    s = d.fit("Save the Date", W * 0.8, "Great Vibes", 180)
    t = d.text(0, H * 0.55, W, "Save the Date", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.55 + s * 1.3, W, p[0].upper(), "Cinzel", 46, "#F3E6CB", weight=700, align="center", spacing=260)
    d.text(0, H * 0.55 + s * 1.3 + 80, W, p[1], "Cormorant Garamond", 54, "#F3E6CB", italic=True, align="center")
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 28, "#C9A45A", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "two interlocking gold rings above a gold script save-the-date", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond italic", "palette": "black, gold, champagne", "decor": "gradient ring strokes, gem illustration"}


@design(21)
def botanical_line_std(d, c):
    W, H = d.W, d.H
    d.bg("#FAF8F4")
    stroke = "#5E6B57"
    cx = W / 2
    d.path([["M", cx, H * 0.5], ["C", cx - 20, H * 0.38, cx + 20, H * 0.24, cx, H * 0.1]], fill="", stroke=stroke, sw=1.2)
    for k in range(8):
        t = k / 8
        y = H * 0.48 - t * H * 0.36
        for sd in (-1, 1):
            L = 40 * (1 - t * 0.5)
            ang = math.radians(-90 + sd * 50)
            tip = (cx + math.cos(ang) * L, y + math.sin(ang) * L)
            mx, my = (cx + tip[0]) / 2, (y + tip[1]) / 2
            nx, ny = -math.sin(ang) * 9, math.cos(ang) * 9
            d.path([["M", cx, y], ["Q", mx + nx, my + ny, tip[0], tip[1]], ["Q", mx - nx, my - ny, cx, y]], fill="", stroke=stroke, sw=1)
    s = d.fit("Save the Date", W * 0.8, "Playfair Display", 60, 500, True)
    d.text(0, H * 0.56, W, "Save the Date", "Playfair Display", s, "#2E352B", italic=True, weight=500, align="center")
    p = lines(c["message"])
    d.text(0, H * 0.56 + s * 1.5, W, p[0], "Great Vibes", W * 0.09, "#5E6B57", align="center")
    d.text(0, H * 0.56 + s * 1.5 + W * 0.13, W, p[1], "Montserrat", W * 0.05, "#2E352B", weight=300, align="center", spacing=300)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#5E6B57", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "single-line botanical stem rising above centred type", "typography": "Playfair Display italic, Great Vibes, Montserrat Light", "palette": "warm white, olive, charcoal green", "decor": "symmetrical line-art stem"}


@design(22)
def sunset_beach_story(d, c):
    W, H = d.W, d.H
    d.bg("#F2C7A5")
    d.photo(1909, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.55, 0.5))
    overlay(d, 0.45, 0.0, y0=0, y1=H * 0.4, color="#5A2E2A")
    overlay(d, 0.0, 0.55, y0=H * 0.6, y1=H, color="#3A1E1A")
    s = d.fit("Save the Date", W * 0.84, "Great Vibes", 220)
    d.text(0, H * 0.08, W, "Save the Date", "Great Vibes", s, "#FFFFFF", align="center", shadow_=shadow("rgba(0,0,0,0.3)", 20, 0, 4))
    p = lines(c["message"])
    d.text(0, H * 0.08 + s * 1.3, W, p[0].upper(), "Cinzel", 52, "#FFFFFF", weight=700, align="center", spacing=260)
    d.text(0, H * 0.8, W, p[1], "Montserrat", 96, "#FFFFFF", weight=300, align="center", spacing=200)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", 30, "#FFE9D6", weight=600, align="center", spacing=300, upper=True)
    return {"layout": "full-bleed sunset beach photo with script at the top and the date at the foot", "typography": "Great Vibes, Cinzel, Montserrat Light", "palette": "sunset coral, sand, white", "decor": "warm top and bottom shades"}


# ---------------------------------------------------------------- engagement
@design(23)
def engaged_ring(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FCE7EC"), (1, "#F6D3DC")]))
    d.circle(W / 2, H * 0.32, W * 0.24, "#FFFFFF", shadow_=shadow("rgba(200,100,130,0.25)", 50, 0, 18))
    d.art("ring", W / 2, H * 0.32, W * 0.32)
    for x, y, r in [(0.3, 0.16, 20), (0.72, 0.2, 14), (0.7, 0.46, 18)]:
        d.sparkle(W * x, H * y, r, "#E8A0B4")
    s = d.fit("We’re Engaged!", W * 0.84, "Playfair Display", 130, 700, True)
    d.text(0, H * 0.6, W, "We’re Engaged!", "Playfair Display", s, "#8E2F4C", weight=700, italic=True, align="center")
    d.text(0, H * 0.6 + s * 1.3, W, c["message"], "Great Vibes", 120, "#C25B78", align="center")
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 32, "#8E2F4C", weight=700, align="center", spacing=400)
    return {"layout": "ring illustration in a white glowing disc, announcement below", "typography": "Playfair Display bold italic, Great Vibes, Montserrat", "palette": "blush to rose, berry", "decor": "sparkles, glow disc, ring illustration"}


@design(24)
def she_said_yes(d, c):
    W, H = d.W, d.H
    d.bg("#121212")
    d.confetti(0, 0, W, H * 0.6, ["#E9C877", "#F7E3A3", "#FFFFFF", "#F2A6B8"], n=70, size=(6, 14), shapes=("circle", "strip", "star"))
    d.art("clinking-glasses", W / 2, H * 0.32, W * 0.46, shadow_=shadow("rgba(233,200,119,0.4)", 50, 0, 0))
    s = d.fit("She said yes!", W * 0.84, "Great Vibes", 220)
    t = d.text(0, H * 0.58, W, "She said yes!", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    d.text(0, H * 0.58 + s * 1.3, W, c["message"].upper(), "Cinzel", 44, "#F3E6CB", weight=700, align="center", spacing=220)
    return {"layout": "clinking glasses bursting with confetti above a gold script", "typography": "Great Vibes gold, Cinzel caps", "palette": "black, gold, blush, white", "decor": "confetti, glow, glasses illustration"}


@design(25)
def engagement_party(d, c):
    W, H = d.W, d.H
    d.bg("#FBF3EE")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.42 + d.bleed, "#2E2A44", name="Top band")
    d.scallop_edge(-d.bleed, W + d.bleed, H * 0.42, 14, "#2E2A44")
    d.art("ring", W * 0.5, H * 0.13, W * 0.18)
    s = d.fit("Engagement Party", W * 0.84, "Great Vibes", 80)
    t = d.text(0, H * 0.22, W, "Engagement Party", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t, ROSE_GOLD)
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.5, W * 0.8, p[0], "Lora", W * 0.042, "#2E2A44", italic=True, align="center", lh=1.35)
    divider(d, W / 2, H * 0.62, W * 0.3, "#C28370", 1, gap=7)
    d.text(W * 0.1, H * 0.65, W * 0.8, "\n".join(p[1:]), "Cinzel", W * 0.034, "#2E2A44", weight=600, align="center", lh=1.6, spacing=60)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", W * 0.022, "#FBF3EE", "#2E2A44", spacing=100, upper=False)
    return {"layout": "deep indigo scalloped header with ring and rose-gold title, details below", "typography": "Great Vibes rose gold, Lora italic, Cinzel", "palette": "indigo, rose gold, cream", "decor": "scallop edge, ring illustration, divider, RSVP pill"}


@design(26)
def engaged_photo_story(d, c):
    W, H = d.W, d.H
    d.bg("#F5EFE7")
    d.photo(138, 80, 160, W - 160, H * 0.62, frame="arch", focus=(0.5, 0.3))
    d.path([["M", 60, 160 + H * 0.62 + 20], ["L", 60, 140 + (W - 120) / 2], ["C", 60, 140, W / 2 - 300, 140, W / 2, 140]], fill="", stroke="#B48A4A", sw=2)
    s = d.fit("Engaged", W * 0.8, "Playfair Display", 220, 500, True)
    d.text(0, H * 0.73, W, "Engaged", "Playfair Display", s, "#2E2A26", weight=500, italic=True, align="center")
    d.text(0, H * 0.73 + s * 1.15, W, c["message"], "Great Vibes", 110, "#B48A4A", align="center")
    d.text(0, H * 0.93, W, c["signature"].upper(), "Montserrat", 28, "#6A6058", weight=600, align="center", spacing=300)
    return {"layout": "couple photo in a tall arch with a gold outline, italic headline below", "typography": "Playfair Display italic, Great Vibes, Montserrat caps", "palette": "linen, charcoal, gold", "decor": "arch frame with offset gold line"}


@design(27)
def rose_gold_card(d, c):
    W, H = d.W, d.H
    d.bg("#FBEFEA")
    d.texture("paper", 0.4)
    for x, y, r in [(0.15, 0.12, 0.2), (0.88, 0.85, 0.24)]:
        d.circle(W * x, H * y, W * r, rad(W * r, W * r, W * r, [(0, "rgba(240,194,176,0.8)"), (1, "rgba(240,194,176,0)")]))
    d.art("ring", W / 2, H * 0.18, W * 0.22)
    s = d.fit("Congratulations", W * 0.84, "Great Vibes", 90)
    t = d.text(0, H * 0.32, W, "Congratulations", "Great Vibes", s, "#B06B5B", align="center")
    text_metal(d, t, ROSE_GOLD)
    d.text(0, H * 0.32 + s * 1.2, W, "ON YOUR ENGAGEMENT", "Cinzel", W * 0.035, "#7A4A3E", weight=700, align="center", spacing=260)
    d.text(W * 0.14, H * 0.55, W * 0.72, c["message"], "Lora", W * 0.04, "#6A4A42", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.84, W, c["signature"], "Montserrat", W * 0.024, "#B06B5B", weight=700, align="center", spacing=240, upper=True)
    return {"layout": "ring at the top, rose-gold script congratulations, wish centred", "typography": "Great Vibes rose gold, Cinzel, Lora italic", "palette": "blush, rose gold, cocoa", "decor": "soft glows, paper grain, ring illustration"}


@design(28)
def henna_night(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.4, H, [(0, "#6B1E2E"), (1, "#2E0A14")]))
    mandala(d, W / 2, H * 0.24, W * 0.3, "#E9C877", rings=4, opacity=0.9)
    for x, y in [(0, 0), (W, 0), (0, H), (W, H)]:
        mandala(d, x, y, W * 0.22, "#C9A45A", rings=3, opacity=0.5)
    s = d.fit("Henna Night", W * 0.84, "Great Vibes", 110)
    t = d.text(0, H * 0.46, W, "Henna Night", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.46 + s * 1.25, W * 0.76, p[0], "Cormorant Garamond", W * 0.045, "#F6E6E6", italic=True, align="center")
    d.text(W * 0.12, H * 0.46 + s * 1.25 + W * 0.1, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.031, "#F6E6E6", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.022, "#E9C877", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "gold line mandala above a script title, corner mandalas", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "henna maroon, gold, blush ivory", "decor": "vector mandalas"}


# ---------------------------------------------------------------- details
@design(29)
def rsvp(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F1")
    d.frame_border(W * 0.04, "#B9A27A", 0.8, double=5)
    s = d.fit("R.S.V.P.", W * 0.5, "Cinzel", 60, 600, spacing=200)
    d.text(0, H * 0.1, W, "R.S.V.P.", "Cinzel", s, "#2F2A24", weight=600, align="center", spacing=200)
    p = lines(c["message"])
    d.text(0, H * 0.1 + s * 1.4, W, p[0], "Cormorant Garamond", W * 0.03, "#5E5243", italic=True, align="center")
    y = H * 0.4
    for k, line in enumerate(["Name", p[1].replace("___ ", ""), p[2].replace("___ ", ""), p[3].replace(" ___", "")]):
        if k == 0:
            d.text(W * 0.14, y, W * 0.16, "M", "Great Vibes", W * 0.05, "#2F2A24")
            d.line(W * 0.2, y + W * 0.045, W * 0.86, y + W * 0.045, "#B9A27A", 0.8)
        elif k < 3:
            d.circle(W * 0.17, y + W * 0.022, 8, "", stroke="#2F2A24", sw=1)
            d.text(W * 0.2, y, W * 0.6, line, "Cormorant Garamond", W * 0.032, "#2F2A24")
        else:
            d.text(W * 0.14, y, W * 0.4, line, "Cormorant Garamond", W * 0.032, "#2F2A24")
            d.line(W * 0.42, y + W * 0.04, W * 0.6, y + W * 0.04, "#B9A27A", 0.8)
        y += H * 0.11
    d.text(0, H * 0.86, W, c["signature"], "Great Vibes", W * 0.045, "#8A7556", align="center")
    return {"layout": "reply card with tick circles and write-in lines", "typography": "Cinzel, Cormorant Garamond, Great Vibes", "palette": "ivory, ink, taupe gold", "decor": "double hairline frame, write-in rules"}


@design(30)
def details_card(d, c):
    W, H = d.W, d.H
    d.bg("#F7F3EC")
    s = d.fit("The Details", W * 0.7, "Great Vibes", 80)
    d.text(0, H * 0.06, W, "The Details", "Great Vibes", s, "#9C4F5E", align="center")
    p = lines(c["message"])
    icons = ["wedding", "clinking-glasses", "fork-and-knife-with-plate", "musical-notes"]
    x0 = W * 0.22
    d.line(x0, H * 0.26, x0, H * 0.74, "#C9A45A", 1.2)
    for k, item in enumerate(p):
        y = H * (0.26 + k * 0.16)
        d.circle(x0, y + 18, 30, "#FFFFFF", stroke="#C9A45A", sw=1.2)
        d.art(icons[k], x0, y + 18, 40)
        t_, what = item.split(" ", 1)[1], item.split(" ", 1)[0]
        d.text(x0 + 50, y, W * 0.6, what.upper(), "Cinzel", W * 0.038, "#4E3A3A", weight=700, spacing=120)
        d.text(x0 + 50, y + W * 0.06, W * 0.6, t_, "Lora", W * 0.036, "#6B5050", italic=True)
    d.text(W * 0.1, H * 0.84, W * 0.8, c["signature"].replace(" · ", "\n"), "Montserrat", W * 0.024, "#9C4F5E", weight=600, align="center", spacing=160, upper=True, lh=1.7)
    return {"layout": "vertical timeline of the day with icons on a gold line", "typography": "Great Vibes, Cinzel, Lora italic, Montserrat caps", "palette": "cream, rose, gold, cocoa", "decor": "timeline rule, icon circles with illustrations"}


@design(31)
def weekend_itinerary(d, c):
    W, H = d.W, d.H
    d.bg("#EEF3F8")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.22, "#1F4E8C")
    d.art("sun", W * 0.82, H * 0.05, W * 0.18)
    s = d.fit("Wedding\nWeekend", W * 0.8, "Playfair Display", 60, 600, True)
    d.text(0, H * 0.04, W, "Wedding\nWeekend", "Playfair Display", s, "#FFFFFF", weight=600, italic=True, align="center", lh=1.0)
    p = lines(c["message"])
    y = H * 0.27
    k = 0
    while k < len(p):
        day = p[k]
        d.text(W * 0.1, y, W * 0.8, day.upper(), "Cinzel", W * 0.06, "#1F4E8C", weight=700, spacing=200)
        y += W * 0.1
        k += 1
        while k < len(p) and p[k] not in ("Saturday", "Sunday", "Friday"):
            d.text(W * 0.1, y, W * 0.8, p[k], "Lora", W * 0.052, "#2C3E57", italic=True)
            y += W * 0.09
            k += 1
        d.line(W * 0.1, y + 6, W * 0.9, y + 6, "#B5C7DE", 1)
        y += W * 0.08
    d.text(W * 0.05, H * 0.9, W * 0.9, c["signature"], "Montserrat", W * 0.035, "#1F4E8C", weight=600, align="center", spacing=120, upper=True)
    return {"layout": "slim card: blue header, three days of events in stacked sections", "typography": "Playfair Display italic, Cinzel, Lora italic, Montserrat caps", "palette": "Aegean blue, mist, navy", "decor": "header band, sun illustration, section rules"}


@design(32)
def travel_stay(d, c):
    W, H = d.W, d.H
    d.bg("#FBF7EE")
    d.rect(-d.bleed, -d.bleed, W * 0.38 + d.bleed, H + 2 * d.bleed, "#E6EEF5")
    d.art("world-map", W * 0.19, H * 0.38, W * 0.3)
    d.art("luggage", W * 0.12, H * 0.74, W * 0.14)
    d.art("airplane", W * 0.28, H * 0.72, W * 0.12, angle=-15)
    x0 = W * 0.44
    s = d.fit("Travel & Stay", W * 0.5, "Playfair Display", 50, 600, True)
    d.text(x0, H * 0.1, W * 0.5, "Travel & Stay", "Playfair Display", s, "#1F3B5C", weight=600, italic=True)
    p = lines(c["message"])
    y = H * 0.1 + s * 1.5
    for item, lab in zip(p, ["GETTING THERE", "WHERE TO STAY", "BOOKING CODE"]):
        d.text(x0, y, W * 0.5, lab, "Montserrat", W * 0.022, "#B5523B", weight=700, spacing=240)
        t = d.text(x0, y + 20, W * 0.5, item, "Lora", W * 0.034, "#2A3A4E", lh=1.4)
        y += 20 + t["_h"] + 20
    d.text(x0, H * 0.86, W * 0.5, c["signature"], "Caveat", W * 0.035, "#1F3B5C", weight=600)
    return {"layout": "split card: travel illustrations on the left, labelled travel notes on the right", "typography": "Playfair Display italic, Montserrat caps labels, Lora, Caveat", "palette": "cream, mist blue, navy, terracotta", "decor": "map, suitcase and plane illustrations"}


@design(33)
def dress_code(d, c):
    W, H = d.W, d.H
    d.bg("#121212")
    d.frame_border(W * 0.05, "#C9A45A", 1, double=6)
    d.art("top-hat", W * 0.36, H * 0.24, W * 0.26)
    d.art("dress", W * 0.64, H * 0.24, W * 0.26)
    s = d.fit("Dress Code", W * 0.8, "Great Vibes", 90)
    t = d.text(0, H * 0.42, W, "Dress Code", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.42 + s * 1.3, W, p[0].upper(), "Cinzel", W * 0.06, "#F3E6CB", weight=700, align="center", spacing=260)
    d.text(W * 0.12, H * 0.42 + s * 1.3 + W * 0.12, W * 0.76, "\n".join(p[1:]), "Cormorant Garamond", W * 0.045, "#E1D9C5", italic=True, align="center", lh=1.4)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.022, "#C9A45A", weight=600, align="center", spacing=280, upper=True)
    return {"layout": "top hat and gown side by side above a gold script title", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond italic", "palette": "black, gold, ivory", "decor": "double frame, hat and dress illustrations"}


@design(34)
def hashtag(d, c):
    W, H = d.W, d.H
    d.bg("#FDF1EE")
    d.rect(W * 0.12, H * 0.14, W * 0.76, W * 0.76, "#FFFFFF", rx=26, shadow_=shadow("rgba(180,100,100,0.2)", 24, 0, 10))
    d.art("camera-with-flash", W / 2, H * 0.14 + W * 0.3, W * 0.36)
    d.heart(W * 0.72, H * 0.17, 40, "#E85D7A", angle=12)
    s = d.fit("Share the love", W * 0.8, "Great Vibes", 80)
    d.text(0, H * 0.56, W, "Share the love", "Great Vibes", s, "#B23A55", align="center")
    s2 = d.fit(c["message"], W * 0.84, "Montserrat", 40, 800)
    d.text(0, H * 0.56 + s * 1.3, W, c["message"], "Montserrat", s2, "#2A2025", weight=800, align="center")
    d.text(W * 0.12, H * 0.56 + s * 1.3 + s2 * 1.8, W * 0.76, c["signature"], "Lora", W * 0.034, "#6B5050", italic=True, align="center", lh=1.45)
    return {"layout": "camera tile above a script line and a bold hashtag", "typography": "Great Vibes, Montserrat ExtraBold, Lora italic", "palette": "blush, raspberry, charcoal", "decor": "white tile with shadow, camera and heart"}


# ---------------------------------------------------------------- menus & programs
@design(35)
def elegant_menu(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F1")
    d.texture("paper", 0.45)
    d.frame_border(W * 0.06, "#B9A27A", 0.8, double=6)
    d.art("white-flower", W / 2, H * 0.08, W * 0.18)
    s = d.fit("Dinner Menu", W * 0.8, "Great Vibes", 70)
    d.text(0, H * 0.13, W, "Dinner Menu", "Great Vibes", s, "#2F2A24", align="center")
    labels = ["TO START", "MAIN", "DESSERT"]
    y = H * 0.27
    for lab, item in zip(labels, lines(c["message"])):
        d.text(0, y, W, lab, "Cinzel", W * 0.04, "#8A7556", weight=700, align="center", spacing=260)
        t = d.text(W * 0.12, y + W * 0.1, W * 0.76, item, "Cormorant Garamond", W * 0.07, "#2F2A24", italic=True, align="center", lh=1.3)
        y += W * 0.1 + t["_h"] + H * 0.06
        divider(d, W / 2, y - H * 0.018, W * 0.2, "#B9A27A", 0.8, gap=5)
    d.text(W * 0.1, H * 0.88, W * 0.8, c["signature"], "Montserrat", W * 0.03, "#8A7556", weight=600, align="center", spacing=200, upper=True)
    return {"layout": "tall menu: flower, script title, three courses with dividers", "typography": "Great Vibes, Cinzel labels, Cormorant Garamond italic", "palette": "ivory, ink, taupe gold", "decor": "double frame, white flower, small dividers"}


@design(36)
def garden_menu(d, c):
    W, H = d.W, d.H
    d.bg("#F3F6EF")
    for k in range(10):
        d.leaf(W * (0.1 + k * 0.09), -6, 50, 14, 70 + k * 6, ["#7E9A73", "#A6BC98"][k % 2])
        d.leaf(W * (0.1 + k * 0.09), H + 6, 50, 14, -70 - k * 6, ["#7E9A73", "#A6BC98"][k % 2])
    s = d.fit("Menu", W * 0.6, "Great Vibes", 100)
    d.text(0, H * 0.1, W, "Menu", "Great Vibes", s, "#3D5A47", align="center")
    y = H * 0.27
    for item in lines(c["message"]):
        d.art("herb", W / 2, y, W * 0.1)
        t = d.text(W * 0.1, y + W * 0.1, W * 0.8, item, "Lora", W * 0.07, "#2E3B32", italic=True, align="center", lh=1.3)
        y += W * 0.14 + t["_h"] + H * 0.07
    d.text(0, H * 0.88, W, c["signature"], "Cinzel", W * 0.045, "#3D5A47", weight=700, align="center", spacing=200)
    return {"layout": "leaf fringe top and bottom, three dishes separated by herb sprigs", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "sage mist, leaf greens, forest", "decor": "vector leaf fringe, herb illustrations"}


@design(37)
def ceremony_program(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F1")
    d.frame_border(W * 0.05, "#B9A27A", 0.8, double=6)
    s = d.fit("Ceremony Program", W * 0.8, "Great Vibes", 70)
    d.text(0, H * 0.08, W, "Ceremony Program", "Great Vibes", s, "#2F2A24", align="center")
    d.text(0, H * 0.08 + s * 1.2, W, c["signature"].upper(), "Cinzel", W * 0.026, "#8A7556", weight=700, align="center", spacing=220)
    y = H * 0.26
    for k, item in enumerate(lines(c["message"])):
        d.text(W * 0.16, y, W * 0.12, f"{k + 1:02d}", "Cormorant Garamond", W * 0.05, "#B9A27A", italic=True)
        d.text(W * 0.28, y, W * 0.6, item, "Cormorant Garamond", W * 0.05, "#2F2A24")
        d.line(W * 0.28, y + W * 0.08, W * 0.84, y + W * 0.08, "#E3D8C4", 0.8)
        y += H * 0.095
    d.art("wedding", W / 2, H * 0.88, W * 0.12)
    return {"layout": "numbered order of service with hairlines under each part", "typography": "Great Vibes, Cinzel, Cormorant Garamond", "palette": "ivory, ink, taupe gold", "decor": "double frame, chapel illustration"}


@design(38)
def order_of_day(d, c):
    W, H = d.W, d.H
    d.bg("#1E2A3A")
    s = d.fit("Order of the Day", W * 0.84, "Great Vibes", 80)
    t = d.text(0, H * 0.06, W, "Order of the Day", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    d.text(0, H * 0.06 + s * 1.2, W, c["signature"].upper(), "Cinzel", W * 0.03, "#C9D3E0", weight=600, align="center", spacing=260)
    icons = ["wedding", "clinking-glasses", "fork-and-knife-with-plate", "microphone", "musical-notes", "sparkles"]
    y = H * 0.25
    for k, item in enumerate(lines(c["message"])):
        tm, what = item.split(" ", 1)
        d.circle(W * 0.2, y + 22, 28, "rgba(255,255,255,0.08)", stroke="#C9A45A", sw=1)
        d.art(icons[k % len(icons)], W * 0.2, y + 22, 34)
        d.text(W * 0.3, y, W * 0.2, tm, "Cinzel", W * 0.045, "#E9C877", weight=700)
        d.text(W * 0.48, y + 4, W * 0.42, what, "Cormorant Garamond", W * 0.045, "#F1EAD8", italic=True)
        y += H * 0.11
    return {"layout": "timeline sign: time in gold caps, event in italic, icon in a ring", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond italic", "palette": "slate navy, gold, ivory", "decor": "icon rings with illustrations"}


@design(39)
def table_number(d, c):
    W, H = d.W, d.H
    d.bg("#FDF7F4")
    floral_corner(d, 0, 0, W * 0.34)
    floral_corner(d, W, H, W * 0.3, flip=-1, flipy=-1)
    d.text(0, H * 0.24, W, "Table", "Great Vibes", W * 0.16, "#9C4F5E", align="center")
    t = d.text(0, H * 0.34, W, c["message"], "Playfair Display", W * 0.5, "#4E3A3A", weight=500, align="center", lh=1)
    d.text(0, H * 0.76, W, c["signature"].upper(), "Cinzel", W * 0.028, "#9C4F5E", weight=600, align="center", spacing=220)
    return {"layout": "big table numeral under a script label with floral corners", "typography": "Great Vibes, Playfair Display numeral, Cinzel", "palette": "blush, rose, sage", "decor": "flower corners"}


@design(40)
def place_card(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F1")
    d.line(-d.bleed, H * 0.5, W + d.bleed, H * 0.5, "#E3D8C4", 0.8, dash=[4, 6])
    d.text(0, H * 0.06, W, "fold here", "Montserrat", W * 0.014, "#C8BCA8", weight=500, align="center", spacing=200, upper=True)
    d.art("white-flower", W * 0.12, H * 0.66, W * 0.1)
    d.art("rose", W * 0.88, H * 0.66, W * 0.1)
    p = lines(c["message"])
    s = d.fit(p[0], W * 0.66, "Great Vibes", 60)
    d.text(0, H * 0.58, W, p[0], "Great Vibes", s, "#2F2A24", align="center")
    d.text(0, H * 0.58 + s * 1.3, W, p[1].upper(), "Cinzel", W * 0.03, "#8A7556", weight=700, align="center", spacing=300)
    d.text(0, H * 0.3, W, c["signature"], "Cinzel", W * 0.03, "#B9A27A", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "fold-over place card: couple on the back, guest name and table on the front", "typography": "Great Vibes, Cinzel", "palette": "ivory, ink, taupe", "decor": "dashed fold line, flower accents"}


# ---------------------------------------------------------------- thank you
@design(41)
def thank_you_photo(d, c):
    W, H = d.W, d.H
    d.bg("#F5EFE7")
    d.photo(1078, -d.bleed, -d.bleed, W * 0.5 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.4))
    x0 = W * 0.56
    s = d.fit("Thank you", W * 0.38, "Great Vibes", 90)
    d.text(x0, H * 0.18, W * 0.4, "Thank you", "Great Vibes", s, "#2E2A26")
    d.text(x0, H * 0.18 + s * 1.3, W * 0.38, c["message"], "Lora", W * 0.03, "#5E5248", italic=True, lh=1.55)
    d.line(x0, H * 0.72, x0 + 60, H * 0.72, "#B48A4A", 1.2)
    d.text(x0, H * 0.76, W * 0.4, c["signature"], "Cinzel", W * 0.026, "#2E2A26", weight=700, spacing=120)
    return {"layout": "half-page photo on the left, thank-you note on the right", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "linen, charcoal, gold", "decor": "photo panel, gold rule"}


@design(42)
def thank_you_botanical(d, c):
    W, H = d.W, d.H
    d.bg("#F4F6F0")
    cx, cy, R = W / 2, H * 0.33, W * 0.3
    for i in range(30):
        a = math.pi * (0.15 + 0.7 * i / 29) + math.pi
        d.leaf(cx + R * math.cos(a), cy + R * math.sin(a) + R * 0.2, 34, 10, math.degrees(a) + 90 + (35 if i % 2 else -35), ["#6E8B5B", "#8FA97A"][i % 2])
    d.art("white-flower", cx - R * 0.95, cy + R * 0.25, W * 0.12)
    d.art("blossom", cx + R * 0.95, cy + R * 0.25, W * 0.1)
    s = d.fit("Thank You", W * 0.6, "Great Vibes", 120)
    d.text(0, cy - s * 0.4, W, "Thank You", "Great Vibes", s, "#3D5A47", align="center")
    d.text(W * 0.14, H * 0.58, W * 0.72, c["message"], "Lora", W * 0.04, "#4E5F55", italic=True, align="center", lh=1.5)
    d.text(0, H * 0.84, W, c["signature"], "Cinzel", W * 0.034, "#3D5A47", weight=700, align="center", spacing=160)
    return {"layout": "half-wreath of leaves crowning a script thank you", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "sage mist, leaf greens, forest", "decor": "leaf arc, flower accents"}


@design(43)
def gold_thank_you_post(d, c):
    W, H = d.W, d.H
    d.bg("#F7F1E6")
    d.texture("paper", 0.45)
    d.confetti(60, 60, W - 60, H - 60, ["#C9A45A", "#E9C877", "#B68A3A"], n=50, size=(4, 10), shapes=("circle", "star"), avoid=[(W * 0.1, H * 0.25, W * 0.9, H * 0.8)])
    s = d.fit("Thank you", W * 0.8, "Great Vibes", 300)
    t = d.text(0, H * 0.25, W, "Thank you", "Great Vibes", s, "#B68A3A", align="center")
    text_metal(d, t)
    d.text(W * 0.12, H * 0.25 + s * 1.25, W * 0.76, c["message"], "Cormorant Garamond", 54, "#4A3A22", italic=True, align="center", lh=1.35)
    d.text(0, H * 0.82, W, c["signature"].upper(), "Cinzel", 40, "#8A6A2E", weight=700, align="center", spacing=300)
    return {"layout": "huge gold script thank you with a ring of gold confetti", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "parchment, gold, walnut", "decor": "paper grain, gold confetti"}


@design(44)
def just_married_story(d, c):
    W, H = d.W, d.H
    d.bg("#1A1714")
    d.photo(1140, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.4))
    overlay(d, 0, 0.8, y0=H * 0.45, y1=H)
    s = d.fit("Just married", W * 0.84, "Great Vibes", 240)
    d.text(0, H * 0.66, W, "Just married", "Great Vibes", s, "#FFFFFF", align="center")
    d.text(W * 0.1, H * 0.66 + s * 1.25, W * 0.8, c["message"], "Cormorant Garamond", 60, "#F3EDE4", italic=True, align="center")
    d.text(0, H * 0.9, W, c["signature"].upper(), "Montserrat", 32, "#F3EDE4", weight=600, align="center", spacing=360)
    return {"layout": "full-bleed couple photo with script and thanks over a dark fade", "typography": "Great Vibes, Cormorant Garamond italic, Montserrat caps", "palette": "photo tones, warm white", "decor": "gradient shade"}


@design(45)
def minimal_thank_you(d, c):
    W, H = d.W, d.H
    d.bg("#EDE7DE")
    s = d.fit("thank\nyou", W * 0.7, "Playfair Display", 160, 400, True)
    d.text(W * 0.1, H * 0.1, W * 0.8, "thank\nyou", "Playfair Display", s, "#2B2724", italic=True, lh=0.88)
    d.circle(W * 0.8, H * 0.47, W * 0.09, "#C9886E", opacity=0.9)
    d.line(W * 0.1, H * 0.6, W * 0.3, H * 0.6, "#2B2724", 1.2)
    d.text(W * 0.1, H * 0.63, W * 0.7, c["message"], "Montserrat", W * 0.034, "#4A443E", lh=1.65)
    d.text(W * 0.1, H * 0.88, W * 0.8, c["signature"].upper(), "Montserrat", W * 0.026, "#2B2724", weight=700, spacing=300)
    return {"layout": "editorial left stack: big italic thank you, a terracotta dot, note below", "typography": "Playfair Display italic, Montserrat", "palette": "oat, ink, terracotta", "decor": "single circle and rule"}


# ---------------------------------------------------------------- welcome & signs
@design(46)
def welcome_sign(d, c):
    W, H = d.W, d.H
    d.bg("#FDF9F5")
    d.texture("paper", 0.4)
    floral_corner(d, 0, 0, W * 0.42, flowers=("rose", "white-flower", "cherry-blossom"))
    floral_corner(d, W, H, W * 0.42, flip=-1, flipy=-1, flowers=("white-flower", "rose", "blossom"))
    s = d.fit("Welcome", W * 0.74, "Great Vibes", 160)
    d.text(0, H * 0.3, W, "Welcome", "Great Vibes", s, "#9C4F5E", align="center")
    d.text(W * 0.12, H * 0.3 + s * 1.2, W * 0.76, c["message"].replace("Layla & Omar", "").strip(), "Cinzel", W * 0.032, "#4E3A3A", weight=600, align="center", spacing=200, upper=True)
    t = couple(d, H * 0.3 + s * 1.2 + W * 0.06, "Layla & Omar", 70, "#4E3A3A")
    d.text(0, H * 0.3 + s * 1.2 + W * 0.06 + t["_h"] + 6, W, c["signature"], "Lora", W * 0.036, "#8A6B6B", italic=True, align="center")
    return {"layout": "large script Welcome between two floral corners, names and date below", "typography": "Great Vibes, Cinzel caps, Lora italic", "palette": "blush white, rose, sage", "decor": "paper grain, flower and leaf corners"}


@design(47)
def drinks_sign(d, c):
    W, H = d.W, d.H
    d.bg("#14141A")
    s = d.fit("Signature Drinks", W * 0.84, "Great Vibes", 90)
    t = d.text(0, H * 0.06, W, "Signature Drinks", "Great Vibes", s, "#E9C877", align="center")
    text_metal(d, t)
    p = lines(c["message"])
    y = H * 0.24
    arts = ["cocktail-glass", "tropical-drink", "wine-glass"]
    for k in range(0, len(p), 2):
        d.art(arts[k // 2], W * 0.2, y + 40, W * 0.16)
        d.text(W * 0.34, y, W * 0.56, p[k].upper(), "Cinzel", W * 0.05, "#E9C877", weight=700, spacing=200)
        d.text(W * 0.34, y + W * 0.08, W * 0.56, p[k + 1], "Cormorant Garamond", W * 0.05, "#F1EAD8", italic=True, lh=1.2)
        y += H * 0.2
    divider(d, W / 2, H * 0.86, W * 0.4, "#C9A45A", 1, gap=8)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "bar sign: His / Hers / Ours drinks with glass illustrations", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond italic", "palette": "ink, gold, ivory", "decor": "glass illustrations, divider"}


@design(48)
def unplugged(d, c):
    W, H = d.W, d.H
    d.bg("#F3EEE6")
    d.texture("paper", 0.45)
    d.art("mobile-phone", W / 2, H * 0.16, W * 0.2)
    d.line(W * 0.4, H * 0.08, W * 0.6, H * 0.24, "#C0504A", 6)
    s = d.fit("Unplugged\nceremony", W * 0.8, "Playfair Display", 80, 600, True)
    d.text(0, H * 0.3, W, "Unplugged\nceremony", "Playfair Display", s, "#2F2A24", weight=600, italic=True, align="center", lh=1.0)
    d.text(W * 0.12, H * 0.3 + s * 2.5, W * 0.76, c["message"], "Lora", W * 0.04, "#4E443A", align="center", lh=1.55)
    d.text(0, H * 0.86, W, c["signature"], "Great Vibes", W * 0.07, "#8A7556", align="center")
    return {"layout": "crossed-out phone above an italic two-line title and a gentle note", "typography": "Playfair Display italic, Lora, Great Vibes", "palette": "linen, charcoal, brick red", "decor": "phone illustration with strike line, paper grain"}


@design(49)
def just_married_post(d, c):
    W, H = d.W, d.H
    d.bg("#FBEFF1")
    d.bunting(-10, W + 10, 40, 60, ["#F2B8C6", "#FFFFFF", "#E9C877"], flags=11, fh=60)
    d.confetti(40, 140, W - 40, H - 40, ["#F28BA6", "#E9C877", "#FFFFFF"], n=40, size=(6, 14), shapes=("circle", "strip"), avoid=[(W * 0.1, H * 0.25, W * 0.9, H * 0.85)])
    d.art("two-hearts", W / 2, H * 0.3, W * 0.22)
    s = d.fit("Just Married", W * 0.84, "Great Vibes", 220)
    d.text(0, H * 0.43, W, "Just Married", "Great Vibes", s, "#B23A55", align="center")
    d.text(0, H * 0.43 + s * 1.3, W, c["message"].upper(), "Cinzel", 46, "#3A2A30", weight=700, align="center", spacing=220)
    d.text(0, H * 0.43 + s * 1.3 + 80, W, c["signature"], "Montserrat", 40, "#B23A55", weight=300, align="center", spacing=300)
    return {"layout": "bunting across the top, hearts and script announcement centred", "typography": "Great Vibes, Cinzel caps, Montserrat Light", "palette": "blush, raspberry, gold", "decor": "bunting, confetti, hearts illustration"}


@design(50)
def countdown_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#F9E9E4"), (1, "#EBD2CF")]))
    d.circle(W / 2, H * 0.33, W * 0.36, "#FFFFFF", shadow_=shadow("rgba(170,110,110,0.25)", 50, 0, 18))
    d.circle(W / 2, H * 0.33, W * 0.32, "", stroke="#C28370", sw=3, dash=[4, 12])
    t = d.text(0, H * 0.33 - 230, W, "30", "Playfair Display", 320, "#A65A4C", weight=700, align="center", lh=0.9)
    text_metal(d, t, ROSE_GOLD)
    d.text(0, H * 0.33 + 110, W, "DAYS TO GO", "Cinzel", 52, "#5A3A35", weight=700, align="center", spacing=300)
    d.text(W * 0.1, H * 0.62, W * 0.8, c["message"], "Great Vibes", 110, "#A65A4C", align="center", lh=1.1)
    d.text(0, H * 0.84, W, c["signature"], "Montserrat", 34, "#5A3A35", weight=600, align="center", spacing=240, upper=True)
    d.art("wedding", W * 0.5, H * 0.92, 120)
    return {"layout": "rose-gold countdown number in a white dial, script line below", "typography": "Playfair Display rose gold, Cinzel caps, Great Vibes", "palette": "blush, rose gold, cocoa", "decor": "white dial with dashed ring, chapel illustration"}
