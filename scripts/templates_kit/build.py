"""
Rebuild Collection 500 templates from the design modules.

  python3 build.py birthday [--ids 1-20] [--out preview.json] [--write]

--out    writes the generated templates (editor format) for the renderer
--write  updates public/templates/collection/collection500-<cat>.json and the
         manifest in data/collection-500/ (brief, design notes, palette)
"""

import argparse
import importlib
import json
import os
import random
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))

from kit import Doc  # noqa: E402

MODULES = {"birthday": ["birthday_a", "birthday_b", "birthday_c", "birthday_d", "birthday_e"], "wedding": ["wedding"], "greeting": ["greetings"], "seasonal": ["seasonal"], "baby": ["baby"], "grad": ["graduation"], "event": ["events"]}


def load_designs(cat):
    designs = {}
    for m in MODULES[cat]:
        try:
            mod = importlib.import_module(m)
        except ModuleNotFoundError as e:
            if e.name == m:
                continue
            raise
        designs.update(mod.D)
    return designs


def palette_of(doc):
    seen = []
    def add(c):
        if isinstance(c, str) and c.startswith("#") and len(c) == 7 and c.upper() not in seen:
            seen.append(c.upper())
    for o in doc.objs:
        for k in ("fill", "stroke"):
            v = o.get(k)
            if isinstance(v, dict):
                for s in v.get("colorStops", []):
                    add(s["color"])
            else:
                add(v)
    return seen[:6]


ARTBOARD_SRC = os.path.join(ROOT, "public/templates/collection/collection500-birthday.json")


def _slug(t):
    import re
    return re.sub(r"[^a-z0-9]+", "-", t.lower().replace("’", "").replace("'", "")).strip("-")


def new_records(cat):
    """Manifest + editor records for a category that has a SPEC but no files yet."""
    import urllib.parse
    mod = importlib.import_module(MODULES[cat][0])
    boards = {}
    for t in json.load(open(ARTBOARD_SRC)):
        boards.setdefault((t["width"], t["height"]), t["canvasJson"]["objects"][0])
    taken = set()
    coll = os.path.join(ROOT, "public/templates/collection")
    for f in os.listdir(coll):
        if f.endswith(".jpg"):
            taken.add(f[:-4].replace("-preview", ""))
    pub, man = [], []
    for i, (sub, title, w, h, head, msg, sig, query, kw) in enumerate(mod.SPEC, 1):
        slug = _slug(title)
        if slug in taken:
            raise SystemExit(f"slug already used by another template: {slug} — rename '{title}'")
        rid = f"{cat}-{i:03d}"
        ab = json.loads(json.dumps(boards[(w, h)]))
        ab["__artboardId"] = f"artboard_{cat}_{i:03d}"
        ab["name"] = "Page 1"
        url = "https://www.pinterest.com/search/pins/?q=" + urllib.parse.quote(query)
        orient = "square" if w == h else ("portrait" if h > w else "landscape")
        man.append({
            "id": rid, "slug": slug, "title": title, "category": mod.CATEGORY, "subcategory": sub, "site_category": mod.SITE_CATEGORY,
            "description": "", "design_brief": "", "design_style": sub.lower(), "inspiration_reference_url": url, "inspiration_query": query,
            "inspiration_pin_url": None, "reference_type": "pinterest_search", "reference_verified": False, "design_notes": {}, "palette": [],
            "content": {"headline": head, "message": msg, "signature": sig}, "dimensions": {"width": w, "height": h, "unit": "px"}, "pages": 1,
            "thumbnail_url": f"/templates/collection/{slug}.jpg", "preview_url": f"/templates/collection/{slug}-preview.jpg", "status": "published", "is_editable": True,
        })
        pub.append({
            "name": title, "category": mod.SITE_CATEGORY, "sub": sub, "slug": slug, "width": w, "height": h, "pages": 1, "color1": "#FFFFFF", "color2": "#000000",
            "sort": -3000 + i, "premium": False, "featured": i <= 10, "keywords": kw, "tags": [mod.TAG, "collection-500"], "occasion": None, "orientation": orient,
            "description": "", "canvasJson": {"version": "5.1.0", "objects": [ab]},
        })
    return pub, man


def ensure_art(names):
    """Copy any illustration a design uses into public/ (quantised PNG)."""
    from PIL import Image
    src_dir = os.environ.get("MT_ART_SRC")
    dst_dir = os.path.join(ROOT, "public/templates/collection/art")
    for n in names:
        dst = os.path.join(dst_dir, n + ".png")
        if os.path.exists(dst):
            continue
        if not src_dir or not os.path.exists(os.path.join(src_dir, n + ".png")):
            raise SystemExit(f"illustration not found: {n} (set MT_ART_SRC)")
        im = Image.open(os.path.join(src_dir, n + ".png")).convert("RGBA")
        im.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(dst, optimize=True)


def parse_ids(s, n):
    if not s:
        return list(range(1, n + 1))
    out = []
    for part in s.split(","):
        if "-" in part:
            a, b = part.split("-")
            out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cat")
    ap.add_argument("--ids")
    ap.add_argument("--out")
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()

    pub_path = os.path.join(ROOT, "public/templates/collection", f"collection500-{a.cat}.json")
    man_path = os.path.join(ROOT, "data/collection-500", f"collection500-{a.cat}.json")
    designs = load_designs(a.cat)
    if os.path.exists(pub_path):
        pub = json.load(open(pub_path))
        man = json.load(open(man_path))
    else:
        pub, man = new_records(a.cat)
    ids = parse_ids(a.ids, len(man))
    out = []
    for i in ids:
        if i not in designs:
            continue
        rec, tpl = man[i - 1], pub[i - 1]
        assert rec["slug"] == tpl["slug"]
        artboard = tpl["canvasJson"]["objects"][0]
        doc = Doc(tpl["width"], tpl["height"], artboard, seed=i * 7919)
        random.seed(i)
        notes = designs[i](doc, rec["content"])
        for o in doc.objs:
            o.pop("_h", None)
        tpl["canvasJson"] = doc.json()
        ensure_art(doc.notes.get("art", []))
        pal = palette_of(doc)
        if a.write:
            rec["design_notes"] = {k: notes[k] for k in ("layout", "typography", "palette", "decor")}
            rec["description"] = rec["design_brief"] = notes.get("brief") or f"{notes['layout'][0].upper()}{notes['layout'][1:]}. {notes['decor'][0].upper()}{notes['decor'][1:]}."
            rec["palette"] = pal
            tpl["description"] = rec["description"]
            if pal:
                tpl["color1"], tpl["color2"] = pal[0], pal[1] if len(pal) > 1 else pal[0]
            rec["assets"] = sorted(doc.notes.get("art", []))
        out.append(tpl)
    if a.out:
        json.dump(out, open(a.out, "w"))
    if a.write:
        for tpl in out:
            for o in tpl["canvasJson"]["objects"]:
                o.pop("__lines", None)
        json.dump(pub, open(pub_path, "w"), ensure_ascii=False, separators=(",", ":"))
        json.dump(man, open(man_path, "w"), ensure_ascii=False, indent=1)
    print(f"built {len(out)} templates")


if __name__ == "__main__":
    main()
