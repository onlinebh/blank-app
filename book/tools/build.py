"""Assemble reader data from blocks.json + translated chunks.
usage: build.py work_dir out_book_dir
Writes out/data/ch<N>.js and out/data/meta.js. Missing translations fall back to English.
"""
import sys, os, re, json, html as _html
from bs4 import BeautifulSoup, NavigableString

work, out = sys.argv[1], sys.argv[2]
D = json.load(open(f'{work}/blocks.json', encoding='utf-8'))
blocks = D['blocks']; chapters = D['chapters']; parts = D['parts']; chunks = D['chunks']
os.makedirs(f'{out}/data', exist_ok=True)

def parse_ar(path):
    res = {}
    if not os.path.exists(path): return res
    cur = None; buf = []
    for line in open(path, encoding='utf-8').read().split('\n'):
        m = re.match(r'^@@(b\d+) (\w+)\s*$', line)
        if m:
            if cur: res[cur] = '\n'.join(buf).strip()
            cur = m.group(1); buf = []
        elif cur is not None:
            buf.append(line)
    if cur: res[cur] = '\n'.join(buf).strip()
    return res

AR = {}; META = {}
for ch in chunks:
    AR.update(parse_ar(f"{work}/chunks/{ch['id']}.ar.txt"))
    p = f"{work}/chunks/{ch['id']}.meta.json"
    if os.path.exists(p):
        try: META[ch['id']] = json.load(open(p, encoding='utf-8'))
        except Exception as e: print('bad meta', ch['id'], e)

def ws_regex(s):
    toks = s.split()
    return re.compile(r'\s+'.join(re.escape(t) for t in toks))

def apply_hl(html, hls):
    for h in hls:
        s = h.get('en', '')
        if len(s.split()) < 2: continue
        m = ws_regex(s).search(html)
        if not m: continue
        cls = ' class="key"' if h.get('level') == 2 else ''
        # do not cross tags
        if '<' in m.group(0) or '>' in m.group(0): continue
        html = html[:m.start()] + f'<mark{cls}>' + m.group(0) + '</mark>' + html[m.end():]
    return html

LAT = re.compile(r"[A-Za-z0-9][A-Za-z0-9 .,'’\-+/%:&@#°·_×]*[A-Za-z0-9%]|[A-Za-z]")
def wrap_latin(html):
    soup = BeautifulSoup(f'<div>{html}</div>', 'lxml')
    root = soup.div
    for t in list(root.find_all(string=True)):
        if t.parent.name in ('script', 'style'): continue
        s = str(t)
        if not re.search(r'[A-Za-z]', s): continue
        out_nodes = []; pos = 0
        for m in LAT.finditer(s):
            frag = m.group(0)
            if not re.search(r'[A-Za-z]', frag): continue
            out_nodes.append(NavigableString(s[pos:m.start()]))
            sp = soup.new_tag('span', attrs={'class': 'lt', 'dir': 'ltr'}); sp.string = frag
            out_nodes.append(sp); pos = m.end()
        out_nodes.append(NavigableString(s[pos:]))
        for n in out_nodes: t.insert_before(n)
        t.extract()
    return root.decode_contents()

def img_html(html):
    return re.sub(r'<img data-img="(\d+)"[^>]*/?>',
        lambda m: f'<img src="media/{m.group(1)}.png" loading="lazy" decoding="async" alt="Chart {m.group(1)}" data-n="{m.group(1)}">', html)

hl_by_block = {}
for cid, m in META.items():
    for h in m.get('highlights', []):
        hl_by_block.setdefault(h['b'], []).append(h)

plain = lambda h: re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', h)).strip()
missing = 0
chap_out = {}
for c in chapters:
    rows = []
    for bid in c['blocks']:
        b = blocks[int(bid[1:]) - 1]
        en = b['html']
        row = {'id': bid, 't': b['tag']}
        if b['kind'] == 'img':
            row['i'] = 1; row['e'] = img_html(en)
        else:
            ar = AR.get(bid)
            row['e'] = apply_hl(en, hl_by_block.get(bid, []))
            if ar:
                row['a'] = wrap_latin(ar)
            else:
                missing += 1
            if re.match(r'^(Figure|Chart|Table)\s*\d*\s*:', plain(en)): row['cap'] = 1
        rows.append(row)
    chap_out[c['id']] = rows
    with open(f"{out}/data/{c['id']}.js", 'w', encoding='utf-8') as f:
        f.write(f"window.__ch({json.dumps(c['id'])},")
        json.dump(rows, f, ensure_ascii=False, separators=(',', ':'))
        f.write(");")

# titles
def ar_title(c):
    for r in chap_out[c['id']]:
        if r['t'] in ('h1', 'h2'): return plain(r.get('a', '')) or None
    return None
chap_meta = []
for c in chapters:
    chap_meta.append({'id': c['id'], 'part': c['part'], 'en': c['title'], 'ar': ar_title(c) or c['title'],
                      'words': c['words'],
                      'sec': [{'id': r['id'], 'en': plain(r['e']), 'ar': plain(r.get('a', '')) or plain(r['e']), 'lv': int(r['t'][1])}
                              for r in chap_out[c['id']] if r['t'] in ('h3',)]})
part_meta = []
for p in parts:
    first = next(c for c in chapters if c['id'] == p['chapters'][0])
    part_meta.append({'id': p['id'], 'en': p['title'], 'ar': ar_title(first) or p['title'], 'chapters': p['chapters']})

# mind map
chap_of_block = {}
for c in chapters:
    for bid in c['blocks']: chap_of_block[bid] = c['id']
def clean_node(n, cur_b):
    b = n.get('b') or cur_b
    u = lambda x: _html.unescape(x) if isinstance(x, str) else ''
    node = {'en': u(n.get('en', '')), 'ar': u(n.get('ar') or n.get('en', '')), 'ne': u(n.get('note_en', '')), 'na': u(n.get('note_ar', '')),
            'imp': int(n.get('imp', 1) or 1), 'b': b, 'c': chap_of_block.get(b)}
    kids = [clean_node(k, b) for k in n.get('children', [])]
    if kids: node['k'] = kids
    return node
by_chap = {c['id']: [] for c in chapters}
for ch in chunks:
    m = META.get(ch['id'])
    if not m: continue
    for n in m.get('mindmap', []):
        b = n.get('b') or ch['blocks'][0]
        cid = chap_of_block.get(b) or chap_of_block[ch['blocks'][0]]
        node = clean_node(n, b); node['c'] = cid
        by_chap[cid].append(node)
tree = {'en': 'Everything Is a 1-2-3', 'ar': 'كل شيء هو 1-2-3', 'imp': 3, 'k': []}
for p in parts:
    pn = {'en': p['title'], 'ar': next(x for x in part_meta if x['id'] == p['id'])['ar'], 'imp': 3, 'k': [], 'c': p['chapters'][0]}
    for cid in p['chapters']:
        cm = next(x for x in chap_meta if x['id'] == cid)
        kids = by_chap[cid]
        if cid == p['chapters'][0] and cm['en'] == p['title']:
            pn['k'].extend(kids)   # intro nodes of the part heading chapter
            continue
        if not kids: continue
        pn['k'].append({'en': cm['en'], 'ar': cm['ar'], 'imp': 2, 'c': cid, 'k': kids})
    if pn['k']: tree['k'].append(pn)

with open(f'{out}/data/meta.js', 'w', encoding='utf-8') as f:
    f.write('window.BOOK=')
    json.dump({'parts': part_meta, 'chapters': chap_meta, 'map': tree}, f, ensure_ascii=False, separators=(',', ':'))
    f.write(';')
print('chapters', len(chapters), 'blocks missing AR:', missing, 'meta chunks:', len(META))
