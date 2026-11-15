// Left and right indents for text boxes (in px of the text box, before any
// scaling). Fabric 5 has none: the wrap width is reduced by the indents
// (Textbox._wrapLine's reserved space) and every line is shifted by the
// left indent in _getLineLeftOffset — which the cursor, selection, click
// positions and the vector PDF export all use, so they stay in step.

export function indentShift(align: string, left: number, right: number): number {
  if (align === 'right') return -right;
  if (align === 'center') return (left - right) / 2;
  return left; // left, justify
}

export function installTextIndent(F: any) {
  const TB = F?.Textbox?.prototype, T = F?.Text?.prototype;
  if (!TB || !T || T.__mtIndent) return;
  T.__mtIndent = true;
  T.indentLeft = 0;
  T.indentRight = 0;
  [F.Text, F.IText, F.Textbox].forEach((K: any) => {
    const P = K?.prototype;
    if (!P) return;
    ['_dimensionAffectingProps', 'cacheProperties'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(P, key) && Array.isArray(P[key])) {
        for (const k of ['indentLeft', 'indentRight']) if (!P[key].includes(k)) P[key] = P[key].concat(k);
      }
    });
  });
  const ind = (o: any) => {
    const w = o.width || 0;
    const l = Math.max(0, Number(o.indentLeft) || 0), r = Math.max(0, Number(o.indentRight) || 0);
    // Never squeeze the text below a quarter of the box.
    const k = l + r > w * 0.75 && l + r > 0 ? (w * 0.75) / (l + r) : 1;
    return { l: l * k, r: r * k };
  };

  const baseWrapLine = TB._wrapLine;
  TB._wrapLine = function (line: any, lineIndex: number, desiredWidth: number, reservedSpace = 0) {
    const { l, r } = ind(this);
    return baseWrapLine.call(this, line, lineIndex, desiredWidth, (reservedSpace || 0) + l + r);
  };

  const baseLeft = T._getLineLeftOffset;
  T._getLineLeftOffset = function (i: number) {
    const base = baseLeft.call(this, i);
    if (this.type !== 'textbox') return base;
    const { l, r } = ind(this);
    if (!l && !r) return base;
    const s = indentShift(this.textAlign || 'left', l, r);
    return this.direction === 'rtl' ? base - s : base + s;
  };

  // Justify stretches lines to the text box width: stretch them to the width inside the indents instead.
  const baseEnlarge = TB.enlargeSpaces;
  if (baseEnlarge) TB.enlargeSpaces = function () {
    const { l, r } = ind(this);
    if (!l && !r) return baseEnlarge.call(this);
    const w = this.width;
    this.width = w - l - r;
    try { return baseEnlarge.call(this); } finally { this.width = w; }
  };
}
