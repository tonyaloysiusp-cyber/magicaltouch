"""Content, layout and photo for every Pro collection template."""

PAL = {
    "ivory": dict(bg="#F5EFE6", ink="#2B211C", accent="#A9823A", panel="#2B211C", on_panel="#F5EFE6", cta_bg="#F5EFE6", cta_fg="#2B211C"),
    "noir": dict(bg="#121212", ink="#F3EDE3", accent="#C9A45C", panel="#121212", on_panel="#F3EDE3", cta_bg="#C9A45C", cta_fg="#121212"),
    "blush": dict(bg="#F8ECE8", ink="#4A2C2A", accent="#B86F60", panel="#4A2C2A", on_panel="#F8ECE8", cta_bg="#F8ECE8", cta_fg="#4A2C2A"),
    "sage": dict(bg="#EEF0E8", ink="#2F3A2F", accent="#6E7F5B", panel="#2F3A2F", on_panel="#EEF0E8", cta_bg="#EEF0E8", cta_fg="#2F3A2F"),
    "navy": dict(bg="#F2F0EB", ink="#14213D", accent="#C9A45C", panel="#14213D", on_panel="#F2F0EB", cta_bg="#C9A45C", cta_fg="#14213D"),
    "terra": dict(bg="#F4E9DF", ink="#3A2418", accent="#C0583A", panel="#3A2418", on_panel="#F4E9DF", cta_bg="#C0583A", cta_fg="#FFFFFF"),
    "emerald": dict(bg="#F1EEE6", ink="#0F3B2E", accent="#C9A45C", panel="#0F3B2E", on_panel="#F1EEE6", cta_bg="#C9A45C", cta_fg="#0F3B2E"),
    "coral": dict(bg="#FFF4EF", ink="#1D1D1F", accent="#F0533F", panel="#1D1D1F", on_panel="#FFF4EF", cta_bg="#F0533F", cta_fg="#FFFFFF"),
    "plum": dict(bg="#F7EFEA", ink="#3B1E3F", accent="#E0A458", panel="#3B1E3F", on_panel="#F7EFEA", cta_bg="#E0A458", cta_fg="#3B1E3F"),
    "sunny": dict(bg="#FFF6DF", ink="#2A2118", accent="#E39B12", panel="#2A2118", on_panel="#FFF6DF", cta_bg="#E39B12", cta_fg="#2A2118"),
    "mint": dict(bg="#EAF6F1", ink="#12332B", accent="#1E9E76", panel="#12332B", on_panel="#EAF6F1", cta_bg="#1E9E76", cta_fg="#FFFFFF"),
    "cobalt": dict(bg="#F3F4F8", ink="#0B1F4D", accent="#3D63FF", panel="#0B1F4D", on_panel="#F3F4F8", cta_bg="#3D63FF", cta_fg="#FFFFFF"),
    "berry": dict(bg="#FBEFF2", ink="#4B1028", accent="#D6336C", panel="#4B1028", on_panel="#FBEFF2", cta_bg="#D6336C", cta_fg="#FFFFFF"),
    "sand": dict(bg="#EFE6D8", ink="#3B3127", accent="#8C6A43", panel="#3B3127", on_panel="#EFE6D8", cta_bg="#8C6A43", cta_fg="#FFFFFF"),
}

POST, SQ, STORY, CARD, A4, LAND = (1080, 1350), (1080, 1080), (1080, 1920), (480, 673), (794, 1123), (1200, 630)

# (title, category, size, arch, pair, palette, content, opts, keywords)
S = []


def add(title, cat, size, arch, pair, pal, c, opts=None, kw=""):
    S.append(dict(title=title, cat=cat, size=size, arch=arch, pair=pair, pal=pal, c=c, opts=opts or {}, kw=kw))


# ---------------------------------------------------------------- Birthday
add("Candlelight Birthday Dinner Invitation", "Birthday", POST, "hero_bottom", "editorial", "noir",
    dict(photo="candles", brand="You are invited", kicker="Saturday 14 November", title="Noor turns thirty", sub="Dinner by candlelight, good music and the people she loves most.", details=["8 PM", "The Atrium, Jumeirah"], cta="RSVP by 1 November"), kw="30th birthday invitation, dinner, elegant")
add("Champagne Toast Birthday Post", "Birthday", SQ, "hero_center", "luxe", "noir",
    dict(photo="champagne", kicker="Cheers to forty", title="Happy Birthday Karim", sub="Here is to the best decade yet.", details=["With love, the whole gang"]), kw="40th birthday, champagne, gold")
add("Birthday Cake Wish Story", "Birthday", STORY, "hero_bottom", "script", "blush",
    dict(photo="cake", brand="Make a wish", kicker="Happy birthday", title="Sweetest wishes, Layla", sub="May this year be as lovely as you are.", details=["Love, Mum & Dad"]), opts=dict(focus=(0.5, 0.45)), kw="birthday story, cake, pink")
add("Balloons Kids Party Invitation", "Birthday", POST, "split", "friendly", "sunny",
    dict(photo="balloons", kicker="You're invited", title="Zayd is turning six!", sub="Games, cake and a big balloon surprise. Come and play!", details=["Saturday 21 November · 3 PM", "Play Planet, Dubai Hills"], cta="RSVP to Huda", badge="Turning\n6"), opts=dict(ratio=0.52), kw="kids birthday party invitation, balloons")
add("Gold Confetti Birthday Card", "Birthday", CARD, "framed", "script", "ivory",
    dict(photo="confetti", kicker="Happy birthday", accent="to you", title="Here's to you", sub="Wishing you a year full of good mornings and better evenings.", brand="With love, Sara"), opts=dict(photo_h=0.45), kw="birthday card, gold, confetti")
add("Sparkler Birthday Party Poster", "Birthday", A4, "hero_center", "poster", "noir",
    dict(photo="sparkler", kicker="Birthday party", title="LET'S CELEBRATE", sub="Join us for a night of music, sparklers and celebration.", details=["Friday 27 November", "9 PM till late", "Skyline Rooftop"], cta="RSVP"), opts=dict(upper=True, title_size=190), kw="birthday party poster, night, sparklers")
add("Flower Bouquet Birthday Mum", "Birthday", POST, "arch", "script", "blush",
    dict(photo="bouquet", kicker="To the best mum in the world", accent="Happy Birthday", title="Mum", sub="For every kindness, every story and every 'I told you so'. Thank you.", details=["All our love, Zara & Adam"]), kw="birthday mum, flowers, card")
add("Cupcakes Birthday Social Post", "Birthday", SQ, "split", "editorial", "berry",
    dict(photo="cupcakes", kicker="Birthday treats", title="Happy birthday, bestie!", sub="Cake for breakfast is officially allowed today.", brand="Love, Tala"), opts=dict(side="left", ratio=0.5, title_size=96), kw="birthday post, cupcakes, best friend")
add("Milestone 50 Golden Celebration", "Birthday", CARD, "framed", "luxe", "noir",
    dict(photo="champagne2", kicker="A golden birthday", title="Fifty & fabulous", sub="Join us to celebrate Rania's fiftieth.", details=["Friday 4 December · 8 PM", "The Ritz-Carlton, Dubai"], brand="Black tie"), opts=dict(photo_h=0.42, shape="circle"), kw="50th birthday invitation, gold, elegant")
add("Birthday Party Story Countdown", "Birthday", STORY, "hero_center", "bold", "coral",
    dict(photo="party", kicker="3 days to go", title="BIRTHDAY BASH", sub="Bring your best moves and your loudest laugh.", details=["Thursday 19 Nov · 9 PM", "The Loft, Al Quoz"], cta="I'm in"), opts=dict(upper=True, title_size=200), kw="birthday party story, countdown")
add("First Birthday Baby Card", "Birthday", CARD, "framed", "soft", "sage",
    dict(photo="babyfeet", kicker="Our little one is turning", accent="one", title="Happy First Birthday", sub="Join us for a small garden party for Noah.", details=["Sunday 6 December · 11 AM", "The Greenhouse, Al Barari"]), opts=dict(photo_h=0.44, shape="arch"), kw="first birthday, baby, invitation")
add("Birthday Dinner Party Square", "Birthday", SQ, "hero_bottom", "classic", "ivory",
    dict(photo="table", brand="Dinner party", kicker="An evening for Elias", title="Thirty-five and thriving", details=["Sat 12 Dec · 7:30 PM", "Maison Noir"]), kw="birthday dinner invitation, table setting")

# ---------------------------------------------------------------- Wedding
add("Ivory Wedding Invitation with Photo", "Wedding", CARD, "arch", "script", "ivory",
    dict(photo="couple", kicker="Together with their families", accent="Layla & Omar", title="are getting married", details=["Saturday 17 April 2027 · 6 PM", "Al Barari, Dubai"]), kw="wedding invitation, photo, arch")
add("Rings Save the Date Post", "Wedding", POST, "hero_bottom", "romance", "noir",
    dict(photo="rings", brand="Save the date", kicker="12 · 06 · 2027", title="Hana & James", sub="Dubai · Formal invitation to follow", top_shade=True), opts=dict(title_size=190), kw="save the date, rings, wedding")
add("Bridal Bouquet Wedding Card", "Wedding", CARD, "framed", "classic", "sage",
    dict(photo="bridebouquet", kicker="The wedding of", title="Amira & Daniel", sub="We would love you to celebrate with us.", details=["Saturday 14 February 2027", "The Garden Pavilion"], brand="Reception to follow"), opts=dict(photo_h=0.48, shape="rounded"), kw="wedding invitation, bouquet, sage")
add("Wedding Venue Elegant Poster", "Wedding", A4, "hero_center", "luxe", "noir",
    dict(photo="venue", kicker="You are invited to the wedding of", title="SARA & OMAR", details=["Thursday 15 April 2027", "Seven o'clock in the evening", "Al Habtoor Grand Ballroom"]), opts=dict(upper=True, title_size=150), kw="wedding invitation poster, ballroom")
add("Engagement Announcement Story", "Wedding", STORY, "hero_bottom", "romance", "blush",
    dict(photo="engagement", brand="She said yes", kicker="We're engaged", title="Mariam & Yousef", sub="Thank you for all the love. The big day is coming.", details=["Spring 2027"]), opts=dict(title_size=180), kw="engagement announcement, story, ring")
add("Wedding Table Thank You Card", "Wedding", CARD, "framed", "script", "blush",
    dict(photo="weddingtable", accent="Thank you", title="for celebrating with us", sub="Your love made our day unforgettable.", brand="Zara & Ali"), opts=dict(photo_h=0.46), kw="wedding thank you card")
add("Wedding Welcome Sign", "Wedding", A4, "arch", "romance", "sand",
    dict(photo="venue2", kicker="Welcome to the wedding of", title="Olivia & James", details=["12 · 09 · 2026"]), kw="wedding welcome sign, arch")
add("Modern Wedding Save the Date Square", "Wedding", SQ, "split", "editorial", "navy",
    dict(photo="couple2", kicker="Save the date", title="Noor & Adam", sub="Are getting married in Dubai.", details=["12 June 2027"], brand="Invitation to follow"), opts=dict(side="left", ratio=0.52, title_size=110), kw="save the date, modern, photo")

# ---------------------------------------------------------------- Love, family, baby, graduation
add("Candid Couple Anniversary Post", "Love & Family", POST, "hero_bottom", "romance", "noir",
    dict(photo="couple3", brand="Happy anniversary", kicker="Ten years of us", title="Still my favourite", sub="One home, countless adventures, endless love.", details=["Forever yours, Omar"]), opts=dict(title_size=170), kw="anniversary post, couple")
add("Valentine Roses Card", "Love & Family", CARD, "framed", "script", "berry",
    dict(photo="roses", accent="Be mine", title="Happy Valentine's Day", sub="Every day with you is my favourite day.", brand="Love, Hamza"), opts=dict(photo_h=0.47), kw="valentine card, roses")
add("Baby Announcement Card", "Love & Family", CARD, "framed", "soft", "sage",
    dict(photo="newborn", kicker="Please welcome", accent="Noah", title="Born 3 October 2026", sub="3.4 kg of pure joy. Thank you for all your love.", brand="Mariam & Yousef"), opts=dict(photo_h=0.46, shape="arch"), kw="baby announcement, newborn")
add("Baby Shower Invitation Post", "Love & Family", POST, "split", "soft", "blush",
    dict(photo="babyshoes", kicker="Oh baby!", title="A baby shower for Sara", sub="Join us for tea, cake and sweet wishes for the little one.", details=["Saturday 13 March · 4 PM", "The Garden Room, Jumeirah"], cta="RSVP to Lina"), kw="baby shower invitation")
add("Mother's Day Card", "Love & Family", CARD, "framed", "script", "blush",
    dict(photo="motherchild", accent="Happy Mother's Day", title="Thank you for everything", sub="For every hug, every lesson and every bedtime story.", brand="Love always, Lina"), opts=dict(photo_h=0.47), kw="mother's day card")
add("Father's Day Post", "Love & Family", POST, "hero_bottom", "editorial", "navy",
    dict(photo="fatherson", brand="Happy Father's Day", kicker="To my hero", title="Like father, like son", sub="Thank you for teaching me everything, even the bad jokes.", details=["Love, Zaid"]), kw="father's day post")
add("Family Reunion Photo Collage Invitation", "Love & Family", POST, "collage", "classic", "sand",
    dict(photos=["family", "picnic", "table"], kicker="You're invited", title="The Haddad family reunion", sub="Bring your favourite dish and your old photos.", details=["Friday 2 July", "12 PM onwards", "Hatta Farm House"]), kw="family reunion, invitation, collage")
add("Graduation Party Photo Invitation", "Events", POST, "hero_bottom", "editorial", "navy",
    dict(photo="graduation", brand="Class of 2027", kicker="Graduation party", title="Celebrate Zayd's big day", sub="Dinner, speeches and a lot of proud parents.", details=["Saturday 26 June · 7 PM", "The Terrace, Dubai Marina"], cta="RSVP to Huda"), kw="graduation party invitation")
add("Graduate Congratulations Card", "Cards", CARD, "framed", "classic", "navy",
    dict(photo="graduation", kicker="Congratulations", title="Well done, graduate", sub="All the late nights paid off. The future is yours.", brand="So proud of you · Aunt Lina"), opts=dict(photo_h=0.47), kw="graduation card")

# ---------------------------------------------------------------- Cards
add("Thank You Floral Card", "Cards", CARD, "framed", "script", "sage",
    dict(photo="flowers", accent="Thank you", title="for being wonderful", sub="Your kindness made a real difference. I'm so grateful.", brand="Love, Reem"), opts=dict(photo_h=0.47), kw="thank you card, flowers")
add("Warm Tea Get Well Soon Card", "Cards", CARD, "framed", "soft", "sand",
    dict(photo="tea", kicker="Sending warm wishes", title="Get well soon", sub="Rest up, drink your tea and let us take care of the rest.", brand="With love, Maya"), opts=dict(photo_h=0.46, shape="arch"), kw="get well soon card")
add("Sympathy Card", "Cards", CARD, "framed", "classic", "sand",
    dict(photo="whiteflowers", kicker="With deepest sympathy", title="Thinking of you", sub="Holding you and your family close in our thoughts.", brand="Fondly, the Khalil family"), opts=dict(photo_h=0.47), kw="sympathy card")
add("Congratulations New Job Card", "Cards", CARD, "framed", "editorial", "coral",
    dict(photo="office", kicker="Congratulations", title="on the new job!", sub="Onwards and upwards. They're lucky to have you.", brand="From all of us at Studio 9"), opts=dict(photo_h=0.46), kw="new job congratulations card")
add("Seaside Happy Retirement Card", "Cards", CARD, "framed", "classic", "sunny",
    dict(photo="beach", kicker="Happy retirement", title="The adventure begins", sub="Here's to sleeping in, long lunches and new horizons.", brand="Your friends at Al Noor Bank"), opts=dict(photo_h=0.47), kw="retirement card, beach")
add("Living Room Housewarming Invitation", "Cards", POST, "split", "editorial", "terra",
    dict(photo="livingroom", kicker="New address", title="Come see our new home", sub="Housewarming drinks, snacks and a tour of every room.", details=["Friday 7 November · 7 PM", "Apt 1504, Harbour Tower"], cta="RSVP to Lina"), kw="housewarming invitation, new home")
add("Bon Voyage Card", "Cards", CARD, "framed", "editorial", "cobalt",
    dict(photo="travel", kicker="Bon voyage", title="Safe travels", sub="Go see the world. Send us lots of photos!", brand="The gang"), opts=dict(photo_h=0.47), kw="bon voyage card, travel")

# ---------------------------------------------------------------- Festivals
add("Ramadan Kareem Glowing Lantern Post", "Festivals", POST, "hero_bottom", "classic", "emerald",
    dict(photo="lantern", brand="Ramadan Kareem", kicker="Ramadan 1448", title="A blessed month of peace", sub="Wishing you and your family a month of reflection, kindness and light.", details=["From the Al Noor family"]), kw="ramadan kareem post, lantern")
add("Lantern Arch Eid Mubarak Card", "Festivals", CARD, "framed", "script", "emerald",
    dict(photo="lantern2", accent="Eid Mubarak", title="Peace, joy & blessings", sub="May this Eid bring happiness to your home.", brand="With love, the Haddad family"), opts=dict(photo_h=0.47, shape="arch"), kw="eid mubarak card")
add("Iftar Gathering Invitation", "Festivals", POST, "hero_center", "classic", "emerald",
    dict(photo="lantern3", kicker="Join us for iftar", title="Community Iftar", sub="Break your fast with friends and neighbours.", details=["Friday 12 March · 6:35 PM", "Park Pavilion, Mirdif"], cta="Everyone is welcome"), kw="iftar invitation, dates")
add("Diwali Festival of Lights Post", "Festivals", POST, "hero_bottom", "editorial", "plum",
    dict(photo="diya", brand="Happy Diwali", kicker="Festival of lights", title="May your home glow with joy", sub="Wishing you light, love and laughter this festive season.", details=["From all of us at Kavya Jewellers"]), kw="diwali post, diya, lights")
add("Christmas Greetings Card", "Festivals", CARD, "framed", "script", "emerald",
    dict(photo="ornaments", accent="Merry Christmas", title="& a happy new year", sub="Wishing you a season full of light and laughter.", brand="Love, the Thomas family"), opts=dict(photo_h=0.47), kw="christmas card")
add("Twinkling Christmas Market Poster", "Festivals", A4, "hero_center", "poster", "noir",
    dict(photo="xmastree", kicker="11 – 24 December", title="CHRISTMAS MARKET", sub="Handmade gifts, hot chocolate, carols and a visit from Santa.", details=["4 PM – 11 PM", "The City Walk"], cta="Free entry"), opts=dict(upper=True, title_size=180), kw="christmas market poster")
add("Fireworks New Year's Eve Party Story", "Festivals", STORY, "hero_bottom", "poster", "noir",
    dict(photo="fireworks", brand="Countdown party", kicker="31 December · 9 PM till late", title="HELLO 2027", sub="Live DJ, fireworks view and bubbly at midnight.", details=["Skyview Rooftop, Downtown"], cta="Book your table"), opts=dict(upper=True, title_size=260), kw="new year party story, fireworks")
add("Happy New Year Post", "Festivals", SQ, "hero_center", "luxe", "noir",
    dict(photo="fireworks2", kicker="Happy new year", title="2027", sub="New dreams. New beginnings. Same magic.", details=["From all of us"]), opts=dict(title_size=320), kw="happy new year post")
add("Eid Sale Fashion Post", "Festivals", POST, "sale", "classic", "emerald",
    dict(photo="lantern3", big="30% off", title="Eid collection", sub="Abayas, kaftans and scarves for the festive season.", cta="Shop the collection", brand="Sahra Atelier", code="Until 2 AM"), kw="eid sale, fashion")
add("Autumn Hello Post", "Festivals", SQ, "hero_center", "editorial", "terra",
    dict(photo="autumn", kicker="Hello autumn", title="Cosy days ahead", sub="Warm drinks, golden leaves and slow weekends.", details=["@thedailygrind"]), kw="autumn post")
add("Spring Blossom Post", "Festivals", POST, "split", "script", "blush",
    dict(photo="blossom", kicker="Hello spring", title="Fresh starts & blooming hearts", sub="A new season, a fresh collection. Come and see.", brand="Petal & Stem"), opts=dict(title_size=96), kw="spring post, blossom")
add("Summer Beach Party Poster", "Events", A4, "hero_bottom", "poster", "sunny",
    dict(photo="beach2", brand="Summer party", kicker="Saturday 20 June · 2 PM", title="BEACH DAY", sub="Music, sunshine and cold drinks by the sea.", details=["Kite Beach, Dubai"], cta="Free entry"), opts=dict(upper=True, title_size=260), kw="beach party poster, summer")

# ---------------------------------------------------------------- Events
add("Stage Lights Live Concert Poster", "Events", A4, "hero_bottom", "poster", "noir",
    dict(photo="x_friends3", brand="Live in concert", kicker="Friday 15 October · 8 PM", title="THE MIDNIGHT ECHO", sub="One night only. Doors open at 7.", details=["Dubai Opera"], cta="Tickets from AED 150"), opts=dict(upper=True, title_size=220), kw="concert poster")
add("DJ Night Club Story", "Events", STORY, "hero_center", "bold", "plum",
    dict(photo="dj", kicker="Saturday night", title="DJ NOVA LIVE", sub="House, disco and everything in between.", details=["11 PM till late", "The Warehouse, Al Quoz"], cta="Guest list"), opts=dict(upper=True, title_size=210), kw="dj night story, club")
add("Future Tech Summit Photo Poster", "Events", A4, "split", "modern", "cobalt",
    dict(photo="conference", kicker="Future Tech Summit 2027", title="Build what's next", sub="Two days of talks, workshops and connections for modern teams.", details=["14 – 15 March", "Dubai World Trade Centre"], cta="Register now", brand="futuretech.ae"), opts=dict(ratio=0.5, title_size=120), kw="tech conference poster")
add("Business Networking Night", "Events", POST, "hero_bottom", "modern", "navy",
    dict(photo="meeting", brand="Founders club", kicker="Wednesday 17 March · 7 PM", title="Networking Night", sub="Meet founders, investors and creatives over drinks.", details=["The Hub, DIFC"], cta="Free entry"), kw="networking event post")
add("Marathon Run Poster", "Events", A4, "hero_bottom", "poster", "coral",
    dict(photo="running", brand="City marathon 2027", kicker="Friday 21 January · 6 AM", title="RUN THE CITY", sub="42K, 21K, 10K and 5K routes for every runner.", details=["Waterfront Promenade"], cta="Register at citymarathon.ae"), opts=dict(upper=True, title_size=250), kw="marathon poster, running")
add("Yoga Retreat Poster", "Events", A4, "split", "classic", "sage",
    dict(photo="yoga", kicker="Breathe · stretch · reset", title="Weekend yoga retreat", sub="Three days of yoga, healthy food and mountain walks.", details=["12 – 14 December", "Hatta Mountain Lodge"], cta="Book your spot", brand="Still Point Yoga"), opts=dict(ratio=0.52), kw="yoga retreat poster")
add("Football Tournament Post", "Events", POST, "hero_bottom", "bold", "mint",
    dict(photo="football", brand="5-a-side cup", kicker="Saturday 10 April · 4 PM", title="GAME ON", sub="16 teams. 1 trophy. Bring your best squad.", details=["Dubai Sports City"], cta="Register your team"), opts=dict(upper=True, title_size=260), kw="football tournament post")
add("Gallery Art Exhibition Photo Poster", "Events", A4, "hero_center", "editorial", "ivory",
    dict(photo="art", kicker="A group exhibition", title="Colours of the Gulf", sub="Twelve artists, one city, a hundred stories.", details=["5 – 30 November", "Gallery 21, Alserkal Avenue"], cta="Free entry"), opts=dict(title_size=150), kw="art exhibition poster")
add("Food Festival Poster", "Events", A4, "collage", "bold", "coral",
    dict(photos=["food", "burger", "dessert"], kicker="8 – 10 February", title="STREET FOOD FESTIVAL", sub="40 vendors, live music and craft drinks by the water.", details=["Harbour Square", "Free entry"], cta="Find out more"), opts=dict(title_size=110), kw="food festival poster")
add("Charity Gala Dinner", "Events", A4, "hero_center", "luxe", "noir",
    dict(photo="gala", kicker="The 10th annual", title="HOPE CHARITY GALA", sub="An evening of giving for children's education.", details=["Saturday 15 November", "The Crystal Ballroom", "Black tie"], cta="Support the cause"), opts=dict(upper=True, title_size=150), kw="charity gala poster")
add("Workshop Webinar Post", "Events", POST, "split", "modern", "mint",
    dict(photo="laptop", kicker="Free webinar", title="Grow your small business online", sub="A one-hour live session on social media, ads and your website.", details=["Thursday 27 November · 8 PM GST", "Live Q&A at the end"], cta="Save my seat"), opts=dict(title_size=100), kw="webinar post, workshop")
add("Movie Night Poster", "Events", A4, "hero_bottom", "poster", "noir",
    dict(photo="cinema", brand="Open-air cinema", kicker="Every Saturday · 8 PM", title="MOVIE NIGHT", sub="Popcorn, blankets and a classic under the stars.", details=["Rooftop Garden"], cta="Book seats"), opts=dict(upper=True, title_size=250), kw="movie night poster")

# ---------------------------------------------------------------- Marketing: food & cafe
add("Coffee Shop Promo Post", "Marketing", POST, "hero_bottom", "editorial", "sand",
    dict(photo="coffee", brand="Ember & Bean", kicker="New on the menu", title="Your daily ritual, perfected", sub="Single-origin espresso, roasted in small batches every week.", cta="Order on our app"), kw="coffee shop promo, cafe")
add("Latte Art Cafe Story", "Marketing", STORY, "split", "classic", "sand",
    dict(photo="latte", kicker="Happy hour · 2 – 5 PM", title="Two lattes, one price", sub="Bring a friend. Every weekday afternoon.", cta="Visit us", brand="The Daily Grind"), opts=dict(ratio=0.6, title_size=120), kw="cafe story, latte")
add("Bakery Fresh Bread Post", "Marketing", SQ, "split", "editorial", "terra",
    dict(photo="bread", kicker="Baked fresh daily", title="Out of the oven at 7 AM", sub="Sourdough, croissants and cinnamon rolls.", brand="The Rolling Pin Bakery"), opts=dict(side="left", ratio=0.5, title_size=90), kw="bakery post, bread")
add("Pizza Special Promo", "Marketing", POST, "sale", "bold", "coral",
    dict(photo="pizza", big="2 for 1", title="Pizza Fridays", sub="Every large pizza, dine-in and delivery, all day Friday.", cta="Order now", brand="Nonna's Kitchen"), kw="pizza promo, restaurant")
add("Burger Restaurant Post", "Marketing", SQ, "hero_bottom", "bold", "noir",
    dict(photo="burger", brand="Smash Club", kicker="Double trouble combo", title="SMASH BURGER + FRIES", details=["AED 39", "Order online"]), opts=dict(upper=True, title_size=170), kw="burger promo post")
add("Healthy Bowl Menu Post", "Marketing", POST, "split", "modern", "mint",
    dict(photo="salad", kicker="Lunch that loves you back", title="Fresh bowls, ready in minutes", details=["Under 550 calories", "30 g protein", "Delivered in 25 minutes"], cta="Order on the app", brand="Green Bowl"), kw="healthy food post, salad")
add("Fine Dining Restaurant Poster", "Marketing", A4, "hero_center", "luxe", "noir",
    dict(photo="finedining", kicker="Seven courses", title="THE TASTING MENU", sub="An evening of seasonal cooking and wine pairings.", details=["Fridays & Saturdays", "Booking essential"], cta="Reserve a table"), opts=dict(upper=True, title_size=150), kw="fine dining poster, restaurant")
add("Sushi Restaurant Post", "Marketing", POST, "hero_bottom", "modern", "noir",
    dict(photo="sushi", brand="Kaze Sushi", kicker="Now open in JLT", title="Fresh from the counter", sub="Nigiri, maki and robata grill, made in front of you.", cta="Book a table"), kw="sushi restaurant post")
add("Dessert Shop Promo", "Marketing", SQ, "split", "editorial", "berry",
    dict(photo="dessert", kicker="Sweet treats", title="Made fresh every morning", sub="Cakes, pastries and ice cream.", cta="Order now", brand="Golden Crumb"), opts=dict(side="right", ratio=0.5, title_size=88), kw="dessert shop post")
add("Restaurant Menu A4", "Menus", A4, "menu", "editorial", "ivory",
    dict(photo="restaurant", kicker="Seasonal kitchen · Est. 2012", title="The Olive Room", sections=[("Starters", [("Burrata & heirloom tomato", "48"), ("Crispy squid", "42"), ("Garden soup", "32")]), ("Mains", [("Herb chicken", "78"), ("Wild mushroom risotto", "68"), ("Market fish", "92")]), ("Desserts", [("Olive oil cake", "36"), ("Dark chocolate pot", "38")]), ("Drinks", [("Fresh lemonade", "22"), ("Iced tea", "20")])], brand="Please tell us about any allergies"), kw="restaurant menu")
add("Cafe Menu A4", "Menus", A4, "menu", "classic", "sand",
    dict(photo="coffee2", kicker="Coffee · Tea · Treats", title="Morning Café", sections=[("Coffee", [("Espresso", "12"), ("Flat white", "18"), ("Spanish latte", "22")]), ("Tea", [("Karak", "10"), ("Mint tea", "14")]), ("Breakfast", [("Eggs benedict", "42"), ("Avocado toast", "38"), ("Shakshuka", "36")]), ("Bakery", [("Croissant", "14"), ("Cinnamon roll", "18")])], brand="Open daily · 7 AM – 10 PM"), kw="cafe menu")

# ---------------------------------------------------------------- Marketing: beauty, fashion, retail
add("Skincare Product Launch", "Marketing", POST, "split", "classic", "blush",
    dict(photo="skincare", kicker="New launch", title="Your skin, but glowing", sub="Vitamin C serum with hyaluronic acid for brighter skin in two weeks.", cta="Shop now", brand="Lumea Skin", badge="New\n20%"), kw="skincare launch post")
add("Perfume Luxury Ad", "Marketing", A4, "hero_center", "luxe", "noir",
    dict(photo="perfume", kicker="Eau de parfum", title="VELOURS", sub="Oud, amber and rose. The new signature scent.", cta="Discover"), opts=dict(upper=True, title_size=190, frame=False), kw="perfume ad, luxury")
add("Makeup Artist Promo", "Marketing", POST, "hero_bottom", "editorial", "berry",
    dict(photo="makeup", brand="Glam Studio", kicker="Bridal · Editorial · Events", title="Makeup by Lena", sub="Book your bridal trial this month and get 15% off.", cta="Book now"), kw="makeup artist post")
add("Hair Salon Offer", "Marketing", SQ, "split", "editorial", "sand",
    dict(photo="salon", kicker="This week only", title="Cut & blow-dry AED 120", sub="New clients welcome. Walk-ins until 6 PM.", brand="Velvet Salon"), opts=dict(side="left", ratio=0.5, title_size=86), kw="hair salon promo")
add("Spa Day Promo Story", "Marketing", STORY, "hero_bottom", "classic", "sage",
    dict(photo="spa", brand="Serene Spa", kicker="Spa day for two", title="Slow down, breathe in", sub="60-minute massage, herbal tea and steam room.", details=["AED 350 per couple"], cta="Book a visit"), opts=dict(title_size=170), kw="spa promo story")
add("Fashion Sale Poster", "Marketing", POST, "sale", "bold", "noir",
    dict(photo="fashion", big="60% off", title="End of season sale", sub="Final week. In store and online.", cta="Shop the sale", brand="Maison Lune", code="Code: FINAL60"), opts=dict(focus=(0.5, 0.3)), kw="fashion sale poster")
add("New Collection Fashion Post", "Marketing", POST, "hero_bottom", "editorial", "ivory",
    dict(photo="fashion2", brand="Maison Lune", kicker="Autumn / Winter 2027", title="The new collection", sub="Soft tailoring, warm tones and quiet luxury.", cta="Shop now"), opts=dict(focus=(0.5, 0.3)), kw="fashion collection post")
add("Sneaker Drop Story", "Marketing", STORY, "hero_center", "bold", "coral",
    dict(photo="sneakers", kicker="Drop 09 · Sat 14.11 · 12:00", title="FRESH KICKS", sub="Limited run. One pair per customer.", cta="Set a reminder"), opts=dict(upper=True, title_size=230), kw="sneaker drop story")
add("Jewellery Luxury Post", "Marketing", POST, "hero_center", "luxe", "noir",
    dict(photo="jewelry", kicker="The festive collection", title="FOREVER YOURS", sub="18k gold, certified diamonds.", details=["Swarna Jewellers"], cta="Visit our showroom"), opts=dict(upper=True, title_size=150), kw="jewellery post, luxury")
add("Black Friday Sale Story", "Marketing", STORY, "sale", "bold", "noir",
    dict(photo="shopping", big="70% off", title="Black Friday", sub="Our biggest sale of the year. 27 – 30 November.", cta="Shop now", brand="yourstore.ae", code="Online & in store"), opts=dict(), kw="black friday sale story")
add("Shopping Bags Flash Sale Post", "Marketing", SQ, "sale", "bold", "coral",
    dict(photo="shopping2", big="50% off", title="Flash sale", sub="Today only, while stocks last.", cta="Shop now", brand="yourstore.ae"), kw="flash sale post")
add("Grand Opening Post", "Marketing", POST, "hero_center", "editorial", "terra",
    dict(photo="storefront", kicker="Grand opening", title="Now open", sub="Free coffee and a gift for our first 100 guests.", details=["Saturday 14 November · 10 AM", "Dubai Hills Mall, Level 1"], cta="See you there"), opts=dict(title_size=200), kw="grand opening post")
add("Gift Guide Post", "Marketing", POST, "collage", "editorial", "berry",
    dict(photos=["gifts", "jewelry", "perfume"], kicker="The gift guide", title="Gifts they'll love", sub="Thoughtful picks for everyone on your list.", cta="Shop gifts"), kw="gift guide post")
add("Free Delivery Promo", "Marketing", SQ, "split", "modern", "cobalt",
    dict(photo="delivery", kicker="This week only", title="Free delivery on every order", sub="No minimum spend.", cta="Order now", brand="yourstore.ae"), opts=dict(side="left", ratio=0.5, title_size=90), kw="free delivery promo")

# ---------------------------------------------------------------- Marketing: services, real estate, fitness, travel, tech
add("Luxury Villa Listing", "Marketing", POST, "split", "classic", "navy",
    dict(photo="house", kicker="Just listed", title="Garden villa with private pool", details=["5 beds · 6 baths · 6,200 sq ft", "Arabian Ranches"], cta="Book a viewing", brand="Haven Realty", badge="AED\n7.9M"), opts=dict(ratio=0.55, title_size=96), kw="villa listing, real estate")
add("Apartment For Rent Story", "Marketing", STORY, "hero_bottom", "modern", "navy",
    dict(photo="apartment", brand="Skyline Homes", kicker="For rent · Dubai Marina", title="Bright 2-bed with sea views", details=["AED 145k / year", "Fully furnished"], cta="Call to view"), opts=dict(title_size=140), kw="apartment for rent story")
add("Open House Flyer", "Marketing", A4, "collage", "classic", "sand",
    dict(photos=["house2", "kitchen", "bedroom"], kicker="Open house · Saturday 11 AM – 3 PM", title="Family villa, Arabian Ranches", sub="4 beds, garden and pool. No appointment needed.", details=["AED 4,750,000", "Haven Realty"], cta="Call 050 123 4567"), opts=dict(title_size=96), kw="open house flyer, real estate")
add("Calm Spaces Interior Design Post", "Marketing", POST, "hero_bottom", "editorial", "sand",
    dict(photo="livingroom2", brand="Calm Spaces", kicker="Interior design studio", title="Homes that feel like you", sub="Book a free consultation this month.", cta="Book now"), kw="interior design post")
add("Gym Membership Offer", "Marketing", POST, "hero_bottom", "bold", "noir",
    dict(photo="gym", brand="Iron Yard Gym", kicker="New year, new you", title="NO EXCUSES", sub="First month free. Open 24/7. Classes included.", cta="Join now"), opts=dict(upper=True, title_size=260), kw="gym membership post")
add("Personal Trainer Promo", "Marketing", SQ, "split", "bold", "mint",
    dict(photo="fitness", kicker="Personal training", title="Stronger in 8 weeks", sub="One-to-one coaching, nutrition plan and weekly check-ins.", cta="Free trial session"), opts=dict(side="left", ratio=0.5, title_size=84), kw="personal trainer promo")
add("Travel Agency Offer", "Marketing", POST, "hero_bottom", "editorial", "cobalt",
    dict(photo="travel2", brand="Blue Horizon Travel", kicker="5 nights · flights + hotel", title="Escape to the islands", details=["From AED 3,890"], cta="Book by 31 March"), kw="travel offer post")
add("Hotel Staycation Story", "Marketing", STORY, "hero_center", "luxe", "noir",
    dict(photo="hotel", kicker="Weekend staycation", title="STAY & UNWIND", sub="Two nights, breakfast and late checkout.", details=["From AED 899"], cta="Book now"), opts=dict(upper=True, title_size=170), kw="hotel staycation story")
add("Car Rental Promo", "Marketing", POST, "sale", "bold", "sunny",
    dict(photo="car", big="AED 99", title="Rent a car this weekend", sub="Free delivery, full insurance and no hidden fees.", cta="Book now", brand="Cruise Rentals", code="per day"), kw="car rental promo")
add("Smartphone Launch Ad", "Marketing", POST, "hero_center", "modern", "noir",
    dict(photo="phone", kicker="Pre-order now", title="Night shots, reimagined", sub="Pro camera, all-day battery, super-bright screen.", details=["From AED 3,499"], cta="Pre-order"), opts=dict(title_size=130), kw="smartphone launch ad")
add("Dental Clinic Promo", "Marketing", POST, "split", "modern", "mint",
    dict(photo="dentist", kicker="Smile month", title="Brighter smiles start here", details=["Check-ups & cleaning", "Teeth whitening", "Braces & aligners"], cta="Book online", brand="BrightSmile Dental"), opts=dict(title_size=100), kw="dental clinic promo")
add("Cleaning Service Flyer", "Marketing", POST, "split", "modern", "cobalt",
    dict(photo="cleaning", kicker="Home cleaning", title="Sparkling clean homes", details=["Deep cleaning", "Sofa & carpet care", "Move-in / move-out"], cta="Book 050 600 7788", brand="FreshNest"), opts=dict(title_size=100), kw="cleaning service flyer")
add("Photography Studio Post", "Marketing", POST, "hero_bottom", "editorial", "noir",
    dict(photo="camera", brand="Lightroom Studio", kicker="Portrait sessions", title="Moments worth keeping", sub="Studio or outdoor. 20 edited photos from AED 600.", cta="Book a shoot"), kw="photography studio post")
add("Florist Promo Post", "Marketing", SQ, "hero_bottom", "script", "blush",
    dict(photo="flowers2", brand="Petal & Stem", kicker="Same-day delivery", title="Flowers for every feeling", cta="Order now"), opts=dict(title_size=150), kw="florist post, flowers")
add("Pet Grooming Post", "Marketing", SQ, "split", "friendly", "sunny",
    dict(photo="dog", kicker="Pampered paws", title="Fresh cut, happy pup", sub="Bath, trim, nails and teeth from AED 120.", cta="Book a groom"), opts=dict(side="left", ratio=0.5, title_size=88), kw="pet grooming post, dog")
add("Bookstore Promo Post", "Marketing", POST, "hero_bottom", "classic", "sand",
    dict(photo="books", brand="Page & Quill", kicker="Reading week", title="Three books, one price", sub="Mix and match fiction, kids and Arabic titles.", cta="Visit us"), kw="bookstore promo")

# ---------------------------------------------------------------- Business
add("Team Photo We're Hiring Post", "Business", POST, "split", "bold", "coral",
    dict(photo="team", kicker="Join our team", title="WE'RE HIRING", details=["Graphic designer · Full time", "Social media manager · Hybrid", "Video editor · Freelance"], cta="Apply now", brand="careers@yourstudio.com"), opts=dict(title_size=170, upper=True), kw="hiring post, jobs")
add("Company Announcement Post", "Business", POST, "hero_bottom", "modern", "navy",
    dict(photo="city", brand="Northwind Group", kicker="Company news", title="We're opening in Singapore", sub="Our Asia-Pacific hub opens in January 2027, bringing 80 new roles.", cta="Read more"), kw="company announcement")
add("Business Seminar Flyer", "Business", A4, "split", "modern", "navy",
    dict(photo="seminar", kicker="Growth Summit 2026", title="Scaling your SME in a digital economy", sub="A half-day seminar for founders and managers.", details=["19 November · 9 AM – 1 PM", "Dubai Chamber Hall", "Free entry"], cta="Register now"), opts=dict(ratio=0.46, title_size=100), kw="business seminar flyer")
add("Real Estate Agent Business Post", "Business", POST, "split", "classic", "emerald",
    dict(photo="keys", kicker="Your dream home awaits", title="Buying or selling? Let's talk", details=["Free valuation", "Pro photography", "Hosted viewings"], cta="Call 050 123 4567", brand="Haven Homes"), opts=dict(title_size=100), kw="real estate agent post")
add("Consulting Firm Post", "Business", SQ, "hero_bottom", "editorial", "navy",
    dict(photo="handshake", brand="Meridian Consulting", kicker="Strategy · Finance · Operations", title="Clear advice. Real results.", cta="Book a consultation"), opts=dict(title_size=140), kw="consulting firm post")
add("Startup Pitch Event", "Business", POST, "hero_center", "modern", "cobalt",
    dict(photo="startup", kicker="Demo day 2027", title="Ten startups. One stage.", sub="Watch the region's boldest founders pitch live.", details=["Thursday 4 March · 6 PM", "Hub71, Abu Dhabi"], cta="Get your seat"), opts=dict(title_size=140), kw="startup pitch event")
add("Coworking Space Promo", "Business", POST, "split", "modern", "sand",
    dict(photo="cowork", kicker="Coworking in Business Bay", title="Your desk is ready", sub="Hot desks, private offices and meeting rooms from AED 900 a month.", cta="Book a tour", brand="The Workshop"), kw="coworking promo")

# ---------------------------------------------------------------- Social media
add("Quote Post Mountains", "Social Media", SQ, "hero_center", "editorial", "noir",
    dict(photo="mountains", kicker="Monday motivation", title="Small steps every day add up to big changes.", details=["@yourname"]), opts=dict(title_size=96, frame=True), kw="quote post, motivation")
add("Quote Post Ocean", "Social Media", POST, "hero_bottom", "classic", "noir",
    dict(photo="ocean", brand="Daily reminder", title="Slow down. The best things grow in their own time.", details=["@yourname"]), opts=dict(title_size=110), kw="quote post, ocean")
add("Podcast Episode Cover", "Social Media", SQ, "hero_bottom", "bold", "noir",
    dict(photo="podcast", brand="The Side Hustle Show", kicker="Episode 48", title="TURNING A WEEKEND IDEA INTO A BUSINESS", details=["With Dana Yusuf", "Out now"]), opts=dict(upper=True, title_size=110, max_lines=4), kw="podcast episode cover")
add("Travel Blog Post", "Social Media", POST, "hero_bottom", "editorial", "noir",
    dict(photo="travel3", brand="Wander notes", kicker="New on the blog", title="48 hours in the mountains", sub="Where to stay, what to eat and the hike you can't miss.", cta="Read the guide"), kw="travel blog post")
add("Recipe Post", "Social Media", POST, "split", "editorial", "terra",
    dict(photo="cooking", kicker="Recipe of the week", title="Creamy tomato pasta in 20 minutes", details=["Serves 4", "Vegetarian"], cta="Get the recipe"), opts=dict(title_size=100), kw="recipe post, cooking")
add("Gift Boxes Giveaway Post", "Social Media", SQ, "hero_center", "bold", "berry",
    dict(photo="gifts2", kicker="10K celebration", title="GIVEAWAY", sub="Follow us, like this post and tag two friends to enter.", details=["Ends Sunday · UAE only"]), opts=dict(upper=True, title_size=230), kw="giveaway post")
add("Bakery Behind the Scenes Story", "Social Media", STORY, "hero_bottom", "editorial", "noir",
    dict(photo="workshop", brand="Behind the scenes", kicker="Made by hand", title="How our cakes are made", sub="Every cake, every day, by our team of six bakers.", cta="Watch the video"), kw="behind the scenes story")
add("Fitness Tips Carousel Cover", "Social Media", POST, "hero_bottom", "bold", "mint",
    dict(photo="fitness2", brand="Coach Arya", kicker="Swipe for 5 tips", title="BUILD A HABIT THAT STICKS", details=["Save this for later"]), opts=dict(upper=True, title_size=150), kw="fitness tips post")
add("Wellness Quote Story", "Social Media", STORY, "hero_center", "classic", "sage",
    dict(photo="x_plant2", kicker="Note to self", title="Rest is productive.", sub="You are doing enough.", details=["@calm.daily"]), opts=dict(title_size=170), kw="wellness quote story")
