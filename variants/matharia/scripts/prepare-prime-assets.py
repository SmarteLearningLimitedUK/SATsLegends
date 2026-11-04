"""Export inspected image_gen outputs, preserving alpha and artwork aspect ratios."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[3]
variant = root / 'variants/matharia'
generated = Path('C:/Users/samva/.codex/generated_images/01a18eee-903b-74c2-89bb-fb8e6f1cf5ef')
jobs = [
 ('backgrounds/bg_prime_pop_v2', 'exec-096ef11b-1ace-455f-ab37-aaac962fb0b6.png', 2000, False),
 ('heroes/hero_prime_caster_v2', 'exec-37e4bf5b-b5ff-4eef-992e-4f48ac5f8922.png', 1600, True),
 ('frames/prime_question_v2', 'exec-af598576-7401-4d15-a0bc-8444adb6b3f6.png', 1600, True),
 ('gameplay/prime_orb_glass_v2', 'exec-4808002d-0128-4fb2-8138-996a00975fb8.png', 512, True),
 ('gameplay/prime_danger_rail_v2', 'exec-5af1da77-0aee-4282-b53f-b3d6373dccd2.png', 1600, True),
 ('frames/concept_nav_v3', 'exec-a93c47d1-08e4-4444-8930-30e249328078.png', 1200, True),
]
records = []
for name, source, limit, trim in jobs:
    image = Image.open(generated / source)
    bounds = None
    if trim:
        assert image.mode == 'RGBA' and image.getchannel('A').getextrema()[0] == 0
        bounds = image.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
        bounds = (max(0, bounds[0]-4), max(0, bounds[1]-4), min(image.width, bounds[2]+4), min(image.height, bounds[3]+4))
        image = image.crop(bounds)
    image.thumbnail((limit, limit*2 if 'backgrounds/' in name else limit), Image.Resampling.LANCZOS)
    destination = variant / f'assets/png/{name}@2x.webp'
    image.save(destination, 'WEBP', quality=95, method=6, exact=True)
    records.append({'source': source, 'production': destination.relative_to(root).as_posix(), 'dimensions': image.size, 'alphaBoundsCrop': bounds, 'bytes': destination.stat().st_size})
(variant / 'reference/prime-assets.json').write_text(json.dumps({
    'tool': 'built-in image_gen',
    'reference': 'reference/approved/prime_pop.png',
    'processing': 'Trim transparent margins and export production WebP. No painting, masks, colour patches, or geometric distortion.',
    'assets': records,
}, indent=2) + '\n')
print(f'Exported {len(records)} independent production assets.')
