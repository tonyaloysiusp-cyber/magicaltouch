"""Collection 500 — Invitations and events (event-001 … event-040)."""

import math, re
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body

CATEGORY = "Invitations and events"
SITE_CATEGORY = "Events"
TAG = "event"

C = 480, 673
A5 = 559, 794
L = 673, 480
SQ = 1080, 1080
ST = 1080, 1920
PO = 1080, 1350
T = 374, 794

SPEC = [
    ("Corporate", "Annual Gala Dinner Invitation", *A5, "Annual Gala Dinner", "An evening of recognition and celebration · Thursday 9 December 2027 · 7 PM · Atlantis The Royal, Dubai", "Black tie · RSVP by 25 November", "corporate gala dinner invitation black gold", "gala dinner invitation, corporate"),
    ("Corporate", "Tech Conference Poster", *PO, "FUTURE TECH SUMMIT", "AI · Cloud · Security · 14–15 March 2027 · Dubai World Trade Centre", "Register at futuretech.ae", "tech conference poster gradient modern", "conference poster, tech summit"),
    ("Corporate", "Product Launch Invitation", *SQ, "Something new is coming", "Product launch · 22 April 2027 · 6 PM · Alserkal Avenue", "Be the first to see it", "product launch invitation dark minimal", "product launch, invitation"),
    ("Corporate", "Webinar Announcement Post", *SQ, "Free Webinar", "Mastering Social Media in 2027 · Tuesday 9 Feb · 5 PM GST · with Sara Ahmed", "Register — link in bio", "webinar announcement instagram post", "webinar post, online event"),
    ("Corporate", "Workshop Flyer", *PO, "Design Thinking Workshop", "Hands-on, 3 hours · Saturday 6 March · 10 AM · Impact Hub Dubai · AED 250", "Book at impacthub.ae", "workshop flyer modern", "workshop flyer, training"),
    ("Corporate", "Networking Evening Invitation", *L, "Networking Evening", "Meet founders, investors & creatives · Wednesday 17 March · 7 PM · The Rooftop, DIFC", "Free entry · register to attend", "networking event invitation", "networking event, business"),
    ("Corporate", "Gold Ribbon Grand Opening Poster", *PO, "GRAND OPENING", "The Daily Grind Café · Friday 1 October · 9 AM · Free coffee for the first 100 guests", "Al Wasl Road, Dubai", "grand opening poster ribbon", "grand opening, store opening"),
    ("Corporate", "Career Fair Poster", *PO, "Career Fair 2027", "100+ employers · CV clinics · Interviews on the spot · 20 April · 10 AM–4 PM", "Zayed University, Dubai", "career fair poster", "career fair, job fair"),
    ("Corporate", "Hackathon Poster", *PO, "HACK 48", "48 hours · build anything · prizes worth AED 50,000 · 12–14 May 2027", "Sign up at hack48.ae", "hackathon poster neon code", "hackathon poster, coding"),
    ("Corporate", "Conference Speaker Card", *SQ, "Meet our speaker", "Dr. Layla Haddad · Head of AI Research · Keynote: The Human Side of AI", "Future Tech Summit · 14 March", "conference speaker announcement post", "speaker announcement, conference"),
    ("Arts & Culture", "Paint Blobs Art Exhibition Poster", *PO, "Colours of the Gulf", "A group exhibition · 5–30 November · Opening night 5 Nov · 7 PM · Gallery 21, Alserkal", "Free entry", "art exhibition poster modern abstract", "art exhibition poster, gallery"),
    ("Arts & Culture", "Stage Lights Concert Poster", *PO, "LIVE IN CONCERT", "The Oud Collective · Friday 15 October · 8 PM · Dubai Opera", "Tickets from AED 150", "live concert poster music", "concert poster, live music"),
    ("Arts & Culture", "Poetry Night Flyer", *C, "Poetry Night", "Open mic for words & verses · Thursday 4 March · 7:30 PM · The Book Corner Café", "Sign up at the door", "poetry night open mic flyer", "poetry night, open mic"),
    ("Arts & Culture", "Comedy Night Poster", *PO, "Comedy Night", "Stand-up with 5 local comedians · Saturday 13 March · 9 PM · The Laugh Factory", "Tickets AED 95", "comedy night poster", "comedy night, stand up"),
    ("Arts & Culture", "Book Club Invitation", *C, "Book Club", "This month: ‘The Alchemist’ · Sunday 7 March · 6 PM · Lina’s place", "Bring a snack to share", "book club invitation cozy", "book club invitation"),
    ("Arts & Culture", "Fashion Show Poster", *PO, "FASHION SHOW", "Spring / Summer 2027 · Thursday 18 March · 8 PM · Dubai Design District", "Invitation only", "fashion show poster minimal", "fashion show poster"),
    ("Arts & Culture", "Movie Night Invitation", *L, "Movie Night", "Popcorn, blankets & a classic under the stars · Friday 26 February · 8 PM · our garden", "Bring a cushion!", "outdoor movie night invitation", "movie night invitation"),
    ("Community", "Charity Fundraiser Poster", *PO, "Run for Hope", "5K charity fun run · Saturday 20 February · 7 AM · Kite Beach · all proceeds to children’s education", "Register at runforhope.ae", "charity fun run poster", "charity run, fundraiser"),
    ("Community", "Community Clean Up Flyer", *C, "Beach Clean-Up", "Join your neighbours to keep our beach beautiful · Saturday 6 March · 7 AM · Jumeirah Beach", "Gloves & bags provided", "beach clean up volunteer flyer", "community clean up, volunteer"),
    ("Community", "Farmers Market Poster", *PO, "Weekend Market", "Fresh produce · local makers · live music · every Saturday · 8 AM–1 PM · Ripe Market, Al Barsha", "Free entry", "farmers market poster illustrated", "farmers market poster"),
    ("Community", "Charity Bake Sale Flyer", *C, "Bake Sale!", "All proceeds go to the animal shelter · Friday 12 March · 3 PM · school courtyard", "Cakes from AED 5", "charity bake sale flyer cute", "bake sale flyer, charity"),
    ("Community", "Open Day School Poster", *PO, "Open Day", "Tour our campus, meet our teachers · Saturday 27 February · 9 AM–1 PM", "Al Noor Academy · register online", "school open day poster", "open day poster, school"),
    ("Community", "Blood Donation Drive Poster", *PO, "Give blood, save lives", "Blood donation drive · Monday 15 March · 9 AM–3 PM · Community Hall", "Every drop counts", "blood donation drive poster", "blood donation, drive"),
    ("Community", "Neighbourhood Iftar Invitation", *L, "Community Iftar", "Break your fast with your neighbours · Friday 12 March · Maghrib · Park pavilion", "Everyone is welcome", "community iftar invitation", "community iftar"),
    ("Sports & Wellness", "Yoga Class Flyer", *C, "Sunrise Yoga", "Every Saturday · 6:30 AM · Kite Beach · all levels · AED 60", "Bring your own mat", "sunrise yoga class flyer", "yoga class flyer"),
    ("Sports & Wellness", "Marathon Poster", *PO, "CITY MARATHON", "42K · 21K · 10K · 5K · Friday 21 January 2028", "Register at citymarathon.ae", "marathon poster bold", "marathon poster, running"),
    ("Sports & Wellness", "Sports Day Invitation", *C, "Sports Day!", "Races, games & medals · Thursday 18 March · 8 AM · school field", "Wear your house colours", "school sports day invitation", "sports day invitation"),
    ("Sports & Wellness", "Centre Spot 5-a-side Cup Poster", *PO, "5-a-side Cup", "16 teams · 1 trophy · Saturday 10 April · 4 PM · Dubai Sports City", "Register your team", "football tournament poster", "football tournament poster"),
    ("Sports & Wellness", "Fitness Bootcamp Story", *ST, "Bootcamp", "4 weeks · 3 sessions a week · start 1 March", "Book your spot — link in bio", "fitness bootcamp instagram story", "fitness bootcamp, story"),
    ("Social", "Dinner Party Invitation", *C, "Dinner Party", "Good food, good friends · Saturday 13 March · 8 PM · our place", "RSVP to Sami", "dinner party invitation elegant", "dinner party invitation"),
    ("Social", "Sunset Glasses Cocktail Invitation", *A5, "Cocktail Hour", "Mocktails & canapés · Friday 19 March · 7 PM · Skyview Terrace", "Dress: cocktail chic", "cocktail party invitation", "cocktail party invitation"),
    ("Social", "Dice and Controller Game Night Post", *SQ, "Game Night", "Board games, snacks & trash talk · Thursday · 8 PM · Omar’s flat", "Bring your A-game", "game night invitation", "game night invitation"),
    ("Social", "BBQ Party Invitation", *C, "BBQ Party", "Burgers, grills & good vibes · Friday 9 April · 5 PM · Villa 12, The Springs", "Bring your swimsuit", "bbq party invitation", "bbq party invitation"),
    ("Social", "Potluck Invitation", *L, "Potluck Lunch", "Bring a dish to share · Sunday 14 March · 1 PM · the office kitchen", "Sign up for your dish", "potluck invitation", "potluck invitation"),
    ("Social", "Quiz Night Poster", *PO, "Quiz Night", "Teams of 4 · prizes · every Wednesday · 8 PM · The Irish Village", "Free to enter", "pub quiz night poster", "quiz night poster"),
    ("Social", "Class Reunion Invitation", *A5, "Class of 2017 Reunion", "Ten years later! · Saturday 18 December · 7 PM · The Hall, Dubai College", "Bring your yearbook", "class reunion invitation", "class reunion, school reunion"),
    ("Social", "Prom Night Poster", *PO, "PROM NIGHT", "A night under the stars · Friday 4 June · 7 PM · Grand Ballroom", "Tickets at the school office", "prom night poster", "prom night poster"),
    ("Social", "Retirement Party Invitation", *C, "Retirement Party", "Celebrating 35 years of Mr. Khalil · Thursday 24 June · 6 PM · The Boardroom", "Speeches & cake", "retirement party invitation", "retirement party invitation"),
    ("Social", "Event Ticket", *T, "ADMIT ONE", "Summer Social · Saturday 3 July · 7 PM · Beach Club", "No. 00241", "event ticket design", "event ticket, admission"),
    ("Social", "Save Our Event Story", *ST, "Save the date", "Annual Charity Gala · 9 December 2027", "More details soon", "event save the date story", "event save the date, story"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def date_block(d, x, y, w, day, month, bg, fg):
    d.rect(x, y, w, w * 1.1, bg, rx=w * 0.12)
    d.text(x, y + w * 0.08, w, month.upper(), "Montserrat", w * 0.18, fg, weight=800, align="center", spacing=200)
    d.text(x, y + w * 0.3, w, day, "Anton", w * 0.6, fg, align="center")


def find_date(msg):
    m = re.search(r"(\d{1,2})(?:–\d{1,2})?\s+(January|February|March|April|May|June|July|August|September|October|November|December)", msg)
    if m:
        return m.group(1), m.group(2)[:3]
    return None


def two_lines(t):
    if len(t) <= 12 or "\n" in t:
        return t
    words = t.split(" ")
    best, cut = 1e9, 1
    for k in range(1, len(words)):
        a, b = " ".join(words[:k]), " ".join(words[k:])
        diff = abs(len(a) - len(b))
        if diff < best:
            best, cut = diff, k
    return " ".join(words[:cut]) + "\n" + " ".join(words[cut:])


def poster(d, c, bg, ink, accent, head_font="Anton", art=None, art_pos=(0.84, 0.1), art_size=0.2, sub=None, photo=None, shapes=None):
    """Event poster: headline block, date tile, info lines, call to action."""
    W, H = d.W, d.H
    d.bg(bg)
    if shapes:
        shapes(d)
    if art:
        d.circle(W * 0.74, H * 0.74, W * 0.2, rgba(accent if accent.startswith("#") else "#FFFFFF", 0.18))
        d.art(art, W * 0.74, H * 0.74, W * 0.3, angle=-8, shadow_=shadow("rgba(0,0,0,0.2)", 24, 0, 10))
    else:
        d.blob(W * 0.8, H * 0.74, W * 0.18, rgba(accent, 0.25), wobble=0.2, n=8, seed=7)
    top = H * 0.1
    head = c["headline"].upper() if head_font in ("Anton", "Bebas Neue", "Archivo Black") else c["headline"]
    head = two_lines(head)
    t, s = fitted(d, top, head, head_font, 260, ink, w=0.84, align="left", x=W * 0.08, lh=0.95)
    d.rect(W * 0.08, top + t["_h"] + 24, 120, 10, accent)
    y = top + t["_h"] + 70
    parts = lines(c["message"])
    dt = find_date(c["message"])
    info_x = W * 0.08
    if dt:
        date_block(d, W * 0.08, y, 200, dt[0], dt[1], accent, bg if isinstance(bg, str) else "#FFFFFF")
        info_x = W * 0.08 + 240
    yy = y
    for k, p in enumerate(parts):
        if dt and re.search(dt[1][:3], p) and re.search(r"\d", p) and len(p) < 32:
            continue
        sz = 54 if k == 0 else 44
        tt = d.text(info_x, yy, W - info_x - W * 0.08, p, "Montserrat", sz, ink, weight=700 if k == 0 else 500, lh=1.2)
        yy += tt["_h"] + 18
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 34, bg if isinstance(bg, str) else "#FFFFFF", accent, spacing=160, upper=False, weight=700)


def invite(d, c, bg, ink, accent, script="Great Vibes", art=None, frame=True, dark=False):
    W, H = d.W, d.H
    d.bg(bg)
    if frame:
        d.frame_border(W * 0.05, accent, 1, double=6)
    y = H * 0.1
    if art:
        d.art(art, W / 2, H * 0.14, W * 0.2)
        y = H * 0.24
    t, s = fitted(d, y, c["headline"], script, 90, ink if not dark else accent, w=0.8)
    if dark:
        text_metal(d, t)
    parts = lines(c["message"])
    d.text(W * 0.12, y + s * 1.3, W * 0.76, parts[0], "Cormorant Garamond", W * 0.045, ink, italic=True, align="center", lh=1.35)
    divider(d, W / 2, H * 0.6, W * 0.34, accent, 1, gap=7)
    d.text(W * 0.12, H * 0.63, W * 0.76, "\n".join(parts[1:]), "Cinzel", W * 0.032, ink, weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.022, accent, weight=700, align="center", spacing=200, upper=True)


# ---------------------------------------------------------------- corporate
@design(1)
def gala(d, c):
    invite(d, c, rad(280, 300, 800, [(0, "#1E1A16"), (1, "#070605")]), "#F3E6CB", "#C9A45A", art="clinking-glasses", dark=True)
    return {"layout": "formal gala invitation in a gold double frame with glasses crest", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel, Montserrat caps", "palette": "black, gold, champagne", "decor": "double frame, glasses illustration, divider"}


@design(2)
def tech_conf(d, c):
    def shapes(d):
        W, H = d.W, d.H
        for x, y, r, col in [(0.85, 0.12, 0.5, "#6A5CFF"), (0.1, 0.9, 0.5, "#00D4C8")]:
            d.circle(W * x, H * y, W * r, rad(W * r, W * r, W * r, [(0, rgba(col, 0.7)), (1, rgba(col, 0))]))
        step = 60
        d.path([x for k in range(int(W / step) + 1) for x in (["M", k * step, H * 0.62], ["L", k * step, H])], fill="", stroke="rgba(255,255,255,0.06)", sw=1)
    poster(d, c, "#0B0D21", "#FFFFFF", "#6A5CFF", head_font="Anton", art="laptop", art_pos=(0.8, 0.12), art_size=0.22, shapes=shapes)
    return {"layout": "dark gradient tech poster: condensed headline, date tile, topics, registration pill", "typography": "Anton, Montserrat", "palette": "ink navy, electric violet, teal glow", "decor": "glow orbs, grid lines, laptop"}


@design(3)
def launch(d, c):
    W, H = d.W, d.H
    d.bg("#0A0A0A")
    d.circle(W / 2, H * 0.42, W * 0.32, rad(W * 0.32, W * 0.32, W * 0.32, [(0, "rgba(255,255,255,0.18)"), (1, "rgba(255,255,255,0)")]))
    d.rect(W / 2 - 150, H * 0.3, 300, 300, "", stroke="#FFFFFF", sw=3, angle=45, origin_center=True)
    d.rect(W / 2, H * 0.3 + 150, 300, 300, "", stroke="#FFFFFF", sw=1, angle=45, origin_center=True, opacity=0.4)
    d.text(0, H * 0.36, W, "?", "Playfair Display", 160, "#FFFFFF", italic=True, align="center")
    t, s = fitted(d, H * 0.66, c["headline"], "Playfair Display", 90, "#FFFFFF", italic=True)
    d.text(0, H * 0.66 + s * 1.4, W, c["message"].upper(), "Montserrat", 30, "#BDBDBD", weight=600, align="center", spacing=260)
    d.text(0, H * 0.9, W, c["signature"].upper(), "Montserrat", 28, "#FFFFFF", weight=800, align="center", spacing=500)
    return {"layout": "teaser: glowing outlined diamond with a question mark, italic line", "typography": "Playfair Display italic, Montserrat spaced caps", "palette": "black, white, grey", "decor": "glow, outlined diamonds"}


@design(4)
def webinar(d, c):
    W, H = d.W, d.H
    d.bg("#F2F5FF")
    d.rect(60, 60, W - 120, 120, "#3B5BDB", rx=60)
    d.circle(130, 120, 14, "#FF6B6B")
    d.text(160, 96, 500, "LIVE · FREE WEBINAR", "Montserrat", 30, "#FFFFFF", weight=800, spacing=200)
    p = lines(c["message"])
    t, s = fitted(d, 240, p[0], "Outfit", 110, "#1B2559", w=0.84, weight=800, align="left", x=80, lh=1.0)
    d.text(80, 240 + t["_h"] + 30, W - 160, f"{p[1]}  ·  {p[2]}", "Montserrat", 40, "#3B5BDB", weight=700)
    d.circle(W - 220, H - 300, 150, "#DCE4FF")
    d.art("laptop", W - 220, H - 300, 220)
    d.text(80, H - 400, W * 0.5, "HOSTED BY", "Montserrat", 26, "#7A86B6", weight=700, spacing=300)
    d.text(80, H - 360, W * 0.5, p[3].replace("with ", ""), "Outfit", 56, "#1B2559", weight=700)
    pill(d, 300, H - 170, c["signature"], "Montserrat", 30, "#FFFFFF", "#1B2559", spacing=60, upper=False)
    return {"layout": "live badge, big topic, time line, host block and laptop", "typography": "Outfit ExtraBold, Montserrat", "palette": "ice blue, royal blue, navy, coral dot", "decor": "live badge, circle, laptop illustration"}


@design(5)
def workshop(d, c):
    def shapes(d):
        W, H = d.W, d.H
        d.circle(W * 0.9, H * 0.08, 200, "#FFD23F")
        d.rect(-d.bleed, H * 0.9, W + 2 * d.bleed, H * 0.1 + d.bleed, "#1B1B1B")
    poster(d, c, "#F7F3EA", "#1B1B1B", "#FF5A36", head_font="Archivo Black", art="light-bulb", art_pos=(0.82, 0.12), art_size=0.22, shapes=shapes)
    return {"layout": "bold type poster with a bulb, date tile and details", "typography": "Archivo Black, Montserrat", "palette": "cream, black, orange, yellow", "decor": "sun circle, footer band, light bulb"}


@design(6)
def networking(d, c):
    W, H = d.W, d.H
    d.bg("#101820")
    pts = [(W * 0.1, H * 0.2), (W * 0.24, H * 0.5), (W * 0.12, H * 0.8), (W * 0.34, H * 0.3), (W * 0.32, H * 0.72)]
    for i in range(len(pts)):
        for j in range(i + 1, len(pts)):
            d.line(pts[i][0], pts[i][1], pts[j][0], pts[j][1], "#F2AA4C", 1, opacity=0.4)
    for x, y in pts:
        d.circle(x, y, 10, "#F2AA4C")
    x0 = W * 0.46
    t = d.text(x0, H * 0.12, W * 0.5, "Networking\nEvening", "Playfair Display", d.fit("Networking", W * 0.48, "Playfair Display", 70, 700), "#FFFFFF", weight=700, lh=1.0)
    p = lines(c["message"])
    d.text(x0, H * 0.12 + t["_h"] + 14, W * 0.48, p[0], "Lora", W * 0.028, "#C9D3DE", italic=True, lh=1.4)
    d.text(x0, H * 0.62, W * 0.5, "\n".join(p[1:]), "Montserrat", W * 0.024, "#F2AA4C", weight=700, lh=1.7, spacing=60, upper=True)
    d.text(x0, H * 0.86, W * 0.5, c["signature"], "Montserrat", W * 0.02, "#FFFFFF", weight=600)
    return {"layout": "connected-dots network on the left, invitation on the right", "typography": "Playfair Display, Lora italic, Montserrat caps", "palette": "charcoal, amber", "decor": "node-and-line network"}


@design(7)
def grand_opening(d, c):
    W, H = d.W, d.H
    d.bg("#C62828")
    d.confetti(0, 0, W, H * 0.4, ["#FFD54F", "#FFFFFF"], n=50, size=(6, 14), shapes=("strip", "circle"))
    d.rect(-d.bleed, H * 0.3, W + 2 * d.bleed, 90, metal(W, 90))
    d.art("ribbon", W / 2, H * 0.33, 240)
    t, s = fitted(d, H * 0.08, "GRAND OPENING", "Anton", 200, "#FFFFFF")
    p = lines(c["message"])
    d.text(0, H * 0.46, W, p[0], "Great Vibes", 110, "#FFE9A8", align="center")
    d.text(W * 0.08, H * 0.58, W * 0.84, f"{p[1]}  ·  {p[2]}", "Montserrat", 48, "#FFFFFF", weight=800, align="center")
    d.rect(W * 0.1, H * 0.68, W * 0.8, 120, "#FFFFFF", rx=60)
    d.text(W * 0.1, H * 0.68 + 36, W * 0.8, p[3], "Montserrat", 32, "#C62828", weight=700, align="center")
    d.text(0, H * 0.88, W, c["signature"].upper(), "Montserrat", 32, "#FFE9A8", weight=700, align="center", spacing=300)
    return {"layout": "gold ribbon with bow across a red poster, business name in script", "typography": "Anton, Great Vibes, Montserrat", "palette": "ribbon red, gold, white", "decor": "confetti, gold ribbon band, bow illustration, offer pill"}


@design(8)
def career_fair(d, c):
    poster(d, c, "#0E4D64", "#FFFFFF", "#F2C14E", head_font="Archivo Black", art="briefcase", art_pos=(0.8, 0.14), art_size=0.24)
    return {"layout": "teal poster, briefcase, condensed headline and details list", "typography": "Archivo Black, Montserrat", "palette": "deep teal, sunflower, white", "decor": "briefcase illustration, pill"}


@design(9)
def hackathon(d, c):
    W, H = d.W, d.H
    d.bg("#05080F")
    for k in range(40):
        x = d.rng.uniform(0, W)
        d.text(x, d.rng.uniform(0, H), 60, d.rng.choice(["0", "1", "{", "}", "</>", ";"]), "DM Sans", d.rng.uniform(18, 40), "#00FF9C", opacity=d.rng.uniform(0.08, 0.3))
    t, s = fitted(d, H * 0.1, "HACK 48", "Bungee", 300, "#00FF9C", shadow_=shadow("rgba(0,255,156,0.8)", 30, 0, 0))
    p = lines(c["message"])
    y = H * 0.1 + s * 1.3
    for it in p:
        d.text(W * 0.1, y, W * 0.8, "> " + it, "DM Sans", 50, "#E6FFF5", weight=700)
        y += 80
    d.art("laptop", W * 0.78, H * 0.76, 260)
    pill(d, W * 0.36, H * 0.88, c["signature"], "DM Sans", 34, "#05080F", "#00FF9C", weight=700, spacing=40, upper=False)
    return {"layout": "terminal-style poster with neon title and command-line details", "typography": "Bungee neon, DM Sans", "palette": "terminal black, neon green", "decor": "floating code glyphs, laptop"}


@design(10)
def speaker(d, c):
    W, H = d.W, d.H
    d.bg("#F4F1EC")
    d.rect(-d.bleed, -d.bleed, W * 0.48 + d.bleed, H + 2 * d.bleed, "#1F2A44")
    d.photo(784, W * 0.08, H * 0.18, W * 0.34, W * 0.34, frame="circle", focus=(0.5, 0.3))
    d.circle(W * 0.25, H * 0.18 + W * 0.17, W * 0.18, "", stroke="#F2C14E", sw=4)
    d.text(W * 0.06, H * 0.7, W * 0.38, "MEET OUR SPEAKER", "Montserrat", 30, "#F2C14E", weight=800, spacing=300)
    p = lines(c["message"])
    x0 = W * 0.54
    t = d.text(x0, H * 0.14, W * 0.4, p[0], "Playfair Display", d.fit(p[0], W * 0.4, "Playfair Display", 80, 700), "#1F2A44", weight=700)
    d.text(x0, H * 0.14 + t["_h"] + 10, W * 0.4, p[1], "Montserrat", 32, "#6A7488", weight=600)
    d.line(x0, H * 0.46, x0 + 80, H * 0.46, "#F2C14E", 4)
    d.text(x0, H * 0.5, W * 0.4, p[2], "Playfair Display", 46, "#1F2A44", italic=True, lh=1.25)
    d.text(x0, H * 0.86, W * 0.4, c["signature"].upper(), "Montserrat", 26, "#1F2A44", weight=700, spacing=160)
    return {"layout": "split: circular speaker photo on navy, name, role and talk title on cream", "typography": "Playfair Display, Montserrat", "palette": "navy, cream, sunflower", "decor": "circle photo with ring, rule"}


# ---------------------------------------------------------------- arts & culture
@design(11)
def art_exhibition(d, c):
    def shapes(d):
        W, H = d.W, d.H
        for x, y, r, col, sd in [(0.75, 0.15, 220, "#E76F51", 1), (0.9, 0.4, 160, "#2A9D8F", 2), (0.62, 0.36, 120, "#E9C46A", 3)]:
            d.blob(W * x, H * y, r, col, wobble=0.25, n=9, seed=sd, opacity=0.95)
    poster(d, c, "#F4EFE6", "#264653", "#E76F51", head_font="Playfair Display", shapes=shapes)
    return {"layout": "abstract colour blobs top-right, serif title, date tile and details", "typography": "Playfair Display, Montserrat", "palette": "canvas cream, teal ink, terracotta, saffron, sea green", "decor": "organic paint blobs"}


@design(12)
def concert(d, c):
    W, H = d.W, d.H
    d.bg("#140B24")
    for k in range(5):
        d.polygon([(W * (0.2 + k * 0.15), -d.bleed), (W * (0.1 + k * 0.15) - 60, H * 0.7), (W * (0.1 + k * 0.15) + 60, H * 0.7)], rgba(["#FF4FD8", "#59F0FF", "#FFE45C"][k % 3], 0.12))
    d.art("musical-notes", W * 0.78, H * 0.2, 260)
    d.art("guitar", W * 0.2, H * 0.22, 280, angle=-25)
    t, s = fitted(d, H * 0.42, "LIVE IN CONCERT", "Anton", 200, "#FFFFFF")
    p = lines(c["message"])
    d.text(0, H * 0.42 + s * 1.1, W, p[0], "Great Vibes", 120, "#FFE45C", align="center")
    d.text(0, H * 0.72, W, " · ".join(p[1:]).upper(), "Montserrat", 38, "#FFFFFF", weight=700, align="center", spacing=160)
    pill(d, W / 2, H * 0.86, c["signature"], "Montserrat", 34, "#140B24", "#FFE45C", spacing=100, upper=False)
    return {"layout": "stage light beams, guitar and notes above a condensed title and band name", "typography": "Anton, Great Vibes, Montserrat caps", "palette": "night violet, neon pink, cyan, yellow", "decor": "spotlight beams, guitar and music notes"}


@design(13)
def poetry(d, c):
    W, H = d.W, d.H
    d.bg("#1E1B18")
    d.texture("grain", 0.25)
    d.art("microphone", W * 0.5, H * 0.18, W * 0.24)
    d.circle(W * 0.5, H * 0.18, W * 0.18, rad(W * 0.18, W * 0.18, W * 0.18, [(0, "rgba(255,210,120,0.3)"), (1, "rgba(255,210,120,0)")]))
    t, s = fitted(d, H * 0.34, "Poetry Night", "Playfair Display", 80, "#F3E6CB", italic=True)
    p = lines(c["message"])
    body(d, H * 0.34 + s * 1.4, p[0], "Lora", W * 0.04, "#C9B99A", italic=True)
    d.text(W * 0.1, H * 0.6, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.03, "#F2C14E", weight=700, align="center", lh=1.7, spacing=100, upper=True)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.05, "#F3E6CB", weight=600, align="center")
    return {"layout": "spot-lit microphone above an italic title", "typography": "Playfair Display italic, Lora italic, Montserrat caps, Caveat", "palette": "espresso, cream, amber", "decor": "grain, spotlight glow, microphone"}


@design(14)
def comedy(d, c):
    W, H = d.W, d.H
    d.bg("#FFD23F")
    d.rays(W / 2, H * 0.36, 0, H, 20, "#FFC300", start=0, end=360)
    d.circle(W / 2, H * 0.32, 220, "#111111")
    d.art("microphone", W / 2, H * 0.32, 260)
    t, s = fitted(d, H * 0.54, "COMEDY NIGHT", "Luckiest Guy", 180, "#E63946", stroke="#111111", sw=6)
    p = lines(c["message"])
    d.text(W * 0.08, H * 0.54 + s * 1.2, W * 0.84, p[0], "Fredoka", 52, "#111111", weight=700, align="center")
    d.text(W * 0.08, H * 0.54 + s * 1.2 + 80, W * 0.84, " · ".join(p[1:]), "Fredoka", 44, "#111111", weight=500, align="center")
    pill(d, W / 2, H * 0.9, c["signature"], "Fredoka", 40, "#FFD23F", "#111111", weight=700, spacing=60, upper=False)
    return {"layout": "mic in a black spotlight on a yellow ray burst, outlined title", "typography": "Luckiest Guy, Fredoka", "palette": "comic yellow, black, red", "decor": "rays, spotlight disc, microphone"}


@design(15)
def book_club(d, c):
    W, H = d.W, d.H
    d.bg("#EFE4D2")
    d.texture("paper", 0.5)
    d.art("books", W * 0.5, H * 0.2, W * 0.36)
    d.art("hot-beverage", W * 0.8, H * 0.26, W * 0.14)
    t, s = fitted(d, H * 0.36, "Book Club", "Playfair Display", 90, "#4A2E1E", weight=700, italic=True)
    p = lines(c["message"])
    body(d, H * 0.36 + s * 1.4, p[0], "Lora", W * 0.042, "#6E4A38", italic=True)
    d.text(W * 0.1, H * 0.62, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.03, "#4A2E1E", weight=700, align="center", lh=1.7, spacing=80, upper=True)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.055, "#B5523B", weight=600, align="center")
    return {"layout": "stack of books and a cup above a cosy italic title", "typography": "Playfair Display italic, Lora italic, Montserrat caps, Caveat", "palette": "parchment, walnut, terracotta", "decor": "paper grain, books and coffee"}


@design(16)
def fashion(d, c):
    W, H = d.W, d.H
    d.bg("#EDE8E1")
    d.photo(98, W * 0.4, -d.bleed, W * 0.6 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.35))
    t = d.text(60, 80, W * 0.36, "FASH\nION\nSHOW", "Anton", d.fit("FASH", W * 0.34, "Anton", 300), "#111111", lh=0.88)
    p = lines(c["message"])
    d.text(60, 80 + t["_h"] + 40, W * 0.34, p[0], "Playfair Display", 44, "#111111", italic=True, lh=1.2)
    d.text(60, H * 0.72, W * 0.34, "\n".join(p[1:]), "Montserrat", 28, "#111111", weight=700, lh=1.7, spacing=100, upper=True)
    d.text(60, H * 0.92, W * 0.34, c["signature"].upper(), "Montserrat", 24, "#7A7068", weight=700, spacing=300)
    return {"layout": "editorial split: stacked condensed title left, fashion photo right", "typography": "Anton, Playfair Display italic, Montserrat caps", "palette": "stone, black, photo tones", "decor": "full-height photo"}


@design(17)
def movie_night(d, c):
    W, H = d.W, d.H
    d.bg("#1B1035")
    for _ in range(40):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.5), d.rng.uniform(0.6, 1.8), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    d.rect(W * 0.06, H * 0.12, W * 0.44, H * 0.5, "#F3E6CB", rx=6, shadow_=shadow("rgba(255,230,180,0.4)", 40, 0, 0), name="Screen")
    d.art("film-frames", W * 0.28, H * 0.37, W * 0.2)
    d.art("popcorn", W * 0.2, H * 0.78, W * 0.14)
    d.art("movie-camera", W * 0.4, H * 0.8, W * 0.12)
    x0 = W * 0.56
    t = d.text(x0, H * 0.14, W * 0.4, "Movie\nNight", "Pacifico", d.fit("Movie", W * 0.36, "Pacifico", 70), "#FFD36E", lh=1.05)
    p = lines(c["message"])
    d.text(x0, H * 0.14 + t["_h"] + 10, W * 0.4, p[0], "Lora", W * 0.026, "#E3DDF5", italic=True, lh=1.45)
    d.text(x0, H * 0.66, W * 0.4, "\n".join(p[1:]), "Montserrat", W * 0.022, "#FFD36E", weight=700, lh=1.7, spacing=80, upper=True)
    d.text(x0, H * 0.88, W * 0.4, c["signature"], "Caveat", W * 0.035, "#FFFFFF", weight=600)
    return {"layout": "glowing outdoor screen and popcorn on the left, invitation right", "typography": "Pacifico, Lora italic, Montserrat caps, Caveat", "palette": "night violet, screen cream, butter", "decor": "stars, screen glow, film / popcorn / camera"}


# ---------------------------------------------------------------- community
@design(18)
def charity_run(d, c):
    poster(d, c, "#FF6B35", "#FFFFFF", "#1B1B3A", head_font="Anton", art="running-shoe" if False else "sports-medal", art_pos=(0.8, 0.14), art_size=0.26)
    return {"layout": "energetic orange poster with a medal, date tile and cause line", "typography": "Anton, Montserrat", "palette": "running orange, white, navy", "decor": "medal illustration, pill"}


@design(19)
def clean_up(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#BDE7F5"), (1, "#F6E7C8")]))
    d.wave(-d.bleed, W + d.bleed, H * 0.42, 10, 120, fill="#4FB3D9", bottom=H * 0.56)
    d.rect(-d.bleed, H * 0.55, W + 2 * d.bleed, H * 0.45 + d.bleed, "#F2D9A8")
    d.art("seedling", W * 0.2, H * 0.64, W * 0.14)
    d.art("tropical-fish", W * 0.8, H * 0.47, W * 0.12)
    d.art("sun", W * 0.84, H * 0.1, W * 0.14)
    t, s = fitted(d, H * 0.08, "Beach Clean-Up", "Luckiest Guy", 80, "#0E5A7A", w=0.66, align="left", x=W * 0.08)
    p = lines(c["message"])
    d.text(W * 0.08, H * 0.08 + s * 1.2, W * 0.66, p[0], "Fredoka", W * 0.04, "#0E3A4E", weight=600, lh=1.3)
    d.text(W * 0.1, H * 0.66, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.045, "#5A3A20", weight=700, align="center", lh=1.4)
    pill(d, W / 2, H * 0.9, c["signature"], "Fredoka", W * 0.03, "#FFFFFF", "#0E5A7A", weight=700, spacing=40, upper=False)
    return {"layout": "sea, wave and sand layers with volunteer details on the beach", "typography": "Luckiest Guy, Fredoka", "palette": "sky, sea blue, sand, ocean navy", "decor": "wave, sand band, sun, fish, seedling"}


@design(20)
def market(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4E0")
    cols = ["#E63946", "#FFFFFF"]
    for k in range(10):
        d.path([["M", k * W / 10, 0], ["L", (k + 1) * W / 10, 0], ["L", (k + 1) * W / 10, 160], ["Q", (k + 0.5) * W / 10, 220, k * W / 10, 160], ["Z"]], fill=cols[k % 2])
    for x, nm in [(0.15, "watermelon"), (0.35, "carrot"), (0.55, "honey-pot"), (0.75, "croissant"), (0.9, "sunflower")]:
        d.art(nm, W * x, H * 0.3, 150)
    t, s = fitted(d, H * 0.4, "Weekend Market", "Pacifico", 140, "#2E7D32")
    p = lines(c["message"])
    d.text(W * 0.08, H * 0.4 + s * 1.5, W * 0.84, " · ".join(p[:3]), "Fredoka", 48, "#3A2A20", weight=700, align="center")
    d.text(W * 0.08, H * 0.4 + s * 1.5 + 90, W * 0.84, "\n".join(p[3:]), "Fredoka", 42, "#5A4A3A", weight=500, align="center", lh=1.4)
    pill(d, W / 2, H * 0.88, c["signature"], "Fredoka", 40, "#FFFFFF", "#E63946", weight=700, spacing=40, upper=False)
    return {"layout": "striped market awning, a row of produce, script title and details", "typography": "Pacifico, Fredoka", "palette": "awning red, cream, leaf green", "decor": "scalloped awning, produce illustrations"}


@design(21)
def bake_sale(d, c):
    W, H = d.W, d.H
    d.bg("#FDE7EF")
    d.dots(0, 0, W, H, 22, 2, "#F9C6D8")
    for x, y, nm, s_ in [(0.24, 0.2, "cupcake", 0.24), (0.52, 0.16, "birthday-cake", 0.28), (0.8, 0.22, "cookie", 0.2), (0.86, 0.48, "doughnut", 0.16)]:
        d.art(nm, W * x, H * y, W * s_)
    t, s = fitted(d, H * 0.36, "Bake Sale!", "Luckiest Guy", 100, "#C2185B")
    p = lines(c["message"])
    body(d, H * 0.36 + s * 1.2, p[0], "Fredoka", W * 0.045, "#5A2A3A", weight=600)
    d.text(W * 0.1, H * 0.64, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.04, "#5A2A3A", weight=500, align="center", lh=1.4)
    pill(d, W / 2, H * 0.88, c["signature"], "Fredoka", W * 0.032, "#FFFFFF", "#C2185B", weight=700, spacing=40, upper=False)
    return {"layout": "cakes and treats across the top, playful title and details", "typography": "Luckiest Guy, Fredoka", "palette": "strawberry milk, raspberry", "decor": "polka dots, baked-goods illustrations"}


@design(22)
def open_day(d, c):
    poster(d, c, "#123C69", "#FFFFFF", "#F2C14E", head_font="Anton", art="school", art_pos=(0.78, 0.14), art_size=0.28)
    return {"layout": "school-navy poster with building illustration, date tile and details", "typography": "Anton, Montserrat", "palette": "navy, gold, white", "decor": "school illustration, pill"}


@design(23)
def blood_drive(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.path([["M", W / 2, H * 0.08], ["C", W * 0.66, H * 0.28, W * 0.72, H * 0.38, W * 0.72, H * 0.44], ["C", W * 0.72, H * 0.56, W * 0.62, H * 0.62, W / 2, H * 0.62], ["C", W * 0.38, H * 0.62, W * 0.28, H * 0.56, W * 0.28, H * 0.44], ["C", W * 0.28, H * 0.38, W * 0.34, H * 0.28, W / 2, H * 0.08], ["Z"]], fill=lin(0, 0, 0, H * 0.54, [(0, "#FF5A6E"), (1, "#C1121F")]), name="Drop")
    d.heart(W / 2, H * 0.44, 160, "#FFFFFF")
    t, s = fitted(d, H * 0.66, "Give blood, save lives", "Playfair Display", 90, "#C1121F", weight=800)
    p = lines(c["message"])
    d.text(W * 0.08, H * 0.66 + s * 1.4, W * 0.84, "  ·  ".join(p), "Montserrat", 38, "#3A2A2A", weight=700, align="center", lh=1.3)
    d.text(0, H * 0.9, W, c["signature"].upper(), "Montserrat", 32, "#C1121F", weight=800, align="center", spacing=400)
    return {"layout": "big gradient blood drop with a white heart, clear call to action", "typography": "Playfair Display ExtraBold, Montserrat", "palette": "white, blood red", "decor": "vector drop and heart"}


@design(24)
def community_iftar(d, c):
    W, H = d.W, d.H
    from seasonal import fanous, islamic_star_pattern
    d.bg("#123C3A")
    islamic_star_pattern(d, 0, 0, W, H, 70, "#E9C877", 0.8, 0.15)
    for x in (0.12, 0.3):
        fanous(d, W * x, H * 0.12, 140)
    x0 = W * 0.44
    t = d.text(x0, H * 0.14, W * 0.5, "Community\nIftar", "Great Vibes", d.fit("Community", W * 0.48, "Great Vibes", 80), "#E9C877", lh=1.0)
    text_metal(d, t)
    p = lines(c["message"])
    d.text(x0, H * 0.14 + t["_h"] + 12, W * 0.5, p[0], "Lora", W * 0.03, "#F3E6CB", italic=True, lh=1.4)
    d.text(x0, H * 0.66, W * 0.5, "\n".join(p[1:]), "Montserrat", W * 0.024, "#E9C877", weight=700, lh=1.7, spacing=80, upper=True)
    d.text(x0, H * 0.88, W * 0.5, c["signature"], "Caveat", W * 0.035, "#FFFFFF", weight=600)
    return {"layout": "lanterns on a teal geometric pattern, invitation on the right", "typography": "Great Vibes gold, Lora italic, Montserrat caps, Caveat", "palette": "teal, gold, cream", "decor": "star pattern, lanterns"}


# ---------------------------------------------------------------- sports & wellness
@design(25)
def yoga(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFD6A5"), (0.6, "#FFB4A2"), (1, "#E5989B")]))
    d.circle(W / 2, H * 0.4, W * 0.24, "#FFF1C1")
    d.rect(-d.bleed, H * 0.48, W + 2 * d.bleed, H * 0.52 + d.bleed, "#6D597A")
    d.wave(-d.bleed, W + d.bleed, H * 0.5, 6, 80, stroke="#B5838D", sw=2)
    d.art("lotus", W / 2, H * 0.47, W * 0.2)
    t, s = fitted(d, H * 0.08, "Sunrise Yoga", "Great Vibes", 90, "#6D3A4A")
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.58, W * 0.8, "\n".join(p), "Montserrat", W * 0.034, "#FFF4E8", weight=700, align="center", lh=1.6, spacing=100, upper=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.05, "#FFE3C4", weight=600, align="center")
    return {"layout": "sun rising over a calm sea with a lotus, schedule on the water", "typography": "Great Vibes, Montserrat caps, Caveat", "palette": "peach dawn, coral, plum sea", "decor": "sun, horizon, ripple, lotus"}


@design(26)
def marathon(d, c):
    W, H = d.W, d.H
    d.bg("#111111")
    for k in range(6):
        d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 12, 120, rgba(["#FF3D00", "#FFC400"][k % 2], 0.25), angle_deg=-25) if k == 0 else None
    t, s = fitted(d, H * 0.08, "CITY\nMARATHON", "Anton", 300, "#FFFFFF", lh=0.88)
    p = lines(c["message"])
    y = H * 0.08 + t["_h"] + 40
    for k, dist in enumerate(p[:4]):
        d.rect(W * 0.08 + k * (W * 0.84 / 4), y, W * 0.84 / 4 - 16, 150, ["#FF3D00", "#FFC400", "#FFFFFF", "#00C2A8"][k], rx=14)
        d.text(W * 0.08 + k * (W * 0.84 / 4), y + 30, W * 0.84 / 4 - 16, dist, "Anton", 80, "#111111", align="center")
    d.text(0, y + 200, W, p[4].upper(), "Montserrat", 44, "#FFFFFF", weight=800, align="center", spacing=200)
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 34, "#111111", "#FFC400", spacing=100, upper=False)
    return {"layout": "speed-stripe poster, stacked title, four distance tiles and date", "typography": "Anton, Montserrat", "palette": "black, race orange, yellow, white, teal", "decor": "diagonal speed stripes, distance tiles"}


@design(27)
def sports_day(d, c):
    W, H = d.W, d.H
    d.bg("#7CC36B")
    for k in range(5):
        d.line(-d.bleed, H * (0.6 + k * 0.08), W + d.bleed, H * (0.6 + k * 0.08), "#FFFFFF", 3, opacity=0.8)
    d.bunting(-10, W + 10, 10, 30, ["#E63946", "#F1C40F", "#3498DB", "#FFFFFF"], flags=10, fh=40)
    d.art("1st-place-medal", W * 0.22, H * 0.24, W * 0.22)
    d.art("trophy", W * 0.78, H * 0.24, W * 0.22)
    t, s = fitted(d, H * 0.38, "Sports Day!", "Luckiest Guy", 90, "#FFFFFF", stroke="#1B5E20", sw=6)
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.38 + s * 1.3, W * 0.8, "\n".join(p), "Fredoka", W * 0.042, "#0B3D12", weight=700, align="center", lh=1.35)
    pill(d, W / 2, H * 0.9, c["signature"], "Fredoka", W * 0.03, "#FFFFFF", "#E63946", weight=700, spacing=40, upper=False)
    return {"layout": "running-track lines on grass with bunting, medal and trophy", "typography": "Luckiest Guy outlined, Fredoka", "palette": "field green, white, house colours", "decor": "track lines, bunting, medal, trophy"}


@design(28)
def football_cup(d, c):
    W, H = d.W, d.H
    d.bg("#0B6E4F")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 90, 90, "rgba(255,255,255,0.05)")
    d.circle(W / 2, H * 0.5, 180, "", stroke="#FFFFFF", sw=4, opacity=0.4)
    d.line(-d.bleed, H * 0.5, W + d.bleed, H * 0.5, "#FFFFFF", 4, opacity=0.4)
    d.art("soccer-ball", W * 0.5, H * 0.5, 220)
    d.art("trophy", W * 0.84, H * 0.14, 200)
    t, s = fitted(d, H * 0.06, "5-A-SIDE CUP", "Anton", 200, "#FFFFFF", w=0.7, align="left", x=W * 0.06)
    p = lines(c["message"])
    d.text(W * 0.06, H * 0.7, W * 0.88, f"{p[0]}  ·  {p[1]}", "Montserrat", 50, "#FFE14D", weight=800, align="center")
    d.text(W * 0.06, H * 0.7 + 80, W * 0.88, " · ".join(p[2:]), "Montserrat", 40, "#FFFFFF", weight=600, align="center")
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 34, "#0B6E4F", "#FFE14D", spacing=100, upper=False)
    return {"layout": "pitch markings with the ball on the centre spot, trophy and title", "typography": "Anton, Montserrat", "palette": "pitch green, white, yellow", "decor": "centre circle, halfway line, ball, trophy"}


@design(29)
def bootcamp(d, c):
    W, H = d.W, d.H
    d.bg("#111111")
    d.polygon([(-d.bleed, H * 0.6), (W + d.bleed, H * 0.42), (W + d.bleed, H + d.bleed), (-d.bleed, H + d.bleed)], "#D4FF3A")
    t, s = fitted(d, H * 0.12, "BOOT\nCAMP", "Anton", 420, "#FFFFFF", lh=0.86)
    p = lines(c["message"])
    y = H * 0.66
    for it in p:
        d.text(W * 0.08, y, W * 0.84, it.upper(), "Anton", 90, "#111111")
        y += 120
    pill(d, W / 2, H * 0.92, c["signature"], "Montserrat", 32, "#D4FF3A", "#111111", spacing=60, upper=False)
    return {"layout": "huge stacked title on black, programme lines on a lime slash", "typography": "Anton, Montserrat", "palette": "black, white, lime", "decor": "diagonal colour block"}


# ---------------------------------------------------------------- social
@design(30)
def dinner_party(d, c):
    invite(d, c, "#F7F1E8", "#3A2A20", "#B5523B", art="fork-and-knife-with-plate")
    return {"layout": "plate crest above a script title and details", "typography": "Great Vibes, Cormorant Garamond italic, Cinzel, Montserrat caps", "palette": "linen, cocoa, terracotta", "decor": "double frame, plate illustration, divider"}


@design(31)
def cocktail(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#2B1055"), (1, "#D53A9D")]))
    d.art("cocktail-glass", W * 0.32, H * 0.22, W * 0.32, angle=-10)
    d.art("tropical-drink", W * 0.66, H * 0.24, W * 0.3, angle=10)
    d.confetti(0, 0, W, H * 0.4, ["#FFFFFF", "#FFD36E"], n=30, size=(3, 7), shapes=("circle", "star"))
    t, s = fitted(d, H * 0.42, "Cocktail Hour", "Great Vibes", 100, "#FFFFFF")
    p = lines(c["message"])
    body(d, H * 0.42 + s * 1.3, p[0], "Cormorant Garamond", W * 0.05, "#FFE6F3", italic=True)
    d.text(W * 0.1, H * 0.64, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.032, "#FFFFFF", weight=700, align="center", lh=1.6, spacing=100, upper=True)
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", W * 0.022, "#2B1055", "#FFD36E", spacing=100, upper=False)
    return {"layout": "two glasses clinking on a sunset gradient, script title", "typography": "Great Vibes, Cormorant Garamond italic, Montserrat caps", "palette": "violet to magenta, gold", "decor": "sparkles, glass illustrations"}


@design(32)
def game_night(d, c):
    W, H = d.W, d.H
    d.bg("#1F1F3A")
    from birthday_b import checker
    checker(d, W * 0.08, H * 0.08, W * 0.92, H * 0.5, 60, "#2E2E55", "#26264A")
    for x, y, nm, a in [(0.25, 0.22, "game-die", -15), (0.5, 0.3, "video-game", 5), (0.76, 0.2, "game-die", 20)]:
        d.art(nm, W * x, H * y, W * 0.22, angle=a)
    t, s = fitted(d, H * 0.56, "GAME NIGHT", "Bungee", 160, "#FFD23F")
    p = lines(c["message"])
    d.text(W * 0.08, H * 0.56 + s * 1.3, W * 0.84, p[0], "Fredoka", 48, "#FFFFFF", weight=600, align="center")
    d.text(W * 0.08, H * 0.56 + s * 1.3 + 80, W * 0.84, " · ".join(p[1:]), "Fredoka", 44, "#BFBFE0", weight=500, align="center")
    pill(d, W / 2, H * 0.9, c["signature"], "Fredoka", 40, "#1F1F3A", "#FFD23F", weight=700, spacing=40, upper=False)
    return {"layout": "dice and controller on a chessboard panel, arcade title", "typography": "Bungee, Fredoka", "palette": "midnight, board purples, yellow", "decor": "checker board, dice and controller"}


@design(33)
def bbq(d, c):
    W, H = d.W, d.H
    d.bg("#FFF3E0")
    from birthday_b import gingham
    gingham(d, -d.bleed, H * 0.7, W + d.bleed, H + d.bleed, 30, "#E53935", 0.35)
    d.art("fire", W * 0.5, H * 0.22, W * 0.26)
    d.art("watermelon", W * 0.18, H * 0.78, W * 0.18)
    d.art("tropical-drink", W * 0.84, H * 0.78, W * 0.14)
    t, s = fitted(d, H * 0.36, "BBQ Party", "Luckiest Guy", 100, "#C62828")
    p = lines(c["message"])
    body(d, H * 0.36 + s * 1.2, p[0], "Fredoka", W * 0.045, "#5A2A20", weight=600)
    d.text(W * 0.1, H * 0.56, W * 0.8, " · ".join(p[1:]), "Fredoka", W * 0.036, "#5A2A20", weight=500, align="center", lh=1.35)
    pill(d, W / 2, H * 0.66, c["signature"], "Fredoka", W * 0.03, "#FFFFFF", "#C62828", weight=700, spacing=40, upper=False)
    return {"layout": "flame above the title, picnic gingham along the bottom", "typography": "Luckiest Guy, Fredoka", "palette": "cream, grill red, watermelon", "decor": "gingham, fire, watermelon, drink"}


@design(34)
def potluck(d, c):
    W, H = d.W, d.H
    d.bg("#F6EFE3")
    for k, nm in enumerate(["pie", "pizza", "croissant", "doughnut", "bagel" if False else "cookie", "custard"]):
        a = math.radians(200 + k * 28)
        d.art(nm, W * 0.22 + 150 * math.cos(a), H * 0.52 + 150 * math.sin(a) * 1.0, 90)
    d.circle(W * 0.22, H * 0.5, 90, "#FFFFFF", stroke="#E3C9A8", sw=6)
    d.art("fork-and-knife-with-plate", W * 0.22, H * 0.5, 120)
    x0 = W * 0.48
    t = d.text(x0, H * 0.14, W * 0.48, "Potluck\nLunch", "Pacifico", d.fit("Potluck", W * 0.4, "Pacifico", 70), "#B5523B", lh=1.05)
    p = lines(c["message"])
    d.text(x0, H * 0.14 + t["_h"] + 10, W * 0.46, p[0], "Lora", W * 0.03, "#5A3A20", italic=True)
    d.text(x0, H * 0.6, W * 0.46, "\n".join(p[1:]), "Montserrat", W * 0.024, "#5A3A20", weight=700, lh=1.7, spacing=80, upper=True)
    d.text(x0, H * 0.86, W * 0.46, c["signature"], "Caveat", W * 0.035, "#B5523B", weight=600)
    return {"layout": "plate surrounded by dishes on the left, invitation on the right", "typography": "Pacifico, Lora italic, Montserrat caps, Caveat", "palette": "linen, terracotta, cocoa", "decor": "food illustrations around a plate"}


@design(35)
def quiz_night(d, c):
    W, H = d.W, d.H
    d.bg("#14213D")
    for k in range(12):
        d.text(d.rng.uniform(0, W - 100), d.rng.uniform(0, H), 120, "?", "Luckiest Guy", d.rng.uniform(60, 160), "#FCA311", opacity=d.rng.uniform(0.08, 0.2))
    d.art("light-bulb", W / 2, H * 0.2, W * 0.24)
    t, s = fitted(d, H * 0.36, "QUIZ NIGHT", "Luckiest Guy", 200, "#FCA311")
    p = lines(c["message"])
    y = H * 0.36 + s * 1.3
    for it in p:
        d.text(0, y, W, it, "Montserrat", 46, "#FFFFFF", weight=700, align="center")
        y += 72
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 34, "#14213D", "#FCA311", spacing=100, upper=False)
    return {"layout": "bulb above a bold title, floating question marks behind", "typography": "Luckiest Guy, Montserrat", "palette": "navy, orange, white", "decor": "question marks, light bulb"}


@design(36)
def reunion_class(d, c):
    W, H = d.W, d.H
    d.bg("#F3EFE6")
    from birthday_d import polaroid
    polaroid(d, W * 0.08, H * 0.06, W * 0.38, 656, -6, focus=(0.5, 0.35))
    polaroid(d, W * 0.52, H * 0.1, W * 0.38, 386, 6, focus=(0.5, 0.4), tape="#B9DCC9")
    t, s = fitted(d, H * 0.52, "Class of 2017 Reunion", "Playfair Display", 70, "#1F3349", weight=700, italic=True)
    p = lines(c["message"])
    d.text(0, H * 0.52 + s * 1.3, W, p[0], "Caveat", W * 0.07, "#E2572A", weight=700, align="center")
    d.text(W * 0.1, H * 0.7, W * 0.8, "\n".join(p[1:]), "Montserrat", W * 0.03, "#1F3349", weight=700, align="center", lh=1.6, spacing=60, upper=True)
    d.text(0, H * 0.88, W, c["signature"], "Lora", W * 0.034, "#4A5568", italic=True, align="center")
    return {"layout": "two taped polaroids, italic reunion title and details", "typography": "Playfair Display italic, Caveat, Montserrat caps, Lora italic", "palette": "linen, navy, orange", "decor": "polaroids with tape"}


@design(37)
def prom(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.3, H, [(0, "#3A1C71"), (1, "#0C0620")]))
    for _ in range(80):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.6, 2.4), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    d.art("mirror-ball", W / 2, H * 0.2, W * 0.3, shadow_=shadow("rgba(200,150,255,0.6)", 60, 0, 0))
    t, s = fitted(d, H * 0.38, "PROM NIGHT", "Cinzel", 160, "#E9C877", weight=700, spacing=100)
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.38 + s * 1.4, W, p[0], "Great Vibes", 110, "#FFFFFF", align="center")
    d.text(0, H * 0.38 + s * 1.4 + 150, W, " · ".join(p[1:]).upper(), "Montserrat", 36, "#D9CCFF", weight=700, align="center", spacing=200)
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 32, "#0C0620", "#E9C877", spacing=100, upper=False)
    return {"layout": "mirror ball over gold caps and a starry script line", "typography": "Cinzel gold, Great Vibes, Montserrat caps", "palette": "deep violet, gold, starlight", "decor": "stars, mirror ball glow"}


@design(38)
def retirement_party(d, c):
    invite(d, c, "#EEF3F1", "#1F3B32", "#3E8E7E", script="Great Vibes", art="party-popper")
    return {"layout": "popper crest above a script title and formal details", "typography": "Great Vibes, Cormorant Garamond italic, Cinzel, Montserrat caps", "palette": "mint white, forest, jade", "decor": "double frame, party popper, divider"}


@design(39)
def ticket(d, c):
    W, H = d.W, d.H
    d.bg("#F2E8D5")
    d.rect(W * 0.06, H * 0.03, W * 0.88, H * 0.94, "#1B2A4A", rx=16, name="Ticket")
    for y in (H * 0.7,):
        d.circle(W * 0.06, y, 18, "#F2E8D5")
        d.circle(W * 0.94, y, 18, "#F2E8D5")
        d.line(W * 0.1, y, W * 0.9, y, "#F2C14E", 2, dash=[6, 6])
    d.text(W * 0.06, H * 0.06, W * 0.88, "★ ★ ★", "DM Sans", W * 0.06, "#F2C14E", align="center")
    t = d.text(W * 0.06, H * 0.1, W * 0.88, "ADMIT\nONE", "Anton", W * 0.26, "#FFFFFF", align="center", lh=0.9)
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.1 + t["_h"] + 20, W * 0.8, "\n".join(p), "Montserrat", W * 0.05, "#F2C14E", weight=700, align="center", lh=1.6)
    d.text(W * 0.06, H * 0.76, W * 0.88, c["signature"], "Montserrat", W * 0.05, "#FFFFFF", weight=700, align="center", spacing=200)
    for k in range(18):
        w_ = d.rng.choice([3, 5, 8])
        d.rect(W * 0.2 + k * W * 0.034, H * 0.83, w_, H * 0.08, "#FFFFFF")
    return {"layout": "tall navy ticket with notches, perforation and barcode stub", "typography": "Anton, Montserrat", "palette": "navy, gold, cream", "decor": "notches, dashed perforation, stars, barcode"}


@design(40)
def save_event_story(d, c):
    W, H = d.W, d.H
    d.bg("#0B0B0C")
    d.frame_border(60, "#C9A45A", 2, double=14)
    p = lines(c["message"])
    d.text(0, H * 0.2, W, "SAVE THE DATE", "Montserrat", 50, "#C9A45A", weight=800, align="center", spacing=600)
    t, s = fitted(d, H * 0.28, p[0], "Great Vibes", 200, "#F3E6CB", w=0.8)
    text_metal(d, t)
    m = re.search(r"(\d{1,2}) (\w+) (\d{4})", p[1])
    if m:
        d.text(0, H * 0.48, W, m.group(1), "Playfair Display", 360, "#FFFFFF", weight=700, align="center", lh=0.9)
        d.text(0, H * 0.48 + 360, W, f"{m.group(2).upper()} {m.group(3)}", "Montserrat", 60, "#C9A45A", weight=700, align="center", spacing=500)
    d.text(0, H * 0.84, W, c["signature"], "Cormorant Garamond", 56, "#E7E1D2", italic=True, align="center")
    return {"layout": "framed black story: caps label, gold script event, giant day number", "typography": "Montserrat spaced caps, Great Vibes gold, Playfair Display", "palette": "black, gold, ivory", "decor": "double frame"}
