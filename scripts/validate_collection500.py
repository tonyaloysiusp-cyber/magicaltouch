#!/usr/bin/env python3
"""Validate the Collection 500 manifests and template files.

Checks every record in data/collection-500/*.json against its packaged
template (public/templates/collection/<file>.json) and writes a report to
data/collection-500/VALIDATION.md. Exit code 1 if any hard error is found.

Run:  python3 scripts/validate_collection500.py
Needs Pillow for the duplicate-look check (pip install pillow).
"""
import json, os, re, sys, urllib.parse
from collections import Counter, defaultdict

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAN = os.path.join(ROOT, 'data', 'collection-500')
COL = os.path.join(ROOT, 'public', 'templates', 'collection')
PUB = os.path.join(ROOT, 'public')

TARGET = {
    'Birthday': 100,
    'Wedding and engagement': 50,
    'General greeting cards': 50,
    'Seasonal and holiday designs': 50,
    'Baby and family occasions': 40,
    'Graduation and achievements': 30,
    'Invitations and events': 40,
    'Social media and promotional designs': 40,
    'Business and professional stationery': 30,
    'Miscellaneous special occasions': 30,
    'Creative quote and typography designs': 40,
}
PIN_RE = re.compile(r'^https://www\.pinterest\.com/search/pins/\?q=[A-Za-z0-9%._~-]+$')
ID_RE = re.compile(r'^[a-z]+-\d{3}$')

errors, warnings = [], []
records = []
for f in sorted(os.listdir(MAN)) if os.path.isdir(MAN) else []:
    if not f.endswith('.json'):
        continue
    col_file = os.path.join(COL, f)
    if not os.path.exists(col_file):
        errors.append(f'{f}: no packaged template file at public/templates/collection/{f}')
        continue
    templates = {t['slug']: t for t in json.load(open(col_file))}
    for r in json.load(open(os.path.join(MAN, f))):
        r['_file'] = f
        r['_template'] = templates.get(r['slug'])
        records.append(r)

ids = Counter(r['id'] for r in records)
slugs = Counter(r['slug'] for r in records)
refs = Counter(r['inspiration_reference_url'] for r in records)
briefs = Counter(r['design_brief'].strip().lower() for r in records)
titles = Counter(r['title'].strip().lower() for r in records)

for r in records:
    rid = r['id']
    if not ID_RE.match(rid): errors.append(f'{rid}: malformed id')
    if ids[rid] > 1: errors.append(f'{rid}: duplicate id')
    if slugs[r['slug']] > 1: errors.append(f'{rid}: duplicate slug {r["slug"]}')
    if titles[r['title'].strip().lower()] > 1: errors.append(f'{rid}: duplicate title {r["title"]}')
    url = r.get('inspiration_reference_url') or ''
    if not url: errors.append(f'{rid}: missing inspiration_reference_url')
    elif not PIN_RE.match(url): errors.append(f'{rid}: reference URL is not a well-formed Pinterest search URL')
    else:
        q = urllib.parse.parse_qs(urllib.parse.urlparse(url).query).get('q', [''])[0]
        if q != r.get('inspiration_query'): errors.append(f'{rid}: reference URL does not match its query')
    if refs[url] > 1: errors.append(f'{rid}: reference URL shared with another template')
    if r.get('inspiration_pin_url') and not r.get('reference_verified'):
        errors.append(f'{rid}: has a pin URL but is not marked verified by a person')
    if r.get('reference_verified') and not r.get('inspiration_pin_url'):
        errors.append(f'{rid}: marked verified without a pin URL')
    if len(r.get('design_brief', '')) < 40: errors.append(f'{rid}: design brief too short')
    if briefs[r['design_brief'].strip().lower()] > 1: errors.append(f'{rid}: design brief duplicated')
    notes = r.get('design_notes') or {}
    for k in ('layout', 'typography', 'palette', 'decor'):
        if not notes.get(k): errors.append(f'{rid}: design note "{k}" missing')
    c = r.get('content') or {}
    if not (c.get('headline') or '').strip(): errors.append(f'{rid}: headline missing')
    if not (c.get('message') or c.get('signature') or '').strip(): warnings.append(f'{rid}: no supporting message')
    for key in ('thumbnail_url', 'preview_url'):
        p = os.path.join(PUB, (r.get(key) or '').lstrip('/'))
        if not r.get(key) or not os.path.exists(p) or os.path.getsize(p) < 2000:
            errors.append(f'{rid}: {key} missing or empty')
    t = r['_template']
    if not t:
        errors.append(f'{rid}: no template with slug {r["slug"]} in {r["_file"]}')
        continue
    objs = (t.get('canvasJson') or {}).get('objects') or []
    texts = [o for o in objs if o.get('type') in ('textbox', 'i-text', 'text')]
    boards = [o for o in objs if o.get('__isArtboard')]
    if not boards: errors.append(f'{rid}: no page (artboard) in the design')
    if len(texts) < 2: errors.append(f'{rid}: fewer than two editable text boxes')
    if len(objs) < 5: errors.append(f'{rid}: design has too few elements ({len(objs)})')
    joined = ' '.join(o.get('text', '') for o in texts)
    if '{{' in joined or 'lorem' in joined.lower(): errors.append(f'{rid}: placeholder text left in design')
    srcs = [o.get('src', '') for o in objs if o.get('type') == 'image']
    for s in srcs:
        if s.startswith('/') and not os.path.exists(os.path.join(PUB, s.lstrip('/').split('?')[0])):
            errors.append(f'{rid}: missing asset {s}')
        if 'pinimg.com' in s or 'pinterest' in s:
            errors.append(f'{rid}: uses a Pinterest image as an asset')

# duplicate look: perceptual hash of previews
dupes = []
try:
    from PIL import Image
    def dhash(p, n=12):
        im = Image.open(p).convert('L').resize((n + 1, n))
        px = list(im.tobytes())
        return sum(1 << i for i in range(n * n) if px[(i // n) * (n + 1) + i % n] > px[(i // n) * (n + 1) + i % n + 1])
    hs = [(r['id'], dhash(os.path.join(PUB, r['preview_url'].lstrip('/')))) for r in records if os.path.exists(os.path.join(PUB, r['preview_url'].lstrip('/')))]
    for i in range(len(hs)):
        for j in range(i + 1, len(hs)):
            d = bin(hs[i][1] ^ hs[j][1]).count('1')
            if d <= 10:
                dupes.append((hs[i][0], hs[j][0], d))
except ImportError:
    warnings.append('Pillow not installed: duplicate-look check skipped')
for a, b, d in dupes:
    warnings.append(f'{a} and {b} look very similar (hash distance {d}) — check by eye')

counts = Counter(r['category'] for r in records)
lines = ['# Collection 500 — validation report', '', f'Templates: **{len(records)}** of 500', '', '| Category | Made | Target |', '|---|---:|---:|']
for k, v in TARGET.items():
    lines.append(f'| {k} | {counts.get(k, 0)} | {v} |')
for k in counts:
    if k not in TARGET: errors.append(f'unknown category "{k}"')
lines += ['', f'Reference links: {sum(1 for r in records if r.get("inspiration_reference_url"))} — all are Pinterest **search** links, not verified individual pins ({sum(1 for r in records if r.get("reference_verified"))} verified).', '']
lines += ['## Errors', ''] + ([f'- {e}' for e in errors] or ['None.']) + ['', '## Warnings', ''] + ([f'- {w}' for w in warnings] or ['None.'])
open(os.path.join(MAN, 'VALIDATION.md'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines[:20]))
print(f'\n{len(errors)} errors, {len(warnings)} warnings')
sys.exit(1 if errors else 0)
