// Paragraph spacing for text boxes: extra space before every paragraph
// (a new line started with Enter), separate from line spacing inside a
// paragraph. Stored on the text as `paragraphSpacing`, a multiple of the
// font size, so it scales with the text.
//
// Fabric 5 has no such setting. Each line's height comes from
// getHeightOfLine(); adding the gap there moves every following line, the
// cursor and click positions. Fabric also places each line's letters,
// underline and highlight at (line height ÷ lineHeight) inside the line,
// so those three drawing routines are re-done here with the gap kept
// above the letters (same code as Fabric 5.3, plus the gap).

export function installParagraphSpacing(F: any) {
  const T = F?.Text?.prototype;
  if (!T || T.__mtParagraphSpacing) return;
  T.__mtParagraphSpacing = true;
  T.paragraphSpacing = 0;
  // Text, IText and Textbox each keep their own copies of these lists.
  [F.Text, F.IText, F.Textbox].forEach((K: any) => {
    const P = K?.prototype;
    if (!P) return;
    ['_dimensionAffectingProps', 'cacheProperties'].forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(P, key) && Array.isArray(P[key]) && !P[key].includes('paragraphSpacing')) {
        P[key] = P[key].concat('paragraphSpacing');
      }
    });
  });

  // Is line i the first line of a paragraph (not just a wrapped line)?
  T._mtParaStart = function (i: number) {
    if (i <= 0) return false;
    const m = this._styleMap;
    if (m && m[i]) return m[i].offset === 0 && (!m[i - 1] || m[i - 1].line !== m[i].line);
    return true;
  };
  T._mtParaGap = function (i: number) {
    const k = Number(this.paragraphSpacing) || 0;
    if (!k || !this._mtParaStart(i)) return 0;
    return k * (this.fontSize || 0);
  };

  const baseHeight = T.getHeightOfLine;
  T.getHeightOfLine = function (i: number) {
    return baseHeight.call(this, i) + this._mtParaGap(i);
  };

  const baseCalcHeight = T.calcTextHeight;
  T.calcTextHeight = function () {
    const h = baseCalcHeight.call(this);
    const last = (this._textLines?.length || 0) - 1;
    const g = last > 0 ? this._mtParaGap(last) : 0;
    return g ? h + g - g / this.lineHeight : h;
  };

  const baseRenderTextCommon = T._renderTextCommon;
  T._renderTextCommon = function (ctx: CanvasRenderingContext2D, method: string) {
    if (!this.paragraphSpacing) return baseRenderTextCommon.call(this, ctx, method);
    ctx.save();
    let lineHeights = 0;
    const left = this._getLeftOffset();
    const top = this._getTopOffset();
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      const gap = this._mtParaGap(i);
      const maxHeight = (heightOfLine - gap) / this.lineHeight;
      const leftOffset = this._getLineLeftOffset(i);
      this._renderTextLine(method, ctx, this._textLines[i], left + leftOffset, top + lineHeights + gap + maxHeight, i);
      lineHeights += heightOfLine;
    }
    ctx.restore();
  };

  const baseBackground = T._renderTextLinesBackground;
  T._renderTextLinesBackground = function (ctx: any) {
    if (!this.paragraphSpacing || this.path) return baseBackground.call(this, ctx);
    if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor')) return;
    const originalFill = ctx.fillStyle;
    const leftOffset = this._getLeftOffset();
    let lineTopOffset = this._getTopOffset();
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      const gap = this._mtParaGap(i);
      const ownHeight = (heightOfLine - gap) / this.lineHeight;
      if (!this.textBackgroundColor && !this.styleHas('textBackgroundColor', i)) {
        lineTopOffset += heightOfLine;
        continue;
      }
      const line = this._textLines[i];
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxWidth = 0;
      let boxStart = 0;
      let lastColor = this.getValueOfPropertyAt(i, 0, 'textBackgroundColor');
      let currentColor: any = lastColor;
      const fill = (color: any, start: number, width: number) => {
        if (!color) return;
        let drawStart = leftOffset + lineLeftOffset + start;
        if (this.direction === 'rtl') drawStart = this.width - drawStart - width;
        ctx.fillStyle = color;
        ctx.fillRect(drawStart, lineTopOffset + gap, width, ownHeight);
      };
      for (let j = 0, jlen = line.length; j < jlen; j++) {
        const charBox = this.__charBounds[i][j];
        currentColor = this.getValueOfPropertyAt(i, j, 'textBackgroundColor');
        if (currentColor !== lastColor) {
          fill(lastColor, boxStart, boxWidth);
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastColor = currentColor;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      fill(currentColor, boxStart, boxWidth);
      lineTopOffset += heightOfLine;
    }
    ctx.fillStyle = originalFill;
    this._removeShadow(ctx);
  };

  const baseDecoration = T._renderTextDecoration;
  T._renderTextDecoration = function (ctx: any, type: string) {
    if (!this.paragraphSpacing || this.path) return baseDecoration.call(this, ctx, type);
    if (!this[type] && !this.styleHas(type)) return;
    const leftOffset = this._getLeftOffset();
    let topOffset = this._getTopOffset();
    const charSpacing = this._getWidthOfCharSpacing();
    const offsetY = this.offsets[type];
    const thickness = this.fontSize / 15;
    for (let i = 0, len = this._textLines.length; i < len; i++) {
      const heightOfLine = this.getHeightOfLine(i);
      if (!this[type] && !this.styleHas(type, i)) {
        topOffset += heightOfLine;
        continue;
      }
      const gap = this._mtParaGap(i);
      const line = this._textLines[i];
      const maxHeight = (heightOfLine - gap) / this.lineHeight;
      const lineLeftOffset = this._getLineLeftOffset(i);
      let boxStart = 0;
      let boxWidth = 0;
      let lastDecoration = this.getValueOfPropertyAt(i, 0, type);
      let lastFill = this.getValueOfPropertyAt(i, 0, 'fill');
      const top = topOffset + gap + maxHeight * (1 - this._fontSizeFraction);
      let size = this.getHeightOfChar(i, 0);
      let dy = this.getValueOfPropertyAt(i, 0, 'deltaY');
      let currentDecoration: any = lastDecoration;
      let currentFill: any = lastFill;
      for (let j = 0, jlen = line.length; j < jlen; j++) {
        const charBox = this.__charBounds[i][j];
        currentDecoration = this.getValueOfPropertyAt(i, j, type);
        currentFill = this.getValueOfPropertyAt(i, j, 'fill');
        const _size = this.getHeightOfChar(i, j);
        const _dy = this.getValueOfPropertyAt(i, j, 'deltaY');
        if ((currentDecoration !== lastDecoration || currentFill !== lastFill || _size !== size || _dy !== dy) && boxWidth > 0) {
          let drawStart = leftOffset + lineLeftOffset + boxStart;
          if (this.direction === 'rtl') drawStart = this.width - drawStart - boxWidth;
          if (lastDecoration && lastFill) {
            ctx.fillStyle = lastFill;
            ctx.fillRect(drawStart, top + offsetY * size + dy, boxWidth, thickness);
          }
          boxStart = charBox.left;
          boxWidth = charBox.width;
          lastDecoration = currentDecoration;
          lastFill = currentFill;
          size = _size;
          dy = _dy;
        } else {
          boxWidth += charBox.kernedWidth;
        }
      }
      let drawStart = leftOffset + lineLeftOffset + boxStart;
      if (this.direction === 'rtl') drawStart = this.width - drawStart - boxWidth;
      ctx.fillStyle = currentFill;
      if (currentDecoration && currentFill) ctx.fillRect(drawStart, top + offsetY * size + dy, boxWidth - charSpacing, thickness);
      topOffset += heightOfLine;
    }
    this._removeShadow(ctx);
  };

  // The blinking cursor sits next to the letters, below the gap.
  const IT = F.IText?.prototype;
  if (IT && IT.renderCursor) {
    const baseCursor = IT.renderCursor;
    IT.renderCursor = function (boundaries: any, ctx: any) {
      if (!this.paragraphSpacing) return baseCursor.call(this, boundaries, ctx);
      const lineIndex = this.get2DCursorLocation().lineIndex;
      const gap = this._mtParaGap(lineIndex);
      if (!gap) return baseCursor.call(this, boundaries, ctx);
      const shift = gap - ((1 - this._fontSizeFraction) * gap) / this.lineHeight;
      return baseCursor.call(this, { ...boundaries, topOffset: boundaries.topOffset + shift }, ctx);
    };
  }
}
