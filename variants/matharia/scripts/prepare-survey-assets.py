"""Prepare the inspected independent survey/scale props; no painting or scene masks."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('backgrounds/bg_conversion_v3','9c56b067-ae34-4163-b822-16654c5453c6'),('props/coordinates_console_v3','b11f3956-953c-4c49-8b93-3d422fddc802'),('props/perimeter_board_v4','a658a90f-7642-4539-892b-96f767e544c8'),('props/scale_housing_v3','b215f2f9-424b-4932-9b50-f78cc5879536'),('props/scale_tray_v4','9a4f9dcd-476b-4121-bc3e-b141f03f4215')]
records=[]
for name,ident in specs:
    source=generated/f'exec-{ident}.png';dest=root/f'variants/matharia/assets/png/{name}@2x.webp'
    im=Image.open(source);box=None
    if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
        box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
    im.thumbnail((2048,2048),Image.Resampling.LANCZOS);im.save(dest,quality=95,method=6,exact=True)
    record=dict(name=name,source=str(source),alphaBoundsCrop=box,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest())
    if name=='props/scale_housing_v3':record['dial']={'centre':[.5,.53],'radius':[.275,.265],'measurement':'Proportional bounds of the actual blank ivory dial, inspected before integration.'}
    records.append(record);print(name,im.size)
(root/'variants/matharia/reference/survey-assets.json').write_text(json.dumps({'processing':'Alpha-margin trim and aspect-preserving WebP export only. Independent props are not extracted from flattened screen art.','assets':records},indent=2),encoding='utf8')
