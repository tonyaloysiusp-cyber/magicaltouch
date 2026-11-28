// Fabric 5 renders on a timer (requestRenderAll). If a canvas is disposed —
// page closed, preview thrown away — before that timer fires, Fabric calls
// clearRect on a context that no longer exists and the browser reports
// "Cannot read properties of null (reading 'clearRect')". Skip those renders.
export function makeFabricSafe(F: any) {
  const P = F?.StaticCanvas?.prototype;
  if (!P || P.__mtSafe) return F;
  const clear = P.clearContext;
  P.clearContext = function (ctx: any) { if (!ctx) return this; return clear.call(this, ctx); };
  const render = P.renderCanvas;
  P.renderCanvas = function (ctx: any, objects: any) { if (!ctx || this.disposed) return; return render.call(this, ctx, objects); };
  const top = F.Canvas?.prototype?.renderTopLayer;
  if (top) F.Canvas.prototype.renderTopLayer = function (ctx: any) { if (!ctx) return; return top.call(this, ctx); };
  P.__mtSafe = true;
  return F;
}
