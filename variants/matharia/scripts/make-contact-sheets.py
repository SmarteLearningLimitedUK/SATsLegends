"""QA composites only: unchanged references and real application captures."""
from pathlib import Path
import json, math
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[3]
base=root/'qa-artifacts/concept-recreation'
screens=json.loads((root/'docs/concept-recreation/approved-screens.json').read_text())['screens']
for group in range(4):
    chunk=screens[group*10:(group+1)*10]
    for mode in ('comparison','devices'):
        out=Image.new('RGB',(1400,400*math.ceil(len(chunk)/2)),'#061e30');draw=ImageDraw.Draw(out)
        for i,s in enumerate(chunk):
            x=(i%2)*700;y=(i//2)*400
            draw.text((x+8,y+5),s['key']+(' | approved / running' if mode=='comparison' else ' | compact / iPad'),fill='white')
            paths=[root/s['reference'],base/s['key']/'running-reference.png'] if mode=='comparison' else [base/s['key']/'visual-chromium-compact.png',base/s['key']/'visual-chromium-ipad.png']
            for j,p in enumerate(paths):
                im=ImageOps.contain(Image.open(p).convert('RGB'),(342,370))
                out.paste(im,(x+j*350+(342-im.width)//2,y+25+(370-im.height)//2))
        out.save(base/f'final-{mode}-contact-{group+1}.jpg',quality=94)
print('Eight final QA contact sheets created')
