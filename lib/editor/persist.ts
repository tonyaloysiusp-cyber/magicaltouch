// What survives saving, reloading and undo/redo.
//
// Fabric only serializes its own built-in properties. Everything this app
// stores on an object (names, lock state, artboard membership, photo
// edits, frames, text effects…) has to be listed here, and the same list
// is used for saves AND undo snapshots so the two can never drift apart.
export const PERSIST_PROPS = [
  'name',
  'locked',
  'visible',
  'isVectorPath',
  'clipPath',
  '__id',
  '__uid',
  '__lockRatio',
  '__isArtboard',
  '__artboardId',
  '__print',
  '__originalSrc',
  '__photoEdits',
  '__cropRect',
  '__isGuide',
  '__guideAxis',
  '__assetId',
  '__maskSourcePath',
  // Image frames / placeholders (lib/editor/frames.ts)
  '__frame',
  // Shape library metadata (lib/editor/shapes.ts)
  '__shape',
  // Text effects (lib/editor/textEffects.ts)
  '__textFx',
  '__fxStroke',
  '__fxHighlight',
  '__fxHollowFill',
  '__preCurveWidth',
  // Image adjustments kept as live filters (lib/editor/imageAdjust.ts)
  '__adjust',
  // Free-drawing strokes (brush/marker/highlighter)
  '__brush',
  // Page-number placeholder text
  '__pageNumber',
  // Text frames and threaded stories (lib/editor/textFrames.ts)
  '__frameH',
  '__storyId',
  '__storyIndex',
  '__storyText',
  '__storyOverflow',
  '__flowSep',
  '__styleSig',
  // Space between paragraphs (lib/editor/paragraphSpacing.ts)
  'paragraphSpacing',
  // Text box behaviour (auto-fit)
  '__autoFit',
  // Fabric's own interaction locks are not serialized by default.
  'lockMovementX',
  'lockMovementY',
  'lockScalingX',
  'lockScalingY',
  'lockRotation',
];

// Temporary on-canvas helpers (tool previews, anchor handles, drafts).
// They must never reach history, saves, layers, snapping or exports.
export function isHelperObject(o: any): boolean {
  return !!(
    o &&
    (o.__isAnchorHandle ||
      o.__isPenPreview ||
      o.__isShapeDraft ||
      o.__isArtboardDraft ||
      o.__isPrintMark ||
      o.__isHelper)
  );
}

// Real artwork the user made (not artboards, guides or helpers).
export function isArtwork(o: any): boolean {
  return !!o && !o.__isArtboard && !o.__isGuide && !isHelperObject(o);
}

// Locked objects stay clickable (so they can be selected, right-clicked
// and unlocked) but can't be moved, resized or rotated.
export function lockProps(locked: boolean) {
  return {
    locked,
    lockMovementX: locked,
    lockMovementY: locked,
    lockScalingX: locked,
    lockScalingY: locked,
    lockRotation: locked,
    hasControls: !locked,
  };
}

// Re-applies everything that depends on stored flags after a load or an
// undo/redo: Fabric doesn't restore these, so locked objects would
// otherwise become draggable again and artboards selectable.
export function applyStoredLocks(canvas: any) {
  const visit = (o: any) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach(visit);
    if (o.locked) o.set(lockProps(true));
    // "Keep proportions": no side handles, so it can't be stretched.
    if (o.__lockRatio && o.setControlsVisibility && o.type !== 'textbox') o.setControlsVisibility({ ml: false, mr: false, mt: false, mb: false });
  };
  canvas.getObjects().forEach((o: any) => {
    if (o.__isArtboard) {
      o.set({ selectable: false, evented: false, hasControls: false, lockRotation: true });
      return;
    }
    if (isHelperObject(o)) return;
    visit(o);
  });
}

// Curved text keeps its baseline as a path. Text boxes don't rebuild that
// path by themselves when a design is opened, so do it here.
export function reviveTextPaths(F: any, canvas: any) {
  if (!F) return;
  const visit = (o: any) => {
    if (o.type === 'group' && o.getObjects) o.getObjects().forEach(visit);
    if ((o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') && o.path && !(o.path instanceof F.Path)) {
      const raw = o.path;
      const d = Array.isArray(raw.path) ? raw.path : null;
      if (d) {
        o.set({ path: new F.Path(d, { visible: false, fill: '', stroke: '' }) });
        if (o.initDimensions) o.initDimensions();
        o.setCoords();
      } else {
        o.set({ path: null });
      }
    }
  };
  canvas.getObjects().forEach(visit);
}
