"""Collection 500 — Social media and promotional designs (social-001 … social-040)."""

import math, re
from kit import lin, rad, mix, rgba, shadow, text_width, FS_MULT
from common import GOLD, metal, text_metal, vgrad, overlay, pill, divider
from greetings import fitted, body

CATEGORY = "Social media and promotional designs"
SITE_CATEGORY = "Social Media"
TAG = "social"

SQ = 1080, 1080
ST = 1080, 1920
PO = 1080, 1350

SPEC = [
    ("Sale", "Flash Sale Bold Post", *SQ, "FLASH SALE", "50% off everything · 24 hours only", "Shop now", "flash sale instagram post bold", "flash sale, discount post"),
    ("Sale", "Shoe Store Discount Post", *SQ, "Step into savings", "30% off leather shoes this week", "Shop in store & online", "shoe sale instagram post photo", "shoe sale, product promo"),
    ("Sale", "Black Friday Sale Post", *SQ, "BLACK FRIDAY", "Up to 70% off · Friday 26 November", "Starts at midnight", "black friday sale post", "black friday, sale"),
    ("Sale", "Cyber Monday Story", *ST, "CYBER MONDAY", "Online only · extra 20% off with code CYBER20", "Swipe up to shop", "cyber monday sale story neon", "cyber monday, story"),
    ("Sale", "Buy One Get One Post", *SQ, "Buy 1 Get 1 Free", "On all iced coffees · weekdays 2–5 PM", "The Daily Grind", "buy one get one free coffee post", "bogo offer, coffee promo"),
    ("Sale", "Free Shipping Banner Post", *SQ, "Free shipping", "On all orders over AED 150 · this weekend", "Use code FREESHIP", "free shipping promo post", "free shipping, ecommerce"),
    ("Sale", "End of Season Sale Poster", *PO, "End of Season Sale", "Up to 60% off fashion · final week", "In stores & online", "end of season sale poster fashion", "end of season sale, fashion"),
    ("Sale", "Bundle Offer Post", *SQ, "Bundle & Save", "Lipstick + palette + brush · now AED 199 (was AED 285)", "Limited stock", "beauty bundle offer post", "bundle offer, beauty promo"),
    ("Product", "New Arrival Product Post", *SQ, "New Arrival", "The Tan Oxford · hand-stitched Italian leather", "AED 650", "new arrival product post minimal", "new arrival, product showcase"),
    ("Product", "Product Feature Story", *ST, "Meet our new blend", "Single-origin Ethiopian · notes of jasmine & citrus", "Available in store", "coffee product feature story", "product story, coffee"),
    ("Product", "Fresh Juice Menu Post", *SQ, "Freshly squeezed", "Orange · Green detox · Berry boost · from AED 18", "Order on our app", "fresh juice promo post", "juice bar, menu promo"),
    ("Product", "Beauty Launch Post", *SQ, "Velvet Matte", "Our new lipstick collection · 8 shades", "Launching Friday", "lipstick launch post luxury", "beauty launch, lipstick"),
    ("Product", "Real Estate Listing Post", *SQ, "Just Listed", "3-bed villa · Arabian Ranches · 2,800 sq ft · AED 3.2M", "Call 050 123 4567", "real estate just listed post", "real estate, just listed"),
    ("Product", "Car Dealer Promo Post", *SQ, "Drive it home", "0% finance on selected SUVs this month", "Book a test drive", "car dealership promo post", "car dealer, automotive promo"),
    ("Product", "Interior Design Studio Post", *SQ, "Calm spaces", "Interior design for homes that feel like you", "Book a free consultation", "interior design studio post minimal", "interior design, studio promo"),
    ("Product", "Restaurant New Menu Post", *SQ, "New on the menu", "Wood-fired flatbread with roasted tomatoes & herbs", "Available from today", "restaurant new menu instagram post", "restaurant post, new menu"),
    ("Engagement", "Giveaway Contest Post", *SQ, "GIVEAWAY", "Win a beauty bundle worth AED 500 · Like · Follow · Tag 2 friends", "Ends Sunday", "instagram giveaway contest post", "giveaway, contest"),
    ("Engagement", "This or That Story", *ST, "This or that?", "Coffee · Tea", "Vote below!", "this or that instagram story poll", "poll story, engagement"),
    ("Engagement", "Ask Me Anything Story", *ST, "Ask me anything", "About design, freelancing and coffee", "Drop your questions", "ask me anything story template", "q&a story, engagement"),
    ("Engagement", "Customer Review Post", *SQ, "★★★★★", "“The best croissants in Dubai — I come back every weekend.”", "— Amira K., verified customer", "customer review testimonial post", "testimonial, review post"),
    ("Engagement", "Quote of the Day Post", *SQ, "Quote of the day", "Small steps every day add up to big changes.", "", "quote of the day instagram post", "quote post, motivation"),
    ("Engagement", "Sleep Tips Carousel Cover", *SQ, "5 tips for better sleep", "Swipe for simple habits that work", "@wellness.lab", "tips carousel cover post", "carousel cover, tips"),
    ("Engagement", "Follow Us Post", *SQ, "Follow us!", "Daily inspiration, behind the scenes & exclusive offers", "@magical.studio", "follow us instagram post", "follow us, social growth"),
    ("Engagement", "Sale Countdown Story", *ST, "2 days left", "until our biggest sale of the year", "Turn on notifications", "countdown story sale", "countdown story"),
    ("Brand", "Coming Soon Teaser Post", *SQ, "Coming soon", "Something beautiful is brewing", "@thedailygrind", "coming soon teaser post", "coming soon, teaser"),
    ("Brand", "We’re Open Post", *SQ, "We’re open!", "Mon–Sat · 8 AM – 10 PM · Al Wasl Road", "Come say hi", "we're open shop post", "we're open, opening hours"),
    ("Brand", "We’re Hiring Post", *SQ, "We’re hiring", "Barista · Full time · Dubai", "Send your CV to jobs@thedailygrind.ae", "we are hiring instagram post", "hiring post, job vacancy"),
    ("Brand", "Meet the Team Post", *SQ, "Meet the team", "Karim · Head Chef — 12 years of making people happy", "", "meet the team post photo", "meet the team, staff intro"),
    ("Brand", "Behind the Scenes Story", *ST, "Behind the scenes", "How our cakes are made — every day, by hand", "", "behind the scenes story bakery", "behind the scenes, story"),
    ("Brand", "Thank You Customers Post", *SQ, "1 year!", "Thank you for 12 months of coffee, chats and kindness", "The Daily Grind", "one year anniversary business post", "business anniversary, thank you"),
    ("Brand", "Podcast Episode Post", *SQ, "New episode", "Ep. 24 · Building a brand from zero · with Dana Khalil", "Listen on all platforms", "podcast episode instagram post", "podcast post, episode"),
    ("Brand", "Blog Post Promo", *SQ, "New on the blog", "10 ways to style a small living room", "Read now — link in bio", "blog post promo instagram", "blog promo post"),
    ("Brand", "Before and After Post", *SQ, "Before / After", "Living room refresh in 2 weeks", "Swipe to see more", "before after interior post", "before and after, transformation"),
    ("Wellness", "Gym Membership Promo", *SQ, "No excuses", "First month free · join this week", "Iron House Gym", "gym membership promo post", "gym promo, fitness"),
    ("Wellness", "Yoga Studio Class Post", *SQ, "Find your balance", "New morning flow classes · 7 AM daily", "Book on our app", "yoga studio class post", "yoga studio, class promo"),
    ("Wellness", "Healthy Recipe Post", *SQ, "Avocado toast, 3 ways", "Quick, healthy breakfast ideas", "Recipe in caption", "healthy recipe instagram post", "recipe post, food"),
    ("Wellness", "Salon Offer Story", *ST, "Glow up Tuesday", "20% off facials every Tuesday", "Book now", "beauty salon offer story", "salon offer, beauty story"),
    ("Promotional", "Loyalty Card Promo", *SQ, "Buy 9, get the 10th free", "Ask for your loyalty card at the counter", "The Daily Grind", "loyalty card promo post coffee", "loyalty card, rewards"),
    ("Promotional", "App Launch Post", *SQ, "Our app is here", "Order ahead, skip the queue, earn rewards", "Download now", "app launch promo post phone", "app launch, download"),
    ("Promotional", "Travel Agency Deal Post", *SQ, "Escape to Santorini", "5 nights · flights + hotel · from AED 3,999", "Book by 31 March", "travel agency deal post", "travel deal, holiday package"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def lines(s):
    return [p.strip() for p in s.split("·")]


def badge(d, cx, cy, r, text, sub, bg, fg):
    d.star(cx, cy, r, bg, points=18, inner=0.86, angle=-80)
    d.text(cx - r, cy - r * 0.42, 2 * r, text, "Anton", r * 0.62, fg, align="center")
    if sub:
        d.text(cx - r, cy + r * 0.26, 2 * r, sub, "Montserrat", r * 0.2, fg, weight=800, align="center", spacing=200)


def photo_promo(d, c, n, focus, bg, ink, accent, head_font="Playfair Display", italic=True, side="top"):
    W, H = d.W, d.H
    d.bg(bg)
    if side == "top":
        d.photo(n, 60, 60, W - 120, H * 0.56, frame="rounded", rx=28, focus=focus)
        y = H * 0.56 + 100
    else:
        d.photo(n, W * 0.46, -d.bleed, W * 0.54 + d.bleed, H + 2 * d.bleed, focus=focus)
        y = H * 0.12
    w = 0.84 if side == "top" else 0.38
    t, s = fitted(d, y, c["headline"], head_font, 110, ink, w=w, weight=700, italic=italic, align="left", x=70)
    p = lines(c["message"])
    tt = d.text(70, y + t["_h"] + 14, W * (w + 0.02), "  ·  ".join(p) if side == "top" else "\n".join(p), "Montserrat", 36 if side == "top" else 38, ink, weight=500, lh=1.35)
    if c["signature"]:
        sx = 70 + text_width(c["signature"], "Montserrat", 30, 700, False, 120) / 2 + 40
        pill(d, sx, min(H - 80, y + t["_h"] + tt["_h"] + 70), c["signature"], "Montserrat", 30, bg if isinstance(bg, str) else "#FFFFFF", accent, spacing=120, upper=False, weight=700)


# ---------------------------------------------------------------- sale
@design(1)
def flash_sale(d, c):
    W, H = d.W, d.H
    d.bg("#FF2E63")
    d.stripes(-d.bleed, -d.bleed, W + d.bleed, H + d.bleed, 30, 30, "rgba(255,255,255,0.06)", angle_deg=-30)
    k_ = 0.42
    bx, by = W * 0.86, H * 0.56
    d.path([["M", bx + (x - 0.5) * W * k_, by + (y - 0.4) * H * k_] if c_ == "M" else ["L", bx + (x - 0.5) * W * k_, by + (y - 0.4) * H * k_] for c_, x, y in [("M", 0.62, 0.06), ("L", 0.44, 0.4), ("L", 0.56, 0.4), ("L", 0.4, 0.7), ("L", 0.66, 0.32), ("L", 0.54, 0.32), ("L", 0.68, 0.06)]] + [["Z"]], fill="#FFE14D", name="Bolt", shadow_=shadow("rgba(0,0,0,0.2)", 0, 10, 10))
    t, s = fitted(d, H * 0.08, "FLASH\nSALE", "Anton", 270, "#FFFFFF", w=0.84, lh=0.9, shadow_=shadow("rgba(0,0,0,0.18)", 0, 8, 8))
    p = lines(c["message"])
    d.text(0, H * 0.72, W, p[0].upper(), "Anton", 110, "#FFE14D", align="center")
    d.text(0, H * 0.84, W, p[1].upper(), "Montserrat", 40, "#FFFFFF", weight=800, align="center", spacing=300)
    return {"layout": "giant stacked FLASH SALE with a lightning bolt, offer line below", "typography": "Anton, Montserrat caps", "palette": "hot pink, lemon, white", "decor": "diagonal stripes, vector lightning bolt"}


@design(2)
def shoe_sale(d, c):
    photo_promo(d, c, 50, (0.4, 0.5), "#F4EDE4", "#3A2418", "#8C4A1E")
    W, H = d.W, d.H
    badge(d, W * 0.82, H * 0.14, 110, "30%", "OFF", "#8C4A1E", "#FFFFFF")
    return {"layout": "rounded product photo with a discount starburst, italic headline and CTA", "typography": "Playfair Display italic, Montserrat, Anton", "palette": "sand, leather brown, cocoa", "decor": "starburst badge, rounded photo"}


@design(3)
def black_friday(d, c):
    W, H = d.W, d.H
    d.bg("#0A0A0A")
    for k in range(10):
        d.rect(-d.bleed, k * 120, W + 2 * d.bleed, 2, "#1F1F1F")
    t, s = fitted(d, H * 0.1, "BLACK\nFRIDAY", "Anton", 250, "#FFFFFF", lh=0.88)
    p = lines(c["message"])
    d.rect(W * 0.08, H * 0.66, W * 0.84, 140, "#FFD400")
    d.text(W * 0.08, H * 0.66 + 28, W * 0.84, p[0].upper(), "Anton", 90, "#0A0A0A", align="center")
    d.text(0, H * 0.84, W, (p[1] + "  ·  " + c["signature"]).upper(), "Montserrat", 32, "#FFD400", weight=800, align="center", spacing=200)
    return {"layout": "massive white type on black with a yellow offer bar", "typography": "Anton, Montserrat caps", "palette": "black, white, yellow", "decor": "thin rules, offer bar"}


@design(4)
def cyber_monday(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#0B0033"), (1, "#24006B")]))
    step = 80
    d.path([x for k in range(int(W / step) + 2) for x in (["M", k * step, H * 0.6], ["L", W / 2 + (k * step - W / 2) * 3, H + d.bleed])], fill="", stroke="rgba(0,240,255,0.25)", sw=2)
    for k in range(8):
        y = H * 0.6 + (k / 7) ** 1.7 * H * 0.4
        d.line(-d.bleed, y, W + d.bleed, y, "rgba(0,240,255,0.25)", 2)
    t, s = fitted(d, H * 0.12, "CYBER\nMONDAY", "Monoton", 250, "#00F0FF", lh=1.05, shadow_=shadow("rgba(0,240,255,0.9)", 30, 0, 0))
    p = lines(c["message"])
    d.text(0, H * 0.42, W, p[0].upper(), "Righteous", 70, "#FF3CF0", align="center", shadow_=shadow("rgba(255,60,240,0.8)", 20, 0, 0))
    d.text(0, H * 0.6, W, "20%", "Monoton", 260, "#FFFFFF", align="center", shadow_=shadow("rgba(255,60,240,0.9)", 40, 0, 0))
    d.rect(W * 0.1, H * 0.48, W * 0.8, 140, "rgba(255,255,255,0.08)", rx=20, stroke="#FF3CF0", sw=2)
    d.text(W * 0.1, H * 0.48 + 40, W * 0.8, p[1], "DM Sans", 44, "#FFFFFF", weight=700, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "DM Sans", 40, "#0B0033", "#00F0FF", weight=800, spacing=60, upper=False)
    return {"layout": "neon wordmark over a perspective grid, code panel and CTA", "typography": "Monoton neon, Righteous, DM Sans", "palette": "deep violet, cyan, magenta", "decor": "perspective grid, glow"}


@design(5)
def bogo(d, c):
    W, H = d.W, d.H
    d.bg("#F3E3CF")
    d.circle(W * 0.32, H * 0.42, 210, "#E2C3A0")
    d.circle(W * 0.68, H * 0.42, 210, "#D9B48F")
    d.art("cup-with-straw" if False else "bubble-tea", W * 0.32, H * 0.42, 300, angle=-8)
    d.art("bubble-tea", W * 0.68, H * 0.42, 300, angle=8)
    d.text(W * 0.5 - 60, H * 0.36, 120, "+", "Anton", 120, "#6B3A1E", align="center")
    t, s = fitted(d, H * 0.06, "Buy 1 Get 1 Free", "Anton", 140, "#6B3A1E")
    p = lines(c["message"])
    d.text(0, H * 0.72, W, p[0], "Pacifico", 64, "#B5523B", align="center")
    d.text(0, H * 0.82, W, p[1].upper(), "Montserrat", 34, "#6B3A1E", weight=800, align="center", spacing=200)
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 28, "#8C6A50", weight=600, align="center", spacing=300)
    return {"layout": "two drinks side by side with a plus sign, offer headline", "typography": "Anton, Pacifico, Montserrat caps", "palette": "latte, caramel, espresso", "decor": "circles, drink illustrations"}


@design(6)
def free_ship(d, c):
    W, H = d.W, d.H
    d.bg("#2E86DE")
    d.wave(-d.bleed, W + d.bleed, H * 0.7, 20, 300, fill="#1B6FC2", bottom=H + d.bleed)
    d.art("wrapped-gift", W * 0.3, H * 0.6, 240, angle=-8)
    d.art("airplane", W * 0.72, H * 0.52, 220, angle=-15)
    d.path([["M", W * 0.42, H * 0.62], ["Q", W * 0.55, H * 0.5, W * 0.62, H * 0.56]], fill="", stroke="#FFFFFF", sw=4, dash=[12, 10])
    t, s = fitted(d, H * 0.08, "FREE SHIPPING", "Anton", 180, "#FFFFFF")
    p = lines(c["message"])
    d.text(0, H * 0.08 + s * 1.15, W, " · ".join(p), "Montserrat", 40, "#DCEBFF", weight=700, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 38, "#2E86DE", "#FFFFFF", weight=800, spacing=200, upper=True)
    return {"layout": "parcel flying off on a dashed path to a plane, bold headline", "typography": "Anton, Montserrat", "palette": "blue, white", "decor": "wave, gift and plane, dashed route"}


@design(7)
def end_season(d, c):
    W, H = d.W, d.H
    d.bg("#EDE6DC")
    d.photo(98, W * 0.4, -d.bleed, W * 0.6 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.3))
    t = d.text(60, 90, W * 0.36, "END\nOF\nSEASON\nSALE", "Anton", d.fit("SEASON", W * 0.34, "Anton", 300), "#1E1E1E", lh=0.9)
    p = lines(c["message"])
    d.rect(60, 90 + t["_h"] + 40, W * 0.34, 200, "#C0392B")
    d.text(60, 90 + t["_h"] + 60, W * 0.34, "UP TO", "Montserrat", 32, "#FFFFFF", weight=800, align="center", spacing=300)
    d.text(60, 90 + t["_h"] + 100, W * 0.34, "60%", "Anton", 110, "#FFFFFF", align="center")
    d.text(60, H * 0.84, W * 0.34, p[1].upper(), "Montserrat", 30, "#1E1E1E", weight=800, spacing=200)
    d.text(60, H * 0.88, W * 0.34, c["signature"], "Montserrat", 28, "#7A7068", weight=600)
    return {"layout": "fashion photo right, stacked condensed title and red percentage block left", "typography": "Anton, Montserrat", "palette": "stone, black, red", "decor": "full-height photo, offer block"}


@design(8)
def bundle(d, c):
    W, H = d.W, d.H
    d.bg("#FBEDEE")
    d.photo(1269, 60, 60, W - 120, H * 0.5, frame="rounded", rx=30, focus=(0.5, 0.5))
    d.art("lipstick", W * 0.16, H * 0.56, 140, angle=-20)
    t, s = fitted(d, H * 0.6, "Bundle & Save", "Playfair Display", 110, "#7A1F3D", weight=700, italic=True)
    p = re.split(r" · ", c["message"])
    d.text(70, H * 0.6 + s * 1.3, W - 140, p[0], "Montserrat", 38, "#3A2030", weight=600)
    m = re.search(r"AED (\d+) \(was AED (\d+)\)", c["message"])
    if m:
        d.text(70, H * 0.6 + s * 1.3 + 70, 400, f"AED {m.group(1)}", "Anton", 90, "#C2185B")
        d.text(440, H * 0.6 + s * 1.3 + 100, 300, f"AED {m.group(2)}", "Montserrat", 40, "#9A7A84", weight=600)
        d.line(440, H * 0.6 + s * 1.3 + 126, 440 + text_width(f"AED {m.group(2)}", "Montserrat", 40, 600), H * 0.6 + s * 1.3 + 126, "#9A7A84", 3)
    pill(d, W - 220, H * 0.92, c["signature"], "Montserrat", 28, "#FFFFFF", "#7A1F3D", spacing=160)
    return {"layout": "beauty flat-lay photo, italic headline, new price beside a struck-out old price", "typography": "Playfair Display italic, Anton, Montserrat", "palette": "blush, berry, mauve", "decor": "rounded photo, lipstick sticker, strike line"}


# ---------------------------------------------------------------- product
@design(9)
def new_arrival(d, c):
    W, H = d.W, d.H
    d.bg("#1F2A33")
    d.photo(50, -d.bleed, -d.bleed, W * 0.58 + d.bleed, H + 2 * d.bleed, focus=(0.45, 0.5))
    x0 = W * 0.64
    d.text(x0, H * 0.12, W * 0.32, "NEW", "Montserrat", 30, "#C9A45A", weight=800, spacing=500)
    t = d.text(x0, H * 0.16, W * 0.32, "Arrival", "Playfair Display", d.fit("Arrival", W * 0.3, "Playfair Display", 110, 600, True), "#FFFFFF", weight=600, italic=True)
    p = lines(c["message"])
    d.line(x0, H * 0.16 + t["_h"] + 20, x0 + 60, H * 0.16 + t["_h"] + 20, "#C9A45A", 3)
    d.text(x0, H * 0.16 + t["_h"] + 50, W * 0.32, "\n".join(p), "Lora", 38, "#D6DEE8", italic=True, lh=1.4)
    d.text(x0, H * 0.78, W * 0.32, c["signature"], "Anton", 80, "#C9A45A")
    return {"layout": "product photo left, minimal NEW / Arrival stack with price right", "typography": "Montserrat caps, Playfair Display italic, Lora italic, Anton", "palette": "slate, gold, white", "decor": "half-bleed photo, gold rule"}


@design(10)
def product_story(d, c):
    W, H = d.W, d.H
    d.bg("#2B1A12")
    d.photo(425, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.55, focus=(0.5, 0.5))
    overlay(d, 0, 1, y0=H * 0.35, y1=H * 0.56, color="#2B1A12")
    d.art("hot-beverage", W / 2, H * 0.55, 300, shadow_=shadow("rgba(0,0,0,0.4)", 30, 0, 14))
    t, s = fitted(d, H * 0.66, "Meet our new blend", "Playfair Display", 110, "#F3E3CF", italic=True, weight=600)
    p = lines(c["message"])
    d.text(W * 0.1, H * 0.66 + s * 1.4, W * 0.8, "\n".join(p), "Lora", 52, "#D9C2A8", italic=True, align="center", lh=1.35)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 34, "#2B1A12", "#F3E3CF", spacing=160)
    return {"layout": "coffee-bean photo fading into a dark roast panel, cup and tasting notes", "typography": "Playfair Display italic, Lora italic, Montserrat", "palette": "espresso, crema, beans", "decor": "photo fade, cup illustration"}


@design(11)
def juice(d, c):
    W, H = d.W, d.H
    d.bg("#FFE29A")
    d.photo(76, W * 0.46, 60, W * 0.5, H - 120, frame="arch", focus=(0.5, 0.45))
    t = d.text(70, 100, W * 0.4, "Freshly\nsqueezed", "Pacifico", d.fit("squeezed", W * 0.38, "Pacifico", 110), "#E85D04", lh=1.05)
    y = 100 + t["_h"] + 40
    for k, it in enumerate(lines(c["message"])):
        d.circle(90, y + 26, 14, ["#F48C06", "#55A630", "#C9184A", "#7A3E2A"][k % 4])
        d.text(120, y, W * 0.32, it, "Fredoka", 46, "#3A2A10", weight=600)
        y += 80
    pill(d, W * 0.22, H * 0.9, c["signature"], "Fredoka", 34, "#FFFFFF", "#E85D04", weight=700, spacing=40, upper=False)
    return {"layout": "juice photo in a tall arch, handwritten title and colour-coded flavour list", "typography": "Pacifico, Fredoka", "palette": "mango yellow, orange, green, berry", "decor": "arch photo, colour dots"}


@design(12)
def beauty_launch(d, c):
    W, H = d.W, d.H
    d.bg("#2A0A12")
    d.photo(1011, -d.bleed, -d.bleed, W + 2 * d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
    overlay(d, 0.0, 0.85, y0=H * 0.45, y1=H, color="#2A0A12")
    t, s = fitted(d, H * 0.62, "Velvet Matte", "Playfair Display", 150, "#F7D9C4", italic=True, weight=600)
    p = lines(c["message"])
    d.text(0, H * 0.62 + s * 1.3, W, p[0], "Lora", 44, "#F3E3E3", italic=True, align="center")
    d.text(0, H * 0.62 + s * 1.3 + 64, W, p[1].upper(), "Montserrat", 32, "#E9C877", weight=800, align="center", spacing=400)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 32, "#2A0A12", "#F7D9C4", spacing=200)
    return {"layout": "full-bleed lipstick photo with a wine fade and italic product name", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "wine, blush, gold", "decor": "gradient shade"}


@design(13)
def just_listed(d, c):
    W, H = d.W, d.H
    d.bg("#F5F3EF")
    d.photo(1002, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.6, focus=(0.5, 0.5))
    d.rect(60, H * 0.06, 340, 90, "#C0392B")
    d.text(60, H * 0.06 + 18, 340, "JUST LISTED", "Montserrat", 36, "#FFFFFF", weight=800, align="center", spacing=200)
    p = lines(c["message"])
    d.text(70, H * 0.64, W - 140, p[0], "Playfair Display", 70, "#1E2A3A", weight=700)
    d.text(70, H * 0.64 + 96, W - 140, p[1], "Montserrat", 40, "#4A5568", weight=500)
    for k, (icon, val) in enumerate([("house", p[2]), ("money-bag", p[3])]):
        d.art(icon, 110 + k * 420, H * 0.84, 70)
        d.text(160 + k * 420, H * 0.84 - 26, 360, val, "Montserrat", 42, "#1E2A3A", weight=800)
    d.text(70, H * 0.93, W - 140, c["signature"], "Montserrat", 30, "#C0392B", weight=700)
    return {"layout": "interior photo with a JUST LISTED tag, property name, size and price row", "typography": "Playfair Display, Montserrat", "palette": "warm white, navy, red", "decor": "tag, icon row"}


@design(14)
def car_dealer(d, c):
    W, H = d.W, d.H
    d.bg("#0E1116")
    d.photo(1017, -d.bleed, H * 0.3, W + 2 * d.bleed, H * 0.5, focus=(0.5, 0.6))
    overlay(d, 1, 0, y0=H * 0.3, y1=H * 0.45, color="#0E1116")
    overlay(d, 0, 1, y0=H * 0.65, y1=H * 0.8, color="#0E1116")
    t, s = fitted(d, H * 0.06, "DRIVE IT HOME", "Anton", 200, "#FFFFFF")
    d.text(0, H * 0.06 + s * 1.1, W, c["message"], "Montserrat", 40, "#FFC300", weight=700, align="center")
    pill(d, W / 2, H * 0.88, c["signature"], "Montserrat", 36, "#0E1116", "#FFC300", spacing=200, upper=True)
    return {"layout": "car photo band between dark fades, condensed title and finance line", "typography": "Anton, Montserrat", "palette": "carbon black, amber", "decor": "photo band with fades"}


@design(15)
def interior(d, c):
    photo_promo(d, c, 1300, (0.5, 0.5), "#ECE7E0", "#3A332C", "#8A7A66", side="right")
    return {"layout": "calm interior photo right, italic headline and service line left", "typography": "Playfair Display italic, Montserrat", "palette": "greige, charcoal, taupe", "decor": "half-bleed photo"}


@design(16)
def new_menu(d, c):
    W, H = d.W, d.H
    d.bg("#1C1A17")
    d.photo(1178, 60, 60, W - 120, H * 0.58, frame="rounded", rx=24, focus=(0.4, 0.5))
    d.rect(80, 80, 300, 70, "#E9C877", rx=35)
    d.text(80, 98, 300, "NEW", "Montserrat", 30, "#1C1A17", weight=800, align="center", spacing=500)
    t, s = fitted(d, H * 0.66, "New on the menu", "Playfair Display", 100, "#F3E6CB", italic=True, weight=600)
    d.text(80, H * 0.66 + s * 1.35, W - 160, c["message"], "Lora", 42, "#C9B99A", italic=True, align="center")
    d.text(0, H * 0.92, W, c["signature"].upper(), "Montserrat", 28, "#E9C877", weight=700, align="center", spacing=300)
    return {"layout": "food photo with a NEW pill, italic headline and dish description", "typography": "Playfair Display italic, Lora italic, Montserrat caps", "palette": "charcoal, cream, gold", "decor": "rounded photo, NEW pill"}


# ---------------------------------------------------------------- engagement
@design(17)
def giveaway(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FF9A8B"), (1, "#FF6A88")]))
    d.confetti(0, 0, W, H, ["#FFFFFF", "#FFE14D", "#7B5CFF"], n=70, size=(8, 16), shapes=("strip", "circle", "star"), avoid=[(W * 0.08, H * 0.2, W * 0.92, H * 0.9)])
    d.art("wrapped-gift", W / 2, H * 0.28, 300, shadow_=shadow("rgba(0,0,0,0.2)", 30, 0, 14))
    t, s = fitted(d, H * 0.44, "GIVEAWAY", "Luckiest Guy", 220, "#FFFFFF", stroke="#7B1E3A", sw=6)
    p = lines(c["message"])
    d.text(0, H * 0.44 + s * 1.15, W, p[0], "Fredoka", 50, "#FFFFFF", weight=700, align="center")
    for k, step in enumerate(p[1:]):
        cx = W * (0.22 + k * 0.28)
        d.circle(cx, H * 0.8, 60, "#FFFFFF")
        d.text(cx - 60, H * 0.8 - 30, 120, str(k + 1), "Luckiest Guy", 60, "#FF6A88", align="center")
        d.text(cx - 140, H * 0.8 + 70, 280, step, "Fredoka", 38, "#FFFFFF", weight=700, align="center")
    d.text(0, H * 0.04, W, c["signature"].upper(), "Montserrat", 30, "#FFFFFF", weight=800, align="center", spacing=300)
    return {"layout": "gift and giant title with three numbered entry steps", "typography": "Luckiest Guy outlined, Fredoka, Montserrat caps", "palette": "coral to pink, white, violet", "decor": "confetti, gift, step circles"}


@design(18)
def this_or_that(d, c):
    W, H = d.W, d.H
    b = d.bleed
    d.bg("#6F4E37")
    d.rect(-b, H / 2, W + 2 * b, H / 2 + b, "#7FB069")
    d.art("hot-beverage", W / 2, H * 0.24, 360)
    d.art("teacup-without-handle", W / 2, H * 0.7, 360)
    opts = lines(c["message"])
    d.text(0, H * 0.34, W, opts[0].upper(), "Anton", 90, "#FFFFFF", align="center")
    d.text(0, H * 0.86, W, opts[1].upper(), "Anton", 90, "#FFFFFF", align="center")
    d.circle(W / 2, H / 2, 110, "#FFFFFF", shadow_=shadow("rgba(0,0,0,0.25)", 30, 0, 10))
    d.text(W / 2 - 110, H / 2 - 44, 220, "OR", "Anton", 80, "#2A2A2A", align="center")
    t, s = fitted(d, H * 0.04, c["headline"], "Pacifico", 120, "#FFFFFF")
    pill(d, W / 2, H * 0.96, c["signature"], "Fredoka", 36, "#2A2A2A", "#FFFFFF", weight=700, spacing=40, upper=False)
    return {"layout": "split story: coffee above, tea below, OR disc in the middle", "typography": "Pacifico, Anton, Fredoka", "palette": "coffee brown, matcha green, white", "decor": "split halves, OR disc"}


@design(19)
def ama(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, 0, H, [(0, "#FFDEE9"), (1, "#B5FFFC")]))
    t, s = fitted(d, H * 0.12, "Ask me\nanything", "Playfair Display", 200, "#2A2A2A", weight=700, italic=True, lh=1.0)
    d.text(0, H * 0.12 + t["_h"] + 30, W, c["message"], "DM Sans", 48, "#4A4A4A", weight=500, align="center")
    d.rect(W * 0.1, H * 0.5, W * 0.8, 360, "#FFFFFF", rx=40, shadow_=shadow("rgba(0,0,0,0.1)", 30, 0, 10))
    d.text(W * 0.1, H * 0.5 + 60, W * 0.8, "Type your question…", "DM Sans", 46, "#B0B0B0", align="center")
    d.rect(W * 0.3, H * 0.5 + 220, W * 0.4, 90, lin(0, 0, W * 0.4, 0, [(0, "#FF6FB5"), (1, "#7B5CFF")]), rx=45)
    d.text(W * 0.3, H * 0.5 + 244, W * 0.4, "SEND", "DM Sans", 40, "#FFFFFF", weight=800, align="center", spacing=200)
    d.text(0, H * 0.84, W, c["signature"], "Caveat", 70, "#2A2A2A", weight=700, align="center")
    d.art("speech-balloon" if False else "sparkles", W * 0.84, H * 0.1, 140)
    return {"layout": "big italic prompt above a question-box mock-up", "typography": "Playfair Display italic, DM Sans, Caveat", "palette": "pink to aqua, charcoal", "decor": "question card, gradient button, sparkles"}


@design(20)
def review(d, c):
    W, H = d.W, d.H
    d.bg("#FFF8EE")
    d.art("croissant", W * 0.84, H * 0.16, 200, angle=15)
    for k in range(5):
        d.star(W * 0.14 + k * 90, H * 0.14, 38, "#F2B84B")
    d.text(W * 0.1, H * 0.2, 200, "“", "Playfair Display", 300, "#E3C08F")
    t = d.text(W * 0.1, H * 0.34, W * 0.8, c["message"].strip("“”"), "Playfair Display", 70, "#3A2418", italic=True, weight=500, lh=1.2)
    d.line(W * 0.1, H * 0.34 + t["_h"] + 40, W * 0.22, H * 0.34 + t["_h"] + 40, "#B5523B", 4)
    d.text(W * 0.1, H * 0.34 + t["_h"] + 70, W * 0.8, c["signature"], "Montserrat", 36, "#6E4A38", weight=700)
    return {"layout": "five stars, oversized quote mark and customer quote", "typography": "Playfair Display italic, Montserrat", "palette": "butter cream, cocoa, gold", "decor": "stars, quote mark, croissant"}


@design(21)
def quote_day(d, c):
    W, H = d.W, d.H
    d.bg("#1E3D59")
    d.circle(W * 0.92, H * 0.9, 170, "#FF6E40", opacity=0.9)
    d.circle(W * 0.72, H * 0.98, 90, "#FFC13B", opacity=0.9)
    d.text(80, 120, W - 160, "QUOTE OF THE DAY", "Montserrat", 32, "#FFC13B", weight=800, spacing=500)
    t = d.text(80, 220, W - 200, c["message"], "Playfair Display", 108, "#F5F0E1", italic=True, weight=600, lh=1.12)
    d.line(80, 220 + t["_h"] + 40, 220, 220 + t["_h"] + 40, "#FF6E40", 5)
    return {"layout": "label, large italic quote, short accent rule with two colour discs", "typography": "Montserrat caps, Playfair Display italic", "palette": "navy, cream, tangerine, sunflower", "decor": "two circles, rule"}


@design(22)
def tips_cover(d, c):
    W, H = d.W, d.H
    d.bg("#E8EEF8")
    d.art("crescent-moon", W * 0.8, H * 0.24, 260)
    for k in range(6):
        d.circle(W * (0.6 + k * 0.06), H * (0.1 + (k % 2) * 0.05), 4, "#7A8BB8")
    t, s = fitted(d, H * 0.36, "5 tips for\nbetter sleep", "Outfit", 150, "#1B2559", w=0.84, weight=800, align="left", x=80, lh=1.0)
    d.text(80, H * 0.36 + t["_h"] + 30, W - 160, c["message"], "DM Sans", 44, "#4A5A88", weight=500)
    d.text(80, H * 0.9, W * 0.5, c["signature"], "DM Sans", 34, "#1B2559", weight=700)
    d.rect(W - 280, H * 0.88, 200, 80, "#1B2559", rx=40)
    d.text(W - 280, H * 0.88 + 18, 200, "SWIPE →", "DM Sans", 32, "#FFFFFF", weight=800, align="center")
    return {"layout": "carousel cover: moon illustration, big two-line title, swipe button", "typography": "Outfit ExtraBold, DM Sans", "palette": "mist blue, navy", "decor": "moon, dots, swipe pill"}


@design(23)
def follow_us(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#FEDA75"), (0.3, "#FA7E1E"), (0.6, "#D62976"), (1, "#4F5BD5")]))
    d.rect(W * 0.1, H * 0.14, W * 0.8, H * 0.72, "#FFFFFF", rx=60, shadow_=shadow("rgba(0,0,0,0.2)", 40, 0, 16))
    d.circle(W / 2, H * 0.3, 110, "", stroke=lin(0, 0, 220, 220, [(0, "#FA7E1E"), (1, "#D62976")]), sw=10)
    d.art("sparkles", W / 2, H * 0.3, 150)
    t, s = fitted(d, H * 0.43, "Follow us!", "Pacifico", 130, "#D62976", w=0.66)
    d.text(W * 0.16, H * 0.43 + s * 1.5, W * 0.68, c["message"], "DM Sans", 42, "#3A3A3A", weight=500, align="center", lh=1.35)
    d.rect(W * 0.25, H * 0.74, W * 0.5, 90, "#2A2A2A", rx=45)
    d.text(W * 0.25, H * 0.74 + 22, W * 0.5, c["signature"], "DM Sans", 40, "#FFFFFF", weight=800, align="center")
    return {"layout": "profile-style card with a ringed avatar, script call and handle button", "typography": "Pacifico, DM Sans", "palette": "sunset gradient, white, charcoal", "decor": "gradient ring, card shadow"}


@design(24)
def countdown(d, c):
    W, H = d.W, d.H
    d.bg("#111111")
    d.rect(W * 0.1, H * 0.22, W * 0.8, H * 0.36, "#FF2E63", rx=60)
    d.text(W * 0.1, H * 0.22, W * 0.8, "2", "Anton", 520, "#FFFFFF", align="center", lh=1.1)
    d.text(0, H * 0.62, W, "DAYS LEFT", "Anton", 140, "#FFFFFF", align="center")
    d.text(W * 0.1, H * 0.72, W * 0.8, c["message"], "DM Sans", 50, "#BDBDBD", weight=600, align="center")
    d.art("alarm-clock", W * 0.84, H * 0.18, 200, angle=12)
    pill(d, W / 2, H * 0.88, c["signature"], "DM Sans", 38, "#111111", "#FFFFFF", weight=800, spacing=40, upper=False)
    return {"layout": "huge number in a pink tile, DAYS LEFT and reminder pill", "typography": "Anton, DM Sans", "palette": "black, hot pink, white", "decor": "tile, alarm clock"}


# ---------------------------------------------------------------- brand
@design(25)
def coming_soon(d, c):
    W, H = d.W, d.H
    d.bg("#EFE6DA")
    d.circle(W / 2, H * 0.42, W * 0.34, "", stroke="#2B1A12", sw=2)
    d.circle(W / 2, H * 0.42, W * 0.3, "", stroke="#2B1A12", sw=1, dash=[3, 8])
    d.art("hot-beverage", W / 2, H * 0.38, 260)
    for k in range(3):
        x = W * (0.44 + k * 0.06)
        d.path([["M", x, H * 0.26], ["C", x - 14, H * 0.22, x + 14, H * 0.19, x, H * 0.15]], fill="", stroke="#2B1A12", sw=4)
    t, s = fitted(d, H * 0.58, "coming soon", "Playfair Display", 130, "#2B1A12", italic=True)
    d.text(0, H * 0.58 + s * 1.3, W, c["message"], "Lora", 44, "#6E4A38", italic=True, align="center")
    d.text(0, H * 0.9, W, c["signature"], "Montserrat", 32, "#2B1A12", weight=700, align="center", spacing=300)
    return {"layout": "steaming cup in concentric rings above a lowercase italic teaser", "typography": "Playfair Display italic, Lora italic, Montserrat", "palette": "oat, espresso", "decor": "rings, steam curls"}


@design(26)
def were_open(d, c):
    W, H = d.W, d.H
    d.bg("#2E7D5B")
    d.rect(W * 0.18, H * 0.16, W * 0.64, H * 0.4, "#FFF6E0", rx=30, angle=-4, origin_center=False, shadow_=shadow("rgba(0,0,0,0.25)", 30, 0, 14))
    d.line(W * 0.36, H * 0.04, W * 0.3, H * 0.16, "#FFF6E0", 4)
    d.line(W * 0.64, H * 0.04, W * 0.7, H * 0.16, "#FFF6E0", 4)
    d.circle(W / 2, H * 0.04, 14, "#FFF6E0")
    t, s = fitted(d, H * 0.24, "We’re open!", "Pacifico", 140, "#2E7D5B", w=0.56)
    p = lines(c["message"])
    d.text(0, H * 0.64, W, p[0].upper(), "Montserrat", 50, "#FFF6E0", weight=800, align="center", spacing=200)
    d.text(0, H * 0.64 + 80, W, p[1], "Anton", 90, "#FFE14D", align="center")
    d.text(0, H * 0.64 + 200, W, p[2], "Montserrat", 40, "#DDEFE5", weight=600, align="center")
    d.text(0, H * 0.92, W, c["signature"], "Caveat", 60, "#FFF6E0", weight=700, align="center")
    return {"layout": "hanging shop sign with script ‘We’re open!’, hours below", "typography": "Pacifico, Montserrat caps, Anton, Caveat", "palette": "shop green, cream, yellow", "decor": "hanging sign with strings"}


@design(27)
def hiring(d, c):
    W, H = d.W, d.H
    d.bg("#FFE14D")
    t, s = fitted(d, H * 0.08, "WE’RE\nHIRING", "Anton", 240, "#111111", w=0.6, align="left", x=W * 0.08, lh=0.88)
    d.art("hot-beverage", W * 0.8, H * 0.32, 260, angle=12)
    p = lines(c["message"])
    d.rect(W * 0.08, H * 0.6, W * 0.84, H * 0.22, "#111111", rx=24)
    d.text(W * 0.12, H * 0.63, W * 0.76, p[0], "Anton", 100, "#FFE14D")
    d.text(W * 0.12, H * 0.63 + 130, W * 0.76, "  ·  ".join(p[1:]), "Montserrat", 40, "#FFFFFF", weight=700)
    d.text(W * 0.08, H * 0.88, W * 0.84, c["signature"], "Montserrat", 36, "#111111", weight=800)
    return {"layout": "giant WE'RE HIRING with a black role card", "typography": "Anton, Montserrat", "palette": "yellow, black, white", "decor": "role card, cup illustration"}


@design(28)
def meet_team(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE6")
    d.photo(1289, 80, 80, W * 0.5, H * 0.62, frame="arch", focus=(0.5, 0.4))
    x0 = W * 0.6
    d.text(x0, 120, W * 0.34, "MEET THE TEAM", "Montserrat", 24, "#B5523B", weight=800, spacing=200)
    p = c["message"].split(" — ")
    who = p[0].split(" · ")
    t = d.text(x0, 180, W * 0.34, who[0], "Playfair Display", d.fit(who[0], W * 0.34, "Playfair Display", 120, 700), "#2A2A2A", weight=700)
    d.text(x0, 180 + t["_h"] + 10, W * 0.34, who[1], "Montserrat", 40, "#6A6058", weight=600)
    d.line(x0, H * 0.48, x0 + 80, H * 0.48, "#B5523B", 4)
    d.text(x0, H * 0.52, W * 0.34, p[1].capitalize() if len(p) > 1 else "", "Lora", 44, "#3A3A3A", italic=True, lh=1.35)
    d.text(80, H * 0.82, W - 160, "“I love seeing guests take that first bite.”", "Playfair Display", 52, "#2A2A2A", italic=True)
    return {"layout": "staff portrait in an arch, name, role and a short quote", "typography": "Playfair Display, Montserrat, Lora italic", "palette": "linen, charcoal, terracotta", "decor": "arch photo, rule"}


@design(29)
def bts_story(d, c):
    W, H = d.W, d.H
    d.bg("#FFF4EC")
    d.photo(1713, 60, 220, W - 120, H * 0.48, frame="rounded", rx=40, focus=(0.5, 0.5))
    d.photo(1217, W * 0.42, H * 0.5, W * 0.48, H * 0.3, frame="rounded", rx=30, focus=(0.5, 0.4), shadow_=shadow("rgba(0,0,0,0.2)", 30, 0, 12))
    d.text(80, 100, W - 160, "BEHIND THE SCENES", "Montserrat", 40, "#B5523B", weight=800, spacing=300)
    t = d.text(80, H * 0.62, W * 0.34, "made\nby hand", "Playfair Display", d.fit("by hand", W * 0.32, "Playfair Display", 110, 700, True), "#3A2418", weight=700, italic=True, lh=1.0)
    d.text(80, H * 0.86, W - 160, c["message"], "Lora", 46, "#6E4A38", italic=True, lh=1.35)
    return {"layout": "two overlapping bakery photos with a handwritten-feel title", "typography": "Montserrat caps, Playfair Display italic, Lora italic", "palette": "peach cream, cocoa, terracotta", "decor": "overlapping rounded photos"}


@design(30)
def one_year(d, c):
    W, H = d.W, d.H
    d.bg("#2B1A12")
    d.confetti(0, 0, W, H * 0.45, ["#F3D58A", "#E3A07A", "#FFFFFF"], n=60, size=(6, 14), shapes=("strip", "circle"))
    t = d.text(0, H * 0.14, W, "1", "Playfair Display", 420, "#F3D58A", weight=700, align="center", lh=0.9)
    text_metal(d, t)
    d.text(0, H * 0.52, W, "YEAR!", "Anton", 120, "#FFFFFF", align="center")
    d.text(W * 0.12, H * 0.66, W * 0.76, c["message"], "Lora", 46, "#E3D2C0", italic=True, align="center", lh=1.35)
    d.text(0, H * 0.88, W, c["signature"].upper(), "Montserrat", 32, "#F3D58A", weight=800, align="center", spacing=400)
    return {"layout": "gold 1 in confetti with YEAR! and a thank-you line", "typography": "Playfair Display gold, Anton, Lora italic, Montserrat caps", "palette": "espresso, gold, cream", "decor": "confetti"}


@design(31)
def podcast(d, c):
    W, H = d.W, d.H
    d.bg("#121212")
    for k in range(40):
        h = 40 + 160 * abs(math.sin(k * 0.6)) * (0.5 + 0.5 * math.sin(k * 0.21))
        d.rect(W * 0.1 + k * (W * 0.8 / 40), H * 0.72 - h / 2, W * 0.8 / 40 - 6, h, "#1DB954", rx=4)
    d.art("microphone", W * 0.82, H * 0.2, 260)
    d.text(80, 100, W * 0.6, "NEW EPISODE", "Montserrat", 34, "#1DB954", weight=800, spacing=400)
    p = lines(c["message"])
    d.text(80, 170, W * 0.6, p[0], "Anton", 120, "#FFFFFF")
    t = d.text(80, 320, W * 0.6, p[1], "Playfair Display", 70, "#FFFFFF", weight=700, italic=True, lh=1.1)
    d.text(80, 320 + t["_h"] + 20, W * 0.6, p[2], "Montserrat", 38, "#BDBDBD", weight=600)
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 32, "#121212", "#1DB954", spacing=120, upper=False)
    return {"layout": "episode number and title with a waveform and microphone", "typography": "Anton, Playfair Display italic, Montserrat", "palette": "black, green, white", "decor": "audio waveform bars, microphone"}


@design(32)
def blog_promo(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.photo(1002, 0, 0, W, H * 0.5, focus=(0.5, 0.5))
    d.rect(80, H * 0.42, W - 160, H * 0.48, "#FFFFFF", rx=20, shadow_=shadow("rgba(0,0,0,0.12)", 40, 0, 14))
    d.text(130, H * 0.42 + 50, W - 260, "NEW ON THE BLOG", "Montserrat", 30, "#C26A4A", weight=800, spacing=400)
    t = d.text(130, H * 0.42 + 110, W - 260, c["message"], "Playfair Display", 72, "#1E1E1E", weight=700, lh=1.15)
    d.text(130, H * 0.42 + 130 + t["_h"], W - 260, c["signature"], "Montserrat", 34, "#6A6A6A", weight=600)
    return {"layout": "interior photo with an article card overlapping it", "typography": "Montserrat caps, Playfair Display, Montserrat", "palette": "white, charcoal, clay", "decor": "card with shadow"}


@design(33)
def before_after(d, c):
    W, H = d.W, d.H
    d.bg("#F4F1EC")
    d.photo(1300, 40, 160, W / 2 - 50, H * 0.62, focus=(0.4, 0.5), filters=[{"type": "Grayscale", "mode": "average"}])
    d.photo(1002, W / 2 + 10, 160, W / 2 - 50, H * 0.62, focus=(0.4, 0.5))
    for x, lab in [(40, "BEFORE"), (W / 2 + 10, "AFTER")]:
        d.rect(x + 20, 180, 200, 60, "#1E1E1E", rx=30)
        d.text(x + 20, 194, 200, lab, "Montserrat", 26, "#FFFFFF", weight=800, align="center", spacing=300)
    d.circle(W / 2 - 20, 160 + H * 0.31, 50, "#FFFFFF", shadow_=shadow("rgba(0,0,0,0.2)", 20, 0, 6))
    d.text(W / 2 - 70, 160 + H * 0.31 - 34, 100, "→", "DM Sans", 60, "#1E1E1E", weight=800, align="center")
    d.text(40, 50, W - 80, c["message"], "Playfair Display", 70, "#1E1E1E", italic=True, weight=600)
    d.text(40, H * 0.88, W - 80, c["signature"], "Montserrat", 34, "#6A6A6A", weight=700, align="center")
    return {"layout": "side-by-side before (greyscale) and after photos with labels and an arrow", "typography": "Playfair Display italic, Montserrat", "palette": "warm white, charcoal", "decor": "label pills, arrow disc, greyscale filter"}


# ---------------------------------------------------------------- wellness
@design(34)
def gym(d, c):
    W, H = d.W, d.H
    d.bg("#0A0A0A")
    d.photo(1621, W * 0.3, -d.bleed, W * 0.7 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
    d.polygon([(-d.bleed, -d.bleed), (W * 0.56, -d.bleed), (W * 0.36, H + d.bleed), (-d.bleed, H + d.bleed)], "#0A0A0A")
    t = d.text(60, 100, W * 0.46, "NO\nEXCUSES", "Anton", d.fit("EXCUSES", W * 0.44, "Anton", 300), "#D4FF3A", lh=0.9)
    p = lines(c["message"])
    d.text(60, 100 + t["_h"] + 40, W * 0.4, "\n".join(p).upper(), "Montserrat", 40, "#FFFFFF", weight=800, lh=1.5)
    d.text(60, H * 0.9, W * 0.4, c["signature"].upper(), "Montserrat", 30, "#D4FF3A", weight=800, spacing=300)
    return {"layout": "diagonal black slab over a workout photo with a lime headline", "typography": "Anton, Montserrat caps", "palette": "black, lime, white", "decor": "angled panel, photo"}


@design(35)
def yoga_studio(d, c):
    photo_promo(d, c, 686, (0.5, 0.45), "#EEF2EC", "#2F4A3A", "#5E8C6A")
    return {"layout": "rounded yoga photo with an italic headline and class details", "typography": "Playfair Display italic, Montserrat", "palette": "sage mist, forest, leaf", "decor": "rounded photo, pill"}


@design(36)
def recipe(d, c):
    W, H = d.W, d.H
    d.bg("#F3F6EA")
    d.photo(57, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.56, focus=(0.5, 0.5))
    d.rect(80, H * 0.5, W - 160, H * 0.42, "#FFFFFF", rx=30, shadow_=shadow("rgba(0,0,0,0.1)", 30, 0, 10))
    t = d.text(120, H * 0.5 + 50, W - 240, c["headline"], "Playfair Display", d.fit(c["headline"], W - 260, "Playfair Display", 90, 700, True), "#3A5A2A", weight=700, italic=True)
    d.text(120, H * 0.5 + 70 + t["_h"], W - 240, c["message"], "Lora", 42, "#4E5F45", italic=True)
    for k, (ic, lab) in enumerate([("alarm-clock", "10 min"), ("leafy-green", "Vegan"), ("fork-and-knife-with-plate", "Serves 2")]):
        x = 120 + k * 290
        d.art(ic, x + 40, H * 0.82, 70)
        d.text(x + 90, H * 0.82 - 22, 200, lab, "Montserrat", 36, "#3A5A2A", weight=700)
    d.text(0, H * 0.95, W, c["signature"], "Montserrat", 28, "#6A7A5A", weight=600, align="center")
    return {"layout": "avocado photo with a recipe card: title, line and three quick facts", "typography": "Playfair Display italic, Lora italic, Montserrat", "palette": "avocado green, cream, white", "decor": "card with shadow, icon row"}


@design(37)
def salon(d, c):
    W, H = d.W, d.H
    d.bg("#F8E8E4")
    d.photo(1331, 80, 160, W - 160, H * 0.56, frame="arch", focus=(0.5, 0.3))
    d.art("sparkles", W * 0.86, H * 0.1, 180)
    t, s = fitted(d, H * 0.66, "Glow up Tuesday", "Great Vibes", 180, "#A65A4C")
    d.text(0, H * 0.66 + s * 1.3, W, c["message"], "Montserrat", 50, "#5A3A35", weight=700, align="center")
    pill(d, W / 2, H * 0.9, c["signature"], "Montserrat", 38, "#FFFFFF", "#A65A4C", spacing=300)
    return {"layout": "portrait in a tall arch with sparkles, script offer title", "typography": "Great Vibes, Montserrat", "palette": "blush, terracotta rose, cocoa", "decor": "arch photo, sparkles"}


# ---------------------------------------------------------------- promotional
@design(38)
def loyalty(d, c):
    W, H = d.W, d.H
    d.bg("#6B3A1E")
    d.rect(W * 0.1, H * 0.3, W * 0.8, H * 0.46, "#FBF3E8", rx=30, shadow_=shadow("rgba(0,0,0,0.3)", 30, 0, 14), name="Card")
    d.text(W * 0.14, H * 0.33, W * 0.72, c["signature"].upper(), "Montserrat", 32, "#6B3A1E", weight=800, spacing=300)
    for k in range(10):
        cx = W * (0.2 + (k % 5) * 0.15)
        cy = H * (0.46 + (k // 5) * 0.15)
        d.circle(cx, cy, 52, "" if k < 9 else "#B5523B", stroke="#6B3A1E", sw=3)
        if k < 6:
            d.art("hot-beverage", cx, cy, 70)
        if k == 9:
            d.text(cx - 52, cy - 22, 104, "FREE", "Montserrat", 28, "#FFFFFF", weight=800, align="center")
    t, s = fitted(d, H * 0.08, "Buy 9, get the 10th free", "Pacifico", 100, "#FBF3E8")
    d.text(0, H * 0.84, W, c["message"], "Montserrat", 38, "#F3E3CF", weight=600, align="center")
    return {"layout": "coffee stamp card with ten slots (six stamped, the tenth free)", "typography": "Pacifico, Montserrat", "palette": "coffee brown, cream, terracotta", "decor": "stamp card, cup stamps"}


@design(39)
def app_launch(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#7B5CFF"), (1, "#00C2A8")]))
    px, py, pw, ph = W * 0.54, H * 0.12, W * 0.38, H * 0.8
    d.rect(px, py, pw, ph, "#111111", rx=60, shadow_=shadow("rgba(0,0,0,0.35)", 40, 0, 20), name="Phone")
    d.rect(px + 16, py + 16, pw - 32, ph - 32, "#FFF6EE", rx=46)
    d.rect(px + pw / 2 - 60, py + 30, 120, 26, "#111111", rx=13)
    d.art("hot-beverage", px + pw / 2, py + ph * 0.3, pw * 0.5)
    d.text(px + 30, py + ph * 0.5, pw - 60, "Order ahead", "Fredoka", 46, "#6B3A1E", weight=700, align="center")
    d.rect(px + 50, py + ph * 0.64, pw - 100, 80, "#6B3A1E", rx=40)
    d.text(px + 50, py + ph * 0.64 + 20, pw - 100, "Pick up in 5 min", "Fredoka", 32, "#FFFFFF", weight=600, align="center")
    t = d.text(70, H * 0.16, W * 0.44, "Our app\nis here", "Outfit", d.fit("Our app", W * 0.42, "Outfit", 160, 800), "#FFFFFF", weight=800, lh=1.0)
    d.text(70, H * 0.16 + t["_h"] + 30, W * 0.42, c["message"], "DM Sans", 42, "#F0F0FF", weight=500, lh=1.35)
    pill(d, 70 + 180, H * 0.82, c["signature"], "DM Sans", 36, "#111111", "#FFFFFF", weight=800, spacing=40, upper=False)
    return {"layout": "phone mock-up showing the app beside a bold announcement", "typography": "Outfit ExtraBold, DM Sans, Fredoka", "palette": "violet to teal, white, coffee", "decor": "vector phone with screen UI"}


@design(40)
def travel_deal(d, c):
    W, H = d.W, d.H
    d.bg("#1F4E8C")
    d.photo(1862, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.56, focus=(0.5, 0.35))
    d.wave(-d.bleed, W + d.bleed, H * 0.54, 16, 300, fill="#1F4E8C", bottom=H + d.bleed)
    t, s = fitted(d, H * 0.59, "Escape to Santorini", "Playfair Display", 100, "#FFFFFF", weight=700, italic=True)
    p = lines(c["message"])
    d.text(0, H * 0.59 + s * 1.35, W, f"{p[0]}  ·  {p[1]}", "Montserrat", 40, "#CFE0F5", weight=600, align="center")
    d.text(0, H * 0.59 + s * 1.35 + 70, W, p[2].upper(), "Anton", 70, "#FFD54F", align="center")
    pill(d, W / 2, H * 0.93, c["signature"], "Montserrat", 30, "#1F4E8C", "#FFFFFF", spacing=200)
    d.art("airplane", W * 0.86, H * 0.1, 160, angle=-15)
    return {"layout": "destination photo with a wave cut, italic destination and price", "typography": "Playfair Display italic, Montserrat, Anton", "palette": "Aegean blue, white, sun yellow", "decor": "wave edge, plane"}
