'use client';

// Design actions used by the editor's panels and contextual toolbar:
// shapes, frames and masks, text styles and effects, fills/gradients,
// shadows, photo adjustments, crop mode, backgrounds and drawing.
// Every action records exactly one undo step.

import { useCallback, useRef, useState } from 'react';
import { createShape, defaultShapeBox, updateShapeParams } from '@/lib/editor/shapes';
import { ShapeKind, ShapeParams } from '@/lib/editor/shapePaths';
import {
  createFrame,
  fillFrame,
  isFramed,
  placeImageInShape,
  releaseFrame,
  beginCrop,
  endCrop,
  cancelCrop,
  setCropAspect,
  keepCovering,
  CropSession,
  FrameKind,
  frameGeometry,
} from '@/lib/editor/frames';
import { GradientSpec, toFabricGradient } from '@/lib/editor/gradients';
import { applyTextFx, TextFx } from '@/lib/editor/textEffects';
import { Adjust, applyAdjust, readAdjust } from '@/lib/editor/imageAdjust';

export interface PageRect {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Ctx {
  fabricCanvasRef: React.MutableRefObject<any>;
  pushHistory: () => void;
  getActivePage: () => PageRect;
  refreshLayers: () => void;
  bumpSel: () => void;
  notify: (msg: string) => void;
  recomputeMembership: () => void;
  backgroundUploadAsset: (img: any) => void;
}

export interface TextPreset {
  id: string;
  label: string;
  text: string;
  fontFamily: string;
  fontSize: number; // relative to a 1080px page
  fontWeight?: string | number;
  fontStyle?: string;
  charSpacing?: number;
  lineHeight?: number;
  fill?: string;
  textAlign?: string;
  upper?: boolean;
  fx?: Partial<TextFx>;
  gradient?: GradientSpec;
}

const F_ = () => (typeof window !== 'undefined' ? (window as any).fabric : null);

const isText = (o: any) => !!o && (o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');

export function useEditorFeatures(ctx: Ctx) {
  const ctxRef = useRef(ctx);
  ctxRef.current = ctx;
  const [cropping, setCropping] = useState<{ aspect: number | null } | null>(null);
  const cropRef = useRef<{ session: CropSession; snapshot: any } | null>(null);

  const canvas = () => ctxRef.current.fabricCanvasRef.current;
  const done = (obj?: any, select = true) => {
    const c = canvas();
    if (!c) return;
    if (obj && select) c.setActiveObject(obj);
    ctxRef.current.recomputeMembership();
    ctxRef.current.refreshLayers();
    c.requestRenderAll();
    ctxRef.current.bumpSel();
    ctxRef.current.pushHistory();
  };

  // ---------------- shapes ----------------
  const addShape = useCallback((kind: ShapeKind, at?: { x: number; y: number }) => {
    const F = F_();
    const c = canvas();
    if (!F || !c) return;
    const page = ctxRef.current.getActivePage();
    const obj = createShape(F, kind, defaultShapeBox(kind, page, at));
    c.add(obj);
    done(obj);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setShapeParams = useCallback((patch: ShapeParams) => {
    const F = F_();
    const c = canvas();
    const o = c?.getActiveObject();
    if (!F || !o || !o.__shape || o.locked) return;
    updateShapeParams(F, o, patch);
    done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- frames & masks ----------------
  const addFrame = useCallback(async (kind: FrameKind, at?: { x: number; y: number }) => {
    const F = F_();
    const c = canvas();
    if (!F || !c) return;
    const page = ctxRef.current.getActivePage();
    const size = Math.min(page.width, page.height) * 0.42;
    const w = kind === 'arch' ? size * 0.8 : size;
    const h = kind === 'arch' ? size : size;
    const cx = at ? at.x : page.x + page.width / 2;
    const cy = at ? at.y : page.y + page.height / 2;
    const frame = await createFrame(F, kind, { left: cx - w / 2, top: cy - h / 2, width: w, height: h });
    c.add(frame);
    done(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fills (or replaces the photo in) the selected image/frame, keeping the
  // frame's size, position, shape, rotation and effects.
  const putImageInto = useCallback(async (target: any, dataUrl: string) => {
    const F = F_();
    if (!F || !target || target.locked) return;
    try {
      delete target.__originalSrc;
      delete target.__cropRect;
      delete target.__photoEdits;
      target.__assetId = undefined;
      await fillFrame(F, target, dataUrl);
      ctxRef.current.backgroundUploadAsset(target);
      done(target);
    } catch {
      ctxRef.current.notify("That image couldn't be opened. Try a JPG or PNG file.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Place image in shape": the selected image and a shape (or the shape
  // under a dropped image) become one frame.
  const placeInShape = useCallback(async (img: any, shape: any) => {
    const F = F_();
    const c = canvas();
    if (!F || !c || !img || !shape || img.type !== 'image') return;
    c.discardActiveObject();
    const index = c.getObjects().indexOf(shape);
    await placeImageInShape(F, img, shape);
    c.remove(shape);
    if (index >= 0) c.moveTo(img, Math.min(index, c.getObjects().length - 1));
    done(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Masks the selected image with a shape from the library.
  const maskWithShape = useCallback(async (kind: FrameKind) => {
    const F = F_();
    const c = canvas();
    const img = c?.getActiveObject();
    if (!F || !img || img.type !== 'image' || img.locked) return;
    const geo = isFramed(img) ? frameGeometry(F, img) : { center: img.getCenterPoint(), width: img.getScaledWidth(), height: img.getScaledHeight(), angle: img.angle || 0 };
    const side = kind === 'rect' ? null : Math.min(geo.width, geo.height);
    const w = side ?? geo.width;
    const h = side ?? geo.height;
    const shape = createShape(F, (kind === 'custom' ? 'rect' : kind) as ShapeKind, { left: geo.center.x - w / 2, top: geo.center.y - h / 2, width: w, height: h });
    shape.set({ angle: geo.angle });
    shape.setPositionByOrigin(geo.center, 'center', 'center');
    img.clipPath = null;
    await placeImageInShape(F, img, shape);
    done(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detachFromFrame = useCallback(() => {
    const c = canvas();
    const img = c?.getActiveObject();
    if (!img || img.type !== 'image' || img.locked) return;
    releaseFrame(img);
    done(img);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- crop / adjust photo inside frame ----------------
  const startCrop = useCallback((target?: any) => {
    const F = F_();
    const c = canvas();
    const img = target || c?.getActiveObject();
    if (!F || !img || img.type !== 'image' || img.locked || cropRef.current) return;
    const snapshot = { left: img.left, top: img.top, scaleX: img.scaleX, scaleY: img.scaleY, angle: img.angle };
    const session = beginCrop(F, img);
    cropRef.current = { session, snapshot };
    c.setActiveObject(img);
    setCropping({ aspect: null });
    c.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCropRatio = useCallback((aspect: number | null) => {
    const cur = cropRef.current;
    const c = canvas();
    if (!cur || !c) return;
    const img = cur.session.img;
    setCropAspect(cur.session, aspect, aspect === null ? { w: img.width, h: img.height } : undefined);
    keepCovering(cur.session);
    setCropping({ aspect });
    c.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetCrop = useCallback(() => {
    const cur = cropRef.current;
    const c = canvas();
    if (!cur || !c) return;
    const img = cur.session.img;
    // The whole photo, unrotated relative to the frame.
    img.set({ angle: cur.session.geo.angle });
    cur.session.geo = { ...cur.session.geo, width: img.getScaledWidth(), height: img.getScaledHeight(), center: img.getCenterPoint() };
    keepCovering(cur.session);
    setCropping({ aspect: null });
    c.requestRenderAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finishCrop = useCallback((apply = true) => {
    const F = F_();
    const c = canvas();
    const cur = cropRef.current;
    if (!F || !c || !cur) return;
    cropRef.current = null;
    setCropping(null);
    if (apply) {
      endCrop(F, cur.session);
      done(cur.session.img);
    } else {
      cancelCrop(cur.session, cur.snapshot);
      c.requestRenderAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keeps the photo covering the frame while it's dragged/scaled in crop mode.
  const onCropTransform = useCallback(() => {
    const cur = cropRef.current;
    if (!cur) return;
    keepCovering(cur.session);
  }, []);

  // ---------------- text ----------------
  const addTextPreset = useCallback((preset: TextPreset, at?: { x: number; y: number }) => {
    const F = F_();
    const c = canvas();
    if (!F || !c) return;
    const page = ctxRef.current.getActivePage();
    const k = Math.max(page.width, page.height) / 1080;
    const size = Math.round(preset.fontSize * k);
    const width = Math.min(page.width * 0.86, Math.max(size * 6, page.width * 0.6));
    const t: any = new F.Textbox(preset.upper ? preset.text.toUpperCase() : preset.text, {
      width,
      fontSize: size,
      fontFamily: preset.fontFamily,
      fontWeight: preset.fontWeight ?? 'normal',
      fontStyle: preset.fontStyle ?? 'normal',
      charSpacing: preset.charSpacing ?? 0,
      lineHeight: preset.lineHeight ?? 1.16,
      fill: preset.gradient ? toFabricGradient(F, preset.gradient) : preset.fill ?? '#09090B',
      textAlign: preset.textAlign ?? 'center',
    });
    const cx = at ? at.x : page.x + page.width / 2;
    const cy = at ? at.y : page.y + page.height / 2;
    t.setPositionByOrigin(new F.Point(cx, cy), 'center', 'center');
    t.name = preset.label;
    c.add(t);
    if (preset.fx) applyTextFx(F, t, { effect: 'none', color: '#09090B', amount: 50, curve: 0, wave: 0, ...preset.fx });
    done(t);
    const fonts: any = (document as any).fonts;
    if (fonts?.load) {
      const spec = `${preset.fontStyle === 'italic' ? 'italic ' : ''}${preset.fontWeight ?? 400} 32px "${preset.fontFamily}"`;
      fonts
        .load(spec)
        .then(() => {
          t.initDimensions?.();
          t.dirty = true;
          c.requestRenderAll();
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTextFx = useCallback((fx: TextFx, record = true) => {
    const F = F_();
    const c = canvas();
    const o = c?.getActiveObject();
    if (!F || !o || o.locked) return;
    const targets: any[] = o.type === 'activeSelection' ? o.getObjects().filter(isText) : isText(o) ? [o] : [];
    targets.forEach((t) => applyTextFx(F, t, fx));
    if (!targets.length) return;
    if (record) done(o);
    else {
      c.requestRenderAll();
      ctxRef.current.bumpSel();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- fills, borders, shadows ----------------
  const forEachTarget = (fn: (o: any) => void) => {
    const c = canvas();
    const o = c?.getActiveObject();
    if (!o || o.locked) return null;
    const walk = (x: any) => {
      if ((x.type === 'group' || x.type === 'activeSelection') && x.getObjects) x.getObjects().forEach(walk);
      else if (!x.locked) fn(x);
    };
    walk(o);
    if (o.type === 'group') o.dirty = true;
    return o;
  };

  const setFill = useCallback((fill: string | GradientSpec | null) => {
    const F = F_();
    if (!F) return;
    const o = forEachTarget((x) => {
      if (x.type === 'image') return;
      if (fill && typeof fill === 'object') x.set({ fill: toFabricGradient(F, fill) });
      else x.set({ fill: fill ?? '' });
      x.dirty = true;
    });
    if (o) done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setStroke = useCallback((patch: { stroke?: string | null; strokeWidth?: number; dash?: 'solid' | 'dashed' | 'dotted' }) => {
    const o = forEachTarget((x) => {
      if (isText(x) && x.__fxStroke) return; // text outline is an effect
      const next: any = {};
      if (patch.stroke !== undefined) next.stroke = patch.stroke ?? '';
      if (patch.strokeWidth !== undefined) next.strokeWidth = patch.strokeWidth;
      if (patch.dash) {
        const w = Math.max(1, patch.strokeWidth ?? x.strokeWidth ?? 2);
        next.strokeDashArray = patch.dash === 'dashed' ? [w * 3, w * 2] : patch.dash === 'dotted' ? [0.01, w * 2] : null;
        next.strokeLineCap = patch.dash === 'dotted' ? 'round' : x.strokeLineCap;
      }
      if (next.strokeWidth && !x.stroke && patch.stroke === undefined) next.stroke = '#09090B';
      next.strokeUniform = true;
      x.set(next);
      x.dirty = true;
    });
    if (o) done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setShadow = useCallback((s: { color: string; blur: number; x: number; y: number } | null) => {
    const F = F_();
    if (!F) return;
    const c = canvas();
    const o = c?.getActiveObject();
    if (!o || o.locked) return;
    o.set({ shadow: s ? new F.Shadow({ color: s.color, blur: s.blur, offsetX: s.x, offsetY: s.y }) : null });
    o.dirty = true;
    done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setCornerRadius = useCallback((r: number) => {
    const F = F_();
    const c = canvas();
    const o = c?.getActiveObject();
    if (!F || !o || o.locked) return;
    if (o.type === 'rect') {
      const sx = Math.abs(o.scaleX || 1);
      const sy = Math.abs(o.scaleY || 1);
      o.set({ rx: r / sx, ry: r / sy });
    } else if (o.__shape && (o.__shape.kind === 'rect' || o.__shape.kind === 'roundRect')) {
      if (o.__shape.kind === 'rect') o.__shape = { ...o.__shape, kind: 'roundRect' };
      updateShapeParams(F, o, { radius: r });
    } else if (o.type === 'image' && o.clipPath && o.clipPath.type === 'rect') {
      const s = Math.abs(o.clipPath.scaleX || 1);
      o.clipPath.set({ rx: r / (Math.abs(o.scaleX || 1) * s), ry: r / (Math.abs(o.scaleY || 1) * s) });
      o.dirty = true;
    } else return;
    done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- images ----------------
  const adjustImage = useCallback((a: Adjust, record = true) => {
    const F = F_();
    const c = canvas();
    const o = c?.getActiveObject();
    if (!F || !o || o.type !== 'image' || o.locked) return;
    applyAdjust(F, o, a);
    c.requestRenderAll();
    if (record) done(o);
    else ctxRef.current.bumpSel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flip = useCallback((axis: 'x' | 'y') => {
    const c = canvas();
    const o = c?.getActiveObject();
    if (!o || o.locked) return;
    if (axis === 'x') o.set({ flipX: !o.flipX });
    else o.set({ flipY: !o.flipY });
    done(o);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- page background ----------------
  const setPageBackground = useCallback((bg: { color?: string | null; gradient?: GradientSpec; imageUrl?: string; pattern?: string }, record = true) => {
    const F = F_();
    const c = canvas();
    if (!F || !c) return;
    const page = ctxRef.current.getActivePage();
    const rect = c.getObjects().find((o: any) => o.__isArtboard && (!page.id || o.__artboardId === page.id));
    if (!rect) return;
    const finish = () => {
      rect.dirty = true;
      c.requestRenderAll();
      if (record) ctxRef.current.pushHistory();
      ctxRef.current.bumpSel();
    };
    if (bg.gradient) {
      rect.set({ fill: toFabricGradient(F, bg.gradient) });
      finish();
    } else if (bg.imageUrl || bg.pattern) {
      const url = bg.imageUrl || bg.pattern!;
      F.util.loadImage(
        url,
        (el: any) => {
          if (!el) {
            ctxRef.current.notify("That background couldn't be loaded.");
            return;
          }
          if (bg.pattern) {
            rect.set({ fill: new F.Pattern({ source: el, repeat: 'repeat' }) });
          } else {
            // Cover the page: scale the picture so it fills the whole page.
            const k = Math.max(rect.width / el.width, rect.height / el.height);
            const ox = (rect.width - el.width * k) / 2;
            const oy = (rect.height - el.height * k) / 2;
            rect.set({
              fill: new F.Pattern({ source: el, repeat: 'no-repeat', patternTransform: [k, 0, 0, k, ox, oy] }),
            });
          }
          finish();
        },
        null,
        'anonymous'
      );
    } else {
      rect.set({ fill: bg.color === null ? '' : bg.color ?? '#FFFFFF' });
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------- misc ----------------
  const setOpacity = useCallback((v: number, record = true) => {
    const c = canvas();
    const o = c?.getActiveObject();
    if (!o || o.locked) return;
    o.set({ opacity: Math.max(0, Math.min(1, v)) });
    c.requestRenderAll();
    ctxRef.current.bumpSel();
    if (record) ctxRef.current.pushHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const readImageAdjust = (o: any) => readAdjust(o);

  return {
    addShape,
    setShapeParams,
    addFrame,
    putImageInto,
    placeInShape,
    maskWithShape,
    detachFromFrame,
    startCrop,
    setCropRatio,
    resetCrop,
    finishCrop,
    onCropTransform,
    cropping,
    cropRef,
    addTextPreset,
    setTextFx,
    setFill,
    setStroke,
    setShadow,
    setCornerRadius,
    adjustImage,
    flip,
    setPageBackground,
    setOpacity,
    readImageAdjust,
  };
}
