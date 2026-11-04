from pathlib import Path
import json, html
from datetime import datetime, timezone
root=Path('qa-artifacts/full-screen-qa')
rows=[]
for profile in ['desktop','phone','iphone-webkit']:
 data=json.loads((root/(profile+'-checks.json')).read_text(encoding='utf-8'))
 assert len(data)==71 and all(r['passed'] for r in data)
 for r in data:r['kind']='gameplay'
 rows+=data
extra=json.loads((root/'overlay-checks.json').read_text(encoding='utf-8'))
assert len(extra)==106 and all(r['passed'] for r in extra)
rows+=extra
core=json.loads((root/'core-variants/chromium-browser-checks.json').read_text(encoding='utf-8'))
assert len(core)==20 and all(r['passed'] for r in core)
for r in core:r.update(kind='core-variant',key=r['id'],file='core-variants/'+r['file'])
rows+=core
characters=json.loads((root/'character-rendering/checks.json').read_text(encoding='utf-8'))
assert len(characters)==8 and all(r['passed'] for r in characters)
for r in characters:r.update(kind='character-rendering',key=r['avatarId'],profile='phone' if r['engine']=='chromium' else 'iphone-webkit',file=f"character-rendering/{r['engine']}-{r['avatarId']}-resized.png")
rows+=characters
names={r['key']:r.get('title',r['key']) for r in json.loads(Path('qa-artifacts/current-game-screenshots/catalog.json').read_text(encoding='utf-8'))}
report={'generatedAt':datetime.now(timezone.utc).isoformat(),'status':'Sampled layout QA passed; WebKit typography follow-up remains','games':37,'gameplayCases':213,'overlayCases':106,'additionalCoreAnswerFlows':20,'characterMotionAndResizeFlows':8,'totalCases':len(rows),'typecheck':'passed','productionBuild':'passed','fixes':['Reduced-motion characters now use the existing still-artwork renderer, fitted to the animated silhouette and floor baseline, avoiding blank or one-pixel WebKit canvases.','Landscape Place Value Panic actor height: 90px to 150px at 667×375, with the same floor baseline.','Landscape Rounding Rocket helper height: about 80px to 131px at 667×375, with the same floor baseline.'],'acceptedFindings':['Coordinate-grid tick labels and start annotations sit above transparent, pointer-pass-through point hit areas. Raw geometry findings are retained; all point centres are reachable and labels remain visible.'],'openVisualFindings':['The Windows WebKit runtime renders the supplied variable font thinner than Chromium. Confirm the typography on physical iPhone Safari before final visual sign-off.'], 'captureNotes':['WebKit captures use fresh contexts and wait for character loading. Reduced-motion rendering now uses the still-artwork fallback because static WebGL canvases could remain one pixel or fail to composite correctly.'], 'limits':['First/practice and highest-difficulty screen per current routed game; intermediate tiers and every random question permutation are not exhaustively played.','WebKit at 844×390 is an automated browser check, not a physical iPhone hardware or frame-rate certification.','Result themes are rendered using the repository preview; this pass does not claim to complete every game from start to finish.','Background and character motion were visually reviewed and sampled for layout collisions; no AAA quality or frame-rate certification is implied.'],'rows':rows}
(root/'report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
cards=[]
for r in rows:
 title=names.get(r['key'],r['key'].replace('revision-','').replace('_',' ').replace('-',' ').title())
 label=title+(' · '+r['outcome'] if r.get('outcome') else '')
 tier='highest' if r.get('tier')==5 or r['key'] in ['crystal_core','mirror_gate','matrix_match'] else 'first'
 cards.append(f'<article data-profile="{r["profile"]}" data-kind="{r["kind"]}" data-tier="{tier}" data-search="{html.escape(label.lower())}"><a href="{r["file"]}"><img loading="lazy" src="{r["file"]}" alt="{html.escape(label)} — {r["profile"]}"></a><h2>{html.escape(label)}</h2><p>{r["profile"]} · {r["kind"]}'+(f' · level {r["tier"]}' if r.get('tier') else '')+'</p></article>')
page='''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>All game screens · QA review</title><style>*{box-sizing:border-box}body{margin:0;padding:30px;background:#081e29;color:#edf5f0;font:16px system-ui}main{max-width:1600px;margin:auto}h1{font-size:clamp(28px,4vw,46px);margin:8px 0 16px}header>p{max-width:950px;line-height:1.6}a{color:#ffda79}strong{color:#ffda79}nav{display:flex;gap:12px;flex-wrap:wrap;padding:20px 0;position:sticky;top:0;background:#081e29f5;z-index:2}label{display:grid;gap:5px;font-size:13px}select,input{font:inherit;color:white;background:#163943;border:1px solid #70b6be;border-radius:7px;padding:10px;min-height:44px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,560px),1fr));gap:28px}article{min-width:0}article img{display:block;width:100%;border-radius:10px;background:#102f3c}h2{font-size:19px;margin:10px 0 5px}article p{margin:0;color:#b4cbd0;font-size:14px}details{line-height:1.7;max-width:1050px;margin:18px 0}summary{cursor:pointer}footer{margin:30px 0;color:#b4cbd0}[hidden]{display:none!important}</style><main><header><p>SATs Legends · current screen review</p><h1>All game screens — QA review</h1><p><strong>37 games · 213 gameplay captures · 106 Help/result checks · 20 added Core answer flows · 8 hero rendering flows.</strong> Desktop 1440×900, compact landscape phone 667×375, and WebKit landscape 844×390. Layout checks pass: no confirmed blocked controls, clipped questions, model overflow, runtime exceptions or failed art requests in the sampled screens.</p><p>Fixed: the Place Value Panic character and Rounding Rocket helper were too small on landscape phones. Both now have more presence while retaining their floor positions and clear controls. Reduced-motion characters also use the existing high-resolution still artwork to avoid blank WebKit canvases.</p><p><strong>Visual follow-up:</strong> the Windows WebKit runtime renders the variable font thinner than Chromium. Verify typography on a physical iPhone before final visual sign-off. The blank-character issue is fixed for reduced motion; all four heroes were verified in both engines, including switching back to normal animation and resizing.</p><details><summary>Scope, reviewed warnings and test limits</summary><p>Gameplay coverage includes the first/practice and highest-difficulty route for every current game, including all three Core papers. Help was opened and closed for every game on desktop and phone. The eight island result themes were checked for victory and retry on both sizes using the repository preview.</p><p>Coordinate-grid annotations overlap transparent point hit areas by design: the labels remain visible, pass pointer input through, and every point centre remains reachable. The raw findings are retained in the report.</p><p>This is a screen presentation pass. It does not exhaustively play every intermediate tier or random question, complete every game, or certify physical iPhone performance. Desktop motion was sampled for layout collisions; WebKit is automated emulation. Account state was supplied by the repository’s QA fixture.</p><p><a href="report.json">Detailed checks</a> · <a href="changes.md">Changed files and assumptions</a> · <a href="build.log">Build log</a></p></details></header><nav><label>Screen size<select id="profile"><option value="desktop">Desktop</option><option value="phone">Compact landscape phone</option><option value="iphone-webkit">iPhone WebKit landscape</option></select></label><label>Screen type<select id="kind"><option value="gameplay">Gameplay</option><option value="help">Help</option><option value="result">Victory / retry</option><option value="core-variant">Added Core questions</option><option value="character-rendering">Hero motion / resize</option></select></label><label>Difficulty<select id="tier"><option value="highest">Highest level / Core</option><option value="first">First / practice</option><option value="all">Both</option></select></label><label>Find a game<input id="search" type="search" placeholder="Game name"></label></nav><p id="count" aria-live="polite"></p><div class="grid">'''+''.join(cards)+'''</div><footer>No external legacy assumptions were used.</footer></main><script>const controls=['profile','kind','tier','search'].map(id=>document.getElementById(id));function filter(){const[p,k,t,s]=controls.map(n=>n.value);let count=0;document.querySelectorAll('article').forEach(n=>{const show=n.dataset.profile===p&&n.dataset.kind===k&&(k!=='gameplay'||t==='all'||n.dataset.tier===t)&&n.dataset.search.includes(s.toLowerCase());n.hidden=!show;if(show)count++;});document.getElementById('count').textContent=count+' screenshots shown'+(!count?' — choose another screen size or type.':'');}controls.forEach(n=>n.addEventListener('input',filter));filter();</script></html>'''
(root/'index.html').write_text(page,encoding='utf-8')
(root/'changes.md').write_text('''# Full game screen QA

## Product changes
- src/components/game-ui/OriginalHeroCharacter.tsx — use the existing still-image path for reduced motion with silhouette-based size and grounding; animated mesh remains active for normal motion.
- src/games/vision-action-compositions.css — improve the Place Value Panic actor size on short landscape screens.
- src/games/review-polish.css — improve the Rounding Rocket helper size on short landscape screens.

## QA files added
- scripts/prepare-full-screen-qa.mjs — extract first/highest routes from the current ISLANDS data.
- scripts/verify-full-game-screens.mjs — bounds, pointer reachability, text/controls, Core model containment, runtime/art requests, desktop motion samples and screenshots.
- scripts/verify-full-screen-overlays.mjs — Help return actions and shared victory/retry screen presentation.
- scripts/build-full-screen-qa-sheets.py — visual contact sheets.
- scripts/build-full-screen-qa-report.py — this report and searchable screenshot gallery.
- scripts/probe-full-screen-actors.mjs — measure the affected character containers.
- scripts/probe-webkit-character-render.mjs, scripts/probe-webkit-rocket-render.mjs and scripts/probe-webkit-fresh-contexts.mjs — isolated rendering and font comparisons.
- scripts/verify-character-static-rendering.mjs — verify all four heroes in both engines, reduced-motion visibility, normal animation and viewport resizing.
- qa-artifacts/full-screen-qa/ — captured evidence, machine-readable reports and build log.

## Assumptions
- Review the currently routed maths games in ISLANDS, including all three Core papers.
- Desktop and iPhone landscape are the target layouts.
- Preserve the current rich scenery and character art; make only confirmed size fixes.
- Screen QA uses current generated examples, not exhaustive play of every random question or tier.

TypeScript and production build pass. No external legacy assumptions were used.
''',encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='rows'},indent=2))
