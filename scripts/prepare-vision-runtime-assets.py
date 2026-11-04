"""Export built-in ImageGen results for Vite, preserving source originals and alpha."""
import json
import sys
import os
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
folder = root / 'src/assets/game-visions'
folder.mkdir(parents=True, exist_ok=True)
def collect():
    assets = [json.loads(p.read_text('utf-8')) for p in sorted(folder.glob('*/*.prompt.json'))]
    temporary = folder / f'manifest-{os.getpid()}.tmp'
    temporary.write_text(json.dumps({'tool': 'Built-in image_gen', 'assets': assets}, indent=2), 'utf-8')
    temporary.replace(folder / 'asset-prompts.json')
if sys.argv[1] == '--manifest':
    collect()
    sys.exit(0)
kind, key, source, prompt = sys.argv[1:5]
version = sys.argv[5] if len(sys.argv) > 5 else 'v1'
if prompt.startswith('@'):
    prompt = Path(prompt[1:]).read_text('utf-8')
target = folder / kind / f'{key}-{version}.webp'
target.parent.mkdir(parents=True, exist_ok=True)
with Image.open(source) as image:
    image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
    if kind == 'environments':
        image.thumbnail((1800, 1100), Image.Resampling.LANCZOS)
    image.save(target, 'WEBP', quality=94, method=6)
    dimensions = list(image.size)
record = {'kind': kind, 'key': key, 'file': target.relative_to(folder).as_posix(), 'source': source, 'prompt': prompt, 'dimensions': dimensions, 'bytes': target.stat().st_size}
sidecar = target.with_suffix('.prompt.json')
temporary = sidecar.with_suffix('.tmp')
temporary.write_text(json.dumps(record, indent=2), 'utf-8')
temporary.replace(sidecar)
collect()
print(json.dumps({'key': key, 'kind': kind, 'dimensions': dimensions, 'bytes': target.stat().st_size}))
