import type { Metadata } from 'next';
import { ToolPage, RELATED_TOOLS } from '@/components/seo/ToolPage';
import { PassportPhoto } from '@/components/tools/PassportPhoto';
import { SITE_URL, SITE_NAME, fitTitle, fitDescription } from '@/lib/seo';
import { PHOTO_SPECS } from '@/lib/passportPhoto';

const PATH = '/passport-photo-maker';
const TITLE = 'Passport & Visa Photo Maker — All Countries, Exact KB & Pixels';
const DESC = 'Free passport, visa and exam photo maker: white background, exact size for India, US, UK, Canada, Schengen, UAE, China and 40+ countries, online-upload files at the right pixels and KB (DS-160 600×600 under 240 KB, e-Visa, OCI, UPSC), plus 4×6 or A4 print sheets.';
export const metadata: Metadata = {
  title: fitTitle(TITLE), description: fitDescription(DESC), alternates: { canonical: `${SITE_URL}${PATH}` },
  openGraph: { type: 'website', url: `${SITE_URL}${PATH}`, title: TITLE, description: DESC, siteName: SITE_NAME, images: [{ url: `${SITE_URL}/tools/thumbs/passport.webp`, width: 960, height: 540 }] },
};

const FAQ: [string, string][] = [
  ['What is the passport size photo size in India?', 'For most Indian forms, admissions and bank KYC the “passport size” photo is 35 × 45 mm. Indian passports applied for abroad and Indian visas use a square 2 × 2 inch (51 × 51 mm) photo with a white background. Both are in the list, with the upload rules for the e-Visa, OCI, UPSC, SSC, IBPS and NEET forms.'],
  ['How do I make a US visa (DS-160) photo under 240 KB?', 'Choose United States → US visa DS-160. The tool makes a square 600 × 600 pixel JPEG with a white background and keeps the file under 240 KB automatically, then shows a checklist of pixel size, file size and format.'],
  ['Can I resize a photo to an exact KB, like 20–50 KB?', 'Yes. Every online-upload size sets the pixel size and the file size range (for example IBPS 200 × 230 px, 20–50 KB). For any other form choose “Custom size”, enter the pixels or mm, DPI and the KB limits, and the file is made to fit.'],
  ['What size is a UK passport photo?', '35 × 45 mm printed, head 29–34 mm, plain light grey or cream background. For the online application the file must be at least 600 × 750 pixels and 50 KB to 10 MB.'],
  ['How do I get a white background?', 'Upload your photo — the person is cut out on your device with edge refinement, and the wall is replaced with the colour the document asks for. Use the restore / erase brush to touch up hair or shoulders.'],
  ['Will my photo be accepted?', 'The file matches the published size, file size and background rules, and the head is sized to the official range. Officials also check expression, glasses, lighting and how recent the photo is, so follow the photo tips and check the official page linked for your document.'],
  ['How many passport photos fit on a 4×6 sheet?', 'Six 35 × 45 mm photos fit on 4 × 6 inch photo paper, and around 30 on A4. Download the sheet as JPG or PDF and print at 100% (actual size).'],
  ['Is it really free and private?', 'Yes — no watermark, no sign-up, and the photo never leaves your device.'],
];
const STEPS: [string, string][] = [
  ['Upload a photo', 'A front-facing photo in good light, shoulders visible, plain expression.'],
  ['Choose country and purpose', 'Passport, visa, ID or exam form — 40+ countries, or a custom size.'],
  ['Check the head and edges', 'The background is replaced and the head sized automatically; fine-tune with the guides and the edge brush.'],
  ['Download for upload or print', 'The upload file at the exact pixels and KB, a 300 DPI print photo, or a 4×6 / A4 sheet.'],
];

export default function Page() {
  return (
    <ToolPage image="/tools/thumbs/passport.webp" path={PATH} name="Passport Photo Maker" eyebrow="Passport & visa photos" h1="Passport size photo maker" intro="Pick the country and what the photo is for — passport, visa, ID or exam form. Get a clean white background, the head sized to the official range, and a file at the exact pixels and KB the portal accepts, or a print sheet. Free and private." description={DESC} steps={STEPS} faq={FAQ} related={RELATED_TOOLS}
      extra={(
        <section className="mt-16" aria-labelledby="sizes">
          <h2 id="sizes" className="text-2xl font-semibold">Passport, visa and exam photo sizes by country</h2>
          <div className="mt-4 overflow-x-auto rounded-2xl border border-mt-border">
            <table className="w-full text-[14px]">
              <thead className="bg-mt-surface2 text-left"><tr><th className="p-3">Country</th><th className="p-3">Photo</th><th className="p-3">Print size</th><th className="p-3">Head</th><th className="p-3">Online upload</th></tr></thead>
              <tbody>{PHOTO_SPECS.map((s) => (<tr key={s.id} className="border-t border-mt-border"><td className="p-3">{s.country}</td><td className="p-3">{s.label.split(' · ')[0].replace(`${s.country} `, '')}</td><td className="p-3 tabular-nums">{s.w} × {s.h} mm</td><td className="p-3 tabular-nums">{s.head[0]}–{s.head[1]} mm</td><td className="p-3 tabular-nums">{s.digital ? `${s.digital.w} × ${s.digital.h} px${s.digital.maxKB ? `, ${s.digital.minKB ? `${s.digital.minKB}–` : 'up to '}${s.digital.maxKB >= 1024 ? `${Math.round(s.digital.maxKB / 1024)} MB` : `${s.digital.maxKB} KB`}` : ''}` : '—'}</td></tr>))}</tbody>
            </table>
          </div>
          <p className="mt-2 text-[12.5px] text-mt-muted">Rules change from time to time — check the official guidance for your application before printing.</p>
        </section>
      )}>
      <PassportPhoto />
    </ToolPage>
  );
}
