"""
Design kit for generating editable Magical Touch templates.

Produces the editor's own canvas format (Fabric.js 5 JSON) with real,
measured typography: text is measured with the same font files the site
serves, so headlines are fitted to the space they have and every block
of text gets its true height before the layout is placed.

Assets used by the designs
  /templates/photos/mt-*.jpg          Pixabay-licensed sample photos (docs/photo-credits.md)
  /templates/collection/art/*.png     Microsoft Fluent Emoji, MIT licence (docs/photo-credits.md)
Everything else (shapes, confetti, frames, textures) is drawn here.
"""

from __future__ import annotations

import json
import math
import os
import random
import re
from functools import lru_cache

from PIL import ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
FONT_DIR = os.environ.get("MT_FONT_DIR", os.path.join(HERE, "fonts"))
PUBLIC = os.path.abspath(os.path.join(HERE, "..", "..", "public"))
FS_MULT = 1.13  # fabric.Text._fontSizeMult

# ---------------------------------------------------------------- fonts
_SPECIAL = {"EBGaramond": "EB Garamond", "DMSans": "DM Sans", "Baloo2": "Baloo 2"}
_WEIGHTS = {"Thin": 100, "ExtraLight": 200, "Light": 300, "Regular": 400, "Medium": 500, "SemiBold": 600, "Bold": 700, "ExtraBold": 800, "Black": 900, "": 400}


@lru_cache(None)
def _font_files():
    out = {}
    for f in os.listdir(FONT_DIR):
        if not f.endswith(".ttf"):
            continue
        stem = f[:-4].split("[")[0]
        fam, style = (stem.split("-", 1) + [""])[:2] if "-" in stem else (stem, "")
        name = _SPECIAL.get(fam) or re.sub(r"(?<=[a-z])(?=[A-Z])", " ", fam)
        italic = "Italic" in style
        var = "[" in f
        w = None if var else _WEIGHTS.get(style.replace("Italic", ""), 400)
        out.setdefault((name, italic), []).append((w, os.path.join(FONT_DIR, f)))
    return out


@lru_cache(None)
def font(family: str, size: float, weight: int = 400, italic: bool = False):
    files = _font_files()
    cands = files.get((family, italic)) or files.get((family, False))
    if not cands:
        raise KeyError(f"font not available: {family}")
    var = [p for w, p in cands if w is None]
    if var:
        f = ImageFont.truetype(var[0], max(1, int(round(size * 4))))  # 4x for precision
        try:
            axes = f.get_variation_axes()
            vals = []
            for a in axes:
                tag = a.get("name", b"")
                tag = tag.decode() if isinstance(tag, bytes) else str(tag)
                if tag.lower().startswith("weight"):
                    vals.append(max(a["minimum"], min(a["maximum"], weight)))
                else:
                    vals.append(a.get("default", a["minimum"]))
            f.set_variation_by_axes(vals)
        except Exception:
            pass
        return f
    best = min(cands, key=lambda c: abs((c[0] or 400) - weight))
    return ImageFont.truetype(best[1], max(1, int(round(size * 4))))


def text_width(text: str, family: str, size: float, weight=400, italic=False, spacing=0) -> float:
    if not text:
        return 0.0
    f = font(family, size, weight, italic)
    w = f.getlength(text) / 4.0
    return w + spacing / 1000.0 * size * max(0, len(text) - 1)


def wrap(text: str, width: float, family: str, size: float, weight=400, italic=False, spacing=0):
    lines = []
    for para in text.split("\n"):
        words = para.split(" ")
        cur = ""
        for w in words:
            trial = (cur + " " + w) if cur else w
            if text_width(trial, family, size, weight, italic, spacing) <= width or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        lines.append(cur)
    return lines


def fit_size(text: str, width: float, family: str, max_size: float, weight=400, italic=False, spacing=0, min_size=6.0):
    """Largest size at which every explicit line of `text` fits `width`."""
    widest = max(text.split("\n"), key=lambda l: text_width(l, family, 100, weight, italic, spacing))
    w100 = text_width(widest, family, 100, weight, italic, spacing) or 1
    return max(min_size, min(max_size, 100 * width / w100))


# ---------------------------------------------------------------- colour
def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def rgba(h, a):
    r, g, b = hex2rgb(h)
    return f"rgba({r},{g},{b},{a})"


def mix(a, b, t):
    A, B = hex2rgb(a), hex2rgb(b)
    return "#%02X%02X%02X" % tuple(int(round(A[i] + (B[i] - A[i]) * t)) for i in range(3))


def lin(x1, y1, x2, y2, stops):
    return {"type": "linear", "gradientUnits": "pixels", "coords": {"x1": x1, "y1": y1, "x2": x2, "y2": y2}, "colorStops": [{"offset": o, "color": c} for o, c in stops], "offsetX": 0, "offsetY": 0}


def rad(cx, cy, r, stops, r1=0):
    return {"type": "radial", "gradientUnits": "pixels", "coords": {"x1": cx, "y1": cy, "r1": r1, "x2": cx, "y2": cy, "r2": r}, "colorStops": [{"offset": o, "color": c} for o, c in stops], "offsetX": 0, "offsetY": 0}


def shadow(color="rgba(0,0,0,0.25)", blur=20, x=0, y=8):
    return {"color": color, "blur": blur, "offsetX": x, "offsetY": y, "affectStroke": False, "nonScaling": False}


# ---------------------------------------------------------------- path helpers
def _path_bbox(cmds):
    xs, ys = [], []
    cx = cy = 0.0
    sx = sy = 0.0
    for c in cmds:
        op = c[0]
        if op == "M":
            cx, cy = c[1], c[2]
            sx, sy = cx, cy
            xs.append(cx); ys.append(cy)
        elif op == "L":
            cx, cy = c[1], c[2]
            xs.append(cx); ys.append(cy)
        elif op == "C":
            x0, y0 = cx, cy
            for i in range(1, 25):
                t = i / 24
                mt = 1 - t
                x = mt**3 * x0 + 3 * mt * mt * t * c[1] + 3 * mt * t * t * c[3] + t**3 * c[5]
                y = mt**3 * y0 + 3 * mt * mt * t * c[2] + 3 * mt * t * t * c[4] + t**3 * c[6]
                xs.append(x); ys.append(y)
            cx, cy = c[5], c[6]
        elif op == "Q":
            x0, y0 = cx, cy
            for i in range(1, 25):
                t = i / 24
                mt = 1 - t
                xs.append(mt * mt * x0 + 2 * mt * t * c[1] + t * t * c[3])
                ys.append(mt * mt * y0 + 2 * mt * t * c[2] + t * t * c[4])
            cx, cy = c[3], c[4]
        elif op == "Z":
            cx, cy = sx, sy
    return min(xs), min(ys), max(xs), max(ys)


def parse_d(d: str):
    """Tiny SVG path parser (absolute M L C Q Z H V and their relative forms)."""
    toks = re.findall(r"[MLCQZHVmlcqzhv]|-?\d*\.?\d+(?:e-?\d+)?", d)
    out, i, op = [], 0, None
    cx = cy = sx = sy = 0.0
    n = {"M": 2, "L": 2, "C": 6, "Q": 4, "Z": 0, "H": 1, "V": 1}

    def num():
        nonlocal i
        v = float(toks[i]); i += 1
        return v

    while i < len(toks):
        if re.match(r"[A-Za-z]", toks[i]):
            op = toks[i]; i += 1
            if op in "Zz":
                out.append(["Z"]); cx, cy = sx, sy
                continue
        rel = op.islower()
        U = op.upper()
        a = [num() for _ in range(n[U])]
        if U == "H":
            x = a[0] + (cx if rel else 0); out.append(["L", x, cy]); cx = x; continue
        if U == "V":
            y = a[0] + (cy if rel else 0); out.append(["L", cx, y]); cy = y; continue
        if rel:
            a = [v + (cx if k % 2 == 0 else cy) for k, v in enumerate(a)]
        out.append([U] + a)
        cx, cy = a[-2], a[-1]
        if U == "M":
            sx, sy = cx, cy
            op = "l" if rel else "L"
    return out


def transform_path(cmds, k=1.0, dx=0.0, dy=0.0, ky=None):
    ky = k if ky is None else ky
    out = []
    for c in cmds:
        if c[0] == "Z":
            out.append(["Z"]); continue
        v = c[1:]
        out.append([c[0]] + [round(v[j] * (k if j % 2 == 0 else ky) + (dx if j % 2 == 0 else dy), 2) for j in range(len(v))])
    return out


# ---------------------------------------------------------------- document
_uid = [0]


def _id(prefix="obj"):
    _uid[0] += 1
    return f"{prefix}_17930000{_uid[0]:05d}_{random.randrange(36**4):x}"


class Doc:
    def __init__(self, W, H, artboard: dict, seed=1):
        self.W, self.H = W, H
        self.artboard = artboard
        self.ab = artboard["__artboardId"]
        b = (artboard.get("__print") or {}).get("bleed") or {}
        self.bleed = max(b.get("top", 0) or 0, 10 if W < 900 else 30)
        self.objs = []
        self.rng = random.Random(seed)
        self.notes = {}

    # -- base
    def add(self, o, name=None, locked=False):
        o.setdefault("version", "5.1.0")
        o["__uid"] = _id()
        o["__artboardId"] = self.ab
        if name:
            o["name"] = name
        if locked:
            o.update({"lockMovementX": True, "lockMovementY": True, "lockScalingX": True, "lockScalingY": True, "lockRotation": True})
        self.objs.append(o)
        return o

    def json(self):
        return {"version": "5.1.0", "objects": [self.artboard] + self.objs}

    # -- shapes
    def bg(self, fill, name="Background"):
        b = self.bleed
        f = fill
        if isinstance(fill, dict):  # gradient coords given in page space
            f = json.loads(json.dumps(fill))
            c = f["coords"]
            for k in ("x1", "x2"):
                c[k] = c[k] + b
            for k in ("y1", "y2"):
                c[k] = c[k] + b
        return self.add({"type": "rect", "left": -b, "top": -b, "width": self.W + 2 * b, "height": self.H + 2 * b, "fill": f, "strokeWidth": 0}, name)

    def rect(self, x, y, w, h, fill="#000", rx=0, opacity=1, stroke=None, sw=0, angle=0, shadow_=None, name=None, origin_center=False, dash=None):
        o = {"type": "rect", "left": x, "top": y, "width": w, "height": h, "fill": fill, "rx": rx, "ry": rx, "opacity": opacity, "angle": angle, "strokeWidth": sw, "stroke": stroke}
        if dash:
            o["strokeDashArray"] = dash
        if origin_center:
            o.update({"originX": "center", "originY": "center"})
        if shadow_:
            o["shadow"] = shadow_
        return self.add(o, name)

    def circle(self, cx, cy, r, fill="#000", opacity=1, stroke=None, sw=0, shadow_=None, name=None, dash=None, start=None, end=None):
        o = {"type": "circle", "left": cx, "top": cy, "originX": "center", "originY": "center", "radius": r, "fill": fill, "opacity": opacity, "strokeWidth": sw, "stroke": stroke}
        if dash:
            o["strokeDashArray"] = dash
        if start is not None:
            o["startAngle"], o["endAngle"] = start, end
        if shadow_:
            o["shadow"] = shadow_
        return self.add(o, name)

    def ellipse(self, cx, cy, rx_, ry_, fill="#000", opacity=1, angle=0, stroke=None, sw=0, name=None):
        return self.add({"type": "ellipse", "left": cx, "top": cy, "originX": "center", "originY": "center", "rx": rx_, "ry": ry_, "fill": fill, "opacity": opacity, "angle": angle, "strokeWidth": sw, "stroke": stroke}, name)

    def line(self, x1, y1, x2, y2, stroke="#000", sw=1, opacity=1, dash=None, cap="round", name=None):
        o = {"type": "line", "left": min(x1, x2), "top": min(y1, y2) - sw / 2, "x1": x1, "y1": y1, "x2": x2, "y2": y2, "stroke": stroke, "strokeWidth": sw, "opacity": opacity, "strokeLineCap": cap}
        # fabric Line: left/top is the bounding box incl. stroke
        o["left"] = min(x1, x2) - (sw / 2 if x1 == x2 else 0)
        o["top"] = min(y1, y2) - (sw / 2 if y1 == y2 else 0)
        if dash:
            o["strokeDashArray"] = dash
        return self.add(o, name)

    def path(self, cmds, fill="#000", stroke=None, sw=0, opacity=1, angle=0, name=None, shadow_=None, cap="round", join="round", fill_rule="nonzero", dash=None):
        if isinstance(cmds, str):
            cmds = parse_d(cmds)
        cmds = [[c[0]] + [round(v, 1) for v in c[1:]] for c in cmds]
        x0, y0, x1, y1 = _path_bbox(cmds)
        o = {"type": "path", "path": cmds, "left": x0 - sw / 2, "top": y0 - sw / 2, "width": x1 - x0, "height": y1 - y0, "fill": fill, "stroke": stroke, "strokeWidth": sw, "opacity": opacity, "strokeLineCap": cap, "strokeLineJoin": join, "fillRule": fill_rule}
        if angle:
            # rotate about bbox centre
            o.update({"originX": "center", "originY": "center", "left": (x0 + x1) / 2, "top": (y0 + y1) / 2, "angle": angle})
        if dash:
            o["strokeDashArray"] = dash
        if shadow_:
            o["shadow"] = shadow_
        return self.add(o, name)

    def polygon(self, pts, fill="#000", opacity=1, stroke=None, sw=0, name=None):
        d = [["M", pts[0][0], pts[0][1]]] + [["L", x, y] for x, y in pts[1:]] + [["Z"]]
        return self.path(d, fill=fill, opacity=opacity, stroke=stroke, sw=sw, name=name, join="miter")

    # -- text
    def text(self, x, y, w, text, family, size, color="#111", weight=400, italic=False, align="left", lh=1.2, spacing=0, upper=False, name=None, shadow_=None, opacity=1, stroke=None, sw=0, angle=0):
        t = text.upper() if upper else text
        lines = wrap(t, w * 0.995, family, size, weight, italic, spacing)
        h = size * FS_MULT * (lh * (len(lines) - 1) + 1)
        o = {
            "type": "textbox", "left": x, "top": y, "width": w, "height": h, "fill": color, "fontFamily": family, "fontWeight": weight,
            "fontSize": round(size, 2), "text": t, "textAlign": align, "lineHeight": lh, "charSpacing": spacing, "fontStyle": "italic" if italic else "normal",
            "styles": {}, "minWidth": 20, "splitByGrapheme": False, "opacity": opacity, "__lines": len(lines),
        }
        if stroke:
            o.update({"stroke": stroke, "strokeWidth": sw, "paintFirst": "stroke", "strokeLineJoin": "round"})
        if angle:
            o["angle"] = angle
        if shadow_:
            o["shadow"] = shadow_
        self.add(o, name)
        o["_h"] = h
        return o

    def measure(self, text, w, family, size, weight=400, italic=False, lh=1.2, spacing=0, upper=False):
        t = text.upper() if upper else text
        n = len(wrap(t, w * 0.995, family, size, weight, italic, spacing))
        return size * FS_MULT * (lh * (n - 1) + 1)

    def fit(self, text, w, family, max_size, weight=400, italic=False, spacing=0, upper=False, min_size=6):
        t = text.upper() if upper else text
        return fit_size(t, w * 0.96, family, max_size, weight, italic, spacing, min_size)

    def stack(self, blocks, x, w, top=None, bottom=None, center_y=None, align="center"):
        """blocks: list of dicts {text, family, size, ... , gap(after)} or ('gap', n) or ('obj', h, fn(y))."""
        hs = []
        for b in blocks:
            if isinstance(b, tuple) and b[0] == "gap":
                hs.append(b[1])
            elif isinstance(b, tuple) and b[0] == "obj":
                hs.append(b[1])
            else:
                kw = {k: v for k, v in b.items() if k in ("weight", "italic", "lh", "spacing", "upper")}
                hs.append(self.measure(b["text"], b.get("w", w), b["family"], b["size"], **kw))
        total = sum(hs)
        if top is not None:
            y = top
        elif bottom is not None:
            y = bottom - total
        else:
            y = center_y - total / 2
        out = []
        for b, h in zip(blocks, hs):
            if isinstance(b, tuple) and b[0] == "gap":
                y += h
                continue
            if isinstance(b, tuple) and b[0] == "obj":
                b[2](y)
                y += h
                continue
            bw = b.get("w", w)
            bx = b.get("x", x + (w - bw) / 2 if align == "center" else x)
            kw = {k: v for k, v in b.items() if k not in ("text", "family", "size", "w", "x")}
            kw.setdefault("align", align)
            out.append(self.text(bx, y, bw, b["text"], b["family"], b["size"], **kw))
            y += h
        return out, total

    # -- images
    def photo(self, n, x, y, w, h, frame="rect", rx=0, focus=(0.5, 0.5), zoom=1.0, name="Photo", stroke=None, sw=0, shadow_=None, opacity=1, angle=0, filters=None):
        """Cover-fit a sample photo into a frame, cropping with cropX/cropY."""
        from PIL import Image
        src = f"/templates/photos/mt-{n}.jpg"
        iw, ih = Image.open(os.path.join(PUBLIC, src.lstrip("/"))).size
        s = max(w / iw, h / ih) * zoom
        cw, ch = w / s, h / s
        cx = max(0, min(iw - cw, focus[0] * iw - cw / 2))
        cy = max(0, min(ih - ch, focus[1] * ih - ch / 2))
        o = {"type": "image", "left": x, "top": y, "width": round(cw, 2), "height": round(ch, 2), "cropX": round(cx, 2), "cropY": round(cy, 2), "scaleX": s, "scaleY": s, "src": src, "crossOrigin": "anonymous", "filters": filters or [], "opacity": opacity}
        clip = self._clip(frame, cw, ch, rx / s if rx else 0)
        if clip:
            o["clipPath"] = clip
        o["__frame"] = {"kind": frame if frame != "rounded" else "rect", "empty": False}
        if angle:
            o.update({"angle": angle})
        if shadow_:
            o["shadow"] = shadow_
        if stroke:
            o.update({"stroke": stroke, "strokeWidth": sw})
        return self.add(o, name)

    def _clip(self, frame, w, h, r):
        base = {"version": "5.1.0", "originX": "center", "originY": "center", "left": 0, "top": 0, "fill": "#000000", "strokeWidth": 0}
        if frame == "rect":
            return None
        if frame == "rounded":
            return dict(base, type="rect", width=w, height=h, rx=r, ry=r)
        if frame == "circle":
            rr = min(w, h) / 2
            return dict(base, type="circle", radius=rr, width=2 * rr, height=2 * rr)
        if frame == "ellipse":
            return dict(base, type="ellipse", rx=w / 2, ry=h / 2, width=w, height=h)
        if frame == "arch":
            p = [["M", 0, h], ["L", 0, w / 2], ["C", 0, w * 0.22, w * 0.22, 0, w / 2, 0], ["C", w * 0.78, 0, w, w * 0.22, w, w / 2], ["L", w, h], ["Z"]]
            return dict(base, type="path", path=p, width=w, height=h)
        raise ValueError(frame)

    def art(self, name, cx, cy, size, angle=0, opacity=1, flip=False, shadow_=None):
        """A Fluent Emoji illustration (640×640 PNG), centred at cx, cy."""
        s = size / 640
        o = {"type": "image", "left": cx, "top": cy, "originX": "center", "originY": "center", "width": 640, "height": 640, "scaleX": s, "scaleY": s, "angle": angle, "flipX": flip, "src": f"/templates/collection/art/{name}.png", "crossOrigin": "anonymous", "filters": [], "opacity": opacity}
        if shadow_:
            o["shadow"] = shadow_
        self.notes.setdefault("art", set()).add(name)
        return self.add(o, "Illustration")

    def texture(self, kind="paper", opacity=0.5):
        b = self.bleed
        src = f"/templates/collection/art/texture-{kind}.jpg"
        k = max(self.W + 2 * b, self.H + 2 * b) / 1200
        # Mostly-white texture multiplied over the design: adds grain, never covers it.
        return self.add({"type": "image", "left": -b, "top": -b, "width": 1200, "height": 1200, "scaleX": k, "scaleY": k, "src": src, "crossOrigin": "anonymous", "filters": [], "opacity": opacity, "globalCompositeOperation": "multiply"}, "Texture")

    # ------------------------------------------------------------ decor
    def confetti(self, x0, y0, x1, y1, colors, n=40, size=(6, 14), shapes=("rect", "circle", "strip"), avoid=None, opacity=1):
        r = self.rng
        placed = 0
        tries = 0
        while placed < n and tries < n * 30:
            tries += 1
            x, y = r.uniform(x0, x1), r.uniform(y0, y1)
            if avoid and any(ax0 - 6 < x < ax1 + 6 and ay0 - 6 < y < ay1 + 6 for ax0, ay0, ax1, ay1 in avoid):
                continue
            c = r.choice(colors)
            s = r.uniform(*size)
            k = r.choice(shapes)
            if k == "circle":
                self.circle(x, y, s / 2, c, opacity=opacity, name="Confetti")
            elif k == "rect":
                self.rect(x, y, s, s * 0.62, c, angle=r.uniform(0, 180), origin_center=True, opacity=opacity, name="Confetti")
            elif k == "strip":
                a = r.uniform(0, math.pi)
                L = s * 1.6
                p = [["M", x, y], ["Q", x + L * 0.5 * math.cos(a) + s * 0.5, y + L * 0.5 * math.sin(a) - s * 0.5, x + L * math.cos(a), y + L * math.sin(a)]]
                self.path(p, fill="", stroke=c, sw=s * 0.32, opacity=opacity, name="Confetti")
            elif k == "star":
                self.sparkle(x, y, s * 0.9, c, opacity=opacity)
            elif k == "tri":
                a = r.uniform(0, 2 * math.pi)
                pts = [(x + s * 0.7 * math.cos(a + i * 2.094), y + s * 0.7 * math.sin(a + i * 2.094)) for i in range(3)]
                self.polygon(pts, c, opacity=opacity, name="Confetti")
            placed += 1

    def sparkle(self, cx, cy, r, fill="#fff", opacity=1, thin=0.18, name="Sparkle"):
        k = r * thin
        d = [["M", cx, cy - r], ["Q", cx + k, cy - k, cx + r, cy], ["Q", cx + k, cy + k, cx, cy + r], ["Q", cx - k, cy + k, cx - r, cy], ["Q", cx - k, cy - k, cx, cy - r], ["Z"]]
        return self.path(d, fill=fill, opacity=opacity, name=name)

    def star(self, cx, cy, r, fill, points=5, inner=0.45, angle=-90, opacity=1, stroke=None, sw=0):
        pts = []
        for i in range(points * 2):
            rr = r if i % 2 == 0 else r * inner
            a = math.radians(angle + i * 180 / points)
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
        return self.polygon(pts, fill, opacity=opacity, stroke=stroke, sw=sw, name="Star")

    def heart(self, cx, cy, s, fill, opacity=1, angle=0, stroke=None, sw=0, shadow_=None):
        d = parse_d("M0 -0.3C0 -0.62 -0.5 -0.72 -0.5 -0.3C-0.5 0 -0.2 0.22 0 0.42C0.2 0.22 0.5 0 0.5 -0.3C0.5 -0.72 0 -0.62 0 -0.3Z")
        return self.path(transform_path(d, s, cx, cy + s * 0.05), fill=fill, opacity=opacity, angle=angle, stroke=stroke, sw=sw, name="Heart", shadow_=shadow_)

    def balloon(self, cx, cy, r, color, string="#9a8f86", tail=None, hl=0.55, name="Balloon"):
        """Glossy vector balloon, centre (cx, cy) of the round part."""
        h = r * 1.18
        d = [["M", cx, cy - h], ["C", cx + r * 1.05, cy - h, cx + r * 1.05, cy + h * 0.45, cx, cy + h], ["C", cx - r * 1.05, cy + h * 0.45, cx - r * 1.05, cy - h, cx, cy - h], ["Z"]]
        dark = mix(color, "#000000", 0.18)
        light = mix(color, "#ffffff", 0.35)
        g = rad(r * 0.75, r * 0.6, r * 1.6, [(0, light), (0.55, color), (1, dark)])
        tail = tail if tail is not None else r * 2.6
        self.path([["M", cx, cy + h + r * 0.1], ["C", cx - r * 0.35, cy + h + tail * 0.35, cx + r * 0.35, cy + h + tail * 0.65, cx - r * 0.05, cy + h + tail]], fill="", stroke=string, sw=max(1, r * 0.035), name="Balloon string")
        self.polygon([(cx, cy + h - r * 0.04), (cx - r * 0.13, cy + h + r * 0.14), (cx + r * 0.13, cy + h + r * 0.14)], dark, name="Balloon knot")
        self.path(d, fill=g, name=name)
        self.ellipse(cx - r * 0.38, cy - h * 0.42, r * 0.16, r * 0.3, "#ffffff", opacity=hl, angle=28, name="Balloon shine")

    def bunting(self, x0, x1, y, sag, colors, flags=9, fh=None, string="#7a6f66"):
        fh = fh or (x1 - x0) / flags * 0.95
        fw = (x1 - x0) / flags * 0.78

        def yat(t):
            return y + sag * 4 * t * (1 - t)

        self.path([["M", x0, y], ["Q", (x0 + x1) / 2, y + sag * 2, x1, y]], fill="", stroke=string, sw=max(1, fh * 0.04), name="Bunting string")
        for i in range(flags):
            t = (i + 0.5) / flags
            cx = x0 + (x1 - x0) * t
            cy = yat(t)
            self.polygon([(cx - fw / 2, cy - fh * 0.02), (cx + fw / 2, cy - fh * 0.02), (cx, cy + fh)], colors[i % len(colors)], name="Bunting flag")

    def blob(self, cx, cy, r, fill, wobble=0.18, n=7, opacity=1, seed=None, angle=0):
        rr = random.Random(seed if seed is not None else self.rng.random())
        pts = []
        for i in range(n):
            a = 2 * math.pi * i / n + math.radians(angle)
            k = r * (1 + rr.uniform(-wobble, wobble))
            pts.append((cx + k * math.cos(a), cy + k * math.sin(a)))
        d = [["M", (pts[0][0] + pts[-1][0]) / 2, (pts[0][1] + pts[-1][1]) / 2]]
        for i in range(n):
            p = pts[i]
            q = pts[(i + 1) % n]
            d.append(["Q", p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2])
        d.append(["Z"])
        return self.path(d, fill=fill, opacity=opacity, name="Shape")

    def leaf(self, cx, cy, L, wdt, angle, fill, opacity=1, vein=None):
        a = math.radians(angle)
        ux, uy = math.cos(a), math.sin(a)
        px, py = -uy, ux
        tip = (cx + ux * L, cy + uy * L)
        m = (cx + ux * L * 0.5, cy + uy * L * 0.5)
        d = [["M", cx, cy], ["Q", m[0] + px * wdt, m[1] + py * wdt, tip[0], tip[1]], ["Q", m[0] - px * wdt, m[1] - py * wdt, cx, cy], ["Z"]]
        self.path(d, fill=fill, opacity=opacity, name="Leaf")
        if vein:
            self.path([["M", cx, cy], ["L", tip[0] - ux * L * 0.12, tip[1] - uy * L * 0.12]], fill="", stroke=vein, sw=max(0.6, wdt * 0.08), opacity=opacity, name="Leaf vein")

    def laurel(self, cx, cy, R, color, leaves=9, size=None, sweep=150, side="both", stem=True, **_):
        """Two branches rising from the bottom of a circle of radius R around (cx, cy)."""
        size = size or R * 0.24
        sides = [-1, 1] if side == "both" else [1 if side == "right" else -1]
        for sg in sides:
            def pt(a):
                r = math.radians(a)
                return cx + sg * R * math.sin(r), cy + R * math.cos(r)
            if stem:
                d = [["M", *pt(8)]] + [["L", *pt(8 + (sweep - 8) * t / 30)] for t in range(1, 31)]
                self.path(d, fill="", stroke=color, sw=max(1, size * 0.08), name="Laurel stem")
            for i in range(leaves):
                a = 14 + (sweep - 14) * i / (leaves - 1)
                x, y = pt(a)
                # tangent direction (towards larger a), in screen degrees
                r = math.radians(a)
                tx, ty = sg * math.cos(r), -math.sin(r)
                tang = math.degrees(math.atan2(ty, tx))
                k = 1 - 0.35 * i / (leaves - 1)
                self.leaf(x, y, size * k, size * 0.34 * k, tang - 32 * sg, color)
                self.leaf(x, y, size * k, size * 0.34 * k, tang + 32 * sg, color)

    def rays(self, cx, cy, r0, r1, n, color, opacity=1, width_deg=None, start=0, end=360):
        wd = width_deg or (end - start) / n / 2
        for i in range(n):
            a = math.radians(start + (end - start) * (i + 0.5) / n)
            b1, b2 = a - math.radians(wd / 2), a + math.radians(wd / 2)
            self.polygon([(cx + r0 * math.cos(a), cy + r0 * math.sin(a)), (cx + r1 * math.cos(b1), cy + r1 * math.sin(b1)), (cx + r1 * math.cos(b2), cy + r1 * math.sin(b2))], color, opacity=opacity, name="Ray")

    def wave(self, x0, x1, y, amp, period, fill=None, stroke=None, sw=0, bottom=None, opacity=1, phase=0):
        n = max(2, int((x1 - x0) / period * 2) + 1)
        step = (x1 - x0) / (n - 1)
        d = [["M", x0, y + amp * math.sin(phase)]]
        for i in range(1, n):
            xa = x0 + step * (i - 0.5)
            xb = x0 + step * i
            ya = y + amp * math.sin(phase + (i - 0.5) * math.pi) * 1.9
            yb = y + amp * math.sin(phase + i * math.pi) * 0
            d.append(["Q", xa, ya, xb, y])
        if bottom is not None:
            d += [["L", x1, bottom], ["L", x0, bottom], ["Z"]]
        return self.path(d, fill=fill or "", stroke=stroke, sw=sw, opacity=opacity, name="Wave")

    def scallop_edge(self, x0, x1, y, r, fill, down=True, bottom=None):
        n = max(1, int((x1 - x0) / (2 * r)))
        r = (x1 - x0) / n / 2
        d = [["M", x0, bottom if bottom is not None else y]]
        d.append(["L", x0, y])
        for i in range(n):
            cx = x0 + r * (2 * i + 1)
            d.append(["Q", cx, y + (r * 1.3 if down else -r * 1.3), x0 + r * (2 * i + 2), y])
        if bottom is not None:
            d += [["L", x1, bottom], ["Z"]]
        return self.path(d, fill=fill, name="Scallop")

    def dots(self, x0, y0, x1, y1, step, r, fill, opacity=1, offset_rows=True):
        """Dot grid as a rect with a repeating SVG pattern (tiny JSON, crisp at any zoom)."""
        import base64
        if offset_rows:
            tw, th = step, step * 2
            circles = f'<circle cx="{step/2:.2f}" cy="{step/2:.2f}" r="{r}"/><circle cx="0" cy="{step*1.5:.2f}" r="{r}"/><circle cx="{step:.2f}" cy="{step*1.5:.2f}" r="{r}"/>'
        else:
            tw, th = step, step
            circles = f'<circle cx="{step/2:.2f}" cy="{step/2:.2f}" r="{r}"/>'
        svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{tw:.2f}" height="{th:.2f}"><g fill="{fill}">{circles}</g></svg>'
        src = "data:image/svg+xml;base64," + base64.b64encode(svg.encode()).decode()
        pat = {"type": "pattern", "source": src, "repeat": "repeat", "offsetX": 0, "offsetY": 0, "crossOrigin": "", "patternTransform": None}
        return self.add({"type": "rect", "left": x0, "top": y0, "width": x1 - x0, "height": y1 - y0, "fill": pat, "opacity": opacity, "strokeWidth": 0}, "Dot pattern")

    def stripes(self, x0, y0, x1, y1, w, gap, fill, angle_deg=0, opacity=1):
        d = []
        if angle_deg == 0:
            x = x0
            while x < x1:
                d += [["M", x, y0], ["L", min(x + w, x1), y0], ["L", min(x + w, x1), y1], ["L", x, y1], ["Z"]]
                x += w + gap
        else:
            H = y1 - y0
            dx = H * math.tan(math.radians(angle_deg))
            x = x0 - abs(dx)
            while x < x1:
                d += [["M", x, y1], ["L", x + w, y1], ["L", x + w + dx, y0], ["L", x + dx, y0], ["Z"]]
                x += w + gap
        if d:
            self.path(d, fill=fill, opacity=opacity, name="Stripes")

    def frame_border(self, inset, color, sw=1, rx=0, double=0, opacity=1):
        self.rect(inset, inset, self.W - 2 * inset, self.H - 2 * inset, "", rx=rx, stroke=color, sw=sw, opacity=opacity, name="Border")
        if double:
            i2 = inset + double
            self.rect(i2, i2, self.W - 2 * i2, self.H - 2 * i2, "", rx=max(0, rx - double), stroke=color, sw=max(0.5, sw * 0.5), opacity=opacity, name="Border")
