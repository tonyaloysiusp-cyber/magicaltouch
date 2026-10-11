import type { Metadata } from 'next';
import { VerifyView } from '../VerifyView';

// Result pages are per-certificate: never indexed by search engines.
export const metadata: Metadata = {
  title: 'Certificate check — Magical Touch Design',
  robots: { index: false, follow: false },
};

export default function VerifyCodePage({ params }: { params: { code: string } }) {
  return <VerifyView initialCode={decodeURIComponent(params.code || '')} />;
}
