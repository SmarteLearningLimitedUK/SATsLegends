"""Prepare independent geometry scenery, props and blank controls, without scene masks."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('backgrounds/bg_area_v3','22916cf0-5b89-4245-999b-3eafa60303a3'),('backgrounds/bg_transform_v3','77cb5e82-a32d-4042-8197-c7ba622e13cc'),('buttons/sapphire_answer_v3','fecb337f-5717-45ee-a120-8c56af93b1ec'),('props/area_table_v3','d1387985-606a-4301-8a20-7936b60c5476'),('frames/transform_board_v3','3d71b540-183a-4538-9748-91edf7785f9e'),('buttons/angle_answer_v4','098e1284-b635-430d-b3bf-9f2d33e5ba39'),('frames/chart_hollow_v8','0e3cb7aa-5c55-44f7-829b-39162165f1c1'),('backgrounds/bg_coordinates_v3','b027f1c0-febf-4097-92bc-595c3989bc06'),('backgrounds/bg_perimeter_v3','7f1038a3-a5d2-4a49-8870-74a0c5c1bb51')]
p=root/'variants/matharia/reference/geometry-assets.json';old=json.loads(p.read_text(encoding='utf8')) if p.exists() else {};records={a['name']:a for a in old.get('assets',[]) if a['name'] in {n for n,_ in specs}}
for name,ident in specs:
 source=generated/f'exec-{ident}.png';dest=root/f'variants/matharia/assets/png/{name}@2x.webp'
 if name in records and dest.exists() and records[name]['source']==str(source):continue
 im=Image.open(source);box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);im.save(dest,quality=95,method=6,exact=True)
 records[name]=dict(name=name,source=str(source),alphaBoundsCrop=box,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest());print(name,im.size)
p.write_text(json.dumps({'processing':'Alpha-margin trim and aspect-preserving WebP export only; no painting or masking.','assets':list(records.values())},indent=2),encoding='utf8')
