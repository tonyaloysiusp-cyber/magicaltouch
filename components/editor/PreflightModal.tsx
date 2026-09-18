'use client';

import { X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { PreflightIssue } from '@/lib/editor/preflight';

interface Props {
  open: boolean;
  issues: PreflightIssue[];
  onClose: () => void;
}

export function PreflightModal({ open, issues, onClose }: Props) {
  if (!open) return null;
  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const overall = hasError ? 'error' : hasWarning ? 'warning' : 'pass';

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-[480px] max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-sm">Preflight</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 border-b flex items-center gap-2">
          {overall === 'pass' && <CheckCircle2 className="text-green-600" size={18} />}
          {overall === 'warning' && <AlertTriangle className="text-amber-500" size={18} />}
          {overall === 'error' && <AlertCircle className="text-red-600" size={18} />}
          <span className="text-sm font-medium">
            {overall === 'pass' ? 'PRINT READY' : overall === 'warning' ? `${issues.length} WARNING${issues.length === 1 ? '' : 'S'}` : 'ERRORS FOUND'}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {issues.length === 0 && <p className="text-sm text-gray-500">No issues found on any artboard.</p>}
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              {issue.severity === 'warning' && <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={13} />}
              {issue.severity === 'error' && <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={13} />}
              <div>
                <span className="font-medium text-gray-600">{issue.artboardName}:</span>{' '}
                <span className="text-gray-600">{issue.message}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
