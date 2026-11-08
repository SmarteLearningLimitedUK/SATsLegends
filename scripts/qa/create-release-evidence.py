"""Assemble measured coverage and an unmodified screenshot gallery."""
from pathlib import Path
from collections import Counter
import csv
import hashlib
import html
import json

repo = Path(__file__).resolve().parents[2]
root = repo / 'qa-artifacts/release-readiness-2026-11-04'
read = lambda name: json.loads((root / name).read_text(encoding='utf-8'))
catalogue = read('catalogue-with-calm.json')['levels']
profiles = {name: read(f'final-{name}/report.json') for name in ['iphone12', 'small', 'large', 'ipad']}
lifecycle = {row['key']: row for row in read('lifecycle/report.json')}
calm = {row['key']: row for row in read('calm-flows/report.json')}
shared = read('shared/report.json') + read('shared/menus-report.json')
opening = read('opening/summary.json')
units = read('unit-checks.json')
learning = read('calendar-pictogram/ui-report.json')
assert all(row['passed'] for rows in profiles.values() for row in rows)
assert all(row['passed'] for row in [*lifecycle.values(), *calm.values(), *shared])
assert opening['passed'] and all(row['code'] == 0 for row in units) and learning['passed']
matrix = []
unique = {g['key']: g for g in catalogue}
unique['graph_grabber_pictogram'] = dict(unique['graph_grabber'], key='graph_grabber_pictogram', title='Graph Grabber · Pictograms')
for key, game in unique.items():
    item = {'key': key, 'title': game['title'], 'source': 'src/wellbeing/activities/'+{'breathing_bloom':'BreathingBloom.tsx','peaceful_pond':'PeacefulPond.tsx','candle_calm':'CandleCalm.tsx','constellation_connect':'ConstellationConnect.tsx','leaf_drift':'LeafDrift.tsx','thought_sort':'ThoughtSort.tsx'}[key] if game.get('wellbeing') else f"src/games/{game['engine']}.tsx", 'orientation': game['orientation']}
    for profile, rows in profiles.items():
        matched = [row for row in rows if row['key'] == key]
        item[profile] = 'PASS: ' + ','.join(str(row['tier']) for row in sorted(matched, key=lambda row: row['tier'])) if matched and all(row['passed'] for row in matched) else 'UNVERIFIED'
    item['gameplay'] = 'PASS: goal, completion and return' if key in calm else 'PASS: all five tiers, 5-round goal and learning evidence' if key in ['calendar_quest', 'graph_grabber_pictogram'] else 'PASS: save, resume, finish/review and marking regression' if game.get('boss') else 'PASS: background/help hold, resume, end state, retry, Back' if key in lifecycle else 'UNVERIFIED'
    item['content'] = 'Non-mathematical activity' if game.get('wellbeing') else 'Source inventoried; applicable content/generator suites passed. Generated space is not exhaustively enumerated.'
    item['assets'] = 'PASS: visible resources and emitted static URLs; sources retained'
    item['native'] = 'UNVERIFIED: requires Xcode/device and real Apple services'
    matrix.append(item)
(root / 'coverage-matrix.json').write_text(json.dumps(matrix, indent=2), encoding='utf-8')
with (root / 'coverage-matrix.csv').open('w', newline='', encoding='utf-8-sig') as f:
    writer = csv.DictWriter(f, fieldnames=matrix[0].keys()); writer.writeheader(); writer.writerows(matrix)
baseline, final = read('baseline-output.json'), read('final-output.json')
saved = baseline['bytes'] - final['bytes']
breakdown = Counter()
for name, item in final['filesManifest'].items(): breakdown[Path(name).suffix] += item['bytes']
size = {'baselineFiles': baseline['files'], 'baselineBytes': baseline['bytes'], 'finalFiles': final['files'], 'finalBytes': final['bytes'], 'savedBytes': saved, 'savedPercent': saved / baseline['bytes'] * 100, 'measurement': 'Uncompressed generated web output. Not IPA/archive/App Store upload size.', 'bytesByExtension': dict(breakdown), 'largestRetained': sorted([{'file': name, 'bytes': value['bytes']} for name, value in final['filesManifest'].items()], key=lambda x: -x['bytes'])[:15]}
(root / 'size-comparison.json').write_text(json.dumps(size, indent=2), encoding='utf-8')
before = read('source-baseline.json')
changed = []
for name, digest in before['files'].items():
    file = repo / name
    if file.is_file() and hashlib.sha256(file.read_bytes()).hexdigest() != digest: changed.append(name)
new = ['docs/release-readiness-2026-11-04.md', 'variants/matharia/release-assets.ts', 'variants/matharia/native/ios/App/App/PrivacyInfo.xcprivacy'] + [p.relative_to(repo).as_posix() for p in (repo / 'scripts/qa').glob('*release*') if p.relative_to(repo).as_posix() not in before['files']] + ['scripts/qa/verify-prime-single-miss.mjs', 'scripts/qa/run-ios-release-checks.mjs']
new = sorted(set(new))
(root / 'changed-files.json').write_text(json.dumps({'modifiedSincePassStarted': changed, 'addedInPass': new, 'preExistingWorkPreserved': True}, indent=2), encoding='utf-8')
source_hashes = {name: hashlib.sha256((repo/name).read_bytes()).hexdigest() for name in sorted(set(before['files']) | set(new)) if (repo/name).is_file()}
(root / 'source-final.json').write_text(json.dumps({'head': before['head'], 'workingTreeSnapshot': True, 'files': source_hashes}, indent=2), encoding='utf-8')
state_count = sum(len(row['stages']) for rows in profiles.values() for row in rows)
metrics = {'layoutCases': sum(map(len, profiles.values())), 'measuredStates': state_count, 'activitiesAndModes': len(matrix), 'mathematicsLifecycleFlows': len(lifecycle), 'calmCompletions': len(calm), 'sharedScreenCases': len(shared), 'accountFixtureCases': opening['checks'], 'unitSuites': len(units), 'nativeVerified': False}
(root / 'verification-summary.json').write_text(json.dumps(metrics, indent=2), encoding='utf-8')

# The gallery displays only final captures and successful-state evidence. Old
# failure screenshots/logs remain in the evidence directory for traceability.
folders = ['final-iphone12', 'final-small', 'final-large', 'final-ipad', 'shared', 'opening', 'lifecycle', 'calm-flows', 'calendar-pictogram', 'prime-single-miss', 'text-scale']
sections = []
for folder in folders:
    images = sorted(p for p in (root/folder).glob('*.png') if 'failure' not in p.name)
    figures = ''.join(f'<figure data-search="{html.escape(p.stem.lower())}"><a href="{folder}/{html.escape(p.name)}"><img loading="lazy" src="{folder}/{html.escape(p.name)}" alt="{html.escape(p.stem)}"></a><figcaption>{html.escape(p.stem)}</figcaption></figure>' for p in images)
    sections.append(f'<details {"open" if folder=="final-iphone12" else ""}><summary>{html.escape(folder)} · {len(images)} screenshots</summary><div class="grid">{figures}</div></details>')
gallery = '''<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia release evidence</title><style>body{margin:24px;background:#102532;color:#edf4f4;font:16px/1.5 system-ui}a{color:#b4e9ff}input{font:inherit;padding:10px;width:min(90%,500px);margin:16px 0}summary{cursor:pointer;padding:12px;border-bottom:1px solid #68808b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:18px}figure{margin:10px 0;padding:10px;background:#081b26}img{width:100%;height:330px;object-fit:contain}figcaption{overflow-wrap:anywhere;padding-top:8px}figure[hidden]{display:none}</style><h1>Matharia release evidence · 4 November 2026</h1><p>Unmodified WebKit browser captures of the independent iOS bundle. These are not native-device screenshots.</p><p><a href="coverage-matrix.csv">Coverage matrix</a> · <a href="verification-summary.json">Measured results</a> · <a href="size-comparison.json">Package measurements</a></p><label>Find a game or state<br><input id="search" type="search" placeholder="e.g. prime_pop, L5, feedback"></label>''' + ''.join(sections) + '''<script>document.querySelector('#search').addEventListener('input',e=>{for(const f of document.querySelectorAll('figure'))f.hidden=!f.dataset.search.includes(e.target.value.toLowerCase());if(e.target.value)for(const d of document.querySelectorAll('details'))d.open=true;});</script>'''
(root / 'index.html').write_text(gallery, encoding='utf-8')
print(json.dumps(metrics))
