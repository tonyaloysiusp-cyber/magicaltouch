"""
Photo albums, rebuilt (Nov 2026): every album is a multiple of 4 pages.

  MT_FONT_DIR=... python3 build_albums.py [--limit N]

Wedding albums are 40 or 48 pages, other albums 12, 16, 20 or 24 pages.
Each album is built from one of eight style families (Classic White,
Editorial, Scrapbook, Minimal, Dark Luxe, Romance, Garden, Bold Colour),
which set the palette, fonts, frames, spacing and page rhythm, so two albums
of the same theme look clearly different.

Writes data/collections/albums-2026-11.json.
"""

import argparse
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

from kit import Doc  # noqa: E402
import studio  # noqa: E402
import mass  # noqa: E402,F401
from build_mass import board, GAP  # noqa: E402
from wave_spec import PH  # noqa: E402
from studio_spec import PAL, SQ, LAND, A4  # noqa: E402

ALB_LAND = (1200, 900)

# ------------------------------------------------------------------ styles
# grid opts per family: (layouts for collage pages, gap, rounded, frame, band)
STYLES = {
    "Classic White": dict(pals=["ivory", "sand", "navy"], pairs=["classic", "elegant"], lay=["4", "2v", "3a", "1", "3b", "6"], gap=0.03, rounded=0.0, frame="rect",
                          cover="hero_center", chapter="quote", special="photo_page", pol=0.0),
    "Editorial": dict(pals=["mono", "noir", "ivory"], pairs=["editorial", "grotesk"], lay=["1", "2l", "3h", "3d", "2h", "4a"], gap=0.01, rounded=0.0, frame="rect",
                      cover="split", chapter="hero_bottom", special="photo_page", pol=0.0),
    "Scrapbook": dict(pals=["peach", "sunny", "blush", "mint"], pairs=["hand", "friendly"], lay=["4", "3a", "6", "5"], gap=0.03, rounded=0.03, frame="rounded",
                      cover="polaroid", chapter="polaroid", special="polaroid", pol=0.5),
    "Minimal": dict(pals=["ivory", "mono", "sage"], pairs=["modern", "grotesk"], lay=["1", "2v", "3v", "2h", "3h"], gap=0.06, rounded=0.0, frame="rect",
                    cover="framed", chapter="quote", special="grid1", pol=0.0),
    "Dark Luxe": dict(pals=["noir", "midnight", "emerald", "plum"], pairs=["luxe", "elegant"], lay=["7", "5m", "4", "3a", "9", "2v"], gap=0.008, rounded=0.0, frame="rect",
                      cover="hero_center", chapter="quote", special="photo_page", pol=0.0),
    "Romance": dict(pals=["blush", "rose", "lilac", "peach"], pairs=["script", "romance"], lay=["2v", "3h", "4", "2l"], gap=0.03, rounded=0.0, frame="arch",
                    cover="shape", chapter="framed", special="polaroid", pol=0.25),
    "Garden": dict(pals=["sage", "olive", "forest", "mint"], pairs=["elegant", "soft"], lay=["3a", "4", "6p", "5", "2v"], gap=0.025, rounded=0.04, frame="rounded",
                   cover="framed", chapter="shape", special="photo_page", pol=0.2),
    "Bold Colour": dict(pals=["coral", "cobalt", "saffron", "teal", "berry"], pairs=["bold", "display", "poster"], lay=["4", "9", "5", "3b", "7", "6"], gap=0.0, rounded=0.0, frame="rect",
                        cover="split", chapter="hero_bottom", special="grid1", pol=0.2),
}
STYLE_KEYS = list(STYLES)

# ------------------------------------------------------------------ themes
# (title, photo pools, subtitle, chapters, wedding?)
WED_CH = ["Getting Ready", "The Ceremony", "Just Us", "Family & Friends", "The Details", "The Reception", "First Dance", "Thank You"]
THEMES = [
    ("Our Wedding Album", ["wedding", "love", "WED"], "Two hearts, one story", WED_CH, True),
    ("Wedding Day Memories", ["wedding", "WED", "love"], "The day we said yes", WED_CH, True),
    ("The Big Day", ["love", "wedding", "WED"], "Forever starts here", WED_CH, True),
    ("Indian Wedding Album", ["wedding", "lights", "WED"], "Mehndi, haldi, pheras and sangeet", ["Mehndi", "Haldi", "Sangeet", "Baraat", "Pheras", "Vidaai", "Reception", "Thank You"], True),
    ("Engagement & Wedding", ["love", "wedding", "WED", "jewelry"], "From ring to forever", ["The Proposal", "Engagement", "Getting Ready", "The Ceremony", "Portraits", "Reception", "Honeymoon", "Thank You"], True),
    ("Destination Wedding", ["wedding", "BEACH", "WED"], "Say yes abroad", ["Arrival", "Welcome Dinner", "Getting Ready", "The Ceremony", "Golden Hour", "Reception", "Farewell", "Thank You"], True),
    ("Baby's First Year", ["baby", "family"], "Twelve months of firsts", ["Hello World", "First Smile", "First Bath", "Little Hands", "First Steps", "Birthday"], False),
    ("Family Album 2026", ["family", "home", "nature"], "Our year together", ["Winter", "Spring", "Summer", "Autumn", "Holidays", "Together"], False),
    ("Travel Diary", ["travel", "nature", "food"], "Places we'll never forget", ["Departure", "The City", "The Coast", "Local Food", "Hidden Gems", "Home Again"], False),
    ("Birthday Memories", ["birthday", "family"], "Another trip around the sun", ["The Party", "The Cake", "Friends", "Gifts", "Games", "Wishes"], False),
    ("Graduation Album", ["education", "events", "family"], "Class of 2026", ["First Day", "Classmates", "Big Moments", "Celebration", "What's Next"], False),
    ("Our Love Story", ["love", "BEACH", "nature"], "From hello to forever", ["How We Met", "First Date", "Adventures", "Home", "Forever"], False),
    ("Holiday Memories", ["christmas", "family", "lights"], "Our favourite season", ["Decorating", "Family Dinner", "Gifts", "Snow Days", "New Year"], False),
    ("Anniversary Album", ["love", "WED", "BEACH"], "Years of us", ["Then", "Now", "Travels", "Celebrations", "Always"], False),
    ("School Yearbook", ["education", "events"], "Friends, classes and fun", ["Our Teachers", "Classmates", "Sports Day", "Trips", "Memories"], False),
    ("Pet Photo Book", ["family", "home", "nature"], "Our furry best friend", ["Day One", "Play Time", "Naps", "Walks", "Best Friend"], False),
    ("Food Journey Book", ["food", "cafe"], "Tables we loved", ["Breakfast", "Street Food", "Dinners", "Desserts", "Recipes"], False),
    ("Festival Memories", ["diwali", "lights", "festive", "family"], "Lights, colours and family", ["Preparations", "Rangoli", "Prayers", "Sweets", "Celebration"], False),
    ("Honeymoon Album", ["BEACH", "love", "travel"], "Just the two of us", ["Arrival", "Sunsets", "Adventures", "Dinners", "Forever"], False),
    ("Our First Home", ["home", "family"], "Where our story lives", ["The Keys", "Moving Day", "Making It Ours", "First Dinner", "Home"], False),
]
CAPS = ["best day", "us ♥", "cheers!", "again soon", "first look", "so happy", "our people", "giggles", "sunset", "home", "this one!", "love it"]
QUOTES = [("Every love story is beautiful, but ours is my favourite.", "Our story"), ("Collect moments, not things.", "Memories"),
          ("The best things in life are the people we love, the places we've been and the memories we've made.", "Along the way"),
          ("Some days are worth remembering forever.", "Today"), ("Home is wherever we are together.", "Together"),
          ("Life is short. Take the photos.", "Smile"), ("Here's to the moments that took our breath away.", "Cheers")]


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("'", "").replace("’", "")).strip("-")


XPH = {"WED": ["venue2", "gala", "hotel", "x_pool", "whiteflowers", "blossom", "flowers2", "x_roses3", "champagne", "x_bokeh"],
       "BEACH": ["beach", "beach2", "x_beach3", "ocean", "x_pool", "hotel", "mountains", "city"]}


def pool_for(pools, k):
    PH2 = {**PH, **XPH}
    pools = [p if p in PH2 else p for p in pools]
    seen, out = set(), []
    for i in range(max(len(PH2.get(p, [p])) for p in pools)):
        for p in pools:
            lst = PH2.get(p, [p])
            if i < len(lst) and lst[i] not in seen:
                seen.add(lst[i])
                out.append(lst[i])
    r = k % len(out)
    return out[r:] + out[:r]


def album_pages(title, sub, chapters, pages, st, pool, year="2026"):
    """Return [(arch, content, opts)] for one album of `pages` pages."""
    ph = lambda j: pool[j % len(pool)]  # noqa: E731
    cur = [0]

    def take(n):
        a = [ph(cur[0] + q) for q in range(n)]
        cur[0] += n
        return a

    cover_kind = st["cover"]
    if cover_kind == "hero_center":
        out = [("hero_center", dict(photo=take(1)[0], kicker=sub, title=title, sub=year, brand=""), {"title_size": 130})]
    elif cover_kind == "split":
        out = [("split", dict(photo=take(1)[0], kicker=year, title=title, sub=sub, details=[]), {"ratio": 0.6})]
    elif cover_kind == "polaroid":
        out = [("polaroid", dict(photos=take(3), captions=CAPS[:3], title=title, sub=sub), {})]
    elif cover_kind == "shape":
        out = [("shape", dict(photo=take(1)[0], kicker=year, title=title, sub=sub), {"kind": "arch", "layout": "center"})]
    else:
        out = [("framed", dict(photo=take(1)[0], kicker=year, title=title, sub=sub), {"shape": "arch" if st["frame"] == "arch" else "rounded", "photo_h": 0.55})]

    body = pages - 2
    nch = min(len(chapters), max(2, body // 5))
    span = body / nch
    lays = st["lay"]
    li = 0
    ch_at = {round(i * span): i for i in range(nch)}
    for b in range(body):
        if b in ch_at:
            name = chapters[ch_at[b]]
            ck = st["chapter"]
            if ck == "quote":
                q, _ = QUOTES[(ch_at[b] + len(title)) % len(QUOTES)]
                out.append(("quote", dict(title=q, author=name.upper()), {"title_size": 88}))
            elif ck == "hero_bottom":
                out.append(("hero_bottom", dict(photo=take(1)[0], kicker=f"Chapter {ch_at[b] + 1}", title=name, sub=sub), {"title_size": 120}))
            elif ck == "polaroid":
                out.append(("polaroid", dict(photos=take(2), captions=CAPS[b % 6:b % 6 + 2], title=name, sub=f"Chapter {ch_at[b] + 1}"), {}))
            elif ck == "shape":
                out.append(("shape", dict(photo=take(1)[0], kicker=f"Chapter {ch_at[b] + 1}", title=name, sub=""), {"kind": "circle", "layout": "center"}))
            else:
                out.append(("framed", dict(photo=take(1)[0], kicker=f"Chapter {ch_at[b] + 1}", title=name), {"shape": "arch", "photo_h": 0.55}))
            continue
        pos = b % 6
        if pos == 4 and st["special"] == "photo_page":
            out.append(("photo_page", dict(photos=take(3), caption=f"{chapters[min(nch - 1, int(b / span))]} · {sub.lower()}"), {}))
            continue
        if pos == 4 and st["special"] == "polaroid" or (st["pol"] and pos == 2 and (b // 6) % 2 == 0 and st["pol"] >= 0.25):
            m = 2 + b % 3
            out.append(("polaroid", dict(photos=take(m), captions=[CAPS[(b + q) % len(CAPS)] for q in range(m)], title="", sub=""), {}))
            continue
        if pos == 4 and st["special"] == "grid1":
            out.append(("grid", dict(photos=take(1)), {"layout": "1", "gap": st["gap"], "rounded": st["rounded"], "frame": st["frame"]}))
            continue
        lay = lays[li % len(lays)]
        li += 1
        n = len(studio.LAYOUTS[lay])
        c = dict(photos=take(n))
        if pos == 1:  # a caption band now and then
            c.update(kicker=sub, title=chapters[min(nch - 1, int(b / span))], band_h=0.16)
        frame = st["frame"]
        if frame == "arch" and n > 3:
            frame = "rounded"
        bh = c.pop("band_h", None)
        out.append(("grid", c, {"band_h": bh, "layout": lay, "gap": st["gap"], "rounded": st["rounded"] if frame != "arch" else 0, "frame": frame, "band": "bottom" if b % 2 else "top"}))
    out.append(("back", dict(title="To be continued…", sub=f"{title} · {sub}", brand=year), {}))
    assert len(out) == pages, (len(out), pages)
    return out


def specs():
    out = []
    for ti, (title, pools, sub, chapters, wed) in enumerate(THEMES):
        counts = [40, 48] if wed else [12, 16, 20, 24]
        n_styles = 8
        for si in range(n_styles):
            sk = STYLE_KEYS[(si + ti * 3) % len(STYLE_KEYS)]
            st = STYLES[sk]
            pages = counts[(si + ti) % len(counts)]
            size = [SQ, ALB_LAND, A4][(si + ti) % 3] if not wed else [ALB_LAND, SQ][(si + ti) % 2]
            pal = st["pals"][(si + ti) % len(st["pals"])]
            pair = st["pairs"][(si * 2 + ti) % len(st["pairs"])]
            out.append(dict(title=f"{title} {sk} {pages} Pages", theme=title, style=sk, pages=pages, size=size, pal=pal, pair=pair, pools=pools, sub=sub,
                            chapters=chapters, wed=wed, k=ti * 7 + si * 5))
    return out


def build(limit=None):
    out = []
    for i, s in enumerate(specs()[:limit] if limit else specs(), 1):
        W, H = s["size"]
        p = PAL[s["pal"]]
        st = STYLES[s["style"]]
        pages = album_pages(s["theme"], s["sub"], s["chapters"], s["pages"], st, pool_for(s["pools"], s["k"]))
        objs, photos = [], set()
        for n, (arch, c, opts) in enumerate(pages, 1):
            ab = board(f"alb_{i:04d}", n, W, H)
            d = Doc(W, H, ab, seed=i * 100 + n)
            studio.build(d, arch, c, p, s["pair"], opts)
            dx = (n - 1) * (W + GAP)
            ab["left"] = dx
            objs.append(ab)
            for o in d.objs:
                o.pop("_h", None)
                o.pop("__lines", None)
                o["left"] = o.get("left", 0) + dx
                objs.append(o)
            photos |= set(d.notes.get("photos", []))
        orient = "square" if W == H else ("portrait" if H > W else "landscape")
        kind = "wedding album" if s["wed"] else "photo album"
        tags = ["albums-2026-11", "photo album", "photo book", "multi-page", f"{s['pages']}-pages", slug(s["style"]), slug(s["theme"])] + (["wedding", "wedding album"] if s["wed"] else [])
        out.append({
            "name": s["title"], "category": "Photo Collage", "sub": None, "slug": slug(s["title"]), "width": W, "height": H, "pages": len(pages),
            "color1": p["bg"], "color2": p["accent"], "sort": 900 + i, "premium": False, "featured": False,
            "keywords": f"{s['theme'].lower()}, {s['pages']} page {kind}, {s['style'].lower()} album, photo book template, printable album",
            "tags": tags, "occasion": "Wedding" if s["wed"] else None, "orientation": orient,
            "description": f"{s['pages']}-page {kind} in a {s['style']} style — {s['sub'].lower()}. Chapters: {', '.join(s['chapters'][:5])}. Drop in your photos, edit online, print-ready.",
            "photos": sorted(photos), "canvasJson": {"version": "5.1.0", "objects": objs},
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--limit", type=int)
    ap.add_argument("--outdir", default=os.path.join(ROOT, "public/templates/collection"))
    a = ap.parse_args()
    out = build(a.limit)
    json.dump(out, open(os.path.join(ROOT, "data/collections", "albums-2026-11.json"), "w"), ensure_ascii=False, separators=(",", ":"))
    from collections import Counter
    print(len(out), sum(len(json.dumps(x)) for x in out) // 1024, "KB", Counter(x["pages"] for x in out), len({x["slug"] for x in out}))


if __name__ == "__main__":
    main()
