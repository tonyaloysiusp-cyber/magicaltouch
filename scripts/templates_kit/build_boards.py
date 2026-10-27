"""
Build the Studio boards collection (boards_spec.py) into the editor format.

  MT_FONT_DIR=... python3 build_pro.py [--only 1-20] [--out preview.json] [--write]

--write  writes public/templates/collection/boards-2026-10.json (one record per
         template, same shape as the other collection files).
Previews and thumbnails are rendered separately with Fabric 5.3 in
headless Chromium (thumbnail 520 px wide, preview 1300 px on the long side).
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
import boards  # noqa: E402
from boards_spec import S  # noqa: E402

OUT = os.path.join(ROOT, "public/templates/collection/boards-2026-10.json")
BOARD = json.load(open(os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")))[0]["canvasJson"]["objects"][0]


def slug(t):
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("'", "").replace("’", "")).strip("-")


def board(i, W, H):
    a = json.loads(json.dumps(BOARD))
    a.update(width=W, height=H, name="Page 1")
    a["__artboardId"] = f"artboard_boards_{i:03d}"
    pr = a.get("__print") or {}
    if W >= 1000 and H >= 1000 and W in (1080,):  # social sizes: no print bleed
        a.pop("__print", None)
    return a


def palette_of(doc):
    seen = []
    for o in doc.objs:
        v = o.get("fill")
        if isinstance(v, str) and v.startswith("#") and len(v) == 7 and v.upper() not in seen:
            seen.append(v.upper())
    return seen[:6]


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
        d = Doc(W, H, board(i, W, H), seed=i)
        boards.build(d, s)
        for o in d.objs:
            o.pop("_h", None)
            o.pop("__lines", None)
        bg = s["p"].get("bg") or s["p"].get("dark") or "#FFFFFF"
        acc = s["p"].get("accent") or s["p"].get("gold") or "#000000"
        bg = bg if isinstance(bg, str) else "#FFFFFF"
        orient = "square" if W == H else ("portrait" if H > W else "landscape")
        sl = slug(s["title"])
        out.append({
            "name": s["title"], "category": s["cat"], "sub": s["arch"].title(), "slug": sl, "width": W, "height": H, "pages": 1,
            "color1": bg, "color2": acc, "sort": -7000 + i, "premium": False, "featured": True,
            "keywords": s["kw"], "tags": ["studio-boards", s["cat"].lower()], "occasion": None, "orientation": orient,
            "description": f"Bold {s['arch']} layout with photo frame, geometric accents and script lettering.",
            "photos": sorted(d.notes.get("photos", [])), "canvasJson": d.json(),
        })
    if a.out:
        json.dump(out, open(a.out, "w"))
    if a.write:
        json.dump(out, open(OUT, "w"), ensure_ascii=False, separators=(",", ":"))
    print(f"built {len(out)}")


if __name__ == "__main__":
    main()
