import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
for metadata,name,ident,limit in [('next-assets.json','frames/pvp_question_v3_hollow','60939f3c-9328-497e-8d39-793a29bb1df3',1600),('rocket-assets.json','gameplay/rocket_answer_v3','3a5f9ce5-693c-4447-9c60-dcd31394ecf7',1000)]:
 meta=root/f'variants/matharia/reference/{metadata}';m=json.loads(meta.read_text());src=generated/f'exec-{ident}.png';im=Image.open(src);a=im.getchannel('A');box=a.point(lambda x:255 if x>16 else 0).getbbox();im=im.crop(box);im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);m['assets']=[r for r in m['assets'] if r['name']!=name];m['assets'].append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));meta.write_text(json.dumps(m,indent=2));print(name,im.size)
