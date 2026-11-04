"""Export independent chassis and wheels; retain chassis cell geometry for explicit wheel anchors."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];raw=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
def put(name,source,cell=None,trim=True,identity=None):
 im=Image.open(source);im=im.crop(cell)if cell else im;box=None
 if trim and im.mode=='RGBA':box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();assert box;im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True);r=dict(name=name,source=str(source),cell=cell,alphaMarginTrim=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest());rows.append(r)
 if identity:r.update(identity=identity,wheels=[dict(cx=.219,cy=.762,radius=.137,projection=.70),dict(cx=.625,cy=.82,radius=.148,projection=.70)])
 print(name,im.size)
src=raw/'exec-7767f51f-3ec3-4fca-ad1d-df59ef848049.png';im=Image.open(src);w,h=im.size;a=im.getchannel('A');assert a.crop((w//2,0,w//2+1,h)).getextrema()[1]<=16;assert a.crop((0,h//2,w,h//2+1)).getextrema()[1]<=16
for i,k in enumerate(['barratt','bran','mochi','vex']):put(f'heroes/kart_{k}_chassis_v3',src,[i%2*(w//2),i//2*(h//2),(i%2+1)*(w//2),(i//2+1)*(h//2)],False,k)
put('props/race_wheel_v3',raw/'exec-7153249a-b4a6-449a-8d91-1c67b582b406.png')
put('backgrounds/bg_race_v3',raw/'exec-913b923b-0854-4e46-b0e3-96d734283a93.png',trim=False)
src=raw/'exec-c3a6df83-b546-4121-899b-07469009e16f.png';im=Image.open(src);a=im.getchannel('A');cuts=[0,583,1086,1589,im.width]
for x in cuts[1:-1]:assert a.crop((x,0,x+1,im.height)).getextrema()[1]<=16
for i,k in enumerate(['red','blue','gold','violet']):put(f'props/race_canister_{k}_v3',src,[cuts[i],0,cuts[i+1],im.height])
(root/'variants/matharia/reference/race-assets.json').write_text(json.dumps(dict(reference='variants/matharia/reference/approved/ratio_fractions.png',inspection='Clean frontal castle raceway regenerated after rejecting side panorama landing zones. Four canonical kart bodies generated without their two visible wheels; all eight sampled wheel-opening centres alpha0 verified. Separate wheel sprite, no duplicated clipped full-car images. Player/rival original identity selection retained.',processing='Verified atlas gutters and aspect-preserving WebP. Chassis full cell retained so wheel anchors use one explicit geometry. No semantic image processing or masks.',assets=rows),indent=2),encoding='utf8')
