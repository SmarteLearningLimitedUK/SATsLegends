import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('backgrounds/bg_place_value_v2','99770032-8017-4d0a-b4f5-067009eba0eb',972),('heroes/hero_pvp_rhino_v2','71f48f1c-1eba-4c57-bf90-f681923cc1a4',1000),('gameplay/pvp_socket_v2','3ed4aa35-aa9a-452b-bc43-75761d969af0',512),('gameplay/pvp_digit_v2','18e4f06b-5cf6-45dc-bc24-0bb8b6d32339',512)]
assets=[]
for name,ident,maxsize in specs:
 src=generated/f'exec-{ident}.png';im=Image.open(src);box=None
 if im.mode=='RGBA':
  alpha=im.getchannel('A');box=alpha.point(lambda a:255 if a>8 else 0).getbbox();im=im.crop(box)
 im.thumbnail((maxsize,maxsize if box else 2000),Image.Resampling.LANCZOS)
 dest=root/f'variants/matharia/assets/png/{name}@2x.webp';dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest,quality=94,method=6)
 assets.append(dict(name=name,source=str(src),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
(root/'variants/matharia/reference/place-value-assets.json').write_text(json.dumps({'processing':'Alpha-margin trim, aspect-preserving downsample and WebP export. No painted corrections, masks or covers.','assets':assets},indent=2))
manifest=root/'docs/concept-recreation/approved-screens.json';m=json.loads(manifest.read_text());s=next(s for s in m['screens'] if s['key']=='place_value_panic')
s['regions']={'coordinateSystem':'normalized x,y,width,height; measured against 972x1619','hud':[.052,.045,.884,.094],'question':[.143,.153,.719,.149],'questionOrdinal':[.344,.135,.312,.045],'rhinoSilhouette':[.016,.287,.272,.192],'targetRow':[.087,.483,.83,.118],'bankHint':[.211,.606,.585,.0476],'digitBank':[.14,.658,.72,.167],'submit':[.21,.829,.58,.069],'navigation':[.062,.914,.876,.078]}
manifest.write_text(json.dumps(m,indent=2))
print(json.dumps(assets,indent=2))
