'use client';

export type EditorWorkspace = 'design' | 'photo';

interface WorkspaceSwitcherProps {
  workspace: EditorWorkspace;
  onSwitch: (workspace: EditorWorkspace) => void;
}

// Shown only while a Photo Editor session is open (see photoEditSession
// in app/editor/page.tsx) — lets the user hop back to the main design
// to check something and return to photo editing without losing their
// in-progress crop/adjustments, and without leaving the page.
export function WorkspaceSwitcher({ workspace, onSwitch }: WorkspaceSwitcherProps) {
  return (
    <div className="flex items-center bg-gray-100 dark:bg-[#1E1E1E] rounded-full p-0.5 text-xs font-medium">
      <button
        onClick={() => onSwitch('design')}
        className={`px-3 py-1 rounded-full ${workspace === 'design' ? 'bg-white dark:bg-[#333333] shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
      >
        Main Design
      </button>
      <button
        onClick={() => onSwitch('photo')}
        className={`px-3 py-1 rounded-full ${workspace === 'photo' ? 'bg-white dark:bg-[#333333] shadow text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
      >
        Photo Editing
      </button>
    </div>
  );
}
