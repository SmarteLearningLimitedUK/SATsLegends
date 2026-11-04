from pathlib import Path
import json,html
root=Path('qa-artifacts/prime-pop-clearance')
rows=json.loads((root/'checks.json').read_text(encoding='utf-8'))
assert len(rows)==8 and all(r['passed'] for r in rows)
cards=''.join(f'<article><h2>{html.escape(r["profile"])} · {"practice" if r["practice"] else "level 5"}</h2><a href="{r["file"]}"><img src="{r["file"]}" alt="Prime Pop with clear character and bubble areas"></a></article>' for r in rows)
(root/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prime Pop · character clearance fix</title><style>body{margin:0;padding:30px;background:#081e29;color:#edf5f0;font:16px system-ui}main{max-width:1500px;margin:auto}h1{color:#ffda79}p{max-width:950px;line-height:1.6}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,550px),1fr));gap:24px}img{width:100%;border-radius:10px}h2{font-size:18px}a{color:#ffda79}</style><main><h1>Prime Pop — clear numbers and character</h1><p>Bubbles now spawn and move in a separate area to the right of the helper. The warning label sits outside the bubble field, and feedback uses the clear left side.</p><p>Passed: practice and level 5 at 1440×900, 1280×720, 667×375, and WebKit 844×390. Each case samples moving bubbles 16 times over eight seconds, checks for helper/bubble intersections, confirms the QA check catches a deliberately overlapping bubble, and verifies tapping a prime still works. TypeScript and production build pass.</p><p>The earlier screen QA missed the character/bubble collision. The shared audit now detects it for Prime Pop. <a href="checks.json">Test results</a> · <a href="changes.md">Changed files and assumptions</a> · <a href="../full-screen-qa/index.html">All-game gallery</a></p><div class="grid">'''+cards+'</div></main></html>',encoding='utf-8')
(root/'changes.md').write_text('''# Prime Pop character clearance

Changed files:
- src/games/prime-pop.css — reserve the helper’s left-side space in the actual bubble field; keep warning and feedback text outside the bubbles.
- src/games/PrimePopGame.tsx — place the warning badge in the reserved question gap and identify the feedback region.
- scripts/qa/layout-overlap-audit.mjs — detect Prime Pop helper/bubble intersections.
- scripts/verify-prime-pop-character-clearance.mjs — moving bubbles, positive/negative audit checks and a real prime tap at four viewport sizes, practice and level 5.
- scripts/build-prime-pop-clearance-report.py — this focused screenshot report.
- qa-artifacts/prime-pop-clearance/ — screenshots, checks and build log; the six matching images in full-screen-qa were refreshed.

Assumption: retain the character’s current position, art, bubble values, speeds and game rules; give the bubbles a separate play area.

No external legacy assumptions were used.
''',encoding='utf-8')
print('PASS: 8 cases, 128 movement samples, refreshed gallery images.')
