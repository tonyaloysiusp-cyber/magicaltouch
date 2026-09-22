'use client';

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { Editor } from '../core/Editor';
import { createDocument } from '../core/Document';
import { renderDocument } from '../raster/RasterCanvas';
import { ensureToolsRegistered } from '../tools/index';
import { saveDocument, listDocuments, DocumentSummary } from '../core/ProjectStore';
import { Toolbar } from './Toolbar';
import { OptionsBar } from './OptionsBar';
import { StatusBar } from './StatusBar';
import { LayersPanel } from '../panels/LayersPanel';
import { HistoryPanel } from '../panels/HistoryPanel';

ensureToolsRegistered();

interface Props {
  documentId?: string;
}

// The one React entry point for the new engine — creates or loads an
// Editor, subscribes to it, wires DOM events to it, and lays out the
// panels around its canvas. Everything under src/editor/{core,tools,
// raster}/ has no React dependency; this is the only file that does.
export function EditorShell({ documentId }: Props) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savedDocs, setSavedDocs] = useState<DocumentSummary[]>([]);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (documentId) {
        const loaded = await Editor.loadFromStore(documentId).catch((err) => {
          setLoadError(String(err.message || err));
          return null;
        });
        if (!cancelled) setEditor(loaded || new Editor(createDocument({ width: 1200, height: 800 })));
      } else {
        if (!cancelled) setEditor(new Editor(createDocument({ width: 1200, height: 800 })));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [documentId]);

  useEffect(() => {
    listDocuments().then(setSavedDocs).catch(() => {});
  }, []);

  const snapshot = useSyncExternalStore(
    useMemo(() => (listener: () => void) => (editor ? editor.subscribe(listener) : () => {}), [editor]),
    () => editor?.getSnapshot() ?? null,
    () => null
  );

  // Imperative Canvas2D draw — never React-rendered content. Runs on
  // every snapshot change (layer edits, undo/redo, selection) and is
  // also wired as Editor's renderCallback for the hot path (drag-panning/
  // zooming), so those feel immediate rather than waiting on a React
  // effect flush.
  useEffect(() => {
    if (!editor || !canvasRef.current || !snapshot) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    renderDocument(ctx, snapshot.document, snapshot.viewport, canvas.width, canvas.height, () => editor.requestRender());
  }, [editor, snapshot]);

  useEffect(() => {
    if (!editor || !canvasRef.current) return;
    const canvas = canvasRef.current;
    editor.eventManager.attach(canvas);
    editor.setRenderCallback(() => {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      const s = editor.getSnapshot();
      renderDocument(ctx, s.document, s.viewport, canvas.width, canvas.height, () => editor.requestRender());
    });
    return () => {
      editor.eventManager.detach();
      editor.setRenderCallback(null);
    };
  }, [editor]);

  // Sizes the backing canvas to its container in real device pixels
  // (crisp at high DPI) and re-fits the view on first load.
  useEffect(() => {
    if (!editor || !canvasRef.current || !containerRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    let didFit = false;
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(rect.width * dpr));
      canvas.height = Math.max(1, Math.round(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!didFit && rect.width > 0 && rect.height > 0) {
        didFit = true;
        editor.fitToView(rect.width, rect.height);
      }
      editor.requestRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();
    return () => ro.disconnect();
  }, [editor]);

  if (!editor || !snapshot) {
    return <div className="h-screen flex items-center justify-center text-sm text-gray-400">Loading…</div>;
  }

  const doSave = async () => {
    setSaveStatus('saving');
    try {
      await editor.save();
      setSaveStatus('saved');
      setSavedDocs(await listDocuments());
    } catch {
      setSaveStatus('error');
    }
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 text-sm">
      <div className="h-10 border-b bg-white flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-gray-800">{snapshot.document.document.name}</span>
          <button
            onClick={() => {
              const name = window.prompt('Document name', snapshot.document.document.name);
              if (name && name.trim()) snapshot.document.document.name = name.trim();
            }}
            className="text-xs text-gray-400 hover:text-gray-700"
          >
            Rename
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => editor.undo()} disabled={!snapshot.canUndo} className="px-2 py-1 border rounded text-xs disabled:opacity-30">
            Undo
          </button>
          <button onClick={() => editor.redo()} disabled={!snapshot.canRedo} className="px-2 py-1 border rounded text-xs disabled:opacity-30">
            Redo
          </button>
          <button onClick={doSave} className="px-3 py-1 rounded bg-gray-900 text-white text-xs">
            {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'error' ? 'Save failed' : 'Save'}
          </button>
          {savedDocs.length > 0 && (
            <select
              className="text-xs border rounded px-1 py-1"
              value=""
              onChange={(e) => {
                if (e.target.value) window.location.href = `/studio?documentId=${e.target.value}`;
              }}
            >
              <option value="">Open…</option>
              {savedDocs.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
          <button onClick={() => (window.location.href = '/studio')} className="px-2 py-1 border rounded text-xs">
            New
          </button>
        </div>
      </div>

      <OptionsBar editor={editor} snapshot={snapshot} />

      <div className="flex-1 flex overflow-hidden">
        <Toolbar editor={editor} snapshot={snapshot} />
        <div ref={containerRef} className="flex-1 relative overflow-hidden">
          <canvas ref={canvasRef} className="absolute inset-0" />
        </div>
        <div className="w-64 border-l bg-white flex flex-col overflow-y-auto shrink-0">
          <LayersPanel editor={editor} snapshot={snapshot} />
          <HistoryPanel editor={editor} />
        </div>
      </div>

      <StatusBar snapshot={snapshot} />
      {loadError && <div className="absolute bottom-12 left-4 bg-red-50 border border-red-200 text-red-700 text-xs px-3 py-2 rounded">{loadError}</div>}
    </div>
  );
}
