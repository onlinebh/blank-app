"""Split pandoc HTML of the book into chapters and translation chunks.
usage: split.py book.html out_dir
Creates out_dir/blocks.json (all blocks) and out_dir/chunks/cNN.en.txt
"""
import sys, re, json, os
from bs4 import BeautifulSoup

src, out = sys.argv[1], sys.argv[2]
soup = BeautifulSoup(open(src, encoding='utf-8').read(), 'lxml')
body = soup.body
nodes = [n for n in body.children if getattr(n, 'name', None)]

# drop the pandoc-generated contents list (everything before first h1 "Dedication")
start = next(i for i, n in enumerate(nodes) if n.name == 'h1')
nodes = nodes[start:]

blocks = []  # {id, tag, html, kind, level, chapter, part}
part = None; chapter = None; chapters = []; parts = []
def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:60]

for n in nodes:
    tag = n.name
    if tag in ('h1', 'h2'):
        title = n.get_text(' ', strip=True)
        if tag == 'h1':
            part = {'id': f'p{len(parts)+1}', 'title': title, 'chapters': []}
            parts.append(part)
            chapter = {'id': f'ch{len(chapters)+1}', 'title': title, 'part': part['id'], 'blocks': []}
            chapters.append(chapter); part['chapters'].append(chapter['id'])
        else:
            chapter = {'id': f'ch{len(chapters)+1}', 'title': title, 'part': part['id'], 'blocks': []}
            chapters.append(chapter); part['chapters'].append(chapter['id'])
    # prepare html
    for img in n.find_all('img'):
        m = re.search(r'image(\d+)\.png', img['src'])
        img.attrs = {'data-img': m.group(1)}
    for a in n.find_all('a'):
        a.unwrap()
    for sp in n.find_all('span'):
        sp.unwrap()
    for el in n.find_all(True):
        for attr in ('id', 'class', 'style'):
            if attr in el.attrs: del el.attrs[attr]
    if tag.startswith('h'):
        n.attrs.pop('id', None)
    html = n.decode_contents().strip()
    if tag == 'table':
        for t in n.find_all(['colgroup', 'col']): t.decompose()
        html = n.decode_contents().strip()
    imgs_only = tag == 'p' and n.find('img') and not n.get_text(strip=True)
    b = {'id': f'b{len(blocks)+1}', 'tag': tag, 'html': html,
         'kind': 'img' if imgs_only else 'text', 'chapter': chapter['id']}
    blocks.append(b); chapter['blocks'].append(b['id'])

# chapters of rung parts: first h1 produces its own chapter w/ heading block; keep.
words = lambda h: len(re.sub(r'<[^>]+>', ' ', h).split())
for c in chapters:
    c['words'] = sum(words(blocks[int(b[1:])-1]['html']) for b in c['blocks'] if blocks[int(b[1:])-1]['kind']=='text')

# chunking: text blocks only, ~TARGET words; chunks may span chapters, prefer to break at chapter/heading starts
TARGET = 2000
chunks = []; cur = None
for c in chapters:
    c['title'] = ' '.join(c['title'].split())
for p in parts:
    p['title'] = ' '.join(p['title'].split())
chap_of = {}
for c in chapters:
    for bid in c['blocks']: chap_of[bid] = c
for b in blocks:
    if b['kind'] != 'text': continue
    w = words(b['html'])
    is_head = b['tag'] in ('h1', 'h2', 'h3')
    if cur is None or (cur['words'] + w > TARGET * 1.25) or (is_head and cur['words'] >= TARGET * 0.7):
        cur = {'id': f'c{len(chunks)+1:02d}', 'blocks': [], 'words': 0}
        chunks.append(cur)
    cur['blocks'].append(b['id']); cur['words'] += w
    b['chunk'] = cur['id']

os.makedirs(f'{out}/chunks', exist_ok=True)
for ch in chunks:
    first = blocks[int(ch['blocks'][0][1:])-1]
    last = blocks[int(ch['blocks'][-1][1:])-1]
    c1, c2 = chap_of[first['id']], chap_of[last['id']]
    ch['context'] = f"Part: {next(p for p in parts if p['id']==c1['part'])['title']} | Section: {c1['title']}" + (f" -> {c2['title']}" if c2 is not c1 else '')
    with open(f"{out}/chunks/{ch['id']}.en.txt", 'w', encoding='utf-8') as f:
        f.write(f"##CTX {ch['context']}\n\n")
        for bid in ch['blocks']:
            b = blocks[int(bid[1:])-1]
            f.write(f"@@{bid} {b['tag']}\n{b['html']}\n\n")
json.dump({'parts': parts, 'chapters': chapters, 'blocks': blocks, 'chunks': chunks},
          open(f'{out}/blocks.json', 'w', encoding='utf-8'), ensure_ascii=False)
print(len(parts), 'parts', len(chapters), 'chapters', len(blocks), 'blocks', len(chunks), 'chunks',
      sum(c['words'] for c in chunks), 'words')
