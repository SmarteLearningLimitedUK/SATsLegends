"""Inspected clean arena scenery, separate dais and unlabelled mine button."""
import json, hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('backgrounds/bg_ops_v3','3c087dc3-343c-46d9-9d00-9c138d80391d'),('props/ops_pedestal_v5','efcaeb21-ad07-4235-b790-9fb734c61af3'),('props/ops_pedestal_v3','68267a97-0cff-434e-b7fe-0b6fa33faf07'),('buttons/ops_answer_v3','dadcd998-8388-4f57-b0e6-f50d782b6173'),('buttons/mine_answer_v3','ae623ed5-05b9-4fa5-a39a-6d205aef97c6')]
rows=[]
for name,ident in specs:
 source=generated/f'exec-{ident}.png';im=Image.open(source);box=None
 if im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0:
  box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox()
  assert box and box[0]>0 and box[1]>0 and box[2]<im.width and box[3]<im.height
  im=im.crop(box)
 im.thumbnail((2048,2048),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 rows.append(dict(name=name,source=str(source),alphaBoundsCrop=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
(root/'variants/matharia/reference/ops-assets.json').write_text(json.dumps({'references':['variants/matharia/reference/approved/order_ops_arena.png','variants/matharia/reference/approved/multiplication_mine.png'],'inspection':'All original outputs visually inspected before export. Clean natural arena paving, no baked UI/opponent/platform. Separate complete shallow brass/sapphire dais. Independent charcoal-plum enamel/gold answer button without labels. Existing hero_mage_idle library asset inspected and reused for the original goblin opponent. No masks, patches, painting, semantic cuts or distortion.','processing':'Alpha-margin crop and aspect-preserving WebP only.','assets':rows},indent=2),encoding='utf8')
