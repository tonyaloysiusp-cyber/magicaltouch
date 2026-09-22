// ---------------------------------------------------------------------
// src/editor/core/History.ts
// A thin, read-only facade over CommandManager for the History panel —
// keeps the panel from depending on CommandManager's mutation methods
// (execute/undo/redo), only its labeled entries, per the source spec's
// split between the two files.
// ---------------------------------------------------------------------

import { CommandManager } from './CommandManager';

export interface HistoryEntry {
  label: string;
  isFuture: boolean; // true = in the redo stack, not yet applied
}

export class History {
  constructor(private commandManager: CommandManager) {}

  get entries(): HistoryEntry[] {
    const past = this.commandManager.executedLabels.map((label) => ({ label, isFuture: false }));
    const future = this.commandManager.undoneLabels
      .slice()
      .reverse()
      .map((label) => ({ label, isFuture: true }));
    return [...past, ...future];
  }

  subscribe(listener: () => void): () => void {
    return this.commandManager.subscribe(listener);
  }
}
