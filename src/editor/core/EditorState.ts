// ---------------------------------------------------------------------
// src/editor/core/EditorState.ts
// A single immutable snapshot aggregating everything the UI needs to
// render, plus a subscribe() the React layer uses via
// useSyncExternalStore — the engine itself has no React dependency.
// ---------------------------------------------------------------------

import { DocumentModel } from './Document';
import { ViewportTransform } from './CoordinateSystem';

export interface EditorSnapshot {
  document: DocumentModel;
  viewport: ViewportTransform;
  activeToolId: string;
  selectedLayerId: string | null;
  canUndo: boolean;
  canRedo: boolean;
  cursorDocX: number;
  cursorDocY: number;
}

type Listener = (snapshot: EditorSnapshot) => void;

export class EditorState {
  private listeners = new Set<Listener>();
  private snapshot: EditorSnapshot;

  constructor(initial: EditorSnapshot) {
    this.snapshot = initial;
  }

  get current(): EditorSnapshot {
    return this.snapshot;
  }

  update(next: EditorSnapshot): void {
    this.snapshot = next;
    this.listeners.forEach((l) => l(this.snapshot));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
