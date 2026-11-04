import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');records=[]
def save(name,ident,limit=1800,region=None):
 source=generated/f'exec-{ident}.png';im=Image.open(source)
 if region:im=im.crop(region)
 box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 records.append(dict(name=name,source=str(source),atlasRegion=region,alphaBoundsCrop=box,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
for name,ident in [('backgrounds/bg_percent_v3','ad674423-0bfc-4a4b-b356-d628b9c14ea0'),('props/percent_reactor_v3','90ca1cbf-1096-4267-a613-4daa72dc7ef5'),('backgrounds/bg_sprint_v3','386a131c-abc8-4b74-95f0-3705a779b0fe'),('props/sprint_gate_v3','f1bae1a8-f972-43bf-b389-42da5bdba7dc')]:save(name,ident,2000)
ident='bf050f82-f864-44f5-8c85-587acaed0a62';im=Image.open(generated/f'exec-{ident}.png');w,h=im.size;a=im.getchannel('A');empty=[]
for y in range(round(h*.49),round(h*.54)):
 if a.crop((0,y,w,y+1)).point(lambda v:255 if v>16 else 0).getbbox() is None:empty.append(y)
assert empty,'Runner atlas needs a real transparent row gutter';divider=min(empty,key=lambda y:abs(y-h*.512))
for i,name in enumerate(['barratt','bran','mochi','vex']):
 x=i%2;top=0 if i<2 else divider;bottom=divider if i<2 else h;save(f'heroes/runner_{name}_v3',ident,1100,(x*w//2,top,(x+1)*w//2,bottom))
p=root/'variants/matharia/reference/forest-assets.json';old=json.loads(p.read_text())if p.exists()else{};merged={r['name']:r for r in old.get('assets',[])};merged.update({r['name']:r for r in records});p.write_text(json.dumps({'processing':'Rectangular sprite-atlas extraction through a verified empty alpha gutter, alpha-margin crop and aspect-preserving WebP export. No painting, masks or concealment.','assets':list(merged.values())},indent=2))
