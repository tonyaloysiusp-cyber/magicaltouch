// ---------------------------------------------------------------------
// lib/editor/types.ts
// Single source of truth for editor-wide types.
// ---------------------------------------------------------------------

export type DrawTool = 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'star' | 'line';
export type ToolMode = 'select' | 'pen' | 'direct' | 'pan' | DrawTool;

export const DRAW_TOOLS: DrawTool[] = ['rect', 'ellipse', 'triangle', 'polygon', 'star', 'line'];
export const isDrawTool = (t: string): t is DrawTool => (DRAW_TOOLS as string[]).includes(t);

export const TOOL_LABELS: Record<DrawTool, string> = {
  rect: 'Rectangle',
  ellipse: 'Ellipse',
  triangle: 'Triangle',
  polygon: 'Polygon',
  star: 'Star',
  line: 'Line',
};

export interface PenAnchor {
  x: number;
  y: number;
  handleIn?: { x: number; y: number };
  handleOut?: { x: number; y: number };
}

export const ANCHOR_HIT_RADIUS = 8;
export const ANCHOR_HANDLE_SIZE = 8;

export type DocUnit = 'px' | 'mm' | 'cm' | 'in';

export interface DraftGeometry {
  left: number;
  top: number;
  w: number;
  h: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

export const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
];

export const MAX_HISTORY = 100;

// ---------------------------------------------------------------------
// Pasteboard / artboard workspace
// ---------------------------------------------------------------------

export const PASTEBOARD_BG = '#4b4b50';
export const RULER_SIZE = 20;

export type FeatureStatus = 'live' | 'beta' | 'planned';

export interface ToolDefinition {
  id: string;
  label: string;
  status: FeatureStatus;
  shortcut?: string;
  group: ToolGroupId;
}

export type ToolGroupId =
  | 'selection'
  | 'drawing'
  | 'shapes'
  | 'text'
  | 'image'
  | 'transform'
  | 'layout'
  | 'color'
  | 'production'
  | 'utility';

export const TOOL_GROUP_LABELS: Record<ToolGroupId, string> = {
  selection: 'Selection',
  drawing: 'Drawing',
  shapes: 'Shapes',
  text: 'Text',
  image: 'Image',
  transform: 'Transform',
  layout: 'Layout',
  color: 'Color',
  production: 'Print / Production',
  utility: 'Utility',
};
