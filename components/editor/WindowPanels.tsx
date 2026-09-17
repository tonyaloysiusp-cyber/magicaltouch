'use client';

import { useState, useCallback } from 'react';

// ---------------------------------------------------------------------
// WindowPanels
//
// Real panel-visibility state for the "Window" menu, matching how
// Photoshop/Illustrator/InDesign let you show/hide panels. This does
// NOT invent panel content — it only controls which real panels
// (Properties, Layers, etc.) are visible, plus flags for panels that
// don't exist yet (marked planned, never faked).
// ---------------------------------------------------------------------

export type PanelId =
  | 'properties'
  | 'layers'
  | 'artboards'
  | 'align'
  | 'swatches'
  | 'character'
  | 'pathfinder'
  | 'history';

export const PANEL_LABELS: Record<PanelId, string> = {
  properties: 'Properties',
  layers: 'Layers',
  artboards: 'Artboards',
  align: 'Align',
  swatches: 'Swatches',
  character: 'Character',
  pathfinder: 'Pathfinder',
  history: 'History',
};

// Which panels are actually built right now. Keep this list honest —
// add a panel here only once its component really exists and works.
export const IMPLEMENTED_PANELS: PanelId[] = ['properties', 'layers', 'artboards', 'align'];

export function useWindowPanels(initial: PanelId[] = ['properties', 'layers']) {
  const [visible, setVisible] = useState<Set<PanelId>>(new Set(initial));

  const isOpen = useCallback((id: PanelId) => visible.has(id), [visible]);

  const toggle = useCallback((id: PanelId) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const isImplemented = useCallback((id: PanelId) => IMPLEMENTED_PANELS.includes(id), []);

  return { visible, isOpen, toggle, isImplemented };
}
