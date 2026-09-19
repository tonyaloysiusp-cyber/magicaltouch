'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

interface Design {
  id: string;
  name: string;
  width: number;
  height: number;
  updated_at: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDesigns = async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login?next=/dashboard');
        return;
      }

      const { data, error } = await supabase
        .from('designs')
        .select('id, name, width, height, updated_at')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Failed to fetch designs:', error);
      } else {
        setDesigns(data || []);
      }
      setLoading(false);
    };

    fetchDesigns();
  }, [router]);

  const deleteDesign = async (id: string) => {
    const confirmed = window.confirm('Delete this design? This cannot be undone.');
    if (!confirmed) return;

    const { error } = await supabase.from('designs').delete().eq('id', id);

    if (error) {
      console.error('Failed to delete design:', error);
      alert('Failed to delete design.');
      return;
    }

    setDesigns((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <main className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-10">
        <Image src="/logo.png" alt="Magical Touch" width={180} height={36} />
        <div className="flex items-center gap-3">
          <Link
            href="/templates"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 px-4 py-2"
          >
            Browse Templates
          </Link>
          <Link
            href="/create"
            className="bg-brand-gradient text-white px-5 py-2 rounded-full text-sm font-semibold"
          >
            + New Design
          </Link>
        </div>
      </div>

      <h1 className="text-3xl font-bold text-gray-800">Welcome to your Dashboard</h1>
      <p className="mt-2 text-gray-500 mb-8">Your saved designs live here.</p>

      {loading && <p className="text-gray-400">Loading your designs...</p>}

      {!loading && designs.length === 0 && (
        <div className="border border-dashed rounded-xl p-10 text-center text-gray-400">
          <p>You haven't created any designs yet.</p>
          <Link href="/create" className="text-blue-500 underline mt-2 inline-block">
            Start your first design
          </Link>
        </div>
      )}

      {!loading && designs.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {designs.map((design) => (
            <div
              key={design.id}
              className="border rounded-xl p-4 hover:shadow-md transition cursor-pointer bg-white"
            >
              <Link href={`/editor?designId=${design.id}&w=${design.width}&h=${design.height}`}>
                <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center text-gray-300 text-xs">
                  {design.width} × {design.height}
                </div>
                <p className="text-sm font-medium text-gray-800 truncate">{design.name}</p>
                <p className="text-xs text-gray-400">
                  {new Date(design.updated_at).toLocaleDateString()}
                </p>
              </Link>
              <button
                onClick={() => deleteDesign(design.id)}
                className="text-xs text-red-400 mt-2 hover:underline"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
