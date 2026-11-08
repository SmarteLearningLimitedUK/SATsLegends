"""Read run attempts AND result artifacts; a stale queued summary is not test evidence."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import subprocess

parser = argparse.ArgumentParser()
parser.add_argument('runs', nargs='+', type=int)
parser.add_argument('--output', type=Path, default=Path('qa-artifacts/native-device-qa/results'))
parser.add_argument('--download', action='store_true')
args = parser.parse_args()
repo = 'SmarteLearningLimitedUK/SATsLegends'
root = args.output.resolve()
root.mkdir(parents=True, exist_ok=True)

def api(endpoint):
    return json.loads(subprocess.check_output(['gh', 'api', f'repos/{repo}/{endpoint}'], text=True))

all_artifacts = api('actions/artifacts?per_page=100')['artifacts']
rows = []
for run_id in args.runs:
    attempt = api(f'actions/runs/{run_id}/attempts/1')
    artifacts = api(f'actions/runs/{run_id}/artifacts')['artifacts']
    artifacts = {a['id']: a for a in artifacts if a['name'].startswith('matharia-device-')}
    artifacts.update({a['id']: a for a in all_artifacts if (a.get('workflow_run') or {}).get('id') == run_id and a['name'].startswith('matharia-device-')})
    row = {'runId': run_id, 'reportedStatus': attempt['status'], 'reportedConclusion': attempt['conclusion'],
           'url': attempt['html_url'], 'artifacts': [], 'observedAt': datetime.now(timezone.utc).isoformat()}
    for artifact in artifacts.values():
        destination = root / f'run-{run_id}' / str(artifact['id'])
        marker = destination / 'download-complete.json'
        if args.download and not marker.exists() and not artifact['expired']:
            destination.mkdir(parents=True, exist_ok=True)
            subprocess.run(['gh', 'run', 'download', str(run_id), '--repo', repo, '--name', artifact['name'], '--dir', str(destination)], check=True)
            marker.write_text(json.dumps({'artifactId': artifact['id'], 'name': artifact['name']}))
        evidence = []
        if marker.exists():
            for path in destination.rglob('result.json'):
                result = json.loads(path.read_text())
                evidence.append({k: result.get(k) for k in ['profile', 'status', 'phase', 'compiled', 'scope', 'testExitCode', 'error']})
        row['artifacts'].append({'id': artifact['id'], 'name': artifact['name'], 'expired': artifact['expired'], 'evidence': evidence})
    row['summaryMayBeStale'] = row['reportedStatus'] == 'queued' and any(a['evidence'] for a in row['artifacts'])
    rows.append(row)
(root / 'ci-evidence-state.json').write_text(json.dumps(rows, indent=2) + '\n')
print(json.dumps(rows, indent=2))
