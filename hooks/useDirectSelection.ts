'use client';

import { useCallback, useRef } from 'react';
import { ANCHOR_HANDLE_SIZE } from '@/lib/editor/types';

interface Args {
  fabricCanvasRef: React.MutableRefObject<any>;
  onAnchorMoved: () => void;
}

export function useDirectSelection({ fabricCanvasRef, onAnchorMoved }: Args) {
  const stateRef = useRef<{ pathObj: any | null; circles: any[] }>({ pathObj: null, circles: [] });

  const clearHandles = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const state = stateRef.current;
    if (canvas && state.circles.length) {
      state.circles.forEach((c) => canvas.remove(c));
      canvas.requestRenderAll();
    }
    state.pathObj = null;
    state.circles = [];
  }, [fabricCanvasRef]);

  const getAnchorsInCanvasSpace = (pathObj: any, fabricMod: any) => {
    const F: any = fabricMod.fabric;
    const commands: any[] = pathObj.path || [];
    const matrix: any = pathObj.calcTransformMatrix();
    const offset: any = pathObj.pathOffset || { x: 0, y: 0 };
    const pts: { x: number; y: number; commandIndex: number }[] = [];

    commands.forEach((cmd: any[], idx: number) => {
      const type = cmd[0];
      let localX: number | null = null;
      let localY: number | null = null;
      if (type === 'M' || type === 'L') {
        localX = cmd[1];
        localY = cmd[2];
      } else if (type === 'C') {
        localX = cmd[5];
        localY = cmd[6];
      } else if (type === 'Q') {
        localX = cmd[3];
        localY = cmd[4];
      }
      if (localX === null || localY === null) return;
      const localPoint: any = new F.Point(localX - offset.x, localY - offset.y);
      const canvasPoint: any = F.util.transformPoint(localPoint, matrix);
      pts.push({ x: canvasPoint.x, y: canvasPoint.y, commandIndex: idx });
    });

    return pts;
  };

  const renderHandles = useCallback(
    (pathObj: any) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        clearHandles();
        const anchors = getAnchorsInCanvasSpace(pathObj, mod);
        const state = stateRef.current;
        state.pathObj = pathObj;

        anchors.forEach((pt) => {
          const circle: any = new F.Circle({
            left: pt.x,
            top: pt.y,
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
          circle.__commandIndex = pt.commandIndex;
          circle.__anchorPathObj = pathObj;

          circle.on('moving', () => {
            const canvasNow = fabricCanvasRef.current;
            if (!canvasNow) return;
            const targetPath: any = circle.__anchorPathObj;
            const cmdIdx: number = circle.__commandIndex;
            const invMatrix: any = F.util.invertTransform(targetPath.calcTransformMatrix());
            const localPoint: any = F.util.transformPoint(new F.Point(circle.left, circle.top), invMatrix);
            const offset: any = targetPath.pathOffset || { x: 0, y: 0 };
            const newLocalX = localPoint.x + offset.x;
            const newLocalY = localPoint.y + offset.y;

            const cmd: any[] = targetPath.path[cmdIdx];
            if (cmd[0] === 'M' || cmd[0] === 'L') {
              cmd[1] = newLocalX;
              cmd[2] = newLocalY;
            } else if (cmd[0] === 'C') {
              cmd[5] = newLocalX;
              cmd[6] = newLocalY;
            } else if (cmd[0] === 'Q') {
              cmd[3] = newLocalX;
              cmd[4] = newLocalY;
            }
            targetPath.dirty = true;
            targetPath.setCoords();
            canvasNow.requestRenderAll();
          });

          circle.on('mouseup', () => onAnchorMoved());

          canvas.add(circle);
          state.circles.push(circle);
        });

        canvas.requestRenderAll();
      });
    },
    [fabricCanvasRef, clearHandles, onAnchorMoved]
  );

  return { stateRef, clearHandles, renderHandles };
}
