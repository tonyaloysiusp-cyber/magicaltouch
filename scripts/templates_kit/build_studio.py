"""
Build the Studio collection (studio_spec.py) into the editor format.

  MT_FONT_DIR=... python3 build_studio.py [--only 1-20] [--out preview.json] [--write]

--write  writes public/templates/collection/studio-2026-11.json (one record
         per template, same shape as the other collection files).
Multi-page templates (magazines, photo albums) have one artboard per page,
side by side with a 120 px gap, exactly as the editor lays out pages.
Thumbnails/previews: render_studio.cjs (Fabric 5.3 in headless Chromium).
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
from studio_spec import S, PAL  # noqa: E402

OUT = os.path.join(ROOT, "public/templates/collection/studio-2026-11.json")
BOARD = json.load(open(os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")))[0]["canvasJson"]["objects"][0]
GAP = 120


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("'", "").replace("’", "")).strip("-")


def board(key, n, W, H):
    a = json.loads(json.dumps(BOARD))
    a.update(width=W, height=H, name=f"Page {n}", left=0, top=0)
    a["__artboardId"] = f"artboard_studio_{key}_{n}"
    if W in (1080, 1200, 1584, 1500, 2560) and H not in (1123,):  # screen sizes: no print bleed
        a.pop("__print", None)
    return a


def shift(o, dx):
    o["left"] = o.get("left", 0) + dx
    return o


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only")
    ap.add_argument("--out")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    ids = range(1, len(S) + 1)
    if a.only:
        x, y = (a.only.split("-") + [a.only])[:2]
        ids = range(int(x), int(y) + 1)
    out = []
    for i in ids:
        s = S[i - 1]
        W, H = s["size"]
        p = PAL[s["pal"]]
        objs, photos, pal = [], set(), []
        for n, (arch, pair, c, opts) in enumerate(s["pages"], 1):
            ab = board(f"{i:03d}", n, W, H)
            d = Doc(W, H, ab, seed=i * 10 + n)
            studio.build(d, arch, c, p, pair, opts)
            dx = (n - 1) * (W + GAP)
            ab["left"] = dx
            objs.append(ab)
            for o in d.objs:
                o.pop("_h", None)
                o.pop("__lines", None)
                objs.append(shift(o, dx))
            photos |= set(d.notes.get("photos", []))
        orient = "square" if W == H else ("portrait" if H > W else "landscape")
        pages = len(s["pages"])
        first = s["pages"][0]
        out.append({
            "name": s["title"], "category": s["cat"], "sub": s["sub"], "slug": slug(s["title"]), "width": W, "height": H, "pages": pages,
            "color1": p["bg"], "color2": p["accent"], "sort": -7000 + i, "premium": False, "featured": True,
            "keywords": s["kw"], "tags": ["studio-collection", s["cat"].lower()] + (["multi-page"] if pages > 1 else []), "occasion": None, "orientation": orient,
            "description": f"{'%d-page ' % pages if pages > 1 else ''}{first[0].replace('_', ' ')} layout in {s['pal']} tones — clean, editable and print-ready.",
            "photos": sorted(photos), "canvasJson": {"version": "5.1.0", "objects": objs},
        })
    if a.out:
        json.dump(out, open(a.out, "w"))
    if a.write:
        json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"built {len(out)}")


if __name__ == "__main__":
    main()
