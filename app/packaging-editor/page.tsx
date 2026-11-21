import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { SITE_URL } from '@/lib/seo';
import { PackagingEditor } from '@/components/packaging/editor/PackagingEditor';

// Packaging now has one home: the Packaging Design Studio (templates) and the
// design editor's Packaging panel. This route only opens .mtd projects saved
// from the earlier standalone editor; everything else goes to the studio.
export const metadata: Metadata = { title: 'Packaging Editor', alternates: { canonical: `${SITE_URL}/packaging-dieline` }, robots: { index: false } };

export default function PackagingEditorPage({ searchParams }: { searchParams: { localDoc?: string } }) {
  if (!searchParams?.localDoc) redirect('/packaging-dieline');
  return <PackagingEditor />;
}
