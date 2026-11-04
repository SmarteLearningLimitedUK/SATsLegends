"""Summarise recorded checks; do not turn browser evidence into native claims."""
from pathlib import Path
from datetime import datetime, timezone
import json, hashlib, html
root=Path(__file__).resolve().parents[3];base=root/'qa-artifacts/concept-recreation'
def read(p):
    return json.loads(p.read_text()) if p.exists() else []
def count(rows):
    return {'records':len(rows),'passed':sum(bool(r.get('passed')) for r in rows),'failed':sum(not r.get('passed',False) for r in rows)}
manifest=read(root/'docs/concept-recreation/approved-screens.json')['screens']
hud={}
for p in sorted((base/'shared-hud').glob('checks*.json'),key=lambda p:p.stat().st_mtime):
    for r in read(p):
        if isinstance(r,dict) and 'game' in r:hud[(r.get('engine'),r['game'],r.get('profile'))]=r
screens=[]
for s in manifest:
    p=base/s['key'];captures=[]
    for engine in ('chromium','webkit'):captures+=read(p/f'{engine}-visual-captures.json')
    screens.append({'key':s['key'],'title':s['title'],'orientation':s['orientation'],'reference':s['reference'],'route':s['route'],'functional':count(read(p/'checks.json')),'motion':count(read(p/'motion-and-safe-areas.json')),'hud':count([r for r in hud.values() if r['game']==s['key']]),'captures':count(captures),'captureBuilds':sorted(set(r.get('runningBuildRevision','unknown') for r in captures)),'comparison':f"{s['key']}/reference-versus-running.jpg"})
h=hashlib.sha256()
for p in sorted((root/'dist-matharia/assets').iterdir()):
    if p.suffix in ('.js','.css'):h.update(p.name.encode());h.update(p.read_bytes())
totals={kind:{name:sum(s[kind][name]for s in screens)for name in ('records','passed','failed')}for kind in ('functional','motion','hud','captures')}
extra={name:count(read(base/path))for name,path in [('normalNavigation','screen-transitions.json'),('mapNavigation','navigation/checks.json'),('menusAndPersistence','navigation/menu-checks.json'),('pond','wellbeing/pond/checks.json'),('otherWellbeing','wellbeing/activity-checks.json'),('navigationCaptures','navigation/baseline.json'),('wellbeingCaptures','wellbeing/captures.json'),('accountAndQuestCaptures','account/captures.json')]}
report={'generatedAt':datetime.now(timezone.utc).isoformat(),'kind':'Browser evidence and source/copy checks; native iOS unverified','currentBuildRevision':h.hexdigest(),'capturePolicy':'All37 screens were captured in both engines/five profiles. Affected screens were recaptured after isolated final corrections; per-screen build fingerprints identify those runs.','totals':totals,'additional':extra,'buildAndPlatform':read(base/'build-and-platform.json'),'screens':screens,'productionLimits':['No Xcode/simulator/device on Windows: native compilation, safe areas, Dynamic Type, VoiceOver, interruptions and performance unverified.','Native target remains iOS15; Tailwind4/Safari16.4 and container-unit compatibility must be resolved before production.','Account/payment evidence uses isolated fixtures; no live purchase, email or account mutation submitted.'],'assumptions':['Current repository mechanics/content are authoritative.','Explicitly supplied approvals specify game presentation.','No distinct non-game approval existed; repository layouts/artwork retained.','No external legacy assumptions were used.']}
(base/'verification-summary.json').write_text(json.dumps(report,indent=2)+'\n')
table=''.join(f'<tr><td><a href="{r["key"]}/index.html">{html.escape(r["title"])}</a></td><td>{r["orientation"]}</td>'+''.join(f'<td>{r[k]["passed"]}/{r[k]["records"]}</td>'for k in ('functional','motion','hud','captures'))+'</tr>'for r in screens)
limits=''.join('<li>'+html.escape(t)+'</li>'for t in report['productionLimits'])
(base/'handover.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · evidence and handover</title><style>body{background:#061e30;color:#fff3d3;font:16px/1.6 system-ui;margin:24px}main{max-width:1300px;margin:auto}a{color:#ffe29b}table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;padding:10px;border-bottom:1px solid #6c8292}code{overflow-wrap:anywhere}.scroll{overflow:auto}</style><main><a href="index.html">Reference comparisons</a> · <a href="non-game/index.html">Other screens</a><h1>Source and browser evidence</h1><p>The separate source is <code>D:/BrainZilla/GitHub/SATsLegends/variants/matharia</code>. React renders the gameplay inside Capacitor/WKWebView. Native launch/icon/lifecycle/orientation source is in its own Xcode project. No deployment, merge or Apple submission occurred.</p><p>Full implementation inventory, assumptions and detailed discrepancies are in the repository’s <code>docs/concept-recreation/HANDOVER.md</code> and checklists. <a href="verification-summary.json">Recorded counts and build fingerprints</a>.</p><h2>Per-screen evidence</h2><p>Columns are passing/recorded cases. Captures include both browser engines at reference, compact/standard/large phone and iPad sizes. Actual question states and regenerated fine details can differ from the illustrations.</p><div class="scroll"><table><thead><tr><th>Screen</th><th>Orientation</th><th>Functional</th><th>Motion/insets</th><th>Shared HUD</th><th>Captures</th></tr></thead><tbody>'''+table+'''</tbody></table></div><h2>Before production</h2><ul>'''+limits+'''</ul><p>The platform minimum was not silently raised. Sources: <a href="https://tailwindcss.com/docs/compatibility#browser-support">Tailwind browser support</a> and <a href="https://webkit.org/blog/13152/webkit-features-in-safari-16-0/#container-queries">WebKit container-query support</a>.</p><p>No external legacy assumptions were used.</p></main></html>''',encoding='utf8')
print(json.dumps({'totals':totals,'additional':extra},indent=2))
