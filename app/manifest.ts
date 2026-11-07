import type { MetadataRoute } from 'next';

// Installable app. When the site is installed (Chrome / Edge on Windows,
// Mac or ChromeOS: the install button in the address bar), .mtd project
// files show the Magical Touch file icon and open here with a double-click.
export default function manifest(): MetadataRoute.Manifest {
  // Plain object: Next's type for file_handlers differs from the web standard
  // (accept is an object of MIME type → extensions), so it is cast below.
  const m = {
    name: 'Magical Touch Design',
    short_name: 'Magical Touch',
    description: 'Free online design studio: templates, editor, photo studio and background remover.',
    id: '/',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      { src: '/brand/app-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/brand/app-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    file_handlers: [
      {
        action: '/open',
        accept: { 'application/x-magical-touch-design': ['.mtd'] },
        icons: [
          { src: '/brand/file-icon/mtd-256.png', sizes: '256x256', type: 'image/png' },
          { src: '/brand/file-icon/mtd-512.png', sizes: '512x512', type: 'image/png' },
        ],
        launch_type: 'single-client',
      },
    ],
  };
  return m as unknown as MetadataRoute.Manifest;
}
