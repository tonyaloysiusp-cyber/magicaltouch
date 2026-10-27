/** @type {import('next').NextConfig} */
const SUPABASE = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');

const nextConfig = {
  // Fallback route to Supabase through our own domain, used by the browser
  // only when a direct request to *.supabase.co fails (lib/supabase.ts).
  async rewrites() {
    return SUPABASE ? [{ source: '/sb/:path*', destination: `${SUPABASE}/:path*` }] : [];
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
