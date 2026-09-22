// ---------------------------------------------------------------------
// src/editor/core/Editor.ts
// The single façade the React UI talks to. Owns every subsystem and
// republishes a fresh EditorSnapshot whenever any of them change, so
// the UI subscribes once (via useSyncExternalStore) instead of wiring
// to five different managers. See docs/editor-architecture.md.
// ---------------------------------------------------------------------

import { DocumentModel } from './Document';
import { CommandManager } from './CommandManager';
import { History } from './History';
import { LayerManager } from './LayerManager';
import { SelectionManager } from './SelectionManager';
import { TransformManager } from './TransformManager';
import { CoordinateSystem } from './CoordinateSystem';
import { EventManager } from './EventManager';
import { EditorState, EditorSnapshot } from './EditorState';
import { Tool } from '../tools/Tool';
import { getTool } from '../tools/ToolRegistry';
import { saveDocument, loadDocument } from './ProjectStore';

export class Editor {
  readonly document: DocumentModel;
  readonly commandManager = new CommandManager();
  readonly selectionManager = new SelectionManager();
  readonly layerManager: LayerManager;
  readonly transformManager: TransformManager;
  readonly coordinateSystem = new CoordinateSystem();
  readonly eventManager: EventManager;
  readonly history: History;
  private readonly state: EditorState;

  private activeToolId_: string;
  private renderCallback: (() => void) | null = null;
  private cursorDoc = { x: 0, y: 0 };

  constructor(document: DocumentModel, initialToolId = 'nav.hand') {
    this.document = document;
    this.layerManager = new LayerManager(() => this.document, this.commandManager, this.selectionManager);
    this.transformManager = new TransformManager(
      () => this.document,
      this.commandManager,
      () => this.publish()
    );
    this.history = new History(this.commandManager);
    this.eventManager = new EventManager(this);
    this.activeToolId_ = initialToolId;

    this.state = new EditorState(this.buildSnapshot());

    this.commandManager.subscribe(() => this.publish());
    this.selectionManager.subscribe(() => this.publish());
    this.coordinateSystem.subscribe(() => this.publish());
    this.layerManager.subscribe(() => this.publish());

    this.activeTool?.activate({ editor: this });
  }

  get activeToolId(): string {
    return this.activeToolId_;
  }

  get activeTool(): Tool | undefined {
    return getTool(this.activeToolId_);
  }

  setActiveTool(id: string): void {
    const next = getTool(id);
    if (!next || id === this.activeToolId_) return;
    this.activeTool?.deactivate({ editor: this });
    this.activeToolId_ = id;
    next.activate({ editor: this });
    this.publish();
    this.requestRender();
  }

  setCursorPosition(x: number, y: number): void {
    this.cursorDoc = { x, y };
    this.publish();
  }

  setRenderCallback(cb: (() => void) | null): void {
    this.renderCallback = cb;
  }

  requestRender(): void {
    this.renderCallback?.();
  }

  undo(): void {
    this.commandManager.undo();
    this.requestRender();
  }

  redo(): void {
    this.commandManager.redo();
    this.requestRender();
  }

  fitToView(viewportWidth: number, viewportHeight: number): void {
    this.coordinateSystem.fit(this.document.document.width, this.document.document.height, viewportWidth, viewportHeight);
    this.requestRender();
  }

  private buildSnapshot(): EditorSnapshot {
    return {
      document: this.document,
      viewport: this.coordinateSystem.current,
      activeToolId: this.activeToolId_,
      selectedLayerId: this.selectionManager.current,
      canUndo: this.commandManager.canUndo,
      canRedo: this.commandManager.canRedo,
      cursorDocX: this.cursorDoc.x,
      cursorDocY: this.cursorDoc.y,
    };
  }

  private publish(): void {
    this.state.update(this.buildSnapshot());
  }

  subscribe(listener: (snapshot: EditorSnapshot) => void): () => void {
    return this.state.subscribe(listener);
  }

  getSnapshot(): EditorSnapshot {
    return this.state.current;
  }

  async save(): Promise<void> {
    this.document.document.updatedAt = new Date().toISOString();
    await saveDocument(this.document);
  }

  static async loadFromStore(id: string): Promise<Editor | null> {
    const doc = await loadDocument(id);
    return doc ? new Editor(doc) : null;
  }
}
