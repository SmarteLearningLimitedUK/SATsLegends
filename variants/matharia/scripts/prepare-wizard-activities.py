"""Regular atlas slicing, alpha-margin trim and WebP export; no semantic image edits."""
import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3]
prompts=json.loads((root/'variants/matharia/reference/wizard-activity-prompts.json').read_text(encoding='utf8'))
source=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')/prompts['attempts'][-1]['source']
atlas=Image.open(source);w,h=atlas.size;a=atlas.getchannel('A')
assert a.crop((w//2-3,0,w//2+3,h)).getextrema()[1]<=3 and a.crop((0,h//2-3,w,h//2+3)).getextrema()[1]<=3,'Atlas gutter needs correction before slicing.'
records=[]
for i,identity in enumerate(prompts['identities']):
    x=(i%2)*(w//2);y=(i//2)*(h//2);cell=(x,y,x+w//2,y+h//2);im=atlas.crop(cell);b=im.getchannel('A').point(lambda v:255 if v>16 else 0).getbbox()
    assert b and b[0]>0 and b[1]>0 and b[2]<im.width and b[3]<im.height,'Character touches a cell edge.'
    im=im.crop(b);dest=root/f'variants/matharia/assets/png/heroes/hero_{identity}_wizard_v3@2x.webp';im.save(dest,quality=95,method=6,exact=True)
    records.append(dict(identity=identity,role='wizard',name=f'hero_{identity}_wizard_v3',source=str(source),atlasCell=cell,alphaBoundsCrop=b,dimensions=list(im.size),avatarBounds=[round(im.width*.08),round(im.height*.025),round(im.width*.7),round(im.width*.7)],production=dest.relative_to(root).as_posix(),bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest()))
    print(identity,im.size)
(root/'variants/matharia/reference/wizard-activities.json').write_text(json.dumps({'processing':'Four separate identities, regular quadrant slices with verified transparent gutters, alpha-margin trim only. Live actors preserve source mesh, motion and saved identity.','assets':records},indent=2),encoding='utf8')
