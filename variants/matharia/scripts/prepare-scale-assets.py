from pathlib import Path
import json,hashlib
from PIL import Image
root=Path(__file__).resolve().parents[3];raw=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef');rows=[]
for name,uid in [('backgrounds/bg_scale_v3','80828159-7383-466b-acc5-bd37e1f30a7e'),('props/scale_bench_v3','f5a62781-eb17-49a7-903f-4f4a97b39b00'),('buttons/scale_key_v4','2f3758a5-750f-4387-aa53-9a2b19aec975')]:
 src=raw/f'exec-{uid}.png';im=Image.open(src);box=None
 if im.mode=='RGBA':box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);dest=Path(f'variants/matharia/assets/png/{name}@2x.webp');im.save(dest,quality=95,method=6,exact=True);rows.append(dict(name=name,source=str(src),alphaMarginTrim=box,dimensions=list(im.size),production=dest.as_posix(),sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
Path('variants/matharia/reference/scale-assets.json').write_text(json.dumps(dict(reference='variants/matharia/reference/approved/scale_builder.png',inspection='Clean autumn frontal terrace and separate physical engineering bench inspected. No text/UI/characters baked in background. Existing canonical blueprint hero poses retained. Original live SVG and numeric controls preserved.',processing='Aspect-preserving WebP; alpha-margin trim only, no semantic image processing.',assets=rows),indent=2))
p=Path('docs/concept-recreation/approved-screens.json');m=json.loads(p.read_text());r=next(r for r in m['screens']if r['key']=='scale_builder');r['regions']={'topHud':[.23,.015,.54,.11],'question':[.16,.14,.675,.13],'hero':[.025,.36,.23,.48],'blueprint':[.275,.29,.285,.44],'entry':[.59,.33,.36,.47],'bench':[.21,.71,.37,.13],'footer':[.29,.84,.42,.13]};p.write_text(json.dumps(m,indent=2))
