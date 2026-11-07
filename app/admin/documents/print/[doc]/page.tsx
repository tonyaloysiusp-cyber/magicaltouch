'use client';

// Live official documents (admins only): built from the site's current data
// every time they are opened, so they never go out of date.
//   company-profile · brand-guidelines · ownership-record
// "Save as PDF" uses the browser's print (A4).

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Printer } from 'lucide-react';
import { supabase, getSessionUser } from '@/lib/supabase';
import { getOrCreateProfile } from '@/lib/profile';
import { useTemplateCountLabel } from '@/lib/templateCount';

const TITLES: Record<string, string> = { 'company-profile': 'Company profile', 'brand-guidelines': 'Brand guidelines', 'ownership-record': 'Website ownership record' };
const COLORS: [string, string][] = [['Spectrum Pink', '#F2708F'], ['Lavender', '#A69BD3'], ['Sky Blue', '#35C2F1'], ['Aqua', '#5DCCB8'], ['Leaf Green', '#8CC84B'], ['Lime', '#DDE23B'], ['Ink', '#09090B'], ['Paper', '#FFFFFF'], ['Action Blue', '#3B82C4']];
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)).join(', ');
const SPEC = 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)';
const CSS = `
.docs{background:#e9ebf0;min-height:100vh;padding:24px 0 60px;color:#1f2430;font-family:Inter,system-ui,sans-serif}
.sheet{width:210mm;min-height:297mm;margin:0 auto 20px;background:#fff;padding:16mm 18mm 22mm;position:relative;box-shadow:0 10px 30px -12px rgba(0,0,0,.25);font-size:10.5pt;line-height:1.55}
.sheet h1,.sheet h2{font-family:Poppins,system-ui,sans-serif;color:#0b0d12;margin:0}
.sheet h1{font-size:30pt;line-height:1.08}.sheet h2{font-size:14pt;margin:7mm 0 2.5mm}
.sheet p{margin:0 0 2.5mm}.kick{font:600 9pt Poppins,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#3B82C4;margin:6mm 0 2mm}
.head{display:flex;justify-content:space-between;align-items:center;margin-bottom:9mm}.head img{height:9mm}.tag{font:600 8pt Poppins,sans-serif;letter-spacing:.2em;text-transform:uppercase;color:#6b7280}
.sheet table{width:100%;border-collapse:collapse;margin:2mm 0 4mm}.sheet td,.sheet th{text-align:left;padding:1.8mm 2.2mm;border-bottom:1px solid #e7e9ee;vertical-align:top;font-size:9.6pt}
.sheet th{font:600 8.5pt Poppins,sans-serif;color:#6b7280}.k{font-family:Poppins,sans-serif;font-weight:600;width:48mm}
.grid3{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}.card{border:1px solid #e7e9ee;border-radius:3mm;padding:3.2mm;font-size:9.4pt;line-height:1.45}.card b{font-family:Poppins,sans-serif;display:block;margin-bottom:1mm}
.stats{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid #e7e9ee;border-radius:3mm;overflow:hidden;margin-top:8mm}.stats div{padding:4mm;border-right:1px solid #e7e9ee}.stats div:last-child{border-right:0}.stats b{font:700 17pt Poppins,sans-serif;display:block;color:#0b0d12}.stats span{font-size:8.5pt;color:#6b7280}
.foot{position:absolute;left:18mm;right:18mm;bottom:10mm;display:flex;justify-content:space-between;font-size:8pt;color:#8b91a0;border-top:1px solid #e7e9ee;padding-top:3mm}
.note{background:#f4f7fb;border-left:3px solid #35C2F1;padding:3mm 4mm;border-radius:0 2mm 2mm 0;font-size:9.5pt}
.bar{position:sticky;top:0;z-index:5;display:flex;gap:8px;justify-content:center;padding:10px;margin:-24px 0 20px;background:rgba(233,235,240,.92);backdrop-filter:blur(6px)}
@media print{@page{size:A4;margin:0}.docs{background:#fff;padding:0}.bar{display:none}.sheet{box-shadow:none;margin:0;page-break-after:always;height:297mm;overflow:hidden}.sheet:last-child{page-break-after:auto}}
`;

export default function LiveDocument() {
  const { doc } = useParams<{ doc: string }>();
  const router = useRouter();
  const count = useTemplateCountLabel();
  const [state, setState] = useState<'loading' | 'denied' | 'ok'>('loading');
  const [mission, setMission] = useState('');
  const [services, setServices] = useState<any[]>([]);
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  useEffect(() => {
    (async () => {
      const { data: { user } } = await getSessionUser();
      if (!user) return router.push(`/login?next=/admin/documents/print/${doc}`);
      const profile = await getOrCreateProfile(user.id, user.email?.split('@')[0]);
      if (!profile?.is_admin) return setState('denied');
      const [m, s] = await Promise.all([
        supabase.from('site_settings').select('value').eq('key', 'about_mission').maybeSingle(),
        supabase.from('admin_services').select('*').order('sort', { ascending: true, nullsFirst: false }),
      ]);
      setMission(((m.data as any)?.value || '').split(/\n{2,}/)[0] || 'To make professional graphic design and creative technology accessible to everyone.');
      setServices(((s.data as any[]) || []).filter((x) => x.plan !== 'Business document'));
      setState('ok');
    })();
  }, [doc, router]);

  if (state === 'loading') return <main className="min-h-screen grid place-items-center text-mt-faint">Loading…</main>;
  if (state === 'denied' || !TITLES[doc]) return <main className="min-h-screen grid place-items-center">Not available</main>;
  const title = TITLES[doc];
  const Head = () => <div className="head">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/logo.png" alt="Magical Touch Design" /><span className="tag">{doc === 'ownership-record' ? 'Internal — website ownership' : title}</span></div>;
  const Foot = () => <div className="foot"><span>Magical Touch Design · magicaltouchdesign.com · hellomagicaltouch.design@gmail.com</span><span>{title} · {today}</span></div>;
  const Spec = () => <div style={{ height: 4, width: '36mm', borderRadius: 4, background: SPEC }} />;
  const day = (d?: string | null) => (d ? new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

  return (
    <div className="docs">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bar">
        <Link href="/admin/documents" className="h-10 px-4 rounded-full border border-mt-border bg-white text-[14px] font-semibold inline-flex items-center gap-1.5"><ArrowLeft size={15} /> Business documents</Link>
        <button onClick={() => window.print()} className="h-10 px-4 rounded-full bg-[#09090B] text-white text-[14px] font-semibold inline-flex items-center gap-1.5"><Printer size={15} /> Save as PDF / Print</button>
      </div>

      {doc === 'company-profile' && <>
        <section className="sheet"><Head /><Spec />
          <p className="kick">Company profile</p><h1>Magical Touch Design</h1>
          <p style={{ marginTop: '4mm', fontSize: '12.5pt', color: '#4b5263', maxWidth: '150mm' }}>A free online design studio: professional templates, a full design editor, a photo studio and a background remover — in the browser, on any device, with no watermark.</p>
          <div className="stats"><div><b>{count}</b><span>editable templates</span></div><div><b>100%</b><span>free, every feature</span></div><div><b>0</b><span>watermarks</span></div><div><b>Worldwide</b><span>any device</span></div></div>
          <h2>Company details</h2>
          <table><tbody>
            <tr><td className="k">Trading name</td><td>Magical Touch Design</td></tr>
            <tr><td className="k">Business type</td><td>Online graphic design software (software as a service). Not an interior design or decoration company.</td></tr>
            <tr><td className="k">Founder &amp; CEO</td><td>Tony Aloysius</td></tr>
            <tr><td className="k">Location</td><td>Tamil Nadu, India (Google Business Profile: Ayandur, Tamil Nadu 605755)</td></tr>
            <tr><td className="k">Official website</td><td>https://www.magicaltouchdesign.com</td></tr>
            <tr><td className="k">Official email</td><td>hellomagicaltouch.design@gmail.com</td></tr>
            <tr><td className="k">Service area</td><td>Worldwide, online</td></tr>
            <tr><td className="k">Business model</td><td>Free to use; optional paid plans and template packs</td></tr>
          </tbody></table>
          <h2>Our mission</h2><p>{mission}</p>
          <Foot /></section>
        <section className="sheet"><Head />
          <h2 style={{ marginTop: 0 }}>What we offer</h2>
          <div className="grid3">
            <div className="card"><b>Templates</b>{count} professional templates: social media, flyers, posters, invitations, cards, resumes, certificates, menus, business cards, albums.</div>
            <div className="card"><b>Design editor</b>Text with pro effects, photos, elements, brand kits, pages, magic resize and translation into 37 languages.</div>
            <div className="card"><b>Photo Studio</b>Adjustments, curves, looks, filters, retouching, selections, layers, live text and print export.</div>
            <div className="card"><b>Background remover</b>One photo or a whole folder, on the user's own device, with hand touch-up.</div>
            <div className="card"><b>Print-ready output</b>Vector PDF, CMYK with bleed and crop marks, PNG, JPG, TIFF and WebP.</div>
            <div className="card"><b>Learning</b>Free tutorials and courses with verified certificates and downloadable guides.</div>
          </div>
          <h2>Who we serve</h2><p>Small businesses, shops and restaurants, schools and teachers, students, event planners, community groups, creators and marketing teams — anyone who needs professional designs without expensive software or training.</p>
          <h2>Technology &amp; trust</h2>
          <table><tbody>
            <tr><td className="k">Hosting</td><td>Cloudflare (global network, free SSL, DDoS protection)</td></tr>
            <tr><td className="k">Data</td><td>Supabase database and sign-in; passwords stored only as secure hashes</td></tr>
            <tr><td className="k">Privacy</td><td>Photo tools such as background removal run on the user's device; projects can be saved only on the user's device or own cloud drive. We do not sell personal information.</td></tr>
            <tr><td className="k">Policies</td><td>Privacy Policy and Terms of Use at magicaltouchdesign.com/privacy and /terms</td></tr>
          </tbody></table>
          <h2>Contact</h2><p>Email <b>hellomagicaltouch.design@gmail.com</b> · Web <b>magicaltouchdesign.com</b> · Contact form <b>magicaltouchdesign.com/contact</b></p>
          <Foot /></section>
      </>}

      {doc === 'brand-guidelines' && <>
        <section className="sheet"><Head /><Spec />
          <p className="kick">Brand guidelines</p><h1>Magical Touch Design<br />brand identity</h1>
          <p style={{ marginTop: '4mm', fontSize: '12.5pt', color: '#4b5263' }}>How to use the Magical Touch name, logo, colours and type so the brand always looks the same.</p>
          <h2>The logo</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5mm' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '30mm' }}><img src="/logo.png" alt="" style={{ height: '12mm' }} /></div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <div className="card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '30mm', background: '#09090B' }}><img src="/logo-white.png" alt="" style={{ height: '12mm' }} /></div>
          </div>
          <table style={{ marginTop: '4mm' }}><tbody>
            <tr><td className="k">Full logo</td><td>The spectrum “M” mark with the MAGICAL TOUCH wordmark. Colour version on light backgrounds, white version on dark backgrounds.</td></tr>
            <tr><td className="k">Mark only</td><td>The spectrum “M” alone, for app icons, favicons, file icons and profile pictures.</td></tr>
            <tr><td className="k">Clear space</td><td>Keep space around the logo at least the height of the “M” mark.</td></tr>
            <tr><td className="k">Minimum size</td><td>Full logo at least 24 mm (or 120 px) wide; mark at least 8 mm (or 24 px).</td></tr>
            <tr><td className="k">Do not</td><td>Stretch, rotate, recolour, add effects or outlines, or place the colour logo on busy photos.</td></tr>
          </tbody></table>
          <Foot /></section>
        <section className="sheet"><Head />
          <h2 style={{ marginTop: 0 }}>Colours</h2>
          <p>The six spectrum colours come from the logo and are used together as a gradient. Ink and Paper are the main text and background colours.</p>
          <div className="grid3">{COLORS.map(([n, c]) => <div key={c} style={{ borderRadius: '3mm', overflow: 'hidden', border: '1px solid #e7e9ee' }}><div style={{ height: '13mm', background: c }} /><div style={{ padding: '2.5mm 3mm', fontSize: '8.5pt' }}><b style={{ fontFamily: 'Poppins', display: 'block', fontSize: '9.5pt' }}>{n}</b>{c} · RGB {rgb(c)}</div></div>)}</div>
          <div style={{ height: '10mm', borderRadius: '3mm', marginTop: '5mm', background: SPEC }} />
          <h2>Typography</h2>
          <table><tbody>
            <tr><td className="k" style={{ fontSize: '16pt' }}>Poppins</td><td>Headings, buttons and labels — SemiBold and Bold.</td></tr>
            <tr><td className="k" style={{ fontFamily: 'Inter', fontSize: '16pt' }}>Inter</td><td>Body text, tables and interface text — Regular and Medium.</td></tr>
          </tbody></table>
          <h2>Voice</h2><p>Simple, warm and confident. Plain words, short sentences, no jargon. Slogan: <b>Design anything. Make it magical.</b></p>
          <p className="note">Logo files, profile picture and social covers: Admin → Brand workspace and Admin → Social media.</p>
          <Foot /></section>
      </>}

      {doc === 'ownership-record' && (
        <section className="sheet"><Head /><Spec />
          <p className="kick">Website ownership &amp; technical record</p><h1>magicaltouchdesign.com</h1>
          <p style={{ marginTop: '3mm', fontSize: '11pt', color: '#4b5263' }}>Who owns and runs each part of the website. Keep this private. No passwords or keys are written here.</p>
          <h2>Owner</h2>
          <table><tbody>
            <tr><td className="k">Website owner</td><td>Magical Touch Design — Tony Aloysius, Founder &amp; CEO</td></tr>
            <tr><td className="k">Primary domain</td><td>magicaltouchdesign.com (and www.magicaltouchdesign.com)</td></tr>
            <tr><td className="k">Registrar</td><td>Cloudflare Registrar · nameservers georgia.ns.cloudflare.com, ryan.ns.cloudflare.com</td></tr>
          </tbody></table>
          <h2>Services <span style={{ fontSize: '9pt', fontWeight: 400, color: '#6b7280' }}>· live from Hosting &amp; renewals</span></h2>
          <table><thead><tr><th>Service</th><th>Provider</th><th>Plan</th><th>Status</th><th>Renews</th></tr></thead><tbody>
            {services.map((s) => <tr key={s.id}><td className="k" style={{ width: '44mm' }}>{s.name}</td><td>{s.provider}</td><td>{s.plan || '—'}</td><td>{s.status}</td><td>{day(s.renews_on)}</td></tr>)}
          </tbody></table>
          <Foot /></section>
      )}
    </div>
  );
}
