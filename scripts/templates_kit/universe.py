"""Creative Universe library (November 2026): professional brand-system templates.

30 industries × 3 fictional brands × 13 formats × 12 layout archetypes, on a
house design system (8% margins, strict type scale, curated palettes and font
pairs, real industry copy, consistent photo treatment). Every template is a
unique combination of brand, copy, layout, palette, photo and format. All brand
names, people, numbers and contacts are fictional placeholders.

  MT_FONT_DIR=... python3 universe.py --out DIR [--limit N] [--chunk 500]
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
from functools import lru_cache

from kit import Doc, lin, rad, mix, rgba, shadow, FS_MULT, text_width, PUBLIC
from pro_pilot import artboard, PRINT_BLEED, logo

# ------------------------------------------------------------------ formats
FMT = {  # key: (W, H, label, category, category_id, print)
    "post": (1080, 1080, "Instagram Post", "Social Media", "38442849-cdd2-4bd7-b2ba-b70cc9ba0847", False),
    "portrait": (1080, 1350, "Portrait Post", "Social Media", "38442849-cdd2-4bd7-b2ba-b70cc9ba0847", False),
    "story": (1080, 1920, "Instagram Story", "Social Media", "38442849-cdd2-4bd7-b2ba-b70cc9ba0847", False),
    "linkedin": (1200, 627, "LinkedIn Post", "Social Media", "65e88898-24a0-4e66-852c-07e0c3842f70", False),
    "facebook": (1200, 630, "Facebook Post", "Social Media", "fb8e4165-f312-45d7-b0bb-466633674e06", False),
    "youtube": (1280, 720, "YouTube Thumbnail", "Social Media", "da4d1609-12c3-472a-b0b8-7c2144546778", False),
    "flyer": (2480, 3508, "A4 Flyer", "Business", "417e7368-40e5-4117-ae1b-8c35466efbef", True),
    "poster": (2480, 3508, "Poster", "Marketing", "8774b67a-5ff6-463f-affa-2cb6e4106602", True),
    "card": (1050, 600, "Business Card", "Business", "bd449e8c-bdd2-451d-a752-8902ed78069b", True),
    "slide": (1920, 1080, "Presentation Slide", "Business", "896aff0d-199a-4659-9e7e-4e8a4c707b59", False),
    "banner": (1500, 500, "Web Banner", "Marketing", "f5eaf327-62dc-4191-9f05-065cd9918efb", False),
    "rollup": (1700, 4000, "Roll-up Banner", "Marketing", "f5eaf327-62dc-4191-9f05-065cd9918efb", True),
    "ad": (1200, 1200, "Social Ad", "Marketing", "050fa44e-deeb-4945-951b-b3aab66c21a5", False),
}

# ------------------------------------------------------------------ design system
PALETTES = [  # bg, surface, ink, accent, accent2, muted, dark(True if bg is dark)
    ("#F4F1EA", "#FFFFFF", "#14233B", "#C9A86A", "#3B82C4", "#6B7280", False),   # navy sand
    ("#0E1424", "#18213A", "#F5F1E8", "#E3B964", "#6EA8FE", "#9AA3B8", True),    # midnight gold
    ("#F2F6F4", "#FFFFFF", "#0F3B33", "#2BA37E", "#E9C46A", "#5B6B66", False),   # emerald
    ("#0F2E29", "#173E37", "#F1F7F4", "#7ED6B2", "#F2C14E", "#A8C3BA", True),    # deep forest
    ("#FBF3EA", "#FFFFFF", "#3B1E14", "#C2572E", "#E7B07A", "#7A6155", False),   # terracotta
    ("#FFF6F7", "#FFFFFF", "#3E1A2B", "#D9738E", "#B08A3E", "#7D6470", False),   # blush
    ("#111111", "#1C1C1C", "#F7F4EE", "#E5D3B3", "#B9975B", "#A3A3A3", True),    # noir champagne
    ("#FFFFFF", "#F4F5F7", "#0B0B0F", "#FF5A36", "#111827", "#6B7280", False),   # swiss orange
    ("#EEF2FF", "#FFFFFF", "#1E1B4B", "#4F46E5", "#22D3EE", "#64748B", False),   # indigo tech
    ("#0B1020", "#141B33", "#EAF0FF", "#7C5CFF", "#22D3EE", "#8E9AC0", True),    # neon tech
    ("#F6F1E7", "#FFFFFF", "#2B2B23", "#6B7146", "#C9A86A", "#77735F", False),   # olive
    ("#FDF8EF", "#FFFFFF", "#2A1A0F", "#E3A72F", "#7D2E1F", "#7C6A55", False),   # saffron
    ("#EAF4FB", "#FFFFFF", "#0D2A3F", "#1C7ED6", "#FFB703", "#5C7183", False),   # ocean
    ("#1A1225", "#251A33", "#F4EEFB", "#C17BE0", "#F2A65A", "#A99BB8", True),    # plum night
    ("#F7F7F5", "#FFFFFF", "#1F2937", "#10B981", "#F59E0B", "#6B7280", False),   # fresh
    ("#FFF8F1", "#FFFFFF", "#33221A", "#E76F51", "#2A9D8F", "#7B675C", False),   # coral teal
    ("#ECEAE4", "#F7F6F2", "#262626", "#8C6D46", "#262626", "#737373", False),   # stone
    ("#102A43", "#1B3A5C", "#F0F4F8", "#F0B429", "#62B0E8", "#9FB3C8", True),    # corporate navy
]
FONTS = [  # display, body, display weight, display upper?
    ("Playfair Display", "Inter", 700, False), ("Montserrat", "Inter", 800, True), ("DM Serif Display", "DM Sans", 400, False),
    ("Space Grotesk", "Inter", 700, False), ("Poppins", "Poppins", 700, False), ("Cormorant Garamond", "Montserrat", 600, False),
    ("Archivo Black", "Inter", 400, True), ("Oswald", "Lato", 600, True), ("Raleway", "Raleway", 800, False),
    ("Lora", "Work Sans", 700, False), ("Bebas Neue", "Inter", 400, True), ("Cinzel", "Lato", 700, True),
]

# ------------------------------------------------------------------ industries
CITIES = ["Dubai", "London", "New York", "Mumbai", "Singapore", "Sydney", "Toronto", "Riyadh", "Paris", "Berlin", "Cape Town", "São Paulo", "Doha", "Lagos", "Tokyo", "Abu Dhabi"]
P = "pro/"
IND = [
    dict(k="consulting", label="Business Consulting", tag="business", brands=[("Northline Advisory", "Strategy · Growth · Operations"), ("Meridian Partners", "Management consultants"), ("Keystone Group", "Business advisory")],
         heads=["Strategy that moves your business forward", "Grow with a clear plan", "Decisions backed by data", "Built for the next stage of growth", "Turn ambition into results", "Your partner in scaling up", "Clarity for complex decisions", "From plan to performance"],
         subs=["Senior advisors for founders and leadership teams.", "Practical roadmaps, measurable outcomes.", "Book a 30-minute strategy call."],
         services=["Growth strategy", "Financial planning", "Operations", "Market entry"], cta="Book a consultation", stat=("12+", "years advising"),
         photos=[P + "meeting", P + "handshake", P + "office", P + "team", P + "x_team2", P + "startup", P + "conference"]),
    dict(k="realestate", label="Real Estate", tag="real estate", brands=[("Haven Properties", "Homes · Investments"), ("Crestview Realty", "Luxury real estate"), ("Oakline Estates", "Property advisors")],
         heads=["Just listed: your next home", "Luxury living, waterfront views", "Open house this weekend", "Find a home that fits your life", "Invest with confidence", "Modern villas, ready to move in", "Sold above asking", "Your dream address awaits"],
         subs=["4 bedrooms · 3 bathrooms · private garden.", "Private viewings by appointment.", "Trusted agents, transparent prices."],
         services=["Buying", "Selling", "Renting", "Property management"], cta="Book a viewing", stat=("AED 3.2M", "starting price"),
         photos=[P + "house", P + "house2", P + "x_house3", P + "livingroom", P + "livingroom2", P + "x_living3", P + "apartment", P + "kitchen", P + "bedroom"]),
    dict(k="restaurant", label="Restaurant", tag="restaurant", brands=[("Osteria Luca", "Italian kitchen"), ("Ember & Salt", "Grill house"), ("The Copper Table", "Modern dining")],
         heads=["A table worth waiting for", "Fire-grilled, made fresh", "Dinner, the way it should be", "New seasonal menu", "Taste the season", "Weekend family feast", "Chef's tasting night", "Reserve your table tonight"],
         subs=["Seasonal ingredients, cooked over open flame.", "Open daily from 12 noon to 11 PM.", "Private dining for up to 20 guests."],
         services=["Lunch", "Dinner", "Private dining", "Catering"], cta="Reserve a table", stat=("4.9★", "guest rating"),
         photos=[P + "restaurant", P + "finedining", P + "food", P + "pizza", P + "burger", P + "sushi", P + "salad", P + "x_steak2", P + "x_pasta2", P + "table"]),
    dict(k="cafe", label="Café & Coffee", tag="cafe", brands=[("Morning Ritual", "Coffee roasters"), ("Bloom Café", "Coffee & bakery"), ("Little Grind", "Specialty coffee")],
         heads=["Slow mornings start here", "Freshly roasted, every day", "Your new favourite corner", "Coffee worth getting up for", "Now serving autumn specials", "Brunch, all weekend", "Brewed with care", "Grand opening this Saturday"],
         subs=["Single-origin beans, roasted in-house.", "Pastries baked every morning.", "Free coffee for the first 100 guests."],
         services=["Espresso bar", "Pastries", "Brunch", "Beans to go"], cta="Visit us today", stat=("100", "free coffees"),
         photos=[P + "coffee", P + "coffee2", P + "latte", P + "x_latte2", P + "x_croiss", P + "bread", P + "dessert", P + "tea"]),
    dict(k="fitness", label="Fitness & Gym", tag="fitness", brands=[("Pulse Athletics", "Strength · Conditioning"), ("Forge Fitness", "Training studio"), ("Kinetic Club", "Gym & classes")],
         heads=["Stronger every week", "Train with purpose", "Your first class is on us", "New year, new strength", "Coaching that gets results", "Join the 30-day challenge", "Move better, feel better", "Memberships now 30% off"],
         subs=["Small-group classes led by certified coaches.", "Open 5 AM to 11 PM, seven days a week.", "Personal plans for every level."],
         services=["Strength", "HIIT", "Yoga", "Personal training"], cta="Start your trial", stat=("30%", "off memberships"),
         photos=[P + "fitness", P + "fitness2", P + "gym", P + "x_gym2", P + "running", P + "yoga"]),
    dict(k="beauty", label="Beauty Salon", tag="beauty", brands=[("Maison Lumière", "Hair · Skin · Nails"), ("Velvet Studio", "Beauty salon"), ("Aura Skin Clinic", "Skin & wellness")],
         heads=["Glow, beautifully", "Your best skin starts here", "New season, new look", "Treat yourself this weekend", "Bridal beauty packages", "Radiance, refined", "Book your glow-up", "Self-care, made simple"],
         subs=["Expert stylists and premium products.", "Open Tuesday to Sunday, 10 AM – 9 PM.", "First visit: 20% off any treatment."],
         services=["Hair styling", "Facials", "Nails", "Makeup"], cta="Book an appointment", stat=("20%", "off first visit"),
         photos=[P + "salon", P + "makeup", P + "x_nails", P + "skincare", P + "x_skin2", P + "x_skin3", P + "spa", P + "x_lip2", P + "perfume"]),
    dict(k="fashion", label="Fashion Retail", tag="fashion", brands=[("Maison Vera", "Contemporary fashion"), ("North & Thread", "Clothing studio"), ("Atelier Noor", "Modest fashion")],
         heads=["The new collection", "Season essentials, reimagined", "Effortless by design", "End of season sale", "Made to be worn every day", "The autumn edit", "New arrivals this week", "Style that lasts"],
         subs=["Thoughtfully made, ethically sourced.", "Shop in store and online.", "Free delivery on orders over AED 200."],
         services=["Womenswear", "Menswear", "Accessories", "Gift cards"], cta="Shop the collection", stat=("50%", "off selected styles"),
         photos=[P + "fashion", P + "fashion2", P + "sneakers", P + "x_sneak2", P + "shopping", P + "shopping2", P + "x_rack", P + "x_sunglass", P + "x_watch", P + "jewelry"]),
    dict(k="health", label="Healthcare Clinic", tag="healthcare", brands=[("CareFirst Clinic", "Family medicine"), ("Smile Studio Dental", "Dental care"), ("Vita Health Centre", "Health & wellbeing")],
         heads=["Care you can trust", "Your family's health, our priority", "Healthy smiles start here", "Same-day appointments", "Book your annual check-up", "Expert care, close to home", "Gentle dentistry for all ages", "Wellness, made personal"],
         subs=["Experienced doctors, modern facilities.", "Most insurance plans accepted.", "Open seven days a week."],
         services=["General practice", "Dental", "Paediatrics", "Health checks"], cta="Book an appointment", stat=("24/7", "care line"),
         photos=[P + "dentist", P + "x_doctor", P + "x_doctor2", P + "family", P + "motherchild"]),
    dict(k="education", label="Education", tag="education", brands=[("Brightpath Academy", "Learning centre"), ("Northgate School", "International school"), ("Skillcraft Institute", "Professional courses")],
         heads=["Learning that lasts", "Enrol for the new term", "Small classes, big results", "Open day this Saturday", "Grow your skills in 8 weeks", "Where curious minds thrive", "Scholarships now open", "Your future starts here"],
         subs=["Qualified teachers and personal attention.", "Weekday and weekend sessions.", "Limited places — register early."],
         services=["Maths", "Science", "Languages", "Exam prep"], cta="Register now", stat=("98%", "pass rate"),
         photos=[P + "x_school", P + "x_teacher", P + "graduation", P + "books", P + "workshop", P + "seminar", P + "x_kids"]),
    dict(k="tech", label="Technology & SaaS", tag="technology", brands=[("Helix Labs", "Software studio"), ("Cloudway", "Cloud platform"), ("Nova Systems", "IT solutions")],
         heads=["Software that scales with you", "Ship faster with less effort", "Introducing Cloudway 3.0", "Secure by design", "Your IT, fully managed", "Automate the busy work", "Join our product launch", "Built for modern teams"],
         subs=["Trusted by 2,000+ growing companies.", "Start free — no credit card needed.", "Live demo every Thursday."],
         services=["Cloud", "Security", "Automation", "Support"], cta="Start free trial", stat=("2,000+", "companies"),
         photos=[P + "laptop", P + "x_laptop2", P + "phone", P + "startup", P + "cowork", P + "x_desk", P + "office"]),
    dict(k="travel", label="Travel & Tourism", tag="travel", brands=[("Wanderline Travel", "Journeys & tours"), ("Azure Escapes", "Luxury holidays"), ("Compass & Co.", "Travel agency")],
         heads=["Your next escape awaits", "Island holidays from AED 2,499", "See the world, slowly", "Summer getaways now booking", "Adventures worth sharing", "Luxury stays, curated", "Explore more, plan less", "Book early and save 25%"],
         subs=["Flights, hotels and tours in one booking.", "Hand-picked stays and private guides.", "Flexible dates, no hidden fees."],
         services=["Holidays", "Flights", "Hotels", "Group tours"], cta="Plan your trip", stat=("25%", "early-bird saving"),
         photos=[P + "travel", P + "travel2", P + "travel3", P + "beach", P + "beach2", P + "x_beach3", P + "mountains", P + "x_mount2", P + "ocean", P + "hotel", P + "x_pool"]),
    dict(k="events", label="Events & Conferences", tag="events", brands=[("Future Forward Summit", "Business conference"), ("Lumen Live", "Events agency"), ("The Grand Gathering", "Galas & awards")],
         heads=["Where ideas meet impact", "Register for the summit", "Two days of bold ideas", "The awards night returns", "Meet the speakers", "Early-bird tickets on sale", "An evening to remember", "Save the date"],
         subs=["40 speakers · 1,200 attendees · 2 stages.", "Networking, workshops and keynotes.", "Limited seats available."],
         services=["Keynotes", "Workshops", "Networking", "Awards"], cta="Get your ticket", stat=("40+", "speakers"),
         photos=[P + "conference", P + "seminar", P + "gala", P + "venue", P + "venue2", P + "champagne", P + "podcast"]),
    dict(k="wedding", label="Wedding Services", tag="wedding", brands=[("Ever After Weddings", "Planning & design"), ("Ivory Lane Events", "Wedding planners"), ("Petal & Vow", "Wedding studio")],
         heads=["Your day, beautifully planned", "Weddings, perfectly designed", "Now booking 2027 dates", "Every detail, handled", "Love stories, styled with care", "Destination weddings", "Book a free consultation", "Celebrate in style"],
         subs=["Full planning, styling and coordination.", "Venues, florals, music and more.", "Packages for every budget."],
         services=["Full planning", "Styling", "Florals", "Coordination"], cta="Book a consultation", stat=("300+", "weddings planned"),
         photos=[P + "couple", P + "couple2", P + "couple3", P + "rings", P + "x_rings2", P + "bouquet", P + "bridebouquet", P + "weddingtable", P + "engagement", P + "x_bride"]),
    dict(k="florist", label="Florist", tag="florist", brands=[("Wild Stem Florals", "Flower studio"), ("Rosemary & Co.", "Florist"), ("Petal House", "Flowers & gifts")],
         heads=["Flowers for every moment", "Same-day flower delivery", "Fresh from the studio", "Say it with roses", "Seasonal bouquets", "Mother's Day collection", "Weekly flower subscription", "Arrangements made with love"],
         subs=["Hand-tied bouquets delivered today.", "Order by 2 PM for same-day delivery.", "Corporate and event florals."],
         services=["Bouquets", "Events", "Subscriptions", "Plants"], cta="Order flowers", stat=("2 PM", "same-day cut-off"),
         photos=[P + "flowers", P + "flowers2", P + "roses", P + "x_roses3", P + "whiteflowers", P + "blossom", P + "storefront", P + "plants"]),
    dict(k="finance", label="Finance & Accounting", tag="finance", brands=[("Ledger & Lane", "Accountants"), ("Summit Wealth", "Financial advisors"), ("Clearbook", "Bookkeeping")],
         heads=["Your numbers, made clear", "Plan your financial future", "Tax season, sorted", "Grow and protect your wealth", "Bookkeeping you can rely on", "Smart money decisions", "VAT filing made simple", "Free financial review"],
         subs=["Chartered accountants for growing businesses.", "Fixed monthly fees, no surprises.", "Independent, fee-based advice."],
         services=["Accounting", "Tax & VAT", "Payroll", "Wealth planning"], cta="Book a free review", stat=("500+", "clients"),
         photos=[P + "office", P + "laptop", P + "x_desk", P + "handshake", P + "meeting"]),
    dict(k="law", label="Law Firm", tag="legal", brands=[("Hale & Morgan", "Advocates & legal consultants"), ("Sterling Legal", "Law firm"), ("Crown Chambers", "Legal services")],
         heads=["Trusted legal counsel", "Protecting what matters", "Experience you can rely on", "Corporate law, simplified", "Clear advice, strong results", "Book a confidential consultation", "Your rights, defended", "Legal guidance for businesses"],
         subs=["Corporate, property and family law.", "Licensed advocates, multilingual team.", "Confidential first consultation."],
         services=["Corporate", "Property", "Family", "Disputes"], cta="Speak to a lawyer", stat=("25", "years in practice"),
         photos=[P + "office", P + "handshake", P + "books", P + "meeting"]),
    dict(k="interior", label="Architecture & Interiors", tag="architecture", brands=[("Atlas & Co.", "Architecture · Interiors"), ("Form Studio", "Interior design"), ("Linea Architects", "Architecture studio")],
         heads=["Spaces designed around you", "Calm, considered interiors", "Architecture with purpose", "Design that feels like home", "From concept to keys", "Modern living, refined", "Book a design consultation", "Light, space and material"],
         subs=["Residential and commercial projects.", "Design, build and fit-out in one team.", "Award-winning studio since 2009."],
         services=["Architecture", "Interiors", "Fit-out", "Landscape"], cta="Start your project", stat=("120+", "projects"),
         photos=[P + "livingroom", P + "livingroom2", P + "x_living3", P + "apartment", P + "kitchen", P + "bedroom", P + "city", P + "x_city2"]),
    dict(k="bakery", label="Bakery & Desserts", tag="bakery", brands=[("Golden Crumb Bakery", "Artisan bakery"), ("Sugar & Spoon", "Cakes & desserts"), ("Rise Bakehouse", "Sourdough & pastries")],
         heads=["Baked fresh every morning", "Custom cakes for every celebration", "Sourdough, slow and simple", "Sweet treats, made by hand", "Order your celebration cake", "New pastry menu", "Weekend bake sale", "Life is sweeter here"],
         subs=["Natural ingredients, no shortcuts.", "Order 48 hours ahead for custom cakes.", "Free delivery within 10 km."],
         services=["Cakes", "Pastries", "Bread", "Catering"], cta="Order now", stat=("48h", "custom cakes"),
         photos=[P + "bread", P + "cupcakes", P + "x_cupcakes2", P + "cake", P + "x_cake2", P + "dessert", P + "x_croiss"]),
    dict(k="automotive", label="Automotive", tag="automotive", brands=[("Apex Motors", "Premium cars"), ("Drive Lab", "Car care & service"), ("Velocity Rentals", "Car rental")],
         heads=["Performance meets comfort", "Test drive the new model", "Rent a car from AED 99/day", "Service your car with experts", "Drive something extraordinary", "Weekend rental deals", "Certified pre-owned cars", "Book your service today"],
         subs=["Flexible finance and trade-ins.", "Free pick-up and drop-off.", "Unlimited mileage on weekly rentals."],
         services=["Sales", "Rentals", "Service", "Detailing"], cta="Book a test drive", stat=("AED 99", "per day"),
         photos=[P + "car", P + "city", P + "x_city2"]),
    dict(k="pets", label="Pet Care", tag="pets", brands=[("Paws & Co.", "Grooming & daycare"), ("Happy Tails Vet", "Veterinary clinic"), ("Furry Friends", "Pet store")],
         heads=["Happy pets, happy homes", "Grooming that makes tails wag", "Gentle care for every pet", "Doggy daycare now open", "Book your pet's check-up", "Everything your pet needs", "Adopt, don't shop", "Spa day for your best friend"],
         subs=["Certified groomers and caring vets.", "Pick-up and drop-off available.", "First grooming session 15% off."],
         services=["Grooming", "Daycare", "Vet care", "Pet supplies"], cta="Book a visit", stat=("15%", "off first groom"),
         photos=[P + "dog", P + "x_dog2", P + "x_cat"]),
    dict(k="homeservices", label="Home Services", tag="home services", brands=[("Spotless Home", "Cleaning services"), ("FixRight", "Maintenance & repairs"), ("Fresh Nest", "Home care")],
         heads=["A spotless home, every time", "Professional cleaning you can trust", "Repairs done right, first time", "Deep cleaning from AED 199", "Book a cleaner in 60 seconds", "Your home, cared for", "Move-in, move-out cleaning", "Same-day maintenance"],
         subs=["Vetted, insured and trained teams.", "Eco-friendly products, all included.", "Satisfaction guaranteed."],
         services=["Cleaning", "Maintenance", "Pest control", "Moving"], cta="Book now", stat=("AED 199", "deep clean"),
         photos=[P + "cleaning", P + "kitchen", P + "livingroom", P + "x_living3"]),
    dict(k="photography", label="Photography Studio", tag="photography", brands=[("Lens & Light Studio", "Photography"), ("Frame Story", "Portraits & weddings"), ("Golden Hour Co.", "Photo studio")],
         heads=["Moments worth keeping", "Portraits with personality", "Book your photo session", "Family sessions this season", "Brand photography for business", "Stories told in light", "Mini sessions now open", "Capture the day"],
         subs=["Studio and on-location shoots.", "Edited gallery delivered in 7 days.", "Limited mini-session slots."],
         services=["Portraits", "Weddings", "Products", "Events"], cta="Book a session", stat=("7 days", "gallery delivery"),
         photos=[P + "camera", "mt-784", "mt-1331", "mt-240", P + "x_couple5", P + "family"]),
    dict(k="kids", label="Kids & Family", tag="kids", brands=[("Little Explorers", "Nursery & play"), ("Sunny Days Club", "Kids activities"), ("Tiny Steps", "Early learning")],
         heads=["Where little minds grow", "Summer camp registrations open", "Play, learn, grow", "Weekend family fun", "Nursery places available", "Creative classes for kids", "Birthday parties, sorted", "Safe, happy, learning"],
         subs=["Ages 2 to 12, qualified staff.", "Morning and afternoon sessions.", "Book a free trial day."],
         services=["Nursery", "Holiday camps", "Art classes", "Parties"], cta="Book a trial day", stat=("2–12", "years"),
         photos=[P + "x_kids", P + "family", P + "x_family2", P + "x_family3", P + "newborn", P + "babyfeet", P + "x_baby2"]),
    dict(k="music", label="Music & Nightlife", tag="nightlife", brands=[("Neon Room", "Club & lounge"), ("Bassline Collective", "DJ & live music"), ("Velvet Hour", "Rooftop bar")],
         heads=["Friday nights, reinvented", "Live music every weekend", "The rooftop is open", "Guest DJ this Saturday", "Ladies' night", "Sunset sessions", "New Year's Eve party", "Dance until sunrise"],
         subs=["Doors open 9 PM · Dress to impress.", "Table bookings recommended.", "Limited early-entry tickets."],
         services=["Live music", "Guest DJs", "Cocktails", "Private events"], cta="Book a table", stat=("9 PM", "doors open"),
         photos=[P + "dj", P + "party", P + "x_lights", P + "champagne", P + "cinema", "mt-1313"]),
    dict(k="grocery", label="Grocery & Organic", tag="grocery", brands=[("Green Basket", "Organic market"), ("Harvest Lane", "Farm to table"), ("Daily Fresh", "Supermarket")],
         heads=["Fresh from the farm", "Organic produce, delivered", "Weekly deals are here", "Eat well, live well", "Shop local, eat fresh", "Free delivery this week", "Seasonal fruit boxes", "Healthy choices made easy"],
         subs=["Locally grown, picked this week.", "Order by 6 PM for next-day delivery.", "Members save 10% every day."],
         services=["Fruit & veg", "Bakery", "Dairy", "Delivery"], cta="Shop now", stat=("10%", "member saving"),
         photos=[P + "x_fruit", P + "salad", P + "plants", P + "picnic", P + "food"]),
    dict(k="nonprofit", label="Non-profit & Community", tag="community", brands=[("Hands Together", "Community foundation"), ("Bright Futures Fund", "Education charity"), ("Green Earth Alliance", "Environmental group")],
         heads=["Together we can do more", "Join our volunteer day", "Every donation counts", "Help us plant 10,000 trees", "Support a child's education", "Community clean-up this Saturday", "Be the change", "Annual charity gala"],
         subs=["100% of donations fund our programmes.", "Families, friends and teams welcome.", "Register online — it takes a minute."],
         services=["Volunteering", "Donations", "Events", "Partnerships"], cta="Get involved", stat=("10,000", "trees to plant"),
         photos=[P + "x_friends", P + "x_friends2", P + "family", P + "team", P + "picnic", P + "plants"]),
    dict(k="hotel", label="Hotel & Hospitality", tag="hotel", brands=[("The Palm Residence", "Boutique hotel"), ("Harbour House Hotel", "Hotel & spa"), ("Sable Resort", "Beach resort")],
         heads=["Stay longer, live better", "Weekend staycation offers", "Your private escape", "Spa & stay packages", "Rooms with a view", "Book direct and save 20%", "Luxury, quietly done", "Celebrate with us"],
         subs=["Breakfast, spa access and late checkout.", "Minutes from the beach and city.", "Members get exclusive rates."],
         services=["Rooms & suites", "Spa", "Dining", "Events"], cta="Book your stay", stat=("20%", "off direct bookings"),
         photos=[P + "hotel", P + "bedroom", P + "x_pool", P + "spa", P + "finedining", P + "beach"]),
    dict(k="sports", label="Sports & Clubs", tag="sports", brands=[("United Football Academy", "Football training"), ("Ace Tennis Club", "Tennis academy"), ("Stride Running Club", "Running community")],
         heads=["Train like a pro", "Academy trials this weekend", "Join the club", "Matchday is here", "Coaching for all ages", "Run with us every Saturday", "Summer sports camp", "Champions are made here"],
         subs=["UEFA-licensed coaches, all levels.", "Kids, teens and adult squads.", "First session free."],
         services=["Training", "Matches", "Camps", "Fitness"], cta="Sign up today", stat=("Free", "first session"),
         photos=[P + "football", P + "running", P + "fitness", "mt-1577"]),
    dict(k="podcast", label="Media & Podcasts", tag="media", brands=[("The Founder's Table", "Business podcast"), ("Studio North", "Media studio"), ("Signal & Noise", "Tech podcast")],
         heads=["New episode out now", "Stories from bold founders", "Listen on all platforms", "This week's guest", "The ideas shaping tomorrow", "Season 3 starts Monday", "Behind the build", "Conversations that matter"],
         subs=["New episodes every Tuesday.", "Available on Spotify, Apple and YouTube.", "Subscribe so you never miss one."],
         services=["Interviews", "Live shows", "Newsletter", "Community"], cta="Listen now", stat=("Ep. 48", "out now"),
         photos=[P + "podcast", P + "x_podcast2", P + "laptop", P + "x_man", P + "x_man2"]),
    dict(k="retail", label="Retail & Sales", tag="sale", brands=[("Urban Market", "Lifestyle store"), ("The Gift Box", "Gifts & homeware"), ("Mode Outlet", "Fashion outlet")],
         heads=["The big seasonal sale", "Up to 50% off everything", "Gifts they'll love", "Weekend flash sale", "New in store", "Buy one, get one free", "Last chance to save", "Members' early access"],
         subs=["In store and online, while stocks last.", "Free gift wrapping on all orders.", "Extra 10% off for members."],
         services=["Homeware", "Gifts", "Fashion", "Accessories"], cta="Shop the sale", stat=("50%", "off"),
         photos=[P + "shopping", P + "shopping2", P + "gifts", P + "gifts2", P + "x_shop3", P + "storefront"]),
]

PIECE_NAMES = {"post": "Instagram Post", "portrait": "Portrait Post", "story": "Story", "linkedin": "LinkedIn Post", "facebook": "Facebook Post", "youtube": "YouTube Thumbnail",
               "flyer": "Flyer", "poster": "Poster", "card": "Business Card", "slide": "Presentation Slide", "banner": "Web Banner", "rollup": "Roll-up Banner", "ad": "Social Ad"}

# ------------------------------------------------------------------ helpers
@lru_cache(None)
def img_size(src):
    from PIL import Image
    return Image.open(os.path.join(PUBLIC, src.lstrip("/"))).size


def photo_src(key):
    return f"/templates/photos/{key}.jpg" if key.startswith("pro/") else f"/templates/photos/{key}.jpg"


def pic(d, key, x, y, w, h, frame="rect", rx=0, focus=(0.5, 0.45), name="Photo", shadow_=None, opacity=1, gray=False):
    src = photo_src(key)
    iw, ih = img_size(src)
    s = max(w / iw, h / ih)
    cw, ch = w / s, h / s
    cx = max(0, min(iw - cw, focus[0] * iw - cw / 2))
    cy = max(0, min(ih - ch, focus[1] * ih - ch / 2))
    o = {"type": "image", "left": x, "top": y, "width": round(cw, 2), "height": round(ch, 2), "cropX": round(cx, 2), "cropY": round(cy, 2), "scaleX": s, "scaleY": s,
         "src": src, "crossOrigin": "anonymous", "filters": [{"type": "Grayscale", "mode": "average"}] if gray else [], "opacity": opacity}
    clip = d._clip(frame, cw, ch, rx / s if rx else 0)
    if clip:
        o["clipPath"] = clip
    o["__frame"] = {"kind": frame if frame != "rounded" else "rect", "empty": False}
    if shadow_:
        o["shadow"] = shadow_
    return d.add(o, name)


class Ctx:
    def __init__(self, d, ind, brand, pal, font, rnd, fmt):
        self.d, self.ind, self.rnd, self.fmt = d, ind, rnd, fmt
        self.W, self.H = d.W, d.H
        self.brand, self.tagline = brand
        self.bg, self.surf, self.ink, self.acc, self.acc2, self.mut, self.dark = pal
        self.disp, self.body, self.dw, self.upper = font
        short = min(d.W, d.H)
        self.u = short / 1000
        if d.W == 2480:
            self.u *= 0.62
        elif d.W == 1050:
            self.u *= 1.75
        elif fmt == "rollup":
            self.u *= 0.95
        elif fmt == "banner":
            self.u *= 1.45
        self.m = short * 0.08
        self.wide = d.W / d.H > 1.45
        self.tall = d.H / d.W > 1.45
        self.sq = not self.wide and not self.tall
        self.head = rnd.choice(ind["heads"])
        self.sub = rnd.choice(ind["subs"])
        self.city = rnd.choice(CITIES)
        slug = re.sub(r"[^a-z]", "", brand[0].lower())[:14]
        self.web = f"{slug}.com"
        self.phone = "+971 4 000 0000" if self.city in ("Dubai", "Abu Dhabi") else "+44 20 0000 0000" if self.city == "London" else "+1 212 000 0000" if self.city == "New York" else "+00 000 000 000"
        photos = list(ind["photos"])
        rnd.shuffle(photos)
        self.photos = photos

    def text_on(self, dark_bg):
        return ("#FFFFFF", rgba("#FFFFFF", 0.78)) if dark_bg else (self.ink, self.mut)

    def H1(self, x, y, w, maxh, color, size_max, text=None, align="left", upper=None, font=None, weight=None, lh=1.02):
        """Headline sized to fit w × maxh (max 4 lines)."""
        t = text or self.head
        up = self.upper if upper is None else upper
        fam, wt = font or self.disp, weight or self.dw
        s = size_max * self.u
        while s > 14 * self.u:
            h = self.d.measure(t, w, fam, s, weight=wt, lh=lh, upper=up)
            longest = max(text_width(wd, fam, s, wt, False, 20 if up else 0) for wd in (t.upper() if up else t).split())
            if h <= maxh and longest <= w * 0.97:
                break
            s *= 0.94
        o = self.d.text(x, y, w, t, fam, s, color, weight=wt, align=align, lh=lh, upper=up, name="Headline", spacing=0 if not up else 20)
        return o, o["_h"]

    def T(self, x, y, w, text, size, color, weight=400, align="left", lh=1.35, upper=False, spacing=0, font=None, name=None):
        o = self.d.text(x, y, w, text, font or self.body, size * self.u, color, weight=weight, align=align, lh=lh, upper=upper, spacing=spacing, name=name)
        return o, o["_h"]

    def eyebrow(self, x, y, w, color, align="left", text=None):
        return self.T(x, y, w, text or self.ind["label"], 20, color, weight=700, align=align, upper=True, spacing=320, name="Eyebrow")

    def logo(self, x, y, color, size=26, align="left"):
        mark = ["circle", "square", "arch", "tri", "leaf"][hash(self.brand) % 5]
        return logo(self.d, x, y, self.brand, color, size * self.u, fam=self.body if self.body != "Inter" else "Montserrat", mark=mark, acc=self.acc, align=align)

    def button(self, cx, cy, fg, bg, text=None, size=22):
        from common import pill
        return pill(self.d, cx, cy, text or self.ind["cta"], self.body, size * self.u, fg, bg, pad_x=size * self.u * 1.5, pad_y=size * self.u * 0.8, weight=700, spacing=120)

    def button_left(self, x, cy, fg, bg, text=None, size=22):
        from common import pill
        t = (text or self.ind["cta"]).upper()
        w = text_width(t, self.body, size * self.u, 700, False, 120) + size * self.u * 3
        return pill(self.d, x + w / 2, cy, t, self.body, size * self.u, fg, bg, pad_x=size * self.u * 1.5, pad_y=size * self.u * 0.8, weight=700, spacing=120)

    def contact(self, x, y, w, color, align="left", size=18):
        return self.T(x, y, w, f"{self.web}  ·  {self.phone}  ·  {self.city}", size, color, align=align, name="Contact")

    def services(self, x, y, w, color, acc, size=22, cols=1, numbered=True):
        items = self.ind["services"]
        cw = w / cols
        yy = y
        for i, s in enumerate(items):
            cx = x + (i % cols) * cw
            cy = y + (i // cols) * size * self.u * 2.1
            if numbered:
                self.T(cx, cy, 60 * self.u, f"{i + 1:02d}", size * 0.8, acc, weight=700)
                self.T(cx + 52 * self.u, cy - 2 * self.u, cw - 60 * self.u, s, size, color, weight=600)
            else:
                self.d.circle(cx + 6 * self.u, cy + size * self.u * 0.62, 5 * self.u, acc)
                self.T(cx + 24 * self.u, cy, cw - 30 * self.u, s, size, color, weight=500)
            yy = cy + size * self.u * 2.1
        return yy - y


# ------------------------------------------------------------------ layouts
def L_split(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    if c.tall:
        ph = H * 0.5
        pic(d, c.photos[0], 0, 0, W, ph)
        d.rect(0, ph - 6 * u, W, 12 * u, c.acc, name="Accent band")
        y = ph + m * 0.8
        c.eyebrow(m, y, W - 2 * m, c.acc)
        o, h = c.H1(m, y + 50 * u, W - 2 * m, (H - y) * 0.42, c.ink, 120)
        _, h2 = c.T(m, y + 70 * u + h, W - 2 * m, c.sub, 30, c.mut)
        c.button_left(m, H - m - 120 * u, c.surf if c.dark else "#FFFFFF", c.ink if not c.dark else c.acc)
        c.contact(m, H - m - 40 * u, W - 2 * m, c.mut)
    else:
        pw = W * (0.48 if c.wide else 0.5)
        pic(d, c.photos[0], W - pw, 0, pw, H)
        x, w = m, W - pw - 2 * m
        c.logo(x, m * 0.8, c.ink, 22)
        top = H * 0.24
        c.eyebrow(x, top, w, c.acc)
        o, h = c.H1(x, top + 46 * u, w, H * 0.38, c.ink, 110)
        _, h2 = c.T(x, top + 70 * u + h, w, c.sub, 26, c.mut)
        if not c.wide or H > 600:
            c.button_left(x, min(H - m - 30 * u, top + 140 * u + h + h2), "#FFFFFF" if not c.dark else c.bg, c.ink if not c.dark else c.acc)
        d.rect(W - pw - 8 * u, H * 0.18, 16 * u, H * 0.3, c.acc, name="Accent")


def L_fullbleed(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    pic(d, c.photos[0], 0, 0, W, H)
    d.rect(0, 0, W, H, lin(0, 0, 0, H, [(0, rgba("#000000", 0.15)), (0.45, rgba("#000000", 0.25)), (1, rgba(mix(c.bg, "#000000", 0.7) if not c.dark else c.bg, 0.92))]), name="Shade")
    c.logo(m, m, "#FFFFFF", 22)
    bh = H * (0.42 if not c.wide else 0.5)
    y0 = H - m - bh
    c.eyebrow(m, y0, W - 2 * m, c.acc)
    o, h = c.H1(m, y0 + 46 * u, W * (0.84 if not c.wide else 0.62), bh * 0.6, "#FFFFFF", 130)
    _, h2 = c.T(m, y0 + 66 * u + h, W * (0.8 if not c.wide else 0.55), c.sub, 26, rgba("#FFFFFF", 0.85))
    if not c.wide or H >= 700:
        c.button_left(m, y0 + 120 * u + h + h2, c.ink if not c.dark else c.bg, c.acc)


def L_framed(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    if c.wide:
        pw, ph = W * 0.42, H - 2 * m
        d.rect(W - m - pw + 24 * u, m + 24 * u, pw, ph, c.acc, name="Offset block")
        pic(d, c.photos[0], W - m - pw, m, pw, ph)
        x, w = m, W - pw - 3 * m
        c.logo(x, m, c.ink, 20)
        o, h = c.H1(x, H * 0.3, w, H * 0.4, c.ink, 100)
        c.T(x, H * 0.3 + h + 24 * u, w, c.sub, 24, c.mut)
        return
    ph = H * (0.5 if c.tall else 0.52)
    pw = W - 2 * m - 30 * u
    d.rect(m + 30 * u, m + 30 * u, pw, ph, c.acc, name="Offset block")
    pic(d, c.photos[0], m, m, pw, ph, shadow_=shadow("rgba(0,0,0,0.18)", 30 * u, 0, 12 * u))
    y = m + ph + 70 * u
    o, h = c.H1(m, y, W - 2 * m, (H - y - m) * 0.5, c.ink, 110)
    _, h2 = c.T(m, y + h + 20 * u, W - 2 * m, c.sub, 26, c.mut)
    if c.tall or c.fmt in ("flyer", "poster", "rollup"):
        c.services(m, y + h + h2 + 70 * u, W - 2 * m, c.ink, c.acc, 26, cols=2)
    c.logo(m, H - m - 36 * u, c.ink, 20)
    c.T(W / 2, H - m - 30 * u, W / 2 - m, c.web, 18, c.mut, align="right")


def L_type(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    d.rect(0, 0, W, 14 * u, c.acc, name="Top rule")
    c.logo(m, m, c.ink, 22)
    w = W - 2 * m
    top = H * (0.22 if not c.wide else 0.28)
    c.eyebrow(m, top, w, c.acc)
    o, h = c.H1(m, top + 50 * u, w * (1 if not c.wide else 0.7), H * (0.42 if not c.wide else 0.46), c.ink, 170, lh=0.98)
    y = top + 80 * u + h
    d.rect(m, y, 90 * u, 6 * u, c.acc, name="Rule")
    _, h2 = c.T(m, y + 30 * u, w * 0.8, c.sub, 28, c.mut)
    if not c.wide:
        c.services(m, y + h2 + 80 * u, w, c.ink, c.acc, 24, cols=2, numbered=False)
        c.button_left(m, H - m - 40 * u, "#FFFFFF" if not c.dark else c.bg, c.ink if not c.dark else c.acc)
    else:
        r = H * 0.36
        pic(d, c.photos[0], W - m - 2 * r, H / 2 - r, 2 * r, 2 * r, frame="circle")
        d.circle(W - m - r, H / 2, r + 14 * u, "", stroke=c.acc, sw=4 * u, name="Ring")


def L_diagonal(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    pic(d, c.photos[0], 0, 0, W, H)
    if c.wide:
        d.polygon([(0, 0), (W * 0.62, 0), (W * 0.48, H), (0, H)], c.bg, name="Panel")
        d.polygon([(W * 0.62, 0), (W * 0.64, 0), (W * 0.5, H), (W * 0.48, H)], c.acc, name="Accent")
        x, w = m, W * 0.42
        top = H * 0.2
    else:
        d.polygon([(0, H * 0.48), (W, H * 0.36), (W, H), (0, H)], c.bg, name="Panel")
        d.polygon([(0, H * 0.48), (W, H * 0.36), (W, H * 0.375), (0, H * 0.495)], c.acc, name="Accent")
        x, w = m, W - 2 * m
        top = H * 0.53
    tc, mc = c.text_on(c.dark)
    c.eyebrow(x, top, w, c.acc)
    o, h = c.H1(x, top + 46 * u, w, H * (0.26 if not c.wide else 0.4), tc, 110)
    _, h2 = c.T(x, top + 66 * u + h, w, c.sub, 26, mc)
    if not c.wide:
        c.button_left(x, top + 130 * u + h + h2, c.bg if c.dark else "#FFFFFF", c.acc if c.dark else c.ink)
        c.contact(x, H - m - 30 * u, w, mc)
    c.logo(m, m, "#FFFFFF" if not c.wide else tc, 22)


def L_arch(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    tc, mc = c.text_on(c.dark)
    if c.wide:
        aw = H * 0.62
        pic(d, c.photos[0], W - m - aw, m * 0.8, aw, H - 1.6 * m, frame="arch")
        x, w = m, W - aw - 3 * m
        c.T(x, H * 0.22, w, c.tagline, 22, c.acc, font=c.disp, weight=400, upper=False)
        o, h = c.H1(x, H * 0.3, w, H * 0.42, tc, 100, font="Cormorant Garamond" if not c.dark else c.disp, weight=600)
        c.T(x, H * 0.3 + h + 26 * u, w, c.sub, 24, mc)
        return
    aw = W * (0.62 if c.tall else 0.4 if c.sq and c.H <= c.W * 1.05 else 0.5)
    ah = aw * 1.25
    ay = m * (1.2 if c.tall else 0.8)
    pic(d, c.photos[0], (W - aw) / 2, ay, aw, ah, frame="arch")
    d.rect((W - aw) / 2 - 16 * u, ay + ah * 0.35, aw + 32 * u, ah * 0.65 + 16 * u, "", stroke=c.acc, sw=3 * u, name="Frame line")
    y = ay + ah + 60 * u
    c.T(m, y, W - 2 * m, c.ind["label"], 20, c.acc, weight=700, align="center", upper=True, spacing=320)
    o, h = c.H1(m, y + 46 * u, W - 2 * m, (H - y) * 0.36, tc, 100, align="center")
    _, h2 = c.T(m * 1.5, y + 66 * u + h, W - 3 * m, c.sub, 26, mc, align="center")
    if (c.tall or c.fmt in ("flyer", "poster", "rollup")) and y + 160 * u + h + h2 < H - m - 150 * u:
        c.button(W / 2, H - m - 110 * u, c.bg if c.dark else "#FFFFFF", c.acc if c.dark else c.ink)
    c.logo(W / 2, H - m - 40 * u, tc, 20, align="center")


def L_grid(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.surf if not c.dark else c.bg)
    g = 12 * u
    tc, mc = c.text_on(c.dark)
    ph = c.photos + c.photos
    if c.wide:
        cw = (W * 0.58 - g) / 2
        pic(d, ph[0], W * 0.42, 0, cw, H)
        pic(d, ph[1], W * 0.42 + cw + g, 0, cw, H / 2 - g / 2)
        pic(d, ph[2], W * 0.42 + cw + g, H / 2 + g / 2, cw, H / 2 - g / 2)
        x, w = m, W * 0.42 - 2 * m
        c.logo(x, m, tc, 20)
        o, h = c.H1(x, H * 0.3, w, H * 0.44, tc, 90)
        c.T(x, H * 0.3 + h + 20 * u, w, c.sub, 22, mc)
        return
    gh = H * (0.58 if c.tall else 0.6)
    cw = (W - g) / 2
    pic(d, ph[0], 0, 0, cw, gh)
    pic(d, ph[1], cw + g, 0, cw, gh * 0.55 - g / 2)
    pic(d, ph[2], cw + g, gh * 0.55 + g / 2, cw, gh * 0.45 - g / 2)
    d.rect(0, gh, W, H - gh, c.bg if not c.dark else c.surf, name="Panel")
    d.rect(m, gh - 30 * u, 220 * u, 60 * u, c.acc, name="Tab")
    c.T(m, gh - 30 * u + 16 * u, 220 * u, c.ind["services"][0], 20, c.ink if not c.dark else c.bg, weight=700, align="center", upper=True, spacing=200)
    tc2, mc2 = c.text_on(c.dark)
    y = gh + 70 * u
    o, h = c.H1(m, y, W - 2 * m, (H - y - m) * 0.5, tc2, 100)
    _, h2 = c.T(m, y + h + 20 * u, W - 2 * m, c.sub, 26, mc2)
    c.contact(m, H - m - 30 * u, W - 2 * m, mc2)


def L_editorial(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    tc, mc = c.text_on(c.dark)
    c.T(m, m, W - 2 * m, f"{c.brand.upper()}   —   {c.tagline.upper()}", 18, tc, weight=700, spacing=260)
    d.rect(m, m + 46 * u, W - 2 * m, 2 * u, tc, name="Rule")
    if c.wide:
        pw = W * 0.36
        pic(d, c.photos[0], W - m - pw, m + 80 * u, pw, H - 2 * m - 80 * u)
        w = W - pw - 3 * m
        o, h = c.H1(m, m + 90 * u, w, H * 0.44, tc, 110, font=c.disp)
        c.T(m, m + 120 * u + h, w * 0.9, c.sub, 22, mc)
        return
    o, h = c.H1(m, m + 90 * u, W - 2 * m, H * (0.24 if c.tall else 0.28), tc, 150, font=c.disp)
    y = m + 120 * u + h
    colw = (W - 2 * m - 40 * u) / 2
    ph = H - y - m - 60 * u
    pic(d, c.photos[0], m, y, colw, ph * (0.92 if c.tall else 1))
    _, h2 = c.T(m + colw + 40 * u, y, colw, c.sub, 26, mc)
    c.services(m + colw + 40 * u, y + h2 + 50 * u, colw, tc, c.acc, 24)
    d.rect(m, H - m - 20 * u, W - 2 * m, 2 * u, tc, opacity=0.4, name="Rule")
    c.T(m, H - m - 6 * u, W - 2 * m, f"{c.web}  ·  {c.city}", 16, mc, upper=True, spacing=200)


def L_circle(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    tc, mc = c.text_on(c.dark)
    if c.wide:
        r = H * 0.62
        pic(d, c.photos[0], W - r * 1.45, H / 2 - r, 2 * r, 2 * r, frame="circle")
        d.circle(W - r * 0.45, H / 2, r + 18 * u, "", stroke=c.acc, sw=5 * u, name="Ring")
        x, w = m, W - r * 1.45 - 2 * m
    else:
        r = W * 0.42
        cy = H * (0.3 if c.tall else 0.26)
        pic(d, c.photos[0], W - r * 1.6, cy - r, 2 * r, 2 * r, frame="circle")
        d.circle(W - r * 0.6, cy, r + 18 * u, "", stroke=c.acc, sw=5 * u, name="Ring")
        d.circle(W - r * 1.55, cy + r * 0.75, 60 * u, c.acc, name="Dot")
        x, w = m, W - 2 * m
    top = H * 0.22 if c.wide else min(H * 0.62, cy + r + 50 * u)
    c.logo(m, m, tc, 22)
    c.eyebrow(x, top, w, c.acc)
    o, h = c.H1(x, top + 46 * u, w, H * 0.42 if c.wide else max(H * 0.14, (H - top) * 0.42), tc, 110)
    _, h2 = c.T(x, top + 66 * u + h, w * 0.9, c.sub, 26, mc)
    if not c.wide:
        c.button_left(x, min(H - m - 40 * u, top + 130 * u + h + h2), c.bg if c.dark else "#FFFFFF", c.acc if c.dark else c.ink)


def L_stat(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.acc if not c.dark else c.bg)
    ink = c.ink if not c.dark else "#FFFFFF"
    big, cap = c.ind["stat"]
    tc = ink
    if c.wide:
        pw = W * 0.38
        pic(d, c.photos[0], W - pw, 0, pw, H)
        w = W - pw - 2 * m
    else:
        ph = H * (0.38 if c.tall else 0.34)
        pic(d, c.photos[0], 0, H - ph, W, ph)
        w = W - 2 * m
    c.logo(m, m, tc, 22)
    size = d.fit(big, w, c.disp, (420 if not c.wide else 300) * c.u, weight=c.dw)
    y = H * (0.14 if not c.wide else 0.16)
    d.text(m, y, w, big, c.disp, size, tc, weight=c.dw, name="Big number")
    y += size * FS_MULT * 0.95
    c.T(m, y, w, cap, 30, tc, weight=700, upper=True, spacing=260)
    o, h = c.H1(m, y + 70 * u, w * 0.9, H * (0.2 if not c.wide else 0.26), tc, 70, font=c.body, weight=700, upper=False)
    if not c.wide:
        c.T(m, y + 90 * u + h, w, c.sub, 24, rgba(tc, 0.8))


def L_minimal(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.surf if not c.dark else c.bg)
    tc, mc = c.text_on(c.dark)
    mm = m * 1.25
    c.T(mm, mm, W - 2 * mm, c.brand, 22, tc, weight=600, font=c.disp, name="Brand")
    c.T(mm, mm, W - 2 * mm, c.city, 18, mc, align="right")
    if c.wide:
        pw = W * 0.3
        pic(d, c.photos[0], W - mm - pw, mm + 60 * u, pw, H - 2 * mm - 60 * u)
        o, h = c.H1(mm, H * 0.3, W - pw - 3 * mm, H * 0.46, tc, 130, font="Cormorant Garamond", weight=500, upper=False)
        c.T(mm, H * 0.3 + h + 20 * u, W - pw - 3 * mm, c.sub, 22, mc)
        return
    ph = H * (0.42 if c.tall else 0.4)
    pic(d, c.photos[0], mm, mm + 70 * u, W - 2 * mm, ph)
    y = mm + 70 * u + ph + 70 * u
    o, h = c.H1(mm, y, W - 2 * mm, (H - y) * 0.42, tc, 110, font="Cormorant Garamond", weight=500, upper=False, lh=1.05)
    d.rect(mm, y + h + 30 * u, 60 * u, 2 * u, tc, name="Rule")
    c.T(mm, y + h + 56 * u, W - 2 * mm, c.sub, 24, mc)
    c.T(mm, H - mm - 20 * u, W - 2 * mm, f"{c.ind['cta']}  →  {c.web}", 18, tc, weight=600, upper=True, spacing=200)


def L_block(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg(c.bg)
    dark = c.ink if not c.dark else c.surf
    if c.wide:
        d.rect(0, 0, W * 0.55, H, dark, name="Block")
        pic(d, c.photos[0], W * 0.55, 0, W * 0.45, H)
        x, w = m, W * 0.55 - 2 * m
        top = H * 0.24
    else:
        bh = H * (0.56 if c.tall else 0.58)
        pic(d, c.photos[0], 0, 0, W, H - bh + 60 * u)
        d.rect(m * 0.5, H - bh, W - m, bh - m * 0.5, dark, name="Block")
        x, w = m * 1.3, W - 2.6 * m
        top = H - bh + m * 0.8
    d.rect(x, top, 70 * u, 70 * u, c.acc, name="Mark")
    c.T(x + 90 * u, top + 14 * u, w, c.brand.upper(), 20, "#FFFFFF", weight=700, spacing=260)
    o, h = c.H1(x, top + 110 * u, w, H * (0.3 if not c.wide else 0.4), "#FFFFFF", 120)
    _, h2 = c.T(x, top + 130 * u + h, w, c.sub, 26, rgba("#FFFFFF", 0.78))
    if not (c.wide and H < 700):
        c.button_left(x, top + 200 * u + h + h2, dark, c.acc)


LAYOUTS = {"split": L_split, "fullbleed": L_fullbleed, "framed": L_framed, "type": L_type, "diagonal": L_diagonal, "arch": L_arch,
           "grid": L_grid, "editorial": L_editorial, "circle": L_circle, "stat": L_stat, "minimal": L_minimal, "block": L_block}


def L_card(c, variant):
    """Business card (front)."""
    d, W, H, u = c.d, c.W, c.H, c.u
    m = H * 0.12
    tc, mc = c.text_on(c.dark)
    names = ["Layla Haddad", "James Carter", "Priya Nair", "Omar Saeed", "Sofia Rossi", "Daniel Kim", "Amara Okafor", "Lucas Martin"]
    who = names[variant % len(names)]
    roles = ["Managing Director", "Founder & CEO", "Senior Consultant", "Creative Director", "Head of Sales", "Principal"]
    role = roles[variant % len(roles)]
    if variant % 3 == 0:
        d.bg(c.bg)
        d.rect(0, 0, W * 0.36, H, c.acc, name="Band")
        c.logo(W * 0.04, H * 0.42, c.ink if not c.dark else c.bg, 14)
        x = W * 0.42
    elif variant % 3 == 1:
        d.bg(c.ink if not c.dark else c.bg)
        tc, mc = "#FFFFFF", rgba("#FFFFFF", 0.7)
        d.rect(0, H - 14 * u, W, 14 * u, c.acc, name="Rule")
        c.logo(m, m, "#FFFFFF", 12)
        x = W * 0.5
    else:
        d.bg(c.surf if not c.dark else c.bg)
        pic(d, c.photos[0], W * 0.62, 0, W * 0.38, H)
        c.logo(m, m, tc, 12)
        x = m
    w = (W * 0.6 - m) if variant % 3 == 2 else (W - x - m)
    y = H * (0.36 if variant % 3 != 1 else 0.3)
    c.T(x, y, w, who, 30, tc, weight=700, font=c.disp)
    c.T(x, y + 44 * u, w, role, 15, c.acc, weight=600, upper=True, spacing=200)
    c.T(x, y + 86 * u, w, f"{c.phone}\nhello@{c.web}\n{c.web}", 14, mc, lh=1.55)


def L_letterhead(c):
    d, W, H, m, u = c.d, c.W, c.H, c.m, c.u
    d.bg("#FFFFFF")
    d.rect(0, 0, W, 18 * u, c.acc, name="Top rule")
    c.logo(m, m, c.ink, 30)
    c.T(W / 2, m, W / 2 - m, f"{c.city}\n{c.phone}\nhello@{c.web}", 18, c.mut, align="right", lh=1.5)
    y = m + 260 * u
    c.T(m, y, W - 2 * m, "12 November 2026\n\nMs. Sarah Lewis\nOperations Director\nBrightside Holdings", 22, c.ink, lh=1.45)
    body = ("Dear Ms. Lewis,\n\nThank you for meeting with our team last week. Following our conversation, please find attached our proposal outlining the scope, timeline and investment for the project. "
            "We have built the plan around the priorities you shared and included options to phase the work.\n\nWe would welcome the chance to walk you through it in person.\n\nKind regards,\n\nLayla Haddad\nManaging Director")
    c.T(m, y + 330 * u, W - 2 * m, body, 22, c.ink, lh=1.6)
    d.rect(m, H - m - 60 * u, W - 2 * m, 2 * u, c.acc, name="Rule")
    c.T(m, H - m - 36 * u, W - 2 * m, f"{c.brand}  ·  {c.tagline}  ·  {c.web}", 16, c.mut, align="center", upper=True, spacing=200)


# ------------------------------------------------------------------ build
PIECES = ["post", "portrait", "story", "linkedin", "facebook", "youtube", "flyer", "poster", "slide", "banner", "rollup", "ad"]
LAYOUT_KEYS = list(LAYOUTS)


def plan():
    """Every (industry, brand, piece, layout) combination, in a stable order."""
    out = []
    for ii, ind in enumerate(IND):
        for bi, brand in enumerate(ind["brands"]):
            for pi, piece in enumerate(PIECES):
                for li in range(len(LAYOUT_KEYS)):
                    lay = LAYOUT_KEYS[(li + bi * 4 + pi) % len(LAYOUT_KEYS)]
                    out.append((ii, bi, piece, lay, li))
            for v in range(3):
                out.append((ii, bi, "card", "card", v))
            out.append((ii, bi, "letter", "letterhead", 0))
    return out


def make(job, seq):
    ii, bi, piece, lay, var = job
    ind = IND[ii]
    brand = ind["brands"][bi]
    rnd = random.Random(f"{ind['k']}-{bi}-{piece}-{lay}-{var}")
    pal = PALETTES[(ii * 5 + bi * 7 + var * 3 + LAYOUT_KEYS.index(lay) if lay in LAYOUT_KEYS else ii + var) % len(PALETTES)]
    font = FONTS[(ii * 3 + bi * 5 + var) % len(FONTS)]
    if piece == "letter":
        W, H, flabel, cat, cid, pr = 2480, 3508, "Letterhead", "Business", "25594259-9447-49b6-8a3c-9cc8c505e5e0", True
    else:
        W, H, flabel, cat, cid, pr = FMT[piece]
    d = Doc(W, H, artboard(W, H, 20000 + seq, pr), seed=20000 + seq)
    if pr:
        d.bleed = PRINT_BLEED
    d.kind = piece
    c = Ctx(d, ind, brand, pal, font, rnd, piece)
    if piece == "card":
        L_card(c, var)
        title = f"{brand[0]} Business Card"
        title += ["", " — Bold", " — Photo"][var]
    elif piece == "letter":
        L_letterhead(c)
        title = f"{brand[0]} Letterhead"
    else:
        LAYOUTS[lay](c)
        title = f"{brand[0]} {c.head.rstrip('.')} {PIECE_NAMES[piece]}"
    for ob in d.objs:
        ob.pop("_h", None)
        ob.pop("__lines", None)
    slug = "u-" + re.sub(r"[^a-z0-9]+", "-", title.lower().replace("&", "and").replace("'", "").replace("é", "e").replace("ã", "a")).strip("-")[:90] + f"-{seq:05d}"
    fname = PIECE_NAMES.get(piece, flabel).lower()
    kind = "print-ready" if pr else "digital"
    desc = (f"{title}: a professional {fname} template for {ind['label'].lower()} businesses, from the {brand[0]} brand set. "
            f"{lay.replace('fullbleed', 'Full-bleed photo').replace('type', 'Typographic').capitalize() if lay not in ('card', 'letterhead') else 'Clean'} layout with a {('dark' if pal[6] else 'light')} palette. "
            f"Edit the text, colours, logo and photos online, then download it {'as a print-ready PDF with 3 mm bleed' if pr else 'for social media and web'}.")
    tags = ["universe-2026-11", f"industry-{ind['k']}", f"layout-{lay}", f"brand-set-{ind['k']}-{bi}", "style:" + ("dark" if pal[6] else "light"), ind["tag"]] + (["print-ready", "bleed-3mm"] if pr else [])
    hashtags = sorted({re.sub(r"[^a-z0-9]", "", ind["tag"]), re.sub(r"[^a-z0-9]", "", fname), re.sub(r"[^a-z0-9]", "", ind["label"].lower()), "editabletemplate", "printready" if pr else "socialmedia"})
    return {"name": title, "category": cat, "category_id": cid, "slug": slug, "width": W, "height": H, "color1": pal[0], "color2": pal[3],
            "sort": 1000 + seq, "featured": False, "keywords": f"{ind['label'].lower()}, {fname}, {ind['tag']}, {brand[1].lower()}, professional template",
            "tags": tags, "hashtags": hashtags, "status": "published", "description": desc, "canvasJson": d.json(), "print": pr}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--start", type=int, default=0)
    ap.add_argument("--chunk", type=int, default=500)
    ap.add_argument("--sample", type=int, default=0, help="spread sample of N jobs")
    a = ap.parse_args()
    jobs = plan()
    idx = list(range(len(jobs)))
    if a.sample:
        idx = sorted(random.Random(a.sample).sample(idx, a.sample))
    else:
        idx = idx[a.start: (a.start + a.limit) if a.limit else None]
    os.makedirs(a.out, exist_ok=True)
    buf, part, n = [], a.start // a.chunk, 0
    for k in idx:
        buf.append(make(jobs[k], k))
        n += 1
        if len(buf) >= a.chunk:
            json.dump(buf, open(os.path.join(a.out, f"universe-{part:03d}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
            part += 1
            buf = []
    if buf:
        json.dump(buf, open(os.path.join(a.out, f"universe-{part:03d}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    print("total jobs", len(jobs), "built", n)


if __name__ == "__main__":
    main()
