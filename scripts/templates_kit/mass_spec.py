"""
Mass collection content: every category gets many original content items
(names, places, dates and wording vary) and several "looks" (layout,
typefaces, palette, photo). gen(cat) pairs them so no two templates share
both content and look. Trends followed (clean grids, big type, soft
palettes, shaped photo frames) — no design is copied.
"""

from __future__ import annotations

import itertools
import random

from studio_spec import PAL

POST, SQ, STORY, CARD, A4, LAND = (1080, 1350), (1080, 1080), (1080, 1920), (480, 673), (794, 1123), (1123, 794)
FB, LI, WEB, BILL, YT, SLIDE, BC = (1200, 628), (1584, 396), (1500, 500), (2400, 800), (1280, 720), (1920, 1080), (336, 192)
DL = (397, 840)  # DL flyer / rack card

PALWORD = {k: k.capitalize() for k in PAL}
PALWORD.update({"noir": "Noir", "ivory": "Ivory", "terra": "Terracotta", "emerald": "Emerald", "midnight": "Midnight", "saffron": "Saffron", "mono": "Monochrome", "sand": "Sand", "cobalt": "Cobalt"})
ARCHWORD = {"hero_bottom": "Photo", "hero_center": "Spotlight", "split": "Split", "framed": "Framed", "arch": "Arch", "sale": "Bold", "collage": "Collage", "menu": "Classic",
            "magazine": "Cover", "grid": "Grid", "polaroid": "Polaroid", "shape": "Frame", "product": "Showcase", "banner": "Wide", "quote": "Quote", "tips": "List",
            "typo": "Modern", "party": "Confetti", "elegant": "Elegant", "wave": "Wave", "badge": "Badge", "letterhead": "Letterhead", "yt": "Thumbnail", "resume": "Resume", "certificate": "Certificate"}

PH = {
    "birthday": ["cake", "x_cake2", "x_cake3", "cupcakes", "x_cupcakes2", "balloons", "x_balloons2", "x_balloons3", "confetti", "party", "sparkler", "champagne", "x_friends", "x_friends3", "gifts"],
    "wedding": ["couple", "couple2", "x_couple5", "x_couple6", "rings", "x_rings2", "engagement", "x_bride", "bridebouquet", "weddingtable", "whiteflowers", "x_bouquet3", "flowers", "roses"],
    "family": ["family", "x_family2", "x_family3", "picnic", "motherchild", "fatherson", "couple3", "x_couple7", "newborn", "babyfeet", "babyshoes", "x_baby2", "x_dog2", "dog", "x_cat"],
    "food": ["food", "pizza", "sushi", "x_pasta2", "salad", "burger", "x_steak2", "dessert", "bread", "x_croiss", "cooking", "finedining", "table", "restaurant"],
    "cafe": ["coffee", "coffee2", "latte", "x_latte2", "tea", "x_croiss", "bread", "dessert", "cupcakes"],
    "business": ["meeting", "x_team2", "team", "handshake", "office", "laptop", "x_laptop2", "cowork", "x_desk", "seminar", "startup", "x_man", "x_man2", "phone"],
    "beauty": ["makeup", "x_lip2", "x_skin2", "x_skin3", "skincare", "spa", "salon", "x_nails", "perfume"],
    "fashion": ["fashion", "fashion2", "shopping", "shopping2", "x_rack", "x_sunglass", "jewelry", "x_watch", "sneakers", "x_sneak2", "x_shop3"],
    "home": ["house", "house2", "x_house3", "apartment", "livingroom", "livingroom2", "x_living3", "kitchen", "bedroom", "x_pool", "keys", "hotel"],
    "fitness": ["gym", "x_gym2", "fitness", "fitness2", "running", "yoga", "football"],
    "travel": ["travel", "travel2", "travel3", "beach", "beach2", "x_beach3", "ocean", "mountains", "x_mount2", "city", "x_city2"],
    "festive": ["diya", "lantern", "lantern2", "lantern3", "fireworks", "fireworks2", "ornaments", "xmastree", "gifts2", "x_lights", "x_bokeh"],
    "education": ["x_school", "x_kids", "x_teacher", "books", "graduation", "laptop"],
    "health": ["x_doctor", "x_doctor2", "dentist", "yoga", "spa", "x_plant2"],
    "events": ["dj", "cinema", "venue", "venue2", "gala", "x_podcast2", "conference", "seminar", "x_lights", "x_bokeh", "fireworks"],
    "nature": ["blossom", "flowers2", "x_plant2", "plants", "autumn", "x_fruit", "whiteflowers", "x_roses3"],
}

FIRST = ["Aarav", "Diya", "Kabir", "Meera", "Rohan", "Anika", "Ishaan", "Tara", "Arjun", "Zara", "Vihaan", "Leela", "Omar", "Sofia", "Liam", "Ava", "Noah", "Maya", "Ethan", "Nila", "Karthik", "Priya", "Sam", "Hana", "Leo", "Riya", "Adam", "Isla", "Yash", "Emma"]
PLACES = ["The Garden Room", "Skyline Terrace", "Café Mocha", "The Grand Hall", "Lotus Banquet", "Sunset Lawn", "The Courtyard", "Riverside Club", "Maple House", "Blue Door Café", "The Loft", "Palm Grove"]
CITIES = ["Chennai", "Bengaluru", "Mumbai", "Kochi", "Hyderabad", "Delhi", "Pune", "Coimbatore", "Dubai", "London", "Toronto", "Sydney", "Singapore", "New York"]
DAYS = ["Saturday 6 December", "Sunday 14 December", "Friday 19 December", "Saturday 10 January", "Sunday 25 January", "Saturday 7 February", "Friday 13 March", "Sunday 12 April", "Saturday 9 May", "Sunday 21 June"]
TIMES = ["11 AM", "4 PM", "6:30 PM", "7 PM", "7:30 PM", "8 PM", "10 AM", "5 PM"]
ORD = {1: "first", 2: "second", 3: "third", 5: "fifth", 6: "sixth", 7: "seventh", 10: "tenth", 13: "thirteenth", 16: "sweet sixteenth", 18: "eighteenth", 21: "twenty-first", 25: "twenty-fifth", 30: "thirtieth", 40: "fortieth", 50: "fiftieth", 60: "sixtieth", 75: "seventy-fifth"}
WORDS = {1: "One", 2: "Two", 3: "Three", 5: "Five", 6: "Six", 7: "Seven", 10: "Ten", 13: "Thirteen", 16: "Sixteen", 18: "Eighteen", 21: "Twenty-One", 25: "Twenty-Five", 30: "Thirty", 40: "Forty", 50: "Fifty", 60: "Sixty", 75: "Seventy-Five"}


def R(seed):
    return random.Random(seed)


def pick(r, xs):
    return xs[r.randrange(len(xs))]


# ------------------------------------------------------------------ looks
def L(arch, sizes, pairs, pals, opts=None, photo=True, art=False):
    return dict(arch=arch, sizes=sizes, pairs=pairs, pals=pals, opts=opts or {}, photo=photo, art=art)


WARM = ["blush", "peach", "sunny", "coral", "berry", "rose", "terra", "saffron", "plum"]
COOL = ["sage", "mint", "ocean", "teal", "cobalt", "lilac", "forest", "navy", "olive"]
LUX = ["noir", "ivory", "emerald", "midnight", "sand", "navy", "plum"]
ALLP = WARM + COOL + ["noir", "ivory", "emerald", "midnight", "sand", "mono"]


# ----------------------------------------------------------- content banks
def birthday():
    out = []
    r = R(1)
    ages = [1, 2, 3, 5, 6, 7, 10, 13, 16, 18, 21, 25, 30, 40, 50, 60, 75]
    for i in range(40):
        a = ages[i % len(ages)]
        n = FIRST[(i * 7) % len(FIRST)]
        kind = ["Party Invitation", "Birthday Post", "Birthday Card", "Party Story"][i % 4]
        if kind == "Party Invitation":
            out.append(dict(name=f"{n}'s {WORDS[a]} Birthday Invitation", fmt="inv", c=dict(kicker="You're invited", title=f"{n} is turning {a}!" if a < 18 else f"{n}'s {ORD[a]} birthday", sub=pick(r, ["Cake, music and good company.", "Come celebrate with us — fun guaranteed.", "An evening of food, laughter and celebration.", "Games, cake and lots of balloons!"]), details=[f"{pick(r, DAYS)} · {pick(r, TIMES)}", f"{pick(r, PLACES)}, {pick(r, CITIES)}"], cta="RSVP"), kw=f"{a} birthday invitation, birthday party invite"))
        elif kind == "Birthday Post":
            out.append(dict(name=f"Happy {WORDS[a]} {n} Birthday Post", fmt="post", c=dict(kicker="Happy birthday", title=f"{n} turns {WORDS[a].lower()}", sub=pick(r, ["Here's to your best year yet.", "So much love on your special day.", "Cheers to many more adventures!"])), kw=f"{a} birthday post, birthday wishes"))
        elif kind == "Birthday Card":
            out.append(dict(name=f"{n} Birthday Wishes Card", fmt="card", c=dict(accent="Happy Birthday", title=f"Dear {n}", sub=pick(r, ["Wishing you a year full of good mornings and better evenings.", "May all your wishes come true.", "Thank you for being you. Have the best day!"]), brand=f"Love, {FIRST[(i * 3 + 5) % len(FIRST)]}"), kw="birthday card, birthday greeting"))
        else:
            out.append(dict(name=f"{n} Birthday Bash Story", fmt="story", c=dict(kicker=f"{pick(r, ['3', '5', '7'])} days to go", title=f"{n.upper()}'S BIRTHDAY BASH", sub="Bring your best moves.", details=[f"{pick(r, DAYS)} · {pick(r, TIMES)}", pick(r, PLACES)], cta="I'm in", upper=True), kw="birthday party story, countdown"))
    looks = [L("hero_bottom", [POST, STORY], ["editorial", "bold", "display"], LUX + ["coral"]), L("split", [POST, SQ], ["friendly", "display", "grotesk"], WARM),
             L("framed", [CARD, POST], ["script", "soft", "elegant"], ["ivory", "blush", "sage", "sand"], dict(photo_h=0.44, shape="circle")),
             L("shape", [POST, SQ, CARD], ["friendly", "script", "hand"], WARM + COOL, dict(kind="scallop")), L("shape", [POST, CARD], ["display", "soft"], WARM, dict(kind="arch")),
             L("party", [POST, SQ, CARD, STORY], ["friendly", "abril", "hand", "bold"], WARM + ["lilac", "mint"], dict(style="balloons"), photo=False, art=True),
             L("party", [POST, SQ, CARD], ["display", "oswald"], ALLP, dict(style="bunting"), photo=False, art=True),
             L("typo", [POST, SQ, STORY], ["grotesk", "bold", "abril"], ALLP, dict(deco_kind="circles"), photo=False, art=True),
             L("badge", [POST, SQ, CARD], ["friendly", "display"], WARM + COOL, photo=False, art=True), L("elegant", [CARD, A4], ["luxe", "classic", "elegant"], LUX, photo=False, art=True)]
    return out, looks, ["birthday-cake", "party-popper", "wrapped-gift", "balloon" if False else "confetti-ball", "cupcake", "shortcake", "crown", "sparkles", "teddy-bear", "clinking-glasses"], "birthday"


def wedding_inv():
    out = []
    r = R(2)
    couples = [("Ananya", "Rahul"), ("Nithya", "Karthik"), ("Fatima", "Imran"), ("Sara", "James"), ("Divya", "Arjun"), ("Meera", "Vikram"), ("Hana", "Omar"), ("Priya", "Sam"), ("Leela", "Aditya"), ("Zoya", "Kabir"), ("Emma", "Noah"), ("Ritu", "Dev"), ("Aisha", "Yusuf"), ("Kavya", "Rohan"), ("Isla", "Ethan"), ("Tara", "Neil")]
    venues = ["Kalyana Mandapam, Madurai", "ITC Grand Chola, Chennai", "Taj Falaknuma, Hyderabad", "Leela Palace, Bengaluru", "St. Mary's Church, Kochi", "The Oberoi, Mumbai", "Al Barari, Dubai", "Garden Estate, Pune"]
    for i, (a, b) in enumerate(couples * 2):
        typ = ["Wedding Invitation", "Save the Date", "Reception Invite"][i % 3]
        d = pick(r, ["Friday 6 February 2027", "Sunday 14 February 2027", "Saturday 17 April 2027", "Sunday 9 May 2027", "Saturday 12 June 2027", "Friday 19 November 2027"])
        if typ == "Wedding Invitation":
            out.append(dict(name=f"{a} and {b} Wedding Invitation", fmt="inv", sub="Invitation", c=dict(kicker="Together with their families", accent=f"{a} & {b}", title="request the pleasure of your company", details=[d, pick(r, ["Muhurtham 9:30 AM", "Ceremony at 6 PM", "Nikah at 4 PM", "Ceremony at 11 AM"]), pick(r, venues)]), kw="wedding invitation, marriage invitation"))
        elif typ == "Save the Date":
            out.append(dict(name=f"{a} and {b} Save the Date", fmt="post", sub="Save the Date", c=dict(kicker="Save the date", title=f"{a} & {b}", sub=f"{d.split(' ', 1)[1]} · {pick(r, CITIES)}", details=["Formal invitation to follow"]), kw="save the date, wedding announcement"))
        else:
            out.append(dict(name=f"{a} and {b} Reception Invite", fmt="inv", sub="Reception", c=dict(kicker="Wedding reception", title=f"{a} & {b}", sub="Dinner and celebration to follow.", details=[f"{d} · 7 PM", pick(r, venues)], brand="Kindly RSVP"), kw="wedding reception invitation"))
    looks = [L("framed", [CARD], ["script", "classic", "elegant", "display"], ["ivory", "sage", "blush", "sand", "emerald"], dict(photo_h=0.44, shape="arch")),
             L("shape", [CARD, POST], ["elegant", "romance", "soft"], ["ivory", "blush", "sage", "rose", "sand"], dict(kind="arch", title_size=70)),
             L("hero_bottom", [POST, STORY], ["romance", "editorial", "luxe"], ["noir", "midnight", "emerald"]),
             L("hero_center", [POST, CARD], ["luxe", "classic"], ["noir", "navy", "emerald"], dict(title_size=110)),
             L("elegant", [CARD, A4, POST], ["elegant", "luxe", "classic", "romance"], ["ivory", "sand", "sage", "blush", "emerald", "navy"], dict(laurel=True), photo=False),
             L("elegant", [CARD, POST], ["script", "display"], ["ivory", "rose", "lilac", "mint"], photo=False, art=True),
             L("arch", [POST, CARD], ["script", "soft"], ["blush", "sage", "ivory"]), L("polaroid", [POST], ["hand"], ["sand", "blush"])]
    return out, looks, ["wedding", "ring", "two-hearts", "dove", "bouquet", "rose", "heart-with-ribbon", "love-letter"], "wedding"


def festivals():
    F = [("Diwali", "Happy Diwali", "May your home glow with light, love and sweets.", "diya-lamp", "festive", "diwali card, deepavali wishes"),
         ("Pongal", "Happy Pongal", "Wishing you a sweet harvest and a home full of joy.", "sunrise", "nature", "pongal wishes, harvest festival"),
         ("Eid", "Eid Mubarak", "May this Eid bring peace, joy and blessings to your home.", "crescent-moon", "festive", "eid mubarak, eid greeting"),
         ("Christmas", "Merry Christmas", "Wishing you warmth, wonder and a very happy new year.", "christmas-tree", "festive", "christmas card, xmas wishes"),
         ("New Year", "Happy New Year", "Here's to new beginnings and good things ahead.", "fireworks", "festive", "new year greeting 2027"),
         ("Holi", "Happy Holi", "May your life be as colourful as today.", "artist-palette", "nature", "holi wishes, festival of colours"),
         ("Onam", "Happy Onam", "Wishing you a prosperous and joyful Onam.", "hibiscus", "nature", "onam wishes, kerala festival"),
         ("Ganesh Chaturthi", "Happy Ganesh Chaturthi", "May Lord Ganesha bless you with wisdom and happiness.", "lotus", "festive", "ganesh chaturthi wishes"),
         ("Navratri", "Happy Navratri", "Nine nights of devotion, dance and joy.", "sparkles", "festive", "navratri wishes, garba"),
         ("Raksha Bandhan", "Happy Raksha Bandhan", "To the bond that only grows stronger.", "ribbon", "family", "raksha bandhan, rakhi wishes"),
         ("Independence Day", "Happy Independence Day", "Celebrating freedom, unity and pride.", "world-map", "events", "independence day greeting"),
         ("Republic Day", "Happy Republic Day", "Honouring the spirit of our constitution.", "scroll", "events", "republic day greeting"),
         ("Easter", "Happy Easter", "Wishing you a spring full of hope and new beginnings.", "rabbit", "nature", "easter greeting"),
         ("Thanksgiving", "Happy Thanksgiving", "Grateful for good food, good friends and you.", "turkey", "food", "thanksgiving greeting"),
         ("Halloween", "Happy Halloween", "Wishing you more treats than tricks.", "jack-o-lantern", "festive", "halloween greeting"),
         ("Lunar New Year", "Happy Lunar New Year", "Wishing you luck, health and prosperity.", "red-paper-lantern", "festive", "lunar new year, chinese new year"),
         ("Valentine's Day", "Happy Valentine's Day", "You make every day better.", "red-heart", "wedding", "valentines day card"),
         ("Mother's Day", "Happy Mother's Day", "For all the love you give every single day.", "tulip", "family", "mothers day card"),
         ("Father's Day", "Happy Father's Day", "Thank you for every lesson, joke and hug.", "necktie", "family", "fathers day card"),
         ("Ramadan", "Ramadan Kareem", "Wishing you a blessed and peaceful month.", "mosque", "festive", "ramadan kareem greeting"),
         ("Vishu", "Happy Vishu", "May the new year bring prosperity and joy.", "sunflower", "nature", "vishu greeting, kerala new year"),
         ("Tamil New Year", "Iniya Puthandu Nalvazhthukkal", "Happy Tamil New Year — wishing you a prosperous year.", "sunrise", "nature", "tamil new year, puthandu"),
         ("Teachers' Day", "Happy Teachers' Day", "Thank you for lighting the way.", "books", "education", "teachers day greeting"),
         ("Children's Day", "Happy Children's Day", "Keep dreaming, keep playing, keep shining.", "kite", "family", "childrens day greeting")]
    out = []
    for i, (f, title, sub, art, ph, kw) in enumerate(F):
        for j, (fmt, kick) in enumerate([("post", "Warm wishes"), ("card", "Wishing you a"), ("story", "Season's greetings"), ("post", "From all of us")]):
            brand = ["The Iyer family", "Team Bright Studio", "From our home to yours", "Sweet Crumbs Bakery"][(i + j) % 4]
            out.append(dict(name=f"{f} {['Greeting Post', 'Greeting Card', 'Wishes Story', 'Business Wishes Post'][j]}", fmt=fmt, art=art, ph=ph,
                            c=dict(kicker=kick, title=title, sub=sub, brand=brand), kw=kw))
    looks = [L("shape", [POST, CARD, SQ], ["luxe", "display", "elegant"], ["saffron", "noir", "emerald", "plum", "ivory"], dict(kind="arch")),
             L("hero_center", [POST, STORY, SQ], ["luxe", "editorial", "classic"], ["noir", "midnight", "emerald"], dict(title_size=140)),
             L("elegant", [CARD, POST], ["elegant", "luxe", "script"], ["ivory", "saffron", "sand", "emerald", "navy"], photo=False, art=True),
             L("badge", [POST, SQ, CARD, STORY], ["display", "friendly", "luxe"], ALLP, photo=False, art=True),
             L("wave", [POST, SQ, STORY], ["display", "abril", "grotesk"], ALLP, photo=False, art=True),
             L("typo", [POST, SQ], ["abril", "display"], ALLP, dict(deco_kind="arcs"), photo=False, art=True),
             L("shape", [POST, SQ], ["display", "soft"], WARM + LUX, dict(kind="flower"))]
    return out, looks, None, "festive"


def social():
    out = []
    quotes = ["Small steps every day still add up to a big change.", "Done is better than perfect.", "Make it simple, but significant.", "Your only limit is your mind.", "Good things take time.", "Create the things you wish existed.",
              "Kindness is always in style.", "Work hard in silence. Let success make the noise.", "Be the energy you want to attract.", "Start where you are. Use what you have.", "Dream big, start small, act now.", "Progress, not perfection."]
    for i, q in enumerate(quotes):
        out.append(dict(name=f"{q.split()[0]} {q.split()[1]} {q.split()[2]} Quote Post", arch_only=["quote"], fmt="post", c=dict(title=q, author=pick(R(i), ["Daily motivation", "Monday mindset", "Studio notes", "Your brand"]), handle="@yourhandle"), kw="quote post, motivational quote"))
    tips = [("5 ways to grow on Instagram", ["Post at the same time daily", "Use 3–5 focused hashtags", "Reply to every comment", "Share stories every day", "Collaborate with a creator"]),
            ("4 steps to a better morning", ["Wake up at the same time", "Drink a glass of water", "Move for 10 minutes", "Plan the top 3 tasks"]),
            ("6 habits of happy teams", ["Clear goals", "Weekly one-to-ones", "Celebrate small wins", "Honest feedback", "Flexible hours", "Shared lunch"]),
            ("5 tips for better photos", ["Use natural light", "Clean your lens", "Follow the rule of thirds", "Get closer", "Edit lightly"]),
            ("4 ways to save money", ["Cook at home more", "Cancel unused subscriptions", "Wait 24 hours before buying", "Automate your savings"]),
            ("5 study tips that work", ["Study in 25-minute blocks", "Teach it to someone", "Test yourself", "Sleep well", "Put the phone away"]),
            ("3 rules of good design", ["Contrast", "Alignment", "White space"]), ("5 foods for glowing skin", ["Avocado", "Walnuts", "Tomatoes", "Green tea", "Carrots"])]
    for i, (t, items) in enumerate(tips):
        out.append(dict(name=f"{t.capitalize()} Tips Post", arch_only=["tips"], fmt="post", c=dict(kicker="Save this post", title=t.capitalize(), items=[(x, "") for x in items], handle="@yourhandle", swipe="More tips"), kw="tips post, carousel"))
    ann = [("New arrivals", "The new collection is here", "fashion"), ("We're open", "Grand opening this Saturday", "cafe"), ("Big news", "We're moving to a bigger studio", "business"), ("Now hiring", "Join our growing team", "business"),
           ("Limited time", "Free delivery all weekend", "food"), ("Thank you", "10,000 followers — thank you!", "events"), ("Coming soon", "Something new is brewing", "cafe"), ("Weekend special", "Brunch for two at ₹699", "food"),
           ("New service", "Now offering bridal makeup", "beauty"), ("Back in stock", "Your favourites are back", "fashion"), ("Workshop", "Learn watercolour in one day", "education"), ("Open house", "Tour our new homes this Sunday", "home")]
    for k, t, ph in ann:
        out.append(dict(name=f"{t} Announcement Post", fmt="post", ph=ph, c=dict(kicker=k, title=t, sub="Tap the link in bio to find out more.", cta="Learn more"), kw="announcement post, instagram post"))
    looks = [L("quote", [POST, SQ, STORY], ["display", "grotesk", "editorial", "classic", "modern"], ALLP, photo=False), L("tips", [POST, SQ, STORY], ["grotesk", "friendly", "modern", "oswald"], COOL + WARM, photo=False),
             L("split", [POST, SQ], ["display", "grotesk", "friendly"], ALLP), L("hero_bottom", [POST, STORY], ["bold", "editorial", "grotesk"], LUX + ["coral", "cobalt"]),
             L("shape", [POST, SQ], ["grotesk", "display"], ALLP, dict(kind="rounded")), L("typo", [POST, SQ, STORY], ["grotesk", "bold", "abril"], ALLP, dict(deco_kind="blob"), photo=False, art=True)]
    return out, looks, ["sparkles", "light-bulb", "rocket", "hundred-points", "star", "mobile-phone", "camera-with-flash", "party-popper"], None


def facebook():
    out = []
    items = [("Weekend Sale", "Up to 50% off", "fashion"), ("Free Webinar", "Grow your business online", "business"), ("New Menu", "Taste the season", "food"), ("Join Our Gym", "First month free", "fitness"),
             ("Book a Stay", "Sea-view rooms from ₹3,999", "travel"), ("Admissions Open", "Classes 1 to 12", "education"), ("Dream Home", "2 & 3 BHK ready to move", "home"), ("Spa Day", "Relax for less", "beauty"),
             ("Live Music", "Friday nights at The Loft", "events"), ("Health Check-up", "Full body package ₹1,499", "health"), ("Fresh Coffee", "Buy one, get one free", "cafe"), ("Holiday Deals", "Goa packages from ₹9,999", "travel"),
             ("Festive Collection", "Handloom sarees & kurtas", "fashion"), ("Bakery Opening", "Free cupcake for first 100", "cafe"), ("Car Wash", "Interior + exterior ₹499", "business"), ("Yoga Retreat", "3 days in Rishikesh", "fitness")]
    for t, s, ph in items:
        out.append(dict(name=f"{t} Facebook Post", fmt="fb", ph=ph, c=dict(kicker=t, title=s, sub="Limited spots — book today.", cta="Learn more", web="yourwebsite.com"), kw="facebook post, facebook ad"))
    looks = [L("banner", [FB], ["bold", "grotesk", "display", "editorial", "oswald"], ALLP, dict(title_size=86)), L("banner", [FB], ["friendly", "modern"], ALLP, dict(kind="rect", title_size=86)),
             L("product", [FB], ["display", "grotesk"], ALLP, dict(kind="circle", title_size=100)), L("hero_bottom", [SQ, POST], ["bold", "grotesk"], LUX)]
    return out, looks, None, None


def youtube():
    out = []
    items = [("10 minute workout", "no gym!", "fitness", "NEW"), ("Easy biryani", "in 30 mins", "food", "RECIPE"), ("My morning routine", "2026", "family", "VLOG"), ("Budget room makeover", "under ₹5k", "home", "DIY"),
             ("Goa travel guide", "5 days", "travel", "TRAVEL"), ("Study with me", "4 hours", "education", "LIVE"), ("Skincare that works", "honest review", "beauty", "REVIEW"), ("Start a business", "with ₹0", "business", "TIPS"),
             ("Phone photo hacks", "pro results", "events", "TUTORIAL"), ("Street food tour", "Chennai", "food", "FOOD"), ("I tried 30 days", "of yoga", "fitness", "CHALLENGE"), ("Wedding vlog", "our big day", "wedding", "VLOG"),
             ("Best cafés", "in Bengaluru", "cafe", "TOP 10"), ("Home office setup", "2026", "business", "SETUP"), ("Kids craft ideas", "rainy day", "education", "EASY"), ("Outfit ideas", "for Diwali", "fashion", "STYLE"),
             ("Saving money tips", "that work", "business", "MONEY"), ("Road trip", "Kerala", "travel", "TRAVEL"), ("Cake decorating", "for beginners", "birthday", "BAKE"), ("Dog training", "basics", "family", "PETS")]
    for t, hl, ph, st in items:
        out.append(dict(name=f"{t} YouTube Thumbnail", fmt="yt", ph=ph, c=dict(title=t, hl=hl, sticker=st), kw="youtube thumbnail"))
    looks = [L("yt", [YT], ["bold", "oswald", "grotesk", "abril", "poster"], ["sunny", "coral", "cobalt", "mono", "midnight", "berry", "mint", "saffron"]), L("yt", [YT], ["bold", "oswald", "grotesk"], ["noir", "lilac", "peach", "teal"], dict(side="left"))]
    return out, looks, None, None


def youtube_banner():
    out = []
    for t, s, ph in [("The Maker Podcast", "New episodes every Friday", "events"), ("Cook with Meera", "Easy Indian recipes", "food"), ("Fit with Arjun", "Workouts that fit your day", "fitness"), ("Travel Tales", "Slow travel across India", "travel"),
                     ("Study Corner", "Exam tips and live study", "education"), ("Glow Up", "Honest skincare reviews", "beauty"), ("Home & Hearth", "DIY and décor ideas", "home"), ("Tech in Tamil", "Gadgets explained simply", "business")]:
        out.append(dict(name=f"{t} YouTube Channel Banner", fmt="ytb", ph=ph, c=dict(kicker=s, title=t, sub="Subscribe for new videos every week.", web="youtube.com/@yourchannel"), kw="youtube banner, channel art"))
    looks = [L("banner", [(2560, 1440)], ["grotesk", "bold", "display", "friendly"], ALLP, dict(title_size=56))]
    return out, looks, None, None


def posters():
    out = []
    items = [("Free workshop", "Grow your business online", "business", ["Saturday 22 Nov", "10 AM – 1 PM"]), ("Live tonight", "Sounds of the city", "events", ["Friday 7 PM", "Rooftop stage"]),
             ("New year offer", "Stronger this year", "fitness", ["First month free"]), ("Now open", "Your neighbourhood café", "cafe", ["Open 7 AM – 10 PM"]), ("Exhibition", "Colours of Kerala", "travel", ["12 – 20 December", "City Art Gallery"]),
             ("Summer camp", "Art, sport and science", "education", ["Ages 6 – 14", "April – May"]), ("Book fair", "10,000 books under one roof", "education", ["Trade Centre", "Free entry"]), ("Charity run", "Run for clean water", "fitness", ["Sunday 6 AM", "5K & 10K"]),
             ("Film night", "Classics under the stars", "events", ["Saturday 8 PM", "Open lawn"]), ("Flea market", "Handmade, local, lovely", "fashion", ["Sunday 10 AM", "Phoenix Mall"]), ("Food festival", "Flavours of the south", "food", ["3 days", "40 stalls"]),
             ("Yoga day", "Breathe together", "fitness", ["21 June · 6 AM", "Beach front"]), ("Blood donation camp", "Give the gift of life", "health", ["Saturday 9 AM", "Community hall"]), ("Startup pitch night", "Ideas that matter", "business", ["Thursday 6 PM", "Hub 91"]),
             ("Photography walk", "See your city differently", "travel", ["Sunday 6 AM", "Old town"]), ("Dance workshop", "Bollywood basics", "events", ["Weekends", "Studio 5"]), ("Property expo", "Homes for every budget", "home", ["2 days", "Convention centre"]),
             ("Fashion show", "The festive edit", "fashion", ["Friday 7 PM", "Grand ballroom"]), ("Coding bootcamp", "Learn to build apps", "education", ["12 weeks", "Weekend batch"]), ("Garage sale", "Everything must go", "home", ["Saturday", "From 9 AM"])]
    for k, t, ph, d in items:
        out.append(dict(name=f"{t} Poster", fmt="poster", ph=ph, c=dict(kicker=k, title=t, sub="Everyone is welcome. Bring a friend!", details=d, cta="Register now"), kw="event poster, a4 poster"))
    looks = [L("hero_center", [A4], ["poster", "bold", "luxe", "oswald"], LUX + ["coral", "cobalt"], dict(upper=True, title_size=180)), L("hero_bottom", [A4], ["editorial", "grotesk", "display"], LUX),
             L("split", [A4], ["grotesk", "display", "friendly", "modern"], ALLP, dict(ratio=0.46)), L("typo", [A4], ["bold", "abril", "grotesk", "oswald"], ALLP, dict(deco_kind="stripes"), photo=False, art=True),
             L("typo", [A4], ["grotesk", "display"], ALLP, dict(deco_kind="grid"), photo=False, art=True), L("shape", [A4], ["display", "grotesk"], ALLP, dict(kind="hexagon")), L("wave", [A4], ["abril", "friendly"], ALLP, photo=False, art=True)]
    return out, looks, ["microphone", "musical-notes", "light-bulb", "trophy", "rocket", "artist-palette", "books", "film-frames", "sparkles", "world-map"], None


def ads():
    out = []
    P = [("Vitamin C Serum", "Glow Lab", "₹799", "beauty", ["Vegan", "30 ml"]), ("Air Lite Sneakers", "Stride", "₹4,999", "fashion", ["220 g", "Recycled mesh"]), ("Oud Royale", "Maison Noor", "₹3,250", "beauty", ["100 ml", "Eau de parfum"]),
         ("Iced Caramel Latte", "Brew Co.", "₹180", "cafe", ["Cold brew", "Oat milk option"]), ("Classic Steel Watch", "Tempo", "₹8,990", "fashion", ["Sapphire glass", "5 ATM"]), ("Organic Veg Box", "Green Basket", "₹499", "nature", ["Farm fresh", "Free delivery"]),
         ("Gold Hoop Earrings", "Aura Jewels", "₹2,499", "fashion", ["18k plated", "Hypoallergenic"]), ("Matte Lipstick", "Velvet", "₹549", "beauty", ["12-hour wear", "8 shades"]), ("Family Pizza", "Slice Co.", "₹399", "food", ["12 inch", "2 toppings"]),
         ("Smart Home Plan", "NestHome", "₹999/mo", "home", ["Wi-Fi + TV", "No contract"]), ("Running Plan", "FitZone", "₹1,499", "fitness", ["12 weeks", "Coach included"]), ("Weekend Getaway", "Wander", "₹6,999", "travel", ["2 nights", "Breakfast"]),
         ("Herbal Hair Oil", "Kesh", "₹299", "beauty", ["Ayurvedic", "200 ml"]), ("Sushi Platter", "Umami", "₹899", "food", ["16 pieces", "Serves 2"]), ("Leather Tote", "Carry Co.", "₹3,499", "fashion", ["Full grain", "Laptop sleeve"]),
         ("Cold Pressed Juice", "Press", "₹149", "nature", ["No sugar", "Daily fresh"]), ("Coffee Beans", "Hill Roast", "₹650", "cafe", ["Single estate", "250 g"]), ("Sunglasses", "Shade", "₹1,999", "fashion", ["UV400", "Polarised"])]
    PHOTO = {"Vitamin C Serum": "x_skin3", "Air Lite Sneakers": "x_sneak2", "Oud Royale": "perfume", "Iced Caramel Latte": "latte", "Classic Steel Watch": "x_watch", "Organic Veg Box": "x_fruit", "Gold Hoop Earrings": "jewelry",
             "Matte Lipstick": "x_lip2", "Family Pizza": "pizza", "Smart Home Plan": "livingroom", "Running Plan": "running", "Weekend Getaway": "x_pool", "Herbal Hair Oil": "x_skin2", "Sushi Platter": "sushi", "Leather Tote": "x_shop3",
             "Cold Pressed Juice": "x_fruit", "Coffee Beans": "coffee", "Sunglasses": "x_sunglass"}
    for n, b, price, ph, pts in P:
        out.append(dict(name=f"{n} Product Ad", fmt="ad", ph=ph, photo=PHOTO[n], c=dict(brand=b, title=n, sub="Made with care. Loved by thousands.", points=pts, price=price, cta="Shop now"), kw="product ad, product poster, advertisement"))
    looks = [L("product", [POST, SQ], ["display", "grotesk", "luxe", "friendly", "editorial"], ALLP, dict(kind="circle")), L("product", [POST, A4], ["display", "bold"], ALLP, dict(kind="rounded")),
             L("product", [POST, SQ], ["luxe", "elegant"], LUX, dict(kind="arch")), L("sale", [SQ, POST, STORY], ["oswald", "bold"], ALLP), L("banner", [FB], ["grotesk", "display"], ALLP, dict(title_size=86))]
    return out, looks, None, None


def banners():
    out = []
    B = [("Magical Touch Design", "Design anything. Free.", "business"), ("Sweet Crumbs Bakery", "Baked with love since 1998", "cafe"), ("Nest Interiors", "Homes that feel like you", "home"), ("FitZone", "Train smarter, feel stronger", "fitness"),
         ("Wander Holidays", "Trips you'll talk about for years", "travel"), ("Bright Minds Academy", "Learning that sticks", "education"), ("Glow Lab", "Skincare that works", "beauty"), ("Urban Threads", "Everyday style, made well", "fashion"),
         ("Green Basket", "Fresh from the farm", "nature"), ("CloudNine SaaS", "Software that saves time", "business"), ("Spice Route", "Authentic South Indian food", "food"), ("Sunrise Clinic", "Care close to home", "health")]
    for co, t, ph in B:
        for fmt, nm, sz in [("li", "LinkedIn Banner", LI), ("web", "Website Banner", WEB), ("bill", "Billboard", BILL)]:
            out.append(dict(name=f"{co} {nm}", fmt=fmt, ph=ph, size=sz, c=dict(kicker=co, title=t, sub="Trusted by customers across India and beyond.", cta="Learn more" if fmt != "li" else None, web=f"{co.lower().replace(' ', '')}.com"), kw=f"{nm.lower()}, banner"))
    looks = [L("banner", [None], ["grotesk", "display", "bold", "editorial", "friendly", "oswald"], ALLP, dict(title_size=72)), L("banner", [None], ["grotesk", "display"], ALLP, dict(kind="rect", title_size=72)),
             L("banner", [None], ["luxe", "classic"], LUX, dict(title_size=70))]
    return out, looks, None, None


def magazines():
    out = []
    M = [("AURA", "Lifestyle", "x_sunglass"), ("FOUNDR", "Startups", "x_man2"), ("SPICE", "Food", "food"), ("WANDER", "Travel", "travel3"), ("NEST", "Homes", "x_living3"), ("STRIDE", "Fitness", "running"),
         ("BLOOM", "Wedding", "x_bride"), ("PIXEL", "Design", "startup"), ("GLOW", "Beauty", "x_skin2"), ("KIDDO", "Parenting", "x_kids"), ("NOTES", "Music", "dj"), ("ATLAS", "Culture", "x_city2")]
    lines = {"Lifestyle": [("Slow living", "Our guide to calmer days"), ("The winter edit", "Ten pieces for the season")], "Startups": [("First 100 customers", "Five founders' playbooks"), ("The funding map", "Who invests in 2027")],
             "Food": [("5 easy biryanis", "One pot, one hour"), ("Filter coffee", "The perfect decoction")], "Travel": [("Hidden Kerala", "Backwaters off the map"), ("Train journeys", "India's prettiest routes")],
             "Homes": [("Small spaces", "Big ideas for city flats"), ("Colour of the year", "How to use it")], "Fitness": [("Run your first 10K", "A 12-week plan"), ("Eat to perform", "Simple meals that work")],
             "Wedding": [("The 2027 bride", "Trends we love"), ("Real weddings", "Three couples, three styles")], "Design": [("Grids that work", "Layout lessons"), ("Type pairing", "Fonts that fit")],
             "Beauty": [("Skin first", "A simple routine"), ("Glow on a budget", "Products under ₹500")], "Parenting": [("Screen time", "What really helps"), ("Lunchbox ideas", "Healthy and quick")],
             "Music": [("Indie rising", "Bands to watch"), ("Vinyl is back", "Where to start")], "Culture": [("City stories", "Life in six cities"), ("Festival guide", "What's on this season")]}
    for brand, topic, ph in M:
        for issue in ["Spring 2027", "Summer 2027", "Autumn 2026", "Winter 2026", "Issue 12", "Issue 24", "Special edition", "Annual"]:
            out.append(dict(name=f"{brand} {topic} Magazine Cover {issue}", fmt="mag", photo=ph, c=dict(photo=ph, brand=brand, issue=f"{issue} · {topic}", lines=lines[topic]), kw=f"magazine cover, {topic.lower()} magazine"))
    looks = [L("magazine", [A4], ["editorial", "grotesk", "abril", "display", "luxe", "bold"], ["ivory", "coral", "sunny", "cobalt", "berry", "mint", "saffron", "lilac"])]
    return out, looks, None, None


def collage():
    out = []
    G = [("Summer memories", "travel"), ("Family moments", "family"), ("Our wedding day", "wedding"), ("Best friends", "birthday"), ("Food diary", "food"), ("Weekend getaway", "travel"), ("Baby's first year", "family"),
         ("Year in review", "events"), ("Festival nights", "festive"), ("Coffee mornings", "cafe"), ("Garden diary", "nature"), ("Home sweet home", "home"), ("Fitness journey", "fitness"), ("Party night", "birthday")]
    out_layouts = ["2v", "3a", "3b", "4", "4a", "5", "6", "6p", "9"]
    for i, (t, ph) in enumerate(G):
        for j, lay in enumerate(out_layouts):
            n = {"2v": 2, "3a": 3, "3b": 3, "4": 4, "4a": 4, "5": 5, "6": 6, "6p": 6, "9": 9}[lay]
            out.append(dict(name=f"{t} {n} Photo Collage", fmt="collage", ph=ph, lay=lay, n=n, c=dict(title=t.capitalize() if j % 3 else None, kicker=["Photo diary", "2026", "Memories"][j % 3] if j % 3 else None, sub=["Captured with love", "Our favourite days", "Moments to keep"][j % 3]), kw=f"photo collage, {n} photo collage"))
    looks = [L("grid", [POST, SQ, STORY, A4], ["hand", "classic", "grotesk", "elegant", "friendly", "display"], ["sand", "ivory", "mono", "blush", "sage", "lilac", "mint", "noir", "midnight"])]
    return out, looks, None, None


def frames():
    out = []
    K = ["circle", "heart", "arch", "flower", "hexagon", "scallop", "squircle", "blob", "diamond", "leaf", "octagon", "rounded"]
    T = [("Happy Birthday", "birthday", "Wishing you the sweetest year yet."), ("Forever yours", "wedding", "Five years of love and laughter."), ("Our little star", "family", "Welcome to the world."), ("Best mum ever", "family", "Love you to the moon and back."),
         ("Meet the team", "business", "The people behind the work."), ("Travel diaries", "travel", "Wish you were here."), ("Good food, good mood", "food", "Sunday brunch done right."), ("Proud graduate", "education", "Class of 2026.")]
    for k in K:
        for t, ph, s in T:
            out.append(dict(name=f"{k.capitalize()} Frame {t}", fmt="frame", ph=ph, kind=k, c=dict(kicker="Photo frame", title=t, sub=s), kw=f"{k} photo frame, photo frame"))
    looks = [L("shape", [POST, SQ, CARD], ["script", "display", "friendly", "soft", "grotesk", "elegant"], ALLP)]
    return out, looks, None, None


def albums():
    """Polaroid album pages (single page)."""
    out = []
    for t, ph, caps in [("Friends forever", "birthday", ["best day", "us ♥", "cheers!", "again soon"]), ("Our weekends", "family", ["Sunday", "picnic", "home", "us"]), ("Summer holiday", "travel", ["day one", "sunset", "swim", "last day"]),
                        ("The celebration", "wedding", ["first look", "the rings", "our people", "cheers"]), ("Little moments", "family", ["giggles", "naps", "firsts", "love"]), ("City break", "travel", ["coffee", "streets", "lights", "home"]),
                        ("Festival diaries", "festive", ["lights", "sweets", "family", "fireworks"]), ("Food trail", "food", ["breakfast", "lunch", "street food", "dessert"])]:
        for n in (2, 3, 4):
            out.append(dict(name=f"{t} {n} Polaroid Album Page", fmt="polaroid", ph=ph, n=n, c=dict(title=t, captions=caps[:n]), kw="polaroid album page, photo album"))
    looks = [L("polaroid", [POST, SQ, (1200, 900)], ["hand"], ["sand", "lilac", "blush", "mint", "sage", "ivory", "peach", "mono"])]
    return out, looks, None, None


def resumes():
    out = []
    people = [("Rahul Krishnan", "Product Designer", "x_man"), ("Lakshmi Narayanan", "English Teacher", "x_teacher"), ("Aisha Fernandes", "Full-Stack Developer", "x_desk"), ("Vignesh Kumar", "Accountant", "x_man2"),
              ("Sneha Pillai", "Marketing Manager", "x_skin2"), ("Arun Prakash", "Civil Engineer", "x_man"), ("Fathima Begum", "Staff Nurse", "x_doctor2"), ("Deepak Rao", "Sales Executive", "x_man2"), ("Nisha Paul", "HR Generalist", "x_shop3"),
              ("Karthik Raman", "Data Analyst", "x_laptop2"), ("Meera Iyer", "Chef", "cooking"), ("Joseph Mathew", "Mechanical Engineer", "x_man"), ("Priya Venkat", "Graphic Designer", "startup"), ("Ravi Shankar", "Driver", "car"),
              ("Anjali Menon", "Fashion Designer", "x_rack"), ("Suresh Babu", "Electrician", "x_desk"), ("Kavya Reddy", "Software Tester", "laptop"), ("Imran Khan", "Hotel Manager", "hotel"), ("Divya Nair", "Receptionist", "office"), ("Tony Thomas", "Photographer", "camera")]
    for i, (n, role, ph) in enumerate(people):
        first = n.split()[0].lower()
        out.append(dict(name=f"{n} {role} Resume", fmt="resume", photo=ph, c=dict(photo=ph, name=n, role=role, contact=[f"+91 9{i:02d}00 1{i:02d}45", f"{first}@email.com", f"{CITIES[i % 8]}, India"],
                        skills=[("Communication", 0.9), ("Teamwork", 0.85), (role.split()[-1] + " skills", 0.92), ("MS Office", 0.8), ("Problem solving", 0.85)], languages=["English", ["Tamil", "Hindi", "Malayalam", "Telugu", "Kannada"][i % 5]],
                        profile=f"{role} with {3 + i % 9} years of experience. Reliable, quick to learn and focused on doing great work for every customer and team.",
                        experience=[(f"Senior {role}", f"{['Bright', 'Prime', 'Nova', 'Apex', 'Blue'][i % 5]} {['Solutions', 'Group', 'Pvt Ltd', 'Studio', 'Services'][i % 5]}", "2022 – Now", "Led day-to-day work, trained new joiners and improved results year on year."),
                                    (role, f"{['City', 'Metro', 'Star', 'Sun', 'Royal'][i % 5]} {['Enterprises', 'Corp', 'Associates', 'Works', 'Co.'][i % 5]}", "2018 – 2022", "Handled key projects and earned two performance awards.")],
                        education=[(["B.E.", "B.Com", "B.Sc", "M.A.", "Diploma"][i % 5] + " " + ["Engineering", "Commerce", "Science", "English", "Hospitality"][i % 5], f"{['Anna', 'Madras', 'Bharathiar', 'Kerala', 'Osmania'][i % 5]} University", "2014 – 2018")]), kw=f"{role.lower()} resume, cv template"))
    looks = [L("resume", [A4], ["modern", "classic", "grotesk", "friendly", "display", "editorial"], ["navy", "sage", "cobalt", "ocean", "forest", "plum", "terra", "teal"]), L("resume", [A4], ["modern", "grotesk", "display"], ["navy", "emerald", "berry", "olive"], dict(side="right"))]
    return out, looks, None, None


def certificates():
    out = []
    C = [("Certificate", "of achievement", "This certificate is proudly presented to", "for outstanding performance and dedication."), ("Certificate", "of completion", "This is to certify that", "has successfully completed the course with distinction."),
         ("Certificate", "of appreciation", "Presented with gratitude to", "for your support, kindness and hard work."), ("Certificate", "of participation", "This certificate is awarded to", "for taking part in the annual event."),
         ("Certificate", "of excellence", "Awarded to", "for excellence in academics and leadership."), ("Winner", "first place", "Proudly awarded to", "for winning first place in the competition."),
         ("Certificate", "of recognition", "In recognition of", "for ten years of loyal service."), ("Certificate", "of training", "This is to certify that", "has completed professional training."),
         ("Award", "student of the year", "Presented to", "for being a role model to all students."), ("Certificate", "of volunteering", "With thanks to", "for 100 hours of community service.")]
    names = ["Ananya Sharma", "Karthik Raman", "Suresh Babu", "Rohan Das", "Meera Iyer", "Arjun Nair", "Fatima Khan", "Priya Venkat", "Zara Ali", "Tony Thomas", "Kavya Reddy", "Omar Sheikh"]
    for i, (k, of, lead, body) in enumerate(C):
        for j in range(3):
            out.append(dict(name=f"{of.title()} {k} {['Classic', 'Modern', 'Formal'][j]}", fmt="cert", c=dict(kicker=k, of=of, lead=lead, name=names[(i + j * 4) % len(names)], body=body, sign=[("Dr. R. Venkatesh", "Director"), ("Mrs. S. Priya", "Coordinator")], seal="2026"), kw=f"certificate {of}, certificate template"))
    looks = [L("certificate", [LAND], ["luxe", "classic", "display", "elegant", "editorial"], ["ivory", "sand", "navy", "emerald", "noir"]), L("certificate", [LAND], ["grotesk", "oswald", "modern", "display"], ["cobalt", "coral", "teal", "plum", "forest"], dict(style="band"))]
    return out, looks, None, None


def menus():
    out = []
    M = [("Café Aroma", "Coffee menu", "cafe", [("Coffee", [("Espresso", "₹120"), ("Cappuccino", "₹160"), ("Filter coffee", "₹90")]), ("Cold", [("Iced latte", "₹180"), ("Cold brew", "₹200")]), ("Bakes", [("Croissant", "₹140"), ("Banana bread", "₹110")])]),
         ("Spice Route", "Lunch menu", "food", [("Starters", [("Gobi 65", "₹180"), ("Chicken 65", "₹240")]), ("Mains", [("Veg meals", "₹220"), ("Biryani", "₹320"), ("Parotta & salna", "₹160")]), ("Desserts", [("Payasam", "₹90"), ("Kulfi", "₹110")])]),
         ("Slice Co.", "Pizza menu", "food", [("Classics", [("Margherita", "₹299"), ("Farmhouse", "₹349")]), ("Specials", [("Paneer tikka", "₹379"), ("Pepperoni", "₹429")]), ("Sides", [("Garlic bread", "₹149"), ("Fries", "₹129")])]),
         ("Umami", "Sushi menu", "food", [("Rolls", [("California", "₹450"), ("Spicy tuna", "₹520")]), ("Nigiri", [("Salmon", "₹380"), ("Ebi", "₹340")]), ("Drinks", [("Green tea", "₹120"), ("Yuzu soda", "₹180")])]),
         ("Sweet Crumbs", "Bakery menu", "cafe", [("Cakes", [("Red velvet", "₹650"), ("Chocolate truffle", "₹700")]), ("Pastries", [("Éclair", "₹120"), ("Fruit tart", "₹140")]), ("Cookies", [("Choco chip", "₹60"), ("Oat raisin", "₹60")])]),
         ("Green Bowl", "Salad bar", "food", [("Bowls", [("Greek", "₹280"), ("Quinoa", "₹320")]), ("Wraps", [("Falafel", "₹240"), ("Paneer", "₹260")]), ("Juices", [("Green detox", "₹160"), ("ABC", "₹150")])]),
         ("The Grill House", "Dinner menu", "food", [("Grills", [("Peri peri chicken", "₹420"), ("Lamb chops", "₹680")]), ("Sides", [("Mash", "₹140"), ("Grilled veg", "₹160")]), ("Desserts", [("Brownie", "₹220"), ("Cheesecake", "₹260")])]),
         ("Chai Point", "Tea menu", "cafe", [("Chai", [("Masala chai", "₹40"), ("Ginger chai", "₹45")]), ("Snacks", [("Samosa", "₹30"), ("Bun maska", "₹50")]), ("Cool", [("Lemon iced tea", "₹90"), ("Rose milk", "₹70")])])]
    for co, t, ph, secs in M:
        for k in range(3):
            out.append(dict(name=f"{co} {t} {['', 'A4', 'Card'][k]}".strip(), fmt="menu", ph=ph, c=dict(kicker=co, title=t.capitalize(), sections=secs, brand="Open daily · 8 AM – 11 PM"), kw="menu template, restaurant menu, cafe menu"))
    looks = [L("menu", [A4, POST], ["editorial", "classic", "grotesk", "display", "oswald", "luxe", "friendly"], ALLP)]
    return out, looks, None, None


def bizcards():
    out = []
    P = [("Rahul Krishnan", "Product Designer", "RK", "Pixel Studio", "Design that works"), ("Meera Iyer", "Head Chef", "MI", "Spice Route", "Authentic South Indian"), ("Arjun Nair", "Advocate", "AN", "Nair & Associates", "Law firm"),
         ("Priya Venkat", "Makeup Artist", "PV", "Glow by Priya", "Bridal & party"), ("Dr. Fathima", "Dentist", "DF", "Smile Clinic", "Gentle dental care"), ("Karthik Raman", "Realtor", "KR", "Nest Realty", "Homes you'll love"),
         ("Sneha Pillai", "Photographer", "SP", "Frames by Sneha", "Weddings & portraits"), ("Imran Khan", "Architect", "IK", "Studio Line", "Architecture & interiors"), ("Anjali Menon", "Fashion Designer", "AM", "Anjali Label", "Handloom couture"),
         ("Tony Thomas", "Founder & CEO", "TT", "Bright Labs", "Software studio"), ("Kavya Reddy", "Yoga Coach", "KR", "Lotus Yoga", "Breathe. Move. Rest."), ("Deepak Rao", "Financial Advisor", "DR", "Rao Wealth", "Plan your future")]
    for n, role, ini, co, tag in P:
        first = n.split()[-1].lower().replace(".", "")
        for st in ("split", "dark", "minimal"):
            out.append(dict(name=f"{co} {st.capitalize()} Business Card", fmt="bc", style=st, c=dict(name=n, role=role, initials=ini, company=co, tagline=tag, lines=["+91 98765 43210", f"{first}@{co.lower().replace(' ', '').replace('&', '')}.com", "Chennai, India"], mark=["circle", "square", "diamond"][len(co) % 3]), kw="business card, visiting card"))
    looks = [L("bizcard", [BC], ["grotesk", "display", "classic", "modern", "luxe", "editorial"], ALLP, photo=False)]
    return out, looks, None, None


def letterheads():
    out = []
    for co, ini, tag in [("Nair & Associates", "NA", "Advocates & legal advisors"), ("Bright Labs", "BL", "Software studio"), ("Smile Dental Clinic", "SD", "Gentle dental care"), ("Nest Realty", "NR", "Homes you'll love"), ("Green Basket", "GB", "Organic produce"),
                         ("Spice Route", "SR", "Restaurant & catering"), ("Rao Wealth", "RW", "Financial planning"), ("Studio Line", "SL", "Architecture & interiors"), ("Lotus Yoga", "LY", "Yoga & wellness"), ("Pixel Studio", "PS", "Branding & design"),
                         ("Sunrise School", "SS", "CBSE · Since 1995"), ("City Hospital", "CH", "Care that cares"), ("Royal Builders", "RB", "Construction"), ("Blue Wave Travels", "BW", "Tours & travels"), ("Apex Logistics", "AL", "Freight & cargo"),
                         ("Vel Traders", "VT", "Wholesale & retail"), ("Kesh Herbals", "KH", "Ayurvedic care"), ("Urban Threads", "UT", "Fashion label"), ("Metro Motors", "MM", "Car sales & service"), ("Star Events", "SE", "Event management")]:
        for st in ("band", "line"):
            out.append(dict(name=f"{co} {'Bold' if st == 'band' else 'Minimal'} Letterhead", fmt="lh", style=st, c=dict(company=co, initials=ini, tagline=tag, lines=["+91 44 2345 6789", f"hello@{co.lower().replace(' ', '').replace('&', '')}.com", "Anna Salai, Chennai 600002"], mark=["circle", "square", "diamond"][len(co) % 3]), kw="letterhead, company letterhead"))
    looks = [L("letterhead", [A4], ["grotesk", "display", "classic", "modern", "luxe", "editorial"], ALLP, photo=False)]
    return out, looks, None, None


def presentations():
    out = []
    D = [("Company Profile", "Bright Labs", "business"), ("Marketing Plan 2027", "Glow Lab", "beauty"), ("Startup Pitch Deck", "CloudNine", "business"), ("Annual Report", "Green Basket", "nature"), ("Project Proposal", "Studio Line", "home"),
         ("Restaurant Business Plan", "Spice Route", "food"), ("Fitness Programme", "FitZone", "fitness"), ("Travel Packages", "Wander", "travel"), ("School Annual Day", "Sunrise School", "education"), ("Real Estate Launch", "Nest Realty", "home"),
         ("Wedding Planning", "Star Events", "wedding"), ("Product Launch", "Stride", "fashion"), ("Quarterly Review", "Apex Logistics", "business"), ("Health Awareness", "City Hospital", "health"), ("Café Franchise", "Brew Co.", "cafe")]
    for t, co, ph in D:
        for v in range(8):
            out.append(dict(name=f"{t} Presentation {['Modern', 'Minimal', 'Bold', 'Classic', 'Fresh', 'Corporate', 'Elegant', 'Bright'][v]}", fmt="slides", ph=ph, c=dict(kicker=co, title=t, sub="Prepared for our partners · 2026", brand=co,
                            agenda=["Who we are", "What we do", "Our results", "Next steps"], content_title="What makes us different", bullets=["Experienced, friendly team", "Clear pricing — no surprises", "Results you can measure", "Support when you need it"],
                            stats_title="A year of growth", stats=[("120+", "happy clients"), ("98%", "would recommend us"), ("3x", "growth since 2024")], contact=f"hello@{co.lower().replace(' ', '').replace('.', '')}.com"), kw="presentation template, slides, pitch deck"))
    looks = [L("slides", [SLIDE], ["grotesk", "display", "editorial", "modern", "classic", "bold", "luxe", "friendly"], ALLP)]
    return out, looks, None, None


def brochures():
    out = []
    B = [("Nest Interiors", "Homes that feel like you", "home"), ("Sunrise School", "Where curious minds grow", "education"), ("City Hospital", "Care close to home", "health"), ("Wander Holidays", "Trips worth remembering", "travel"),
         ("FitZone", "Train smarter", "fitness"), ("Glow Lab", "Skincare that works", "beauty"), ("Spice Route", "Catering for every occasion", "food"), ("Bright Labs", "Software that saves time", "business"),
         ("Lotus Yoga", "Breathe, move, rest", "fitness"), ("Royal Builders", "Built to last", "home"), ("Star Events", "Events made effortless", "events"), ("Green Basket", "Fresh from the farm", "nature")]
    for co, t, ph in B:
        for v in range(10):
            out.append(dict(name=f"{co} Brochure {['Modern', 'Classic', 'Minimal', 'Bold', 'Fresh', 'Elegant', 'Bright', 'Clean', 'Premium', 'Simple'][v]}", fmt="brochure", ph=ph, c=dict(brand=co, title=t), kw="brochure template, company brochure"))
    looks = [L("brochure", [A4], ["editorial", "grotesk", "display", "classic", "modern", "luxe"], ALLP)]
    return out, looks, None, None


def events():
    out = []
    E = [("Annual Leadership Summit", "conference", "events", ["17 – 18 January 2027", "Taj Coromandel, Chennai"]), ("Tech Meetup", "conference", "business", ["Thursday 6 PM", "WeWork, Guindy"]), ("Design Conference", "conference", "business", ["2 days", "Bengaluru"]),
         ("Women in Business", "conference", "business", ["8 March", "Hotel Residency"]), ("Medical Conference", "conference", "health", ["12 – 13 Feb", "City Convention Centre"]), ("Education Summit", "conference", "education", ["5 April", "IIT Madras"]),
         ("Startup Expo", "conference", "business", ["3 days", "Trade Centre"]), ("Marketing Masterclass", "conference", "business", ["Saturday 10 AM", "Online"]), ("Pool Party", "party", "travel", ["Saturday 4 PM", "Palm Grove Club"]),
         ("Retro Night", "party", "events", ["Friday 9 PM", "The Loft"]), ("Garden Party", "party", "nature", ["Sunday 5 PM", "Sunset Lawn"]), ("Housewarming", "party", "home", ["Sunday 11 AM", "Our new home"]),
         ("Farewell Party", "party", "business", ["Friday 6 PM", "Office terrace"]), ("Graduation Party", "party", "education", ["Saturday 7 PM", "The Grand Hall"]), ("Baby Shower", "party", "family", ["Saturday 11 AM", "Café Mocha"]),
         ("New Year's Eve Party", "party", "festive", ["31 December · 9 PM", "Skyline Terrace"]), ("Bachelorette Night", "party", "birthday", ["Saturday 8 PM", "Rooftop"]), ("Diwali Party", "party", "festive", ["Saturday 7 PM", "Lotus Banquet"])]
    for t, kind, ph, d in E:
        for v in range(8):
            out.append(dict(name=f"{t} {['Invitation', 'Poster', 'Post', 'Story', 'Flyer', 'Banner', 'Card', 'Ticket'][v]}", fmt=["inv", "poster", "post", "story", "poster", "fb", "inv", "post"][v], ph=ph, sub="Conference" if kind == "conference" else "Party",
                            c=dict(kicker="You're invited" if kind == "party" else "Register now", title=t, sub="Join us for an unforgettable time." if kind == "party" else "Talks, workshops and networking with the best in the field.", details=d, cta="RSVP" if kind == "party" else "Book your seat", web="yourevent.com"), kw=f"{t.lower()}, {kind} invitation"))
    looks = [L("hero_center", [None], ["luxe", "poster", "bold", "editorial"], LUX + ["coral", "cobalt"], dict(title_size=150)), L("split", [None], ["grotesk", "display", "friendly"], ALLP, dict(ratio=0.5)),
             L("typo", [None], ["grotesk", "abril", "bold", "display"], ALLP, dict(deco_kind="rings"), photo=False, art=True), L("party", [None], ["friendly", "display", "abril"], ALLP, dict(style="bunting"), photo=False, art=True)]
    return out, looks, ["party-popper", "microphone", "mirror-ball", "clinking-glasses", "musical-notes", "trophy", "light-bulb", "sparkles"], None


def love_family():
    out = []
    T = [("Welcome baby", "It's a girl!", "family", "baby-bottle"), ("Welcome baby", "It's a boy!", "family", "teddy-bear"), ("Happy anniversary", "Ten years of us", "wedding", "two-hearts"), ("Thank you", "For being our family", "family", "red-heart"),
         ("Love you, Amma", "Happy Mother's Day", "family", "tulip"), ("Best Appa ever", "Happy Father's Day", "family", "necktie"), ("Family reunion", "The Menons, together again", "family", "house-with-garden"), ("Our love story", "Since 2016", "wedding", "love-letter"),
         ("Happy grandparents day", "With all our love", "family", "teacup-without-handle"), ("Gotcha day", "Three years of Bruno", "family", "paw-prints"), ("Sibling love", "Happy Raksha Bandhan", "family", "ribbon"), ("Our new home", "Housewarming wishes", "home", "house")]
    for t, s, ph, art in T:
        for v in range(10):
            out.append(dict(name=f"{t} {s} {['Card', 'Post', 'Story', 'Frame', 'Note', 'Wishes', 'Square', 'Print', 'Keepsake', 'Greeting'][v]}", fmt=["card", "post", "story", "post", "card", "post", "sq", "a4", "card", "sq"][v], ph=ph, art=art,
                            c=dict(kicker=t, title=s, sub="With all our love, always."), kw="family card, love card"))
    looks = [L("shape", [None], ["script", "soft", "hand", "display"], WARM + COOL, dict(kind="heart")), L("shape", [None], ["soft", "elegant"], ALLP, dict(kind="flower")),
             L("elegant", [None], ["script", "elegant", "soft"], ALLP, photo=False, art=True), L("badge", [None], ["friendly", "display", "hand"], ALLP, photo=False, art=True),
             L("framed", [None], ["script", "soft"], ["ivory", "blush", "sage", "sand"], dict(photo_h=0.44, shape="circle"))]
    return out, looks, None, None


def cards():
    out = []
    T = [("Thank you", "for everything", "nature", "bouquet"), ("Congratulations", "on your big news", "events", "party-popper"), ("Get well soon", "sending sunshine", "nature", "sun"), ("Good luck", "you've got this", "education", "four-leaf-clover"),
         ("Happy retirement", "enjoy every day", "travel", "palm-tree"), ("Sorry for your loss", "thinking of you", "nature", "dove"), ("Welcome to the team", "glad you're here", "business", "rocket"), ("Happy graduation", "the world is yours", "education", "graduation-cap"),
         ("Thinking of you", "always", "nature", "blossom"), ("Happy promotion", "well deserved", "business", "trophy"), ("Bon voyage", "safe travels", "travel", "airplane"), ("Happy engagement", "cheers to love", "wedding", "ring")]
    for t, s, ph, art in T:
        for v in range(10):
            out.append(dict(name=f"{t} {s} Card {['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][v]}", fmt="card", ph=ph, art=art, c=dict(accent=t, title=s.capitalize(), sub="With warm wishes from all of us."), kw=f"{t.lower()} card, greeting card"))
    looks = [L("shape", [CARD, SQ], ["script", "soft", "elegant", "display"], ALLP, dict(kind="circle")), L("elegant", [CARD, SQ], ["script", "elegant", "luxe"], ALLP, photo=False, art=True),
             L("badge", [CARD, SQ], ["friendly", "display"], ALLP, photo=False, art=True), L("wave", [CARD, SQ], ["display", "hand"], ALLP, photo=False, art=True), L("framed", [CARD], ["script", "soft"], ["ivory", "blush", "sage", "sand", "lilac"], dict(photo_h=0.46, shape="rounded"))]
    return out, looks, None, None


def flyers():
    out = []
    F = [("Coaching classes", "Maths & Science", "education"), ("Home cleaning", "Spotless homes", "home"), ("Yoga classes", "Gentle yoga for all", "fitness"), ("Salon offer", "Bridal & party makeup", "beauty"), ("Pest control", "Safe for kids & pets", "home"),
         ("Tiffin service", "Home-style meals daily", "food"), ("Car rental", "Self-drive from ₹1,499", "travel"), ("Dance classes", "Kids & adults", "events"), ("Tuition centre", "Classes 6 – 12", "education"), ("AC service", "Same-day repair", "home"),
         ("Pet grooming", "Pampered pets", "family"), ("Laundry", "Wash, dry, fold", "home"), ("Driving school", "Learn in 21 days", "travel"), ("Bakery", "Fresh every morning", "cafe"), ("Clinic", "Family doctor near you", "health"), ("Photography", "Weddings & events", "wedding")]
    for k, t, ph in F:
        for v in range(8):
            out.append(dict(name=f"{t} {k.capitalize()} Flyer {['', 'A4', 'Print', 'DL', 'Promo', 'Offer', 'Info', 'Simple'][v]}".replace("  ", " ").strip(), fmt="flyer", ph=ph, c=dict(kicker=k.capitalize(), title=t, sub="Trusted by hundreds of families. Call or WhatsApp to book.", details=["Call 98765 43210", "Open 7 days"], cta="Book now", big=["20% OFF", "₹499", "FREE DEMO", "NEW"][v % 4]), kw=f"{k} flyer, business flyer"))
    looks = [L("split", [A4], ["grotesk", "friendly", "display", "modern"], ALLP, dict(ratio=0.46)), L("sale", [A4], ["oswald", "bold", "elegant"], ALLP), L("hero_bottom", [A4], ["grotesk", "editorial"], LUX),
             L("shape", [A4], ["display", "grotesk", "friendly"], ALLP, dict(kind="rounded")), L("typo", [A4], ["grotesk", "abril", "oswald"], ALLP, dict(deco_kind="corner"), photo=False, art=True)]
    return out, looks, ["telephone" if False else "light-bulb", "sparkles", "house", "books", "fork-and-knife-with-plate", "lotus", "hammer-and-wrench", "camera-with-flash"], None


CATS = {
    # key: (generator, category, sub, target)
    "birthday": (birthday, "Birthday", None, 260),
    "wedding": (wedding_inv, "Wedding", "*", 340),
    "festivals": (festivals, "Festivals", None, 260),
    "social": (social, "Social Media", "Instagram", 260),
    "facebook": (facebook, "Social Media", "Facebook", 120),
    "youtube": (youtube, "Social Media", "YouTube", 110),
    "ytbanner": (youtube_banner, "Social Media", "YouTube", 24),
    "posters": (posters, "Marketing", "Poster", 200),
    "ads": (ads, "Marketing", "Advertisement", 100),
    "banners": (banners, "Marketing", "Banner", 108),
    "magazines": (magazines, "Marketing", "Magazine", 96),
    "collage": (collage, "Photo Collage", None, 160),
    "frames": (frames, "Photo Collage", None, 96),
    "albums": (albums, "Photo Collage", None, 24),
    "resumes": (resumes, "Resume", None, 100),
    "certificates": (certificates, "Certificates", None, 100),
    "menus": (menus, "Menus", None, 80),
    "bizcards": (bizcards, "Business", "Business Card", 72),
    "letterheads": (letterheads, "Business", "Letterhead", 100),
    "presentations": (presentations, "Business", "Presentation", 110),
    "brochures": (brochures, "Business", "Brochure", 110),
    "events": (events, "Events", "*", 200),
    "family": (love_family, "Love & Family", None, 150),
    "cards": (cards, "Cards", None, 160),
    "flyers": (flyers, "Business", "Flyer", 160),
}

FMT_SIZE = {"inv": [CARD], "post": [POST, SQ], "card": [CARD], "story": [STORY], "fb": [FB], "yt": [YT], "ytb": [(2560, 1440)], "poster": [A4], "ad": None, "mag": [A4], "collage": None, "frame": None, "polaroid": None,
            "resume": [A4], "cert": [LAND], "menu": None, "bc": [BC], "lh": [A4], "slides": [SLIDE], "brochure": [A4], "flyer": [A4], "sq": [SQ], "a4": [A4], "li": [LI], "web": [WEB], "bill": [BILL]}


def gen(key):
    fn, cat, sub, target = CATS[key]
    items, looks, arts, default_ph = fn()
    rng = random.Random(hash(key) % 10000)
    out = []
    seen = set()
    combos = [(i, j) for i in range(len(items)) for j in range(len(looks))]
    rng.shuffle(combos)
    # spread: every content item is used once before any is used again
    seen_i, ranked = {}, []
    for ij in combos:
        seen_i[ij[0]] = seen_i.get(ij[0], -1) + 1
        ranked.append((seen_i[ij[0]], ij))
    combos = [ij for _, ij in sorted(ranked, key=lambda x: x[0])]
    STYLE = ["Modern", "Classic", "Fresh", "Bold", "Soft", "Clean", "Bright", "Minimal"]
    rounds = [(v, i, j) for v in range(8) for (i, j) in combos]
    for v, i, j in rounds:
        if len(out) >= target:
            break
        it, lk = items[i], looks[j]
        if it.get("arch_only") and lk["arch"] not in it["arch_only"]:
            continue
        if lk["arch"] in ("quote", "tips") and not it.get("arch_only"):
            continue
        # size: item format wins, then the look's sizes
        sizes = it.get("size") and [it["size"]] or FMT_SIZE.get(it.get("fmt")) or lk["sizes"]
        sizes = [s for s in sizes if s] or [POST]
        if lk["sizes"] and lk["sizes"][0] is not None:
            common = [s for s in sizes if s in lk["sizes"]]
            sizes = common or sizes
        size = sizes[(i + j + v) % len(sizes)]
        pal = lk["pals"][(i * 3 + j + v * 5) % len(lk["pals"])]
        pair = lk["pairs"][(i + j * 2 + v) % len(lk["pairs"])]
        c = dict(it["c"])
        c = {k: v for k, v in c.items() if v is not None}
        ph_pool = PH.get(it.get("ph") or default_ph or "events", PH["events"])
        if lk["photo"] and "photo" not in c and lk["arch"] not in ("grid", "polaroid"):
            c["photo"] = it.get("photo") or ph_pool[(i * 5 + j + v * 3) % len(ph_pool)]
        if lk["arch"] == "grid":
            n = it.get("n", 4)
            c["photos"] = [ph_pool[(i + k) % len(ph_pool)] for k in range(n)]
        if lk["arch"] == "polaroid":
            n = it.get("n", 3)
            c["photos"] = [ph_pool[(i + k * 2) % len(ph_pool)] for k in range(n)]
            c.setdefault("captions", ["", "", "", ""][:n])
        if lk["art"] and "art" not in c:
            pool = arts or ["sparkles"]
            c["art"] = it.get("art") or pool[(i + j) % len(pool)]
        opts = dict(lk["opts"])
        if lk["arch"] == "grid":
            opts["layout"] = it.get("lay", "4")
        if lk["arch"] == "shape" and it.get("kind"):
            opts["kind"] = it["kind"]
        if lk["arch"] == "shape" and opts.get("kind") in (None,):
            opts["kind"] = "circle"
        if lk["arch"] == "sale" and "big" not in c:
            c["big"] = c.get("price", "20% OFF")
        if it.get("style"):
            opts["style"] = it["style"]
        name = f"{PALWORD.get(pal, pal.capitalize())} {it['name']}"
        if name in seen:
            name = f"{PALWORD.get(pal, pal.capitalize())} {ARCHWORD.get(lk['arch'], '')} {it['name']}"
        if name in seen:
            name = f"{PALWORD.get(pal, pal.capitalize())} {STYLE[v]} {it['name']}"
        if name in seen:
            continue
        seen.add(name)
        csub = it.get("sub") if sub == "*" else sub
        out.append(dict(title=name, cat=cat, sub=csub, size=size, arch=lk["arch"], pair=pair, pal=pal, c=c, opts=opts, kw=it.get("kw", "")))
    return out
