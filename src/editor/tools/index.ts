// ---------------------------------------------------------------------
// src/editor/tools/index.ts
// Registers every currently-real tool. Imported once (by EditorShell)
// before any Editor is constructed. Adding a Phase 2+ tool later means
// adding one line here — Toolbar.tsx never needs to change.
// ---------------------------------------------------------------------

import { registerTool } from './ToolRegistry';
import { HandTool } from './navigation/HandTool';
import { ZoomTool } from './navigation/ZoomTool';

let registered = false;

export function ensureToolsRegistered(): void {
  if (registered) return;
  registered = true;
  registerTool(new HandTool());
  registerTool(new ZoomTool());
}
