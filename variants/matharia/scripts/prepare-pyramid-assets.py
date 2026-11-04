"""Inspected clean temple scenery and one complete tablet from a verified regular atlas."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
for name,ident,cell in [('backgrounds/bg_pyramid_v3','0db9c21b-045f-46e0-a6b8-f17aa8179011',None),('props/pyramid_stone_v3','6a37600d-62e8-42ad-8e54-e9f2a2429a84',0)]:
 source=generated/f'exec-{ident}.png';im=Image.open(source);atlas=None;box=None
 if cell is not None:
  assert im.size==(1254,1254);atlas=[0,0,627,627];im=im.crop(atlas);a=im.getchannel('A');assert a.crop((0,0,2,627)).getextrema()[1]<16 and a.crop((625,0,627,627)).getextrema()[1]<16
  box=a.point(lambda x:255 if x>16 else 0).getbbox();assert box and box[0]>0 and box[2]<627;im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);rows.append(dict(name=name,source=str(source),atlasCell=atlas,alphaBoundsCrop=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
(root/'variants/matharia/reference/pyramid-assets.json').write_text(json.dumps({'references':['variants/matharia/reference/approved/problem_pyramid.png','qa-artifacts/concept-recreation/pyramid-stone-reference.png'],'inspection':'Background and atlas visually inspected. Clean sun-banner temple terrace with no puzzle/hero/UI. Four regular equal atlas cells contain complete blank flat-top tablets; selected cell0 has low-alpha outside gutters, verified numerically. Six instances of that independent tablet carry original live values. Earlier whole-group and overly wide single-tablet candidates were inspected and rejected for proportions; no stretching or covers.','processing':'Regular627x627 atlas slice, alpha-margin crop and aspect-preserving WebP only.','slateWindow':[.22,.28,.56,.56],'assets':rows},indent=2),encoding='utf8')
