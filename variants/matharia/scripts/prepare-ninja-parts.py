import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');meta=root/'variants/matharia/reference/next-assets.json';m=json.loads(meta.read_text())
for name,ident,limit in [('props/ninja_rail_v5','93b430fb-9dd7-42d9-8813-4180cf3467c6',1800),('props/ninja_pillar_v5','bc6d49ac-02a4-4a59-b592-61847025af17',800)]:
 src=generated/f'exec-{ident}.png';im=Image.open(src);assert im.mode=='RGBA';a=im.getchannel('A');box=a.point(lambda x:255 if x>32 else 0).getbbox();im=im.crop(box);im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);m['assets']=[v for v in m['assets'] if v['name']!=name];m['assets'].append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size,'alpha:',a.getextrema(),box)
meta.write_text(json.dumps(m,indent=2))
