import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[('backgrounds/bg_takeout_v4','e83457d2-2375-4cb2-8ac6-322009369c1c',2000),('frames/takeout_board_v3','612091cc-b3c7-442b-90e2-78ba76d4e088',1600),('props/takeout_stove_v3','cc0f51ae-6134-463a-abc2-edae00bc3047',1400)]
records=[]
for name,ident,limit in jobs:
 src=generated/f'exec-{ident}.png';im=Image.open(src);box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 records.append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
(root/'variants/matharia/reference/takeout-assets.json').write_text(json.dumps({'processing':'Alpha-margin crop and aspect-preserving WebP export. No masks, repainting or concealment.','assets':records},indent=2))
