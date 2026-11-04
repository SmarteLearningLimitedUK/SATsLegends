import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[('backgrounds/bg_zombies_v3','f140c387-e50d-446e-994a-d445fa6dcc80',2000),('buttons/emerald_answer_wide_v3','1e2c03d4-2340-4838-a34b-607771a7d238',1600)]
records=[]
for name,ident,limit in jobs:
 src=generated/f'exec-{ident}.png';im=Image.open(src);box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
 dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 records.append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
 print(name,im.size)
(root/'variants/matharia/reference/zombie-assets.json').write_text(json.dumps({'processing':'Alpha-margin crop and aspect-preserving WebP export; no masks, painting or concealment.','assets':records},indent=2))
