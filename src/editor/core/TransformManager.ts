// ---------------------------------------------------------------------
// src/editor/core/TransformManager.ts
// Phase 1 scope: translating a whole layer (x/y position). Scale/rotate/
// skew/distort/perspective act on real drawable objects, which don't
// exist until the Move/shape/vector tools land in later phases — see
// docs/tool-capability-matrix.md. Wired through CommandManager so a drag
// is one undo step, not one per pointermove.
// ---------------------------------------------------------------------

import { Command, CommandManager } from './CommandManager';
import { DocumentModel } from './Document';

export class TransformManager {
  constructor(private getDocument: () => DocumentModel, private commandManager: CommandManager, private notify: () => void) {}

  // Called continuously during a drag for live preview — mutates
  // directly, bypassing CommandManager, exactly like a Command's own
  // execute() would but without pushing a history entry per frame.
  previewTranslate(layerId: string, x: number, y: number): void {
    const layer = this.getDocument().layers.find((l) => l.id === layerId);
    if (!layer) return;
    layer.x = x;
    layer.y = y;
    this.notify();
  }

  // Called once on pointerUp to commit the drag as a single undoable step.
  commitTranslate(layerId: string, fromX: number, fromY: number, toX: number, toY: number): void {
    if (fromX === toX && fromY === toY) return;
    const doc = this.getDocument();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const command: Command = {
      label: `Move Layer "${layer.name}"`,
      execute: () => {
        layer.x = toX;
        layer.y = toY;
        doc.document.updatedAt = new Date().toISOString();
        this.notify();
      },
      undo: () => {
        layer.x = fromX;
        layer.y = fromY;
        doc.document.updatedAt = new Date().toISOString();
        this.notify();
      },
      redo: () => {
        layer.x = toX;
        layer.y = toY;
        doc.document.updatedAt = new Date().toISOString();
        this.notify();
      },
    };
    // Already applied live via previewTranslate; execute() here just
    // re-applies the same end state so redo/undo have a correct command,
    // without visibly jumping the layer.
    this.commandManager.execute(command);
  }
}
