import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PassportPhoto } from '@/components/tools/PassportPhoto';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PHOTO_SPECS } from '@/lib/passportPhoto';

const PATH = '/passport-photo-maker';
const TITLE = 'Passport Size Photo Maker Online — Free, White Background';
const DESC = 'Make a passport size photo online free: white background, correct 35×45 mm, 2×2 inch (51×51 mm), UK, US, Schengen or UAE size, and a print sheet of 6 on 4×6 or A4. Private — runs on your device.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  keywords: ['passport size photo maker', 'passport photo online', 'passport size photo 35x45', '2x2 photo maker', 'passport photo white background', 'visa photo maker', 'passport photo sheet 4x6'],
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [`${SITE_URL}/api/og`] },
};

const FAQ: [string, string][] = [
  ['What is the passport size photo size in India?', 'For most Indian forms, exams, PAN and bank KYC the “passport size” photo is 35 × 45 mm. For the Indian passport (Passport Seva) and Indian visas a square 2 × 2 inch (51 × 51 mm) photo with a white background is used. Both sizes are in the list.'],
  ['What size is a UK passport photo?', '35 × 45 mm, with the head 29–34 mm from chin to crown, on a plain light grey or cream background.'],
  ['How do I get a white background?', 'Upload your photo and the background is replaced automatically with white (or light grey, light blue or cream). It runs in your browser — your photo is never uploaded.'],
  ['How many passport photos fit on a 4×6 sheet?', 'Six 35 × 45 mm photos fit on 4 × 6 inch photo paper, and around 30 on A4. Download the sheet as JPG or PDF and print at 100% (actual size).'],
  ['Is it really free?', 'Yes — no watermark, no sign-up, and the photo stays on your device.'],
];
const STEPS: [string, string][] = [
  ['Upload a photo', 'A front-facing photo in good light, shoulders visible, plain expression.'],
  ['Choose the country size', 'India 35×45 mm or 2×2 in, UK, US, Schengen, UAE, Canada and more.'],
  ['Line up the head', 'The background turns white; use the guides, size and position sliders.'],
  ['Download or print', 'One photo at 300 DPI, or a 4×6 / A4 sheet as JPG or PDF.'],
];

export default function Page() {
  return (
    <ToolPage path={PATH} name="Passport Photo Maker" eyebrow="Passport & visa photos" h1="Passport size photo maker" intro="Upload a photo, get a white background and the exact size for India, the UK, US, Europe or the UAE — then print six on a 4×6 sheet. Free, private and instant." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}
      extra={(
        <section className="mt-16" aria-labelledby="sizes">
          <h2 id="sizes" className="text-2xl font-semibold">Passport photo sizes by country</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-mt-border">
            <table className="w-full text-[14px]">
              <thead className="bg-mt-surface2 text-left"><tr><th className="p-3">Photo</th><th className="p-3">Size</th><th className="p-3">Head height</th><th className="p-3">Pixels at 300 DPI</th></tr></thead>
              <tbody>{PHOTO_SPECS.map((s) => (<tr key={s.id} className="border-t border-mt-border"><td className="p-3">{s.label.split(' · ')[0]}</td><td className="p-3 tabular-nums">{s.w} × {s.h} mm</td><td className="p-3 tabular-nums">{s.head[0]}–{s.head[1]} mm</td><td className="p-3 tabular-nums">{Math.round((s.w / 25.4) * 300)} × {Math.round((s.h / 25.4) * 300)}</td></tr>))}</tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] text-mt-muted">Rules change from time to time — check the official guidance for your application before printing.</p>
        </section>
      )}>
      <PassportPhoto />
    </ToolPage>
  );
}
