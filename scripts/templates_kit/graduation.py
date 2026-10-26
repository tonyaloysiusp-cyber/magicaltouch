"""Collection 500 — Graduation and achievements (grad-001 … grad-030)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, SILVER, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body

CATEGORY = "Graduation and achievements"
SITE_CATEGORY = "Certificates"
TAG = "graduation"

C = 480, 673
A5 = 559, 794
L = 673, 480
SQ = 1080, 1080
ST = 1080, 1920
PO = 1080, 1350

SPEC = [
    ("Graduation Announcement", "Class of 2027 Gold Announcement", *SQ, "Class of 2027", "Mariam Al Hashimi · Bachelor of Architecture · American University of Sharjah", "", "class of 2027 graduation announcement gold", "graduation announcement, class of 2027"),
    ("Graduation Announcement", "Graduate Photo Announcement Card", *C, "The graduate", "Yousef Karim · BSc Computer Science · Khalifa University", "Class of 2027", "graduate photo announcement card", "graduation announcement, photo"),
    ("Graduation Announcement", "Navy Cap Graduation Announcement", *C, "Proudly announcing", "the graduation of Layla Haddad · Master of Public Health · June 2027", "University of Dubai", "navy graduation announcement cap", "graduation announcement, navy"),
    ("Graduation Announcement", "Graduation Story Announcement", *ST, "I did it!", "Officially a graduate · Bachelor of Business · 2027", "@sara.grad27", "graduation instagram story i did it", "graduation story, i did it"),
    ("Graduation Announcement", "Minimal Graduate Announcement", *C, "Graduated", "Omar Saeed · Mechanical Engineering · 2027", "", "minimal modern graduation announcement", "graduation announcement, minimal"),
    ("Graduation Announcement", "High School Graduation Announcement", *C, "Senior 2027", "Dana Khalil has graduated from Dubai College", "Next stop: university!", "high school senior graduation announcement", "high school graduation, senior"),
    ("Graduation Announcement", "Kindergarten Graduation Card", *C, "Kindergarten Graduate!", "Well done, Adam — off to Grade 1!", "Love, Mum & Dad", "kindergarten graduation card cute", "kindergarten graduation"),
    ("Graduation Announcement", "PhD Graduation Announcement", *A5, "Dr. Hana Rahman", "has been awarded the degree of Doctor of Philosophy in Molecular Biology · University of Edinburgh · 2027", "", "phd graduation announcement elegant", "phd graduation, doctor"),
    ("Grad Party", "Confetti Cap Grad Party Invitation", *C, "Grad Party!", "Celebrate Zayd’s graduation · Saturday 26 June · 7 PM · The Terrace, Dubai Marina", "RSVP to Huda · 050 777 1234", "graduation party invitation colorful", "graduation party invitation"),
    ("Grad Party", "Black and Gold Grad Party Invitation", *A5, "Graduation Celebration", "Join us in honouring Faisal · Friday 2 July · 8 PM · Al Habtoor Grand", "Dinner & dancing", "black gold graduation party invitation", "graduation celebration, black gold"),
    ("Grad Party", "Graduation Open House Invitation", *L, "Open House", "Come celebrate Noor, class of 2027 · Saturday 19 June · 3–7 PM · our home", "Drop by anytime", "graduation open house invitation", "graduation open house"),
    ("Grad Party", "Grad Party Story", *ST, "You’re invited", "to my graduation party · Sat 26 June · 7 PM", "DM me to RSVP", "graduation party invitation story", "graduation party story"),
    ("Grad Party", "Graduation Dinner Menu", 374, 794, "Graduation Dinner", "Burrata & figs · Saffron chicken, jewelled rice · Pistachio cake with the class colours", "In honour of Mariam · 2027", "graduation dinner menu", "graduation menu"),
    ("Grad Party", "Grad Photo Booth Sign", *PO, "Strike a pose, grad!", "Share your photos with #MariamGrad27", "", "graduation photo booth sign", "photo booth sign, graduation"),
    ("Congratulations", "Congrats Grad Confetti Card", *C, "Congrats, grad!", "The tassel was worth the hassle.", "So proud of you — Aunt Lina", "congrats grad card confetti", "congrats grad card"),
    ("Congratulations", "Oh the Places Card", *C, "The world is waiting", "Congratulations on your graduation — go and make it yours.", "Love, Grandpa", "graduation card world map", "graduation card, travel"),
    ("Congratulations", "Proud Parents Graduation Post", *SQ, "So proud of you!", "Congratulations, Yousef — class of 2027", "Mum & Dad", "proud parents graduation post", "graduation post, proud parents"),
    ("Congratulations", "Diploma Scroll Congratulations Card", *L, "Congratulations, graduate!", "Hard work, late nights and endless coffee — it all paid off.", "From the whole office", "diploma congratulations card", "graduation card, diploma"),
    ("Congratulations", "Teacher Congratulations Students Post", *SQ, "Congratulations, class of 2027!", "We are so proud of every one of you.", "Al Noor Academy", "school congratulations graduates post", "school graduation post"),
    ("Certificate", "Certificate of Achievement Gold", *L, "Certificate of Achievement", "This certificate is proudly presented to Sara Ahmed for outstanding performance in the 2027 Science Fair", "Ms. Rana Khalil, Principal · 15 June 2027", "certificate of achievement gold elegant", "certificate of achievement, award"),
    ("Certificate", "Certificate of Completion Modern", *L, "Certificate of Completion", "awarded to Omar Haddad for completing the Digital Marketing Essentials course · 24 hours", "Magical Academy · 2027", "modern certificate of completion", "certificate of completion, course"),
    ("Certificate", "Bright Stars Student Award Certificate", *L, "Star Student", "This award goes to Lina for always trying her best and being kind to everyone", "Mrs. Dana · Grade 2B", "kids star student certificate", "kids certificate, star student"),
    ("Certificate", "Navy Frame Employee Award Certificate", *L, "Employee of the Month", "Presented to Karim Saeed in recognition of exceptional dedication · March 2027", "Hana Rahman, CEO · Bright Logistics", "employee of the month certificate", "employee of the month, certificate"),
    ("Certificate", "Sports Award Certificate", *L, "Most Valuable Player", "Awarded to Ali Rashid · Dubai Youth Football League · Season 2026/27", "Coach Tariq", "sports award certificate mvp", "sports certificate, mvp"),
    ("Certificate", "Plum Corner Appreciation Certificate", *L, "Certificate of Appreciation", "presented to Amal Nasser with sincere thanks for her volunteer service at the Community Food Drive", "Food for All · 2027", "certificate of appreciation elegant", "certificate of appreciation, volunteer"),
    ("Achievement", "Employee of the Month Post", *SQ, "Employee of the Month", "Congratulations, Karim! Thank you for going above and beyond.", "Bright Logistics", "employee of the month instagram post", "employee of the month post"),
    ("Achievement", "Honor Roll Post", *SQ, "Honor Roll", "Congratulations to our top students this term", "Al Noor Academy", "honor roll school post", "honor roll, school"),
    ("Achievement", "Top Scorer Achievement Post", *SQ, "Top scorer!", "Yusuf scored 98% in the national maths olympiad", "", "top scorer achievement post", "achievement post, student"),
    ("Achievement", "Milestone Achievement Story", *ST, "Goal unlocked", "10,000 happy customers — thank you!", "@brightbakes", "milestone achievement story business", "milestone story, business achievement"),
    ("Achievement", "Sports Champions Post", *SQ, "Champions!", "Dubai Youth League winners 2027", "Falcons FC", "sports champions team post", "champions post, sports team"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def cap(d, cx, cy, s, color="#1B1B1B", tassel="#E9C877"):
    """Vector mortarboard."""
    d.polygon([(cx - s, cy), (cx, cy - s * 0.45), (cx + s, cy), (cx, cy + s * 0.45)], color, name="Cap")
    d.path([["M", cx - s * 0.55, cy + s * 0.22], ["L", cx - s * 0.55, cy + s * 0.62], ["Q", cx, cy + s * 0.85, cx + s * 0.55, cy + s * 0.62], ["L", cx + s * 0.55, cy + s * 0.22], ["Z"]], fill=mix(color, "#000000", 0.2))
    d.polygon([(cx - s, cy), (cx, cy - s * 0.45), (cx + s, cy), (cx, cy + s * 0.45)], color)
    d.circle(cx, cy, s * 0.06, tassel)
    d.path([["M", cx, cy], ["Q", cx + s * 0.6, cy + s * 0.05, cx + s * 0.7, cy + s * 0.5]], fill="", stroke=tassel, sw=max(1.5, s * 0.04))
    d.rect(cx + s * 0.64, cy + s * 0.5, s * 0.12, s * 0.28, tassel, rx=s * 0.03)


def seal(d, cx, cy, r, color="#C9A45A", text_col="#FFFFFF", label="AWARD"):
    d.star(cx, cy, r, color, points=24, inner=0.88)
    d.circle(cx, cy, r * 0.78, "", stroke=text_col, sw=1.2, dash=[2, 3])
    d.text(cx - r * 0.7, cy - r * 0.2, r * 1.4, label, "Cinzel", r * 0.26, text_col, weight=700, align="center", spacing=100)
    for sgn in (-1, 1):
        d.polygon([(cx + sgn * r * 0.35, cy + r * 0.7), (cx + sgn * r * 0.75, cy + r * 1.6), (cx + sgn * r * 0.55, cy + r * 1.45), (cx + sgn * r * 0.45, cy + r * 1.7), (cx + sgn * r * 0.1, cy + r * 0.8)], mix(color, "#000000", 0.15))


def certificate(d, c, accent, ink, bg, title_font="Cinzel", border="double", art=None, label="AWARD"):
    W, H = d.W, d.H
    d.bg(bg)
    d.texture("paper", 0.35)
    if border == "double":
        d.frame_border(W * 0.035, accent, 2.2, double=8)
    elif border == "band":
        d.rect(-d.bleed, -d.bleed, W * 0.06 + d.bleed, H + 2 * d.bleed, accent)
        d.rect(W * 0.06, -d.bleed, 4, H + 2 * d.bleed, mix(accent, "#FFFFFF", 0.5))
    else:
        for x, y, fx, fy in [(W * 0.04, H * 0.06, 1, 1), (W * 0.96, H * 0.06, -1, 1), (W * 0.04, H * 0.94, 1, -1), (W * 0.96, H * 0.94, -1, -1)]:
            d.path([["M", x, y + fy * 50], ["L", x, y], ["L", x + fx * 50, y]], fill="", stroke=accent, sw=3)
    head = c["headline"]
    words = head.split(" ", 2)
    if head.lower().startswith("certificate of"):
        d.text(0, H * 0.1, W, "CERTIFICATE", title_font, W * 0.07, ink, weight=700, align="center", spacing=260)
        d.text(0, H * 0.1 + W * 0.09, W, head.split(" ", 1)[1].upper(), "Montserrat", W * 0.022, accent, weight=700, align="center", spacing=500)
        y = H * 0.1 + W * 0.15
    else:
        s = d.fit(head, W * 0.7, title_font, 60, 700)
        d.text(0, H * 0.12, W, head, title_font, s, ink, weight=700, align="center", spacing=60 if title_font == "Cinzel" else 0)
        y = H * 0.12 + s * 1.4
    msg = c["message"]
    lead, _, rest = msg.partition(" to ") if " to " in msg[:45] else ("", "", msg)
    name = None
    import re
    m = re.search(r"(?:to|awarded to|presented to|goes to)\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)", msg)
    if m:
        name = m.group(1)
    d.text(0, y + 10, W, "THIS IS PRESENTED TO" if "certificate" in head.lower() else "PROUDLY AWARDED TO", "Montserrat", W * 0.018, "#7A7068", weight=600, align="center", spacing=400)
    if name:
        ns = d.fit(name, W * 0.6, "Great Vibes", 70)
        d.text(0, y + 26, W, name, "Great Vibes", ns, ink, align="center")
        d.line(W * 0.25, y + 26 + ns * 1.2, W * 0.75, y + 26 + ns * 1.2, accent, 1)
        tail = msg[m.end():].strip(" ,·")
    else:
        ns = 0
        tail = msg
    d.text(W * 0.16, y + 40 + ns * 1.3, W * 0.68, tail, "Lora", W * 0.026, "#4A443E", italic=True, align="center", lh=1.5)
    sig = lines(c["signature"])
    d.line(W * 0.12, H * 0.82, W * 0.38, H * 0.82, ink, 0.8)
    d.text(W * 0.12, H * 0.83, W * 0.26, sig[0], "Montserrat", W * 0.018, "#4A443E", weight=600, align="center")
    d.line(W * 0.62, H * 0.82, W * 0.88, H * 0.82, ink, 0.8)
    d.text(W * 0.62, H * 0.83, W * 0.26, sig[1] if len(sig) > 1 else "Date", "Montserrat", W * 0.018, "#4A443E", weight=600, align="center")
    if art:
        d.art(art, W / 2, H * 0.8, W * 0.1)
    else:
        seal(d, W / 2, H * 0.78, W * 0.055, accent, label=label)


# ---------------------------------------------------------------- announcements
@design(1)
def class_of(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.4, W * 0.8, [(0, "#1F2233"), (1, "#0A0B12")]))
    d.confetti(0, 0, W, H, ["#E9C877", "#F7E3A3", "#FFFFFF"], n=70, size=(5, 12), shapes=("strip", "circle", "star"), avoid=[(W * 0.08, H * 0.15, W * 0.92, H * 0.85)])
    cap(d, W / 2, H * 0.2, 130, "#111111")
    d.text(0, H * 0.34, W, "CLASS OF", "Montserrat", 40, "#F3E6CB", weight=700, align="center", spacing=800)
    t = d.text(0, H * 0.38, W, "2027", "Playfair Display", 300, "#E9C877", weight=800, align="center", lh=0.9)
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.66, W, p[0], "Great Vibes", 100, "#FFFFFF", align="center")
    d.text(W * 0.1, H * 0.66 + 130, W * 0.8, "\n".join(p[1:]), "Montserrat", 32, "#C9C4B5", weight=600, align="center", spacing=160, upper=True, lh=1.6)
    return {"layout": "mortarboard above CLASS OF and a gold 2027, graduate name in script", "typography": "Playfair Display gold, Great Vibes, Montserrat caps", "palette": "midnight, gold, champagne", "decor": "vector mortarboard with tassel, confetti"}


@design(2)
def graduate_photo(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE6")
    d.photo(589, W * 0.08, H * 0.06, W * 0.84, H * 0.56, frame="arch", focus=(0.5, 0.3))
    cap(d, W * 0.82, H * 0.08, 46)
    t, s = fitted(d, H * 0.65, "The graduate", "Great Vibes", 80, "#1F3349")
    p = lines(c["message"])
    d.text(0, H * 0.65 + s * 1.2, W, p[0].upper(), "Cinzel", W * 0.04, "#1F3349", weight=700, align="center", spacing=200)
    d.text(W * 0.1, H * 0.65 + s * 1.2 + W * 0.07, W * 0.8, " · ".join(p[1:]), "Lora", W * 0.032, "#4A5568", italic=True, align="center", lh=1.4)
    d.text(0, H * 0.92, W, c["signature"].upper(), "Montserrat", W * 0.024, "#B48A4A", weight=700, align="center", spacing=400)
    return {"layout": "graduate photo in an arch with a cap sticker, name and degree below", "typography": "Great Vibes, Cinzel, Lora italic, Montserrat caps", "palette": "linen, navy, gold", "decor": "arch frame, vector cap"}


@design(3)
def navy_cap(d, c):
    W, H = d.W, d.H
    d.bg("#1F3349")
    d.frame_border(W * 0.05, "#E9C877", 1, double=6)
    cap(d, W / 2, H * 0.16, 70, "#0F1B2A")
    d.text(0, H * 0.3, W, "PROUDLY ANNOUNCING", "Montserrat", W * 0.028, "#E9C877", weight=700, align="center", spacing=400)
    p = lines(c["message"])
    d.text(0, H * 0.36, W, p[0], "Lora", W * 0.034, "#D6DEE8", italic=True, align="center")
    t, s = fitted(d, H * 0.42, "Layla Haddad", "Great Vibes", 90, "#E9C877")
    text_metal(d, t)
    d.text(W * 0.1, H * 0.42 + s * 1.3, W * 0.8, "\n".join(p[1:]), "Cinzel", W * 0.034, "#FFFFFF", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.86, W, c["signature"].upper(), "Montserrat", W * 0.024, "#E9C877", weight=600, align="center", spacing=300)
    return {"layout": "navy card with a cap, gold script name and degree", "typography": "Great Vibes gold, Montserrat caps, Lora italic, Cinzel", "palette": "navy, gold, white", "decor": "double frame, vector cap"}


@design(4)
def did_it_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#7B5CFF"), (1, "#FF6FB5")]))
    d.confetti(0, 0, W, H * 0.5, ["#FFFFFF", "#FFE14D", "#59F0FF"], n=60, size=(8, 16), shapes=("strip", "rect", "circle"))
    d.art("graduation-cap", W / 2, H * 0.28, W * 0.5, angle=-12, shadow_=shadow("rgba(0,0,0,0.25)", 30, 0, 14))
    t, s = fitted(d, H * 0.48, "I did it!", "Luckiest Guy", 320, "#FFFFFF", w=0.8)
    p = lines(c["message"])
    d.text(0, H * 0.48 + s * 1.2, W, p[0], "Fredoka", 64, "#FFFFFF", weight=700, align="center")
    d.text(0, H * 0.48 + s * 1.2 + 90, W, " · ".join(p[1:]), "Fredoka", 46, "#FFE6F3", weight=500, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "Fredoka", 40, "#7B5CFF", "#FFFFFF", weight=700, spacing=40, upper=False)
    return {"layout": "tossed cap in confetti over a huge shout of joy", "typography": "Luckiest Guy, Fredoka", "palette": "violet to pink, white, yellow", "decor": "confetti, cap illustration, handle pill"}


@design(5)
def minimal_grad(d, c):
    W, H = d.W, d.H
    d.bg("#EDEAE4")
    t, s = fitted(d, H * 0.12, "Graduated", "Playfair Display", 140, "#1E1E1E", w=0.84, italic=True, align="left", x=W * 0.08)
    d.line(W * 0.08, H * 0.12 + s * 1.3, W * 0.28, H * 0.12 + s * 1.3, "#1E1E1E", 1.2)
    p = lines(c["message"])
    y = H * 0.48
    for lab, val in zip(["NAME", "DEGREE", "YEAR"], p):
        d.text(W * 0.08, y, W * 0.3, lab, "Montserrat", W * 0.022, "#8A847C", weight=700, spacing=300)
        d.text(W * 0.36, y - 4, W * 0.56, val, "Montserrat", W * 0.036, "#1E1E1E", weight=500)
        y += H * 0.09
    cap(d, W * 0.8, H * 0.86, 40, "#1E1E1E", "#C9886E")
    return {"layout": "editorial italic word with a labelled info table", "typography": "Playfair Display italic, Montserrat", "palette": "stone, ink, terracotta", "decor": "rule, small cap"}


@design(6)
def senior(d, c):
    W, H = d.W, d.H
    d.bg("#C62828")
    d.stripes(-d.bleed, H * 0.84, W + d.bleed, H + d.bleed, 20, 20, "#FFFFFF")
    t, s = fitted(d, H * 0.06, "SENIOR", "Anton", 200, "#FFFFFF", w=0.84)
    t2 = d.text(0, H * 0.06 + s * 1.0, W, "2027", "Anton", s * 1.1, "rgba(0,0,0,0)", align="center", stroke="#FFFFFF", sw=3)
    d.art("graduation-cap", W * 0.84, H * 0.44, W * 0.18, angle=15)
    body(d, H * 0.62, c["message"], "Montserrat", W * 0.042, "#FFFFFF", weight=700)
    d.text(0, H * 0.75, W, c["signature"], "Caveat", W * 0.07, "#FFE14D", weight=700, align="center")
    return {"layout": "varsity block letters with an outlined year, stripe band", "typography": "Anton solid and outline, Montserrat, Caveat", "palette": "varsity red, white, gold", "decor": "stripes, cap illustration"}


@design(7)
def kinder_grad(d, c):
    W, H = d.W, d.H
    d.bg("#FFF6D6")
    for k, col in enumerate(["#FF6B6B", "#FFD45C", "#4FC3F7", "#8BC34A", "#B388FF"]):
        d.circle(W * (0.1 + k * 0.2), H * 0.06, 40, col, opacity=0.9)
    d.art("graduation-cap", W * 0.5, H * 0.28, W * 0.42, angle=-10)
    d.art("star", W * 0.18, H * 0.36, W * 0.12)
    d.art("crayon", W * 0.84, H * 0.36, W * 0.12, angle=30)
    t, s = fitted(d, H * 0.48, "Kindergarten\nGraduate!", "Luckiest Guy", 80, "#E2572A", lh=1.0)
    body(d, H * 0.48 + s * 2.3, c["message"], "Fredoka", W * 0.045, "#3A2A20", weight=600)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.065, "#4FC3F7", weight=700, align="center")
    return {"layout": "big cap with crayon and star, two-line playful title", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "butter, primary brights", "decor": "colour dots, cap / star / crayon"}


@design(8)
def phd(d, c):
    W, H = d.W, d.H
    d.bg("#F8F4EA")
    d.texture("paper", 0.45)
    d.frame_border(W * 0.05, "#5A1A2A", 1.2, double=6)
    d.laurel(W / 2, H * 0.17, W * 0.16, "#B48A3A", leaves=8, size=W * 0.05, sweep=150)
    cap(d, W / 2, H * 0.16, 50, "#5A1A2A")
    t, s = fitted(d, H * 0.32, c["headline"], "Playfair Display", 70, "#5A1A2A", weight=700, italic=True)
    body(d, H * 0.32 + s * 1.5, c["message"].replace(" · ", "\n"), "Lora", W * 0.038, "#4A3A30", italic=False, lh=1.6, w=0.74)
    d.text(0, H * 0.86, W, "DOCTOR OF PHILOSOPHY", "Cinzel", W * 0.028, "#B48A3A", weight=700, align="center", spacing=300)
    return {"layout": "laurel-wrapped cap above the doctor's name and degree", "typography": "Playfair Display bold italic, Lora, Cinzel", "palette": "parchment, oxblood, gold", "decor": "double frame, laurel, cap"}


# ---------------------------------------------------------------- parties
@design(9)
def grad_party(d, c):
    W, H = d.W, d.H
    d.bg("#1E2A5A")
    d.confetti(0, 0, W, H * 0.4, ["#FFD54F", "#FF8A65", "#4FC3F7", "#FFFFFF"], n=60, size=(5, 12), shapes=("strip", "circle", "star"))
    cap(d, W / 2, H * 0.2, 80, "#0F1630", "#FFD54F")
    t, s = fitted(d, H * 0.34, "Grad Party!", "Luckiest Guy", 100, "#FFD54F")
    p = lines(c["message"])
    body(d, H * 0.34 + s * 1.2, p[0], "Fredoka", W * 0.045, "#FFFFFF", weight=700)
    d.rect(W * 0.1, H * 0.58, W * 0.8, H * 0.2, "rgba(255,255,255,0.08)", rx=18, stroke="#FFD54F", sw=1.5)
    d.text(W * 0.1, H * 0.6, W * 0.8, "\n".join(p[1:]), "Fredoka", W * 0.036, "#E3E8FF", weight=500, align="center", lh=1.35)
    pill(d, W / 2, H * 0.88, c["signature"], "Fredoka", W * 0.028, "#1E2A5A", "#FFD54F", weight=700, spacing=40, upper=False)
    return {"layout": "confetti and cap above a bold party title, details panel", "typography": "Luckiest Guy, Fredoka", "palette": "navy, gold, coral, sky", "decor": "confetti, cap, outlined panel, RSVP pill"}


@design(10)
def grad_black_gold(d, c):
    W, H = d.W, d.H
    d.bg("#0B0B0C")
    d.frame_border(W * 0.05, "#C9A45A", 1.2, double=7)
    cap(d, W / 2, H * 0.14, 60, "#1A1A1A", "#E9C877")
    t, s = fitted(d, H * 0.24, "Graduation\nCelebration", "Great Vibes", 90, "#E9C877", lh=1.0)
    text_metal(d, t)
    p = lines(c["message"])
    d.text(W * 0.12, H * 0.24 + s * 2.3, W * 0.76, p[0], "Cormorant Garamond", W * 0.045, "#F3E6CB", italic=True, align="center")
    divider(d, W / 2, H * 0.62, W * 0.36, "#C9A45A", 1, gap=8)
    d.text(W * 0.12, H * 0.65, W * 0.76, "\n".join(p[1:]), "Cinzel", W * 0.034, "#F3E6CB", weight=600, align="center", lh=1.6, spacing=60)
    d.text(0, H * 0.86, W, c["signature"].upper(), "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=300)
    return {"layout": "black-tie card with cap, two-line gold script and centred details", "typography": "Great Vibes gold, Cormorant Garamond italic, Cinzel", "palette": "black, gold, champagne", "decor": "double frame, cap, divider"}


@design(11)
def open_house(d, c):
    W, H = d.W, d.H
    d.bg("#F4F1EA")
    d.rect(-d.bleed, -d.bleed, W * 0.4 + d.bleed, H + 2 * d.bleed, "#2E6B5A")
    d.art("house-with-garden", W * 0.2, H * 0.4, W * 0.24)
    cap(d, W * 0.2, H * 0.72, 40, "#173A31", "#F2C14E")
    x0 = W * 0.46
    t = d.text(x0, H * 0.14, W * 0.48, "Open House", "Playfair Display", d.fit("Open House", W * 0.46, "Playfair Display", 70, 700, True), "#2E6B5A", weight=700, italic=True)
    p = lines(c["message"])
    d.text(x0, H * 0.14 + t["_h"] + 8, W * 0.48, p[0], "Lora", W * 0.03, "#3E4A42", italic=True, lh=1.4)
    d.text(x0, H * 0.5, W * 0.48, "\n".join(p[1:]), "Montserrat", W * 0.024, "#2E3B32", weight=700, lh=1.8, spacing=100, upper=True)
    d.text(x0, H * 0.84, W * 0.48, c["signature"], "Caveat", W * 0.04, "#C77700", weight=700)
    return {"layout": "green side panel with house and cap, invitation on the right", "typography": "Playfair Display bold italic, Lora italic, Montserrat caps, Caveat", "palette": "linen, school green, amber", "decor": "panel, house illustration, cap"}


@design(12)
def grad_party_story(d, c):
    W, H = d.W, d.H
    d.bg("#111111")
    d.photo(589, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.6, focus=(0.5, 0.3))
    overlay(d, 0, 1, y0=H * 0.35, y1=H * 0.6, color="#111111")
    t, s = fitted(d, H * 0.58, "You’re invited", "Great Vibes", 220, "#E9C877")
    text_metal(d, t)
    p = lines(c["message"])
    d.text(0, H * 0.58 + s * 1.3, W, p[0], "Cormorant Garamond", 66, "#F3E6CB", italic=True, align="center")
    d.text(0, H * 0.58 + s * 1.3 + 100, W, " · ".join(p[1:]).upper(), "Montserrat", 40, "#FFFFFF", weight=700, align="center", spacing=200)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 32, "#111111", "#E9C877", spacing=100, upper=False)
    return {"layout": "graduate photo fading into black with a gold invitation below", "typography": "Great Vibes gold, Cormorant Garamond italic, Montserrat caps", "palette": "black, gold, photo tones", "decor": "photo fade, RSVP pill"}


@design(13)
def grad_menu(d, c):
    W, H = d.W, d.H
    d.bg("#1F3349")
    d.frame_border(W * 0.06, "#E9C877", 0.8, double=5)
    cap(d, W / 2, H * 0.08, 34, "#0F1B2A")
    t, s = fitted(d, H * 0.14, "Graduation\nDinner", "Great Vibes", 70, "#E9C877", lh=1.0)
    text_metal(d, t)
    y = H * 0.14 + s * 2.4
    for lab, item in zip(["TO START", "MAIN", "DESSERT"], lines(c["message"])):
        d.text(0, y, W, lab, "Cinzel", W * 0.04, "#E9C877", weight=700, align="center", spacing=260)
        t2 = d.text(W * 0.12, y + W * 0.08, W * 0.76, item, "Cormorant Garamond", W * 0.065, "#F3F0EA", italic=True, align="center", lh=1.25)
        y += W * 0.08 + t2["_h"] + H * 0.045
    d.text(W * 0.1, H * 0.9, W * 0.8, c["signature"], "Montserrat", W * 0.03, "#E9C877", weight=600, align="center", spacing=160, upper=True)
    return {"layout": "slim navy menu with a cap crest and three courses", "typography": "Great Vibes gold, Cinzel, Cormorant Garamond italic", "palette": "navy, gold, ivory", "decor": "double frame, cap"}


@design(14)
def photo_booth(d, c):
    W, H = d.W, d.H
    d.bg("#FFE14D")
    d.rect(140, 160, W - 280, H * 0.5, "#FFFFFF", stroke="#111111", sw=8, name="Frame")
    d.rect(140, 160, W - 280, H * 0.5, "", stroke="#111111", sw=8, dash=[30, 20])
    cap(d, W / 2, H * 0.3, 140, "#111111", "#FF4F79")
    d.art("camera-with-flash", W * 0.84, H * 0.08, 160, angle=12)
    t, s = fitted(d, H * 0.66, "Strike a pose, grad!", "Luckiest Guy", 130, "#111111")
    d.text(0, H * 0.66 + s * 1.3, W, c["message"], "Fredoka", 50, "#111111", weight=700, align="center")
    return {"layout": "big empty frame with a cap prop, bold sign text below", "typography": "Luckiest Guy, Fredoka", "palette": "lemon, black, pink", "decor": "frame with dashed border, cap, camera"}


# ---------------------------------------------------------------- congratulations
@design(15)
def congrats_grad(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.confetti(0, 0, W, H, ["#1F3349", "#E9C877", "#FF6B6B", "#4FC3F7"], n=100, size=(5, 12), shapes=("strip", "rect", "circle"), avoid=[(W * 0.08, H * 0.2, W * 0.92, H * 0.82)])
    cap(d, W / 2, H * 0.26, 70, "#1F3349", "#E9C877")
    t, s = fitted(d, H * 0.38, "Congrats, grad!", "Pacifico", 90, "#1F3349")
    body(d, H * 0.38 + s * 1.6, c["message"], "Fredoka", W * 0.05, "#3E4A5A", weight=600)
    d.text(0, H * 0.72, W, c["signature"], "Caveat", W * 0.055, "#E2572A", weight=700, align="center")
    return {"layout": "cap and script congratulations inside a confetti frame", "typography": "Pacifico, Fredoka, Caveat", "palette": "white, navy, gold, coral, sky", "decor": "confetti, vector cap"}


@design(16)
def world_waiting(d, c):
    W, H = d.W, d.H
    d.bg("#EAF2FB")
    d.art("world-map", W / 2, H * 0.28, W * 0.6)
    d.art("airplane", W * 0.82, H * 0.12, W * 0.14, angle=-15)
    d.path([["M", W * 0.2, H * 0.42], ["Q", W * 0.5, H * 0.52, W * 0.78, H * 0.16]], fill="", stroke="#5B7DB1", sw=2, dash=[6, 6])
    t, s = fitted(d, H * 0.54, "The world is waiting", "Playfair Display", 70, "#1F3B5C", weight=700, italic=True)
    body(d, H * 0.54 + s * 1.5, c["message"], "Lora", W * 0.04, "#3E5672", italic=True)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#E2572A", weight=700, align="center")
    return {"layout": "world map with a dashed flight path and plane, italic headline", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "sky mist, navy, coral", "decor": "map, plane, dashed route"}


@design(17)
def proud_parents(d, c):
    W, H = d.W, d.H
    d.bg("#14110F")
    d.photo(1121, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5)) if False else d.photo(589, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.25))
    overlay(d, 0, 0.85, y0=H * 0.4, y1=H)
    t, s = fitted(d, H * 0.62, "So proud of you!", "Great Vibes", 180, "#FFFFFF")
    d.text(0, H * 0.62 + s * 1.25, W, c["message"], "Montserrat", 40, "#F3E6CB", weight=600, align="center")
    d.text(0, H * 0.88, W, c["signature"], "Caveat", 60, "#E9C877", weight=700, align="center")
    cap(d, W * 0.86, H * 0.12, 60, "#111111", "#E9C877")
    return {"layout": "full-bleed graduate photo with a proud script message", "typography": "Great Vibes, Montserrat, Caveat", "palette": "photo tones, white, gold", "decor": "shade, cap sticker"}


@design(18)
def diploma_card(d, c):
    W, H = d.W, d.H
    d.bg("#F6F0E3")
    d.texture("paper", 0.4)
    d.art("scroll", W * 0.22, H * 0.48, W * 0.3, angle=-12)
    cap(d, W * 0.24, H * 0.2, 40)
    x0 = W * 0.46
    t = d.text(x0, H * 0.14, W * 0.48, "Congratulations,\ngraduate!", "Playfair Display", d.fit("Congratulations,", W * 0.46, "Playfair Display", 60, 700, True), "#5A1A2A", weight=700, italic=True, lh=1.05)
    d.text(x0, H * 0.14 + t["_h"] + 16, W * 0.46, c["message"], "Lora", W * 0.03, "#4A3A30", lh=1.55)
    d.text(x0, H * 0.84, W * 0.48, c["signature"], "Caveat", W * 0.04, "#B48A3A", weight=700)
    return {"layout": "diploma scroll and cap on the left, italic congratulations on the right", "typography": "Playfair Display bold italic, Lora, Caveat", "palette": "parchment, oxblood, gold", "decor": "paper grain, scroll, cap"}


@design(19)
def school_congrats(d, c):
    W, H = d.W, d.H
    d.bg("#123C69")
    for k in range(8):
        cap(d, d.rng.uniform(80, W - 80), d.rng.uniform(80, H * 0.36), d.rng.uniform(30, 60), "#0B2747", "#F2C14E")
    t, s = fitted(d, H * 0.42, "Congratulations,\nclass of 2027!", "Playfair Display", 110, "#FFFFFF", weight=700, italic=True, lh=1.05)
    d.text(0, H * 0.42 + s * 2.5, W, c["message"], "Lora", 46, "#D6E2F0", italic=True, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 32, "#123C69", "#F2C14E", spacing=200)
    return {"layout": "flying caps across the top, two-line italic congratulations", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "school navy, gold, white", "decor": "eight vector caps, school pill"}


# ---------------------------------------------------------------- certificates
@design(20)
def cert_achievement(d, c):
    certificate(d, c, "#B48A3A", "#2B2724", "#FBF8F1", border="double", label="EXCELLENCE")
    return {"layout": "classic certificate: spaced title, script name over a rule, two signature lines, gold seal", "typography": "Cinzel, Great Vibes, Lora italic, Montserrat", "palette": "ivory, ink, gold", "decor": "double frame, paper grain, rosette seal with ribbons"}


@design(21)
def cert_completion(d, c):
    certificate(d, c, "#2E86DE", "#1E2A3A", "#FFFFFF", title_font="Montserrat", border="band", label="COMPLETE")
    return {"layout": "modern certificate with a blue side band, script name, seal", "typography": "Montserrat, Great Vibes, Lora italic", "palette": "white, blue, slate", "decor": "side band, rosette seal"}


@design(22)
def cert_star_student(d, c):
    W, H = d.W, d.H
    certificate(d, c, "#FF8A00", "#3A2A60", "#FFF8E8", title_font="Luckiest Guy", border="corners", art="glowing-star")
    for x, y, col in [(0.1, 0.18, "#FF6B6B"), (0.9, 0.2, "#4FC3F7"), (0.12, 0.74, "#8BC34A"), (0.88, 0.72, "#B388FF")]:
        d.star(W * x, H * y, 18, col)
    return {"layout": "playful certificate with corner brackets, bright stars and a glowing star", "typography": "Luckiest Guy, Great Vibes, Lora italic", "palette": "cream, orange, purple, brights", "decor": "corner brackets, stars"}


@design(23)
def cert_employee(d, c):
    certificate(d, c, "#1F3349", "#1F3349", "#F7F5F0", border="double", art="trophy")
    return {"layout": "corporate certificate with navy double frame and a trophy", "typography": "Cinzel, Great Vibes, Lora italic, Montserrat", "palette": "warm white, navy", "decor": "double frame, trophy"}


@design(24)
def cert_mvp(d, c):
    W, H = d.W, d.H
    certificate(d, c, "#2E7D32", "#1B3A20", "#F4F8F2", title_font="Anton", border="band", art="1st-place-medal")
    return {"layout": "sports certificate with green band, condensed title and a medal", "typography": "Anton, Great Vibes, Lora italic", "palette": "pitch green, white, gold", "decor": "side band, medal"}


@design(25)
def cert_appreciation(d, c):
    certificate(d, c, "#8E3B5A", "#3A2030", "#FCF7F4", border="corners", label="THANK YOU")
    return {"layout": "appreciation certificate with corner brackets and a plum seal", "typography": "Cinzel, Great Vibes, Lora italic", "palette": "blush white, plum", "decor": "corner brackets, rosette seal"}


# ---------------------------------------------------------------- achievement posts
@design(26)
def eom_post(d, c):
    W, H = d.W, d.H
    d.bg("#0F1B2A")
    d.rays(W / 2, H * 0.32, 0, W * 0.9, 24, "#1C2E45", start=0, end=360)
    d.art("trophy", W / 2, H * 0.3, W * 0.36, shadow_=shadow("rgba(233,200,119,0.5)", 50, 0, 0))
    t, s = fitted(d, H * 0.54, "EMPLOYEE OF THE MONTH", "Anton", 120, "#E9C877")
    text_metal(d, t)
    body(d, H * 0.54 + s * 1.3, c["message"], "Montserrat", 44, "#FFFFFF", weight=600, w=0.8)
    d.text(0, H * 0.9, W, c["signature"].upper(), "Montserrat", 30, "#8FA3BF", weight=700, align="center", spacing=300)
    return {"layout": "trophy on a ray burst above a condensed gold title", "typography": "Anton gold, Montserrat", "palette": "midnight navy, gold, white", "decor": "rays, trophy glow"}


@design(27)
def honor_roll(d, c):
    W, H = d.W, d.H
    d.bg("#F6F1E7")
    d.frame_border(40, "#123C69", 3, double=12)
    d.laurel(W / 2, H * 0.3, 220, "#B48A3A", leaves=10, size=70, sweep=160)
    d.art("books", W / 2, H * 0.28, 200)
    t, s = fitted(d, H * 0.5, "Honor Roll", "Cinzel", 140, "#123C69", weight=700, spacing=80)
    body(d, H * 0.5 + s * 1.4, c["message"], "Lora", 48, "#3E4A5A", italic=True)
    d.text(0, H * 0.84, W, c["signature"].upper(), "Montserrat", 32, "#B48A3A", weight=700, align="center", spacing=300)
    return {"layout": "laurel around books above a classic caps title", "typography": "Cinzel, Lora italic, Montserrat caps", "palette": "parchment, school navy, gold", "decor": "double frame, laurel, books"}


@design(28)
def top_scorer(d, c):
    W, H = d.W, d.H
    d.bg("#7B5CFF")
    d.dots(0, 0, W, H, 40, 3, "#8C70FF")
    d.circle(W / 2, H * 0.34, 230, "#FFFFFF")
    d.text(0, H * 0.34 - 130, W, "98%", "Anton", 220, "#7B5CFF", align="center")
    d.art("1st-place-medal", W * 0.74, H * 0.18, 160, angle=15)
    t, s = fitted(d, H * 0.6, "Top scorer!", "Luckiest Guy", 150, "#FFE14D")
    body(d, H * 0.6 + s * 1.2, c["message"], "Fredoka", 50, "#FFFFFF", weight=600)
    return {"layout": "score in a white disc with a medal, bright title and line", "typography": "Anton, Luckiest Guy, Fredoka", "palette": "violet, lemon, white", "decor": "dot pattern, disc, medal"}


@design(29)
def goal_unlocked(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0D0A1F"), (1, "#24124A")]))
    d.art("trophy", W / 2, H * 0.26, W * 0.46, shadow_=shadow("rgba(255,213,79,0.6)", 60, 0, 0))
    t, s = fitted(d, H * 0.46, "GOAL UNLOCKED", "Bungee", 140, "#59F0FF", shadow_=shadow("rgba(89,240,255,0.8)", 20, 0, 0))
    p = c["message"]
    d.text(W * 0.1, H * 0.46 + s * 1.4, W * 0.8, p, "Outfit", 80, "#FFFFFF", weight=800, align="center", lh=1.1)
    d.rect(W * 0.12, H * 0.72, W * 0.76, 36, "rgba(255,255,255,0.15)", rx=18)
    d.rect(W * 0.12, H * 0.72, W * 0.76, 36, lin(0, 0, W * 0.76, 0, [(0, "#59F0FF"), (1, "#FF4FD8")]), rx=18)
    d.text(0, H * 0.72 + 50, W, "100%", "Bungee", 44, "#FFFFFF", align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "DM Sans", 36, "#0D0A1F", "#FFFFFF", weight=700, spacing=40, upper=False)
    return {"layout": "glowing trophy, arcade-style title, milestone and a full progress bar", "typography": "Bungee neon, Outfit ExtraBold, DM Sans", "palette": "arcade night, cyan, magenta", "decor": "trophy glow, gradient progress bar"}


@design(30)
def champions(d, c):
    W, H = d.W, d.H
    d.bg("#0E3B1F")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 60, 60, "rgba(255,255,255,0.04)")
    d.confetti(0, 0, W, H * 0.5, ["#FFD54F", "#FFFFFF", "#4CAF50"], n=60, size=(6, 14), shapes=("strip", "rect"))
    d.art("trophy", W / 2, H * 0.3, W * 0.4)
    d.art("soccer-ball", W * 0.18, H * 0.4, W * 0.14)
    t, s = fitted(d, H * 0.52, "CHAMPIONS!", "Anton", 220, "#FFD54F")
    text_metal(d, t)
    d.text(0, H * 0.52 + s * 1.1, W, c["message"].upper(), "Montserrat", 40, "#FFFFFF", weight=800, align="center", spacing=200)
    pill(d, W / 2, H * 0.86, c["signature"], "Montserrat", 34, "#0E3B1F", "#FFD54F", spacing=200)
    return {"layout": "trophy and ball in confetti over pitch stripes, gold condensed title", "typography": "Anton gold, Montserrat", "palette": "pitch green, gold, white", "decor": "mowing stripes, confetti, trophy and ball"}
