import type { Metadata } from 'next';
import { VerifyView } from '../VerifyView';
import { fitTitle } from '@/lib/seo';

// Result pages are per-certificate: never indexed by search engines.
export const metadata: Metadata = {
  title: fitTitle('Certificate check'),
  robots: { index: false, follow: false },
};

export default function VerifyCodePage({ params }: { params: { code: string } }) {
  return <VerifyView initialCode={decodeURIComponent(params.code || '')} />;
}
