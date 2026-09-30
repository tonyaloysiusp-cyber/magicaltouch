import type { Command } from './Command';

// Real undo/redo stack, independent of any specific document or renderer.
// Replaces ad-hoc "push a snapshot, splice on redo" logic scattered across
// call sites with one owner of the invariants: executing a new command
// always discards any redo branch, undo/redo never go out of bounds, and
// the stack is depth-capped ("configurable history length" / "memory-aware
// history" per the mandate) so a long editing session can't grow it
// unboundedly. subscribe()/getEntries() let a History panel render real,
// labeled entries and jump to any of them, matching Photoshop's own
// History panel behavior (not just a bare Undo/Redo button pair).
export class CommandManager {
  private readonly maxDepth: number;
  private executed: Command[] = [];
  private undone: Command[] = [];
  private listeners = new Set<() => void>();

  constructor(maxDepth = 50) {
    this.maxDepth = maxDepth;
  }

  get canUndo(): boolean {
    return this.executed.length > 0;
  }

  get canRedo(): boolean {
    return this.undone.length > 0;
  }

  // Labels of every executed command, oldest first -- what a History panel
  // renders as the list of past operations.
  getEntries(): string[] {
    return this.executed.map((c) => c.label);
  }

  execute(command: Command): void {
    command.execute();
    this.executed.push(command);
    if (this.executed.length > this.maxDepth) this.executed.shift();
    // A new real edit always invalidates whatever redo branch existed --
    // same rule every editor (this app's own Main Design included) uses.
    this.undone = [];
    this.notify();
  }

  undo(): boolean {
    const command = this.executed.pop();
    if (!command) return false;
    command.undo();
    this.undone.push(command);
    this.notify();
    return true;
  }

  redo(): boolean {
    const command = this.undone.pop();
    if (!command) return false;
    (command.redo || command.execute).call(command);
    this.executed.push(command);
    this.notify();
    return true;
  }

  clear(): void {
    this.executed = [];
    this.undone = [];
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }
}
