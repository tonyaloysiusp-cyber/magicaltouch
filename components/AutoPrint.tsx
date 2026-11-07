'use client';
// ?print=1 opens the print dialog (Save as PDF) with the site menu hidden.
import { useEffect } from 'react';
export function AutoPrint() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('print') === '1') setTimeout(() => window.print(), 700);
  }, []);
  return <style dangerouslySetInnerHTML={{ __html: '@media print{header,footer,nav,aside,.mt-no-print{display:none!important}body{background:#fff!important}}' }} />;
}
