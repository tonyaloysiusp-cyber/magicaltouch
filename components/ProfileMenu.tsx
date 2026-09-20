'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User, Settings, LogOut, FolderOpen } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Profile, CreatorLevel, getOrCreateProfile, getDesignCount, creatorLevelForCount } from '@/lib/profile';

const LEVEL_STYLES: Record<CreatorLevel, string> = {
  'New Creator': 'bg-gray-100 text-gray-600',
  Creator: 'bg-[#EC1E79]/10 text-[#EC1E79]',
  'Pro Creator': 'bg-gradient-to-r from-[#EC1E79] to-[#8B6FC4] text-white',
};

export function LevelBadge({ level }: { level: CreatorLevel }) {
  return (
    <span className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  );
}

export function Avatar({ profile, email, size = 36 }: { profile: Profile | null; email: string; size?: number }) {
  const initial = (profile?.name || email || '?').trim().charAt(0).toUpperCase();
  if (profile?.avatar_url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={profile.avatar_url}
        alt={profile.name || email}
        style={{ width: size, height: size }}
        className="rounded-full object-cover border border-black/10"
      />
    );
  }
  return (
    <span
      style={{ width: size, height: size }}
      className="rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold shrink-0"
    >
      {initial}
    </span>
  );
}

export function ProfileMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [level, setLevel] = useState<CreatorLevel>('New Creator');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email || '');
      const [p, count] = await Promise.all([
        getOrCreateProfile(user.id, user.email?.split('@')[0]),
        getDesignCount(user.id),
      ]);
      setProfile(p);
      setLevel(creatorLevelForCount(count));
    });
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onClickOutside);
    return () => window.removeEventListener('mousedown', onClickOutside);
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (!email) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button onClick={() => setOpen((v) => !v)} className="flex items-center gap-2">
        <Avatar profile={profile} email={email} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white border rounded-xl shadow-lg py-2 z-20 text-sm">
          <div className="flex items-center gap-3 px-4 py-3 border-b">
            <Avatar profile={profile} email={email} size={44} />
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 truncate">{profile?.name || email}</p>
              <p className="text-xs text-gray-400 truncate">{email}</p>
              <div className="mt-1">
                <LevelBadge level={level} />
              </div>
            </div>
          </div>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700">
            <User size={14} /> Profile
          </Link>
          <Link href="/dashboard" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700">
            <FolderOpen size={14} /> My Designs
          </Link>
          <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-gray-700">
            <Settings size={14} /> Account Settings
          </Link>
          <button onClick={logout} className="w-full flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-500 text-left">
            <LogOut size={14} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
