#!/usr/bin/env python3
"""Builds public/templates/photos/index.json and 320px thumbnails.

For every photo used in the template collection it records which templates
use it and a few search words taken from those templates, so the editor's
"Photos" panel and the admin template manager can offer them for reuse.
Run after adding photos or template collections:  python3 scripts/build_photo_index.py
"""
import json, os, re, glob, collections
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PH = os.path.join(ROOT, 'public/templates/photos')
TH = os.path.join(PH, 'thumbs')
os.makedirs(TH, exist_ok=True)
STOP = set('the a an and of for with to in on at by your our my free template templates post story card poster flyer design 2026 2027 mt brand'.split())

uses = collections.defaultdict(list)
for f in glob.glob(os.path.join(ROOT, 'public/templates/collection/*.json')):
    try:
        rows = json.load(open(f))
    except Exception:
        continue
    if not isinstance(rows, list):
        continue
    for r in rows:
        if not isinstance(r, dict):
            continue
        s = json.dumps(r.get('canvasJson') or r.get('canvas_json') or {})
        for m in set(re.findall(r'/templates/photos/(mt-\d+\.jpg)', s)):
            uses[m].append({'name': r.get('name', ''), 'slug': r.get('slug', ''), 'category': r.get('category', ''), 'kw': r.get('keywords', '') or ''})

items = []
for fn in sorted(os.listdir(PH), key=lambda x: int(re.sub(r'\D', '', x) or 0)):
    if not re.match(r'mt-\d+\.jpg$', fn):
        continue
    src = os.path.join(PH, fn)
    im = Image.open(src)
    w, h = im.size
    th = os.path.join(TH, fn)
    if not os.path.exists(th) or os.path.getmtime(th) < os.path.getmtime(src):
        t = im.convert('RGB')
        t.thumbnail((320, 320))
        t.save(th, quality=72, optimize=True, progressive=True)
    u = uses.get(fn, [])
    words = collections.Counter()
    for t in u:
        for wd in re.findall(r'[a-z]+', (t['name'] + ' ' + t['kw'] + ' ' + t['category']).lower()):
            if len(wd) > 2 and wd not in STOP:
                words[wd] += 1
    items.append({
        'file': fn,
        'src': f'/templates/photos/{fn}',
        'thumb': f'/templates/photos/thumbs/{fn}',
        'w': w, 'h': h,
        'uses': len(u),
        'tags': [x for x, _ in words.most_common(8)],
        'templates': [{'name': t['name'], 'slug': t['slug']} for t in u[:6]],
    })
json.dump({'count': len(items), 'photos': items}, open(os.path.join(PH, 'index.json'), 'w'), separators=(',', ':'))
print(len(items), 'photos;', sum(1 for i in items if i['uses']), 'used in templates')
