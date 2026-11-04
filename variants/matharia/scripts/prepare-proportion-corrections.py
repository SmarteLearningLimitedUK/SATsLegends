import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[('frames/concept_nav_medium_v3','48a27e34-64b0-4864-982a-938f0e9d5d65',1100),('gameplay/pvp_socket_v4','eeefed4e-8dd9-49c9-8b84-240ed29c9730',600)]
meta=root/'variants/matharia/reference/next-assets.json';m=json.loads(meta.read_text())
for name,ident,limit in jobs:
 src=generated/f'exec-{ident}.png';im=Image.open(src);assert im.mode=='RGBA';box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box);im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 m['assets']=[a for a in m['assets'] if a['name']!=name];m['assets'].append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size,box)
meta.write_text(json.dumps(m,indent=2))
