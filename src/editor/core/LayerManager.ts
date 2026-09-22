// ---------------------------------------------------------------------
// src/editor/core/LayerManager.ts
// Every mutation here goes through CommandManager.execute(), which is
// what makes each one show up as a real, undoable, correctly-labeled
// entry in the History panel (§33/§53 of the source spec) — none of
// these methods mutate `document.layers` directly outside a Command.
// ---------------------------------------------------------------------

import { Command, CommandManager } from './CommandManager';
import { DocumentModel, RasterLayer, createRasterLayer } from './Document';
import { SelectionManager } from './SelectionManager';

type Listener = () => void;

export class LayerManager {
  private listeners = new Set<Listener>();

  constructor(
    private getDocument: () => DocumentModel,
    private commandManager: CommandManager,
    private selectionManager: SelectionManager
  ) {}

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private touch(): void {
    this.getDocument().document.updatedAt = new Date().toISOString();
  }

  get layers(): RasterLayer[] {
    return this.getDocument().layers.slice().sort((a, b) => a.zIndex - b.zIndex);
  }

  addLayer(opts: { name?: string; fill?: string } = {}): string {
    const doc = this.getDocument();
    const layer = createRasterLayer(doc, opts);
    const command: Command = {
      label: `Add Layer "${layer.name}"`,
      execute: () => {
        doc.layers.push(layer);
        this.touch();
        this.notify();
      },
      undo: () => {
        doc.layers = doc.layers.filter((l) => l.id !== layer.id);
        this.selectionManager.clearIfMatches(layer.id);
        this.touch();
        this.notify();
      },
      redo: () => {
        doc.layers.push(layer);
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
    this.selectionManager.select(layer.id);
    return layer.id;
  }

  deleteLayer(layerId: string): void {
    const doc = this.getDocument();
    const index = doc.layers.findIndex((l) => l.id === layerId);
    if (index === -1) return;
    const removed = doc.layers[index];
    const command: Command = {
      label: `Delete Layer "${removed.name}"`,
      execute: () => {
        doc.layers = doc.layers.filter((l) => l.id !== layerId);
        this.selectionManager.clearIfMatches(layerId);
        this.touch();
        this.notify();
      },
      undo: () => {
        doc.layers.splice(index, 0, removed);
        this.touch();
        this.notify();
      },
      redo: () => {
        doc.layers = doc.layers.filter((l) => l.id !== layerId);
        this.selectionManager.clearIfMatches(layerId);
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }

  renameLayer(layerId: string, newName: string): void {
    const doc = this.getDocument();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer || layer.name === newName) return;
    const oldName = layer.name;
    const command: Command = {
      label: `Rename Layer to "${newName}"`,
      execute: () => {
        layer.name = newName;
        this.touch();
        this.notify();
      },
      undo: () => {
        layer.name = oldName;
        this.touch();
        this.notify();
      },
      redo: () => {
        layer.name = newName;
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }

  setOpacity(layerId: string, opacity: number): void {
    const doc = this.getDocument();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer) return;
    const clamped = Math.max(0, Math.min(1, opacity));
    if (layer.opacity === clamped) return;
    const previous = layer.opacity;
    const command: Command = {
      label: `Set Opacity to ${Math.round(clamped * 100)}%`,
      execute: () => {
        layer.opacity = clamped;
        this.touch();
        this.notify();
      },
      undo: () => {
        layer.opacity = previous;
        this.touch();
        this.notify();
      },
      redo: () => {
        layer.opacity = clamped;
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }

  setVisible(layerId: string, visible: boolean): void {
    const doc = this.getDocument();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer || layer.visible === visible) return;
    const command: Command = {
      label: visible ? `Show Layer "${layer.name}"` : `Hide Layer "${layer.name}"`,
      execute: () => {
        layer.visible = visible;
        this.touch();
        this.notify();
      },
      undo: () => {
        layer.visible = !visible;
        this.touch();
        this.notify();
      },
      redo: () => {
        layer.visible = visible;
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }

  setLocked(layerId: string, locked: boolean): void {
    const doc = this.getDocument();
    const layer = doc.layers.find((l) => l.id === layerId);
    if (!layer || layer.locked === locked) return;
    const command: Command = {
      label: locked ? `Lock Layer "${layer.name}"` : `Unlock Layer "${layer.name}"`,
      execute: () => {
        layer.locked = locked;
        this.touch();
        this.notify();
      },
      undo: () => {
        layer.locked = !locked;
        this.touch();
        this.notify();
      },
      redo: () => {
        layer.locked = locked;
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }

  // Swaps zIndex with the neighbor above/below — simple, predictable
  // reordering that keeps every zIndex unique without a full resequence.
  reorderLayer(layerId: string, direction: 'up' | 'down'): void {
    const doc = this.getDocument();
    const sorted = doc.layers.slice().sort((a, b) => a.zIndex - b.zIndex);
    const index = sorted.findIndex((l) => l.id === layerId);
    const swapIndex = direction === 'up' ? index + 1 : index - 1;
    if (index === -1 || swapIndex < 0 || swapIndex >= sorted.length) return;
    const a = sorted[index];
    const b = sorted[swapIndex];
    const aZ = a.zIndex;
    const bZ = b.zIndex;
    const command: Command = {
      label: `Reorder Layer "${a.name}"`,
      execute: () => {
        a.zIndex = bZ;
        b.zIndex = aZ;
        this.touch();
        this.notify();
      },
      undo: () => {
        a.zIndex = aZ;
        b.zIndex = bZ;
        this.touch();
        this.notify();
      },
      redo: () => {
        a.zIndex = bZ;
        b.zIndex = aZ;
        this.touch();
        this.notify();
      },
    };
    this.commandManager.execute(command);
  }
}
