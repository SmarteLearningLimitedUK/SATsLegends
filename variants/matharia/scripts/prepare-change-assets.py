"""Inspected blank independent shop layers; alpha-only sprite export, no semantic pixel edits."""
import json,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
def export(name,ident,cell=None,limit=1536):
 source=generated/f'exec-{ident}.png';im=Image.open(source);box=None
 if cell:im=im.crop(cell)
 if im.mode=='RGBA':
  a=im.getchannel('A');assert a.getextrema()[0]==0;box=a.point(lambda x:255 if x>16 else 0).getbbox();assert box;im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest,quality=95,method=6,exact=True);rows.append(dict(name=name,source=str(source),atlasCell=cell,alphaBoundsCrop=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
export('backgrounds/bg_change_shop_v3','b122f8b4-7aae-4a41-a278-537b12726d80',limit=2048)
export('props/change_counter_v3','c7264827-5ffc-4fbe-8da9-05c3aae01014',limit=2048)
export('frames/change_receipt_v3','e6bbc0a2-e8fe-4296-8571-815cefee334f')
export('frames/change_coin_slot_v3','b76778d7-dc08-4d7d-b60e-ceac242f148f')
for ident,names in [('c2f50d03-afa0-4f18-82a5-05499804a74e',[f'props/change_coin_{v}_v3' for v in [200,100,50,20,10,5,2,1]]),('b9fed968-bead-458c-8ffd-505fd821215c',[f'props/change_item_c{v}_v3' for v in range(1,9)])]:
 im=Image.open(generated/f'exec-{ident}.png');a=np.array(im.getchannel('A'));h,w=a.shape;mid=min(range(int(h*.44),int(h*.56)),key=lambda y:int((a[y,:]>16).sum()));assert not (a[mid,:]>16).any()
 for row,(y0,y1) in enumerate([(0,mid),(mid,h)]):
  cuts=[0]+[min(range(round(w*k/4-w*.045),round(w*k/4+w*.045)),key=lambda x:int((a[y0:y1,x]>16).sum())) for k in [1,2,3]]+[w]
  for x in cuts[1:-1]:assert not (a[y0:y1,x]>16).any(),'Atlas gutter intersects visible object'
  for col in range(4):export(names[row*4+col],ident,[cuts[col],y0,cuts[col+1],y1],limit=512)
(root/'variants/matharia/reference/change-assets.json').write_text(json.dumps({'references':['variants/matharia/reference/approved/change_counter.png'],'inspection':'All generated outputs visually inspected. Clean shop contains no counter/characters/UI. Independent foreground counter physically occludes clerk lower body; edge-to-edge furniture intentionally reaches viewport edges. Blank ornate parchment and empty wooden compartment have straight scalable rails. Eight complete coin faces have no baked denominations; live source values are drawn separately. Eight receipt icons correspond exactly to existing source item names; original flat images depicted unrelated weapons and were inspected before replacement.','processing':'Alpha-margin trim, transparent-gutter atlas slicing and aspect-preserving WebP. Atlas rows and per-row column gutters verified to contain no alpha>16; no object-cutting grid assumptions, no semantic image processing. Coin/item ordering checked visually.','coinLabelAnchor':[.5,.73],'assets':rows},indent=2),encoding='utf8')
