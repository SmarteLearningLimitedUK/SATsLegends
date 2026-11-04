import json,hashlib,sys
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[('backgrounds/bg_rocket_v2',generated/'exec-def2eab6-0fa3-4260-83c4-fb1a372666f3.png',2000),('props/rocket_pad_v2',generated/'exec-4c593e5f-337c-4598-8a38-13dccc2d71fa.png',1400),('gameplay/rocket_answer_v2',generated/'exec-73778150-f451-4cda-8c9c-f0bb5404fdd6.png',1000),('props/ninja_bridge_v4',generated/'exec-413f6c13-b2ff-4fe5-8a0d-d0132d855ccf.png',1800),('props/rocket_vehicle_v2',root/'src/assets/game-visions/objects/rocket-v1.webp',1600)]
sheet=Image.new('RGB',(1200,960),'#103447');draw=ImageDraw.Draw(sheet);records=[]
for i,(name,src,limit) in enumerate(jobs):
 im=Image.open(src);box=None;native=list(im.size)
 if im.mode=='RGBA':box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
 preview=im.copy();preview.thumbnail((580,270));x=i%2*600;y=i//2*320;draw.text((x+8,y+8),name,fill='white');sheet.paste(preview,(x+(600-preview.width)//2,y+32+(270-preview.height)//2),preview if preview.mode=='RGBA' else None)
 if '--write' in sys.argv:
  dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);records.append(dict(name=name,source=str(src),sourceDimensions=native,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
 print(name,im.size,box)
sheet.save(root/'qa-artifacts/matharia-concepts/rocket-independent-assets.jpg',quality=94)
if '--write' in sys.argv:
 meta=root/'variants/matharia/reference/rocket-assets.json';old=json.loads(meta.read_text()) if meta.exists() else {};merged={r['name']:r for r in old.get('assets',[])};merged.update({r['name']:r for r in records});meta.write_text(json.dumps({'processing':'Alpha-margin crop and aspect-preserving WebP export. Existing independent rocket retains source assembly regions; no background is clipped or concealed.','assets':list(merged.values())},indent=2))
