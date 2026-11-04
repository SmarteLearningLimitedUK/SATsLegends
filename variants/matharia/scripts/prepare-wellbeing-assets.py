"""Export genuine transparent koi atlas cells; preserve the complete fins and tails."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef/exec-f85c9c6f-a904-4c26-84c2-7e0a2d99d33a.png')
im = Image.open(SOURCE).convert('RGBA')
out = ROOT / 'assets/png/characters'
out.mkdir(parents=True, exist_ok=True)
for name, bounds in zip(('gold', 'blue', 'coral', 'sage'), ((0, 0, 836, 470), (836, 0, 1672, 470), (0, 470, 836, 941), (836, 470, 1672, 941))):
    cell = im.crop(bounds)
    cell = cell.crop(cell.getchannel('A').getbbox())
    cell.save(out / f'pond_fish_{name}_v3@2x.webp', quality=94, method=6)
print('Exported four independent, aspect-preserving koi assets.')
