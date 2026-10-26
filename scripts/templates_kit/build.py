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

MODULES = {"birthday": ["birthday_a", "birthday_b", "birthday_c", "birthday_d", "birthday_e"]}


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
    pub = json.load(open(pub_path))
    man = json.load(open(man_path))
    designs = load_designs(a.cat)
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
