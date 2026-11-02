"""
Wave 2 (Nov 2026): big occasions (200–250 each), world regions (150 each,
professional and premium audiences) and multi-page books (magazines of
8–16 pages, photo albums of 8–12 pages). Same looks as the mass collection;
all wording, names and layouts are our own.

gen2(key) -> list of specs (like mass_spec.gen) with extra fields:
  occ   occasion name (templates.occasion)
  tags  extra tags (e.g. region-north-america)
  book  "magazine" | "album" for multi-page books (+ pages, plan)
"""

from __future__ import annotations

import random

from mass_spec import (POST, SQ, STORY, CARD, A4, LAND, FB, WEB, PH, L, R, pick, WARM, COOL, LUX, ALLP, PALWORD, ARCHWORD)

PH = dict(PH)
PH["luxury"] = ["x_pool", "hotel", "finedining", "gala", "champagne", "jewelry", "x_watch", "car", "perfume", "x_living3", "apartment", "venue2"]
PH["christmas"] = ["xmastree", "ornaments", "gifts", "gifts2", "x_lights", "x_bokeh", "fireworks2", "champagne2", "xmastree", "ornaments"]
PH["love"] = ["couple", "couple2", "x_couple5", "x_couple6", "roses", "x_roses3", "rings", "x_rings2", "engagement", "champagne", "flowers", "x_bouquet3"]
PH["mother"] = ["motherchild", "x_family2", "family", "flowers", "flowers2", "bouquet", "tea", "blossom", "x_baby2", "picnic", "whiteflowers"]
PH["father"] = ["fatherson", "x_family3", "family", "picnic", "x_watch", "car", "coffee", "football", "x_man", "x_man2", "running"]
PH["baby"] = ["newborn", "babyfeet", "babyshoes", "x_baby2", "x_cake2", "x_cake3", "cupcakes", "balloons", "x_balloons2", "x_balloons3", "motherchild", "family"]
PH["newyear"] = ["fireworks", "fireworks2", "champagne", "champagne2", "sparkler", "confetti", "x_lights", "x_bokeh", "gala", "dj"]
PH["diwali"] = ["diya", "lantern", "lantern2", "lantern3", "fireworks", "sparkler", "fireworks2", "x_bokeh", "gifts2"]
PH["eid"] = ["lantern", "lantern2", "lantern3", "x_bokeh", "finedining", "table", "dessert", "x_family3", "family", "lantern"]
PH["lights"] = ["diya", "lantern", "lantern2", "lantern3", "fireworks", "fireworks2", "x_bokeh", "sparkler"]

TPL_SIZE = {"post": [POST, SQ], "card": [CARD], "story": [STORY], "inv": [CARD], "a4": [A4], "fb": [FB], "web": [WEB], "land": [LAND]}
SPECIAL = {"sale", "tips", "menu", "banner", "product", "quote"}


# ------------------------------------------------------------------ helpers
def looks_for(pals, arts=True, lux=False):
    """A good spread of looks for greetings and promotions."""
    base = [
        L("hero_bottom", [POST, STORY, A4], ["editorial", "luxe", "display", "bold"], LUX + pals[:3]),
        L("hero_center", [POST, SQ, STORY], ["luxe", "classic", "editorial"], ["noir", "midnight", "emerald", "navy", "plum"], dict(title_size=140)),
        L("split", [POST, SQ, A4], ["friendly", "display", "grotesk", "classic"], pals),
        L("framed", [CARD, POST, A4], ["script", "elegant", "soft", "classic"], ["ivory", "sand", "blush", "sage"] + pals[:2], dict(photo_h=0.46, shape="arch")),
        L("shape", [POST, SQ, CARD], ["display", "script", "soft", "elegant"], pals + ["ivory"], dict(kind="arch")),
        L("shape", [POST, SQ, CARD], ["friendly", "display", "hand"], pals, dict(kind="scallop")),
        L("arch", [POST, CARD], ["script", "soft", "elegant"], ["blush", "sage", "ivory", "sand"] + pals[:2]),
    ]
    if arts:
        base += [
            L("elegant", [CARD, A4, POST], ["elegant", "luxe", "script", "classic"], ["ivory", "sand", "emerald", "navy", "noir"] + pals[:2], dict(laurel=True), photo=False, art=True),
            L("badge", [POST, SQ, CARD, STORY], ["display", "friendly", "luxe"], pals + LUX, photo=False, art=True),
            L("wave", [POST, SQ, STORY], ["display", "abril", "grotesk"], pals + COOL[:3], photo=False, art=True),
            L("typo", [POST, SQ, STORY], ["abril", "grotesk", "display", "bold"], pals + ["noir", "ivory"], dict(deco_kind="arcs"), photo=False, art=True),
            L("party", [POST, SQ, CARD], ["display", "friendly", "abril"], pals, dict(style="bunting"), photo=False, art=True),
        ]
    if lux:
        base += [L("hero_center", [POST, A4], ["luxe", "editorial"], ["noir", "midnight", "ivory"], dict(title_size=120, frame=True))]
    # special looks: only for items made for them
    base += [
        L("sale", [POST, STORY, A4, SQ], ["bold", "oswald", "display", "grotesk"], pals + ["noir", "ivory"]),
        L("tips", [POST, SQ], ["grotesk", "display", "friendly", "editorial"], pals + ["ivory", "noir"], photo=False),
        L("menu", [A4], ["editorial", "classic", "luxe", "display"], ["ivory", "noir", "emerald", "sand"] + pals[:2]),
        L("banner", [FB, WEB], ["display", "bold", "grotesk", "editorial"], pals + ["noir", "ivory"], dict(kind="slant")),
        L("product", [POST, SQ], ["display", "grotesk", "luxe"], pals + ["ivory"], dict(kind="circle")),
    ]
    return base


def occasion_items(o):
    """~60 content items for one big occasion."""
    r = R(o["seed"])
    out = []
    N = o["name"]
    fam = o["families"]
    biz = o["businesses"]
    # greeting posts and cards
    for i, (title, sub) in enumerate(zip(o["titles"] * 6, o["subs"] * 3)):
        if i >= 18:
            break
        kick = o["kickers"][i % len(o["kickers"])]
        brand = (fam + [b[0] for b in biz])[i % (len(fam) + len(biz))]
        out.append(dict(name=f"{N} {['Greeting Post', 'Wishes Post', 'Family Greeting', 'Business Wishes Post', 'Message Post', 'Celebration Post'][i % 6]} {i // 6 + 1}", fmt="post",
                        c=dict(kicker=kick, title=title, sub=sub, brand=brand), kw=o["kw"]))
    for i in range(10):
        out.append(dict(name=f"{N} Card {['Classic', 'Heartfelt', 'Modern', 'Elegant', 'Simple', 'Warm', 'Bright', 'Luxe', 'Soft', 'Sweet'][i]}", fmt="card",
                        c=dict(accent=o["titles"][i % len(o["titles"])], title=o["dears"][i % len(o["dears"])], sub=o["subs"][(i * 3) % len(o["subs"])], brand=o["signoffs"][i % len(o["signoffs"])]), kw=o["kw"] + ", greeting card"))
    for i in range(6):
        out.append(dict(name=f"{N} Story {['Countdown', 'Wishes', 'Invite', 'Sale', 'Moments', 'Thank You'][i]}", fmt="story",
                        c=dict(kicker=["3 days to go", "Warm wishes", "Join us", "Limited time", "Our favourite moments", "Thank you"][i], title=o["titles"][i % len(o["titles"])],
                               sub=o["subs"][(i * 2 + 1) % len(o["subs"])], details=[f"{pick(r, o['dates'])}", pick(r, o["places"])] if i in (0, 2) else None, cta=["Save the date", None, "RSVP", "Shop now", None, None][i]), kw=o["kw"] + ", story"))
    for i, (ev, sub) in enumerate(o["events"]):
        out.append(dict(name=f"{ev} Invitation", fmt="inv", c=dict(kicker="You're invited", title=ev, sub=sub, details=[f"{pick(r, o['dates'])} · {pick(r, ['6 PM', '7 PM', '7:30 PM', '12 noon', '11 AM', '8 PM'])}", pick(r, o["places"])], cta="RSVP"), kw=o["kw"] + ", invitation, party"))
        out.append(dict(name=f"{ev} Poster", fmt="a4", c=dict(kicker=N, title=ev, sub=sub, details=[pick(r, o["dates"]), pick(r, o["places"])], cta="Book your table" if "Dinner" in ev or "Brunch" in ev else "Join us"), kw=o["kw"] + ", event poster"))
    for i, (bname, kind, ph) in enumerate(biz):
        big = ["40% OFF", "30% OFF", "Buy 1 Get 1", "25% OFF", "Free gift", "50% OFF", "20% OFF", "Up to 60% OFF"][i % 8]
        out.append(dict(name=f"{bname} {N} Sale", fmt="post", arch_only=["sale"], ph=ph,
                        c=dict(brand=bname, title=o["sale_titles"][i % len(o["sale_titles"])], big=big, sub=f"{kind} — {pick(r, o['sale_subs'])}", code=f"{o['code']}{10 + i * 5}", cta="Shop now"), kw=o["kw"] + ", sale, offer"))
    for i, (t, items) in enumerate(o["tips"]):
        out.append(dict(name=f"{t}", fmt="post", arch_only=["tips"], c=dict(kicker=N, title=t, items=items, handle=pick(r, ["@yourbrand", "@studio.co", "@homeandco", "@thegiftbox"]), swipe="Save for later"), kw=o["kw"] + ", ideas, list"))
    for i, (bname, title, secs) in enumerate(o["menus"]):
        out.append(dict(name=f"{bname} {title}", fmt="a4", arch_only=["menu"], ph=o["menu_ph"], c=dict(kicker=bname, title=title, sections=secs, brand=pick(r, ["Reservations recommended", "Served from 7 PM", "Three courses · per guest"])), kw=o["kw"] + ", menu"))
    for i in range(4):
        bname, kind, ph = biz[i % len(biz)]
        out.append(dict(name=f"{bname} {N} {'Facebook Cover' if i % 2 == 0 else 'Web Banner'}", fmt="fb" if i % 2 == 0 else "web", arch_only=["banner"], ph=ph,
                        c=dict(kicker=N, title=o["sale_titles"][i % len(o["sale_titles"])], sub=f"{kind} · {pick(r, o['sale_subs'])}", cta="Shop the collection", web="www.yourbrand.com"), kw=o["kw"] + ", banner, cover"))
    for i, (pname, price, pts) in enumerate(o["products"]):
        out.append(dict(name=f"{pname} {N} Product Post", fmt="post", arch_only=["product"], ph=o["product_ph"],
                        c=dict(title=pname, sub=pick(r, o["sale_subs"]), price=price, points=pts, brand=pick(r, [b[0] for b in biz]), cta="Order now"), kw=o["kw"] + ", product post"))
    for x in out:
        x["occ"] = N
    return out


OCC = {}

OCC["christmas"] = dict(seed=71, name="Christmas", code="XMAS", kw="christmas template, christmas card, xmas post",
    titles=["Merry Christmas", "Happy Holidays", "Season's Greetings", "Joy to the World", "Merry & Bright", "Have a Holly Jolly Christmas"],
    subs=["Wishing you warmth, wonder and a very happy new year.", "May your home be filled with light and laughter.", "Peace, love and plenty of cake this season.", "Thank you for a wonderful year together.",
          "Here's to cosy nights and good company.", "May every wish you make come true.", "With love from our home to yours.", "Celebrate the little things this season."],
    kickers=["Warm wishes", "From all of us", "Season's greetings", "This Christmas", "With love"],
    dears=["Dear friends", "To our family", "Dear neighbours", "To the team", "Dear Grandma", "To our clients"],
    signoffs=["The Thomas family", "With love, Anna & Mark", "The Fernandes family", "Team Northwind", "Love always, Priya", "The Johnsons"],
    families=["The Thomas family", "The Fernandes family", "From our home to yours", "The Johnsons", "Anna, Mark & Leo"],
    businesses=[("Northwind Studio", "Gifts & home decor", "christmas"), ("Maison Rose", "Fashion boutique", "fashion"), ("Sweet Crumbs", "Bakery", "cafe"), ("Lumière Beauty", "Skincare", "beauty"), ("The Gift Box", "Gift shop", "christmas"), ("Velvet & Co.", "Jewellery", "luxury"), ("Hearth Home", "Furniture", "home"), ("Peak Outdoors", "Outdoor gear", "travel")],
    events=[("Christmas Party", "Food, music, secret Santa and lots of cheer."), ("Christmas Eve Dinner", "A festive three-course dinner by candlelight."), ("Office Christmas Party", "Celebrate a great year with the whole team."), ("Christmas Market", "Crafts, mulled drinks and festive treats."), ("Carol Night", "Sing along by the tree — everyone welcome."), ("Kids' Christmas Party", "Games, crafts and a visit from Santa!")],
    dates=["Friday 19 December", "Saturday 20 December", "Wednesday 24 December", "Saturday 13 December", "Sunday 21 December"],
    places=["The Grand Hall", "Skyline Terrace", "The Courtyard", "Riverside Club", "Maple House", "Our home"],
    sale_titles=["Christmas Sale", "Holiday Sale", "12 Days of Deals", "Festive Sale", "Gifts They'll Love"], sale_subs=["this week only", "while stocks last", "free gift wrapping", "free delivery over $50", "in store and online"],
    tips=[("Christmas Gift Guide", [("For her", "Scented candles, silk scarves, a good book."), ("For him", "Leather wallets, watches, gourmet coffee."), ("For kids", "Puzzles, art kits, cosy pyjamas."), ("Under $25", "Mugs, socks, hand cream, chocolates.")]),
          ("Christmas Checklist", [("Week 1", "Plan the menu and the guest list."), ("Week 2", "Buy and wrap the gifts."), ("Week 3", "Decorate the tree and the door."), ("Christmas Eve", "Prep, relax and enjoy.")]),
          ("Holiday Hosting Tips", [("Keep it simple", "One showstopper, easy sides."), ("Set the mood", "Candles, music, fairy lights."), ("Get ahead", "Desserts made the day before."), ("Say thanks", "A small gift for every guest.")]),
          ("Christmas Baking List", [("Gingerbread", "Spiced cookies to decorate."), ("Mince pies", "Buttery and sweet."), ("Yule log", "Chocolate sponge roll."), ("Plum cake", "Rich, fruity and festive.")])],
    menus=[("The Grill House", "Christmas Dinner Menu", [("Starters", [("Roasted pumpkin soup", "$12"), ("Smoked salmon", "$16")]), ("Mains", [("Roast turkey & trimmings", "$34"), ("Honey-glazed ham", "$30")]), ("Desserts", [("Christmas pudding", "$11"), ("Yule log", "$10")])]),
           ("Café Aroma", "Festive Drinks Menu", [("Hot", [("Gingerbread latte", "$6"), ("Hot chocolate", "$5")]), ("Cold", [("Cranberry spritz", "$7"), ("Iced peppermint mocha", "$6")]), ("Treats", [("Mince pie", "$4"), ("Stollen slice", "$5")])]),
           ("Maple House", "Christmas Eve Menu", [("To start", [("Burrata & pomegranate", "$15"), ("Chestnut soup", "$11")]), ("Main", [("Beef Wellington", "$42"), ("Mushroom Wellington", "$32")]), ("To finish", [("Sticky toffee pudding", "$12"), ("Cheese board", "$16")])])],
    menu_ph="food", product_ph="christmas",
    products=[("Festive Gift Hamper", "$59", ["Chocolates & cookies", "Scented candle", "Hand-written card"]), ("Advent Calendar", "$29", ["24 surprises", "Reusable box", "Kids and adults"]), ("Christmas Candle Set", "$35", ["Pine & cinnamon", "40-hour burn", "Gift boxed"]), ("Plum Cake", "$24", ["Rich & fruity", "1 kg", "Baked fresh"])],
    pals=["berry", "forest", "emerald", "noir", "ivory", "plum", "midnight", "sand"], target=250)

OCC["valentines"] = dict(seed=72, name="Valentine's Day", code="LOVE", kw="valentines day template, valentine card, love post",
    titles=["Happy Valentine's Day", "Be Mine", "Love You More", "You & Me", "All My Love", "Forever Yours"],
    subs=["You make every day better.", "Thank you for every laugh and every adventure.", "Still falling for you, every single day.", "Here's to us — today and always.",
          "My favourite place is next to you.", "Love is in the little things.", "Every love story is beautiful, but ours is my favourite.", "Happy heart day!"],
    kickers=["With love", "For you", "February 14", "Love is in the air", "To my person"],
    dears=["My love", "Dear you", "To my wife", "To my husband", "My forever", "To my best friend"],
    signoffs=["Yours always", "Love, Sam", "Forever yours, Maya", "All my love, Leo", "Your person", "XOXO"],
    families=["With love, Sam", "Yours always", "Love, Maya", "Your person"],
    businesses=[("Rosé Florist", "Flowers & bouquets", "love"), ("Velvet & Co.", "Jewellery", "luxury"), ("Maison Rose", "Fashion boutique", "fashion"), ("Sweet Crumbs", "Bakery", "cafe"), ("Lumière Beauty", "Beauty", "beauty"), ("Le Petit Bistro", "Restaurant", "food"), ("Cocoa & Co.", "Chocolatier", "cafe"), ("Serene Spa", "Spa", "beauty")],
    events=[("Valentine's Dinner", "A romantic five-course dinner for two."), ("Galentine's Brunch", "Bottomless coffee, pastries and best friends."), ("Valentine's Party", "Dance, drinks and lots of love."), ("Couples Spa Day", "Relax together — massages and bubbles."), ("Singles Mixer", "Meet someone new over cocktails."), ("Love Songs Live", "An evening of acoustic love songs.")],
    dates=["Saturday 14 February", "Friday 13 February", "Sunday 15 February", "Thursday 12 February"],
    places=["Le Petit Bistro", "Skyline Terrace", "The Rose Garden", "Serene Spa", "The Loft", "Blue Door Café"],
    sale_titles=["Valentine's Sale", "Love Week", "Gifts for Your Valentine", "Sweetheart Sale", "Love at First Sight"], sale_subs=["this week only", "free gift wrap", "order by 12 Feb", "same-day delivery", "online and in store"],
    tips=[("Valentine's Gift Ideas", [("Classic", "Roses, chocolates and a hand-written note."), ("Experience", "A cooking class or spa day for two."), ("Personal", "A photo book of your favourite memories."), ("Cosy night in", "Candles, dinner and a film.")]),
          ("Date Night Ideas", [("Picnic", "Sunset, blanket, favourite snacks."), ("Cook together", "Pick a new recipe and make it."), ("Stargazing", "Drive out of the city."), ("Recreate a first", "First date, first song, first dish.")]),
          ("Love Notes to Send", [("Morning", "You're the first thing I think of."), ("Lunch", "Can't wait to see you tonight."), ("Evening", "Home is wherever you are."), ("Anytime", "Thank you for being you.")])],
    menus=[("Le Petit Bistro", "Valentine's Dinner Menu", [("Amuse", [("Oyster & champagne", "$14")]), ("Starters", [("Beetroot carpaccio", "$14"), ("Scallops", "$19")]), ("Mains", [("Filet mignon", "$44"), ("Lobster risotto", "$40")]), ("Dessert", [("Chocolate fondant for two", "$18")])]),
           ("Cocoa & Co.", "Love Menu", [("Chocolates", [("Rose truffles", "$18"), ("Salted caramel hearts", "$15")]), ("Drinks", [("Red velvet latte", "$6"), ("Strawberry shake", "$7")]), ("Treats", [("Heart macarons", "$12")])])],
    menu_ph="food", product_ph="love",
    products=[("Red Rose Bouquet", "$65", ["12 long-stem roses", "Hand-tied", "Same-day delivery"]), ("Heart Pendant", "$120", ["Sterling silver", "Gift box", "Engraving included"]), ("Chocolate Box", "$28", ["16 handmade truffles", "Rose & raspberry", "Ribbon wrapped"]), ("Couples Spa Package", "$190", ["90-minute massage", "Bubbles & treats", "Private suite"])],
    pals=["berry", "rose", "blush", "noir", "ivory", "plum", "coral", "lilac"], target=230)

OCC["mothers"] = dict(seed=73, name="Mother's Day", code="MOM", kw="mothers day template, mothers day card, mom post",
    titles=["Happy Mother's Day", "Best Mum Ever", "Love You, Mom", "Thank You, Mum", "To the World's Best Mom", "Mom, You're Amazing"],
    subs=["For all the love you give every single day.", "Thank you for everything — big and small.", "You make home feel like home.", "Love you to the moon and back.",
          "Every good thing in me started with you.", "Here's to the woman who does it all.", "Your hugs fix everything.", "Today is all about you."],
    kickers=["With love", "Celebrating you", "For Mum", "This Sunday", "To my first friend"],
    dears=["Dear Mum", "Dear Mom", "To my mother", "Dear Amma", "Dear Mama", "To Grandma"],
    signoffs=["Love, Priya", "Your favourite child", "Love always, Leo & Mia", "With love, Sara", "Hugs, the kids", "Love you, Rahul"],
    families=["Love, Priya", "Leo & Mia", "With love, Sara", "From all of us"],
    businesses=[("Rosé Florist", "Flowers & bouquets", "mother"), ("Serene Spa", "Spa & wellness", "beauty"), ("Velvet & Co.", "Jewellery", "luxury"), ("Sweet Crumbs", "Bakery", "cafe"), ("Maison Rose", "Fashion boutique", "fashion"), ("The Garden Room", "Brunch café", "food"), ("Lumière Beauty", "Beauty", "beauty"), ("Bloom Home", "Home & gifts", "home")],
    events=[("Mother's Day Brunch", "A relaxed brunch with flowers for every mum."), ("Mother's Day High Tea", "Tea, sandwiches and cakes in the garden."), ("Mum & Me Workshop", "Make a flower crown together."), ("Mother's Day Lunch", "Three courses and a glass of bubbly."), ("Pamper Day for Mums", "Massage, facial and afternoon tea.")],
    dates=["Sunday 10 May", "Saturday 9 May", "Sunday 22 March", "Sunday 11 May"],
    places=["The Garden Room", "Serene Spa", "Blue Door Café", "Maple House", "The Courtyard"],
    sale_titles=["Mother's Day Sale", "Gifts for Mum", "Spoil Mum", "Made for Mum", "Mum Deserves It"], sale_subs=["this week only", "free gift wrap", "order by Friday", "free card with every order", "same-day delivery"],
    tips=[("Mother's Day Gift Ideas", [("Flowers", "Her favourite blooms, hand-tied."), ("Pamper", "A spa voucher or a bath set."), ("Memories", "A framed family photo."), ("Time", "Breakfast in bed and a day off.")]),
          ("Ways to Make Mum Smile", [("Write it down", "A letter about your favourite memory."), ("Cook for her", "Her favourite dish, your way."), ("Plan a day out", "Garden, gallery or a long lunch."), ("Call her", "Even a short call means a lot.")]),
          ("Brunch Ideas for Mum", [("Pancake stack", "Berries and maple syrup."), ("Avocado toast", "With a poached egg."), ("Fruit platter", "Fresh, colourful and easy."), ("Mimosa bar", "Orange, peach and grapefruit.")])],
    menus=[("The Garden Room", "Mother's Day Brunch Menu", [("Bakery", [("Croissant basket", "$9"), ("Blueberry muffin", "$5")]), ("Plates", [("Eggs Benedict", "$16"), ("Avocado toast", "$14"), ("French toast", "$13")]), ("Drinks", [("Mimosa", "$9"), ("Rose latte", "$6")])])],
    menu_ph="food", product_ph="mother",
    products=[("Mum's Bouquet", "$55", ["Peonies & roses", "Hand-tied", "Free card"]), ("Spa Gift Set", "$45", ["Bath salts & oil", "Candle", "Gift box"]), ("Birthstone Necklace", "$95", ["Sterling silver", "Personalised", "Gift boxed"]), ("Afternoon Tea for Two", "$60", ["Sandwiches & scones", "Cakes", "Bottomless tea"])],
    pals=["blush", "rose", "sage", "lilac", "peach", "ivory", "plum", "mint"], target=220)

OCC["fathers"] = dict(seed=74, name="Father's Day", code="DAD", kw="fathers day template, fathers day card, dad post",
    titles=["Happy Father's Day", "Best Dad Ever", "Thanks, Dad", "My Hero", "World's Greatest Dad", "Dad, You Rock"],
    subs=["Thank you for every lesson, joke and hug.", "For always being there.", "My first hero and forever friend.", "Here's to the man who taught me everything.",
          "Thanks for the bad jokes and the good advice.", "Today we celebrate you.", "Strong, kind and always there.", "Love you, Dad."],
    kickers=["For Dad", "Celebrating you", "This Sunday", "With love", "To my hero"],
    dears=["Dear Dad", "Dear Papa", "To my father", "Dear Appa", "Dear Grandpa", "To the best dad"],
    signoffs=["Love, Mia", "Your biggest fan", "Love always, Arjun", "From the kids", "Love you, Sam", "Hugs, Leo"],
    families=["Love, Mia", "From the kids", "Love always, Arjun", "Your biggest fan"],
    businesses=[("Steel & Oak", "Men's fashion", "fashion"), ("Timekeeper", "Watches", "luxury"), ("The Grill House", "Restaurant", "food"), ("Peak Outdoors", "Outdoor gear", "travel"), ("Gentleman's Cut", "Barber", "beauty"), ("Torque Garage", "Car care", "father"), ("Brew Lab", "Craft coffee", "cafe"), ("Fairway Club", "Golf club", "fitness")],
    events=[("Father's Day BBQ", "Burgers, games and the big match."), ("Father's Day Brunch", "Big breakfasts for the best dads."), ("Dad & Me Football", "A friendly match for dads and kids."), ("Father's Day Golf Day", "Nine holes, lunch and prizes."), ("Father's Day Dinner", "Steak night — dads eat on us.")],
    dates=["Sunday 21 June", "Saturday 20 June", "Sunday 7 September", "Sunday 15 June"],
    places=["The Grill House", "Fairway Club", "Riverside Club", "The Courtyard", "City Park"],
    sale_titles=["Father's Day Sale", "Gifts for Dad", "Dad Deserves It", "Made for Dad", "Treat Dad"], sale_subs=["this week only", "free engraving", "order by Thursday", "free gift wrap", "in store and online"],
    tips=[("Father's Day Gift Ideas", [("Classic", "A leather wallet or a good watch."), ("Hobby", "Tools, golf balls or a new book."), ("Experience", "Tickets to the match."), ("Homemade", "A photo book of your best days.")]),
          ("Ways to Celebrate Dad", [("Breakfast", "His favourite, served in bed."), ("Adventure", "A hike or a drive he loves."), ("Game night", "His pick of board games."), ("Say it", "Tell him what he means to you.")]),
          ("BBQ Checklist", [("Grill", "Charcoal, tongs, a clean grill."), ("Food", "Burgers, sausages, veg skewers."), ("Sides", "Corn, salad and fries."), ("Drinks", "Lemonade and cold drinks.")])],
    menus=[("The Grill House", "Father's Day Menu", [("Starters", [("Loaded nachos", "$12"), ("Chicken wings", "$14")]), ("Grill", [("Ribeye steak", "$38"), ("Smoky BBQ ribs", "$32")]), ("Dessert", [("Brownie sundae", "$10")])])],
    menu_ph="food", product_ph="father",
    products=[("Classic Leather Wallet", "$49", ["Full-grain leather", "Free initials", "Gift boxed"]), ("Steel Chronograph", "$189", ["Water resistant", "Steel strap", "2-year warranty"]), ("Grooming Kit", "$39", ["Beard oil & balm", "Comb", "Travel case"]), ("BBQ Tool Set", "$59", ["Stainless steel", "5 pieces", "Wooden case"])],
    pals=["navy", "cobalt", "forest", "olive", "noir", "sand", "teal", "ocean"], target=210)

OCC["newyear"] = dict(seed=75, name="New Year", code="NY", kw="new year template 2027, happy new year post, new year card",
    titles=["Happy New Year", "Hello 2027", "Cheers to 2027", "New Year, New Chapter", "Here's to 2027", "Happy New Year 2027"],
    subs=["Here's to new beginnings and good things ahead.", "Thank you for an amazing year — see you in 2027!", "May the new year bring health, joy and success.", "New goals, new dreams, same great people.",
          "Wishing you 365 days of good luck.", "Let's make it the best one yet.", "Thank you for being part of our story.", "Pop the bubbly — it's 2027!"],
    kickers=["Countdown", "Cheers", "Welcome 2027", "Goodbye 2026", "From all of us"],
    dears=["Dear friends", "To our clients", "To the team", "Dear family", "To our community", "Dear partners"],
    signoffs=["Team Northwind", "The Iyer family", "With love, Anna", "Bright Studio", "The Johnsons", "All of us at Apex"],
    families=["Team Northwind", "The Iyer family", "Bright Studio", "Apex Partners"],
    businesses=[("Apex Partners", "Consulting", "business"), ("Skyline Lounge", "Rooftop bar", "newyear"), ("Maison Rose", "Fashion", "fashion"), ("Pulse Fitness", "Gym", "fitness"), ("Lumière Beauty", "Beauty", "beauty"), ("Wander Travel", "Travel agency", "travel"), ("Northwind Studio", "Design studio", "business"), ("The Grill House", "Restaurant", "food")],
    events=[("New Year's Eve Party", "Music, bubbles and the big countdown."), ("New Year's Eve Gala", "Black tie dinner and live band."), ("Countdown Party", "Rooftop views of the fireworks."), ("New Year Brunch", "Start the year with a feast."), ("New Year Kick-off", "Our team plans the year ahead.")],
    dates=["Wednesday 31 December", "Thursday 1 January", "Friday 2 January", "Saturday 3 January"],
    places=["Skyline Lounge", "The Grand Hall", "Riverside Club", "The Loft", "Palm Grove"],
    sale_titles=["New Year Sale", "New Year, New You", "2027 Sale", "Fresh Start Sale", "January Sale"], sale_subs=["first week only", "new collection", "while stocks last", "free delivery", "in store and online"],
    tips=[("New Year Resolutions", [("Move more", "A 20-minute walk every day."), ("Read more", "One book a month."), ("Save more", "Put aside 10% of every pay."), ("Rest more", "Phone down an hour before bed.")]),
          ("Plan Your 2027", [("Reflect", "What went well in 2026?"), ("Choose 3 goals", "Few, clear and written down."), ("Make a plan", "Small monthly steps."), ("Check in", "Review every quarter.")]),
          ("New Year Party Checklist", [("Invites", "Send them two weeks ahead."), ("Playlist", "Countdown songs ready."), ("Bubbles", "Glasses and something to toast."), ("Midnight", "Sparklers and a big cheer.")])],
    menus=[("Skyline Lounge", "New Year's Eve Menu", [("To start", [("Oysters", "$18"), ("Tuna tartare", "$17")]), ("Main", [("Wagyu striploin", "$58"), ("Truffle risotto", "$36")]), ("At midnight", [("Champagne toast", "Included"), ("Chocolate gold bar", "$14")])])],
    menu_ph="food", product_ph="newyear",
    products=[("2027 Planner", "$24", ["Weekly spreads", "Goal pages", "Linen cover"]), ("Party Box", "$39", ["Sparklers & poppers", "Hats & glasses", "Countdown banner"]), ("Annual Membership", "$299", ["12 months access", "Free classes", "Guest passes"]), ("Bubbly Gift Set", "$65", ["Sparkling wine", "Two flutes", "Gift box"])],
    pals=["noir", "midnight", "navy", "plum", "ivory", "emerald", "sand", "cobalt"], target=220)

OCC["diwali"] = dict(seed=76, name="Diwali", code="DIWALI", kw="diwali template, deepavali wishes, diwali card",
    titles=["Happy Diwali", "Happy Deepavali", "Shubh Deepavali", "Festival of Lights", "Diwali Greetings", "Light Up Your Life"],
    subs=["May your home glow with light, love and sweets.", "Wishing you prosperity, peace and happiness.", "May the lights of Diwali brighten every day ahead.", "Sweets, smiles and sparkles to you and your family.",
          "May Goddess Lakshmi bless your home.", "Celebrate the victory of light over darkness.", "Warm wishes for a safe and joyful Diwali.", "From our family to yours."],
    kickers=["Warm wishes", "Festival of lights", "From all of us", "This Diwali", "Shubh Deepavali"],
    dears=["Dear family", "Dear friends", "To our clients", "Dear neighbours", "To the team", "Dear Nani"],
    signoffs=["The Iyer family", "With love, Priya & Rahul", "Team Northwind", "The Sharma family", "Love, Ananya", "The Mehtas"],
    families=["The Iyer family", "The Sharma family", "Priya & Rahul", "The Mehtas"],
    businesses=[("Kanchi Silks", "Sarees & silks", "fashion"), ("Lakshmi Jewellers", "Gold & diamonds", "luxury"), ("Sweet Crumbs", "Sweets & bakery", "cafe"), ("Diya Decor", "Home decor", "diwali"), ("Mehta Electronics", "Electronics", "business"), ("Aura Salon", "Salon", "beauty"), ("Spice Route", "Restaurant", "food"), ("Bloom Home", "Furniture", "home")],
    events=[("Diwali Party", "Lights, sweets, music and dance."), ("Diwali Mela", "Food stalls, rangoli and fireworks."), ("Diwali Dinner", "A festive thali with family and friends."), ("Office Diwali Celebration", "Puja, lunch and games for the team."), ("Rangoli Competition", "Show your colours — prizes for all ages.")],
    dates=["Saturday 7 November", "Sunday 8 November", "Friday 6 November", "Monday 9 November"],
    places=["Lotus Banquet", "The Grand Hall", "Community Hall", "Spice Route", "Palm Grove"],
    sale_titles=["Diwali Sale", "Festive Offers", "Deepavali Dhamaka", "Diwali Special", "Festival of Savings"], sale_subs=["this week only", "free gift with purchase", "easy EMI available", "free home delivery", "in store and online"],
    tips=[("Diwali Gift Ideas", [("Sweets", "A box of kaju katli and laddoos."), ("Diyas", "Hand-painted clay lamps."), ("Dry fruits", "Elegant gift boxes."), ("Silver", "Coins and small gifts.")]),
          ("Diwali Safety Tips", [("Light carefully", "Use long sparklers and stand back."), ("Keep water near", "A bucket of water and sand."), ("Cotton clothes", "Avoid loose, synthetic fabrics."), ("Pets", "Keep them indoors and calm.")]),
          ("Diwali Decor Ideas", [("Rangoli", "Colours, flowers or diyas."), ("Lights", "Fairy lights on the balcony."), ("Torans", "Marigold and mango leaves."), ("Lanterns", "Paper akash kandils.")])],
    menus=[("Spice Route", "Diwali Special Thali", [("Starters", [("Paneer tikka", "₹280"), ("Hara bhara kebab", "₹240")]), ("Mains", [("Dal makhani", "₹260"), ("Biryani", "₹340"), ("Shahi paneer", "₹300")]), ("Sweets", [("Gulab jamun", "₹120"), ("Rasmalai", "₹140")])])],
    menu_ph="food", product_ph="diwali",
    products=[("Diwali Sweet Box", "₹899", ["1 kg assorted", "Pure ghee", "Gift packed"]), ("Silk Saree", "₹8,499", ["Pure Kanchipuram silk", "Zari border", "Free blouse"]), ("Diya Set of 12", "₹499", ["Hand-painted", "Clay", "Reusable"]), ("Dry Fruit Hamper", "₹1,499", ["Almonds, cashews, pistachios", "Wooden box", "Ribbon wrap"])],
    pals=["saffron", "plum", "berry", "emerald", "noir", "ivory", "midnight", "coral"], target=210)

OCC["eid"] = dict(seed=77, name="Eid", code="EID", kw="eid mubarak template, eid card, eid post, eid al fitr",
    titles=["Eid Mubarak", "Eid al-Fitr Mubarak", "Eid al-Adha Mubarak", "Blessed Eid", "Happy Eid", "Eid Greetings"],
    subs=["May this Eid bring peace, joy and blessings to your home.", "Wishing you and your family a blessed Eid.", "May Allah accept your prayers and good deeds.", "Peace, love and happiness to you this Eid.",
          "Celebrate with love and gratitude.", "May your table be full and your heart fuller.", "From our family to yours — Eid Mubarak.", "Joy to you and everyone you love."],
    kickers=["Warm wishes", "Eid Mubarak", "From all of us", "Blessings", "With love"],
    dears=["Dear family", "Dear friends", "To our clients", "Dear neighbours", "To the team", "Dear Ammi"],
    signoffs=["The Khan family", "With love, Aisha & Yusuf", "Team Northwind", "The Rahman family", "Love, Fatima", "The Siddiquis"],
    families=["The Khan family", "The Rahman family", "Aisha & Yusuf", "The Siddiquis"],
    businesses=[("Noor Fashion", "Modest fashion", "fashion"), ("Al Noor Perfumes", "Oud & perfume", "luxury"), ("Sweet Crumbs", "Sweets & dates", "cafe"), ("Zaitoon", "Restaurant", "food"), ("Lantern Home", "Home decor", "eid"), ("Velvet & Co.", "Jewellery", "luxury"), ("Aura Salon", "Henna & beauty", "beauty"), ("Barakah Travel", "Travel", "travel")],
    events=[("Eid Party", "Food, family and lots of sweets."), ("Eid Dinner", "A festive feast with family and friends."), ("Iftar Gathering", "Break the fast together at sunset."), ("Eid Bazaar", "Henna, food stalls and gifts."), ("Eid Family Day", "Games, rides and treats for the kids.")],
    dates=["Friday 20 March", "Saturday 21 March", "Wednesday 27 May", "Thursday 28 May"],
    places=["Zaitoon", "The Grand Hall", "Al Barari Gardens", "Community Centre", "Palm Grove"],
    sale_titles=["Eid Sale", "Eid Offers", "Eid Collection", "Eid Special", "Festive Sale"], sale_subs=["this week only", "free gift wrap", "new arrivals", "free delivery", "in store and online"],
    tips=[("Eid Gift Ideas", [("Eidi", "Crisp notes in pretty envelopes."), ("Dates", "A premium box of dates."), ("Oud", "A small bottle of attar."), ("Clothes", "New outfits for the kids.")]),
          ("Eid Hosting Tips", [("Prep ahead", "Sweets and biryani a day before."), ("Decorate", "Lanterns and fairy lights."), ("Kids corner", "Henna and small gifts."), ("Share", "Send food to neighbours.")]),
          ("Eid Morning Checklist", [("Prayer", "Fajr and Eid prayer."), ("New clothes", "Laid out the night before."), ("Something sweet", "Dates or sheer khurma."), ("Visit", "Family, friends and elders.")])],
    menus=[("Zaitoon", "Eid Feast Menu", [("Starters", [("Lamb samosa", "$9"), ("Hummus & bread", "$8")]), ("Mains", [("Mutton biryani", "$22"), ("Chicken mandi", "$20")]), ("Desserts", [("Sheer khurma", "$7"), ("Kunafa", "$9")])])],
    menu_ph="food", product_ph="eid",
    products=[("Premium Dates Box", "$35", ["Medjool & Ajwa", "Gift box", "1 kg"]), ("Oud Perfume", "$85", ["Long lasting", "50 ml", "Gift boxed"]), ("Eid Hamper", "$69", ["Sweets & dates", "Lantern", "Card"]), ("Embroidered Kaftan", "$120", ["Hand embroidery", "Silk blend", "Sizes S–XL"])],
    pals=["emerald", "midnight", "navy", "sand", "ivory", "noir", "teal", "plum"], target=210)


# ------------------------------------------------------------------ regions
REG = {}
PROS = [  # premium / professional businesses (name, type, photo pool, headline, sub, details)
    ("Luxury Real Estate", "home", "Exclusive Waterfront Residence", "Private pool, panoramic views and five-star finishes.", ["5 bed · 6 bath · 6,200 sq ft", "Private viewing by appointment"]),
    ("Private Wealth", "business", "Grow and Protect Your Wealth", "Independent advice for families and business owners.", ["Portfolio reviews", "Tax-efficient planning"]),
    ("Law Firm", "business", "Trusted Legal Counsel", "Corporate, property and family law — clear advice, every time.", ["Free first consultation", "Senior partners on every case"]),
    ("Private Clinic", "health", "Care Without the Wait", "Specialist consultations and same-week appointments.", ["Cardiology · Dermatology · Paediatrics", "Insurance accepted"]),
    ("Boutique Hotel", "luxury", "Your Private Escape", "Suites with a view, spa and fine dining.", ["Stay 3 nights, pay 2", "Breakfast included"]),
    ("Fine Dining", "food", "A Table Worth Waiting For", "Seasonal tasting menus by our head chef.", ["Seven courses · wine pairing", "Reservations only"]),
    ("Wedding Planner", "wedding", "Weddings, Beautifully Planned", "From the first idea to the last dance.", ["Venues · decor · coordination", "Destination weddings"]),
    ("Architecture Studio", "home", "Homes Designed Around You", "Architecture and interiors with light, space and calm.", ["Residential · commercial", "Award-winning team"]),
    ("Executive Coaching", "business", "Lead With Clarity", "One-to-one coaching for founders and senior leaders.", ["12-week programme", "Book a discovery call"]),
    ("Luxury Cars", "luxury", "Drive Something Extraordinary", "New and certified pre-owned luxury cars.", ["Private test drive", "Flexible finance"]),
    ("Yacht Charter", "travel", "Charter Your Own Yacht", "Crewed day trips and sunset cruises.", ["Up to 12 guests", "Catering available"]),
    ("Golf & Country Club", "fitness", "Membership Now Open", "Championship course, spa and clubhouse dining.", ["Family and corporate plans", "Limited places"]),
    ("Jewellery House", "luxury", "Crafted to Be Treasured", "Fine jewellery and bespoke engagement rings.", ["Certified diamonds", "Private appointments"]),
    ("Interior Design", "home", "Interiors With Character", "Design, sourcing and styling for homes and offices.", ["Full-service design", "3D concepts"]),
    ("Tech Conference", "events", "The Future of Work Summit", "Two days of talks, workshops and networking.", ["40 speakers · 1,200 attendees", "Early-bird tickets"]),
    ("Charity Gala", "events", "An Evening of Giving", "Black-tie dinner and auction for children's education.", ["Live music · auction", "Tables of ten"]),
]


def region(key, name, seed, cities, money, names, occs, pals, tag):
    REG[key] = dict(key=key, name=name, seed=seed, cities=cities, money=money, names=names, occs=occs, pals=pals, tag=tag)


region("northamerica", "North America", 81, ["New York", "Toronto", "Los Angeles", "Chicago", "Vancouver", "Miami", "San Francisco", "Boston"], "$",
       ["Emma", "Liam", "Olivia", "Noah", "Ava", "James", "Sophia", "Lucas"],
       [("Thanksgiving", "Happy Thanksgiving", "Grateful for good food, good friends and you.", "turkey", "food"), ("Fourth of July", "Happy 4th of July", "Celebrating freedom, family and fireworks.", "fireworks", "newyear"),
        ("Halloween", "Happy Halloween", "Wishing you more treats than tricks.", "jack-o-lantern", "lights"), ("Black Friday", "Black Friday Sale", "Our biggest deals of the year.", "wrapped-gift", "fashion"),
        ("Canada Day", "Happy Canada Day", "Proud, free and strong — happy Canada Day!", "maple-leaf", "travel"), ("Labor Day", "Happy Labor Day", "Honouring the people who build our communities.", "hammer-and-wrench", "business")],
       ["navy", "cobalt", "berry", "noir", "ivory", "forest"], "north-america")
region("ukeurope", "UK & Europe", 82, ["London", "Paris", "Berlin", "Amsterdam", "Milan", "Madrid", "Edinburgh", "Zurich"], "£",
       ["Oliver", "Amelia", "George", "Isla", "Sophie", "Lukas", "Chloé", "Matteo"],
       [("Easter", "Happy Easter", "Wishing you a spring full of hope and new beginnings.", "rabbit", "nature"), ("Bonfire Night", "Bonfire Night", "Remember, remember the fifth of November.", "fire", "newyear"),
        ("Boxing Day", "Boxing Day Sale", "The sale you've been waiting for.", "wrapped-gift", "fashion"), ("St Patrick's Day", "Happy St Patrick's Day", "May the luck of the Irish be with you.", "four-leaf-clover", "events"),
        ("Oktoberfest", "Oktoberfest", "Music, pretzels and good company.", "clinking-glasses", "food"), ("Summer Solstice", "Hello Summer", "The longest day — make the most of it.", "sun", "travel")],
       ["sage", "navy", "emerald", "ivory", "plum", "sand"], "uk-europe")
region("middleeast", "Middle East", 83, ["Dubai", "Abu Dhabi", "Riyadh", "Doha", "Muscat", "Kuwait City", "Jeddah", "Manama"], "AED ",
       ["Omar", "Fatima", "Yusuf", "Aisha", "Khalid", "Mariam", "Zayed", "Noor"],
       [("Ramadan", "Ramadan Kareem", "Wishing you a blessed and peaceful month.", "crescent-moon", "eid"), ("Eid", "Eid Mubarak", "Peace, joy and blessings to you and your family.", "mosque", "eid"),
        ("UAE National Day", "Happy UAE National Day", "Proud of our nation, our people and our future.", "world-map", "travel"), ("Saudi National Day", "Happy Saudi National Day", "Celebrating our home and our heritage.", "palm-tree", "travel"),
        ("Iftar", "Iftar Gathering", "Break the fast together at sunset.", "crescent-moon", "eid"), ("Dubai Shopping Festival", "Shopping Festival Offers", "The city's biggest sale is here.", "wrapped-gift", "fashion")],
       ["emerald", "sand", "midnight", "noir", "ivory", "navy"], "middle-east")
region("southasia", "India & South Asia", 84, ["Chennai", "Mumbai", "Bengaluru", "Delhi", "Hyderabad", "Kochi", "Colombo", "Dhaka"], "₹",
       ["Aarav", "Diya", "Karthik", "Priya", "Rohan", "Ananya", "Vikram", "Meera"],
       [("Pongal", "Happy Pongal", "Wishing you a sweet harvest and a home full of joy.", "sunrise", "nature"), ("Onam", "Happy Onam", "Wishing you a prosperous and joyful Onam.", "hibiscus", "nature"),
        ("Holi", "Happy Holi", "May your life be as colourful as today.", "artist-palette", "nature"), ("Ganesh Chaturthi", "Happy Ganesh Chaturthi", "May Lord Ganesha bless you with wisdom and joy.", "lotus", "lights"),
        ("Navratri", "Happy Navratri", "Nine nights of devotion, dance and joy.", "sparkles", "lights"), ("Independence Day", "Happy Independence Day", "Celebrating freedom, unity and pride.", "world-map", "newyear")],
       ["saffron", "emerald", "plum", "berry", "ivory", "teal"], "south-asia")
region("eastasia", "East & Southeast Asia", 85, ["Singapore", "Hong Kong", "Tokyo", "Seoul", "Kuala Lumpur", "Bangkok", "Shanghai", "Jakarta"], "S$",
       ["Wei", "Mei", "Hiro", "Yuna", "Jun", "Aiko", "Ming", "Siti"],
       [("Lunar New Year", "Happy Lunar New Year", "Wishing you luck, health and prosperity.", "red-paper-lantern", "lights"), ("Mid-Autumn Festival", "Happy Mid-Autumn Festival", "Mooncakes, lanterns and family.", "moon-cake", "lights"),
        ("Hari Raya", "Selamat Hari Raya", "Forgive and celebrate together.", "crescent-moon", "eid"), ("Songkran", "Happy Songkran", "A splash of luck for the new year.", "tropical-fish", "travel"),
        ("Cherry Blossom Season", "Sakura Season", "Spring is here — meet us under the blossoms.", "cherry-blossom", "nature"), ("11.11 Sale", "11.11 Mega Sale", "One day only — our biggest deals.", "wrapped-gift", "fashion")],
       ["berry", "coral", "noir", "ivory", "sand", "teal"], "east-asia")
region("africa", "Africa", 86, ["Lagos", "Nairobi", "Johannesburg", "Cape Town", "Accra", "Cairo", "Kigali", "Casablanca"], "$",
       ["Amara", "Kwame", "Zainab", "Tunde", "Nia", "Thabo", "Ayo", "Lerato"],
       [("Independence Day", "Happy Independence Day", "Proud of our history, excited for our future.", "world-map", "newyear"), ("Heritage Day", "Happy Heritage Day", "Celebrating the cultures that make us.", "artist-palette", "events"),
        ("Christmas", "Merry Christmas", "Love, light and joy to you and yours.", "christmas-tree", "christmas"), ("Eid", "Eid Mubarak", "Blessings and peace to your family.", "crescent-moon", "eid"),
        ("Africa Day", "Happy Africa Day", "One continent, many stories.", "world-map", "travel"), ("Youth Day", "Happy Youth Day", "The future is young and bright.", "rocket", "education")],
       ["terra", "saffron", "emerald", "noir", "sand", "coral"], "africa")
region("latam", "Latin America", 87, ["Mexico City", "São Paulo", "Buenos Aires", "Bogotá", "Lima", "Santiago", "Rio de Janeiro", "Medellín"], "$",
       ["Sofía", "Mateo", "Valentina", "Santiago", "Isabella", "Diego", "Camila", "Lucas"],
       [("Día de Muertos", "Día de Muertos", "Recordamos con amor — we remember with love.", "candle", "lights"), ("Carnaval", "¡Feliz Carnaval!", "Music, colour and dancing in the streets.", "performing-arts", "events"),
        ("Navidad", "Feliz Navidad", "Paz, amor y alegría para tu familia.", "christmas-tree", "christmas"), ("Año Nuevo", "¡Feliz Año Nuevo!", "Que este año traiga salud y felicidad.", "fireworks", "newyear"),
        ("Día de la Madre", "Feliz Día de la Madre", "Gracias por todo tu amor.", "tulip", "mother"), ("Independencia", "¡Feliz Día de la Independencia!", "Orgullo, historia y celebración.", "world-map", "newyear")],
       ["coral", "saffron", "teal", "berry", "emerald", "noir"], "latin-america")
region("oceania", "Australia & NZ", 88, ["Sydney", "Melbourne", "Brisbane", "Perth", "Auckland", "Wellington", "Adelaide", "Gold Coast"], "A$",
       ["Charlotte", "Jack", "Mia", "William", "Harper", "Thomas", "Ruby", "Lachlan"],
       [("Australia Day", "Happy Australia Day", "Sun, sand and good mates.", "beach-with-umbrella", "travel"), ("ANZAC Day", "Lest We Forget", "Honouring those who served.", "sunrise", "events"),
        ("Christmas in Summer", "Merry Christmas", "Prawns on the barbie and sunshine.", "palm-tree", "christmas"), ("Melbourne Cup", "Melbourne Cup Day", "Fashion, fizz and the race that stops a nation.", "trophy", "luxury"),
        ("Matariki", "Happy Matariki", "A time to remember, celebrate and look ahead.", "glowing-star", "nature"), ("End of Financial Year", "EOFY Sale", "Our best prices before 30 June.", "money-bag", "business")],
       ["ocean", "teal", "sand", "navy", "coral", "olive"], "oceania")


def region_items(g):
    r = R(g["seed"])
    out = []
    cities, money, names = g["cities"], g["money"], g["names"]
    for i, (occ, title, sub, art, ph) in enumerate(g["occs"]):
        for j, (fmt, kick, nm) in enumerate([("post", "Warm wishes", "Greeting Post"), ("card", "With love", "Card"), ("story", "This week", "Story"), ("post", "From all of us", "Business Post"), ("a4", occ, "Poster"), ("post", "Celebrate", "Celebration Post")]):
            brand = pick(r, [f"{names[(i + j) % len(names)]} & family", "Apex Partners", "Northwind Studio", "Harbour Hotel", "The Grand Hall", "Maison Rose"])
            c = dict(kicker=kick, title=title, sub=sub, brand=brand)
            if fmt == "card":
                c = dict(accent=title, title=pick(r, ["Dear friends", "To our clients", "Dear family", "To the team"]), sub=sub, brand=brand)
            if fmt in ("a4", "story"):
                c["details"] = [f"{pick(r, ['Friday', 'Saturday', 'Sunday'])} · {pick(r, ['6 PM', '7 PM', '11 AM'])}", f"{pick(r, ['The Grand Hall', 'Harbour Hotel', 'City Gardens', 'Skyline Terrace'])}, {cities[(i + j) % len(cities)]}"]
                c["cta"] = "Join us"
            out.append(dict(name=f"{g['name']} {occ} {nm}", fmt=fmt, art=art, ph=ph, occ=occ, c=c, kw=f"{occ.lower()} template, {occ.lower()} {['post', 'card', 'story', 'post', 'poster', 'post'][j]}, {g['name'].lower()}"))
    for i, (biz, ph, head, sub, det) in enumerate(PROS):
        city = cities[i % len(cities)]
        det = [d.replace("$", money) for d in det] + [city]
        out.append(dict(name=f"{city} {biz} Post", fmt="post", ph=ph, c=dict(kicker=f"{biz} · {city}", title=head, sub=sub, details=det[:2], brand=f"{pick(r, ['Sterling', 'Harbour', 'Crown', 'Meridian', 'Aurum', 'Summit', 'Oakridge', 'Vista'])} {biz.split()[-1]}", cta="Book a consultation"), kw=f"{biz.lower()} template, {city.lower()}, premium business"))
        out.append(dict(name=f"{city} {biz} Flyer", fmt="a4", ph=ph, c=dict(kicker=biz, title=head, sub=sub, details=det, cta="Call us today"), kw=f"{biz.lower()} flyer, {city.lower()}, professional"))
        if i % 2 == 0:
            out.append(dict(name=f"{city} {biz} Story", fmt="story", ph=ph, c=dict(kicker=city, title=head, sub=sub, details=det[:2], cta="Learn more"), kw=f"{biz.lower()} story, {city.lower()}"))
        if i % 3 == 0:
            out.append(dict(name=f"{city} {biz} LinkedIn Banner", fmt="web", arch_only=["banner"], ph=ph, c=dict(kicker=biz, title=head, sub=sub, cta="Get in touch", web="www.yourfirm.com"), kw=f"{biz.lower()} banner, linkedin, {city.lower()}"))
    for x in out:
        x.setdefault("occ", None)
        x["tags"] = [f"region-{g['tag']}"]
    return out


# ------------------------------------------------------------------ books
MAG_TITLES = [("AURA", "Lifestyle"), ("FOUNDR", "Business"), ("SPICE", "Food"), ("WANDER", "Travel"), ("NEST", "Homes"), ("STRIDE", "Fitness"), ("BLOOM", "Weddings"), ("PIXEL", "Design"), ("GLOW", "Beauty"),
              ("KIDDO", "Parenting"), ("ATLAS", "Culture"), ("CAPITAL", "Finance"), ("VOYAGE", "Luxury travel"), ("TERRA", "Sustainability"), ("SCHOOL NEWS", "School"), ("THE QUARTERLY", "Company newsletter")]
MAG_PH = {"Lifestyle": "fashion", "Business": "business", "Food": "food", "Travel": "travel", "Homes": "home", "Fitness": "fitness", "Weddings": "wedding", "Design": "business", "Beauty": "beauty", "Parenting": "family",
          "Culture": "events", "Finance": "business", "Luxury travel": "luxury", "Sustainability": "nature", "School": "education", "Company newsletter": "business"}
ALB = [("Our Wedding Album", "wedding", "Two hearts, one story"), ("Wedding Day Memories", "wedding", "The day we said yes"), ("Baby's First Year", "baby", "Twelve months of firsts"), ("Happy 1st Birthday", "baby", "One year of you"),
       ("Family Album 2026", "family", "Our year together"), ("Travel Diary", "travel", "Places we'll never forget"), ("Birthday Memories", "birthday", "Another trip around the sun"), ("Graduation Album", "education", "Class of 2026"),
       ("Our Love Story", "love", "From hello to forever"), ("Holiday Memories", "christmas", "Our favourite season"), ("Engagement Album", "wedding", "She said yes!"), ("Anniversary Album", "love", "Ten years of us"),
       ("School Yearbook", "education", "Friends, classes and fun"), ("Pet Photo Book", "family", "Our furry best friend"), ("Food Journey Book", "food", "Tables we loved"), ("Festival Memories", "festive", "Lights, colours and family")]


def book_items(kind):
    out = []
    if kind == "magazine":
        for k, (brand, topic) in enumerate(MAG_TITLES):
            for issue, pages in [("Spring 2027", 8), ("Summer 2027", 12), ("Autumn 2026", 16), ("Winter 2026", 12), ("Annual", 16), ("Special edition", 8)]:
                out.append(dict(name=f"{brand} {topic} Magazine {issue} {pages} Pages", fmt="a4", book="magazine", pages=pages, ph=MAG_PH[topic], topic=topic, brand=brand, issue=issue,
                                c=dict(brand=brand, issue=f"{issue} · {topic}"), kw=f"magazine template, {topic.lower()} magazine, {pages} page magazine, print magazine"))
    else:
        for t, ph, sub in ALB:
            for pages, size in [(8, "sq"), (10, "land"), (12, "sq"), (12, "land"), (8, "a4"), (10, "sq"), (12, "a4"), (8, "land"), (10, "a4"), (12, "sq")]:
                out.append(dict(name=f"{t} {pages} Pages {dict(sq='Square', land='Landscape', a4='Portrait')[size]}", fmt=size, book="album", pages=pages, ph=ph,
                                c=dict(title=t, sub=sub), kw=f"photo album template, {t.lower()}, {pages} page photo book, photo collage album"))
    return out


# ------------------------------------------------------------------ gen
def _looks_book(kind):
    if kind == "magazine":
        return [L("magazine", [A4], ["editorial", "grotesk", "abril", "display", "luxe", "bold"], ["ivory", "coral", "sunny", "cobalt", "berry", "mint", "saffron", "lilac", "noir", "sand"])]
    return [L("grid", [SQ, LAND, A4], ["elegant", "script", "classic", "hand", "editorial", "display"], ["ivory", "sand", "blush", "sage", "noir", "mono", "lilac", "midnight", "emerald"])]


CATS2 = {}
for k, o in OCC.items():
    CATS2[k] = ("occasion", k, "Festivals", None, o["target"])
for k, g in REG.items():
    CATS2[k] = ("region", k, None, None, 150)
CATS2["magbooks"] = ("book", "magazine", "Marketing", "Magazine", 96)
CATS2["albums"] = ("book", "album", "Photo Collage", None, 160)

REG_CAT = {"post": ("Social Media", "Instagram"), "story": ("Social Media", "Instagram"), "card": ("Cards", None), "a4": ("Marketing", "Poster"), "web": ("Marketing", "Banner"), "fb": ("Social Media", "Facebook"), "inv": ("Events", None)}
SIZES = {"post": [POST, SQ], "card": [CARD], "story": [STORY], "inv": [CARD], "a4": [A4], "fb": [FB], "web": [WEB], "land": [LAND], "sq": [SQ], "album_land": [(1200, 900)]}


def gen2(key):
    kind, sub_key, cat, sub, target = CATS2[key]
    if kind == "occasion":
        o = OCC[sub_key]
        items, looks, arts, default_ph = occasion_items(o), looks_for(o["pals"]), None, sub_key if sub_key in PH else "festive"
        art_pool = {"christmas": ["christmas-tree", "snowman", "wrapped-gift", "bell", "glowing-star", "snowflake", "evergreen-tree", "candle"],
                    "valentines": ["red-heart", "two-hearts", "heart-with-ribbon", "love-letter", "rose", "bouquet", "ring", "growing-heart"],
                    "mothers": ["tulip", "bouquet", "blossom", "cherry-blossom", "red-heart", "teacup-without-handle", "sunflower", "love-letter"],
                    "fathers": ["necktie", "top-hat", "trophy", "hammer-and-wrench", "sunglasses", "hot-beverage", "racing-car", "crown"],
                    "newyear": ["fireworks", "bottle-with-popping-cork", "clinking-glasses", "party-popper", "confetti-ball", "sparkles", "mirror-ball", "spiral-calendar"],
                    "diwali": ["diya-lamp", "lotus", "sparkles", "fireworks", "candle", "gem-stone", "wrapped-gift", "glowing-star"],
                    "eid": ["crescent-moon", "mosque", "kaaba", "glowing-star", "red-paper-lantern", "gem-stone", "sparkles", "teacup-without-handle"]}[sub_key]
        arts = art_pool
        default_ph = {"christmas": "christmas", "valentines": "love", "mothers": "mother", "fathers": "father", "newyear": "newyear", "diwali": "diwali", "eid": "eid"}[sub_key]
    elif kind == "region":
        g = REG[sub_key]
        items, looks, arts, default_ph = region_items(g), looks_for(g["pals"], lux=True), ["sparkles"], "luxury"
    else:
        items, looks, arts, default_ph = book_items(sub_key), _looks_book(sub_key), None, None
    rng = random.Random(sum(map(ord, key)))
    combos = [(i, j) for i in range(len(items)) for j in range(len(looks))]
    rng.shuffle(combos)
    seen_i, ranked = {}, []
    for ij in combos:
        seen_i[ij[0]] = seen_i.get(ij[0], -1) + 1
        ranked.append((seen_i[ij[0]], ij))
    combos = [ij for _, ij in sorted(ranked, key=lambda x: x[0])]
    STYLE = ["Modern", "Classic", "Fresh", "Bold", "Soft", "Clean", "Bright", "Minimal", "Luxe", "Vivid"]
    out, seen = [], set()
    for v in range(10):
        for i, j in combos:
            if len(out) >= target:
                break
            it, lk = items[i], looks[j]
            only = it.get("arch_only")
            if only and lk["arch"] not in only:
                continue
            if not only and lk["arch"] in SPECIAL:
                continue
            sizes = SIZES.get(it.get("fmt")) or lk["sizes"]
            common = [s for s in sizes if s in lk["sizes"]]
            if it.get("book"):
                common = sizes
            if not common:
                continue
            size = common[(i + j + v) % len(common)]
            pal = lk["pals"][(i * 3 + j + v * 5) % len(lk["pals"])]
            pair = lk["pairs"][(i + j * 2 + v) % len(lk["pairs"])]
            c = {k2: v2 for k2, v2 in dict(it["c"]).items() if v2 is not None}
            ph_pool = PH.get(it.get("ph") or default_ph or "events", PH["events"])
            if lk["photo"] and "photo" not in c and lk["arch"] not in ("grid", "polaroid", "tips"):
                c["photo"] = ph_pool[(i * 5 + j + v * 3) % len(ph_pool)]
            if lk["art"] and "art" not in c:
                pool = arts or ["sparkles"]
                c["art"] = it.get("art") if it.get("art") else pool[(i + j + v) % len(pool)]
            opts = dict(lk["opts"])
            if lk["arch"] == "shape" and opts.get("kind") is None:
                opts["kind"] = "circle"
            name = f"{PALWORD.get(pal, pal.capitalize())} {it['name']}"
            if name in seen:
                name = f"{PALWORD.get(pal, pal.capitalize())} {ARCHWORD.get(lk['arch'], '')} {it['name']}".replace("  ", " ")
            if name in seen:
                name = f"{PALWORD.get(pal, pal.capitalize())} {STYLE[v]} {it['name']}"
            if name in seen:
                continue
            seen.add(name)
            if kind == "region":
                ccat, csub = REG_CAT.get(it["fmt"], ("Business", "Flyer"))
            else:
                ccat, csub = cat, sub
            out.append(dict(title=name, cat=ccat, sub=csub, size=size, arch=lk["arch"], pair=pair, pal=pal, c=c, opts=opts, kw=it.get("kw", ""),
                            occ=it.get("occ"), tags=it.get("tags", []), book=it.get("book"), pages=it.get("pages", 1), ph=it.get("ph"), item=it))
    return out
