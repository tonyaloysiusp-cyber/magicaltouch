"""
Build Wave 2 (big occasions, world regions, multi-page books):

  MT_FONT_DIR=... python3 build_wave.py KEY [KEY ...] [--limit N]

Writes public/templates/collection/wave-2026-11-<key>.json. Magazines are
8, 12 or 16 pages (cover, contents, features, photo essays, back cover);
photo albums are 8–12 pages (cover, collage pages, polaroid pages, end).
Pages sit side by side with a 120 px gap, as in the editor.
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
from build_mass import board, pages_for, GAP  # noqa: E402
from wave_spec import CATS2, gen2, PH  # noqa: E402
from studio_spec import PAL  # noqa: E402

LAYOUTS = ["4", "3a", "2v", "6", "3b", "5", "4a", "9", "6p"]
FEATURES = {
    "Lifestyle": [("Slow living", "Our guide to calmer days"), ("The capsule wardrobe", "Ten pieces, endless outfits"), ("Morning rituals", "Five people share theirs"), ("Weekend reset", "Small habits, big change")],
    "Business": [("First 100 customers", "Five founders' playbooks"), ("The funding map", "Who invests in 2027"), ("Hiring well", "Lessons from fast-growing teams"), ("Pricing power", "Charge what you're worth")],
    "Food": [("One-pot dinners", "Ready in under an hour"), ("The perfect coffee", "From bean to cup"), ("Market to table", "Cooking with the season"), ("Sweet endings", "Desserts that wow")],
    "Travel": [("Hidden coastlines", "Beaches off the map"), ("Train journeys", "The prettiest routes"), ("48 hours in the city", "Where to eat, stay and walk"), ("Pack light", "One bag, two weeks")],
    "Homes": [("Small spaces", "Big ideas for city flats"), ("Colour of the year", "How to use it"), ("Light and calm", "A designer's own home"), ("Garden rooms", "Bringing the outside in")],
    "Fitness": [("Run your first 10K", "A 12-week plan"), ("Eat to perform", "Simple meals that work"), ("Strength at home", "No gym needed"), ("Recover better", "Sleep, stretch, repeat")],
    "Weddings": [("The 2027 bride", "Trends we love"), ("Real weddings", "Three couples, three styles"), ("Flowers that last", "A florist's secrets"), ("Destination dreams", "Say yes abroad")],
    "Design": [("Grids that work", "Layout lessons"), ("Type pairing", "Fonts that fit"), ("Colour with care", "Palettes that sell"), ("Design for print", "Bleeds, margins and paper")],
    "Beauty": [("Skin first", "A simple routine"), ("Glow on a budget", "Products that deliver"), ("The new nude", "Make-up that feels like you"), ("Hair care 101", "Healthy from root to tip")],
    "Parenting": [("Screen time", "What really helps"), ("Lunchbox ideas", "Healthy and quick"), ("Big feelings", "Calm ways through tantrums"), ("Family weekends", "Plans everyone enjoys")],
    "Culture": [("City stories", "Life in six cities"), ("Festival guide", "What's on this season"), ("Artists to watch", "New voices, new work"), ("The reading list", "Books we can't put down")],
    "Finance": [("Money in your 30s", "A simple plan"), ("Investing basics", "Start small, start now"), ("Owning a home", "The real numbers"), ("Retire early?", "What it takes")],
    "Luxury travel": [("Private islands", "Escapes worth the journey"), ("Suite life", "Hotels we love"), ("Slow by sea", "Yacht weeks"), ("Michelin abroad", "Where to dine")],
    "Sustainability": [("Live lighter", "Ten easy swaps"), ("The repair revolution", "Fix it, don't bin it"), ("Green homes", "Save energy, save money"), ("Local food", "Know your farmer")],
    "School": [("Sports day winners", "Our champions"), ("Science fair", "Big ideas from young minds"), ("Meet the teachers", "New faces this term"), ("Art week", "Our gallery")],
    "Company newsletter": [("Our year in numbers", "Growth, people and wins"), ("Meet the team", "New joiners this quarter"), ("Customer stories", "What our clients say"), ("What's next", "Plans for the year ahead")],
}
BODY = [
    "Every good story starts with a simple idea. Here we share what we learned, what surprised us and what we would do again.",
    "We spoke to people who do this every day. Their advice was clear: start small, stay curious and enjoy the process.",
    "The details matter. A little planning at the start saves time later and makes the result feel effortless.",
    "Replace this text with your own words. Keep paragraphs short, add a quote, and let your photos do the talking.",
    "What surprised us most was how quickly small changes added up. Week by week, the difference was easy to see.",
    "Turn the page for more ideas, real examples and a checklist you can use straight away.",
]
CAPS = ["best day", "us ♥", "cheers!", "again soon", "first look", "the rings", "our people", "giggles", "sunset", "home", "first steps", "the cake"]


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("'", "").replace("’", "")).strip("-")


def magazine_pages(s):
    it = s["item"]
    topic, brand, issue, n = it["topic"], it["brand"], it["issue"], it["pages"]
    pool = PH.get(it["ph"], PH["events"])
    feats = FEATURES[topic]
    pair = s["pair"]
    k = len(s["title"])
    phs = lambda j: pool[(k + j) % len(pool)]  # noqa: E731
    pages = [("magazine", pair, dict(photo=s["c"].get("photo") or phs(0), brand=brand, issue=f"{issue} · {topic}", lines=feats[:2]), {})]
    pages.append(("contents", pair, dict(photo=phs(1), issue=f"{brand} · {issue}", title="Contents", items=[(f"{6 + i * (n // 5 or 1):02d}", h, d) for i, (h, d) in enumerate(feats)]), {}))
    body_kinds = ["article", "photo_page", "split", "grid", "hero_bottom", "article", "tips", "photo_page", "split", "grid", "article", "hero_bottom", "photo_page", "split"]
    for p in range(n - 3):
        kind = body_kinds[p % len(body_kinds)]
        h, d = feats[p % len(feats)]
        folio = f"{brand} · {issue} · {p + 3}"
        if kind == "article":
            pages.append(("article", pair, dict(photo=phs(p + 2), kicker=topic, title=h, dek=d, body=[BODY[(p + q) % len(BODY)] for q in range(4)], folio=folio), {}))
        elif kind == "photo_page":
            pages.append(("photo_page", pair, dict(photos=[phs(p + 3), phs(p + 4), phs(p + 5)], caption=f"{h} — {d.lower()}.", title=h, sub=d), {}))
        elif kind == "split":
            pages.append(("split", pair, dict(photo=phs(p + 6), kicker=topic, title=h, sub=BODY[p % len(BODY)], details=[d]), {"ratio": 0.5}))
        elif kind == "grid":
            pages.append(("grid", pair, dict(photos=[phs(p + 7 + q) for q in range(4)], kicker=topic, title=h), {"layout": "4a"}))
        elif kind == "hero_bottom":
            pages.append(("hero_bottom", pair, dict(photo=phs(p + 8), kicker=topic, title=h, sub=d), {"title_size": 120}))
        else:
            pages.append(("tips", pair, dict(kicker=topic, title=f"{h}: the checklist", items=[(f"Step {q + 1}", BODY[(p + q) % len(BODY)][:70]) for q in range(4)], handle=f"@{brand.lower().replace(' ', '')}", swipe=folio), {}))
    pages.append(("back", pair, dict(title=f"See you next issue", sub=f"{brand} · {topic} · Subscribe at www.yourmagazine.com", brand=brand), {}))
    return pages


def album_pages(s):
    it = s["item"]
    n = it["pages"]
    pool = PH.get(it["ph"], PH["family"])
    pair = s["pair"]
    k = len(s["title"])
    phs = lambda j: pool[(k + j) % len(pool)]  # noqa: E731
    title, sub = it["c"]["title"], it["c"]["sub"]
    pages = [("hero_center", pair, dict(photo=phs(0), kicker=sub, title=title, sub="2026", brand=""), {"title_size": 130})]
    for p in range(n - 2):
        lay = LAYOUTS[(p + k) % len(LAYOUTS)]
        cnt = {"2v": 2, "3a": 3, "3b": 3, "4": 4, "4a": 4, "5": 5, "6": 6, "6p": 6, "9": 9}[lay]
        if p % 4 == 3:
            m = 2 + p % 3
            pages.append(("polaroid", pair, dict(photos=[phs(p + q * 2) for q in range(m)], captions=[CAPS[(p + q) % len(CAPS)] for q in range(m)], title=title if p == 3 else "", sub=""), {}))
        else:
            c = dict(photos=[phs(p * 3 + q) for q in range(cnt)])
            if p % 3 == 0:
                c.update(kicker=f"Chapter {p // 3 + 1}", title=[sub, "The best bits", "Moments to keep", "Together"][p % 4])
            pages.append(("grid", pair, c, {"layout": lay}))
    pages.append(("back", pair, dict(title="To be continued…", sub=f"{title} · made with love", brand="2026"), {}))
    return pages


def build(key, limit=None):
    specs = gen2(key)
    if limit:
        specs = specs[:limit]
    out = []
    for i, s in enumerate(specs, 1):
        W, H = s["size"]
        p = PAL[s["pal"]]
        if s.get("book") == "magazine":
            pages = magazine_pages(s)
        elif s.get("book") == "album":
            pages = album_pages(s)
        else:
            pages = pages_for(s)
        objs, photos = [], set()
        for n, (arch, pair, c, opts) in enumerate(pages, 1):
            ab = board(f"w_{key}_{i:04d}", n, W, H)
            d = Doc(W, H, ab, seed=i * 10 + n)
            studio.build(d, arch, c, p, pair, opts)
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
        tags = ["wave-2026-11", s["cat"].lower()] + s.get("tags", []) + (["multi-page"] if len(pages) > 1 else []) + ([f"occasion-{slug(s['occ'])}"] if s.get("occ") else [])
        what = {"magazine": f"{len(pages)}-page magazine", "album": f"{len(pages)}-page photo album"}.get(s.get("book"), s["arch"].replace("_", " ") + " design")
        out.append({
            "name": s["title"], "category": s["cat"], "sub": s["sub"], "slug": slug(s["title"]), "width": W, "height": H, "pages": len(pages),
            "color1": p["bg"], "color2": p["accent"], "sort": 1000 + i, "premium": False, "featured": False,
            "keywords": s["kw"], "tags": tags, "occasion": s.get("occ"), "orientation": orient,
            "description": f"{what} in {s['pal']} tones{(' for ' + s['occ']) if s.get('occ') else ''} — editable online, print-ready.",
            "photos": sorted(photos), "canvasJson": {"version": "5.1.0", "objects": objs},
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="+")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--outdir", default=os.path.join(ROOT, "public/templates/collection"))
    a = ap.parse_args()
    keys = list(CATS2) if a.keys == ["all"] else a.keys
    for k in keys:
        out = build(k, a.limit)
        json.dump(out, open(os.path.join(a.outdir, f"wave-2026-11-{k}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        print(k, len(out), sum(len(json.dumps(x)) for x in out) // 1024, "KB")


if __name__ == "__main__":
    main()
