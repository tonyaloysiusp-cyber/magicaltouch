"""Collection 500 — Miscellaneous special occasions (misc-001 … misc-030)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width
from common import GOLD, SILVER, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body
from seasonal import crescent, islamic_star_pattern, rangoli, fireworks

CATEGORY = "Miscellaneous special occasions"
SITE_CATEGORY = "Cards"
TAG = "occasion"

CARD = 480, 673
SQ = 1080, 1080
ST = 1080, 1920
A4P = 559, 794

SPEC = [
    ("Religious", "Hajj Mubarak Card", *CARD, "Hajj Mubarak", "May Allah accept your Hajj and bring you home safely.", "With love, the Rahman family", "hajj mubarak card kaaba gold", "hajj mubarak, islamic greeting", "Festivals"),
    ("Religious", "Umrah Mubarak Post", *SQ, "Umrah Mubarak", "May your journey be blessed and your prayers answered", "", "umrah mubarak post elegant", "umrah mubarak, islamic", "Festivals"),
    ("Festival", "Happy Onam Pookalam Post", *SQ, "Happy Onam", "Wishing you a harvest of happiness and prosperity", "From all of us at Kerala Kitchen", "happy onam pookalam post", "onam, kerala festival", "Festivals"),
    ("Festival", "Happy Holi Colour Splash Post", *SQ, "Happy Holi", "May your life be as colourful as today", "", "happy holi colour splash post", "holi, festival of colours", "Festivals"),
    ("Festival", "Makar Sankranti Kite Card", *CARD, "Happy Makar Sankranti", "Let your dreams fly as high as the kites", "", "makar sankranti kite card", "sankranti, pongal, kites", "Festivals"),
    ("Festival", "Raksha Bandhan Card", *CARD, "Happy Raksha Bandhan", "To my brother — my protector, my partner in crime and my best friend.", "Love, Priya", "raksha bandhan rakhi card", "raksha bandhan, rakhi", "Festivals"),
    ("Festival", "Mid-Autumn Festival Card", *CARD, "Happy Mid-Autumn Festival", "Under the full moon, may your family be together and your hearts full.", "", "mid autumn festival mooncake card", "mid-autumn, mooncake festival", "Festivals"),
    ("Festival", "Happy Hanukkah Card", *CARD, "Happy Hanukkah", "Wishing you eight nights of light, love and latkes.", "The Cohen family", "happy hanukkah menorah card blue", "hanukkah, menorah", "Festivals"),
    ("Festival", "Nowruz Mubarak Card", *CARD, "Nowruz Mubarak", "A new day, a new year, a new beginning. Happy Persian New Year!", "", "nowruz card goldfish sabzeh", "nowruz, persian new year", "Festivals"),
    ("Religious", "First Holy Communion Invitation", *CARD, "First Holy Communion", "Please join us as Maria receives her First Holy Communion · Sunday 2 May 2027 · 10:00 AM · St. Mary’s Church, Dubai", "Lunch to follow", "first holy communion invitation elegant", "first communion, church", "Invitation"),
    ("Religious", "Sunday Service Welcome Post", *SQ, "Welcome home", "Join us this Sunday · 9:00 AM & 11:30 AM", "Grace Community Church", "church sunday service welcome post", "church, sunday service", "Social Media"),
    ("Religious", "Griha Pravesh Invitation", *CARD, "Griha Pravesh", "With the blessings of the Almighty, we invite you to our housewarming ceremony · Friday 12 March 2027 · 9:00 AM · Villa 22, Mirdif, Dubai", "The Nair family", "griha pravesh invitation marigold", "griha pravesh, housewarming", "Invitation"),
    ("Celebration", "Silver Anniversary Party Invitation", *CARD, "25 Years", "Join us to celebrate the silver wedding anniversary of Joseph & Anne · Saturday 6 March 2027 · 7:00 PM · Al Bustan Ballroom", "RSVP to Tony · 050 123 4567", "25th silver anniversary invitation", "silver anniversary, 25 years", "Invitation"),
    ("Celebration", "Golden Fifty Anniversary Card", *CARD, "50 Golden Years", "Happy anniversary to the couple who showed us what forever looks like.", "With love, all your grandchildren", "50th golden anniversary card", "golden anniversary, 50 years", "Love & Family"),
    ("Celebration", "Vow Renewal Invitation", *CARD, "Still I Do", "Ten years later, we’re saying it again · Friday 14 May 2027 · 5:30 PM · Jumeirah Beach", "Sam & Leena", "vow renewal invitation beach", "vow renewal, anniversary", "Invitation"),
    ("Celebration", "Celebration of Life Invitation", *CARD, "Celebrating the life of", "Mary Thomas · 1948 – 2027 · Join us to share stories and memories · Saturday 20 March · 4:00 PM · Community Hall", "", "celebration of life invitation calm", "celebration of life, memorial", "Invitation"),
    ("Pets", "Pet Birthday Party Invitation", *CARD, "Max is turning 3!", "Join us for cake, toys and zoomies · Sunday 4 April · 4:00 PM · Safa Park", "Dogs welcome!", "dog birthday party invitation", "pet birthday, dog party", "Invitation"),
    ("Pets", "Adopt Me Pet Poster", *A4P, "Adopt me!", "Luna · 2 years · friendly, house-trained and great with kids", "Paws Rescue UAE · 050 765 4321", "pet adoption poster cute", "pet adoption, rescue", "Poster"),
    ("Pets", "Lost Cat Poster", *A4P, "LOST CAT", "Mishka · grey tabby · green collar · last seen near Al Barsha Park", "Please call 055 123 9876", "lost cat poster", "lost pet, missing cat", "Poster"),
    ("Awareness", "International Women’s Day Post", *SQ, "Happy Women’s Day", "Here’s to strong women: may we know them, may we be them, may we raise them.", "8 March", "international womens day post", "women's day, 8 march", "Social Media"),
    ("Awareness", "Earth Day Post", *SQ, "Earth Day", "There is no planet B · 22 April", "", "earth day post illustration", "earth day, environment", "Social Media"),
    ("Awareness", "Pink Ribbon Awareness Post", *SQ, "Think Pink", "October is Breast Cancer Awareness Month · Early detection saves lives", "Book your screening today", "breast cancer awareness pink ribbon post", "pink october, awareness", "Social Media"),
    ("Awareness", "World Mental Health Day Post", *SQ, "It’s okay not to be okay", "World Mental Health Day · 10 October", "Talk to someone you trust", "mental health day post soft", "mental health, awareness", "Social Media"),
    ("Awareness", "World Book Day Post", *SQ, "World Book Day", "Get lost in a good book · 23 April", "", "world book day post", "world book day, reading", "Social Media"),
    ("Awareness", "Labour Day Thank You Post", *SQ, "Happy Labour Day", "Thank you to every hand that builds, fixes and keeps our city running", "1 May", "labour day thank you post", "labour day, workers", "Social Media"),
    ("Awareness", "World Smile Day Post", *SQ, "Smile!", "It’s World Smile Day · pass it on", "", "world smile day post", "world smile day, kindness", "Social Media"),
    ("Everyday", "I’m Sorry Card", *CARD, "I’m sorry", "I messed up, and I’m truly sorry. Can we talk over coffee — my treat?", "", "i'm sorry card cute", "apology card, sorry", "Cards"),
    ("Everyday", "Welcome Home Banner", 1584, 396, "Welcome home!", "We missed you so much", "", "welcome home banner colourful", "welcome home, banner", "Banner"),
    ("Everyday", "Garage Sale Poster", *A4P, "GARAGE SALE", "Furniture · toys · books · clothes · Saturday 8 AM – 1 PM", "Villa 9, Street 14, Al Barsha 2", "garage sale poster bold", "garage sale, yard sale", "Poster"),
    ("Everyday", "Teacher’s Day Apple Post", *SQ, "Happy Teacher’s Day", "Thank you for teaching us to think, dream and never stop asking why", "Class 5B", "teachers day post apple chalkboard", "teacher's day, school", "Social Media"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def parts(s):
    return [p.strip() for p in s.split("·")]


def inv_details(d, y, c, color, accent, fam="Cormorant Garamond", size=None, w=0.8, first_italic=True):
    """Invitation body: first part as a sentence, the rest as stacked details."""
    W = d.W
    size = size or W * 0.042
    p = parts(c["message"])
    t = d.text(W * (1 - w) / 2, y, W * w, p[0], fam, size, color, italic=first_italic, align="center", lh=1.35)
    y += t["_h"] + size * 0.9
    for k, it in enumerate(p[1:]):
        d.text(0, y, W, it.upper(), "Montserrat", size * 0.62, accent, weight=700, align="center", spacing=250)
        y += size * 1.25
    return y


# ------------------------------------------------------------------ religious & festivals
@design(1)
def hajj(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#0B2E2B", "#06302A"))
    islamic_star_pattern(d, 0, 0, W, H, 60, "#E9C877", 0.7, opacity=0.18)
    d.circle(W / 2, H * 0.3, 120, rad(120, 120, 120, [(0, "rgba(255,220,140,0.35)"), (1, "rgba(255,220,140,0)")]))
    d.art("kaaba", W / 2, H * 0.3, 170)
    crescent(d, W * 0.78, H * 0.1, 22, "#E9C877", "#0B2E2B")
    t, s = fitted(d, H * 0.48, c["headline"], "Great Vibes", 72, "#E9C877", w=0.8)
    text_metal(d, t)
    divider(d, W / 2, H * 0.48 + s * 1.25, 140, "#E9C877", 1)
    body(d, H * 0.48 + s * 1.4, c["message"], "Cormorant Garamond", 21, "#E8F1EC", italic=True, w=0.74, lh=1.4)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", 11, "#E9C877", weight=600, align="center", spacing=150)
    return {"layout": "glowing Kaaba centred on a geometric-pattern ground, gold script and blessing", "typography": "Great Vibes gold, Cormorant Garamond italic, Montserrat", "palette": "deep emerald, gold, mint white", "decor": "star pattern, crescent, glow"}


@design(2)
def umrah(d, c):
    W, H = d.W, d.H
    d.bg("#F6F0E4")
    # arch window with the Kaaba
    aw, ah = W * 0.5, H * 0.56
    x0, y0 = W / 2 - aw / 2, H * 0.08
    d.path([["M", x0, y0 + ah], ["L", x0, y0 + aw / 2], ["Q", x0, y0, W / 2, y0], ["Q", x0 + aw, y0, x0 + aw, y0 + aw / 2], ["L", x0 + aw, y0 + ah], ["Z"]],
           fill=vgrad(ah, "#0F3D3A", "#1D5C55"), name="Arch")
    islamic_star_pattern(d, x0 + 20, y0 + 40, x0 + aw - 20, y0 + ah - 20, 70, "#E9C877", 1, opacity=0.25)
    d.art("kaaba", W / 2, y0 + ah * 0.62, 280)
    d.path([["M", x0 - 18, y0 + ah], ["L", x0 - 18, y0 + aw / 2], ["Q", x0 - 18, y0 - 18, W / 2, y0 - 18], ["Q", x0 + aw + 18, y0 - 18, x0 + aw + 18, y0 + aw / 2], ["L", x0 + aw + 18, y0 + ah]],
           fill="", stroke="#B68A3A", sw=4)
    t, s = fitted(d, H * 0.7, c["headline"], "Playfair Display", 96, "#0F3D3A", weight=600, italic=True)
    body(d, H * 0.7 + s * 1.3, c["message"], "Lora", 34, "#5A5040", italic=True, w=0.7, lh=1.35)
    return {"layout": "tall arch window framing the Kaaba, italic headline and blessing below", "typography": "Playfair Display italic, Lora italic", "palette": "parchment, deep teal, gold", "decor": "arch with gold outline, star pattern"}


def pookalam(d, cx, cy, R):
    rings = ["#F4A300", "#FFFFFF", "#E85D04", "#FFD23F", "#9D0208", "#F48C06", "#2D6A4F"]
    for k, col in enumerate(rings):
        d.circle(cx, cy, R * (1 - k * 0.13), col)
    n = 16
    for i in range(n):
        a = 2 * math.pi * i / n
        d.leaf(cx + R * 0.48 * math.cos(a), cy + R * 0.48 * math.sin(a), R * 0.3, R * 0.1, math.degrees(a), "#FFFFFF" if i % 2 else "#FFD23F")
    rangoli(d, cx, cy, R * 0.38, ["#9D0208", "#E85D04", "#FFD23F"])


@design(3)
def onam(d, c):
    W, H = d.W, d.H
    d.bg("#FFF6E0")
    pookalam(d, W / 2, H * 0.32, W * 0.25)
    for k in range(7):
        d.leaf(W * 0.04 + k * 22, H * 1.0 - k * 6, 120, 34, -70 + k * 6, "#2D6A4F", opacity=0.8)
        d.leaf(W * 0.96 - k * 22, H * 1.0 - k * 6, 120, 34, -110 - k * 6, "#2D6A4F", opacity=0.8)
    t, s = fitted(d, H * 0.6, c["headline"], "Playfair Display", 120, "#9D0208", weight=700, italic=True)
    body(d, H * 0.6 + s * 1.2, c["message"], "Lora", 36, "#4A3A20", italic=True, w=0.72)
    d.text(0, H * 0.86, W, c["signature"].upper(), "Montserrat", 22, "#2D6A4F", weight=700, align="center", spacing=250)
    return {"layout": "concentric flower-carpet pookalam above an italic greeting, palm fronds at the base", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "marigold, saffron, crimson, leaf green", "decor": "vector pookalam, fronds"}


@design(4)
def holi(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    cols = ["#FF006E", "#FB5607", "#FFBE0B", "#3A86FF", "#8338EC", "#06D6A0"]
    for k, col in enumerate(cols):
        a = 2 * math.pi * k / len(cols)
        d.blob(W / 2 + W * 0.3 * math.cos(a), H * 0.44 + H * 0.3 * math.sin(a), 230, col, wobble=0.35, n=11, opacity=0.85, seed=k + 3)
    for k in range(120):
        r = d.rng
        a = r.random() * 2 * math.pi
        dist = W * (0.38 + r.random() * 0.2)
        d.circle(W / 2 + dist * math.cos(a), H * 0.44 + dist * math.sin(a), 3 + r.random() * 9, cols[k % 6], opacity=0.8)
    d.circle(W / 2, H * 0.44, 270, "#FFFFFF")
    t = d.text(0, H * 0.32, W, "Happy\nHoli", "Pacifico", 120, "#FF006E", align="center", lh=1.05)
    pill(d, W / 2, H * 0.92, c["message"], "Fredoka", 36, "#3A3A3A", "#FFFFFF", weight=600, spacing=0, upper=False)
    return {"layout": "ring of colour-powder bursts around a white disc with script greeting", "typography": "Pacifico, Fredoka", "palette": "magenta, orange, yellow, blue, violet, teal", "decor": "powder blobs, scattered dots"}


def kite(d, cx, cy, s, col1, col2, angle=0):
    pts = [(0, -s), (s * 0.7, 0), (0, s * 1.3), (-s * 0.7, 0)]
    ca, sa = math.cos(math.radians(angle)), math.sin(math.radians(angle))
    P = [(cx + x * ca - y * sa, cy + x * sa + y * ca) for x, y in pts]
    d.polygon([P[0], P[1], P[2]], col1)
    d.polygon([P[0], P[3], P[2]], col2)
    d.line(P[0][0], P[0][1], P[2][0], P[2][1], "rgba(0,0,0,0.25)", 1)
    tail = P[2]
    d.path([["M", *tail], ["Q", tail[0] + s * 0.5, tail[1] + s * 0.8, tail[0] - s * 0.2, tail[1] + s * 1.6]], fill="", stroke=col1, sw=1.5)
    return P[2]


@design(5)
def sankranti(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#7FD1F5", "#FFE6B0"))
    d.circle(W * 0.8, H * 0.16, 50, "#FFD23F")
    for (x, y, s, c1, c2, a) in [(0.25, 0.14, 46, "#E63946", "#FFB703", -15), (0.62, 0.24, 36, "#3A86FF", "#06D6A0", 10), (0.38, 0.36, 28, "#8338EC", "#FF006E", -5), (0.82, 0.4, 24, "#FB5607", "#FFBE0B", 18)]:
        kite(d, W * x, H * y, s, c1, c2, a)
    d.path([["M", W * 0.25, H * 0.14 + 60], ["Q", W * 0.1, H * 0.6, -10, H * 0.62]], fill="", stroke="#FFFFFF", sw=1)
    t, s = fitted(d, H * 0.56, "Happy\nMakar Sankranti", "Playfair Display", 42, "#7A1F1F", weight=700, italic=True, lh=1.05)
    body(d, H * 0.56 + t["_h"] + 14, c["message"], "Lora", 17, "#4A3020", italic=True, w=0.72)
    d.wave(-d.bleed, W + d.bleed, H * 0.9, 6, 120, fill="#F4A261", bottom=H + d.bleed)
    return {"layout": "sky of colourful vector kites with strings, italic greeting below", "typography": "Playfair Display italic, Lora italic", "palette": "sky blue to sand, kite brights", "decor": "kites, sun, wave"}


@design(6)
def rakhi(d, c):
    W, H = d.W, d.H
    d.bg("#FFF3E6")
    d.frame_border(16, "#E85D04", 1)
    y = H * 0.24
    d.path([["M", -d.bleed, y], ["Q", W * 0.25, y + 18, W / 2 - 50, y]], fill="", stroke="#D00070", sw=4)
    d.path([["M", W / 2 + 50, y], ["Q", W * 0.75, y + 18, W + d.bleed, y]], fill="", stroke="#D00070", sw=4)
    rangoli(d, W / 2, y, 62, ["#E85D04", "#FFB703", "#D00070"])
    for k in range(6):
        a = 2 * math.pi * k / 6
        d.circle(W / 2 + 74 * math.cos(a), y + 74 * math.sin(a), 6, "#FFB703")
    t, s = fitted(d, H * 0.4, "Happy\nRaksha Bandhan", "Great Vibes", 56, "#B5179E", lh=1.0)
    body(d, H * 0.4 + t["_h"] + 14, c["message"], "Lora", 16, "#4A2A20", italic=True, w=0.74, lh=1.45)
    d.text(0, H * 0.88, W, c["signature"], "Great Vibes", 30, "#E85D04", align="center")
    return {"layout": "vector rakhi thread across the top with a petal medallion, script greeting and note", "typography": "Great Vibes, Lora italic", "palette": "peach cream, magenta, saffron", "decor": "rakhi medallion, thread, frame"}


@design(7)
def mid_autumn(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#0D1B3E", "#26315F"))
    d.circle(W * 0.5, H * 0.3, 120, rad(120, 120, 120, [(0, "#FFF4C8"), (0.8, "#FFE08A"), (1, "#F5C04A")]), shadow_=shadow("rgba(255,224,138,0.6)", 60, 0, 0))
    for (x, y) in [(0.2, 0.1), (0.8, 0.12), (0.1, 0.38), (0.88, 0.4)]:
        d.sparkle(W * x, H * y, 8, "#FFE08A")
    for k, x in enumerate([0.16, 0.84]):
        d.line(W * x, -d.bleed, W * x, H * 0.18, "#C9A45A", 1.2)
        d.ellipse(W * x, H * 0.24, 30, 38, "#D62828")
        d.rect(W * x - 14, H * 0.18, 28, 6, "#C9A45A")
        d.rect(W * x - 14, H * 0.29, 28, 6, "#C9A45A")
    d.art("moon-cake", W / 2, H * 0.56, 100)
    t, s = fitted(d, H * 0.66, "Happy Mid-Autumn\nFestival", "Playfair Display", 40, "#FFE08A", weight=600, italic=True, lh=1.1)
    body(d, H * 0.66 + t["_h"] + 12, c["message"], "Lora", 15, "#DDE3F5", italic=True, w=0.74, lh=1.45)
    return {"layout": "glowing full moon, red lanterns either side, mooncake and gold italic greeting", "typography": "Playfair Display italic, Lora italic", "palette": "midnight blue, moon gold, lantern red", "decor": "moon glow, lanterns, sparkles"}


def menorah(d, cx, base, w, col, flame="#FFC300"):
    h = w * 0.55
    d.rect(cx - w * 0.18, base - 8, w * 0.36, 8, col, rx=3)
    d.rect(cx - 4, base - h, 8, h, col)
    for k in range(1, 5):
        r = w * 0.11 * k
        d.path([["M", cx - r, base - h * 1.0], ["Q", cx - r, base - h * 0.35, cx, base - h * 0.35], ["Q", cx + r, base - h * 0.35, cx + r, base - h]], fill="", stroke=col, sw=5)
    xs = [cx + w * 0.11 * k for k in range(-4, 5)]
    for k, x in enumerate(xs):
        top = base - h - (14 if k == 4 else 0)
        d.rect(x - 5, top - 26, 10, 26, "#FFFFFF")
        d.ellipse(x, top - 36, 5, 9, flame)


@design(8)
def hanukkah(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#0B2A5B", "#123B7A"))
    for k in range(30):
        r = d.rng
        d.sparkle(r.random() * W, r.random() * H * 0.4, 3 + r.random() * 4, "#BFD4FF")
    d.circle(W / 2, H * 0.3, 150, rad(150, 150, 150, [(0, "rgba(255,200,80,0.25)"), (1, "rgba(255,200,80,0)")]))
    menorah(d, W / 2, H * 0.44, W * 0.62, "#C9D6EA")
    t, s = fitted(d, H * 0.52, c["headline"], "Playfair Display", 52, "#FFFFFF", weight=600, italic=True)
    divider(d, W / 2, H * 0.52 + s * 1.3, 120, "#C9D6EA", 1)
    body(d, H * 0.52 + s * 1.45, c["message"], "Lora", 17, "#DDE6F5", italic=True, w=0.74)
    d.text(0, H * 0.88, W, c["signature"].upper(), "Montserrat", 11, "#C9D6EA", weight=700, align="center", spacing=300)
    return {"layout": "silver vector menorah with nine flames under a soft glow, italic greeting", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "royal blue, silver, candle gold", "decor": "menorah, sparkles, glow"}


@design(9)
def nowruz(d, c):
    W, H = d.W, d.H
    d.bg("#F3F7EE")
    d.circle(W / 2, H * 0.3, 130, "#E3EDD6")
    d.ellipse(W / 2, H * 0.4, 110, 22, "#C9D9B6")
    # goldfish bowl
    d.circle(W * 0.66, H * 0.33, 52, "rgba(160,210,240,0.5)", stroke="#8FB7D6", sw=2)
    d.art("tropical-fish", W * 0.66, H * 0.34, 50)
    d.art("seedling", W * 0.36, H * 0.3, 120)
    d.art("tulip", W * 0.5, H * 0.24, 90, angle=-6)
    d.art("egg", W * 0.24, H * 0.38, 46, angle=-20)
    t, s = fitted(d, H * 0.5, c["headline"], "Playfair Display", 52, "#2D6A4F", weight=700, italic=True)
    body(d, H * 0.5 + s * 1.3, c["message"], "Lora", 17, "#3A4A3A", italic=True, w=0.74, lh=1.45)
    for k in range(9):
        d.circle(W * 0.1 + k * W * 0.1, H * 0.9, 5, ["#E63946", "#F4A261", "#2A9D8F"][k % 3])
    return {"layout": "haft-sin table vignette: sprouts, tulip, painted egg and goldfish bowl, green italic greeting", "typography": "Playfair Display italic, Lora italic", "palette": "spring green, sage, coral", "decor": "goldfish bowl, dotted base"}


@design(10)
def communion(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.frame_border(20, "#C9A45A", 1, double=5)
    d.art("church", W / 2, H * 0.15, 90)
    d.art("dove", W * 0.7, H * 0.1, 50, angle=-10)
    t, s = fitted(d, H * 0.25, "First Holy\nCommunion", "Great Vibes", 58, "#B68A3A", lh=1.0)
    text_metal(d, t)
    y = inv_details(d, H * 0.25 + t["_h"] + 18, c, "#3A3A3A", "#8A6A2E", size=17)
    divider(d, W / 2, y + 10, 100, "#C9A45A", 1)
    d.text(0, y + 26, W, c["signature"], "Cormorant Garamond", 17, "#3A3A3A", italic=True, align="center")
    return {"layout": "church and dove above gold script, invitation details centred in a double frame", "typography": "Great Vibes gold, Cormorant Garamond, Montserrat caps", "palette": "white, gold, charcoal", "decor": "double frame, divider"}


@design(11)
def sunday_service(d, c):
    W, H = d.W, d.H
    d.bg(vgrad(H, "#FFE8C9", "#FFC2A1"))
    for k in range(14):
        a = math.radians(-90 + (k - 6.5) * 12)
        d.path([["M", W / 2, H * 0.42], ["L", W / 2 + 900 * math.cos(a - 0.03), H * 0.42 + 900 * math.sin(a - 0.03)], ["L", W / 2 + 900 * math.cos(a + 0.03), H * 0.42 + 900 * math.sin(a + 0.03)], ["Z"]], fill="rgba(255,255,255,0.25)")
    d.art("church", W / 2, H * 0.36, 300)
    t, s = fitted(d, H * 0.58, c["headline"], "Playfair Display", 130, "#5A2A1A", weight=600, italic=True)
    p = parts(c["message"])
    d.text(0, H * 0.58 + s * 1.2, W, p[0], "Lora", 40, "#5A2A1A", italic=True, align="center")
    d.text(0, H * 0.58 + s * 1.2 + 64, W, p[1], "Montserrat", 38, "#B5523B", weight=800, align="center", spacing=100)
    d.text(0, H * 0.92, W, c["signature"].upper(), "Montserrat", 26, "#5A2A1A", weight=700, align="center", spacing=300)
    return {"layout": "church on a sunrise burst, warm welcome headline and service times", "typography": "Playfair Display italic, Lora italic, Montserrat", "palette": "sunrise peach, cocoa, terracotta", "decor": "light rays"}


@design(12)
def griha_pravesh(d, c):
    W, H = d.W, d.H
    d.bg("#FFF8E7")
    # marigold toran
    for k in range(13):
        x = k * W / 12
        d.circle(x, 22 + 10 * math.sin(k * 0.9), 13, "#F48C06" if k % 2 else "#FFB703")
        d.circle(x, 22 + 10 * math.sin(k * 0.9), 6, "#E85D04")
    for k in range(6):
        x = W * (0.12 + k * 0.152)
        d.line(x, 30, x, 62 + (k % 2) * 16, "#2D6A4F", 2)
        d.leaf(x, 70 + (k % 2) * 16, 26, 10, 90, "#2D6A4F")
    d.art("house-with-garden", W / 2, H * 0.26, 110)
    d.art("diya-lamp", W * 0.25, H * 0.3, 44)
    d.art("diya-lamp", W * 0.75, H * 0.3, 44)
    t, s = fitted(d, H * 0.38, c["headline"], "Playfair Display", 46, "#9D0208", weight=700, italic=True)
    y = inv_details(d, H * 0.38 + s * 1.3, c, "#4A2A20", "#9D0208", fam="Lora", size=15)
    d.text(0, y + 14, W, c["signature"], "Great Vibes", 30, "#E85D04", align="center")
    return {"layout": "marigold-and-mango-leaf toran, house with diyas, invitation details", "typography": "Playfair Display italic, Lora italic, Montserrat caps, Great Vibes", "palette": "cream, marigold, crimson, leaf green", "decor": "toran garland, diyas"}


# ------------------------------------------------------------------ celebrations
@design(13)
def silver_anniv(d, c):
    W, H = d.W, d.H
    d.bg("#1E2430")
    d.frame_border(18, "#AEB6C2", 1)
    t = d.text(0, H * 0.1, W, "25", "Playfair Display", 170, "#E8EBEF", weight=700, align="center", lh=1.0)
    text_metal(d, t, SILVER)
    d.text(0, H * 0.2 + 120, W, "YEARS", "Montserrat", 18, "#C9CED6", weight=700, align="center", spacing=800)
    d.laurel(W / 2, H * 0.2, 110, "#AEB6C2", leaves=10, size=15, sweep=140)
    y = inv_details(d, H * 0.46, c, "#E8EBEF", "#AEB6C2", size=19)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 10.5, "#AEB6C2", weight=600, align="center", spacing=150)
    return {"layout": "silver 25 inside a laurel, invitation details, RSVP line", "typography": "Playfair Display silver, Cormorant Garamond italic, Montserrat caps", "palette": "slate, silver, white", "decor": "laurel, frame"}


@design(14)
def golden_anniv(d, c):
    W, H = d.W, d.H
    d.bg("#FFFBF2")
    d.texture("paper", 0.4)
    d.circle(W / 2, H * 0.28, 110, "", stroke=metal(220, 220), sw=4)
    t = d.text(0, H * 0.28 - 70, W, "50", "Playfair Display", 110, "#B68A3A", weight=700, align="center", lh=1.0)
    text_metal(d, t)
    for k in range(2):
        d.circle(W / 2 - 18 + 36 * k, H * 0.28 + 64, 16, "", stroke="#B68A3A", sw=3)
    t2, s = fitted(d, H * 0.5, "Golden Years", "Great Vibes", 66, "#8A6A2E")
    body(d, H * 0.5 + s * 1.2, c["message"], "Cormorant Garamond", 21, "#3A3020", italic=True, w=0.74, lh=1.35)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", 11, "#8A6A2E", weight=600, align="center", spacing=150)
    d.confetti(0, 0, W, H * 0.12, ["#E9C877", "#B68A3A"], n=24, size=(3, 7), shapes=("circle", "strip"))
    return {"layout": "gold 50 in a ring with interlinked bands, script title, warm note", "typography": "Playfair Display gold, Great Vibes, Cormorant Garamond italic", "palette": "ivory, antique gold", "decor": "ring, linked bands, gold confetti"}


@design(15)
def vow_renewal(d, c):
    W, H = d.W, d.H
    d.bg("#F5EDE3")
    d.rect(-d.bleed, H * 0.66, W + 2 * d.bleed, H * 0.34 + d.bleed, "#E9DCCB")
    d.wave(-d.bleed, W + d.bleed, H * 0.66, 6, 110, fill="#BFD7DF", bottom=H * 0.72)
    d.circle(W * 0.5, H * 0.66, 70, "#F7C59F", opacity=0.9)
    d.rect(-d.bleed, H * 0.66, W + 2 * d.bleed, 30, "#BFD7DF")
    t, s = fitted(d, H * 0.1, c["headline"], "Great Vibes", 90, "#7A4E3A")
    y = inv_details(d, H * 0.1 + s * 1.3, c, "#3A2A20", "#7A4E3A", size=19)
    d.text(0, H * 0.84, W, c["signature"].upper(), "Montserrat", 14, "#7A4E3A", weight=700, align="center", spacing=500)
    return {"layout": "script title and details above a minimal sunset-over-sea vignette", "typography": "Great Vibes, Cormorant Garamond italic, Montserrat caps", "palette": "sand, sea blue, sunset peach, cocoa", "decor": "sun, wave, sand band"}


@design(16)
def celebration_life(d, c):
    W, H = d.W, d.H
    d.bg("#F2F4F1")
    for k in range(9):
        d.leaf(W * 0.5 + (k - 4) * 22, H * 0.12 + abs(k - 4) * 6, 46, 14, -90 + (k - 4) * 14, "#7C9A82", opacity=0.8)
    d.text(0, H * 0.2, W, c["headline"].upper(), "Montserrat", 11, "#6A7A6E", weight=700, align="center", spacing=400)
    p = parts(c["message"])
    t = d.text(0, H * 0.25, W, p[0], "Cormorant Garamond", 46, "#2F3A33", weight=600, align="center")
    d.text(0, H * 0.25 + t["_h"] + 4, W, p[1], "Montserrat", 13, "#6A7A6E", weight=600, align="center", spacing=300)
    divider(d, W / 2, H * 0.42, 120, "#7C9A82", 1)
    body(d, H * 0.46, p[2], "Cormorant Garamond", 20, "#2F3A33", italic=True, w=0.7)
    y = H * 0.6
    for it in p[3:]:
        d.text(0, y, W, it.upper(), "Montserrat", 12, "#2F3A33", weight=700, align="center", spacing=250)
        y += 26
    d.art("dove", W / 2, H * 0.85, 60)
    return {"layout": "olive sprig crown, name and dates, gentle wording and gathering details", "typography": "Cormorant Garamond, Montserrat caps", "palette": "pale sage, olive, charcoal green", "decor": "leaf sprig, dove, divider"}


# ------------------------------------------------------------------ pets
@design(17)
def pet_bday(d, c):
    W, H = d.W, d.H
    d.bg("#FFE8D6")
    d.dots(0, 0, W, H, 34, 3, "rgba(255,138,101,0.25)")
    d.circle(W / 2, H * 0.26, 100, "#FFFFFF")
    d.art("dog-face", W / 2, H * 0.26, 150)
    d.art("party-popper", W * 0.78, H * 0.14, 60, angle=15)
    d.art("birthday-cake", W * 0.22, H * 0.36, 60)
    t, s = fitted(d, H * 0.43, c["headline"], "Luckiest Guy", 52, "#E76F51")
    y = inv_details(d, H * 0.43 + s * 1.3, c, "#3A2A20", "#E76F51", fam="Fredoka", size=17, first_italic=False)
    pill(d, W / 2, y + 26, c["signature"], "Fredoka", 15, "#FFFFFF", "#2A9D8F", weight=700, spacing=40, upper=False)
    d.art("paw-prints", W * 0.85, H * 0.9, 50, angle=-20)
    return {"layout": "dog face in a white circle with party props, bold title, details and a teal pill", "typography": "Luckiest Guy, Fredoka", "palette": "peach, coral, teal", "decor": "dot pattern, paw prints"}


@design(18)
def adopt_me(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4D6")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.12 + d.bleed, "#2A9D8F")
    d.text(0, H * 0.035, W, "FIND YOUR NEW BEST FRIEND", "Montserrat", 14, "#FFFFFF", weight=800, align="center", spacing=250)
    d.circle(W / 2, H * 0.36, 140, "#FFD166")
    d.art("cat-face", W / 2, H * 0.36, 200)
    t, s = fitted(d, H * 0.56, c["headline"], "Luckiest Guy", 80, "#E76F51")
    p = parts(c["message"])
    d.text(0, H * 0.56 + s * 1.15, W, p[0], "Fredoka", 30, "#2A2A2A", weight=700, align="center")
    d.text(0, H * 0.56 + s * 1.15 + 40, W, p[1], "Fredoka", 18, "#5A5A5A", weight=600, align="center")
    body(d, H * 0.56 + s * 1.15 + 70, p[2].capitalize(), "Fredoka", 16, "#3A3A3A", w=0.7)
    d.rect(W * 0.12, H * 0.86, W * 0.76, 54, "#2A9D8F", rx=27)
    d.text(W * 0.12, H * 0.86 + 15, W * 0.76, c["signature"], "Fredoka", 17, "#FFFFFF", weight=700, align="center")
    d.art("paw-prints", W * 0.12, H * 0.2, 40, angle=-20)
    d.art("paw-prints", W * 0.88, H * 0.5, 40, angle=20)
    return {"layout": "teal header strip, cat in a sunny circle, name, age, personality and contact button", "typography": "Luckiest Guy, Fredoka, Montserrat caps", "palette": "butter, coral, teal", "decor": "paw prints"}


@design(19)
def lost_cat(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.16 + d.bleed, "#D62828")
    t, s = fitted(d, H * 0.025, c["headline"], "Anton", 90, "#FFFFFF")
    d.rect(W * 0.12, H * 0.2, W * 0.76, H * 0.36, "#F1F1F1", stroke="#D0D0D0", sw=1.5, rx=6)
    d.art("cat-face", W / 2, H * 0.36, 150)
    d.text(W * 0.12, H * 0.5, W * 0.76, "Replace with a clear photo", "Montserrat", 10, "#9A9A9A", weight=600, align="center")
    p = parts(c["message"])
    d.text(0, H * 0.6, W, p[0], "Anton", 46, "#1E1E1E", align="center")
    d.text(0, H * 0.6 + 62, W, f"{p[1].capitalize()}  ·  {p[2]}", "Montserrat", 15, "#3A3A3A", weight=600, align="center")
    body(d, H * 0.6 + 96, p[3].capitalize(), "Montserrat", 14, "#3A3A3A", w=0.8)
    d.rect(W * 0.08, H * 0.82, W * 0.84, 70, "#FFD60A", rx=8)
    d.text(W * 0.08, H * 0.82 + 20, W * 0.84, c["signature"].upper(), "Anton", 26, "#1E1E1E", align="center")
    d.text(0, H * 0.94, W, "REWARD OFFERED · PLEASE CHECK GARAGES AND SHEDS", "Montserrat", 9.5, "#D62828", weight=800, align="center", spacing=150)
    return {"layout": "red alert header, photo slot, name and description, yellow call bar", "typography": "Anton, Montserrat", "palette": "alert red, white, yellow, black", "decor": "photo placeholder"}


# ------------------------------------------------------------------ awareness days
@design(20)
def womens_day(d, c):
    W, H = d.W, d.H
    d.bg("#5B2A86")
    for k, col in enumerate(["#9B5DE5", "#F15BB5", "#FEE440"]):
        d.circle(W * (0.15 + k * 0.35), H * 0.92 + (k % 2) * 40, 220 - k * 30, col, opacity=0.85)
    d.art("tulip", W * 0.86, H * 0.12, 140, angle=12)
    t, s = fitted(d, H * 0.1, "Happy\nWomen’s Day", "Playfair Display", 120, "#FFFFFF", weight=700, italic=True, w=0.76, align="left", x=80, lh=1.0)
    d.text(80, H * 0.1 + t["_h"] + 80, W * 0.78, c["message"], "Lora", 42, "#F3E8FF", italic=True, lh=1.35)
    d.text(80, H * 0.1 + t["_h"] + 24, 300, c["signature"].upper(), "Montserrat", 24, "#FEE440", weight=800, spacing=300)
    return {"layout": "big italic greeting, the toast quote, colour circles rising at the bottom", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "violet, pink, lemon", "decor": "overlapping circles, tulip"}


@design(21)
def earth_day(d, c):
    W, H = d.W, d.H
    d.bg("#E8F4EA")
    d.circle(W / 2, H * 0.44, 300, "#3A86FF")
    for (x, y, r, s) in [(0.42, 0.36, 120, 3), (0.6, 0.5, 100, 5), (0.45, 0.56, 70, 8), (0.62, 0.3, 60, 11)]:
        d.blob(W * x, H * y, r, "#06A77D", wobble=0.3, n=9, seed=s)
    d.circle(W / 2, H * 0.44, 300, "", stroke="#FFFFFF", sw=10)
    for k in range(5):
        d.leaf(W / 2 - 330 + k * 20, H * 0.6 - k * 40, 90, 30, -50 - k * 10, "#2D6A4F")
        d.leaf(W / 2 + 330 - k * 20, H * 0.6 - k * 40, 90, 30, -130 + k * 10, "#2D6A4F")
    t, s = fitted(d, H * 0.78, c["headline"], "Fredoka", 120, "#1B4332", weight=700)
    p = parts(c["message"])
    d.text(0, H * 0.78 + s * 1.15, W, f"{p[0]}  ·  {p[1]}", "Fredoka", 40, "#2D6A4F", weight=600, align="center")
    return {"layout": "flat globe cradled by leaves, rounded headline and slogan", "typography": "Fredoka", "palette": "mint, ocean blue, leaf green", "decor": "globe with blob continents, leaves"}


def pink_ribbon(d, cx, cy, s, col="#F06292", dark="#C2185B"):
    d.path([["M", cx - s * 0.1, cy + s * 0.1], ["L", cx - s * 0.55, cy + s * 1.1], ["L", cx - s * 0.32, cy + s * 1.18], ["L", cx + s * 0.05, cy + s * 0.32], ["Z"]], fill=dark)
    d.path([["M", cx, cy - s * 0.85], ["C", cx - s * 0.5, cy - s * 0.85, cx - s * 0.5, cy - s * 0.1, cx + s * 0.1, cy + s * 0.25], ["L", cx + s * 0.55, cy + s * 1.1], ["L", cx + s * 0.32, cy + s * 1.18],
            ["L", cx - s * 0.08, cy + s * 0.38], ["C", cx - s * 0.75, cy - s * 0.05, cx - s * 0.7, cy - s * 1.05, cx, cy - s * 1.05], ["C", cx + s * 0.7, cy - s * 1.05, cx + s * 0.75, cy - s * 0.05, cx + s * 0.08, cy + s * 0.38],
            ["L", cx - s * 0.06, cy + s * 0.2], ["C", cx + s * 0.5, cy - s * 0.1, cx + s * 0.5, cy - s * 0.85, cx, cy - s * 0.85], ["Z"]], fill=col, fill_rule="nonzero")


@design(22)
def pink_ribbon_post(d, c):
    W, H = d.W, d.H
    d.bg("#FFE4EC")
    d.circle(W / 2, H * 0.32, 210, "#FFFFFF")
    pink_ribbon(d, W / 2, H * 0.3, 150)
    t, s = fitted(d, H * 0.58, c["headline"], "Playfair Display", 130, "#C2185B", weight=700, italic=True)
    p = parts(c["message"])
    d.text(W * 0.1, H * 0.58 + s * 1.2, W * 0.8, p[0], "Lora", 36, "#4A2030", italic=True, align="center")
    d.text(0, H * 0.58 + s * 1.2 + 110, W, p[1].upper(), "Montserrat", 28, "#C2185B", weight=800, align="center", spacing=150)
    pill(d, W / 2, H * 0.92, c["signature"], "Montserrat", 28, "#FFFFFF", "#C2185B", spacing=150)
    return {"layout": "vector pink ribbon in a white disc, italic call to action and screening pill", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "blush, rose, berry", "decor": "awareness ribbon"}


@design(23)
def mental_health(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#D7F0E9"), (1, "#E6E3FA")]))
    d.blob(W * 0.15, H * 0.15, 200, "rgba(255,255,255,0.6)", seed=2)
    d.blob(W * 0.9, H * 0.85, 240, "rgba(255,255,255,0.6)", seed=6)
    d.art("brain", W * 0.78, H * 0.2, 170, angle=8)
    d.art("seedling", W * 0.18, H * 0.78, 130)
    t, s = fitted(d, H * 0.32, "It’s okay\nnot to be okay", "Playfair Display", 110, "#2F3E46", weight=600, italic=True, lh=1.05)
    p = parts(c["message"])
    d.text(0, H * 0.32 + t["_h"] + 40, W, p[0].upper(), "Montserrat", 28, "#52796F", weight=800, align="center", spacing=250)
    d.text(0, H * 0.32 + t["_h"] + 84, W, p[1], "Montserrat", 26, "#52796F", weight=600, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "DM Sans", 30, "#2F3E46", "#FFFFFF", weight=700, spacing=40, upper=False)
    return {"layout": "calm pastel gradient with soft blobs, gentle italic message and a kind prompt", "typography": "Playfair Display italic, Montserrat, DM Sans", "palette": "mint, lavender, slate", "decor": "blobs, brain and seedling illustrations"}


@design(24)
def book_day(d, c):
    W, H = d.W, d.H
    d.bg("#1D3557")
    cols = ["#E63946", "#F1FAEE", "#A8DADC", "#FFB703", "#457B9D", "#F4A261", "#E76F51", "#2A9D8F"]
    x = 90
    for k in range(12):
        w = 46 + (k * 17) % 30
        h = 260 + (k * 53) % 120
        d.rect(x, H * 0.6 - h, w, h, cols[k % len(cols)], rx=4)
        d.rect(x + 8, H * 0.6 - h + 26, w - 16, 6, "rgba(0,0,0,0.15)")
        x += w + 8
        if x > W - 140:
            break
    d.rect(60, H * 0.6, W - 120, 18, "#8D5A3B", rx=4)
    d.art("open-book", W * 0.78, H * 0.2, 170, angle=-8)
    t, s = fitted(d, H * 0.68, c["headline"], "Playfair Display", 120, "#F1FAEE", weight=700, italic=True)
    p = parts(c["message"])
    d.text(0, H * 0.68 + s * 1.2, W, p[0], "Lora", 42, "#A8DADC", italic=True, align="center")
    d.text(0, H * 0.68 + s * 1.2 + 70, W, p[1].upper(), "Montserrat", 28, "#FFB703", weight=800, align="center", spacing=300)
    return {"layout": "shelf of colourful vector book spines, open book and italic title", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "navy, cream, coral, mustard", "decor": "book spines, shelf"}


@design(25)
def labour_day(d, c):
    W, H = d.W, d.H
    d.bg("#FFC300")
    d.stripes(-d.bleed, H * 0.86, W + d.bleed, H + d.bleed, 40, 40, "#1E1E1E", angle_deg=-45)
    d.art("hammer-and-wrench", W * 0.8, H * 0.22, 220)
    d.text(80, 90, W * 0.6, c["signature"].upper(), "Montserrat", 30, "#1E1E1E", weight=800, spacing=400)
    t = d.text(80, 140, W * 0.62, "HAPPY\nLABOUR\nDAY", "Anton", 160, "#1E1E1E", lh=0.92)
    d.text(80, 140 + t["_h"] + 30, W - 160, c["message"], "Montserrat", 38, "#1E1E1E", weight=600, lh=1.35)
    return {"layout": "safety-yellow ground, stacked condensed title, thank-you line, hazard-stripe base", "typography": "Anton, Montserrat", "palette": "safety yellow, black", "decor": "hazard stripes, tools"}


@design(26)
def smile_day(d, c):
    W, H = d.W, d.H
    d.bg("#FFE15D")
    for k in range(16):
        a = 2 * math.pi * k / 16
        d.path([["M", W / 2, H * 0.4], ["L", W / 2 + 900 * math.cos(a - 0.09), H * 0.4 + 900 * math.sin(a - 0.09)], ["L", W / 2 + 900 * math.cos(a + 0.09), H * 0.4 + 900 * math.sin(a + 0.09)], ["Z"]], fill="#FFD23F")
    d.art("smiling-face-with-smiling-eyes", W / 2, H * 0.38, 420, shadow_=shadow("rgba(0,0,0,0.15)", 30, 0, 14))
    t, s = fitted(d, H * 0.64, c["headline"], "Luckiest Guy", 180, "#FF5D8F")
    p = parts(c["message"])
    d.text(0, H * 0.64 + s * 1.1, W, f"{p[0]} — {p[1]}", "Fredoka", 44, "#3A2A10", weight=700, align="center")
    return {"layout": "big smiley on a sunburst, bouncy title and a pass-it-on line", "typography": "Luckiest Guy, Fredoka", "palette": "sunshine yellow, pink, cocoa", "decor": "sunburst rays"}


# ------------------------------------------------------------------ everyday
@design(27)
def sorry(d, c):
    W, H = d.W, d.H
    d.bg("#EAF2F8")
    d.circle(W / 2, H * 0.28, 90, "#FFFFFF")
    d.art("hot-beverage", W / 2, H * 0.27, 120)
    d.heart(W * 0.68, H * 0.16, 24, "#F28482", angle=15)
    t, s = fitted(d, H * 0.45, c["headline"], "Pacifico", 64, "#3D5A80")
    body(d, H * 0.45 + s * 1.4, c["message"], "Lora", 18, "#2A3A4A", italic=True, w=0.74, lh=1.5)
    d.text(0, H * 0.76, W, "xx", "Caveat", 36, "#F28482", weight=700, align="center")
    return {"layout": "coffee cup in a white circle with a little heart, script apology and note", "typography": "Pacifico, Lora italic, Caveat", "palette": "powder blue, navy, coral", "decor": "circle, heart"}


@design(28)
def welcome_home(d, c):
    W, H = d.W, d.H
    d.bg("#FFF7EC")
    d.bunting(-d.bleed, W + d.bleed, 10, 40, ["#E63946", "#FFB703", "#2A9D8F", "#3A86FF", "#F15BB5"], flags=22, fh=50)
    d.balloon(W * 0.08, H * 0.6, 60, "#E63946")
    d.balloon(W * 0.92, H * 0.58, 60, "#3A86FF")
    d.balloon(W * 0.85, H * 0.66, 48, "#FFB703")
    d.text(0, H * 0.24, W, c["headline"], "Pacifico", 140, "#E63946", align="center")
    d.text(0, H * 0.76, W, c["message"].upper(), "Montserrat", 30, "#2A3A4A", weight=800, align="center", spacing=500)
    return {"layout": "wide banner with bunting, balloons either side and a script welcome", "typography": "Pacifico, Montserrat caps", "palette": "cream, red, mustard, teal, blue", "decor": "bunting, balloons"}


@design(29)
def garage_sale(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.4, "#FFD60A")
    t, s = fitted(d, H * 0.05, "GARAGE\nSALE", "Anton", 118, "#1E1E1E", lh=0.9)
    d.rect(W * 0.25, H * 0.4 - 30, W * 0.5, 60, "#1E1E1E", rx=30)
    p = parts(c["message"])
    d.text(W * 0.25, H * 0.4 - 16, W * 0.5, p[-1].upper(), "Montserrat", 15, "#FFD60A", weight=800, align="center", spacing=100)
    items = p[:-1]
    arts = ["couch-and-lamp", "teddy-bear", "books", "dress"]
    for k, (it, a) in enumerate(zip(items, arts)):
        cx = W * (0.14 + k * 0.24)
        d.circle(cx, H * 0.56, 46, "#F4F4F4")
        d.art(a, cx, H * 0.56, 60)
        d.text(cx - 60, H * 0.56 + 54, 120, it.capitalize(), "Montserrat", 13, "#1E1E1E", weight=700, align="center")
    d.text(0, H * 0.72, W, "Everything must go!", "Caveat", 40, "#E63946", weight=700, align="center")
    d.art("round-pushpin", W * 0.2, H * 0.86, 36)
    d.text(W * 0.25, H * 0.845, W * 0.7, c["signature"], "Montserrat", 15, "#1E1E1E", weight=700)
    return {"layout": "yellow top with condensed title and time pill, four item icons, address line", "typography": "Anton, Montserrat, Caveat", "palette": "yellow, black, red", "decor": "item icons in circles"}


@design(30)
def teachers_day(d, c):
    W, H = d.W, d.H
    d.bg("#8D5A3B")
    d.rect(40, 40, W - 80, H - 80, "#2F4F3E", rx=10)
    d.texture("grain", 0.35)
    d.art("red-apple", W * 0.82, H * 0.76, 170, angle=10)
    d.art("pencil", W * 0.2, H * 0.84, 140, angle=-30)
    t, s = fitted(d, H * 0.14, "Happy\nTeacher’s Day", "Caveat", 150, "#FFFFFF", weight=700, lh=1.0)
    d.line(W * 0.3, H * 0.14 + t["_h"] + 10, W * 0.7, H * 0.14 + t["_h"] + 6, "rgba(255,255,255,0.7)", 3)
    body(d, H * 0.14 + t["_h"] + 40, c["message"], "Caveat", 50, "#F1F1E6", w=0.72, lh=1.3)
    d.text(0, H * 0.7, W, "— " + c["signature"], "Caveat", 46, "#FFD166", weight=700, align="center")
    return {"layout": "chalkboard in a wooden frame with hand-lettered greeting, apple and pencil", "typography": "Caveat chalk lettering", "palette": "chalkboard green, wood, chalk white, apple red", "decor": "grain, apple, pencil"}
