"""Collection 500 — Baby and family occasions (baby-001 … baby-040)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body

CATEGORY = "Baby and family occasions"
SITE_CATEGORY = "Love & Family"
TAG = "baby"

C = 480, 673
A5 = 559, 794
L = 673, 480
SQ = 1080, 1080
ST = 1080, 1920
PO = 1080, 1350

SPEC = [
    ("Baby Shower", "Oh Baby Balloon Shower Invitation", *C, "Oh baby!", "Join us for a baby shower honouring Sara · Saturday 13 March 2027 · 3 PM · The Garden Room, Jumeirah", "RSVP to Lina · 050 111 2233", "oh baby balloon baby shower invitation", "baby shower invitation, oh baby, balloons"),
    ("Baby Shower", "Little Cloud Baby Shower Invitation", *C, "A little cloud of joy", "Baby shower for Mariam · Friday 9 April · 4 PM · Grandma’s house", "Gifts: books instead of cards", "cloud baby shower invitation pastel", "baby shower invitation, cloud, pastel"),
    ("Baby Shower", "Teddy Bear Baby Shower Invitation", *A5, "We can bear-ly wait!", "Baby shower for Noor · Saturday 22 May · 11 AM · The Tea Room, Al Barsha", "RSVP by 15 May", "teddy bear baby shower invitation", "baby shower, teddy bear"),
    ("Baby Shower", "Botanical Baby Shower Invitation", *C, "Baby Shower", "Celebrating Hana & baby girl · Sunday 6 June · 2 PM · Al Barari Greenhouse", "Brunch will be served", "botanical greenery baby shower invitation", "baby shower invitation, botanical"),
    ("Baby Shower", "Twinkle Little Star Baby Shower", *C, "Twinkle twinkle little star", "Baby shower for Aisha · Saturday 17 July · 5 PM · Villa 8, Mirdif", "RSVP to Huda", "twinkle little star baby shower invitation", "baby shower, stars, moon"),
    ("Baby Shower", "Baby Shower Games Sign", *PO, "Baby Shower Games", "Guess the due date · Diaper raffle · Name that baby animal · Advice for the parents", "Prizes for the winners!", "baby shower games sign", "baby shower games, sign"),
    ("Baby Shower", "Baby Shower Welcome Sign", *A5, "Welcome to Sara’s baby shower", "Oh baby, we can’t wait to meet you!", "13.03.2027", "baby shower welcome sign", "baby shower welcome sign"),
    ("Baby Shower", "Baby Shower Thank You Card", *L, "Thank you", "for showering us with love — baby and we are so grateful.", "Sara & Adam", "baby shower thank you card", "baby shower thank you card"),
    ("Gender Reveal", "Boy or Girl Gender Reveal Invitation", *C, "He or She?", "Join us for our gender reveal · Saturday 20 February · 4 PM · The Park, Al Safa", "Wear pink or blue!", "boy or girl gender reveal invitation", "gender reveal invitation, pink or blue"),
    ("Gender Reveal", "It’s a Girl Reveal Post", *SQ, "It’s a girl!", "Our little princess arrives this summer", "", "it's a girl gender reveal post pink", "it's a girl, gender reveal post"),
    ("Gender Reveal", "It’s a Boy Reveal Post", *SQ, "It’s a boy!", "Our little champ arrives this autumn", "", "it's a boy gender reveal post blue", "it's a boy, gender reveal post"),
    ("Gender Reveal", "Gender Reveal Party Story", *ST, "Gender Reveal Party", "Pink or blue? Find out with us · Sat 20 Feb · 4 PM", "Al Safa Park · bring your guess!", "gender reveal party instagram story", "gender reveal story, party"),
    ("Birth Announcement", "Newborn Photo Birth Announcement", *L, "Hello, world!", "Yusuf Omar · born 2 March 2027 · 3.4 kg · 51 cm", "Proud parents Sara & Omar", "newborn photo birth announcement card", "birth announcement, newborn photo"),
    ("Birth Announcement", "Welcome Baby Girl Announcement", *C, "Welcome, Layla", "Born 14 April 2027 · 7:42 AM · 3.1 kg", "With love, Hana & Karim", "welcome baby girl birth announcement pink", "birth announcement, baby girl"),
    ("Birth Announcement", "Welcome Baby Boy Announcement", *C, "Welcome, Adam", "Born 8 June 2027 · 2:15 PM · 3.6 kg", "With love, Mariam & Yousef", "welcome baby boy birth announcement blue", "birth announcement, baby boy"),
    ("Birth Announcement", "Baby Stats Birth Announcement Post", *SQ, "Say hello to Zain", "Born 21.08.2027 · 3.3 kg · 50 cm · 10:05 PM", "", "baby stats birth announcement instagram", "birth announcement post, baby stats"),
    ("Birth Announcement", "Little Miracle Announcement Story", *ST, "Our little miracle", "Noor · born 30 September 2027", "Thank you for all your love", "little miracle birth announcement story", "birth announcement story"),
    ("Birth Announcement", "Twins Birth Announcement", *L, "Double the love", "Ali & Omar · born 5 October 2027", "The Haddad family", "twins birth announcement card", "twins birth announcement"),
    ("Birth Announcement", "Minimal Birth Announcement", *C, "Rayan", "02 · 11 · 2027", "3.5 kg · 52 cm", "minimal modern birth announcement", "birth announcement, minimal"),
    ("Birth Announcement", "Boho Rainbow Baby Announcement", *C, "Our rainbow baby", "Amal · born 12 December 2027", "After the storm comes the rainbow", "boho rainbow baby announcement", "rainbow baby announcement, boho"),
    ("Celebrations", "Aqiqah Celebration Invitation", *A5, "Aqiqah", "Celebrating the blessing of our son Ibrahim · Friday 16 April · after Asr · Al Majlis, Al Ain", "With gratitude, the Al Mansoori family", "aqiqah invitation elegant", "aqiqah invitation, newborn celebration"),
    ("Celebrations", "Baptism Invitation", *C, "Baptism", "Please join us for the baptism of Sophia · Sunday 25 April · 10 AM · St. Mary’s Church", "Lunch to follow", "baptism invitation elegant baby", "baptism invitation, christening"),
    ("Celebrations", "Naming Ceremony Invitation", *L, "Naming Ceremony", "for our daughter · Saturday 8 May · 5 PM · Garden of the Patel home", "Sweets & dinner to follow", "naming ceremony invitation baby", "naming ceremony invitation"),
    ("Celebrations", "Baby’s First Eid Card", *C, "Baby’s first Eid", "Eid Mubarak from our family to yours", "Sara, Omar & little Yusuf", "baby first eid card", "baby's first eid, eid card"),
    ("Milestones", "Monthly Baby Milestone Card", *SQ, "3 months", "Today I can laugh out loud and hold my head up high", "", "monthly baby milestone card", "baby milestone card, monthly"),
    ("Milestones", "First Steps Milestone Post", *SQ, "First steps!", "Watch out world — Layla is on the move", "", "baby first steps milestone post", "first steps, baby milestone"),
    ("Milestones", "Half Birthday Post", *SQ, "Half way to one!", "Happy 6 months, Adam", "", "baby half birthday 6 months post", "half birthday, 6 months"),
    ("Milestones", "Hello Tooth Milestone Card", *C, "My first tooth", "Arrived on 3 February — no more gummy smiles!", "", "baby first tooth milestone card", "first tooth, baby milestone"),
    ("Announcements", "Pregnancy Announcement Post", *SQ, "Baby coming soon", "Our family is growing · due June 2027", "", "pregnancy announcement post", "pregnancy announcement, baby coming soon"),
    ("Announcements", "Big Sister Announcement Card", *C, "I’m going to be a big sister!", "Coming this summer", "Love, Mira (age 4)", "big sister announcement card", "big sister announcement, sibling"),
    ("Announcements", "Big Brother Announcement Card", *C, "Promoted to big brother!", "Coming spring 2027", "— Omar, age 5", "big brother announcement card", "big brother announcement, sibling"),
    ("Announcements", "Pregnancy Countdown Story", *ST, "12 weeks to go", "until we meet our little one", "", "pregnancy countdown story", "pregnancy countdown, story"),
    ("Family", "Family Reunion Invitation", *A5, "Family Reunion", "The Al Habtoor family gathers again · Friday 2 July · 12 PM onwards · Hatta Farm House", "Bring your favourite dish & old photos", "family reunion invitation summer", "family reunion invitation"),
    ("Family", "Family Photo Day Post", *SQ, "Family is everything", "Sunday afternoons with the people who matter most", "", "family photo instagram post", "family post, photo"),
    ("Family", "Grandparents Day Card", *C, "Happy Grandparents Day", "Thank you for the stories, the sweets and the endless love.", "From all your grandchildren", "grandparents day card", "grandparents day card"),
    ("Family", "Mother and Daughter Card", *C, "Like mother, like daughter", "My first friend, my forever friend.", "Love, Yara", "mother and daughter card photo", "mother daughter card"),
    ("Family", "Father and Son Card", *C, "Like father, like son", "Thanks for teaching me everything — even the bad jokes.", "— Zaid", "father and son card", "father son card"),
    ("Family", "Welcome Home Baby Sign", *PO, "Welcome home, baby Noor", "We’ve been waiting for you", "Mum, Dad & Teddy the cat", "welcome home baby sign", "welcome home baby, sign"),
    ("Family", "New Parents Congratulations Card", *C, "Congratulations, new parents!", "Wishing you sweet cuddles and (some) sleep.", "With love, Auntie Dana", "new parents congratulations card", "new baby card, congratulations"),
    ("Family", "Adoption Announcement Card", *L, "Our family grew by one", "Welcome home, Leo — chosen and loved", "The Morgan family", "adoption announcement card", "adoption announcement, family"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def cloud(d, cx, cy, s, fill="#FFFFFF", opacity=1):
    for dx, dy, r in [(-0.35, 0.1, 0.32), (0, -0.1, 0.42), (0.38, 0.08, 0.3), (0.12, 0.18, 0.3), (-0.12, 0.2, 0.28)]:
        d.circle(cx + dx * s, cy + dy * s, r * s, fill, opacity=opacity, name="Cloud")


def details(d, y, parts, size, color, family="Montserrat", weight=600, upper=True, spacing=120, lh=1.7, w=0.8):
    W = d.W
    return d.text(W * (1 - w) / 2, y, W * w, "\n".join(parts), family, size, color, weight=weight, align="center", upper=upper, spacing=spacing, lh=lh)


PINK = ["#F7B6C8", "#FCE4EC", "#E8829F"]
BLUE = ["#A9CDEB", "#E3F0FA", "#5E9BD1"]


# ---------------------------------------------------------------- baby shower
@design(1)
def oh_baby(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6F0")
    for x, y, r, col in [(0.2, 0.14, 46, "#F3C9B8"), (0.38, 0.08, 52, "#E9D8C8"), (0.62, 0.1, 48, "#CFE0E8"), (0.8, 0.16, 44, "#F3C9B8"), (0.5, 0.2, 40, "#FFFFFF")]:
        d.balloon(W * x, H * y, r, col, string="#C9B8A8", tail=H * 0.32 - H * y)
    t, s = fitted(d, H * 0.36, "Oh baby!", "Great Vibes", 110, "#8C5A4A")
    p = lines(c["message"])
    body(d, H * 0.36 + s * 1.3, p[0], "Lora", W * 0.036, "#6A5048", italic=True)
    divider(d, W / 2, H * 0.6, W * 0.28, "#C9A07E", 1, gap=7)
    details(d, H * 0.63, p[1:], W * 0.028, "#4A3A34")
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.05, "#8C5A4A", weight=600, align="center")
    return {"layout": "neutral balloon bunch above a script ‘Oh baby!’ and centred details", "typography": "Great Vibes, Lora italic, Montserrat caps, Caveat", "palette": "cream, clay, sand, sky", "decor": "five glossy balloons, divider"}


@design(2)
def little_cloud(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#DCEBF8"), (1, "#FDF3F6")]))
    cloud(d, W * 0.5, H * 0.2, W * 0.36)
    for k in range(7):
        x = W * (0.32 + k * 0.06)
        d.ellipse(x, H * 0.34 + (k % 2) * 14, 4, 8, "#A9CDEB")
    cloud(d, W * 0.14, H * 0.08, W * 0.14, opacity=0.8)
    cloud(d, W * 0.88, H * 0.34, W * 0.12, opacity=0.8)
    t, s = fitted(d, H * 0.44, "A little cloud of joy", "Playfair Display", 60, "#3E5A7A", italic=True, weight=600)
    p = lines(c["message"])
    body(d, H * 0.44 + s * 1.5, p[0], "Lora", W * 0.04, "#4F6A88")
    details(d, H * 0.64, p[1:], W * 0.03, "#3E5A7A")
    d.text(0, H * 0.87, W, c["signature"], "Caveat", W * 0.05, "#E8829F", weight=600, align="center")
    return {"layout": "soft vector cloud raining little drops above the invitation", "typography": "Playfair Display italic, Lora, Montserrat caps, Caveat", "palette": "baby blue to blush", "decor": "layered circle clouds, rain drops"}


@design(3)
def bear_shower(d, c):
    W, H = d.W, d.H
    d.bg("#F6EDE3")
    d.circle(W / 2, H * 0.28, W * 0.26, "#EAD8C4")
    d.art("teddy-bear", W / 2, H * 0.28, W * 0.4)
    for x, y in [(0.2, 0.16), (0.8, 0.14), (0.84, 0.36)]:
        d.balloon(W * x, H * y, 30, "#D8B79A", string="#BFA58A", tail=90)
    t, s = fitted(d, H * 0.5, "We can bear-ly wait!", "Fredoka", 70, "#7A5236", weight=700)
    p = lines(c["message"])
    body(d, H * 0.5 + s * 1.3, p[0], "Lora", W * 0.036, "#6A4E3A", italic=True)
    details(d, H * 0.67, p[1:], W * 0.028, "#4A3424")
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", W * 0.022, "#FFFFFF", "#7A5236", spacing=200)
    return {"layout": "teddy bear in a beige circle with balloons, pun headline and details", "typography": "Fredoka bold, Lora italic, Montserrat caps", "palette": "oat, caramel, cocoa", "decor": "teddy illustration, balloons, RSVP pill"}


@design(4)
def botanical_shower(d, c):
    W, H = d.W, d.H
    d.bg("#F5F7F2")
    for side in (-1, 1):
        for k in range(9):
            y = H * (0.04 + k * 0.035)
            d.leaf(W / 2 + side * (W * 0.12 + k * 14), y + 30, 50, 14, 90 + side * (50 + k * 4), ["#7E9A73", "#A6BC98"][k % 2])
    d.art("baby-bottle", W / 2, H * 0.17, W * 0.14)
    t, s = fitted(d, H * 0.3, "Baby Shower", "Great Vibes", 100, "#3D5A47")
    p = lines(c["message"])
    body(d, H * 0.3 + s * 1.3, p[0], "Lora", W * 0.04, "#4E5F55", italic=True)
    divider(d, W / 2, H * 0.56, W * 0.3, "#9DB38A", 1, gap=7)
    details(d, H * 0.59, p[1:], W * 0.03, "#2E3B32")
    d.text(0, H * 0.86, W, c["signature"], "Lora", W * 0.034, "#3D5A47", italic=True, align="center")
    return {"layout": "leafy garland crown with a bottle, script title and details", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "white, sage, forest", "decor": "leaf garland, bottle illustration"}


@design(5)
def twinkle_star(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1E2A55"), (1, "#3B4A8A")]))
    for _ in range(50):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.6, 2), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    for x, len_, s_ in [(0.25, 0.1, 30), (0.5, 0.16, 40), (0.75, 0.08, 26)]:
        d.line(W * x, -d.bleed, W * x, H * len_, "#F3D58A", 1)
        d.star(W * x, H * len_ + s_, s_, metal(2 * s_, 2 * s_))
    d.art("crescent-moon", W * 0.82, H * 0.28, W * 0.16, angle=-15)
    t, s = fitted(d, H * 0.36, "Twinkle twinkle\nlittle star", "Great Vibes", 80, "#F3E6CB", lh=1.0)
    p = lines(c["message"])
    body(d, H * 0.36 + s * 2.4, p[0], "Lora", W * 0.036, "#D6DCF0", italic=True)
    details(d, H * 0.68, p[1:], W * 0.028, "#F3D58A")
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.05, "#FFFFFF", weight=600, align="center")
    return {"layout": "gold stars hanging on threads in a night sky, lullaby title", "typography": "Great Vibes, Lora italic, Montserrat caps, Caveat", "palette": "nursery navy, gold, cream", "decor": "hanging gold stars, starfield, moon"}


@design(6)
def shower_games(d, c):
    W, H = d.W, d.H
    d.bg("#FDF2F4")
    d.bunting(-10, W + 10, 10, 40, ["#F7B6C8", "#A9CDEB", "#FFE08A", "#C9E7C2"], flags=10, fh=60)
    t, s = fitted(d, 130, "Baby Shower\nGames", "Fredoka", 130, "#C2547A", weight=700, lh=1.0)
    y = 130 + s * 2.4
    for k, g in enumerate(lines(c["message"])):
        d.circle(140, y + 40, 40, ["#F7B6C8", "#A9CDEB", "#FFE08A", "#C9E7C2"][k])
        d.text(100, y + 10, 80, str(k + 1), "Fredoka", 44, "#FFFFFF", weight=700, align="center")
        d.text(210, y + 6, W - 300, g, "Fredoka", 52, "#4A3A44", weight=600)
        y += 140
    d.art("baby-bottle", W * 0.84, H * 0.86, 160, angle=15)
    pill(d, W * 0.42, H * 0.9, c["signature"], "Fredoka", 40, "#FFFFFF", "#C2547A", weight=600, spacing=40, upper=False)
    return {"layout": "bunting header and a numbered list of party games", "typography": "Fredoka", "palette": "blush, pastel pink / blue / butter / mint", "decor": "bunting, numbered circles, bottle"}


@design(7)
def shower_welcome(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6F0")
    d.texture("paper", 0.4)
    aw, ah = W * 0.76, H * 0.8
    ax, ay = (W - aw) / 2, H * 0.1
    d.path([["M", ax, ay + ah], ["L", ax, ay + aw / 2], ["C", ax, ay + aw * 0.22, ax + aw * 0.22, ay, W / 2, ay], ["C", ax + aw * 0.78, ay, ax + aw, ay + aw * 0.22, ax + aw, ay + aw / 2], ["L", ax + aw, ay + ah], ["Z"]], fill="#F3E3D8", name="Arch")
    for x, y, r, col in [(0.36, 0.2, 30, "#F3C9B8"), (0.5, 0.15, 34, "#CFE0E8"), (0.64, 0.2, 30, "#E9D8C8")]:
        d.balloon(W * x, H * y, r, col, string="#C9B8A8", tail=60)
    t, s = fitted(d, H * 0.36, "Welcome", "Great Vibes", 100, "#8C5A4A")
    d.text(W * 0.16, H * 0.36 + s * 1.2, W * 0.68, "TO SARA’S BABY SHOWER", "Cinzel", W * 0.034, "#4A3A34", weight=600, align="center", spacing=160)
    body(d, H * 0.6, c["message"], "Lora", W * 0.04, "#6A5048", italic=True, w=0.6)
    d.text(0, H * 0.8, W, c["signature"], "Montserrat", W * 0.028, "#8C5A4A", weight=600, align="center", spacing=300)
    return {"layout": "arch panel with three balloons, script welcome and event name", "typography": "Great Vibes, Cinzel, Lora italic, Montserrat", "palette": "cream, blush clay, sky", "decor": "paper grain, arch, balloons"}


@design(8)
def shower_thanks(d, c):
    W, H = d.W, d.H
    d.bg("#FDF4F6")
    d.rect(-d.bleed, -d.bleed, W * 0.42 + d.bleed, H + 2 * d.bleed, "#F6D9E1")
    d.dots(-d.bleed, -d.bleed, W * 0.42, H + d.bleed, 22, 2, "#FFFFFF")
    d.art("baby-bottle", W * 0.14, H * 0.32, W * 0.14, angle=-15)
    d.art("teddy-bear", W * 0.26, H * 0.62, W * 0.24)
    x0 = W * 0.48
    t = d.text(x0, H * 0.18, W * 0.46, "Thank you", "Great Vibes", d.fit("Thank you", W * 0.44, "Great Vibes", 80), "#B23A5E")
    d.text(x0, H * 0.18 + t["_h"] + 10, W * 0.44, c["message"], "Lora", W * 0.03, "#5A3D46", italic=True, lh=1.5)
    d.text(x0, H * 0.8, W * 0.44, c["signature"], "Montserrat", W * 0.022, "#B23A5E", weight=700, spacing=200, upper=True)
    return {"layout": "dotted blush panel with baby illustrations, thank-you note right", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "blush, raspberry, white", "decor": "polka dots, bottle and teddy"}


# ---------------------------------------------------------------- gender reveal
@design(9)
def he_or_she(d, c):
    W, H = d.W, d.H
    b = d.bleed
    d.bg("#FCE4EC")
    d.polygon([(W / 2, -b), (W + b, -b), (W + b, H + b), (W / 2, H + b)], "#E3F0FA")
    d.balloon(W * 0.28, H * 0.2, 54, "#F48FB1", tail=120)
    d.balloon(W * 0.72, H * 0.2, 54, "#7FB3E6", tail=120)
    d.text(0, H * 0.36, W / 2, "He", "Pacifico", W * 0.15, "#5E9BD1", align="center")
    d.text(W / 2, H * 0.36, W / 2, "She", "Pacifico", W * 0.15, "#E8829F", align="center")
    d.circle(W / 2, H * 0.45, W * 0.07, "#FFFFFF")
    d.text(W / 2 - W * 0.07, H * 0.45 - W * 0.045, W * 0.14, "or", "Playfair Display", W * 0.05, "#7A6A80", italic=True, align="center")
    p = lines(c["message"])
    body(d, H * 0.58, p[0], "Lora", W * 0.038, "#4A3A50", italic=True)
    details(d, H * 0.68, p[1:], W * 0.03, "#4A3A50")
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", W * 0.024, "#FFFFFF", "#9C7BB8", spacing=160)
    return {"layout": "pink and blue halves with a balloon each, ‘He or She?’ meeting in the middle", "typography": "Pacifico, Playfair Display italic, Lora, Montserrat caps", "palette": "baby pink, baby blue, lilac", "decor": "split background, balloons, centre disc"}


def reveal(d, c, cols, art):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, cols[1]), (1, "#FFFFFF")]))
    d.confetti(0, 0, W, H, [cols[0], cols[2], "#FFFFFF", "#FFE08A"], n=90, size=(6, 14), shapes=("circle", "rect", "strip"), avoid=[(W * 0.08, H * 0.28, W * 0.92, H * 0.85)])
    d.art(art, W / 2, H * 0.36, W * 0.3)
    t, s = fitted(d, H * 0.54, c["headline"], "Pacifico", 170, cols[2])
    body(d, H * 0.54 + s * 1.6, c["message"], "Fredoka", 50, "#4A3A50", weight=500)


@design(10)
def its_a_girl(d, c):
    reveal(d, c, PINK, "ribbon")
    return {"layout": "pink confetti burst around a bow and a script reveal", "typography": "Pacifico, Fredoka", "palette": "baby pink, rose, gold", "decor": "confetti, bow illustration"}


@design(11)
def its_a_boy(d, c):
    reveal(d, c, BLUE, "teddy-bear")
    return {"layout": "blue confetti burst around a teddy and a script reveal", "typography": "Pacifico, Fredoka", "palette": "baby blue, navy, gold", "decor": "confetti, teddy illustration"}


@design(12)
def reveal_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#F7B6C8"), (1, "#A9CDEB")]))
    d.balloon(W * 0.3, H * 0.2, 150, "#F48FB1", tail=500)
    d.balloon(W * 0.7, H * 0.18, 150, "#7FB3E6", tail=520)
    d.text(W * 0.3 - 100, H * 0.2 - 50, 200, "?", "Luckiest Guy", 120, "#FFFFFF", align="center")
    d.text(W * 0.7 - 100, H * 0.18 - 50, 200, "?", "Luckiest Guy", 120, "#FFFFFF", align="center")
    d.rect(W * 0.08, H * 0.56, W * 0.84, H * 0.34, "#FFFFFF", rx=50)
    t = d.text(W * 0.08, H * 0.59, W * 0.84, "Gender Reveal\nParty", "Fredoka", d.fit("Gender Reveal", W * 0.74, "Fredoka", 160, 700), "#9C5BB8", weight=700, align="center", lh=1.0)
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.59 + t["_h"] + 30, W * 0.76, p[0], "Fredoka", 50, "#4A3A50", weight=600, align="center")
    d.text(W * 0.12, H * 0.59 + t["_h"] + 110, W * 0.76, " · ".join(p[1:]), "Fredoka", 44, "#7A6A80", weight=500, align="center")
    d.text(W * 0.12, H * 0.84, W * 0.76, c["signature"], "Caveat", 56, "#E8829F", weight=700, align="center")
    return {"layout": "two question-mark balloons over a white details card", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "pink to blue gradient, purple, white", "decor": "two big balloons, rounded card"}


# ---------------------------------------------------------------- birth announcements
@design(13)
def newborn_photo(d, c):
    W, H = d.W, d.H
    d.bg("#F7F1EA")
    d.photo(644, W * 0.05, H * 0.07, W * 0.5, H * 0.86, frame="rounded", rx=16, focus=(0.42, 0.45))
    x0 = W * 0.6
    t = d.text(x0, H * 0.14, W * 0.36, "Hello,\nworld!", "Playfair Display", d.fit("world!", W * 0.34, "Playfair Display", 70, 600, True), "#4A3A34", weight=600, italic=True, lh=1.0)
    p = lines(c["message"])
    d.text(x0, H * 0.14 + t["_h"] + 18, W * 0.36, p[0], "Great Vibes", W * 0.055, "#B07A5A")
    y = H * 0.14 + t["_h"] + 18 + W * 0.08
    for it in p[1:]:
        d.text(x0, y, W * 0.36, it.upper(), "Montserrat", W * 0.02, "#4A3A34", weight=700, spacing=200)
        y += W * 0.045
    d.line(x0, H * 0.8, x0 + 50, H * 0.8, "#B07A5A", 1.2)
    d.text(x0, H * 0.83, W * 0.36, c["signature"], "Lora", W * 0.024, "#6A5048", italic=True)
    return {"layout": "tall newborn photo left, announcement stack right", "typography": "Playfair Display italic, Great Vibes, Montserrat caps, Lora italic", "palette": "linen, cocoa, clay", "decor": "rounded photo, short rule"}


def welcome_baby(d, c, cols, art):
    W, H = d.W, d.H
    d.bg(cols[1])
    d.circle(W / 2, H * 0.3, W * 0.28, "#FFFFFF")
    d.circle(W / 2, H * 0.3, W * 0.28, "", stroke=cols[0], sw=3, dash=[3, 8])
    d.art(art, W / 2, H * 0.3, W * 0.34)
    t, s = fitted(d, H * 0.52, c["headline"], "Great Vibes", 100, cols[2])
    p = lines(c["message"])
    details(d, H * 0.52 + s * 1.4, p, W * 0.03, "#4A3A44")
    d.text(0, H * 0.86, W, c["signature"], "Lora", W * 0.034, cols[2], italic=True, align="center")


@design(14)
def welcome_girl(d, c):
    welcome_baby(d, c, PINK, "baby-bottle")
    return {"layout": "stitched white circle with a bottle, script name and birth details", "typography": "Great Vibes, Montserrat caps, Lora italic", "palette": "blush, rose", "decor": "dashed stitch ring, bottle illustration"}


@design(15)
def welcome_boy(d, c):
    welcome_baby(d, c, BLUE, "teddy-bear")
    return {"layout": "stitched white circle with a teddy, script name and birth details", "typography": "Great Vibes, Montserrat caps, Lora italic", "palette": "powder blue, denim", "decor": "dashed stitch ring, teddy illustration"}


@design(16)
def baby_stats(d, c):
    W, H = d.W, d.H
    d.bg("#F3EEE7")
    d.photo(1121, 60, 60, W * 0.52, H - 120, frame="rounded", rx=30, focus=(0.42, 0.5))
    x0 = W * 0.6
    t = d.text(x0, 90, W * 0.36, "Say hello\nto Zain", "Playfair Display", d.fit("Say hello", W * 0.34, "Playfair Display", 90, 600, True), "#2E3B4E", weight=600, italic=True, lh=1.0)
    stats = lines(c["message"])
    labels = ["BORN", "WEIGHT", "LENGTH", "TIME"]
    y = 90 + t["_h"] + 50
    for lab, val in zip(labels, stats):
        d.text(x0, y, W * 0.36, lab, "Montserrat", 24, "#B07A5A", weight=700, spacing=300)
        d.text(x0, y + 34, W * 0.36, val.replace("Born ", ""), "Playfair Display", 52, "#2E3B4E", weight=600)
        d.line(x0, y + 110, x0 + W * 0.32, y + 110, "#D9CFC2", 1.5)
        y += 140
    return {"layout": "rounded baby photo left, labelled birth stats right", "typography": "Playfair Display italic, Montserrat caps labels", "palette": "linen, navy, clay", "decor": "rules between stats"}


@design(17)
def little_miracle(d, c):
    W, H = d.W, d.H
    d.bg("#FBF4EE")
    d.photo(644, 0, 0, W, H * 0.6, focus=(0.42, 0.45))
    d.wave(-d.bleed, W + d.bleed, H * 0.58, 20, 360, fill="#FBF4EE", bottom=H + d.bleed)
    t, s = fitted(d, H * 0.64, "Our little miracle", "Great Vibes", 180, "#8C5A4A")
    p = lines(c["message"])
    d.text(0, H * 0.64 + s * 1.3, W, p[0], "Playfair Display", 90, "#4A3A34", weight=600, align="center")
    d.text(0, H * 0.64 + s * 1.3 + 120, W, p[1].upper(), "Montserrat", 34, "#8C5A4A", weight=700, align="center", spacing=300)
    d.text(0, H * 0.92, W, c["signature"], "Lora", 40, "#6A5048", italic=True, align="center")
    return {"layout": "newborn photo with a soft wave edge, name and birth date below", "typography": "Great Vibes, Playfair Display, Montserrat caps, Lora italic", "palette": "cream, cocoa, clay", "decor": "wave-cut photo"}


@design(18)
def twins(d, c):
    W, H = d.W, d.H
    d.bg("#F4F1EB")
    for k, (x, col, art) in enumerate([(0.24, "#E3F0FA", "teddy-bear"), (0.76, "#FCE4EC", "teddy-bear")]):
        d.circle(W * x, H * 0.36, W * 0.16, col)
        d.art(art, W * x, H * 0.36, W * 0.22, flip=k == 1)
    d.heart(W / 2, H * 0.36, 40, "#E8829F")
    t, s = fitted(d, H * 0.58, "Double the love", "Great Vibes", 70, "#4A3A44", w=0.6)
    p = lines(c["message"])
    d.text(0, H * 0.58 + s * 1.3, W, p[0], "Playfair Display", W * 0.04, "#4A3A44", weight=600, align="center")
    d.text(0, H * 0.58 + s * 1.3 + W * 0.06, W, p[1].upper(), "Montserrat", W * 0.02, "#8C7A84", weight=700, align="center", spacing=300)
    d.text(0, H * 0.9, W, c["signature"], "Lora", W * 0.026, "#6A5A64", italic=True, align="center")
    return {"layout": "two teddies in matching circles joined by a heart", "typography": "Great Vibes, Playfair Display, Montserrat caps, Lora italic", "palette": "ivory, baby blue, blush", "decor": "twin circles, teddies, heart"}


@design(19)
def minimal_birth(d, c):
    W, H = d.W, d.H
    d.bg("#EFEAE3")
    d.text(W * 0.08, H * 0.08, W * 0.84, "WELCOME", "Montserrat", W * 0.028, "#7A7068", weight=700, spacing=500)
    t, s = fitted(d, H * 0.18, c["headline"], "Playfair Display", 200, "#2B2724", w=0.84, italic=True, align="left", x=W * 0.08)
    d.line(W * 0.08, H * 0.18 + s * 1.3, W * 0.3, H * 0.18 + s * 1.3, "#2B2724", 1.2)
    d.text(W * 0.08, H * 0.6, W * 0.84, c["message"], "Montserrat", W * 0.08, "#2B2724", weight=300, spacing=100)
    d.text(W * 0.08, H * 0.72, W * 0.84, c["signature"], "Montserrat", W * 0.035, "#7A7068", weight=500, spacing=200)
    d.circle(W * 0.82, H * 0.86, W * 0.06, "#C9886E")
    return {"layout": "editorial: oversized italic name, light date line, one terracotta dot", "typography": "Playfair Display italic, Montserrat Light", "palette": "oat, ink, terracotta", "decor": "rule and dot only"}


@design(20)
def rainbow_baby(d, c):
    W, H = d.W, d.H
    d.bg("#F8EFE6")
    cols = ["#C96F4A", "#E3A07A", "#F0C9A8", "#9DAF8C", "#D9B99B"]
    for k, col in enumerate(cols):
        d.circle(W / 2, H * 0.44, W * (0.38 - k * 0.06), col, start=180, end=360)
    cloud(d, W * 0.2, H * 0.44, W * 0.14)
    cloud(d, W * 0.8, H * 0.44, W * 0.14)
    t, s = fitted(d, H * 0.5, "Our rainbow baby", "Great Vibes", 90, "#7A3E2A")
    p = lines(c["message"])
    d.text(0, H * 0.5 + s * 1.3, W, p[0], "Playfair Display", W * 0.07, "#4A2A1C", weight=600, align="center")
    d.text(0, H * 0.5 + s * 1.3 + W * 0.1, W, p[1].upper(), "Montserrat", W * 0.024, "#7A3E2A", weight=700, align="center", spacing=260)
    d.text(0, H * 0.88, W, c["signature"], "Lora", W * 0.034, "#6E4A38", italic=True, align="center")
    return {"layout": "boho rainbow with clouds at each end above the name", "typography": "Great Vibes, Playfair Display, Montserrat caps, Lora italic", "palette": "terracotta, apricot, sand, sage", "decor": "five-band rainbow, clouds"}


# ---------------------------------------------------------------- celebrations
@design(21)
def aqiqah(d, c):
    W, H = d.W, d.H
    d.bg("#F7F2E8")
    d.texture("paper", 0.4)
    d.frame_border(W * 0.05, "#C9A45A", 1, double=7)
    d.art("crescent-moon", W / 2, H * 0.13, W * 0.14)
    for x in (0.3, 0.7):
        d.star(W * x, H * 0.14, 10, "#C9A45A")
    t, s = fitted(d, H * 0.2, "Aqiqah", "Great Vibes", 130, "#2F6B5A")
    p = lines(c["message"])
    body(d, H * 0.2 + s * 1.3, p[0], "Lora", W * 0.04, "#3E4A42", italic=True)
    divider(d, W / 2, H * 0.55, W * 0.3, "#C9A45A", 1, gap=7)
    d.text(W * 0.12, H * 0.58, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#2E3B32", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.022, "#8A6A2E", weight=600, align="center", spacing=200, upper=True)
    return {"layout": "framed invitation with crescent and stars above a script title", "typography": "Great Vibes, Lora italic, Cinzel, Montserrat caps", "palette": "ivory, emerald, gold", "decor": "double frame, crescent, stars, divider"}


@design(22)
def baptism(d, c):
    W, H = d.W, d.H
    d.bg("#F6F8FA")
    d.art("dove", W / 2, H * 0.16, W * 0.26)
    d.laurel(W / 2, H * 0.17, W * 0.18, "#9DB0C2", leaves=8, size=W * 0.05, sweep=140)
    t, s = fitted(d, H * 0.32, "Baptism", "Great Vibes", 110, "#3E5A7A")
    p = lines(c["message"])
    body(d, H * 0.32 + s * 1.3, p[0], "Lora", W * 0.038, "#4F6A88", italic=True)
    divider(d, W / 2, H * 0.62, W * 0.3, "#9DB0C2", 1, gap=7)
    d.text(W * 0.12, H * 0.65, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.032, "#2E3E54", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.88, W, c["signature"], "Lora", W * 0.032, "#3E5A7A", italic=True, align="center")
    return {"layout": "dove inside a soft laurel above a script title", "typography": "Great Vibes, Lora italic, Cinzel", "palette": "white, dove grey, slate blue", "decor": "laurel, dove illustration"}


@design(23)
def naming(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4E6")
    from seasonal import rangoli
    rangoli(d, W * 0.2, H * 0.5, W * 0.16, ["#F4A259", "#E36A6A", "#F2C14E", "#8CB369"])
    x0 = W * 0.42
    t = d.text(x0, H * 0.16, W * 0.52, "Naming\nCeremony", "Playfair Display", d.fit("Ceremony", W * 0.5, "Playfair Display", 70, 700, True), "#8C3B12", weight=700, italic=True, lh=1.0)
    p = lines(c["message"])
    d.text(x0, H * 0.16 + t["_h"] + 12, W * 0.52, p[0], "Lora", W * 0.03, "#5A3A20", italic=True)
    d.text(x0, H * 0.16 + t["_h"] + 12 + W * 0.06, W * 0.52, "\n".join(p[1:]), "Montserrat", W * 0.022, "#5A3A20", weight=600, lh=1.7, spacing=80, upper=True)
    d.text(x0, H * 0.84, W * 0.52, c["signature"], "Caveat", W * 0.035, "#C0631B", weight=700)
    return {"layout": "rangoli flower on the left, italic title and details on the right", "typography": "Playfair Display bold italic, Lora italic, Montserrat caps, Caveat", "palette": "cream, marigold, coral, rust", "decor": "petal rangoli"}


@design(24)
def baby_first_eid(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#EAF2FB"), (1, "#FDF3F6")]))
    from seasonal import fanous
    fanous(d, W * 0.24, H * 0.08, 140, body_col="#C9A45A", glass="#FFF3D6", glow=False)
    fanous(d, W * 0.76, H * 0.06, 160, body_col="#C9A45A", glass="#FFF3D6", glow=False)
    d.art("baby-bottle", W * 0.5, H * 0.3, W * 0.2)
    t, s = fitted(d, H * 0.46, "Baby’s first Eid", "Great Vibes", 90, "#5E7FB0")
    body(d, H * 0.46 + s * 1.3, c["message"], "Lora", W * 0.04, "#4A5A78", italic=True)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.024, "#5E7FB0", weight=700, align="center", spacing=200, upper=True)
    return {"layout": "two gold lanterns either side of a baby bottle, script title", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "baby blue to blush, gold", "decor": "vector lanterns, bottle illustration"}


# ---------------------------------------------------------------- milestones
@design(25)
def monthly_milestone(d, c):
    W, H = d.W, d.H
    d.bg("#F3EEE7")
    cx, cy = W / 2, H * 0.36
    for k in range(12):
        a = math.radians(-90 + k * 30)
        x, y = cx + W * 0.3 * math.cos(a), cy + W * 0.3 * math.sin(a)
        d.circle(x, y, 26, "#E2C9B0" if k >= 3 else "#C9886E")
        d.text(x - 26, y - 14, 52, str(k + 1), "Montserrat", 24, "#FFFFFF", weight=700, align="center")
    d.text(0, cy - 120, W, "3", "Playfair Display", 200, "#4A3A34", weight=600, align="center", lh=1)
    d.text(0, cy + 90, W, "MONTHS", "Montserrat", 34, "#8C5A4A", weight=700, align="center", spacing=500)
    body(d, H * 0.72, c["message"], "Playfair Display", 52, "#4A3A34", italic=True, w=0.8)
    return {"layout": "month dial (12 dots, the first three filled) around the age", "typography": "Playfair Display, Montserrat caps", "palette": "linen, clay, cocoa", "decor": "numbered month dots"}


@design(26)
def first_steps(d, c):
    W, H = d.W, d.H
    d.bg("#F5F7EE")
    d.photo(738, 60, 60, W - 120, H * 0.62, frame="rounded", rx=40, focus=(0.5, 0.4))
    t, s = fitted(d, H * 0.7, "First steps!", "Pacifico", 120, "#4E7A3A")
    d.text(0, H * 0.7 + s * 1.25, W, c["message"], "Fredoka", 40, "#4A5A3A", weight=500, align="center")
    return {"layout": "rounded photo of baby walking with a script headline below", "typography": "Pacifico, Fredoka", "palette": "meadow white, leaf green", "decor": "rounded photo frame"}


@design(27)
def half_birthday(d, c):
    W, H = d.W, d.H
    d.bg("#FFF3E0")
    cx, cy, R = W / 2, H * 0.4, W * 0.3
    d.circle(cx, cy, R, "#FFFFFF", stroke="#F2B84B", sw=6)
    d.circle(cx, cy, R, "#F2B84B", start=270, end=450 - 0.01)
    d.art("birthday-cake", cx - R * 0.4, cy, R * 0.8)
    d.text(cx, cy - 60, R, "½", "Playfair Display", 150, "#FFFFFF", weight=700, align="center")
    t, s = fitted(d, H * 0.74, "Half way to one!", "Pacifico", 100, "#C77700")
    d.text(0, H * 0.74 + s * 1.6, W, c["message"], "Fredoka", 46, "#6B4E1A", weight=600, align="center")
    return {"layout": "half-filled circle — cake on one side, ½ on the other", "typography": "Pacifico, Playfair Display, Fredoka", "palette": "cream, honey yellow, cocoa", "decor": "half-filled ring, cake illustration"}


@design(28)
def first_tooth(d, c):
    W, H = d.W, d.H
    d.bg("#EAF6F8")
    tooth = [["M", -0.5, -0.4], ["C", -0.5, -0.75, -0.1, -0.75, 0, -0.55], ["C", 0.1, -0.75, 0.5, -0.75, 0.5, -0.4], ["C", 0.5, -0.1, 0.4, 0.1, 0.35, 0.6], ["C", 0.3, 0.8, 0.12, 0.8, 0.1, 0.55], ["C", 0.07, 0.35, -0.07, 0.35, -0.1, 0.55], ["C", -0.12, 0.8, -0.3, 0.8, -0.35, 0.6], ["C", -0.4, 0.1, -0.5, -0.1, -0.5, -0.4], ["Z"]]
    from kit import transform_path
    d.path(transform_path(tooth, W * 0.36, W / 2, H * 0.32), fill="#FFFFFF", stroke="#9CC9D6", sw=4, shadow_=shadow("rgba(80,140,160,0.25)", 20, 0, 8))
    d.circle(W / 2 - W * 0.06, H * 0.3, 6, "#3A4A54")
    d.circle(W / 2 + W * 0.06, H * 0.3, 6, "#3A4A54")
    d.path([["M", W / 2 - W * 0.05, H * 0.34], ["Q", W / 2, H * 0.37, W / 2 + W * 0.05, H * 0.34]], fill="", stroke="#3A4A54", sw=3)
    for x, y in [(0.24, 0.18), (0.78, 0.22), (0.74, 0.44)]:
        d.sparkle(W * x, H * y, 14, "#7FC7D9")
    t, s = fitted(d, H * 0.56, "My first tooth", "Fredoka", 80, "#2F7A8C", weight=700)
    body(d, H * 0.56 + s * 1.3, c["message"], "Fredoka", W * 0.042, "#4A6A74", weight=500)
    return {"layout": "smiling vector tooth with sparkles, rounded headline", "typography": "Fredoka", "palette": "mint water, teal, white", "decor": "vector tooth, sparkles"}


# ---------------------------------------------------------------- announcements
@design(29)
def pregnancy(d, c):
    W, H = d.W, d.H
    d.bg("#F6EDE4")
    d.photo(1024, 60, 60, W - 120, H * 0.6, frame="rounded", rx=30, focus=(0.5, 0.4))
    t, s = fitted(d, H * 0.7, "Baby coming soon", "Great Vibes", 150, "#8C5A4A")
    p = lines(c["message"])
    d.text(0, H * 0.7 + s * 1.25, W, p[0], "Playfair Display", 48, "#4A3A34", italic=True, align="center")
    d.text(0, H * 0.7 + s * 1.25 + 70, W, p[1].upper(), "Montserrat", 32, "#8C5A4A", weight=700, align="center", spacing=300)
    return {"layout": "family photo with script announcement and due date", "typography": "Great Vibes, Playfair Display italic, Montserrat caps", "palette": "linen, clay, cocoa", "decor": "rounded photo"}


def sibling(d, c, cols, crown):
    W, H = d.W, d.H
    d.bg(cols[1])
    d.dots(0, 0, W, H, 20, 1.8, "#FFFFFF")
    d.art(crown, W / 2, H * 0.16, W * 0.22)
    d.text(W * 0.08, H * 0.27, W * 0.84, c["headline"], "Luckiest Guy", W * 0.09, cols[2], align="center", lh=1.0)
    d.rect(W * 0.12, H * 0.52, W * 0.76, H * 0.22, "#FFFFFF", rx=24, stroke=cols[2], sw=3, dash=[6, 6])
    d.text(W * 0.12, H * 0.55, W * 0.76, c["message"], "Fredoka", W * 0.05, cols[2], weight=700, align="center")
    d.art("baby-bottle", W * 0.5, H * 0.66, W * 0.1)
    d.text(0, H * 0.84, W, c["signature"], "Caveat", W * 0.06, "#4A3A44", weight=700, align="center")


@design(30)
def big_sister(d, c):
    sibling(d, c, PINK, "crown")
    return {"layout": "crown over a playful announcement, dashed coming-soon card", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "blush, rose, white dots", "decor": "polka dots, crown, bottle"}


@design(31)
def big_brother(d, c):
    sibling(d, c, BLUE, "trophy")
    return {"layout": "trophy over a playful ‘promoted’ announcement, dashed card", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "powder blue, denim, white dots", "decor": "polka dots, trophy, bottle"}


@design(32)
def preg_countdown(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FDF3F6"), (1, "#E3F0FA")]))
    cloud(d, W * 0.2, H * 0.12, 120, opacity=0.9)
    cloud(d, W * 0.82, H * 0.2, 100, opacity=0.9)
    d.circle(W / 2, H * 0.36, 300, "#FFFFFF", shadow_=shadow("rgba(150,150,200,0.2)", 40, 0, 16))
    d.text(0, H * 0.36 - 220, W, "12", "Playfair Display", 300, "#9C7BB8", weight=700, align="center", lh=0.9)
    d.text(0, H * 0.36 + 100, W, "WEEKS TO GO", "Montserrat", 44, "#5E7FB0", weight=800, align="center", spacing=400)
    d.text(W * 0.1, H * 0.64, W * 0.8, c["message"], "Great Vibes", 120, "#9C7BB8", align="center", lh=1.1)
    d.art("baby-bottle", W * 0.5, H * 0.88, 150)
    return {"layout": "countdown number in a white dial among clouds, script line below", "typography": "Playfair Display, Montserrat caps, Great Vibes", "palette": "blush to baby blue, lavender", "decor": "clouds, dial, bottle"}


# ---------------------------------------------------------------- family
@design(33)
def reunion(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE3")
    d.art("deciduous-tree", W / 2, H * 0.22, W * 0.42)
    t, s = fitted(d, H * 0.4, "Family Reunion", "Playfair Display", 80, "#3E5A2E", weight=700, italic=True)
    p = lines(c["message"])
    body(d, H * 0.4 + s * 1.4, p[0], "Lora", W * 0.038, "#4E5F45", italic=True)
    d.rect(W * 0.12, H * 0.6, W * 0.76, H * 0.18, "#FFFFFF", rx=14)
    d.text(W * 0.12, H * 0.62, W * 0.76, "\n".join(p[1:]), "Montserrat", W * 0.03, "#2E3B26", weight=700, align="center", lh=1.6, spacing=60, upper=True)
    d.text(W * 0.1, H * 0.84, W * 0.8, c["signature"], "Caveat", W * 0.045, "#7A5236", weight=600, align="center")
    return {"layout": "family tree illustration above an italic title and a details card", "typography": "Playfair Display italic, Lora italic, Montserrat caps, Caveat", "palette": "parchment, olive, bark brown", "decor": "tree illustration, white card"}


@design(34)
def family_everything(d, c):
    W, H = d.W, d.H
    d.bg("#14110F")
    d.photo(1987, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.45))
    overlay(d, 0, 0.75, y0=H * 0.45, y1=H)
    t, s = fitted(d, H * 0.68, "Family is everything", "Great Vibes", 160, "#FFFFFF")
    body(d, H * 0.68 + s * 1.3, c["message"], "Cormorant Garamond", 50, "#F3EDE4", italic=True, w=0.8)
    return {"layout": "full-bleed autumn family photo with a script line over a fade", "typography": "Great Vibes, Cormorant Garamond italic", "palette": "autumn photo tones, white", "decor": "gradient shade"}


@design(35)
def grandparents(d, c):
    W, H = d.W, d.H
    d.bg("#F7F0E4")
    d.texture("paper", 0.4)
    d.art("couch-and-lamp", W * 0.5, H * 0.24, W * 0.46)
    d.art("teacup-without-handle", W * 0.2, H * 0.36, W * 0.12)
    d.art("cookie", W * 0.82, H * 0.36, W * 0.12)
    t, s = fitted(d, H * 0.46, "Happy\nGrandparents Day", "Playfair Display", 60, "#5A3424", weight=700, italic=True, lh=1.05)
    body(d, H * 0.46 + s * 2.5, c["message"], "Lora", W * 0.038, "#6E4A38", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.055, "#B5523B", weight=700, align="center")
    return {"layout": "cosy sofa, tea and cookie above a two-line italic greeting", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "parchment, cocoa, terracotta", "decor": "paper grain, living-room illustrations"}


@design(36)
def mother_daughter(d, c):
    W, H = d.W, d.H
    d.bg("#FBEFEA")
    d.photo(764, W * 0.1, H * 0.06, W * 0.8, H * 0.52, frame="arch", focus=(0.5, 0.35))
    t, s = fitted(d, H * 0.62, "Like mother,\nlike daughter", "Playfair Display", 60, "#7A2E3E", weight=600, italic=True, lh=1.05)
    body(d, H * 0.62 + s * 2.5, c["message"], "Lora", W * 0.038, "#6B4A50", italic=True)
    d.text(0, H * 0.9, W, c["signature"], "Caveat", W * 0.055, "#B23A55", weight=700, align="center")
    return {"layout": "mother-and-daughter photo in an arch, two-line italic headline", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "blush, wine, field gold", "decor": "arch photo frame"}


@design(37)
def father_son(d, c):
    W, H = d.W, d.H
    d.bg("#EEF2F5")
    d.photo(517, W * 0.1, H * 0.06, W * 0.8, H * 0.52, frame="rounded", rx=20, focus=(0.5, 0.45))
    t, s = fitted(d, H * 0.62, "Like father,\nlike son", "Alfa Slab One", 60, "#1F3349", lh=1.05)
    body(d, H * 0.62 + s * 2.5, c["message"], "Lora", W * 0.038, "#3E5068", italic=True)
    d.text(0, H * 0.94, W, c["signature"], "Caveat", W * 0.05, "#C77700", weight=700, align="center")
    return {"layout": "father-and-son photo above a slab-serif two-liner", "typography": "Alfa Slab One, Lora italic, Caveat", "palette": "mist, navy, amber", "decor": "rounded photo"}


@design(38)
def welcome_home_baby(d, c):
    W, H = d.W, d.H
    d.bg("#FDF7F2")
    d.bunting(-10, W + 10, 10, 50, ["#F7B6C8", "#FFFFFF", "#A9CDEB", "#FFE08A"], flags=10, fh=70)
    d.art("house-with-garden", W / 2, H * 0.28, W * 0.36)
    t, s = fitted(d, H * 0.44, "Welcome home,\nbaby Noor", "Great Vibes", 150, "#B23A5E", lh=1.0)
    body(d, H * 0.44 + s * 2.4, c["message"], "Playfair Display", 56, "#4A3A44", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", 32, "#B23A5E", weight=700, align="center", spacing=200, upper=True)
    return {"layout": "bunting and a little house above a two-line script welcome", "typography": "Great Vibes, Playfair Display italic, Montserrat caps", "palette": "cream, blush, sky, butter", "decor": "bunting, house illustration"}


@design(39)
def new_parents(d, c):
    W, H = d.W, d.H
    d.bg("#F3F7FB")
    d.art("baby-bottle", W * 0.3, H * 0.24, W * 0.18, angle=-12)
    d.art("teddy-bear", W * 0.62, H * 0.24, W * 0.3)
    for x, y in [(0.16, 0.1), (0.86, 0.12), (0.9, 0.36)]:
        d.star(W * x, H * y, 10, "#FFD54F")
    t, s = fitted(d, H * 0.44, "Congratulations,\nnew parents!", "Playfair Display", 60, "#2E4A7A", weight=700, italic=True, lh=1.05)
    body(d, H * 0.44 + s * 2.5, c["message"], "Lora", W * 0.04, "#3E5672", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.055, "#E8829F", weight=700, align="center")
    return {"layout": "bottle and teddy above a two-line italic congratulations", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "cloud white, navy, pink", "decor": "stars, baby illustrations"}


@design(40)
def adoption(d, c):
    W, H = d.W, d.H
    d.bg("#F8F1E7")
    d.art("house-with-garden", W * 0.24, H * 0.42, W * 0.3)
    for k in range(4):
        d.heart(W * (0.1 + k * 0.08), H * (0.14 - (k % 2) * 0.03), 24 + k * 4, ["#E8829F", "#F2B84B", "#7FB3E6", "#8CB369"][k])
    x0 = W * 0.48
    t = d.text(x0, H * 0.16, W * 0.48, "Our family\ngrew by one", "Playfair Display", d.fit("grew by one", W * 0.46, "Playfair Display", 60, 700, True), "#5A3424", weight=700, italic=True, lh=1.05)
    d.text(x0, H * 0.16 + t["_h"] + 14, W * 0.46, c["message"], "Lora", W * 0.03, "#6E4A38", italic=True, lh=1.5)
    d.text(x0, H * 0.84, W * 0.46, c["signature"], "Caveat", W * 0.04, "#B5523B", weight=700)
    return {"layout": "home illustration with a trail of colourful hearts, announcement right", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "cream, cocoa, rainbow hearts", "decor": "hearts, house illustration"}
