// ---------------------------------------------------------------------
// lib/editor/tool-registry.ts
// Every tool declared once with a real status: live / beta / planned.
// ---------------------------------------------------------------------

import type { ToolDefinition } from './types';

export const TOOL_REGISTRY: ToolDefinition[] = [
  { id: 'select', label: 'Select', status: 'live', shortcut: 'V', group: 'selection' },
  { id: 'direct', label: 'Direct Select', status: 'live', shortcut: 'A', group: 'selection' },
  { id: 'group-select', label: 'Group Select', status: 'live', group: 'selection' },
  { id: 'marquee-rect', label: 'Rectangle Marquee', status: 'live', shortcut: 'M', group: 'selection' },
  { id: 'marquee-ellipse', label: 'Ellipse Marquee', status: 'live', group: 'selection' },
  { id: 'lasso', label: 'Lasso Select', status: 'live', shortcut: 'L', group: 'selection' },
  { id: 'magic-wand', label: 'Magic Wand', status: 'live', shortcut: 'W', group: 'selection' },

  { id: 'pen', label: 'Pen', status: 'live', shortcut: 'P', group: 'drawing' },
  { id: 'pencil', label: 'Pencil', status: 'planned', group: 'drawing' },
  { id: 'brush', label: 'Brush', status: 'planned', group: 'drawing' },
  { id: 'shape-builder', label: 'Shape Builder', status: 'live', group: 'drawing' },
  { id: 'eraser', label: 'Eraser', status: 'planned', group: 'drawing' },
  { id: 'line', label: 'Line', status: 'live', group: 'drawing' },
  { id: 'arc', label: 'Arc', status: 'planned', group: 'drawing' },
  { id: 'curvature', label: 'Curvature', status: 'planned', group: 'drawing' },

  { id: 'rect', label: 'Rectangle', status: 'live', group: 'shapes' },
  { id: 'rounded-rect', label: 'Rounded Rectangle', status: 'beta', group: 'shapes' },
  { id: 'ellipse', label: 'Ellipse', status: 'live', group: 'shapes' },
  { id: 'polygon', label: 'Polygon', status: 'live', group: 'shapes' },
  { id: 'star', label: 'Star', status: 'live', group: 'shapes' },
  { id: 'triangle', label: 'Triangle', status: 'live', group: 'shapes' },
  { id: 'custom-shape', label: 'Custom Shape', status: 'planned', group: 'shapes' },

  { id: 'text', label: 'Text', status: 'live', group: 'text' },
  { id: 'area-text', label: 'Area Text', status: 'planned', group: 'text' },
  { id: 'text-on-path', label: 'Text on Path', status: 'planned', group: 'text' },
  { id: 'vertical-text', label: 'Vertical Text', status: 'planned', group: 'text' },

  { id: 'place-image', label: 'Place Image', status: 'live', group: 'image' },
  { id: 'crop', label: 'Crop', status: 'planned', group: 'image' },
  { id: 'image-mask', label: 'Image Mask', status: 'live', group: 'image' },
  { id: 'image-adjustments', label: 'Image Adjustments', status: 'planned', group: 'image' },
  { id: 'background-removal', label: 'Background Removal', status: 'planned', group: 'image' },
  { id: 'retouch', label: 'Retouch', status: 'planned', group: 'image' },

  { id: 'move', label: 'Move', status: 'live', group: 'transform' },
  { id: 'scale', label: 'Scale', status: 'live', group: 'transform' },
  { id: 'rotate', label: 'Rotate', status: 'live', group: 'transform' },
  { id: 'reflect', label: 'Reflect', status: 'beta', group: 'transform' },
  { id: 'shear', label: 'Shear', status: 'planned', group: 'transform' },

  { id: 'artboard', label: 'Artboard', status: 'live', shortcut: 'Shift+O', group: 'layout' },
  { id: 'guides', label: 'Guides', status: 'planned', group: 'layout' },
  { id: 'grid', label: 'Grid', status: 'planned', group: 'layout' },
  { id: 'ruler', label: 'Ruler', status: 'live', group: 'layout' },
  { id: 'measure', label: 'Measure', status: 'planned', group: 'layout' },

  { id: 'eyedropper', label: 'Eyedropper', status: 'planned', group: 'color' },
  { id: 'color-picker', label: 'Color Picker', status: 'live', group: 'color' },
  { id: 'gradient', label: 'Gradient', status: 'live', group: 'color' },
  { id: 'fill', label: 'Fill', status: 'live', group: 'color' },
  { id: 'stroke', label: 'Stroke', status: 'live', group: 'color' },

  { id: 'bleed', label: 'Bleed', status: 'planned', group: 'production' },
  { id: 'crop-marks', label: 'Crop Marks', status: 'planned', group: 'production' },
  { id: 'slug', label: 'Slug', status: 'planned', group: 'production' },
  { id: 'print-area', label: 'Print Area', status: 'planned', group: 'production' },
  { id: 'registration-marks', label: 'Registration Marks', status: 'planned', group: 'production' },

  { id: 'pan', label: 'Hand / Pan', status: 'live', shortcut: 'H', group: 'utility' },
  { id: 'zoom', label: 'Zoom', status: 'live', group: 'utility' },
];

export function getToolsByGroup(group: ToolDefinition['group']) {
  return TOOL_REGISTRY.filter((t) => t.group === group);
}

export function getFeatureStatus(id: string) {
  return TOOL_REGISTRY.find((t) => t.id === id)?.status ?? 'planned';
}
