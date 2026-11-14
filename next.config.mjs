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
      'remove-background-free': '/remove-background',
      'free-image-resizer': '/free-design-templates',
      'free-photoshop-alternative': '/free-design-templates',
      'free-illustrator-alternative': '/free-design-templates',
      'free-graphic-design-templates': '/free-design-templates',
      // Common guesses for pages that live elsewhere.
      features: '/#features',
      pricing: '/about',
      'pattern-studio': '/patterns',
      // Tools combined (14 Nov 2026): the old addresses open the combined workspace.
      'custom-jersey-designer': '/textile-designer?garment=jersey',
      'polo-shirt-designer': '/textile-designer?garment=polo',
      'custom-t-shirt-designer': '/textile-designer?garment=tshirt',
      'wall-designer': '/wallpaper-designer',
      'rangoli-mandala-maker': '/patterns?mode=rangoli',
      'gradient-background-generator': '/colours#gradients',
    };
    // Template categories were reorganised by design type (12 Nov 2026):
    // old category pages go to the matching new one.
    const C = '/templates/category/';
    const oldCats = {
      'social-media': 'social-media-posts', marketing: 'posters', business: 'flyers', cards: 'greeting-cards',
      'photo-collage': 'photo-collages-and-frames', resume: 'resumes-and-cvs',
      festivals: 'social-media-posts/festivals', 'love-and-family': 'social-media-posts/love-and-family',
      wedding: 'invitations/wedding-and-engagement', events: 'posters/events-and-parties',
    };
    const oldSubs = {
      'social-media': { instagram: 'social-media-posts', facebook: 'social-media-posts', youtube: 'youtube-thumbnails' },
      marketing: { poster: 'posters', banner: 'banners-and-covers', advertisement: 'social-media-posts', magazine: 'magazines-and-booklets' },
      business: { flyer: 'flyers', presentation: 'presentations', 'business-card': 'business-cards', letterhead: 'letterheads-and-stationery', brochure: 'brochures', portfolio: 'presentations' },
      wedding: { invitation: 'invitations/wedding-and-engagement', 'save-the-date': 'invitations/wedding-and-engagement', reception: 'invitations/wedding-and-engagement' },
      events: { party: 'posters/events-and-parties', conference: 'posters/events-and-parties' },
      print: { a1: 'posters', a2: 'posters', a3: 'posters', a4: 'flyers' },
    };
    const cats = [
      ...Object.entries(oldSubs).flatMap(([p, m]) => Object.entries(m).map(([sub, to]) => ({ source: `${C}${p}/${sub}`, destination: C + to, permanent: true }))),
      ...Object.entries(oldCats).map(([from, to]) => ({ source: `${C}${from}`, destination: C + to, permanent: true })),
      { source: `${C}birthday`, destination: '/templates?q=birthday', permanent: true },
      { source: `${C}birthday/:sub`, destination: '/templates?q=birthday', permanent: true },
      { source: `${C}print`, destination: C + 'posters', permanent: true },
    ];
    return [...cats, ...Object.entries(gone).map(([from, to]) => ({ source: `/${from}`, destination: to, permanent: true }))];
  },
  async headers() {
    return [
      // Template thumbnails, photos and fonts never change at the same address: cache them.
      { source: '/templates/collection/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' }] },
      { source: '/models/:path*', headers: [{ key: 'Cache-Control', value: 'public, max-age=2592000, immutable' }] },
    ];
  },
};
export default nextConfig;
