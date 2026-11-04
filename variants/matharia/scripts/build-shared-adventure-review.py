"""Build QA comparisons from unaltered browser screenshots; no production art edits."""
import json
from pathlib import Path
from collections import Counter
from PIL import Image, ImageDraw, ImageFont

out = Path('qa-artifacts/shared-adventure')
before = Path('qa-artifacts/current-ui-states')
font = ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf', 21)
pairs = [
    ('intro', 'Practice briefing · tablet', before/'intro-practice-ipad.png', out/'intro-practice-ipad.png'),
    ('levels', 'Level selection · phone', before/'level-select-phone-top.png', out/'level-select-phone-top.png'),
    ('victory', 'Victory · real five-shipment win', before/'victory-portrait.png', out/'chromium/victory-phone.png'),
    ('retry', 'Retry · real three-mistake failure', before/'failure-landscape.png', out/'chromium/retry-phone.png'),
]
for key, title, old, new in pairs:
    a, b = Image.open(old).convert('RGB'), Image.open(new).convert('RGB')
    assert a.size == b.size, (key, a.size, b.size)
    w, h = a.size
    canvas = Image.new('RGB', (2*w+48, h+75), '#071c2d')
    draw = ImageDraw.Draw(canvas)
    draw.text((16, 10), 'Before', font=font, fill='#e5c57b')
    draw.text((w+32, 10), 'Implemented · running screen', font=font, fill='#e5c57b')
    canvas.paste(a, (16, 52)); canvas.paste(b, (w+32, 52))
    canvas.save(out/f'before-after-{key}.jpg', quality=94)

preview = Image.new('RGB', (1250, 918), '#071c2d')
draw = ImageDraw.Draw(preview)
for i, (label, name) in enumerate([
    ('Mission briefing', 'intro-practice-phone.png'),
    ('Level selection', 'level-select-phone-top.png'),
    ('Victory', 'chromium/victory-phone.png'),
]):
    im = Image.open(out/name).convert('RGB')
    assert im.size == (390,844)
    draw.text((20+i*410,14), label, font=font, fill='#f3d58b')
    preview.paste(im,(20+i*410,54))
preview.save(out/'shared-screens-preview.jpg', quality=95)

manifest = json.loads(Path('docs/concept-recreation/approved-screens.json').read_text())['screens']
records = []
for engine in ['chromium','webkit']:
    for phase in ['', '-remaining', '-results', '-extras']:
        records.extend(dict(r,engine=engine) for r in json.loads((out/f'{engine}{phase}-checks.json').read_text()))
    for phase in ['remaining','results','extras']:
        rows = json.loads((out/f'{engine}-{phase}-checks.json').read_text())
        assert any(r['kind']=='suite' and r['pass'] for r in rows), (engine,phase)
        assert all(r['pass'] for r in rows), (engine,phase)
unique = {}
for r in records:
    key = (r['engine'],r['kind'],r.get('game'),r.get('profile'),r.get('island'),r.get('avatarId'),r.get('orientation'))
    unique[key] = r
counts = Counter(r['kind'] for r in unique.values())
assert counts['intro'] == 222 and counts['start'] == 222
summary = {
    'date':'2026-11-01','passed':True,'briefingAndStartCases':222,
    'games':37,'engines':['Chromium','browser WebKit'],
    'profiles':{'compact':'320×568 / 568×320','phone':'390×844 / 844×390','largePhone':'430×932','tablet':'768×1024 / 1024×768'},
    'uniqueChecksByKind':dict(counts),
    'nativeExecution':'unverified; Windows host','nativeCopy':'verified byte for byte',
    'textScaling':'150% browser text override; not native Dynamic Type',
    'insets':'browser simulation: portrait top44/bottom34; landscape left47/right47/bottom21',
    'priorRetries':'Initial compact board check detected inherited stage scaling; corrected. Partly clipped list rows are intentionally scrollable. The artificial direct tier5 win retains its original prerequisite lock after reload.',
    'sourcePreservation':'source-preservation.json','build':'build-and-platform.json',
}
(out/'verification-summary.json').write_text(json.dumps(summary,indent=2))

intro_evidence = []
for screen in manifest:
    intro_evidence.append({
        'game':screen['key'],'title':screen['title'],'orientation':screen['orientation'],
        'specification':'Approved shared-screen vision; existing game scenery and independent production art.',
        'component':'variants/matharia/src/shared/BriefingScene.tsx',
        'sourceController':'src/components/game-ui/PracticeIntroPopup.tsx',
        'status':'browser verified','evidence':[f'{engine}/{screen["key"]}-intro-{profile}.png' for engine in ['chromium','webkit'] for profile in ['phone','compact','ipad']],
        'checks':['original guide or mock briefing retained','primary and close controls accessible','instruction pane scrolls independently','Start invokes original callback','correct game scenery','no document overflow'],
    })
(out/'screen-checklist.json').write_text(json.dumps(intro_evidence,indent=2))

data = json.dumps([{'key':s['key'],'title':s['title']} for s in manifest])
comparison_html=''.join(f'<section><h2>{title}</h2><a href="before-after-{key}.jpg"><img src="before-after-{key}.jpg" alt="Before and implemented {key}" loading="lazy"></a></section>' for key,title,_,_ in pairs)
html='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia · Shared screen review</title>
<style>*{box-sizing:border-box}body{margin:0;background:#071c2d;color:#fff4d5;font:16px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}h1{margin:0 0 8px;color:#f0cd80}h2{font-size:22px;margin:30px 0 15px}p{max-width:850px;color:#bfd9df}a{color:#eac573}img{display:block;max-width:100%;height:auto}section{margin:28px 0 48px}section>a{display:block}label{display:inline-flex;align-items:center;gap:8px;margin:0 16px 12px 0}select{font:inherit;padding:9px;background:#0a3d52;color:#fff5d9;border:1px solid #a58349;border-radius:6px}.capture{max-height:900px;margin:8px auto;object-fit:contain;background:#041321}.links{display:flex;gap:22px;flex-wrap:wrap}small{color:#b6d6db}</style>
<main><h1>Matharia — shared screen review</h1><p>Implemented intros, level selection, victory and retry. These are actual browser captures. Original educational content, game rules and rewards remain connected to their controllers.</p><p>222 briefing and Start cases across 37 games, three viewport profiles and two browser engines. Real wins, failure/retry, practice replay, progress retention, all four heroes, keyboard focus, enlarged text and simulated safe areas are included. Native iOS execution remains unverified.</p><div class="links"><a href="verification-summary.json">Verification</a><a href="screen-checklist.json">Per-game checklist</a><a href="source-preservation.json">Source preservation</a><a href="build-and-platform.json">Build / native limitations</a></div>
<section><h2>Running shared screens</h2><a href="shared-screens-preview.jpg"><img src="shared-screens-preview.jpg" alt="Current running intro, levels and victory"></a><h2>Retry</h2><img src="chromium/retry-phone.png" alt="Actual retry screen"></section>
'''+comparison_html+'''
<section><h2>Every game briefing</h2><label>Game<select id="game"></select></label><label>Viewport<select id="profile"><option value="phone">Phone</option><option value="compact">Compact phone</option><option value="ipad">iPad</option></select></label><label>Engine<select id="engine"><option value="chromium">Chromium</option><option value="webkit">Browser WebKit</option></select></label><a id="full"><img class="capture" id="capture" alt="Selected actual briefing"></a><small>Instruction content scrolls within the panel where needed. This is browser evidence, not simulator/device certification.</small></section>
<section><h2>Four independent celebration sprites</h2><img src="victory-asset-inspection.jpg" alt="Barratt deer, Bran red dragon, Mochi panda, Vex green fox"><h2>Compact phone</h2><img class="capture" src="chromium/board-final-compact-1.png" alt="Compact phone level selection"><h2>Simulated safe areas and enlarged text</h2><img class="capture" src="chromium/intro-enlarged-safe-landscape.png" alt="Browser text enlargement and simulated camera/home insets"></section></main>
<script>const games='''+data+''';const game=document.getElementById('game'),profile=document.getElementById('profile'),engine=document.getElementById('engine'),capture=document.getElementById('capture'),full=document.getElementById('full');for(const g of games){const o=document.createElement('option');o.value=g.key;o.textContent=g.title;game.append(o)}function update(){const src=engine.value+'/'+game.value+'-intro-'+profile.value+'.png';capture.src=src;full.href=src}for(const e of[game,profile,engine])e.addEventListener('change',update);update();</script></html>'''
(out/'index.html').write_text(html,encoding='utf-8')
print(json.dumps(summary,indent=2))
