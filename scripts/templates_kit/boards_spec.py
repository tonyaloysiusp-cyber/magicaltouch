"""Content, palette and variant for every Studio boards template."""

POST, SQ, STORY, CERT, CARD = (1080, 1350), (1080, 1080), (1080, 1920), (1123, 794), (1080, 1350)

S = []


def add(title, cat, size, arch, c, p, v=None, kw=""):
    S.append(dict(title=title, cat=cat, size=size, arch=arch, c=c, p=p, v=v or {}, kw=kw))


# ------------------------------------------------------------- birthday
BP = {
    "forest": dict(bg="#1F3B2D", accent="#2C5440", accent2="#E8B84A", line="#E8B84A", script="#E8B84A", ink="#FFFFFF"),
    "orange": dict(bg="#F28C28", accent="#1E1E1E", accent2="#FFFFFF", line="#1E1E1E", script="#1E1E1E", ink="#FFFFFF"),
    "maroon": dict(bg="#5B1A24", accent="#7A2532", accent2="#D9A441", line="#D9A441", script="#D9A441", ink="#FFFFFF"),
    "noir": dict(bg="#121212", accent="#262626", accent2="#D4AF37", line="#D4AF37", script="#D4AF37", ink="#FFFFFF"),
    "purple": dict(bg="#4B2A86", accent="#6B45B5", accent2="#FF7AB6", line="#FF7AB6", script="#FFD166", ink="#FFFFFF"),
    "pink": dict(bg="#F7A8C4", accent="#F06292", accent2="#4B2A86", line="#4B2A86", script="#4B2A86", ink="#FFFFFF"),
    "teal": dict(bg="#0F5257", accent="#16767C", accent2="#FF8A5B", line="#FF8A5B", script="#FF8A5B", ink="#FFFFFF"),
    "navy": dict(bg="#14213D", accent="#22335C", accent2="#FCA311", line="#FCA311", script="#FCA311", ink="#FFFFFF"),
    "olive": dict(bg="#556B2F", accent="#6B8540", accent2="#F4E285", line="#F4E285", script="#F4E285", ink="#FFFFFF"),
    "red": dict(bg="#C62828", accent="#8E1B1B", accent2="#FFD54F", line="#FFD54F", script="#FFD54F", ink="#FFFFFF"),
}
bday = [
    ("Forest Arch Birthday Story", STORY, "forest", dict(frame="arch", accent="band", script="Great Vibes"), dict(photo="graduation", name="SARA · 24 OCTOBER", tag="Made with love")),
    ("Orange Hexagon Birthday Post", POST, "orange", dict(frame="hexagon", accent="corner", script="Pacifico", heavy="Anton"), dict(photo="x_man2", name="KARIM TURNS 25", msg="Cake, music and good people. Saturday 8 PM.")),
    ("Maroon Gold Birthday Post", POST, "maroon", dict(frame="circle", accent="circle", script="Great Vibes", heavy="Bebas Neue"), dict(photo="x_skin2", name="LAYLA", msg="Wishing you a year as lovely as you are.")),
    ("Black Gold Birthday Story", STORY, "noir", dict(frame="arch", accent="stripes", script="Parisienne", heavy="Anton"), dict(photo="x_sunglass", name="HAPPY 30TH, MAYA", tag="With love, the girls")),
    ("Purple Blob Birthday Post", POST, "purple", dict(frame="blob", accent="circle", script="Pacifico", heavy="Archivo Black", seed=4), dict(photo="x_kids", script="Happy", big="BIRTH DAY", name="NOAH IS SEVEN!", msg="Games, cake and a bouncy castle. Saturday 3 PM.")),
    ("Pink Heart Birthday Post", SQ, "pink", dict(frame="heart", accent="corner", script="Dancing Script", heavy="Anton"), dict(photo="x_friends2", name="BESTIE BIRTHDAY", sub="LOVE YOU")),
    ("Teal Diamond Birthday Post", POST, "teal", dict(frame="diamond", accent="band", script="Satisfy", heavy="Bebas Neue"), dict(photo="x_man", name="OMAR · 40 YEARS YOUNG", msg="Join us for dinner at The Terrace.")),
    ("Navy Slant Birthday Story", STORY, "navy", dict(frame="slant", accent="corner", script="Great Vibes", heavy="Oswald"), dict(photo="fashion2", name="HAPPY 18TH, ZARA", tag="Let's celebrate")),
    ("Olive Arch Birthday Post", POST, "olive", dict(frame="arch", accent="split", script="Pacifico", heavy="Anton"), dict(photo="motherchild", script="Happy", big="BIRTHDAY", sub="MOM", name="TO THE BEST MUM", msg="For every hug and every story. We love you.")),
    ("Red Circle Birthday Post", SQ, "red", dict(frame="circle", accent="band", script="Great Vibes", heavy="Luckiest Guy"), dict(photo="cake", name="ADAM TURNS 8", sub="PARTY TIME")),
    ("Forest Hexagon Kids Party Story", STORY, "forest", dict(frame="hexagon", accent="circle", script="Pacifico", heavy="Archivo Black"), dict(photo="x_balloons2", script="Let's", big="PARTY", sub="YOU'RE INVITED", name="LIAM IS 5 · SAT 2 NOV · 4 PM", tag="Play Planet, Dubai Hills")),
    ("Noir Circle 50th Birthday Post", POST, "noir", dict(frame="circle", accent="stripes", script="Great Vibes", heavy="Bebas Neue"), dict(photo="champagne2", script="Cheers to", big="FIFTY", sub="YEARS", name="RANIA · FRIDAY 6 DECEMBER", msg="Black tie · The Ritz-Carlton, Dubai")),
    ("Orange Arch Dad Birthday Post", POST, "orange", dict(frame="arch", accent="circle", script="Satisfy", heavy="Anton"), dict(photo="fatherson", script="Happy", big="BIRTHDAY", sub="DAD", name="OUR HERO", msg="Thanks for everything, even the jokes.")),
    ("Purple Heart Sister Birthday Story", STORY, "purple", dict(frame="heart", accent="band", script="Dancing Script", heavy="Anton"), dict(photo="x_friends", name="TO MY SISTER", tag="Love you to the moon")),
    ("Teal Blob Birthday Square", SQ, "teal", dict(frame="blob", accent="split", script="Great Vibes", heavy="Archivo Black", seed=7), dict(photo="x_family2", script="Happy", big="BIRTHDAY", name="GRANDPA · 80 YEARS")),
    ("Navy Diamond Sweet 16 Post", POST, "navy", dict(frame="diamond", accent="circle", script="Pacifico", heavy="Bebas Neue"), dict(photo="x_shop3", script="Sweet", big="SIXTEEN", sub="PARTY", name="AYA · SATURDAY 9 PM", msg="Dress code: sparkle.")),
    ("Pink Arch First Birthday Post", POST, "pink", dict(frame="arch", accent="circle", script="Pacifico", heavy="Archivo Black"), dict(photo="x_baby2", script="Our little", big="ONE", sub="YEAR OLD", name="ALI'S FIRST BIRTHDAY", msg="Garden party · Sunday 11 AM")),
    ("Maroon Slant Husband Birthday Story", STORY, "maroon", dict(frame="slant2", accent="stripes", script="Great Vibes", heavy="Oswald"), dict(photo="x_couple5", name="TO MY HUSBAND", tag="Forever yours")),
]
for title, size, pal, v, c in bday:
    c.setdefault("script", "Happy")
    c.setdefault("big", "BIRTHDAY")
    c.setdefault("sub", "TO YOU")
    add(title, "Birthday", size, "birthday", c, BP[pal], v, kw="birthday post, birthday story, instagram birthday, bold")

# ---------------------------------------------------------- certificates
CP = {
    "navy": dict(dark="#14213D", gold="#C9A24A", paper="#FFFFFF"),
    "black": dict(dark="#151515", gold="#C9A24A", paper="#FFFFFF"),
    "maroon": dict(dark="#5B1A24", gold="#C9A24A", paper="#FFFDF8"),
    "emerald": dict(dark="#0F3B2E", gold="#C9A24A", paper="#FFFFFF"),
    "teal": dict(dark="#0F5257", gold="#E0A458", paper="#FFFFFF"),
    "purple": dict(dark="#33204F", gold="#C9A24A", paper="#FFFFFF"),
    "cream": dict(dark="#2B2B2B", gold="#B58B3B", paper="#FBF7EE"),
}
certs = [
    ("Navy Gold Wave Certificate of Achievement", "navy", "wave", "OF ACHIEVEMENT", "Aisha Rahman", "For outstanding performance in the Brand Design Workshop, completed in Dubai, November 2026.", "BEST\nAWARD"),
    ("Black Gold Diagonal Certificate of Appreciation", "black", "diagonal", "OF APPRECIATION", "Omar Haddad", "In grateful recognition of your dedication, leadership and the energy you bring to our team every day.", "THANK\nYOU"),
    ("Maroon Frame Certificate of Excellence", "maroon", "frame", "OF EXCELLENCE", "Sara Khalil", "Awarded for excellence in academic achievement during the 2026–27 school year.", "TOP\nSTUDENT"),
    ("Emerald Side Band Certificate of Completion", "emerald", "band", "OF COMPLETION", "Daniel Thomas", "Has successfully completed the 40-hour Digital Marketing Professional programme.", "CERTIFIED"),
    ("Teal Ribbon Certificate of Participation", "teal", "ribbon", "OF PARTICIPATION", "Mariam Yousef", "For taking part in the Future Tech Summit Hackathon, 14–15 March 2027.", "2027"),
    ("Purple Wave Employee of the Month Certificate", "purple", "wave", "EMPLOYEE OF THE MONTH", "Ravi Kumar", "For going above and beyond for our customers in October 2026.", "STAR\nAWARD"),
    ("Cream Frame Certificate of Recognition", "cream", "frame", "OF RECOGNITION", "Lina Haddad", "In recognition of 10 years of loyal service and commitment.", "10\nYEARS"),
    ("Navy Diagonal Training Certificate", "navy", "diagonal", "OF TRAINING", "Ahmed Saleh", "Has completed the First Aid & Workplace Safety training (8 hours).", "SAFETY\nFIRST"),
    ("Black Side Band Course Certificate", "black", "band", "OF COMPLETION", "Hana Ali", "Has completed Photography Essentials: light, composition and editing.", "PRO\nCOURSE"),
    ("Emerald Wave Sports Award Certificate", "emerald", "wave", "SPORTS AWARD", "Zayd Omar", "Most Valuable Player, Inter-school Football Cup 2026.", "MVP"),
    ("Maroon Ribbon Volunteer Certificate", "maroon", "ribbon", "OF SERVICE", "Noor Hassan", "With heartfelt thanks for 120 hours of volunteering with our community kitchen.", "THANK\nYOU"),
    ("Teal Frame Kids Achievement Certificate", "teal", "frame", "STAR OF THE WEEK", "Adam Khan", "For being kind, curious and always ready to help in Grade 2B.", "STAR"),
    ("Purple Diagonal Graduation Certificate", "purple", "diagonal", "OF GRADUATION", "Yasmin Farah", "Has graduated from the Junior Leadership Programme with distinction.", "CLASS OF\n2027"),
    ("Navy Band Webinar Certificate", "navy", "band", "OF ATTENDANCE", "Priya Nair", "Attended the live webinar 'Growing Your Small Business Online', 27 November 2026.", "LIVE\nSESSION"),
]
for title, pal, style, kind, name, body, seal in certs:
    add(title, "Certificates", CERT, "certificate", dict(kind=kind, name=name, body=body, seal=seal, date="Issued on 27 October 2026", org="Magical Academy"), CP[pal],
        dict(style=style, script="Great Vibes" if style != "band" else "Pinyon Script", title_font="Cinzel" if style in ("wave", "frame", "band") else "Playfair Display"),
        kw="certificate, award, appreciation, achievement, completion")

# ------------------------------------------------------------- valentine
VP = {
    "pink": dict(bg="#FFD6E0", bg2="#FF8FB1", hearts=["#FFFFFF", "#FF4D79", "#FFC2D1"], ink="#8B0F3A", ink2="#C2185B", accent="#FF4D79"),
    "red": dict(bg="#C2102F", bg2="#7A0A1E", hearts=["#FF4D6D", "#FFFFFF", "#FFB3C1"], ink="#FFFFFF", ink2="#FFD6E0", accent="#FF4D6D"),
    "blush": dict(bg="#FFF0F3", bg2="#FFD6E0", hearts=["#FF8FAB", "#FB6F92", "#FFE5EC"], ink="#7A1F3D", ink2="#C9184A", accent="#FB6F92"),
    "berry": dict(bg="#8E1E52", bg2="#4A0D2B", hearts=["#F06292", "#FFFFFF", "#F8BBD0"], ink="#FFFFFF", ink2="#F8BBD0", accent="#F06292"),
}
vals = [
    ("Pink Heart Photo Valentine Post", POST, "pink", "heart", "x_couple5", "Happy Valentine's Day", "MY FOREVER", "Every love story is beautiful, but ours is my favourite."),
    ("Red Polaroid Valentine Post", POST, "red", "polaroid", "couple", "Be Mine", "HAPPY VALENTINE'S DAY", "You and me, always."),
    ("Blush Arch Valentine Story", STORY, "blush", "arch", "x_couple6", "I Love You", "TODAY · TOMORROW · ALWAYS", "Happy Valentine's Day to my favourite person."),
    ("Berry Heart Valentine Square", SQ, "berry", "heart", "roses", "Valentine's Sale", "UP TO 40% OFF", "Gifts, flowers and treats for your special someone."),
    ("Red Heart Anniversary Post", POST, "red", "heart", "x_couple7", "Happy Anniversary", "40 YEARS OF LOVE", "To Mum & Dad, with all our love."),
    ("Pink Polaroid Love Story", STORY, "pink", "polaroid", "engagement", "She Said Yes", "WE'RE ENGAGED", "Thank you for all the love. The big day is coming."),
    ("Blush Heart Galentine Post", SQ, "blush", "heart", "x_friends2", "Happy Galentine's", "BEST FRIENDS FOREVER", None),
    ("Berry Arch Valentine Dinner Post", POST, "berry", "arch", "finedining", "Valentine's Dinner", "14 FEBRUARY · 7 PM", "A four-course menu for two. Book your table."),
]
for title, size, pal, lay, ph, scr, sub, msg in vals:
    add(title, "Love & Family", size, "valentine", dict(photo=ph, script=scr, sub=sub, msg=msg), VP[pal], dict(layout=lay, script="Great Vibes" if pal != "pink" else "Dancing Script"), kw="valentine, love, heart, couple")

# --------------------------------------------------------------- wedding
WP = {
    "sage": dict(bg="#A3B18A", card="#FBFAF5", accent="#7A8B5A", leaf="#6B7F4E", ink="#2F3A2A"),
    "terra": dict(bg="#C8775B", card="#FFF8F1", accent="#B5654A", leaf="#8A9A5B", ink="#4A2C22"),
    "rose": dict(bg="#D8A7B1", card="#FFFAFA", accent="#B5838D", leaf="#8A9A7B", ink="#4A2F35"),
    "slate": dict(bg="#7D8FA3", card="#FBFCFD", accent="#5C6F84", leaf="#7C9473", ink="#26313D"),
    "sand": dict(bg="#D9C3A5", card="#FFFDF8", accent="#A68A64", leaf="#8A9A6B", ink="#3B3127"),
    "olive": dict(bg="#5C6B3C", card="#FBFAF2", accent="#7C8A52", leaf="#6B7F4E", ink="#2E3520"),
}
weds = [
    ("Sage Arch Wedding Invitation", "sage", "arch", "couple", "Layla & Omar", "Saturday, 17 April 2027", "Al Barari · Dubai"),
    ("Terracotta Circle Wedding Invitation", "terra", "circle", "x_couple6", "Amira & Daniel", "Saturday, 14 February 2027", "The Garden Pavilion"),
    ("Rose Arch Save the Date", "rose", "arch", "rings", "Hana & James", "12 · 06 · 2027", "Dubai · Invitation to follow"),
    ("Slate Rounded Wedding Invitation", "slate", "rounded", "venue", "Sara & Adam", "Thursday, 15 April 2027 · 7 PM", "Al Habtoor Grand Ballroom"),
    ("Sand Arch Engagement Invitation", "sand", "arch", "engagement", "Mariam & Yousef", "Friday, 5 March 2027 · 8 PM", "The Rose Garden, Jumeirah"),
    ("Olive Circle Wedding Invitation", "olive", "circle", "bridebouquet", "Noor & Ali", "Saturday, 9 January 2027", "Hatta Farm House"),
    ("Sage Rounded Thank You Card", "sage", "rounded", "weddingtable", "Thank you", "For celebrating with us", "Zara & Ali"),
    ("Rose Circle Bridal Shower Invitation", "rose", "circle", "x_bride", "Bridal Shower", "Saturday, 2 April 2027 · 3 PM", "Honouring Aisha · Tea at The Lounge"),
]
for title, pal, fr, ph, names, date, venue in weds:
    kick = "TOGETHER WITH THEIR FAMILIES" if "Invitation" in title and "Bridal" not in title else ("SAVE THE DATE" if "Save" in title else ("WITH LOVE" if "Thank" in title else "YOU ARE INVITED"))
    line = "INVITE YOU TO CELEBRATE THEIR WEDDING" if kick.startswith("TOGETHER") else ("ARE GETTING MARRIED" if "Save" in title else ("" if "Thank" in title else "PLEASE JOIN US"))
    add(title, "Wedding", CARD, "wedding", dict(photo=ph, names=names, date=date, venue=venue, kicker=kick, line=line or " "), WP[pal], dict(frame=fr, script="Great Vibes" if pal in ("sage", "slate", "olive") else "Parisienne"), kw="wedding invitation, save the date, floral")

# ---------------------------------------------------------------- agency
AP = {
    "green": dict(bg="#0E3B2C", accent="#2BD47D"),
    "teal": dict(bg="#0B4F5C", accent="#3FD0C9"),
    "navy": dict(bg="#101C3D", accent="#FFC53D"),
    "red": dict(bg="#5A0F1C", accent="#FF5A5F"),
    "black": dict(bg="#111111", accent="#C6FF3D"),
    "purple": dict(bg="#2A1450", accent="#FF7AD9"),
}
ags = [
    ("Green Creative Marketing Agency Post", POST, "green", "circle", "x_man", "Creative\nMarketing\nAgency", "Expand your digital footprint starting today."),
    ("Teal Digital Agency Post", POST, "teal", "slant", "x_man2", "Digital\nMarketing", "Strategy, content and ads that bring real customers."),
    ("Navy We Are Creative Post", POST, "navy", "circle", "x_skin3", "We Are\nCreative", "Branding, websites and social media for growing businesses."),
    ("Red Marketing Expert Post", POST, "red", "slant", "x_doctor", "Business\nStrategy", "Grow faster with a plan made for your business."),
    ("Black Neon Agency Story", STORY, "black", "circle", "x_man2", "Grow\nYour\nBrand", "Social media management from AED 1,500 a month."),
    ("Purple Social Media Agency Post", POST, "purple", "bottom", "team", "Social\nMedia\nExperts", "Content that stops the scroll."),
    ("Green Web Design Agency Post", POST, "green", "bottom", "x_desk", "Web\nDesign", "Fast, beautiful websites that sell. Free consultation."),
    ("Teal Consulting Agency Story", STORY, "teal", "slant", "handshake", "Smart\nConsulting", "Clear advice. Real results."),
]
SERV = ["Social media marketing", "Brand identity", "Content creation", "Paid ads (Meta & Google)"]
for i, (title, size, pal, lay, ph, ttl, sub) in enumerate(ags):
    add(title, "Marketing", size, "agency", dict(photo=ph, title=ttl, sub=sub, services=SERV, cta="Book a free call", web="www.yourbrand.com", kicker="WE ARE" if i % 2 else "YOUR GROWTH PARTNER"),
        AP[pal], dict(layout=lay, outline=1 if i % 3 == 0 else None, heavy="Anton" if i % 2 == 0 else "Bebas Neue"), kw="marketing agency, business, social media, services")

# ---------------------------------------------------------------- collage
LP = {
    "cream": dict(bg="#F6F1E7", ink="#2B2B2B", accent="#C0583A"),
    "mint": dict(bg="#E3F4EC", ink="#1F3B2D", accent="#2E8B57"),
    "blush": dict(bg="#FCE8EC", ink="#5A1E33", accent="#D6336C"),
    "sky": dict(bg="#E6F0FA", ink="#14213D", accent="#2563EB"),
    "black": dict(bg="#141414", ink="#FFFFFF", accent="#F4C95D"),
    "olive": dict(bg="#B5B35C", ink="#2E3520", accent="#FFFFFF"),
}
cols = [
    ("Cream Three Photo Collage", SQ, "cream", "hero3", ["beach", "travel2", "mountains"], "Summer Memories", "SUMMER 2026"),
    ("Mint Four Photo Grid", SQ, "mint", "quad", ["picnic", "x_family2", "family", "x_friends"], "Family Time", "OUR WEEKEND"),
    ("Blush Polaroid Collage", SQ, "blush", "polaroids", ["x_couple5", "x_couple6", "couple", "engagement"], "Our Story", ""),
    ("Sky Strips Travel Collage", POST, "sky", "strips", ["travel3", "x_mount2", "ocean"], "Wanderlust", "48 HOURS IN THE MOUNTAINS"),
    ("Black Mosaic Photo Dump", POST, "black", "mosaic5", ["x_friends3", "dj", "party", "x_friends", "sparkler"], "Weekend Dump", "NIGHTS TO REMEMBER"),
    ("Olive Circles Collage", SQ, "olive", "circles", ["x_family2", "x_kids", "fatherson", "motherchild", "picnic"], "Family", "MADE WITH LOVE"),
    ("Cream Six Photo Grid", POST, "cream", "six", ["food", "x_pasta2", "dessert", "coffee", "x_croiss", "salad"], "Food Diary", "WHAT WE ATE THIS WEEK"),
    ("Sky Tall Two Photo Collage", SQ, "sky", "tall2", ["house", "x_living3"], "Before & After", "HOME MAKEOVER"),
    ("Mint Rounded Mosaic", POST, "mint", "mosaic5", ["plants", "x_plant2", "flowers", "blossom", "bouquet"], "In Bloom", "SPRING EDIT"),
    ("Blush Circles Baby Collage", SQ, "blush", "circles", ["newborn", "x_baby2", "babyfeet", "babyshoes", "motherchild"], "Hello Baby", "OUR FIRST MONTH"),
    ("Black Strips Fashion Collage", STORY, "black", "strips", ["x_shop3", "x_sunglass", "fashion"], "New Season", "THE EDIT"),
    ("Cream Polaroid Travel Collage", POST, "cream", "polaroids", ["beach2", "travel", "x_pool", "x_beach3"], "Wish You Were Here", ""),
]
for title, size, pal, lay, phs, ttl, sub in cols:
    add(title, "Social Media", size, "collage", dict(photos=phs, title=ttl, sub=sub or " "), LP[pal], dict(layout=lay, round=lay in ("mosaic5", "quad") and "Rounded" in title, dots=pal in ("cream", "blush"), title_top=lay == "strips", script="Pacifico" if pal in ("cream", "olive") else "Dancing Script"), kw="photo collage, photo grid, memories")

# -------------------------------------------------------------- christmas
XP = {
    "red": dict(bg="#A4161A", gold="#E9C46A", orn=["#E9C46A", "#FFFFFF", "#2D6A4F", "#E9C46A"]),
    "green": dict(bg="#1B4332", gold="#E9C46A", orn=["#C1121F", "#E9C46A", "#FFFFFF", "#C1121F"]),
    "navy": dict(bg="#13294B", gold="#E9C46A", orn=["#C1121F", "#E9C46A", "#FFFFFF", "#7FB3D5"]),
}
xm = [
    ("Red Photo Merry Christmas Post", POST, "red", "photo", "x_family3", "Merry Christmas", "AND A HAPPY NEW YEAR", "Wishing you joy, peace and lots of cookies."),
    ("Green Photo Christmas Greeting", SQ, "green", "photo", "xmastree", "Season's Greetings", "FROM OUR FAMILY TO YOURS", ""),
    ("Navy Christmas Sale Post", POST, "navy", "sale", "gifts", "Christmas", "UP TO 50% OFF", "Gifts for everyone on your list. Online and in store until 24 December."),
    ("Red Christmas Sale Story", STORY, "red", "sale", "gifts2", "Holiday", "BUY 2 GET 1", "Our biggest festive deals of the year."),
    ("Green Christmas Party Invitation", POST, "green", "photo", "x_lights", "Christmas Party", "FRIDAY 20 DEC · 8 PM", "Dinner, music and Secret Santa. Dress festive!"),
    ("Navy Photo Happy Holidays Story", STORY, "navy", "photo", "ornaments", "Happy Holidays", "WARM WISHES", "From all of us at Studio 9."),
]
for title, size, pal, lay, ph, scr, sub, msg in xm:
    c = dict(photo=ph, script=scr, sub=sub, msg=msg)
    if lay == "sale":
        c["big"] = "SALE" if "BUY" not in sub else "DEALS"
    add(title, "Festivals", size, "christmas", c, XP[pal], dict(layout=lay), kw="christmas, holiday, festive")

# ------------------------------------------------------------- second set
more_bday = [
    ("Teal Arch Birthday Story", STORY, "teal", dict(frame="arch", accent="circle", script="Pacifico", heavy="Anton"), dict(photo="x_skin3", name="HAPPY BIRTHDAY, NOOR", tag="Love, the family")),
    ("Red Hexagon Birthday Story", STORY, "red", dict(frame="hexagon", accent="stripes", script="Great Vibes", heavy="Bebas Neue"), dict(photo="x_man2", name="ZAYD TURNS 21", tag="Party at 9 PM")),
    ("Olive Circle Birthday Square", SQ, "olive", dict(frame="circle", accent="corner", script="Satisfy", heavy="Anton"), dict(photo="x_couple7", name="GRANDMA · 70 YEARS", sub="WITH LOVE")),
    ("Pink Slant Birthday Post", POST, "pink", dict(frame="slant", accent="stripes", script="Pacifico", heavy="Archivo Black"), dict(photo="x_sunglass", name="MAYA · 27", msg="Brunch, bubbles and you. Sunday 11 AM.")),
    ("Purple Diamond Birthday Square", SQ, "purple", dict(frame="diamond", accent="split", script="Great Vibes", heavy="Bebas Neue"), dict(photo="x_man", name="HAPPY 35TH, OMAR")),
    ("Maroon Arch Birthday Wishes Post", POST, "maroon", dict(frame="arch", accent="band", script="Parisienne", heavy="Oswald"), dict(photo="bouquet", script="Birthday", big="WISHES", sub="FOR YOU", name="DEAR AMMA", msg="May your year bloom with love and good health.")),
    ("Noir Hexagon Birthday Party Story", STORY, "noir", dict(frame="hexagon", accent="corner", script="Pacifico", heavy="Anton"), dict(photo="sparkler", script="Birthday", big="BASH", sub="FRIDAY · 10 PM", name="ROOFTOP · DOWNTOWN", tag="Guest list only")),
    ("Navy Circle Birthday Post", POST, "navy", dict(frame="circle", accent="band", script="Great Vibes", heavy="Archivo Black"), dict(photo="x_teacher", script="Happy", big="BIRTHDAY", sub="TEACHER", name="DEAR MS. PRIYA", msg="Thank you for every lesson. From Grade 4B.")),
    ("Orange Blob Kids Birthday Story", STORY, "orange", dict(frame="blob", accent="circle", script="Pacifico", heavy="Luckiest Guy", seed=11), dict(photo="cupcakes", script="Yay!", big="PARTY", sub="YOU'RE INVITED", name="MIA IS 6 · SAT 9 NOV · 3 PM", tag="Bounce Park, Al Quoz")),
    ("Forest Heart Birthday Post", POST, "forest", dict(frame="heart", accent="corner", script="Dancing Script", heavy="Anton"), dict(photo="x_couple6", script="Happy", big="BIRTHDAY", sub="MY LOVE", name="TO MY WIFE", msg="Every day with you is a gift.")),
]
for title, size, pal, v, c in more_bday:
    c.setdefault("script", "Happy")
    c.setdefault("big", "BIRTHDAY")
    c.setdefault("sub", "TO YOU")
    add(title, "Birthday", size, "birthday", c, BP[pal], v, kw="birthday post, birthday story, instagram birthday, bold")

more_certs = [
    ("Black Gold Wave Certificate of Excellence", "black", "wave", "OF EXCELLENCE", "Fatima Zahra", "For exceptional results in the Quarterly Sales Challenge, Q3 2026.", "TOP\nSELLER"),
    ("Emerald Diagonal Certificate of Appreciation", "emerald", "diagonal", "OF APPRECIATION", "Thomas George", "Thank you for your outstanding support as a mentor this year.", "THANK\nYOU"),
    ("Maroon Wave Certificate of Achievement", "maroon", "wave", "OF ACHIEVEMENT", "Reem Saeed", "For completing the Advanced Arabic Calligraphy course with honours.", "HONOURS"),
    ("Teal Band Certificate of Completion", "teal", "band", "OF COMPLETION", "Kevin Joseph", "Has completed the 6-week Python for Beginners bootcamp.", "CODING"),
    ("Cream Ribbon Certificate of Achievement", "cream", "ribbon", "OF ACHIEVEMENT", "Salma Idris", "For winning first place in the Spelling Bee 2026.", "1ST\nPLACE"),
    ("Purple Frame Certificate of Merit", "purple", "frame", "OF MERIT", "Arjun Menon", "Awarded for creativity and leadership in the Science Fair 2026.", "MERIT"),
    ("Navy Ribbon Best Employee Certificate", "navy", "ribbon", "BEST EMPLOYEE", "Grace Mathew", "In recognition of outstanding service and teamwork in 2026.", "BEST\nTEAM"),
    ("Emerald Frame Certificate of Membership", "emerald", "frame", "OF MEMBERSHIP", "Bilal Ahmed", "Is a registered member of the Gulf Photographers Club, 2026–27.", "MEMBER"),
]
for title, pal, style, kind, name, body, seal in more_certs:
    add(title, "Certificates", CERT, "certificate", dict(kind=kind, name=name, body=body, seal=seal, date="Issued on 27 October 2026", org="Magical Academy"), CP[pal],
        dict(style=style, script="Great Vibes" if style != "band" else "Pinyon Script", title_font="Cinzel" if style in ("wave", "frame", "band") else "Playfair Display"),
        kw="certificate, award, appreciation, achievement, completion")

more_ag = [
    ("Navy Business Growth Story", STORY, "navy", "bottom", "meeting", "Business\nGrowth", "Strategy sessions for founders and small teams."),
    ("Red Creative Studio Post", POST, "red", "circle", "x_sunglass", "Creative\nStudio", "Photography, video and design for brands that want to stand out."),
    ("Black Fitness Coach Post", POST, "black", "slant", "fitness", "Get\nFit\nNow", "Personal training plans that work. First session free."),
    ("Purple Beauty Salon Post", POST, "purple", "circle", "x_skin2", "Glow\nUp", "Facials, nails and hair. Book this week and save 20%."),
]
for i, (title, size, pal, lay, ph, ttl, sub) in enumerate(more_ag):
    serv = ["Facials & skincare", "Nails & lashes", "Hair styling", "Bridal packages"] if "Salon" in title else (["1-to-1 coaching", "Nutrition plans", "Group classes", "Online check-ins"] if "Fitness" in title else SERV)
    add(title, "Marketing", size, "agency", dict(photo=ph, title=ttl, sub=sub, services=serv, cta="Book now", web="www.yourbrand.com", kicker="NEW" if i % 2 else "WELCOME TO"),
        AP[pal], dict(layout=lay, outline=1 if i % 2 == 0 else None, heavy="Anton"), kw="business, services, promotion, social media")

more_val = [
    ("Red Arch Valentine Story", STORY, "red", "arch", "x_couple5", "Forever Yours", "HAPPY VALENTINE'S DAY", "You are my today and all of my tomorrows."),
    ("Blush Polaroid Anniversary Post", POST, "blush", "polaroid", "x_couple6", "Happy Anniversary", "ONE YEAR OF US", "Here's to many more sunsets together."),
]
for title, size, pal, lay, ph, scr, sub, msg in more_val:
    add(title, "Love & Family", size, "valentine", dict(photo=ph, script=scr, sub=sub, msg=msg), VP[pal], dict(layout=lay, script="Great Vibes"), kw="valentine, love, anniversary, couple")

more_col = [
    ("Sky Four Photo Grid", SQ, "sky", "quad", ["beach2", "x_pool", "travel", "x_beach3"], "Holiday Mode", "SUMMER 2026"),
    ("Olive Three Photo Collage", POST, "olive", "hero3", ["picnic", "x_kids", "motherchild"], "Little Moments", "FAMILY ALBUM"),
    ("Black Six Photo Grid", SQ, "black", "six", ["x_friends", "x_friends2", "x_friends3", "party", "dj", "sparkler"], "Squad Goals", "BEST NIGHT EVER"),
]
for title, size, pal, lay, phs, ttl, sub in more_col:
    add(title, "Social Media", size, "collage", dict(photos=phs, title=ttl, sub=sub), LP[pal], dict(layout=lay, dots=pal in ("cream", "blush"), script="Pacifico"), kw="photo collage, photo grid, memories")

more_x = [
    ("Green Christmas Sale Square", SQ, "green", "sale", "x_lights", "Merry", "UP TO 40% OFF", "Festive savings on everything in store.", "SALE"),
    ("Navy Photo New Year Wishes Post", POST, "navy", "photo", "fireworks", "Happy New Year", "WELCOME 2027", "New dreams, new beginnings.", None),
]
for title, size, pal, lay, ph, scr, sub, msg, big in more_x:
    c = dict(photo=ph, script=scr, sub=sub, msg=msg)
    if big:
        c["big"] = big
    add(title, "Festivals", size, "christmas", c, XP[pal], dict(layout=lay), kw="christmas, new year, holiday, festive")
