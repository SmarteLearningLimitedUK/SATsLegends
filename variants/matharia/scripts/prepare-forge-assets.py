"""Mechanical sprite preparation only; original/generated source images are retained."""
from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[3]
variant=root/'variants/matharia'
generated=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs=[
 ('frames/concept_round_rim_v2',generated/'exec-81227b4c-08e2-4597-b042-be5a5933f9ee.png',512,True),
 ('backgrounds/bg_fraction_forge_v2',generated/'exec-79918f17-d73f-48b6-b0c5-b3e4f69df9bb.png',2000,False),
 ('heroes/hero_forge_barratt_v2',generated/'exec-2d36c2d1-60e8-4283-9fda-897a6d17a85e.png',1600,True),
 ('frames/forge_rack_v2',generated/'exec-37e7f122-a666-4429-a68a-3ab7900663a2.png',1400,True),
 ('gameplay/forge_ingot_v2',generated/'exec-72353ffa-d3cf-4a8d-b1ab-23b92f4e1ad5.png',512,True),
 ('gameplay/forge_mould_v2',generated/'exec-5538f795-d61b-4fbc-acef-ed9cdc545099.png',512,True),
 ('buttons/forge_clear_v2',generated/'exec-cd34b6c2-8006-447a-abc3-16887e964179.png',900,True),
 ('buttons/forge_strike_v2',generated/'exec-67fbfe47-5807-4ec9-95ce-e1eba64ecf32.png',900,True),
 ('props/forge_anvil_v2',root/'src/assets/game-visions/objects/forge-anvil-v1.webp',1200,True),
 ('props/forge_hammer_v2',root/'src/assets/game-visions/objects/forge-hammer-v1.webp',600,True),
]
records=[]
for name,source,limit,trim in jobs:
 im=Image.open(source);bbox=None
 if trim:
  assert im.mode=='RGBA' and im.getchannel('A').getextrema()[0]==0,(source,im.mode)
  bbox=im.getchannel('A').point(lambda a:255 if a>32 else 0).getbbox()
  bbox=(max(0,bbox[0]-3),max(0,bbox[1]-3),min(im.width,bbox[2]+3),min(im.height,bbox[3]+3))
  im=im.crop(bbox)
  if 'round_rim' in name:
   side=max(im.size);square=Image.new('RGBA',(side,side));square.paste(im,((side-im.width)//2,(side-im.height)//2));im=square
 im.thumbnail((limit,limit),Image.Resampling.LANCZOS)
 out=variant/f'assets/png/{name}@2x.webp';im.save(out,'WEBP',quality=95,method=6,exact=True)
 records.append({'name':name,'source':str(source),'production':out.relative_to(root).as_posix(),'dimensions':im.size,'alphaBoundsCrop':bbox,'bytes':out.stat().st_size})
 print(name,im.size,out.stat().st_size,flush=True)
meta=variant/'reference/forge-assets.json';old=json.loads(meta.read_text()) if meta.exists() else {};merged={r['name']:r for r in old.get('assets',[])};merged.update({r['name']:r for r in records});meta.write_text(json.dumps({'processing':'Alpha-margin trim, aspect-preserving downsample, WebP export; no paint, masks or patches.','assets':list(merged.values())},indent=2)+'\n')
