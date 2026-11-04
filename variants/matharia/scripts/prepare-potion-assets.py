"""Export only inspected independent artwork. No semantic edits, masks or patches."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];raw=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
def put(name,ident,cell=None,identity=None,limit=1536):
 source=raw/f'exec-{ident}.png';im=Image.open(source);im=im.crop(cell) if cell else im;box=None
 if im.mode=='RGBA':
  a=im.getchannel('A');box=a.point(lambda x:255 if x>16 else 0).getbbox();assert box;im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);row=dict(name=name,source=str(source),cell=cell,alphaMarginTrim=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest());rows.append(row)
 if identity:row.update(identity=identity,avatarBounds=[0,0,im.width,round(im.height*.45)])
 print(name,im.size)
put('backgrounds/bg_potion_v3','e7af2ccf-2e97-4399-b300-828525c906a8',limit=2048)
put('props/potion_hearth_v3','a59efd9c-b8b0-45ed-b392-71aff007bff7')
put('props/potion_cauldron_open_v3','b0d7be90-263b-4061-9b35-e8a3de68c9e0')
put('frames/potion_panel_v3','321d8e89-5997-45a9-a373-cf53e6c5b2e9')
put('buttons/potion_reset_v3','34542531-5bef-4625-bbfe-027b7a2fedfd')
id='4a0976aa-eb8b-4940-ab7d-c6cf74037a2f';im=Image.open(raw/f'exec-{id}.png');cuts=[0,429,867,1303,1740,im.width]
for x in cuts[1:-1]:assert im.getchannel('A').crop((x,0,x+1,im.height)).getextrema()[1]<=16
for i,k in enumerate(['red','blue','green','gold','violet']):put(f'props/potion_bottle_{k}_v3',id,[cuts[i],0,cuts[i+1],im.height])
id='fb2527bd-ba77-48ff-b88d-60848ebbc288';im=Image.open(raw/f'exec-{id}.png');w,h=im.size
assert im.getchannel('A').crop((w//2,0,w//2+1,h)).getextrema()[1]<=16
assert im.getchannel('A').crop((0,h//2,w,h//2+1)).getextrema()[1]<=16
for i,k in enumerate(['barratt','bran','mochi','vex']):put(f'heroes/hero_{k}_reader_v3',id,[i%2*(w//2),i//2*(h//2),(i%2+1)*(w//2),(i//2+1)*(h//2)],k)
(root/'variants/matharia/reference/potion-assets.json').write_text(json.dumps(dict(reference='variants/matharia/reference/approved/potion_panic.png',inspection='Clean terrace, open cauldron, five glossy bottles, blank vine panel, red control and four canonical recipe-readers visually inspected. Cauldron inner-opening central alpha >16 fraction is0; live liquid sits behind the rim/body. First four-reader strip rejected because no clear gutters; retained raw, never exported.',processing='Verified transparent gutters, alpha-margin trim and aspect-preserving WebP only. No semantic pixel processing.',assets=rows),indent=2),encoding='utf8')
