"""
Put real photographs into photo frames that still hold a placeholder or a
flat illustration (an embedded data: image).

  python3 fill_frames.py mapping.json [--dry]

mapping.json: {"<slug>": ["photo-name", ...], ...}  one name per frame in
canvas order; names are files in public/templates/photos/pro/<name>.jpg.
A frame keeps its position, size, shape (clip path) and every other
property; only the picture inside changes, cover-cropped around the
photo's focus point (photos/pro/focus.json, default centre).
"""

import glob
import json
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
COLL = os.path.join(ROOT, "public/templates/collection")
PRO = os.path.join(ROOT, "public/templates/photos/pro")


def focus_of(name):
    try:
        return json.load(open(os.path.join(PRO, "focus.json"))).get(name, [0.5, 0.42])
    except FileNotFoundError:
        return [0.5, 0.42]


def fill(o, name):
    sx, sy = o.get("scaleX", 1) or 1, o.get("scaleY", 1) or 1
    W, H = o["width"] * sx, o["height"] * sy  # displayed size of the frame
    iw, ih = Image.open(os.path.join(PRO, name + ".jpg")).size
    k = max(W / iw, H / ih)
    cw, ch = W / k, H / k
    fx, fy = focus_of(name)
    cx = max(0, min(iw - cw, fx * iw - cw / 2))
    cy = max(0, min(ih - ch, fy * ih - ch / 2))
    # clip path lives in the object's own (unscaled) space: rescale it
    cp = o.get("clipPath")
    if cp:
        # old object space -> new object space factor (displayed size is unchanged)
        r = sx / k
        for key in ("left", "top"):
            if isinstance(cp.get(key), (int, float)):
                cp[key] = cp[key] * r
        cp["scaleX"] = (cp.get("scaleX", 1) or 1) * r
        cp["scaleY"] = (cp.get("scaleY", 1) or 1) * (sy / k)
    o.update({"width": round(cw, 2), "height": round(ch, 2), "cropX": round(cx, 2), "cropY": round(cy, 2), "scaleX": k, "scaleY": k,
              "src": f"/templates/photos/pro/{name}.jpg", "crossOrigin": "anonymous", "filters": []})
    o["__frame"] = dict(o.get("__frame") or {"kind": "rect"}, empty=False)
    if o.get("name") == "Photo frame":
        o["name"] = "Photo"


def main():
    mapping = json.load(open(sys.argv[1]))
    dry = "--dry" in sys.argv
    out = []
    done = set()
    for f in sorted(glob.glob(os.path.join(COLL, "*.json"))):
        try:
            items = json.load(open(f))
        except Exception:
            continue
        if not isinstance(items, list):
            continue
        changed = False
        for x in items:
            names = mapping.get(x.get("slug"))
            if not names:
                continue
            cj = x["canvasJson"]
            was_str = isinstance(cj, str)
            if was_str:
                cj = json.loads(cj)
            frames = [o for o in cj["objects"] if o.get("type") == "image" and str(o.get("src", "")).startswith("data:")]
            if len(frames) != len(names):
                print(f"! {x['slug']}: {len(frames)} frames, {len(names)} photos given", file=sys.stderr)
                names = (names * len(frames))[: len(frames)]
            for o, n in zip(frames, names):
                fill(o, n)
            x["canvasJson"] = json.dumps(cj) if was_str else cj
            out.append(x)
            done.add(x["slug"])
            changed = True
        if changed and not dry:
            json.dump(items, open(f, "w"), ensure_ascii=False, separators=(",", ":"))
    missing = set(mapping) - done
    if missing:
        print("not found:", sorted(missing), file=sys.stderr)
    json.dump(out, open(os.path.join(os.environ.get("OUT_DIR", "/tmp"), "filled.json"), "w"))
    print(f"filled {len(done)} templates")


if __name__ == "__main__":
    main()
