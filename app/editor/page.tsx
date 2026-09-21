'use client';

import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { Keyboard } from 'lucide-react';

import { ToolMode, DocUnit, isDrawTool, PASTEBOARD_BG, RULER_SIZE } from '@/lib/editor/types';
import { googleFontsStylesheetHref, aliasedFontFaceCSS, ensureFontLoaded, ensureFontsLoadedForCanvasJSON } from '@/lib/editor/googleFonts';
import { getAbsolutePolygonPoints, multiPolygonToPathD } from '@/lib/editor/geometry';
import { exportCanvasToPDF, exportArtboardsToPDF, toPt } from '@/lib/editor/pdfExport';
import { computeSnap, GuideLine } from '@/lib/editor/snapping';
import {
  ArtboardMeta,
  ArtboardPreset,
  createArtboardId,
  nextArtboardName,
  nextArtboardPosition,
  findOwningArtboard,
  boundingBoxOfArtboards,
} from '@/lib/editor/artboards';
import { ArtboardPrintSettings, ExportScope, createDefaultPrintSettings, getExportRect } from '@/lib/editor/printSetup';
import { buildProductionMarks } from '@/lib/editor/printMarks';
import { runPreflight, PreflightIssue } from '@/lib/editor/preflight';

import { useEditorHistory } from '@/hooks/useEditorHistory';
import { usePenTool } from '@/hooks/usePenTool';
import { useShapeTools } from '@/hooks/useShapeTools';
import { useDirectSelection } from '@/hooks/useDirectSelection';
import { useArtboardTool } from '@/hooks/useArtboardTool';

import { Toolbar } from '@/components/editor/Toolbar';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { LayersPanel } from '@/components/editor/LayersPanel';
import { ArtboardsPanel } from '@/components/editor/ArtboardsPanel';
import { ExportDialog, ExportSettings } from '@/components/editor/ExportDialog';
import { DesignLimitDialog } from '@/components/DesignLimitDialog';
import { ProfileMenu } from '@/components/ProfileMenu';
import { MAX_DESIGNS, getDesignCount } from '@/lib/profile';
import { PreflightModal } from '@/components/editor/PreflightModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { RoadmapModal } from '@/components/editor/RoadmapModal';
import { MenuBar, MenuDef } from '@/components/editor/MenuBar';
import { useWindowPanels } from '@/components/editor/WindowPanels';
import { AlignPanel } from '@/components/editor/AlignPanel';
import { BackBar } from '@/components/BackBar';
import { Rulers } from '@/components/editor/Rulers';
import { TabBar, EditorTabInfo } from '@/components/editor/TabBar';
import { OpenDesignDialog, OpenableDesign } from '@/components/editor/OpenDesignDialog';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { loadTabSession, saveTabSession, clearTabSession } from '@/lib/editor/tabSession';
import { WorkspaceSwitcher, EditorWorkspace } from '@/components/editor/WorkspaceSwitcher';
import { PhotoEditorWorkspace, PhotoEditResult, CropRect } from '@/components/photoEditor/PhotoEditorWorkspace';
import { PhotoAdjustments, DEFAULT_ADJUSTMENTS } from '@/lib/editor/photoFilters';
import { imageObjectToDataURL } from '@/lib/editor/imageQuality';

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // The editor is a protected route: a logged-out visitor who lands here
  // directly (typed URL, bookmark, back button) must be bounced to login
  // before they can touch the canvas, not just when they click a CTA on
  // the homepage. The overlay below blocks interaction until this resolves.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const [zoom, setZoom] = useState(100);
  const [layers, setLayers] = useState<any[]>([]);
  const [designName, setDesignName] = useState('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDesignLimitDialog, setShowDesignLimitDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [roadmap, setRoadmap] = useState<{ open: boolean; id?: string }>({ open: false });
  const { isOpen: isPanelOpen, toggle: togglePanel } = useWindowPanels(['properties', 'layers', 'artboards']);

  const [artboards, setArtboards] = useState<ArtboardMeta[]>([]);
  const [activeArtboardId, setActiveArtboardId] = useState<string | null>(null);
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[]>([]);

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);

  const [unit, setUnit] = useState<DocUnit>('px');
  const unitRef = useRef<DocUnit>(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  const [activeTool, setActiveToolState] = useState<ToolMode>('select');
  const activeToolRef = useRef<ToolMode>('select');
  const [maskTargetId, setMaskTargetId] = useState<string>('');

  // Smart-guide snap lines, live only while an object is actively being
  // dragged. Cleared on mouse-up so the guides never persist after a drop.
  const snapGuidesRef = useRef<GuideLine[]>([]);

  // Each entry is a freshly-cloned Fabric object holding its absolute
  // canvas position at copy time. Kept as a flat array of individual
  // objects rather than a single cloned ActiveSelection/Group — Fabric's
  // Group.clone() doesn't reliably re-bake each child's absolute left/top
  // once the group itself is repositioned and its members are peeled back
  // off with forEachObject(), which was landing multi-object paste/
  // duplicate in the wrong place. Cloning members individually and
  // shifting each by the same delta keeps their relative layout exact.
  const clipboardRef = useRef<any[] | null>(null);
  const pasteCountRef = useRef(0);
  const gradAngleRef = useRef<number>(90);

  const width = parseInt(searchParams.get('w') || '1080');
  const height = parseInt(searchParams.get('h') || '1080');
  const urlDesignId = searchParams.get('designId');
  const cameFromTemplate = searchParams.get('templateId');
  const autoExportFormat = searchParams.get('autoExport'); // 'png' | 'jpg' | 'pdf', from the dashboard's Download action
  const hasAutoExportedRef = useRef(false);

  // Document setup carried over from the "Create New Design" screen. Only
  // meaningful the first time an artboard is created for a brand-new
  // document — loading an existing design already has its own __print.
  const initialDpi = parseInt(searchParams.get('dpi') || '') || null;
  const initialBg = searchParams.get('bg');
  const initialBleed = {
    top: parseFloat(searchParams.get('bleedT') || '0') || 0,
    right: parseFloat(searchParams.get('bleedR') || '0') || 0,
    bottom: parseFloat(searchParams.get('bleedB') || '0') || 0,
    left: parseFloat(searchParams.get('bleedL') || '0') || 0,
  };
  const initialSafeArea = {
    top: parseFloat(searchParams.get('safeT') || '0') || 0,
    right: parseFloat(searchParams.get('safeR') || '0') || 0,
    bottom: parseFloat(searchParams.get('safeB') || '0') || 0,
    left: parseFloat(searchParams.get('safeL') || '0') || 0,
  };

  const refreshLayers = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setLayers(
      canvas
        .getObjects()
        .filter((o: any) => !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && !o.__isArtboard)
        .slice()
        .reverse()
    );
  }, []);

  // Reads the artboard rects straight off the canvas (source of truth) into
  // plain metadata, both for rendering the ArtboardsPanel and for any
  // internal logic that needs the current list without risking a stale
  // React-state closure inside long-lived Fabric event handlers.
  const getArtboardMetas = useCallback((): ArtboardMeta[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];
    return canvas
      .getObjects()
      .filter((o: any) => o.__isArtboard)
      .map((o: any) => ({
        id: o.__artboardId,
        name: o.name || 'Artboard',
        x: o.left || 0,
        y: o.top || 0,
        width: (o.width || 0) * (o.scaleX || 1),
        height: (o.height || 0) * (o.scaleY || 1),
        print: o.__print || createDefaultPrintSettings(),
      }));
  }, []);

  const refreshArtboards = useCallback(() => {
    setArtboards(getArtboardMetas());
  }, [getArtboardMetas]);

  // Stamps __artboardId on every non-artboard object based on which
  // artboard's rect currently contains its center point. Recomputed
  // whenever an object or an artboard moves/resizes — cheap point-in-rect
  // tests against however many artboards the document has.
  const recomputeMembership = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const metas = getArtboardMetas();
    canvas.getObjects().forEach((obj: any) => {
      if (obj.__isArtboard || obj.__isAnchorHandle || obj.__isPenPreview || obj.__isShapeDraft || obj.__isPrintMark) return;
      const center = obj.getCenterPoint();
      obj.__artboardId = findOwningArtboard(center.x, center.y, metas);
    });
  }, [getArtboardMetas]);

  const pinArtboardsBack = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const abs = canvas.getObjects().filter((o: any) => o.__isArtboard);
    [...abs].reverse().forEach((a: any) => canvas.sendToBack(a));
  }, []);

  // Multi-document tabs: each tab is an independently saved design. Only
  // the ACTIVE tab's data lives in the live canvas/React state below —
  // every other open tab's canvas JSON, undo stack, artboards, zoom and
  // unit are frozen into tabSnapshotsRef until it's switched back to (see
  // activateTab()), so nothing bleeds between tabs.
  interface TabSnapshot {
    canvasJSON: any;
    history: { stack: string[]; index: number };
    artboards: ArtboardMeta[];
    activeArtboardId: string | null;
    zoom: number;
    unit: DocUnit;
    designName: string;
    designId: string | null;
    vpt: number[] | null;
  }
  const [tabs, setTabs] = useState<EditorTabInfo[]>([]);
  const [activeTabId, setActiveTabId] = useState<string>('');
  const activeTabIdRef = useRef<string>('');
  useEffect(() => {
    activeTabIdRef.current = activeTabId;
  }, [activeTabId]);
  const tabSnapshotsRef = useRef<Map<string, TabSnapshot>>(new Map());
  const pendingSnapshotRef = useRef<TabSnapshot | null>(null);
  const [showOpenDialog, setShowOpenDialog] = useState(false);

  // Photo Editor workspace: a session exists once "Edit Photo" is used
  // on a selected image, and stays mounted (just hidden) while toggling
  // back to Main Design so in-progress crop/adjustments aren't lost —
  // see the WorkspaceSwitcher render below.
  interface PhotoEditSession {
    targetUid: string;
    sourceDataUrl: string;
    initialAdjustments: PhotoAdjustments;
    initialCropRect: CropRect | null;
  }
  const [workspace, setWorkspace] = useState<EditorWorkspace>('design');
  const workspaceRef = useRef<EditorWorkspace>('design');
  useEffect(() => {
    workspaceRef.current = workspace;
  }, [workspace]);
  const [photoEditSession, setPhotoEditSession] = useState<PhotoEditSession | null>(null);

  // Seeds the tab strip with whatever design the editor was opened on
  // (from the URL), exactly once. Its name is filled in below once the
  // canvas-load effect finishes fetching it.
  //
  // First checks for a persisted session from tabSession.ts — if this
  // browser tab already had other designs open before navigating away
  // (e.g. through New Design's trip to /create and back), those tabs are
  // restored, and the design the URL now points to is added as ANOTHER
  // tab alongside them rather than replacing the whole session. Without
  // this, every previously open tab would silently close the instant a
  // new design was created.
  useEffect(() => {
    const restored = loadTabSession();
    const newTabMarker = searchParams.get('newTab');
    const freshId = urlDesignId || `new-${newTabMarker || Date.now()}`;

    if (restored && restored.tabs.length) {
      tabSnapshotsRef.current = new Map(Object.entries(restored.snapshots || {}));
      // newTab is stamped fresh by /create on every "New Design" — its
      // presence means this navigation must always become a new tab, even
      // if it happens to land on the exact same blank w/h another already-
      // open tab started from (otherwise indistinguishable from a plain
      // reload of that other tab, since neither has a designId yet).
      const existing = urlDesignId
        ? restored.tabs.find((t) => t.designId === urlDesignId)
        : newTabMarker
          ? undefined
          : restored.tabs.find((t) => t.id === restored.activeTabId);

      if (existing) {
        setTabs(restored.tabs);
        setActiveTabId(existing.id);
        pendingSnapshotRef.current = tabSnapshotsRef.current.get(existing.id) || null;
      } else {
        const newTab: EditorTabInfo = {
          id: freshId,
          designId: urlDesignId,
          name: urlDesignId ? 'Loading…' : 'Untitled Design',
          width,
          height,
          dirty: false,
        };
        setTabs([...restored.tabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    setTabs([{ id: freshId, designId: urlDesignId, name: urlDesignId ? 'Loading…' : 'Untitled Design', width, height, dirty: false }]);
    setActiveTabId(freshId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { historyRef, suppressHistoryRef, canUndo, canRedo, pushHistory: pushHistoryRaw, undo, redo, seedInitialSnapshot, restoreHistory, SNAPSHOT_PROPS } =
    useEditorHistory(fabricCanvasRef, () => {
      refreshLayers();
      setSelected(fabricCanvasRef.current?.getActiveObject() || null);
    });

  // Marks the active tab dirty on every edit. pushHistory is already
  // called from every mutation site in this file (see grep: ~40 call
  // sites), so wrapping this one symbol is enough to cover the unsaved
  // indicator without touching each of them individually.
  const pushHistory = useCallback(() => {
    pushHistoryRaw();
    const id = activeTabIdRef.current;
    if (!id) return;
    setTabs((ts) => (ts.some((t) => t.id === id && !t.dirty) ? ts.map((t) => (t.id === id ? { ...t, dirty: true } : t)) : ts));
  }, [pushHistoryRaw]);

  const {
    stateRef: directSelectionStateRef,
    clearHandles: clearAnchorHandles,
    renderHandles: renderAnchorHandles,
    deleteActiveAnchor,
  } = useDirectSelection({
    fabricCanvasRef,
    onAnchorMoved: pushHistory,
  });

  const { clearDraft: clearPenDraft, finishPath: finishPenPath, handleMouseDown: handlePenMouseDown, handleMouseMove: handlePenMouseMove, handleMouseUp: handlePenMouseUp } =
    usePenTool({
      fabricCanvasRef,
      onPathFinished: (pathObj) => {
        const canvas = fabricCanvasRef.current;
        canvas.add(pathObj);
        canvas.setActiveObject(pathObj);
        canvas.requestRenderAll();
        setActiveToolState('select');
        activeToolRef.current = 'select';
      },
    });

  const { liveDim, clearDraft: clearShapeDraft, handleMouseDown: handleShapeMouseDown, handleMouseMove: handleShapeMouseMove, handleMouseUp: handleShapeMouseUp } =
    useShapeTools({
      fabricCanvasRef,
      activeToolRef,
      unitRef,
      suppressHistoryRef,
      onShapeFinished: (obj) => {
        const canvas = fabricCanvasRef.current;
        canvas.setActiveObject(obj);
        // The object was already sitting on the canvas as a live drag
        // preview (added/removed on every mousemove while __isShapeDraft
        // was set, which recomputeMembership() deliberately skips) before
        // it became "real" here — nothing re-fires object:added at this
        // point, so its artboard membership was never actually computed
        // against its final position/size. Do it explicitly now, or the
        // shape can end up with no __artboardId at all and silently
        // vanish from that artboard's PNG/PDF export.
        recomputeMembership();
        refreshLayers();
        pushHistory();
        setActiveToolState('select');
        activeToolRef.current = 'select';
      },
    });

  const {
    liveDim: artboardLiveDim,
    clearDraft: clearArtboardDraft,
    handleMouseDown: handleArtboardMouseDown,
    handleMouseMove: handleArtboardMouseMove,
    handleMouseUp: handleArtboardMouseUp,
  } = useArtboardTool({
    fabricCanvasRef,
    activeToolRef,
    onArtboardFinished: ({ x, y, width: w, height: h }) => {
      const canvas = fabricCanvasRef.current;
      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const rect = new F.Rect({
          left: x,
          top: y,
          width: w,
          height: h,
          fill: '#ffffff',
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          lockRotation: true,
          hoverCursor: 'move',
          objectCaching: false,
        });
        rect.__isArtboard = true;
        rect.__artboardId = createArtboardId();
        rect.name = nextArtboardName(getArtboardMetas());
        if (rect.setControlsVisibility) rect.setControlsVisibility({ mtr: false });
        canvas.add(rect);
        pinArtboardsBack();
        recomputeMembership();
        refreshArtboards();
        setActiveArtboardId(rect.__artboardId);
        canvas.setActiveObject(rect);
        canvas.requestRenderAll();
        pushHistory();
      });
    },
  });

  const applyPathAsMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const pathObj = canvas.getActiveObject();
    if (!pathObj || !pathObj.isVectorPath) {
      alert('Select a closed vector path first, then choose a target image below.');
      return;
    }
    if (!maskTargetId) {
      alert('Choose a target image to mask in the Properties panel.');
      return;
    }
    const targetImage = canvas.getObjects().find((o: any) => o.type === 'image' && o.__id === maskTargetId);
    if (!targetImage) {
      alert('Target image not found.');
      return;
    }

    import('fabric').then((mod) => {
      pathObj.clone((cloned: any) => {
        cloned.set({ absolutePositioned: true, fill: '#000000', stroke: '' });
        targetImage.__maskSourcePath = JSON.stringify(pathObj.toObject(['isVectorPath']));
        targetImage.clipPath = cloned;
        targetImage.dirty = true;

        canvas.remove(pathObj);
        clearAnchorHandles();
        canvas.setActiveObject(targetImage);
        canvas.requestRenderAll();
        setSelected(targetImage);
        pushHistory();
      });
    });
  }, [maskTargetId, clearAnchorHandles, pushHistory]);

  const removeMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || !active.clipPath) return;
    active.clipPath = null;
    active.dirty = true;
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  }, [pushHistory]);

  const applyGradientFill = useCallback(
    (type: 'linear' | 'radial', color1: string, color2: string, angleDeg: number) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      import('fabric').then((mod) => {
        const F: any = mod.fabric;
        const ow: number = active.width || 1;
        const oh: number = active.height || 1;
        let coords: any;

        if (type === 'linear') {
          const rad = (angleDeg * Math.PI) / 180;
          const cx = ow / 2;
          const cy = oh / 2;
          const len = Math.sqrt(ow * ow + oh * oh) / 2;
          coords = {
            x1: cx - Math.cos(rad) * len,
            y1: cy - Math.sin(rad) * len,
            x2: cx + Math.cos(rad) * len,
            y2: cy + Math.sin(rad) * len,
          };
        } else {
          coords = { x1: ow / 2, y1: oh / 2, x2: ow / 2, y2: oh / 2, r1: 0, r2: Math.max(ow, oh) / 2 };
        }

        const gradient = new F.Gradient({
          type,
          coords,
          colorStops: [
            { offset: 0, color: color1 },
            { offset: 1, color: color2 },
          ],
        });

        active.set({ fill: gradient });
        active.dirty = true;
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
      });
    },
    [pushHistory]
  );

  const applyExactSize = useCallback(
    (newWpx: number | null, newHpx: number | null) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      const curW = active.type === 'circle' ? (active.radius || 1) * 2 * (active.scaleX || 1) : (active.width || 0) * (active.scaleX || 1);
      const curH = active.type === 'circle' ? (active.radius || 1) * 2 * (active.scaleY || 1) : (active.height || 0) * (active.scaleY || 1);
      let w = newWpx;
      let h = newHpx;

      if (active.__lockRatio) {
        if (w != null && h == null && curW > 0) h = (w / curW) * curH;
        if (h != null && w == null && curH > 0) w = (h / curH) * curW;
      }

      const baseW = active.type === 'circle' ? (active.radius || 1) * 2 : active.width || 1;
      const baseH = active.type === 'circle' ? (active.radius || 1) * 2 : active.height || 1;

      if (w != null) active.set({ scaleX: w / baseW });
      if (h != null) active.set({ scaleY: h / baseH });

      active.setCoords();
      canvas.requestRenderAll();
      bumpSel();
      pushHistory();
    },
    [pushHistory]
  );

  const toggleLockRatio = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;
    active.__lockRatio = !active.__lockRatio;
    bumpSel();
  };

  const runShapeBuilder = useCallback(
    (op: 'union' | 'subtract' | 'intersect' | 'exclude') => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.type !== 'activeSelection') {
        alert('Select two or more shapes first (drag a selection box, or Shift-click each one).');
        return;
      }
      const objs: any[] = active.getObjects ? active.getObjects() : [];
      if (objs.length < 2) {
        alert('Shape Builder needs at least two selected objects.');
        return;
      }
      const unsupported = objs.filter((o) => !['rect', 'triangle', 'circle', 'ellipse', 'polygon', 'path'].includes(o.type));
      if (unsupported.length > 0) {
        alert('Shape Builder only works on vector shapes and paths right now — remove images/text from the selection first.');
        return;
      }

      import('fabric')
        .then(async (mod) => {
          const F: any = mod.fabric;
          let polygonClipping: any;
          try {
            polygonClipping = (await import('polygon-clipping')).default;
          } catch (err) {
            console.error(err);
            alert("Shape Builder needs the 'polygon-clipping' package. Run: npm install polygon-clipping");
            return;
          }

          const canvasOrder = canvas.getObjects();
          const ordered = objs.slice().sort((a: any, b: any) => canvasOrder.indexOf(a) - canvasOrder.indexOf(b));

          const toGeom = (obj: any): number[][][] => {
            const ring = getAbsolutePolygonPoints(obj, F);
            if (ring.length < 3) return [];
            return [[...ring, ring[0]]];
          };

          const geoms = ordered.map(toGeom).filter((g) => g.length > 0);
          if (geoms.length < 2) {
            alert('Could not read enough valid shape geometry to run this operation.');
            return;
          }

          let result: number[][][][];
          if (op === 'union') result = polygonClipping.union(...geoms);
          else if (op === 'intersect') result = polygonClipping.intersection(...geoms);
          else if (op === 'exclude') result = polygonClipping.xor(...geoms);
          else result = polygonClipping.difference(geoms[0], ...geoms.slice(1));

          if (!result || result.length === 0) {
            alert('This operation produced an empty shape — the selected objects may not overlap the way this operation expects.');
            return;
          }

          const d = multiPolygonToPathD(result);
          const baseFill = typeof ordered[0].fill === 'string' ? ordered[0].fill : '#3FA9E8';
          const pathObj: any = new F.Path(d, { fill: baseFill, stroke: '#1A1A1A', strokeWidth: 2, fillRule: 'evenodd', objectCaching: false });
          pathObj.isVectorPath = true;
          pathObj.name = `Shape Builder (${op})`;

          canvas.discardActiveObject();
          objs.forEach((o: any) => canvas.remove(o));
          canvas.add(pathObj);
          canvas.setActiveObject(pathObj);
          canvas.requestRenderAll();
          refreshLayers();
          pushHistory();
        })
        .catch((err) => {
          console.error('Shape Builder failed:', err);
          alert('Shape Builder failed on this selection. Please try again.');
        });
    },
    [pushHistory, refreshLayers]
  );

  const openShapeBuilder = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'activeSelection') {
      alert('Select two or more shapes first (drag a selection box, or Shift-click each one), then use Shape Builder in the Properties panel.');
      return;
    }
  };

  const setActiveTool = useCallback(
    (tool: ToolMode) => {
      const canvas = fabricCanvasRef.current;
      activeToolRef.current = tool;
      setActiveToolState(tool);

      if (tool !== 'pen') clearPenDraft();
      if (tool !== 'direct') clearAnchorHandles();
      clearShapeDraft();
      if (tool !== 'artboard') clearArtboardDraft();

      if (!canvas) return;

      if (tool === 'pan') {
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => (o.selectable = false));
        canvas.defaultCursor = 'grab';
        canvas.hoverCursor = 'grab';
      } else if (tool === 'artboard') {
        // Artboard tool: artboards become the selectable/movable/resizable
        // things (never rotatable), everything else is locked out, matching
        // Illustrator's Artboard tool.
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => {
          if (o.__isArtboard) {
            o.selectable = true;
            o.evented = true;
            o.hasControls = true;
            o.hasBorders = true;
            o.lockRotation = true;
            if (o.setControlsVisibility) o.setControlsVisibility({ mtr: false });
          } else {
            o.selectable = false;
          }
        });
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'move';
      } else if (tool === 'pen' || isDrawTool(tool)) {
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => (o.selectable = false));
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
      } else {
        canvas.selection = true;
        canvas.forEachObject((o: any) => {
          if (o.__isArtboard) {
            // Reset back to non-interactive whenever we leave the Artboard tool.
            o.selectable = false;
            o.evented = false;
            o.hasControls = false;
            return;
          }
          o.evented = true;
          if (!o.locked && !o.__isAnchorHandle && !o.__isPenPreview) o.selectable = true;
        });
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
      }
      canvas.requestRenderAll();
    },
    [clearPenDraft, clearAnchorHandles, clearShapeDraft, clearArtboardDraft]
  );

  // Ensures at least one locked, non-rotatable white artboard Rect exists.
  // Everything outside every artboard is the dark pasteboard
  // (canvas.backgroundColor), which objects can freely sit on. Also
  // migrates designs saved before multi-artboard support: an old
  // __isArtboard rect with no id/name gets one stamped on so it becomes
  // "Artboard 1" instead of silently losing its identity.
  const ensureArtboards = (canvas: any, F: any) => {
    canvas.backgroundColor = PASTEBOARD_BG;
    const existing = canvas.getObjects().filter((o: any) => o.__isArtboard);
    if (existing.length === 0) {
      const fill = initialBg?.startsWith('custom:')
        ? `#${initialBg.slice(7)}`
        : initialBg === 'transparent'
        ? ''
        : '#ffffff';
      const rect = new F.Rect({
        left: 0,
        top: 0,
        width,
        height,
        fill,
        selectable: false,
        evented: false,
        hasControls: false,
        hoverCursor: 'default',
        objectCaching: false,
        lockRotation: true,
      });
      rect.__isArtboard = true;
      rect.__artboardId = createArtboardId();
      rect.name = 'Artboard 1';

      const printSettings = createDefaultPrintSettings();
      if (initialDpi) printSettings.dpi = initialDpi;
      const b = initialBleed;
      if (b.top || b.right || b.bottom || b.left) {
        printSettings.bleed = b;
        printSettings.bleedLinked = b.top === b.right && b.right === b.bottom && b.bottom === b.left;
      }
      const s = initialSafeArea;
      if (s.top || s.right || s.bottom || s.left) {
        printSettings.safeArea = s;
        printSettings.safeAreaLinked = s.top === s.right && s.right === s.bottom && s.bottom === s.left;
      }
      rect.__print = printSettings;
      canvas.add(rect);
    } else {
      existing.forEach((rect: any, i: number) => {
        if (!rect.__artboardId) rect.__artboardId = createArtboardId();
        if (!rect.name) rect.name = `Artboard ${i + 1}`;
        if (!rect.__print) rect.__print = createDefaultPrintSettings();
        rect.set({ selectable: false, evented: false, hasControls: false, lockRotation: true });
      });
    }
    pinArtboardsBack();
    recomputeMembership();
    refreshArtboards();
    setActiveArtboardId(canvas.getObjects().find((o: any) => o.__isArtboard)?.__artboardId || null);
    canvas.requestRenderAll();
  };

  const fitToRect = (canvas: any, rect: { x: number; y: number; width: number; height: number }, pad = 60) => {
    const vw = canvas.getWidth();
    const vh = canvas.getHeight();
    if (!vw || !vh || rect.width <= 0 || rect.height <= 0) return;
    let z = Math.min((vw - pad * 2) / rect.width, (vh - pad * 2) / rect.height);
    if (!isFinite(z) || z <= 0) z = 1;
    z = Math.max(0.1, Math.min(2, z));
    const panX = (vw - rect.width * z) / 2 - rect.x * z;
    const panY = (vh - rect.height * z) / 2 - rect.y * z;
    canvas.setViewportTransform([z, 0, 0, z, panX, panY]);
    setZoom(Math.round(z * 100));
  };

  useEffect(() => {
    import('fabric').then((mod) => {
      const F: any = mod.fabric;
      const initialW = viewportRef.current?.clientWidth || 900;
      const initialH = viewportRef.current?.clientHeight || 600;

      const canvas = new F.Canvas(canvasRef.current, {
        width: initialW,
        height: initialH,
        backgroundColor: PASTEBOARD_BG,
      });
      fabricCanvasRef.current = canvas;
      (window as any).fabric = F;

      const onLayersChanged = () => refreshLayers();
      const onHistoryChanged = () => pushHistory();

      canvas.on('object:added', (e: any) => {
        const obj: any = e.target;
        if (obj && !obj.__isAnchorHandle && !obj.__isPenPreview && !obj.__isShapeDraft && !obj.__isArtboard && !obj.__uid) {
          obj.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
      });

      canvas.on('object:added', onLayersChanged);
      canvas.on('object:removed', onLayersChanged);
      canvas.on('object:modified', onHistoryChanged);
      canvas.on('object:added', onHistoryChanged);
      canvas.on('object:removed', onHistoryChanged);

      // Multi-artboard bookkeeping: keep each object's owning artboard
      // current, and normalize an artboard's own scale into width/height
      // whenever it's moved/resized via the Artboard tool.
      canvas.on('object:added', () => {
        recomputeMembership();
        refreshArtboards();
      });
      canvas.on('object:removed', () => {
        recomputeMembership();
        refreshArtboards();
      });
      canvas.on('object:modified', (e: any) => {
        const obj = e.target;
        if (obj && obj.__isArtboard) {
          const w = (obj.width || 0) * (obj.scaleX || 1);
          const h = (obj.height || 0) * (obj.scaleY || 1);
          obj.set({ width: w, height: h, scaleX: 1, scaleY: 1 });
          obj.setCoords();
        }
        recomputeMembership();
        refreshArtboards();
      });

      canvas.on('selection:created', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (obj && obj.__artboardId) setActiveArtboardId(obj.__artboardId);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) renderAnchorHandles(obj);
      });
      canvas.on('selection:updated', (e: any) => {
        const obj: any = e.selected ? canvas.getActiveObject() : null;
        setSelected(obj);
        if (obj && obj.__artboardId) setActiveArtboardId(obj.__artboardId);
        if (activeToolRef.current === 'direct' && obj && obj.isVectorPath) renderAnchorHandles(obj);
        else clearAnchorHandles();
      });
      canvas.on('selection:cleared', () => {
        setSelected(null);
        clearAnchorHandles();
      });
      canvas.on('object:scaling', () => bumpSel());
      canvas.on('object:moving', (e: any) => {
        bumpSel();
        const obj = e.target;
        const disableSnap = e.e && (e.e.ctrlKey || e.e.metaKey);
        if (activeToolRef.current === 'select' && obj && !obj.__isArtboard && !disableSnap) {
          const zoom = canvas.getZoom() || 1;
          const threshold = 8 / zoom;
          const moving = obj.getBoundingRect();
          const targets = canvas
            .getObjects()
            .filter(
              (o: any) =>
                o !== obj &&
                !o.__isAnchorHandle &&
                !o.__isPenPreview &&
                !o.__isShapeDraft &&
                !o.__isPrintMark &&
                o.visible !== false
            )
            .map((o: any) => o.getBoundingRect());
          const { dx, dy, guides } = computeSnap(moving, targets, threshold);
          if (dx || dy) {
            obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy });
            obj.setCoords();
          }
          snapGuidesRef.current = guides;
        } else {
          snapGuidesRef.current = [];
        }
        renderAnchorHandles(e.target);
      });

      canvas.on('mouse:down', (opt: any) => {
        if (activeToolRef.current === 'pan') {
          panRef.current = { active: true, lastX: opt.e.clientX, lastY: opt.e.clientY };
          canvas.setCursor('grabbing');
          return;
        }
        if (activeToolRef.current === 'artboard') {
          handleArtboardMouseDown(opt);
          return;
        }
        if (activeToolRef.current === 'pen') handlePenMouseDown(opt);
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseDown(opt);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (panRef.current.active) {
          const dx = opt.e.clientX - panRef.current.lastX;
          const dy = opt.e.clientY - panRef.current.lastY;
          panRef.current.lastX = opt.e.clientX;
          panRef.current.lastY = opt.e.clientY;
          canvas.relativePan(new F.Point(dx, dy));
          return;
        }
        if (activeToolRef.current === 'artboard') {
          handleArtboardMouseMove(opt);
          return;
        }
        if (activeToolRef.current === 'pen') handlePenMouseMove(opt);
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseMove(opt);
      });
      canvas.on('mouse:up', (opt: any) => {
        if (snapGuidesRef.current.length > 0) {
          snapGuidesRef.current = [];
          canvas.requestRenderAll();
        }
        if (panRef.current.active) {
          panRef.current.active = false;
          canvas.setCursor(activeToolRef.current === 'pan' ? 'grab' : 'default');
          return;
        }
        if (activeToolRef.current === 'artboard') {
          handleArtboardMouseUp();
          return;
        }
        if (activeToolRef.current === 'pen') handlePenMouseUp();
        else if (isDrawTool(activeToolRef.current)) handleShapeMouseUp();
      });

      canvas.on('mouse:wheel', (opt: any) => {
        const e = opt.e as WheelEvent;
        e.preventDefault();
        e.stopPropagation();
        if (e.ctrlKey || e.metaKey) {
          let z = canvas.getZoom();
          z *= 0.999 ** e.deltaY;
          z = Math.max(0.1, Math.min(2, z));
          canvas.zoomToPoint(new F.Point(e.offsetX, e.offsetY), z);
          setZoom(Math.round(z * 100));
        } else {
          canvas.relativePan(new F.Point(-e.deltaX, -e.deltaY));
        }
      });

      // Decorative border/shadow drawn straight onto the live lower canvas after
      // each render. toDataURL()/toCanvasElement() render objects into a fresh
      // offscreen canvas instead of this element, so this never leaks into
      // PNG/JPG/PDF exports.
      canvas.on('after:render', () => {
        const ctx = canvasRef.current?.getContext('2d');
        const vt = canvas.viewportTransform;
        if (!ctx || !vt) return;
        const abs = canvas.getObjects().filter((o: any) => o.__isArtboard);

        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 16;
        ctx.shadowOffsetY = 3;
        ctx.strokeStyle = 'rgba(0,0,0,0.35)';
        ctx.lineWidth = 1;
        abs.forEach((ab: any) => {
          const x = (ab.left || 0) * vt[0] + vt[4];
          const y = (ab.top || 0) * vt[3] + vt[5];
          const w = (ab.width || 0) * (ab.scaleX || 1) * vt[0];
          const h = (ab.height || 0) * (ab.scaleY || 1) * vt[3];
          ctx.strokeRect(x + 0.5, y + 0.5, Math.max(w - 1, 0), Math.max(h - 1, 0));
        });
        ctx.restore();

        // Non-artwork production guides (bleed/slug/safe area) — drawn the
        // same way as the border above, so they never leak into exports.
        ctx.save();
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        abs.forEach((abRect: any) => {
          const print = abRect.__print;
          if (!print) return;
          const x = (abRect.left || 0) * vt[0] + vt[4];
          const y = (abRect.top || 0) * vt[3] + vt[5];
          const w = (abRect.width || 0) * (abRect.scaleX || 1) * vt[0];
          const h = (abRect.height || 0) * (abRect.scaleY || 1) * vt[3];

          const strokeOutset = (edges: any, color: string) => {
            if (!edges || (!edges.top && !edges.right && !edges.bottom && !edges.left)) return;
            const gx = x - edges.left * vt[0];
            const gy = y - edges.top * vt[3];
            const gw = w + (edges.left + edges.right) * vt[0];
            const gh = h + (edges.top + edges.bottom) * vt[3];
            ctx.setLineDash([4, 3]);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.strokeRect(gx + 0.5, gy + 0.5, Math.max(gw - 1, 0), Math.max(gh - 1, 0));
          };

          const sa = print.safeArea;
          if (sa && (sa.top || sa.right || sa.bottom || sa.left)) {
            const gx = x + sa.left * vt[0];
            const gy = y + sa.top * vt[3];
            const gw = w - (sa.left + sa.right) * vt[0];
            const gh = h - (sa.top + sa.bottom) * vt[3];
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(59,130,246,0.85)';
            ctx.lineWidth = 1;
            ctx.strokeRect(gx + 0.5, gy + 0.5, Math.max(gw - 1, 0), Math.max(gh - 1, 0));
          }

          strokeOutset(print.bleed, 'rgba(239,68,68,0.9)');

          const b = print.bleed || { top: 0, right: 0, bottom: 0, left: 0 };
          const s = print.slug;
          if (s && (s.top || s.right || s.bottom || s.left)) {
            strokeOutset(
              { top: b.top + s.top, right: b.right + s.right, bottom: b.bottom + s.bottom, left: b.left + s.left },
              'rgba(245,158,11,0.85)'
            );
          }
        });
        ctx.setLineDash([]);
        ctx.restore();

        // Smart-guide snap lines, live only while dragging an object near a
        // matching edge/center on another object or an artboard. Cleared on
        // mouse-up, so — like everything else here — purely a live-canvas
        // aid that never reaches an export.
        const guides = snapGuidesRef.current;
        if (guides.length > 0) {
          const vw = canvas.getWidth();
          const vh = canvas.getHeight();
          ctx.save();
          ctx.strokeStyle = 'rgba(255,0,200,0.9)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          guides.forEach((g) => {
            ctx.beginPath();
            if (g.axis === 'v') {
              const x = g.position * vt[0] + vt[4];
              ctx.moveTo(x + 0.5, 0);
              ctx.lineTo(x + 0.5, vh);
            } else {
              const y = g.position * vt[3] + vt[5];
              ctx.moveTo(0, y + 0.5);
              ctx.lineTo(vw, y + 0.5);
            }
            ctx.stroke();
          });
          ctx.restore();
        }

        // Curve-handle connector lines for the Direct Selection tool — a
        // thin line from each bezier handle back to the anchor it controls,
        // read straight off the live handle/anchor circles so it always
        // matches whatever they're currently at, including mid-drag.
        const handleLinks = directSelectionStateRef.current.handleLinks;
        if (handleLinks.length > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(63,169,232,0.8)';
          ctx.lineWidth = 1;
          ctx.setLineDash([]);
          handleLinks.forEach(({ handle, anchor }) => {
            ctx.beginPath();
            ctx.moveTo(anchor.left * vt[0] + vt[4], anchor.top * vt[3] + vt[5]);
            ctx.lineTo(handle.left * vt[0] + vt[4], handle.top * vt[3] + vt[5]);
            ctx.stroke();
          });
          ctx.restore();
        }
      });

      const pendingSnapshot = pendingSnapshotRef.current;
      pendingSnapshotRef.current = null;

      if (pendingSnapshot) {
        // Switching to a tab that already had a live document in memory —
        // restore it exactly rather than re-fetching from Supabase, which
        // would both waste a round trip and discard any unsaved edits.
        canvas.loadFromJSON(pendingSnapshot.canvasJSON, function () {
          ensureArtboards(canvas, F);
          if (pendingSnapshot.vpt) canvas.setViewportTransform(pendingSnapshot.vpt);
          canvas.renderAll();
          refreshLayers();
          restoreHistory(pendingSnapshot.history.stack, pendingSnapshot.history.index);
          setArtboards(pendingSnapshot.artboards);
          setActiveArtboardId(pendingSnapshot.activeArtboardId);
          setZoom(pendingSnapshot.zoom);
          setUnit(pendingSnapshot.unit);
          setDesignName(pendingSnapshot.designName);
          setDesignId(pendingSnapshot.designId);
          ensureFontsLoadedForCanvasJSON(pendingSnapshot.canvasJSON).then(() => canvas.requestRenderAll());
        });
      } else if (urlDesignId) {
        setDesignId(urlDesignId);
        supabase
          .from('designs')
          .select('*')
          .eq('id', urlDesignId)
          .single()
          .then(({ data, error }) => {
            if (data) {
              setDesignName(data.name);
              setTabs((ts) => ts.map((t) => (t.designId === urlDesignId ? { ...t, name: data.name } : t)));
              canvas.loadFromJSON(data.canvas_json, function () {
                ensureArtboards(canvas, F);
                const first = canvas.getObjects().find((o: any) => o.__isArtboard);
                fitToRect(canvas, {
                  x: first?.left || 0,
                  y: first?.top || 0,
                  width: (first?.width || width) * (first?.scaleX || 1),
                  height: (first?.height || height) * (first?.scaleY || 1),
                });
                canvas.renderAll();
                refreshLayers();
                seedInitialSnapshot();
                ensureFontsLoadedForCanvasJSON(data.canvas_json).then(() => canvas.requestRenderAll());
              });
            }
            if (error) console.error('Failed to load design:', error);
          });
      } else {
        ensureArtboards(canvas, F);
        fitToRect(canvas, { x: 0, y: 0, width, height });
        seedInitialSnapshot();
      }

      setCanvasReady(true);
    });

    return function () {
      setCanvasReady(false);
      if (fabricCanvasRef.current) fabricCanvasRef.current.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, height, urlDesignId]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        canvas.setDimensions({ width: Math.floor(w), height: Math.floor(h) });
        canvas.requestRenderAll();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasReady]);

  const applyZoom = useCallback((updater: number | ((z: number) => number)) => {
    setZoom((prev) => {
      const next = typeof updater === 'function' ? (updater as (z: number) => number)(prev) : updater;
      const clamped = Math.max(10, Math.min(200, Math.round(next)));
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        const center = new (window as any).fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
        canvas.zoomToPoint(center, clamped / 100);
      }
      return clamped;
    });
  }, []);

  // Where new content should land: the active artboard if one exists,
  // otherwise the (0,0)-(width,height) box a brand-new document starts with
  // (id is undefined only in that startup-edge-case fallback).
  const getActiveArtboardRect = (): { id?: string; x: number; y: number; width: number; height: number } => {
    const ab = artboards.find((a) => a.id === activeArtboardId) || artboards[0];
    return ab || { x: 0, y: 0, width, height };
  };

  const addText = () => {
    const ab = getActiveArtboardRect();
    import('fabric').then((mod) => {
      const text = new mod.fabric.IText('Double-click to edit', {
        left: ab.x + ab.width / 2 - 100,
        top: ab.y + ab.height / 2 - 20,
        fontSize: 40,
        fill: '#1A1A1A',
        fontFamily: 'Arial',
      });
      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      ensureFontLoaded(text.fontFamily || 'Arial').then(() => fabricCanvasRef.current?.requestRenderAll());
    });
  };

  const nextImageIdRef = useRef(0);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    if (!file) return;
    const ab = getActiveArtboardRect();
    const reader = new FileReader();
    reader.onload = function (event) {
      import('fabric').then((mod) => {
        mod.fabric.Image.fromURL(event.target ? (event.target.result as string) : '', function (img: any) {
          img.scaleToWidth(300);
          img.set({ left: ab.x + 20, top: ab.y + 20 });
          img.__id = `img_${Date.now()}_${nextImageIdRef.current++}`;
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
        });
      });
    };
    reader.readAsDataURL(file);
  };

  // Swaps the pixel data of the selected image layer for a newly-chosen
  // file, in place — same Fabric object, same __uid/__artboardId/layer
  // position/z-order, same clipPath (crop or custom mask) instance,
  // rotation and opacity untouched. Only the source image and the scale
  // needed to make it cover that same frame change, so this behaves like
  // a real design tool's "Replace Image": the new photo fills the exact
  // area the old one did, proportionally (never stretched), instead of
  // the old image being deleted and a disconnected new layer added.
  const replaceSelectedImage = (file: File) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'image' || active.locked) return;

    // The frame is the image's own current on-canvas footprint — exactly
    // the area it visually occupies now, independent of its natural
    // pixel size or any crop already applied.
    const frameW = (active.width || 1) * (active.scaleX || 1);
    const frameH = (active.height || 1) * (active.scaleY || 1);
    const prevScaleX = active.scaleX || 1;
    const prevScaleY = active.scaleY || 1;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target ? (event.target.result as string) : '';
      if (!dataUrl) return;
      active.setSrc(dataUrl, () => {
        // Fabric's setSrc updates width/height to the new image's natural
        // pixel size but leaves scaleX/scaleY untouched — recompute them
        // so the new image covers the same frame the old one did, using
        // one uniform scale factor (never independent X/Y) so its own
        // aspect ratio is never distorted.
        const naturalW = active.width || 1;
        const naturalH = active.height || 1;
        const scale = Math.max(frameW / naturalW, frameH / naturalH);

        // An existing crop/mask clipPath was sized against the old
        // scale — rescale it by the same ratio so its absolute size and
        // position on screen stay exactly where they were, regardless of
        // how the new image's natural size compares to the old one's.
        if (active.clipPath) {
          const ratioX = prevScaleX / scale;
          const ratioY = prevScaleY / scale;
          active.clipPath.set({
            scaleX: (active.clipPath.scaleX || 1) * ratioX,
            scaleY: (active.clipPath.scaleY || 1) * ratioY,
          });
        } else {
          // No existing crop/mask: a "cover" fit can still overhang the
          // original frame on one axis (e.g. a tall replacement fit into
          // a square frame), so clip to a plain rectangle matching that
          // frame — sized in the image's own local space, i.e. before its
          // new scale is applied — so the new photo never visually
          // exceeds the area the old one occupied.
          const F = (window as any).fabric;
          active.clipPath = new F.Rect({
            width: frameW / scale,
            height: frameH / scale,
            originX: 'center',
            originY: 'center',
          });
        }

        active.set({ scaleX: scale, scaleY: scale, dirty: true });
        // A stale "restore original" backup from the previous photo no
        // longer applies to this one.
        delete active.__originalSrc;
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
      });
    };
    reader.readAsDataURL(file);
  };

  // Opens the Photo Editor workspace on the currently selected image. The
  // FIRST time an image is edited this way, its current pixels become
  // the permanent "pristine" source (__originalSrc, already used
  // elsewhere for "Restore Original Image") so every future edit session
  // re-derives from the same untouched bytes instead of compounding
  // lossy re-encodes — the workspace itself reconstructs whatever crop/
  // adjustments were saved from that pristine copy on open.
  const openPhotoEditor = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'image') return;
    // active.toDataURL({}) would render at whatever size the image
    // currently appears on the Main Design canvas (e.g. 300px wide from
    // the initial upload placement), not its real source resolution —
    // imageObjectToDataURL restores the native pixel data regardless of
    // on-canvas scale, so the Photo Editor always starts from the best
    // available source instead of a display-sized preview.
    if (!active.__originalSrc) active.__originalSrc = imageObjectToDataURL(active);
    setPhotoEditSession({
      targetUid: active.__uid,
      sourceDataUrl: active.__originalSrc,
      initialAdjustments: active.__photoEdits || DEFAULT_ADJUSTMENTS,
      initialCropRect: active.__cropRect || null,
    });
    setWorkspace('photo');
  };

  const closePhotoEditor = () => {
    setPhotoEditSession(null);
    setWorkspace('design');
  };

  // The workspace switcher is always visible (Main Design | Photo
  // Editing), not just once a photo session already exists — switching
  // to Photo Editing with none open yet starts one from the currently
  // selected image, same as the "Edit Photo" button.
  const handleWorkspaceSwitch = (target: EditorWorkspace) => {
    if (target === 'photo' && !photoEditSession) {
      const active = fabricCanvasRef.current?.getActiveObject();
      if (active && active.type === 'image') {
        openPhotoEditor();
      } else {
        alert('Select an image in Main Design first, then switch to Photo Editing.');
      }
      return;
    }
    setWorkspace(target);
  };

  // Bakes the Photo Editor's result back into the SAME image object on
  // the main canvas (matched by __uid, never recreated — same layer,
  // same z-order, same artboard membership), following the exact frame-
  // preserving pattern replaceSelectedImage uses: recompute one uniform
  // cover-scale from the new pixel size, and rescale (not replace) any
  // existing clipPath so the on-screen frame never moves.
  const applyPhotoEdits = (result: PhotoEditResult) => {
    const canvas = fabricCanvasRef.current;
    const session = photoEditSession;
    if (!canvas || !session) return;
    const target = canvas.getObjects().find((o: any) => o.__uid === session.targetUid);
    if (!target) {
      closePhotoEditor();
      return;
    }

    const frameW = (target.width || 1) * (target.scaleX || 1);
    const frameH = (target.height || 1) * (target.scaleY || 1);
    const prevScaleX = target.scaleX || 1;
    const prevScaleY = target.scaleY || 1;

    target.setSrc(result.dataUrl, () => {
      const naturalW = target.width || 1;
      const naturalH = target.height || 1;
      const scale = Math.max(frameW / naturalW, frameH / naturalH);

      if (target.clipPath) {
        const ratioX = prevScaleX / scale;
        const ratioY = prevScaleY / scale;
        target.clipPath.set({
          scaleX: (target.clipPath.scaleX || 1) * ratioX,
          scaleY: (target.clipPath.scaleY || 1) * ratioY,
        });
      } else {
        const F = (window as any).fabric;
        target.clipPath = new F.Rect({
          width: frameW / scale,
          height: frameH / scale,
          originX: 'center',
          originY: 'center',
        });
      }

      target.set({ scaleX: scale, scaleY: scale, dirty: true });
      target.__photoEdits = result.adjustments;
      target.__cropRect = result.cropRect;
      target.setCoords();
      canvas.requestRenderAll();
      bumpSel();
      pushHistory();
      closePhotoEditor();
    });
  };

  const deleteSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    if (active.__isAnchorHandle) {
      // The active object is a Direct Selection helper circle (an anchor or
      // curve handle), not real artwork — route to the anchor-aware delete
      // instead of just removing the circle itself.
      deleteActiveAnchor();
      return;
    }
    if (active.__isArtboard) {
      // Route through the guarded artboard delete (keeps the "can't delete
      // the only artboard" protection instead of silently removing it).
      deleteArtboard(active.__artboardId);
      canvas.discardActiveObject();
      return;
    }
    if (active.type === 'activeSelection') {
      active.forEachObject((obj: any) => {
        if (!obj.locked) canvas.remove(obj);
      });
      canvas.discardActiveObject();
    } else {
      canvas.remove(active);
    }
    clearAnchorHandles();
    canvas.requestRenderAll();
  };

  // Selected real objects (not the activeSelection wrapper itself) in
  // canvas order, so multi-select clone/copy always operates on the
  // actual artwork objects rather than the transient group Fabric builds
  // to represent the selection.
  const getSelectedObjects = (canvas: any): any[] => {
    const active = canvas.getActiveObject();
    if (!active) return [];
    if (active.type === 'activeSelection') return active.getObjects();
    return [active];
  };

  const cloneObjectsAsync = (objects: any[]): Promise<any[]> =>
    Promise.all(objects.map((obj) => new Promise<any>((resolve) => obj.clone((c: any) => resolve(c)))));

  // Adds a set of already-cloned objects back to the canvas as one atomic
  // undo step, shifted by (dx,dy) from their source position, and leaves
  // them selected together afterward (as a real ActiveSelection when more
  // than one, matching how a normal multi-select looks/behaves).
  const addClonesToCanvas = (clones: any[], dx: number, dy: number) => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    suppressHistoryRef.current = true;
    canvas.discardActiveObject();
    clones.forEach((obj: any) => {
      delete obj.__uid;
      obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy, evented: true, locked: false });
      obj.setCoords();
      canvas.add(obj);
    });
    suppressHistoryRef.current = false;

    if (clones.length > 1) {
      const sel = new F.ActiveSelection(clones, { canvas });
      canvas.setActiveObject(sel);
    } else if (clones.length === 1) {
      canvas.setActiveObject(clones[0]);
    }
    canvas.requestRenderAll();
    refreshLayers();
    pushHistory();
  };

  const duplicateSelected = async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (active.__isArtboard) {
      duplicateArtboard(active.__artboardId);
      return;
    }
    const objects = getSelectedObjects(canvas);
    if (!objects.length) return;
    const clones = await cloneObjectsAsync(objects);
    addClonesToCanvas(clones, 20, 20);
  };

  const copySelected = async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    const objects = getSelectedObjects(canvas);
    if (!objects.length) return;
    clipboardRef.current = await cloneObjectsAsync(objects);
    pasteCountRef.current = 0;
  };

  const PASTE_STEP = 20;

  const pasteClipboard = async () => {
    if (!clipboardRef.current || clipboardRef.current.length === 0) return;
    pasteCountRef.current += 1;
    // Re-clone from the stored clipboard on every paste (rather than
    // reusing/mutating the same objects) so repeated Ctrl+V keeps
    // cascading new copies further out instead of moving one object
    // around, and pasting again after moving pasted copies elsewhere
    // still starts from the original copied position.
    const clones = await cloneObjectsAsync(clipboardRef.current);
    const shift = PASTE_STEP * pasteCountRef.current;
    addClonesToCanvas(clones, shift, shift);
  };

  const bringForward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.bringForward(active);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };
  const sendBackward = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.sendBackwards(active);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };
  const bringToFront = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.bringToFront(active);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };
  const sendToBack = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    canvas.sendToBack(active);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };

  const groupSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'activeSelection') return;
    const group = active.toGroup();
    canvas.setActiveObject(group);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
    setSelected(group);
  };

  const ungroupSelected = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'group') return;
    const items = active.toActiveSelection();
    canvas.setActiveObject(items);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
    setSelected(items);
  };

  const toggleLock = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    const nextLocked = !obj.locked;
    obj.set({
      locked: nextLocked,
      selectable: !nextLocked,
      evented: !nextLocked,
      lockMovementX: nextLocked,
      lockMovementY: nextLocked,
      lockScalingX: nextLocked,
      lockScalingY: nextLocked,
      lockRotation: nextLocked,
    });
    if (nextLocked && canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  const toggleVisible = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    obj.set({ visible: obj.visible === false ? true : false });
    if (obj.visible === false && canvas.getActiveObject() === obj) canvas.discardActiveObject();
    canvas.requestRenderAll();
    refreshLayers();
    bumpSel();
    pushHistory();
  };

  const renameLayer = (obj: any, name: string) => {
    obj.set({ name });
    refreshLayers();
    pushHistory();
  };

  const layerLabel = (obj: any, index: number) => obj.name || `${obj.type} ${index + 1}`;

  const reorderLayers = (fromIndex: number, targetIndex: number) => {
    const canvas = fabricCanvasRef.current;
    const obj = layers[fromIndex];
    const objs = canvas.getObjects();
    const targetCanvasIdx = objs.length - 1 - targetIndex;
    canvas.moveTo(obj, targetCanvasIdx);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };

  const alignObject = (mode: 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    const objW = active.getScaledWidth();
    const objH = active.getScaledHeight();
    // Align relative to whichever artboard the object is actually on,
    // falling back to the active artboard for objects on the pasteboard.
    const ownAb = artboards.find((a) => a.id === active.__artboardId);
    const ab = ownAb || getActiveArtboardRect();

    switch (mode) {
      case 'left': active.set({ left: ab.x }); break;
      case 'centerH': active.set({ left: ab.x + ab.width / 2 - objW / 2 }); break;
      case 'right': active.set({ left: ab.x + ab.width - objW }); break;
      case 'top': active.set({ top: ab.y }); break;
      case 'centerV': active.set({ top: ab.y + ab.height / 2 - objH / 2 }); break;
      case 'bottom': active.set({ top: ab.y + ab.height - objH }); break;
    }
    active.setCoords();
    canvas.requestRenderAll();
    pushHistory();
    bumpSel();
  };

  const applyProp = (props: Record<string, any>, record = true) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    active.set(props);
    active.setCoords();
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();

    // A newly-picked Google Font may not have finished downloading yet —
    // the canvas draws it with a fallback font until the browser's Font
    // Loading API resolves, and Fabric never re-renders on its own once
    // that happens. Force one more render when it's actually ready.
    if (props.fontFamily && typeof document !== 'undefined' && (document as any).fonts?.load) {
      const bold = active.fontWeight === 'bold' || (typeof active.fontWeight === 'number' && active.fontWeight >= 600);
      const italic = active.fontStyle === 'italic';
      const spec = `${italic ? 'italic ' : ''}${bold ? '700' : '400'} 16px "${props.fontFamily}"`;
      (document as any).fonts.load(spec).then(() => canvas.requestRenderAll()).catch(() => {});
    }
  };

  // ---------------------------------------------------------------------
  // Artboard CRUD — all real editor state changes (add/rename/resize/
  // duplicate/delete/reorder), each pushing history and refreshing the
  // ArtboardsPanel + Layers the same way every other mutation in this file
  // does.
  // ---------------------------------------------------------------------

  const createArtboardRect = (F: any, x: number, y: number, w: number, h: number, name: string) => {
    const rect = new F.Rect({
      left: x,
      top: y,
      width: w,
      height: h,
      fill: '#ffffff',
      selectable: false,
      evented: false,
      hasControls: false,
      hoverCursor: 'default',
      objectCaching: false,
      lockRotation: true,
    });
    rect.__isArtboard = true;
    rect.__artboardId = createArtboardId();
    rect.__print = createDefaultPrintSettings();
    rect.name = name;
    return rect;
  };

  const addArtboardWithSize = (w: number, h: number) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    import('fabric').then((mod) => {
      const F: any = mod.fabric;
      const metas = getArtboardMetas();
      const pos = nextArtboardPosition(metas);
      const rect = createArtboardRect(F, pos.x, pos.y, w, h, nextArtboardName(metas));
      canvas.add(rect);
      pinArtboardsBack();
      setActiveArtboardId(rect.__artboardId);
      fitToRect(canvas, { x: pos.x, y: pos.y, width: w, height: h });
      canvas.requestRenderAll();
      pushHistory();
    });
  };

  const addArtboardFromPreset = (preset: ArtboardPreset) => addArtboardWithSize(preset.widthPx, preset.heightPx);
  const addArtboardCustom = (w: number, h: number) => addArtboardWithSize(w, h);

  const selectArtboard = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const ab = artboards.find((a) => a.id === id);
    if (!ab) return;
    setActiveArtboardId(id);
    fitToRect(canvas, ab);
  };

  const fitAllArtboards = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    fitToRect(canvas, boundingBoxOfArtboards(artboards));
  };

  const renameArtboard = (id: string, name: string) => {
    const canvas = fabricCanvasRef.current;
    const rect = canvas?.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!rect) return;
    rect.set({ name });
    refreshArtboards();
    pushHistory();
  };

  const resizeArtboard = (id: string, patch: Partial<{ x: number; y: number; width: number; height: number }>) => {
    const canvas = fabricCanvasRef.current;
    const rect = canvas?.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!rect) return;
    const next: Record<string, any> = {};
    if (patch.x != null) next.left = patch.x;
    if (patch.y != null) next.top = patch.y;
    if (patch.width != null) next.width = patch.width;
    if (patch.height != null) next.height = patch.height;
    rect.set(next);
    rect.setCoords();
    recomputeMembership();
    refreshArtboards();
    canvas.requestRenderAll();
    pushHistory();
  };

  const updateArtboardPrint = (id: string, patch: Partial<ArtboardPrintSettings>) => {
    const canvas = fabricCanvasRef.current;
    const rect = canvas?.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!rect) return;
    const current: ArtboardPrintSettings = rect.__print || createDefaultPrintSettings();
    rect.__print = { ...current, ...patch };
    refreshArtboards();
    canvas.requestRenderAll();
    pushHistory();
  };

  const duplicateArtboard = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const srcRect = canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!srcRect) return;

    const metas = getArtboardMetas();
    const pos = nextArtboardPosition(metas);
    const dx = pos.x - (srcRect.left || 0);
    const dy = pos.y - (srcRect.top || 0);
    const newId = createArtboardId();
    const newName = nextArtboardName(metas);
    const members = canvas.getObjects().filter((o: any) => !o.__isArtboard && o.__artboardId === id);

    const finish = () => {
      pinArtboardsBack();
      recomputeMembership();
      refreshArtboards();
      refreshLayers();
      setActiveArtboardId(newId);
      canvas.requestRenderAll();
      pushHistory();
    };

    srcRect.clone((clonedRect: any) => {
      clonedRect.set({ left: pos.x, top: pos.y, name: newName });
      clonedRect.__isArtboard = true;
      clonedRect.__artboardId = newId;
      clonedRect.__print = JSON.parse(JSON.stringify(srcRect.__print || createDefaultPrintSettings()));
      canvas.add(clonedRect);

      if (members.length === 0) {
        finish();
        return;
      }
      let pending = members.length;
      members.forEach((obj: any) => {
        obj.clone((clonedObj: any) => {
          clonedObj.set({ left: (clonedObj.left || 0) + dx, top: (clonedObj.top || 0) + dy });
          delete clonedObj.__uid;
          clonedObj.__artboardId = newId;
          canvas.add(clonedObj);
          pending -= 1;
          if (pending === 0) finish();
        });
      });
    });
  };

  const deleteArtboard = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const metas = getArtboardMetas();
    if (metas.length <= 1) {
      alert("You can't delete the only artboard in a document.");
      return;
    }
    const rect = canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!rect) return;
    canvas.remove(rect);
    recomputeMembership();
    refreshArtboards();
    if (activeArtboardId === id) {
      const remaining = getArtboardMetas();
      setActiveArtboardId(remaining[0]?.id || null);
    }
    canvas.requestRenderAll();
    pushHistory();
  };

  const moveArtboardUp = (index: number) => {
    if (index <= 0) return;
    const canvas = fabricCanvasRef.current;
    const abObjs = canvas.getObjects().filter((o: any) => o.__isArtboard);
    const a = abObjs[index];
    const b = abObjs[index - 1];
    const idxA = canvas.getObjects().indexOf(a);
    const idxB = canvas.getObjects().indexOf(b);
    canvas.moveTo(a, idxB);
    canvas.moveTo(b, idxA);
    pinArtboardsBack();
    refreshArtboards();
    pushHistory();
  };

  const moveArtboardDown = (index: number) => {
    const canvas = fabricCanvasRef.current;
    const abObjs = canvas.getObjects().filter((o: any) => o.__isArtboard);
    if (index >= abObjs.length - 1) return;
    moveArtboardUp(index + 1);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // While the Photo Editor workspace is showing, its own keyboard
      // handling owns the keyboard — without this, e.g. Delete/Ctrl+Z
      // would also fire against the (hidden) Main Design canvas at the
      // same time, silently mutating a document the user can't see.
      if (workspaceRef.current !== 'design') return;
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;

      const isMeta = e.ctrlKey || e.metaKey;
      const active = canvas.getActiveObject();
      const isEditingText = active && active.isEditing;
      const isTypingInField = document.activeElement && ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      const canUseToolShortcuts = !isEditingText && !isTypingInField;

      if (e.key === '?' && canUseToolShortcuts) {
        e.preventDefault();
        setShowShortcuts((v) => !v);
        return;
      }

      if (canUseToolShortcuts && !isMeta && !e.shiftKey) {
        if (e.key.toLowerCase() === 'v') { e.preventDefault(); setActiveTool('select'); return; }
        if (e.key.toLowerCase() === 'a') { e.preventDefault(); setActiveTool('direct'); return; }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); setActiveTool('pen'); return; }
        if (e.key.toLowerCase() === 'h') { e.preventDefault(); setActiveTool('pan'); return; }
        if (e.key.toLowerCase() === 'm') { e.preventDefault(); setActiveTool('marquee-rect'); return; }
        if (e.key.toLowerCase() === 'l') { e.preventDefault(); setActiveTool('lasso'); return; }
        if (e.key.toLowerCase() === 'w') { e.preventDefault(); setActiveTool('magic-wand'); return; }
      }

      if (canUseToolShortcuts && !isMeta && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        setActiveTool('artboard');
        return;
      }

      if (canUseToolShortcuts && activeToolRef.current === 'pen') {
        if (e.key === 'Enter') { e.preventDefault(); finishPenPath(false); return; }
        if (e.key === 'Escape') { e.preventDefault(); clearPenDraft(); return; }
      }

      if (canUseToolShortcuts && isDrawTool(activeToolRef.current) && e.key === 'Escape') {
        e.preventDefault();
        clearShapeDraft();
        setActiveTool('select');
        return;
      }

      if (canUseToolShortcuts && e.shiftKey && e.key === 'Enter') { e.preventDefault(); applyPathAsMask(); return; }

      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); return; }
      if ((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) { e.preventDefault(); redo(); return; }
      if (isMeta && e.key.toLowerCase() === 's' && e.shiftKey) { e.preventDefault(); saveDesignAs(); return; }
      if (isMeta && e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); return; }
      if (isMeta && e.key.toLowerCase() === 'a' && !isEditingText) {
        e.preventDefault();
        const objs = canvas.getObjects().filter((o: any) => !o.locked && !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && !o.__isArtboard);
        if (objs.length) {
          canvas.discardActiveObject();
          const sel = new (window as any).fabric.ActiveSelection(objs, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
        return;
      }
      if (e.key === 'Escape') {
        canvas.discardActiveObject();
        clearAnchorHandles();
        canvas.requestRenderAll();
        setShowShortcuts(false);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'g' && e.shiftKey && canUseToolShortcuts) { e.preventDefault(); ungroupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'g' && canUseToolShortcuts) { e.preventDefault(); groupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'd' && canUseToolShortcuts) { e.preventDefault(); duplicateSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'c' && canUseToolShortcuts) { e.preventDefault(); copySelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'v' && canUseToolShortcuts) { e.preventDefault(); pasteClipboard(); return; }
      if (isMeta && e.key.toLowerCase() === 'l' && canUseToolShortcuts) { e.preventDefault(); active && toggleLock(active); return; }
      if (isMeta && e.key.toLowerCase() === 'h' && canUseToolShortcuts) { e.preventDefault(); active && toggleVisible(active); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && canUseToolShortcuts && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current)) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      if (isMeta && e.key === ']' && !e.shiftKey) { e.preventDefault(); bringForward(); return; }
      if (isMeta && e.key === '[' && !e.shiftKey) { e.preventDefault(); sendBackward(); return; }
      if (isMeta && e.shiftKey && e.key === ']') { e.preventDefault(); bringToFront(); return; }
      if (isMeta && e.shiftKey && e.key === '[') { e.preventDefault(); sendToBack(); return; }
      if (isMeta && (e.key === '=' || e.key === '+')) { e.preventDefault(); applyZoom((z) => z + 10); return; }
      if (isMeta && e.key === '-') { e.preventDefault(); applyZoom((z) => z - 10); return; }
      if (isMeta && e.key === '0') { e.preventDefault(); applyZoom(100); return; }

      if (!isEditingText && active && !active.locked && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current) && e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 10 : 1;
        e.preventDefault();
        if (e.key === 'ArrowUp') active.top -= step;
        if (e.key === 'ArrowDown') active.top += step;
        if (e.key === 'ArrowLeft') active.left -= step;
        if (e.key === 'ArrowRight') active.left += step;
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, finishPenPath, clearPenDraft, applyPathAsMask, setActiveTool, clearAnchorHandles, clearShapeDraft]);

  // Shared by Save (idToUse = the current design's id, or null for a
  // brand-new one) and Save As (idToUse always null, forcing a fresh
  // row) — kept as one function taking explicit id/name rather than two
  // near-duplicate copies each reading designId/designName from the
  // component closure, which would go stale the instant Save As updates
  // that state right before saving.
  const performSave = async (idToUse: string | null, nameToUse: string) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert('You must be logged in to save a design.');
      setSaving(false);
      return;
    }

    const canvasJson = fabricCanvasRef.current.toJSON([
      'name',
      'locked',
      'visible',
      'isVectorPath',
      'clipPath',
      '__uid',
      '__lockRatio',
      '__isArtboard',
      '__artboardId',
      '__print',
      '__originalSrc',
      '__photoEdits',
      '__cropRect',
    ]);
    // width/height stay as the dashboard/thumbnail-facing summary size —
    // the first artboard's current dimensions, not the URL params a brand
    // new document happened to start from.
    const firstAb = artboards[0];
    const payload: any = {
      user_id: user.id,
      name: nameToUse,
      canvas_json: canvasJson,
      width: firstAb ? Math.round(firstAb.width) : width,
      height: firstAb ? Math.round(firstAb.height) : height,
      updated_at: new Date().toISOString(),
    };
    if (idToUse) payload.id = idToUse;

    // A real preview generated from the first artboard's actual content —
    // not a placeholder — so the dashboard can show what the design looks
    // like instead of just its pixel dimensions.
    const thumbnail = firstAb
      ? (() => {
          try {
            const THUMB_WIDTH = 400;
            const mult = THUMB_WIDTH / Math.max(firstAb.width, 1);
            return fabricCanvasRef.current.toDataURL({
              format: 'jpeg',
              quality: 0.7,
              ...getArtboardExportOptions(firstAb, mult),
            });
          } catch (err) {
            console.error('Thumbnail generation failed:', err);
            return null;
          }
        })()
      : null;
    if (thumbnail) payload.thumbnail = thumbnail;

    let { data, error } = await supabase.from('designs').upsert(payload).select().single();

    // The `thumbnail` column may not exist yet on a database created before
    // this feature — fall back to saving without it rather than failing the
    // whole save over a missing preview image.
    if (error && thumbnail && /thumbnail/i.test(error.message || '') && /column|does not exist/i.test(error.message || '')) {
      console.warn(
        'designs.thumbnail column not found — saving without a thumbnail. Add it with: ' +
          'ALTER TABLE designs ADD COLUMN thumbnail text;'
      );
      const { thumbnail: _drop, ...withoutThumbnail } = payload;
      ({ data, error } = await supabase.from('designs').upsert(withoutThumbnail).select().single());
    }

    setSaving(false);

    if (error) {
      console.error('Save failed:', error);
      alert('Failed to save design. Please try again.');
      return;
    }
    if (data) {
      setDesignId(data.id);
      setDesignName(nameToUse);
      const savedTabId = activeTabIdRef.current;
      setTabs((ts) => ts.map((t) => (t.id === savedTabId ? { ...t, id: data.id, designId: data.id, name: nameToUse, dirty: false } : t)));
      if (savedTabId !== data.id) setActiveTabId(data.id);
      // Only a first save (idToUse null) or Save As actually changes the
      // URL's designId, which re-triggers the canvas load effect below —
      // hand it back exactly what's already on screen instead of making
      // it re-fetch what was just written. A plain re-save of an
      // already-loaded design leaves the URL (and so the effect) alone,
      // so there's nothing to hand off.
      if (idToUse !== data.id) {
        pendingSnapshotRef.current = {
          canvasJSON: canvasJson,
          history: { stack: [...historyRef.current.stack], index: historyRef.current.index },
          artboards,
          activeArtboardId,
          zoom,
          unit,
          designName: nameToUse,
          designId: data.id,
          vpt: fabricCanvasRef.current.viewportTransform ? [...fabricCanvasRef.current.viewportTransform] : null,
        };
      }
      router.replace(`/editor?designId=${data.id}&w=${width}&h=${height}`);
    }
  };

  const saveDesign = () => performSave(designId, designName);

  // Forks the current canvas into a brand-new design row under a new
  // name, leaving the original untouched — after this, the editor keeps
  // working on the new copy (standard "Save As" behavior), not the one
  // that was open before.
  // Both "New Design" and "Save As" create a brand-new design row, so
  // both need to respect the same active-design cap — checked here
  // against the real count rather than a cached/stale number.
  const withDesignLimitCheck = async (thenDo: () => void) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const count = await getDesignCount(user.id);
    if (count >= MAX_DESIGNS) {
      setShowDesignLimitDialog(true);
      return;
    }
    thenDo();
  };

  // New Design routes through the existing /create flow — a real page
  // navigation away from /editor and back, which would otherwise unmount
  // this whole component and wipe every other open tab. Persisting the
  // session right before leaving is what lets them survive that round
  // trip; see the mount effect above and lib/editor/tabSession.ts.
  const startNewDesign = () =>
    withDesignLimitCheck(() => {
      persistTabSession();
      router.push('/create');
    });

  const saveDesignAs = () => {
    withDesignLimitCheck(() => {
      const suggested = designName ? `${designName} copy` : 'Untitled Design copy';
      const name = window.prompt('Save As — name for the new design:', suggested);
      if (!name || !name.trim()) return;
      performSave(null, name.trim());
    });
  };

  // Freezes the tab currently on screen into tabSnapshotsRef so it can be
  // restored exactly when switched back to. Called right before swapping
  // in a different tab's document.
  const snapshotCurrentTab = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !activeTabIdRef.current) return;
    tabSnapshotsRef.current.set(activeTabIdRef.current, {
      canvasJSON: canvas.toJSON(SNAPSHOT_PROPS),
      history: { stack: [...historyRef.current.stack], index: historyRef.current.index },
      artboards,
      activeArtboardId,
      zoom,
      unit,
      designName,
      designId,
      vpt: canvas.viewportTransform ? [...canvas.viewportTransform] : null,
    });
  };

  // Writes the whole open-tab session — every tab's frozen snapshot, plus
  // the active tab's CURRENT live state — to sessionStorage. This is what
  // lets other open tabs survive a real page navigation (New Design's
  // round trip through /create) instead of getting silently wiped when
  // this component unmounts. See lib/editor/tabSession.ts.
  const persistTabSession = (tabsOverride?: EditorTabInfo[]) => {
    snapshotCurrentTab();
    saveTabSession({
      tabs: (tabsOverride || tabs).map((t) => ({
        id: t.id,
        designId: t.designId,
        name: t.name,
        width: t.width,
        height: t.height,
        dirty: t.dirty,
      })),
      activeTabId: activeTabIdRef.current,
      snapshots: Object.fromEntries(tabSnapshotsRef.current),
    });
  };

  // Best-effort safety net: also persists on tab close/refresh, so a
  // manual reload doesn't lose other open tabs either (the explicit call
  // in startNewDesign is what fixes the actual reported bug — a real
  // in-app navigation to /create and back).
  useEffect(() => {
    const handler = () => persistTabSession();
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabs]);

  // Swaps the live canvas over to `tab`. If it was open before (a
  // snapshot exists), that snapshot is restored verbatim; if it's a
  // design being opened for the first time this session, the URL change
  // below falls through to the normal Supabase fetch in the canvas-load
  // effect. `isNew` adds it to the tab strip first.
  const activateTab = (tab: EditorTabInfo, opts: { isNew?: boolean } = {}) => {
    if (tab.id === activeTabIdRef.current) return;
    snapshotCurrentTab();
    if (opts.isNew) setTabs((ts) => [...ts, tab]);
    pendingSnapshotRef.current = tabSnapshotsRef.current.get(tab.id) || null;
    setActiveTabId(tab.id);
    const query = tab.designId
      ? `designId=${tab.designId}&w=${tab.width}&h=${tab.height}`
      : `w=${tab.width}&h=${tab.height}`;
    router.replace(`/editor?${query}`, { scroll: false });
  };

  const switchTab = (id: string) => {
    const tab = tabs.find((t) => t.id === id);
    if (tab) activateTab(tab);
  };

  const openDesignAsTab = (design: OpenableDesign) => {
    setShowOpenDialog(false);
    const existing = tabs.find((t) => t.designId === design.id);
    activateTab(
      existing || { id: design.id, designId: design.id, name: design.name, width: design.width, height: design.height, dirty: false },
      { isNew: !existing }
    );
  };

  // Closes a tab. If it has unsaved edits, the user is asked what to do
  // with them (see closeConfirm/UnsavedChangesDialog below) rather than
  // just discarding or auto-saving. Closing the last open tab leaves the
  // editor entirely (back to the dashboard) — there's always at least
  // one document open otherwise.
  const [closeConfirm, setCloseConfirm] = useState<{ id: string; name: string } | null>(null);

  const finishCloseTab = (id: string) => {
    const tabList = tabs;
    tabSnapshotsRef.current.delete(id);
    const remaining = tabList.filter((t) => t.id !== id);

    if (id !== activeTabIdRef.current) {
      setTabs(remaining);
      persistTabSession(remaining);
      return;
    }
    if (remaining.length === 0) {
      clearTabSession();
      router.push('/dashboard');
      return;
    }
    const idx = tabList.findIndex((t) => t.id === id);
    const next = remaining[Math.max(0, idx - 1)] || remaining[0];
    setTabs(remaining);
    persistTabSession(remaining);
    pendingSnapshotRef.current = tabSnapshotsRef.current.get(next.id) || null;
    setActiveTabId(next.id);
    const query = next.designId ? `designId=${next.designId}&w=${next.width}&h=${next.height}` : `w=${next.width}&h=${next.height}`;
    router.replace(`/editor?${query}`, { scroll: false });
  };

  const closeTab = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const tab = tabs.find((t) => t.id === id);
    if (!tab) return;
    if (!tab.dirty) {
      finishCloseTab(id);
      return;
    }
    // The Save option in the confirm dialog below always saves whatever
    // is currently on the live canvas, so the tab being closed has to be
    // the active one before that dialog can offer it.
    if (id !== activeTabIdRef.current) activateTab(tab);
    setCloseConfirm({ id, name: tab.name || 'Untitled Design' });
  };

  const handleCloseConfirmSave = () => {
    if (!closeConfirm) return;
    const id = closeConfirm.id;
    Promise.resolve(saveDesign()).then(() => {
      setCloseConfirm(null);
      finishCloseTab(id);
    });
  };
  const handleCloseConfirmDontSave = () => {
    if (!closeConfirm) return;
    const id = closeConfirm.id;
    setCloseConfirm(null);
    finishCloseTab(id);
  };
  const handleCloseConfirmCancel = () => setCloseConfirm(null);

  const downloadFile = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Crops export to just one artboard's rect, regardless of current pan/
  // zoom, and keeps output resolution independent of the on-screen zoom
  // level (dividing the desired multiplier by the current zoom cancels it
  // out — see fabric's toCanvasElement crop math).
  const getArtboardExportOptions = (ab: { x: number; y: number; width: number; height: number }, baseMultiplier: number) => {
    const canvas = fabricCanvasRef.current;
    const vt = canvas.viewportTransform;
    const zoomLevel = vt[0] || 1;
    const screenX = ab.x * zoomLevel + vt[4];
    const screenY = ab.y * zoomLevel + vt[5];
    return {
      left: screenX,
      top: screenY,
      width: ab.width * zoomLevel,
      height: ab.height * zoomLevel,
      multiplier: baseMultiplier / zoomLevel,
    };
  };

  // Adds real, temporary Fabric objects for the requested production marks
  // right before an export and returns them so the caller can remove them
  // again immediately after. Wrapped in suppressHistoryRef so this never
  // pollutes undo history. Takes an optional print-settings override so
  // the Export dialog's own Include Bleed/Include Marks toggles can
  // decide what to draw for this one export without touching the
  // artboard's own persisted print settings (which stay exactly as the
  // Artboards panel left them).
  const buildAndInsertMarks = (ab: ArtboardMeta, scope: ExportScope, printOverride?: ArtboardPrintSettings) => {
    const F = (window as any).fabric;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas || scope === 'artboard' || scope === 'bleed') return [];
    const print = printOverride || ab.print;
    const marks = buildProductionMarks(F, ab, print.bleed, print.marks, ab.id);
    marks.forEach((m: any) => canvas.add(m));
    canvas.requestRenderAll();
    return marks;
  };
  const removeTemporaryMarks = (marks: any[]) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    marks.forEach((m) => canvas.remove(m));
    canvas.requestRenderAll();
  };

  const exportArtboardPNG = (id: string, opts?: { silent?: boolean; scope?: ExportScope }) => {
    const canvas = fabricCanvasRef.current;
    const ab = artboards.find((a) => a.id === id);
    if (!canvas || !ab) return;
    const scope = opts?.scope || 'artboard';
    const exportRect = getExportRect(ab, ab.print, scope);
    suppressHistoryRef.current = true;
    const marks = buildAndInsertMarks(ab, scope);
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, ...getArtboardExportOptions(exportRect, 2) });
    removeTemporaryMarks(marks);
    suppressHistoryRef.current = false;
    downloadFile(dataUrl, `${designName || 'design'} - ${ab.name}${scope !== 'artboard' ? ` (${scope})` : ''}.png`);
    if (!opts?.silent) {
      setExporting(false);
      setShowExportDialog(false);
    }
  };

  const exportArtboardPDF = async (id: string, scope: ExportScope) => {
    const canvas = fabricCanvasRef.current;
    const ab = artboards.find((a) => a.id === id);
    if (!canvas || !ab) return;
    setExporting(true);
    try {
      const { jsPDF } = await import('jspdf');
      const F = (window as any).fabric;
      const rect = getExportRect(ab, ab.print, scope);
      suppressHistoryRef.current = true;
      const marks = buildAndInsertMarks(ab, scope);
      // jsPDF's own 'px' unit doesn't reliably convert a custom [w,h]
      // format array in this version (verified: it comes out ~33% too
      // big in every dimension) — build in 'pt' and convert ourselves.
      // See lib/editor/pdfExport.ts's toPt() for the full explanation.
      const pdf = new jsPDF({
        orientation: rect.width > rect.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [toPt(rect.width), toPt(rect.height)],
      });
      await exportArtboardsToPDF(pdf, canvas, F, [{ id: ab.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
      removeTemporaryMarks(marks);
      suppressHistoryRef.current = false;
      pdf.save(`${designName || 'design'} - ${ab.name}${scope !== 'artboard' ? ` (${scope})` : ''}.pdf`);
    } catch (err) {
      console.error('Print PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
    setExporting(false);
  };

  const exportArtboardForPrint = (id: string, scope: ExportScope, format: 'png' | 'pdf') => {
    if (format === 'png') exportArtboardPNG(id, { scope });
    else exportArtboardPDF(id, scope);
  };

  const runPreflightCheck = () => {
    const canvas = fabricCanvasRef.current;
    const printSettingsById: Record<string, ArtboardPrintSettings> = {};
    artboards.forEach((ab) => (printSettingsById[ab.id] = ab.print));
    setPreflightIssues(runPreflight(canvas, artboards, printSettingsById));
    setShowPreflight(true);
  };

  const exportAllArtboardsPNG = () => {
    setExporting(true);
    artboards.forEach((ab) => exportArtboardPNG(ab.id, { silent: true }));
    setExporting(false);
  };

  const exportAsPNG = () => {
    setExporting(true);
    const ab = getActiveArtboardRect();
    if (ab.id) {
      exportArtboardPNG(ab.id);
      return;
    }
    const canvas = fabricCanvasRef.current;
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, ...getArtboardExportOptions(ab, 2) });
    downloadFile(dataUrl, `${designName || 'design'}.png`);
    setExporting(false);
    setShowExportDialog(false);
  };
  const exportAsJPG = () => {
    setExporting(true);
    const canvas = fabricCanvasRef.current;
    const ab = getActiveArtboardRect();
    const dataUrl = canvas.toDataURL({ format: 'jpeg', quality: 0.9, ...getArtboardExportOptions(ab, 2) });
    downloadFile(dataUrl, `${designName || 'design'}.jpg`);
    setExporting(false);
    setShowExportDialog(false);
  };

  // File > Export as PDF exports every artboard as its own page, matching
  // how Illustrator treats "the document" as all of its artboards.
  const exportAsPDF = async () => {
    setExporting(true);
    try {
      const [{ jsPDF }, mod] = await Promise.all([import('jspdf'), import('fabric')]);
      const list = artboards.length ? artboards : [{ id: '', x: 0, y: 0, width, height, name: '', print: createDefaultPrintSettings() }];
      const first = list[0];
      const pdf = new jsPDF({
        orientation: first.width > first.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [toPt(first.width), toPt(first.height)],
      });
      if (artboards.length) await exportArtboardsToPDF(pdf, fabricCanvasRef.current, mod.fabric, list);
      else await exportCanvasToPDF(pdf, fabricCanvasRef.current, mod.fabric);
      pdf.save(`${designName || 'design'}.pdf`);
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
    setExporting(false);
    setShowExportDialog(false);
  };

  // Exports artboards fromIndex..toIndex (1-based, inclusive, in the same
  // order they're listed in the Artboards panel) as one multi-page PDF —
  // e.g. "3 to 5" of a 10-artboard document — instead of forcing an
  // all-or-one choice between a single artboard and the whole document.
  // Print Setup's own "Export page range" control — this used to export
  // each page at its raw artboard bounds only, silently ignoring
  // whatever bleed/crop-mark scope was selected right above it in the
  // same panel. Now applies that scope's real getExportRect/marks to
  // EVERY page in the range, the same way the main Export dialog's
  // runExport does, so bleed and marks actually apply across a
  // multi-page Print Setup export instead of only to a single artboard.
  const exportArtboardRangePDF = async (fromIndex: number, toIndex: number, scope: ExportScope = 'artboard') => {
    if (artboards.length === 0) return;
    const lo = Math.max(1, Math.min(fromIndex, toIndex));
    const hi = Math.min(artboards.length, Math.max(fromIndex, toIndex));
    if (lo > hi) return;
    const list = artboards.slice(lo - 1, hi);
    const canvas = fabricCanvasRef.current;
    setExporting(true);
    try {
      const [{ jsPDF }, mod] = await Promise.all([import('jspdf'), import('fabric')]);
      const F = mod.fabric;
      const pages = list.map((ab) => ({ ab, rect: getExportRect(ab, ab.print, scope) }));
      const first = pages[0];
      const pdf = new jsPDF({
        orientation: first.rect.width > first.rect.height ? 'landscape' : 'portrait',
        unit: 'pt',
        format: [toPt(first.rect.width), toPt(first.rect.height)],
      });

      suppressHistoryRef.current = true;
      for (let i = 0; i < pages.length; i++) {
        const { ab, rect } = pages[i];
        if (i > 0) pdf.addPage([toPt(rect.width), toPt(rect.height)], rect.width > rect.height ? 'landscape' : 'portrait');
        const marks = buildAndInsertMarks(ab, scope);
        await exportArtboardsToPDF(pdf, canvas, F, [{ id: ab.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
        removeTemporaryMarks(marks);
      }
      suppressHistoryRef.current = false;

      const rangeLabel = lo === hi ? `page ${lo}` : `pages ${lo}-${hi}`;
      pdf.save(`${designName || 'design'} (${rangeLabel}).pdf`);
    } catch (err) {
      console.error('PDF range export failed:', err);
      alert('Failed to export PDF. Please try again.');
    }
    setExporting(false);
  };

  // Resolves which artboards the Export dialog's chosen range actually
  // covers. "Selected pages" is an explicit checklist in the dialog
  // itself (this editor has no multi-artboard canvas-selection concept
  // to piggyback on), so it can name any subset regardless of order.
  const resolveExportArtboards = (settings: ExportSettings): ArtboardMeta[] => {
    if (!artboards.length) return [];
    switch (settings.rangeMode) {
      case 'current': {
        const ab = artboards.find((a) => a.id === activeArtboardId);
        return ab ? [ab] : [artboards[0]];
      }
      case 'all':
        return artboards;
      case 'selected':
        return artboards.filter((a) => settings.selectedIds.includes(a.id));
      case 'range': {
        const lo = Math.max(1, Math.min(settings.rangeFrom, settings.rangeTo));
        const hi = Math.min(artboards.length, Math.max(settings.rangeFrom, settings.rangeTo));
        return lo <= hi ? artboards.slice(lo - 1, hi) : [];
      }
      default:
        return [];
    }
  };

  // The dialog's Include Bleed/Include Marks toggles apply for this one
  // export only — they never touch (or get saved back to) the artboard's
  // own persisted print settings, which stay whatever the Artboards
  // panel has them set to.
  const exportPrintFor = (ab: ArtboardMeta, settings: ExportSettings): ArtboardPrintSettings => ({
    ...ab.print,
    marks: settings.includeMarks
      ? { crop: true, registration: true, colorBar: true }
      : { crop: false, registration: false, colorBar: false },
  });

  // One export path for every combination the dialog can produce: any
  // page range, any of the three formats, with or without bleed/marks.
  // PDF pages all land in a single multi-page file (matching how a real
  // print-ready document is delivered); PNG/JPG can't hold multiple
  // pages, so each artboard downloads as its own file.
  const runExport = async (settings: ExportSettings) => {
    const canvas = fabricCanvasRef.current;
    const list = resolveExportArtboards(settings);
    if (!list.length) {
      alert('No pages match the selected export range.');
      return;
    }

    const scope: ExportScope = settings.includeMarks ? 'marks' : settings.includeBleed ? 'bleed' : 'artboard';
    setExporting(true);

    try {
      if (settings.format === 'pdf') {
        const [{ jsPDF }, mod] = await Promise.all([import('jspdf'), import('fabric')]);
        const F = mod.fabric;
        const pages = list.map((ab) => {
          const print = exportPrintFor(ab, settings);
          return { ab, print, rect: getExportRect(ab, print, scope) };
        });
        const first = pages[0];
        const pdf = new jsPDF({
          orientation: first.rect.width > first.rect.height ? 'landscape' : 'portrait',
          unit: 'pt',
          format: [toPt(first.rect.width), toPt(first.rect.height)],
        });

        suppressHistoryRef.current = true;
        for (let i = 0; i < pages.length; i++) {
          const { ab, print, rect } = pages[i];
          if (i > 0) pdf.addPage([toPt(rect.width), toPt(rect.height)], rect.width > rect.height ? 'landscape' : 'portrait');
          const marks = buildAndInsertMarks(ab, scope, print);
          await exportArtboardsToPDF(pdf, canvas, F, [{ id: ab.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
          removeTemporaryMarks(marks);
        }
        suppressHistoryRef.current = false;

        const rangeLabel = pages.length === 1 ? pages[0].ab.name : `${pages.length} pages`;
        pdf.save(`${designName || 'design'} (${rangeLabel}).${settings.format}`);
      } else {
        for (const ab of list) {
          const print = exportPrintFor(ab, settings);
          const rect = getExportRect(ab, print, scope);

          // A transparent PNG needs both the canvas's own backgroundColor
          // and this artboard's own white background rect cleared for the
          // capture, then restored right after — this editor's canvas
          // always has both, so without this the "transparent" export
          // would just come back opaque.
          const wantsTransparency = settings.format === 'png' && settings.transparentBackground;
          const savedCanvasBg = canvas.backgroundColor;
          const artboardRectObj = wantsTransparency
            ? canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === ab.id)
            : null;
          const savedArtboardFill = artboardRectObj ? artboardRectObj.fill : undefined;
          if (wantsTransparency) {
            canvas.backgroundColor = '';
            if (artboardRectObj) artboardRectObj.set('fill', '');
          }

          suppressHistoryRef.current = true;
          const marks = buildAndInsertMarks(ab, scope, print);
          const dataUrl = canvas.toDataURL({
            format: settings.format,
            quality: settings.format === 'jpg' ? settings.quality : 1,
            ...getArtboardExportOptions(rect, settings.multiplier),
          });
          removeTemporaryMarks(marks);
          suppressHistoryRef.current = false;

          if (wantsTransparency) {
            canvas.backgroundColor = savedCanvasBg;
            if (artboardRectObj) artboardRectObj.set('fill', savedArtboardFill);
            canvas.requestRenderAll();
          }

          downloadFile(dataUrl, `${designName || 'design'} - ${ab.name}.${settings.format}`);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export. Please try again.');
    }

    setExporting(false);
    setShowExportDialog(false);
  };

  // The dashboard's "Download" action opens the editor with ?autoExport=
  // instead of trying to export a static thumbnail — this runs the exact
  // same export code the toolbar's Export button uses, once the loaded
  // design's artboards are actually available.
  useEffect(() => {
    if (!autoExportFormat || hasAutoExportedRef.current) return;
    if (!canvasReady || artboards.length === 0) return;
    hasAutoExportedRef.current = true;
    if (autoExportFormat === 'png') exportAsPNG();
    else if (autoExportFormat === 'jpg') exportAsJPG();
    else if (autoExportFormat === 'pdf') exportAsPDF();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady, artboards, autoExportFormat]);

  const hasSelection = !!selected;

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New Design', onClick: startNewDesign },
        { label: 'Open...', onClick: () => setShowOpenDialog(true) },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl/Cmd+S', onClick: saveDesign },
        { label: 'Save As...', shortcut: 'Ctrl/Cmd+Shift+S', onClick: saveDesignAs },
        { divider: true },
        { label: 'Export...', onClick: () => setShowExportDialog(true) },
        { label: 'Export as PNG', onClick: exportAsPNG },
        { label: 'Export as JPG', onClick: exportAsJPG },
        { label: 'Export as PDF', onClick: exportAsPDF },
        { label: 'Download (PNG)', onClick: exportAsPNG },
        { divider: true },
        { label: 'Preflight...', onClick: runPreflightCheck },
        { label: 'Print Setup (Bleed/Slug/Marks)', onClick: () => togglePanel('artboards') },
        { label: 'Document Setup', planned: true },
        { divider: true },
        { label: 'Close Design', onClick: () => closeTab(activeTabId) },
        { label: 'Back to Dashboard', onClick: () => router.push('/dashboard') },
      ],
    },
    {
      label: 'Edit',
      items: [
        { label: 'Undo', shortcut: 'Ctrl/Cmd+Z', onClick: undo, disabled: !canUndo },
        { label: 'Redo', shortcut: 'Ctrl/Cmd+Shift+Z', onClick: redo, disabled: !canRedo },
        { divider: true },
        { label: 'Copy', shortcut: 'Ctrl/Cmd+C', onClick: copySelected, disabled: !hasSelection },
        { label: 'Paste', shortcut: 'Ctrl/Cmd+V', onClick: pasteClipboard },
        { label: 'Duplicate', shortcut: 'Ctrl/Cmd+D', onClick: duplicateSelected, disabled: !hasSelection },
        { label: 'Delete', shortcut: 'Delete', onClick: deleteSelected, disabled: !hasSelection },
        { divider: true },
        { label: 'Preferences', planned: true },
      ],
    },
    {
      label: 'Object',
      items: [
        { label: 'Group', shortcut: 'Ctrl/Cmd+G', onClick: groupSelected, disabled: !hasSelection },
        { label: 'Ungroup', shortcut: 'Ctrl/Cmd+Shift+G', onClick: ungroupSelected, disabled: !hasSelection },
        { divider: true },
        { label: 'Bring to Front', shortcut: 'Ctrl/Cmd+Shift+]', onClick: bringToFront, disabled: !hasSelection },
        { label: 'Bring Forward', shortcut: 'Ctrl/Cmd+]', onClick: bringForward, disabled: !hasSelection },
        { label: 'Send Backward', shortcut: 'Ctrl/Cmd+[', onClick: sendBackward, disabled: !hasSelection },
        { label: 'Send to Back', shortcut: 'Ctrl/Cmd+Shift+[', onClick: sendToBack, disabled: !hasSelection },
        { divider: true },
        { label: 'Lock', shortcut: 'Ctrl/Cmd+L', onClick: () => selected && toggleLock(selected), disabled: !hasSelection },
        { label: 'Hide', shortcut: 'Ctrl/Cmd+H', onClick: () => selected && toggleVisible(selected), disabled: !hasSelection },
        { divider: true },
        { label: 'Path Operations (Offset, Simplify...)', planned: true },
        { label: 'Artboard Tool', shortcut: 'Shift+O', onClick: () => setActiveTool('artboard') },
        { label: 'Artboards Panel', onClick: () => togglePanel('artboards') },
      ],
    },
    {
      label: 'Type',
      items: [
        { label: 'Add Text', onClick: addText },
        { divider: true },
        { label: 'Area Type', planned: true },
        { label: 'Type on a Path', planned: true },
        { label: 'Vertical Type', planned: true },
      ],
    },
    {
      label: 'Select',
      items: [
        {
          label: 'Select All',
          shortcut: 'Ctrl/Cmd+A',
          onClick: () => {
            const canvas = fabricCanvasRef.current;
            const objs = canvas.getObjects().filter((o: any) => !o.locked && !o.__isAnchorHandle && !o.__isPenPreview && !o.__isShapeDraft && !o.__isArtboard);
            if (objs.length) {
              canvas.discardActiveObject();
              const sel = new (window as any).fabric.ActiveSelection(objs, { canvas });
              canvas.setActiveObject(sel);
              canvas.requestRenderAll();
            }
          },
        },
        {
          label: 'Deselect',
          shortcut: 'Esc',
          onClick: () => {
            fabricCanvasRef.current?.discardActiveObject();
            fabricCanvasRef.current?.requestRenderAll();
          },
        },
        { divider: true },
        { label: 'Same Fill Color', planned: true },
        { label: 'Same Stroke Color', planned: true },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl/Cmd+"+"', onClick: () => applyZoom((z) => z + 10) },
        { label: 'Zoom Out', shortcut: 'Ctrl/Cmd+"-"', onClick: () => applyZoom((z) => z - 10) },
        { label: 'Actual Size', shortcut: 'Ctrl/Cmd+0', onClick: () => applyZoom(100) },
        { divider: true },
        { label: 'Show Rulers', planned: true },
        { label: 'Show Grid', planned: true },
        { label: 'Show Guides', planned: true },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Properties', onClick: () => togglePanel('properties') },
        { label: 'Layers', onClick: () => togglePanel('layers') },
        { label: 'Align', onClick: () => togglePanel('align') },
        { divider: true },
        { label: 'Swatches', planned: true },
        { label: 'Character', planned: true },
        { label: 'Pathfinder', planned: true },
        { label: 'History', planned: true },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => setShowShortcuts(true) },
        { label: 'Feature Roadmap', onClick: () => setRoadmap({ open: true }) },
      ],
    },
  ];

  return (
    <>
      {/* Next.js hoists <link>/<style> tags found anywhere in the tree
          into the document head. Loaded here (not site-wide) since the
          font picker is only reachable inside the editor. The aliased
          classics (Arial, Times New Roman, ...) aren't real Google Fonts
          names, so they get their own @font-face rules sourced from this
          app's own font proxy instead of the batched Google stylesheet. */}
      <link rel="stylesheet" href={googleFontsStylesheetHref()} />
      <style>{aliasedFontFaceCSS()}</style>
      {checkingAuth && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-50 text-gray-400">
          Checking access...
        </div>
      )}
      <main className="h-screen flex flex-col bg-gray-50">
      <MenuBar menus={menus} leading={<Image src="/logo.png" alt="Magical Touch" width={140} height={28} priority />} />

      <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={switchTab} onClose={closeTab} onAdd={() => setShowOpenDialog(true)} />

      <div className="flex items-center justify-between px-4 py-2 border-b bg-white">
        <div className="flex items-center gap-2">
          <BackBar
            href={cameFromTemplate ? '/templates' : '/dashboard'}
            label={cameFromTemplate ? 'Templates' : 'Dashboard'}
          />
        </div>
        <input
          type="text"
          value={designName}
          onChange={(e) => {
            const name = e.target.value;
            setDesignName(name);
            setTabs((ts) => ts.map((t) => (t.id === activeTabIdRef.current ? { ...t, name } : t)));
          }}
          className="text-sm border rounded px-2 py-1 w-48 text-center"
        />

        <WorkspaceSwitcher workspace={workspace} onSwitch={handleWorkspaceSwitch} />

        <div className="flex items-center gap-2">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl/Cmd+Z)" className="px-2 py-1 border rounded disabled:opacity-30">↶ Undo</button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl/Cmd+Shift+Z)" className="px-2 py-1 border rounded disabled:opacity-30">↷ Redo</button>
          <button onClick={() => setShowShortcuts(true)} title="Keyboard shortcuts (?)" className="p-1.5 border rounded text-gray-500 hover:bg-gray-50">
            <Keyboard size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-xs text-gray-500">Units</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value as DocUnit)} className="text-xs border rounded px-1.5 py-1">
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
            <option value="pt">pt</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={() => applyZoom(zoom - 10)} className="px-2 py-1 border rounded">-</button>
          <span className="text-sm text-gray-600 w-12 text-center">{zoom}%</span>
          <button onClick={() => applyZoom(zoom + 10)} className="px-2 py-1 border rounded">+</button>
        </div>

        <div className="flex items-center gap-2 relative">
          <button onClick={() => setShowExportDialog(true)} disabled={exporting} className="border border-gray-300 text-gray-700 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
            {exporting ? 'Exporting...' : 'Export'}
          </button>
          <button onClick={saveDesign} disabled={saving} className="bg-brand-gradient text-white px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
          <ProfileMenu />
        </div>
      </div>

      {showExportDialog && (
        <ExportDialog
          artboards={artboards}
          activeArtboardId={activeArtboardId}
          exporting={exporting}
          onClose={() => setShowExportDialog(false)}
          onExport={runExport}
        />
      )}

      {showDesignLimitDialog && <DesignLimitDialog onCancel={() => setShowDesignLimitDialog(false)} />}

      {showOpenDialog && (
        <OpenDesignDialog
          currentDesignId={designId}
          openDesignIds={tabs.map((t) => t.designId).filter((id): id is string => !!id)}
          onClose={() => setShowOpenDialog(false)}
          onPick={openDesignAsTab}
        />
      )}

      {closeConfirm && (
        <UnsavedChangesDialog
          designName={closeConfirm.name}
          saving={saving}
          onSave={handleCloseConfirmSave}
          onDontSave={handleCloseConfirmDontSave}
          onCancel={handleCloseConfirmCancel}
        />
      )}

      <div className="flex flex-1 overflow-hidden" style={{ display: workspace === 'design' ? 'flex' : 'none' }}>
        <Toolbar
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          onAddText={addText}
          onImageUpload={handleImageUpload}
          onDuplicate={duplicateSelected}
          onBringForward={bringForward}
          onSendBackward={sendBackward}
          onBringToFront={bringToFront}
          onSendToBack={sendToBack}
          onDelete={deleteSelected}
          onOpenShapeBuilder={openShapeBuilder}
          onOpenRoadmap={(id) => setRoadmap({ open: true, id })}
        />

        <div className="flex-1 overflow-hidden relative" style={{ background: PASTEBOARD_BG }}>
          <Rulers
            fabricCanvasRef={fabricCanvasRef}
            unit={unit}
            originX={getActiveArtboardRect().x}
            originY={getActiveArtboardRect().y}
            artboardWidth={getActiveArtboardRect().width}
            artboardHeight={getActiveArtboardRect().height}
            ready={canvasReady}
          />
          <div
            ref={viewportRef}
            className="absolute overflow-hidden"
            style={{ top: RULER_SIZE, left: RULER_SIZE, right: 0, bottom: 0 }}
          >
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="w-64 bg-white border-l flex flex-col overflow-y-auto">
          {isPanelOpen('properties') && (
            <div className="p-3 border-b">
              <p className="font-semibold text-gray-700 mb-3 text-sm">Properties</p>
              <PropertiesPanel
                activeTool={activeTool}
                selected={selected}
                unit={unit}
                layers={layers}
                maskTargetId={maskTargetId}
                setMaskTargetId={setMaskTargetId}
                applyProp={applyProp}
                applyExactSize={applyExactSize}
                toggleLockRatio={toggleLockRatio}
                alignObject={alignObject}
                groupSelected={groupSelected}
                ungroupSelected={ungroupSelected}
                runShapeBuilder={runShapeBuilder}
                applyPathAsMask={applyPathAsMask}
                removeMask={removeMask}
                applyGradientFill={applyGradientFill}
                gradAngleRef={gradAngleRef}
                pushHistory={pushHistory}
                layerLabel={layerLabel}
                onReplaceImage={replaceSelectedImage}
                onEditPhoto={openPhotoEditor}
              />
            </div>
          )}

          {isPanelOpen('artboards') && (
            <ArtboardsPanel
              artboards={artboards}
              activeArtboardId={activeArtboardId}
              unit={unit}
              onSelect={selectArtboard}
              onRename={renameArtboard}
              onResize={resizeArtboard}
              onDuplicate={duplicateArtboard}
              onDelete={deleteArtboard}
              onMoveUp={moveArtboardUp}
              onMoveDown={moveArtboardDown}
              onAddPreset={addArtboardFromPreset}
              onAddCustom={addArtboardCustom}
              onFitAll={fitAllArtboards}
              onExportOne={(id) => exportArtboardPNG(id)}
              onExportAll={exportAllArtboardsPNG}
              onExportAllPDF={exportAsPDF}
              onExportRangePDF={exportArtboardRangePDF}
              onUpdatePrint={updateArtboardPrint}
              onExportPrint={exportArtboardForPrint}
              onRunPreflight={runPreflightCheck}
            />
          )}

          {isPanelOpen('align') && (
            <div className="border-b">
              <AlignPanel alignObject={alignObject} hasSelection={hasSelection} />
            </div>
          )}

          {isPanelOpen('layers') && (
            <LayersPanel
              layers={layers}
              selected={selected}
              onSelect={(obj) => {
                fabricCanvasRef.current.setActiveObject(obj);
                fabricCanvasRef.current.requestRenderAll();
                setSelected(obj);
              }}
              onToggleVisible={toggleVisible}
              onToggleLock={toggleLock}
              onRename={renameLayer}
              onReorder={reorderLayers}
            />
          )}
        </div>
      </div>

      {photoEditSession && (
        <div className="flex flex-1 overflow-hidden" style={{ display: workspace === 'photo' ? 'flex' : 'none' }}>
          <PhotoEditorWorkspace
            active={workspace === 'photo'}
            sourceDataUrl={photoEditSession.sourceDataUrl}
            initialAdjustments={photoEditSession.initialAdjustments}
            initialCropRect={photoEditSession.initialCropRect}
            onApply={applyPhotoEdits}
            onCancel={closePhotoEditor}
          />
        </div>
      )}

      {liveDim && (
        <div style={{ position: 'fixed', left: liveDim.x + 16, top: liveDim.y + 16, pointerEvents: 'none' }} className="z-50 bg-black/80 text-white text-[11px] font-mono px-2 py-1 rounded shadow">
          W: {liveDim.w} {unit}
          {liveDim.h !== '—' && <> · H: {liveDim.h} {unit}</>}
        </div>
      )}

      {artboardLiveDim && (
        <div
          style={{ position: 'fixed', left: artboardLiveDim.x + 16, top: artboardLiveDim.y + 16, pointerEvents: 'none' }}
          className="z-50 bg-black/80 text-white text-[11px] font-mono px-2 py-1 rounded shadow"
        >
          {artboardLiveDim.w} × {artboardLiveDim.h} px
        </div>
      )}

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <RoadmapModal open={roadmap.open} highlightId={roadmap.id} onClose={() => setRoadmap({ open: false })} />
      <PreflightModal open={showPreflight} issues={preflightIssues} onClose={() => setShowPreflight(false)} />
      </main>
    </>
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div>Loading editor...</div>}>
      <EditorContent />
    </Suspense>
  );
}
