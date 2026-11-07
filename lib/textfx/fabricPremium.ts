// Draws the professional looks (lib/textfx/premium.ts) on live Fabric text:
// the text stays editable — the look is painted pass by pass every render.
// Installed once per Fabric module; designs reloaded later look the same
// because the look is saved in the object's __textFx.

import { isPremium, premiumPasses, premiumExtent, Paint } from './premium';

const gradCache = new Map<string, any>();
function fabricPaint(F: any, p: Paint): any {
  if (typeof p === 'string') return p;
  const key = JSON.stringify(p);
  let g = gradCache.get(key);
  if (!g) {
    const coords = p.dir === 'h' ? { x1: 0, y1: 0, x2: 1, y2: 0 } : p.dir === 'd' ? { x1: 0, y1: 0, x2: 1, y2: 1 } : { x1: 0, y1: 0, x2: 0, y2: 1 };
    g = new F.Gradient({ type: 'linear', gradientUnits: 'percentage', coords, colorStops: p.stops.map(([offset, color]) => ({ offset, color })) });
    gradCache.set(key, g);
  }
  return g;
}

const premiumOf = (o: any) => (o && o.__textFx && isPremium(o.__textFx.effect) ? o.__textFx : null);

export function installPremiumText(F: any) {
  if (!F || !F.Text || F.__mtPremiumText) return;
  F.__mtPremiumText = true;
  const proto = F.Text.prototype;
  const orig = proto._renderText;
  proto._renderText = function (ctx: CanvasRenderingContext2D) {
    const fx = premiumOf(this);
    if (!fx) return orig.call(this, ctx);
    const keep = { fill: this.fill, stroke: this.stroke, strokeWidth: this.strokeWidth, paintFirst: this.paintFirst, strokeLineJoin: this.strokeLineJoin };
    const m = ctx.getTransform();
    const scale = Math.hypot(m.a, m.b) || 1; // shadows ignore transforms: scale them by hand
    const size = this.fontSize || 40;
    try {
      for (const p of premiumPasses(fx.effect, fx.color || '#3B82F6', size)) {
        ctx.save();
        ctx.translate(p.dx, p.dy);
        ctx.globalAlpha *= p.alpha ?? 1;
        if (p.shadow) { ctx.shadowColor = p.shadow.color; ctx.shadowBlur = p.shadow.blur * scale; ctx.shadowOffsetX = (p.shadow.dx || 0) * scale; ctx.shadowOffsetY = (p.shadow.dy || 0) * scale; }
        else ctx.shadowColor = 'transparent';
        this.fill = p.fill ? fabricPaint(F, p.fill) : '';
        this.stroke = p.stroke && p.lineWidth ? fabricPaint(F, p.stroke) : null;
        this.strokeWidth = p.stroke && p.lineWidth ? p.lineWidth : 0;
        this.paintFirst = 'stroke';
        this.strokeLineJoin = 'round';
        orig.call(this, ctx);
        ctx.restore();
      }
    } finally {
      Object.assign(this, keep);
    }
  };
  // The look reaches outside the letters (3D depth, glow): draw directly,
  // not from the object's own (tight) cache.
  const origShould = proto.shouldCache;
  proto.shouldCache = function () {
    if (premiumOf(this)) { this.ownCaching = false; return false; }
    return origShould.call(this);
  };
}

/** Settings a premium look needs on the object itself (exports include the 3D depth and glow). */
export function premiumObjectProps(F: any, obj: any, look: string) {
  if (!isPremium(look)) return {};
  const { depth, glow } = premiumExtent(look, obj.fontSize || 40);
  // A see-through shadow only widens what exports capture; it draws nothing.
  return { shadow: new F.Shadow({ color: 'rgba(0,0,0,0)', blur: glow, offsetX: depth / 2, offsetY: depth / 2 }), objectCaching: false };
}
