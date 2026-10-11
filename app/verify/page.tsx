import type { Metadata } from 'next';
import { VerifyView } from './VerifyView';

export const metadata: Metadata = {
  title: 'Verify a certificate — Magical Touch Design',
  description: 'Check that a certificate issued by Magical Touch Design is genuine.',
};

export default function VerifyPage() {
  return <VerifyView />;
}
