'use client';

import { useEffect, useState } from 'react';
import { History, X, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DesignVersionRow {
  id: string;
  canvas_json: any;
  width: number;
  height: number;
  thumbnail: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  designId: string | null;
  onRestore: (canvasJson: any, width: number, height: number) => void;
}

// Lists real saved snapshots from the design_versions table (written by
// performSave on every successful save, manual or autosave — see
// supabase/migrations/0002_design_versions.sql) and restores one back
// into the live document. If that table doesn't exist yet on this
// project's database, this honestly shows an empty/error state rather
// than fabricating history entries.
export function VersionHistoryModal({ open, onClose, designId, onRestore }: Props) {
  const [versions, setVersions] = useState<DesignVersionRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    if (!designId) {
      setVersions([]);
      setError('Save this design at least once before it has any version history.');
      return;
    }
    setVersions(null);
    setError(null);
    supabase
      .from('design_versions')
      .select('id, canvas_json, width, height, thumbnail, created_at')
      .eq('design_id', designId)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data, error: err }) => {
        if (err) {
          setError('Version history is unavailable (the design_versions table may not be set up on this project yet).');
          setVersions([]);
          return;
        }
        setVersions(data || []);
      });
  }, [open, designId]);

  if (!open) return null;

  const formatWhen = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  };

  const restore = (v: DesignVersionRow) => {
    if (!window.confirm(`Restore the version from ${formatWhen(v.created_at)}? Your current canvas will be replaced (this can be undone with Ctrl/Cmd+Z).`)) return;
    onRestore(v.canvas_json, v.width, v.height);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <History size={16} className="text-gray-500" />
            <p className="font-semibold text-sm text-gray-800">Version History</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>
        <div className="p-4">
          {versions === null && <p className="text-xs text-gray-400">Loading…</p>}
          {versions !== null && error && <p className="text-xs text-gray-400">{error}</p>}
          {versions !== null && !error && versions.length === 0 && (
            <p className="text-xs text-gray-400">No saved versions yet — they're recorded automatically every time this design is saved.</p>
          )}
          {versions !== null && versions.length > 0 && (
            <div className="flex flex-col gap-2">
              {versions.map((v, i) => (
                <div key={v.id} className="flex items-center gap-3 border rounded-lg p-2">
                  <div className="w-16 h-12 bg-gray-100 rounded overflow-hidden shrink-0 flex items-center justify-center">
                    {v.thumbnail ? (
                      <img src={v.thumbnail} alt="" className="w-full h-full object-contain" />
                    ) : (
                      <span className="text-[10px] text-gray-300">No preview</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-700 truncate">{formatWhen(v.created_at)}</p>
                    <p className="text-[11px] text-gray-400">{i === 0 ? 'Most recent' : `${v.width}×${v.height}px`}</p>
                  </div>
                  <button
                    onClick={() => restore(v)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 border rounded hover:bg-gray-50 shrink-0"
                    title="Restore this version"
                  >
                    <RotateCcw size={12} /> Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
