import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Free AI Template Generator — Recreate Any Design, Edit Online',
  description: 'Paste any design you like and free AI (Claude, ChatGPT, Gemini, Copilot) rebuilds it as an editable template in about a minute. Change every word, colour and photo. Free.',
  alternates: { canonical: '/ai-studio' },
  // Admins only (Nov 2026): not for search engines.
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
