# Searches Openverse for CC0 photographs (commercial use, no attribution
# required) and saves small previews + metadata. mode=full downloads the
# chosen ids at full size.
import json, os, re, time, io, requests
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
API = 'https://api.openverse.org/v1/images/'
H = {'User-Agent': 'MagicalTouchDesign-asset-fetch/1.0 (template photos)'}
os.makedirs('out', exist_ok=True)
cfg = json.load(open('queries.json'))
log = []
def get(url, **kw):
    for i in range(4):
        try:
            r = requests.get(url, headers=H, timeout=40, **kw)
            if r.status_code == 429: time.sleep(20); continue
            return r
        except Exception as e:
            log.append(f'ERR {url} {e}'); time.sleep(3)
    return None
def save(img_url, path, maxpx, q):
    r = get(img_url)
    if not r or r.status_code != 200: return None
    try:
        im = Image.open(io.BytesIO(r.content)); im = im.convert('RGB')
    except Exception: return None
    w, h = im.size
    im.thumbnail((maxpx, maxpx), Image.LANCZOS)
    im.save(path, 'JPEG', quality=q, optimize=True, progressive=True)
    return (w, h)
meta = {}
if cfg.get('mode') == 'full':
    os.makedirs('out/full', exist_ok=True)
    for item in cfg['items']:
        r = get(API + item['id'] + '/')
        if not r or r.status_code != 200: log.append(f"miss {item['id']}"); continue
        d = r.json()
        wh = save(d['url'], f"out/full/{item['name']}.jpg", cfg.get('maxpx', 1600), 84)
        if wh: meta[item['name']] = {k: d.get(k) for k in ('id','title','creator','creator_url','license','license_version','license_url','foreign_landing_url','source','provider','url')} | {'orig': wh}
        else: log.append(f"dl fail {item['id']} {d.get('url')}")
        time.sleep(1.2)
else:
    for q in cfg['queries']:
        slug = re.sub(r'[^a-z0-9]+', '-', q.lower()).strip('-')
        os.makedirs(f'out/prev/{slug}', exist_ok=True)
        params = {'q': q, 'license': 'cc0', 'category': 'photograph', 'page_size': cfg.get('per', 16), 'mature': 'false', 'aspect_ratio': '', 'size': 'large'}
        if cfg.get('sources'): params['source'] = cfg['sources']
        params = {k: v for k, v in params.items() if v != ''}
        r = get(API, params=params)
        if not r or r.status_code != 200:
            log.append(f'search fail {q} {r.status_code if r else None} {r.text[:200] if r else ""}'); time.sleep(5); continue
        res = r.json().get('results', [])
        log.append(f'{q}: {len(res)}')
        def one(d):
            wh = save(d['url'], f"out/prev/{slug}/{d['id']}.jpg", 360, 70) or save(d.get('thumbnail') or '', f"out/prev/{slug}/{d['id']}.jpg", 360, 70)
            if wh: meta[d['id']] = {'q': q, 'title': d.get('title'), 'source': d.get('source'), 'w': d.get('width'), 'h': d.get('height'), 'license': d.get('license'), 'url': d.get('url')}
        with ThreadPoolExecutor(8) as ex: list(ex.map(one, res))
        time.sleep(2.5)
json.dump(meta, open('out/meta.json', 'w'), indent=1)
open('out/log.txt', 'w').write('\n'.join(log))
