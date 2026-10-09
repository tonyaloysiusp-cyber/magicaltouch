'use client';

import { Smartphone, LayoutGrid, PartyPopper, Megaphone, Heart, CreditCard, FileText, Award, UtensilsCrossed, Presentation, Printer, BookOpen } from 'lucide-react';
import type { GoalId } from '@/lib/create/catalog';

// One brand colour per kind of design, so the choices are easy to scan.
const LOOK: Record<GoalId, { icon: React.ReactNode; bg: string; fg: string }> = {
  social: { icon: <LayoutGrid size={18} />, bg: 'rgba(242,112,143,0.14)', fg: '#D9466C' },
  story: { icon: <Smartphone size={18} />, bg: 'rgba(166,155,211,0.18)', fg: '#7565C2' },
  invitation: { icon: <PartyPopper size={18} />, bg: 'rgba(53,194,241,0.14)', fg: '#1592C2' },
  flyer: { icon: <Megaphone size={18} />, bg: 'rgba(93,204,184,0.16)', fg: '#239A84' },
  card: { icon: <Heart size={18} />, bg: 'rgba(242,112,143,0.14)', fg: '#D9466C' },
  businesscard: { icon: <CreditCard size={18} />, bg: 'rgba(140,200,75,0.16)', fg: '#5B9424' },
  resume: { icon: <FileText size={18} />, bg: 'rgba(53,194,241,0.14)', fg: '#1592C2' },
  certificate: { icon: <Award size={18} />, bg: 'rgba(221,226,59,0.22)', fg: '#8C8F12' },
  menu: { icon: <UtensilsCrossed size={18} />, bg: 'rgba(93,204,184,0.16)', fg: '#239A84' },
  presentation: { icon: <Presentation size={18} />, bg: 'rgba(166,155,211,0.18)', fg: '#7565C2' },
  print: { icon: <Printer size={18} />, bg: 'rgba(140,200,75,0.16)', fg: '#5B9424' },
  publishing: { icon: <BookOpen size={18} />, bg: 'rgba(221,226,59,0.22)', fg: '#8C8F12' },
};

export function GoalIcon({ id, size = 40 }: { id: GoalId; size?: number }) {
  const l = LOOK[id];
  return (
    <span className="inline-flex items-center justify-center rounded-xl" style={{ width: size, height: size, background: l.bg, color: l.fg }}>
      {l.icon}
    </span>
  );
}
