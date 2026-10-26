"""Unmodified screenshot thumbnails on labelled comparison sheets."""
import json
import os
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root = Path('qa-artifacts/production-ui-v2')
games = json.loads(Path('native/production-rebuild/game-inventory.json').read_text())['games']
font = ImageFont.truetype('C:/Windows/Fonts/segoeui.ttf', 15)
phase = os.environ.get('QA_PHASE', 'after')
for profile in (('compact',) if phase == 'first-tier' else ('compact', 'standard', 'large', 'tablet')):
    sheet = Image.new('RGB', (1320, 2240), '#071f29')
    draw = ImageDraw.Draw(sheet)
    for i, game in enumerate(games):
        x, y = (i % 6)*220, (i//6)*320
        title = game['title'].removesuffix(' L5')
        draw.text((x+6,y+4), title, font=font, fill='#f7cc6b')
        path = root/phase/f"{profile}-{game['key']}.png"
        im = Image.open(path).convert('RGB')
        im.thumbnail((208,280),Image.Resampling.LANCZOS)
        sheet.paste(im,(x+(220-im.width)//2,y+30+(280-im.height)//2))
    prefix = '' if phase == 'after' else phase+'-'
    sheet.save(root/f'{prefix}{profile}-contact-sheet.jpg',quality=92)
    print(profile, sheet.size)
