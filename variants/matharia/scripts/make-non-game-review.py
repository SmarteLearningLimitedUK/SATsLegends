"""Index real non-game captures without implying an unavailable approved reference."""
from pathlib import Path
import json, html
root = Path(__file__).resolve().parents[3]
base = root / 'qa-artifacts/concept-recreation'
cards=[]
for group, filename in [('navigation','baseline.json'),('wellbeing','captures.json'),('account','captures.json'),('shared-states','captures.json')]:
    p=base/group/filename
    if not p.exists(): continue
    for r in json.loads(p.read_text()):
        if not r.get('passed'): continue
        image=r.get('screenshot') or f"{r.get('state',r.get('key','screen'))}-{r['profile']}.png"
        if not (base/group/image).exists(): continue
        title=f"{r.get('state',r.get('key','screen'))} · {r['profile']} · {r['width']} × {r['height']}"
        cards.append(f'<figure><a href="../{group}/{image}"><img loading="lazy" src="../{group}/{image}"></a><figcaption>{html.escape(title)}</figcaption></figure>')
out=base/'non-game';out.mkdir(exist_ok=True)
(out/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · menus and wellbeing</title><style>body{margin:24px;background:#061e30;color:#fff2d0;font:16px system-ui}a{color:#ffe39b}main{max-width:1600px;margin:auto}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:22px}figure{margin:0}img{width:100%;height:450px;object-fit:contain;background:#03172e}figcaption{padding:8px;line-height:1.5}</style><main><a href="../index.html">Gameplay reference comparisons</a><h1>Map, menus, wellbeing and account states</h1><p>Actual browser captures. No distinct approved non-game screenshots were present in the supplied manifest/gallery. Existing repository artwork, layouts and integrations are retained with the shared Matharia presentation. Account and purchase screens use isolated fixtures; no real billing or account actions were submitted. Native iOS remains unverified.</p><div class="grid">'''+''.join(cards)+'</div></main></html>',encoding='utf8')
print('Indexed',len(cards),'actual non-game captures')
