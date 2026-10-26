"""Collection 500 — General greeting cards (greeting-001 … greeting-050)."""

import math
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT, parse_d, transform_path
from common import GOLD, SILVER, ROSE_GOLD, metal, text_metal, vgrad, overlay, pill, divider

CATEGORY = "General greeting cards"
SITE_CATEGORY = "Cards"
TAG = "greeting"

C = 480, 673      # 5x7 card
A5 = 559, 794
L = 673, 480      # landscape card
SQ = 1080, 1080
ST = 1080, 1920

SPEC = [
    # thank you
    ("Thank You", "Big Type Thank You Card", *C, "THANK YOU", "Your kindness made a real difference this week. I’m so grateful.", "— Nadia", "bold typography thank you card", "thank you card, bold typography"),
    ("Thank You", "Thank You So Much Floral Card", *C, "Thank you so much", "for the flowers, the help and the endless cups of tea.", "Love, Reem", "floral thank you card pink", "thank you card, floral"),
    ("Thank You", "Teacher Thank You Apple Card", *L, "Thank you, teacher!", "You helped me grow more than you know.", "From Omar, Grade 3", "teacher appreciation thank you card", "teacher thank you card, school"),
    ("Thank You", "Thank You Gold Confetti Post", *SQ, "Thank you", "To every customer who supported us this year — we couldn’t have done it without you.", "The Little Bakery team", "thank you customers instagram gold", "thank you post, customers, gold"),
    ("Thank You", "Retro Thanks a Latte Card", *C, "Thanks a latte!", "You’re the best colleague a person could ask for.", "— Sami", "thanks a latte coffee pun card", "thank you card, coffee pun"),
    ("Thank You", "Nurse and Doctor Thank You Card", *C, "Thank you for caring", "Your patience and kindness carried our family through.", "With gratitude, the Rahman family", "thank you healthcare heroes card", "thank you card, nurse, doctor"),
    ("Thank You", "Minimal Grateful Card", *C, "grateful", "for you, for this, for all of it.", "Hana", "minimal grateful card lowercase", "thank you card, minimal, grateful"),
    ("Thank You", "Thank You Story Stickers", *ST, "THANK YOU", "for 10,000 followers!", "@studio.lumi", "thank you followers story sticker style", "thank you story, followers, milestone"),
    # congratulations
    ("Congratulations", "Congrats Confetti Pop Card", *C, "Congrats!", "You did it — and you made it look easy.", "So proud of you, Dana", "congratulations confetti card colorful", "congratulations card, confetti"),
    ("Congratulations", "New Job Rocket Card", *C, "Congrats on the new job!", "Onwards and upwards — they’re lucky to have you.", "— the old team", "new job congratulations card rocket", "new job card, congratulations"),
    ("Congratulations", "Promotion Gold Star Card", *C, "Well deserved!", "Congratulations on your promotion — all that hard work paid off.", "Karim", "promotion congratulations card gold star", "promotion card, congratulations"),
    ("Congratulations", "You Passed Driving Card", *L, "You passed!", "Congratulations on your driving test — the open road is yours.", "Love, Mum", "passed driving test congratulations card", "driving test card, congratulations"),
    ("Congratulations", "Congratulations Elegant Script Card", *A5, "Congratulations", "on this wonderful achievement. Wishing you every success in what comes next.", "Warmly, the Al Habtoor family", "elegant congratulations card script gold", "congratulations card, elegant, script"),
    ("Congratulations", "Woohoo Bold Post", *SQ, "WOOHOO!", "Big news deserves a big celebration.", "", "woohoo congratulations bold colorful post", "congratulations post, bold"),
    # get well
    ("Get Well", "Get Well Soon Sunflower Card", *C, "Get well soon", "Sending sunshine and warm wishes your way.", "Love, Lina", "get well soon sunflower card", "get well card, sunflower"),
    ("Get Well", "Soup and Blanket Get Well Card", *C, "Feel better soon", "Rest up, drink your tea and let us take care of the rest.", "— Maya", "cozy get well soon card tea", "get well card, cozy, tea"),
    ("Get Well", "Bandage Heart Get Well Card", *C, "Sending hugs", "Wishing you a speedy recovery and lots of rest.", "With love, Amna", "get well soon heart bandage card", "get well card, heart"),
    ("Get Well", "Rainbow Recovery Card", *L, "Better days are coming", "Thinking of you and wishing you a quick recovery.", "— your friends at work", "rainbow get well card", "get well card, rainbow"),
    ("Get Well", "Get Well Floral Watercolour Card", *A5, "Get well soon", "May each day bring you a little more strength.", "Fondly, Aunt Sara", "watercolor floral get well soon card", "get well card, floral, watercolour"),
    # sympathy / thinking of you
    ("Sympathy", "White Lily Sympathy Card", *C, "With deepest sympathy", "Thinking of you and your family at this difficult time.", "With love, the Khalil family", "white lily sympathy card elegant", "sympathy card, condolence, lily"),
    ("Sympathy", "In Loving Memory Card", *A5, "In loving memory", "Forever in our hearts.", "", "in loving memory card elegant", "in loving memory card, remembrance"),
    ("Thinking of You", "Thinking of You Moon Card", *C, "Thinking of you", "Near or far, you’re always on my mind.", "— Yara", "thinking of you card moon stars", "thinking of you card, moon"),
    ("Thinking of You", "Here For You Hands Card", *C, "I’m here for you", "Whatever you need, whenever you need it.", "Always, Dana", "here for you support card", "support card, here for you"),
    ("Thinking of You", "Miss You Postcard", *L, "Miss you!", "This city isn’t the same without you. Come back soon.", "xo, Rami", "miss you postcard travel", "miss you card, postcard"),
    # love & anniversary
    ("Love", "Happy Anniversary Gold Card", *C, "Happy Anniversary", "Ten years, one home, endless love.", "Forever yours, Omar", "happy anniversary gold card elegant", "anniversary card, gold"),
    ("Love", "Love You More Hearts Card", *C, "Love you more", "than coffee, sunsets and the last slice of cake.", "— me", "love you more cute card hearts", "love card, cute, hearts"),
    ("Love", "Valentine Red Envelope Card", *C, "Be mine", "Every day with you is my favourite day.", "Love, Hamza", "valentine card red envelope", "valentine card, love letter"),
    ("Love", "Anniversary Photo Post", *SQ, "5 years", "of us. Happy anniversary, my love.", "", "anniversary photo instagram post couple", "anniversary post, couple photo"),
    ("Love", "You and Me Minimal Card", *C, "you & me", "my favourite place in the world.", "", "minimal you and me love card", "love card, minimal"),
    ("Love", "Paper Plane Long Distance Card", *L, "Distance means so little", "when someone means so much.", "Counting the days — Layla", "long distance love card paper plane", "long distance card, love"),
    ("Love", "Couple Anniversary Story", *ST, "Happy anniversary", "to my best friend and favourite adventure.", "", "anniversary instagram story photo", "anniversary story, couple"),
    ("Love", "Galentine Friendship Card", *C, "Happy Galentine’s!", "Cheers to the women who make life sparkle.", "— your girls", "galentines day card pink cute", "galentine card, friendship"),
    # friendship
    ("Friendship", "Best Friends Forever Card", *C, "Friends forever", "Through every chapter, you’re my favourite character.", "— Sara", "best friends forever card cute", "friendship card, best friend"),
    ("Friendship", "Just Saying Hi Card", *C, "Hi there!", "No reason, just thinking of you and smiling.", "— Lina", "just saying hi card colorful", "hello card, just because"),
    ("Friendship", "You Are Awesome Retro Card", *C, "You are awesome", "Just a little reminder in case you forgot.", "", "you are awesome retro card", "encouragement card, retro"),
    ("Friendship", "Coffee Date Invite Card", *L, "Coffee soon?", "It’s been too long. My treat this time!", "— Huda", "coffee date card friends", "friendship card, coffee"),
    ("Friendship", "Friendship Quote Post", *SQ, "A friend is someone who knows the song in your heart", "and sings it back when you forget the words.", "", "friendship quote instagram post", "friendship quote, post"),
    # good luck / farewell / new home / just because
    ("Good Luck", "Good Luck Four Leaf Card", *C, "Good luck!", "You’ve got this — we’re cheering for you.", "— everyone at Studio 9", "good luck card clover", "good luck card, clover"),
    ("Good Luck", "Exam Good Luck Card", *C, "You’ve got this!", "Good luck with your exams. Believe in yourself.", "Love, Dad", "exam good luck card student", "exam good luck card, student"),
    ("Farewell", "Farewell We’ll Miss You Card", *A5, "We’ll miss you", "Thank you for five brilliant years. The office won’t be the same.", "Good luck from all of us", "farewell card colleague we will miss you", "farewell card, colleague, leaving"),
    ("Farewell", "Bon Voyage Travel Card", *L, "Bon voyage!", "Safe travels and endless adventures.", "— the gang", "bon voyage travel card", "bon voyage card, travel"),
    ("Farewell", "Sun and Sand Retirement Card", *C, "Happy retirement!", "Here’s to sleeping in, long lunches and new adventures.", "Your friends at Al Noor Bank", "happy retirement card", "retirement card, congratulations"),
    ("New Home", "New Home Keys Card", *C, "Welcome home!", "Congratulations on your new home — may it be full of love and laughter.", "— the Sayed family", "new home congratulations card keys", "new home card, housewarming"),
    ("New Home", "Housewarming House Card", *L, "Home sweet home", "Wishing you happy memories in your new place.", "Love, Amal & Faris", "housewarming card illustrated house", "housewarming card, new home"),
    ("New Home", "We’ve Moved Announcement Post", *SQ, "We’ve moved!", "New address: Villa 14, Al Barsha 2, Dubai", "Come say hi — the kettle’s on", "we've moved announcement post", "moving announcement, new address"),
    ("Just Because", "Sending Sunshine Card", *C, "Sending sunshine", "A little ray of light for your day.", "— Mira", "sending sunshine card cute", "just because card, sunshine"),
    ("Just Because", "Self Care Reminder Card", *C, "Be kind to yourself", "Rest is productive. You are doing enough.", "", "self care reminder card", "self care card, encouragement"),
    ("Just Because", "Proud of You Card", *C, "So proud of you", "Look how far you’ve come.", "Love, Mum", "proud of you card", "proud of you card, encouragement"),
    ("Just Because", "Happy Weekend Post", *SQ, "Happy weekend", "Slow mornings, good coffee, no alarms.", "", "happy weekend instagram post", "weekend post, social"),
    ("Just Because", "Hello Spring Card", *L, "Hello, spring!", "Fresh starts and blooming hearts.", "— Noor", "hello spring card flowers", "spring card, flowers"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def fitted(d, y, text, family, maxs, color, w=0.84, weight=400, italic=False, align="center", lh=1.0, spacing=0, x=None, upper=False, stroke=None, sw=0, shadow_=None):
    W = d.W
    s = d.fit(text, W * w, family, maxs, weight, italic, spacing, upper)
    xx = (W - W * w) / 2 if x is None else x
    if align == "center":
        xx, ww = 0, W
    else:
        ww = W * w
    t = d.text(xx, y, ww, text, family, s, color, weight=weight, italic=italic, align=align, lh=lh, spacing=spacing, upper=upper, stroke=stroke, sw=sw, shadow_=shadow_)
    return t, s


def body(d, y, text, family, size, color, w=0.76, italic=False, lh=1.5, align="center", weight=400, x=None):
    W = d.W
    xx = (W - W * w) / 2 if x is None else x
    return d.text(xx, y, W * w, text, family, size, color, italic=italic, lh=lh, align=align, weight=weight)


# ---------------------------------------------------------------- thank you
@design(1)
def big_type_thanks(d, c):
    W, H = d.W, d.H
    d.bg("#FFE14D")
    t, s = fitted(d, H * 0.08, "THANK\nYOU", "Anton", 300, "#111111", w=0.86, lh=0.88)
    d.heart(W * 0.86, H * 0.55, 60, "#FF4F79", angle=12)
    d.rect(W * 0.07, H * 0.62, W * 0.86, 2, "#111111")
    body(d, H * 0.65, c["message"], "DM Sans", W * 0.045, "#111111", w=0.86, align="left", x=W * 0.07, weight=500, lh=1.35)
    d.text(W * 0.07, H * 0.88, W * 0.86, c["signature"], "DM Sans", W * 0.04, "#111111", weight=800)
    return {"layout": "two-word headline filling the top, rule and note below", "typography": "Anton, DM Sans", "palette": "lemon, black, pink heart", "decor": "heart, rule"}


@design(2)
def thanks_floral(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4F4")
    for k, (x, y, s_, f) in enumerate([(0.15, 0.1, 0.24, "rose"), (0.34, 0.06, 0.18, "cherry-blossom"), (0.52, 0.1, 0.22, "tulip"), (0.7, 0.06, 0.18, "blossom"), (0.88, 0.1, 0.22, "hibiscus")]):
        d.art(f, W * x, H * y, W * s_, angle=-12 + k * 6)
    t, s = fitted(d, H * 0.3, "Thank you", "Great Vibes", 120, "#B23A55")
    d.text(0, H * 0.3 + s * 1.1, W, "SO MUCH", "Montserrat", W * 0.05, "#B23A55", weight=700, align="center", spacing=600)
    body(d, H * 0.56, c["message"], "Lora", W * 0.042, "#5A3D46", italic=True)
    d.text(0, H * 0.85, W, c["signature"], "Caveat", W * 0.065, "#B23A55", weight=700, align="center")
    return {"layout": "a row of flowers along the top, script thank you and note centred", "typography": "Great Vibes, Montserrat spaced caps, Lora italic, Caveat", "palette": "blush, raspberry, garden colours", "decor": "five flower illustrations"}


@design(3)
def teacher_thanks(d, c):
    W, H = d.W, d.H
    d.bg("#2F4A3D")
    d.rect(W * 0.04, H * 0.06, W * 0.92, H * 0.88, "", rx=6, stroke="#8B5A2B", sw=12)
    d.texture("grain", 0.2)
    d.art("books", W * 0.18, H * 0.68, W * 0.2)
    d.art("pencil", W * 0.84, H * 0.7, W * 0.12, angle=35)
    d.art("graduation-cap", W * 0.84, H * 0.22, W * 0.14, angle=10)
    t, s = fitted(d, H * 0.16, "Thank you, teacher!", "Caveat", 80, "#FFFFFF", w=0.7, weight=700)
    d.line(W * 0.25, H * 0.16 + s * 1.15, W * 0.75, H * 0.16 + s * 1.15, "#F7E27A", 3)
    body(d, H * 0.16 + s * 1.4, c["message"], "Caveat", W * 0.05, "#E8F0EA", w=0.56)
    d.text(0, H * 0.8, W, c["signature"], "Caveat", W * 0.045, "#F7E27A", weight=700, align="center")
    return {"layout": "chalkboard with chalk lettering and school illustrations", "typography": "Caveat", "palette": "chalkboard green, oak frame, chalk white, yellow", "decor": "wood frame, grain, books, pencil, cap"}


@design(4)
def thanks_gold_post(d, c):
    W, H = d.W, d.H
    d.bg("#101010")
    d.confetti(0, 0, W, H, ["#E9C877", "#B68A3A", "#F7E3A3"], n=90, size=(5, 14), shapes=("circle", "strip", "star"), avoid=[(W * 0.1, H * 0.25, W * 0.9, H * 0.82)])
    t, s = fitted(d, H * 0.26, "Thank you", "Great Vibes", 280, "#E9C877")
    text_metal(d, t)
    body(d, H * 0.26 + s * 1.3, c["message"], "Cormorant Garamond", 54, "#F3E6CB", italic=True, w=0.76, lh=1.3)
    pill(d, W / 2, H * 0.86, c["signature"], "Montserrat", 30, "#101010", "#E9C877", spacing=200)
    return {"layout": "gold script thank you inside a ring of gold confetti", "typography": "Great Vibes gold, Cormorant Garamond italic, Montserrat caps", "palette": "black, gold, champagne", "decor": "gold confetti, label"}


@design(5)
def thanks_latte(d, c):
    W, H = d.W, d.H
    d.bg("#F2E3CF")
    d.circle(W / 2, H * 0.36, W * 0.3, "#E2C3A0")
    d.art("hot-beverage", W / 2, H * 0.36, W * 0.44)
    for k in range(3):
        x = W * (0.42 + k * 0.08)
        d.path([["M", x, H * 0.2], ["C", x - 12, H * 0.16, x + 12, H * 0.13, x, H * 0.09]], fill="", stroke="#FFFFFF", sw=5)
    t, s = fitted(d, H * 0.64, "Thanks a latte!", "Pacifico", 80, "#6B3A1E")
    body(d, H * 0.64 + s * 1.5, c["message"], "DM Sans", W * 0.04, "#6B3A1E", weight=500)
    d.text(0, H * 0.9, W, c["signature"], "Caveat", W * 0.06, "#B5523B", weight=700, align="center")
    return {"layout": "coffee cup in a latte-coloured circle with steam curls, pun headline below", "typography": "Pacifico, DM Sans, Caveat", "palette": "foam cream, latte, espresso, terracotta", "decor": "steam curls, circle, coffee illustration"}


@design(6)
def thanks_care(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#E7F4F6"), (1, "#FDEFF1")]))
    d.art("stethoscope", W * 0.5, H * 0.24, W * 0.4) if False else d.art("growing-heart", W * 0.5, H * 0.22, W * 0.36)
    d.circle(W / 2, H * 0.22, W * 0.24, "", stroke="#FFFFFF", sw=8)
    t, s = fitted(d, H * 0.42, "Thank you\nfor caring", "Playfair Display", 70, "#1F4E5F", weight=600, italic=True, lh=1.05)
    body(d, H * 0.42 + s * 2.5, c["message"], "Lora", W * 0.04, "#355A66")
    d.text(W * 0.1, H * 0.86, W * 0.8, c["signature"], "Montserrat", W * 0.026, "#C2405E", weight=700, align="center", spacing=160, upper=True)
    return {"layout": "glowing heart in a white ring above a two-line italic thank you", "typography": "Playfair Display italic, Lora, Montserrat caps", "palette": "clinic mint to blush, deep teal, rose", "decor": "ring, heart illustration"}


@design(7)
def grateful_minimal(d, c):
    W, H = d.W, d.H
    d.bg("#ECE6DD")
    d.circle(W * 0.72, H * 0.3, W * 0.22, "#D8A48F")
    t, s = fitted(d, H * 0.36, "grateful", "Playfair Display", 130, "#2B2724", w=0.84, italic=True, align="left", x=W * 0.08)
    d.text(W * 0.08, H * 0.36 + s * 1.25, W * 0.7, c["message"], "Montserrat", W * 0.035, "#4A443E", lh=1.6)
    d.text(W * 0.08, H * 0.88, W * 0.8, c["signature"].upper(), "Montserrat", W * 0.026, "#2B2724", weight=700, spacing=300)
    return {"layout": "one italic word across a terracotta sun, short line beneath", "typography": "Playfair Display italic, Montserrat", "palette": "oat, clay, ink", "decor": "single circle"}


@design(8)
def thanks_story(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FF7AA2"), (1, "#FFB86B")]))
    for k, (x, y, a, nm) in enumerate([(0.2, 0.12, -10, "party-popper"), (0.82, 0.18, 12, "sparkles"), (0.15, 0.62, 8, "red-heart"), (0.86, 0.6, -8, "hundred-points"), (0.5, 0.86, 0, "confetti-ball")]):
        d.art(nm, W * x, H * y, W * 0.22, angle=a, shadow_=shadow("rgba(0,0,0,0.15)", 20, 0, 8))
    d.rect(W * 0.1, H * 0.3, W * 0.8, H * 0.26, "#FFFFFF", rx=40, angle=-3, origin_center=False, shadow_=shadow("rgba(0,0,0,0.15)", 30, 0, 12))
    t, s = fitted(d, H * 0.33, "THANK YOU", "Luckiest Guy", 200, "#FF4F79", w=0.7)
    d.text(0, H * 0.33 + s * 1.2, W, c["message"], "Fredoka", 64, "#2A2A2A", weight=700, align="center")
    pill(d, W / 2, H * 0.72, c["signature"], "Fredoka", 44, "#FFFFFF", "#2A2A2A", weight=600, spacing=40, upper=False)
    return {"layout": "sticker-style story: tilted white card with milestone thanks, emoji stickers around", "typography": "Luckiest Guy, Fredoka", "palette": "pink to apricot gradient, white, charcoal", "decor": "five sticker illustrations with shadows"}


# ---------------------------------------------------------------- congratulations
@design(9)
def congrats_confetti(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.confetti(0, 0, W, H, ["#FF5A5F", "#FFC93C", "#3EC1D3", "#8E6CEF", "#2BD67B"], n=110, size=(5, 12), shapes=("rect", "circle", "strip"), avoid=[(W * 0.08, H * 0.3, W * 0.92, H * 0.78)])
    t, s = fitted(d, H * 0.32, "Congrats!", "Luckiest Guy", 120, "#111111")
    t["fill"] = lin(0, 0, W, 0, [(0, "#FF5A5F"), (0.5, "#8E6CEF"), (1, "#3EC1D3")])
    body(d, H * 0.32 + s * 1.3, c["message"], "Fredoka", W * 0.05, "#2A2A2A", weight=500, lh=1.3)
    d.text(0, H * 0.7, W, c["signature"], "Caveat", W * 0.06, "#FF5A5F", weight=700, align="center")
    return {"layout": "rainbow-gradient headline in a frame of falling confetti", "typography": "Luckiest Guy gradient, Fredoka, Caveat", "palette": "white with party brights", "decor": "110 confetti pieces"}


@design(10)
def new_job_rocket(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1B1F4B"), (1, "#3B2A7A")]))
    for _ in range(50):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H * 0.6), d.rng.uniform(0.6, 2), "#FFFFFF", opacity=d.rng.uniform(0.4, 1))
    d.art("rocket", W * 0.5, H * 0.27, W * 0.42, angle=20)
    d.art("ringed-planet", W * 0.15, H * 0.1, W * 0.14)
    t, s = fitted(d, H * 0.52, "Congrats on\nthe new job!", "Outfit", 70, "#FFFFFF", weight=800, lh=1.0)
    body(d, H * 0.52 + s * 2.4, c["message"], "DM Sans", W * 0.042, "#D9D4FF", weight=500)
    d.text(0, H * 0.88, W, c["signature"], "DM Sans", W * 0.035, "#FFD54F", weight=700, align="center")
    return {"layout": "rocket launching into a starry sky above a bold two-line message", "typography": "Outfit ExtraBold, DM Sans", "palette": "space navy to violet, star yellow", "decor": "stars, rocket and planet illustrations"}


@design(11)
def promotion_star(d, c):
    W, H = d.W, d.H
    d.bg("#FBF6EA")
    d.rays(W / 2, H * 0.3, W * 0.2, W * 0.75, 28, "#F3E3B5", start=0, end=360, width_deg=5)
    d.star(W / 2, H * 0.3, W * 0.2, metal(W * 0.4, W * 0.4), points=5, inner=0.48)
    t, s = fitted(d, H * 0.55, "Well deserved!", "Playfair Display", 80, "#3E3020", weight=700, italic=True)
    body(d, H * 0.55 + s * 1.5, c["message"], "Lora", W * 0.04, "#5B4B38")
    d.text(0, H * 0.88, W, "— " + c["signature"], "Montserrat", W * 0.03, "#B48A3A", weight=700, align="center", spacing=200, upper=True)
    return {"layout": "gold star on a burst of pale rays, italic headline below", "typography": "Playfair Display bold italic, Lora, Montserrat caps", "palette": "ivory, gold, walnut", "decor": "ray burst, gold gradient star"}


@design(12)
def passed_driving(d, c):
    W, H = d.W, d.H
    d.bg("#9FD8F0")
    d.rect(-d.bleed, H * 0.62, W + 2 * d.bleed, H * 0.38 + d.bleed, "#4A4A4A")
    d.line(-d.bleed, H * 0.8, W + d.bleed, H * 0.8, "#FFFFFF", 6, dash=[30, 22])
    d.blob(W * 0.2, H * 0.16, 40, "#FFFFFF", wobble=0.1, n=6, seed=2)
    d.blob(W * 0.28, H * 0.14, 30, "#FFFFFF", wobble=0.1, n=6, seed=3)
    d.art("racing-car", W * 0.68, H * 0.66, W * 0.32)
    d.rect(W * 0.08, H * 0.2, W * 0.08, W * 0.08, "#E53935", rx=6)
    d.text(W * 0.08, H * 0.2 + 4, W * 0.08, "L", "Anton", W * 0.06, "#FFFFFF", align="center")
    t, s = fitted(d, H * 0.08, "You passed!", "Luckiest Guy", 80, "#1F4E8C", w=0.6, align="left", x=W * 0.2)
    body(d, H * 0.08 + s * 1.2, c["message"], "Fredoka", W * 0.032, "#1F3B5C", w=0.55, align="left", x=W * 0.2, weight=500)
    d.text(W * 0.08, H * 0.86, W * 0.5, c["signature"], "Caveat", W * 0.045, "#FFFFFF", weight=700)
    return {"layout": "road scene with a car, L-plate and headline in the sky", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "sky blue, asphalt, road white, red", "decor": "dashed road line, clouds, L-plate, car illustration"}


@design(13)
def congrats_script(d, c):
    W, H = d.W, d.H
    d.bg("#123328")
    d.frame_border(W * 0.05, "#C9A45A", 1, double=7)
    d.laurel(W / 2, H * 0.24, W * 0.18, "#C9A45A", leaves=8, size=W * 0.06, sweep=150)
    d.art("trophy", W / 2, H * 0.22, W * 0.16)
    t, s = fitted(d, H * 0.42, "Congratulations", "Great Vibes", 100, "#E9C877")
    text_metal(d, t)
    body(d, H * 0.42 + s * 1.35, c["message"], "Cormorant Garamond", W * 0.046, "#EDE6D2", italic=True, lh=1.4)
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "laurel-wrapped trophy above gold script congratulations", "typography": "Great Vibes gold, Cormorant Garamond italic, Montserrat caps", "palette": "forest green, gold, ivory", "decor": "double frame, laurel, trophy"}


@design(14)
def woohoo_post(d, c):
    W, H = d.W, d.H
    d.bg("#7B5CFF")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 40, 40, "rgba(255,255,255,0.08)", angle_deg=30)
    d.star(W / 2, H * 0.46, W * 0.46, "#FFE14D", points=16, inner=0.78, angle=-80)
    t, s = fitted(d, H * 0.36, "WOOHOO!", "Luckiest Guy", 260, "#FF4F79", w=0.74, stroke="#111111", sw=8)
    t["shadow"] = shadow("#111111", 0, 10, 10)
    d.text(0, H * 0.82, W, c["message"], "Fredoka", 54, "#FFFFFF", weight=700, align="center")
    d.art("party-popper", W * 0.84, H * 0.16, 200, angle=10)
    return {"layout": "comic burst with a shouting headline, line of text below", "typography": "Luckiest Guy outlined with drop shadow, Fredoka", "palette": "violet, lemon, hot pink", "decor": "diagonal stripes, starburst, party popper"}


# ---------------------------------------------------------------- get well
@design(15)
def get_well_sunflower(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFF8DC"), (1, "#FFE9A8")]))
    d.circle(W / 2, H * 0.3, W * 0.28, "#FFFFFF", opacity=0.7)
    d.art("sunflower", W / 2, H * 0.3, W * 0.48)
    t, s = fitted(d, H * 0.55, "Get well soon", "Pacifico", 80, "#7A4A00")
    body(d, H * 0.55 + s * 1.6, c["message"], "Lora", W * 0.042, "#6B4E1A", italic=True)
    d.text(0, H * 0.87, W, c["signature"], "Caveat", W * 0.065, "#C77700", weight=700, align="center")
    return {"layout": "sunflower in a soft halo above a handwritten wish", "typography": "Pacifico, Lora italic, Caveat", "palette": "buttercream, sunflower yellow, chocolate", "decor": "halo circle, sunflower illustration"}


@design(16)
def soup_blanket(d, c):
    W, H = d.W, d.H
    d.bg("#EFE6F6")
    for k in range(0, 8):
        d.rect(-d.bleed, H * 0.62 + k * 30, W + 2 * d.bleed, 15, "rgba(176,140,210,0.35)")
    d.rect(-d.bleed, H * 0.62, W + 2 * d.bleed, H * 0.4, "rgba(255,255,255,0.2)")
    d.art("teacup-without-handle", W * 0.3, H * 0.56, W * 0.26)
    d.art("teddy-bear", W * 0.7, H * 0.52, W * 0.32)
    t, s = fitted(d, H * 0.1, "Feel better soon", "Playfair Display", 70, "#4B2E6E", weight=600, italic=True)
    body(d, H * 0.1 + s * 1.4, c["message"], "Lora", W * 0.04, "#5E4A78")
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.06, "#4B2E6E", weight=700, align="center")
    return {"layout": "cosy scene — tea and teddy on a striped blanket, message above", "typography": "Playfair Display italic, Lora, Caveat", "palette": "lilac, plum, cream", "decor": "blanket stripes, tea and teddy illustrations"}


@design(17)
def bandage_heart(d, c):
    W, H = d.W, d.H
    d.bg("#FFF1EE")
    d.dots(0, 0, W, H, 22, 1.6, "#F6C9C2")
    d.art("mending-heart", W / 2, H * 0.3, W * 0.5, shadow_=shadow("rgba(200,80,80,0.2)", 30, 0, 12))
    t, s = fitted(d, H * 0.56, "Sending hugs", "Fredoka", 80, "#C2405E", weight=700)
    body(d, H * 0.56 + s * 1.3, c["message"], "Fredoka", W * 0.042, "#7A4A52", weight=500)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#C2405E", weight=700, align="center")
    return {"layout": "big mending-heart illustration over polka dots, rounded headline", "typography": "Fredoka, Caveat", "palette": "peach blush, raspberry", "decor": "polka dots, heart illustration"}


@design(18)
def rainbow_recovery(d, c):
    W, H = d.W, d.H
    d.bg("#F4F8FF")
    d.art("rainbow", W * 0.27, H * 0.5, W * 0.4)
    d.art("sun-behind-small-cloud", W * 0.12, H * 0.16, W * 0.1) if False else d.art("sun", W * 0.1, H * 0.16, W * 0.1)
    x0 = W * 0.52
    t = d.text(x0, H * 0.18, W * 0.42, "Better days\nare coming", "Playfair Display", d.fit("Better days", W * 0.4, "Playfair Display", 60, 700, True), "#2E4A7A", weight=700, italic=True, lh=1.05)
    d.text(x0, H * 0.18 + t["_h"] + 16, W * 0.42, c["message"], "Lora", W * 0.03, "#3E5672", lh=1.5)
    d.text(x0, H * 0.82, W * 0.42, c["signature"], "Caveat", W * 0.04, "#E06C8A", weight=700)
    return {"layout": "rainbow on the left, italic headline and note on the right", "typography": "Playfair Display bold italic, Lora, Caveat", "palette": "cloud white, navy, rainbow", "decor": "rainbow and sun illustrations"}


@design(19)
def get_well_floral(d, c):
    W, H = d.W, d.H
    d.bg("#F7F4EE")
    d.texture("paper", 0.45)
    for k in range(12):
        a = math.radians(200 + k * 12)
        x, y = W / 2 + W * 0.42 * math.cos(a), H * 0.4 + W * 0.42 * math.sin(a)
        d.leaf(x, y, 44, 12, math.degrees(a) + 90 + (35 if k % 2 else -35), ["#8DA68A", "#B5C4A7"][k % 2])
    for k, f in enumerate(["tulip", "blossom", "rose", "blossom", "cherry-blossom"]):
        a = math.radians(215 + k * 27)
        d.art(f, W / 2 + W * 0.42 * math.cos(a), H * 0.4 + W * 0.42 * math.sin(a), W * 0.13)
    t, s = fitted(d, H * 0.28, "Get well soon", "Great Vibes", 90, "#6F3B4A")
    body(d, H * 0.28 + s * 1.4, c["message"], "Lora", W * 0.042, "#4F5A48", italic=True)
    d.text(0, H * 0.82, W, c["signature"], "Montserrat", W * 0.026, "#6F3B4A", weight=700, align="center", spacing=240, upper=True)
    return {"layout": "flower arc crowning a script greeting", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "warm paper, sage, plum, flower pinks", "decor": "leaf arc with five flowers, paper grain"}


# ---------------------------------------------------------------- sympathy / thinking of you
@design(20)
def lily_sympathy(d, c):
    W, H = d.W, d.H
    d.bg("#F4F2EE")
    d.art("blossom", W * 0.5, H * 0.24, W * 0.38, opacity=0.95)
    d.leaf(W * 0.38, H * 0.36, 90, 18, 140, "#9AAE96")
    d.leaf(W * 0.62, H * 0.36, 90, 18, 40, "#9AAE96")
    t, s = fitted(d, H * 0.46, "With deepest sympathy", "Cormorant Garamond", 60, "#3E4A52", italic=True, w=0.8)
    divider(d, W / 2, H * 0.46 + s * 1.5, W * 0.24, "#9AA6AE", 0.8, gap=6)
    body(d, H * 0.46 + s * 1.8, c["message"], "Lora", W * 0.038, "#5A646C")
    d.text(0, H * 0.86, W, c["signature"], "Montserrat", W * 0.024, "#6A747C", weight=600, align="center", spacing=220, upper=True)
    return {"layout": "single white flower and two leaves above a quiet italic line", "typography": "Cormorant Garamond italic, Lora, Montserrat caps", "palette": "stone white, slate, sage", "decor": "white flower, leaves, fine divider"}


@design(21)
def loving_memory(d, c):
    W, H = d.W, d.H
    d.bg("#1E2328")
    d.circle(W / 2, H * 0.34, W * 0.26, "", stroke="#B9A27A", sw=1.2)
    d.art("candle", W / 2, H * 0.34, W * 0.3)
    d.circle(W / 2, H * 0.27, W * 0.12, rad(W * 0.12, W * 0.12, W * 0.12, [(0, "rgba(255,220,150,0.45)"), (1, "rgba(255,220,150,0)")]))
    t, s = fitted(d, H * 0.6, "In loving memory", "Cormorant Garamond", 70, "#E8E2D4", italic=True, w=0.8)
    divider(d, W / 2, H * 0.6 + s * 1.5, W * 0.24, "#B9A27A", 0.8, gap=6)
    d.text(0, H * 0.6 + s * 1.8, W, c["message"], "Cinzel", W * 0.034, "#B9A27A", weight=600, align="center", spacing=220)
    return {"layout": "candle in a fine gold ring with a soft glow, memorial line below", "typography": "Cormorant Garamond italic, Cinzel", "palette": "charcoal, ivory, muted gold", "decor": "ring, glow, candle illustration"}


@design(22)
def thinking_moon(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#1D2350"), (1, "#5A4A8A")]))
    for _ in range(60):
        d.circle(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(0.6, 2), "#FFFFFF", opacity=d.rng.uniform(0.3, 1))
    d.art("crescent-moon", W * 0.5, H * 0.28, W * 0.42, angle=-15)
    t, s = fitted(d, H * 0.56, "Thinking of you", "Great Vibes", 90, "#FFF1D0")
    body(d, H * 0.56 + s * 1.35, c["message"], "Lora", W * 0.04, "#E1DCF5", italic=True)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#FFD98A", weight=700, align="center")
    return {"layout": "moon resting on a cloud in a starry sky, script message below", "typography": "Great Vibes, Lora italic, Caveat", "palette": "night indigo, moon gold, lavender", "decor": "stars, clouds, moon illustration"}


@design(23)
def here_for_you(d, c):
    W, H = d.W, d.H
    d.bg("#F8EDE3")
    d.circle(W / 2, H * 0.3, W * 0.28, "#F2C9B4")
    d.art("heart-hands", W / 2, H * 0.3, W * 0.4) if False else d.art("two-hearts", W / 2, H * 0.3, W * 0.38)
    t, s = fitted(d, H * 0.56, "I’m here for you", "Playfair Display", 70, "#6B2E3A", weight=600, italic=True)
    body(d, H * 0.56 + s * 1.4, c["message"], "Lora", W * 0.04, "#6E4A50")
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.06, "#B5523B", weight=700, align="center")
    return {"layout": "two hearts in a peach circle, italic promise below", "typography": "Playfair Display italic, Lora, Caveat", "palette": "cream, peach, wine, terracotta", "decor": "circle, hearts illustration"}


@design(24)
def miss_you_postcard(d, c):
    W, H = d.W, d.H
    d.bg("#FBF7EE")
    d.texture("paper", 0.5)
    d.line(W * 0.55, H * 0.12, W * 0.55, H * 0.88, "#C9B89A", 1)
    d.rect(W * 0.82, H * 0.1, W * 0.12, W * 0.15, "#FFFFFF", stroke="#D64545", sw=2, dash=[3, 3])
    d.art("cityscape", W * 0.88, H * 0.1 + W * 0.075, W * 0.1)
    for k in range(3):
        d.line(W * 0.6, H * (0.55 + k * 0.1), W * 0.92, H * (0.55 + k * 0.1), "#C9B89A", 1)
    d.text(W * 0.62, H * 0.47, W * 0.3, "To: you, wherever you are", "Caveat", W * 0.028, "#6E5A50")
    t = d.text(W * 0.06, H * 0.14, W * 0.46, "Miss you!", "Pacifico", d.fit("Miss you!", W * 0.44, "Pacifico", 80), "#D64545")
    d.text(W * 0.06, H * 0.14 + t["_h"] + 14, W * 0.44, c["message"], "Caveat", W * 0.04, "#2F2A24", lh=1.2)
    d.text(W * 0.06, H * 0.8, W * 0.44, c["signature"], "Caveat", W * 0.04, "#2F5DA8", weight=700)
    d.circle(W * 0.78, H * 0.3, 44, "", stroke="#5A4A3A", sw=2, opacity=0.5)
    return {"layout": "postcard back: message on the left, stamp, postmark and address lines on the right", "typography": "Pacifico, Caveat", "palette": "postcard cream, red, ink blue", "decor": "paper grain, divider, stamp, postmark, address rules"}


# ---------------------------------------------------------------- love
@design(25)
def anniversary_gold(d, c):
    W, H = d.W, d.H
    d.bg(rad(W / 2, H * 0.35, H, [(0, "#2A1E2E"), (1, "#0E0A10")]))
    d.confetti(W * 0.1, H * 0.05, W * 0.9, H * 0.28, ["#E9C877", "#F7E3A3"], n=24, size=(3, 7), shapes=("circle", "star"))
    t = d.text(0, H * 0.16, W, "10", "Playfair Display", W * 0.4, "#E9C877", weight=700, align="center", lh=0.9)
    text_metal(d, t)
    t2, s = fitted(d, H * 0.5, "Happy Anniversary", "Great Vibes", 80, "#F3E6CB")
    body(d, H * 0.5 + s * 1.35, c["message"], "Cormorant Garamond", W * 0.05, "#E8DCE6", italic=True)
    d.text(0, H * 0.84, W, c["signature"], "Montserrat", W * 0.024, "#C9A45A", weight=600, align="center", spacing=260, upper=True)
    return {"layout": "gold anniversary year numeral over a script greeting", "typography": "Playfair Display gold, Great Vibes, Cormorant Garamond italic", "palette": "plum black, gold, champagne", "decor": "gold confetti"}


@design(26)
def love_you_more(d, c):
    W, H = d.W, d.H
    d.bg("#FFE3E8")
    for _ in range(26):
        d.heart(d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(18, 48), d.rng.choice(["#FF8FA3", "#FFB3C1", "#FF6B81"]), angle=d.rng.uniform(-25, 25), opacity=0.6)
    d.rect(W * 0.1, H * 0.25, W * 0.8, H * 0.48, "#FFFFFF", rx=30, shadow_=shadow("rgba(200,80,110,0.25)", 30, 0, 10))
    t, s = fitted(d, H * 0.29, "Love you\nmore", "Pacifico", 90, "#E0345A", w=0.66, lh=1.05)
    body(d, H * 0.29 + s * 2.6, c["message"], "Fredoka", W * 0.042, "#7A3B49", w=0.66, weight=500)
    d.text(0, H * 0.84, W, c["signature"], "Caveat", W * 0.07, "#E0345A", weight=700, align="center")
    return {"layout": "white card floating on a field of hearts", "typography": "Pacifico, Fredoka, Caveat", "palette": "candy pink, cherry red, white", "decor": "scattered hearts, card shadow"}


@design(27)
def valentine_envelope(d, c):
    W, H = d.W, d.H
    d.bg("#B71C3C")
    d.dots(0, 0, W, H, 26, 2, "#C9334F")
    ex, ey, ew, eh = W * 0.12, H * 0.22, W * 0.76, H * 0.36
    d.rect(ex, ey, ew, eh, "#FBEDE5", rx=8, shadow_=shadow("rgba(0,0,0,0.3)", 20, 0, 10), name="Envelope")
    d.polygon([(ex, ey), (ex + ew, ey), (ex + ew / 2, ey + eh * 0.55)], "#F3D9CC")
    d.heart(W / 2, ey + eh * 0.52, 70, "#D32F4F")
    t, s = fitted(d, H * 0.64, "Be mine", "Great Vibes", 120, "#FFFFFF")
    body(d, H * 0.64 + s * 1.3, c["message"], "Lora", W * 0.04, "#FFE6EA", italic=True)
    d.text(0, H * 0.94, W, c["signature"], "Montserrat", W * 0.024, "#FFD1DA", weight=700, align="center", spacing=240, upper=True)
    return {"layout": "envelope with a heart seal on red dots, script line below", "typography": "Great Vibes, Lora italic, Montserrat caps", "palette": "valentine red, blush paper, white", "decor": "dot pattern, envelope with flap and heart seal"}


@design(28)
def anniversary_photo_post(d, c):
    W, H = d.W, d.H
    d.bg("#F3EDE4")
    d.photo(138, 70, 70, W - 140, H * 0.62, frame="rounded", rx=30, focus=(0.5, 0.3))
    t, s = fitted(d, H * 0.7, "5 years", "Playfair Display", 130, "#2E2A26", weight=600, italic=True)
    d.text(0, H * 0.7 + s * 1.2, W, c["message"], "Lora", 44, "#5E5248", italic=True, align="center")
    d.heart(W * 0.86, H * 0.66, 70, "#E0345A")
    return {"layout": "rounded couple photo with an italic year line and a heart sticker", "typography": "Playfair Display italic, Lora italic", "palette": "linen, charcoal, red heart", "decor": "rounded frame, heart"}


@design(29)
def you_and_me(d, c):
    W, H = d.W, d.H
    d.bg("#F5F0EA")
    d.circle(W * 0.42, H * 0.36, W * 0.2, "", stroke="#2B2724", sw=2)
    d.circle(W * 0.58, H * 0.36, W * 0.2, "", stroke="#C9886E", sw=2)
    d.heart(W / 2, H * 0.36, 40, "#C9886E")
    t, s = fitted(d, H * 0.6, "you & me", "Playfair Display", 90, "#2B2724", italic=True)
    d.text(0, H * 0.6 + s * 1.3, W, c["message"], "Montserrat", W * 0.03, "#5A534C", weight=500, align="center", spacing=120)
    return {"layout": "two overlapping rings with a heart where they meet", "typography": "Playfair Display italic, Montserrat", "palette": "oat, ink, terracotta", "decor": "two line circles, heart"}


@design(30)
def paper_plane(d, c):
    W, H = d.W, d.H
    d.bg("#EAF2FB")
    d.path([["M", W * 0.08, H * 0.82], ["C", W * 0.3, H * 0.4, W * 0.5, H * 0.95, W * 0.7, H * 0.3]], fill="", stroke="#5B7DB1", sw=2, dash=[8, 8])
    d.polygon([(W * 0.7, H * 0.3), (W * 0.82, H * 0.16), (W * 0.76, H * 0.34)], "#FFFFFF", stroke="#5B7DB1", sw=1.5)
    d.polygon([(W * 0.7, H * 0.3), (W * 0.82, H * 0.16), (W * 0.73, H * 0.24)], "#D6E4F5", stroke="#5B7DB1", sw=1.5)
    d.heart(W * 0.08, H * 0.82, 40, "#E0345A")
    d.heart(W * 0.9, H * 0.12, 30, "#E0345A")
    t, s = fitted(d, H * 0.1, "Distance means so little", "Playfair Display", 60, "#1F3B5C", w=0.6, italic=True, align="left", x=W * 0.06)
    d.text(W * 0.06, H * 0.1 + s * 1.3, W * 0.5, c["message"], "Lora", W * 0.035, "#3E5672", italic=True)
    d.text(W * 0.45, H * 0.84, W * 0.5, c["signature"], "Caveat", W * 0.04, "#E0345A", weight=700, align="right")
    return {"layout": "paper plane flying a dashed route between two hearts", "typography": "Playfair Display italic, Lora italic, Caveat", "palette": "sky mist, navy, red hearts", "decor": "dashed flight path, vector paper plane, hearts"}


@design(31)
def anniversary_story(d, c):
    W, H = d.W, d.H
    d.bg("#14110F")
    d.photo(1078, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.35))
    overlay(d, 0, 0.85, y0=H * 0.5, y1=H)
    t, s = fitted(d, H * 0.68, "Happy anniversary", "Great Vibes", 200, "#FFFFFF")
    body(d, H * 0.68 + s * 1.3, c["message"], "Cormorant Garamond", 64, "#F3EDE4", italic=True, w=0.8)
    d.heart(W / 2, H * 0.92, 60, "#E0345A")
    return {"layout": "full-bleed couple photo with script greeting over a dark fade", "typography": "Great Vibes, Cormorant Garamond italic", "palette": "photo tones, white, heart red", "decor": "shade, heart"}


@design(32)
def galentine(d, c):
    W, H = d.W, d.H
    d.bg("#FFD6E5")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 22, 22, "rgba(255,255,255,0.5)", angle_deg=0)
    for k, (x, y, nm, a) in enumerate([(0.2, 0.2, "lipstick", -20), (0.8, 0.2, "cocktail-glass", 15), (0.18, 0.78, "high-heeled-shoe", -10), (0.82, 0.8, "sparkles", 0)]):
        d.art(nm, W * x, H * y, W * 0.2, angle=a)
    d.circle(W / 2, H * 0.48, W * 0.33, "#FFFFFF", shadow_=shadow("rgba(220,90,140,0.25)", 30, 0, 10))
    t, s = fitted(d, H * 0.38, "Happy\nGalentine’s!", "Pacifico", 70, "#E2337A", w=0.56, lh=1.05)
    body(d, H * 0.38 + s * 2.5, c["message"], "Fredoka", W * 0.032, "#8A2E5A", w=0.5, weight=500)
    d.text(0, H * 0.92, W, c["signature"], "Caveat", W * 0.06, "#E2337A", weight=700, align="center")
    return {"layout": "round white badge on candy stripes with glam illustrations in the corners", "typography": "Pacifico, Fredoka, Caveat", "palette": "candy pink, white, magenta", "decor": "stripes, badge, lipstick / cocktail / heel / sparkles"}


# ---------------------------------------------------------------- friendship
@design(33)
def bff(d, c):
    W, H = d.W, d.H
    d.bg("#FFF3D6")
    d.art("two-hearts", W * 0.5, H * 0.18, W * 0.3)
    t, s = fitted(d, H * 0.34, "Friends\nforever", "Righteous", 110, "#E2572A", lh=0.95)
    t["shadow"] = shadow("#2A6F97", 0, 6, 6)
    body(d, H * 0.34 + s * 2.3, c["message"], "Fredoka", W * 0.042, "#2A3A4E", weight=500)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.065, "#2A6F97", weight=700, align="center")
    d.dots(0, H * 0.94, W, H, 14, 3, "#F2B84B")
    return {"layout": "retro offset-shadow headline under a pair of hearts", "typography": "Righteous with offset shadow, Fredoka, Caveat", "palette": "cream, tangerine, ocean blue", "decor": "hearts illustration, dot border"}


@design(34)
def just_hi(d, c):
    W, H = d.W, d.H
    d.bg("#5CC8E8")
    d.circle(W * 0.2, H * 0.14, 60, "#FFE14D")
    d.circle(W * 0.86, H * 0.82, 90, "#FF8FA3")
    d.polygon([(W * 0.8, H * 0.12), (W * 0.92, H * 0.24), (W * 0.76, H * 0.26)], "#FFFFFF")
    d.rect(W * 0.08, H * 0.3, W * 0.84, H * 0.38, "#FFFFFF", rx=60, name="Speech bubble")
    d.polygon([(W * 0.24, H * 0.67), (W * 0.36, H * 0.67), (W * 0.2, H * 0.76)], "#FFFFFF")
    t, s = fitted(d, H * 0.34, "Hi there!", "Luckiest Guy", 110, "#2A2A2A", w=0.7)
    body(d, H * 0.34 + s * 1.3, c["message"], "Fredoka", W * 0.042, "#2A2A2A", w=0.7, weight=500)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.065, "#FFFFFF", weight=700, align="center")
    return {"layout": "big speech bubble with playful shapes around it", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "sky cyan, lemon, pink, white", "decor": "speech bubble, circles, triangle"}


@design(35)
def you_are_awesome(d, c):
    W, H = d.W, d.H
    d.bg("#2B1B3D")
    cx = W / 2
    for k, col in enumerate(["#FBD35E", "#F59E4C", "#E0694F", "#B4485C"]):
        d.circle(cx, H + d.bleed, W * (0.46 - k * 0.08), col, start=180, end=360)
    t, s = fitted(d, H * 0.12, "YOU ARE\nAWESOME", "Righteous", 110, "#FBD35E", lh=0.95)
    body(d, H * 0.12 + s * 2.3, c["message"], "Fredoka", W * 0.042, "#F3D8C2", weight=500)
    d.sparkle(W * 0.14, H * 0.42, 14, "#FBD35E")
    d.sparkle(W * 0.86, H * 0.4, 18, "#FBD35E")
    return {"layout": "retro rainbow rising from the bottom, chunky caps headline above", "typography": "Righteous, Fredoka", "palette": "aubergine, sunset bands", "decor": "four-band rainbow, sparkles"}


@design(36)
def coffee_date(d, c):
    W, H = d.W, d.H
    d.bg("#F3E7DA")
    d.rect(-d.bleed, H * 0.66, W + 2 * d.bleed, H * 0.34 + d.bleed, "#C99D7A")
    d.art("hot-beverage", W * 0.25, H * 0.56, W * 0.22)
    d.art("croissant", W * 0.42, H * 0.66, W * 0.16)
    x0 = W * 0.55
    t = d.text(x0, H * 0.14, W * 0.4, "Coffee soon?", "Pacifico", d.fit("Coffee soon?", W * 0.4, "Pacifico", 70), "#6B3A1E")
    d.text(x0, H * 0.14 + t["_h"] + 14, W * 0.4, c["message"], "Lora", W * 0.034, "#5A3424", italic=True, lh=1.5)
    d.text(x0, H * 0.82, W * 0.4, c["signature"], "Caveat", W * 0.045, "#FFF6EE", weight=700)
    return {"layout": "café table with coffee and croissant on the left, invitation on the right", "typography": "Pacifico, Lora italic, Caveat", "palette": "latte, walnut table, espresso", "decor": "table band, coffee and croissant illustrations"}


@design(37)
def friendship_quote(d, c):
    W, H = d.W, d.H
    d.bg("#F6EFE7")
    d.text(W * 0.08, H * 0.06, 200, "“", "Playfair Display", 260, "#E3A07A", weight=700)
    s = d.fit("A friend is someone who knows", W * 0.82, "Playfair Display", 80, 600, True)
    t = d.text(W * 0.09, H * 0.25, W * 0.82, c["headline"], "Playfair Display", s, "#3A2A20", weight=600, italic=True, lh=1.15)
    d.text(W * 0.09, H * 0.25 + t["_h"] + 30, W * 0.82, c["message"], "Lora", 46, "#6E4A38", lh=1.4)
    d.line(W * 0.09, H * 0.88, W * 0.25, H * 0.88, "#E3A07A", 3)
    return {"layout": "editorial quote with an oversized quotation mark", "typography": "Playfair Display semibold italic, Lora", "palette": "linen, cocoa, apricot", "decor": "quote mark, rule"}


# ---------------------------------------------------------------- good luck / farewell / new home / just because
@design(38)
def good_luck_clover(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#E6F6E6"), (1, "#C8EBC8")]))
    for _ in range(14):
        d.art("four-leaf-clover", d.rng.uniform(0, W), d.rng.uniform(0, H), d.rng.uniform(30, 60), angle=d.rng.uniform(0, 360), opacity=0.35)
    d.art("four-leaf-clover", W / 2, H * 0.28, W * 0.38)
    t, s = fitted(d, H * 0.52, "Good luck!", "Pacifico", 90, "#2E7D32")
    body(d, H * 0.52 + s * 1.6, c["message"], "Fredoka", W * 0.042, "#2E5A33", weight=500)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.055, "#2E7D32", weight=700, align="center")
    return {"layout": "big lucky clover above a handwritten wish, faint clovers scattered", "typography": "Pacifico, Fredoka, Caveat", "palette": "mint, clover green", "decor": "clover illustrations"}


@design(39)
def exam_luck(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    step = 24
    d.path([x for k in range(int(H / step) + 2) for x in (["M", -d.bleed, k * step], ["L", W + d.bleed, k * step])], fill="", stroke="#D6E6F7", sw=1)
    d.line(W * 0.12, -d.bleed, W * 0.12, H + d.bleed, "#F3A5B5", 1.5)
    d.art("books", W * 0.78, H * 0.16, W * 0.24)
    d.art("pencil", W * 0.84, H * 0.74, W * 0.16, angle=30)
    t, s = fitted(d, H * 0.3, "You’ve got this!", "Caveat", 90, "#2E3A59", w=0.74, weight=700)
    d.rect(W * 0.18, H * 0.3 + s * 0.6, W * 0.64, s * 0.4, "#FFE14D", opacity=0.6)
    d.objs.insert(len(d.objs) - 1, d.objs.pop())
    body(d, H * 0.3 + s * 1.4, c["message"], "Caveat", W * 0.06, "#2E3A59", w=0.7)
    d.text(0, H * 0.86, W, c["signature"], "Caveat", W * 0.065, "#E0457B", weight=700, align="center")
    return {"layout": "lined notebook page with a highlighted handwritten pep talk", "typography": "Caveat", "palette": "white paper, blue rules, ink navy, highlighter yellow", "decor": "ruled lines, margin line, books and pencil"}


@design(40)
def farewell(d, c):
    W, H = d.W, d.H
    d.bg("#1F2A44")
    d.confetti(0, 0, W, H * 0.35, ["#FFD54F", "#FF8A65", "#4FC3F7", "#FFFFFF"], n=50, size=(5, 12), shapes=("strip", "circle"))
    d.art("luggage", W * 0.5, H * 0.24, W * 0.3)
    t, s = fitted(d, H * 0.42, "We’ll miss you", "Playfair Display", 90, "#FFFFFF", weight=700, italic=True)
    body(d, H * 0.42 + s * 1.5, c["message"], "Lora", W * 0.04, "#C9D3E0")
    d.rect(W * 0.1, H * 0.72, W * 0.8, H * 0.14, "rgba(255,255,255,0.08)", rx=12, stroke="rgba(255,255,255,0.3)", sw=1, dash=[6, 6])
    d.text(W * 0.1, H * 0.76, W * 0.8, "sign here ✎", "Caveat", W * 0.05, "rgba(255,255,255,0.6)", align="center")
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", W * 0.024, "#FFD54F", weight=700, align="center", spacing=220, upper=True)
    return {"layout": "suitcase and confetti above the farewell, with a dashed space for signatures", "typography": "Playfair Display italic, Lora, Caveat, Montserrat caps", "palette": "navy, white, confetti brights", "decor": "confetti, luggage, signature box"}


@design(41)
def bon_voyage(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#8ED1F5"), (1, "#D6F0FB")]))
    d.wave(-d.bleed, W + d.bleed, H * 0.74, 10, 120, fill="#2F80C0", bottom=H + d.bleed)
    d.wave(-d.bleed, W + d.bleed, H * 0.82, 8, 90, fill="#1F5E99", bottom=H + d.bleed, phase=1)
    d.art("sailboat", W * 0.26, H * 0.62, W * 0.26)
    d.art("airplane", W * 0.84, H * 0.16, W * 0.14, angle=-10)
    d.art("world-map", W * 0.84, H * 0.5, W * 0.16)
    t = d.text(W * 0.44, H * 0.2, W * 0.36, "Bon voyage!", "Pacifico", d.fit("Bon voyage!", W * 0.34, "Pacifico", 70), "#0E3A66")
    d.text(W * 0.44, H * 0.2 + t["_h"] + 10, W * 0.32, c["message"], "Lora", W * 0.032, "#1F4E79", italic=True, lh=1.45)
    d.text(W * 0.06, H * 0.88, W * 0.88, c["signature"], "Caveat", W * 0.04, "#FFFFFF", weight=700, align="right")
    return {"layout": "seaside scene with a sailboat and plane, travel wish in the sky", "typography": "Pacifico, Lora italic, Caveat", "palette": "sky blue, ocean blues, navy", "decor": "two waves, sailboat, plane, map"}


@design(42)
def retirement(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4E0")
    d.rect(-d.bleed, H * 0.62, W + 2 * d.bleed, H * 0.38 + d.bleed, "#F2C66D")
    d.art("beach-with-umbrella", W * 0.5, H * 0.56, W * 0.5)
    d.art("sunglasses", W * 0.84, H * 0.36, W * 0.16, angle=12)
    t, s = fitted(d, H * 0.08, "Happy\nretirement!", "Pacifico", 80, "#C04A1E", lh=1.0)
    body(d, H * 0.78, c["message"], "Fredoka", W * 0.04, "#6B3A1E", weight=500)
    d.text(0, H * 0.92, W, c["signature"], "Montserrat", W * 0.022, "#6B3A1E", weight=700, align="center", spacing=180, upper=True)
    return {"layout": "beach illustration on sand with a two-line script headline above", "typography": "Pacifico, Fredoka, Montserrat caps", "palette": "sand, sunset orange, cocoa", "decor": "beach umbrella and sunglasses illustrations"}


@design(43)
def new_home_keys(d, c):
    W, H = d.W, d.H
    d.bg("#E8F1EC")
    d.art("house-with-garden", W / 2, H * 0.27, W * 0.5)
    d.art("key", W * 0.78, H * 0.42, W * 0.16, angle=-30)
    t, s = fitted(d, H * 0.52, "Welcome home!", "Playfair Display", 80, "#244A3A", weight=700, italic=True)
    body(d, H * 0.52 + s * 1.5, c["message"], "Lora", W * 0.04, "#3E5A4E")
    d.text(0, H * 0.88, W, c["signature"], "Montserrat", W * 0.026, "#244A3A", weight=700, align="center", spacing=220, upper=True)
    return {"layout": "house and key illustrations above an italic welcome", "typography": "Playfair Display bold italic, Lora, Montserrat caps", "palette": "mint, forest, cream", "decor": "house and key illustrations"}


@design(44)
def housewarming(d, c):
    W, H = d.W, d.H
    d.bg("#FBEFE3")
    x, y, w, h = W * 0.08, H * 0.32, W * 0.4, H * 0.5
    d.rect(x, y, w, h, "#F2A65A", name="House")
    d.polygon([(x - 20, y), (x + w / 2, y - h * 0.5), (x + w + 20, y)], "#C0392B")
    d.rect(x + w * 0.38, y + h * 0.5, w * 0.24, h * 0.5, "#6B3A1E", rx=4)
    for wx in (x + w * 0.12, x + w * 0.66):
        d.rect(wx, y + h * 0.18, w * 0.22, h * 0.22, "#FFF4C2", stroke="#6B3A1E", sw=3)
    d.heart(x + w / 2, y - h * 0.22, 36, "#FFFFFF")
    d.rect(-d.bleed, y + h, W + 2 * d.bleed, H - y - h + d.bleed, "#8BBF7A")
    t = d.text(W * 0.55, H * 0.18, W * 0.4, "Home sweet\nhome", "Pacifico", d.fit("Home sweet", W * 0.38, "Pacifico", 70), "#C0392B", lh=1.05)
    d.text(W * 0.55, H * 0.18 + t["_h"] + 14, W * 0.38, c["message"], "Lora", W * 0.032, "#5A3424", italic=True, lh=1.5)
    d.text(W * 0.55, H * 0.86, W * 0.4, c["signature"], "Caveat", W * 0.04, "#FFFFFF", weight=700)
    return {"layout": "flat vector house on a lawn with the greeting beside it", "typography": "Pacifico, Lora italic, Caveat", "palette": "peach house, brick roof, grass green", "decor": "vector house with heart, windows and door"}


@design(45)
def weve_moved(d, c):
    W, H = d.W, d.H
    d.bg("#FFDE59")
    d.art("house", W * 0.25, H * 0.3, W * 0.3)
    d.path([["M", W * 0.38, H * 0.3], ["C", W * 0.5, H * 0.15, W * 0.6, H * 0.45, W * 0.72, H * 0.3]], fill="", stroke="#111111", sw=5, dash=[14, 12])
    d.art("house-with-garden", W * 0.8, H * 0.3, W * 0.3)
    t, s = fitted(d, H * 0.5, "We’ve moved!", "Luckiest Guy", 160, "#111111", w=0.84)
    d.rect(W * 0.1, H * 0.5 + s * 1.3, W * 0.8, 120, "#FFFFFF", rx=60)
    d.text(W * 0.1, H * 0.5 + s * 1.3 + 36, W * 0.8, c["message"], "Fredoka", 40, "#111111", weight=600, align="center")
    d.text(0, H * 0.9, W, c["signature"], "Caveat", 54, "#111111", weight=700, align="center")
    return {"layout": "old house to new house along a dashed path, bold announcement and address pill", "typography": "Luckiest Guy, Fredoka, Caveat", "palette": "sunflower yellow, black, white", "decor": "dashed route, two house illustrations, address pill"}


@design(46)
def sending_sunshine(d, c):
    W, H = d.W, d.H
    d.bg("#FFF6E0")
    d.rays(W / 2, H * 0.32, W * 0.2, W * 0.5, 16, "#FFD45C", start=0, end=360, width_deg=8)
    d.circle(W / 2, H * 0.32, W * 0.2, "#FFC21A")
    d.text(0, H * 0.32 - W * 0.05, W, "◡", "DM Sans", W * 0.12, "#8A5A00", align="center") if False else None
    d.art("sun", W / 2, H * 0.32, W * 0.36)
    t, s = fitted(d, H * 0.6, "Sending sunshine", "Pacifico", 80, "#C77700")
    body(d, H * 0.6 + s * 1.6, c["message"], "Fredoka", W * 0.042, "#8A5A00", weight=500)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.065, "#C77700", weight=700, align="center")
    return {"layout": "sun with a crown of rays, cheerful script line below", "typography": "Pacifico, Fredoka, Caveat", "palette": "buttercream, sunshine yellow, honey brown", "decor": "rays, sun illustration"}


@design(47)
def self_care(d, c):
    W, H = d.W, d.H
    d.bg("#E9E4F5")
    for (x, y, r, col, sd) in [(0.15, 0.14, 0.24, "#D7CCF2", 1), (0.88, 0.86, 0.3, "#F6D3E0", 2), (0.85, 0.12, 0.16, "#CDE7DC", 3)]:
        d.blob(W * x, H * y, W * r, col, wobble=0.18, n=8, seed=sd)
    d.art("potted-plant", W * 0.5, H * 0.26, W * 0.34)
    t, s = fitted(d, H * 0.46, "Be kind to\nyourself", "Playfair Display", 80, "#3E2E66", weight=600, italic=True, lh=1.05)
    body(d, H * 0.46 + s * 2.5, c["message"], "Montserrat", W * 0.034, "#5A4A80", weight=500, lh=1.6)
    return {"layout": "potted plant and soft blobs above a gentle two-line reminder", "typography": "Playfair Display italic, Montserrat", "palette": "lavender, blush, mint, indigo", "decor": "organic blobs, plant illustration"}


@design(48)
def proud_of_you(d, c):
    W, H = d.W, d.H
    d.bg("#1E3A5F")
    d.art("glowing-star", W * 0.5, H * 0.24, W * 0.4)
    for x, y, r in [(0.2, 0.14, 12), (0.8, 0.12, 9), (0.84, 0.36, 14), (0.16, 0.4, 8)]:
        d.sparkle(W * x, H * y, r, "#FFE27A")
    t, s = fitted(d, H * 0.46, "So proud\nof you", "Playfair Display", 90, "#FFE27A", weight=700, italic=True, lh=1.0)
    body(d, H * 0.46 + s * 2.4, c["message"], "Lora", W * 0.045, "#D6E2F0", italic=True)
    d.text(0, H * 0.88, W, c["signature"], "Caveat", W * 0.065, "#FFFFFF", weight=700, align="center")
    return {"layout": "glowing star with sparkles above a gold italic headline", "typography": "Playfair Display bold italic, Lora italic, Caveat", "palette": "midnight blue, star gold", "decor": "sparkles, star illustration"}


@design(49)
def happy_weekend(d, c):
    W, H = d.W, d.H
    d.bg("#F4E6D8")
    d.photo(849, W * 0.5, -d.bleed, W * 0.5 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
    t = d.text(70, H * 0.18, W * 0.4, "Happy\nweekend", "Playfair Display", d.fit("weekend", W * 0.4, "Playfair Display", 140, 600, True), "#3A2418", weight=600, italic=True, lh=1.0)
    d.line(70, H * 0.18 + t["_h"] + 30, 200, H * 0.18 + t["_h"] + 30, "#B5523B", 3)
    d.text(70, H * 0.18 + t["_h"] + 60, W * 0.38, c["message"], "Lora", 46, "#5A3424", lh=1.45)
    d.art("hot-beverage", W * 0.22, H * 0.82, 160)
    return {"layout": "split: text on latte paper left, coffee-bean photo right", "typography": "Playfair Display italic, Lora", "palette": "latte, espresso, terracotta", "decor": "photo half, rule, coffee illustration"}


@design(50)
def hello_spring(d, c):
    W, H = d.W, d.H
    d.bg("#F1F8EC")
    for k in range(9):
        x = W * (k + 0.5) / 9
        d.art(["tulip", "blossom", "cherry-blossom", "blossom"][k % 4], x, H * (0.86 - (k % 2) * 0.05), W * 0.12, angle=(-8 if k % 2 else 8))
    d.art("butterfly", W * 0.82, H * 0.2, W * 0.1, angle=15)
    d.art("honeybee", W * 0.14, H * 0.24, W * 0.07, angle=-10)
    t, s = fitted(d, H * 0.14, "Hello, spring!", "Pacifico", 80, "#3E7A3A")
    body(d, H * 0.14 + s * 1.6, c["message"], "Lora", W * 0.035, "#4E6B4A", italic=True)
    d.text(0, H * 0.14 + s * 1.6 + W * 0.07, W, c["signature"], "Caveat", W * 0.04, "#E06C8A", weight=700, align="center")
    return {"layout": "row of spring flowers along the foot, butterfly and bee in the sky", "typography": "Pacifico, Lora italic, Caveat", "palette": "spring green, petal pinks, white", "decor": "nine flower illustrations, butterfly, bee"}
