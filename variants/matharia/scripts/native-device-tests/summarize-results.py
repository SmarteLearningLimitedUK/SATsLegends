"""Build an honest per-device report/gallery from downloaded native CI artifacts."""
import argparse
from datetime import datetime, timezone
import html
import json
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('artifacts', type=Path)
args = parser.parse_args()
root = args.artifacts.resolve()
root.mkdir(parents=True, exist_ok=True)
profiles = ['compact', 'mini', 'reference', 'large', 'ipad-mini', 'ipad-large']
latest = {}
for path in root.rglob('result.json'):
    row = json.loads(path.read_text())
    profile = row.get('profile')
    if profile not in profiles:
        continue
    row['evidenceFile'] = path.relative_to(root).as_posix()
    if profile not in latest or row.get('finishedAt', row.get('startedAt', '')) > latest[profile].get('finishedAt', latest[profile].get('startedAt', '')):
        latest[profile] = row
rows = [latest.get(profile, {'profile': profile, 'status': 'not_run', 'physicalDeviceVerified': False}) for profile in profiles]
screens = sorted(p.relative_to(root).as_posix() for p in root.rglob('*.png'))
report = {'createdAt': datetime.now(timezone.utc).isoformat(), 'devices': rows, 'screenshotCount': len(screens),
          'allProfilesPassed': len(latest) == len(profiles) and all(row.get('status') == 'passed' for row in rows),
          'physicalHardwareVerified': False, 'minimumIOS164Verified': any(row.get('status') == 'passed' and row.get('runtime', {}).get('version') == '16.4' for row in rows),
          'visualReviewComplete': False,
          'limitations': ['Simulator evidence is separate from physical-device testing.',
                         'Not-run and unavailable devices are not passes.',
                         'UI-flow checks do not establish every mathematical winning path or real account/payment behaviour.',
                         'Screenshots still need visual review.']}
(root / 'summary.json').write_text(json.dumps(report, indent=2) + '\n')
escape = html.escape
table = ''.join(f'<tr><td>{escape(row["profile"])}</td><td>{escape(row["status"])}</td><td>{escape(row.get("device", {}).get("name", "Not verified"))}</td><td>{escape(row.get("runtime", {}).get("version", "Not verified"))}</td><td>{escape(row.get("error", ""))}</td></tr>' for row in rows)
figures = ''.join(f'<figure><a href="{escape(path, quote=True)}"><img loading="lazy" src="{escape(path, quote=True)}" alt="Native simulator screenshot"></a><figcaption>{escape(path)}</figcaption></figure>' for path in screens)
(root / 'index.html').write_text(f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Matharia native device QA</title><style>body{{font:16px system-ui;margin:24px;background:#f4f6f8;color:#10232d}}table{{border-collapse:collapse;background:white;width:100%}}th,td{{border:1px solid #bbc;padding:10px;text-align:left}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}}figure{{margin:0;background:white;padding:12px}}img{{max-width:100%;height:auto}}figcaption{{overflow-wrap:anywhere}}</style><h1>Matharia native simulator QA</h1><p>Physical hardware and iOS 16.4 require separate evidence. These screenshots require visual review.</p><table><tr><th>Profile</th><th>Status</th><th>Device</th><th>iOS</th><th>Error</th></tr>{table}</table><h2>Screenshots ({len(screens)})</h2><main>{figures}</main></html>''', encoding='utf-8')
print(json.dumps({'devices': {row['profile']: row['status'] for row in rows}, 'screenshots': len(screens), 'gallery': str(root / 'index.html')}))
