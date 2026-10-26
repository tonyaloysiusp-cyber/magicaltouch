"""Collection 500 — Business and professional stationery (biz-001 … biz-030)."""

import json, math, os, subprocess
from kit import lin, rad, mix, rgba, shadow, text_width
from common import GOLD, SILVER, metal, text_metal, vgrad, overlay, pill, divider

CATEGORY = "Business and professional stationery"
SITE_CATEGORY = "Business"
TAG = "business"

BC = 1050, 600
BCV = 600, 1050
A4 = 794, 1123
# boards sized at 300 dpi: bleed and safe area are scaled from the 96 dpi print board
DPI300 = {BC, BCV, (638, 1012)}

SPEC = [
    ("Business card", "Minimal Monogram Business Card", *BC, "Layla Haddad", "Principal Architect · Haddad Studio", "+971 50 123 4567 · layla@haddadstudio.ae · haddadstudio.ae · Dubai Design District", "minimal monogram business card cream", "business card, minimal, architect", "Business Card"),
    ("Business card", "Bold Split Colour Business Card", *BC, "Omar Saeed", "Marketing Director · Brightline Agency", "+971 55 987 6543 · omar@brightline.ae · brightline.ae · Business Bay, Dubai", "bold split color business card modern", "business card, modern, marketing", "Business Card"),
    ("Business card", "Gold Luxury Real Estate Card", *BC, "Noor Al Mansouri", "Senior Property Consultant · Noor Estates", "+971 50 222 3344 · noor@noorestates.ae · noorestates.ae · Palm Jumeirah", "black gold luxury business card real estate", "business card, luxury, real estate", "Business Card"),
    ("Business card", "Photographer Split Business Card", *BC, "Sam Rivera", "Photography · Weddings & Portraits", "+971 52 456 7890 · hello@samrivera.photo · samrivera.photo · @samrivera.photo", "photographer business card with photo", "business card, photographer", "Business Card"),
    ("Business card", "Creative Gradient Business Card", *BC, "Mira Joseph", "UX & Brand Designer", "+971 56 321 0099 · mira@mirajoseph.design · mirajoseph.design · Dubai", "gradient creative business card designer", "business card, creative, gradient", "Business Card"),
    ("Business card", "Law Firm Classic Business Card", *BC, "Ahmed Rahman", "Partner · Rahman & Co. Advocates", "+971 4 555 1200 · a.rahman@rahmanlaw.ae · rahmanlaw.ae · DIFC, Dubai", "classic navy law firm business card serif", "business card, lawyer, classic", "Business Card"),
    ("Business card", "Beauty Salon Business Card", *BC, "Bloom Beauty Lounge", "Hair · Nails · Skin", "+971 4 333 7788 · bloombeauty.ae · @bloombeauty · Jumeirah 1", "blush beauty salon business card script", "business card, salon, beauty", "Business Card"),
    ("Business card", "Tech Startup Business Card", *BC, "Ravi Menon", "Co-founder & CTO · Nimbus Labs", "+971 58 765 4321 · ravi@nimbuslabs.io · nimbuslabs.io · Dubai Internet City", "dark tech startup business card qr code", "business card, tech, startup, qr code", "Business Card"),
    ("Business card", "Coffee Shop Business Card", *BC, "The Daily Grind", "Specialty Coffee & Bakery", "+971 4 222 1100 · thedailygrind.ae · @thedailygrind · Al Wasl Road", "coffee shop business card illustration", "business card, cafe, coffee", "Business Card"),
    ("Business card", "Vertical Clinic Business Card", *BCV, "Dr. Sara Khalil", "Consultant Dermatologist · Clear Skin Clinic", "+971 4 444 9090 · clearskin.ae · Al Safa, Dubai", "vertical medical business card clean", "business card, vertical, doctor", "Business Card"),
    ("Letterhead", "Corporate Navy Letterhead", *A4, "Meridian Holdings", "Dear Ms. Haddad,", "Office 1204, Bay Square · Business Bay, Dubai · +971 4 123 4567 · meridianholdings.ae", "corporate navy letterhead design", "letterhead, corporate", "Letterhead"),
    ("Letterhead", "Minimal Line Letterhead", *A4, "Haddad Studio", "Dear Client,", "Dubai Design District · +971 50 123 4567 · haddadstudio.ae", "minimal line letterhead", "letterhead, minimal", "Letterhead"),
    ("Letterhead", "Creative Studio Letterhead", *A4, "Brightline Agency", "Hello Dana,", "Business Bay, Dubai · hello@brightline.ae · brightline.ae", "creative agency letterhead colour shapes", "letterhead, creative, agency", "Letterhead"),
    ("Letterhead", "Law Firm Letterhead", *A4, "Rahman & Co.", "Dear Sir or Madam,", "Gate Village 4, DIFC · Dubai · +971 4 555 1200 · rahmanlaw.ae", "classic law firm letterhead", "letterhead, legal", "Letterhead"),
    ("Letterhead", "Teal Clinic Letterhead", *A4, "Clear Skin Clinic", "To whom it may concern,", "Al Safa, Dubai · +971 4 444 9090 · clearskin.ae", "medical clinic letterhead clean teal", "letterhead, medical", "Letterhead"),
    ("Letterhead", "Gold Luxury Letterhead", *A4, "Noor Estates", "Dear Mr. Al Falasi,", "Palm Jumeirah · Dubai · +971 50 222 3344 · noorestates.ae", "luxury gold letterhead", "letterhead, luxury, real estate", "Letterhead"),
    ("Document", "Professional Invoice", *A4, "Invoice", "Brightline Agency", "Business Bay, Dubai · hello@brightline.ae", "professional invoice template modern", "invoice, billing"),
    ("Document", "Quotation Estimate Template", *A4, "Quotation", "Haddad Studio", "Valid for 30 days", "quotation estimate template minimal", "quotation, estimate"),
    ("Document", "Business Proposal Cover", *A4, "Business Proposal", "Website redesign for Meridian Holdings", "Prepared by Brightline Agency · March 2027", "business proposal cover page photo", "proposal, cover page"),
    ("Document", "Architecture Company Profile Cover", *A4, "Company Profile", "Building better spaces since 2009", "Meridian Holdings · 2027", "company profile cover modern architecture", "company profile, brochure cover"),
    ("Document", "Salon Price List", *A4, "Price List", "Bloom Beauty Lounge", "+971 4 333 7788 · bloombeauty.ae", "beauty salon price list elegant", "price list, salon menu"),
    ("Document", "Meeting Agenda Template", *A4, "Meeting Agenda", "Quarterly planning · Thursday 4 March 2027 · 10:00 AM · Board room", "Meridian Holdings", "meeting agenda template clean", "agenda, meeting"),
    ("Digital", "Email Signature Banner", 1200, 400, "Omar Saeed", "Marketing Director · Brightline Agency", "+971 55 987 6543 · brightline.ae", "email signature banner design", "email signature, banner"),
    ("Digital", "Designer LinkedIn Banner", 1584, 396, "Helping brands grow with clear design", "Mira Joseph · UX & Brand Designer", "mirajoseph.design", "linkedin banner professional", "linkedin banner, profile cover", "Banner"),
    ("Digital", "Presentation Title Slide", 1920, 1080, "Annual Report 2026", "Results, highlights and the year ahead", "Meridian Holdings · Board presentation", "presentation title slide corporate", "presentation, title slide", "Presentation"),
    ("Stationery", "Compliment Slip", 794, 374, "With compliments", "Haddad Studio", "Dubai Design District · +971 50 123 4567 · haddadstudio.ae", "compliment slip design minimal", "compliment slip, stationery"),
    ("Stationery", "DL Envelope Design", 831, 416, "Meridian Holdings", "Ms. Layla Haddad · Haddad Studio · Dubai Design District · Dubai, UAE", "Office 1204, Bay Square · Business Bay, Dubai", "branded dl envelope design", "envelope, stationery"),
    ("Stationery", "Employee ID Badge", 638, 1012, "Dana Khalil", "Product Designer", "Nimbus Labs · ID 00427", "employee id badge design", "id card, badge"),
    ("Stationery", "Gift Voucher", 794, 374, "Gift Voucher", "AED 250", "Bloom Beauty Lounge · valid 12 months", "elegant gift voucher salon", "gift voucher, gift card"),
    ("Stationery", "Thank You for Your Business Card", 480, 673, "Thank you", "for supporting our small business. We hope you love your order as much as we loved making it.", "The Daily Grind", "thank you for your business card", "thank you card, small business", "Cards"),
]

D = {}


def design(i):
    def wrap(f):
        D[i] = f
        return f
    return wrap


def parts(s):
    return [p.strip() for p in s.split("·")]


# ------------------------------------------------------------------ helpers
_QR = {}


def qr(d, text, x, y, size, color="#111111", bg=None, quiet=0):
    """Real, scannable QR code drawn as one vector path (uses the site's own encoder)."""
    if text not in _QR:
        root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        js = f"import('{root}/lib/qr.ts').then(m=>console.log(JSON.stringify(m.qrMatrix({json.dumps(text)},'M'))))"
        out = subprocess.run(["node", "--experimental-strip-types", "--no-warnings", "-e", js], capture_output=True, text=True, check=True).stdout
        _QR[text] = json.loads(out)
    m = _QR[text]
    n = len(m)
    c = size / (n + 2 * quiet)
    if bg:
        d.rect(x, y, size, size, bg)
    cmds = []
    for r, row in enumerate(m):
        k = 0
        while k < n:
            if row[k]:
                s = k
                while k < n and row[k]:
                    k += 1
                x0, y0 = x + (s + quiet) * c, y + (r + quiet) * c
                cmds += [["M", round(x0, 2), round(y0, 2)], ["L", round(x0 + (k - s) * c + 0.3, 2), round(y0, 2)], ["L", round(x0 + (k - s) * c + 0.3, 2), round(y0 + c + 0.3, 2)], ["L", round(x0, 2), round(y0 + c + 0.3, 2)], ["Z"]]
            else:
                k += 1
    d.path(cmds, fill=color, name="QR code")


def icon(d, kind, cx, cy, s, color, sw=None):
    """Small line icons for contact rows: phone, mail, web, pin, at."""
    sw = sw or max(1.2, s * 0.11)
    h = s / 2
    if kind == "phone":
        d.rect(cx - h * 0.55, cy - h, h * 1.1, 2 * h, "", rx=h * 0.22, stroke=color, sw=sw)
        d.line(cx - h * 0.15, cy + h * 0.65, cx + h * 0.15, cy + h * 0.65, color, sw)
    elif kind == "mail":
        d.rect(cx - h, cy - h * 0.7, 2 * h, 1.4 * h, "", rx=h * 0.12, stroke=color, sw=sw)
        d.path([["M", cx - h, cy - h * 0.6], ["L", cx, cy + h * 0.1], ["L", cx + h, cy - h * 0.6]], fill="", stroke=color, sw=sw)
    elif kind == "web":
        d.circle(cx, cy, h, "", stroke=color, sw=sw)
        d.ellipse(cx, cy, h * 0.45, h, "", stroke=color, sw=sw)
        d.line(cx - h, cy, cx + h, cy, color, sw)
    elif kind == "pin":
        d.path([["M", cx, cy + h], ["C", cx - h * 0.3, cy + h * 0.45, cx - h * 0.8, cy + h * 0.05, cx - h * 0.8, cy - h * 0.3], ["C", cx - h * 0.8, cy - h * 0.8, cx - h * 0.4, cy - h * 1.05, cx, cy - h * 1.05], ["C", cx + h * 0.4, cy - h * 1.05, cx + h * 0.8, cy - h * 0.8, cx + h * 0.8, cy - h * 0.3], ["C", cx + h * 0.8, cy + h * 0.05, cx + h * 0.3, cy + h * 0.45, cx, cy + h], ["Z"]], fill="", stroke=color, sw=sw)
        d.circle(cx, cy - h * 0.3, h * 0.28, "", stroke=color, sw=sw)
    elif kind == "at":
        d.text(cx - s, cy - s * 0.72, 2 * s, "@", "DM Sans", s * 1.15, color, weight=600, align="center")

KINDS = ["phone", "mail", "web", "pin"]


def contact_rows(d, x, y, items, family, size, color, icon_color=None, gap=1.9, kinds=None, w=None, weight=500):
    kinds = kinds or KINDS
    for k, it in enumerate(items):
        yy = y + k * size * gap
        kd = kinds[k % len(kinds)]
        if it.startswith("@"):
            kd = "at"
        icon(d, kd, x + size * 0.55, yy + size * 0.62, size * 1.05, icon_color or color)
        d.text(x + size * 1.7, yy, w or (d.W - x - size * 1.7 - 30), it, family, size, color, weight=weight)
    return y + len(items) * size * gap


def monogram(d, cx, cy, r, letters, color, fill="", family="Playfair Display", ring=True):
    if ring:
        d.circle(cx, cy, r, fill, stroke=color, sw=max(1.5, r * 0.04))
    d.text(cx - r, cy - r * 0.62, 2 * r, letters, family, r * 0.95, color, align="center", weight=500)


def page_footer(d, text, color, y=None, size=11, rule=None):
    W, H = d.W, d.H
    y = H - 60 if y is None else y
    if rule:
        d.line(60, y - 18, W - 60, y - 18, rule, 1)
    d.text(60, y, W - 120, text, "Montserrat", size, color, weight=500, align="center")


def letter_body(d, x, y, w, greeting, color, size=12.5, fam="Lora"):
    d.text(x, y, w, "4 March 2027", "Montserrat", size * 0.9, color, weight=500)
    d.text(x, y + 50, w, greeting, fam, size, color)
    body = ("Thank you for the opportunity to work together. This page is ready for your letter — click any text to edit it, "
            "and the header and footer will stay in place on every page you add.\n\n"
            "Replace this paragraph with your own message. Keep paragraphs short and leave generous margins so the letter "
            "looks calm and easy to read when printed.")
    t = d.text(x, y + 90, w, body, fam, size, color, lh=1.65)
    d.text(x, y + 110 + t["_h"], w, "Kind regards,", fam, size, color)
    return y + 110 + t["_h"]


# ------------------------------------------------------------------ business cards
@design(1)
def monogram_card(d, c):
    W, H = d.W, d.H
    d.bg("#F4EFE6")
    d.rect(W * 0.42, -d.bleed, 2, H + 2 * d.bleed, "#C9B79C")
    monogram(d, W * 0.21, H * 0.42, 110, "LH", "#8A6A4A")
    d.text(0, H * 0.7, W * 0.42, "HADDAD STUDIO", "Montserrat", 20, "#8A6A4A", weight=700, align="center", spacing=500)
    x = W * 0.49
    t = d.text(x, 92, W * 0.47, c["headline"], "Playfair Display", 62, "#2A2420", weight=500)
    d.text(x, 92 + t["_h"] + 6, W * 0.47, parts(c["message"])[0].upper(), "Montserrat", 18, "#8A6A4A", weight=700, spacing=300)
    contact_rows(d, x, 300, parts(c["signature"]), "Montserrat", 21, "#3A332C", "#8A6A4A")
    return {"layout": "monogram ring left of a hairline divider, name and four contact rows right", "typography": "Playfair Display, Montserrat", "palette": "cream, walnut, charcoal", "decor": "monogram ring, line icons"}


@design(2)
def split_card(d, c):
    W, H = d.W, d.H
    b = d.bleed
    d.bg("#FFFFFF")
    d.polygon([(-b, -b), (W * 0.46, -b), (W * 0.34, H + b), (-b, H + b)], "#FF5A36")
    d.text(50, H * 0.33, W * 0.32, "BRIGHT\nLINE", "Anton", 92, "#FFFFFF", lh=0.92)
    d.rect(52, H * 0.33 + 190, 70, 8, "#1A1A2E")
    x = W * 0.48
    d.text(x, 80, W * 0.48, c["headline"], "Outfit", 64, "#1A1A2E", weight=800)
    p = parts(c["message"])
    d.text(x, 160, W * 0.48, p[0], "Outfit", 26, "#FF5A36", weight=600)
    contact_rows(d, x, 260, parts(c["signature"]), "DM Sans", 22, "#2A2A3E", "#FF5A36")
    return {"layout": "angled colour block with stacked wordmark, name and contacts on white", "typography": "Anton, Outfit, DM Sans", "palette": "vermilion, ink navy, white", "decor": "diagonal split, line icons"}


@design(3)
def gold_card(d, c):
    W, H = d.W, d.H
    d.bg("#0E0E0E")
    d.texture("grain", 0.25)
    d.frame_border(28, "#B68A3A", 1.5)
    t = d.text(70, 90, W * 0.6, c["headline"], "Cormorant Garamond", 70, "#E9C877", weight=600)
    text_metal(d, t)
    p = parts(c["message"])
    d.text(70, 90 + t["_h"] + 4, W * 0.6, p[0].upper(), "Montserrat", 17, "#CDBB98", weight=600, spacing=300)
    d.line(70, 240, 170, 240, "#B68A3A", 2)
    contact_rows(d, 70, 280, parts(c["signature"]), "Montserrat", 20, "#EDE6D8", "#E9C877")
    d.polygon([(W * 0.82, 120), (W * 0.9, 200), (W * 0.82, 280), (W * 0.74, 200)], "", stroke="#B68A3A", sw=2)
    d.text(W * 0.66, 310, W * 0.32, "NOOR", "Cormorant Garamond", 48, "#E9C877", weight=600, align="center", spacing=500)
    d.text(W * 0.66, 370, W * 0.32, "ESTATES", "Montserrat", 15, "#CDBB98", weight=600, align="center", spacing=800)
    return {"layout": "black card with gold double line, foil name left, diamond logo right", "typography": "Cormorant Garamond gold, Montserrat", "palette": "black, gold, champagne", "decor": "grain, inset frame, diamond mark"}


@design(4)
def photographer_card(d, c):
    W, H = d.W, d.H
    d.bg("#FAFAF7")
    d.photo(1434, W * 0.55, -d.bleed, W * 0.45 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
    d.text(64, 80, W * 0.46, c["headline"].upper(), "Montserrat", 46, "#111111", weight=800, spacing=200)
    d.text(64, 140, W * 0.46, c["message"], "Lora", 24, "#6A6A6A", italic=True)
    d.line(64, 205, 124, 205, "#111111", 2)
    contact_rows(d, 64, 260, parts(c["signature"]), "Montserrat", 20, "#222222", "#111111")
    return {"layout": "name and contacts left, full-height photo right", "typography": "Montserrat caps, Lora italic", "palette": "off-white, black, photo", "decor": "half-bleed photo, rule"}


@design(5)
def gradient_card(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, H, [(0, "#7B5CFF"), (0.55, "#E45AA8"), (1, "#FFB36B")]))
    d.blob(W * 0.86, H * 0.18, 200, "rgba(255,255,255,0.14)", seed=4)
    d.blob(W * 0.08, H * 0.92, 160, "rgba(255,255,255,0.12)", seed=7)
    d.rect(60, 60, W - 120, H - 120, "rgba(255,255,255,0.16)", rx=36, stroke="rgba(255,255,255,0.5)", sw=1.5)
    d.text(110, 110, W * 0.6, c["headline"], "Outfit", 66, "#FFFFFF", weight=800)
    d.text(110, 190, W * 0.6, c["message"], "DM Sans", 26, "#FFF2F8", weight=500)
    contact_rows(d, 110, 290, parts(c["signature"])[:3], "DM Sans", 22, "#FFFFFF")
    qr(d, "https://" + parts(c["signature"])[2], W - 300, H - 300, 170, "#2A1050", bg="#FFFFFF", quiet=2)
    d.rect(W - 312, H - 312, 194, 194, "", rx=18, stroke="#FFFFFF", sw=8)
    return {"layout": "glass card over a violet-pink-peach gradient, contacts and a working QR code", "typography": "Outfit ExtraBold, DM Sans", "palette": "violet, pink, peach, white", "decor": "glassmorphism panel, blobs, QR code"}


@design(6)
def law_card(d, c):
    W, H = d.W, d.H
    d.bg("#14213D")
    d.rect(-d.bleed, H - 26, W + 2 * d.bleed, 26 + d.bleed, metal(W, 26))
    monogram(d, W / 2, 120, 62, "R", "#D9C08A", family="Cormorant Garamond")
    d.text(0, 200, W, "RAHMAN & CO.", "Cormorant Garamond", 30, "#D9C08A", weight=600, align="center", spacing=600)
    divider(d, W / 2, 262, 220, "#D9C08A", 1)
    d.text(0, 290, W, c["headline"], "Cormorant Garamond", 52, "#FFFFFF", weight=600, align="center")
    d.text(0, 356, W, parts(c["message"])[0].upper(), "Montserrat", 16, "#B9C3D6", weight=600, align="center", spacing=400)
    s = parts(c["signature"])
    d.text(0, 430, W, f"{s[0]}   |   {s[1]}", "Montserrat", 18, "#E6EAF2", weight=500, align="center")
    d.text(0, 470, W, f"{s[2]}   |   {s[3]}", "Montserrat", 18, "#E6EAF2", weight=500, align="center")
    return {"layout": "centred crest, firm name, gem divider and two contact lines", "typography": "Cormorant Garamond, Montserrat", "palette": "navy, champagne gold, white", "decor": "monogram crest, gold base band"}


@design(7)
def salon_card(d, c):
    W, H = d.W, d.H
    d.bg("#F8E6E1")
    d.circle(W * 0.08, H * 0.1, 180, "#F1D0C6")
    for k in range(5):
        d.leaf(W * 0.1 + k * 34, H * 0.88 - k * 10, 90, 30, -60 + k * 18, "#C98E7E", opacity=0.6)
    t = d.text(0, 110, W, c["headline"].split(" Lounge")[0], "Great Vibes", 110, "#A65A4C", align="center")
    d.text(0, 110 + t["_h"] - 10, W, "LOUNGE", "Montserrat", 20, "#A65A4C", weight=700, align="center", spacing=800)
    d.text(0, 300, W, c["message"].replace("·", "  ·  "), "Lora", 26, "#5A3A35", italic=True, align="center")
    s = parts(c["signature"])
    d.line(W * 0.2, 380, W * 0.8, 380, "#D8AFA4", 1)
    for k, it in enumerate(s):
        cx = W * (0.14 + k * 0.24)
        kd = ["phone", "web", "at", "pin"][k]
        icon(d, kd, cx, 432, 22, "#A65A4C")
        d.text(cx - 120, 458, 240, it, "Montserrat", 17, "#5A3A35", weight=600, align="center")
    return {"layout": "script salon name centred, services line and four icon columns", "typography": "Great Vibes, Montserrat, Lora italic", "palette": "blush, terracotta rose, cocoa", "decor": "soft circle, leaf sprig, icon row"}


@design(8)
def tech_card(d, c):
    W, H = d.W, d.H
    d.bg("#0B1020")
    d.dots(0, 0, W, H, 28, 1.6, "rgba(120,160,255,0.22)", offset_rows=False)
    d.circle(W * 0.95, H * 0.05, 260, rad(260, 260, 260, [(0, "rgba(0,229,255,0.35)"), (1, "rgba(0,229,255,0)")]))
    d.rect(70, 80, 54, 54, lin(0, 0, 54, 54, [(0, "#00E5FF"), (1, "#7B5CFF")]), rx=14)
    d.text(140, 86, 400, "nimbus labs", "Outfit", 34, "#FFFFFF", weight=700)
    d.text(70, 210, W * 0.6, c["headline"], "Outfit", 58, "#FFFFFF", weight=700)
    d.text(70, 280, W * 0.6, c["message"], "DM Sans", 22, "#00E5FF", weight=500)
    contact_rows(d, 70, 350, parts(c["signature"])[:3], "DM Sans", 20, "#C9D3F0", "#00E5FF")
    qr(d, "https://" + parts(c["signature"])[2], W - 290, H - 290, 200, "#0B1020", bg="#FFFFFF", quiet=2)
    return {"layout": "dark dotted grid, logo tile, name in white, cyan role and a working QR code", "typography": "Outfit, DM Sans", "palette": "midnight, cyan, violet", "decor": "dot grid, glow, QR code"}


@design(9)
def cafe_card(d, c):
    W, H = d.W, d.H
    d.bg("#6B3A1E")
    d.rect(W * 0.5, -d.bleed, W * 0.5 + d.bleed, H + 2 * d.bleed, "#FBF3E8")
    d.circle(W * 0.25, H * 0.42, 130, "#7D4A2C")
    d.art("hot-beverage", W * 0.25, H * 0.4, 190)
    d.text(0, H * 0.72, W * 0.5, c["headline"].upper(), "Montserrat", 26, "#FBF3E8", weight=800, align="center", spacing=400)
    d.text(0, H * 0.79, W * 0.5, c["message"], "Lora", 20, "#E3C8A8", italic=True, align="center")
    x = W * 0.56
    d.text(x, 90, W * 0.4, "Come say hi", "Pacifico", 52, "#6B3A1E")
    contact_rows(d, x, 220, parts(c["signature"]), "Montserrat", 21, "#3A2418", "#B5523B")
    return {"layout": "espresso half with cup and name, cream half with script and contacts", "typography": "Pacifico, Montserrat, Lora italic", "palette": "coffee, cream, terracotta", "decor": "cup illustration, split"}


@design(10)
def clinic_vertical(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.36 + d.bleed, "#0F766E")
    d.wave(-d.bleed, W + d.bleed, H * 0.36, 16, 300, fill="#0F766E", bottom=H * 0.36)
    cx = W / 2
    d.circle(cx, H * 0.18, 70, "#FFFFFF")
    d.rect(cx - 12, H * 0.18 - 40, 24, 80, "#0F766E", rx=4)
    d.rect(cx - 40, H * 0.18 - 12, 80, 24, "#0F766E", rx=4)
    d.text(0, H * 0.27, W, "CLEAR SKIN CLINIC", "Montserrat", 20, "#FFFFFF", weight=700, align="center", spacing=400)
    d.text(0, H * 0.44, W, c["headline"], "Playfair Display", 56, "#123B38", weight=600, align="center")
    d.text(60, H * 0.52, W - 120, parts(c["message"])[0], "Montserrat", 22, "#0F766E", weight=600, align="center")
    d.line(W * 0.3, H * 0.6, W * 0.7, H * 0.6, "#BFD9D6", 1.5)
    contact_rows(d, 90, H * 0.65, parts(c["signature"]), "Montserrat", 22, "#2A3A38", "#0F766E", kinds=["phone", "web", "pin"])
    return {"layout": "vertical card: teal header with cross mark, centred name, contacts below", "typography": "Playfair Display, Montserrat", "palette": "teal, white, mint grey", "decor": "wave edge, medical cross"}


# ------------------------------------------------------------------ letterheads
def lh_footer(d, sig, color, rule):
    page_footer(d, "   ·   ".join(parts(sig)), color, size=10.5, rule=rule)


@design(11)
def lh_navy(d, c):
    W, H = d.W, d.H
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, 130 + d.bleed, "#14213D")
    d.rect(-d.bleed, 130, W + 2 * d.bleed, 6, "#C9A45A")
    d.rect(60, 44, 42, 42, "", stroke="#C9A45A", sw=3, angle=45, origin_center=True)
    d.text(120, 44, 400, c["headline"].upper(), "Montserrat", 22, "#FFFFFF", weight=800, spacing=300)
    d.text(120, 74, 400, "Investment & development", "Lora", 12, "#C9D3E6", italic=True)
    letter_body(d, 80, 200, W - 160, c["message"], "#2A2F3A")
    d.rect(-d.bleed, H - 90, W + 2 * d.bleed, 90 + d.bleed, "#F1F3F7")
    lh_footer(d, c["signature"], "#14213D", None)
    return {"layout": "navy header band with gold rule, letter body, grey footer band with contacts", "typography": "Montserrat caps, Lora", "palette": "navy, gold, cool grey", "decor": "header band, diamond mark"}


@design(12)
def lh_minimal(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.text(80, 70, 400, c["headline"], "Playfair Display", 30, "#2A2420", weight=500)
    d.text(80, 112, 400, "ARCHITECTURE & INTERIORS", "Montserrat", 9.5, "#8A6A4A", weight=700, spacing=400)
    d.text(W - 330, 74, 250, "\n".join(parts(c["signature"])), "Montserrat", 10, "#6A6058", weight=500, align="right", lh=1.6)
    d.line(80, 150, W - 80, 150, "#C9B79C", 1)
    letter_body(d, 80, 200, W - 160, c["message"], "#2A2420")
    d.line(80, H - 80, W - 80, H - 80, "#C9B79C", 1)
    monogram(d, W / 2, H - 46, 18, "HS", "#8A6A4A")
    return {"layout": "name and contacts aligned to a single hairline, monogram footer", "typography": "Playfair Display, Montserrat", "palette": "white, walnut, sand line", "decor": "hairlines, small monogram"}


@design(13)
def lh_creative(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.circle(W - 40, 30, 150, "#FF5A36")
    d.circle(W - 170, 40, 70, "#FFC93C")
    d.rect(W - 90, 150, 60, 60, "#1A1A2E", rx=12, angle=15)
    d.text(70, 70, 400, "BRIGHT\nLINE", "Anton", 46, "#1A1A2E", lh=0.92)
    letter_body(d, 70, 220, W - 200, c["message"], "#2A2A3E", fam="DM Sans")
    d.circle(30, H - 20, 110, "#FFC93C")
    d.rect(-d.bleed, H - 14, W + 2 * d.bleed, 14 + d.bleed, "#FF5A36")
    d.text(160, H - 64, W - 230, "   ·   ".join(parts(c["signature"])), "DM Sans", 11, "#1A1A2E", weight=600, align="right")
    return {"layout": "playful corner shapes, stacked wordmark, letter body and bright footer strip", "typography": "Anton, DM Sans", "palette": "vermilion, sunflower, ink", "decor": "circles and tilted square"}


@design(14)
def lh_law(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    monogram(d, W / 2, 70, 30, "R", "#14213D", family="Cormorant Garamond")
    d.text(0, 112, W, c["headline"].upper(), "Cormorant Garamond", 26, "#14213D", weight=600, align="center", spacing=500)
    d.text(0, 146, W, "ADVOCATES & LEGAL CONSULTANTS", "Montserrat", 8.5, "#7A8494", weight=600, align="center", spacing=400)
    divider(d, W / 2, 178, 300, "#B68A3A", 1)
    letter_body(d, 90, 230, W - 180, c["message"], "#222222", fam="Cormorant Garamond", size=14)
    page_footer(d, "   ·   ".join(parts(c["signature"])), "#14213D", size=10, rule="#B68A3A")
    return {"layout": "centred crest and firm name with gem divider, classic serif body", "typography": "Cormorant Garamond, Montserrat", "palette": "white, navy, gold", "decor": "monogram crest, divider"}


@design(15)
def lh_clinic(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, 18 + d.bleed, H + 2 * d.bleed, "#0F766E")
    cx, cy = 90, 80
    d.circle(cx, cy, 30, "#0F766E")
    d.rect(cx - 5, cy - 17, 10, 34, "#FFFFFF", rx=2)
    d.rect(cx - 17, cy - 5, 34, 10, "#FFFFFF", rx=2)
    d.text(135, 62, 400, c["headline"], "Playfair Display", 26, "#123B38", weight=600)
    d.text(135, 96, 400, "DERMATOLOGY & AESTHETICS", "Montserrat", 9, "#0F766E", weight=700, spacing=300)
    s = parts(c["signature"])
    contact_rows(d, W - 250, 52, s, "Montserrat", 10, "#2A3A38", "#0F766E", gap=2.1, kinds=["pin", "phone", "web"])
    d.line(60, 150, W - 60, 150, "#BFD9D6", 1.5)
    letter_body(d, 80, 200, W - 160, c["message"], "#2A3A38", fam="DM Sans")
    d.wave(-d.bleed, W + d.bleed, H - 50, 8, 200, fill="#E6F2F0", bottom=H + d.bleed)
    return {"layout": "teal edge stripe, cross logo with stacked contacts, soft wave footer", "typography": "Playfair Display, Montserrat, DM Sans", "palette": "teal, white, mint", "decor": "medical cross, wave"}


@design(16)
def lh_gold(d, c):
    W, H = d.W, d.H
    d.bg("#FFFDF8")
    d.frame_border(24, "#B68A3A", 1, double=6)
    d.polygon([(W / 2, 54), (W / 2 + 22, 76), (W / 2, 98), (W / 2 - 22, 76)], "", stroke="#B68A3A", sw=1.5)
    t = d.text(0, 110, W, "NOOR ESTATES", "Cormorant Garamond", 30, "#B68A3A", weight=600, align="center", spacing=600)
    text_metal(d, t)
    d.text(0, 152, W, "LUXURY PROPERTY", "Montserrat", 8.5, "#8A7A5A", weight=600, align="center", spacing=500)
    letter_body(d, 90, 230, W - 180, c["message"], "#2A2620", fam="Cormorant Garamond", size=14)
    page_footer(d, "   ·   ".join(parts(c["signature"])), "#8A6A2E", y=H - 70, size=10)
    return {"layout": "double gold frame, diamond mark and foil wordmark, centred footer", "typography": "Cormorant Garamond gold, Montserrat", "palette": "ivory, gold", "decor": "double frame, diamond"}


# ------------------------------------------------------------------ documents
def table(d, x, y, cols, rows, widths, head_bg, head_fg, ink, line, fam="DM Sans", size=11, pad=12, zebra=None, align=None):
    W = sum(widths)
    rh = size * 2.6
    d.rect(x, y, W, rh, head_bg, rx=4)
    cx = x
    align = align or ["left"] + ["right"] * (len(cols) - 1)
    for k, col in enumerate(cols):
        d.text(cx + pad, y + rh / 2 - size * 0.62, widths[k] - 2 * pad, col.upper(), fam, size * 0.85, head_fg, weight=700, spacing=120, align=align[k])
        cx += widths[k]
    yy = y + rh
    for r, row in enumerate(rows):
        if zebra and r % 2:
            d.rect(x, yy, W, rh, zebra)
        cx = x
        for k, val in enumerate(row):
            d.text(cx + pad, yy + rh / 2 - size * 0.62, widths[k] - 2 * pad, val, fam, size, ink, weight=500, align=align[k])
            cx += widths[k]
        yy += rh
        d.line(x, yy, x + W, yy, line, 1)
    return yy


@design(17)
def invoice(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, 170 + d.bleed, "#1A1A2E")
    d.text(60, 50, 300, "BRIGHT\nLINE", "Anton", 34, "#FFFFFF", lh=0.92)
    d.text(W - 360, 46, 300, c["headline"].upper(), "Anton", 54, "#FF5A36", align="right")
    d.text(W - 360, 112, 300, "No. INV-2027-014", "DM Sans", 12, "#C9CCE0", weight=600, align="right")
    d.text(60, 210, 300, "BILLED TO", "DM Sans", 10, "#FF5A36", weight=800, spacing=200)
    d.text(60, 232, 320, "Meridian Holdings\nOffice 1204, Bay Square\nBusiness Bay, Dubai", "DM Sans", 12, "#2A2A3E", lh=1.5)
    for k, (a, b_) in enumerate([("Issue date", "4 March 2027"), ("Due date", "18 March 2027"), ("Amount due", "AED 18,742.50")]):
        d.text(W - 360, 210 + k * 30, 150, a, "DM Sans", 11.5, "#6A6A80", weight=500)
        d.text(W - 210, 210 + k * 30, 150, b_, "DM Sans", 11.5, "#1A1A2E", weight=700, align="right")
    rows = [("Brand strategy workshop", "1", "3,500.00", "3,500.00"), ("Logo and identity system", "1", "7,800.00", "7,800.00"),
            ("Social media templates (set of 20)", "1", "2,950.00", "2,950.00"), ("Website design — 5 pages", "5", "650.00", "3,250.00")]
    y = table(d, 60, 350, ["Description", "Qty", "Rate (AED)", "Amount (AED)"], rows, [334, 70, 120, 150], "#1A1A2E", "#FFFFFF", "#2A2A3E", "#E3E5EE", zebra="#F6F7FB")
    for k, (a, b_) in enumerate([("Subtotal", "17,500.00"), ("VAT 5%", "875.00"), ("Discount", "−367.50")]):
        d.text(W - 330, y + 24 + k * 28, 140, a, "DM Sans", 11.5, "#6A6A80", weight=500)
        d.text(W - 210, y + 24 + k * 28, 136, b_, "DM Sans", 11.5, "#1A1A2E", weight=600, align="right")
    d.rect(W - 340, y + 116, 280, 48, "#FF5A36", rx=6)
    d.text(W - 326, y + 130, 120, "TOTAL", "DM Sans", 13, "#FFFFFF", weight=800, spacing=200)
    d.text(W - 230, y + 128, 156, "AED 18,742.50", "DM Sans", 15, "#FFFFFF", weight=800, align="right")
    d.text(60, y + 30, 330, "PAYMENT DETAILS", "DM Sans", 10, "#FF5A36", weight=800, spacing=200)
    d.text(60, y + 52, 330, "Emirates NBD · Brightline Agency FZ-LLC\nIBAN AE07 0331 2345 6789 0123 456\nPlease include the invoice number as reference.", "DM Sans", 11, "#2A2A3E", lh=1.55)
    d.text(60, H - 130, W - 120, "Thank you for your business!", "Playfair Display", 22, "#1A1A2E", italic=True)
    page_footer(d, "   ·   ".join(parts(c["signature"])), "#6A6A80", size=10, rule="#E3E5EE")
    return {"layout": "dark header with logo and INVOICE, bill-to and dates, zebra line-item table, totals bar", "typography": "Anton, DM Sans, Playfair Display italic", "palette": "ink navy, vermilion, cool grey", "decor": "header band, table, total bar"}


@design(18)
def quotation(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F3")
    d.text(70, 70, 400, c["message"], "Playfair Display", 28, "#2A2420", weight=500)
    d.text(70, 108, 400, "ARCHITECTURE & INTERIORS", "Montserrat", 9, "#8A6A4A", weight=700, spacing=400)
    d.text(W - 370, 64, 300, c["headline"], "Playfair Display", 46, "#8A6A4A", italic=True, align="right")
    d.text(W - 370, 124, 300, "Q-0318  ·  4 March 2027", "Montserrat", 10.5, "#6A6058", weight=600, align="right")
    d.line(70, 160, W - 70, 160, "#C9B79C", 1)
    d.text(70, 190, 300, "PREPARED FOR", "Montserrat", 9.5, "#8A6A4A", weight=700, spacing=300)
    d.text(70, 212, 340, "Dana Khalil\nVilla 14, Arabian Ranches\nDubai", "Lora", 12.5, "#2A2420", lh=1.5)
    d.text(W - 370, 190, 300, "PROJECT", "Montserrat", 9.5, "#8A6A4A", weight=700, spacing=300, align="right")
    d.text(W - 370, 212, 300, "Living and dining\ninterior refresh", "Lora", 12.5, "#2A2420", lh=1.5, align="right")
    rows = [("Concept design and mood boards", "4,500"), ("3D visualisation — 4 views", "3,800"), ("Furniture and lighting plan", "2,600"),
            ("Procurement and site visits", "3,200"), ("Styling day", "1,400")]
    y = table(d, 70, 320, ["Service", "AED"], rows, [480, 174], "#2A2420", "#F4EFE6", "#2A2420", "#E2D8C8", fam="Montserrat", size=11)
    d.text(W - 370, y + 24, 140, "Total (excl. VAT)", "Montserrat", 11.5, "#6A6058", weight=600)
    d.text(W - 230, y + 22, 160, "AED 15,500", "Playfair Display", 20, "#2A2420", weight=600, align="right")
    d.rect(70, y + 90, W - 140, 120, "#F1E9DC", rx=8)
    d.text(94, y + 108, W - 188, "NOTES", "Montserrat", 9.5, "#8A6A4A", weight=700, spacing=300)
    d.text(94, y + 130, W - 188, "50% deposit to begin, balance on completion. Timeline approximately six weeks from approval. " + c["signature"] + ".", "Lora", 12, "#2A2420", lh=1.55)
    d.text(70, H - 150, 260, "Accepted by", "Montserrat", 10, "#6A6058", weight=600)
    d.line(70, H - 110, 300, H - 110, "#2A2420", 1)
    d.text(W - 300, H - 150, 230, "Date", "Montserrat", 10, "#6A6058", weight=600)
    d.line(W - 300, H - 110, W - 70, H - 110, "#2A2420", 1)
    return {"layout": "studio header with italic QUOTATION, client and project blocks, service table, notes and signature lines", "typography": "Playfair Display, Lora, Montserrat", "palette": "warm paper, walnut, charcoal", "decor": "hairlines, notes panel"}


@design(19)
def proposal_cover(d, c):
    W, H = d.W, d.H
    d.bg("#1A1A2E")
    d.photo(1289, -d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.58, focus=(0.5, 0.4))
    overlay(d, 0.0, 0.5, color="#1A1A2E", y0=0, y1=H * 0.58)
    d.polygon([(-d.bleed, H * 0.52), (W + d.bleed, H * 0.6), (W + d.bleed, H + d.bleed), (-d.bleed, H + d.bleed)], "#1A1A2E")
    d.rect(70, H * 0.66, 80, 8, "#FF5A36")
    t = d.text(70, H * 0.68, W - 140, c["headline"], "Outfit", 64, "#FFFFFF", weight=800, lh=1.0)
    d.text(70, H * 0.68 + t["_h"] + 20, W - 140, c["message"], "DM Sans", 20, "#C9CCE0", weight=500)
    p = parts(c["signature"])
    d.text(70, H - 110, W - 140, p[0].upper(), "DM Sans", 11, "#FF5A36", weight=800, spacing=300)
    d.text(70, H - 86, W - 140, p[1], "DM Sans", 13, "#FFFFFF", weight=600)
    d.text(W - 300, 50, 240, "BRIGHT LINE", "Anton", 24, "#FFFFFF", align="right")
    return {"layout": "photo top with angled cut, big two-line title, prepared-by block", "typography": "Outfit ExtraBold, DM Sans, Anton", "palette": "ink navy, vermilion, white", "decor": "angled photo cut, accent bar"}


@design(20)
def profile_cover(d, c):
    W, H = d.W, d.H
    d.bg("#F1F3F7")
    d.photo(1413, W * 0.32, -d.bleed, W * 0.68 + d.bleed, H * 0.72, focus=(0.5, 0.5))
    d.rect(-d.bleed, H * 0.18, W * 0.5, H * 0.5, "#14213D")
    t = d.text(60, H * 0.24, W * 0.4, "Company\nProfile", "Playfair Display", 58, "#FFFFFF", weight=600, lh=1.05)
    d.rect(60, H * 0.24 + t["_h"] + 20, 60, 4, "#C9A45A")
    d.text(60, H * 0.24 + t["_h"] + 44, W * 0.38, c["message"], "Lora", 16, "#C9D3E6", italic=True, lh=1.45)
    d.text(60, H * 0.82, W - 120, "MERIDIAN HOLDINGS", "Montserrat", 22, "#14213D", weight=800, spacing=400)
    d.text(60, H * 0.86, W - 120, "2027", "Montserrat", 14, "#C9A45A", weight=700, spacing=400)
    return {"layout": "architecture photo top-right, navy title block overlapping, wordmark below", "typography": "Playfair Display, Lora italic, Montserrat caps", "palette": "navy, gold, cool grey", "decor": "overlapping block, gold rule"}


@design(21)
def price_list(d, c):
    W, H = d.W, d.H
    d.bg("#F8E6E1")
    d.frame_border(26, "#D8AFA4", 1)
    t = d.text(0, 70, W, c["message"], "Great Vibes", 54, "#A65A4C", align="center")
    d.text(0, 150, W, c["headline"].upper(), "Montserrat", 15, "#5A3A35", weight=700, align="center", spacing=600)
    divider(d, W / 2, 186, 200, "#C98E7E", 1)
    sections = [("Hair", [("Wash & blow-dry", "120"), ("Cut & style", "180"), ("Colour — full head", "350"), ("Keratin treatment", "650")]),
                ("Nails", [("Classic manicure", "90"), ("Gel manicure", "140"), ("Spa pedicure", "160")]),
                ("Skin", [("Signature facial", "320"), ("Hydra glow facial", "420"), ("Brow shape & tint", "95")])]
    y = 230
    for name, items in sections:
        d.text(90, y, W - 180, name, "Playfair Display", 26, "#A65A4C", italic=True)
        y += 48
        for it, pr in items:
            d.text(90, y, W - 300, it, "Lora", 14, "#3A2A28")
            d.text(W - 240, y, 150, f"AED {pr}", "Montserrat", 13, "#3A2A28", weight=600, align="right")
            d.line(90 + text_width(it, "Lora", 14) + 10, y + 14, W - 250 - text_width(f"AED {pr}", "Montserrat", 13, 600) + 150 - 160, y + 14, "#D8AFA4", 1, dash=[2, 4])
            y += 34
        y += 24
    page_footer(d, c["signature"].replace("·", "   ·   "), "#5A3A35", y=H - 80, size=11)
    return {"layout": "script salon name, three priced sections with dotted leaders", "typography": "Great Vibes, Playfair Display italic, Lora, Montserrat", "palette": "blush, terracotta rose, cocoa", "decor": "inset frame, divider, dot leaders"}


@design(22)
def agenda(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, 200 + d.bleed, "#F1F3F7")
    d.text(70, 60, W - 140, c["headline"], "Outfit", 44, "#14213D", weight=800)
    p = parts(c["message"])
    d.text(70, 120, W - 140, p[0], "DM Sans", 16, "#4A5568", weight=600)
    for k, (kd, v) in enumerate(zip(["cal", "clock", "pin"], p[1:])):
        x = 70 + k * 230
        d.circle(x + 10, 165, 10, "#C9A45A")
        d.text(x + 28, 156, 200, v, "DM Sans", 12.5, "#14213D", weight=600)
    items = [("10:00", "Welcome and goals for the quarter", "Dana"), ("10:15", "Q1 results and key numbers", "Omar"), ("10:45", "Product roadmap update", "Ravi"),
             ("11:15", "Break", ""), ("11:30", "Marketing plan and budget", "Mira"), ("12:00", "Open questions and next steps", "All")]
    y = 250
    for k, (tm, it, who) in enumerate(items):
        d.text(70, y, 90, tm, "DM Sans", 15, "#C9A45A", weight=800)
        d.text(170, y - 2, W - 360, it, "Outfit", 18, "#14213D", weight=600)
        if who:
            pill(d, W - 130, y + 11, who, "DM Sans", 11, "#14213D", "#E7EBF3", weight=700, spacing=60, upper=False)
        y += 58
        d.line(70, y - 18, W - 70, y - 18, "#E7EBF3", 1)
    d.text(70, y + 20, W - 140, "NOTES", "DM Sans", 11, "#C9A45A", weight=800, spacing=300)
    for k in range(6):
        d.line(70, y + 80 + k * 40, W - 70, y + 80 + k * 40, "#E7EBF3", 1)
    page_footer(d, c["signature"], "#6A7385", size=10)
    return {"layout": "light header with title and meeting facts, timed agenda rows with owner pills, ruled notes", "typography": "Outfit, DM Sans", "palette": "navy, gold, cool grey", "decor": "owner pills, rules"}


# ------------------------------------------------------------------ digital
@design(23)
def email_sig(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, 16 + d.bleed, H + 2 * d.bleed, "#FF5A36")
    d.circle(170, H / 2, 110, "#FFE3DA")
    d.photo(1289, 70, H / 2 - 100, 200, 200, frame="circle", focus=(0.45, 0.35))
    d.text(320, 90, 560, c["headline"], "Outfit", 52, "#1A1A2E", weight=800)
    d.text(320, 160, 560, c["message"], "DM Sans", 24, "#FF5A36", weight=600)
    contact_rows(d, 320, 230, parts(c["signature"]), "DM Sans", 22, "#2A2A3E", "#1A1A2E", kinds=["phone", "web"])
    d.line(920, 70, 920, H - 70, "#E7E7EE", 2)
    d.text(950, 140, 220, "BRIGHT\nLINE", "Anton", 52, "#1A1A2E", lh=0.92)
    return {"layout": "round portrait, name, role and contacts, divider and wordmark", "typography": "Outfit, DM Sans, Anton", "palette": "white, vermilion, ink", "decor": "accent edge, circle photo"}


@design(24)
def linkedin(d, c):
    W, H = d.W, d.H
    d.bg(lin(0, 0, W, 0, [(0, "#1B1446"), (1, "#3B1F6E")]))
    d.blob(W * 0.86, H * 0.2, 260, "rgba(228,90,168,0.35)", seed=3)
    d.blob(W * 0.98, H * 0.9, 200, "rgba(255,179,107,0.35)", seed=5)
    d.dots(W * 0.8, 40, W * 0.95, H - 40, 22, 2, "rgba(255,255,255,0.25)", offset_rows=False)
    x = W * 0.3   # leave space on the left for the profile photo
    t = d.text(x, 90, W * 0.62, c["headline"], "Outfit", 50, "#FFFFFF", weight=800)
    d.text(x, 90 + t["_h"] + 14, W * 0.6, c["message"], "DM Sans", 24, "#E9D8FF", weight=500)
    pill(d, x + 140, 90 + t["_h"] + 100, c["signature"], "DM Sans", 20, "#1B1446", "#FFFFFF", weight=700, spacing=40, upper=False)
    return {"layout": "copy set right of the profile-photo zone over a deep violet gradient", "typography": "Outfit ExtraBold, DM Sans", "palette": "deep violet, pink, peach", "decor": "blobs, dot grid"}


@design(25)
def title_slide(d, c):
    W, H = d.W, d.H
    d.bg("#0F172A")
    d.photo(1413, W * 0.55, -d.bleed, W * 0.45 + d.bleed, H + 2 * d.bleed, focus=(0.5, 0.5))
    d.polygon([(W * 0.5, -d.bleed), (W * 0.62, -d.bleed), (W * 0.52, H + d.bleed), (W * 0.4, H + d.bleed)], "#0F172A")
    d.polygon([(W * 0.6, -d.bleed), (W * 0.63, -d.bleed), (W * 0.53, H + d.bleed), (W * 0.5, H + d.bleed)], "#C9A45A")
    d.rect(-d.bleed, -d.bleed, W * 0.5, H + 2 * d.bleed, "#0F172A")
    d.text(120, 220, 700, "MERIDIAN HOLDINGS", "Montserrat", 22, "#C9A45A", weight=800, spacing=500)
    t = d.text(120, 290, 760, c["headline"], "Playfair Display", 104, "#FFFFFF", weight=600, lh=1.02)
    d.text(120, 300 + t["_h"] + 20, 700, c["message"], "Lora", 30, "#C9D3E6", italic=True)
    d.line(120, H - 190, 200, H - 190, "#C9A45A", 3)
    d.text(120, H - 160, 760, parts(c["signature"])[1], "Montserrat", 22, "#FFFFFF", weight=600)
    return {"layout": "navy title side with gold slash, architecture photo right", "typography": "Montserrat caps, Playfair Display, Lora italic", "palette": "navy, gold, white", "decor": "angled gold stripe"}


# ------------------------------------------------------------------ stationery
@design(26)
def comp_slip(d, c):
    W, H = d.W, d.H
    d.bg("#FBF8F3")
    d.text(60, 50, 400, c["message"], "Playfair Display", 26, "#2A2420", weight=500)
    d.text(60, 88, 400, "ARCHITECTURE & INTERIORS", "Montserrat", 8.5, "#8A6A4A", weight=700, spacing=400)
    d.text(0, 150, W, c["headline"], "Great Vibes", 64, "#8A6A4A", align="center")
    d.line(60, H - 66, W - 60, H - 66, "#C9B79C", 1)
    d.text(60, H - 50, W - 120, "   ·   ".join(parts(c["signature"])), "Montserrat", 10, "#6A6058", weight=500, align="center")
    monogram(d, W - 90, 72, 26, "HS", "#8A6A4A")
    return {"layout": "studio name top-left, script 'With compliments' centred, contact footer", "typography": "Playfair Display, Great Vibes, Montserrat", "palette": "warm paper, walnut", "decor": "hairline, monogram"}


@design(27)
def envelope(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, 10 + d.bleed, "#14213D")
    d.rect(40, 40, 30, 30, "", stroke="#C9A45A", sw=2.5, angle=45, origin_center=True)
    d.text(85, 36, 300, c["headline"].upper(), "Montserrat", 15, "#14213D", weight=800, spacing=300)
    d.text(85, 60, 360, c["signature"], "Montserrat", 9.5, "#6A7385", weight=500)
    p = parts(c["message"])
    d.text(W * 0.48, H * 0.46, W * 0.46, "\n".join(p), "Lora", 15, "#14213D", lh=1.55)
    d.rect(W - 110, 30, 76, 90, "", stroke="#C9CED9", sw=1.5, dash=[4, 4])
    d.text(W - 110, 66, 76, "STAMP", "Montserrat", 9, "#AEB4C2", weight=700, align="center", spacing=200)
    d.rect(-d.bleed, H - 10, W + 2 * d.bleed, 10 + d.bleed, "#C9A45A")
    return {"layout": "return address top-left, stamp box, recipient block right of centre", "typography": "Montserrat, Lora", "palette": "white, navy, gold", "decor": "edge bands, diamond mark"}


@design(28)
def id_badge(d, c):
    W, H = d.W, d.H
    d.bg("#FFFFFF")
    d.rect(-d.bleed, -d.bleed, W + 2 * d.bleed, H * 0.36 + d.bleed, lin(0, 0, W, H * 0.36, [(0, "#0B1020"), (1, "#2A1F6E")]))
    d.rect(W / 2 - 70, 40, 140, 26, "#FFFFFF", rx=13, opacity=0.9)
    d.rect(80, 120, 50, 50, lin(0, 0, 50, 50, [(0, "#00E5FF"), (1, "#7B5CFF")]), rx=12)
    d.text(146, 126, 400, "nimbus labs", "Outfit", 34, "#FFFFFF", weight=700)
    d.circle(W / 2, H * 0.4, 150, "#FFFFFF")
    d.photo(1148, W / 2 - 136, H * 0.4 - 136, 272, 272, frame="circle", focus=(0.5, 0.3))
    d.text(0, H * 0.58, W, c["headline"], "Outfit", 58, "#0B1020", weight=800, align="center")
    d.text(0, H * 0.58 + 76, W, c["message"].upper(), "DM Sans", 22, "#7B5CFF", weight=700, align="center", spacing=300)
    p = parts(c["signature"])
    qr(d, "https://nimbuslabs.io", W / 2 - 90, H * 0.74, 180, "#0B1020")
    d.text(0, H * 0.93, W, p[1], "DM Sans", 20, "#6A7385", weight=600, align="center", spacing=200)
    return {"layout": "gradient header with logo, round photo, name, role and access QR code", "typography": "Outfit, DM Sans", "palette": "midnight, violet, cyan, white", "decor": "lanyard slot, circle photo, QR code"}


@design(29)
def voucher(d, c):
    W, H = d.W, d.H
    d.bg("#F8E6E1")
    d.rect(W * 0.7, -d.bleed, W * 0.3 + d.bleed, H + 2 * d.bleed, "#A65A4C")
    for k in range(14):
        d.circle(W * 0.7, 14 + k * 27, 5, "#F8E6E1")
    d.text(60, 50, W * 0.6, "Bloom Beauty Lounge", "Great Vibes", 40, "#A65A4C")
    d.text(60, 130, W * 0.6, c["headline"].upper(), "Cormorant Garamond", 54, "#3A2A28", weight=600, spacing=200)
    d.text(60, 210, W * 0.6, "To ____________________   From ____________________", "Montserrat", 11, "#5A3A35", weight=500)
    d.text(60, H - 70, W * 0.6, parts(c["signature"])[1].capitalize() + " · bloombeauty.ae", "Montserrat", 10, "#7A5A55", weight=500)
    t = d.text(W * 0.7, H * 0.3, W * 0.3, c["message"], "Cormorant Garamond", 60, "#FFFFFF", weight=600, align="center")
    d.text(W * 0.7, H * 0.3 + t["_h"] + 10, W * 0.3, "No. 000127", "Montserrat", 10, "#F8E6E1", weight=600, align="center", spacing=200)
    return {"layout": "voucher with perforated stub carrying the amount", "typography": "Great Vibes, Cormorant Garamond, Montserrat", "palette": "blush, terracotta rose", "decor": "perforation dots, stub"}


@design(30)
def thanks_card(d, c):
    W, H = d.W, d.H
    d.bg("#FBF3E8")
    d.texture("paper", 0.4)
    d.art("hot-beverage", W / 2, H * 0.22, 120)
    for k in range(3):
        x = W / 2 - 20 + k * 20
        d.path([["M", x, H * 0.13], ["C", x - 8, H * 0.11, x + 8, H * 0.09, x, H * 0.07]], fill="", stroke="#B5523B", sw=2)
    d.text(0, H * 0.32, W, c["headline"], "Pacifico", 64, "#6B3A1E", align="center")
    d.text(50, H * 0.48, W - 100, c["message"], "Lora", 16, "#3A2418", italic=True, align="center", lh=1.6)
    divider(d, W / 2, H * 0.72, 120, "#B5523B", 1)
    d.text(0, H * 0.77, W, c["signature"].upper(), "Montserrat", 13, "#6B3A1E", weight=800, align="center", spacing=400)
    d.text(0, H * 0.82, W, "@thedailygrind", "Montserrat", 11, "#8C6A50", weight=500, align="center")
    return {"layout": "steaming cup, script thank-you, short note and shop name", "typography": "Pacifico, Lora italic, Montserrat caps", "palette": "cream, coffee, terracotta", "decor": "paper texture, steam curls, divider"}
