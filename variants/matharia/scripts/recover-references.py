"""Recover only the concept gallery explicitly identified in the current request."""
import hashlib
import json
from pathlib import Path
from shutil import copy2

ROOT = Path(__file__).resolve().parents[3]
GALLERY = Path('C:/Users/samva/.codex/visualizations/2026/10/26/sats-legends-aaa-concepts')
VARIANT = ROOT / 'variants/matharia'
DEST = VARIANT / 'reference/approved'
DOCS = ROOT / 'docs/concept-recreation'
DEST.mkdir(parents=True, exist_ok=True)
DOCS.mkdir(parents=True, exist_ok=True)
source = json.loads((GALLERY / 'manifest.json').read_text())
selections = json.loads((GALLERY / 'final-selections.json').read_text())
catalog = json.loads((ROOT / 'qa-artifacts/current-game-screenshots/catalog.json').read_text())
catalog = catalog if isinstance(catalog, list) else catalog.get('games', [])
routes = {g['key']: g['route'] for g in catalog}
screens = []
for item in source['images']:
    key = item['key']
    selected = selections.get(key, item['file'])
    src = GALLERY / selected
    dst = DEST / src.name
    copy2(src, dst)
    screens.append({
        **{k: item[k] for k in ['key', 'title', 'orientation', 'dimensions', 'composition']},
        'reference': dst.relative_to(ROOT).as_posix(),
        'source': str(src),
        'sha256': hashlib.sha256(src.read_bytes()).hexdigest(),
        'revision': 'final selection' if key in selections else 'gallery selection',
        'route': routes.get(key),
        'regions': None,
    })
match = next(s for s in screens if s['key'] == 'match3_equivalence')
match['regions'] = {
    'coordinateSystem': 'normalized x,y,width,height; measured against 853x1844 v2',
    'pause': [.875, .004, .115, .058],
    'hud': [.035, .065, .925, .071],
    'question': [.112, .151, .795, .065],
    'status': [.049, .227, .36, .039],
    'hero': [.012, .267, .45, .231],
    'board': [.031, .494, .944, .384],
    'navigation': [.05, .922, .91, .06],
}
manifest = {
    'sourceStatus': 'Recovered from the gallery and final-selections explicitly named in the current request. The previously named approved-screens.json was absent in both checkouts.',
    'gallery': str(GALLERY / 'index.html'),
    'screens': screens,
}
(DOCS / 'approved-screens.json').write_text(json.dumps(manifest, indent=2) + '\n')
checklist = {
    'nativeVerification': 'Unavailable on this Windows host; no simulator or device claims.',
    'screens': [{
        'key': s['key'], 'reference': s['reference'], 'route': s['route'],
        'rendering': 'React / GameSetStage; Capacitor WKWebView on iOS',
        'requiredAssets': [], 'implementation': 'pending reference-specific correction',
        'comparisons': [], 'functionalChecks': [], 'deviceChecks': [],
        'remainingDefects': ['Not yet visually verified against recovered approved reference.'],
    } for s in screens],
}
checklist_path = DOCS / 'screen-checklist.json'
if not checklist_path.exists():
    checklist_path.write_text(json.dumps(checklist, indent=2) + '\n')
print(f'Recovered {len(screens)} references, including {len(selections)} final revisions.')
