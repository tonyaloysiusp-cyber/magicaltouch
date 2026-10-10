'use client';

import { ThemeSwitch } from '@/components/ThemeSwitch';
import { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { BrandLogo } from '@/components/BrandLogo';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { fetchTemplateById, setTemplateContent, createVersion, Template as TemplateRecord } from '@/lib/templatesData';
import {
  Keyboard,
  ChevronLeft,
  CloudOff,
  Loader2,
  RefreshCw,
  Check,
  Undo2,
  Redo2,
  Wand2,
  Download,
  LayoutTemplate,
  Shapes as ShapesIcon,
  Type as TypeIcon,
  Upload as UploadIcon,
  Brush as BrushIcon,
  PaintBucket,
  Palette,
  Layers as LayersIcon,
  Files,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { LeftRail, RailItem } from '@/components/editor/shell/LeftRail';
import { ContextToolbar, ToolbarActions } from '@/components/editor/shell/ContextToolbar';
import { PagesBar } from '@/components/editor/shell/PagesBar';
import { IconButton, Segmented, Popover, cx } from '@/components/editor/shell/ui';
import { BgRemoveDialog } from '@/components/editor/shell/BgRemoveDialog';
import { ResizeDialog } from '@/components/editor/shell/ResizeDialog';
import { OnboardingDialog } from '@/components/editor/shell/OnboardingDialog';
import { TemplatesPanel } from '@/components/editor/shell/panels/TemplatesPanel';
import { ElementsPanel } from '@/components/editor/shell/panels/ElementsPanel';
import { TextPanel } from '@/components/editor/shell/panels/TextPanel';
import { DrawPanel } from '@/components/editor/shell/panels/DrawPanel';
import { BackgroundPanel } from '@/components/editor/shell/panels/BackgroundPanel';
import { BrandPanel } from '@/components/editor/shell/panels/BrandPanel';
import { HelpPanel } from '@/components/editor/shell/panels/HelpPanel';
import { AdjustPanel } from '@/components/editor/shell/panels/AdjustPanel';
import { useAppTheme } from '@/hooks/useAppTheme';

import { ToolMode, DocUnit, isDrawTool, PASTEBOARD_BG, RULER_SIZE } from '@/lib/editor/types';
import { useDisplayUnit, formatUnit } from '@/lib/editor/units';
import { allFontFacesCSS, ensureFontLoaded, ensureFontsLoadedForCanvasJSON, validateAllFonts, refreshTextMetrics } from '@/lib/editor/googleFonts';
import { getAbsolutePolygonPoints, multiPolygonToPathD } from '@/lib/editor/geometry';
import { exportCanvasToPDF, exportArtboardsToPDF, toPt } from '@/lib/editor/pdfExport';
import { exportArtboardToSVG } from '@/lib/editor/svgExport';
import { computeSnap, computeGuideSnap, computeGridSnap, computeSpacingSnap, computeEdgeSnap, allXAnchors, allYAnchors, GuideLine, SpacingMark } from '@/lib/editor/snapping';
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
import { useGuides } from '@/hooks/useGuides';

import { Toolbar, ToolChip, StripTool } from '@/components/editor/Toolbar';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import { DesignLayersPanel } from '@/components/editor/DesignLayersPanel';
import { ArtboardsPanel } from '@/components/editor/ArtboardsPanel';
import { ExportDialog, ExportSettings } from '@/components/editor/ExportDialog';
import { DesignLimitDialog } from '@/components/DesignLimitDialog';
import { ProfileMenu } from '@/components/ProfileMenu';
import { MAX_DESIGNS, getDesignCount } from '@/lib/profile';
import { PreflightModal } from '@/components/editor/PreflightModal';
import { ShortcutsModal } from '@/components/editor/ShortcutsModal';
import { PreferencesModal } from '@/components/editor/PreferencesModal';
import { VersionHistoryModal } from '@/components/editor/VersionHistoryModal';
import { MenuBar, MenuDef } from '@/components/editor/MenuBar';
import { ContextMenu, ContextMenuEntry } from '@/components/editor/ContextMenu';
import { useWindowPanels } from '@/components/editor/WindowPanels';
import { AlignPanel } from '@/components/editor/AlignPanel';
import { BackBar } from '@/components/BackBar';
import { Rulers } from '@/components/editor/Rulers';
import { GridOverlay } from '@/components/editor/GridOverlay';
import { TabBar, EditorTabInfo } from '@/components/editor/TabBar';
import { OpenDesignDialog, OpenableDesign } from '@/components/editor/OpenDesignDialog';
import { ImportDialog } from '@/components/editor/ImportDialog';
import { UnsavedChangesDialog } from '@/components/editor/UnsavedChangesDialog';
import { loadTabSession, saveTabSession, clearTabSession } from '@/lib/editor/tabSession';
import { WorkspaceSwitcher, EditorWorkspace } from '@/components/editor/WorkspaceSwitcher';
import type { PhotoEditResult, CropRect } from '@/components/photoEditor/PhotoEditorWorkspace';
import { PhotoStudio, PhotoStudioHandle } from '@/components/photoStudio/PhotoStudio';
import { PhotoAdjustments, DEFAULT_ADJUSTMENTS } from '@/lib/editor/photoFilters';
import { imageSourceDataURL } from '@/lib/editor/imageQuality';
import { prepareImageDataUrl } from '@/lib/editor/imagePrep';
import { buildMtd, readMtd, MtdError, fileNameFor, nameFromFileName } from '@/lib/mtd/format';
import { saveMtdFile, pickMtdFile, canWriteSilently, LocalFileRef } from '@/lib/mtd/fileAccess';
import { putHandoff, peekHandoff, takeHandoff, newLocalKey, isLocalTabId, ExternalTarget, isCloudTarget } from '@/lib/mtd/handoff';
import { HAS_CLOUD_DRIVES, providerById, popupIfNeeded, CloudProviderId } from '@/lib/storage/providers';
import { saveToCloud, canSaveSilently } from '@/lib/storage/cloudProject';
import { SaveLocationDialog, SaveLocation } from '@/components/storage/SaveLocationDialog';
import { CloudOpenDialog } from '@/components/storage/CloudOpenDialog';
import { rememberRecent } from '@/lib/mtd/recent';
import { missingFontsIn, fontRequiredMessage } from '@/lib/editor/missingFonts';
import { PERSIST_PROPS, isHelperObject, isArtwork, applyStoredLocks, lockProps, reviveTextPaths } from '@/lib/editor/persist';
import { ensureImageFilters, reviveImageAdjust } from '@/lib/editor/imageAdjust';
import { installParagraphSpacing } from '@/lib/editor/paragraphSpacing';
import { installTextFrames, isFrame, flowStory, syncStories, flowWhileEditing, resizeFrameFromScale, reflowAllStories, drawFrameOverlays, createStory, makeTextFrame, splitIntoColumns, addLinkedFrame, unlinkFrame, nextFrameBox, storyFrames, SAMPLE_ARTICLE } from '@/lib/editor/textFrames';
import { drawCropOverlay, isFramed, fillFrame, cropHandleAt, dragCropHandle, keepCovering, CROP_CURSORS, CropHandle } from '@/lib/editor/frames';
import { BrushSettings, DEFAULT_BRUSH, StrokePoint, strokePathD, createStrokeObject, eraseWithStroke } from '@/lib/editor/brush';
import { useEditorFeatures, TextPreset, clearCharStyle } from '@/hooks/useEditorFeatures';
import { planResize } from '@/lib/editor/smartResize';
import { BrandKit, EMPTY_KIT, loadBrandKit, saveBrandKit, applyBrandToObjects } from '@/lib/editor/brandKit';
import { fromFabricGradient, toFabricGradient, GradientSpec } from '@/lib/editor/gradients';
import { documentColors as collectDocumentColors } from '@/lib/editor/color';
import type { QuickStart } from '@/components/editor/shell/OnboardingDialog';
import { TEXT_BASICS, TEXT_STYLES } from '@/lib/editor/catalog';
import { putDraft, getDraft, deleteDraft, Draft, UNSAVED_KEY } from '@/lib/editor/draftStore';
import { buildZip, dataUrlToBytes } from '@/lib/editor/zip';

const isOpenVectorPath = (o: any): boolean =>
  !!o && o.isVectorPath && o.type === 'path' && Array.isArray(o.path) && o.path.length > 0 && o.path[o.path.length - 1][0] !== 'Z';

// Custom object properties that survive saves and undo (one shared list,
// see lib/editor/persist.ts).
const SAVE_JSON_PROPS = PERSIST_PROPS;

function EditorContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
  const [canvasReady, setCanvasReady] = useState(false);
  // "Opening your design…" while a saved design or template downloads.
  const [opening, setOpening] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  // Background, one-time-per-session audit of every font in the picker —
  // detects a genuinely broken family (a 404 from the proxy, a name
  // Google's since renamed) even if the user never happens to select it,
  // instead of only ever finding out when someone picks a dead font.
  useEffect(() => {
    validateAllFonts();
  }, []);
  // Fabric.js has a narrow, pre-existing render-cache bug: an object's
  // clipPath rebuilt right after a photo edit apply (crop/resize/mask)
  // can throw "this._cacheContext.setTransform is not a function" if the
  // canvas is rendered again within about the next second — reproducible
  // today with nothing more than "Apply to Design" followed quickly by
  // Save or Export, with none of this app's own code at fault. It fires
  // from Fabric's own internal requestAnimationFrame render loop, so
  // there's no call of ours to wrap in a try/catch; ensurePhotoEditsApplied
  // already gives it real time to settle and absorbs one extra render
  // itself, but this is the last line of defense for whatever's left,
  // so a well-understood engine hiccup that doesn't affect the actual
  // exported/saved output never surfaces as an uncaught page error.
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      if (e.message && e.message.includes('_cacheContext.setTransform is not a function')) {
        console.warn('Ignored a known Fabric render-cache quirk:', e.message);
        e.preventDefault();
      }
    };
    window.addEventListener('error', onError);
    return () => window.removeEventListener('error', onError);
  }, []);
  // The pasteboard (area outside every artboard) is a real Fabric canvas
  // fill, not CSS — it has to be updated on the canvas object itself
  // whenever the theme changes, not just via a className.
  const pasteboardBgFor = (t: 'light' | 'dark') => (t === 'dark' ? '#0B0B0D' : '#F1F3F6');

  // The editor is a protected route: a logged-out visitor who lands here
  // directly (typed URL, bookmark, back button) must be bounced to login
  // before they can touch the canvas, not just when they click a CTA on
  // the homepage. The overlay below blocks interaction until this resolves.
  useEffect(() => {
    // Automated browser tests (CI only, flag set at build time) run the
    // editor without an account; production builds never set this.
    if (process.env.NEXT_PUBLIC_E2E === '1') {
      setCheckingAuth(false);
      return;
    }
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push(`/login?next=${encodeURIComponent(window.location.pathname + window.location.search)}`);
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const [zoom, setZoom] = useState(100);
  // Set once the user zooms or pans by hand (then the view is theirs).
  const userMovedViewRef = useRef(false);
  const [layers, setLayers] = useState<any[]>([]);
  const [designName, setDesignName] = useState('Untitled Design');
  const [designId, setDesignId] = useState<string | null>(null);
  // Read by the autosave timer at fire time, which can be several seconds
  // after it was scheduled — reading these refs instead of the state
  // values captured in a stale closure avoids saving under an old id/name
  // (e.g. right after Save As renames the document).
  const designIdRef = useRef(designId);
  const designNameRef = useRef(designName);
  useEffect(() => {
    designIdRef.current = designId;
    designNameRef.current = designName;
  }, [designId, designName]);
  const [saving, setSaving] = useState(false);
  // A real status the user can see at a glance, matching every other
  // cloud editor (Saving.../Saved/Offline/Error) — previously the only
  // feedback was the Save button's own disabled state while a MANUAL
  // save was in flight, with no signal at all for autosave or
  // connectivity loss.
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'unsaved' | 'error' | 'offline'>('idle');
  const dirtyRef = useRef(false);
  // Tabs whose document lives in a .mtd file on the customer's computer,
  // keyed by tab id: where the file is (a writable handle on Chrome/Edge,
  // just its name elsewhere). These tabs are never autosaved to the
  // Magical Touch Design server.
  const localFilesRef = useRef<Map<string, ExternalTarget>>(new Map());
  // "Choose where to keep it" -- shown on the first save of a new design.
  const [saveChooser, setSaveChooser] = useState<{ mode: 'first' | 'saveAs'; busy: string | null; error: string | null } | null>(null);
  const [showCloudOpen, setShowCloudOpen] = useState(false);
  const [localNotice, setLocalNotice] = useState<string | null>(null);
  // Guards performSave against out-of-order writes: a manual Ctrl+S and a
  // background autosave tick (or two autosave ticks around a reconnect)
  // can each start their own upsert independently, and nothing about a
  // network response's arrival order guarantees the LAST one to finish
  // is the one with the newest content — a slow save started first can
  // resolve after a fast one started later and silently overwrite newer
  // content with stale content. While a save is in flight, a second call
  // queues itself here instead of firing a concurrent request; once the
  // in-flight save resolves, the queued call re-runs performSave, which
  // always re-serializes the canvas fresh at that moment — so the queued
  // run captures whatever is on the canvas THEN, not a stale snapshot,
  // and writes stay strictly sequential.
  const saveInFlightRef = useRef(false);
  const lastVersionAtRef = useRef(0);
  const pendingSaveRef = useRef<{ idToUse: string | null; nameToUse: string; opts?: { silent?: boolean; skipChooser?: boolean } } | null>(null);
  // Assigned once scheduleAutosave itself is defined further down (after
  // performSave) — indirected through a ref purely so the effect above,
  // which needs to exist before that point, can still call the latest
  // version without a definition-order problem.
  const scheduleAutosaveRef = useRef<((delayMs?: number) => void) | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    setIsOnline(typeof navigator === 'undefined' ? true : navigator.onLine);
    const goOnline = () => {
      setIsOnline(true);
      // Reconnecting is exactly when a pending edit is most at risk of
      // being lost if the user closes the tab before a manual save —
      // sync immediately rather than waiting out the debounce.
      if (dirtyRef.current) scheduleAutosaveRef.current?.(0);
    };
    const goOffline = () => {
      setIsOnline(false);
      setSaveStatus('offline');
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showDesignLimitDialog, setShowDesignLimitDialog] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  // Off by default per spec: drawing tools (Rectangle, Ellipse, Line,
  // Polygon, Star, Pen) stay active after creating an object instead of
  // silently reverting to Selection — matching Illustrator, not a
  // Canva-style single-shot tool. Persisted locally since it's a pure
  // editing-feel preference, not document data.
  const [returnToSelectAfterCreate, setReturnToSelectAfterCreate] = useState(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem('mt:returnToSelectAfterCreate');
      if (stored != null) setReturnToSelectAfterCreate(stored === 'true');
    } catch {
      // localStorage unavailable (private mode, etc.) — keep the default.
    }
  }, []);
  const returnToSelectAfterCreateRef = useRef(false);
  useEffect(() => {
    returnToSelectAfterCreateRef.current = returnToSelectAfterCreate;
  }, [returnToSelectAfterCreate]);
  const updateReturnToSelectPref = (value: boolean) => {
    setReturnToSelectAfterCreate(value);
    try {
      localStorage.setItem('mt:returnToSelectAfterCreate', String(value));
    } catch {
      // Best-effort only.
    }
  };
  const photoEditorRef = useRef<PhotoStudioHandle>(null);
  const [photoCanUndo, setPhotoCanUndo] = useState(false);
  const [photoCanRedo, setPhotoCanRedo] = useState(false);
  // Resolved once applyPhotoEdits' async setSrc callback actually lands
  // the flattened image on the Main Design canvas -- see
  // ensurePhotoEditsApplied below.
  const pendingPhotoApplyResolveRef = useRef<(() => void) | null>(null);
  const { isOpen: isPanelOpen, toggle: togglePanel } = useWindowPanels(['properties', 'layers', 'artboards']);

  const [artboards, setArtboards] = useState<ArtboardMeta[]>([]);
  // Always-current copy for code that runs from long-lived callbacks
  // (autosave timers, keyboard shortcuts) -- used by .mtd saving.
  const artboardsRef = useRef<ArtboardMeta[]>([]);
  useEffect(() => {
    artboardsRef.current = artboards;
  }, [artboards]);
  const [activeArtboardId, setActiveArtboardId] = useState<string | null>(null);
  const activeArtboardIdRef = useRef<string | null>(null);
  useEffect(() => {
    activeArtboardIdRef.current = activeArtboardId;
  }, [activeArtboardId]);
  const [showPreflight, setShowPreflight] = useState(false);
  const [preflightIssues, setPreflightIssues] = useState<PreflightIssue[]>([]);

  const [selected, setSelected] = useState<any>(null);
  const [, setSelVersion] = useState(0);
  const bumpSel = () => setSelVersion((v) => v + 1);
  // Dragging fires dozens of events a second; the panels only need to
  // catch up once per frame.
  const bumpRafRef = useRef(0);
  const bumpSelSoon = () => {
    if (bumpRafRef.current) return;
    bumpRafRef.current = requestAnimationFrame(() => {
      bumpRafRef.current = 0;
      bumpSel();
    });
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // Global display-unit preference (lib/editor/units.ts) -- shared live
  // with /create and Photo Studio via localStorage, not a state local to
  // this editor. Purely a display choice: it never touches the document's
  // actual stored geometry (which stays in px, see units.ts's header).
  const [unit, setUnit] = useDisplayUnit();
  const unitRef = useRef<DocUnit>(unit);
  useEffect(() => {
    unitRef.current = unit;
  }, [unit]);

  // View: rulers/grid/guides visibility and the three independent snap
  // sources (objects, guides, grid) -- each toggleable on its own,
  // matching the spec's explicit View-menu list.
  const [showRulers, setShowRulers] = useState(true);
  const [showGrid, setShowGrid] = useState(false);
  const [showGuides, setShowGuides] = useState(true);
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [snapToGuides, setSnapToGuides] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [gridSize, setGridSize] = useState(20);
  // Bleed, safe area, margins and columns on screen (never in exports).
  const [showPrintGuides, setShowPrintGuides] = useState(true);
  const showPrintGuidesRef = useRef(true);
  useEffect(() => {
    showPrintGuidesRef.current = showPrintGuides;
    fabricCanvasRef.current?.requestRenderAll();
  }, [showPrintGuides]);
  // Space held down = temporary hand tool, without changing the tool.
  const spaceHeldRef = useRef(false);
  const showGuidesRef = useRef(showGuides);
  const snapToObjectsRef = useRef(snapToObjects);
  const snapToGuidesRef = useRef(snapToGuides);
  const snapToGridRef = useRef(snapToGrid);
  const gridSizeRef = useRef(gridSize);
  useEffect(() => {
    showGuidesRef.current = showGuides;
  }, [showGuides]);
  useEffect(() => {
    snapToObjectsRef.current = snapToObjects;
  }, [snapToObjects]);
  useEffect(() => {
    snapToGuidesRef.current = snapToGuides;
  }, [snapToGuides]);
  useEffect(() => {
    snapToGridRef.current = snapToGrid;
  }, [snapToGrid]);
  useEffect(() => {
    gridSizeRef.current = gridSize;
  }, [gridSize]);

  const [activeTool, setActiveToolState] = useState<ToolMode>('select');
  const activeToolRef = useRef<ToolMode>('select');
  const [maskTargetId, setMaskTargetId] = useState<string>('');

  // Smart-guide snap lines, live only while an object is actively being
  // dragged. Cleared on mouse-up so the guides never persist after a drop.
  const snapGuidesRef = useRef<GuideLine[]>([]);
  const snapSpacingRef = useRef<SpacingMark[]>([]);

  // Alt/Option-drag-to-duplicate (Move tool): captured at mousedown on a
  // real object, live-checked on every 'object:moving' tick so pressing
  // Alt mid-drag still triggers it — matching the Pen tool's own
  // live-modifier convention elsewhere in this file. The dragged object
  // itself keeps moving natively under Fabric's own handling; a real
  // clone is dropped at the drag's ORIGINAL position on mouse-up, once,
  // leaving the original where the drag started and the moved object at
  // its new spot -- the same end result as cloning up front, without
  // needing a synchronous clone before Fabric's native drag begins.
  const altDragRef = useRef<{ obj: any; startLeft: number; startTop: number; triggered: boolean } | null>(null);

  // Each entry is a freshly-cloned Fabric object holding its absolute
  // canvas position at copy time. Kept as a flat array of individual
  // objects rather than a single cloned ActiveSelection/Group — Fabric's
  // Group.clone() doesn't reliably re-bake each child's absolute left/top
  // once the group itself is repositioned and its members are peeled back
  // off with forEachObject(), which was landing multi-object paste/
  // duplicate in the wrong place. Cloning members individually and
  // shifting each by the same delta keeps their relative layout exact.
  const clipboardRef = useRef<any[] | null>(null);
  const clipboardAtRef = useRef(0);
  const pasteCountRef = useRef(0);

  // Fractional sizes are kept (a 148mm page is 559.37px); anything that
  // isn't a sensible number falls back to the default square.
  const sizeParam = (key: string) => {
    const v = parseFloat(searchParams.get(key) || '');
    return Number.isFinite(v) && v >= 1 && v <= 30000 ? v : 1080;
  };
  const width = sizeParam('w');
  const height = sizeParam('h');
  const urlDesignId = searchParams.get('designId');
  const cameFromTemplate = searchParams.get('templateId');
  // Admin "Edit design" from the Template Manager: the template's own
  // content is edited and saved back to the template (with a version
  // snapshot) instead of becoming a customer copy.
  const wantsTemplateEdit = searchParams.get('editTemplate') === '1';
  const [templateEdit, setTemplateEdit] = useState<TemplateRecord | null>(null);
  const [templateSave, setTemplateSave] = useState<{ busy: boolean; msg: string | null }>({ busy: false, msg: null });
  // A .mtd project opened from the customer's computer (see lib/mtd/).
  // Its tab id IS this key; the parsed file waits in lib/mtd/handoff.
  const urlLocalDoc = searchParams.get('localDoc');
  const autoExportFormat = searchParams.get('autoExport'); // 'png' | 'jpg' | 'pdf', from the dashboard's Download action
  const hasAutoExportedRef = useRef(false);
  // "New Photo Project" (dashboard) — lets the Photo Editor be used
  // independently of manually building a Main Design document first:
  // this flag prompts the image picker immediately on load, and once
  // that image lands on the canvas, opens the Photo Editor on it
  // automatically instead of requiring the normal upload -> select ->
  // "Edit Photo" sequence.
  const startInPhotoEditor = searchParams.get('newPhoto') === '1';
  const pendingPhotoStartRef = useRef(startInPhotoEditor);
  // Captured once at mount, independent of the ?newPhoto=1 query param
  // itself (which handleImageUpload clears via router.replace once the
  // Photo Editor opens) — used to hide Main Design's own chrome (the
  // menu bar, the Main Design/Photo Editing switcher) while this first
  // photo is still being edited, since there's no real Main Design
  // document to switch to or manage yet. Once "Apply to Design" closes
  // this initial session, the normal full editor UI comes back — by then
  // there IS a real document worth Main Design's tools.
  const [photoFirstSession] = useState(startInPhotoEditor);
  const hasPromptedPhotoUploadRef = useRef(false);
  // Flips true the first time openPhotoEditor() actually runs. Distinct
  // from `workspace === 'photo'`: right after landing on a "New Photo
  // Project" session, `workspace` still reads its initial 'design' value
  // for the second or two it takes the OS file picker to resolve (or
  // forever, if the user cancels it) — during that gap there's no real
  // Main Design document yet either, so the Main Design/Photo Editing
  // switcher below stays hidden using this flag rather than `workspace`.
  const hasOpenedPhotoEditorOnceRef = useRef(false);

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
        .filter((o: any) => isArtwork(o))
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
    const metas = getArtboardMetas();
    setArtboards(metas);
    // Page-number boxes always show the number of the page they're on.
    const canvas = fabricCanvasRef.current;
    canvas?.getObjects().forEach((o: any) => {
      if (!o.__pageNumber) return;
      const i = metas.findIndex((m) => m.id === o.__artboardId);
      // Format: true (just the number) or a pattern like 'Page {n} of {total}'.
      const fmt = typeof o.__pageNumber === 'string' ? o.__pageNumber : '{n}';
      const label = i >= 0 ? fmt.replace(/\{n\}/g, String(i + 1)).replace(/\{total\}/g, String(metas.length)) : '#';
      if (o.text !== label) {
        o.set({ text: label });
        o.initDimensions?.();
        o.dirty = true;
        canvas.requestRenderAll();
      }
    });
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
      if (!isArtwork(obj)) return;
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
  // Deliberately no `unit` field: the display unit is now a single global
  // preference (lib/editor/units.ts's useDisplayUnit) shared across every
  // tab and page, not a per-tab setting to snapshot/restore.
  interface TabSnapshot {
    canvasJSON: any;
    history: { stack: string[]; index: number };
    artboards: ArtboardMeta[];
    activeArtboardId: string | null;
    zoom: number;
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
    const localHandoff = peekHandoff(urlLocalDoc);
    const freshId = (localHandoff && urlLocalDoc) || urlDesignId || `new-${newTabMarker || Date.now()}`;
    const freshName = localHandoff ? localHandoff.opened.document.name : urlDesignId ? 'Loading…' : 'Untitled Design';

    if (restored && restored.tabs.length) {
      tabSnapshotsRef.current = new Map(Object.entries(restored.snapshots || {}));
      // newTab is stamped fresh by /create on every "New Design" — its
      // presence means this navigation must always become a new tab, even
      // if it happens to land on the exact same blank w/h another already-
      // open tab started from (otherwise indistinguishable from a plain
      // reload of that other tab, since neither has a designId yet).
      const existing = localHandoff
        ? undefined
        : urlLocalDoc
        ? restored.tabs.find((t) => t.id === urlLocalDoc)
        : urlDesignId
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
          name: freshName,
          width,
          height,
          dirty: false,
        };
        setTabs([...restored.tabs, newTab]);
        setActiveTabId(newTab.id);
      }
      return;
    }

    setTabs([{ id: freshId, designId: urlDesignId, name: freshName, width, height, dirty: false }]);
    setActiveTabId(freshId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Set once setActiveTool exists (further down); undo/redo uses it to
  // re-apply the current tool's selectability to the restored objects.
  const reapplyToolRef = useRef<(() => void) | null>(null);
  const setActiveToolRef = useRef<((tool: ToolMode) => void) | null>(null);
  const setPencilOnRef = useRef<((on: boolean) => void) | null>(null);
  const { historyRef, suppressHistoryRef, canUndo, canRedo, pushHistory: pushHistoryRaw, flushHistory, undo, redo, seedInitialSnapshot, restoreHistory, SNAPSHOT_PROPS } =
    useEditorHistory(fabricCanvasRef, () => {
      const canvas = fabricCanvasRef.current;
      if (canvas) {
        applyStoredLocks(canvas);
        reviveTextPaths((window as any).fabric, canvas);
        reviveImageAdjust((window as any).fabric, canvas);
        pinArtboardsBack();
        recomputeMembership();
        refreshArtboards();
        reapplyToolRef.current?.();
      }
      refreshLayers();
      setSelected(fabricCanvasRef.current?.getActiveObject() || null);
      // An undo is a real change to the document: mark it for saving.
      markDirtyRef.current?.();
    });
  const markDirtyRef = useRef<(() => void) | null>(null);

  // Marks the active tab dirty on every edit. pushHistory is already
  // called from every mutation site in this file (see grep: ~40 call
  // sites), so wrapping this one symbol is enough to cover the unsaved
  // indicator without touching each of them individually.
  const pushHistory = useCallback(() => {
    // Text frames: a style changed on one frame goes to its whole story,
    // and removed frames hand their words to the rest, before recording.
    const fc = fabricCanvasRef.current;
    if (fc && !suppressHistoryRef.current && (window as any).fabric && fc.getObjects().some(isFrame)) syncStories((window as any).fabric, fc);
    pushHistoryRaw();
    // A programmatic canvas rebuild (restoring a tab snapshot, loading a
    // just-saved design after its id-changing router.replace, undo/redo)
    // also fires the same object:added events a real edit would — the
    // undo stack already ignores these via suppressHistoryRef, and the
    // dirty/autosave tracking needs the same guard or every first save of
    // a new document would immediately re-mark itself unsaved and loop.
    if (suppressHistoryRef.current) return;
    markDirty();
  }, [pushHistoryRaw]);

  // Marks the document as changed: unsaved indicator, autosave, and a
  // revision counter so a save that finishes after a newer edit never
  // clears the "unsaved" state for that edit.
  const editRevRef = useRef(0);
  const setDocRevRef = useRef<((f: (n: number) => number) => void) | null>(null);
  function markDirty() {
    const id = activeTabIdRef.current;
    if (!id) return;
    editRevRef.current += 1;
    setDocRevRef.current?.((n: number) => n + 1);
    setTabs((ts) => (ts.some((t) => t.id === id && !t.dirty) ? ts.map((t) => (t.id === id ? { ...t, dirty: true } : t)) : ts));
    dirtyRef.current = true;
    setSaveStatus((s) => (s === 'saving' ? s : 'unsaved'));
    scheduleAutosaveRef.current?.();
    scheduleDraftBackup();
  }
  markDirtyRef.current = markDirty;

  // A copy of unsaved work is kept on this device until it's saved.
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function draftKey() {
    if (isLocalTabId(activeTabIdRef.current)) return null;
    return designIdRef.current || UNSAVED_KEY;
  }
  function scheduleDraftBackup() {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      const canvas = fabricCanvasRef.current;
      const key = draftKey();
      if (!canvas || !key || loadFailedIdRef.current) return;
      try {
        const first = artboardsRef.current[0];
        putDraft({
          key,
          json: canvas.toJSON(PERSIST_PROPS),
          name: designNameRef.current || 'Untitled Design',
          width: first ? first.width : width,
          height: first ? first.height : height,
          savedAt: Date.now(),
        });
      } catch {
        // Not critical.
      }
    }, 1500);
  }
  const [draftOffer, setDraftOffer] = useState<Draft | null>(null);

  const {
    stateRef: directSelectionStateRef,
    clearHandles: clearAnchorHandles,
    renderHandles: renderAnchorHandles,
    deleteActiveAnchor,
    breakActiveAnchor,
    reversePathObject,
    closeActivePath,
    joinPathObjects,
  } = useDirectSelection({
    fabricCanvasRef,
    onAnchorMoved: pushHistory,
  });

  const {
    draftRef: penDraftRef,
    clearDraft: clearPenDraft,
    finishPath: finishPenPath,
    removeLastAnchor: removeLastPenAnchor,
    handleMouseDown: handlePenMouseDown,
    handleMouseMove: handlePenMouseMove,
    handleMouseUp: handlePenMouseUp,
    drawOverlay: penDrawOverlay,
  } =
    usePenTool({
      fabricCanvasRef,
      onPathFinished: (pathObj) => {
        const canvas = fabricCanvasRef.current;
        canvas.add(pathObj);
        if (returnToSelectAfterCreateRef.current) {
          setActiveToolRef.current?.('select');
          canvas.setActiveObject(pathObj);
        } else {
          // Pen tool stays active (Illustrator's own behavior) — the
          // finished path must go back to non-interactive like every
          // other object while a draw tool is loaded, or a click meant to
          // start the NEXT path could instead grab/drag this one.
          pathObj.set({ selectable: false, evented: false });
        }
        canvas.requestRenderAll();
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
        // was set, which the object:added handler's __uid assignment
        // deliberately skips, same as recomputeMembership() below) before
        // it became "real" here — nothing re-fires object:added at this
        // point, so it would otherwise keep __uid === undefined forever
        // (confirmed via a real duplicate/group/ungroup sweep: every OTHER
        // object gets a real __uid, but the very first shape drawn on a
        // fresh document never does, since it's the one object that's
        // always created through this exact draft-then-finalize path).
        // Assign it explicitly here, matching the same scheme.
        if (!obj.__uid) obj.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        // Its artboard membership was never actually computed against its
        // final position/size for the same reason — do it explicitly now,
        // or the shape can end up with no __artboardId at all and
        // silently vanish from that artboard's PNG/PDF export.
        recomputeMembership();
        refreshLayers();
        pushHistory();
        if (returnToSelectAfterCreateRef.current) {
          setActiveToolRef.current?.('select');
          canvas.setActiveObject(obj);
        } else {
          // The shape tool stays loaded (Illustrator's own behavior: draw
          // several rectangles in a row without reselecting the tool) —
          // the just-drawn shape has to go back to non-interactive like
          // every other object while a draw tool is active, or a click
          // meant to start the NEXT shape could instead grab/drag this one.
          obj.set({ selectable: false, evented: false });
        }
        canvas.requestRenderAll();
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

  const {
    guidesLocked,
    setGuidesLocked,
    startGuideFromRuler,
    clearGuides,
    deleteGuide,
    setGuidesVisible,
    applyGuideInteractivity,
  } = useGuides({
    fabricCanvasRef,
    activeToolRef,
    onGuideChange: pushHistory,
  });

  useEffect(() => {
    setGuidesVisible(showGuides);
  }, [showGuides, setGuidesVisible]);

  const applyPathAsMask = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const pathObj = canvas.getActiveObject();
    if (!pathObj || !pathObj.isVectorPath) {
      setLocalNotice('Select a closed vector path first, then choose a target image below.');
      return;
    }
    if (!maskTargetId) {
      setLocalNotice('Choose a target image to mask in the Properties panel.');
      return;
    }
    const targetImage = canvas.getObjects().find((o: any) => o.type === 'image' && o.__id === maskTargetId);
    if (!targetImage) {
      setLocalNotice('Target image not found.');
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

  const applyExactSize = useCallback(
    (newWpx: number | null, newHpx: number | null) => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.locked) return;

      // Real area-text resize: width IS the actual wrap width (Fabric
      // re-wraps automatically when it changes), and height always stays
      // derived from the wrapped content — scaling a text box like a
      // raster shape would stretch/distort the glyphs, which no real
      // text tool does. Height edits are a no-op here (the field is
      // disabled for text objects in the Properties panel).
      if (active.type === 'textbox') {
        if (newWpx != null && newWpx > 0) active.set({ width: newWpx });
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
        return;
      }

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

  // Keep proportions: the side handles (which stretch) are hidden, so the
  // corner handles, typed sizes and resizing all keep the shape's ratio.
  const applyRatioLockControls = (o: any) => {
    if (!o?.setControlsVisibility || o.type === 'textbox') return;
    const show = !o.__lockRatio;
    o.setControlsVisibility({ ml: show, mr: show, mt: show, mb: show });
  };
  const toggleLockRatio = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active) return;
    active.__lockRatio = !active.__lockRatio;
    applyRatioLockControls(active);
    canvas.requestRenderAll();
    bumpSel();
    pushHistory();
  };

  const runShapeBuilder = useCallback(
    (op: 'union' | 'subtract' | 'intersect' | 'exclude') => {
      const canvas = fabricCanvasRef.current;
      const active = canvas?.getActiveObject();
      if (!active || active.type !== 'activeSelection') {
        setLocalNotice('Select two or more shapes first (drag a selection box, or Shift-click each one).');
        return;
      }
      const objs: any[] = active.getObjects ? active.getObjects() : [];
      if (objs.length < 2) {
        setLocalNotice('Shape Builder needs at least two selected objects.');
        return;
      }
      const unsupported = objs.filter((o) => !['rect', 'triangle', 'circle', 'ellipse', 'polygon', 'path'].includes(o.type));
      if (unsupported.length > 0) {
        setLocalNotice('Shape Builder only works on vector shapes and paths right now — remove images/text from the selection first.');
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
            setLocalNotice("Shape Builder needs the 'polygon-clipping' package. Run: npm install polygon-clipping");
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
            setLocalNotice('Could not read enough valid shape geometry to run this operation.');
            return;
          }

          let result: number[][][][];
          if (op === 'union') result = polygonClipping.union(...geoms);
          else if (op === 'intersect') result = polygonClipping.intersection(...geoms);
          else if (op === 'exclude') result = polygonClipping.xor(...geoms);
          else result = polygonClipping.difference(geoms[0], ...geoms.slice(1));

          if (!result || result.length === 0) {
            setLocalNotice('This operation produced an empty shape — the selected objects may not overlap the way this operation expects.');
            return;
          }

          const d = multiPolygonToPathD(result);
          const baseFill = ordered[0].fill && typeof ordered[0].fill === 'object' ? ordered[0].fill : typeof ordered[0].fill === 'string' ? ordered[0].fill : '#8CCBFF';
          // hasControls/hasBorders: false for the same reason usePenTool.ts's
          // own path construction sets them -- Direct Selection's anchor
          // circles render at this path's corners, and Fabric's default
          // resize controls would otherwise sit in the same spots and win
          // the hit-test over them.
          // Keeps the first shape's look (fill and border).
          const first = ordered[0];
          const pathObj: any = new F.Path(d, {
            fill: baseFill,
            stroke: typeof first.stroke === 'string' ? first.stroke : '',
            strokeWidth: first.stroke ? first.strokeWidth || 0 : 0,
            strokeUniform: true,
            fillRule: 'evenodd',
            objectCaching: false,
            opacity: first.opacity ?? 1,
            shadow: first.shadow || null,
          });
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
          setLocalNotice('Shape Builder failed on this selection. Please try again.');
        });
    },
    [pushHistory, refreshLayers]
  );


  const setActiveTool = useCallback(
    (tool: ToolMode) => {
      const canvas = fabricCanvasRef.current;
      activeToolRef.current = tool;
      setActiveToolState(tool);

      if (tool !== 'pen') {
        // Leaving the Pen tool keeps a path that already has 2+ points.
        if (penDraftRef.current.anchors.length >= 2) finishPenPath(false);
        else clearPenDraft();
      }
      if (tool !== 'direct') clearAnchorHandles();
      // Paths show their resize/rotate handles everywhere except while
      // their points are being edited with Direct Selection.
      canvas?.getObjects().forEach((o: any) => {
        if (o.isVectorPath) o.set({ hasControls: tool !== 'direct' && !o.locked, hasBorders: tool !== 'direct' });
      });
      clearShapeDraft();
      if (tool !== 'artboard') clearArtboardDraft();

      if (!canvas) return;
      if (canvas.isDrawingMode) {
        canvas.isDrawingMode = false;
        setPencilOnRef.current?.(false);
      }

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
      } else if (tool === 'pen' || tool === 'text' || isDrawTool(tool)) {
        canvas.discardActiveObject();
        canvas.selection = false;
        canvas.forEachObject((o: any) => (o.selectable = false));
        canvas.defaultCursor = tool === 'text' ? 'text' : 'crosshair';
        canvas.hoverCursor = tool === 'text' ? 'text' : 'crosshair';
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
          if (isHelperObject(o)) {
            if (o.__isAnchorHandle) o.evented = true;
            return;
          }
          o.evented = true;
          o.selectable = true;
        });
        canvas.defaultCursor = 'default';
        canvas.hoverCursor = 'move';
        // Direct Selection's anchor handles only ever render from the
        // canvas's own 'selection:created'/'selection:updated' events --
        // which Fabric does NOT fire for a click that lands on whatever
        // object was ALREADY the active one (nothing "changed"). A path
        // is set as the active object the instant Pen finishes drawing
        // it, so switching straight to Direct Selection and clicking
        // that exact path again (the single most natural "draw it, then
        // immediately refine it" sequence) would otherwise show no
        // handles at all until the user deselected and clicked a second
        // time. Render them explicitly for exactly this one case.
        if (tool === 'direct') {
          const active = canvas.getActiveObject();
          if (active && active.isVectorPath) renderAnchorHandles(active);
        }
      }
      // Guides get their own interactivity pass regardless of which branch
      // ran above (every branch's forEachObject would otherwise leave them
      // either always-selectable or always-locked-out) -- only the Select
      // tool, and only when not globally locked, makes them draggable.
      applyGuideInteractivity();
      canvas.requestRenderAll();
    },
    [clearPenDraft, clearAnchorHandles, clearShapeDraft, clearArtboardDraft, applyGuideInteractivity, renderAnchorHandles]
  );
  reapplyToolRef.current = () => setActiveTool(activeToolRef.current);
  setActiveToolRef.current = setActiveTool;

  // Ensures at least one locked, non-rotatable white artboard Rect exists.
  // Everything outside every artboard is the dark pasteboard
  // (canvas.backgroundColor), which objects can freely sit on. Also
  // migrates designs saved before multi-artboard support: an old
  // __isArtboard rect with no id/name gets one stamped on so it becomes
  // "Artboard 1" instead of silently losing its identity.
  const ensureArtboards = (canvas: any, F: any) => {
    canvas.backgroundColor = pasteboardBgFor(theme);
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
    applyStoredLocks(canvas);
    reviveTextPaths(F, canvas);
    reviveImageAdjust(F, canvas);
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
    z = Math.max(0.05, Math.min(4, z));
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

      // Saved designs can contain this app's own photo filters; they must be
      // known before anything is loaded.
      ensureImageFilters(F);
      installParagraphSpacing(F);
      installTextFrames(F);
      const canvas = new F.Canvas(canvasRef.current, {
        width: initialW,
        height: initialH,
        backgroundColor: pasteboardBgFor(theme),
        // Pointer events carry stylus pressure (Apple Pencil) and work the
        // same for mouse, touch and pen.
        enablePointerEvents: true,
        preserveObjectStacking: true,
        fireRightClick: false,
      });
      fabricCanvasRef.current = canvas;
      (window as any).fabric = F;

      // Ruler guides stay one screen pixel thick at any zoom.
      canvas.on('before:render', () => {
        const z = canvas.getZoom() || 1;
        canvas.getObjects().forEach((o: any) => {
          if (o.__isGuide && o.strokeWidth !== 1 / z) o.strokeWidth = 1 / z;
        });
      });

      // A transparent page shows the usual grey-and-white checkerboard on
      // screen only (exports render into their own canvas and skip this).
      const checker = document.createElement('canvas');
      checker.width = checker.height = 16;
      const cctx = checker.getContext('2d');
      if (cctx) {
        cctx.fillStyle = '#FFFFFF';
        cctx.fillRect(0, 0, 16, 16);
        cctx.fillStyle = '#E4E4E7';
        cctx.fillRect(0, 0, 8, 8);
        cctx.fillRect(8, 8, 8, 8);
      }
      const baseRenderBackground = canvas._renderBackground.bind(canvas);
      canvas._renderBackground = function (ctx: CanvasRenderingContext2D) {
        baseRenderBackground(ctx);
        if (ctx !== canvas.contextContainer) return;
        const vt = canvas.viewportTransform;
        const see = canvas.getObjects().filter((o: any) => o.__isArtboard && (!o.fill || o.fill === 'transparent'));
        if (!see.length || !vt) return;
        const pattern = ctx.createPattern(checker, 'repeat');
        if (!pattern) return;
        ctx.save();
        ctx.fillStyle = pattern;
        see.forEach((ab: any) => {
          const x = (ab.left || 0) * vt[0] + vt[4];
          const y = (ab.top || 0) * vt[3] + vt[5];
          ctx.fillRect(x, y, (ab.width || 0) * (ab.scaleX || 1) * vt[0], (ab.height || 0) * (ab.scaleY || 1) * vt[3]);
        });
        ctx.restore();
      };
      // Exposed the same way `window.fabric` already is — lets tests and
      // debugging tools inspect real document state (anchors, handles,
      // z-order, history) directly instead of guessing from pixels.
      (window as any).__fabricCanvas = canvas;

      // Tool previews, anchor handles and other helpers are never part of
      // the document: keep them out of saves, undo and the layers list.
      const onLayersChanged = (e: any) => {
        if (isHelperObject(e?.target)) return;
        refreshLayers();
      };
      const onHistoryChanged = (e: any) => {
        if (isHelperObject(e?.target)) return;
        // While cropping, the photo is moved freely inside its frame; the
        // crop becomes one undo step when it's finished.
        if (featuresRef.current?.cropRef.current) return;
        pushHistory();
      };

      canvas.on('object:added', (e: any) => {
        const obj: any = e.target;
        if (isHelperObject(obj)) {
          obj.excludeFromExport = true;
          return;
        }
        if (obj && !obj.__isArtboard && !obj.__uid) {
          obj.__uid = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        }
        // 'editing:entered'/'editing:exited' fire on the text object
        // itself, not the canvas (unlike 'text:selection:changed' and
        // 'text:changed', which Fabric explicitly re-fires on the canvas)
        // — so each IText/Textbox needs its own listener the moment it's
        // added, or the Properties Panel never learns editing started or
        // stopped and keeps showing stale character-vs-whole-object state.
        if (obj && (obj.type === 'i-text' || obj.type === 'text' || obj.type === 'textbox') && !obj.__editingListenersBound) {
          obj.__editingListenersBound = true;
          obj.on('editing:entered', () => bumpSel());
          obj.on('editing:exited', () => bumpSel());
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
      canvas.on('object:added', (e: any) => {
        if (isHelperObject(e?.target)) return;
        recomputeMembership();
        refreshArtboards();
      });
      canvas.on('object:removed', (e: any) => {
        if (isHelperObject(e?.target)) return;
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

      // A multi-selection that contains a locked object can't be moved,
      // resized or rotated (the locked one would move with it).
      const guardLockedSelection = () => {
        const sel = canvas.getActiveObject();
        if (!sel || sel.type !== 'activeSelection') return;
        const anyLocked = sel.getObjects().some((o: any) => o.locked);
        sel.set({
          lockMovementX: anyLocked,
          lockMovementY: anyLocked,
          lockScalingX: anyLocked,
          lockScalingY: anyLocked,
          lockRotation: anyLocked,
          hasControls: !anyLocked,
        });
      };
      canvas.on('selection:created', guardLockedSelection);
      canvas.on('selection:updated', guardLockedSelection);
      canvas.on('object:rotating', (e: any) => {
        const t = e.target;
        if (t && e.e?.shiftKey) {
          const snapped = Math.round((t.angle || 0) / 15) * 15;
          if (snapped !== t.angle) {
            t.rotate(snapped);
            t.setCoords();
          }
        }
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
        // Clicking straight from a selected path onto one of its OWN
        // anchor/handle circles fires this same event (Fabric emits
        // 'selection:updated', not 'selection:cleared'+'selection:created',
        // whenever the active object changes directly from one object to
        // another) — the circle itself isn't a vector path, but selecting
        // it is exactly how a user grabs an anchor to move/delete/break
        // it, so its own handles must stay on screen rather than being
        // wiped out from under the click that just landed on one.
        else if (!obj || !obj.__isAnchorHandle) clearAnchorHandles();
      });
      canvas.on('selection:cleared', () => {
        setSelected(null);
        clearAnchorHandles();
      });
      // Text-specific Fabric events (fired only by IText/Textbox): the
      // Properties Panel's character controls need to know the instant
      // the caret moves or the highlighted range changes, or a
      // just-typed character will silently show whatever formatting
      // values were true at the START of editing instead of the current
      // real cursor/selection position.
      canvas.on('text:selection:changed', () => bumpSel());
      canvas.on('text:changed', (e: any) => {
        // Curved/wavy text re-fits its baseline as the words change.
        const t = e?.target;
        if (isFrame(t)) flowWhileEditing(F, canvas, t);
        if (t && t.__textFx && (t.__textFx.curve || t.__textFx.wave)) {
          import('@/lib/editor/textEffects').then(({ applyTextShape }) => {
            applyTextShape(F, t, t.__textFx.curve, t.__textFx.wave);
            canvas.requestRenderAll();
          });
        }
        bumpSel();
      });
      canvas.on('object:scaling', () => bumpSelSoon());
      // Text frames: resizing changes the box (never the letters) and the
      // story re-flows; removed frames give their words to the others;
      // overflow markers and threads are drawn on screen only.
      const frameResize = (e: any) => isFrame(e?.target) && resizeFrameFromScale(F, canvas, e.target);
      canvas.on('object:scaling', frameResize);
      canvas.on('object:resizing', frameResize);
      canvas.on('object:removed', (e: any) => {
        if (!isFrame(e?.target) || suppressHistoryRef.current) return;
        setTimeout(() => {
          if (suppressHistoryRef.current) return;
          syncStories(F, canvas);
          canvas.requestRenderAll();
        }, 0);
      });
      canvas.on('text:metrics', () => {
        if (canvas.getObjects().some(isFrame)) reflowAllStories(F, canvas);
      });
      canvas.on('after:render', (e: any) => {
        if (e?.ctx && e.ctx !== canvas.contextContainer) return;
        drawFrameOverlays(canvas, canvas.contextContainer);
      });
      canvas.on('object:moving', (e: any) => {
        bumpSelSoon();
        const obj = e.target;
        if (altDragRef.current && obj === altDragRef.current.obj && e.e?.altKey) {
          altDragRef.current.triggered = true;
        }
        const disableSnap = e.e && (e.e.ctrlKey || e.e.metaKey);
        if (activeToolRef.current === 'select' && obj && !obj.__isArtboard && !disableSnap) {
          const zoom = canvas.getZoom() || 1;
          const threshold = 8 / zoom;
          // getBoundingRect(absolute, calculate): `absolute=true` is what
          // actually yields world/document-space coordinates (the default
          // `false` returns SCREEN/viewport-space ones instead, despite the
          // name) -- and `calculate=true` is required too, or it reads the
          // object's last-cached corner coordinates (.aCoords, refreshed by
          // setCoords()) instead of its live position, which during an
          // in-progress drag is one tick stale. Both matter for the `dx`/
          // `dy` this produces, applied straight to `obj.left`/`top`.
          const moving = obj.getBoundingRect(true, true);

          // Snap priority (matches every other design tool): object/artboard
          // edges first, then persistent ruler guides, then the grid --
          // each independently toggleable, and each axis only takes the
          // first source that actually snapped it.
          let dx = 0;
          let dy = 0;
          let smartGuideLines: GuideLine[] = [];

          if (snapToObjectsRef.current) {
            const movingSet = obj.type === 'activeSelection' ? new Set(obj.getObjects()) : null;
            const targetObjs = canvas
              .getObjects()
              .filter(
                (o: any) =>
                  o !== obj &&
                  !(movingSet && movingSet.has(o)) &&
                  !isHelperObject(o) &&
                  !o.__isGuide &&
                  o.visible !== false
              );
            const targets = targetObjs.map((o: any) => o.getBoundingRect(true, true));
            const objSnap = computeSnap(moving, targets, threshold);
            dx = objSnap.dx;
            dy = objSnap.dy;
            smartGuideLines = objSnap.guides;
            // Equal spacing between neighbours (only on an axis that didn't
            // already line up with an edge or centre).
            const realTargets = targets.filter((_: any, i: number) => !targetObjs[i].__isArtboard);
            const spacingMarks: SpacingMark[] = [];
            if (!dx) {
              const sp = computeSpacingSnap(moving, realTargets, threshold, 'h');
              if (sp.d || sp.marks.length) {
                dx = sp.d;
                spacingMarks.push(...sp.marks);
              }
            }
            if (!dy) {
              const sp = computeSpacingSnap({ ...moving, left: moving.left + dx }, realTargets, threshold, 'v');
              if (sp.d || sp.marks.length) {
                dy = sp.d;
                spacingMarks.push(...sp.marks);
              }
            }
            snapSpacingRef.current = spacingMarks;
          }

          if (snapToGuidesRef.current && showGuidesRef.current && (!dx || !dy)) {
            const guideLines = canvas
              .getObjects()
              .filter((o: any) => o.__isGuide && o.visible !== false)
              .map((o: any) => ({
                axis: o.__guideAxis as 'v' | 'h',
                position: o.__guideAxis === 'h' ? o.getCenterPoint().y : o.getCenterPoint().x,
              }));
            const guideSnap = computeGuideSnap({ ...moving, left: moving.left + dx, top: moving.top + dy }, guideLines, threshold);
            if (!dx) dx = guideSnap.dx;
            if (!dy) dy = guideSnap.dy;
          }

          if (snapToGridRef.current && (!dx || !dy)) {
            const page = getActiveArtboardRect();
            const gridSnap = computeGridSnap(
              { ...moving, left: moving.left + dx, top: moving.top + dy },
              gridSizeRef.current,
              !!dx,
              !!dy,
              { x: page.x, y: page.y }
            );
            if (!dx) dx = gridSnap.dx;
            if (!dy) dy = gridSnap.dy;
          }

          if (dx || dy) {
            obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy });
            obj.setCoords();
          }
          snapGuidesRef.current = smartGuideLines;
        } else {
          snapGuidesRef.current = [];
          snapSpacingRef.current = [];
        }
        // Moving a whole path while its points are shown: the points follow.
        // (Dragging one of the point circles must not rebuild them.)
        if (activeToolRef.current === 'direct' && e.target?.isVectorPath) renderAnchorHandles(e.target);
      });

      // Resizing snaps the dragged edges to other objects and the page.
      canvas.on('object:scaling', (e: any) => {
        const t = e.target;
        const corner: string = e.transform?.corner || '';
        if (!t || !snapToObjectsRef.current || activeToolRef.current !== 'select' || e.e?.ctrlKey || e.e?.metaKey) return;
        if (((t.angle || 0) % 360) !== 0 || t.type === 'textbox' || featuresRef.current?.cropRef.current) return;
        const zoom = canvas.getZoom() || 1;
        const threshold = 8 / zoom;
        const br = t.getBoundingRect(true, true);
        const movingSet = t.type === 'activeSelection' ? new Set(t.getObjects()) : null;
        const targets = canvas
          .getObjects()
          .filter((o: any) => o !== t && !(movingSet && movingSet.has(o)) && !isHelperObject(o) && !o.__isGuide && o.visible !== false)
          .map((o: any) => o.getBoundingRect(true, true));
        const xEdge = /l/.test(corner) && corner !== 'mtr' ? 'l' : /r/.test(corner) ? 'r' : null;
        const yEdge = /t/.test(corner) && corner !== 'mtr' && corner !== 'mt' ? 't' : corner === 'mt' ? 't' : /b/.test(corner) ? 'b' : null;
        const sx = xEdge ? computeEdgeSnap(xEdge === 'l' ? br.left : br.left + br.width, allXAnchors(targets), threshold) : { d: 0, at: null };
        const sy = yEdge ? computeEdgeSnap(yEdge === 't' ? br.top : br.top + br.height, allYAnchors(targets), threshold) : { d: 0, at: null };
        if (!sx.d && !sy.d) {
          snapGuidesRef.current = [];
          return;
        }
        let kx = xEdge && sx.d ? (br.width + (xEdge === 'r' ? sx.d : -sx.d)) / br.width : 1;
        let ky = yEdge && sy.d ? (br.height + (yEdge === 'b' ? sy.d : -sy.d)) / br.height : 1;
        const uniform = corner.length === 2 && corner !== 'mt' && corner !== 'mb' && corner !== 'ml' && corner !== 'mr' && !e.e?.shiftKey && !t.lockUniScaling;
        const guides: GuideLine[] = [];
        if (uniform) {
          // Keep the proportions: use whichever edge is closer to snapping.
          const k = Math.abs(sx.d) && (!sy.d || Math.abs(sx.d) <= Math.abs(sy.d)) ? kx : ky;
          kx = k;
          ky = k;
          if (k === kx && sx.at != null && Math.abs(sx.d) && (!sy.d || Math.abs(sx.d) <= Math.abs(sy.d))) guides.push({ axis: 'v', position: sx.at });
          else if (sy.at != null) guides.push({ axis: 'h', position: sy.at });
        } else {
          if (sx.at != null && sx.d) guides.push({ axis: 'v', position: sx.at });
          if (sy.at != null && sy.d) guides.push({ axis: 'h', position: sy.at });
        }
        if (!(kx > 0.01 && ky > 0.01)) return;
        // The opposite corner stays where it is.
        const fixedX = xEdge === 'l' ? br.left + br.width : br.left;
        const fixedY = yEdge === 't' ? br.top + br.height : br.top;
        t.set({ scaleX: (t.scaleX || 1) * kx, scaleY: (t.scaleY || 1) * ky });
        const nb = t.getBoundingRect(true, true);
        t.set({
          left: (t.left || 0) + (xEdge === 'l' ? fixedX - (nb.left + nb.width) : xEdge === 'r' ? fixedX - nb.left : br.left + br.width / 2 - (nb.left + nb.width / 2)),
          top: (t.top || 0) + (yEdge === 't' ? fixedY - (nb.top + nb.height) : yEdge === 'b' ? fixedY - nb.top : br.top + br.height / 2 - (nb.top + nb.height / 2)),
        });
        t.setCoords();
        snapGuidesRef.current = guides;
      });

      // Double-click a ruler guide to delete it -- the same convention
      // every other design tool uses, since guides otherwise have no
      // delete affordance of their own (Delete/Backspace is already
      // claimed by "delete the selected design object").
      canvas.on('path:created', (e: any) => {
        const path = e.path;
        if (!path) return;
        path.isVectorPath = true;
        path.set({ fill: '', strokeLineCap: 'round', strokeLineJoin: 'round', strokeUniform: true });
        path.name = 'Pencil path';
      });
      canvas.on('mouse:dblclick', (opt: any) => {
        if (opt.target?.__isGuide) deleteGuide(opt.target);
        const t = opt.target;
        if (t && t.type === 'image' && !t.locked && activeToolRef.current === 'select') {
          // Empty frame: choose a photo. Otherwise: adjust the photo inside.
          if (t.__frame?.empty) {
            canvas.setActiveObject(t);
            replaceInputRef.current?.click();
          } else featuresRef.current?.startCrop(t);
        }
      });
      // While cropping, keep the photo covering its frame.
      const keepCrop = (e: any) => {
        if (featuresRef.current?.cropRef.current && e.target === featuresRef.current.cropRef.current.session.img) featuresRef.current.onCropTransform();
      };
      canvas.on('object:moving', keepCrop);
      canvas.on('object:scaling', keepCrop);
      canvas.on('object:rotating', keepCrop);
      canvas.on('selection:cleared', () => featuresRef.current?.cropRef.current && featuresRef.current.finishCrop(true));
      // Crop frame handles: drag an edge or corner to change the crop
      // (the photo itself is dragged to reposition it inside the frame).
      const cropDrag = { handle: null as CropHandle | null };
      const cropHit = (opt: any): CropHandle | null => {
        const crop = featuresRef.current?.cropRef.current;
        if (!crop) return null;
        const p = canvas.getPointer(opt.e);
        return cropHandleAt(crop.session.geo, p.x, p.y, 12 / (canvas.getZoom() || 1));
      };
      canvas.on('mouse:down', (opt: any) => {
        const h = cropHit(opt);
        if (!h) return;
        // Cancel whatever Fabric was about to do with the photo.
        const t = canvas._currentTransform;
        if (t?.target && t.original) t.target.set({ left: t.original.left, top: t.original.top, scaleX: t.original.scaleX, scaleY: t.original.scaleY });
        canvas._currentTransform = null;
        cropDrag.handle = h;
      });
      canvas.on('mouse:move', (opt: any) => {
        const crop = featuresRef.current?.cropRef.current;
        if (!crop) return;
        if (cropDrag.handle) {
          const p = canvas.getPointer(opt.e);
          dragCropHandle(crop.session, cropDrag.handle, p.x, p.y, 8 / (canvas.getZoom() || 1));
          keepCovering(crop.session);
          canvas.requestRenderAll();
          return;
        }
        const h = cropHit(opt);
        if (h) canvas.setCursor(CROP_CURSORS[h]);
      });
      canvas.on('mouse:up', () => {
        if (!cropDrag.handle) {
          if (featuresRef.current?.cropRef.current) featuresRef.current.refreshCropState();
          return;
        }
        cropDrag.handle = null;
        const crop = featuresRef.current?.cropRef.current;
        if (crop) keepCovering(crop.session);
        featuresRef.current?.refreshCropState();
        canvas.requestRenderAll();
      });

      canvas.on('mouse:down', (opt: any) => {
        if (pickColorRef.current) {
          const cb = pickColorRef.current;
          pickColorRef.current = null;
          canvas.defaultCursor = 'default';
          const el = canvasRef.current;
          const ctx = el?.getContext('2d');
          if (el && ctx) {
            const r = el.getBoundingClientRect();
            const k = el.width / r.width;
            const e = opt.e;
            const d = ctx.getImageData(Math.round((e.clientX - r.left) * k), Math.round((e.clientY - r.top) * k), 1, 1).data;
            cb('#' + [d[0], d[1], d[2]].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase());
          }
          setLocalNotice(null);
          return;
        }
        if (spaceHeldRef.current) {
          panRef.current = { active: true, lastX: opt.e.clientX, lastY: opt.e.clientY };
          canvas.setCursor('grabbing');
          return;
        }
        if (drawingRef.current) {
          const p = canvas.getPointer(opt.e);
          const pressure = typeof opt.e.pressure === 'number' && opt.e.pointerType === 'pen' ? opt.e.pressure : 0.5;
          strokeRef.current = { points: [[p.x, p.y, pressure]], pen: opt.e.pointerType === 'pen' };
          return;
        }
        if (
          activeToolRef.current === 'select' &&
          opt.target &&
          opt.target.selectable &&
          !opt.target.locked &&
          !opt.target.__isArtboard &&
          !opt.target.__isAnchorHandle
        ) {
          altDragRef.current = { obj: opt.target, startLeft: opt.target.left ?? 0, startTop: opt.target.top ?? 0, triggered: false };
        } else {
          altDragRef.current = null;
        }
        if (activeToolRef.current === 'text') {
          const p = canvas.getPointer(opt.e);
          const page = getActiveArtboardRect();
          const k = Math.max(page.width, page.height) / 1080;
          const t: any = new F.Textbox('Your text', {
            left: p.x,
            top: p.y - 24 * k,
            width: Math.min(560 * k, Math.max(120, page.x + page.width - p.x)),
            fontSize: Math.round(48 * k),
            fill: '#09090B',
            fontFamily: 'Inter',
          });
          t.name = 'Text';
          setActiveToolRef.current?.('select');
          canvas.add(t);
          canvas.setActiveObject(t);
          t.enterEditing();
          t.selectAll();
          canvas.requestRenderAll();
          ensureFontLoaded('Inter').then(() => refreshTextMetrics(canvas));
          return;
        }
        if (activeToolRef.current === 'pan') {
          panRef.current = { active: true, lastX: opt.e.clientX, lastY: opt.e.clientY };
          canvas.setCursor('grabbing');
          return;
        }
        if (activeToolRef.current === 'artboard') {
          handleArtboardMouseDown(opt);
          return;
        }
        if (activeToolRef.current === 'pen') {
          // A click on an already-revealed anchor/handle circle (see the
          // Ctrl/Cmd branch below) is that circle's own concern — never
          // let it also register as "place a new pen anchor here".
          if (opt.target && opt.target.__isAnchorHandle) return;
          if (opt.e.ctrlKey || opt.e.metaKey) {
            // Illustrator's real Pen tool: holding Ctrl/Cmd temporarily
            // acts like Direct Selection, so you can nudge an existing
            // anchor without abandoning the Pen tool. Only when there's
            // no in-progress draft — grabbing a different path's anchor
            // mid-draw would collide with "click near the first anchor
            // closes this path".
            if (penDraftRef.current.anchors.length === 0) {
              const pointer = canvas.getPointer(opt.e);
              const paths = canvas.getObjects().filter((o: any) => o.isVectorPath);
              // Bounding-box-with-tolerance hit-test rather than
              // canvas.findTarget, since a path finished while Pen stayed
              // active is deliberately evented=false (so a plain click
              // starts the NEXT path instead of grabbing this one) —
              // findTarget would miss it. Fabric's own containsPoint()
              // tests the object's exact bounding polygon, which is
              // degenerate (zero height or width) for a perfectly
              // horizontal/vertical path and would then never register a
              // hit even exactly on the path — pad it by a few document
              // units so a straight-line path stays clickable too.
              const HIT_PAD = 6;
              let target: any = null;
              for (let i = paths.length - 1; i >= 0; i--) {
                const p = paths[i];
                const br = p.getBoundingRect(true, true);
                if (
                  pointer.x >= br.left - HIT_PAD &&
                  pointer.x <= br.left + br.width + HIT_PAD &&
                  pointer.y >= br.top - HIT_PAD &&
                  pointer.y <= br.top + br.height + HIT_PAD
                ) {
                  target = p;
                  break;
                }
              }
              if (target) {
                renderAnchorHandles(target);
                return;
              }
            }
            clearAnchorHandles();
            return;
          }
          clearAnchorHandles();
          handlePenMouseDown(opt);
        } else if (isDrawTool(activeToolRef.current)) handleShapeMouseDown(opt);
      });
      canvas.on('mouse:move', (opt: any) => {
        if (drawingRef.current && strokeRef.current) {
          const p = canvas.getPointer(opt.e);
          const pressure = typeof opt.e.pressure === 'number' && strokeRef.current.pen ? opt.e.pressure : 0.5;
          strokeRef.current.points.push([p.x, p.y, pressure]);
          canvas.requestRenderAll();
          return;
        }
        if (panRef.current.active) {
          userMovedViewRef.current = true;
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
        if (drawingRef.current && strokeRef.current) {
          const stroke = strokeRef.current;
          strokeRef.current = null;
          const settings = brushRef.current;
          const obj = createStrokeObject(F, stroke.points, settings, stroke.pen);
          if (obj) {
            if (settings.kind === 'eraser') {
              const n = eraseWithStroke(F, canvas, obj);
              if (n) pushHistory();
            } else {
              canvas.add(obj);
              obj.set({ selectable: false, evented: false });
            }
          }
          canvas.requestRenderAll();
          return;
        }
        if (altDragRef.current?.triggered) {
          const { obj, startLeft, startTop } = altDragRef.current;
          // Total distance THIS drag moved the object(s) — subtracting it
          // from each child's current (already-moved) absolute position
          // gives back exactly where the drag started, regardless of
          // whether it's a single object or a multi-select ActiveSelection
          // (Fabric keeps each child's own left/top in absolute canvas
          // terms even while selected together, the same property
          // duplicateSelected/copySelected already rely on).
          const dx = (obj.left ?? 0) - startLeft;
          const dy = (obj.top ?? 0) - startTop;
          altDragRef.current = null;
          // Page positions first (see withPagePositions), then clone with
          // every custom property, and leave the copy where the drag began.
          const isMulti = obj.type === 'activeSelection';
          const members = isMulti ? obj.getObjects() : [obj];
          if (isMulti) canvas.discardActiveObject();
          Promise.all(
            members.map((o: any) => new Promise<any>((resolve) => o.clone((c: any) => resolve(c), PERSIST_PROPS)))
          ).then((clones) => {
            suppressHistoryRef.current = true;
            clones.forEach((c: any) => {
              delete c.__uid;
              c.set({ left: (c.left ?? 0) - dx, top: (c.top ?? 0) - dy, evented: true, ...lockProps(false) });
              c.setCoords();
              canvas.add(c);
              // The copy sits right under the dragged original.
              canvas.moveTo(c, Math.max(0, canvas.getObjects().indexOf(members[0])));
            });
            suppressHistoryRef.current = false;
            if (isMulti) canvas.setActiveObject(new F.ActiveSelection(members, { canvas }));
            canvas.requestRenderAll();
            recomputeMembership();
            refreshLayers();
            pinArtboardsBack();
            pushHistory();
          });
        } else {
          altDragRef.current = null;
        }
        if (snapGuidesRef.current.length > 0 || snapSpacingRef.current.length > 0) {
          snapGuidesRef.current = [];
          snapSpacingRef.current = [];
          canvas.requestRenderAll();
        }
        if (panRef.current.active) {
          panRef.current.active = false;
          canvas.setCursor(activeToolRef.current === 'pan' || spaceHeldRef.current ? 'grab' : 'default');
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
        userMovedViewRef.current = true;
        if (e.ctrlKey || e.metaKey) {
          let z = canvas.getZoom();
          z *= 0.999 ** e.deltaY;
          z = Math.max(0.05, Math.min(8, z));
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
      canvas.on('after:render', (opt: any) => {
        // Exports and thumbnails render into their own temporary canvas
        // (and fire this event too): only decorate the visible canvas.
        if (opt?.ctx && opt.ctx !== canvas.contextContainer) return;
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
          if (!print || !showPrintGuidesRef.current) return;
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

          // Margins (magenta) and column guides (violet), like a layout app.
          const m = print.margins;
          const hasMargins = m && (m.top || m.right || m.bottom || m.left);
          const cols = Math.max(1, print.columns || 1);
          if (hasMargins || cols > 1) {
            const mm = m || { top: 0, right: 0, bottom: 0, left: 0 };
            const ix = x + mm.left * vt[0];
            const iy = y + mm.top * vt[3];
            const iw = w - (mm.left + mm.right) * vt[0];
            const ih = h - (mm.top + mm.bottom) * vt[3];
            ctx.setLineDash([]);
            ctx.lineWidth = 1;
            if (hasMargins) {
              ctx.strokeStyle = 'rgba(217,70,239,0.75)';
              ctx.strokeRect(ix + 0.5, iy + 0.5, Math.max(iw - 1, 0), Math.max(ih - 1, 0));
            }
            if (cols > 1) {
              const g = (print.gutter ?? 16) * vt[0];
              const colW = (iw - g * (cols - 1)) / cols;
              ctx.strokeStyle = 'rgba(139,92,246,0.6)';
              for (let c = 1; c < cols; c++) {
                const cx0 = ix + c * colW + (c - 1) * g;
                ctx.beginPath();
                ctx.moveTo(cx0 + 0.5, iy);
                ctx.lineTo(cx0 + 0.5, iy + ih);
                ctx.moveTo(cx0 + g + 0.5, iy);
                ctx.lineTo(cx0 + g + 0.5, iy + ih);
                ctx.stroke();
              }
            }
          }

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

        // Equal-spacing marks: a short line with end ticks across each
        // matching gap, and the gap size.
        const spacing = snapSpacingRef.current;
        if (spacing.length > 0) {
          ctx.save();
          ctx.strokeStyle = 'rgba(255,0,200,0.9)';
          ctx.fillStyle = 'rgba(255,0,200,0.95)';
          ctx.lineWidth = 1;
          ctx.font = '600 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          spacing.forEach((m) => {
            const unitLabel = formatUnit(Math.max(0, m.to - m.from), unitRef.current);
            if (m.axis === 'h') {
              const y = m.at * vt[3] + vt[5];
              const x1 = m.from * vt[0] + vt[4];
              const x2 = m.to * vt[0] + vt[4];
              ctx.beginPath();
              ctx.moveTo(x1, y);
              ctx.lineTo(x2, y);
              ctx.moveTo(x1, y - 4);
              ctx.lineTo(x1, y + 4);
              ctx.moveTo(x2, y - 4);
              ctx.lineTo(x2, y + 4);
              ctx.stroke();
              ctx.fillText(String(unitLabel), (x1 + x2) / 2, y - 6);
            } else {
              const x = m.at * vt[0] + vt[4];
              const y1 = m.from * vt[3] + vt[5];
              const y2 = m.to * vt[3] + vt[5];
              ctx.beginPath();
              ctx.moveTo(x, y1);
              ctx.lineTo(x, y2);
              ctx.moveTo(x - 4, y1);
              ctx.lineTo(x + 4, y1);
              ctx.moveTo(x - 4, y2);
              ctx.lineTo(x + 4, y2);
              ctx.stroke();
              ctx.fillText(String(unitLabel), x + 14, (y1 + y2) / 2 + 3);
            }
          });
          ctx.restore();
        }

        penDrawOverlay(ctx, vt as any, activeToolRef.current === 'pen');

        // Live brush stroke while drawing.
        if (drawingRef.current && strokeRef.current) {
          const d = strokePathD(strokeRef.current.points, brushRef.current, strokeRef.current.pen);
          if (d) {
            try {
              ctx.save();
              ctx.transform(vt[0], vt[1], vt[2], vt[3], vt[4], vt[5]);
              const b = brushRef.current;
              ctx.fillStyle = b.kind === 'eraser' ? 'rgba(239,68,68,0.35)' : b.color;
              ctx.globalAlpha = b.kind === 'highlighter' ? Math.min(b.opacity, 0.45) : b.kind === 'eraser' ? 1 : b.opacity;
              ctx.fill(new Path2D(d));
              ctx.restore();
            } catch {
              ctx.restore();
            }
          }
        }

        // Crop mode: dim everything outside the frame.
        const crop = featuresRef.current?.cropRef.current;
        if (crop) drawCropOverlay(ctx, vt as any, crop.session.geo, canvas.getWidth(), canvas.getHeight());

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
        // Suppressed because loadFromJSON's own object:added events would
        // otherwise re-mark the tab dirty and re-trigger autosave for a
        // load that isn't a real edit (restoreHistory below already
        // corrects the undo stack the same way).
        suppressHistoryRef.current = true;
        canvas.loadFromJSON(pendingSnapshot.canvasJSON, function () {
          ensureArtboards(canvas, F);
          if (pendingSnapshot.vpt) canvas.setViewportTransform(pendingSnapshot.vpt);
          canvas.renderAll();
          refreshLayers();
          restoreHistory(pendingSnapshot.history.stack, pendingSnapshot.history.index);
          setArtboards(pendingSnapshot.artboards);
          setActiveArtboardId(pendingSnapshot.activeArtboardId);
          setZoom(pendingSnapshot.zoom);
          setDesignName(pendingSnapshot.designName);
          setDesignId(pendingSnapshot.designId);
          ensureFontsLoadedForCanvasJSON(pendingSnapshot.canvasJSON).then(() => refreshTextMetrics(canvas));
          suppressHistoryRef.current = false;
        });
      } else if (urlLocalDoc && peekHandoff(urlLocalDoc)) {
        // A .mtd file just opened from the customer's computer.
        const handoff = takeHandoff(urlLocalDoc)!;
        localFilesRef.current.set(urlLocalDoc, handoff.file);
        setDesignId(null);
        setDesignName(handoff.opened.document.name);
        suppressHistoryRef.current = true;
        canvas.loadFromJSON(handoff.opened.canvas, function () {
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
          refreshArtboards();
          if (first) setActiveArtboardId(first.__artboardId);
          seedInitialSnapshot();
          ensureFontsLoadedForCanvasJSON(handoff.opened.canvas).then(() => refreshTextMetrics(canvas));
          suppressHistoryRef.current = false;
          dirtyRef.current = false;
          setSaveStatus('saved');
          const notes = [
            handoff.opened.missingAssets.length
              ? `${handoff.opened.missingAssets.length} image(s) were missing from this file and could not be shown.`
              : null,
            fontRequiredMessage(missingFontsIn(handoff.opened.canvas)),
          ].filter(Boolean);
          if (notes.length) setLocalNotice(notes.join(' '));
        });
      } else if (urlDesignId) {
        setDesignId(urlDesignId);
        setOpening('Opening your design…');
        supabase
          .from('designs')
          .select('*')
          .eq('id', urlDesignId)
          .single()
          .then(({ data, error }) => {
            setOpening(null);
            if (data) {
              setDesignName(data.name);
              setTabs((ts) => ts.map((t) => (t.designId === urlDesignId ? { ...t, name: data.name } : t)));
              suppressHistoryRef.current = true;
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
                ensureFontsLoadedForCanvasJSON(data.canvas_json).then(() => refreshTextMetrics(canvas));
                suppressHistoryRef.current = false;
                // Newer unsaved work on this device than in the account?
                getDraft(urlDesignId).then((d) => {
                  const serverTime = Date.parse(data.updated_at || '') || 0;
                  if (d && d.savedAt > serverTime + 2000) setDraftOffer(d);
                });
              });
            }
            if (error || !data) {
              console.error('Failed to load design:', error);
              loadFailedIdRef.current = urlDesignId;
              setDesignName('Could not open design');
              setLocalNotice("This design couldn't be opened. Check your connection and reload the page. Nothing has been changed.");
              suppressHistoryRef.current = true;
              ensureArtboards(canvas, F);
              suppressHistoryRef.current = false;
              fitToRect(canvas, { x: 0, y: 0, width, height });
              seedInitialSnapshot();
            }
          });
      } else if (cameFromTemplate) {
        // "Use Template" (see app/templates/page.tsx) -- a fresh,
        // never-saved document that starts from a real template's
        // editable content instead of a blank canvas. designId stays
        // unset, so the first Save creates a brand-new design rather
        // than overwriting the template itself (copy-on-use, matching
        // how every template-based design tool works).
        setOpening('Opening the template…');
        fetchTemplateById(cameFromTemplate).then(async (template) => {
          setOpening(null);
          if (template && wantsTemplateEdit) {
            const { data: auth } = await supabase.auth.getUser();
            if (auth.user) {
              const { data: prof } = await supabase.from('profiles').select('is_admin').eq('id', auth.user.id).single();
              if (prof?.is_admin) setTemplateEdit({ ...template, canvasJson: undefined });
            }
          }
          if (template?.canvasJson) {
            suppressHistoryRef.current = true;
            canvas.loadFromJSON(template.canvasJson, function () {
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
              ensureFontsLoadedForCanvasJSON(template.canvasJson).then(() => refreshTextMetrics(canvas));
              const fontNote = fontRequiredMessage(missingFontsIn(template.canvasJson));
              if (fontNote) setLocalNotice(fontNote);
              suppressHistoryRef.current = false;
              // "Use my brand" on New Design: the template opens in the
              // brand's colours and fonts (one undo step brings it back).
              if (searchParams.get('brand') === '1') {
                loadBrandKit().then((kit) => {
                  if (!kit.colors.filter(Boolean).length && !kit.fonts.heading && !kit.fonts.body) return;
                  const objs = canvas.getObjects().filter((o: any) => isArtwork(o));
                  if (!objs.length) return;
                  applyBrandToObjects(objs, kit);
                  canvas.requestRenderAll();
                  pushHistory();
                  Promise.all([kit.fonts.heading, kit.fonts.body].filter(Boolean).flatMap((f) => [ensureFontLoaded(f as string, 400), ensureFontLoaded(f as string, 700)])).then(() => refreshTextMetrics(canvas));
                  setLocalNotice('Your brand colours and fonts were applied to this template. Undo (Ctrl/Cmd+Z) to see the original.');
                });
              }
            });
          } else {
            // No real content for this id (old bookmarked link, deleted
            // template, or the static fallback list has no id) -- degrade
            // to the same blank-canvas-at-the-right-size behavior as
            // before this feature existed.
            suppressHistoryRef.current = true;
            ensureArtboards(canvas, F);
            suppressHistoryRef.current = false;
            fitToRect(canvas, { x: 0, y: 0, width, height });
            seedInitialSnapshot();
          }
          setCanvasReady(true);
        });
        return;
      } else {
        // Setting up a blank page isn't an edit.
        suppressHistoryRef.current = true;
        ensureArtboards(canvas, F);
        suppressHistoryRef.current = false;
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
  }, [width, height, urlDesignId, urlLocalDoc]);

  // "New Photo Project" entry point (dashboard) — opens the OS file
  // picker immediately once the canvas is ready, so using the Photo
  // Editor doesn't require first manually uploading an image, selecting
  // it, and clicking "Edit Photo" in Main Design. handleImageUpload
  // (above) checks pendingPhotoStartRef once that image lands and opens
  // the Photo Editor on it automatically.
  useEffect(() => {
    if (!canvasReady || !startInPhotoEditor || hasPromptedPhotoUploadRef.current) return;
    hasPromptedPhotoUploadRef.current = true;
    document.getElementById('mainImageUploadInput')?.click();
  }, [canvasReady, startInPhotoEditor]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const canvas = fabricCanvasRef.current;
      if (!canvas) return;
      const { width: w, height: h } = entries[0].contentRect;
      if (w > 0 && h > 0) {
        canvas.setDimensions({ width: Math.floor(w), height: Math.floor(h) });
        // Until the user zooms or pans themselves, keep the page fitted
        // when the space around it changes (panels, rulers, rotating an iPad).
        if (!userMovedViewRef.current) fitToRect(canvas, getActiveArtboardRect());
        canvas.requestRenderAll();
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [canvasReady]);

  // Touch screens (iPad, phones): two fingers pinch to zoom and drag to
  // pan, like every other design app. The second finger cancels whatever
  // the first one started (moving an object, a selection box), so a pinch
  // never drags artwork by accident. Safari's trackpad pinch arrives as
  // gesture events instead.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el || !canvasReady) return;
    const pts = new Map<number, { x: number; y: number }>();
    let pinch: { dist: number; mid: { x: number; y: number } } | null = null;
    let swallowing = false;
    const local = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const measure = () => {
      const [a, b] = Array.from(pts.values());
      return { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
    };
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.set(e.pointerId, local(e));
      if (pts.size === 2) {
        userMovedViewRef.current = true;
        const canvas = fabricCanvasRef.current;
        const t = canvas?._currentTransform;
        if (t?.target && t.original) {
          t.target.set({
            left: t.original.left,
            top: t.original.top,
            scaleX: t.original.scaleX,
            scaleY: t.original.scaleY,
            angle: t.original.angle,
          });
          t.target.setCoords();
        }
        if (canvas) {
          canvas._currentTransform = null;
          canvas._groupSelector = null;
          canvas.requestRenderAll();
        }
        pinch = measure();
        swallowing = true;
      }
      if (swallowing) {
        e.stopPropagation();
        e.preventDefault();
      }
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'touch' || !pts.has(e.pointerId)) return;
      pts.set(e.pointerId, local(e));
      if (!swallowing) return;
      e.stopPropagation();
      e.preventDefault();
      const canvas = fabricCanvasRef.current;
      const F = (window as any).fabric;
      if (!pinch || pts.size < 2 || !canvas || !F) return;
      const now = measure();
      const z = Math.max(0.05, Math.min(8, canvas.getZoom() * (now.dist / pinch.dist)));
      canvas.zoomToPoint(new F.Point(now.mid.x, now.mid.y), z);
      canvas.relativePan(new F.Point(now.mid.x - pinch.mid.x, now.mid.y - pinch.mid.y));
      pinch = now;
      setZoom(Math.round(z * 100));
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType !== 'touch') return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (swallowing) {
        e.stopPropagation();
        if (pts.size === 0) swallowing = false;
      }
    };
    let gestureStart = 1;
    const gStart = (e: any) => {
      e.preventDefault();
      gestureStart = fabricCanvasRef.current?.getZoom() || 1;
    };
    const gChange = (e: any) => {
      e.preventDefault();
      const canvas = fabricCanvasRef.current;
      const F = (window as any).fabric;
      if (!canvas || !F) return;
      const r = el.getBoundingClientRect();
      const z = Math.max(0.05, Math.min(8, gestureStart * e.scale));
      canvas.zoomToPoint(new F.Point(e.clientX - r.left, e.clientY - r.top), z);
      setZoom(Math.round(z * 100));
    };
    el.addEventListener('pointerdown', down, true);
    el.addEventListener('pointermove', move, true);
    el.addEventListener('pointerup', up, true);
    el.addEventListener('pointercancel', up, true);
    el.addEventListener('gesturestart', gStart as any);
    el.addEventListener('gesturechange', gChange as any);
    return () => {
      el.removeEventListener('pointerdown', down, true);
      el.removeEventListener('pointermove', move, true);
      el.removeEventListener('pointerup', up, true);
      el.removeEventListener('pointercancel', up, true);
      el.removeEventListener('gesturestart', gStart as any);
      el.removeEventListener('gesturechange', gChange as any);
    };
  }, [canvasReady]);

  // The pasteboard fill is baked into the Fabric canvas itself (not CSS),
  // so switching themes has to explicitly repaint it — nothing else about
  // a design (artboard colors, object fills) changes with the theme.
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !canvasReady) return;
    canvas.backgroundColor = pasteboardBgFor(theme);
    canvas.requestRenderAll();
  }, [theme, canvasReady]);

  const applyZoom = useCallback((updater: number | ((z: number) => number)) => {
    userMovedViewRef.current = true;
    setZoom((prev) => {
      const next = typeof updater === 'function' ? (updater as (z: number) => number)(prev) : updater;
      const clamped = Math.max(5, Math.min(800, Math.round(next)));
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
  // Reads refs, not state, so it's correct inside long-lived handlers too.
  const getActiveArtboardRect = (): { id?: string; x: number; y: number; width: number; height: number } => {
    const list = artboardsRef.current.length ? artboardsRef.current : artboards;
    const ab = list.find((a) => a.id === activeArtboardIdRef.current) || list[0];
    return ab || { x: 0, y: 0, width, height };
  };

  const addText = () => {
    const ab = getActiveArtboardRect();
    import('fabric').then((mod) => {
      // Textbox (not plain IText) so the box actually wraps to a real
      // width — without real wrapping, 'justify' has no interior line to
      // stretch and silently does nothing on the live canvas, even
      // though export computes it correctly (they wrap/measure text
      // independently of Fabric's own renderer).
      const text = new mod.fabric.Textbox('Double-click to edit', {
        left: ab.x + ab.width / 2 - 150,
        top: ab.y + ab.height / 2 - 20,
        width: 300,
        fontSize: 40,
        fill: '#1A1A1A',
        fontFamily: 'Arial',
      });
      fabricCanvasRef.current.add(text);
      fabricCanvasRef.current.setActiveObject(text);
      ensureFontLoaded(text.fontFamily || 'Arial').then(() => refreshTextMetrics(fabricCanvasRef.current));
    });
  };

  // Uploads a newly-inserted image's bytes to real object storage in the
  // background and swaps the Fabric object's src to the resulting signed
  // URL once that resolves -- see docs/ENGINEERING_AUDIT.md §1 and
  // docs/CHANGELOG_ENGINEERING.md's Photo Studio entry for why: embedding
  // every image as base64 directly in canvas_json is the #1 storage
  // cost in this app, multiplied up to 50x by version history. The image
  // is added to the canvas from the local data URL FIRST (synchronously,
  // same as before this existed) so placing an image is never slower or
  // dependent on network — this only affects what a LATER save embeds.
  // A failed upload (offline, or the storage migration not applied yet)
  // degrades silently: the image just stays embedded for this session,
  // the same graceful-fallback pattern this app already uses for e.g. a
  // missing thumbnail column.
  // Pictures are no longer sent anywhere when they are placed: they stay
  // on this device inside the design, and are stored only together with
  // the design, embedded in the design file itself, wherever the customer
  // saves it. Kept as a no-op so the many callers that
  // place pictures don't change.
  const backgroundUploadAsset = (_img: any) => {};


  // ===================================================================
  // New editor interface: modes, panels, drawing, crop, templates,
  // brand kit, resize. The design actions themselves live in
  // hooks/useEditorFeatures.ts and lib/editor/*.
  // ===================================================================
  const features = useEditorFeatures({
    fabricCanvasRef,
    pushHistory,
    getActivePage: () => getActiveArtboardRect(),
    refreshLayers,
    bumpSel,
    notify: (m) => setLocalNotice(m),
    recomputeMembership,
    backgroundUploadAsset,
  });
  const featuresRef = useRef(features);
  featuresRef.current = features;

  // Simple mode shows the essentials; Pro mode adds rulers, menus, the
  // tool strip, layers and precise properties.
  const [mode, setModeState] = useState<'simple' | 'pro'>('simple');
  useEffect(() => {
    try {
      const m = localStorage.getItem('mt:editorMode');
      if (m === 'pro' || m === 'simple') setModeState(m);
    } catch {
      // keep default
    }
  }, []);
  const setMode = (m: 'simple' | 'pro') => {
    setModeState(m);
    try {
      localStorage.setItem('mt:editorMode', m);
    } catch {
      // not critical
    }
    if (m === 'simple' && activeToolRef.current !== 'select') setActiveTool('select');
  };
  const pro = mode === 'pro';

  // Phones get a bottom navigation and bottom sheets.
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const on = () => setCompact(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  const [leftPanel, setLeftPanel] = useState<string | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string | null>(null);
  const [showResize, setShowResize] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [bgRemoveTarget, setBgRemoveTarget] = useState<any>(null);
  const [templateBusy, setTemplateBusy] = useState<string | null>(null);
  // Upload sits in the main rail and places pictures straight into the
  // design. Nothing is kept in a separate uploads list or on the server.
  const railUploadInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const pickColorRef = useRef<((hex: string) => void) | null>(null);

  // ---- drawing ----
  const [brush, setBrushState] = useState<BrushSettings>(DEFAULT_BRUSH);
  const brushRef = useRef<BrushSettings>(DEFAULT_BRUSH);
  const [drawing, setDrawing] = useState(false);
  const drawingRef = useRef(false);
  const strokeRef = useRef<{ points: StrokePoint[]; pen: boolean } | null>(null);
  const setBrush = (b: BrushSettings) => {
    brushRef.current = b;
    setBrushState(b);
    // The vector pencil follows colour and size changes straight away.
    const fb = fabricCanvasRef.current?.freeDrawingBrush;
    if (fabricCanvasRef.current?.isDrawingMode && fb) {
      fb.color = b.color;
      fb.width = Math.max(1, b.size / 3);
    }
  };
  const startDrawing = (kind: BrushSettings['kind']) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    setActiveTool('select');
    const next = { ...brushRef.current, kind };
    setBrush(next);
    drawingRef.current = true;
    setDrawing(true);
    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.forEachObject((o: any) => {
      o.selectable = false;
      o.evented = false;
    });
    canvas.defaultCursor = 'crosshair';
    canvas.hoverCursor = 'crosshair';
    canvas.requestRenderAll();
  };
  const stopDrawing = () => {
    drawingRef.current = false;
    strokeRef.current = null;
    setDrawing(false);
    setActiveTool('select');
  };

  // Vector pencil: a freehand line that becomes an editable path.
  const [pencilOn, setPencilOn] = useState(false);
  setPencilOnRef.current = setPencilOn;
  const setVectorPencil = (on: boolean) => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    if (!canvas || !F) return;
    if (on) {
      if (drawingRef.current) stopDrawing();
      setActiveTool('select');
      canvas.discardActiveObject();
      const b = new F.PencilBrush(canvas);
      b.width = Math.max(1, brushRef.current.size / 3);
      b.color = brushRef.current.color;
      b.decimate = 3;
      canvas.freeDrawingBrush = b;
      canvas.isDrawingMode = true;
    } else {
      canvas.isDrawingMode = false;
    }
    setPencilOn(on);
  };

  // The tool shown as "in use" (tool strip and the tool chip).
  const stripTool: StripTool = drawing ? (brush.kind === 'eraser' ? 'eraser' : 'brush') : pencilOn ? 'pencil' : (['select', 'direct', 'pan', 'artboard', 'pen', 'text', 'rect', 'ellipse', 'triangle', 'polygon', 'star', 'line'] as string[]).includes(activeTool) ? (activeTool as StripTool) : 'select';
  const chooseTool = (t: StripTool) => {
    if (t === 'brush' || t === 'eraser') {
      if (pencilOn) setVectorPencil(false);
      const kind = t === 'eraser' ? 'eraser' : brushRef.current.kind === 'eraser' ? 'brush' : brushRef.current.kind;
      startDrawing(kind);
      return;
    }
    if (drawingRef.current) stopDrawing();
    if (t === 'pencil') {
      setVectorPencil(true);
      return;
    }
    if (pencilOn) setVectorPencil(false);
    setActiveTool(t as ToolMode);
  };
  const chooseToolRef = useRef(chooseTool);
  chooseToolRef.current = chooseTool;
  const [shapeBuilderOpen, setShapeBuilderOpen] = useState(false);

  // Eyedropper fallback for browsers without the EyeDropper API.
  const pickFromCanvas = (cb: (hex: string) => void) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    pickColorRef.current = cb;
    canvas.defaultCursor = 'crosshair';
    setLocalNotice('Tap anywhere on the page to pick a colour.');
  };

  // ---- images: add / replace / remove background ----
  // Reads a picture file, scaled to a sensible working size (see
  // lib/editor/imagePrep.ts).
  const readFile = (f: File) =>
    new Promise<string>((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(f);
    }).then((url) => prepareImageDataUrl(url));

  const addImageFiles = async (files: File[], at?: { x: number; y: number }) => {
    for (let i = 0; i < files.length; i++) {
      const url = await readFile(files[i]).catch(() => null);
      if (!url) {
        setLocalNotice("That file couldn't be read. Try another image.");
        continue;
      }
      // An empty frame is selected: fill it instead of adding a new picture.
      const active = fabricCanvasRef.current?.getActiveObject();
      if (i === 0 && files.length === 1 && active?.__frame?.empty && !at) {
        await features.putImageInto(active, url);
        continue;
      }
      await insertImageDataUrl(url, i, at);
    }
  };

  const addImageFilesRef = useRef<((files: File[]) => void) | null>(null);
  addImageFilesRef.current = (files: File[]) => addImageFiles(files);

  const placeImageUrl = async (url: string, at?: { x: number; y: number }, target?: any) => {
    const active = target || fabricCanvasRef.current?.getActiveObject();
    if (active && active.type === 'image' && (active.__frame?.empty || target)) {
      await features.putImageInto(active, url);
      return;
    }
    await insertImageDataUrl(url, 0, at);
  };

  const onReplacePicked = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    const target = fabricCanvasRef.current?.getActiveObject();
    if (!f || !target || target.type !== 'image') return;
    const url = await readFile(f).catch(() => null);
    if (!url) {
      setLocalNotice("That file couldn't be read. Try another image.");
      return;
    }
    await features.putImageInto(target, url);
  };

  const applyBackgroundRemoval = async (dataUrl: string) => {
    const img = bgRemoveTarget;
    const canvas = fabricCanvasRef.current;
    if (!img || !canvas) return;
    const oldW = img.width || 1;
    await new Promise<void>((resolve, reject) =>
      img.setSrc(
        dataUrl,
        (_o: any, err?: boolean) => (err ? reject(new Error('load')) : resolve()),
        { crossOrigin: 'anonymous' }
      )
    );
    // Same size on the page even if the cut-out has a different pixel size.
    const ratio = oldW / (img.width || 1);
    img.set({ scaleX: (img.scaleX || 1) * ratio, scaleY: (img.scaleY || 1) * ratio });
    if (img.clipPath && !img.clipPath.absolutePositioned) {
      img.clipPath.set({
        scaleX: (img.clipPath.scaleX || 1) / ratio,
        scaleY: (img.clipPath.scaleY || 1) / ratio,
        left: (img.clipPath.left || 0) / ratio,
        top: (img.clipPath.top || 0) / ratio,
      });
    }
    if (img.filters?.length) img.applyFilters();
    img.__assetId = undefined;
    // The cut-out is what later photo edits start from (undo brings the
    // original back).
    delete img.__originalSrc;
    delete img.__photoEdits;
    delete img.__cropRect;
    img.dirty = true;
    img.setCoords();
    canvas.requestRenderAll();
    backgroundUploadAsset(img);
    pushHistory();
    bumpSel();
  };

  const addSticker = (emoji: string, at?: { x: number; y: number }) => {
    const F = (window as any).fabric;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas) return;
    const page = getActiveArtboardRect();
    const size = Math.min(page.width, page.height) * 0.18;
    const t = new F.Text(emoji, { fontSize: size, fontFamily: 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif' });
    t.setPositionByOrigin(new F.Point(at?.x ?? page.x + page.width / 2, at?.y ?? page.y + page.height / 2), 'center', 'center');
    t.name = 'Sticker';
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.requestRenderAll();
  };

  // A page number that updates itself when pages are added or reordered.
  // `format` uses {n} for the page and {total} for the page count; with
  // `everyPage` each page gets one (existing ones switch to the format).
  const addPageNumber = (format = '{n}', everyPage = false) => {
    const F = (window as any).fabric;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas) return;
    const pages = everyPage ? artboardsRef.current : [getActiveArtboardRect()];
    let last: any = null;
    pages.forEach((page: any) => {
      const existing = canvas.getObjects().find((o: any) => o.__pageNumber && o.__artboardId === page.id);
      if (existing && everyPage) {
        existing.__pageNumber = format;
        last = existing;
        return;
      }
      const k = Math.max(page.width, page.height) / 1080;
      const t = new F.Textbox(format.replace(/\{n\}/g, '1').replace(/\{total\}/g, '1'), { width: 320 * k, fontSize: 24 * k, fontFamily: 'Inter', fill: '#52525B', textAlign: 'center' });
      t.setPositionByOrigin(new F.Point(page.x + page.width / 2, page.y + page.height - 44 * k), 'center', 'center');
      t.__pageNumber = format;
      t.__artboardId = page.id;
      t.name = 'Page number';
      canvas.add(t);
      last = t;
    });
    if (last && !everyPage) canvas.setActiveObject(last);
    refreshArtboards();
    canvas.requestRenderAll();
    pushHistory();
  };

  // ---------------------------------------------------------------------
  // Text frames (magazine-style text that flows between frames/columns)
  const pageContentBox = (page: { id?: string; x: number; y: number; width: number; height: number }) => {
    const ab = artboardsRef.current.find((a) => a.id === page.id);
    const m = ab?.print?.margins;
    const pad = Math.round(Math.min(page.width, page.height) * 0.07);
    const e = m && (m.top || m.right || m.bottom || m.left) ? m : { top: pad, right: pad, bottom: pad, left: pad };
    return {
      left: page.x + e.left,
      top: page.y + e.top,
      width: page.width - e.left - e.right,
      height: page.height - e.top - e.bottom,
      gutter: ab?.print?.gutter || Math.round(page.width * 0.045),
    };
  };
  const afterFrameEdit = () => {
    const canvas = fabricCanvasRef.current;
    canvas?.requestRenderAll();
    pushHistory();
    bumpSel();
  };
  // A headline plus an article that flows through `columns` columns.
  const addArticle = (columns: number) => {
    const F = (window as any).fabric;
    const canvas = fabricCanvasRef.current;
    if (!F || !canvas) return;
    const page = getActiveArtboardRect();
    const box = pageContentBox(page);
    const k = page.width / 1080;
    const head = new F.Textbox('Your headline goes here', { left: box.left, top: box.top, width: box.width, fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 64 * k, lineHeight: 1.1, fill: '#09090B' });
    head.name = 'Headline';
    canvas.add(head);
    const top = box.top + head.height + 32 * k;
    // Enough sample text to fill the columns about nine-tenths of the way.
    const fs = 22 * k;
    const colW = (box.width - box.gutter * (columns - 1)) / columns;
    const frameH = box.top + box.height - top;
    const capacity = (colW / (fs * 0.5)) * (frameH / (fs * 1.5 * 1.15)) * columns * 0.88;
    const paras = SAMPLE_ARTICLE.split('\n');
    const out: string[] = [];
    for (let i = 0, len = 0; len < capacity && i < 60; i++) {
      out.push(paras[i % paras.length]);
      len += paras[i % paras.length].length + 1;
    }
    const frames = createStory(F, canvas, { left: box.left, top, width: box.width, height: frameH }, out.join('\n'), { fontFamily: 'Inter', fontSize: fs, lineHeight: 1.5, fill: '#27272A', paragraphSpacing: 0.6 }, columns, box.gutter);
    canvas.setActiveObject(frames[0]);
    Promise.all([ensureFontLoaded('Playfair Display', 700), ensureFontLoaded('Inter', 400)]).then(() => refreshTextMetrics(canvas));
    afterFrameEdit();
  };
  const frameActions = {
    make: () => {
      const F = (window as any).fabric;
      const canvas = fabricCanvasRef.current;
      const t = canvas?.getActiveObject();
      if (!F || !t || t.type !== 'textbox' || t.locked) return;
      makeTextFrame(F, canvas, t);
      afterFrameEdit();
    },
    columns: (n: number) => {
      const F = (window as any).fabric;
      const canvas = fabricCanvasRef.current;
      const t = canvas?.getActiveObject();
      if (!F || !isFrame(t) || t.locked) return;
      const page = artboardsRef.current.find((a) => a.id === t.__artboardId) || getActiveArtboardRect();
      splitIntoColumns(F, canvas, t, n, pageContentBox(page).gutter);
      afterFrameEdit();
    },
    addLinked: () => {
      const F = (window as any).fabric;
      const canvas = fabricCanvasRef.current;
      const t = canvas?.getActiveObject();
      if (!F || !isFrame(t)) return;
      const frames = storyFrames(canvas, t.__storyId);
      const last = frames[frames.length - 1];
      const page = artboardsRef.current.find((a) => a.id === last.__artboardId) || getActiveArtboardRect();
      const gutter = pageContentBox(page).gutter;
      let box = nextFrameBox(last, page, gutter);
      if (!box) {
        // No room left on this page: the story continues on a new page.
        const metas = getArtboardMetas();
        const pos = nextArtboardPosition(metas);
        const rect = createArtboardRect(F, pos.x, pos.y, page.width, page.height, nextArtboardName(metas));
        canvas.add(rect);
        pinArtboardsBack();
        const cb = pageContentBox({ id: rect.__artboardId, x: pos.x, y: pos.y, width: page.width, height: page.height });
        box = { left: cb.left, top: cb.top, width: cb.width, height: cb.height };
        setActiveArtboardId(rect.__artboardId);
      }
      const f = addLinkedFrame(F, canvas, last, box);
      canvas.setActiveObject(f);
      afterFrameEdit();
    },
    unlink: () => {
      const F = (window as any).fabric;
      const canvas = fabricCanvasRef.current;
      const t = canvas?.getActiveObject();
      if (!F || !isFrame(t) || t.locked) return;
      unlinkFrame(F, canvas, t);
      afterFrameEdit();
    },
    setHeight: (h: number) => {
      const F = (window as any).fabric;
      const canvas = fabricCanvasRef.current;
      const t = canvas?.getActiveObject();
      if (!F || !isFrame(t) || t.locked) return;
      t.__frameH = Math.max(20, h);
      resizeFrameFromScale(F, canvas, t);
      afterFrameEdit();
    },
  };

  const addFontPairing = (heading: string, body: string) => {
    const page = getActiveArtboardRect();
    const F = (window as any).fabric;
    features.addTextPreset({ id: 'pair-h', label: 'Heading', text: 'Your heading here', fontFamily: heading, fontSize: 90, fontWeight: 700 }, F ? { x: page.x + page.width / 2, y: page.y + page.height * 0.42 } : undefined);
    features.addTextPreset({ id: 'pair-b', label: 'Body', text: 'Add a little bit of body text that goes with your heading.', fontFamily: body, fontSize: 34, lineHeight: 1.4, fill: '#3F3F46' }, F ? { x: page.x + page.width / 2, y: page.y + page.height * 0.56 } : undefined);
  };


  // ---------------------------------------------------------------------
  // Templates, smart resize, pages and brand kit
  // ---------------------------------------------------------------------

  // Moves/scales a set of objects laid out for page `from` onto page `to`
  // without stretching (see lib/editor/smartResize.ts).
  const fitObjectsToPage = (objs: any[], from: { x: number; y: number; width: number; height: number }, to: { x: number; y: number; width: number; height: number }) => {
    const plan = planResize(
      objs.map((o) => {
        const r = o.getBoundingRect(true, true);
        return {
          box: { left: r.left - from.x, top: r.top - from.y, width: r.width, height: r.height },
          isImage: o.type === 'image',
          isShape: o.type !== 'image' && !(o.type === 'textbox' || o.type === 'i-text' || o.type === 'text') && o.type !== 'group',
        };
      }),
      from,
      to
    );
    const F = (window as any).fabric;
    objs.forEach((o, i) => {
      const p = plan[i];
      const isTxt = o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
      if (isTxt && Math.abs(p.scaleX - p.scaleY) < 1e-6) {
        // Text is re-sized by its font size so it stays crisp and editable.
        const k = p.scaleX;
        o.set({ fontSize: (o.fontSize || 40) * k });
        if (o.type === 'textbox') o.set({ width: (o.width || 100) * k });
        if (o.styles) {
          Object.values(o.styles).forEach((line: any) =>
            Object.values(line || {}).forEach((st: any) => {
              if (st && st.fontSize) st.fontSize *= k;
            })
          );
        }
        o.initDimensions?.();
      } else {
        o.set({ scaleX: (o.scaleX || 1) * p.scaleX, scaleY: (o.scaleY || 1) * p.scaleY });
      }
      o.setPositionByOrigin(new F.Point(to.x + p.cx, to.y + p.cy), 'center', 'center');
      o.setCoords();
    });
  };

  const artboardRectById = (id?: string) => fabricCanvasRef.current?.getObjects().find((o: any) => o.__isArtboard && (!id || o.__artboardId === id));

  // Puts a template's design onto the current page (replacing what's there)
  // or onto a new page, adapted to the page's size.
  const applyTemplate = async (t: TemplateRecord, mode: 'replace' | 'newPage') => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    if (!canvas || !F || !t.id) return;
    setTemplateBusy(t.id);
    try {
      const full = await fetchTemplateById(t.id);
      const json = full?.canvasJson;
      if (!json || !Array.isArray(json.objects)) throw new Error('no-content');
      await ensureFontsLoadedForCanvasJSON(json).catch(() => {});
      try { F.util.clearFabricFontCache?.(); } catch { /* ignore */ }
      const allAbs = json.objects.filter((o: any) => o.__isArtboard);
      const abJson = allAbs[0];
      const src = abJson
        ? { x: abJson.left || 0, y: abJson.top || 0, width: (abJson.width || t.width) * (abJson.scaleX || 1), height: (abJson.height || t.height) * (abJson.scaleY || 1) }
        : { x: 0, y: 0, width: t.width, height: t.height };
      // Multi-page templates (magazines, brochures, decks): the first page
      // goes where the customer asked, the rest follow as new pages.
      const onPage = (o: any, ab: any) => allAbs.length < 2 || o.__artboardId === ab.__artboardId;
      const items = json.objects.filter((o: any) => !o.__isArtboard && !o.__isGuide && onPage(o, abJson));
      const objs: any[] = await new Promise((resolve) => F.util.enlivenObjects(items, (list: any[]) => resolve(list), 'fabric'));

      let page = getActiveArtboardRect();
      if (mode === 'newPage') {
        const metas = getArtboardMetas();
        const pos = nextArtboardPosition(metas);
        const rect = createArtboardRect(F, pos.x, pos.y, src.width, src.height, nextArtboardName(metas));
        suppressHistoryRef.current = true;
        canvas.add(rect);
        suppressHistoryRef.current = false;
        pinArtboardsBack();
        page = { id: rect.__artboardId, x: pos.x, y: pos.y, width: src.width, height: src.height };
        setActiveArtboardId(rect.__artboardId);
      } else {
        // Replace: clear this page's own artwork first.
        canvas.discardActiveObject();
        canvas.getObjects().filter((o: any) => isArtwork(o) && (o.__artboardId === page.id || !page.id)).forEach((o: any) => canvas.remove(o));
      }
      const rect = artboardRectById(page.id);
      if (rect && abJson) {
        const fill = abJson.fill;
        if (fill && typeof fill === 'object' && fill.colorStops) rect.set({ fill: new F.Gradient(fill) });
        else if (typeof fill === 'string') rect.set({ fill });
        rect.dirty = true;
      }
      objs.forEach((o) => {
        delete o.__uid;
        canvas.add(o);
      });
      // Line the template's own page up with ours before fitting.
      objs.forEach((o) => {
        o.set({ left: (o.left || 0) - src.x + page.x, top: (o.top || 0) - src.y + page.y });
        o.setCoords();
      });
      if (Math.abs(src.width - page.width) > 1 || Math.abs(src.height - page.height) > 1) {
        fitObjectsToPage(objs, { x: page.x, y: page.y, width: src.width, height: src.height }, page);
      }
      for (const extra of allAbs.slice(1)) {
        const metas = getArtboardMetas();
        const pos = nextArtboardPosition(metas);
        const ew = (extra.width || 100) * (extra.scaleX || 1), eh = (extra.height || 100) * (extra.scaleY || 1);
        const rect2 = createArtboardRect(F, pos.x, pos.y, ew, eh, extra.name || nextArtboardName(metas));
        if (extra.__print) rect2.__print = JSON.parse(JSON.stringify(extra.__print));
        if (typeof extra.fill === 'string') rect2.set({ fill: extra.fill });
        suppressHistoryRef.current = true;
        canvas.add(rect2);
        suppressHistoryRef.current = false;
        pinArtboardsBack();
        const its = json.objects.filter((o: any) => !o.__isArtboard && !o.__isGuide && o.__artboardId === extra.__artboardId);
        const more: any[] = await new Promise((resolve) => F.util.enlivenObjects(its, (list: any[]) => resolve(list), 'fabric'));
        more.forEach((o) => {
          delete o.__uid;
          o.__artboardId = rect2.__artboardId;
          o.set({ left: (o.left || 0) - (extra.left || 0) + pos.x, top: (o.top || 0) - (extra.top || 0) + pos.y });
          o.setCoords();
          canvas.add(o);
        });
      }
      applyStoredLocks(canvas);
      reviveTextPaths(F, canvas);
    reviveImageAdjust(F, canvas);
      setActiveTool('select');
      recomputeMembership();
      refreshLayers();
      refreshArtboards();
      fitToRect(canvas, page);
      canvas.requestRenderAll();
      pushHistory();
      const note = fontRequiredMessage(missingFontsIn(json));
      if (note) setLocalNotice(note);
      if (compact) setLeftPanel(null);
    } catch (err) {
      console.error('Template could not be applied:', err);
      setLocalNotice("That template couldn't be opened. Check your connection and try again.");
    } finally {
      setTemplateBusy(null);
    }
  };

  // Resize: the current page (or a resized copy of it) to a new size.
  const resizePage = (size: { width: number; height: number; dpi?: number }, mode: 'this' | 'copy') => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    if (!canvas || !F) return;
    const page = getActiveArtboardRect();
    const rect = artboardRectById(page.id);
    if (!rect) return;
    const doResize = (targetRect: any, members: any[], from: { x: number; y: number; width: number; height: number }) => {
      targetRect.set({ width: size.width, height: size.height, scaleX: 1, scaleY: 1 });
      if (size.dpi) targetRect.__print = { ...(targetRect.__print || createDefaultPrintSettings()), dpi: size.dpi };
      targetRect.setCoords();
      // Pattern/photo backgrounds re-cover the page.
      const to = { x: targetRect.left || 0, y: targetRect.top || 0, width: size.width, height: size.height };
      fitObjectsToPage(members, from, to);
      recomputeMembership();
      refreshArtboards();
      refreshLayers();
      setActiveArtboardId(targetRect.__artboardId);
      fitToRect(canvas, to);
      canvas.requestRenderAll();
      pushHistory();
    };
    if (mode === 'this') {
      const members = canvas.getObjects().filter((o: any) => isArtwork(o) && o.__artboardId === page.id);
      doResize(rect, members, page);
      return;
    }
    // Copy: clone the page next to the others, then resize the copy.
    const metas = getArtboardMetas();
    const pos = nextArtboardPosition(metas);
    const members = canvas.getObjects().filter((o: any) => isArtwork(o) && o.__artboardId === page.id);
    rect.clone((nr: any) => {
      nr.set({ left: pos.x, top: pos.y, name: `${rect.name || 'Page'} (resized)` });
      nr.__isArtboard = true;
      nr.__artboardId = createArtboardId();
      nr.__print = JSON.parse(JSON.stringify(rect.__print || createDefaultPrintSettings()));
      suppressHistoryRef.current = true;
      canvas.add(nr);
      Promise.all(members.map((m: any) => new Promise<any>((res) => m.clone((c: any) => res(c), PERSIST_PROPS)))).then((clones) => {
        clones.forEach((c: any) => {
          delete c.__uid;
          c.set({ left: (c.left || 0) - page.x + pos.x, top: (c.top || 0) - page.y + pos.y });
          c.setCoords();
          canvas.add(c);
        });
        suppressHistoryRef.current = false;
        pinArtboardsBack();
        applyStoredLocks(canvas);
        doResize(nr, clones, { x: pos.x, y: pos.y, width: page.width, height: page.height });
      });
    });
  };

  // Adds a page the same size as the current one.
  const addPage = () => {
    const page = getActiveArtboardRect();
    addArtboardWithSize(page.width, page.height);
  };

  // Small previews of each page for the page strip.
  const [pageThumbs, setPageThumbs] = useState<Record<string, string>>({});
  const pageThumbsRef = useRef<Record<string, string>>({});
  const [docRev, setDocRev] = useState(0);
  setDocRevRef.current = setDocRev;
  const lastThumbRevRef = useRef(-1);
  useEffect(() => {
    // Only the page being edited (plus any page with no preview yet) is
    // re-rendered, and only once the browser is idle, so typing and
    // dragging on a many-page document stay smooth.
    const run = () => {
      const canvas = fabricCanvasRef.current;
      if (!canvas || !canvasReady) return;
      const editedSince = lastThumbRevRef.current !== docRev;
      lastThumbRevRef.current = docRev;
      const ids = new Set(artboardsRef.current.map((a) => a.id));
      const next: Record<string, string> = {};
      Object.entries(pageThumbsRef.current as Record<string, string>).forEach(([k, v]) => ids.has(k) && (next[k] = v as string));
      const todo = artboardsRef.current.filter((ab) => !next[ab.id] || (editedSince && ab.id === activeArtboardIdRef.current));
      if (!todo.length && Object.keys(next).length === Object.keys(pageThumbsRef.current).length) return;
      // Never while the user is dragging or typing: wait for the next idle moment.
      if (canvas._currentTransform || canvas.getActiveObject()?.isEditing || featuresRef.current?.cropRef.current) return;
      todo.forEach((ab) => {
        try {
          next[ab.id] = capturePicture(ab, { format: 'jpeg', quality: 0.6, multiplier: 120 / Math.max(ab.width, ab.height, 1) }).dataUrl;
        } catch {
          // A cross-site picture without permission: no preview for this page.
        }
      });
      pageThumbsRef.current = next;
      setPageThumbs(next);
    };
    let idle: number | null = null;
    const t = setTimeout(() => {
      const ric = (window as any).requestIdleCallback;
      if (ric) idle = ric(run, { timeout: 2000 });
      else run();
    }, 700);
    return () => {
      clearTimeout(t);
      if (idle != null) (window as any).cancelIdleCallback?.(idle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docRev, artboards.length, activeArtboardId, canvasReady]);

  // ---- brand kit ----
  const [brandKit, setBrandKit] = useState<BrandKit>(EMPTY_KIT);
  const [brandSaving, setBrandSaving] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const brandTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    loadBrandKit().then(setBrandKit);
  }, []);
  const updateBrandKit = (k: BrandKit) => {
    setBrandKit(k);
    setBrandSaving('saving');
    if (brandTimer.current) clearTimeout(brandTimer.current);
    brandTimer.current = setTimeout(() => {
      saveBrandKit(k).then((ok) => setBrandSaving(ok ? 'saved' : 'error'));
    }, 700);
  };
  const applyBrandToPage = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const page = getActiveArtboardRect();
    const objs = canvas.getObjects().filter((o: any) => isArtwork(o) && (o.__artboardId === page.id || !page.id));
    if (!objs.length) {
      setLocalNotice('Add a template or some content first, then apply your brand.');
      return;
    }
    applyBrandToObjects(objs, brandKit);
    canvas.requestRenderAll();
    // Brand fonts may still be downloading: measure the text again once they arrive.
    Promise.all([brandKit.fonts.heading, brandKit.fonts.body].filter(Boolean).flatMap((f) => [ensureFontLoaded(f as string, 400), ensureFontLoaded(f as string, 700)])).then(() => refreshTextMetrics(canvas));
    pushHistory();
    bumpSel();
    setLocalNotice('Your brand colours and fonts were applied. Undo (Ctrl/Cmd+Z) if you’d like it back.');
  };
  const uploadBrandLogo = async (file: File) => {
    const url = await readFile(file).catch(() => null);
    if (!url) return;
    // The logo stays inside the brand kit itself; it is not uploaded
    // to file storage.
    updateBrandKit({ ...brandKit, logoUrl: url });
  };
  const addBrandInfo = () => {
    const i = brandKit.info;
    const lines = [i.business, i.tagline, [i.phone, i.email].filter(Boolean).join('  ·  '), i.website, i.address].filter(Boolean);
    if (!lines.length) {
      setLocalNotice('Fill in your business details in the Brand panel first.');
      return;
    }
    features.addTextPreset({
      id: 'brand-info',
      label: 'Business details',
      text: lines.join('\n'),
      fontFamily: brandKit.fonts.body || 'Inter',
      fontSize: 30,
      lineHeight: 1.45,
      fill: '#09090B',
    });
  };

  // ---- quick start ("Let's create something") ----
  const runQuickStart = async (q: QuickStart) => {
    setShowOnboarding(false);
    try {
      localStorage.setItem('mt:onboarded', '1');
    } catch {
      // not critical
    }
    const { presetToPx } = await import('@/lib/editor/sizePresets');
    const size = presetToPx(q.preset);
    const page = getActiveArtboardRect();
    const rect = artboardRectById(page.id);
    if (rect) {
      rect.set({ width: size.width, height: size.height });
      if (q.preset.dpi) rect.__print = { ...(rect.__print || createDefaultPrintSettings()), dpi: q.preset.dpi };
      rect.setCoords();
      refreshArtboards();
      fitToRect(fabricCanvasRef.current, { x: page.x, y: page.y, width: size.width, height: size.height });
      pushHistory();
    }
    setTemplateCategory(q.category || null);
    if (!q.wizard) {
      setLeftPanel('templates');
      return;
    }
    // Wizard: pick a matching template, then put the details in.
    const { fetchPublicTemplates } = await import('@/lib/templatesData');
    const list = (await fetchPublicTemplates()).filter((t) => t.id && (t.category === q.category || !q.category));
    const styleWord = q.wizard.style.toLowerCase();
    const pick =
      list.find((t) => `${t.name} ${(t.tags || []).join(' ')}`.toLowerCase().includes(styleWord)) ||
      list[Math.floor(Math.random() * Math.max(1, list.length))];
    if (!pick) {
      setLeftPanel('templates');
      return;
    }
    await applyTemplate(pick, 'replace');
    const canvas = fabricCanvasRef.current;
    const pg = getActiveArtboardRect();
    const objs = canvas.getObjects().filter((o: any) => isArtwork(o) && o.__artboardId === pg.id);
    const texts = objs.filter((o: any) => o.type === 'textbox' || o.type === 'i-text' || o.type === 'text');
    const byMonthDay = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}[\/.]\d{1,2}|\d{1,2}(st|nd|rd|th)|\bpm\b|\bam\b)/i;
    if (q.wizard.title) {
      const biggest = texts.slice().sort((a: any, b: any) => b.fontSize * (b.scaleY || 1) - a.fontSize * (a.scaleY || 1))[0];
      if (biggest) {
        biggest.set({ text: q.wizard.title });
        biggest.initDimensions?.();
      }
    }
    if (q.wizard.date) {
      const dateText = texts.find((t: any) => byMonthDay.test(t.text || ''));
      if (dateText) {
        dateText.set({ text: q.wizard.date });
        dateText.initDimensions?.();
      }
    }
    if (q.wizard.photo) {
      const url = await readFile(q.wizard.photo).catch(() => null);
      const frame = objs.find((o: any) => o.type === 'image');
      if (url && frame) await features.putImageInto(frame, url);
      else if (url) await insertImageDataUrl(url);
    }
    canvas.requestRenderAll();
    pushHistory();
    setLocalNotice('Your design is ready. Tap anything to change it.');
  };

  // First visit to a blank editor: offer the quick start.
  useEffect(() => {
    if (!canvasReady || urlDesignId || cameFromTemplate || urlLocalDoc || startInPhotoEditor) return;
    getDraft(UNSAVED_KEY).then((d) => {
      const recent = d && Date.now() - d.savedAt < 7 * 24 * 3600 * 1000;
      const hasArt = recent && Array.isArray(d!.json?.objects) && d!.json.objects.some((o: any) => !o.__isArtboard && !o.__isGuide);
      if (hasArt && !searchParams.get('newTab')) {
        setDraftOffer(d);
        return;
      }
      try {
        if (searchParams.get('onboard') === '1' || !localStorage.getItem('mt:onboarded')) setShowOnboarding(true);
      } catch {
        // ignore
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasReady]);

  const restoreDraft = (d: Draft) => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    if (!canvas || !F) return;
    setDraftOffer(null);
    suppressHistoryRef.current = true;
    canvas.loadFromJSON(d.json, () => {
      ensureArtboards(canvas, F);
      const first = canvas.getObjects().find((o: any) => o.__isArtboard);
      if (first) fitToRect(canvas, { x: first.left || 0, y: first.top || 0, width: (first.width || width) * (first.scaleX || 1), height: (first.height || height) * (first.scaleY || 1) });
      canvas.renderAll();
      refreshLayers();
      refreshArtboards();
      suppressHistoryRef.current = false;
      if (d.key === UNSAVED_KEY) setDesignName(d.name);
      ensureFontsLoadedForCanvasJSON(d.json).then(() => refreshTextMetrics(canvas));
      pushHistory();
      setLocalNotice('Your unsaved changes are back.');
    });
  };

  // Handles things dragged from the side panels onto the page.
  const handleAssetDrop = (asset: string, pointer: { x: number; y: number }, ev: any) => {
    const [kind, ...rest] = asset.split(':');
    const value = rest.join(':');
    const canvas = fabricCanvasRef.current;
    if (kind === 'shape') features.addShape(value as any, pointer);
    else if (kind === 'frame') features.addFrame(value as any, pointer);
    else if (kind === 'sticker') addSticker(value, pointer);
    else if (kind === 'text') {
      const all = [...TEXT_BASICS, ...TEXT_STYLES];
      const p = all.find((x) => x.id === value);
      if (p) features.addTextPreset(p, pointer);
    } else if (kind === 'image') {
      const target = canvas?.findTarget(ev, false);
      if (target && target.type === 'image' && !target.locked) placeImageUrl(value, pointer, target);
      else placeImageUrl(value, pointer);
    } else if (kind === 'template') {
      import('@/lib/templatesData').then(({ fetchTemplateById: f }) => f(value).then((t) => t && applyTemplate(t, 'replace')));
    }
  };

  const pageBackgroundValue = (): string | GradientSpec | null => {
    const rect = artboardRectById(getActiveArtboardRect().id);
    if (!rect) return '#FFFFFF';
    if (rect.fill && typeof rect.fill === 'object' && rect.fill.colorStops) return fromFabricGradient(rect.fill);
    return typeof rect.fill === 'string' ? rect.fill || null : '#FFFFFF';
  };
  const setPageBackgroundValue = (v: string | GradientSpec | null, commit: boolean) => {
    if (v && typeof v === 'object') features.setPageBackground({ gradient: v }, commit);
    else features.setPageBackground({ color: v }, commit);
  };

  const nextImageIdRef = useRef(0);
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    e.target.value = '';
    if (!files.length) return;
    files.forEach((file, i) =>
      insertImageFile(file, i).then(() => {
        if (i === 0 && pendingPhotoStartRef.current) {
          pendingPhotoStartRef.current = false;
          openPhotoEditor();
          // Drop ?newPhoto=1 so refreshing this tab later doesn't re-arm
          // the auto-open behaviour on an unrelated upload.
          const base = `/editor?w=${width}&h=${height}`;
          router.replace(designIdRef.current ? `${base}&designId=${designIdRef.current}` : base);
        }
      })
    );
  };

  // Shared by both the plain-image and PDF-page-rasterized import paths
  // below: places one already-resolved image data URL onto the current
  // artboard. object:added's own canvas listeners (already wired at
  // canvas-init time) pick up layers-panel refresh and history recording
  // automatically, the same way handleImageUpload's own canvas.add() does.
  const insertImageDataUrl = (dataUrl: string, cascadeIndex = 0, at?: { x: number; y: number }): Promise<void> => {
    return new Promise((resolve) => {
      const ab = getActiveArtboardRect();
      import('fabric').then((mod) => {
        mod.fabric.Image.fromURL(dataUrl, (img: any, isError?: boolean) => {
          if (!img || !img.width || isError) {
            setLocalNotice("That image couldn't be opened. Try a JPG or PNG file.");
            resolve();
            return;
          }
          // Fit inside half the page, never upscaled past its real size.
          const target = Math.min(img.width, ab.width * 0.5, (ab.height * 0.5 * img.width) / img.height);
          img.scaleToWidth(Math.max(40, target));
          const w = img.getScaledWidth();
          const h = img.getScaledHeight();
          if (at) img.set({ left: at.x - w / 2 + cascadeIndex * 24, top: at.y - h / 2 + cascadeIndex * 24 });
          else img.set({ left: ab.x + (ab.width - w) / 2 + cascadeIndex * 24, top: ab.y + (ab.height - h) / 2 + cascadeIndex * 24 });
          img.__id = `img_${Date.now()}_${nextImageIdRef.current++}`;
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.setActiveObject(img);
          backgroundUploadAsset(img);
          resolve();
        }, { crossOrigin: 'anonymous' });
      });
    });
  };

  const insertImageFile = (file: File, cascadeIndex = 0, at?: { x: number; y: number }): Promise<void> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        prepareImageDataUrl(event.target ? (event.target.result as string) : '')
          .then((url) => insertImageDataUrl(url, cascadeIndex, at))
          .then(resolve);
      };
      reader.onerror = () => {
        setLocalNotice("That file couldn't be read. Try another image.");
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  // File > Import...: unlike the toolbar's own "Upload" button (images
  // only), this accepts a PDF too. A plain image goes straight onto the
  // canvas exactly like the toolbar upload does; a PDF opens ImportDialog
  // first so the user can pick which page(s) of a multi-page file to
  // bring in, since importing every page of an unrelated multi-page PDF
  // by default would rarely be what someone actually wants.
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importingPdf, setImportingPdf] = useState(false);

  const handleImportFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files ? e.target.files[0] : null;
    e.target.value = '';
    if (!file) return;
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (isPdf) {
      setImportFile(file);
    } else {
      insertImageFile(file).then(() => fabricCanvasRef.current?.requestRenderAll());
    }
  };

  const confirmPdfImport = async (pageNumbers: number[]) => {
    if (!importFile) return;
    setImportingPdf(true);
    try {
      const { renderPdfPages } = await import('@/lib/editor/pdfImport');
      const rendered = await renderPdfPages(importFile, pageNumbers);
      for (let i = 0; i < rendered.length; i++) {
        await insertImageDataUrl(rendered[i].dataUrl, i);
      }
      fabricCanvasRef.current?.requestRenderAll();
    } catch (err) {
      console.error('PDF import failed:', err);
      setLocalNotice('Could not import this PDF — it may be corrupted or password-protected.');
    } finally {
      setImportingPdf(false);
      setImportFile(null);
    }
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
        if (active.clipPath && active.clipPath.absolutePositioned) {
          // A mask fixed to the page stays exactly where it is.
        } else if (active.clipPath) {
          // The crop/frame lives in the image's own space: rescale its size
          // and offset so it covers the same area on the page.
          const ratioX = prevScaleX / scale;
          const ratioY = prevScaleY / scale;
          active.clipPath.set({
            scaleX: (active.clipPath.scaleX || 1) * ratioX,
            scaleY: (active.clipPath.scaleY || 1) * ratioY,
            left: (active.clipPath.left || 0) * ratioX,
            top: (active.clipPath.top || 0) * ratioY,
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
        // The previous photo's backup, crop, edits and stored copy don't
        // describe this one. Live adjustments (__adjust filters) are kept
        // and re-applied, so the new photo gets the same look.
        delete active.__originalSrc;
        delete active.__cropRect;
        delete active.__photoEdits;
        active.__assetId = undefined;
        if (active.filters && active.filters.length && active.applyFilters) active.applyFilters();
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
        backgroundUploadAsset(active);
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
    // The photo opens exactly as it is on the page now, so every edit
    // builds on the last one and "Apply" saves into this same picture.
    const curSrc: string = active.getSrc ? active.getSrc() : '';
    const startSrc = /^(data:|blob:|https?:)/.test(curSrc) ? curSrc : imageSourceDataURL(active);
    setPhotoEditSession({
      targetUid: active.__uid,
      sourceDataUrl: startSrc,
      initialAdjustments: active.__photoEdits || DEFAULT_ADJUSTMENTS,
      initialCropRect: active.__cropRect || null,
    });
    hasOpenedPhotoEditorOnceRef.current = true;
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
        setLocalNotice('Select an image in Main Design first, then switch to Photo Editing.');
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
    const resolvePending = () => {
      pendingPhotoApplyResolveRef.current?.();
      pendingPhotoApplyResolveRef.current = null;
    };
    if (!canvas || !session) {
      resolvePending();
      return;
    }
    const target = canvas.getObjects().find((o: any) => o.__uid === session.targetUid);
    if (!target) {
      closePhotoEditor();
      resolvePending();
      return;
    }

    // Same as Replace: the frame (size, position, shape, rotation) stays
    // exactly where it is and the edited photo fills it.
    const F = (window as any).fabric;
    const keep = { photoEdits: result.adjustments, cropRect: result.cropRect };
    const hadFrame = isFramed(target) || !!target.clipPath;
    const place = hadFrame
      ? fillFrame(F, target, result.dataUrl)
      : new Promise<void>((resolve, reject) => {
          // Not in a frame: the edited photo keeps the same width and
          // centre, at its own (possibly newly cropped) shape.
          const center = target.getCenterPoint();
          const oldW = target.getScaledWidth();
          target.setSrc(
            result.dataUrl,
            (_o: any, isError?: boolean) => {
              if (isError || !target.width) return reject(new Error('load'));
              const k = oldW / (target.width || 1);
              target.set({ scaleX: k * Math.sign(target.scaleX || 1), scaleY: k });
              target.setPositionByOrigin(center, 'center', 'center');
              if (target.filters?.length) target.applyFilters();
              resolve();
            },
            { crossOrigin: 'anonymous' }
          );
        });
    place
      .then(() => {
        // The edited pixels are now this picture's own pixels.
        target.__photoEdits = undefined;
        target.__cropRect = undefined;
        target.__originalSrc = undefined;
        target.__assetId = undefined;
        void keep;
        target.dirty = true;
        target.setCoords();
        canvas.requestRenderAll();
        bumpSel();
        pushHistory();
        backgroundUploadAsset(target);
      })
      .catch(() => setLocalNotice("The edited photo couldn't be placed. Please try again."))
      .finally(() => {
        closePhotoEditor();
        resolvePending();
      });
  };

  // Export/Save read the Main Design canvas directly -- while the Photo
  // Editor is still open, that canvas still has YESTERDAY's pixels (the
  // live crop/exposure/mask edits only land there once "Apply to Design"
  // runs). Without this, exporting or saving mid-photo-edit silently
  // shipped the old, unedited image instead of what's actually on
  // screen. Called before every real export/save entry point so both
  // behave the same regardless of which workspace happens to be open.
  const ensurePhotoEditsApplied = (): Promise<void> => {
    if (workspace !== 'photo' || !photoEditSession) return Promise.resolve();
    const start = Date.now();
    // A freshly-applied image's clipPath can hit a genuine, pre-existing
    // Fabric.js render-cache bug ("this._cacheContext.setTransform is not
    // a function") if the canvas is read/rendered again too soon after —
    // reproducible today with nothing but "click Apply to Design, click
    // Save" back to back, well under this margin, with none of this
    // auto-apply machinery involved. A manual click naturally clears it
    // (a human needs a beat to move to a different button); this
    // automatic path collapses that gap to zero, so it has to enforce a
    // minimum settle time itself instead of relying on human reaction
    // time as the accidental fix.
    const MIN_SETTLE_MS = 2000;
    return new Promise<void>((resolve) => {
      // One extra render of our own once the settle time has passed,
      // wrapped so that if this hits the same pre-existing cache quirk,
      // it happens here -- caught and swallowed -- rather than a moment
      // later inside Export/Save's own render, uncaught.
      const finish = () => {
        try {
          fabricCanvasRef.current?.renderAll();
        } catch (err) {
          console.warn('Ignoring a known Fabric render-cache quirk after a photo edit apply:', err);
        }
        resolve();
      };
      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        pendingPhotoApplyResolveRef.current = null;
        const elapsed = Date.now() - start;
        if (elapsed < MIN_SETTLE_MS) setTimeout(finish, MIN_SETTLE_MS - elapsed);
        else finish();
      };
      pendingPhotoApplyResolveRef.current = settle;
      const applied = photoEditorRef.current?.applyNow();
      if (!applied) {
        settle();
        return;
      }
      // Defensive only -- image.setSrc's callback firing is what actually
      // resolves this. If it somehow never fires, Export/Save proceeding
      // against stale pixels beats freezing the whole editor forever.
      setTimeout(() => {
        if (!settled) console.warn('Photo edit apply did not complete in time; proceeding anyway.');
        settle();
      }, 5000);
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
      const members = active.getObjects().filter((obj: any) => !obj.locked);
      canvas.discardActiveObject();
      members.forEach((obj: any) => canvas.remove(obj));
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

  // Objects inside a multi-selection store their position relative to
  // the selection's centre, not the page. Anything that clones or
  // serializes them must first take them out of the selection (which
  // puts real page positions back), then select them again.
  const withPagePositions = async <T,>(canvas: any, fn: (objs: any[]) => Promise<T> | T): Promise<T> => {
    const active = canvas.getActiveObject();
    const objs = getSelectedObjects(canvas);
    const wasMulti = active?.type === 'activeSelection';
    if (wasMulti) canvas.discardActiveObject();
    try {
      return await fn(objs);
    } finally {
      if (wasMulti && objs.every((o: any) => canvas.getObjects().includes(o)) && !canvas.getActiveObject()) {
        const F = (window as any).fabric;
        canvas.setActiveObject(new F.ActiveSelection(objs, { canvas }));
        canvas.requestRenderAll();
      }
    }
  };

  // Clones keep this app's own properties (frames, effects, names…).
  const cloneObjectsAsync = (objects: any[]): Promise<any[]> =>
    Promise.all(objects.map((obj) => new Promise<any>((resolve) => obj.clone((c: any) => resolve(c), PERSIST_PROPS))));

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
      if (obj.__id) obj.__id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      obj.set({ left: (obj.left || 0) + dx, top: (obj.top || 0) + dy, evented: true, ...lockProps(false) });
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
    if (!getSelectedObjects(canvas).length) return;
    const clones = await withPagePositions(canvas, (objs) => cloneObjectsAsync(objs));
    addClonesToCanvas(clones, 20, 20);
  };

  const copySelected = async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active) return;
    if (!getSelectedObjects(canvas).length) return;
    await withPagePositions(canvas, async (objects) => {
      clipboardRef.current = await cloneObjectsAsync(objects);
      pasteCountRef.current = 0;
      clipboardAtRef.current = Date.now();
      // Also kept on the device so it can be pasted into another design,
      // even one open in a different browser tab.
      try {
        const json = JSON.stringify({ at: clipboardAtRef.current, objects: objects.map((o: any) => o.toObject(PERSIST_PROPS)) });
        if (json.length < 4_000_000) localStorage.setItem('mt:clipboard', json);
      } catch {
        // Too big or storage unavailable: in-editor clipboard still works.
      }
    });
    // A copy inside the editor replaces whatever picture was on the
    // system clipboard, so the next paste is this copy, not an old image.
    try {
      (navigator as any).clipboard?.writeText?.('Magical Touch design objects').catch(() => {});
    } catch {
      // Clipboard access not allowed here; the editor's own copy still works.
    }
  };

  const PASTE_STEP = 20;

  const pasteClipboard = async () => {
    // The newest copy wins, even if it was made in another design or
    // browser tab.
    try {
      const raw = localStorage.getItem('mt:clipboard');
      const F = (window as any).fabric;
      if (raw && F) {
        const parsed = JSON.parse(raw);
        const list = Array.isArray(parsed) ? parsed : parsed.objects;
        const at = Array.isArray(parsed) ? 0 : parsed.at || 0;
        if (Array.isArray(list) && list.length && (!clipboardRef.current?.length || at > clipboardAtRef.current)) {
          const objs: any[] = await new Promise((resolve) => F.util.enlivenObjects(list, (l: any[]) => resolve(l), 'fabric'));
          clipboardRef.current = objs;
          clipboardAtRef.current = at;
          pasteCountRef.current = 0;
        }
      }
    } catch {
      // nothing to paste from other tabs
    }
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

  // Drop images from the computer onto the canvas. Dropping onto an
  // existing image (or image frame) replaces it, keeping its size,
  // position, crop and effects.
  const handleCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const asset = e.dataTransfer.getData('application/x-mt-asset');
    const pointer = canvas.getPointer(e.nativeEvent as any);
    if (asset) {
      dropAssetRef.current?.(asset, pointer, e.nativeEvent);
      return;
    }
    const files = (Array.from(e.dataTransfer.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
    if (!files.length) return;
    const target = canvas.findTarget(e.nativeEvent as any, false);
    if (target && target.type === 'image' && !target.locked && files.length === 1) {
      // Dropped onto a photo or frame: replace it, keeping frame and effects.
      readFile(files[0]).then((url) => features.putImageInto(target, url)).catch(() => setLocalNotice("That file couldn't be read."));
      return;
    }
    const isShapeTarget =
      target && !target.locked && isArtwork(target) && ['rect', 'circle', 'ellipse', 'triangle', 'polygon', 'path'].includes(target.type) && !target.__brush;
    if (isShapeTarget && files.length === 1) {
      // Dropped onto a shape: the photo goes inside the shape.
      readFile(files[0])
        .then(
          (url) =>
            new Promise<void>((resolve) => {
              const F = (window as any).fabric;
              F.Image.fromURL(
                url,
                async (img: any) => {
                  if (!img || !img.width) {
                    setLocalNotice("That image couldn't be opened.");
                    return resolve();
                  }
                  img.__id = `img_${Date.now()}`;
                  // One undo step: placeInShape records it.
                  suppressHistoryRef.current = true;
                  canvas.add(img);
                  suppressHistoryRef.current = false;
                  await features.placeInShape(img, target);
                  backgroundUploadAsset(img);
                  resolve();
                },
                { crossOrigin: 'anonymous' }
              );
            })
        )
        .catch(() => setLocalNotice("That file couldn't be read."));
      return;
    }
    addImageFiles(files, { x: pointer.x, y: pointer.y });
  };
  // Things dragged from the side panels (templates, shapes, frames…).
  const dropAssetRef = useRef<((asset: string, pointer: { x: number; y: number }, ev: any) => void) | null>(null);
  dropAssetRef.current = handleAssetDrop;

  // Right-click: selects whatever's under the cursor (if anything) before
  // opening the menu, matching how a real app's context menu always acts
  // on what you clicked rather than whatever was selected before.
  const handleCanvasContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const target = canvas.findTarget(e.nativeEvent, false);
    if (target && !target.__isArtboard && !target.__isAnchorHandle && !target.__isPenPreview && !target.__isShapeDraft) {
      if (canvas.getActiveObject() !== target) {
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
      }
    } else if (!target && canvas.getActiveObject()) {
      canvas.discardActiveObject();
      canvas.requestRenderAll();
    }
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const contextMenuItems = (): ContextMenuEntry[] => {
    const active = fabricCanvasRef.current?.getActiveObject();
    const has = !!active;
    const isGroupable = active?.type === 'activeSelection';
    const isGroup = active?.type === 'group';
    const members: any[] = active?.type === 'activeSelection' ? active.getObjects() : active ? [active] : [];
    const isImage = active?.type === 'image';
    const pairImg = members.length === 2 ? members.find((o) => o.type === 'image') : null;
    const pairShape = pairImg ? members.find((o) => o !== pairImg && o.type !== 'image' && !(o.type === 'textbox' || o.type === 'i-text' || o.type === 'text')) : null;
    let canPaste = !!clipboardRef.current?.length;
    try {
      canPaste = canPaste || !!localStorage.getItem('mt:clipboard');
    } catch {
      // storage unavailable
    }
    return [
      { label: 'Cut', shortcut: 'Ctrl/Cmd+X', onClick: cutSelected, disabled: !has || !!active?.locked },
      { label: 'Copy', shortcut: 'Ctrl/Cmd+C', onClick: copySelected, disabled: !has },
      { label: 'Paste', shortcut: 'Ctrl/Cmd+V', onClick: pasteClipboard, disabled: !canPaste },
      { label: 'Duplicate', shortcut: 'Ctrl/Cmd+D', onClick: duplicateSelected, disabled: !has },
      ...(isImage ? [{ divider: true } as ContextMenuEntry, { label: active.__frame?.empty ? 'Add Photo…' : 'Replace Image…', onClick: () => replaceInputRef.current?.click(), disabled: !!active.locked }, { label: 'Crop', onClick: () => features.startCrop(), disabled: !!active.locked || !!active.__frame?.empty }] : []),
      ...(pairImg && pairShape ? [{ divider: true } as ContextMenuEntry, { label: 'Add to Frame (photo inside shape)', onClick: () => features.placeInShape(pairImg, pairShape) }] : []),
      { divider: true },
      { label: 'Bring to Front', onClick: bringToFront, disabled: !has },
      { label: 'Bring Forward', onClick: bringForward, disabled: !has },
      { label: 'Send Backward', onClick: sendBackward, disabled: !has },
      { label: 'Send to Back', onClick: sendToBack, disabled: !has },
      { divider: true },
      { label: active?.locked ? 'Unlock' : 'Lock', shortcut: 'Ctrl/Cmd+L', onClick: () => active && toggleLock(active), disabled: !has },
      { label: 'Hide', shortcut: 'Ctrl/Cmd+H', onClick: () => active && toggleVisible(active), disabled: !has },
      ...(isGroupable ? [{ label: 'Group', onClick: groupSelected, disabled: false }] : []),
      ...(isGroup ? [{ label: 'Ungroup', onClick: ungroupSelected, disabled: false }] : []),
      { divider: true },
      { label: 'Delete', onClick: deleteSelected, disabled: !has, danger: true },
    ];
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
    // Fabric puts a new group on top of everything; put it back where the
    // highest of its objects was, so grouping never changes what's in front.
    const order = canvas.getObjects();
    const members = active.getObjects();
    const topIndex = Math.max(...members.map((o: any) => order.indexOf(o)));
    const below = order.slice(0, topIndex + 1).filter((o: any) => !members.includes(o)).length;
    const group = active.toGroup();
    canvas.moveTo(group, below);
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

  // Reverses the currently selected vector path's direction (anchor
  // order, segment order, and handle roles all flip) — works whatever
  // tool is active, not just while Direct Selection has it open.
  const reverseSelectedPath = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.type !== 'path' || !active.isVectorPath) {
      setLocalNotice('Select a single vector path to reverse its direction.');
      return;
    }
    if (!reversePathObject(active)) return;
    canvas.requestRenderAll();
  };

  // Object > Path > Join: closes a single selected open path (connecting
  // its own two endpoints), or — with exactly two open paths selected —
  // merges them into one continuous path at their closest endpoints.
  const joinSelectedPaths = () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (active?.type === 'activeSelection') {
      const objs: any[] = active.getObjects ? active.getObjects() : [];
      const openPaths = objs.filter(isOpenVectorPath);
      if (openPaths.length !== 2 || objs.length !== 2) {
        setLocalNotice('Join needs exactly two selected open paths.');
        return;
      }
      const [a, b] = openPaths;
      canvas.discardActiveObject();
      if (!joinPathObjects(a, b)) {
        setLocalNotice('Could not join these paths.');
        return;
      }
      canvas.setActiveObject(a);
      canvas.requestRenderAll();
      refreshLayers();
      return;
    }
    if (isOpenVectorPath(active)) {
      if (!closeActivePath(active)) return;
      canvas.requestRenderAll();
      return;
    }
    setLocalNotice('Select an open path (to close it) or two open paths (to join them) first.');
  };

  // Object > Path > Break: opens a closed path, or splits an open path
  // into two, at whichever anchor is currently selected in Direct
  // Selection.
  const breakSelectedPath = () => {
    if (!breakActiveAnchor()) {
      setLocalNotice('Select an anchor point in Direct Selection first (press A, then click an anchor).');
      return;
    }
    refreshLayers();
  };

  // Locking keeps an object selectable (so it can be right-clicked and
  // unlocked) but stops it moving, resizing or rotating. Works on a
  // multi-selection by locking every object in it.
  const toggleLock = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    if (!obj) return;
    const targets: any[] = obj.type === 'activeSelection' ? obj.getObjects() : [obj];
    const nextLocked = !targets.every((t) => t.locked);
    if (obj.type === 'activeSelection') canvas.discardActiveObject();
    targets.forEach((t) => {
      t.set(lockProps(nextLocked));
      t.setCoords();
    });
    if (obj.type === 'activeSelection' && targets.length > 1) {
      const F = (window as any).fabric;
      canvas.setActiveObject(new F.ActiveSelection(targets, { canvas }));
    }
    canvas.requestRenderAll();
    refreshLayers();
    bumpSel();
    pushHistory();
  };

  const toggleVisible = (obj: any) => {
    const canvas = fabricCanvasRef.current;
    if (!obj) return;
    const targets: any[] = obj.type === 'activeSelection' ? obj.getObjects() : [obj];
    const nextVisible = targets.some((t) => t.visible === false);
    if (!nextVisible) canvas.discardActiveObject();
    targets.forEach((t) => {
      t.set({ visible: nextVisible });
      if (t.group) t.group.dirty = true;
    });
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

  // Small previews for the Layers panel, cached until the document changes.
  const thumbCacheRef = useRef<{ rev: number; map: WeakMap<any, string | null> }>({ rev: -1, map: new WeakMap() });
  const layerThumbnail = (obj: any): string | null => {
    const cache = thumbCacheRef.current;
    if (cache.rev !== editRevRef.current) {
      cache.rev = editRevRef.current;
      cache.map = new WeakMap();
    }
    if (cache.map.has(obj)) return cache.map.get(obj) ?? null;
    let url: string | null = null;
    try {
      const w = Math.max(1, obj.getScaledWidth());
      const h = Math.max(1, obj.getScaledHeight());
      const mult = Math.min(1, 64 / Math.max(w, h));
      url = obj.toDataURL({ format: 'png', multiplier: mult });
    } catch {
      url = null;
    }
    cache.map.set(obj, url);
    return url;
  };

  // The layers list hides artboards, guides and helpers, so positions are
  // translated through the object that's currently at the drop target.
  const reorderLayers = (fromIndex: number, targetIndex: number) => {
    const canvas = fabricCanvasRef.current;
    const obj = layers[fromIndex];
    const target = layers[Math.max(0, Math.min(layers.length - 1, targetIndex))];
    if (!obj || !target || obj === target) return;
    const targetCanvasIdx = canvas.getObjects().indexOf(target);
    if (targetCanvasIdx < 0) return;
    canvas.moveTo(obj, targetCanvasIdx);
    canvas.requestRenderAll();
    refreshLayers();
    pinArtboardsBack();
    pushHistory();
  };

  // Align / distribute. A single object aligns to its page (artboard);
  // several selected objects align to the selection's own bounds unless
  // `relativeTo` says 'page'. Bounding boxes are used throughout so
  // rotated objects line up by what you actually see.
  type AlignMode = 'left' | 'centerH' | 'right' | 'top' | 'centerV' | 'bottom';
  const alignObject = (mode: AlignMode, relativeTo: 'auto' | 'page' | 'selection' = 'auto') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    const isMulti = active.type === 'activeSelection';
    const members: any[] = isMulti ? active.getObjects().filter((o: any) => !o.locked) : [active];
    if (!members.length) return;
    if (isMulti) canvas.discardActiveObject();

    const rects = members.map((o) => o.getBoundingRect(true, true));
    let ref: { x: number; y: number; width: number; height: number };
    if (isMulti && relativeTo !== 'page') {
      const minX = Math.min(...rects.map((r) => r.left));
      const minY = Math.min(...rects.map((r) => r.top));
      const maxX = Math.max(...rects.map((r) => r.left + r.width));
      const maxY = Math.max(...rects.map((r) => r.top + r.height));
      ref = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    } else {
      const own = artboardsRef.current.find((a) => a.id === members[0].__artboardId);
      ref = own || getActiveArtboardRect();
    }

    members.forEach((o, i) => {
      const r = rects[i];
      let dx = 0;
      let dy = 0;
      if (mode === 'left') dx = ref.x - r.left;
      if (mode === 'centerH') dx = ref.x + ref.width / 2 - (r.left + r.width / 2);
      if (mode === 'right') dx = ref.x + ref.width - (r.left + r.width);
      if (mode === 'top') dy = ref.y - r.top;
      if (mode === 'centerV') dy = ref.y + ref.height / 2 - (r.top + r.height / 2);
      if (mode === 'bottom') dy = ref.y + ref.height - (r.top + r.height);
      o.set({ left: (o.left || 0) + dx, top: (o.top || 0) + dy });
      o.setCoords();
    });
    reselect(isMulti ? active.getObjects() : null);
    recomputeMembership();
    canvas.requestRenderAll();
    pushHistory();
    bumpSel();
  };

  // Equal spacing between 3+ selected objects (edge to edge).
  const distributeObjects = (axis: 'h' | 'v') => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.type !== 'activeSelection') return;
    const all = active.getObjects();
    const members: any[] = all.filter((o: any) => !o.locked);
    if (members.length < 3) return;
    canvas.discardActiveObject();
    const items = members
      .map((o) => ({ o, r: o.getBoundingRect(true, true) }))
      .sort((a, b) => (axis === 'h' ? a.r.left - b.r.left : a.r.top - b.r.top));
    const first = items[0].r;
    const last = items[items.length - 1].r;
    const start = axis === 'h' ? first.left : first.top;
    const end = axis === 'h' ? last.left + last.width : last.top + last.height;
    const total = items.reduce((sum, it) => sum + (axis === 'h' ? it.r.width : it.r.height), 0);
    const gap = (end - start - total) / (items.length - 1);
    let cursor = start;
    items.forEach(({ o, r }) => {
      const current = axis === 'h' ? r.left : r.top;
      const delta = cursor - current;
      if (axis === 'h') o.set({ left: (o.left || 0) + delta });
      else o.set({ top: (o.top || 0) + delta });
      o.setCoords();
      cursor += (axis === 'h' ? r.width : r.height) + gap;
    });
    reselect(all);
    recomputeMembership();
    canvas.requestRenderAll();
    pushHistory();
    bumpSel();
  };

  const reselect = (objs: any[] | null) => {
    const canvas = fabricCanvasRef.current;
    if (!objs || !objs.length) return;
    const F = (window as any).fabric;
    if (objs.length === 1) canvas.setActiveObject(objs[0]);
    else canvas.setActiveObject(new F.ActiveSelection(objs, { canvas }));
  };

  // Style properties that, on a multi-selection or group, belong on each
  // object inside it rather than on the invisible wrapper.
  const CHAR_STYLE_PROPS = ['fill', 'stroke', 'strokeWidth', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'underline', 'linethrough', 'overline', 'deltaY', 'textBackgroundColor'];
  const CHILD_STYLE_PROPS = ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'fontFamily', 'fontWeight', 'fontStyle', 'underline', 'linethrough', 'textAlign', 'charSpacing', 'lineHeight', 'shadow'];

  const applyProp = (props: Record<string, any>, record = true) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;
    const { angle, ...rest } = props;
    const isContainer = active.type === 'activeSelection' || active.type === 'group';
    const childProps: Record<string, any> = {};
    const ownProps: Record<string, any> = {};
    Object.entries(rest).forEach(([k, v]) => {
      // A multi-selection is a temporary wrapper: transparency belongs on
      // the objects inside it (a real group keeps its own).
      if (isContainer && (CHILD_STYLE_PROPS.includes(k) || (k === 'opacity' && active.type === 'activeSelection'))) childProps[k] = v;
      else ownProps[k] = v;
    });
    if (Object.keys(childProps).length) {
      const walk = (o: any) => {
        if (o.type === 'group' && o.getObjects) o.getObjects().forEach(walk);
        else if (!o.locked) {
          // Only text takes text properties; shapes take fill/stroke.
          const isTextObj = o.type === 'textbox' || o.type === 'i-text' || o.type === 'text';
          const applicable = Object.fromEntries(
            Object.entries(childProps).filter(([k]) => isTextObj || ['fill', 'stroke', 'strokeWidth', 'strokeDashArray', 'shadow', 'opacity'].includes(k))
          );
          if (o.type === 'image') delete (applicable as any).fill;
          o.set(applicable);
          if (isTextObj) CHAR_STYLE_PROPS.forEach((k) => k in applicable && clearCharStyle(o, k));
          o.dirty = true;
        }
      };
      active.getObjects().forEach(walk);
      if (active.type === 'group') active.dirty = true;
    }
    if (Object.keys(ownProps).length) {
      active.set(ownProps);
      // Whole-box text formatting replaces formatting given earlier to
      // single letters (otherwise those letters would ignore the change).
      const isTextActive = active.type === 'textbox' || active.type === 'i-text' || active.type === 'text';
      if (isTextActive && !active.isEditing) {
        CHAR_STYLE_PROPS.forEach((k) => k in ownProps && clearCharStyle(active, k));
        active.initDimensions?.();
      }
    }
    // Text frames re-flow straight away (live while a slider moves).
    if (isFrame(active) && (window as any).fabric) flowStory((window as any).fabric, canvas, active.__storyId, { source: active });
    // Rotation pivots on the object's centre, like every design app.
    if (angle !== undefined) active.rotate(angle);
    active.setCoords();
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();

    // A newly-picked Google Font, or a newly-toggled Bold/Italic on the
    // current one, may not have finished downloading that exact
    // weight/style combination yet — the canvas draws it with a fallback
    // (or a synthesized fake bold/oblique of whatever IS loaded) until the
    // browser's Font Loading API resolves, and Fabric never re-renders on
    // its own once that happens. Force one more render when it's ready.
    if (
      (props.fontFamily || props.fontWeight !== undefined || props.fontStyle !== undefined) &&
      typeof document !== 'undefined' &&
      (document as any).fonts?.load
    ) {
      const bold = active.fontWeight === 'bold' || (typeof active.fontWeight === 'number' && active.fontWeight >= 600);
      const italic = active.fontStyle === 'italic';
      ensureFontLoaded(active.fontFamily, active.fontWeight ?? (bold ? 700 : 400), italic).then(() => refreshTextMetrics(canvas));
    }
  };

  // Character-level typography controls (Font, Size, Weight, Style,
  // Underline, Color, Baseline Shift) target the ACTIVE TEXT SELECTION
  // when the user is mid-edit with real (non-collapsed) characters
  // selected — via Fabric's own per-character `styles` map
  // (setSelectionStyles), so selecting just "Magical" out of "Hello
  // Magical Touch" and changing size only resizes those characters.
  // Fabric's per-character style system only supports a fixed set of
  // properties (fontFamily, fontSize, fontWeight, fontStyle, underline/
  // overline/linethrough, fill, stroke, strokeWidth, deltaY) — anything
  // else (charSpacing/tracking, line height, alignment) is inherently
  // object-wide in this engine, the same way "paragraph" properties work
  // in a real desktop app, and goes through applyProp instead.
  //
  // With no real selection (nothing highlighted, or not currently
  // editing text at all) this falls back to the exact same whole-object
  // behavior as applyProp, so every other use (selecting a whole text box
  // to change its font before editing, etc.) is unaffected.
  const applyCharProp = (props: Record<string, any>, record = true) => {
    const canvas = fabricCanvasRef.current;
    const active = canvas.getActiveObject();
    if (!active || active.locked) return;

    const hasRealSelection =
      active.isEditing &&
      typeof active.selectionStart === 'number' &&
      typeof active.selectionEnd === 'number' &&
      active.selectionStart !== active.selectionEnd;

    // A story in text frames has one style throughout.
    if (!hasRealSelection || isFrame(active)) {
      applyProp(props, record);
      return;
    }

    const start = Math.min(active.selectionStart, active.selectionEnd);
    const end = Math.max(active.selectionStart, active.selectionEnd);
    active.setSelectionStyles(props, start, end);
    canvas.requestRenderAll();
    bumpSel();
    if (record) pushHistory();

    if (
      (props.fontFamily || props.fontWeight !== undefined || props.fontStyle !== undefined) &&
      typeof document !== 'undefined' &&
      (document as any).fonts?.load
    ) {
      const styleAtStart = active.getStyleAtPosition ? active.getStyleAtPosition(start, true) : {};
      const family = props.fontFamily || styleAtStart.fontFamily || active.fontFamily;
      const weight = props.fontWeight !== undefined ? props.fontWeight : styleAtStart.fontWeight ?? active.fontWeight;
      const styleVal = props.fontStyle !== undefined ? props.fontStyle : styleAtStart.fontStyle ?? active.fontStyle;
      const bold = weight === 'bold' || (typeof weight === 'number' && weight >= 600);
      const italic = styleVal === 'italic';
      ensureFontLoaded(family, weight ?? (bold ? 700 : 400), italic).then(() => refreshTextMetrics(canvas));
    }
  };

  // Reads the EFFECTIVE value of a text property for whatever's currently
  // relevant: the exact selected character range while editing with a
  // real selection (flagging "mixed" if those characters don't all agree,
  // the same way Adobe apps show a blank field for a mixed selection),
  // or the whole object's own property otherwise.
  const getTextPropValue = (active: any, prop: string): { value: any; mixed: boolean } => {
    if (!active) return { value: undefined, mixed: false };
    const hasRealSelection =
      active.isEditing &&
      typeof active.selectionStart === 'number' &&
      typeof active.selectionEnd === 'number' &&
      active.selectionStart !== active.selectionEnd;
    if (!hasRealSelection) return { value: active[prop], mixed: false };
    const start = Math.min(active.selectionStart, active.selectionEnd);
    const end = Math.max(active.selectionStart, active.selectionEnd);
    const styles = active.getSelectionStyles ? active.getSelectionStyles(start, end, true) : [];
    if (styles.length === 0) return { value: active[prop], mixed: false };
    const first = styles[0][prop];
    const mixed = styles.some((s: any) => s[prop] !== first);
    return { value: first, mixed };
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
    const F = (window as any).fabric;
    if (!canvas || !F) return;
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
      // One undo step for the whole duplicate (finish() records it).
      suppressHistoryRef.current = true;
      canvas.add(clonedRect);

      if (members.length === 0) {
        suppressHistoryRef.current = false;
        finish();
        return;
      }
      let pending = members.length;
      canvas.discardActiveObject();
      members.forEach((obj: any) => {
        obj.clone((clonedObj: any) => {
          clonedObj.set({ left: (clonedObj.left || 0) + dx, top: (clonedObj.top || 0) + dy });
          delete clonedObj.__uid;
          clonedObj.__artboardId = newId;
          canvas.add(clonedObj);
          pending -= 1;
          if (pending === 0) {
            suppressHistoryRef.current = false;
            applyStoredLocks(canvas);
            reviveTextPaths(F, canvas);
    reviveImageAdjust(F, canvas);
            finish();
          }
        }, PERSIST_PROPS);
      });
    });
  };

  const deleteArtboard = (id: string) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const metas = getArtboardMetas();
    if (metas.length <= 1) {
      setLocalNotice('A design needs at least one page, so the last page can’t be deleted.');
      return;
    }
    const rect = canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === id);
    if (!rect) return;
    const members = canvas.getObjects().filter((o: any) => isArtwork(o) && o.__artboardId === id);
    if (members.length && !window.confirm(`Delete “${rect.name || 'this page'}” and everything on it? You can undo this.`)) return;
    canvas.discardActiveObject();
    suppressHistoryRef.current = true;
    members.forEach((o: any) => canvas.remove(o));
    canvas.remove(rect);
    suppressHistoryRef.current = false;
    refreshLayers();
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

  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cutSelected = async () => {
    const canvas = fabricCanvasRef.current;
    const active = canvas?.getActiveObject();
    if (!active || active.locked || active.__isArtboard || isHelperObject(active)) return;
    await copySelected();
    deleteSelected();
  };

  const fitActiveArtboard = () => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    fitToRect(canvas, getActiveArtboardRect());
  };

  // Pasting: images copied from another app (or a screenshot) arrive in
  // the browser's paste event; objects copied inside the editor live in
  // our own clipboard. Whichever applies wins.
  const pasteHandledRef = useRef(false);
  const armPasteFallback = () => {
    pasteHandledRef.current = false;
    setTimeout(() => {
      if (!pasteHandledRef.current) pasteClipboard();
    }, 120);
  };
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (workspaceRef.current !== 'design') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;
      const active = fabricCanvasRef.current?.getActiveObject();
      if (active?.isEditing) return;
      const fromItems = (Array.from(e.clipboardData?.items || []) as DataTransferItem[])
        .filter((it) => it.kind === 'file' && it.type.startsWith('image/'))
        .map((it) => it.getAsFile())
        .filter(Boolean) as File[];
      const files = fromItems.length ? fromItems : (Array.from(e.clipboardData?.files || []) as File[]).filter((f) => f.type.startsWith('image/'));
      pasteHandledRef.current = true;
      e.preventDefault();
      // A copy made inside the editor is newer than any picture on the
      // system clipboard (copying writes a text marker there).
      const text = e.clipboardData?.getData('text/plain') || '';
      if (files.length && text !== 'Magical Touch design objects') {
        addImageFilesRef.current?.(files);
      } else {
        pasteClipboard();
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

      // Tool shortcuts follow Adobe Illustrator's own bindings. M/L used to
      // be bound to the pixel marquee/lasso tools from when this canvas
      // still had raster selection tools — those moved to the Photo
      // Editor workspace, so M/L are repurposed here for Illustrator's own
      // Rectangle/Ellipse tools rather than left silently dead.
      if (canUseToolShortcuts && !isMeta && !e.shiftKey) {
        if (e.key.toLowerCase() === 'v') { e.preventDefault(); chooseToolRef.current('select'); return; }
        if (e.key.toLowerCase() === 'a') { e.preventDefault(); chooseToolRef.current('direct'); return; }
        if (e.key.toLowerCase() === 'p') { e.preventDefault(); chooseToolRef.current('pen'); return; }
        if (e.key.toLowerCase() === 'h') { e.preventDefault(); chooseToolRef.current('pan'); return; }
        if (e.key.toLowerCase() === 't') { e.preventDefault(); chooseToolRef.current('text'); return; }
        if (e.key.toLowerCase() === 'b') { e.preventDefault(); chooseToolRef.current('brush'); return; }
        if (e.key.toLowerCase() === 'e') { e.preventDefault(); chooseToolRef.current('eraser'); return; }
        if (e.key.toLowerCase() === 'n') { e.preventDefault(); chooseToolRef.current('pencil'); return; }
        if (e.key.toLowerCase() === 'm') { e.preventDefault(); chooseToolRef.current('rect'); return; }
        if (e.key.toLowerCase() === 'l') { e.preventDefault(); chooseToolRef.current('ellipse'); return; }
        if (e.key === '\\') { e.preventDefault(); chooseToolRef.current('line'); return; }
      }

      if (canUseToolShortcuts && !isMeta && e.shiftKey) {
        if (e.key.toLowerCase() === 'o') { e.preventDefault(); chooseToolRef.current('artboard'); return; }
        if (e.key.toLowerCase() === 't') { e.preventDefault(); chooseToolRef.current('triangle'); return; }
        if (e.key.toLowerCase() === 's') { e.preventDefault(); chooseToolRef.current('star'); return; }
        if (e.key.toLowerCase() === 'g') { e.preventDefault(); chooseToolRef.current('polygon'); return; }
      }

      if (canUseToolShortcuts && activeToolRef.current === 'pen') {
        if (e.key === 'Enter') { e.preventDefault(); finishPenPath(false); return; }
        if (e.key === 'Escape') { e.preventDefault(); clearPenDraft(); return; }
        if ((e.key === 'Backspace' || e.key === 'Delete') && penDraftRef.current.anchors.length) { e.preventDefault(); removeLastPenAnchor(); return; }
      }

      if (canUseToolShortcuts && isDrawTool(activeToolRef.current) && e.key === 'Escape') {
        e.preventDefault();
        clearShapeDraft();
        setActiveTool('select');
        return;
      }

      if (canUseToolShortcuts && e.shiftKey && e.key === 'Enter') { e.preventDefault(); applyPathAsMask(); return; }

      // Undo/redo and select-all belong to a text field while typing in one.
      if (isMeta && e.key.toLowerCase() === 'z' && !e.shiftKey && canUseToolShortcuts) { e.preventDefault(); undo(); return; }
      if (((isMeta && e.key.toLowerCase() === 'z' && e.shiftKey) || (isMeta && e.key.toLowerCase() === 'y')) && canUseToolShortcuts) { e.preventDefault(); redo(); return; }
      if (isMeta && e.key.toLowerCase() === 's' && e.shiftKey) { e.preventDefault(); saveDesignAs(); return; }
      if (isMeta && e.key.toLowerCase() === 's') { e.preventDefault(); saveDesign(); return; }
      if (isMeta && e.key.toLowerCase() === 'a' && canUseToolShortcuts) {
        e.preventDefault();
        const objs = canvas.getObjects().filter((o: any) => isArtwork(o) && !o.locked && o.visible !== false);
        if (objs.length) {
          canvas.discardActiveObject();
          const sel = new (window as any).fabric.ActiveSelection(objs, { canvas });
          canvas.setActiveObject(sel);
          canvas.requestRenderAll();
        }
        return;
      }
      if (e.key === 'Escape' && (drawingRef.current || canvas.isDrawingMode || activeToolRef.current === 'text' || activeToolRef.current === 'pan' || activeToolRef.current === 'artboard' || activeToolRef.current === 'direct') && !isTypingInField && !isEditingText) {
        e.preventDefault();
        chooseToolRef.current('select');
        return;
      }
      if (e.key === 'Escape') {
        if (featuresRef.current?.cropRef.current) {
          // Escape cancels a crop (Done keeps it).
          e.preventDefault();
          featuresRef.current.finishCrop(false);
          return;
        }
        if (isTypingInField) {
          (document.activeElement as HTMLElement)?.blur?.();
          return;
        }
        if (isEditingText) {
          active.exitEditing?.();
          canvas.requestRenderAll();
          return;
        }
        canvas.discardActiveObject();
        clearAnchorHandles();
        canvas.requestRenderAll();
        setShowShortcuts(false);
        return;
      }
      if (isMeta && e.key.toLowerCase() === 'g' && e.shiftKey && canUseToolShortcuts) { e.preventDefault(); ungroupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'g' && canUseToolShortcuts) { e.preventDefault(); groupSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'd' && canUseToolShortcuts) { e.preventDefault(); duplicateSelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'j' && canUseToolShortcuts) { e.preventDefault(); joinSelectedPaths(); return; }
      if (isMeta && e.key.toLowerCase() === 'c' && canUseToolShortcuts) { e.preventDefault(); copySelected(); return; }
      if (isMeta && e.key.toLowerCase() === 'x' && canUseToolShortcuts) { e.preventDefault(); cutSelected(); return; }
      // Ctrl/Cmd+V is handled by the 'paste' event below, which can also
      // see images copied from other apps; this only arms the fallback.
      if (isMeta && e.key.toLowerCase() === 'v' && canUseToolShortcuts) { armPasteFallback(); return; }
      if (isMeta && e.key.toLowerCase() === 'l' && canUseToolShortcuts) { e.preventDefault(); active && toggleLock(active); return; }
      if (isMeta && e.key.toLowerCase() === 'h' && canUseToolShortcuts) { e.preventDefault(); active && toggleVisible(active); return; }
      if ((e.key === 'Delete' || e.key === 'Backspace') && canUseToolShortcuts && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current)) {
        e.preventDefault();
        deleteSelected();
        return;
      }
      // e.code, not e.key: with Shift held most keyboards report } and {.
      if (isMeta && e.code === 'BracketRight' && !e.shiftKey && canUseToolShortcuts) { e.preventDefault(); bringForward(); return; }
      if (isMeta && e.code === 'BracketLeft' && !e.shiftKey && canUseToolShortcuts) { e.preventDefault(); sendBackward(); return; }
      if (isMeta && e.shiftKey && e.code === 'BracketRight' && canUseToolShortcuts) { e.preventDefault(); bringToFront(); return; }
      if (isMeta && e.shiftKey && e.code === 'BracketLeft' && canUseToolShortcuts) { e.preventDefault(); sendToBack(); return; }
      if (isMeta && (e.key === '=' || e.key === '+')) { e.preventDefault(); applyZoom((z) => z * 1.25); return; }
      if (isMeta && e.key === '-') { e.preventDefault(); applyZoom((z) => z / 1.25); return; }
      if (isMeta && e.key === '0') { e.preventDefault(); fitActiveArtboard(); return; }
      if (isMeta && e.key === '1') { e.preventDefault(); applyZoom(100); return; }
      if (e.code === 'Space' && canUseToolShortcuts && activeToolRef.current !== 'pan') {
        e.preventDefault();
        if (!spaceHeldRef.current) {
          spaceHeldRef.current = true;
          canvas.__selectionBeforeSpace = canvas.selection;
          canvas.selection = false;
          canvas.skipTargetFind = true;
          canvas.defaultCursor = 'grab';
          canvas.setCursor('grab');
        }
        return;
      }
      if (isMeta && e.key === ';') { e.preventDefault(); setShowGuides((v) => !v); return; }
      if (isMeta && e.key.toLowerCase() === 'r' && !isEditingText) { e.preventDefault(); setShowRulers((v) => !v); return; }

      if (canUseToolShortcuts && active && !active.locked && !active.lockMovementX && activeToolRef.current !== 'pen' && !isDrawTool(activeToolRef.current) && e.key.startsWith('Arrow')) {
        const step = e.shiftKey ? 10 : 1;
        e.preventDefault();
        if (e.key === 'ArrowUp') active.top -= step;
        if (e.key === 'ArrowDown') active.top += step;
        if (e.key === 'ArrowLeft') active.left -= step;
        if (e.key === 'ArrowRight') active.left += step;
        active.setCoords();
        canvas.requestRenderAll();
        bumpSel();
        // Holding an arrow key repeats; record one undo step once it stops.
        if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = setTimeout(() => {
          recomputeMembership();
          canvas.fire('object:modified', { target: active });
        }, 350);
      }
    };
    const endSpacePan = () => {
      const canvas = fabricCanvasRef.current;
      if (!spaceHeldRef.current || !canvas) return;
      spaceHeldRef.current = false;
      panRef.current.active = false;
      canvas.skipTargetFind = false;
      canvas.selection = canvas.__selectionBeforeSpace ?? activeToolRef.current === 'select';
      const t = activeToolRef.current;
      canvas.defaultCursor = t === 'select' || t === 'direct' ? 'default' : 'crosshair';
      canvas.setCursor(canvas.defaultCursor);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') endSpacePan();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', endSpacePan);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', endSpacePan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undo, redo, finishPenPath, clearPenDraft, applyPathAsMask, setActiveTool, clearAnchorHandles, clearShapeDraft]);

  // Shared by Save (idToUse = the current design's id, or null for a
  // brand-new one) and Save As (idToUse always null, forcing a fresh
  // row) — kept as one function taking explicit id/name rather than two
  // near-duplicate copies each reading designId/designName from the
  // component closure, which would go stale the instant Save As updates
  // that state right before saving.
  const performSaveInner = async (idToUse: string | null, nameToUse: string, opts?: { silent?: boolean; skipChooser?: boolean }) => {
    const silent = !!opts?.silent;
    if (!fabricCanvasRef.current) return;
    if (isLocalTabId(activeTabIdRef.current)) {
      await saveToComputer({ silent });
      return;
    }
    // A design that has never been saved anywhere: the customer decides
    // where it lives before anything is stored. Autosave waits for that.
    if (!idToUse && !opts?.skipChooser) {
      if (silent) {
        setSaveStatus('unsaved');
      } else {
        setSaveChooser({ mode: 'first', busy: null, error: null });
      }
      return;
    }
    // setSaving before the (possibly ~2s) auto-apply wait below so the
    // button reads "Saving..." the whole time instead of looking stuck.
    setSaving(true);
    setSaveStatus('saving');
    // Only an explicit Save -- a background autosave tick must never
    // silently kick the user out of an in-progress photo edit.
    if (!silent) await ensurePhotoEditsApplied();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      if (silent) {
        // Autosave with no session (e.g. an expired token) isn't an error
        // to interrupt the user with — just leave the change marked dirty
        // so the next successful save (manual or autosave) picks it up.
        setSaveStatus('error');
        return;
      }
      setLocalNotice('You must be logged in to save a design.');
      setSaveStatus('unsaved');
      return;
    }

    if (idToUse && loadFailedIdRef.current === idToUse) {
      // The design never loaded, so what's on screen isn't it: never write
      // over the real one.
      setSaving(false);
      setSaveStatus('error');
      if (!silent) setLocalNotice("This design didn't open properly, so it can't be saved over. Reload the page to try again.");
      return;
    }
    const revAtSave = editRevRef.current;
    // Pictures stay embedded inside the design itself: they are never
    // stored as separate files, wherever the design is saved.
    const canvasJson = fabricCanvasRef.current.toJSON(SAVE_JSON_PROPS);
    // width/height stay as the dashboard/thumbnail-facing summary size —
    // the first artboard's current dimensions, not the URL params a brand
    // new document happened to start from.
    const firstAb = artboardsRef.current[0];
    const payload: any = {
      user_id: user.id,
      name: nameToUse,
      canvas_json: canvasJson,
      width: firstAb ? Math.round(firstAb.width) : width,
      height: firstAb ? Math.round(firstAb.height) : height,
      updated_at: new Date().toISOString(),
      // Lets the dashboard route "Edit" back to the same editor a design
      // was made in (see supabase/migrations/0007_designs_editor_type.sql)
      // — Main Design always writes 'design' here.
      editor_type: 'design',
    };
    if (idToUse) payload.id = idToUse;

    // A real preview generated from the first artboard's actual content —
    // not a placeholder — so the dashboard can show what the design looks
    // like instead of just its pixel dimensions.
    const thumbnail = makeThumbnail();
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

    // Same defensive fallback for `editor_type` (0007_designs_editor_type.sql)
    // on a database that hasn't had that migration applied yet — the save
    // itself should never fail just because the dashboard can't yet route
    // "Edit" back to the right editor.
    if (error && /editor_type/i.test(error.message || '') && /column|does not exist/i.test(error.message || '')) {
      console.warn(
        'designs.editor_type column not found — saving without it. Add it with: ' +
          "ALTER TABLE designs ADD COLUMN editor_type text NOT NULL DEFAULT 'design';"
      );
      const { editor_type: _dropType, ...withoutEditorType } = payload;
      ({ data, error } = await supabase.from('designs').upsert(withoutEditorType).select().single());
    }

    setSaving(false);

    if (error) {
      console.error('Save failed:', error);
      setSaveStatus('error');
      if (!silent) setLocalNotice('Failed to save design. Please try again.');
      return;
    }
    if (editRevRef.current === revAtSave) {
      dirtyRef.current = false;
      setSaveStatus('saved');
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
      if (data?.id) deleteDraft(data.id);
      if (!idToUse) deleteDraft(UNSAVED_KEY);
    } else {
      // Something changed while this save was on its way: save again.
      setSaveStatus('unsaved');
      scheduleAutosaveRef.current?.();
    }
    if (data) {
      setDesignId(data.id);
      setDesignName(nameToUse);
      const savedTabId = activeTabIdRef.current;
      const stillClean = editRevRef.current === revAtSave;
      setTabs((ts) => ts.map((t) => (t.id === savedTabId ? { ...t, id: data.id, designId: data.id, name: nameToUse, dirty: stillClean ? false : t.dirty } : t)));
      if (savedTabId !== data.id) setActiveTabId(data.id);
      // Only a first save (idToUse null) or Save As actually changes the
      // URL's designId, which re-triggers the canvas load effect below —
      // hand it back exactly what's already on screen instead of making
      // it re-fetch what was just written. A plain re-save of an
      // already-loaded design leaves the URL (and so the effect) alone,
      // so there's nothing to hand off.
      //
      // canvasJSON is RE-SERIALIZED here, fresh, rather than reusing the
      // `canvasJson` this save started with: that snapshot was taken
      // before the `await`s above (auth check + the upsert's own network
      // round trip), and the canvas-recreation effect this feeds is
      // destructive -- it disposes the live Fabric canvas and rebuilds it
      // from exactly this snapshot. Handing it the pre-network-call
      // snapshot would silently discard any edit the user made *during*
      // that round trip (confirmed with a real repro: type during a
      // slow first save and the keystrokes vanish once the id-bearing
      // URL swaps the canvas back in). Re-serializing right before the
      // URL change that triggers the swap closes that window down to a
      // single synchronous step.
      if (idToUse !== data.id) {
        const freshCanvasJSON = fabricCanvasRef.current.toJSON(SAVE_JSON_PROPS);
        pendingSnapshotRef.current = {
          canvasJSON: freshCanvasJSON,
          history: { stack: [...historyRef.current.stack], index: historyRef.current.index },
          artboards: artboardsRef.current,
          activeArtboardId: activeArtboardIdRef.current,
          zoom,
          designName: nameToUse,
          designId: data.id,
          vpt: fabricCanvasRef.current.viewportTransform ? [...fabricCanvasRef.current.viewportTransform] : null,
        };
      }
      router.replace(`/editor?designId=${data.id}&w=${width}&h=${height}`);
      // Version History (spec §56/98/99): a real recoverable snapshot per
      // save, not just the single latest row — best-effort and silent,
      // since a migration-less/placeholder Supabase project (or one that
      // hasn't applied 0002_design_versions.sql yet) must never break the
      // save itself over a missing table.
      const wantVersion = !silent || Date.now() - lastVersionAtRef.current > 10 * 60 * 1000 || idToUse !== data.id;
      if (wantVersion) lastVersionAtRef.current = Date.now();
      if (wantVersion) supabase
        .from('design_versions')
        .insert({
          design_id: data.id,
          user_id: user.id,
          canvas_json: canvasJson,
          width: payload.width,
          height: payload.height,
          thumbnail: thumbnail || null,
        })
        .then(({ error: versionError }) => {
          if (versionError) console.warn('Version snapshot not saved (design_versions table missing?):', versionError.message);
        });
    }
  };

  // Public entry point: serializes concurrent saves through
  // performSaveInner (see saveInFlightRef above) so a slow save started
  // first can never complete after — and overwrite — a faster save
  // started later with newer content.
  const performSave = async (idToUse: string | null, nameToUse: string, opts?: { silent?: boolean; skipChooser?: boolean }) => {
    if (saveInFlightRef.current) {
      // A queued Save As (a brand-new copy) must stay a new copy.
      pendingSaveRef.current = { idToUse, nameToUse, opts, forceNew: idToUse === null && !!opts?.skipChooser } as any;
      return;
    }
    saveInFlightRef.current = true;
    try {
      await performSaveInner(idToUse, nameToUse, opts);
    } finally {
      saveInFlightRef.current = false;
      const next = pendingSaveRef.current;
      if (next) {
        pendingSaveRef.current = null;
        // designIdRef is current by now even if `next` was queued before
        // this design's very first save had assigned it a real id.
        performSave((next as any).forceNew ? null : designIdRef.current ?? next.idToUse, next.nameToUse, next.opts);
      }
    }
  };

  // Long-lived timers call the latest performSave through this ref.
  const performSaveRef = useRef(performSave);
  performSaveRef.current = performSave;
  const loadFailedIdRef = useRef<string | null>(null);

  const saveDesign = () => performSave(designIdRef.current ?? designId, designNameRef.current || designName);

  // Saves the canvas back into the template being edited (admins only;
  // RLS enforces it server-side too). The previous content is kept as a
  // version first, so nothing is ever lost.
  const saveToTemplate = async () => {
    const canvas = fabricCanvasRef.current;
    const firstAb = artboardsRef.current[0];
    if (!templateEdit?.id || !canvas || !firstAb) return;
    setTemplateSave({ busy: true, msg: null });
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        const next = await createVersion(templateEdit, auth.user.id, 'Before design edit');
        if (next) setTemplateEdit((t) => (t ? { ...t, currentVersion: next } : t));
      }
      const canvasJson = canvas.toJSON(SAVE_JSON_PROPS);
      const image: string | null = capturePicture(firstAb, { format: 'jpeg', quality: 0.88, multiplier: 1200 / Math.max(firstAb.width, firstAb.height, 1) }).dataUrl;
      const ok = await setTemplateContent(templateEdit.id, templateEdit.currentVersion || '1.0', canvasJson, image);
      setTemplateSave({ busy: false, msg: ok ? 'Template saved. Customers now get the updated design.' : 'Could not save the template. Please try again.' });
    } catch (err) {
      console.error('Template save failed:', err);
      setTemplateSave({ busy: false, msg: 'Could not save the template. Please try again.' });
    }
  };

  // ---------- .mtd project files on the customer's computer ----------

  const makeThumbnail = (): string | null => {
    const firstAb = artboardsRef.current[0];
    if (!firstAb || !fabricCanvasRef.current) return null;
    try {
      return capturePicture(firstAb, { format: 'jpeg', quality: 0.7, multiplier: 400 / Math.max(firstAb.width, 1) }).dataUrl;
    } catch (err) {
      console.warn('Thumbnail generation failed:', err);
      return null;
    }
  };

  const buildCurrentMtd = async () => {
    const firstAb = artboardsRef.current[0];
    return buildMtd({
      canvas: fabricCanvasRef.current.toJSON(SAVE_JSON_PROPS),
      document: {
        name: designNameRef.current || 'Untitled Design',
        width: firstAb ? Math.round(firstAb.width) : width,
        height: firstAb ? Math.round(firstAb.height) : height,
        editor: 'design',
      },
      thumbnail: makeThumbnail(),
      template: cameFromTemplate ? { id: cameFromTemplate } : null,
    });
  };

  // Save for a tab whose master copy is a .mtd file. Autosave (silent)
  // only writes when the browser already has permission to write to the
  // same file (Chrome/Edge); otherwise the tab simply stays "unsaved"
  // until the customer saves -- it never falls back to the server.
  const saveToComputer = async (opts: { silent?: boolean; saveAs?: boolean } = {}) => {
    const tabId = activeTabIdRef.current;
    const stored = localFilesRef.current.get(tabId);
    if (isCloudTarget(stored) && !opts.saveAs) return saveToCloudTarget(stored.provider, { silent: opts.silent });
    const existing = isCloudTarget(stored) ? undefined : stored;
    if (opts.silent && !(await canWriteSilently(existing?.handle))) {
      setSaveStatus('unsaved');
      return;
    }
    if (!opts.silent) await ensurePhotoEditsApplied();
    setSaving(true);
    setSaveStatus('saving');
    try {
      const { blob, unembedded } = await buildCurrentMtd();
      const target = await saveMtdFile(blob, fileNameFor(designNameRef.current), opts.saveAs ? null : existing?.handle);
      if (!target) {
        setSaveStatus(dirtyRef.current ? 'unsaved' : 'saved');
        return;
      }
      localFilesRef.current.set(tabId, target);
      const name = nameFromFileName(target.fileName);
      setDesignName(name);
      dirtyRef.current = false;
      setSaveStatus('saved');
      setTabs((ts) => ts.map((t) => (t.id === tabId ? { ...t, name, dirty: false } : t)));
      const firstAb = artboardsRef.current[0];
      rememberRecent({
        name,
        fileName: target.fileName,
        width: firstAb ? Math.round(firstAb.width) : width,
        height: firstAb ? Math.round(firstAb.height) : height,
        thumbnail: makeThumbnail(),
        handle: target.handle,
      });
      if (!opts.silent) {
        setLocalNotice(
          (target.handle
            ? `Saved to your computer as "${target.fileName}".`
            : `"${target.fileName}" was downloaded. Keep it somewhere safe — it's your editable project.`) +
            (unembedded ? ` ${unembedded} linked image(s) couldn't be packed into the file and still need internet.` : ''),
        );
      }
    } catch (err) {
      console.error('Saving .mtd failed:', err);
      setSaveStatus('error');
      if (!opts.silent) setLocalNotice('Could not save the project file. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const providerLabel = (id: CloudProviderId) => providerById(id).label;
  const storageLabel = (tabId: string) => {
    const t = localFilesRef.current.get(tabId);
    return isCloudTarget(t) ? providerLabel(t.provider) : 'computer';
  };

  // Gives the active tab a new id, e.g. when a never-saved design becomes
  // a computer/cloud project ("local-…") or an account design ("new-…").
  const reassignActiveTab = (newId: string) => {
    const oldId = activeTabIdRef.current;
    if (oldId === newId) return;
    const snap = tabSnapshotsRef.current.get(oldId);
    if (snap) {
      tabSnapshotsRef.current.delete(oldId);
      tabSnapshotsRef.current.set(newId, snap);
    }
    const target = localFilesRef.current.get(oldId);
    localFilesRef.current.delete(oldId);
    if (target && isLocalTabId(newId)) localFilesRef.current.set(newId, target);
    setTabs((ts) => ts.map((t) => (t.id === oldId ? { ...t, id: newId, designId: null } : t)));
    activeTabIdRef.current = newId;
    setActiveTabId(newId);
    // The copy is no longer the account design it came from.
    designIdRef.current = null;
    setDesignId(null);
  };

  // Save for a tab whose master copy is a file in Google Drive / OneDrive
  // / Dropbox. `popup` must be opened inside the tap (popupIfNeeded).
  const saveToCloudTarget = async (provider: CloudProviderId, opts: { silent?: boolean; popup?: Window | null; isNew?: boolean } = {}) => {
    const tabId = activeTabIdRef.current;
    const stored = localFilesRef.current.get(tabId);
    const existing = !opts.isNew && isCloudTarget(stored) && stored.provider === provider ? stored.file : null;
    if (opts.silent && !canSaveSilently(provider)) {
      setSaveStatus('unsaved');
      return false;
    }
    let popup = opts.popup ?? null;
    if (!opts.silent && opts.popup === undefined) {
      try {
        popup = popupIfNeeded(providerById(provider));
      } catch (err) {
        setLocalNotice((err as Error).message);
        return false;
      }
    }
    if (!opts.silent) await ensurePhotoEditsApplied();
    setSaving(true);
    setSaveStatus('saving');
    try {
      const { blob, unembedded } = await buildCurrentMtd();
      const firstAb = artboardsRef.current[0];
      const file = await saveToCloud(provider, popup, {
        fileName: fileNameFor(designNameRef.current),
        projectName: designNameRef.current || 'Untitled Design',
        blob,
        existing,
        thumbnail: makeThumbnail(),
        width: firstAb ? firstAb.width : width,
        height: firstAb ? firstAb.height : height,
      });
      const key = activeTabIdRef.current;
      localFilesRef.current.set(key, { provider, file });
      dirtyRef.current = false;
      setSaveStatus('saved');
      setTabs((ts) => ts.map((t) => (t.id === key ? { ...t, dirty: false } : t)));
      if (!opts.silent) {
        setLocalNotice(
          `Saved to your ${providerLabel(provider)} as "${file.name}".` +
            (unembedded ? ` ${unembedded} linked image(s) couldn't be packed into the file and still need internet.` : ''),
        );
      }
      return true;
    } catch (err) {
      console.error('Cloud save failed:', err);
      setSaveStatus(opts.silent ? 'unsaved' : 'error');
      if (!opts.silent) setLocalNotice((err as Error).message || `Could not save to ${providerLabel(provider)}.`);
      return false;
    } finally {
      setSaving(false);
    }
  };

  // The customer picked a location in "Save your project".
  const chooseSaveLocation = (location: SaveLocation) => {
    if (!saveChooser) return;
    const mode = saveChooser.mode;

    if (location === 'account') {
      setSaveChooser(null);
      withDesignLimitCheck(() => {
        let name = designNameRef.current || 'Untitled Design';
        if (mode === 'saveAs') {
          const picked = window.prompt('Name for the copy in your account:', `${name} copy`);
          if (!picked || !picked.trim()) return;
          name = picked.trim();
        }
        if (isLocalTabId(activeTabIdRef.current)) reassignActiveTab(`new-${Date.now()}`);
        performSave(null, name, { skipChooser: true });
      });
      return;
    }

    if (location === 'computer') {
      setSaveChooser(null);
      if (!isLocalTabId(activeTabIdRef.current)) reassignActiveTab(newLocalKey());
      saveToComputer({ saveAs: true });
      return;
    }

    // A cloud drive: open the sign-in window now, while we still have the tap.
    let popup: Window | null;
    try {
      popup = popupIfNeeded(providerById(location));
    } catch (err) {
      setSaveChooser({ mode, busy: null, error: (err as Error).message });
      return;
    }
    setSaveChooser({
      mode,
      busy: popup ? `Sign in to ${providerLabel(location)} in the window that opened…` : `Saving to ${providerLabel(location)}…`,
      error: null,
    });
    (async () => {
      const wasLocal = isLocalTabId(activeTabIdRef.current);
      const previousId = activeTabIdRef.current;
      if (!wasLocal) reassignActiveTab(newLocalKey());
      const ok = await saveToCloudTarget(location, { popup, isNew: true });
      if (ok) {
        setSaveChooser(null);
      } else {
        if (!wasLocal) reassignActiveTab(previousId);
        setSaveChooser({ mode, busy: null, error: `Could not save to ${providerLabel(location)}. Please try again.` });
      }
    })();
  };

  // Any open design (even one stored in the account) can be saved as a
  // portable .mtd copy without changing where the original lives.
  const saveCopyToComputer = async () => {
    if (isLocalTabId(activeTabIdRef.current)) return saveToComputer({ saveAs: true });
    await ensurePhotoEditsApplied();
    try {
      const { blob } = await buildCurrentMtd();
      const target = await saveMtdFile(blob, fileNameFor(designNameRef.current));
      if (target) setLocalNotice(`A copy was saved to your computer as "${target.fileName}".`);
    } catch (err) {
      console.error('Saving .mtd copy failed:', err);
      setLocalNotice('Could not save the project file. Please try again.');
    }
  };

  const openCloudResult = (result: { opened: any; provider: CloudProviderId; file: any }) => {
    setShowCloudOpen(false);
    const key = newLocalKey();
    putHandoff(key, { opened: result.opened, file: { provider: result.provider, file: result.file } });
    const d = result.opened.document;
    activateTab({ id: key, designId: null, name: d.name, width: d.width, height: d.height, dirty: false }, { isNew: true });
  };

  const openFromComputer = async () => {
    const picked = await pickMtdFile();
    if (!picked) return;
    try {
      const opened = await readMtd(picked.file);
      if (opened.document.editor === 'photo-studio') {
        setLocalNotice('This project was made in Photo Studio. Open it from the dashboard instead.');
        return;
      }
      const key = newLocalKey();
      const file: LocalFileRef = { handle: picked.handle, fileName: picked.file.name };
      putHandoff(key, { opened, file });
      rememberRecent({
        name: opened.document.name,
        fileName: picked.file.name,
        width: opened.document.width,
        height: opened.document.height,
        thumbnail: opened.thumbnail,
        handle: picked.handle,
      });
      activateTab(
        { id: key, designId: null, name: opened.document.name, width: opened.document.width, height: opened.document.height, dirty: false },
        { isNew: true },
      );
    } catch (err) {
      setLocalNotice(err instanceof MtdError ? err.message : 'This file could not be opened.');
    }
  };

  // Replaces the live canvas with a past version's content, as one
  // undoable step (Ctrl/Cmd+Z reverts back to whatever was on screen
  // before the restore). The loadFromJSON itself is suppressed from
  // history/dirty-tracking for the same reason the tab/version-load
  // paths above are — its own object:added events aren't a real edit —
  // then a single pushHistory() after records the restore as one step
  // and marks the design dirty so it autosaves.
  const restoreVersion = (canvasJson: any, _versionWidth: number, _versionHeight: number) => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    if (!canvas || !F) return;
    suppressHistoryRef.current = true;
    canvas.loadFromJSON(canvasJson, () => {
      ensureArtboards(canvas, F);
      canvas.renderAll();
      refreshLayers();
      refreshArtboards();
      const first = canvas.getObjects().find((o: any) => o.__isArtboard);
      if (first) setActiveArtboardId(first.__artboardId);
      ensureFontsLoadedForCanvasJSON(canvasJson).then(() => refreshTextMetrics(canvas));
      suppressHistoryRef.current = false;
      pushHistory();
    });
  };

  // Debounced background save (spec: "Never lose a design because of
  // navigation or refresh"). A few seconds of inactivity after any edit
  // triggers a silent save reusing the same performSave path as the manual
  // Save button — including a document's very first save, since
  // performSave already handles idToUse === null by inserting a new row.
  const AUTOSAVE_DELAY_MS = 3000;
  const scheduleAutosave = useCallback(
    (delayMs: number = AUTOSAVE_DELAY_MS) => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = setTimeout(() => {
        autosaveTimerRef.current = null;
        if (!dirtyRef.current) return;
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          setSaveStatus('offline');
          return;
        }
        performSaveRef.current?.(designIdRef.current, designNameRef.current, { silent: true });
      }, delayMs);
    },
    // designId/designName are read from refs at fire time (see below) so
    // this callback never goes stale without needing them as deps.
    []
  );
  useEffect(() => {
    scheduleAutosaveRef.current = scheduleAutosave;
  }, [scheduleAutosave]);
  useEffect(() => () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
  }, []);

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
    // "Save As" always asks where the copy should live (spec step 12:
    // a Drive project can become a local file, and vice versa).
    setSaveChooser({ mode: 'saveAs', busy: null, error: null });
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
    const handler = (e: BeforeUnloadEvent) => {
      persistTabSession();
      // Unsaved work: ask the browser to confirm leaving.
      if (dirtyRef.current || saveInFlightRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
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
      : isLocalTabId(tab.id)
      ? `w=${tab.width}&h=${tab.height}&localDoc=${tab.id}`
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
    const query = next.designId
      ? `designId=${next.designId}&w=${next.width}&h=${next.height}`
      : isLocalTabId(next.id)
      ? `w=${next.width}&h=${next.height}&localDoc=${next.id}`
      : `w=${next.width}&h=${next.height}`;
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
    if (!designIdRef.current && !isLocalTabId(activeTabIdRef.current)) {
      // Never saved yet: ask where to keep it; the tab stays open.
      setCloseConfirm(null);
      setSaveChooser({ mode: 'first', busy: null, error: null });
      return;
    }
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
    if (!marks.length) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    marks.forEach((m) => canvas.remove(m));
    canvas.requestRenderAll();
  };

  // Guides are real, visible Fabric objects (see hooks/useGuides.ts) so
  // they render fine on screen, but a raster export via canvas.toDataURL
  // rasterizes literally whatever is currently drawn in that rect — with
  // no per-object filtering step to exclude them the way the PDF/SVG
  // exporters already do. Hide them for the instant of the capture, same
  // pattern as buildAndInsertMarks/removeTemporaryMarks above.
  const hideGuidesForExport = (): any[] => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return [];
    const guideObjs = canvas.getObjects().filter((o: any) => o.__isGuide && o.visible !== false);
    guideObjs.forEach((o: any) => (o.visible = false));
    if (guideObjs.length) canvas.requestRenderAll();
    return guideObjs;
  };
  const restoreGuidesAfterExport = (guideObjs: any[]) => {
    if (!guideObjs.length) return;
    guideObjs.forEach((o: any) => (o.visible = true));
    fabricCanvasRef.current?.requestRenderAll();
  };

  // One safe way to turn part of the page into a picture: guides and the
  // selection outline hidden, the grey editor background replaced by
  // paper white (or nothing, for transparent PNGs), production marks
  // added when asked, and the size kept within what phones and iPads can
  // draw (about 16 million pixels). Everything is put back afterwards.
  const MAX_EXPORT_PIXELS = 16_000_000;
  const capturePicture = (
    rect: { x: number; y: number; width: number; height: number },
    opts: { format: 'png' | 'jpeg' | 'webp'; quality?: number; multiplier: number; transparent?: boolean; artboardId?: string; marks?: () => any[] }
  ): { dataUrl: string; reduced: boolean } => {
    const canvas = fabricCanvasRef.current;
    const area = Math.max(1, rect.width * rect.height);
    const m = Math.min(opts.multiplier, Math.sqrt(MAX_EXPORT_PIXELS / area));
    const reduced = m < opts.multiplier - 1e-6;
    const savedBg = canvas.backgroundColor;
    const page = opts.transparent && opts.artboardId ? canvas.getObjects().find((o: any) => o.__isArtboard && o.__artboardId === opts.artboardId) : null;
    const savedFill = page ? page.fill : undefined;
    let marks: any[] = [];
    let hidden: any[] = [];
    // Selection outlines live on a separate layer and never appear in the
    // picture, so the selection is left alone.
    suppressHistoryRef.current = true;
    try {
      canvas.backgroundColor = opts.transparent ? '' : '#FFFFFF';
      if (page) page.set('fill', '');
      marks = opts.marks ? opts.marks() : [];
      hidden = hideGuidesForExport();
      const dataUrl = canvas.toDataURL({ format: opts.format, quality: opts.quality ?? 1, ...getArtboardExportOptions(rect, m) });
      return { dataUrl, reduced };
    } finally {
      restoreGuidesAfterExport(hidden);
      removeTemporaryMarks(marks);
      canvas.backgroundColor = savedBg;
      if (page) page.set('fill', savedFill);
      canvas.requestRenderAll();
      suppressHistoryRef.current = false;
    }
  };
  const exportErrorMessage = (err: any) =>
    err && (err.name === 'SecurityError' || /tainted/i.test(String(err.message)))
      ? 'One of the pictures in this design comes from another website that doesn’t allow downloading it. Replace that picture and try again.'
      : 'The download couldn’t be created. Please try again.';

  // Raster exports default to the document's print resolution (e.g. a
  // 300 DPI flyer exports at 300 DPI), at least 2x for screen designs.
  const exportMultiplierFor = (ab: ArtboardMeta) => Math.max(2, (ab.print?.dpi || 0) / 96);

  const exportArtboardPNG = (id: string, opts?: { silent?: boolean; scope?: ExportScope }) => {
    const canvas = fabricCanvasRef.current;
    const ab = artboards.find((a) => a.id === id);
    if (!canvas || !ab) return null;
    const scope = opts?.scope || 'artboard';
    const exportRect = getExportRect(ab, ab.print, scope);
    let out: { dataUrl: string; reduced: boolean } | null = null;
    try {
      out = capturePicture(exportRect, { format: 'png', multiplier: exportMultiplierFor(ab), artboardId: ab.id, marks: () => buildAndInsertMarks(ab, scope) });
      const name = `${designName || 'design'} - ${ab.name}${scope !== 'artboard' ? ` (${scope})` : ''}.png`;
      if (!opts?.silent) downloadFile(out.dataUrl, name);
      if (out.reduced) setLocalNotice('This page was very large, so the download was made a little smaller so it opens on every device.');
    } catch (err) {
      console.error('PNG export failed:', err);
      setLocalNotice(exportErrorMessage(err));
    } finally {
      if (!opts?.silent) {
        setExporting(false);
        setShowExportDialog(false);
      }
    }
    return out ? { name: `${ab.name}.png`, dataUrl: out.dataUrl } : null;
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
      try {
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
      pdf.save(`${designName || 'design'} - ${ab.name}${scope !== 'artboard' ? ` (${scope})` : ''}.pdf`);
      } finally {
        removeTemporaryMarks(marks);
        suppressHistoryRef.current = false;
      }
    } catch (err) {
      console.error('Print PDF export failed:', err);
      setLocalNotice('Failed to export PDF. Please try again.');
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

  // Every page in one .zip (browsers block several downloads at once).
  const exportAllArtboardsPNG = () => {
    setExporting(true);
    try {
      const files = artboards.map((ab) => exportArtboardPNG(ab.id, { silent: true })).filter(Boolean) as { name: string; dataUrl: string }[];
      if (files.length === 1) downloadFile(files[0].dataUrl, `${designName || 'design'} - ${files[0].name}`);
      else if (files.length > 1) {
        const url = URL.createObjectURL(buildZip(files.map((f) => ({ name: f.name, data: dataUrlToBytes(f.dataUrl) }))));
        downloadFile(url, `${designName || 'design'} (${files.length} pages).zip`);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } finally {
      setExporting(false);
    }
  };

  const exportQuick = async (format: 'png' | 'jpeg') => {
    setExporting(true);
    try {
      await ensurePhotoEditsApplied();
      const ab = getActiveArtboardRect();
      const meta = artboards.find((a) => a.id === ab.id);
      const out = capturePicture(ab, { format, quality: format === 'jpeg' ? 0.92 : 1, multiplier: meta ? exportMultiplierFor(meta) : 2, artboardId: ab.id });
      downloadFile(out.dataUrl, `${designName || 'design'}${meta ? ` - ${meta.name}` : ''}.${format === 'jpeg' ? 'jpg' : 'png'}`);
      if (out.reduced) setLocalNotice('This page was very large, so the download was made a little smaller so it opens on every device.');
    } catch (err) {
      console.error('Export failed:', err);
      setLocalNotice(exportErrorMessage(err));
    } finally {
      setExporting(false);
      setShowExportDialog(false);
    }
  };
  const exportAsPNG = () => exportQuick('png');
  const exportAsJPG = () => exportQuick('jpeg');

  // File > Export as SVG serializes the active artboard's real object
  // geometry (see lib/editor/svgExport.ts) — a pen-drawn path comes out as
  // a genuine <path d="M...C..."> a vector editor can re-edit, not a
  // rasterized screenshot wrapped in <svg> tags.
  const exportAsSVG = async () => {
    setExporting(true);
    await ensurePhotoEditsApplied();
    try {
      const canvas = fabricCanvasRef.current;
      const F = (window as any).fabric || (await import('fabric')).fabric;
      const ab = getActiveArtboardRect();
      const svg = exportArtboardToSVG(canvas, F, ab);
      const blob = new Blob([svg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${designName || 'design'}${ab.id ? ` - ${artboards.find((a) => a.id === ab.id)?.name || ''}` : ''}.svg`);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('SVG export failed:', err);
      setLocalNotice('Failed to export SVG. Please try again.');
    }
    setExporting(false);
    setShowExportDialog(false);
  };

  // File > Export as PDF exports every artboard as its own page, matching
  // how Illustrator treats "the document" as all of its artboards.
  const exportAsPDF = async () => {
    setExporting(true);
    await ensurePhotoEditsApplied();
    fabricCanvasRef.current?.discardActiveObject();
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
      setLocalNotice('Failed to export PDF. Please try again.');
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
      try {
        for (let i = 0; i < pages.length; i++) {
          const { ab, rect } = pages[i];
          if (i > 0) pdf.addPage([toPt(rect.width), toPt(rect.height)], rect.width > rect.height ? 'landscape' : 'portrait');
          const marks = buildAndInsertMarks(ab, scope);
          try {
            await exportArtboardsToPDF(pdf, canvas, F, [{ id: ab.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
          } finally {
            removeTemporaryMarks(marks);
          }
        }
      } finally {
        suppressHistoryRef.current = false;
      }

      const rangeLabel = lo === hi ? `page ${lo}` : `pages ${lo}-${hi}`;
      pdf.save(`${designName || 'design'} (${rangeLabel}).pdf`);
    } catch (err) {
      console.error('PDF range export failed:', err);
      setLocalNotice('Failed to export PDF. Please try again.');
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

  // Real CMYK (PDF or TIFF) and TIFF files: each page is rendered at full
  // print resolution, converted through the FOGRA39 press profile (pure
  // black text stays 100% K) and written as a proper 4-ink file with the
  // profile embedded. PDFs get trim/bleed boxes and crop marks.
  const exportPrintFiles = async (list: ArtboardMeta[], settings: ExportSettings) => {
    const cmyk = settings.colour === 'cmyk';
    const [{ loadCmykTable, loadPressProfile, rgbaToCmyk }, { writePressPdf, writeTiff }] = await Promise.all([
      import('@/lib/color/cmyk'),
      import('@/lib/export/printFiles'),
    ]);
    const [lut, icc] = cmyk ? await Promise.all([loadCmykTable(), loadPressProfile()]) : [null, null];
    const scope: ExportScope = settings.includeBleed || settings.includeMarks ? 'bleed' : 'artboard';
    let reduced = false;
    const pages: { ab: ArtboardMeta; rect: { x: number; y: number; width: number; height: number }; w: number; h: number; rgba: Uint8ClampedArray }[] = [];
    for (const ab of list) {
      const print = { ...ab.print, marks: { crop: false, registration: false, colorBar: false } };
      const rect = getExportRect(ab, print, scope);
      const out = capturePicture(rect, { format: 'png', multiplier: settings.multiplier, transparent: settings.format === 'tiff' && !cmyk && settings.transparentBackground, artboardId: ab.id });
      reduced = reduced || out.reduced;
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = out.dataUrl;
      });
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const x = c.getContext('2d', { willReadFrequently: true })!;
      x.drawImage(img, 0, 0);
      pages.push({ ab, rect, w: c.width, h: c.height, rgba: x.getImageData(0, 0, c.width, c.height).data });
    }
    const base = designName || 'design';
    const dpiFor = (p: (typeof pages)[number]) => Math.round((p.w / p.rect.width) * 96);
    if (settings.format === 'pdf') {
      const pts = (px: number) => px * 0.75;
      const blob = await writePressPdf(
        pages.map((p) => ({
          data: rgbaToCmyk(p.rgba, lut!, { pureBlack: true }),
          space: 'cmyk' as const,
          pxWidth: p.w,
          pxHeight: p.h,
          trimW: pts(p.ab.width),
          trimH: pts(p.ab.height),
          bleed: pts(Math.max(0, (p.rect.width - p.ab.width) / 2)),
        })),
        { title: base, cropMarks: settings.includeMarks, icc }
      );
      const url = URL.createObjectURL(blob);
      downloadFile(url, `${base} (${pages.length === 1 ? pages[0].ab.name : `${pages.length} pages`}) CMYK.pdf`);
      setTimeout(() => URL.revokeObjectURL(url), 8000);
    } else {
      const files: { name: string; data: Uint8Array }[] = [];
      for (const p of pages) {
        let blob: Blob;
        if (cmyk) blob = await writeTiff({ width: p.w, height: p.h, data: rgbaToCmyk(p.rgba, lut!, { pureBlack: true }), mode: 'cmyk', dpi: dpiFor(p), icc });
        else {
          const rgb = new Uint8Array(p.w * p.h * 3);
          for (let i = 0, j = 0; i < p.rgba.length; i += 4, j += 3) { rgb[j] = p.rgba[i]; rgb[j + 1] = p.rgba[i + 1]; rgb[j + 2] = p.rgba[i + 2]; }
          blob = settings.transparentBackground
            ? await writeTiff({ width: p.w, height: p.h, data: new Uint8Array(p.rgba.buffer, p.rgba.byteOffset, p.rgba.length), mode: 'rgba', dpi: dpiFor(p) })
            : await writeTiff({ width: p.w, height: p.h, data: rgb, mode: 'rgb', dpi: dpiFor(p) });
        }
        files.push({ name: `${p.ab.name}${cmyk ? ' CMYK' : ''}.tif`, data: new Uint8Array(await blob.arrayBuffer()) });
      }
      if (files.length === 1) {
        const url = URL.createObjectURL(new Blob([files[0].data as BlobPart], { type: 'image/tiff' }));
        downloadFile(url, `${base} - ${files[0].name}`);
        setTimeout(() => URL.revokeObjectURL(url), 8000);
      } else {
        const url = URL.createObjectURL(buildZip(files));
        downloadFile(url, `${base} (${files.length} pages).zip`);
        setTimeout(() => URL.revokeObjectURL(url), 8000);
      }
    }
    if (reduced) setLocalNotice('Some pages were very large, so they were made a little smaller so they open on every device.');
  };

  // One export path for every combination the dialog can produce: any
  // page range, any of the three formats, with or without bleed/marks.
  // PDF pages all land in a single multi-page file (matching how a real
  // print-ready document is delivered); PNG/JPG can't hold multiple
  // pages, so each artboard downloads as its own file.
  const runExport = async (settings: ExportSettings) => {
    // Set before the (possibly ~2s) auto-apply wait below so the button
    // reads "Exporting..." the whole time instead of looking stuck.
    setExporting(true);
    await ensurePhotoEditsApplied();
    const canvas = fabricCanvasRef.current;
    const list = resolveExportArtboards(settings);
    if (!list.length) {
      setLocalNotice('No pages match the selected export range.');
      setExporting(false);
      return;
    }
    // Objects inside a multi-selection have relative positions; export
    // needs their real place on the page.
    canvas.discardActiveObject();

    const scope: ExportScope = settings.includeMarks ? 'marks' : settings.includeBleed ? 'bleed' : 'artboard';

    try {
      if (settings.colour === 'cmyk' || settings.format === 'tiff') {
        await exportPrintFiles(list, settings);
      } else if (settings.format === 'pdf') {
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
        try {
          for (let i = 0; i < pages.length; i++) {
            const { ab, print, rect } = pages[i];
            if (i > 0) pdf.addPage([toPt(rect.width), toPt(rect.height)], rect.width > rect.height ? 'landscape' : 'portrait');
            const marks = buildAndInsertMarks(ab, scope, print);
            try {
              await exportArtboardsToPDF(pdf, canvas, F, [{ id: ab.id, x: rect.x, y: rect.y, width: rect.width, height: rect.height }]);
            } finally {
              removeTemporaryMarks(marks);
            }
          }
        } finally {
          suppressHistoryRef.current = false;
        }

        const rangeLabel = pages.length === 1 ? pages[0].ab.name : `${pages.length} pages`;
        pdf.save(`${designName || 'design'} (${rangeLabel}).${settings.format}`);
      } else {
        const files: { name: string; dataUrl: string }[] = [];
        let reduced = false;
        // Fabric expects a real MIME subtype ('jpeg', not 'jpg').
        const mime = settings.format === 'jpg' ? 'jpeg' : (settings.format as 'png' | 'webp');
        for (const ab of list) {
          const print = exportPrintFor(ab, settings);
          const rect = getExportRect(ab, print, scope);
          const out = capturePicture(rect, {
            format: mime,
            quality: settings.format === 'png' ? 1 : settings.quality,
            multiplier: settings.multiplier,
            transparent: settings.format === 'png' && settings.transparentBackground,
            artboardId: ab.id,
            marks: () => buildAndInsertMarks(ab, scope, print),
          });
          reduced = reduced || out.reduced;
          // Browsers without WebP encoding hand back PNG instead.
          const realExt = out.dataUrl.startsWith('data:image/webp') ? 'webp' : out.dataUrl.startsWith('data:image/jpeg') ? 'jpg' : 'png';
          files.push({ name: `${ab.name}.${realExt}`, dataUrl: out.dataUrl });
        }
        if (files.length === 1) downloadFile(files[0].dataUrl, `${designName || 'design'} - ${files[0].name}`);
        else {
          const url = URL.createObjectURL(buildZip(files.map((f) => ({ name: f.name, data: dataUrlToBytes(f.dataUrl) }))));
          downloadFile(url, `${designName || 'design'} (${files.length} pages).zip`);
          setTimeout(() => URL.revokeObjectURL(url), 4000);
        }
        if (reduced) setLocalNotice('Some pages were very large, so they were made a little smaller so they open on every device.');
      }
    } catch (err) {
      console.error('Export failed:', err);
      setLocalNotice(exportErrorMessage(err));
    } finally {
      setExporting(false);
      setShowExportDialog(false);
    }
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

  // Select > Same …: everything on the page that shares the selected
  // object's fill colour, border colour or kind.
  const selectSame = (what: 'fill' | 'stroke' | 'type') => {
    const canvas = fabricCanvasRef.current;
    const F = (window as any).fabric;
    const ref = selected?.type === 'activeSelection' ? selected.getObjects()[0] : selected;
    if (!canvas || !F || !ref) return;
    const key = (o: any) => {
      const v = what === 'type' ? (o.__shape?.kind ? `shape:${o.__shape.kind}` : o.type) : o[what];
      return typeof v === 'string' ? v.toUpperCase() : v && v.colorStops ? JSON.stringify(v.colorStops) : String(v);
    };
    const want = key(ref);
    const matches = canvas.getObjects().filter((o: any) => isArtwork(o) && !o.locked && o.visible !== false && key(o) === want);
    canvas.discardActiveObject();
    if (matches.length === 1) canvas.setActiveObject(matches[0]);
    else if (matches.length > 1) canvas.setActiveObject(new F.ActiveSelection(matches, { canvas }));
    canvas.requestRenderAll();
    setSelected(canvas.getActiveObject() || null);
  };

  const menus: MenuDef[] = [
    {
      label: 'File',
      items: [
        { label: 'New Design', onClick: startNewDesign },
        { label: 'Open...', onClick: () => setShowOpenDialog(true) },
        { label: 'Open from Device (.mtd)...', onClick: openFromComputer },
        ...(HAS_CLOUD_DRIVES ? [{ label: 'Open from Cloud Drive...', onClick: () => setShowCloudOpen(true) }] : []),
        { label: 'Import...', onClick: () => importInputRef.current?.click() },
        { divider: true },
        { label: 'Save', shortcut: 'Ctrl/Cmd+S', onClick: saveDesign },
        { label: 'Save As...', shortcut: 'Ctrl/Cmd+Shift+S', onClick: saveDesignAs },
        { label: 'Save a Copy to Device (.mtd)...', onClick: saveCopyToComputer },
        { label: 'Version History...', onClick: () => setShowVersionHistory(true), disabled: isLocalTabId(activeTabId) },
        { divider: true },
        { label: 'Export...', onClick: () => setShowExportDialog(true) },
        { label: 'Export as PNG', onClick: exportAsPNG },
        { label: 'Export as JPG', onClick: exportAsJPG },
        { label: 'Export as PDF', onClick: exportAsPDF },
        { label: 'Export as SVG', onClick: exportAsSVG },
        { label: 'Download (PNG)', onClick: exportAsPNG },
        { divider: true },
        { label: 'Preflight...', onClick: runPreflightCheck },
        { label: 'Document & Print Setup (size, bleed, margins, marks)', onClick: () => togglePanel('artboards') },
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
        { label: 'Preferences...', onClick: () => setShowPreferences(true) },
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
        { label: 'Join', shortcut: 'Ctrl/Cmd+J', onClick: joinSelectedPaths, disabled: !hasSelection },
        { label: 'Break Path at Anchor', onClick: breakSelectedPath, disabled: !hasSelection },
        { label: 'Reverse Path Direction', onClick: reverseSelectedPath, disabled: !hasSelection },
        { label: 'Artboard Tool', shortcut: 'Shift+O', onClick: () => setActiveTool('artboard') },
        { label: 'Artboards Panel', onClick: () => togglePanel('artboards') },
      ],
    },
    {
      label: 'Type',
      items: [
        { label: 'Add Text', shortcut: 'T', onClick: addText },
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
            const objs = canvas.getObjects().filter((o: any) => isArtwork(o) && !o.locked && o.visible !== false);
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
        { label: 'Same Fill Colour', onClick: () => selectSame('fill'), disabled: !hasSelection },
        { label: 'Same Border Colour', onClick: () => selectSame('stroke'), disabled: !hasSelection },
        { label: 'Same Kind of Object', onClick: () => selectSame('type'), disabled: !hasSelection },
      ],
    },
    {
      label: 'View',
      items: [
        { label: 'Zoom In', shortcut: 'Ctrl/Cmd+"+"', onClick: () => applyZoom((z) => z * 1.25) },
        { label: 'Zoom Out', shortcut: 'Ctrl/Cmd+"-"', onClick: () => applyZoom((z) => z / 1.25) },
        { label: 'Fit Page', shortcut: 'Ctrl/Cmd+0', onClick: fitActiveArtboard },
        { label: 'Fit All Pages', onClick: fitAllArtboards },
        { label: 'Actual Size (100%)', shortcut: 'Ctrl/Cmd+1', onClick: () => applyZoom(100) },
        { divider: true },
        { label: 'Show Bleed, Margins & Safe Area', checked: showPrintGuides, onClick: () => setShowPrintGuides((v) => !v) },
        { label: 'Show Rulers', shortcut: 'Ctrl/Cmd+R', checked: showRulers, onClick: () => setShowRulers((v) => !v) },
        { label: 'Show Grid', checked: showGrid, onClick: () => setShowGrid((v) => !v) },
        { label: 'Show Guides', shortcut: 'Ctrl/Cmd+;', checked: showGuides, onClick: () => setShowGuides((v) => !v) },
        { label: 'Lock Guides', checked: guidesLocked, onClick: () => setGuidesLocked(!guidesLocked) },
        { label: 'Clear Guides', onClick: clearGuides },
        { divider: true },
        { label: 'Snap to Objects', checked: snapToObjects, onClick: () => setSnapToObjects((v) => !v) },
        { label: 'Snap to Guides', checked: snapToGuides, onClick: () => setSnapToGuides((v) => !v) },
        { label: 'Snap to Grid', checked: snapToGrid, onClick: () => setSnapToGrid((v) => !v) },
      ],
    },
    {
      label: 'Window',
      items: [
        { label: 'Properties', onClick: () => togglePanel('properties') },
        { label: 'Layers', onClick: () => togglePanel('layers') },
        { label: 'Align', onClick: () => togglePanel('align') },
        { label: 'Pages & Print Setup', onClick: () => togglePanel('artboards') },
      ],
    },
    {
      label: 'Help',
      items: [
        { label: 'Keyboard Shortcuts', shortcut: '?', onClick: () => setShowShortcuts(true) },
        { label: 'Help & Learn', onClick: () => setLeftPanel('help') },
      ],
    },
  ];


  // ---------------------------------------------------------------------
  // Pieces of the new interface
  // ---------------------------------------------------------------------
  const docColors = canvasReady ? collectDocumentColors(fabricCanvasRef.current) : [];
  const selectedImage = selected && selected.type === 'image' ? selected : null;

  const toolbarActions: ToolbarActions = {
    frame: frameActions,
    applyProp,
    applyCharProp,
    getTextPropValue,
    setFill: features.setFill,
    setStroke: features.setStroke,
    setShadow: features.setShadow,
    setCornerRadius: features.setCornerRadius,
    setShapeParams: features.setShapeParams,
    setTextFx: features.setTextFx,
    setOpacity: features.setOpacity,
    flip: features.flip,
    replaceImage: () => replaceInputRef.current?.click(),
    startCrop: () => features.startCrop(),
    openAdjust: () => setLeftPanel('adjust'),
    editPhoto: () => openPhotoEditor(),
    removeBackground: () => {
      const t = fabricCanvasRef.current?.getActiveObject();
      if (t && t.type === 'image') setBgRemoveTarget(t);
    },
    maskWithShape: features.maskWithShape,
    detachFromFrame: features.detachFromFrame,
    combineShapes: (op: 'union' | 'subtract' | 'intersect' | 'exclude') => runShapeBuilder(op),
    placeInShape: () => {
      const sel = fabricCanvasRef.current?.getActiveObject();
      if (!sel || sel.type !== 'activeSelection') return;
      const objs = sel.getObjects();
      const img = objs.find((o: any) => o.type === 'image');
      const shape = objs.find((o: any) => o !== img);
      if (img && shape) features.placeInShape(img, shape);
    },
    duplicate: duplicateSelected,
    remove: deleteSelected,
    toggleLock: () => {
      const t = fabricCanvasRef.current?.getActiveObject();
      if (t) toggleLock(t);
    },
    group: groupSelected,
    ungroup: ungroupSelected,
    align: (m, rel) => alignObject(m, rel || 'auto'),
    distribute: distributeObjects,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    pageBackground: pageBackgroundValue,
    setPageBackground: setPageBackgroundValue,
    openResize: () => setShowResize(true),
    pickFromCanvas,
  };

  const propertiesPanelEl = (
    <PropertiesPanel
      activeTool={activeTool}
      stripTool={stripTool}
      selected={selected}
      unit={unit}
      layers={layers}
      a={toolbarActions}
      brandColors={brandKit.colors}
      documentColors={docColors}
      maskTargetId={maskTargetId}
      setMaskTargetId={setMaskTargetId}
      applyExactSize={applyExactSize}
      toggleLockRatio={toggleLockRatio}
      applyPathAsMask={applyPathAsMask}
      removeMask={removeMask}
      layerLabel={layerLabel}
      onEditPhoto={openPhotoEditor}
      artboardOrigin={(() => {
        const ab = artboards.find((a) => a.id === selected?.__artboardId) || getActiveArtboardRect();
        return { x: ab.x, y: ab.y };
      })()}
    />
  );

  const artboardsPanelEl = (
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
  );

  const selectionMembers: any[] = selected ? (selected.type === 'activeSelection' ? selected.getObjects() : [selected]) : [];
  const layersPanelEl = (
    <DesignLayersPanel
      layers={layers}
      selection={selectionMembers}
      onSelect={(obj, additive) => {
        const canvas = fabricCanvasRef.current;
        const F = (window as any).fabric;
        let next = [obj];
        if (additive) {
          const cur = selectionMembers.filter((o) => o !== obj);
          next = selectionMembers.includes(obj) ? cur : [...selectionMembers, obj];
        }
        canvas.discardActiveObject();
        if (next.length === 1) canvas.setActiveObject(next[0]);
        else if (next.length > 1) canvas.setActiveObject(new F.ActiveSelection(next, { canvas }));
        canvas.requestRenderAll();
        setSelected(canvas.getActiveObject() || null);
      }}
      onToggleVisible={toggleVisible}
      onToggleLock={toggleLock}
      onRename={renameLayer}
      onReorder={reorderLayers}
      onDuplicate={(obj) => {
        fabricCanvasRef.current.setActiveObject(obj);
        duplicateSelected();
      }}
      onDelete={(obj) => {
        if (obj.locked) return;
        fabricCanvasRef.current.discardActiveObject();
        fabricCanvasRef.current.remove(obj);
        fabricCanvasRef.current.requestRenderAll();
      }}
      onOpacityChange={(obj, opacity, commit) => {
        obj.set({ opacity });
        fabricCanvasRef.current.requestRenderAll();
        bumpSel();
        if (commit) pushHistory();
      }}
      onBlendModeChange={(obj, m) => {
        obj.set({ globalCompositeOperation: m === 'normal' ? 'source-over' : m });
        fabricCanvasRef.current.requestRenderAll();
        bumpSel();
        pushHistory();
      }}
      getThumbnail={layerThumbnail}
    />
  );

  const railItems: RailItem[] = [
    {
      id: 'templates',
      label: 'Templates',
      icon: <LayoutTemplate size={20} />,
      render: () => <TemplatesPanel onUse={applyTemplate} busyId={templateBusy} initialCategory={templateCategory} />,
    },
    {
      id: 'elements',
      label: 'Elements',
      icon: <ShapesIcon size={20} />,
      render: () => <ElementsPanel onAddShape={(k) => features.addShape(k)} onAddFrame={(k) => features.addFrame(k)} onAddSticker={(e) => addSticker(e)} />,
    },
    {
      id: 'text',
      label: 'Text',
      icon: <TypeIcon size={20} />,
      render: () => <TextPanel onAdd={(p: TextPreset) => features.addTextPreset(p)} onAddPairing={addFontPairing} onAddPageNumber={addPageNumber} onAddArticle={addArticle} />,
    },
    {
      id: 'upload',
      label: 'Upload',
      title: 'Upload photos into this design (they stay inside the design file only)',
      icon: <UploadIcon size={20} />,
      action: () => railUploadInputRef.current?.click(),
      render: () => null,
    },
    {
      id: 'draw',
      label: 'Draw',
      icon: <BrushIcon size={20} />,
      render: () => (
        <DrawPanel
          drawing={drawing}
          settings={brush}
          onChange={setBrush}
          onStart={startDrawing}
          onStop={stopDrawing}
          pro={pro}
          vectorTool={pencilOn ? 'pencil' : activeTool}
          onVectorTool={(t) => {
            if (drawingRef.current) stopDrawing();
            if (t === 'pencil') {
              setVectorPencil(!pencilOn);
              return;
            }
            if (pencilOn) setVectorPencil(false);
            setActiveTool(t);
          }}
        />
      ),
    },
    {
      id: 'background',
      label: 'Background',
      icon: <PaintBucket size={20} />,
      render: () => (
        <BackgroundPanel
          current={pageBackgroundValue()}
          brandColors={brandKit.colors}
          documentColors={docColors}
          onPickFromCanvas={pickFromCanvas}
          onSet={(bg, commit = true) => features.setPageBackground(bg, commit)}
        />
      ),
    },
    {
      id: 'brand',
      label: 'Brand',
      icon: <Palette size={20} />,
      special: true,
      render: () => (
        <BrandPanel
          kit={brandKit}
          onChange={updateBrandKit}
          saving={brandSaving}
          onApply={applyBrandToPage}
          onAddLogo={() => brandKit.logoUrl && placeImageUrl(brandKit.logoUrl)}
          onAddInfo={addBrandInfo}
          onUploadLogo={uploadBrandLogo}
          documentColors={docColors}
        />
      ),
    },
    { id: 'layers', label: 'Layers', icon: <LayersIcon size={20} />, render: () => layersPanelEl },
    { id: 'pages', label: 'Pages', icon: <Files size={20} />, title: 'Pages & print setup', render: () => artboardsPanelEl },
    { id: 'help', label: 'Help', icon: <HelpCircle size={20} />, title: 'Help & shortcuts', render: () => <HelpPanel onOpenShortcuts={() => setShowShortcuts(true)} /> },
    {
      id: 'adjust',
      label: 'Adjust',
      title: 'Adjust photo',
      hiddenInRail: true,
      icon: null,
      render: () => (
        <AdjustPanel
          img={selectedImage}
          value={features.readImageAdjust(selectedImage)}
          onChange={(a, commit) => features.adjustImage(a, commit)}
          onRemoveBackground={() => selectedImage && setBgRemoveTarget(selectedImage)}
          onCrop={() => features.startCrop()}
          onFlip={features.flip}
        />
      ),
    },
  ];

  // While the first photo of a "New Photo Project" session is still open
  // (not yet applied to a real document), Main Design's own chrome —
  // its File/Edit/Object/Type menus and the Main Design/Photo Editing
  // switcher — has nothing real to act on, so it's hidden rather than
  // shown as dead weight around a pure photo-editing session.
  const photoOnlySession = photoFirstSession && workspace === 'photo' && !!photoEditSession;
  // Narrower than photoOnlySession: also covers the gap between landing
  // on a "New Photo Project" session and the OS file picker actually
  // resolving (or being cancelled), where `workspace` still reads its
  // initial 'design' value but there's still no real Main Design
  // document to switch to yet — so the switcher alone (not the full menu
  // bar, which still offers a manual way to add an image) stays hidden
  // for that stretch too.
  const hideWorkspaceSwitcherForPhotoFirst = photoOnlySession || (photoFirstSession && !hasOpenedPhotoEditorOnceRef.current);

  return (
    <>
      {/* Next.js hoists <style> tags found anywhere in the tree into the
          document head. Loaded here (not site-wide) since the font picker
          is only reachable inside the editor. Every font — aliased
          classics and direct Google Fonts alike — is declared via
          @font-face rules sourced from this app's own same-origin font
          proxy, not a <link> straight to fonts.googleapis.com: that
          third-party request is exactly what ad/tracker blockers commonly
          block by default, which silently broke every non-aliased font
          for any visitor with one active. dangerouslySetInnerHTML (not a
          JSX text child) because this string is large enough that React's
          streaming SSR can flush it in multiple chunks, which then fails
          hydration's server/client text comparison on a plain child. */}
      <style dangerouslySetInnerHTML={{ __html: allFontFacesCSS() }} />
      {checkingAuth && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-mt-surface text-mt-faint">
          Checking access...
        </div>
      )}
      {/* Tailwind's class-strategy dark: utilities compile to a descendant
          selector (.dark .dark\:bg-x), which never matches an element that
          carries `dark` and a dark:* class itself (same gotcha already
          documented in components/home/HomePage.tsx) -- so the toggled
          `dark` class lives on this wrapper, one level above <main> and
          everything inside it that uses a dark: variant, not on <main>
          itself. Previously both lived on <main>, which silently made
          every dark: utility in the whole editor dead: confirmed via a
          real Playwright check (main's computed background stayed
          rgb(249,250,251) even with the `dark` class present and
          localStorage's shared theme genuinely set to 'dark'). */}
      <div className={isDark ? 'dark' : ''}>
      <main className="h-[100dvh] w-full overflow-hidden flex flex-col bg-mt-bg text-mt-ink transition-colors duration-150">
      {pro && (
        <MenuBar
          menus={photoOnlySession ? [] : menus}
          leading={
            <Link href="/" title="Go to homepage">
              <BrandLogo theme={theme} width={120} height={24} priority />
            </Link>
          }
        />
      )}

      {/* ------------------------------------------------ top bar */}
      <header className="h-14 shrink-0 flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 border-b border-mt-border bg-mt-surface">
        <Link
          href={cameFromTemplate ? '/templates' : '/dashboard'}
          title={cameFromTemplate ? 'Back to templates' : 'Back to dashboard'}
          aria-label={cameFromTemplate ? 'Back to templates' : 'Back to dashboard'}
          className="h-9 w-9 shrink-0 inline-flex items-center justify-center rounded-lg text-mt-muted hover:text-mt-ink hover:bg-mt-surface2"
        >
          <ChevronLeft size={20} />
        </Link>
        {!pro && !compact && (
          <Link href="/" title="Go to homepage" className="shrink-0 hidden lg:block">
            <BrandLogo theme={theme} width={118} height={24} priority />
          </Link>
        )}
        <input
          type="text"
          value={designName}
          aria-label="Design name"
          onChange={(e) => {
            const name = e.target.value;
            setDesignName(name);
            setTabs((ts) => ts.map((t) => (t.id === activeTabIdRef.current ? { ...t, name } : t)));
            markDirty();
          }}
          className="min-w-[6.5rem] w-28 sm:w-40 xl:w-52 h-9 rounded-lg border border-transparent hover:border-mt-border focus:border-[#8CCBFF] bg-transparent px-2 text-sm font-medium text-mt-ink truncate"
        />
        <span
          aria-live="polite"
          title={
            !isOnline
              ? 'You’re offline. Changes are kept and saved when you’re back online.'
              : saveStatus === 'error'
              ? 'The last save didn’t go through. Try Save again.'
              : undefined
          }
          className={cx(
            'hidden lg:inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full whitespace-nowrap shrink-0',
            !isOnline ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/40' : saveStatus === 'error' ? 'text-red-600 bg-red-50 dark:bg-red-950/40' : 'text-mt-muted'
          )}
        >
          {!isOnline ? (
            <><CloudOff size={13} /> Offline</>
          ) : saveStatus === 'saving' ? (
            <><Loader2 size={13} className="animate-spin" /> Saving…</>
          ) : saveStatus === 'error' ? (
            <><CloudOff size={13} /> Not saved</>
          ) : saveStatus === 'unsaved' ? (
            isLocalTabId(activeTabId) ? `Not saved to ${storageLabel(activeTabId)}` : designId ? <><RefreshCw size={12} /> Syncing soon</> : 'Not saved yet'
          ) : saveStatus === 'saved' ? (
            <><Check size={13} /> {isLocalTabId(activeTabId) ? `Saved to ${storageLabel(activeTabId)}` : 'Saved'}</>
          ) : null}
        </span>
        {/* Narrow screens: the same status as a small icon. */}
        {(!isOnline || saveStatus !== 'idle') && (
          <span
            className={cx('lg:hidden shrink-0 inline-flex items-center', !isOnline ? 'text-amber-600' : saveStatus === 'error' ? 'text-red-600' : 'text-mt-faint')}
            title={!isOnline ? 'Offline — changes are kept' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Not saved' : 'Not saved yet'}
            aria-hidden
          >
            {!isOnline || saveStatus === 'error' ? <CloudOff size={15} /> : saveStatus === 'saving' ? <Loader2 size={15} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={15} /> : <RefreshCw size={14} />}
          </span>
        )}
        <div className="flex-1" />
        <IconButton label="Undo" hint="Ctrl/Cmd+Z" onClick={workspace === 'photo' ? () => photoEditorRef.current?.undo() : undo} disabled={workspace === 'photo' ? !photoCanUndo : !canUndo}>
          <Undo2 size={18} />
        </IconButton>
        <IconButton label="Redo" hint="Ctrl/Cmd+Shift+Z" onClick={workspace === 'photo' ? () => photoEditorRef.current?.redo() : redo} disabled={workspace === 'photo' ? !photoCanRedo : !canRedo}>
          <Redo2 size={18} />
        </IconButton>
        {!compact && (
          <div className="hidden md:block mx-1">
            <Segmented
              size="sm"
              value={mode}
              onChange={setMode}
              options={[
                { value: 'simple', label: 'Simple', hint: 'The essentials, for quick designs' },
                { value: 'pro', label: 'Pro', hint: 'Pen, rulers, layers, precise sizes and print settings' },
              ]}
            />
          </div>
        )}
        {pro && !hideWorkspaceSwitcherForPhotoFirst && !compact && <WorkspaceSwitcher workspace={workspace} onSwitch={handleWorkspaceSwitch} />}
        {pro && !compact && (
          <select value={unit} onChange={(e) => setUnit(e.target.value as DocUnit)} aria-label="Units" title="Units" className="hidden lg:block h-9 text-xs border border-mt-border rounded-lg px-1.5 bg-mt-surface text-mt-ink">
            <option value="px">px</option>
            <option value="mm">mm</option>
            <option value="cm">cm</option>
            <option value="in">in</option>
            <option value="pt">pt</option>
          </select>
        )}
        {!compact && (
          <button type="button" onClick={() => setShowResize(true)} title="Resize your design to another size" className="hidden md:inline-flex h-9 items-center gap-1.5 px-3 rounded-lg text-sm font-medium text-mt-ink hover:bg-mt-surface2">
            <Wand2 size={15} className="text-mt-accent" /> Resize
          </button>
        )}
        {!compact && <ThemeSwitch theme={theme} onToggle={toggleTheme} size="sm" />}
        <button
          type="button"
          onClick={() => setShowExportDialog(true)}
          disabled={exporting}
          className="h-9 inline-flex items-center gap-1.5 px-3 sm:px-4 rounded-full border border-mt-border text-sm font-semibold text-mt-ink hover:bg-mt-surface2 disabled:opacity-50"
        >
          <Download size={15} /> <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'Export'}</span>
        </button>
        <div className="inline-flex rounded-full bg-mt-primary text-mt-onprimary">
          <button type="button" onClick={saveDesign} disabled={saving} title="Save (Ctrl/Cmd+S)" className="h-9 pl-4 pr-3 rounded-l-full text-sm font-semibold disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <Popover
            width={260}
            align="end"
            trigger={({ toggle, open }) => (
              <button type="button" onClick={toggle} aria-label="More ways to save" aria-expanded={open} className="h-9 pl-1.5 pr-2.5 rounded-r-full border-l border-white/20 dark:border-black/15">
                <ChevronDown size={15} />
              </button>
            )}
          >
            {(close) => (
              <div className="flex flex-col text-sm">
                {[
                  { label: 'Save as a new copy…', hint: 'Ctrl/Cmd+Shift+S', run: saveDesignAs },
                  { label: 'Save a copy to this device (.mtd)', run: saveCopyToComputer },
                  { label: 'Open a project from this device…', run: openFromComputer },
                  ...(HAS_CLOUD_DRIVES ? [{ label: 'Open from a cloud drive…', run: () => setShowCloudOpen(true) }] : []),
                  ...(!isLocalTabId(activeTabId) && designId ? [{ label: 'Version history…', run: () => setShowVersionHistory(true) }] : []),
                ].map((it: any) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={() => {
                      close();
                      it.run();
                    }}
                    className="text-left px-2.5 py-2 rounded-lg hover:bg-mt-surface2 text-mt-ink flex justify-between gap-3"
                  >
                    <span>{it.label}</span>
                    {it.hint && <span className="text-[11px] text-mt-faint">{it.hint}</span>}
                  </button>
                ))}
              </div>
            )}
          </Popover>
        </div>
        {!compact && <ProfileMenu />}
      </header>

      {(pro || tabs.length > 1) && <TabBar tabs={tabs} activeTabId={activeTabId} onSwitch={switchTab} onClose={closeTab} onAdd={() => setShowOpenDialog(true)} />}

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

      {saveChooser && (
        <SaveLocationDialog
          busy={saveChooser.busy}
          error={saveChooser.error}
          onChoose={chooseSaveLocation}
          onCancel={() => setSaveChooser(null)}
        />
      )}
      {showCloudOpen && <CloudOpenDialog onOpened={openCloudResult} onClose={() => setShowCloudOpen(false)} />}

      {templateEdit && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[75] max-w-xl w-[calc(100%-2rem)] bg-[#14121F] text-white text-sm rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-3">
          <span className="flex-1 min-w-0 truncate">
            Editing template: <strong>{templateEdit.name}</strong>
            {templateSave.msg && <span className="block text-xs text-white/70 truncate">{templateSave.msg}</span>}
          </span>
          <button
            onClick={saveToTemplate}
            disabled={templateSave.busy}
            className="shrink-0 text-xs font-semibold bg-white text-[#09090B] rounded-full px-4 py-2 disabled:opacity-60"
          >
            {templateSave.busy ? 'Saving…' : 'Save to template'}
          </button>
          <a href="/admin/templates" className="shrink-0 text-xs text-white/70 hover:text-white underline">
            Back
          </a>
        </div>
      )}

      {opening && (
        <div role="status" aria-live="polite" className="fixed inset-x-0 top-1/2 -translate-y-1/2 z-[124] flex justify-center pointer-events-none">
          <div className="inline-flex items-center gap-2.5 rounded-2xl bg-mt-surface border border-mt-border shadow-xl px-5 py-3 text-sm text-mt-ink">
            <Loader2 size={17} className="animate-spin text-mt-accent" /> {opening}
          </div>
        </div>
      )}
      {localNotice && (
        <div role="status" className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[125] max-w-md w-[calc(100%-2rem)] bg-[#09090B] text-white text-sm rounded-2xl shadow-xl px-4 py-3 flex items-start gap-3">
          <span className="flex-1">{localNotice}</span>
          <button onClick={() => setLocalNotice(null)} className="text-white/60 hover:text-white shrink-0" aria-label="Dismiss">✕</button>
        </div>
      )}

      {draftOffer && (
        <div role="alert" className="fixed top-16 left-1/2 -translate-x-1/2 z-[126] max-w-lg w-[calc(100%-2rem)] bg-mt-surface text-mt-ink border border-mt-border rounded-2xl shadow-xl px-4 py-3 flex flex-wrap items-center gap-3">
          <span className="flex-1 min-w-[12rem] text-sm">
            You have unsaved changes{draftOffer.key === UNSAVED_KEY ? ` to “${draftOffer.name}”` : ''} from {new Date(draftOffer.savedAt).toLocaleString()}.
          </span>
          <button type="button" onClick={() => { deleteDraft(draftOffer.key); setDraftOffer(null); }} className="h-9 px-3 rounded-full border border-mt-border text-sm">
            Discard
          </button>
          <button type="button" onClick={() => restoreDraft(draftOffer)} className="h-9 px-4 rounded-full bg-mt-primary text-mt-onprimary text-sm font-semibold">
            Restore
          </button>
        </div>
      )}

      {showOpenDialog && (
        <OpenDesignDialog
          currentDesignId={designId}
          openDesignIds={tabs.map((t) => t.designId).filter((id): id is string => !!id)}
          onClose={() => setShowOpenDialog(false)}
          onPick={openDesignAsTab}
        />
      )}

      {importFile && (
        <ImportDialog
          file={importFile}
          importing={importingPdf}
          onCancel={() => setImportFile(null)}
          onConfirm={confirmPdfImport}
        />
      )}
      <input ref={importInputRef} type="file" accept="image/*,.pdf,application/pdf" onChange={handleImportFileSelected} className="hidden" />
      <input ref={replaceInputRef} data-testid="replace-input" type="file" accept="image/*" onChange={onReplacePicked} className="hidden" />
      <input id="mainImageUploadInput" type="file" accept="image/*" multiple onChange={handleImageUpload} className="hidden" />

      {closeConfirm && (
        <UnsavedChangesDialog
          designName={closeConfirm.name}
          saving={saving}
          onSave={handleCloseConfirmSave}
          onDontSave={handleCloseConfirmDontSave}
          onCancel={handleCloseConfirmCancel}
        />
      )}
      {bgRemoveTarget && <BgRemoveDialog img={bgRemoveTarget} onApply={applyBackgroundRemoval} onClose={() => setBgRemoveTarget(null)} />}
      {showResize && (
        <ResizeDialog
          current={getActiveArtboardRect()}
          onClose={() => setShowResize(false)}
          onResize={(size, m) => {
            setShowResize(false);
            resizePage(size, m);
          }}
        />
      )}
      {showOnboarding && (
        <OnboardingDialog
          onPick={runQuickStart}
          onCustom={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem('mt:onboarded', '1');
            } catch {
              // ignore
            }
            setShowResize(true);
          }}
          onClose={() => {
            setShowOnboarding(false);
            try {
              localStorage.setItem('mt:onboarded', '1');
            } catch {
              // ignore
            }
          }}
        />
      )}

      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: workspace === 'design' ? 'flex' : 'none' }}>
        <input
          ref={railUploadInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          aria-hidden
          tabIndex={-1}
          onChange={(e) => {
            const files = Array.from(e.target.files || []) as File[];
            e.target.value = '';
            if (files.length) addImageFiles(files);
          }}
        />
        {!compact && <LeftRail items={railItems} active={leftPanel} onActivate={setLeftPanel} compact={false} />}
        {pro && !compact && (
          <Toolbar
            active={stripTool}
            onTool={chooseTool}
            onImageUpload={handleImageUpload}
            onShapeBuilder={() => {
              if (selected?.type === 'activeSelection') setShapeBuilderOpen(true);
              else setLocalNotice('Select two or more shapes first (drag a box around them, or Shift-click each one).');
            }}
            canShapeBuild={selected?.type === 'activeSelection'}
          />
        )}

        <div className="flex-1 min-w-0 overflow-hidden relative" style={{ background: pasteboardBgFor(theme) }}>
          {pro && (
            <Rulers
              fabricCanvasRef={fabricCanvasRef}
              unit={unit}
              originX={getActiveArtboardRect().x}
              originY={getActiveArtboardRect().y}
              artboardWidth={getActiveArtboardRect().width}
              artboardHeight={getActiveArtboardRect().height}
              ready={canvasReady}
              visible={showRulers}
              onGuideDragStart={(axis, clientX, clientY) => startGuideFromRuler(axis, clientX, clientY)}
            />
          )}
          <div
            ref={viewportRef}
            className="absolute overflow-hidden touch-none"
            style={{ top: pro && showRulers ? RULER_SIZE : 0, left: pro && showRulers ? RULER_SIZE : 0, right: 0, bottom: 0 }}
            onContextMenu={handleCanvasContextMenu}
            onDragOver={(e) => {
              if (Array.from(e.dataTransfer.types).includes('Files') || e.dataTransfer.types.includes('application/x-mt-asset')) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
              }
            }}
            onDrop={handleCanvasDrop}
          >
            <canvas ref={canvasRef} />
            <GridOverlay
              fabricCanvasRef={fabricCanvasRef}
              visible={showGrid}
              gridSize={gridSize}
              ready={canvasReady}
              originX={getActiveArtboardRect().x}
              originY={getActiveArtboardRect().y}
            />
          </div>
          {canvasReady && activeTool === 'select' && !drawing && (
            <div className={cx('absolute inset-x-2 z-20 pointer-events-none flex justify-center', compact ? 'bottom-2' : pro && showRulers ? 'top-8' : 'top-3')}>
              <ContextToolbar
                sel={selected}
                a={toolbarActions}
                brandColors={brandKit.colors}
                documentColors={docColors}
                cropping={!!features.cropping}
                cropAspect={features.cropping?.aspect ?? null}
                cropZoom={features.cropping?.zoom ?? 1}
                cropStraighten={features.cropping?.straighten ?? 0}
                onCropZoom={features.setCropZoomLevel}
                onCropStraighten={features.setCropStraightenAngle}
                onCropRatio={features.setCropRatio}
                onCropReset={features.resetCrop}
                onCropDone={features.finishCrop}
                onSmartCrop={features.smartCrop}
                pro={pro}
              />
            </div>
          )}
          {canvasReady && stripTool !== 'select' && (
            <div className={cx('absolute inset-x-2 z-20 pointer-events-none flex justify-center', compact ? 'top-2' : 'bottom-3')}>
              <ToolChip
                tool={stripTool}
                onDone={() => chooseTool('select')}
                extra={
                  drawing || pencilOn ? (
                    <span className="flex items-center gap-1.5 shrink-0">
                      {drawing && brush.kind !== 'eraser' && (
                        <select
                          value={brush.kind}
                          aria-label="Brush type"
                          onChange={(e) => {
                            const kind = e.target.value as BrushSettings['kind'];
                            setBrush({ ...brushRef.current, kind });
                          }}
                          className="h-8 rounded-lg border border-mt-input-border bg-mt-surface text-xs px-1.5 text-mt-ink"
                        >
                          <option value="brush">Brush</option>
                          <option value="marker">Marker</option>
                          <option value="highlighter">Highlighter</option>
                          <option value="pencil">Pencil brush</option>
                        </select>
                      )}
                      {brush.kind !== 'eraser' || !drawing ? (
                        <input type="color" value={brush.color} aria-label="Colour" onChange={(e) => setBrush({ ...brushRef.current, color: e.target.value })} className="h-8 w-9 rounded-lg border border-mt-border bg-transparent" />
                      ) : null}
                      <input type="range" min={1} max={120} value={brush.size} aria-label="Size" onChange={(e) => setBrush({ ...brushRef.current, size: Number(e.target.value) })} className="w-24 accent-[#3B82C4]" />
                    </span>
                  ) : null
                }
              />
            </div>
          )}
        </div>
        {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} items={contextMenuItems()} onClose={() => setContextMenu(null)} />}

        {pro && !compact && (
          <div className="w-72 shrink-0 bg-mt-surface border-l border-mt-border flex flex-col overflow-y-auto mt-scroll">
            {isPanelOpen('properties') && (
              <div className="border-b border-mt-border">{propertiesPanelEl}</div>
            )}
            {isPanelOpen('artboards') && artboardsPanelEl}
            {isPanelOpen('align') && (
              <div className="border-b border-mt-border">
                <AlignPanel
                  alignObject={alignObject}
                  distribute={distributeObjects}
                  hasSelection={hasSelection}
                  selectionCount={selected?.type === 'activeSelection' ? selected.getObjects().length : selected ? 1 : 0}
                />
              </div>
            )}
            {isPanelOpen('layers') && layersPanelEl}
          </div>
        )}
      </div>

      {photoEditSession && (
        <div className="flex flex-1 min-h-0 overflow-hidden" style={{ display: workspace === 'photo' ? 'flex' : 'none' }}>
          <PhotoStudio
            ref={photoEditorRef}
            embedded
            source={photoEditSession.sourceDataUrl}
            dpi={300}
            onApply={(dataUrl) => applyPhotoEdits({ dataUrl, adjustments: DEFAULT_ADJUSTMENTS, cropRect: null } as unknown as PhotoEditResult)}
            onCancel={closePhotoEditor}
            onHistoryChange={(u, r) => { setPhotoCanUndo(u); setPhotoCanRedo(r); }}
          />
        </div>
      )}

      {workspace === 'design' && (
        <PagesBar
          pages={artboards.map((ab) => ({ id: ab.id, name: ab.name, width: ab.width, height: ab.height, thumb: pageThumbs[ab.id] || null }))}
          activeId={activeArtboardId}
          onSelect={selectArtboard}
          onAdd={addPage}
          onDuplicate={duplicateArtboard}
          onDelete={deleteArtboard}
          onMove={(i, dir) => (dir < 0 ? moveArtboardUp(i) : moveArtboardDown(i))}
          zoom={zoom}
          onZoom={(z) => applyZoom(z)}
          onFit={fitActiveArtboard}
          onHelp={() => setLeftPanel('help')}
          compact={compact}
        />
      )}
      {workspace === 'design' && compact && <LeftRail items={railItems} active={leftPanel} onActivate={setLeftPanel} compact />}

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

      <ShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} workspace={workspace} />
      <PreferencesModal
        open={showPreferences}
        onClose={() => setShowPreferences(false)}
        returnToSelectAfterCreate={returnToSelectAfterCreate}
        onToggleReturnToSelect={updateReturnToSelectPref}
        gridSize={gridSize}
        onChangeGridSize={setGridSize}
      />
      <VersionHistoryModal
        open={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        designId={designId}
        onRestore={restoreVersion}
      />
      {shapeBuilderOpen && (
        <div className="fixed inset-0 z-[90]" onClick={() => setShapeBuilderOpen(false)}>
          <div
            role="dialog"
            aria-label="Shape builder"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-[150px] top-1/3 w-64 rounded-2xl border border-mt-border bg-mt-surface shadow-xl p-3"
          >
            <p className="text-[13px] font-semibold text-mt-ink">Combine shapes</p>
            <p className="text-[11px] text-mt-muted mb-2">The result is one shape you can still edit point by point.</p>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  ['union', 'Unite'],
                  ['subtract', 'Subtract'],
                  ['intersect', 'Intersect'],
                  ['exclude', 'Exclude'],
                ] as const
              ).map(([op, label]) => (
                <button
                  key={op}
                  type="button"
                  onClick={() => {
                    setShapeBuilderOpen(false);
                    runShapeBuilder(op);
                  }}
                  className="h-9 rounded-lg border border-mt-border text-sm text-mt-ink hover:bg-mt-surface2"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <PreflightModal open={showPreflight} issues={preflightIssues} onClose={() => setShowPreflight(false)} />
      </main>
      </div>
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
