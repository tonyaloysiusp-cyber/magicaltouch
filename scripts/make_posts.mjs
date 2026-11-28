// Renders the 7 official Magical Touch posts (1080 × 1080, works for Google
// Business, Instagram, Facebook, LinkedIn and X) → public/posts/*.jpg
// Usage: FONTS=<folder with Poppins-Bold.ttf, Inter[opsz,wght].ttf> node scripts/make_posts.mjs
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const F = process.env.FONTS;
const b64 = (p, t) => `data:${t};base64,` + fs.readFileSync(path.join(ROOT, p)).toString('base64');
const LOGO = b64('public/logo-white.png', 'image/png');
const LOGO_D = b64('public/logo.png', 'image/png');
const FACE0 = b64('public/home/reel/face-original.jpg', 'image/jpeg');
const FACE1 = b64('public/home/reel/face-glam.jpg', 'image/jpeg');
const T = (n) => b64(`public/templates/collection/${n}`, n.endsWith('.jpg') ? 'image/jpeg' : 'image/webp');
const FONT = (f) => 'data:font/ttf;base64,' + fs.readFileSync(path.join(F, f)).toString('base64');
const PB = FONT('Poppins-Bold.ttf'), PS = FONT('Poppins-SemiBold.ttf'), IN = FONT('Inter[opsz,wght].ttf');
const SPEC = 'linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B)';

const base = (bg, body, dark = true) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:P;src:url('${PB}');font-weight:700}
@font-face{font-family:P;src:url('${PS}');font-weight:600}
@font-face{font-family:I;src:url('${IN}');font-weight:100 900}
*{margin:0;box-sizing:border-box}body{width:1080px;height:1080px;overflow:hidden;position:relative;font-family:I,sans-serif;background:${bg};color:${dark ? '#fff' : '#0B0D12'}}
.logo{position:absolute;left:72px;top:64px;height:40px}.url{position:absolute;left:72px;bottom:60px;font:600 26px P;opacity:.75}
.spec{background:${SPEC};-webkit-background-clip:text;color:transparent}
.bar{position:absolute;left:0;right:0;bottom:0;height:12px;background:${SPEC}}
h1{font:700 104px/1.0 P;letter-spacing:-.035em}
.pill{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:14px 26px;font:600 28px P}
.dot{width:14px;height:14px;border-radius:50%}
</style></head><body>${body}<div class="bar"></div></body></html>`;

const POSTS = [
  { file: 'free-for-everyone', html: base('radial-gradient(circle at 80% 15%,#2B1F4F 0,#0B0B16 60%)', `
    <img class="logo" src="${LOGO}">
    <div style="position:absolute;left:72px;top:250px;right:72px"><h1>Design anything.<br><span class="spec">Free for everyone.</span></h1>
    <div style="margin-top:56px;display:flex;flex-wrap:wrap;gap:16px">${['100% free', 'No login', 'Free export', 'No watermark'].map((t, k) => `<span class="pill" style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18)"><span class="dot" style="background:${['#F2708F', '#A69BD3', '#35C2F1', '#8CC84B'][k]}"></span>${t}</span>`).join('')}</div></div>
    <div class="url">magicaltouchdesign.com</div>`) },
  { file: 'no-login', html: base('#F6F4EF', `
    <img class="logo" src="${LOGO_D}">
    <div style="position:absolute;left:72px;top:230px;right:72px">
      <p style="font:700 150px/0.95 P;letter-spacing:-.05em">No login.<br>No fee.<br><span class="spec">Just create.</span></p>
      <p style="margin-top:40px;font-size:34px;line-height:1.4;color:#4B5160;max-width:820px">Open the site and start. Your files stay on your own device.</p></div>
    <div class="url">magicaltouchdesign.com</div>`, false) },
  { file: 'photo-studio', html: base('#0E0E14', `
    <img class="logo" src="${LOGO}">
    <div style="position:absolute;left:72px;top:150px"><h1 style="font-size:84px">Retouch faces.<br><span class="spec">Free Photo Studio.</span></h1></div>
    <div style="position:absolute;left:72px;right:72px;top:420px;height:500px;display:flex;gap:20px">
      ${[[FACE0, 'Before'], [FACE1, 'After · Soft glam']].map(([s, l]) => `<div style="flex:1;border-radius:28px;overflow:hidden;position:relative;border:1px solid rgba(255,255,255,.15)"><img src="${s}" style="width:100%;height:100%;object-fit:cover"><span class="pill" style="position:absolute;left:18px;top:18px;background:rgba(0,0,0,.55);font-size:22px;padding:10px 18px">${l}</span></div>`).join('')}
    </div>
    <div style="position:absolute;right:72px;bottom:56px;font:600 24px P;opacity:.75">Lips · eyes · face shape · skin</div>
    <div class="url">magicaltouchdesign.com</div>`) },
  { file: 'templates', html: base('linear-gradient(160deg,#FDE7F0 0%,#E3F4FB 100%)', `
    <img class="logo" src="${LOGO_D}">
    <div style="position:absolute;left:72px;top:150px"><h1 style="font-size:88px">Free templates<br>for <span class="spec">every occasion.</span></h1></div>
    <div style="position:absolute;left:72px;right:72px;top:430px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
      ${['pro-maison-vera-autumn-edit-fashion-poster.webp', 'pro-saffron-table-brunch-menu.webp', 'pro-sage-garden-wedding-invitation.webp'].map((n, k) => `<img src="${T(n)}" style="width:100%;aspect-ratio:1/1.35;object-fit:cover;border-radius:18px;box-shadow:0 30px 60px -25px rgba(0,0,0,.45);transform:rotate(${(k - 1) * 3}deg) translateY(${k === 1 ? -14 : 8}px)">`).join('')}
    </div>
    <div class="url">magicaltouchdesign.com</div>`, false) },
  { file: 'languages', html: base('#14233B', `
    <img class="logo" src="${LOGO}">
    <div style="position:absolute;left:72px;top:170px;right:72px">
      <p style="font:600 26px P;letter-spacing:.3em;color:#E3A72F">YOUR DESIGN · ANY LANGUAGE</p>
      <div style="margin-top:36px;display:flex;flex-direction:column;gap:22px;font:700 58px/1.2 I">
        <span>Welcome</span><span dir="rtl" style="text-align:left">أهلاً وسهلاً</span><span>स्वागत है</span><span>வரவேற்கிறோம்</span><span>സ്വാഗതം</span>
      </div>
      <p style="margin-top:44px;font-size:32px;color:rgba(255,255,255,.75)">Type in 17+ scripts. Translate into 37 languages.</p></div>
    <div class="url">magicaltouchdesign.com</div>`) },
  { file: 'packaging', html: base('#F1EFE9', `
    <img class="logo" src="${LOGO_D}">
    <div style="position:absolute;left:72px;top:150px"><h1 style="font-size:88px">Real box dielines.<br><span class="spec">Ready to print.</span></h1></div>
    <svg viewBox="0 0 600 330" style="position:absolute;left:90px;right:90px;top:460px;width:900px" fill="none" stroke-width="3">
      <g stroke="#16161F"><rect x="150" y="90" width="120" height="150"/><rect x="270" y="90" width="80" height="150"/><rect x="350" y="90" width="120" height="150"/><rect x="470" y="90" width="80" height="150"/></g>
      <path d="M130 100 L150 90 L150 240 L130 230 Z M150 90 L170 30 L250 30 L270 90 M350 240 L370 300 L450 300 L470 240" stroke="#16161F"/>
      <g stroke="#E0457B" stroke-dasharray="10 8"><path d="M270 90V240M350 90V240M470 90V240M150 90H270M350 240H470"/></g>
      <rect x="150" y="90" width="120" height="150" fill="#1D3557"/><text x="210" y="170" fill="#fff" font-family="P" font-size="22" text-anchor="middle">YOUR</text><text x="210" y="196" fill="#E3B341" font-family="P" font-size="22" text-anchor="middle">BRAND</text>
    </svg>
    <div style="position:absolute;left:72px;bottom:120px;display:flex;gap:24px;font:600 24px P;color:#4B5160"><span>━ Cut</span><span style="color:#E0457B">┅ Crease</span><span>Print PDF · DXF · Spec sheet</span></div>
    <div class="url">magicaltouchdesign.com</div>`, false) },
  { file: 'print-ready', html: base('radial-gradient(circle at 20% 20%,#1F3B66 0,#0A1424 65%)', `
    <img class="logo" src="${LOGO}">
    <div style="position:absolute;left:72px;top:150px"><h1 style="font-size:88px">Print-ready files.<br><span class="spec">Free export.</span></h1></div>
    <div style="position:absolute;left:150px;right:150px;top:450px;height:470px;background:#fff;border-radius:6px;padding:46px;display:grid;grid-template-columns:1fr 1fr;gap:34px">
      ${Array.from({ length: 4 }, () => `<div style="position:relative;outline:10px solid rgba(242,112,143,.25);background:linear-gradient(135deg,#0F1B2D,#1D3557);border-radius:3px"><span style="position:absolute;left:22px;top:24px;width:52px;height:52px;border:2px solid #E3B341;border-radius:50%"></span><span style="position:absolute;left:22px;bottom:36px;width:55%;height:12px;background:#fff;border-radius:3px"></span><span style="position:absolute;left:22px;bottom:16px;width:35%;height:8px;background:#E3B341;border-radius:3px"></span></div>`).join('')}
      <div style="position:absolute;left:46px;bottom:12px;display:flex;gap:6px;align-items:center">${['#00AEEF', '#EC008C', '#FFF200', '#16161F'].map((c) => `<span style="width:30px;height:16px;background:${c}"></span>`).join('')}<span style="margin-left:10px;font:600 16px I;color:#6B7280">CMYK · 3 mm bleed · crop marks</span></div>
    </div>
    <div class="url">magicaltouchdesign.com</div>`) },
];

const OUT = path.join(ROOT, 'public/posts');
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1080 } });
for (const p of POSTS) {
  await pg.setContent(p.html, { waitUntil: 'load' });
  await pg.waitForTimeout(300);
  await pg.screenshot({ path: path.join(OUT, `${p.file}.jpg`), type: 'jpeg', quality: 90 });
  console.log(p.file);
}
await b.close();
