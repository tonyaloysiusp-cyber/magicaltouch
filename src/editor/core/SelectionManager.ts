// ---------------------------------------------------------------------
// src/editor/core/SelectionManager.ts
// Phase 1 scope: which layer is selected (for the Layers panel and for
// TransformManager to act on). Canvas-level object/anchor selection is a
// Phase 2/6 concern once there's real drawable content to select.
// Deliberately NOT put through CommandManager — selection state isn't
// undoable in Photoshop/Illustrator either (moving the selection isn't a
// document edit).
// ---------------------------------------------------------------------

type Listener = () => void;

export class SelectionManager {
  private selectedLayerId: string | null = null;
  private listeners = new Set<Listener>();

  select(layerId: string | null): void {
    if (this.selectedLayerId === layerId) return;
    this.selectedLayerId = layerId;
    this.notify();
  }

  get current(): string | null {
    return this.selectedLayerId;
  }

  // Called by LayerManager when the selected layer is deleted, so
  // selection never dangles on a layer id that no longer exists.
  clearIfMatches(layerId: string): void {
    if (this.selectedLayerId === layerId) this.select(null);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
