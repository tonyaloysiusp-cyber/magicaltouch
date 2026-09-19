// ---------------------------------------------------------------------
// lib/editor/types.ts
// Single source of truth for editor-wide types.
// ---------------------------------------------------------------------

import { GOOGLE_FONT_NAMES } from './googleFonts';

export type DrawTool = 'rect' | 'ellipse' | 'triangle' | 'polygon' | 'star' | 'line';
export type PixelSelectTool = 'marquee-rect' | 'marquee-ellipse' | 'lasso' | 'magic-wand';
export type ToolMode = 'select' | 'pen' | 'direct' | 'pan' | 'artboard' | DrawTool | PixelSelectTool;

export const DRAW_TOOLS: DrawTool[] = ['rect', 'ellipse', 'triangle', 'polygon', 'star', 'line'];
export const isDrawTool = (t: string): t is DrawTool => (DRAW_TOOLS as string[]).includes(t);

export const PIXEL_SELECT_TOOLS: PixelSelectTool[] = ['marquee-rect', 'marquee-ellipse', 'lasso', 'magic-wand'];
export const isPixelSelectTool = (t: string): t is PixelSelectTool =>
  (PIXEL_SELECT_TOOLS as string[]).includes(t);

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

export type DocUnit = 'px' | 'mm' | 'cm' | 'in' | 'pt';

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

export const SYSTEM_FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Impact',
];

// The font picker's full list: the original OS-installed fonts, plus the
// curated Google Fonts catalog (see lib/editor/googleFonts.ts) — real
// webfonts loaded from Google's CDN so what's picked here is what
// actually renders, in the editor and in exported PDFs alike.
export const FONT_OPTIONS = [...SYSTEM_FONT_OPTIONS, ...GOOGLE_FONT_NAMES];

export const MAX_HISTORY = 100;

// ---------------------------------------------------------------------
// Pasteboard / artboard workspace
// ---------------------------------------------------------------------

export const PASTEBOARD_BG = '#e7e7e7';
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
