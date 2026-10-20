from pathlib import Path
from PIL import Image,ImageDraw
import json
root=Path('qa-artifacts/full-screen-qa')
for profile in ['desktop','phone','iphone-webkit']:
 p=root/(profile+'-checks.json')
 if not p.exists():continue
 rows=[r for r in json.loads(p.read_text(encoding='utf-8')) if r.get('tier')==5 or r['key'] in ['crystal_core','mirror_gate','matrix_match']]
 for start in range(0,len(rows),6):
  sheet=Image.new('RGB',(1440,960),'#081e29');d=ImageDraw.Draw(sheet)
  for i,row in enumerate(rows[start:start+6]):
   if not row.get('file'):continue
   im=Image.open(root/row['file']);im.thumbnail((710,288));x=i%2*720;y=i//2*320;sheet.paste(im,(x,y+24));d.text((x+8,y+4),row['key'],fill='white')
  sheet.save(root/f'sheet-{profile}-{start//6+1}.jpg')
 print(profile,len(rows))
