// Renders the site's promo posts (home "Made with Magical Touch" and social)
// from HTML with Playwright: brand-dark gradient, spectrum glows, real tool
// screens (public/tour). No template count and no AI claims in the artwork.
// Usage: node scripts/make_promos.mjs  → public/promo/*.jpg + public/home/promo/*.webp
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = process.cwd();
const img = (p) => 'data:image/webp;base64,' + fs.readFileSync(path.join(ROOT, 'public', p)).toString('base64');
const LOGO = 'data:image/png;base64,' + fs.readFileSync(path.join(ROOT, 'public/logo-white.png')).toString('base64');
const SHOTS = { pack: img('tour/packaging.webp'), tex: img('tour/textile.webp'), photo: img('tour/photo-studio.webp'), layout: img('tour/print-layout.webp') };

const POSTS = [
  { file: 'promo-instagram-post', w: 1080, h: 1350, tag: 'Instagram', h1: ['Design anything.', 'Free. Forever.'], sub: 'Templates · Photo Studio · Packaging · Textile · Print-ready PDF' },
  { file: 'promo-instagram-story', w: 1080, h: 1920, tag: 'Story', h1: ['Your design', 'and print studio.'], sub: 'Free for everyone — no account, no watermark' },
  { file: 'promo-linkedin', w: 1200, h: 627, tag: 'LinkedIn', h1: ['Professional design.', 'Zero cost.'], sub: 'Packaging dielines, textile patterns, CMYK print files — free in your browser' },
  { file: 'promo-square', w: 1080, h: 1080, tag: 'Facebook', h1: ['Every tool.', 'Every feature free.'], sub: 'Design editor · Photo Studio · Packaging · Textile · 17+ languages' },
  { file: 'promo-pinterest', w: 1000, h: 1500, tag: 'Pinterest', h1: ['Free design', '& print studio'], sub: 'Templates, packaging boxes, garments and print-ready files' },
];

function html(p) {
  const wide = p.w / p.h > 1.4;
  const s = p.w / 1080;
  const cardW = wide ? 0.27 : 0.5;
  const sq = Math.abs(p.w / p.h - 1) < 0.05;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
  @font-face{font-family:P;src:url('file://${process.env.POPPINS || path.join(ROOT, 'node_modules/@fontsource/poppins/files/poppins-latin-700-normal.woff2')}')}
  *{margin:0;box-sizing:border-box} body{width:${p.w}px;height:${p.h}px;overflow:hidden;font-family:P,Poppins,'Segoe UI',Arial,sans-serif;background:#0d0d16;color:#fff;position:relative}
  .g{position:absolute;border-radius:50%;filter:blur(${90 * s}px);opacity:.55}
  .grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px);background-size:${48 * s}px ${48 * s}px}
  .wrap{position:absolute;inset:${64 * s}px;display:flex;flex-direction:column}
  .logo{height:${38 * s}px;align-self:flex-start}
  h1{margin-top:${wide ? 30 * s : 60 * s}px;font-size:${(wide ? 48 : (sq ? 84 : 92)) * s}px;max-width:${wide ? 560 * s : p.w}px;line-height:1.02;letter-spacing:-.03em;font-weight:700}
  h1 span{display:block} h1 span:last-child{background:linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B);-webkit-background-clip:text;color:transparent}
  .sub{margin-top:${22 * s}px;font-size:${(wide ? 24 : 30) * s}px;color:rgba(255,255,255,.72);max-width:${wide ? 560 * s : 900 * s}px;line-height:1.35}
  .cards{position:absolute;z-index:1;${wide ? `right:${30 * s}px;top:${70 * s}px;width:${p.w * 0.4}px;height:${p.h - 160 * s}px` : `left:${60 * s}px;right:${60 * s}px;bottom:${150 * s}px;top:${p.h * (sq ? 0.47 : 0.42)}px`}}
  .wrap{z-index:2}
  .c{position:absolute;width:${p.w * cardW}px;border-radius:${18 * s}px;overflow:hidden;box-shadow:0 ${30 * s}px ${70 * s}px rgba(0,0,0,.55);border:${2 * s}px solid rgba(255,255,255,.12);background:#fff}
  .c img{display:block;width:100%}
  .chip{position:absolute;padding:${10 * s}px ${18 * s}px;border-radius:999px;background:rgba(255,255,255,.12);backdrop-filter:blur(8px);font-size:${22 * s}px;font-weight:600;border:1px solid rgba(255,255,255,.18)}
  .foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:${24 * s}px;color:rgba(255,255,255,.75)}
  .tag{padding:${8 * s}px ${18 * s}px;border-radius:999px;background:rgba(255,255,255,.14);font-weight:600}
  .bar{position:absolute;left:0;right:0;bottom:0;height:${8 * s}px;background:linear-gradient(90deg,#F2708F,#A69BD3,#35C2F1,#5DCCB8,#8CC84B,#DDE23B)}
  </style></head><body>
  <div class="g" style="width:${700 * s}px;height:${700 * s}px;left:${-200 * s}px;top:${-220 * s}px;background:#F2708F"></div>
  <div class="g" style="width:${650 * s}px;height:${650 * s}px;right:${-220 * s}px;top:${p.h * 0.3}px;background:#35C2F1"></div>
  <div class="g" style="width:${600 * s}px;height:${600 * s}px;left:${p.w * 0.25}px;bottom:${-300 * s}px;background:#8CC84B;opacity:.35"></div>
  <div class="grid"></div>
  <div class="cards">
    ${wide
      ? `<div class="c" style="left:0;top:${20 * s}px;transform:rotate(-4deg)"><img src="${SHOTS.pack}"></div>
         <div class="c" style="right:0;top:${190 * s}px;transform:rotate(3deg)"><img src="${SHOTS.tex}"></div>`
      : sq
      ? `<div class="c" style="left:0;top:0;transform:rotate(-5deg)"><img src="${SHOTS.pack}"></div>
         <div class="c" style="right:0;top:${40 * s}px;transform:rotate(4deg)"><img src="${SHOTS.photo}"></div>`
      : `<div class="c" style="left:0;top:0;transform:rotate(-5deg)"><img src="${SHOTS.pack}"></div>
         <div class="c" style="right:0;top:${p.h * 0.07}px;transform:rotate(4deg)"><img src="${SHOTS.tex}"></div>
         <div class="c" style="left:${p.w * 0.16}px;top:${p.h * 0.17}px;transform:rotate(-1deg)"><img src="${SHOTS.photo}"></div>`}
  </div>
  <div class="wrap">
    <img class="logo" src="${LOGO}">
    <h1><span>${p.h1[0]}</span><span>${p.h1[1]}</span></h1>
    <p class="sub">${p.sub}</p>
    <div class="foot"><span class="tag">${p.tag}</span><span>magicaltouchdesign.com</span></div>
  </div>
  <div class="bar"></div>
  </body></html>`;
}

const b = await chromium.launch();
const pg = await b.newPage();
for (const p of POSTS) {
  await pg.setViewportSize({ width: p.w, height: p.h });
  await pg.setContent(html(p), { waitUntil: 'load' });
  await pg.waitForTimeout(300);
  const out = path.join(ROOT, 'public/promo', p.file + '.jpg');
  await pg.screenshot({ path: out, type: 'jpeg', quality: 90 });
  console.log('wrote', out);
}
await b.close();
