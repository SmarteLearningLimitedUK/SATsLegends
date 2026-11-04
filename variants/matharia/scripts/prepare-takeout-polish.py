import json,hashlib
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');records=[]
def save(name,source,box=None):
 im=Image.open(source);region=box
 if box:im=im.crop(box)
 assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0
 alpha=im.getchannel('A');trim=alpha.point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(trim)
 dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 records.append(dict(name=name,source=str(source),atlasRegion=region,alphaBoundsCrop=trim,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
source=generated/'exec-4616122f-e139-422a-bbfa-dab2beface07.png';w,h=Image.open(source).size
for i,name in enumerate(['barratt','bran','mochi','vex']):
 x=i%2;y=i//2;save(f'heroes/chef_{name}_v4',source,(round(x*w/2),round(y*h/2),round((x+1)*w/2),round((y+1)*h/2)))
source=generated/'exec-00e42c1a-e5ae-47e3-ac80-89d9d670c608.png';w,h=Image.open(source).size
for i in range(9):
 x=i%3;y=i//3;save(f'food/portion_{i+1}_v3',source,(round(x*w/3),round(y*h/3),round((x+1)*w/3),round((y+1)*h/3)))
save('frames/takeout_food_card_v3',generated/'exec-1fae2be6-6c81-4861-ac41-a5f61fbe93a8.png')
p=root/'variants/matharia/reference/takeout-assets.json';m=json.loads(p.read_text());merged={r['name']:r for r in m['assets']};merged.update({r['name']:r for r in records});m['assets']=list(merged.values());m['processing']='Rectangular extraction from approved independent transparent sprite atlases, alpha-margin crop and WebP export. No pixel repainting, scene masks or concealment.';p.write_text(json.dumps(m,indent=2))
