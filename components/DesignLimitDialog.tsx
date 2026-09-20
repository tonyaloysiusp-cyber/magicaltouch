'use client';

import { useRouter } from 'next/navigation';
import { MAX_DESIGNS } from '@/lib/profile';

export function DesignLimitDialog({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl w-[380px] p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-semibold text-gray-800 mb-2">Design limit reached</h2>
        <p className="text-sm text-gray-500 mb-5">
          You have reached your {MAX_DESIGNS}-design limit. Please delete an existing design before creating a new
          one.
        </p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="text-sm px-4 py-2 rounded-full border hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm px-4 py-2 rounded-full bg-brand-gradient text-white font-semibold"
          >
            Manage Designs
          </button>
        </div>
      </div>
    </div>
  );
}
