// ---------------------------------------------------------------------
// src/editor/tools/ToolRegistry.ts
// Central registry — Toolbar.tsx is generated from this, per §48 of the
// source spec, so adding a real tool later never means hand-editing the
// toolbar component.
// ---------------------------------------------------------------------

import { Tool } from './Tool';

const tools = new Map<string, Tool>();
const order: string[] = [];

export function registerTool(tool: Tool): void {
  if (!tools.has(tool.id)) order.push(tool.id);
  tools.set(tool.id, tool);
}

export function getTool(id: string): Tool | undefined {
  return tools.get(id);
}

export function listTools(): Tool[] {
  return order.map((id) => tools.get(id)!).filter(Boolean);
}

export function listToolsByCategory(): Map<string, Tool[]> {
  const grouped = new Map<string, Tool[]>();
  for (const tool of listTools()) {
    const list = grouped.get(tool.category) || [];
    list.push(tool);
    grouped.set(tool.category, list);
  }
  return grouped;
}

export function findToolByShortcut(key: string): Tool | undefined {
  const lower = key.toLowerCase();
  return listTools().find((t) => t.shortcut && t.shortcut.toLowerCase() === lower);
}
