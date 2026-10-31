"""Content, layout and photos for the Studio collection (Nov 2026).

Original layouts and wording: trends (clean grids, big type, soft
palettes, shaped photo frames, carousel tips) are followed, no design is
copied. Photos are CC0 (docs/photo-credits.md)."""

from pro_spec import PAL as BASE

PAL = dict(BASE)
PAL.update({
    "lilac": dict(bg="#F3EFFA", ink="#2A1E45", accent="#7C5CC4", panel="#2A1E45", on_panel="#F3EFFA", cta_bg="#7C5CC4", cta_fg="#FFFFFF", card="#FFFFFF"),
    "ocean": dict(bg="#EEF5F8", ink="#0E2A3A", accent="#1F7A9C", panel="#0E2A3A", on_panel="#EEF5F8", cta_bg="#1F7A9C", cta_fg="#FFFFFF", card="#FFFFFF"),
    "olive": dict(bg="#F2F0E6", ink="#2E3020", accent="#7A7F3A", panel="#2E3020", on_panel="#F2F0E6", cta_bg="#7A7F3A", cta_fg="#FFFFFF", card="#FFFFFF"),
    "midnight": dict(bg="#0F1220", ink="#F2F2F7", accent="#F4B860", panel="#1B2036", on_panel="#F2F2F7", cta_bg="#F4B860", cta_fg="#0F1220", card="#1B2036"),
    "peach": dict(bg="#FFF1EA", ink="#3A2320", accent="#F08A5D", panel="#3A2320", on_panel="#FFF1EA", cta_bg="#F08A5D", cta_fg="#FFFFFF", card="#FFFFFF"),
    "forest": dict(bg="#EDF2EC", ink="#173326", accent="#2F7D55", panel="#173326", on_panel="#EDF2EC", cta_bg="#2F7D55", cta_fg="#FFFFFF", card="#FFFFFF"),
    "mono": dict(bg="#F4F4F2", ink="#111111", accent="#111111", panel="#111111", on_panel="#F4F4F2", cta_bg="#111111", cta_fg="#FFFFFF", card="#FFFFFF"),
    "saffron": dict(bg="#FFF7E8", ink="#3B2410", accent="#E07B12", panel="#7A1F1F", on_panel="#FFF7E8", cta_bg="#7A1F1F", cta_fg="#FFF7E8", card="#FFFFFF"),
    "rose": dict(bg="#FDF0F2", ink="#3D1D26", accent="#C2546E", panel="#3D1D26", on_panel="#FDF0F2", cta_bg="#C2546E", cta_fg="#FFFFFF", card="#FFFFFF"),
    "teal": dict(bg="#ECF6F5", ink="#0F302E", accent="#13877D", panel="#0F302E", on_panel="#ECF6F5", cta_bg="#13877D", cta_fg="#FFFFFF", card="#FFFFFF"),
})
for k, v in PAL.items():
    v.setdefault("card", "#FFFFFF")

POST, SQ, STORY, CARD, A4, LAND = (1080, 1350), (1080, 1080), (1080, 1920), (480, 673), (794, 1123), (1123, 794)
FB, LI, WEB, BILL, ALBUM, HALF = (1200, 628), (1584, 396), (1500, 500), (2400, 800), (1200, 900), (794, 560)

S = []


def add(title, cat, sub, size, arch, pair, pal, c, opts=None, kw=""):
    S.append(dict(title=title, cat=cat, sub=sub, size=size, pages=[(arch, pair, c, opts or {})], pal=pal, kw=kw))


def book(title, cat, sub, size, pal, pages, kw=""):
    S.append(dict(title=title, cat=cat, sub=sub, size=size, pages=pages, pal=pal, kw=kw))


# ================================================================ social media
add("Quiet Confidence Quote Post", "Social Media", "Instagram", POST, "quote", "display", "sand",
    dict(title="Small steps every day still add up to a big change.", author="Your brand name", handle="@yourhandle"), kw="quote post, motivational quote, instagram")
add("Bold Lilac Quote Post", "Social Media", "Instagram", SQ, "quote", "grotesk", "lilac",
    dict(title="Design is how it works, not only how it looks.", author="Studio notes", handle="@yourstudio"), opts=dict(title_size=92), kw="quote post, design quote, square")
add("Coffee Morning Quote Photo Post", "Social Media", "Instagram", POST, "quote", "editorial", "noir",
    dict(photo="coffee2", title="Slow mornings make for better ideas.", author="Café Aroma", handle="@cafearoma"), opts=dict(photo_bg=True), kw="quote, coffee, cafe instagram")
add("Founder Thought Quote Story", "Social Media", "Instagram", STORY, "quote", "classic", "forest",
    dict(title="Build something people would miss if it disappeared tomorrow.", author="Tony Aloysius, Founder", handle="@magicaltouchdesign"), opts=dict(title_size=104), kw="founder quote, story, linkedin quote")
add("Five Tips Carousel Cover", "Social Media", "Instagram", POST, "tips", "grotesk", "ocean",
    dict(kicker="Save this for later", title="5 ways to make your posts look professional", items=[("Pick two fonts", "One for headlines, one for text."), ("Use three colours", "A main colour, an accent and a neutral."), ("Leave space", "Empty space makes the message clear."), ("Align everything", "Edges and centres should line up."), ("One message per post", "Say one thing — and say it big.")], handle="@yourhandle", swipe="Swipe"), kw="tips carousel, instagram carousel, design tips")
add("Healthy Habits Tips Post", "Social Media", "Instagram", POST, "tips", "friendly", "mint",
    dict(kicker="Wellness Wednesday", title="4 habits for a calmer week", items=[("Drink water first", "Before tea or coffee."), ("Walk after lunch", "Ten minutes is enough."), ("Plan tomorrow tonight", "Three tasks, no more."), ("Screens off by 10", "Sleep comes easier.")], handle="@wellnesswithmira"), kw="tips post, wellness, health instagram")
add("Small Business Tips Post", "Social Media", "Instagram", SQ, "tips", "oswald", "saffron",
    dict(kicker="For small business owners", title="3 quick wins for your shop", items=[("Reply within an hour", ""), ("Post your best seller weekly", ""), ("Ask every customer for a review", "")], handle="@yourshop"), opts=dict(title_size=86), kw="small business tips, shop, marketing post")
add("Money Saving Tips Story", "Social Media", "Instagram", STORY, "tips", "modern", "teal",
    dict(kicker="Money matters", title="6 easy ways to save this month", items=[("Cook at home twice more", ""), ("Cancel one subscription", ""), ("Use a shopping list", ""), ("Wait 24 hours to buy", ""), ("Set up an auto-transfer", ""), ("Compare before you pay", "")], handle="@smartmoneydaily"), kw="tips story, finance, saving money")
add("New Collection Launch Post", "Social Media", "Instagram", POST, "split", "display", "rose",
    dict(photo="x_rack", kicker="New arrivals", title="The autumn edit is here", sub="Soft knits, easy layers and colours you'll wear all season.", cta="Shop now"), opts=dict(ratio=0.55), kw="fashion launch post, new collection, boutique instagram")
add("Midnight Grand Opening Post", "Social Media", "Instagram", SQ, "hero_center", "luxe", "midnight",
    dict(photo="storefront", kicker="We're open", title="Grand Opening", sub="Join us this Saturday for flowers, coffee and 20% off everything.", details=["Saturday · 10 AM", "MG Road, Bengaluru"]), opts=dict(title_size=150), kw="grand opening, shop opening, announcement")
add("We Are Hiring Clean Post", "Social Media", "Instagram", POST, "shape", "grotesk", "cobalt",
    dict(photo="x_team2", kicker="Join our team", title="We're hiring a Marketing Lead", sub="Full-time · Chennai or remote. Help us grow a brand people love.", cta="Apply today", details=[]), opts=dict(kind="rounded", title_size=96), kw="hiring post, job vacancy, we are hiring")
add("Peach Customer Review Post", "Social Media", "Instagram", SQ, "quote", "modern", "peach",
    dict(title="Fast delivery, beautiful packaging and the cake tasted even better than it looked!", author="★★★★★  Priya S., Coimbatore", handle="@sweetcrumbsbakery"), opts=dict(title_size=80), kw="customer review post, testimonial, bakery")

# ================================================================ photo collage
add("Summer Memories Photo Collage", "Photo Collage", None, POST, "grid", "hand", "sand",
    dict(photos=["x_beach3", "travel2", "ocean", "x_friends2"], accent="summer", title="Memories made together", sub="Goa · June 2026"), opts=dict(layout="4"), kw="photo collage, summer, beach, memories")
add("Family Moments 6 Photo Collage", "Photo Collage", None, SQ, "grid", "soft", "blush",
    dict(photos=["family", "x_family2", "picnic", "motherchild", "fatherson", "x_family3"], title="Our little world", sub="The Menon family · 2026"), opts=dict(layout="6", band_h=0.2), kw="family photo collage, 6 photos")
add("Travel Diary 5 Photo Collage", "Photo Collage", None, POST, "grid", "grotesk", "mono",
    dict(photos=["travel3", "mountains", "x_mount2", "travel", "x_city2"], kicker="Travel diary", title="Kashmir to Kerala", sub="Twelve days, five cities"), opts=dict(layout="5", band="top"), kw="travel collage, photo grid, travel diary")
add("Wedding Day 3 Photo Collage", "Photo Collage", None, POST, "grid", "elegant", "ivory",
    dict(photos=["x_couple6", "rings", "weddingtable"], accent="Ananya & Rahul", title="Our wedding day", sub="12 · 02 · 2026"), opts=dict(layout="3a", rounded=0.012), kw="wedding photo collage, 3 photos")
add("Nine Photo Grid Collage", "Photo Collage", None, SQ, "grid", "modern", "mono",
    dict(photos=["x_friends", "x_cake3", "confetti", "x_balloons2", "x_friends3", "cupcakes", "party", "sparkler", "champagne"]), opts=dict(layout="9", gap=0.012), kw="9 photo grid, collage, instagram grid")
add("Baby First Year Collage", "Photo Collage", None, POST, "grid", "friendly", "mint",
    dict(photos=["newborn", "x_baby2", "babyfeet", "babyshoes"], kicker="Month by month", title="Aarav's first year", sub="From tiny toes to first steps"), opts=dict(layout="4a"), kw="baby collage, first year, baby photos")
add("Food Diary Photo Collage", "Photo Collage", None, STORY, "grid", "oswald", "saffron",
    dict(photos=["food", "pizza", "sushi", "x_pasta2", "salad", "dessert"], kicker="Weekend food diary", title="What we ate", upper=True), opts=dict(layout="6p", band="top", band_h=0.16), kw="food collage, story collage")
add("A4 Photo Collage Print", "Photo Collage", None, A4, "grid", "classic", "ivory",
    dict(photos=["x_couple5", "x_couple7", "couple3", "x_bouquet3", "whiteflowers", "engagement"], accent="ten years", title="Happy Anniversary", sub="Meera & Arjun · 2016 – 2026"), opts=dict(layout="6p", band_h=0.2), kw="a4 photo collage, anniversary, print collage")

# ================================================================ photo frames
add("Polaroid Memories Frame", "Photo Collage", None, POST, "polaroid", "hand", "sand",
    dict(photos=["x_friends2", "x_beach3", "x_friends3"], captions=["best day", "Goa '26", "us ♥"], accent="good times", title="Friends forever"), kw="polaroid frame, photo frame, friends")
add("Polaroid Family Album Page", "Photo Collage", None, SQ, "polaroid", "hand", "lilac",
    dict(photos=["family", "picnic", "x_dog2", "x_family3"], captions=["Sunday", "picnic", "Bruno", "home"], title="Our weekends"), opts=dict(title_size=90), kw="polaroid, family album page")
add("Circle Photo Frame Birthday", "Photo Collage", None, SQ, "shape", "script", "blush",
    dict(photo="x_cake2", accent="Happy Birthday", title="Kavya", sub="Wishing you the sweetest year yet."), opts=dict(kind="circle", layout="center", title_size=120), kw="circle photo frame, birthday photo frame")
add("Heart Photo Frame Love Post", "Photo Collage", None, POST, "shape", "romance", "rose",
    dict(photo="x_couple5", kicker="Happy anniversary", title="Forever yours", sub="Five years of laughter, love and late-night chai."), opts=dict(kind="heart", title_size=140), kw="heart photo frame, love, anniversary")
add("Arch Photo Frame Portrait", "Photo Collage", None, POST, "shape", "display", "sage",
    dict(photo="x_bride", kicker="Bride to be", title="Sanjana's bridal shower", details=["Sunday 14 Dec · 4 PM", "The Garden Room"]), opts=dict(kind="arch", title_size=92), kw="arch photo frame, bridal shower")
add("Flower Photo Frame Card", "Photo Collage", None, CARD, "shape", "soft", "peach",
    dict(photo="motherchild", accent="Happy Mother's Day", title="To the world's best Amma", sub="Love always, Riya"), opts=dict(kind="flower", title_size=110), kw="flower photo frame, mothers day")
add("Hexagon Photo Frame Team Post", "Photo Collage", None, SQ, "shape", "grotesk", "ocean",
    dict(photo="x_man", kicker="Meet the team", title="Rohan Iyer", sub="Head of Product · 8 years building apps people love."), opts=dict(kind="hexagon", title_size=96), kw="hexagon frame, meet the team")
add("Scallop Photo Frame Pet Post", "Photo Collage", None, POST, "shape", "friendly", "sunny",
    dict(photo="x_dog2", kicker="Gotcha day", title="Happy 3rd, Bruno!", sub="Three years of muddy paws and the happiest tail wags."), opts=dict(kind="scallop", title_size=110), kw="scallop frame, pet post, dog")

# ================================================================ posters / business
add("Business Workshop Poster", "Marketing", "Poster", A4, "split", "grotesk", "cobalt",
    dict(photo="seminar", kicker="Free workshop", title="Grow your business online", sub="A hands-on session on social media, WhatsApp marketing and Google listings.", details=["Saturday 22 November", "10 AM – 1 PM", "Hotel Residency, Chennai"], cta="Register free"), opts=dict(ratio=0.45), kw="business workshop poster, seminar, marketing")
add("Corporate Event Poster", "Marketing", "Poster", A4, "hero_bottom", "luxe", "midnight",
    dict(photo="conference", brand="Annual Leadership Summit", kicker="17 – 18 January 2027", title="Leading in a changing world", sub="Two days of talks, workshops and conversations with industry leaders.", details=["Taj Coromandel, Chennai"], cta="Book your seat"), opts=dict(title_size=120), kw="corporate event poster, summit, conference")
add("Real Estate Business Poster", "Marketing", "Poster", A4, "split", "display", "navy",
    dict(photo="x_pool", kicker="Now selling", title="Villas with a private pool", sub="3 & 4 bedroom homes, 10 minutes from the airport. Ready to move in.", details=["From ₹1.2 Cr", "Call +91 98765 43210"], cta="Book a visit"), opts=dict(ratio=0.5), kw="real estate poster, villa, property")
add("Gym Membership Poster", "Marketing", "Poster", A4, "hero_center", "bold", "midnight",
    dict(photo="x_gym2", kicker="New year offer", title="STRONGER THIS YEAR", sub="Join before 31 January and get your first month free.", details=["Open 5 AM – 11 PM", "FitZone, Anna Nagar"], cta="Join now"), opts=dict(upper=True, title_size=190), kw="gym poster, fitness membership")
add("Music Night Event Poster", "Events", None, A4, "hero_center", "poster", "noir",
    dict(photo="dj", kicker="Live this Friday", title="SOUNDS OF THE CITY", sub="Indie bands, food trucks and a rooftop full of good people.", details=["Friday 5 December · 7 PM", "Skyline Terrace"], cta="Get tickets"), opts=dict(upper=True, title_size=200), kw="music event poster, concert, night")
add("Restaurant Special Poster", "Marketing", "Poster", A4, "sale", "oswald", "saffron",
    dict(photo="finedining", kicker="Chef's special", title="Weekend Thali Feast", big="₹499", sub="Twelve dishes, unlimited rotis and dessert. Saturday & Sunday only.", cta="Reserve a table"), kw="restaurant poster, thali, food special")

# ================================================================ product posters
add("Skincare Product Poster", "Marketing", "Advertisement", POST, "product", "display", "rose",
    dict(photo="x_skin3", brand="Glow Lab", title="Vitamin C Serum", sub="Brighter skin in 14 days. Light, fast-absorbing, fragrance-free.", points=["Dermatologist tested", "Vegan", "30 ml"], price="₹799", cta="Shop now"), kw="skincare product poster, serum, beauty ad")
add("Sneaker Drop Product Poster", "Marketing", "Advertisement", POST, "product", "bold", "mono",
    dict(photo="x_sneak2", brand="Stride", title="AIR LITE 2", sub="Our lightest runner yet — built for long city miles.", points=["220 g", "Recycled mesh", "All-day cushioning"], price="₹4,999", cta="Pre-order", upper=True), opts=dict(kind="rounded"), kw="sneaker poster, shoe product, launch")
add("Perfume Product Poster", "Marketing", "Advertisement", A4, "product", "luxe", "noir",
    dict(photo="perfume", brand="Maison Noor", title="Oud Royale", sub="Warm oud, amber and a whisper of rose. Made to be remembered.", points=["Eau de parfum", "100 ml"], price="₹3,250", price_label="New", cta="Discover"), opts=dict(kind="arch"), kw="perfume poster, fragrance, luxury product")
add("Coffee Product Poster", "Marketing", "Advertisement", SQ, "product", "friendly", "sand",
    dict(photo="latte", brand="Brew Co.", title="Iced Caramel Latte", sub="Cold, creamy and just sweet enough.", price="₹180", price_label="Just", cta="Order now"), opts=dict(kind="circle", title_size=100), kw="coffee product poster, cafe ad, latte")
add("Watch Product Ad Landscape", "Marketing", "Advertisement", FB, "product", "editorial", "navy",
    dict(photo="x_watch", brand="Tempo", title="The Classic Steel", points=["Sapphire glass", "5 ATM water resistant", "2-year warranty"], price="₹8,990", cta="Buy now", web="tempowatches.in"), opts=dict(kind="circle", title_size=92), kw="watch ad, product ad, facebook ad")
add("Organic Grocery Product Flyer", "Business", "Flyer", A4, "product", "friendly", "forest",
    dict(photo="x_fruit", brand="Green Basket", title="Fresh from the farm", sub="Organic fruit and vegetables delivered to your door every morning.", points=["No chemicals", "Free delivery over ₹500", "Order on WhatsApp"], price="10%", price_label="Off", cta="Order today", web="greenbasket.in"), opts=dict(kind="rounded"), kw="grocery flyer, organic, product flyer")

# ================================================================ flyers
add("Coaching Classes Flyer", "Business", "Flyer", A4, "split", "friendly", "ocean",
    dict(photo="x_kids", kicker="Admissions open", title="Maths & Science coaching", sub="Small batches for classes 6 – 12. CBSE & State board. Free demo class.", details=["Mon – Sat · 4 – 8 PM", "Call 98400 12345"], cta="Book a free demo"), opts=dict(ratio=0.46), kw="coaching flyer, tuition, admissions open")
add("Salon Offer Flyer", "Business", "Flyer", A4, "sale", "elegant", "blush",
    dict(photo="salon", kicker="Festive offer", title="Bridal & party makeup", big="30% OFF", sub="Book before 15 December. Hair, makeup and nails by our senior stylists.", cta="Book on WhatsApp"), kw="salon flyer, beauty offer, bridal makeup")
add("Spotless Home Cleaning Flyer", "Business", "Flyer", A4, "split", "modern", "teal",
    dict(photo="cleaning", kicker="Home services", title="Spotless homes, every time", sub="Deep cleaning, sofa shampoo and kitchen care by trained, verified staff.", details=["Starting ₹1,499", "7 days a week"], cta="Call 90000 11111"), opts=dict(ratio=0.5), kw="cleaning service flyer, home services")
add("Arch Morning Yoga Flyer", "Business", "Flyer", A4, "shape", "elegant", "sage",
    dict(photo="yoga", kicker="Morning batch", title="Gentle yoga for everyone", sub="Breathe, stretch and start your day calm. Beginners welcome.", details=["Mon · Wed · Fri", "6:30 – 7:30 AM", "Lotus Studio, Adyar"], cta="Join a free class"), opts=dict(kind="arch", title_size=92), kw="yoga flyer, wellness class")
add("Tech Meetup Flyer", "Events", None, A4, "split", "grotesk", "midnight",
    dict(photo="x_laptop2", kicker="Meetup", title="AI for Small Business", sub="Practical tools you can use on Monday. Pizza and networking after.", details=["Thursday 20 November · 6 PM", "WeWork, Guindy"], cta="RSVP free"), opts=dict(ratio=0.45), kw="tech meetup flyer, ai event")

# ================================================================ invitations
add("Balloon Birthday Party Invitation", "Birthday", None, CARD, "shape", "friendly", "sunny",
    dict(photo="x_balloons3", kicker="You're invited to", title="Ishaan's 7th birthday party", details=["Sunday 7 December · 4 PM", "Fun Zone, Velachery"], sub="Cake, games and lots of balloons!"), opts=dict(kind="scallop", title_size=110), kw="birthday party invitation, kids, balloons")
add("Elegant Gold Birthday Invitation", "Birthday", None, CARD, "framed", "luxe", "noir",
    dict(photo="sparkler", kicker="Please join us for", title="Meera's 40th birthday dinner", sub="An evening of good food, music and old friends.", details=["Saturday 20 December · 8 PM", "The Park, Chennai"], brand="RSVP 98400 55555"), opts=dict(photo_h=0.42, shape="circle"), kw="40th birthday invitation, elegant, gold")
add("Pastel Birthday Invitation Post", "Birthday", None, POST, "shape", "script", "lilac",
    dict(photo="x_cupcakes2", kicker="Save the date", accent="Birthday Brunch", title="for Tanvi", details=["Sunday 30 November · 11 AM", "Café Mocha, Indiranagar"]), opts=dict(kind="arch", title_size=96), kw="birthday brunch invitation, pastel")
add("Surprise Party Invitation Story", "Birthday", None, STORY, "hero_center", "bold", "berry",
    dict(photo="x_friends3", kicker="Shhh… it's a surprise", title="ARJUN TURNS 30", sub="Don't tell him. Be there by 7:30 sharp.", details=["Friday 12 December", "Hard Rock Cafe"], cta="I'll be there"), opts=dict(upper=True, title_size=180), kw="surprise party invitation, story")
add("Floral Wedding Invitation Card", "Wedding", "Invitation", CARD, "shape", "elegant", "ivory",
    dict(photo="x_bouquet3", kicker="Together with their families", accent="Nithya & Karthik", title="request the pleasure of your company", details=["Friday 6 February 2027", "Muhurtham 9:30 AM", "Kalyana Mandapam, Madurai"]), opts=dict(kind="arch", title_size=56), kw="wedding invitation, floral, south indian wedding")
add("Modern Wedding Reception Invite", "Wedding", "Reception", CARD, "framed", "display", "sage",
    dict(photo="weddingtable", kicker="Wedding reception", title="Fatima & Imran", sub="Dinner and celebration to follow.", details=["Sunday 15 February 2027 · 7 PM", "ITC Grand Chola, Chennai"], brand="Kindly RSVP by 1 February"), opts=dict(photo_h=0.44, shape="rounded"), kw="wedding reception invitation, modern")
add("Flower Frame Baby Shower Invitation", "Love & Family", None, CARD, "shape", "soft", "mint",
    dict(photo="babyshoes", kicker="Oh baby!", accent="Baby Shower", title="for Divya", details=["Saturday 13 December · 11 AM", "Our home, T. Nagar"], sub="Brunch, games and lots of love."), opts=dict(kind="flower", title_size=96), kw="baby shower invitation, seemantham")
add("Griha Pravesh Housewarming Invitation", "Events", "Party", CARD, "framed", "editorial", "terra",
    dict(photo="x_house3", kicker="Griha Pravesh", title="Come home with us", sub="Join us for a small puja and lunch at our new home.", details=["Wednesday 3 December · 10 AM", "Plot 21, Anna Nagar West"], brand="The Raghavan family"), opts=dict(photo_h=0.44, shape="arch"), kw="housewarming invitation, griha pravesh")

# ================================================================ greeting cards
add("Thank You Greeting Card", "Cards", None, CARD, "shape", "script", "sand",
    dict(photo="flowers2", accent="Thank you", title="for everything", sub="Your kindness meant more than you know."), opts=dict(kind="circle", title_size=96), kw="thank you card, greeting card")
add("Diwali Greeting Card", "Festivals", None, CARD, "shape", "luxe", "saffron",
    dict(photo="diya", kicker="Wishing you a", title="Happy Diwali", sub="May your home be filled with light, sweets and laughter.", brand="The Krishnan family"), opts=dict(kind="arch", title_size=110), kw="diwali card, greeting card, deepavali")
add("Pongal Greeting Post", "Festivals", None, POST, "shape", "display", "saffron",
    dict(photo="x_fruit", kicker="Wishing you a joyful", title="Happy Pongal", sub="May this harvest bring warmth, good health and full hearts."), opts=dict(kind="scallop", title_size=140), kw="pongal greeting, tamil festival, harvest")
add("Christmas Greeting Card", "Festivals", None, CARD, "shape", "elegant", "forest",
    dict(photo="ornaments", accent="Merry Christmas", title="& a happy new year", sub="With love from our home to yours."), opts=dict(kind="circle", title_size=80), kw="christmas card, greeting card")
add("Sunshine Get Well Soon Card", "Cards", None, CARD, "shape", "soft", "teal",
    dict(photo="x_plant2", accent="Get well soon", title="Sending you sunshine", sub="Rest, heal and come back soon. We miss you!"), opts=dict(kind="flower", title_size=86), kw="get well soon card")
add("Confetti Congratulations Card", "Cards", None, CARD, "shape", "abril", "coral",
    dict(photo="confetti", kicker="Big news!", title="Congratulations", sub="So proud of you. Here's to everything that comes next."), opts=dict(kind="squircle", title_size=100), kw="congratulations card")

# ================================================================ magazine covers
add("Lifestyle Magazine Cover", "Marketing", "Magazine", A4, "magazine", "editorial", "ivory",
    dict(photo="x_sunglass", brand="AURA", kicker="The November issue", issue="November 2026 · Lifestyle", lines=[("Coffee trail", "10 cafés worth the trip"), ("The winter edit", "Ten pieces for the season"), ("At home in Kochi", "A 1940s bungalow, reborn")]), kw="magazine cover, lifestyle, fashion")
add("Business Magazine Cover", "Marketing", "Magazine", A4, "magazine", "grotesk", "mono",
    dict(photo="x_man2", brand="FOUNDR", kicker="Issue 12 · Startups", issue="Issue 12 · Startups", lines=[("First 100 customers", "Five founders, five playbooks"), ("The funding map", "Who invests in 2027"), ("30 under 30", "Young founders to watch")]), kw="business magazine cover, startup")
add("Food Magazine Cover", "Marketing", "Magazine", A4, "magazine", "abril", "saffron",
    dict(photo="food", brand="SPICE", kicker="Winter recipes", issue="Winter 2026 · Recipes", lines=[("5 easy biryanis", "One pot, one hour"), ("Filter coffee at home", "The perfect decoction"), ("Kerala street food", "Our Kochi favourites")]), kw="food magazine cover, recipes")

# ================================================================ resumes
add("Navy Sidebar Designer Resume", "Resume", None, A4, "resume", "modern", "navy",
    dict(photo="x_man", name="Rahul Krishnan", role="Product Designer", contact=["+91 98765 43210", "rahul.k@email.com", "Bengaluru, India", "behance.net/rahulk"], skills=[("UI / UX design", 0.95), ("Figma", 0.9), ("Prototyping", 0.85), ("User research", 0.8), ("HTML & CSS", 0.65)], languages=["English", "Tamil", "Hindi"], profile="Product designer with 6 years of experience shaping mobile and web apps for fintech and e-commerce. I turn messy problems into simple, friendly interfaces.", experience=[("Senior Product Designer", "PayNest · Bengaluru", "2023 – Now", "Led the redesign of the payments app used by 4 million people; cut checkout time by 30%."), ("Product Designer", "ShopKart · Chennai", "2020 – 2023", "Designed the seller dashboard and design system; ran 40+ user interviews."), ("UI Designer", "Pixel Studio · Chennai", "2018 – 2020", "Websites and brand work for 25 small-business clients.")], education=[("B.Des, Communication Design", "NID Bengaluru", "2014 – 2018")]), kw="resume template, cv, designer resume")
add("Elegant Teacher Resume", "Resume", None, A4, "resume", "classic", "sage",
    dict(photo="x_teacher", name="Lakshmi Narayanan", role="English Teacher", contact=["+91 90000 22222", "lakshmi.n@email.com", "Coimbatore, India"], skills=[("Lesson planning", 0.95), ("Classroom management", 0.9), ("Public speaking", 0.85), ("Google Classroom", 0.8)], languages=["English", "Tamil"], profile="Passionate English teacher with 9 years in CBSE schools. I make reading fun and help every student find their voice.", experience=[("Senior English Teacher", "Green Valley School", "2019 – Now", "Teach classes 9 – 12; board results improved from 82% to 94% average."), ("English Teacher", "St. Mary's School", "2015 – 2019", "Started the school's reading club and annual debate festival.")], education=[("M.A. English Literature", "PSG College of Arts", "2013 – 2015"), ("B.Ed.", "Avinashilingam University", "2012 – 2013")]), kw="teacher resume, cv template")
add("Bold Developer Resume", "Resume", None, A4, "resume", "grotesk", "cobalt",
    dict(photo="x_desk", frame="rounded", name="Aisha Fernandes", role="Full-Stack Developer", contact=["+91 99999 33333", "aisha.dev@email.com", "Pune, India", "github.com/aishaf"], skills=[("React & Next.js", 0.95), ("Node.js", 0.9), ("PostgreSQL", 0.8), ("AWS", 0.75), ("Python", 0.7)], languages=["English", "Hindi", "Marathi"], profile="Full-stack developer who ships fast and writes code others enjoy reading. 5 years building SaaS products from first commit to 100k users.", experience=[("Senior Developer", "CloudNine SaaS", "2022 – Now", "Built the billing platform and cut page load time by half."), ("Developer", "AppForge", "2019 – 2022", "Shipped 12 client apps in React Native and Node.")], education=[("B.E. Computer Science", "COEP Pune", "2015 – 2019")]), opts=dict(side="right"), kw="developer resume, software engineer cv")
add("Fresher Simple Resume", "Resume", None, A4, "resume", "friendly", "ocean",
    dict(photo="x_school", name="Vignesh Kumar", role="Commerce Graduate", contact=["+91 91234 56789", "vignesh.k@email.com", "Madurai, India"], skills=[("Tally & GST", 0.85), ("MS Excel", 0.8), ("Communication", 0.85), ("Teamwork", 0.9)], languages=["Tamil", "English"], profile="Commerce graduate looking for an accounts assistant role. Quick learner, good with numbers and comfortable talking to customers.", experience=[("Accounts Intern", "Sri Murugan Traders", "Jan – May 2026", "Prepared GST returns and daily sales reports in Tally."), ("Volunteer", "NSS Unit, Madura College", "2023 – 2025", "Organised blood donation camps for 400+ donors.")], education=[("B.Com", "Madura College", "2023 – 2026"), ("Higher Secondary", "TVS Matriculation School", "2023")]), kw="fresher resume, simple cv, first job")

# ================================================================ certificates
add("Classic Gold Certificate of Achievement", "Certificates", None, LAND, "certificate", "luxe", "ivory",
    dict(name="Ananya Sharma", body="for outstanding performance in the State Level Science Olympiad 2026, and for her curiosity, hard work and passion for learning.", sign=[("Dr. R. Venkatesh", "Principal"), ("Mrs. S. Priya", "Head of Science")]), kw="certificate of achievement, school certificate, gold")
add("Modern Course Completion Certificate", "Certificates", None, LAND, "certificate", "grotesk", "cobalt",
    dict(kicker="Certificate", of="of completion", lead="This is to certify that", name="Karthik Raman", body="has successfully completed the 8-week Digital Marketing Professional course with distinction.", sign=[("Tony Aloysius", "Course Director"), ("Meena Iyer", "Lead Trainer")], seal="2026"), opts=dict(style="band"), kw="course completion certificate, training certificate")
add("Navy Employee of the Month Certificate", "Certificates", None, LAND, "certificate", "display", "navy",
    dict(kicker="Certificate", of="of appreciation", lead="Employee of the month · October 2026", name="Suresh Babu", body="in recognition of your dedication, teamwork and the extra mile you go for our customers every day.", sign=[("Vikram Rao", "Managing Director"), ("Nisha Paul", "HR Manager")], seal="★"), kw="employee of the month certificate, appreciation")
add("Sports Day Winner Certificate", "Certificates", None, LAND, "certificate", "oswald", "coral",
    dict(kicker="Winner", of="annual sports day 2026", lead="Proudly awarded to", name="Rohan Das", body="for winning first place in the 100 m sprint, Under-14 boys.", sign=[("P. Suresh", "Sports Director"), ("A. Joseph", "Principal")], seal="1st"), opts=dict(style="band"), kw="sports certificate, winner certificate")

# ================================================================ digital & print ads, banners
add("Sale Facebook Ad", "Marketing", "Advertisement", FB, "banner", "bold", "coral",
    dict(photo="shopping", kicker="This weekend only", title="UP TO 50% OFF", sub="Ethnic wear, footwear and accessories across all stores.", cta="Shop the sale", web="trendz.in", upper=True), opts=dict(title_size=92), kw="facebook ad, sale ad, digital ad")
add("App Download Story Ad", "Marketing", "Advertisement", STORY, "hero_bottom", "grotesk", "cobalt",
    dict(photo="phone", brand="QuickPay", kicker="New app", title="Pay any bill in 3 taps", sub="Electricity, phone and rent — with instant cashback on your first payment.", cta="Download free"), opts=dict(title_size=140), kw="app ad, story ad, instagram ad")
add("Restaurant Square Ad", "Marketing", "Advertisement", SQ, "sale", "oswald", "midnight",
    dict(photo="x_steak2", kicker="Now delivering", title="Burger Night", big="2 for ₹399", sub="Every Thursday. Order on Swiggy or Zomato.", cta="Order now"), kw="restaurant ad, food ad, square ad")
add("Half Page Print Ad", "Marketing", "Advertisement", HALF, "banner", "editorial", "ivory",
    dict(photo="x_house3", kicker="Interior design", title="Homes that feel like you", sub="Modular kitchens, wardrobes and full-home interiors with a 10-year warranty.", cta="Free consultation", web="nestinteriors.in · 98400 77777"), opts=dict(kind="rect", title_size=70), kw="print ad, newspaper ad, interior design")
add("LinkedIn Company Banner", "Marketing", "Banner", LI, "banner", "grotesk", "navy",
    dict(photo="x_team2", kicker="Magical Touch Design", title="Design anything. Free.", sub="1,800+ templates for creators and small businesses.", web="magicaltouchdesign.com"), opts=dict(title_size=64), kw="linkedin banner, company cover")
add("Bakery Website Hero Banner", "Marketing", "Banner", WEB, "banner", "display", "peach",
    dict(photo="x_croiss", kicker="Fresh every morning", title="Baked with love since 1998", sub="Breads, cakes and cookies from our family kitchen.", cta="Order online", web="sweetcrumbs.in"), opts=dict(title_size=70), kw="website banner, hero banner, bakery")
add("Roadside Billboard Ad", "Marketing", "Banner", BILL, "banner", "bold", "sunny",
    dict(photo="x_pool", kicker="Luxury villas", title="YOUR HOLIDAY HOME AWAITS", sub="Private pools · 15 min from ECR beach", cta="Call 98400 88888", upper=True), opts=dict(title_size=88), kw="billboard ad, hoarding, outdoor advertising")
add("YouTube Banner Studio", "Social Media", "YouTube", (2560, 1440), "banner", "grotesk", "midnight",
    dict(photo="x_podcast2", kicker="New episodes every Friday", title="The Maker Podcast", sub="Honest talks with founders, designers and creators.", web="youtube.com/@themakerpodcast"), opts=dict(title_size=52), kw="youtube channel banner, podcast")

# ================================================================ multi-page books
book("Lifestyle Magazine 4 Pages", "Marketing", "Magazine", A4, "ivory", [
    ("magazine", "editorial", dict(photo="x_sunglass", brand="AURA", kicker="The November issue", issue="November 2026 · Lifestyle", lines=[("Coffee trail", "10 cafés worth the trip"), ("The winter edit", "Ten pieces for the season"), ("At home in Kochi", "A 1940s bungalow, reborn")]), {}),
    ("contents", "editorial", dict(photo="x_living3", items=[("04", "A home full of light", "Inside a restored Kochi bungalow"), ("08", "The winter edit", "Ten pieces you'll wear all season"), ("12", "Coffee trail", "Our favourite cafés from Ooty to Pondicherry"), ("16", "Slow Sundays", "Recipes for long lunches")], focus=(0.5, 0.4)), {}),
    ("article", "editorial", dict(photo="livingroom", kicker="Homes", title="A home full of light", dek="How one family turned a 1940s Kochi bungalow into a calm, bright home.", body=["When Maya and Joseph first saw the house, the roof leaked and the garden was a jungle. Two years later, it is the calmest place they know.", "They kept the old teak beams and red oxide floors, opened the rooms to the courtyard and painted every wall a soft warm white.", "The kitchen moved to the back of the house, next to the garden, so mornings now start with filter coffee among the banana plants.", "'We didn't want a showroom,' says Maya. 'We wanted a home that gets better as it gets older.'"], folio="AURA · November 2026 · 04"), {}),
    ("photo_page", "editorial", dict(photos=["kitchen", "bedroom", "x_plant2"], caption="Teak, terracotta and a lot of sunlight: the bungalow after two years of careful work."), {}),
], kw="magazine template, multi page magazine, lifestyle magazine")
book("Business Magazine 4 Pages", "Marketing", "Magazine", A4, "mono", [
    ("magazine", "grotesk", dict(photo="x_man2", brand="FOUNDR", kicker="Issue 12 · Startups", issue="Issue 12 · Startups", lines=[("First 100 customers", "Five founders, five playbooks"), ("The funding map", "Who invests in 2027"), ("30 under 30", "Young founders to watch")]), {}),
    ("contents", "grotesk", dict(photo="x_team2", issue="Issue 12", items=[("03", "Built in Chennai", "The SaaS companies selling to the world"), ("07", "First 100 customers", "Five founders on how they found theirs"), ("11", "The funding map", "Who is investing in 2027"), ("15", "30 under 30", "Young founders to watch")]), {}),
    ("article", "grotesk", dict(photo="meeting", kicker="Cover story", title="Built in Chennai, sold worldwide", dek="A quiet revolution: software companies from Tamil Nadu are winning customers in 60 countries.", body=["Ten years ago, few people outside the industry knew that Chennai built software for the world. Today, its SaaS companies are some of the most respected in the business.", "Founders point to three things: strong engineering colleges, a culture of frugality and customers who expect excellent support.", "'We learnt to build products that sell themselves,' says one founder. 'There was no money for big sales teams.'", "The next wave is already here, with AI tools, design platforms and fintech apps launching every month."], folio="FOUNDR · Issue 12 · 07"), {}),
    ("back", "grotesk", dict(title="Your story could be next", sub="Pitch us at stories@foundr.in", brand="FOUNDR MAGAZINE"), {}),
], kw="business magazine template, multi page, startup magazine")
book("Wedding Photo Album 4 Pages", "Photo Collage", None, ALBUM, "ivory", [
    ("shape", "elegant", dict(photo="x_couple6", accent="Ananya & Rahul", title="Our wedding album", sub="12 February 2026 · Chennai", sparkles=False), dict(kind="arch", title_size=150)),
    ("grid", "elegant", dict(photos=["x_bride", "rings", "x_bouquet3"], accent="getting ready", title="The morning"), dict(layout="3a", band_h=0.2)),
    ("polaroid", "hand", dict(photos=["x_couple5", "weddingtable", "x_friends", "champagne"], captions=["first look", "the table", "our people", "cheers!"], title="The celebration"), {}),
    ("grid", "elegant", dict(photos=["couple", "x_couple7", "couple3", "x_roses3"], title="Forever starts now"), dict(layout="4", band_h=0.18)),
], kw="wedding photo album, photo book, wedding album template")
book("Family Photo Book 4 Pages", "Photo Collage", None, SQ, "sand", [
    ("shape", "hand", dict(photo="family", kicker="The Menon family", title="Our year in photos", sub="2026", sparkles=False), dict(kind="squircle", title_size=110)),
    ("grid", "hand", dict(photos=["picnic", "x_family2", "x_dog2", "x_kids"], accent="weekends", title="Lazy Sundays"), dict(layout="4", band_h=0.2)),
    ("polaroid", "hand", dict(photos=["x_beach3", "travel2", "ocean"], captions=["Varkala", "first swim", "sunset"], title="Summer holiday"), {}),
    ("grid", "hand", dict(photos=["x_cake3", "confetti", "x_balloons2", "cupcakes", "x_friends3", "sparkler"], title="Birthdays"), dict(layout="6", band_h=0.18)),
], kw="family photo book, photo album template, year in photos")
book("Travel Photo Album 4 Pages", "Photo Collage", None, ALBUM, "mono", [
    ("hero_bottom", "grotesk", dict(photo="travel3", brand="Travel journal", kicker="12 days · 5 cities", title="Kashmir to Kerala", sub="Snow, houseboats and the longest train ride of our lives."), dict(title_size=120)),
    ("grid", "grotesk", dict(photos=["mountains", "x_mount2", "travel"], kicker="Week one", title="Into the mountains"), dict(layout="3b", band_h=0.18)),
    ("grid", "grotesk", dict(photos=["x_city2", "city", "food", "x_latte2", "tea"], kicker="Week two", title="City days and street food"), dict(layout="5", band_h=0.18)),
    ("polaroid", "hand", dict(photos=["ocean", "travel2", "x_beach3"], captions=["Alleppey", "Varkala", "last sunset"], title="Back to the sea"), {}),
], kw="travel photo album, travel book, photo book")
