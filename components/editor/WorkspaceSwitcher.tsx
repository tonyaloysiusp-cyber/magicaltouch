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
    <div className="flex items-center bg-mt-surface2 dark:bg-mt-bg rounded-full p-0.5 text-xs font-medium">
      <button
        onClick={() => onSwitch('design')}
        className={`px-3 py-1 rounded-full ${workspace === 'design' ? 'bg-mt-surface dark:bg-mt-surface2 shadow text-mt-ink dark:text-mt-ink' : 'text-mt-muted dark:text-mt-muted'}`}
      >
        Main Design
      </button>
      <button
        onClick={() => onSwitch('photo')}
        className={`px-3 py-1 rounded-full ${workspace === 'photo' ? 'bg-mt-surface dark:bg-mt-surface2 shadow text-mt-ink dark:text-mt-ink' : 'text-mt-muted dark:text-mt-muted'}`}
      >
        Photo Editing
      </button>
    </div>
  );
}
