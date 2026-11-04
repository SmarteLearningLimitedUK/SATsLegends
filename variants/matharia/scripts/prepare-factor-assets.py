"""Inspected independent factor scenery/actor/dais; alpha trim and aspect-preserving export only."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('backgrounds/bg_factor_v3','exec-bd253a5f-c395-4671-932b-389f62b2a672.png'),('characters/factor_sentinel_v3','exec-27cd9970-1c3b-459a-b11f-d899d8d97a6d.png'),('props/factor_pedestal_v3','exec-a2de4849-2198-4e5e-a0c7-e611371785eb.png')]
rows=[]
for name,filename in specs:
 source=generated/filename;im=Image.open(source);box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();assert box and box[0]>0 and box[1]>0 and box[2]<im.width and box[3]<im.height;im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 rows.append(dict(name=name,source=str(source),alphaBoundsCrop=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
(root/'variants/matharia/reference/factor-assets.json').write_text(json.dumps({'reference':'variants/matharia/reference/approved/factor_frenzy.png','processing':'Independent clean warm clockwork city, polished3D crystal sentinel and shallow stone/brass dais, all inspected before export. Alpha-margin trim and aspect-preserving WebP only; no painting, masks or character/frame distortion. All numbers, locks, clocks, choices and controls are live.','assets':rows},indent=2),encoding='utf8')
