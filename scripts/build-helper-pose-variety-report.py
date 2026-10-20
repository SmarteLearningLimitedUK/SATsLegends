from pathlib import Path
import json,shutil
root=Path('qa-artifacts/helper-pose-variety');keys={'remainder_run':'Directing the shipment','multiplication_mine':'Consulting the plan','percent_power':'Resting beside the reactor'}
rows=[]
for profile in ['desktop','phone','iphone-webkit']:
 checks=json.loads(Path(f'qa-artifacts/full-screen-qa/{profile}-checks.json').read_text(encoding='utf-8'))
 changed=[r for r in checks if r['key'] in keys]
 assert len(changed)==6 and all(r['passed'] for r in changed)
 rows+=changed
 (root/profile).mkdir(exist_ok=True)
 for r in changed:shutil.copyfile(Path('qa-artifacts/full-screen-qa')/r['file'],root/r['file'])
(root/'checks.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf-8')
articles=''
for key,label in keys.items():
 articles+=f'<section><h2>{key.replace("_"," ").title()} — {label}</h2><div class="pair"><figure><figcaption>Before</figcaption><a href="before/{key}.png"><img src="before/{key}.png" alt="Previous carrying pose"></a></figure><figure><figcaption>After</figcaption><a href="desktop/{key}-5.png"><img src="desktop/{key}-5.png" alt="Updated game-specific pose"></a></figure></div><p><a href="phone/{key}-5.png">Landscape phone</a> · <a href="iphone-webkit/{key}-5.png">WebKit landscape</a></p></section>'
(root/'index.html').write_text('''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Helper pose variety</title><style>body{margin:0;background:#081e29;color:#edf5f0;font:16px system-ui;padding:30px}main{max-width:1600px;margin:auto}h1,a{color:#ffda79}p{line-height:1.6;max-width:1000px}.pair{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,500px),1fr));gap:20px}figure{margin:0}figcaption{margin:8px 0;color:#b6ced2}img{width:100%;border-radius:10px}section{margin:35px 0}h2{font-size:21px}</style><main><h1>Fewer repeated carrying poses</h1><p>The crate-carrying helper was used in four games. It now appears only in Conversion Canyon. Remainder Run, Multiplication Mine and Percent Power use three different existing poses, preserving the high-resolution art style.</p><p>Verified: practice and highest difficulty for all three changed games at desktop 1440×900, landscape phone 667×375 and WebKit 844×390 — 18 passing layout captures. <a href="checks.json">Checks</a> · <a href="changes.md">Changed files and assumptions</a></p>'''+articles+'</main></html>',encoding='utf-8')
(root/'changes.md').write_text('''# Helper pose variety

Changed implementation:
- src/components/game-ui/VisionCompanion.tsx — Remainder Run uses guide/pointing, Multiplication Mine uses blueprint/consulting a plan, and Percent Power uses the resting artwork. Conversion Canyon retains carry. Pose assignments are explicitly optional where the resting default is intended.

Generated evidence:
- qa-artifacts/helper-pose-variety/ — before/after screenshots, 18 layout checks and build log.
- qa-artifacts/full-screen-qa/ — refreshed screenshots and check records for the three affected games.
- scripts/build-helper-pose-variety-report.py — reproducible focused report.

Assumption: reuse the existing high-resolution artwork and game-specific assignments, rather than generating new artwork or changing poses at random. Character positions and gameplay are unchanged.

No external legacy assumptions were used.
''',encoding='utf-8')
print('PASS: three games, three distinct replacement poses, 18 layout captures.')
