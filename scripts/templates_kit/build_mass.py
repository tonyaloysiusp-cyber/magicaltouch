"""
Build the Mass collection, one file per category key:

  MT_FONT_DIR=... python3 build_mass.py KEY [KEY ...] [--limit N] [--outdir DIR]

Writes <outdir>/mass-2026-11-<key>.json (same record shape as the other
collection files). Business cards (front + back), presentations (5 slides)
and brochures (4 pages) are multi-page; pages sit side by side with a
120 px gap, as in the editor.
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
import mass  # noqa: E402,F401  (registers the new layouts)
from mass_spec import CATS, gen, PH  # noqa: E402
from studio_spec import PAL  # noqa: E402

BOARD = json.load(open(os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")))[0]["canvasJson"]["objects"][0]
GAP = 120
SCREEN = {(1080, 1350), (1080, 1080), (1080, 1920), (1200, 628), (1584, 396), (1500, 500), (2560, 1440), (1280, 720), (1920, 1080), (1200, 900)}


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("'", "").replace("’", "")).strip("-")


def board(key, n, W, H):
    a = json.loads(json.dumps(BOARD))
    a.update(width=W, height=H, name=f"Page {n}", left=0, top=0)
    a["__artboardId"] = f"artboard_mass_{key}_{n}"
    if (W, H) in SCREEN:
        a.pop("__print", None)
    return a


def pages_for(s):
    arch, pair, c, opts = s["arch"], s["pair"], s["c"], s["opts"]
    if arch == "bizcard":
        st = opts.get("style", "split")
        return [("bizcard_front", pair, c, {"style": st}), ("bizcard_back", pair, c, {"style": st})]
    if arch == "slides":
        pool = PH.get("business")
        ph = c["photo"]
        c2 = dict(c, photo2=pool[len(c["title"]) % len(pool)])
        return [("slide_title", pair, c2, {}), ("slide_agenda", pair, c2, {}), ("slide_content", pair, c2, {}), ("slide_stats", pair, c2, {}), ("slide_end", pair, c2, {})]
    if arch == "brochure":
        ph = c["photo"]
        pool = [p for p in PH["business"] + PH["home"] if p != ph]
        k = len(c["brand"])
        return [("hero_bottom", pair, dict(photo=ph, brand=c["brand"], kicker="Company profile", title=c["title"], sub="Who we are, what we do and how we can help you."), {"title_size": 130}),
                ("split", pair, dict(photo=pool[k % len(pool)], kicker="About us", title="Built on trust, care and craft", sub="For over ten years we have helped families and businesses with honest advice, fair prices and work we are proud of.", details=["Experienced team", "Transparent pricing", "On-time delivery"]), {"ratio": 0.42}),
                ("grid", pair, dict(photos=[pool[(k + j) % len(pool)] for j in range(4)], kicker="Our work", title="Recent projects"), {"layout": "4a"}),
                ("back", pair, dict(title="Let's work together", sub="Call +91 98765 43210 · hello@yourcompany.com · Anna Salai, Chennai", brand=c["brand"]), {})]
    return [(arch, pair, c, opts)]


def build(key, limit=None):
    specs = gen(key)
    if limit:
        specs = specs[:limit]
    out = []
    for i, s in enumerate(specs, 1):
        W, H = s["size"]
        p = PAL[s["pal"]]
        objs, photos = [], set()
        pages = pages_for(s)
        for n, (arch, pair, c, opts) in enumerate(pages, 1):
            ab = board(f"{key}_{i:04d}", n, W, H)
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
        out.append({
            "name": s["title"], "category": s["cat"], "sub": s["sub"], "slug": slug(s["title"]), "width": W, "height": H, "pages": len(pages),
            "color1": p["bg"], "color2": p["accent"], "sort": 1000 + i, "premium": False, "featured": False,
            "keywords": s["kw"], "tags": ["mass-collection", s["cat"].lower()] + (["multi-page"] if len(pages) > 1 else []), "occasion": None, "orientation": orient,
            "description": f"{'%d-page ' % len(pages) if len(pages) > 1 else ''}{s['arch'].replace('_', ' ')} design in {s['pal']} tones — clean, editable and print-ready.",
            "photos": sorted(photos), "canvasJson": {"version": "5.1.0", "objects": objs},
        })
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="+")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--outdir", default=os.path.join(ROOT, "public/templates/collection"))
    a = ap.parse_args()
    keys = list(CATS) if a.keys == ["all"] else a.keys
    for k in keys:
        out = build(k, a.limit)
        json.dump(out, open(os.path.join(a.outdir, f"mass-2026-11-{k}.json"), "w"), ensure_ascii=False, separators=(",", ":"))
        print(k, len(out))


if __name__ == "__main__":
    main()
