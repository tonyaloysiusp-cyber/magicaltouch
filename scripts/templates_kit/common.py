"""Shared palettes, type pairings and small composition helpers for the designs."""

from kit import lin, rad, mix, rgba, shadow

GOLD = [(0, "#8A6A2E"), (0.22, "#E9C877"), (0.45, "#B68A3A"), (0.7, "#F7E3A3"), (1, "#9C7431")]
ROSE_GOLD = [(0, "#9E5F55"), (0.3, "#F0C2B0"), (0.6, "#C28370"), (1, "#F5D6C8")]
SILVER = [(0, "#7E8590"), (0.3, "#F2F4F7"), (0.6, "#A9B0BA"), (1, "#E8EBEF")]


def metal(w, h, stops=GOLD, diagonal=True):
    return lin(0, 0, w, h if diagonal else 0, stops)


def text_metal(doc, t, stops=GOLD):
    """Give an existing textbox a metallic gradient fill sized to it."""
    t["fill"] = lin(0, 0, t["width"], t["_h"], stops)
    return t


def vgrad(h, top, bottom, mid=None):
    stops = [(0, top), (1, bottom)] if not mid else [(0, top), (0.5, mid), (1, bottom)]
    return lin(0, 0, 0, h, stops)


def overlay(doc, top_alpha=0.0, bottom_alpha=0.75, color="#000000", y0=0, y1=None, name="Shade"):
    """Gradient shade over a photo so text stays readable."""
    b = doc.bleed
    y1 = doc.H if y1 is None else y1
    g = lin(0, 0, 0, y1 - y0 + 2 * b, [(0, rgba(color, top_alpha)), (1, rgba(color, bottom_alpha))])
    return doc.rect(-b, y0 - b, doc.W + 2 * b, y1 - y0 + 2 * b, g, name=name)


def pill(doc, cx, cy, text, family, size, fg, bg, pad_x=None, pad_y=None, weight=600, spacing=120, upper=True, stroke=None):
    from kit import text_width, FS_MULT
    t = text.upper() if upper else text
    w = text_width(t, family, size, weight, False, spacing)
    px = pad_x if pad_x is not None else size * 1.3
    py = pad_y if pad_y is not None else size * 0.62
    h = size * FS_MULT + 2 * py
    W = w + 2 * px
    doc.rect(cx - W / 2, cy - h / 2, W, h, bg, rx=h / 2, stroke=stroke, sw=1.2 if stroke else 0, name="Label")
    doc.text(cx - W / 2, cy - h / 2 + py, W, t, family, size, fg, weight=weight, align="center", spacing=spacing)
    return W, h


def divider(doc, cx, y, w, color, sw=1, gem=True, gap=10):
    doc.line(cx - w / 2, y, cx - (gap if gem else 0), y, color, sw)
    doc.line(cx + (gap if gem else 0), y, cx + w / 2, y, color, sw)
    if gem:
        s = gap * 0.45
        doc.polygon([(cx, y - s), (cx + s, y), (cx, y + s), (cx - s, y)], color)
