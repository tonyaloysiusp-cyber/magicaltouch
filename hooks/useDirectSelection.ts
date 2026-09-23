'use client';

import { useCallback, useRef } from 'react';
import { ANCHOR_HANDLE_SIZE } from '@/lib/editor/types';
import { splitCubicBezier, snapAngleTo45 } from '@/lib/editor/geometry';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  onAnchorMoved: () => void;
}

// A command's own "end point", in the path's raw (pre-pathOffset) coordinate
// space — the point every command type ultimately draws to.
function commandEndPoint(cmd: any[]): { x: number; y: number } | null {
  const type = cmd[0];
  if (type === 'M' || type === 'L') return { x: cmd[1], y: cmd[2] };
  if (type === 'C') return { x: cmd[5], y: cmd[6] };
  if (type === 'Q') return { x: cmd[3], y: cmd[4] };
  return null;
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useDirectSelection({ fabricCanvasRef, onAnchorMoved }: Args) {
  const stateRef = useRef<{
    pathObj: any | null;
    circles: any[]; // everything added to canvas by renderHandles, for cleanup
    handleLinks: { handle: any; anchor: any }[]; // for drawing connector lines
  }>({ pathObj: null, circles: [], handleLinks: [] });

  const clearHandles = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const state = stateRef.current;
    if (canvas && state.circles.length) {
      state.circles.forEach((c) => canvas.remove(c));
      canvas.requestRenderAll();
    }
    if (canvas) canvas.preserveObjectStacking = false;
    state.pathObj = null;
    state.circles = [];
    state.handleLinks = [];
  }, [fabricCanvasRef]);

  // Recomputes width/height/pathOffset/left/top from the current .path
  // commands. Fabric only does this automatically when a Path is first
  // constructed — after we mutate .path in place (move/add/remove/reshape
  // an anchor) we have to call it ourselves, or the object's bounding box
  // and canvas position silently drift out of sync with what's drawn.
  const recalcPathGeometry = (F: any, pathObj: any) => {
    F.Polyline.prototype._setPositionDimensions.call(pathObj, {});
    pathObj.setCoords();
  };

  const commandPointToWorld = (F: any, pathObj: any, raw: { x: number; y: number }) => {
    const offset = pathObj.pathOffset || { x: 0, y: 0 };
    const local = new F.Point(raw.x - offset.x, raw.y - offset.y);
    return F.util.transformPoint(local, pathObj.calcTransformMatrix());
  };

  const worldPointToCommand = (F: any, pathObj: any, world: { x: number; y: number }) => {
    const offset = pathObj.pathOffset || { x: 0, y: 0 };
    const inv = F.util.invertTransform(pathObj.calcTransformMatrix());
    const local: any = F.util.transformPoint(new F.Point(world.x, world.y), inv);
    return { x: local.x + offset.x, y: local.y + offset.y };
  };

  // Toggles the anchor at commandIndex between a sharp corner (handles
  // collapsed onto the anchor) and a smooth point (handles pushed out
  // along a shared tangent estimated from the neighboring anchors).
  const togglePointType = (F: any, pathObj: any, idx: number) => {
    const cmds = pathObj.path;
    const cmd = cmds[idx];
    const anchor = commandEndPoint(cmd);
    if (!cmd || !anchor) return;

    const nextCmd = cmds[idx + 1];
    const prevCmd = idx > 0 ? cmds[idx - 1] : null;
    const hasIncoming = cmd[0] === 'C';
    const hasOutgoing = !!nextCmd && nextCmd[0] === 'C';
    const EPS = 0.75;

    const incomingLen = hasIncoming ? dist({ x: cmd[3], y: cmd[4] }, anchor) : 0;
    const outgoingLen = hasOutgoing ? dist({ x: nextCmd[1], y: nextCmd[2] }, anchor) : 0;
    const isSmooth = incomingLen > EPS || outgoingLen > EPS;

    if (isSmooth) {
      if (hasIncoming) {
        cmd[3] = anchor.x;
        cmd[4] = anchor.y;
      }
      if (hasOutgoing) {
        nextCmd[1] = anchor.x;
        nextCmd[2] = anchor.y;
      }
    } else {
      const prevAnchor = prevCmd ? commandEndPoint(prevCmd) : null;
      const nextAnchor = nextCmd ? commandEndPoint(nextCmd) : null;
      let dir = { x: 1, y: 0 };
      if (prevAnchor && nextAnchor) dir = { x: nextAnchor.x - prevAnchor.x, y: nextAnchor.y - prevAnchor.y };
      else if (nextAnchor) dir = { x: nextAnchor.x - anchor.x, y: nextAnchor.y - anchor.y };
      else if (prevAnchor) dir = { x: anchor.x - prevAnchor.x, y: anchor.y - prevAnchor.y };
      const mag = Math.hypot(dir.x, dir.y) || 1;
      const ux = dir.x / mag;
      const uy = dir.y / mag;
      const inLen = prevAnchor ? dist(anchor, prevAnchor) / 3 : 30;
      const outLen = nextAnchor ? dist(anchor, nextAnchor) / 3 : 30;
      if (hasIncoming) {
        cmd[3] = anchor.x - ux * inLen;
        cmd[4] = anchor.y - uy * inLen;
      }
      if (hasOutgoing) {
        nextCmd[1] = anchor.x + ux * outLen;
        nextCmd[2] = anchor.y + uy * outLen;
      }
    }
    pathObj.dirty = true;
    recalcPathGeometry(F, pathObj);
  };

  // Splits the C command at commandIndex (the segment ending at that anchor)
  // into two real bezier halves, inserting a brand-new anchor exactly at the
  // curve's midpoint — the shape doesn't change, only the anchor count does.
  const insertAnchorOnSegment = (F: any, pathObj: any, commandIndex: number) => {
    const cmds = pathObj.path;
    const cmd = cmds[commandIndex];
    const prevCmd = cmds[commandIndex - 1];
    if (!cmd || !prevCmd || cmd[0] !== 'C') return;
    const p0 = commandEndPoint(prevCmd);
    if (!p0) return;
    const p1 = { x: cmd[1], y: cmd[2] };
    const p2 = { x: cmd[3], y: cmd[4] };
    const p3 = { x: cmd[5], y: cmd[6] };
    const { left, right } = splitCubicBezier(p0, p1, p2, p3, 0.5);
    const newCmd1 = ['C', left[1].x, left[1].y, left[2].x, left[2].y, left[3].x, left[3].y];
    const newCmd2 = ['C', right[1].x, right[1].y, right[2].x, right[2].y, right[3].x, right[3].y];
    cmds.splice(commandIndex, 1, newCmd1, newCmd2);
    pathObj.dirty = true;
    recalcPathGeometry(F, pathObj);
  };

  // Removes the anchor at commandIndex. The segment on either side of it
  // simply joins into one — this does not attempt to re-fit a new curve
  // through the gap, so a removed anchor's own curvature is lost rather
  // than approximated.
  const deleteAnchorAt = (F: any, pathObj: any, commandIndex: number): boolean => {
    const cmds = pathObj.path;
    if (cmds.length <= 2) return false;
    cmds.splice(commandIndex, 1);
    if (cmds.length && cmds[0][0] !== 'M') {
      const p = commandEndPoint(cmds[0]);
      if (p) cmds[0] = ['M', p.x, p.y];
    }
    pathObj.dirty = true;
    recalcPathGeometry(F, pathObj);
    return true;
  };

  const renderHandles = useCallback(
    (pathObj: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        clearHandles();
        // Fabric's default hit-testing returns the active object immediately
        // for any click inside its bounds, before ever checking objects
        // stacked on top of it — which would swallow every click on these
        // anchor/handle/midpoint circles, since the path they belong to is
        // the active object for as long as we're editing it.
        canvas.preserveObjectStacking = true;
        const state = stateRef.current;
        state.pathObj = pathObj;

        const cmds: any[] = pathObj.path || [];
        const anchorCircleByIndex = new Map<number, any>();

        // Anchor points — one per command with a real end point. Drag to
        // move; Alt/Option-click (no drag) toggles corner <-> smooth.
        cmds.forEach((cmd, idx) => {
          const raw = commandEndPoint(cmd);
          if (!raw) return;
          const world = commandPointToWorld(F, pathObj, raw);

          const circle: any = new F.Circle({
            left: world.x,
            top: world.y,
            radius: ANCHOR_HANDLE_SIZE / 2,
            fill: '#ffffff',
            stroke: '#3FA9E8',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            selectable: true,
            lockScalingX: true,
            lockScalingY: true,
            lockRotation: true,
          });
          circle.__isAnchorHandle = true;
          circle.__commandIndex = idx;
          circle.__anchorPathObj = pathObj;

          circle.on('mousedown', (opt: any) => {
            if (!opt.e.altKey) return;
            togglePointType(F, pathObj, idx);
            renderHandles(pathObj);
          });

          circle.on('moving', () => {
            const canvasNow = fabricCanvasRef.current;
            if (!canvasNow) return;
            const newRaw = worldPointToCommand(F, pathObj, { x: circle.left, y: circle.top });
            const targetCmd: any[] = pathObj.path[idx];
            if (targetCmd[0] === 'M' || targetCmd[0] === 'L') {
              targetCmd[1] = newRaw.x;
              targetCmd[2] = newRaw.y;
            } else if (targetCmd[0] === 'C') {
              targetCmd[5] = newRaw.x;
              targetCmd[6] = newRaw.y;
            } else if (targetCmd[0] === 'Q') {
              targetCmd[3] = newRaw.x;
              targetCmd[4] = newRaw.y;
            }
            pathObj.dirty = true;
            recalcPathGeometry(F, pathObj);
            canvasNow.requestRenderAll();
          });

          circle.on('mouseup', () => onAnchorMoved());

          canvas.add(circle);
          state.circles.push(circle);
          anchorCircleByIndex.set(idx, circle);
        });

        // Curve handles — only shown once they're a real (non-zero-length)
        // distance from their anchor, so plain corner points stay uncluttered.
        // Tracked in a map (keyed by "cmdIndex:role") so a smooth point's
        // two handle circles can find and visually move EACH OTHER live
        // while one is being dragged, not just the underlying path data.
        const handleCircleMap = new Map<string, any>();
        const HANDLE_EPS = 0.75;
        cmds.forEach((cmd, idx) => {
          if (cmd[0] !== 'C') return;
          const anchorRaw = commandEndPoint(cmd);
          if (!anchorRaw) return;

          // Incoming handle: this command's own c2, controls the curve
          // arriving at this command's anchor.
          const c2 = { x: cmd[3], y: cmd[4] };
          if (dist(c2, anchorRaw) > HANDLE_EPS) {
            addHandleCircle(F, canvas, state, pathObj, idx, 'in', c2, anchorCircleByIndex.get(idx), handleCircleMap);
          }

          // Outgoing handle: this command's own c1, controls the curve
          // leaving the PREVIOUS anchor.
          const prevIdx = idx - 1;
          const prevAnchorCmd = cmds[prevIdx];
          const prevAnchorRaw = prevAnchorCmd ? commandEndPoint(prevAnchorCmd) : null;
          const c1 = { x: cmd[1], y: cmd[2] };
          if (prevAnchorRaw && dist(c1, prevAnchorRaw) > HANDLE_EPS) {
            addHandleCircle(F, canvas, state, pathObj, idx, 'out', c1, anchorCircleByIndex.get(prevIdx), handleCircleMap);
          }
        });

        // Midpoint markers — click to insert a real anchor there via an
        // exact bezier subdivision (the shape doesn't change).
        cmds.forEach((cmd, idx) => {
          if (cmd[0] !== 'C') return;
          const prevCmd = cmds[idx - 1];
          const p0 = prevCmd ? commandEndPoint(prevCmd) : null;
          if (!p0) return;
          const p1 = { x: cmd[1], y: cmd[2] };
          const p2 = { x: cmd[3], y: cmd[4] };
          const p3 = commandEndPoint(cmd);
          if (!p3) return;
          const { midpoint } = splitCubicBezier(p0, p1, p2, p3, 0.5);
          const world = commandPointToWorld(F, pathObj, midpoint);

          const marker: any = new F.Rect({
            left: world.x,
            top: world.y,
            width: ANCHOR_HANDLE_SIZE - 2,
            height: ANCHOR_HANDLE_SIZE - 2,
            fill: '#ffffff',
            stroke: '#7ED33E',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
            hasControls: false,
            hasBorders: false,
            selectable: false,
            evented: true,
            hoverCursor: 'copy',
          });
          marker.__isAnchorHandle = true;
          marker.__isMidpointMarker = true;
          marker.on('mousedown', () => {
            insertAnchorOnSegment(F, pathObj, idx);
            renderHandles(pathObj);
            onAnchorMoved();
          });
          canvas.add(marker);
          state.circles.push(marker);
        });

        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef, clearHandles, onAnchorMoved]
  );

  function addHandleCircle(
    F: any,
    canvas: any,
    state: { circles: any[]; handleLinks: { handle: any; anchor: any }[] },
    pathObj: any,
    cmdIndex: number,
    role: 'in' | 'out',
    raw: { x: number; y: number },
    anchorCircle: any,
    handleCircleMap: Map<string, any>
  ) {
    const world = commandPointToWorld(F, pathObj, raw);
    const handle: any = new F.Circle({
      left: world.x,
      top: world.y,
      radius: (ANCHOR_HANDLE_SIZE - 3) / 2,
      fill: '#3FA9E8',
      stroke: '#ffffff',
      strokeWidth: 1.5,
      originX: 'center',
      originY: 'center',
      hasControls: false,
      hasBorders: false,
      selectable: true,
      lockScalingX: true,
      lockScalingY: true,
      lockRotation: true,
    });
    handle.__isAnchorHandle = true;
    handle.__isHandlePoint = true;
    handle.__anchorPathObj = pathObj;
    handle.__commandIndex = cmdIndex;
    handle.__role = role;

    // The anchor this handle belongs to, and where the OPPOSITE handle of
    // that same anchor lives (if any) — needed to keep a smooth point's
    // two handles collinear as one of them is dragged, the same way every
    // real vector editor does it.
    handleCircleMap.set(`${cmdIndex}:${role}`, handle);

    const cmds0 = pathObj.path;
    let anchorPoint: { x: number; y: number } | null = null;
    let oppCmd: any[] | null = null;
    let oppKeyX = 0;
    let oppKeyY = 0;
    let oppMapKey: string | null = null;
    if (role === 'in') {
      anchorPoint = commandEndPoint(cmds0[cmdIndex]);
      const nextCmd = cmds0[cmdIndex + 1];
      if (nextCmd && nextCmd[0] === 'C') {
        oppCmd = nextCmd;
        oppKeyX = 1;
        oppKeyY = 2;
        oppMapKey = `${cmdIndex + 1}:out`;
      }
    } else {
      const prevCmd = cmds0[cmdIndex - 1];
      anchorPoint = prevCmd ? commandEndPoint(prevCmd) : null;
      if (prevCmd && prevCmd[0] === 'C') {
        oppCmd = prevCmd;
        oppKeyX = 3;
        oppKeyY = 4;
        oppMapKey = `${cmdIndex - 1}:in`;
      }
    }
    // Decided once, when the drag starts: was this anchor smooth to begin
    // with? Only a point that was ALREADY smooth gets coupled — dragging
    // a handle on a genuine corner point never invents a relationship
    // that wasn't there.
    let smoothAtDragStart = false;
    handle.on('mousedown', () => {
      smoothAtDragStart = false;
      if (!oppCmd || !anchorPoint) return;
      const oppRaw = { x: oppCmd[oppKeyX], y: oppCmd[oppKeyY] };
      const oppLen = dist(oppRaw, anchorPoint);
      if (oppLen <= 0.75) return;
      const angleThis = Math.atan2(raw.y - anchorPoint.y, raw.x - anchorPoint.x);
      const angleOpp = Math.atan2(oppRaw.y - anchorPoint.y, oppRaw.x - anchorPoint.x);
      let diff = Math.abs(angleThis - angleOpp) % (Math.PI * 2);
      if (diff > Math.PI) diff = Math.PI * 2 - diff;
      smoothAtDragStart = Math.abs(diff - Math.PI) < 0.3; // ~17deg tolerance
    });

    handle.on('moving', (opt: any) => {
      const canvasNow = fabricCanvasRef.current;
      if (!canvasNow) return;
      let newRaw = worldPointToCommand(F, pathObj, { x: handle.left, y: handle.top });
      // Shift constrains the handle direction (relative to its own
      // anchor) to the nearest 45° increment — also snap the circle's
      // own on-screen position so what's drawn matches what's stored.
      if (opt?.e?.shiftKey && anchorPoint) {
        newRaw = snapAngleTo45(anchorPoint, newRaw);
        const snappedWorld = commandPointToWorld(F, pathObj, newRaw);
        handle.set({ left: snappedWorld.x, top: snappedWorld.y });
        handle.setCoords();
      }
      if (role === 'in') {
        pathObj.path[cmdIndex][3] = newRaw.x;
        pathObj.path[cmdIndex][4] = newRaw.y;
      } else {
        pathObj.path[cmdIndex][1] = newRaw.x;
        pathObj.path[cmdIndex][2] = newRaw.y;
      }

      // Alt/Option, held at any point during the drag, breaks the
      // coupling for this drag — the classic "independently edit one
      // side of a smooth point" gesture. Live-checked every move so
      // pressing/releasing Alt mid-drag toggles it immediately.
      const altHeld = !!opt?.e?.altKey;
      if (smoothAtDragStart && !altHeld && oppCmd && anchorPoint) {
        const oppRawNow = { x: oppCmd[oppKeyX], y: oppCmd[oppKeyY] };
        const oppLen = dist(oppRawNow, anchorPoint);
        const angleThis = Math.atan2(newRaw.y - anchorPoint.y, newRaw.x - anchorPoint.x);
        // Opposite handle keeps its OWN length (a "smooth" point locks
        // angle, not length — that's what distinguishes it from a
        // "symmetric" point) but rotates to stay exactly opposite.
        const newOppRaw = {
          x: anchorPoint.x - Math.cos(angleThis) * oppLen,
          y: anchorPoint.y - Math.sin(angleThis) * oppLen,
        };
        oppCmd[oppKeyX] = newOppRaw.x;
        oppCmd[oppKeyY] = newOppRaw.y;
        // Move the opposite handle's own on-screen circle too, or it
        // would sit frozen in its old spot until some later, unrelated
        // action happens to call renderHandles() again.
        const oppCircle = oppMapKey ? handleCircleMap.get(oppMapKey) : null;
        if (oppCircle) {
          const oppWorld = commandPointToWorld(F, pathObj, newOppRaw);
          oppCircle.set({ left: oppWorld.x, top: oppWorld.y });
          oppCircle.setCoords();
        }
      }

      pathObj.dirty = true;
      recalcPathGeometry(F, pathObj);
      canvasNow.requestRenderAll();
    });
    handle.on('mouseup', () => onAnchorMoved());

    canvas.add(handle);
    state.circles.push(handle);
    if (anchorCircle) state.handleLinks.push({ handle, anchor: anchorCircle });
  }

  // Deletes whichever anchor point is currently selected. Called from the
  // editor's Delete/Backspace handler instead of the generic "remove the
  // active object" path, since the active object here is a helper circle,
  // not real artwork.
  const deleteActiveAnchor = useCallback((): boolean => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !active.__isAnchorHandle || active.__isHandlePoint || active.__isMidpointMarker) return false;
    const pathObj = active.__anchorPathObj;
    const idx = active.__commandIndex;
    if (!pathObj || idx == null) return false;

    const F: any = (window as any).fabric;
    if (!F) return false;
    const removed = deleteAnchorAt(F, pathObj, idx);
    if (removed) {
      clearHandles();
      canvas.discardActiveObject();
      renderHandles(pathObj);
      onAnchorMoved();
    }
    return removed;
  }, [fabricCanvasRef, clearHandles, renderHandles, onAnchorMoved]);

  return { stateRef, clearHandles, renderHandles, deleteActiveAnchor };
}
