"""Aspect-preserving exports of inspected independent statistics scenery and props."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
prompts=json.loads((root/'variants/matharia/reference/statistics-prompts.json').read_text(encoding='utf8'))['prompts']
records=[]
for p in prompts:
    name=('buttons/' if p['key']=='amber_answer_v4' else 'frames/' if p['key']=='chart_wood_hollow_v4' else 'props/' if p['transparent'] else 'backgrounds/')+p['key'];source=generated/p['output'];dest=root/f'variants/matharia/assets/png/{name}@2x.webp'
    im=Image.open(source);box=None
    if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
        box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
    im.thumbnail((2048,2048),Image.Resampling.LANCZOS);im.save(dest,quality=95,method=6,exact=True)
    records.append(dict(name=name,source=str(source),alphaBoundsCrop=box,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    print(name,im.size)
(root/'variants/matharia/reference/statistics-assets.json').write_text(json.dumps({'processing':'Alpha-margin trim and aspect-preserving WebP export only; no painting, masks or stretching. Engine nameplate, reading aperture and lower circular bezel are blank; all text, readings and Scan input are live DOM elements. Exterior engine sample pixels were checked: brown hidden RGB outside the silhouette has alpha0.','assets':records},indent=2),encoding='utf8')
