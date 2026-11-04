"""Export inspected independent cargo props; reuse existing clean harbour scenery."""
import json,hashlib,shutil
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
specs=[('props/remainder_conveyor_v3','8c4ac051-939e-4d0c-a7d8-2ab2a508877a',1536),('props/remainder_crate_v3','9d1bdc2b-fabe-44f6-b330-d31b3b064ae2',640),('props/remainder_rope_v3','bb4eb758-12e9-4e81-95d9-60c260dc636d',1024),('buttons/remainder_batch_v3','639d49e3-191b-471d-abd9-a540821b173d',1536),('buttons/remainder_ship_v3','bdeef301-0512-4ba2-93af-b6e12efe6d91',1536),('buttons/remainder_unload_v3','caaffdc1-6191-45fc-bf7d-3c7bf0abd180',1536)]
metadata=root/'variants/matharia/reference/remainder-assets.json'
previous={a['name']:a for a in json.loads(metadata.read_text())['assets']} if metadata.exists() else {}
rows=[]
for name,ident,limit in specs:
 source=generated/f'exec-{ident}.png'
 if name in previous and previous[name]['source']==str(source):
  rows.append(previous[name]);continue
 im=Image.open(source).convert('RGBA');alpha=im.getchannel('A');box=alpha.point(lambda a:255 if a>16 else 0).getbbox()
 assert box and box[0]>0 and box[1]>0 and box[2]<im.width and box[3]<im.height
 im=im.crop(box);im.thumbnail((limit,limit),Image.Resampling.LANCZOS);dest=root/f'variants/matharia/assets/png/{name}@2x.webp';im.save(dest,quality=95,method=6,exact=True)
 rows.append(dict(name=name,source=str(source),alphaBoundsCrop=box,dimensions=list(im.size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()));print(name,im.size)
source=root/'src/assets/game-visions/environments/remainder_run-v1.webp';dest=root/'variants/matharia/assets/png/backgrounds/bg_remainder_v3@2x.webp';shutil.copyfile(source,dest)
rows.append(dict(name='backgrounds/bg_remainder_v3',source=source.relative_to(root).as_posix(),dimensions=list(Image.open(source).size),production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
(root/'variants/matharia/reference/remainder-assets.json').write_text(json.dumps({'references':['variants/matharia/reference/approved/remainder_run.png','qa-artifacts/concept-recreation/remainder-cart-reference.png'],'inspection':'Inspected all four generated originals. Complete empty conveyor, separate three-dimensional maritime crate, separate rope coil and blank teal/gold button. Verified real alpha including rope exterior despite hidden RGB glow. Background is existing clean repository harbour scenery with no UI or foreground loading console. Six independent stock crates illustrate the approved dock inventory; exact remaining/loaded quantities and all working are live.','processing':'Alpha-margin crop and aspect-preserving WebP only; original background copied without recompression. No painted covers, masks, flattened controls or semantic image processing.','assets':rows},indent=2),encoding='utf8')
