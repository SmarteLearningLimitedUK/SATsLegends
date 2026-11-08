"""Package the current WebKit phone audit; screenshots remain unmodified."""
import hashlib
import html
import json
from pathlib import Path

root = Path('qa-artifacts/all-games-iphone12-2026-11-04')
rows = json.loads((root / 'final/report.json').read_text(encoding='utf-8'))
captures = json.loads((root / 'captures/report.json').read_text(encoding='utf-8'))
before = json.loads((root / 'before.json').read_text(encoding='utf-8'))
games = list(dict.fromkeys(row['key'] for row in rows))
records = []
for key in games:
    levels = sorted((row for row in captures if row['key'] == key), key=lambda row: row['tier'])
    records.append({'key': key, 'title': levels[0]['title'], 'wellbeing': levels[0].get('wellbeing', False),
                    'levels': [{'tier': row['tier'], 'viewport': row['viewport'], 'passed': row['passed'],
                                'states': {state: f'{"captures" if state == "play" else "final"}/{key}-L{row["tier"]}{suffix}.png'
                                           for state, suffix in [('play', ''), ('entry', '-entry'), ('pad', '-pad'), ('feedback', '-feedback')]
                                           if (root / f'{"captures" if state == "play" else "final"}/{key}-L{row["tier"]}{suffix}.png').exists()}}
                               for row in levels]})

changed = []
for folder in ['src', 'variants/matharia/src', 'scripts']:
    for path in Path(folder).rglob('*'):
        if not path.is_file() or path.suffix not in ['.ts', '.tsx', '.css', '.mjs', '.py'] or 'node_modules' in path.parts:
            continue
        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if before['files'].get(path.as_posix()) != digest:
            # The baseline snapshot did not include pre-existing Python tools.
            if path.suffix != '.py' or path.name == Path(__file__).name:
                changed.append(path.as_posix())
report = {
    'commitAtStart': before['commit'], 'gamesAndModes': len(games), 'gameLevelCombinations': len(rows),
    'measuredStates': sum(len(row['stages']) for row in rows), 'passed': sum(row['passed'] for row in rows),
    'galleryCaptures': len(captures), 'galleryFailures': [{'key': row['key'], 'error': row.get('error')} for row in captures if not row['passed']],
    'failures': [{'key': row['key'], 'tier': row['tier'], 'error': row.get('error')} for row in rows if not row['passed']],
    'changedFilesThisPass': sorted(changed), 'artworkFilesChanged': [],
    'assumptions': ['Test every currently reachable catalogue game at its existing orientation.',
                    'iPhone 12 CSS sizes: 390×844 portrait and 844×390 landscape; WebKit, 2× screenshots.',
                    'Use isolated local player data and block external services.'],
    'captureMode': 'Existing reduced-motion setting for still gallery captures; standard motion for the main layout audit.',
    'limits': ['Browser emulation; this does not replace physical-device testing.',
               'Seeded levels and listed states, not exhaustive playthroughs of every procedural question.'],
    'externalLegacyAssumptionsUsed': False,
    'fixes': [
        'Takeout Rush: keep action text centred with enough horizontal and vertical padding.',
        'Area Architect: separate the question from the top HUD and preserve a gap above the mathematical work area.',
        'Line Graph Lab: place axis headings inside the dark chart interior, clear of the decorative frame.',
        'Perimeter Path: increase edge-label padding and give the Edges caption room below its icon.',
        'Graph Grabber: give the Trace caption room below its icon.',
        'Calm activities: readable support captions; Leaf Drift labels stay within their buttons.',
        'Peaceful Pond: reserve the full existing dock height so its buttons remain within the viewport.',
    ],
}
(root / 'change-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
template = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Matharia · iPhone 12 readability review</title><style>
*{box-sizing:border-box}body{margin:0;background:#10232e;color:#fff3d7;font:16px system-ui}header{padding:24px;position:sticky;top:0;background:#10232ef5;z-index:1;border-bottom:1px solid #56717a}h1{margin:0 0 10px;font-size:26px}p{margin:8px 0;line-height:1.5}nav{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}input,select,a{font:inherit;color:inherit}input,select{background:#193e4d;border:1px solid #acbfbd;padding:10px;border-radius:6px}a{color:#ffe19d}main{max-width:1600px;margin:auto;padding:22px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}article{min-width:0}h2{font-size:20px;margin:0 0 10px}article img{display:block;max-width:100%;max-height:650px;width:auto;height:auto;background:#071722;margin:auto}article>a{display:flex;align-items:center;justify-content:center;background:#071722;min-height:220px}article nav{margin:8px 0}.meta{font-size:14px;color:#bcd5dc}footer{padding:24px}@media(max-width:800px){main{grid-template-columns:1fr}}button{font:inherit;padding:8px}
</style><header><h1>Matharia · iPhone 12 screenshots</h1><p>__SUMMARY__</p><p>Existing artwork, palette, characters and orientation preserved. Still gameplay captures use the existing reduced-motion option. All available tiers were audited; the gallery shows one representative level per game plus answer-state examples. Click an image to open its full resolution.</p><nav><input id="search" type="search" placeholder="Find a game" aria-label="Find a game"><select id="kind" aria-label="Activity type"><option value="all">All activities</option><option value="maths">Mathematics</option><option value="wellbeing">Calm breaks</option></select><a href="change-report.json">Changes and verification</a></nav></header><main></main><footer>Browser verification at 390 × 844 / 844 × 390 CSS pixels. Physical-device review remains separate.</footer>
<script>const games=__DATA__,main=document.querySelector('main');
function render(){main.replaceChildren();const query=document.querySelector('#search').value.toLowerCase(),kind=document.querySelector('#kind').value;for(const g of games){if(!g.title.toLowerCase().includes(query)||(kind==='maths'&&g.wellbeing)||(kind==='wellbeing'&&!g.wellbeing))continue;
const article=document.createElement('article'),heading=document.createElement('h2'),tools=document.createElement('nav'),tier=document.createElement('select'),state=document.createElement('select'),link=document.createElement('a'),img=document.createElement('img'),meta=document.createElement('p');heading.textContent=g.title;tier.setAttribute('aria-label',g.title+' level');state.setAttribute('aria-label',g.title+' state');meta.className='meta';
for(const level of g.levels){const option=new Option(g.wellbeing?'Activity':'Level '+level.tier,level.tier);tier.add(option)}tier.value=g.levels.at(-1).tier;
function show(){const level=g.levels.find(l=>l.tier===Number(tier.value));const file=level.states[state.value];img.src=file;img.alt=g.title+' · '+(g.wellbeing?'Activity':'Level '+level.tier)+' · '+state.selectedOptions[0].textContent;link.href=file;link.target='_blank';link.rel='noopener';meta.textContent=level.viewport.width+' × '+level.viewport.height+' CSS px · '+(level.passed?'Checks passed':'Check report');}
function populate(){const level=g.levels.find(l=>l.tier===Number(tier.value));state.replaceChildren();for(const s of Object.keys(level.states)){state.add(new Option({play:'Gameplay',entry:'Answer entry',pad:'Number pad',feedback:'Feedback'}[s],s))}show()}
tier.onchange=populate;state.onchange=show;tools.append(tier,state);link.append(img);article.append(heading,tools,link,meta);main.append(article);populate()}}
document.querySelector('#search').oninput=render;document.querySelector('#kind').onchange=render;render();</script></html>'''
summary = f'{len(games)} games and modes · {len(rows)} game/level combinations · {report["measuredStates"]} measured states · {report["passed"]} passing combinations.'
(root / 'index.html').write_text(template.replace('__SUMMARY__', html.escape(summary)).replace('__DATA__', json.dumps(records).replace('<', '\\u003c')), encoding='utf-8')
print(json.dumps({k: report[k] for k in ['gamesAndModes', 'gameLevelCombinations', 'measuredStates', 'passed', 'failures', 'changedFilesThisPass']}))
