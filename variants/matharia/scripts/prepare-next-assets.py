import json,hashlib,sys
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[3];generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[('frames/pvp_question_v2','76f6454d-5e52-484f-a997-ef147b07aa5d',1600),('buttons/pvp_submit_v2','03cefeb5-fc25-46f0-829c-8ce6e9328359',1400),('gameplay/pvp_socket_v3','6c4bc6a6-3dee-4608-8c22-137d20f1045a',600),('frames/concept_nav_medium_v2','c2222e5c-a0e2-44a6-bb8b-3dde9e4b028a',1100),('frames/concept_hud_wide_v4','8babda2e-ab12-4c32-8c13-58f79dacc3c0',1800),('backgrounds/bg_ninja_v2','9dc1bc73-61b9-4e20-ba57-216fabf407cd',2000),('heroes/hero_ninja_fox_v2','ab5e000e-a9af-4866-94f9-98164081712b',1400),('props/ninja_bridge_v2','047b0ce0-5c82-457b-bbd4-ecf61b52a780',1800),('gameplay/ninja_medallion_v2','e4d891df-2b6b-4086-8fe9-d878adfbfd08',640)]
sheet=Image.new('RGB',(1500,1080),'#103447');draw=ImageDraw.Draw(sheet);records=[]
for i,(name,ident,limit) in enumerate(jobs):
 src=generated/f'exec-{ident}.png';im=Image.open(src);box=None
 if im.mode=='RGBA':
  assert im.getchannel('A').getextrema()[0]==0,(name,'No transparency')
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
 preview=im.copy();preview.thumbnail((480,315));x=(i%3)*500;y=(i//3)*360;draw.text((x+8,y+8),name,fill='white');sheet.paste(preview,(x+(500-preview.width)//2,y+30+(315-preview.height)//2),preview if preview.mode=='RGBA' else None)
 dest=root/f'variants/matharia/assets/png/{name}@2x.webp'
 if '--write' in sys.argv:
  im.save(dest,quality=95,method=6,exact=True)
  records.append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
 print(name,im.size,box)
sheet.save(root/'qa-artifacts/matharia-concepts/next-independent-assets.jpg',quality=93)
if '--write' in sys.argv:
 meta=root/'variants/matharia/reference/next-assets.json';old=json.loads(meta.read_text()) if meta.exists() else {};merged={r['name']:r for r in old.get('assets',[])};merged.update({r['name']:r for r in records});meta.write_text(json.dumps({'processing':'Alpha-margin crop, aspect-preserving downsample and WebP export; no recolouring, repainting or concealment.','assets':list(merged.values())},indent=2))
