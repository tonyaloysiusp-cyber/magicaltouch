"""Collection 500 — Seasonal and holiday designs (seasonal-001 … seasonal-050)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT, parse_d, transform_path
from common import GOLD, SILVER, ROSE_GOLD, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body

CATEGORY = "Seasonal and holiday designs"
SITE_CATEGORY = "Festivals"
TAG = "seasonal"

C = 480, 673
A5 = 559, 794
L = 673, 480
SQ = 1080, 1080
ST = 1080, 1920
PO = 1080, 1350

SPEC = [
    ("Ramadan", "Ramadan Kareem Lantern Post", *SQ, "Ramadan Kareem", "Wishing you a blessed month of peace and reflection.", "From the Al Noor family", "ramadan kareem lantern gold navy post", "ramadan kareem, lantern, gold"),
    ("Ramadan", "Ramadan Mubarak Arch Story", *ST, "Ramadan Mubarak", "May this holy month bring light to your home.", "", "ramadan mubarak arch story elegant", "ramadan story, arch, crescent"),
    ("Ramadan", "Iftar Invitation Card", *A5, "Iftar Gathering", "Join us to break our fast together · Friday 26 February 2027 · at Maghrib · Villa 22, Jumeirah 3", "RSVP to Mariam", "iftar invitation card elegant", "iftar invitation, ramadan"),
    ("Ramadan", "Ramadan Timetable Poster", *PO, "Ramadan 1448", "Suhoor 4:45 AM · Iftar 6:32 PM · Taraweeh 8:15 PM", "Times for Dubai · week 1", "ramadan timetable poster mosque", "ramadan timetable, prayer times, poster"),
    ("Ramadan", "Ramadan Sale Promo Post", *SQ, "Ramadan Offers", "Up to 30% off · Open until 2 AM", "Shop the collection", "ramadan sale offer instagram post", "ramadan sale, offer, promotion"),
    ("Eid", "Eid Mubarak Gold Crescent Post", *SQ, "Eid Mubarak", "Wishing you and your loved ones joy, peace and prosperity.", "", "eid mubarak gold crescent instagram", "eid mubarak, gold, crescent"),
    ("Eid", "Eid al-Fitr Greeting Card", *C, "Eid Mubarak", "May Allah accept your fasts and prayers. Eid Mubarak to you and your family.", "With love, the Haddad family", "eid al fitr greeting card pastel", "eid card, eid al fitr"),
    ("Eid", "Eid Lanterns Story", *ST, "Eid Mubarak", "Happy Eid from all of us", "@noor.boutique", "eid mubarak lanterns story", "eid story, lanterns"),
    ("Eid", "Eid Kids Party Invitation", *C, "Eid Party!", "Games, sweets & henna for the little ones · Day 2 of Eid · 4 PM · Grandma’s house", "Bring your Eidiya!", "eid party invitation kids", "eid party invitation, kids"),
    ("Eid", "Eid al-Adha Mubarak Card", *A5, "Eid al-Adha Mubarak", "May this blessed Eid bring happiness, peace and togetherness.", "Taqabbal Allahu minna wa minkum", "eid al adha mubarak card", "eid al adha, greeting card"),
    ("Eid", "Eid al-Adha Geometric Post", *SQ, "Eid al-Adha", "Blessings and peace to you and your family", "", "eid al adha geometric islamic pattern post", "eid al adha post, islamic pattern"),
    ("Eid", "Eid Holiday Hours Post", *SQ, "Eid Holiday Hours", "We will be closed · 16–19 March · Back on Saturday 20 March", "Eid Mubarak from our team", "eid holiday closing hours post", "eid holiday hours, closed, business"),
    ("UAE National Day", "Flag Band National Day Post", *SQ, "Happy National Day", "Proud of our nation · 2 December", "", "uae national day flag post", "uae national day, flag, 2 december"),
    ("UAE National Day", "Union Day Story", *ST, "Eid Al Etihad", "Celebrating 56 years of union", "2 December 2027", "uae eid al etihad story", "eid al etihad, uae, national day story"),
    ("UAE National Day", "National Day Event Poster", *PO, "National Day Celebration", "Heritage village · folk dance · fireworks · Friday 2 December · 5 PM", "Free entry · all welcome", "national day celebration event poster uae", "national day event, poster"),
    ("Diwali", "Happy Diwali Diya Post", *SQ, "Happy Diwali", "May the light of the diyas fill your life with joy and prosperity.", "", "happy diwali diya rangoli post", "diwali, diya, rangoli"),
    ("Diwali", "Diwali Party Invitation", *C, "Diwali Night", "Join us for sweets, sparklers & dinner · Saturday 30 October 2027 · 7 PM · The Patel home", "Ethnic wear encouraged", "diwali party invitation gold", "diwali invitation, party"),
    ("Diwali", "Diwali Rangoli Story", *ST, "Shubh Deepavali", "Wishing you light, love and laughter", "", "diwali rangoli instagram story", "diwali story, rangoli"),
    ("Christmas", "Merry Christmas Tree Card", *C, "Merry Christmas", "Wishing you a season full of light and laughter.", "Love, the Thomas family", "merry christmas tree card modern", "christmas card, tree"),
    ("Christmas", "Mulled Drinks Christmas Party Invitation", *A5, "Christmas Party", "Mulled drinks, carols & a secret Santa · Friday 17 December · 7 PM · The Office Rooftop", "Ugly sweaters welcome", "christmas party invitation festive", "christmas party invitation"),
    ("Christmas", "Season’s Greetings Corporate Card", *L, "Season’s Greetings", "Thank you for a wonderful year. Wishing you joy this holiday season.", "From all of us at Crescent Consulting", "seasons greetings corporate card elegant", "season's greetings, corporate card"),
    ("Christmas", "Red Holiday Sale Post", *SQ, "Holiday Sale", "Up to 50% off gifts · This weekend only", "", "christmas sale instagram post red", "christmas sale, holiday promotion"),
    ("Christmas", "Snowy Christmas Story", *ST, "Let it snow", "Merry Christmas & happy holidays", "", "snowy christmas instagram story", "christmas story, snow"),
    ("Christmas", "Gingerbread Cookie Card", *C, "Sweet holidays", "Baked with love — happy holidays!", "— Maya", "gingerbread christmas card cute", "christmas card, gingerbread, cute"),
    ("New Year", "Happy New Year 2027 Post", *SQ, "Happy New Year", "2027", "", "happy new year 2027 gold fireworks post", "new year 2027, fireworks, gold"),
    ("New Year", "Mirror Ball New Year’s Eve Invitation", *A5, "New Year’s Eve", "Countdown party · 31 December · 9 PM till late · Skyview Rooftop, Downtown", "Dress to sparkle", "new years eve party invitation black gold", "new year's eve invitation, party"),
    ("New Year", "New Year Resolutions Story", *ST, "2027 goals", "read more · travel somewhere new · drink more water · call home often · say yes", "", "new year resolutions story list", "new year resolutions, goals, story"),
    ("New Year", "New Year Countdown Post", *SQ, "3 days to go", "until we say hello to 2027", "", "new year countdown post", "new year countdown"),
    ("New Year", "Lunar New Year Card", *C, "Happy Lunar New Year", "Wishing you prosperity, health and good fortune.", "— the Chen family", "lunar new year card red gold", "lunar new year, chinese new year card"),
    ("Valentine’s Day", "Valentine’s Day Sale Post", *SQ, "Valentine’s Sale", "Gifts for your someone special · 20% off", "Ends 14 February", "valentines day sale post pink", "valentine's sale, promotion"),
    ("Valentine’s Day", "Valentine’s Dinner Menu", 374, 794, "Valentine’s Dinner", "Rose & beetroot salad · Lobster tagliatelle · Chocolate fondant for two", "14 February · La Rosa", "valentines dinner menu", "valentine's menu, restaurant"),
    ("Valentine’s Day", "Valentine Love Story", *ST, "Happy Valentine’s Day", "to the one who has my heart", "", "valentines day instagram story hearts", "valentine's story"),
    ("Mother’s Day", "Mother’s Day Floral Card", *C, "Happy Mother’s Day", "Thank you for your endless love and the warmest hugs.", "Love always, Lina", "mothers day floral card", "mother's day card, floral"),
    ("Mother’s Day", "Mother’s Day Brunch Post", *SQ, "Mother’s Day Brunch", "Sunday 21 March · 12–4 PM · Free flowers for every mum", "Book a table", "mothers day brunch restaurant post", "mother's day brunch, restaurant"),
    ("Mother’s Day", "Best Mum Ever Card", *C, "Best mum ever", "Officially certified by your favourite child.", "— Omar", "best mum ever card funny", "mother's day, best mum"),
    ("Father’s Day", "Father’s Day Card", *C, "Happy Father’s Day", "To my hero, my coach and my biggest fan.", "Love, Sara", "fathers day card modern", "father's day card"),
    ("Father’s Day", "Father’s Day Sale Post", *SQ, "Father’s Day Gifts", "Watches, wallets & more · 15% off", "", "fathers day sale post", "father's day sale"),
    ("Easter", "Happy Easter Card", *C, "Happy Easter", "Wishing you a season of new beginnings.", "— the Morgan family", "happy easter card pastel eggs", "easter card, eggs, bunny"),
    ("Easter", "Easter Egg Hunt Poster", *PO, "Easter Egg Hunt", "Saturday 27 March · 10 AM · Community Park · ages 3–10", "Bring a basket!", "easter egg hunt poster kids", "easter egg hunt, poster"),
    ("Halloween", "Haunted Villa Halloween Party Invitation", *C, "Halloween Party", "Costumes, candy & spooky games · Saturday 30 October · 6 PM · The Haunted Villa, Arabian Ranches", "Come in costume!", "halloween party invitation", "halloween party invitation"),
    ("Halloween", "Happy Halloween Post", *SQ, "Happy Halloween", "Trick or treat!", "", "happy halloween instagram post pumpkins", "halloween post, pumpkins"),
    ("Halloween", "Halloween Kids Story", *ST, "Boo!", "Happy Halloween from our little monsters", "", "halloween kids cute story", "halloween story, kids"),
    ("Autumn", "Thanksgiving Dinner Invitation", *C, "Thanksgiving Dinner", "Join us for food, family & gratitude · Thursday 25 November · 6 PM", "Bring your appetite", "thanksgiving dinner invitation autumn", "thanksgiving invitation, autumn"),
    ("Autumn", "Hello Autumn Post", *SQ, "Hello autumn", "Cosy days, warm drinks and golden leaves.", "", "hello autumn instagram post leaves", "autumn post, leaves"),
    ("Back to School", "Back to School Sale Post", *SQ, "Back to School", "Stationery, bags & more · 25% off", "Shop now", "back to school sale post", "back to school, sale"),
    ("Back to School", "First Day of School Sign", *PO, "My first day of", "Kindergarten", "Name: Adam · Age: 4 · I want to be: an astronaut", "first day of school sign printable", "first day of school, sign"),
    ("Summer", "Summer Sale Post", *SQ, "Summer Sale", "Up to 40% off · Beachwear & more", "", "summer sale post tropical", "summer sale, tropical"),
    ("Summer", "Hello Summer Story", *ST, "Hello, summer!", "Sun, sea and slow days", "", "hello summer story beach", "summer story, beach"),
    ("Summer", "Summer Camp Poster", *PO, "Summer Camp", "Ages 6–12 · July & August · Sports, art, science & swimming", "Register at camp@funzone.ae", "summer camp poster kids", "summer camp poster, kids"),
    ("Winter", "Winter Wonderland Card", *C, "Winter wonderland", "Warm wishes for a cosy season.", "— Noor", "winter wonderland card snowflakes", "winter card, snowflakes"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def fanous(d, cx, top, h, body_col="#E9C877", glass="#FFE7A8", glow=True):
    """Vector Ramadan lantern hanging from a chain at x = cx."""
    w = h * 0.42
    if glow:
        d.circle(cx, top + h * 0.55, h * 0.55, rad(h * 0.55, h * 0.55, h * 0.55, [(0, rgba(glass, 0.45)), (1, rgba(glass, 0))]))
    d.line(cx, top - h * 0.6, cx, top, body_col, max(1, h * 0.012))
    d.circle(cx, top + h * 0.02, h * 0.03, "", stroke=body_col, sw=max(1, h * 0.012))
    d.polygon([(cx - w * 0.2, top + h * 0.12), (cx + w * 0.2, top + h * 0.12), (cx + w * 0.5, top + h * 0.26), (cx - w * 0.5, top + h * 0.26)], body_col)
    d.path([["M", cx - w * 0.2, top + h * 0.12], ["Q", cx, top - h * 0.02, cx + w * 0.2, top + h * 0.12], ["Z"]], fill=body_col)
    d.rect(cx - w * 0.42, top + h * 0.26, w * 0.84, h * 0.46, glass, rx=w * 0.06, name="Lantern glass")
    d.rect(cx - w * 0.42, top + h * 0.26, w * 0.84, h * 0.46, "", rx=w * 0.06, stroke=body_col, sw=max(1, h * 0.02))
    for k in (-1, 0, 1):
        d.line(cx + k * w * 0.21, top + h * 0.26, cx + k * w * 0.21, top + h * 0.72, body_col, max(1, h * 0.012))
    d.path([["M", cx - w * 0.3, top + h * 0.4], ["Q", cx, top + h * 0.28, cx + w * 0.3, top + h * 0.4]], fill="", stroke=body_col, sw=max(1, h * 0.01))
    d.polygon([(cx - w * 0.5, top + h * 0.72), (cx + w * 0.5, top + h * 0.72), (cx + w * 0.22, top + h * 0.84), (cx - w * 0.22, top + h * 0.84)], body_col)
    d.polygon([(cx - w * 0.1, top + h * 0.84), (cx + w * 0.1, top + h * 0.84), (cx, top + h * 0.96)], body_col)


def crescent(d, cx, cy, r, fill, bg):
    d.circle(cx, cy, r, fill, name="Crescent")
    d.circle(cx + r * 0.38, cy - r * 0.18, r * 0.86, bg, name="Crescent cut")


def islamic_star_pattern(d, x0, y0, x1, y1, s, color, sw=1, opacity=1):
    path = []
    y = y0
    while y < y1 + s:
        x = x0
        while x < x1 + s:
            cx, cy = x, y
            for rot in (0, 45):
                pts = []
                for k in range(4):
                    a = math.radians(rot + k * 90)
                    pts.append((cx + s * 0.38 * math.cos(a), cy + s * 0.38 * math.sin(a)))
                path += [["M", *pts[0]]] + [["L", *p] for p in pts[1:]] + [["Z"]]
            x += s
        y += s
    d.path(path, fill="", stroke=color, sw=sw, opacity=opacity, join="miter", name="Islamic pattern")


def uae_flag(d, x, y, w, h):
    d.rect(x, y, w * 0.25, h, "#E0001B")
    d.rect(x + w * 0.25, y, w * 0.75, h / 3, "#00843D")
    d.rect(x + w * 0.25, y + h / 3, w * 0.75, h / 3, "#FFFFFF")
    d.rect(x + w * 0.25, y + 2 * h / 3, w * 0.75, h / 3, "#000000")


def fireworks(d, cx, cy, r, color, n=18, sw=3):
    path = []
    for k in range(n):
        a = 2 * math.pi * k / n
        path += [["M", cx + r * 0.3 * math.cos(a), cy + r * 0.3 * math.sin(a)], ["L", cx + r * math.cos(a), cy + r * math.sin(a)]]
    d.path(path, fill="", stroke=color, sw=sw, name="Firework")
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        d.circle(cx + r * 1.12 * math.cos(a), cy + r * 1.12 * math.sin(a), sw * 0.9, color)


def snow(d, n, x0, y0, x1, y1, color="#FFFFFF", rmin=1.5, rmax=5):
    for _ in range(n):
        d.circle(d.rng.uniform(x0, x1), d.rng.uniform(y0, y1), d.rng.uniform(rmin, rmax), color, opacity=d.rng.uniform(0.5, 1))


def tree(d, cx, base, h, color="#1F6E43", star="#FFD54F"):
    w = h * 0.62
    for k in range(3):
        t = k / 3
        yb = base - h * 0.28 * k
        ww = w * (1 - t * 0.28)
        d.polygon([(cx - ww / 2, yb), (cx + ww / 2, yb), (cx, yb - h * 0.42)], mix(color, "#000000", 0.08 * (2 - k)))
    d.rect(cx - h * 0.05, base, h * 0.1, h * 0.1, "#7B4A2A")
    d.star(cx, base - h * 0.98, h * 0.08, star)
    for _ in range(9):
        t = d.rng.uniform(0.1, 0.9)
        y = base - h * 0.95 * t
        half = w * (1 - t) * 0.42
        d.circle(cx + d.rng.uniform(-half, half), y, h * 0.022, d.rng.choice(["#E53935", "#FFD54F", "#FFFFFF", "#4FC3F7"]))


def promo_post(d, c, bg, accent, fg, art_names, head_font="Anton", sticker="SALE"):
    W, H = d.W, d.H
    d.bg(bg)
    for k, (nm, x, y, s_, a) in enumerate(art_names):
        d.art(nm, W * x, H * y, W * s_, angle=a, shadow_=shadow("rgba(0,0,0,0.18)", 20, 0, 8))
    t, s = fitted(d, H * 0.36, c["headline"].upper(), head_font, 200, fg, w=0.84)
    import re
    p = lines(c["message"])
    m = re.search(r"\d+%", c["message"])
    if m:
        d.circle(W * 0.78, H * 0.22, 110, accent, shadow_=shadow("rgba(0,0,0,0.2)", 20, 0, 8))
        d.text(W * 0.78 - 100, H * 0.22 - 52, 200, m.group(0), "Anton", 76, "#FFFFFF", align="center")
        d.text(W * 0.78 - 100, H * 0.22 + 30, 200, "OFF", "Montserrat", 28, "#FFFFFF", weight=800, align="center", spacing=300)
    d.text(0, H * 0.36 + s * 1.15, W, " · ".join(p[1:]) if len(p) > 1 else p[0], "Montserrat", 40, fg, weight=600, align="center", spacing=120)
    if c["signature"]:
        pill(d, W / 2, H * 0.86, c["signature"], "Montserrat", 32, bg if isinstance(bg, str) else "#FFFFFF", fg, spacing=200)


# ---------------------------------------------------------------- Ramadan
@design(1)
def ramadan_lantern(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#1B2A55"), (1, "#0A1129")]))
    islamic_star_pattern(d, 0, 0, W, H, 120, "#C9A45A", 1, 0.12)
    for x, top, h in [(0.2, 0.12, 300), (0.5, 0.06, 380), (0.8, 0.14, 280)]:
        fanous(d, W * x, H * top, h)
    crescent(d, W * 0.86, H * 0.08, 46, "#F3D58A", "#121D40")
    t, s = fitted(d, H * 0.6, "Ramadan Kareem", "Great Vibes", 200, "#E9C877")
    text_metal(d, t)
    body(d, H * 0.6 + s * 1.3, c["message"], "Cormorant Garamond", 50, "#E7E2D2", italic=True)
    d.text(0, H * 0.93, W, c["signature"], "Cinzel", 30, "#C9A45A", weight=600, align="center", spacing=200)
    return {"layout": "three glowing lanterns hanging over a gold script greeting", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "midnight navy, lantern gold, warm glass", "decor": "vector fanous lanterns with glow, crescent, faint eight-point star pattern"}


@design(2)
def ramadan_arch_story(d, c):
    W, H = d.W, d.H
    d.bg("#F6EFE3")
    aw, ah = W * 0.76, H * 0.72
    ax, ay = (W - aw) / 2, H * 0.1
    d.path([["M", ax, ay + ah], ["L", ax, ay + aw * 0.42], ["Q", ax, ay + aw * 0.1, W / 2, ay], ["Q", ax + aw, ay + aw * 0.1, ax + aw, ay + aw * 0.42], ["L", ax + aw, ay + ah], ["Z"]], fill="#123C3A", name="Arch")
    islamic_star_pattern(d, ax + 30, ay + aw * 0.4, ax + aw - 30, ay + ah - 30, 90, "#C9A45A", 1, 0.25)
    crescent(d, W / 2, ay + aw * 0.28, 90, "#E9C877", "#123C3A")
    fanous(d, W * 0.3, ay + aw * 0.2, 260, glow=True)
    fanous(d, W * 0.7, ay + aw * 0.24, 220, glow=True)
    t, s = fitted(d, ay + ah * 0.6, "Ramadan\nMubarak", "Great Vibes", 220, "#E9C877", w=0.66, lh=1.0)
    text_metal(d, t)
    body(d, ay + ah + 60, c["message"], "Cormorant Garamond", 58, "#3A2E20", italic=True, w=0.8)
    return {"layout": "deep teal pointed arch with crescent and lanterns, greeting inside, wish below", "typography": "Great Vibes gold, Cormorant Garamond italic", "palette": "cream, deep teal, gold", "decor": "arch, star pattern, crescent, lanterns"}


@design(3)
def iftar_invite(d, c):
    W, H = d.W, d.H
    d.bg("#0F2E2C")
    islamic_star_pattern(d, 0, 0, W, H, 80, "#C9A45A", 0.8, 0.15)
    d.rect(W * 0.08, H * 0.06, W * 0.84, H * 0.88, "#FBF6EC", rx=12, name="Card")
    d.rect(W * 0.1, H * 0.075, W * 0.8, H * 0.85, "", rx=10, stroke="#C9A45A", sw=1.2)
    fanous(d, W * 0.5, H * 0.13, 150, body_col="#C9A45A", glow=False)
    t, s = fitted(d, H * 0.35, "Iftar Gathering", "Great Vibes", 80, "#8A6A2E", w=0.7)
    p = lines(c["message"])
    body(d, H * 0.35 + s * 1.3, p[0], "Lora", W * 0.036, "#3E3020", italic=True, w=0.66)
    divider(d, W / 2, H * 0.56, W * 0.3, "#C9A45A", 1, gap=7)
    d.text(W * 0.14, H * 0.59, W * 0.72, "\n".join(p[1:]), "Cinzel", W * 0.032, "#2E2416", weight=600, align="center", lh=1.6, spacing=60)
    d.art("crescent-moon", W * 0.5, H * 0.82, W * 0.08)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.022, "#8A6A2E", weight=600, align="center", spacing=240, upper=True)
    return {"layout": "cream invitation card framed on a teal geometric pattern, lantern at the top", "typography": "Great Vibes, Lora italic, Cinzel, Montserrat caps", "palette": "deep teal, cream, gold", "decor": "star pattern, inner gold frame, lantern, crescent"}


@design(4)
def ramadan_timetable(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#2B1B4A"), (1, "#0E0A20")]))
    d.art("mosque", W * 0.5, H * 0.2, W * 0.36)
    crescent(d, W * 0.84, H * 0.08, 50, "#F3D58A", "#291A47")
    t, s = fitted(d, H * 0.34, "Ramadan 1448", "Cinzel", 90, "#E9C877", weight=700)
    text_metal(d, t)
    rows = lines(c["message"])
    icons = ["sunrise", "fork-and-knife-with-plate", "mosque"]
    y = H * 0.46
    for k, r in enumerate(rows):
        name, tm = r.rsplit(" ", 2)[0], " ".join(r.rsplit(" ", 2)[1:])
        d.rect(W * 0.1, y, W * 0.8, 130, "rgba(255,255,255,0.07)", rx=24, stroke="rgba(233,200,119,0.4)", sw=1.5)
        d.art(icons[k], W * 0.18, y + 65, 80)
        d.text(W * 0.26, y + 36, W * 0.4, name.upper(), "Cinzel", 44, "#F3E6CB", weight=700, spacing=120)
        d.text(W * 0.55, y + 30, W * 0.32, tm, "Montserrat", 54, "#E9C877", weight=700, align="right")
        y += 160
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 30, "#B9AEDB", weight=600, align="center", spacing=240, upper=True)
    return {"layout": "mosque and crescent header, three time rows in outlined panels", "typography": "Cinzel gold, Montserrat", "palette": "royal purple, gold, ivory", "decor": "mosque, crescent, icon rows"}


@design(5)
def ramadan_sale(d, c):
    W, H = d.W, d.H
    d.bg("#123C3A")
    islamic_star_pattern(d, 0, 0, W, H, 110, "#E9C877", 1.2, 0.12)
    fanous(d, W * 0.16, H * 0.06, 260)
    fanous(d, W * 0.86, H * 0.1, 220)
    t, s = fitted(d, H * 0.36, "Ramadan Offers", "Great Vibes", 200, "#E9C877", w=0.7)
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.36 + s * 1.3, W, p[0].upper(), "Anton", 110, "#FFFFFF", align="center")
    d.text(0, H * 0.36 + s * 1.3 + 140, W, p[1], "Montserrat", 40, "#F3E6CB", weight=600, align="center", spacing=200, upper=True)
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 32, "#123C3A", "#E9C877", spacing=200)
    return {"layout": "lanterns either side of a gold script title, big offer line and button", "typography": "Great Vibes gold, Anton, Montserrat caps", "palette": "deep teal, gold, white", "decor": "star pattern, lanterns, CTA pill"}


# ---------------------------------------------------------------- Eid
@design(6)
def eid_gold_post(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.4, W * 0.8, [(0, "#FBF4E4"), (1, "#EADBB9")]))
    islamic_star_pattern(d, 0, 0, W, H, 100, "#C9A45A", 1, 0.2)
    d.circle(W / 2, H * 0.34, 210, metal(420, 420), name="Crescent")
    d.circle(W / 2 + 80, H * 0.34 - 36, 182, "#F6EEDB", name="Crescent cut")
    d.star(W / 2 + 60, H * 0.3, 40, "#C9A45A", points=8, inner=0.6)
    t, s = fitted(d, H * 0.6, "Eid Mubarak", "Great Vibes", 220, "#8A6A2E")
    text_metal(d, t)
    body(d, H * 0.6 + s * 1.3, c["message"], "Cormorant Garamond", 50, "#4A3A22", italic=True)
    return {"layout": "gold crescent and eight-point star above a gold script greeting", "typography": "Great Vibes gold, Cormorant Garamond italic", "palette": "parchment, gold, walnut", "decor": "geometric pattern, gold crescent, star"}


@design(7)
def eid_fitr_card(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FDF1F3"), (1, "#EEE6F8")]))
    for x, top, h, col in [(0.22, 0.0, 170, "#E9A6B8"), (0.5, 0.02, 220, "#C9A45A"), (0.78, 0.0, 170, "#B9A6E2")]:
        fanous(d, W * x, H * top + 60, h, body_col=col, glass="#FFF3D6")
    t, s = fitted(d, H * 0.5, "Eid Mubarak", "Great Vibes", 110, "#9C4F78")
    body(d, H * 0.5 + s * 1.3, c["message"], "Lora", W * 0.038, "#5A4A68", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#9C4F78", weight=700, align="center", spacing=200, upper=True)
    return {"layout": "three pastel lanterns hanging over a script greeting", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "blush to lilac, gold, plum", "decor": "pastel lanterns"}


@design(8)
def eid_lantern_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0B1838"), (1, "#26205A")]))
    for _ in range(60):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.6, 2.4), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    for x, top, h in [(0.15, 0.0, 380), (0.4, 0.04, 300), (0.62, 0.0, 420), (0.86, 0.05, 320)]:
        fanous(d, W * x, H * top + 200, h)
    crescent(d, W * 0.5, H * 0.08, 60, "#F3D58A", "#0E1B3D")
    t, s = fitted(d, H * 0.56, "Eid Mubarak", "Great Vibes", 240, "#E9C877")
    text_metal(d, t)
    body(d, H * 0.56 + s * 1.3, c["message"], "Cormorant Garamond", 66, "#E7E2D2", italic=True)
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 32, "#0B1838", "#E9C877", spacing=60, upper=False)
    return {"layout": "row of glowing lanterns under a crescent, gold script in the night sky", "typography": "Great Vibes gold, Cormorant Garamond italic", "palette": "night navy, gold glow", "decor": "stars, four lanterns, crescent, handle pill"}


@design(9)
def eid_kids_party(d, c):
    W, H = d.W, d.H
    d.bg("#FFF1D6")
    d.bunting(-10, W + 10, 10, 30, ["#FF6B6B", "#FFD45C", "#4FC3F7", "#8BC34A", "#B388FF"], flags=11, fh=36)
    fanous(d, W * 0.18, H * 0.22, 120, body_col="#FF6B6B", glass="#FFF3D6", glow=False)
    fanous(d, W * 0.82, H * 0.2, 120, body_col="#4FC3F7", glass="#FFF3D6", glow=False)
    d.art("candy", W * 0.5, H * 0.24, W * 0.22)
    t, s = fitted(d, H * 0.38, "Eid Party!", "Luckiest Guy", 90, "#E2572A")
    p = lines(c["message"])
    body(d, H * 0.38 + s * 1.3, p[0], "Fredoka", W * 0.042, "#3A2A20", weight=600)
    d.rect(W * 0.12, H * 0.64, W * 0.76, H * 0.16, "#FFFFFF", rx=18)
    d.text(W * 0.12, H * 0.66, W * 0.76, "\n".join(p[1:]), "Fredoka", W * 0.036, "#3A2A20", weight=500, align="center", lh=1.35)
    d.text(0, H * 0.87, W, c["signature"], "Caveat", W * 0.06, "#E2572A", weight=700, align="center")
    return {"layout": "bunting and colourful lanterns around a bold party title, details card", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "cream, tomato, sky, sunshine", "decor": "bunting, lanterns, candy"}


@design(10)
def eid_adha_card(d, c):
    W, H = d.W, d.H
    d.bg("#F7F2E8")
    d.texture("paper", 0.4)
    d.frame_border(W * 0.05, "#2F6B5A", 1.2, double=7)
    d.art("mosque", W * 0.5, H * 0.22, W * 0.36)
    crescent(d, W * 0.72, H * 0.1, 26, "#C9A45A", "#F7F2E8")
    t, s = fitted(d, H * 0.38, "Eid al-Adha\nMubarak", "Great Vibes", 100, "#2F6B5A", lh=1.0)
    body(d, H * 0.38 + s * 2.4, c["message"], "Lora", W * 0.04, "#3E4A42", italic=True)
    d.text(0, H * 0.86, W, c["signature"], "Cinzel", W * 0.028, "#8A6A2E", weight=600, align="center", spacing=80)
    return {"layout": "framed card with mosque and crescent above a two-line script greeting", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "ivory, emerald, gold", "decor": "double frame, mosque, crescent, paper grain"}


@design(11)
def eid_adha_geometric(d, c):
    W, H = d.W, d.H
    d.bg("#0F4C5C")
    islamic_star_pattern(d, 0, 0, W, H, 90, "#E9C877", 1.5, 0.3)
    d.circle(W / 2, H / 2, W * 0.36, "#0F4C5C", stroke="#E9C877", sw=4)
    d.circle(W / 2, H / 2, W * 0.33, "", stroke="#E9C877", sw=1.5)
    t, s = fitted(d, H * 0.38, "Eid al-Adha", "Great Vibes", 160, "#E9C877", w=0.56)
    text_metal(d, t)
    body(d, H * 0.38 + s * 1.3, c["message"], "Cormorant Garamond", 46, "#F3E6CB", italic=True, w=0.5)
    return {"layout": "teal medallion ringed in gold over a full eight-point star pattern", "typography": "Great Vibes gold, Cormorant Garamond italic", "palette": "teal, gold, cream", "decor": "geometric pattern, double ring medallion"}


@design(12)
def eid_hours(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6EC")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.36 + d.bleed, "#123C3A")
    fanous(d, W * 0.2, H * 0.02, 220)
    fanous(d, W * 0.8, H * 0.04, 190)
    t, s = fitted(d, H * 0.12, "Eid Holiday Hours", "Playfair Display", 90, "#E9C877", w=0.56, weight=700, italic=True)
    p = lines(c["message"])
    d.text(0, H * 0.44, W, p[0].upper(), "Anton", 110, "#123C3A", align="center")
    d.text(0, H * 0.44 + 140, W, p[1], "Montserrat", 64, "#2E2416", weight=700, align="center")
    d.line(W * 0.3, H * 0.44 + 250, W * 0.7, H * 0.44 + 250, "#C9A45A", 2)
    d.text(0, H * 0.44 + 280, W, p[2], "Lora", 46, "#4A3A22", italic=True, align="center")
    d.text(0, H * 0.88, W, c["signature"], "Great Vibes", 70, "#8A6A2E", align="center")
    return {"layout": "teal header with lanterns, big closed dates and reopening line", "typography": "Playfair Display italic, Anton, Montserrat, Lora, Great Vibes", "palette": "teal, cream, gold", "decor": "header band, lanterns, gold rule"}


# ---------------------------------------------------------------- UAE National Day
@design(13)
def uae_flag_post(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    uae_flag(d, -d.bleed, H * 0.66, W + 2 * d.bleed, H * 0.34 + d.bleed)
    for x, y, r, col in [(0.2, 0.2, 90, "#00843D"), (0.8, 0.16, 110, "#E0001B"), (0.5, 0.1, 70, "#C9A45A")]:
        fireworks(d, W * x, H * y, r, col, sw=4)
    t, s = fitted(d, H * 0.3, "Happy\nNational Day", "Playfair Display", 130, "#111111", weight=800, lh=1.0)
    d.text(0, H * 0.3 + s * 2.35, W, c["message"].upper(), "Montserrat", 34, "#00843D", weight=700, align="center", spacing=260)
    return {"layout": "flag colours across the bottom, fireworks above a bold two-line greeting", "typography": "Playfair Display ExtraBold, Montserrat caps", "palette": "UAE red, green, white, black, gold", "decor": "flag band, vector fireworks"}


@design(14)
def union_day_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0B1A2E"), (1, "#16334F")]))
    for x, y, r, col in [(0.2, 0.12, 140, "#E0001B"), (0.78, 0.1, 170, "#00A651"), (0.5, 0.24, 120, "#FFFFFF"), (0.86, 0.32, 100, "#C9A45A"), (0.15, 0.34, 90, "#C9A45A")]:
        fireworks(d, W * x, H * y, r, col, sw=5)
    d.art("cityscape", W / 2, H * 0.5, W * 0.5)
    uae_flag(d, W * 0.36, H * 0.63, W * 0.28, W * 0.14)
    t, s = fitted(d, H * 0.74, "Eid Al Etihad", "Playfair Display", 150, "#FFFFFF", weight=700, italic=True)
    d.text(0, H * 0.74 + s * 1.35, W, c["message"], "Montserrat", 46, "#E9C877", weight=600, align="center")
    d.text(0, H * 0.92, W, c["signature"].upper(), "Montserrat", 32, "#FFFFFF", weight=700, align="center", spacing=300)
    return {"layout": "fireworks over a city skyline, flag and greeting below", "typography": "Playfair Display italic, Montserrat", "palette": "night blue, flag colours, gold", "decor": "five vector fireworks, skyline, flag"}


@design(15)
def national_day_event(d, c):
    W, H = d.W, d.H
    d.bg("#F6EFE2")
    uae_flag(d, -d.bleed, -d.bleed, W + 2 * d.bleed, 60)
    d.text(60, 120, W - 120, "2 DECEMBER", "Montserrat", 40, "#E0001B", weight=800, spacing=400)
    t = d.text(60, 180, W - 120, "National Day\nCelebration", "Playfair Display", d.fit("Celebration", W - 120, "Playfair Display", 170, 800), "#111111", weight=800, lh=0.95)
    items = lines(c["message"])
    y = 180 + t["_h"] + 50
    for it, nm in zip(items[:3], ["house-with-garden", "performing-arts", "fireworks"]):
        d.art(nm, 110, y + 40, 90)
        d.text(180, y + 12, W - 240, it.capitalize(), "Montserrat", 50, "#111111", weight=700)
        y += 120
    d.rect(60, y + 20, W - 120, 150, "#00843D", rx=20)
    d.text(60, y + 50, W - 120, " · ".join(items[3:]), "Montserrat", 44, "#FFFFFF", weight=700, align="center", lh=1.3)
    d.text(60, H - 110, W - 120, c["signature"].upper(), "Montserrat", 32, "#00843D", weight=700, spacing=300)
    return {"layout": "flag strip header, big headline, icon list and green date bar", "typography": "Playfair Display ExtraBold, Montserrat", "palette": "sand, black, flag colours", "decor": "flag strip, icon list, date bar"}


# ---------------------------------------------------------------- Diwali
def rangoli(d, cx, cy, R, cols):
    for k, col in enumerate(cols):
        r = R * (1 - k * 0.22)
        n = 8 + k * 4
        for i in range(n):
            a = 2 * math.pi * i / n + k * 0.2
            d.leaf(cx + r * 0.25 * math.cos(a), cy + r * 0.25 * math.sin(a), r * 0.75, r * 0.2, math.degrees(a), col)
    d.circle(cx, cy, R * 0.16, cols[-1])
    d.circle(cx, cy, R * 0.08, "#FFFFFF")


@design(16)
def diwali_diya(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.6, W * 0.9, [(0, "#5A1A3A"), (1, "#1E0718")]))
    rangoli(d, W / 2, H * 0.36, W * 0.3, ["#E85D04", "#F48C06", "#FAA307", "#D00070", "#7209B7"])
    for x in (0.2, 0.5, 0.8):
        d.circle(W * x, H * 0.64, 70, rad(70, 70, 70, [(0, "rgba(255,190,80,0.6)"), (1, "rgba(255,190,80,0)")]))
        d.art("diya-lamp", W * x, H * 0.66, 130)
    t, s = fitted(d, H * 0.74, "Happy Diwali", "Great Vibes", 130, "#FFD27A")
    text_metal(d, t)
    body(d, H * 0.74 + s * 1.2, c["message"], "Cormorant Garamond", 36, "#F7E6D8", italic=True, w=0.86, lh=1.3)
    return {"layout": "vector rangoli flower above a row of glowing diyas and a gold greeting", "typography": "Great Vibes gold, Cormorant Garamond italic", "palette": "plum night, saffron, marigold, magenta", "decor": "petal rangoli, diya glows"}


@design(17)
def diwali_invite(d, c):
    W, H = d.W, d.H
    d.bg("#2A0B2E")
    d.frame_border(W * 0.05, "#E9C877", 1.2, double=6)
    rangoli(d, W / 2, H * 0.2, W * 0.22, ["#E85D04", "#FAA307", "#D00070", "#7209B7"])
    t, s = fitted(d, H * 0.38, "Diwali Night", "Great Vibes", 100, "#E9C877")
    text_metal(d, t)
    p = lines(c["message"])
    body(d, H * 0.38 + s * 1.3, p[0], "Lora", W * 0.038, "#F7E6D8", italic=True)
    d.text(W * 0.12, H * 0.62, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#F3E6CB", weight=600, align="center", lh=1.6, spacing=60)
    for x in (0.25, 0.5, 0.75):
        d.art("diya-lamp", W * x, H * 0.84, W * 0.12)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.022, "#E9C877", weight=600, align="center", spacing=200, upper=True)
    return {"layout": "rangoli crest, gold script title, details and a row of diyas", "typography": "Great Vibes gold, Lora italic, Cinzel, Montserrat caps", "palette": "aubergine, gold, saffron", "decor": "rangoli, double frame, diyas"}


@design(18)
def diwali_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FF7B00"), (0.5, "#D00070"), (1, "#3C096C")]))
    rangoli(d, W / 2, H * 0.3, W * 0.38, ["#FFD60A", "#FFFFFF", "#FFC300", "#FF006E", "#3A0CA3"])
    t, s = fitted(d, H * 0.58, "Shubh\nDeepavali", "Great Vibes", 240, "#FFFFFF", lh=1.0)
    body(d, H * 0.58 + s * 2.2, c["message"], "Cormorant Garamond", 60, "#FFF1D6", italic=True)
    for x in (0.2, 0.5, 0.8):
        d.art("diya-lamp", W * x, H * 0.95, 130)
    return {"layout": "big rangoli on a saffron-to-violet sky, two-line script greeting", "typography": "Great Vibes, Cormorant Garamond italic", "palette": "saffron, magenta, violet, gold", "decor": "rangoli, diyas"}


# ---------------------------------------------------------------- Christmas
@design(19)
def xmas_tree_card(d, c):
    W, H = d.W, d.H
    d.bg("#F6F1E8")
    d.texture("paper", 0.4)
    tree(d, W / 2, H * 0.52, H * 0.4)
    snow(d, 40, 0, 0, W, H * 0.6, "#C8D6E2", 1.5, 4)
    t, s = fitted(d, H * 0.62, "Merry Christmas", "Great Vibes", 90, "#B3261E")
    body(d, H * 0.62 + s * 1.3, c["message"], "Lora", W * 0.038, "#2F3B32", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.024, "#1F6E43", weight=700, align="center", spacing=220, upper=True)
    return {"layout": "layered vector tree with baubles and snow, script greeting below", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "paper white, pine green, berry red, gold", "decor": "vector tree, star, baubles, snow dots"}


@design(20)
def xmas_party(d, c):
    W, H = d.W, d.H
    d.bg("#14402F")
    snow(d, 70, 0, 0, W, H)
    d.art("christmas-tree", W * 0.22, H * 0.22, W * 0.3)
    d.art("wrapped-gift", W * 0.8, H * 0.24, W * 0.22)
    d.art("bell", W * 0.52, H * 0.12, W * 0.14)
    t, s = fitted(d, H * 0.38, "Christmas Party", "Great Vibes", 100, "#F3D58A")
    text_metal(d, t)
    p = lines(c["message"])
    body(d, H * 0.38 + s * 1.3, p[0], "Lora", W * 0.038, "#F1EDE4", italic=True)
    d.rect(W * 0.12, H * 0.62, W * 0.76, H * 0.2, "rgba(255,255,255,0.08)", rx=16, stroke="#F3D58A", sw=1)
    d.text(W * 0.12, H * 0.64, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#FFFFFF", weight=600, align="center", lh=1.6, spacing=60)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", W * 0.022, "#14402F", "#F3D58A", spacing=120, upper=False)
    return {"layout": "snowy green invite with tree, gift and bell, details panel", "typography": "Great Vibes gold, Lora italic, Cinzel", "palette": "pine green, gold, snow white", "decor": "snow dots, festive illustrations, outlined panel"}


@design(21)
def seasons_greetings(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F2")
    d.rect(-d.bleed, -d.bleed, W * 0.36 + d.bleed, H + 2 * d.bleed, "#7A1C2B")
    snow(d, 40, 0, 0, W * 0.36, H)
    d.art("snowflake", W * 0.18, H * 0.5, W * 0.18)
    x0 = W * 0.42
    t = d.text(x0, H * 0.18, W * 0.52, "Season’s\nGreetings", "Playfair Display", d.fit("Greetings", W * 0.5, "Playfair Display", 80, 600, True), "#7A1C2B", weight=600, italic=True, lh=1.0)
    d.line(x0, H * 0.18 + t["_h"] + 16, x0 + 60, H * 0.18 + t["_h"] + 16, "#C9A45A", 2)
    d.text(x0, H * 0.18 + t["_h"] + 34, W * 0.5, c["message"], "Lora", W * 0.03, "#3E3A36", lh=1.55)
    d.text(x0, H * 0.84, W * 0.52, c["signature"], "Montserrat", W * 0.018, "#7A1C2B", weight=700, spacing=200, upper=True)
    return {"layout": "corporate split card: burgundy snowy panel left, greeting right", "typography": "Playfair Display italic, Lora, Montserrat caps", "palette": "warm white, burgundy, gold", "decor": "snow dots, snowflake, gold rule"}


@design(22)
def xmas_sale(d, c):
    W, H = d.W, d.H
    d.bg("#C62828")
    snow(d, 60, 0, 0, W, H)
    d.art("wrapped-gift", W * 0.18, H * 0.78, W * 0.28, angle=-8)
    d.art("christmas-tree", W * 0.84, H * 0.76, W * 0.26)
    t, s = fitted(d, H * 0.12, "HOLIDAY\nSALE", "Anton", 300, "#FFFFFF", w=0.8, lh=0.9)
    p = lines(c["message"])
    d.rect(W * 0.2, H * 0.12 + s * 2.0, W * 0.6, 130, "#FFFFFF", rx=65)
    d.text(W * 0.2, H * 0.12 + s * 2.0 + 30, W * 0.6, p[0].upper(), "Montserrat", 50, "#C62828", weight=800, align="center")
    d.text(0, H * 0.12 + s * 2.0 + 160, W, p[1], "Montserrat", 38, "#FFE7E7", weight=600, align="center", spacing=160)
    return {"layout": "huge condensed sale title on red with gift and tree in the corners", "typography": "Anton, Montserrat", "palette": "Christmas red, white", "decor": "snow, gift and tree illustrations, offer pill"}


@design(23)
def let_it_snow(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#9CC3E6"), (1, "#E8F2FB")]))
    snow(d, 140, 0, 0, W, H, "#FFFFFF", 2, 8)
    d.wave(-d.bleed, W + d.bleed, H * 0.78, 24, 300, fill="#FFFFFF", bottom=H + d.bleed)
    d.art("snowman", W * 0.5, H * 0.66, W * 0.46)
    d.art("evergreen-tree", W * 0.16, H * 0.7, W * 0.26)
    d.art("evergreen-tree", W * 0.86, H * 0.72, W * 0.22)
    t, s = fitted(d, H * 0.12, "Let it snow", "Great Vibes", 240, "#1F3B5C")
    body(d, H * 0.12 + s * 1.3, c["message"], "Montserrat", 44, "#1F3B5C", weight=600)
    return {"layout": "snowy hill scene with snowman and trees, script headline in the sky", "typography": "Great Vibes, Montserrat", "palette": "winter blue, snow white, navy", "decor": "140 snowflakes, snow drift, snowman and tree illustrations"}


@design(24)
def gingerbread(d, c):
    W, H = d.W, d.H
    d.bg("#F3E3CF")
    gw = W * 0.5
    cx, cy = W / 2, H * 0.32
    col = "#B5713C"
    d.circle(cx, cy - gw * 0.42, gw * 0.2, col)
    d.rect(cx - gw * 0.22, cy - gw * 0.26, gw * 0.44, gw * 0.62, col, rx=gw * 0.16)
    for sgn in (-1, 1):
        d.rect(cx + sgn * gw * 0.3, cy - gw * 0.14, gw * 0.36, gw * 0.15, col, rx=gw * 0.07, origin_center=True, angle=sgn * 25)
        d.rect(cx + sgn * gw * 0.13, cy + gw * 0.42, gw * 0.15, gw * 0.36, col, rx=gw * 0.07, origin_center=True, angle=sgn * -12)
    icing = "#FFFFFF"
    for k in range(3):
        d.circle(cx, cy - gw * 0.12 + k * gw * 0.14, gw * 0.025, "#E53935")
    d.circle(cx - gw * 0.07, cy - gw * 0.46, gw * 0.022, "#3A2A20")
    d.circle(cx + gw * 0.07, cy - gw * 0.46, gw * 0.022, "#3A2A20")
    d.path([["M", cx - gw * 0.07, cy - gw * 0.37], ["Q", cx, cy - gw * 0.32, cx + gw * 0.07, cy - gw * 0.37]], fill="", stroke=icing, sw=3)
    for sgn in (-1, 1):
        d.path([["M", cx + sgn * gw * 0.38, cy - gw * 0.2], ["L", cx + sgn * gw * 0.44, cy - gw * 0.1]], fill="", stroke=icing, sw=3, dash=[4, 4])
    d.art("cookie", W * 0.16, H * 0.18, W * 0.14)
    d.art("hot-beverage", W * 0.84, H * 0.48, W * 0.14)
    t, s = fitted(d, H * 0.6, "Sweet holidays", "Pacifico", 80, "#8C4A1E")
    body(d, H * 0.6 + s * 1.6, c["message"], "Fredoka", W * 0.042, "#6B3A1E", weight=500)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.06, "#C0392B", weight=700, align="center")
    return {"layout": "vector gingerbread figure with icing details, cookie and cocoa around", "typography": "Pacifico, Fredoka, Caveat", "palette": "biscuit, ginger brown, icing white, berry red", "decor": "vector gingerbread, cookie and cocoa illustrations"}


# ---------------------------------------------------------------- New Year
@design(25)
def ny_2027_post(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.4, W, [(0, "#1E1A2E"), (1, "#07060C")]))
    for x, y, r in [(0.2, 0.18, 120), (0.8, 0.14, 150), (0.5, 0.08, 90), (0.88, 0.5, 80), (0.12, 0.52, 70)]:
        fireworks(d, W * x, H * y, r, d.rng.choice(["#E9C877", "#F7E3A3", "#FFFFFF"]), sw=4)
    t, s = fitted(d, H * 0.3, "2027", "Playfair Display", 400, "#E9C877", w=0.8, weight=800)
    text_metal(d, t)
    d.text(0, H * 0.3 + s * 1.05, W, "Happy New Year", "Great Vibes", 130, "#FFFFFF", align="center")
    d.confetti(0, H * 0.82, W, H, ["#E9C877", "#FFFFFF"], n=30, size=(4, 10), shapes=("strip", "circle"))
    return {"layout": "gold 2027 surrounded by fireworks, script greeting below", "typography": "Playfair Display ExtraBold gold, Great Vibes", "palette": "black, gold, white", "decor": "vector fireworks, confetti"}


@design(26)
def nye_invite(d, c):
    W, H = d.W, d.H
    d.bg("#0B0B0C")
    d.frame_border(W * 0.05, "#C9A45A", 1.2, double=6)
    d.art("mirror-ball", W * 0.5, H * 0.16, W * 0.26)
    d.art("clinking-glasses", W * 0.2, H * 0.84, W * 0.14)
    d.art("bottle-with-popping-cork", W * 0.8, H * 0.84, W * 0.14, angle=-15)
    t, s = fitted(d, H * 0.32, "New Year’s Eve", "Great Vibes", 100, "#E9C877")
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.32 + s * 1.3, W, p[0].upper(), "Cinzel", W * 0.04, "#F3E6CB", weight=700, align="center", spacing=200)
    divider(d, W / 2, H * 0.53, W * 0.36, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.56, W * 0.76, "\n".join(p[1:]), "Cormorant Garamond", W * 0.045, "#F3E6CB", weight=500, align="center", lh=1.45)
    d.text(0, H * 0.74, W, c["signature"], "Montserrat", W * 0.022, "#C9A45A", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "mirror ball above a gold script title, framed details, champagne at the foot", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond", "palette": "black, gold, champagne", "decor": "double frame, mirror ball, glasses and bottle"}


@design(27)
def ny_goals_story(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE6")
    d.rect(90, 260, W - 180, H - 520, "#FFFFFF", rx=30, shadow_=shadow("rgba(0,0,0,0.08)", 30, 0, 10))
    t, s = fitted(d, 330, "2027 goals", "Playfair Display", 150, "#1F2A44", weight=700, italic=True)
    y = 330 + s * 1.5
    for k, it in enumerate(lines(c["message"])):
        d.circle(190, y + 34, 26, "", stroke="#1F2A44", sw=3)
        d.text(250, y, W - 400, it, "Caveat", 70, "#1F2A44", weight=600)
        d.line(250, y + 90, W - 170, y + 90, "#E5DED3", 2)
        y += 160
    d.art("sparkles", W - 170, 300, 120)
    d.art("spiral-calendar", 200, 180, 140, angle=-10)
    return {"layout": "checklist card of resolutions with round tick boxes", "typography": "Playfair Display italic, Caveat", "palette": "oat, white card, navy", "decor": "card shadow, calendar and sparkles illustrations"}


@design(28)
def ny_countdown(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#2B1055"), (1, "#7597DE")]))
    for _ in range(50):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.6, 2), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    t = d.text(0, H * 0.14, W, "3", "Playfair Display", 480, "#FFFFFF", weight=800, align="center", lh=0.9)
    t["fill"] = lin(0, 0, 0, t["_h"], [(0, "#FFFFFF"), (1, "#C9D6FF")])
    d.text(0, H * 0.58, W, "DAYS TO GO", "Montserrat", 60, "#FFFFFF", weight=800, align="center", spacing=500)
    d.text(0, H * 0.68, W, c["message"], "Great Vibes", 90, "#FFE9A8", align="center")
    d.art("hourglass-not-done", W * 0.86, H * 0.86, 140, angle=10)
    return {"layout": "giant countdown digit on a twilight gradient", "typography": "Playfair Display, Montserrat spaced caps, Great Vibes", "palette": "violet to periwinkle, white, pale gold", "decor": "stars, hourglass"}


@design(29)
def lunar_new_year(d, c):
    W, H = d.W, d.H
    d.bg("#B3121F")
    d.dots(0, 0, W, H, 24, 1.8, "#C92A36")
    for x, top, s_ in [(0.18, 0.0, 0.2), (0.82, 0.02, 0.18)]:
        d.line(W * x, -d.bleed, W * x, H * 0.08, "#E9C877", 1.5)
        d.art("red-paper-lantern", W * x, H * 0.14, W * s_)
    d.circle(W / 2, H * 0.36, W * 0.22, "#E9C877")
    d.circle(W / 2, H * 0.36, W * 0.19, "#B3121F")
    d.art("dragon", W / 2, H * 0.36, W * 0.3)
    t, s = fitted(d, H * 0.58, "Happy Lunar\nNew Year", "Playfair Display", 70, "#F7DFA0", weight=700, lh=1.0)
    text_metal(d, t)
    body(d, H * 0.58 + s * 2.4, c["message"], "Lora", W * 0.038, "#FFE7D6", italic=True)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#F7DFA0", weight=700, align="center", spacing=200, upper=True)
    return {"layout": "lanterns hanging either side of a gold medallion with a dragon", "typography": "Playfair Display gold, Lora italic, Montserrat caps", "palette": "lucky red, gold", "decor": "dot pattern, lanterns, medallion, dragon illustration"}


# ---------------------------------------------------------------- Valentine's / Mother's / Father's
@design(30)
def val_sale(d, c):
    promo_post(d, c, "#FFD6E0", "#E0345A", "#7A1030", [("red-heart", 0.14, 0.14, 0.18, -12), ("love-letter", 0.2, 0.84, 0.22, 10), ("wrapped-gift", 0.84, 0.82, 0.2, -6), ("rose", 0.88, 0.58, 0.16, 15)], head_font="Anton")
    return {"layout": "big sale title with a discount badge, gifts and hearts around", "typography": "Anton, Montserrat", "palette": "blush, cherry, wine", "decor": "discount circle, heart / letter / gift / rose illustrations, CTA pill"}


@design(31)
def val_menu(d, c):
    W, H = d.W, d.H
    d.bg("#2A0A12")
    d.frame_border(W * 0.06, "#D4A373", 0.8, double=5)
    d.art("rose", W / 2, H * 0.09, W * 0.2)
    t, s = fitted(d, H * 0.15, "Valentine’s\nDinner", "Great Vibes", 70, "#F2C6B8", lh=1.0)
    y = H * 0.15 + s * 2.4
    for lab, item in zip(["TO START", "MAIN", "TO SHARE"], lines(c["message"])):
        d.text(0, y, W, lab, "Cinzel", W * 0.04, "#D4A373", weight=700, align="center", spacing=260)
        t = d.text(W * 0.12, y + W * 0.08, W * 0.76, item, "Cormorant Garamond", W * 0.065, "#F7E8E3", italic=True, align="center", lh=1.25)
        y += W * 0.08 + t["_h"] + H * 0.045
    for x in (0.3, 0.5, 0.7):
        d.heart(W * x, H * 0.86, 14, "#E0345A")
    d.text(W * 0.1, H * 0.9, W * 0.8, c["signature"], "Montserrat", W * 0.03, "#D4A373", weight=600, align="center", spacing=160, upper=True)
    return {"layout": "dark romantic menu with a rose crest and three courses", "typography": "Great Vibes, Cinzel labels, Cormorant Garamond italic", "palette": "wine black, blush, copper", "decor": "double frame, rose, small hearts"}


@design(32)
def val_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FF9EB5"), (1, "#E0345A")]))
    for _ in range(30):
        d.heart(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(30, 90), d.rng.choice(["#FFFFFF", "#FFD6E0", "#FF6B8B"]), angle=d.rng.uniform(-25, 25), opacity=0.5)
    d.heart(W / 2, H * 0.36, 520, "#FFFFFF", shadow_=shadow("rgba(150,0,40,0.3)", 50, 0, 20))
    t, s = fitted(d, H * 0.3, "Happy\nValentine’s Day", "Great Vibes", 150, "#C2185B", w=0.56, lh=1.0)
    d.text(0, H * 0.66, W, c["message"], "Playfair Display", 64, "#FFFFFF", italic=True, align="center")
    return {"layout": "big white heart holding the greeting, floating hearts on pink", "typography": "Great Vibes, Playfair Display italic", "palette": "pink to cherry, white", "decor": "30 floating hearts, heart panel with shadow"}


@design(33)
def mothers_floral(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4F1")
    from greetings import design as _  # noqa
    cx, cy, R = W / 2, H * 0.32, W * 0.3
    for i in range(24):
        a = 2 * math.pi * i / 24
        d.leaf(cx + R * math.cos(a), cy + R * math.sin(a), 30, 9, math.degrees(a) + 120, "#8DA68A" if i % 2 else "#B5C4A7")
    for i in range(6):
        a = 2 * math.pi * i / 6 + 0.4
        d.art(["rose", "tulip", "blossom"][i % 3], cx + R * math.cos(a), cy + R * math.sin(a), W * 0.13)
    d.text(0, cy - W * 0.1, W, "Mum", "Great Vibes", W * 0.16, "#B23A55", align="center")
    t, s = fitted(d, H * 0.6, "Happy Mother’s Day", "Playfair Display", 60, "#5A2E3A", weight=600, italic=True)
    body(d, H * 0.6 + s * 1.5, c["message"], "Lora", W * 0.04, "#6B4A50", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.06, "#B23A55", weight=700, align="center")
    return {"layout": "flower wreath around a script ‘Mum’, italic greeting below", "typography": "Great Vibes, Playfair Display italic, Lora italic, Caveat", "palette": "blush, rose, sage", "decor": "leaf wreath with six flowers"}


@design(34)
def mothers_brunch(d, c):
    W, H = d.W, d.H
    d.bg("#FBE7DF")
    d.photo(303, W * 0.5, -d.bleed, W * 0.5 + d.bleed, H * 0.6, focus=(0.5, 0.6))
    d.art("bouquet", W * 0.8, H * 0.62, 200, angle=10)
    t = d.text(70, 90, W * 0.42, "Mother’s\nDay\nBrunch", "Playfair Display", d.fit("Brunch", W * 0.4, "Playfair Display", 140, 700, True), "#7A2E3E", weight=700, italic=True, lh=0.95)
    p = lines(c["message"])
    y = 90 + t["_h"] + 40
    for it in p:
        d.text(70, y, W * 0.42, it, "Montserrat", 40, "#4A2A30", weight=600)
        y += 64
    d.rect(-d.bleed, H * 0.76, W + 2 * d.bleed, H * 0.24 + d.bleed, "#7A2E3E")
    d.text(0, H * 0.82, W, c["signature"].upper(), "Montserrat", 46, "#FBE7DF", weight=800, align="center", spacing=400)
    return {"layout": "flower photo top-right, stacked italic title and details left, call-to-action band", "typography": "Playfair Display bold italic, Montserrat", "palette": "blush, wine, flower tones", "decor": "photo, bouquet illustration, CTA band"}


@design(35)
def best_mum(d, c):
    W, H = d.W, d.H
    d.bg("#FFE9D6")
    cx, cy = W / 2, H * 0.34
    d.star(cx, cy, W * 0.34, "#F2B84B", points=16, inner=0.86, angle=-80)
    d.circle(cx, cy, W * 0.26, "#FFFFFF", stroke="#E2572A", sw=3)
    d.text(cx - W * 0.26, cy - W * 0.18, W * 0.52, "CERTIFIED", "Montserrat", W * 0.03, "#E2572A", weight=800, align="center", spacing=300)
    d.text(cx - W * 0.26, cy - W * 0.12, W * 0.52, "BEST\nMUM\nEVER", "Anton", W * 0.08, "#2A2A2A", align="center", lh=0.95)
    d.polygon([(cx - W * 0.16, cy + W * 0.24), (cx - W * 0.06, cy + W * 0.24), (cx - W * 0.11, cy + W * 0.42)], "#E2572A")
    d.polygon([(cx + W * 0.06, cy + W * 0.24), (cx + W * 0.16, cy + W * 0.24), (cx + W * 0.11, cy + W * 0.42)], "#E2572A")
    t, s = fitted(d, H * 0.66, "Best mum ever", "Pacifico", 70, "#E2572A")
    body(d, H * 0.66 + s * 1.5, c["message"], "Fredoka", W * 0.04, "#5A3A2A", weight=500)
    d.text(0, H * 0.9, W, c["signature"], "Caveat", W * 0.06, "#2A2A2A", weight=700, align="center")
    return {"layout": "award rosette with ribbon tails, playful title below", "typography": "Anton, Montserrat, Pacifico, Fredoka, Caveat", "palette": "apricot, marigold, tomato, charcoal", "decor": "vector rosette and ribbons"}


@design(36)
def fathers_card(d, c):
    W, H = d.W, d.H
    d.bg("#1F3349")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 2, 26, "rgba(255,255,255,0.06)")
    d.art("necktie", W * 0.5, H * 0.18, W * 0.22)
    t, s = fitted(d, H * 0.34, "Happy\nFather’s Day", "Alfa Slab One", 80, "#F2C14E", lh=1.05)
    body(d, H * 0.34 + s * 2.5, c["message"], "Lora", W * 0.042, "#E5ECF3", italic=True)
    d.art("trophy", W * 0.5, H * 0.76, W * 0.12)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#F2C14E", weight=700, align="center")
    return {"layout": "pinstripe navy card: tie, slab-serif greeting, small trophy", "typography": "Alfa Slab One, Lora italic, Caveat", "palette": "navy, mustard, white", "decor": "pinstripes, tie and trophy illustrations"}


@design(37)
def fathers_sale(d, c):
    promo_post(d, c, "#1F3349", "#F2C14E", "#FFFFFF", [("necktie", 0.14, 0.16, 0.16, -10), ("briefcase", 0.18, 0.84, 0.2, 6), ("sunglasses", 0.86, 0.84, 0.2, -6)], head_font="Anton")
    return {"layout": "navy promo with a discount badge and gift illustrations", "typography": "Anton, Montserrat", "palette": "navy, mustard, white", "decor": "discount circle, tie / briefcase / sunglasses"}


# ---------------------------------------------------------------- Easter / Halloween / Autumn
@design(38)
def easter_card(d, c):
    W, H = d.W, d.H
    d.bg("#F1F8EC")
    d.wave(-d.bleed, W + d.bleed, H * 0.6, 14, 140, fill="#BFE3A8", bottom=H + d.bleed)
    for k, (x, col1, col2) in enumerate([(0.22, "#F7B6C8", "#FFFFFF"), (0.42, "#B9D7F7", "#FFE08A"), (0.62, "#FFE08A", "#C9B6F2"), (0.8, "#C9B6F2", "#B9E8C8")]):
        cx, cy = W * x, H * 0.62
        d.ellipse(cx, cy, W * 0.07, W * 0.09, col1)
        d.wave(cx - W * 0.07, cx + W * 0.07, cy, 4, 18, stroke=col2, sw=4)
        d.dots(cx - W * 0.05, cy + W * 0.02, cx + W * 0.05, cy + W * 0.06, 10, 2, col2, offset_rows=False)
    d.art("rabbit", W * 0.5, H * 0.38, W * 0.34)
    t, s = fitted(d, H * 0.08, "Happy Easter", "Pacifico", 80, "#6A9C4E")
    body(d, H * 0.74, c["message"], "Lora", W * 0.04, "#4E6B4A", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.055, "#E06C8A", weight=700, align="center")
    return {"layout": "bunny over a row of decorated vector eggs on a green hill", "typography": "Pacifico, Lora italic, Caveat", "palette": "spring green, pastel eggs", "decor": "decorated eggs, hill, bunny"}


@design(39)
def egg_hunt(d, c):
    W, H = d.W, d.H
    d.bg("#FFF6E0")
    d.rect(-d.bleed, H * 0.7, W + 2 * d.bleed, H * 0.3 + d.bleed, "#9BD07A")
    for _ in range(14):
        x = d.rng.uniform(40, W - 40)
        y = d.rng.uniform(H * 0.72, H - 40)
        d.ellipse(x, y, 26, 34, d.rng.choice(["#F7B6C8", "#B9D7F7", "#FFE08A", "#C9B6F2"]), angle=d.rng.uniform(-20, 20))
    d.art("hatching-chick", W * 0.82, H * 0.62, 220)
    d.art("rabbit", W * 0.18, H * 0.62, 240)
    t, s = fitted(d, H * 0.08, "Easter\nEgg Hunt", "Luckiest Guy", 200, "#E2572A", lh=0.95)
    p = lines(c["message"])
    d.text(0, H * 0.08 + s * 2.1, W, " · ".join(p[:2]), "Fredoka", 56, "#3A2A20", weight=700, align="center")
    d.text(0, H * 0.08 + s * 2.1 + 80, W, " · ".join(p[2:]), "Fredoka", 46, "#5A4A3A", weight=500, align="center")
    pill(d, W / 2, H * 0.62, c["signature"], "Fredoka", 44, "#FFFFFF", "#E2572A", weight=700, spacing=40, upper=False)
    return {"layout": "big title, details, bunny and chick on a lawn scattered with eggs", "typography": "Luckiest Guy, Fredoka", "palette": "butter, grass green, egg pastels, tangerine", "decor": "eggs, lawn, bunny and chick illustrations"}


@design(40)
def halloween_party(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1B1035"), (1, "#3E1E5E")]))
    d.circle(W * 0.72, H * 0.16, 70, "#FFE6A8")
    d.art("ghost", W * 0.22, H * 0.2, W * 0.24, angle=-10)
    d.rect(-d.bleed, H * 0.78, W + 2 * d.bleed, H * 0.22 + d.bleed, "#120A20")
    for x in (0.18, 0.5, 0.82):
        d.art("jack-o-lantern", W * x, H * 0.78, W * 0.2)
    t, s = fitted(d, H * 0.32, "Halloween\nParty", "Luckiest Guy", 90, "#FF8A1F", lh=0.95)
    p = lines(c["message"])
    body(d, H * 0.32 + s * 2.2, p[0], "Fredoka", W * 0.04, "#E9DDF7", weight=600)
    d.text(W * 0.1, H * 0.32 + s * 2.2 + W * 0.09, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.034, "#C9B6F2", weight=500, align="center", lh=1.35)
    d.text(0, H * 0.92, W, c["signature"], "Caveat", W * 0.06, "#FF8A1F", weight=700, align="center")
    return {"layout": "moonlit purple sky with a ghost, title and a row of pumpkins", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "midnight purple, pumpkin orange, moon", "decor": "moon, ghost, three pumpkins"}


@design(41)
def halloween_post(d, c):
    W, H = d.W, d.H
    d.bg("#FF8A1F")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 40, 40, "rgba(0,0,0,0.06)", angle_deg=25)
    d.art("jack-o-lantern", W / 2, H * 0.4, W * 0.5, shadow_=shadow("rgba(0,0,0,0.3)", 30, 0, 14))
    t, s = fitted(d, H * 0.04, "HAPPY HALLOWEEN", "Luckiest Guy", 120, "#1B1035")
    d.text(0, H * 0.78, W, c["message"], "Pacifico", 90, "#1B1035", align="center")
    d.art("ghost", W * 0.14, H * 0.84, 160, angle=-10)
    return {"layout": "giant pumpkin centred on orange stripes, headline above, script below", "typography": "Luckiest Guy, Pacifico", "palette": "pumpkin orange, midnight", "decor": "diagonal stripes, pumpkin and ghost"}


@design(42)
def halloween_kids_story(d, c):
    W, H = d.W, d.H
    d.bg("#2D1B4E")
    for _ in range(40):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.8, 2.4), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    d.circle(W / 2, H * 0.3, 260, "#FFE6A8")
    d.art("ghost", W / 2, H * 0.3, 380)
    t, s = fitted(d, H * 0.52, "Boo!", "Luckiest Guy", 400, "#FFFFFF", w=0.6)
    d.text(W * 0.1, H * 0.52 + s * 1.15, W * 0.8, c["message"], "Fredoka", 64, "#FFC37A", weight=700, align="center")
    for x in (0.2, 0.8):
        d.art("candy", W * x, H * 0.88, 160, angle=20 if x < 0.5 else -20)
    return {"layout": "friendly ghost against a big moon, huge BOO and a kids' line", "typography": "Luckiest Guy, Fredoka", "palette": "night purple, moon yellow, candy orange", "decor": "stars, moon, ghost, candy"}


@design(43)
def thanksgiving(d, c):
    W, H = d.W, d.H
    d.bg("#FBF1E3")
    for k in range(14):
        x, y = d.rng.uniform(0, W), d.rng.uniform(0, H)
        if 0.15 * H < y < 0.82 * H and 0.1 * W < x < 0.9 * W:
            continue
        d.art(d.rng.choice(["maple-leaf", "fallen-leaf"]), x, y, d.rng.uniform(40, 70), angle=d.rng.uniform(0, 360))
    d.art("turkey", W * 0.5, H * 0.26, W * 0.3)
    t, s = fitted(d, H * 0.44, "Thanksgiving\nDinner", "Playfair Display", 70, "#8C3B12", weight=700, italic=True, lh=1.0)
    p = lines(c["message"])
    body(d, H * 0.44 + s * 2.4, p[0], "Lora", W * 0.038, "#5A3A20", italic=True)
    d.text(W * 0.1, H * 0.44 + s * 2.4 + W * 0.11, W * 0.8, " · ".join(p[1:]), "Montserrat", W * 0.028, "#8C3B12", weight=700, align="center", spacing=120, upper=True)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#C0631B", weight=700, align="center")
    return {"layout": "falling leaves framing a turkey and italic invitation", "typography": "Playfair Display bold italic, Lora italic, Montserrat caps, Caveat", "palette": "cream, rust, pumpkin, cocoa", "decor": "maple and fallen leaves, turkey"}


@design(44)
def hello_autumn(d, c):
    W, H = d.W, d.H
    d.bg("#C9652A")
    for k in range(26):
        d.art(d.rng.choice(["maple-leaf", "fallen-leaf", "leaf-fluttering-in-wind"]), d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(60, 120), angle=d.rng.uniform(0, 360), opacity=0.9)
    d.circle(W / 2, H / 2, W * 0.32, "#FBF1E3", shadow_=shadow("rgba(0,0,0,0.2)", 30, 0, 10))
    t, s = fitted(d, H * 0.36, "Hello\nautumn", "Playfair Display", 150, "#8C3B12", w=0.5, weight=700, italic=True, lh=0.95)
    body(d, H * 0.36 + s * 2.2, c["message"], "Lora", 36, "#5A3A20", italic=True, w=0.48)
    return {"layout": "cream medallion with an italic greeting on a bed of autumn leaves", "typography": "Playfair Display bold italic, Lora italic", "palette": "rust, cream, cocoa, leaf golds", "decor": "26 leaf illustrations, medallion"}


# ---------------------------------------------------------------- school / summer / winter
@design(45)
def back_to_school(d, c):
    promo_post(d, c, "#2E86DE", "#FFD32A", "#FFFFFF", [("books", 0.16, 0.16, 0.2, -10), ("pencil", 0.86, 0.82, 0.18, 30), ("graduation-cap", 0.16, 0.84, 0.18, 8), ("school", 0.86, 0.58, 0.16, 0)], head_font="Luckiest Guy")
    d = d
    return {"layout": "bright blue promo with school illustrations and a discount badge", "typography": "Luckiest Guy, Montserrat", "palette": "school blue, pencil yellow, white", "decor": "books, pencil, cap, school illustrations"}


@design(46)
def first_day_sign(d, c):
    W, H = d.W, d.H
    d.bg("#FFFDF5")
    step = 30
    path = []
    k = 0
    while k * step < H:
        path += [["M", -d.bleed, k * step], ["L", W + d.bleed, k * step]]
        k += 1
    d.path(path, fill="", stroke="#E3EEF9", sw=1.5)
    d.bunting(-10, W + 10, 10, 40, ["#FF6B6B", "#FFD45C", "#4FC3F7", "#8BC34A"], flags=9, fh=60)
    d.text(0, H * 0.14, W, c["headline"], "Caveat", 90, "#2E3A59", weight=700, align="center")
    t, s = fitted(d, H * 0.22, c["message"], "Luckiest Guy", 170, "#E2572A", w=0.86)
    for k, (lab, val) in enumerate([x.split(": ") for x in lines(c["signature"])]):
        y = H * 0.48 + k * 150
        d.text(90, y, 380, lab.upper(), "Fredoka", 44, "#7A8BA8", weight=700)
        d.text(420, y - 16, W - 520, val, "Caveat", 80, "#2E3A59", weight=700)
        d.line(420, y + 74, W - 90, y + 74, "#C9D6E8", 3)
    d.art("backpack" if False else "school", W * 0.2, H * 0.88, 180)
    d.art("pencil", W * 0.8, H * 0.88, 140, angle=30)
    return {"layout": "printable sign: bunting, handwritten line, big grade name, fill-in lines", "typography": "Caveat, Luckiest Guy, Fredoka", "palette": "paper white, tomato, navy, primary brights", "decor": "ruled lines, bunting, school and pencil illustrations"}


@design(47)
def summer_sale(d, c):
    promo_post(d, c, "#FFE14D", "#FF4F79", "#0E6C9C", [("palm-tree", 0.14, 0.18, 0.22, -5), ("watermelon", 0.18, 0.84, 0.2, 10), ("sunglasses", 0.86, 0.84, 0.2, -8), ("tropical-drink", 0.86, 0.58, 0.16, 12)], head_font="Luckiest Guy")
    return {"layout": "sunny promo with a discount badge and summer illustrations", "typography": "Luckiest Guy, Montserrat", "palette": "lemon, watermelon pink, ocean blue", "decor": "palm, watermelon, sunglasses, drink"}


@design(48)
def hello_summer_story(d, c):
    W, H = d.W, d.H
    d.bg("#F2C7A5")
    d.photo(1909, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.6, 0.5))
    overlay(d, 0.0, 0.6, y0=H * 0.5, y1=H, color="#3A1E1A")
    t, s = fitted(d, H * 0.08, "Hello,\nsummer!", "Pacifico", 220, "#FFFFFF", lh=1.05, shadow_=shadow("rgba(0,0,0,0.3)", 20, 0, 4))
    d.text(0, H * 0.84, W, c["message"].upper(), "Montserrat", 44, "#FFFFFF", weight=700, align="center", spacing=360)
    d.art("sun", W * 0.84, H * 0.36, 160)
    return {"layout": "full-bleed beach photo with a big script hello at the top", "typography": "Pacifico, Montserrat caps", "palette": "sunset sand, coral, white", "decor": "shade, sun illustration"}


@design(49)
def summer_camp(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#7FD3F5"), (1, "#D6F0FB")]))
    d.circle(W * 0.84, H * 0.12, 80, "#FFD45C")
    d.polygon([(-d.bleed, H * 0.55), (W * 0.3, H * 0.32), (W * 0.62, H * 0.55)], "#5B8E7D")
    d.polygon([(W * 0.4, H * 0.55), (W * 0.74, H * 0.36), (W + d.bleed, H * 0.55)], "#4A7A6A")
    d.rect(-d.bleed, H * 0.55, W + 2 * d.bleed, H * 0.45 + d.bleed, "#8BC34A")
    d.art("tent", W * 0.26, H * 0.56, 260)
    d.art("soccer-ball" if False else "kite", W * 0.82, H * 0.34, 160, angle=15)
    t, s = fitted(d, H * 0.06, "SUMMER\nCAMP", "Luckiest Guy", 220, "#FFFFFF", w=0.7, lh=0.95, stroke="#0E3A66", sw=8)
    p = lines(c["message"])
    d.rect(W * 0.08, H * 0.66, W * 0.84, H * 0.22, "#FFFFFF", rx=30)
    d.text(W * 0.08, H * 0.68, W * 0.84, p[0] + "  ·  " + p[1], "Fredoka", 54, "#E2572A", weight=700, align="center")
    d.text(W * 0.1, H * 0.68 + 90, W * 0.8, p[2], "Fredoka", 42, "#2E3A59", weight=500, align="center")
    d.text(0, H * 0.92, W, c["signature"], "Fredoka", 38, "#FFFFFF", weight=700, align="center")
    return {"layout": "mountains, tent and kite with an outlined title and details card", "typography": "Luckiest Guy outlined, Fredoka", "palette": "sky, mountain greens, grass, tangerine", "decor": "sun, mountains, tent and kite illustrations"}


@design(50)
def winter_wonderland(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1F3B5C"), (1, "#4E7AA6")]))
    snow(d, 120, 0, 0, W, H, "#FFFFFF", 1.2, 4)
    for x, y, s_ in [(0.2, 0.18, 0.18), (0.8, 0.14, 0.14), (0.5, 0.3, 0.26), (0.84, 0.44, 0.1), (0.14, 0.46, 0.1)]:
        d.art("snowflake", W * x, H * y, W * s_, angle=d.rng.uniform(0, 60))
    t, s = fitted(d, H * 0.52, "Winter\nwonderland", "Great Vibes", 100, "#FFFFFF", lh=1.0)
    body(d, H * 0.56 + s * 2.35, c["message"], "Lora", W * 0.04, "#DCE8F4", italic=True)
    d.text(0, H * 0.94, W, c["signature"], "Caveat", W * 0.05, "#BFD8F0", weight=700, align="center")
    return {"layout": "snowflakes of different sizes over a deep winter sky, script greeting", "typography": "Great Vibes, Lora italic, Caveat", "palette": "winter navy to steel blue, white", "decor": "snow, snowflake illustrations"}
