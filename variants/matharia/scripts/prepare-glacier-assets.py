"""Independent scenery/props: alpha-margin crop and aspect-preserving export only."""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
assets=[('backgrounds/bg_angle_v3','0cfd12fa-bb2f-45d3-a1a4-77432104e289',None),('backgrounds/bg_polygon_v3','216b083b-a1b2-466c-a370-01a1fb89c880',None),('frames/glacier_panel_v3','ddd0522e-e8ac-4c0c-8c6c-e9414363b0d5',None),('props/polygon_pedestal_v3','eedab981-1471-4024-84a1-3ffd160976aa',None)]
atlas=Image.open(generated/'exec-ef6d5cc4-4833-4111-9f2a-8e8bea6bef11.png');w,h=atlas.size;a=atlas.getchannel('A');gutter=[x for x in range(round(w*.46),round(w*.53)) if a.crop((x,0,x+1,h)).point(lambda v:255 if v>16 else 0).getbbox() is None];assert gutter,'Props require a real alpha gutter';divider=min(gutter,key=lambda x:abs(x-w/2))
assets.extend([('props/angle_platform_v3','ef6d5cc4-4833-4111-9f2a-8e8bea6bef11',(0,0,divider,h)),('props/angle_tower_v3','ef6d5cc4-4833-4111-9f2a-8e8bea6bef11',(divider,0,w,h)),('frames/sapphire_crest_v3','0321915c-bde3-42e0-a3be-1624cdb8e24d',None)])
assets.extend([('props/angle_tower_v4','3b7ac68d-1507-4f2a-a03d-9bb6bdb0ee0f',None),('heroes/angle_rhino_v3','b762bce3-ad16-4dab-81f3-4de1fe4d44bb',None),('props/angle_platform_v4','d0dc638f-f16e-4aad-8f88-45aad6326f38',None)])
records=[]
for name,ident,region in assets:
 source=generated/f'exec-{ident}.png'; im=Image.open(source); box=None
 if region: im=im.crop(region)
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS)
 dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 records.append(dict(name=name,source=str(source),atlasRegion=region,alphaBoundsCrop=box,production=dest.relative_to(root).as_posix(),dimensions=list(im.size),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
p=root/'variants/matharia/reference/glacier-assets.json';old=json.loads(p.read_text()) if p.exists() else {};merged={r['name']:r for r in old.get('assets',[])};merged.update({r['name']:r for r in records})
p.write_text(json.dumps({'processing':'Alpha-margin trim and aspect-preserving WebP export. No painting, scene masking or defect concealment.','assets':list(merged.values())},indent=2))
