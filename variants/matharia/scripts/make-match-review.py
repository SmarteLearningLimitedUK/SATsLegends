"""Analysis artifacts only: aligned comparisons of reference and running application."""
import html
import json
from pathlib import Path
from shutil import copy2
from PIL import Image, ImageChops, ImageDraw

root = Path(__file__).resolve().parents[3]
out = root / 'qa-artifacts/concept-recreation/match3_equivalence'
reference = root / 'variants/matharia/reference/approved/match3_equivalence-v2.png'
copy2(reference, out / 'approved.png')
a = Image.open(reference).convert('RGB')
b = Image.open(out / 'chromium-reference.png').convert('RGB')
assert a.size == b.size == (853, 1844)
comparison = Image.new('RGB', (1726, 1892), '#092b3f')
draw = ImageDraw.Draw(comparison)
draw.text((14, 14), 'APPROVED REFERENCE', fill='white')
draw.text((880, 14), 'RUNNING REACT APPLICATION — LEVEL 5', fill='white')
comparison.paste(a, (0, 48))
comparison.paste(b, (873, 48))
comparison.save(out / 'reference-versus-running.jpg', quality=94)
Image.blend(a, b, .5).save(out / 'aligned-overlay.png')
ImageChops.difference(a, b).save(out / 'difference.png')
checks = json.loads((out / 'checks.json').read_text())
motion = json.loads((out / 'motion-and-safe-areas.json').read_text())
assert all(c['passed'] for c in checks + motion)
profiles = ''.join(f'<figure><img src="{html.escape(c["screenshot"])}"><figcaption>{c["engine"]} · {c["profile"]} · {c["width"]} × {c["height"]}</figcaption></figure>' for c in checks)
(out / 'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Match Mastery · reference comparison</title><style>
*{box-sizing:border-box}body{margin:0;background:#061e2f;color:#fff5de;font:16px/1.5 system-ui}main{max-width:1500px;margin:auto;padding:28px}h1{margin:0 0 12px}p{max-width:1000px}a{color:#f3cf7d}nav{display:flex;gap:20px;flex-wrap:wrap;margin:20px 0}.compare{display:grid;grid-template-columns:1fr 1fr;gap:18px}.compare img{width:100%;display:block}figure{margin:0}figcaption{padding:10px 0;font-size:14px}.devices{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px}.devices img{width:100%;height:350px;object-fit:contain;background:#0c344b}.states{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}.states img{width:100%;height:460px;object-fit:contain}.note{padding:16px;border:1px solid #b99345;border-radius:10px;background:#0b3347}@media(max-width:700px){main{padding:16px}.devices,.states{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style><main><h1>Match Mastery — implemented comparison</h1><p>Actual application at the approved 853 × 1844 portrait viewport. Values and controls are live. Separate clean scenery, hero, board housing, gem sprites, text and controls.</p><p class="note">The approved reference shows coloured gems. The existing level 5 rule is explicitly colourless; this implementation preserves that rule. The source hero pose and individual frame artwork also differ slightly from the generated concept. These browser captures are not native iOS certification. Native safe areas, orientation, Dynamic Type, signing and device performance still require a Mac/device pass.</p><nav><a href="reference-versus-running.jpg">Side-by-side image</a><a href="aligned-overlay.png">Aligned overlay</a><a href="difference.png">Difference image</a><a href="checks.json">Functional/device checks</a><a href="motion-and-safe-areas.json">Motion and inset checks</a><a href="build.log">Production build log</a></nav><div class="compare"><figure><img src="approved.png"><figcaption>Approved reference · v2</figcaption></figure><figure><img src="chromium-reference.png"><figcaption>Running application · source level 5 rules</figcaption></figure></div><h2>Browser viewport coverage</h2><div class="devices">'''+profiles+'''</div><h2>Live interaction states</h2><div class="states"><figure><img src="chromium-incorrect.png"><figcaption>Incorrect answer and lives</figcaption></figure><figure><img src="chromium-correct.png"><figcaption>Correct swap, score and refill</figcaption></figure><figure><img src="chromium-victory.png"><figcaption>Victory and rewards</figcaption></figure><figure><img src="chromium-failure.png"><figcaption>Failure and retry</figcaption></figure></div></main></html>''', encoding='utf-8')
print(out / 'index.html')
