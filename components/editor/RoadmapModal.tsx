'use client';

import { X, Clock } from 'lucide-react';
import { TOOL_REGISTRY } from '@/lib/editor/tool-registry';
import { TOOL_GROUP_LABELS, ToolGroupId } from '@/lib/editor/types';

interface Props {
  open: boolean;
  highlightId?: string;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-gray-100 text-gray-500 border-gray-200',
  beta: 'bg-amber-50 text-amber-700 border-amber-200',
  live: 'bg-green-50 text-green-700 border-green-200',
};

export function RoadmapModal({ open, highlightId, onClose }: Props) {
  if (!open) return null;

  const groups = Array.from(new Set(TOOL_REGISTRY.map((t) => t.group))) as ToolGroupId[];

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            <p className="font-semibold text-sm text-gray-800">Feature status</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          <p className="text-xs text-gray-500">
            Every tool in Magical Touch is marked honestly. <b>Live</b> tools are fully working.{' '}
            <b>Beta</b> tools work but have a known limitation. <b>Planned</b> tools are visible on
            the roadmap but not implemented yet — clicking them does nothing destructive, it just
            brought you here.
          </p>

          {groups.map((group) => {
            const items = TOOL_REGISTRY.filter((t) => t.group === group);
            return (
              <div key={group}>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">{TOOL_GROUP_LABELS[group]}</p>
                <div className="flex flex-wrap gap-1.5">
                  {items.map((t) => (
                    <span
                      key={t.id}
                      className={`text-[11px] border rounded-full px-2 py-0.5 ${STATUS_STYLES[t.status]} ${
                        t.id === highlightId ? 'ring-2 ring-blue-400' : ''
                      }`}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
