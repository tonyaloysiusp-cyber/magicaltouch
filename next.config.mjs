/** @type {import('next').NextConfig} */
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

const nextConfig = {
  // Fallback route to Supabase through our own domain, used by the browser
  // only when a direct request to *.supabase.co fails (lib/supabase.ts).
  async rewrites() {
    return SUPABASE ? [{ source: '/sb/:path*', destination: `${SUPABASE}/:path*` }] : [];
  },
  // Landing pages deleted for showing no templates (Oct 2026): send any old
  // links and Google results to the closest working page instead of a 404.
  async redirects() {
    const gone = {
      'free-online-design-tool': '/free-design-templates',
      'free-canva-alternative': '/free-design-templates',
      'free-photo-editor-online': '/photo-studio',
      'remove-background-free': '/photo-studio',
      'free-image-resizer': '/free-design-templates',
      'free-photoshop-alternative': '/free-design-templates',
      'free-illustrator-alternative': '/free-design-templates',
      'free-graphic-design-templates': '/free-design-templates',
    };
    return Object.entries(gone).map(([from, to]) => ({ source: `/${from}`, destination: to, permanent: true }));
  },
  async headers() {
    return [
      // Template thumbnails, photos and fonts never change at the same address: cache them.
      { source: '/templates/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }] },
    ];
  },
};
export default nextConfig;
