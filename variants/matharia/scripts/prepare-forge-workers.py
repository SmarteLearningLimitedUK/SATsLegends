"""Reproduce the inspected worker cutouts from their recorded rectangular atlas regions."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
manifest=root/'variants/matharia/reference/forge-worker-assets.json'
data=json.loads(manifest.read_text(encoding='utf8'))
for asset in data['assets']:
    source=Image.open(asset['source']).convert('RGBA')
    tile=source.crop(asset['atlasRegion'])
    tile=tile.crop(asset['alphaBoundsCrop'])
    assert list(tile.size)==asset['dimensions'],asset['name']
    dest=root/asset['production'];tile.save(dest,quality=95,method=6,exact=True)
    asset['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
manifest.write_text(json.dumps(data,indent=2),encoding='utf8')
