"""Re-export inspected independent suspect/evidence atlases; no semantic image edits."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
for name in ['detective-suspects','detective-evidence']:
 p=root/f'variants/matharia/reference/{name}.json';metadata=json.loads(p.read_text(encoding='utf8'))
 for row in metadata['assets']:
  atlas=Image.open(row['source']);w,h=atlas.size;alpha=atlas.getchannel('A')
  assert alpha.crop((w//2-3,0,w//2+3,h)).getextrema()[1]<=3 and alpha.crop((0,h//2-3,w,h//2+3)).getextrema()[1]<=3
  im=atlas.crop(row['atlasCell']);box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();assert tuple(box)==tuple(row['alphaBoundsCrop']);im=im.crop(box)
  if name=='detective-evidence':im.thumbnail((256,256),Image.Resampling.LANCZOS)
  assert list(im.size)==row['dimensions'];dest=root/row['production'];im.save(dest,quality=95,method=6,exact=True);row['bytes']=dest.stat().st_size;row['sha256']=hashlib.sha256(dest.read_bytes()).hexdigest()
 p.write_text(json.dumps(metadata,indent=2),encoding='utf8')
