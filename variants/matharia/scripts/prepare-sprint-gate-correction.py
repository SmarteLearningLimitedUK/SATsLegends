import json,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[3];source=Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef/exec-1fa5e6f8-fd9e-4ac5-8e4b-2956ff058976.png');im=Image.open(source);box=im.getchannel('A').point(lambda a:255 if a>16 else 0).getbbox();im=im.crop(box);dest=root/'variants/matharia/assets/png/props/sprint_gate_v4@2x.webp';im.save(dest,quality=95,method=6,exact=True)
p=root/'variants/matharia/reference/forest-assets.json';m=json.loads(p.read_text());record=dict(name='props/sprint_gate_v4',source=str(source),production=dest.relative_to(root).as_posix(),dimensions=list(im.size),alphaBoundsCrop=box,bytes=dest.stat().st_size,sha256=hashlib.sha256(dest.read_bytes()).hexdigest());m['assets']=[r for r in m['assets']if r['name']!=record['name']]+[record];p.write_text(json.dumps(m,indent=2));print(im.size)
