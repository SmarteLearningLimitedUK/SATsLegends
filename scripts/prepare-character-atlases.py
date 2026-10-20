"""Measure continuous NPC sequences; source artwork stays unchanged."""
import json
import subprocess
import sys
from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parent.parent
identity = sys.argv[1] if len(sys.argv)>1 else 'goblin'
if identity not in ('goblin','rhino'):
    raise ValueError('Unsupported character identity')
qa = root / ('qa-artifacts/goblin-motion' if identity=='goblin' else 'qa-artifacts/place-value-motion')
manifest = json.loads((qa / 'generation.json').read_text('utf-8'))
layouts = {}
errors = []
for spec in manifest['sheets']:
    spec.update(kind='characters', version='v3', key=identity+'-'+spec['key'])
    prompt_file = qa / f"{spec['kind']}-{spec['key']}.prompt.txt"
    prompt_file.write_text(spec['prompt'], 'utf-8')
    path = root / 'src/assets/game-visions' / spec['kind'] / f"{spec['key']}-{spec['version']}.webp"
    sidecar = path.with_suffix('.prompt.json')
    prior = json.loads(sidecar.read_text('utf-8')) if sidecar.exists() else {}
    if not path.exists() or prior.get('source')!=spec['source'] or prior.get('prompt')!=spec['prompt']:
        subprocess.run([sys.executable, str(root / 'scripts/prepare-vision-runtime-assets.py'),
                        spec['kind'], spec['key'], spec['source'], '@' + str(prompt_file), spec['version']], check=True)
    with Image.open(path) as image:
        alpha = image.getchannel('A')
        if alpha.getextrema()[0] != 0:
            raise ValueError(f'{path}: missing transparent background')
        width, height = image.size
        # Locate actual silhouettes instead of assuming that generated gutters
        # lie on exact integer grid boundaries. This keeps horns and feet whole.
        sample = np.asarray(alpha.resize((width // 2, height // 2), Image.Resampling.NEAREST)) > 160
        seen = np.zeros_like(sample)
        components = []
        sh, sw = sample.shape
        for y, x in zip(*np.nonzero(sample)):
            if seen[y, x]:
                continue
            stack = [(int(x), int(y))]
            seen[y, x] = True
            left = right = int(x)
            top = bottom = int(y)
            count = 0
            spans = {}
            while stack:
                px, py = stack.pop()
                count += 1
                left, right = min(left, px), max(right, px)
                top, bottom = min(top, py), max(bottom, py)
                span = spans.setdefault(py, [px, px])
                span[0], span[1] = min(span[0], px), max(span[1], px)
                for nx, ny in ((px-1, py), (px+1, py), (px, py-1), (px, py+1)):
                    if 0 <= nx < sw and 0 <= ny < sh and sample[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        stack.append((nx, ny))
            components.append((count, left, top, right, bottom, spans))
        actors = sorted(components, key=lambda item:item[0], reverse=True)[:20]
        if len(actors) != 20 or min(a[0] for a in actors) < 1200:
            errors.append(f'{path}: expected twenty separate full-body silhouettes')
            print('INVALID',spec['key'],spec['kind'],[(a[0],a[1:5]) for a in actors],flush=True)
            continue
        actors.sort(key=lambda a: (a[2] + a[4]) / 2)
        ordered = []
        for row in range(4):
            ordered.extend(sorted(actors[row*5:row*5+5], key=lambda a: (a[1] + a[3]) / 2))
        regions = []
        clips = []
        anchors = []
        for _, left, top, right, bottom, spans in ordered:
            x0, y0 = max(0, left*2-3), max(0, top*2-3)
            x1, y1 = min(width, (right+1)*2+3), min(height, (bottom+1)*2+3)
            regions.append([x0, y0, x1-x0, y1-y0])
            soles = [span for py,span in spans.items() if py >= bottom-(bottom-top)*.09]
            anchor = (min(s[0] for s in soles)+max(s[1] for s in soles)+1)
            anchors.append([(anchor-x0)/(x1-x0), ((bottom+1)*2-y0)/(y1-y0)])
            # A tight silhouette envelope excludes fragments of a neighbouring
            # pose even where their rectangular bounds overlap. Artwork is not
            # edited; the player uses this polygon as its sampling window.
            left_edge, right_edge = [], []
            for py in range(top, bottom+1, 2):
                strip = [spans[y] for y in (py,py+1) if y in spans]
                if not strip:
                    continue
                lx = max(0, min(p[0] for p in strip)*2-2-x0)/(x1-x0)*100
                rx = min(x1-x0, max(p[1] for p in strip)*2+4-x0)/(x1-x0)*100
                yt = max(0, py*2-y0-(2 if py==top else 0))/(y1-y0)*100
                yb = min(y1-y0, (py+2)*2-y0+(2 if py+2>bottom else 0))/(y1-y0)*100
                left_edge.extend([(lx,yt),(lx,yb)])
                right_edge.extend([(rx,yt),(rx,yb)])
            clips.append(','.join(f'{x:.2f}% {y:.2f}%' for x,y in left_edge+list(reversed(right_edge))))
        if any(region[3] < height/4*.65 for region in regions):
            errors.append(f'{path}: incomplete actor detected')
            continue
        layouts[f"{spec['kind']}/{spec['key']}-{spec['version']}"] = {
            'width': width, 'height': height, 'columns': 5, 'rows': 4,
            'frames': regions,
            'clips': clips,
            'anchors': anchors,
        }
        spec['file'] = path.relative_to(root).as_posix()
        spec['frameCount'] = len(regions)
        print(spec['key'], spec['kind'], '20 complete transparent frames')

if errors:
    raise ValueError('\n'.join(errors))
(root / f'src/games/{identity}AtlasLayout.ts').write_text(
    '// Measured by scripts/prepare-character-atlases.py; source artwork is unchanged.\n'
    f'export interface {identity.title()}AtlasLayout {{ width:number; height:number; columns:number; rows:number; frames:number[][]; clips:string[]; anchors:number[][]; }}\n'
    f'export const {identity.upper()}_ATLAS_LAYOUT: Record<string,{identity.title()}AtlasLayout> = '
    + json.dumps(layouts, separators=(',', ':')) + ';\n', 'utf-8')
(qa / 'manifest.json').write_text(json.dumps(manifest, indent=2), 'utf-8')
if errors:
    raise ValueError('\n'.join(errors))
