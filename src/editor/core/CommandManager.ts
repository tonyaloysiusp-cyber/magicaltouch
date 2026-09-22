// ---------------------------------------------------------------------
// src/editor/core/CommandManager.ts
// Real undo/redo: every document mutation is a Command, never a page
// reload or a blind snapshot restore. See docs/editor-architecture.md.
// ---------------------------------------------------------------------

export interface Command {
  label: string;
  execute(): void;
  undo(): void;
  redo(): void;
}

type Listener = () => void;

export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private listeners = new Set<Listener>();

  execute(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
    this.notify();
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.undo();
    this.redoStack.push(command);
    this.notify();
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.redo();
    this.undoStack.push(command);
    this.notify();
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  // Read-only, for the History panel — most-recent last, matching the
  // order operations actually happened in.
  get executedLabels(): string[] {
    return this.undoStack.map((c) => c.label);
  }

  get undoneLabels(): string[] {
    return this.redoStack.map((c) => c.label);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
