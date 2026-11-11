import type { Metadata } from 'next';
import { VerifyView } from './VerifyView';
import { fitTitle, fitDescription } from '@/lib/seo';

export const metadata: Metadata = {
  title: fitTitle('Verify a certificate'),
  alternates: { canonical: '/verify' },
  description: fitDescription('Check that a certificate issued by Magical Touch Design is genuine.'),
};

export default function VerifyPage() {
  return <VerifyView />;
}
