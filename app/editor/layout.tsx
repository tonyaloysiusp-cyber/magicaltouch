import type { Metadata } from 'next';
import { EditorGate } from '@/components/monetization/Paywall';

export const metadata: Metadata = { title: { absolute: 'Magical Touch Design' }, robots: { index: false, follow: false } };

// EditorGate does nothing while charging is off (Admin → Pricing & payments).
export default function Layout({ children }: { children: React.ReactNode }) {
  return <EditorGate>{children}</EditorGate>;
}
