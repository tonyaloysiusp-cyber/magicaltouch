'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';

interface Props {
  href: string;
  label: string;
}

export function BackBar({ href, label }: Props) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 text-sm text-mt-muted dark:text-mt-muted hover:text-mt-ink dark:hover:text-white transition-colors px-4 py-2"
    >
      <ChevronLeft size={16} />
      {label}
    </Link>
  );
}
