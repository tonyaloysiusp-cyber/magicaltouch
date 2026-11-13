#!/bin/bash
# Lighthouse scores (performance, SEO, accessibility, best practices) for key
# pages on the local production build. Mobile settings, like Google uses.
export CHROME_PATH=$(node -e "console.log(require('playwright').chromium.executablePath())")
mkdir -p e2e-out/lh
for p in / /templates /tools /custom-jersey-designer /remove-background /patterns /colours /templates/category/flyers; do
  n=$(echo "$p" | tr '/' '_'); [ "$n" = "_" ] && n=home
  npx -y lighthouse@12.2.1 "http://localhost:3000$p" --quiet --chrome-flags="--headless=new --no-sandbox" --only-categories=performance,seo,accessibility,best-practices --output=json --output-path="e2e-out/lh/$n.json" > /dev/null 2>&1 || { echo "$p: lighthouse failed"; continue; }
  node -e "const r=require('./e2e-out/lh/$n.json');const c=r.categories;const a=r.audits;console.log('$p'.padEnd(32),'perf',Math.round(c.performance.score*100),'seo',Math.round(c.seo.score*100),'a11y',Math.round(c.accessibility.score*100),'bp',Math.round(c['best-practices'].score*100),'| LCP',a['largest-contentful-paint'].displayValue,'CLS',a['cumulative-layout-shift'].displayValue,'TBT',a['total-blocking-time'].displayValue);const bad=Object.values(a).filter(x=>x.score!==null&&x.score<0.9&&['seo','accessibility'].some(k=>c[k].auditRefs.some(ref=>ref.id===x.id&&ref.weight>0))).map(x=>'   - '+x.id+': '+x.title);if(bad.length)console.log(bad.slice(0,8).join('\n'))"
done
