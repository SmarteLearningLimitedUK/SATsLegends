"""Verified atlas quadrants and alpha-bound trim; no painting or segmentation."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
source=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef/exec-4d7e9523-fc43-4733-aafa-8feb56b31f23.png')
atlas=Image.open(source);w,h=atlas.size;a=atlas.getchannel('A')
assert a.crop((w//2-3,0,w//2+3,h)).getextrema()[1]<=3 and a.crop((0,h//2-3,w,h//2+3)).getextrema()[1]<=3
rows=[]
for i,identity in enumerate(['barratt','bran','mochi','vex']):
 x=(i%2)*(w//2);y=(i//2)*(h//2);cell=(x,y,x+w//2,y+h//2);im=atlas.crop(cell);b=im.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()
 assert b and b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height
 im=im.crop(b);name=f'hero_{identity}_miner_v3';dest=root/f'variants/matharia/assets/png/heroes/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 rows.append(dict(identity=identity,role='mine guide',name=name,source=str(source),atlasCell=cell,alphaBoundsCrop=b,dimensions=list(im.size),avatarBounds=[0,0,im.width,im.width],production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(identity,im.size)
(root/'variants/matharia/reference/miner-activities.json').write_text(json.dumps({'reference':'variants/matharia/reference/approved/multiplication_mine.png','inspection':'All four original identities inspected in upright parchment poses. Apparent coloured RGB in the native generation preview is hidden by alpha: both6px cross gutters have maximum alpha1 and sampled exterior pixels alpha0. Full antlers/horns/wings/tails/boots stay inside verified quadrant boundaries. Separate sprites keep original saved identities.','processing':'Regular atlas quadrant slicing, alpha-margin trim and aspect-preserving WebP export only.','assets':rows},indent=2),encoding='utf8')
