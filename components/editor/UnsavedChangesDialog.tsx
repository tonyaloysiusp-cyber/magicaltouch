'use client';

interface UnsavedChangesDialogProps {
  designName: string;
  saving: boolean;
  onSave: () => void;
  onDontSave: () => void;
  onCancel: () => void;
}

// Shown when closing a design tab that has unsaved changes — the user
// decides what happens to them, rather than the tab just closing (or
// staying open) silently.
export function UnsavedChangesDialog({ designName, saving, onSave, onDontSave, onCancel }: UnsavedChangesDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-[400px] p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-2">Save changes before closing?</h2>
        <p className="text-sm text-gray-500 mb-5">
          "{designName}" has unsaved changes. If you don't save, those changes will be lost.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} disabled={saving} className="text-sm px-4 py-2 rounded-full border hover:bg-gray-50 disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onDontSave} disabled={saving} className="text-sm px-4 py-2 rounded-full border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50">
            Don't Save
          </button>
          <button onClick={onSave} disabled={saving} className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
