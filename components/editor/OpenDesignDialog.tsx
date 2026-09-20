'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface OpenableDesign {
  id: string;
  name: string;
  width: number;
  height: number;
  updated_at: string;
  thumbnail: string | null;
}

interface OpenDesignDialogProps {
  currentDesignId: string | null;
  openDesignIds: string[];
  onClose: () => void;
  onPick: (design: OpenableDesign) => void;
}

// File > Open... — lets the user pull one of their other saved designs
// into a new tab without leaving the editor (a real navigation to
// /dashboard would tear down every other tab currently open). Picking a
// design that's already open in another tab just switches to that tab
// instead of opening a duplicate.
export function OpenDesignDialog({ currentDesignId, openDesignIds, onClose, onPick }: OpenDesignDialogProps) {
  const [designs, setDesigns] = useState<OpenableDesign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('designs')
      .select('id, name, width, height, updated_at, thumbnail')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          supabase
            .from('designs')
            .select('id, name, width, height, updated_at')
            .order('updated_at', { ascending: false })
            .then(({ data: fallback }) => {
              setDesigns((fallback || []).map((d) => ({ ...d, thumbnail: null })));
              setLoading(false);
            });
          return;
        }
        setDesigns(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-[560px] max-h-[70vh] flex flex-col p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">Open a design</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-sm">
            Close
          </button>
        </div>

        {loading && <p className="text-sm text-gray-400">Loading your designs...</p>}

        {!loading && designs.length === 0 && (
          <p className="text-sm text-gray-400">You don't have any saved designs yet.</p>
        )}

        {!loading && designs.length > 0 && (
          <div className="grid grid-cols-3 gap-3 overflow-y-auto">
            {designs.map((d) => (
              <button
                key={d.id}
                onClick={() => onPick(d)}
                disabled={d.id === currentDesignId}
                className="text-left border rounded-lg overflow-hidden hover:shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center text-gray-300 text-[10px]">
                  {d.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.thumbnail} alt={d.name} className="w-full h-full object-contain" />
                  ) : (
                    <span>{d.width}×{d.height}</span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 px-2 py-1.5 truncate">
                  {d.name}
                  {openDesignIds.includes(d.id) ? ' (open)' : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
