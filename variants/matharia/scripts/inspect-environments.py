from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parents[3]
files=sorted((root/'src/assets/game-visions/environments').glob('*.webp'))
cellw,cellh=300,190
out=Image.new('RGB',(cellw*5,cellh*((len(files)+4)//5)),'#082b3c');d=ImageDraw.Draw(out)
for i,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((cellw-12,cellh-28));x=(i%5)*cellw;y=(i//5)*cellh;out.paste(im,(x+(cellw-im.width)//2,y+24));d.text((x+6,y+5),p.name,fill='white')
dest=root/'qa-artifacts/matharia-concepts/current-environment-library.jpg';out.save(dest,quality=90);print(dest)
