// ---------------------------------------------------------------------
// src/editor/tools/Tool.ts
// The Tool interface every registered tool implements. See
// docs/tool-specification.md for the full contract and rationale.
// ---------------------------------------------------------------------

import { Editor } from '../core/Editor';

export interface ToolPointerEvent {
  screenX: number;
  screenY: number;
  documentX: number;
  documentY: number;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  pressure: number; // 0..1, 0.5 for non-pressure-sensitive input
  pointerType: 'mouse' | 'pen' | 'touch';
}

export interface ToolContext {
  editor: Editor;
}

export type ToolOptionField =
  | { key: string; label: string; type: 'boolean' }
  | { key: string; label: string; type: 'number'; min?: number; max?: number; step?: number }
  | { key: string; label: string; type: 'select'; options: { value: string; label: string }[] };

export interface Tool {
  id: string;
  name: string;
  category: string;
  shortcut: string | null;
  icon: string;
  cursor: string;
  description: string;
  supportedModes: Array<'raster' | 'vector'>;
  defaultOptions: Record<string, unknown>;
  optionsSchema: ToolOptionField[];

  activate(ctx: ToolContext): void;
  deactivate(ctx: ToolContext): void;
  pointerDown(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerMove(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerUp(ctx: ToolContext, e: ToolPointerEvent): void;
  pointerCancel(ctx: ToolContext): void;
  keyDown(ctx: ToolContext, e: KeyboardEvent): void;
  keyUp(ctx: ToolContext, e: KeyboardEvent): void;
  renderOverlay(ctx: ToolContext, overlayCtx: CanvasRenderingContext2D): void;
  commit(ctx: ToolContext): void;
  cancel(ctx: ToolContext): void;
  serializeState(): unknown;
  restoreState(state: unknown): void;
}

// A base with no-op defaults so a real tool only needs to override the
// hooks it actually uses — a Hand tool has no keyDown behavior of its
// own, for instance, and shouldn't need an empty method to satisfy the
// interface at every call site.
export abstract class BaseTool implements Tool {
  abstract id: string;
  abstract name: string;
  abstract category: string;
  shortcut: string | null = null;
  abstract icon: string;
  cursor = 'default';
  abstract description: string;
  supportedModes: Array<'raster' | 'vector'> = ['raster'];
  defaultOptions: Record<string, unknown> = {};
  optionsSchema: ToolOptionField[] = [];

  activate(_ctx: ToolContext): void {}
  deactivate(_ctx: ToolContext): void {}
  pointerDown(_ctx: ToolContext, _e: ToolPointerEvent): void {}
  pointerMove(_ctx: ToolContext, _e: ToolPointerEvent): void {}
  pointerUp(_ctx: ToolContext, _e: ToolPointerEvent): void {}
  pointerCancel(_ctx: ToolContext): void {}
  keyDown(_ctx: ToolContext, _e: KeyboardEvent): void {}
  keyUp(_ctx: ToolContext, _e: KeyboardEvent): void {}
  renderOverlay(_ctx: ToolContext, _overlayCtx: CanvasRenderingContext2D): void {}
  commit(_ctx: ToolContext): void {}
  cancel(_ctx: ToolContext): void {}
  serializeState(): unknown {
    return null;
  }
  restoreState(_state: unknown): void {}
}
