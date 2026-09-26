'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Sun, Moon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import {
  Profile,
  CreatorLevel,
  getOrCreateProfile,
  getDesignCount,
  creatorLevelForCount,
  updateProfile,
  uploadAvatar,
} from '@/lib/profile';
import { Avatar, LevelBadge } from '@/components/ProfileMenu';
import { BrandLogo } from '@/components/BrandLogo';
import { useAppTheme } from '@/hooks/useAppTheme';

interface RecentDesign {
  id: string;
  name: string;
  width: number;
  height: number;
  updated_at: string;
  thumbnail: string | null;
}

export default function ProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [designCount, setDesignCount] = useState(0);
  const [recent, setRecent] = useState<RecentDesign[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) {
        router.push('/login?next=/profile');
        return;
      }
      setUserId(user.id);
      setEmail(user.email || '');
      const [p, count, designs] = await Promise.all([
        getOrCreateProfile(user.id, user.email?.split('@')[0]),
        getDesignCount(user.id),
        supabase
          .from('designs')
          .select('id, name, width, height, updated_at, thumbnail')
          .order('updated_at', { ascending: false })
          .limit(6),
      ]);
      setProfile(p);
      setName(p?.name || '');
      setPhone(p?.phone || '');
      setDesignCount(count);
      setRecent(designs.data || []);
      setCheckingAuth(false);
    });
  }, [router]);

  const level: CreatorLevel = creatorLevelForCount(designCount);

  const handleSave = async () => {
    setSaving(true);
    const ok = await updateProfile(userId, { name: name.trim() || null, phone: phone.trim() || null });
    setSaving(false);
    if (ok) setProfile((p) => (p ? { ...p, name: name.trim() || null, phone: phone.trim() || null } : p));
    else alert('Failed to save profile changes.');
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadAvatar(userId, file);
    setUploadingAvatar(false);
    if (url) setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    else alert('Failed to upload profile picture.');
    e.target.value = '';
  };

  if (checkingAuth) {
    return (
      <main className="min-h-screen flex items-center justify-center text-gray-400 dark:bg-[#111015] dark:text-[#B7B2C6]">
        Loading...
      </main>
    );
  }

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
    <main className="min-h-screen p-6 max-w-3xl mx-auto bg-white dark:bg-[#111015] transition-colors duration-300">
      <div className="flex items-center justify-between mb-8">
        <Link href="/dashboard" className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-[#B7B2C6] hover:text-gray-800 dark:hover:text-white">
          <ArrowLeft size={15} /> Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="p-2 rounded-full border border-black/10 dark:border-white/15 text-gray-500 dark:text-[#B7B2C6] hover:border-black/25 dark:hover:border-white/30 transition-colors"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <BrandLogo theme={theme} width={150} height={30} />
        </div>
      </div>

      <h1 className="text-2xl font-bold text-gray-800 dark:text-[#F3F1F7] mb-6">Profile</h1>

      <div className="flex items-center gap-5 mb-8">
        <div className="relative">
          <Avatar profile={profile} email={email} size={72} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 text-[10px] font-semibold bg-white dark:bg-[#1B1926] dark:text-[#F3F1F7] border dark:border-white/15 rounded-full px-2 py-0.5 shadow hover:bg-gray-50 dark:hover:bg-[#242131] disabled:opacity-50"
          >
            {uploadingAvatar ? '...' : 'Edit'}
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        </div>
        <div>
          <p className="font-semibold text-gray-800 dark:text-[#F3F1F7] text-lg">{profile?.name || 'Unnamed Creator'}</p>
          <p className="text-sm text-gray-400 dark:text-[#B7B2C6]">{email}</p>
          <div className="mt-2 flex items-center gap-2">
            <LevelBadge level={level} />
            <span className="text-xs text-gray-400 dark:text-[#B7B2C6]">{designCount} design{designCount === 1 ? '' : 's'}</span>
          </div>
        </div>
      </div>

      <div className="border dark:border-white/10 rounded-xl p-5 mb-8 bg-white dark:bg-[#1B1926]">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-[#F3F1F7] mb-4">Account details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500 dark:text-[#B7B2C6] block mb-1">Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded-lg px-3 py-2 text-sm"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-[#B7B2C6] block mb-1">Phone number (optional)</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border dark:border-white/15 dark:bg-[#242131] dark:text-[#F3F1F7] rounded-lg px-3 py-2 text-sm"
              placeholder="+1 555 123 4567"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 dark:text-[#B7B2C6] block mb-1">Email</label>
            <input value={email} disabled className="w-full border dark:border-white/15 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-[#151320] text-gray-400 dark:text-[#B7B2C6]" />
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 bg-brand-gradient text-white px-5 py-2 rounded-full text-sm font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-[#F3F1F7]">Recent work</h2>
          <Link href="/dashboard" className="text-xs text-[#6C4FD1] dark:text-[#B79CFF] font-medium hover:underline">
            View all
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-[#B7B2C6]">No designs yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recent.map((d) => (
              <Link
                key={d.id}
                href={`/editor?designId=${d.id}&w=${d.width}&h=${d.height}`}
                className="border dark:border-white/10 rounded-lg overflow-hidden hover:shadow-md transition bg-white dark:bg-[#1B1926]"
              >
                <div className="aspect-square bg-gray-100 dark:bg-[#242131] flex items-center justify-center text-gray-300 dark:text-[#B7B2C6] text-[10px]">
                  {d.thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.thumbnail} alt={d.name} className="w-full h-full object-contain" />
                  ) : (
                    <span>{d.width}×{d.height}</span>
                  )}
                </div>
                <p className="text-xs font-medium text-gray-700 dark:text-[#F3F1F7] px-2 py-1.5 truncate">{d.name}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
    </div>
  );
}
