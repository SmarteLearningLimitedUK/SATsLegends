"""Independent frontal banquet layers; export verified clear atlas gutters only."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];raw=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
def put(name,source,cell=None,identity=None,limit=1536):
 im=Image.open(source);im=im.crop(cell)if cell else im;box=None
 if im.mode=='RGBA':box=im.getchannel('A').point(lambda x:255 if x>16 else 0).getbbox();assert box;im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);r=dict(name=name,source=str(source),cell=cell,alphaMarginTrim=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest());rows.append(r)
 if identity:r.update(identity=identity,avatarBounds=[0,0,im.width,round(im.height*.45)])
 print(name,im.size)
def image(id):return raw/f'exec-{id}.png'
put('backgrounds/bg_share_v3',image('3e1371e5-6b73-48c5-b332-0d7107d0289d'),limit=2048)
put('props/share_table_v3',image('c6f5980d-410c-4a9f-89e9-289920b055fd'),limit=2048)
put('props/share_plate_v3',image('11151571-d7c8-48e1-8cbe-18a73e89f3b8'))
put('food/share_cake_v3',root/'src/assets/share-splitter/strawberry-cake-v1.webp',limit=512)
for id,entries in [('bbd01087-105d-4928-8087-b7a38e1453fe',['barratt','bran','mochi','vex']),('dbeede3e-df38-4273-9476-b8ef8f228a82',['goblin','green','rhino'])]:
 src=image(id);im=Image.open(src);w,h=im.size;a=im.getchannel('A');assert a.crop((w//2,0,w//2+1,h)).getextrema()[1]<=16;assert a.crop((0,h//2,w,h//2+1)).getextrema()[1]<=16
 for i,key in enumerate(entries):put(f'heroes/hero_{key}_host_v3'if id.startswith('bbd')else f'characters/share_guest_{key}_v3',src,[i%2*(w//2),i//2*(h//2),(i%2+1)*(w//2),(i//2+1)*(h//2)],key if id.startswith('bbd')else None)
src=image('6360c072-a784-4d64-8fa2-d9dbc711e18b');a=Image.open(src).getchannel('A');assert a.crop((512,538,1024,539)).getextrema()[1]<=16
put('characters/share_guest_crystal_v3',src,[512,0,1024,538]);put('characters/share_guest_purple_v3',src,[512,538,1024,1120])
(root/'variants/matharia/reference/share-assets.json').write_text(json.dumps(dict(reference='variants/matharia/reference/approved/share_splitter.png',inspection='Clean garden, frontal furniture, white/gold plate, original cupcake, five independent approved-style guests and four canonical greeting hosts inspected. First five-character atlas had no clear left-column horizontal gutters; only its separated right-column crystal/purple are exported. Left three regenerated with verified empty2x2gutters. RGB preview matte is beneath alpha0..3; neutral composite confirms clear background.',processing='Gutter/alpha-margin crop and aspect-preserving WebP only, no semantic editing or masks.',assets=rows),indent=2),encoding='utf8')
